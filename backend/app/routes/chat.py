import time
import uuid
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User
from app.models.document import Document
from app.models.chat import ChatSession, Message
from app.models.email_job import EmailJob
from app.routes.auth import get_current_user

from app.services.guardrails.input_guard import check_input
from app.services.guardrails.output_guard import check_output, FALLBACK_ANSWER, get_fallback_answer
from app.services.embedding.local_embedder import embed_single_query
from app.services.cache.service import check_cache, save_to_cache
from app.services.retrieval.hybrid_search import search
from app.services.retrieval.reranker import rerank
from app.services.retrieval.recall_check import log_retrieval
from app.services.llm.prompt_builder import build_prompt, is_hindi_content
from app.services.llm.grok_client import ask_grok
from app.services.llm.token_counter import count_tokens
from app.services.email_callback.queue import enqueue_email_job
from app.utils.logger import logger

router = APIRouter(prefix="/chat", tags=["Chat & RAG"])


# --- Schemas ---
class ChatAskRequest(BaseModel):
    doc_id: str
    question: str
    session_id: Optional[str] = None


class CitationItem(BaseModel):
    page_no: int
    snippet: Optional[str] = None


class ChatAskResponse(BaseModel):
    answer: str
    citations: List[CitationItem] = []
    cache_hit: bool = False
    tokens_used: int = 0
    latency_ms: float = 0.0
    source: str = "llm"  # "cache", "llm", "guardrail"
    session_id: Optional[str] = None
    message_id: Optional[str] = None
    status: str = "answered"
    email_queued: bool = False


class MessageHistoryItem(BaseModel):
    id: str
    question: str
    answer: Optional[str] = None
    tokens_used: int
    cache_hit: bool
    status: str
    latency_ms: float
    created_at: datetime


class ChatSessionResponse(BaseModel):
    id: str
    doc_id: Optional[str]
    created_at: datetime


# --- Helpers ---
def get_or_create_session(db: Session, user_id: UUID, doc_id: UUID, session_id_str: Optional[str]) -> ChatSession:
    """Retrieve existing session if specified and authorized, else create a new session."""
    if session_id_str:
        try:
            session_uuid = UUID(session_id_str)
            session = (
                db.query(ChatSession)
                .filter(ChatSession.id == session_uuid, ChatSession.user_id == user_id)
                .first()
            )
            if session:
                return session
        except ValueError:
            pass

    # Create new session
    new_session = ChatSession(
        user_id=user_id,
        doc_id=doc_id
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session


# --- Endpoints ---
@router.post("/ask", response_model=ChatAskResponse)
def ask_question(
    payload: ChatAskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Main RAG Chat Pipeline:
    1. Input Guardrail Check
    2. Local Embedding Generation
    3. Exact & Semantic Cache Probe (0 Tokens, ~10ms)
    4. Qdrant Hybrid Search (Top 10) -> Re-Rank (Top 3)
    5. Locked Prompt Construction
    6. Grok LLM Invocation
    7. Output Guardrail Grounding Check
    8. Cache Save (if grounded)
    9. DB Message Persistence
    10. Return Response with citations and token count
    """
    start_time = time.perf_counter()
    raw_question = payload.question.strip()

    # Verify document exists and belongs to current user
    try:
        doc_uuid = UUID(payload.doc_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document ID format"
        )

    document = (
        db.query(Document)
        .filter(Document.id == doc_uuid, Document.user_id == current_user.id)
        .first()
    )
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied"
        )

    session = get_or_create_session(db, current_user.id, doc_uuid, payload.session_id)

    # 1. Input Guardrails
    guard_res = check_input(raw_question)
    if not guard_res.get("allowed", False):
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        block_msg = "Main sirf is PDF se jawab de sakta hu"

        # Record in messages table
        msg = Message(
            session_id=session.id,
            question=raw_question,
            answer=block_msg,
            tokens_used=0,
            cache_hit=False,
            status="blocked",
            latency_ms=latency_ms
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)

        return ChatAskResponse(
            answer=block_msg,
            citations=[],
            cache_hit=False,
            tokens_used=0,
            latency_ms=latency_ms,
            source="guardrail",
            session_id=str(session.id),
            message_id=str(msg.id),
            status="blocked"
        )

    # 2. Local Query Embedding
    query_vector = embed_single_query(raw_question)

    # 3. Exact + Semantic Cache Check
    cached_hit = check_cache(raw_question, query_vector, str(doc_uuid), str(current_user.id))
    if cached_hit:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        answer_text = cached_hit["answer"]
        raw_cits = cached_hit.get("citations", [])
        citations = [CitationItem(**c) if isinstance(c, dict) else CitationItem(page_no=c) for c in raw_cits]

        # Record in messages table
        msg = Message(
            session_id=session.id,
            question=raw_question,
            answer=answer_text,
            tokens_used=0,
            cache_hit=True,
            status="answered",
            latency_ms=latency_ms
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)

        return ChatAskResponse(
            answer=answer_text,
            citations=citations,
            cache_hit=True,
            tokens_used=0,
            latency_ms=latency_ms,
            source=cached_hit.get("cache_type", "cache"),
            session_id=str(session.id),
            message_id=str(msg.id),
            status="answered"
        )

    # 4. Retrieval & Re-ranking (Top 10 -> Top 3)
    candidates = search(
        question_embedding=query_vector,
        question_text=raw_question,
        user_id=str(current_user.id),
        doc_id=str(doc_uuid),
        top_k=10
    )
    log_retrieval(str(session.id), raw_question, candidates)

    top_3_chunks = rerank(raw_question, candidates, top_n=3)

    citations = [
        CitationItem(page_no=c.get("page_no", 1), snippet=c.get("chunk_text", "")[:120])
        for c in top_3_chunks
    ]

    # If no relevant chunks in vector DB
    if not top_3_chunks:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        fallback_msg = get_fallback_answer(candidates)

        msg = Message(
            session_id=session.id,
            question=raw_question,
            answer=fallback_msg,
            tokens_used=0,
            cache_hit=False,
            status="answered",
            latency_ms=latency_ms
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)

        return ChatAskResponse(
            answer=fallback_msg,
            citations=[],
            cache_hit=False,
            tokens_used=0,
            latency_ms=latency_ms,
            source="llm",
            session_id=str(session.id),
            message_id=str(msg.id),
            status="answered"
        )

    # 5. Build Grounded Prompt with History Summary
    recent_messages = (
        db.query(Message)
        .filter(Message.session_id == session.id)
        .order_by(Message.created_at.desc())
        .limit(2)
        .all()
    )
    history_summary = ""
    if recent_messages:
        reversed_msgs = list(reversed(recent_messages))
        history_summary = " ".join(
            f"User: {m.question} | Assistant: {m.answer}" for m in reversed_msgs if m.answer
        )

    prompt_messages = build_prompt(raw_question, top_3_chunks, history_summary)

    # 6. Grok LLM Invocation with 2 Retries (Total 3 attempts, 2s gap)
    raw_answer = None
    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
        try:
            raw_answer = ask_grok(prompt_messages)
            if raw_answer:
                break
        except Exception as grok_err:
            logger.warning(f"Grok call attempt {attempt}/{max_attempts} failed: {grok_err}")
            if attempt < max_attempts:
                time.sleep(2)

    # If all 3 attempts fail -> Enqueue Email Callback Job
    if not raw_answer:
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        if is_hindi_content(top_3_chunks):
            queued_notice = (
                "Grok abhi busy hai. Tumhara answer 2-3 minute me Email pe aa jayega, "
                "chat me bhi save ho jayega. Tum chat band kar sakte ho."
            )
        else:
            queued_notice = (
                "The AI model is currently busy. Your answer will be delivered to your email in 2-3 minutes "
                "and saved in this chat. You may safely close this window."
            )

        # 2a. Record in messages table
        msg = Message(
            session_id=session.id,
            question=raw_question,
            answer=queued_notice,
            tokens_used=0,
            cache_hit=False,
            status="queued_for_email",
            latency_ms=latency_ms
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)

        # 2b. Record in email_jobs table
        ejob = EmailJob(
            message_id=msg.id,
            to_email=current_user.email,
            status="queued",
            retry_count=0
        )
        db.add(ejob)
        db.commit()

        # 2c. Enqueue into Redis list
        enqueue_email_job(
            message_id=str(msg.id),
            user_id=str(current_user.id),
            doc_id=str(doc_uuid),
            question=raw_question,
            session_id=str(session.id),
            to_email=current_user.email
        )

        # 2d. Return immediately to user
        return ChatAskResponse(
            answer=queued_notice,
            citations=[],
            cache_hit=False,
            tokens_used=0,
            latency_ms=latency_ms,
            source="llm",
            session_id=str(session.id),
            message_id=str(msg.id),
            status="queued_for_email",
            email_queued=True
        )

    # 7. Output Guardrails Check
    tokens_used = count_tokens(raw_question + raw_answer)
    output_guard_res = check_output(raw_answer, top_3_chunks)
    final_answer = output_guard_res["safe_answer"]

    # 8. Save to Cache ONLY if output passed guardrail and is grounded
    if output_guard_res.get("passed", False) and final_answer not in (FALLBACK_ANSWER, get_fallback_answer(top_3_chunks)):
        save_to_cache(
            question=raw_question,
            question_embedding=query_vector,
            answer=final_answer,
            doc_id=str(doc_uuid),
            user_id=str(current_user.id),
            citations=[c.dict() for c in citations]
        )

    # 9. Persist to PostgreSQL database
    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
    msg = Message(
        session_id=session.id,
        question=raw_question,
        answer=final_answer,
        tokens_used=tokens_used,
        cache_hit=False,
        status="answered",
        latency_ms=latency_ms
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # 10. Return response
    return ChatAskResponse(
        answer=final_answer,
        citations=citations,
        cache_hit=False,
        tokens_used=tokens_used,
        latency_ms=latency_ms,
        source="llm",
        session_id=str(session.id),
        message_id=str(msg.id),
        status="answered"
    )


@router.get("/sessions/{doc_id}", response_model=List[ChatSessionResponse])
def get_doc_sessions(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all chat sessions associated with a specific document for authenticated user."""
    try:
        doc_uuid = UUID(doc_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document ID format"
        )

    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.doc_id == doc_uuid, ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
        .all()
    )

    return [
        ChatSessionResponse(
            id=str(s.id),
            doc_id=str(s.doc_id) if s.doc_id else None,
            created_at=s.created_at
        )
        for s in sessions
    ]


@router.get("/history/{session_id}", response_model=List[MessageHistoryItem])
def get_session_history(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all chronological messages for a specific session."""
    try:
        session_uuid = UUID(session_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session ID format"
        )

    # Validate session ownership
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_uuid, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    messages = (
        db.query(Message)
        .filter(Message.session_id == session.id)
        .order_by(Message.created_at.asc())
        .all()
    )

    return [
        MessageHistoryItem(
            id=str(m.id),
            question=m.question,
            answer=m.answer,
            tokens_used=m.tokens_used,
            cache_hit=m.cache_hit,
            status=m.status,
            latency_ms=m.latency_ms,
            created_at=m.created_at
        )
        for m in messages
    ]

import asyncio
from uuid import UUID
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.config import settings
from app.models.user import User
from app.models.chat import Message
from app.models.email_job import EmailJob
from app.services.email_callback.queue import dequeue_email_job, re_enqueue_job
from app.services.email_callback.email_sender import send_email
from app.services.email_callback.templates import (
    build_answer_email,
    build_failure_email,
    EMAIL_SUCCESS_SUBJECT,
    EMAIL_FAILURE_SUBJECT,
)
from app.services.embedding.local_embedder import embed_single_query
from app.services.retrieval.hybrid_search import search
from app.services.retrieval.reranker import rerank
from app.services.llm.prompt_builder import build_prompt
from app.services.llm.grok_client import ask_grok
from app.services.llm.token_counter import count_tokens
from app.services.guardrails.output_guard import check_output, FALLBACK_ANSWER, get_fallback_answer
from app.services.cache.service import save_to_cache
from app.utils.logger import logger

# Global flag for worker lifecycle
_worker_running = True


def stop_worker():
    global _worker_running
    _worker_running = False


async def process_single_job(
    job: Dict[str, Any],
    db: Optional[Session] = None,
    delay: Optional[int] = None
) -> None:
    """Process an individual dequeued email callback job."""
    message_id_str = job.get("message_id")
    user_id_str = job.get("user_id")
    doc_id_str = job.get("doc_id")
    question = job.get("question", "")
    session_id_str = job.get("session_id", "")
    to_email = job.get("to_email")
    retry_count = job.get("retry_count", 0)

    logger.info(
        f"[Worker] Processing job message_id={message_id_str} (retry_count={retry_count}) for doc_id={doc_id_str}"
    )

    should_close_db = False
    if db is None:
        db = SessionLocal()
        should_close_db = True
    try:
        # Find user email if not directly in job payload
        if not to_email and user_id_str:
            user = db.query(User).filter(User.id == UUID(user_id_str)).first()
            if user:
                to_email = user.email

        # 1. Wait configured delay to give Grok time to recover from rate limits
        wait_seconds = delay if delay is not None else settings.WORKER_RETRY_DELAY
        if wait_seconds > 0:
            logger.info(f"[Worker] Waiting {wait_seconds}s before retrying Grok...")
            await asyncio.sleep(wait_seconds)

        # 2. Re-run Retrieval & Re-ranking
        query_vector = embed_single_query(question)
        candidates = search(
            question_embedding=query_vector,
            question_text=question,
            user_id=user_id_str,
            doc_id=doc_id_str,
            top_k=10
        )
        top_3 = rerank(question, candidates, top_n=3)
        prompt = build_prompt(question, top_3)

        # 3. Try Grok LLM call
        raw_answer = None
        try:
            raw_answer = ask_grok(prompt)
        except Exception as grok_err:
            logger.warning(f"[Worker] Grok retry failed for message_id={message_id_str}: {grok_err}")

        # 4. Handle failure case
        if not raw_answer:
            new_retry = retry_count + 1
            job["retry_count"] = new_retry

            if new_retry < 2:
                logger.info(f"[Worker] Re-enqueuing job {message_id_str} for retry #{new_retry}")
                re_enqueue_job(job)
            else:
                logger.error(f"[Worker] Retries exhausted for message_id={message_id_str}. Marking failed.")
                chat_link = f"{settings.FRONTEND_URL}/chat?session_id={session_id_str}"
                
                # Send failure notification email
                if to_email:
                    fail_html = build_failure_email(question, chat_link)
                    send_email(to_email, EMAIL_FAILURE_SUBJECT, fail_html)

                # Update database tables
                if message_id_str:
                    msg = db.query(Message).filter(Message.id == UUID(message_id_str)).first()
                    if msg:
                        msg.status = "failed"
                        db.commit()

                    ejob = db.query(EmailJob).filter(EmailJob.message_id == UUID(message_id_str)).first()
                    if ejob:
                        ejob.status = "failed"
                        ejob.retry_count = new_retry
                        db.commit()
            return

        # 5. Handle Grok success case: Output Guardrail check
        guard_res = check_output(raw_answer, top_3)
        safe_answer = guard_res["safe_answer"]
        page_nos = [c.get("page_no", 1) for c in top_3]
        citations = [{"page_no": p, "snippet": c.get("chunk_text", "")[:120]} for p, c in zip(page_nos, top_3)]

        # Save to Cache if grounded
        if guard_res.get("passed", False) and safe_answer not in (FALLBACK_ANSWER, get_fallback_answer(top_3)):
            save_to_cache(
                question=question,
                question_embedding=query_vector,
                answer=safe_answer,
                doc_id=doc_id_str,
                user_id=user_id_str,
                citations=citations
            )

        # Update Message record in database
        tokens_used = count_tokens(question + safe_answer)
        if message_id_str:
            msg = db.query(Message).filter(Message.id == UUID(message_id_str)).first()
            if msg:
                msg.answer = safe_answer
                msg.status = "answered_via_email"
                msg.tokens_used = tokens_used
                db.commit()

        # Send HTML email to user
        chat_link = f"{settings.FRONTEND_URL}/chat?session_id={session_id_str}"
        email_sent = False
        if to_email:
            html_body = build_answer_email(question, safe_answer, page_nos, chat_link)
            email_sent = send_email(to_email, EMAIL_SUCCESS_SUBJECT, html_body)

        # Update email_jobs table
        if message_id_str:
            ejob = db.query(EmailJob).filter(EmailJob.message_id == UUID(message_id_str)).first()
            if ejob:
                ejob.status = "sent" if email_sent else "failed"
                ejob.retry_count = retry_count
                db.commit()

        logger.info(f"[Worker] Successfully processed email job for message_id={message_id_str}")

    except Exception as exc:
        logger.error(f"[Worker] Unhandled error processing email job: {exc}", exc_info=True)
    finally:
        if should_close_db and db:
            db.close()


async def run_email_worker():
    """Continuous background worker loop that monitors Redis queue."""
    logger.info("Starting Advisor.ai Email Callback Worker...")
    while _worker_running:
        try:
            # Poll Redis queue with 2s timeout
            job = dequeue_email_job(timeout=2)
            if job:
                await process_single_job(job)
            else:
                await asyncio.sleep(2)
        except asyncio.CancelledError:
            logger.info("Email Callback Worker task cancelled.")
            break
        except Exception as e:
            logger.error(f"Error in Email Callback Worker loop: {e}")
            await asyncio.sleep(3)


def start_worker():
    """Launch worker as an asyncio background task."""
    return asyncio.create_task(run_email_worker())

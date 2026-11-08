import uuid
from uuid import UUID
from pathlib import Path

try:
    from qdrant_client.http.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
except ImportError:
    Distance = VectorParams = PointStruct = Filter = FieldCondition = MatchValue = None

from app.db import SessionLocal
from app.models.document import Document
from app.services.pdf_upload.storage import get_pdf_path
from app.services.parsing.pdf_parser import parse_pdf
from app.services.parsing.cleaner import clean_text
from app.services.chunking.chunker import chunk_text
from app.services.embedding.local_embedder import embed_texts
from app.services.embedding.service import get_embedding_dimension
from app.qdrant_client import get_qdrant_client
from app.utils.logger import logger

COLLECTION_NAME = "tokensaver_chunks"


def ensure_qdrant_collection() -> None:
    """Ensure that the Qdrant collection for chunks exists with 384-dim Cosine configuration."""
    client = get_qdrant_client()
    if client is None:
        raise RuntimeError("Qdrant client is not available")

    try:
        collections = [c.name for c in client.get_collections().collections]
        if COLLECTION_NAME not in collections:
            logger.info(f"Creating Qdrant collection '{COLLECTION_NAME}' (dim={get_embedding_dimension()})...")
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=get_embedding_dimension(), distance=Distance.COSINE),
            )
            logger.info(f"Collection '{COLLECTION_NAME}' created successfully.")
    except Exception as e:
        logger.error(f"Error checking/creating Qdrant collection: {e}")
        raise


def delete_document_chunks(user_id: str, doc_id: str) -> None:
    """Remove all vector chunk points associated with a specific doc_id from Qdrant."""
    client = get_qdrant_client()
    if client is None or Filter is None:
        return

    try:
        client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=Filter(
                must=[
                    FieldCondition(key="doc_id", match=MatchValue(value=str(doc_id))),
                    FieldCondition(key="user_id", match=MatchValue(value=str(user_id)))
                ]
            )
        )
        logger.info(f"Deleted vector chunks from Qdrant for doc_id={doc_id}")
    except Exception as e:
        logger.warning(f"Could not delete vectors from Qdrant for doc_id={doc_id}: {e}")


def process_document(user_id: str, doc_id: str) -> None:
    """
    Background worker task to parse, clean, chunk, embed, and index a PDF document into Qdrant.
    Updates Document status in PostgreSQL without crashing the server on errors.
    """
    logger.info(f"Starting ingestion pipeline for doc_id={doc_id}, user_id={user_id}")
    db = SessionLocal()

    try:
        doc_uuid = UUID(doc_id)
        document = db.query(Document).filter(Document.id == doc_uuid).first()
        if not document:
            logger.error(f"Document {doc_id} not found in database for ingestion")
            return

        # 1. Locate file on disk
        file_path = get_pdf_path(user_id, doc_id)
        if not file_path.exists():
            raise FileNotFoundError(f"Stored PDF file not found at {file_path}")

        # 2. Extract pages using PyMuPDF
        pages = parse_pdf(file_path)
        if not pages:
            raise ValueError("No extractable content found in PDF document")

        # 3. Clean page text
        cleaned_pages = []
        for p in pages:
            cleaned = clean_text(p["text"])
            if cleaned:
                cleaned_pages.append({
                    "page_no": p["page_no"],
                    "text": cleaned
                })

        if not cleaned_pages:
            raise ValueError("PDF content was empty after cleaning")

        # 4. Generate chunks (800 chars, 100 overlap)
        chunks = chunk_text(cleaned_pages)
        if not chunks:
            raise ValueError("No chunks could be produced from PDF content")

        chunk_texts = [c["chunk_text"] for c in chunks]

        # 5. Generate embeddings locally in batches of 32
        vectors = embed_texts(chunk_texts)
        if len(vectors) != len(chunks):
            raise RuntimeError("Mismatch between generated vectors and chunk count")

        # 6. Save vectors into Qdrant
        ensure_qdrant_collection()
        client = get_qdrant_client()

        points = [
            PointStruct(
                id=str(uuid.uuid4()),
                vector=vec,
                payload={
                    "user_id": str(user_id),
                    "doc_id": str(doc_id),
                    "chunk_text": chunk["chunk_text"],
                    "page_no": chunk["page_no"],
                    "chunk_index": chunk["chunk_index"],
                }
            )
            for chunk, vec in zip(chunks, vectors)
        ]

        # Upload in batches of 64
        batch_size = 64
        for i in range(0, len(points), batch_size):
            client.upsert(
                collection_name=COLLECTION_NAME,
                points=points[i:i + batch_size]
            )

        # 7. Update DB record to ready
        document.total_chunks = len(chunks)
        document.status = "ready"
        db.commit()
        logger.info(f"Ingestion successful for doc_id={doc_id}. Total chunks: {len(chunks)}")

    except Exception as exc:
        logger.error(f"Ingestion pipeline failed for doc_id={doc_id}: {exc}", exc_info=True)
        try:
            document = db.query(Document).filter(Document.id == UUID(doc_id)).first()
            if document:
                document.status = "failed"
                db.commit()
        except Exception as db_err:
            logger.error(f"Failed to update document status to failed: {db_err}")
    finally:
        db.close()

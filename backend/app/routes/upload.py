from datetime import datetime
from uuid import UUID
from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.user import User
from app.models.document import Document
from app.routes.auth import get_current_user
from app.services.pdf_upload.service import upload_pdf
from app.services.pdf_upload.storage import delete_pdf
from app.services.ingestion.pipeline import delete_document_chunks
from app.redis_client import get_redis_client
from app.utils.logger import logger

router = APIRouter(tags=["Upload & Documents"])


# --- Schemas ---
class DocumentResponse(BaseModel):
    id: str
    file_name: str
    status: str
    total_chunks: int
    created_at: datetime

    class Config:
        from_attributes = True


class UploadResponse(BaseModel):
    doc_id: str
    file_name: str
    status: str
    total_chunks: int


# --- Endpoints ---
@router.post("/upload-pdf", response_model=UploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_pdf_endpoint(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Protected endpoint: Upload and initiate asynchronous ingestion of a PDF document.
    """
    res = await upload_pdf(
        user_id=current_user.id,
        file=file,
        background_tasks=background_tasks,
        db=db
    )
    return UploadResponse(**res)


@router.get("/documents", response_model=List[DocumentResponse])
def get_user_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Protected endpoint: Retrieve list of documents uploaded by the authenticated user only.
    """
    docs = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return [
        DocumentResponse(
            id=str(doc.id),
            file_name=doc.file_name,
            status=doc.status,
            total_chunks=doc.total_chunks,
            created_at=doc.created_at
        )
        for doc in docs
    ]


@router.delete("/documents/{doc_id}")
def delete_user_document(
    doc_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Protected endpoint: Delete a document record, local PDF file, and vector chunks in Qdrant.
    """
    try:
        doc_uuid = UUID(doc_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document ID format"
        )

    # Security check: document must belong to current user
    document = (
        db.query(Document)
        .filter(Document.id == doc_uuid, Document.user_id == current_user.id)
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # 1. Delete physical PDF file from disk
    delete_pdf(current_user.id, doc_uuid)

    # 2. Delete vectors from Qdrant
    delete_document_chunks(str(current_user.id), str(doc_uuid))

    # 3. Invalidate Redis cache for this document
    redis = get_redis_client()
    if redis:
        try:
            keys = redis.keys(f"*{doc_id}*")
            if keys:
                redis.delete(*keys)
        except Exception as e:
            logger.warning(f"Could not invalidate Redis keys for doc {doc_id}: {e}")

    # 4. Remove database record
    db.delete(document)
    db.commit()

    return {
        "message": "Document deleted successfully",
        "doc_id": str(doc_id)
    }

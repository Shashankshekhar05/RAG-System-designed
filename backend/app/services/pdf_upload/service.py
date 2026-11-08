import uuid
from typing import Dict, Any
from fastapi import UploadFile, BackgroundTasks
from sqlalchemy.orm import Session
from app.models.document import Document
from app.services.pdf_upload.validator import validate_pdf
from app.services.pdf_upload.storage import save_pdf
from app.utils.logger import logger


async def upload_pdf(
    user_id: Any,
    file: UploadFile,
    background_tasks: BackgroundTasks,
    db: Session
) -> Dict[str, Any]:
    """
    Handle initial PDF file validation, disk persistence, DB record creation,
    and trigger asynchronous ingestion in background task.
    """
    file_bytes = await file.read()

    # 1. Validate format & size
    validate_pdf(file, file_bytes)

    # 2. Create document record with uploading status
    doc_id = uuid.uuid4()
    doc_record = Document(
        id=doc_id,
        user_id=user_id,
        file_name=file.filename or "untitled.pdf",
        status="uploading",
        total_chunks=0
    )
    db.add(doc_record)
    db.commit()
    db.refresh(doc_record)

    # 3. Save file bytes to storage
    try:
        save_pdf(user_id, doc_id, file_bytes)
        doc_record.status = "processing"
        db.commit()
    except Exception as e:
        logger.error(f"Failed to save PDF to storage for doc_id={doc_id}: {e}")
        doc_record.status = "failed"
        db.commit()
        raise

    # 4. Enqueue background ingestion
    from app.services.ingestion.pipeline import process_document
    background_tasks.add_task(process_document, user_id=str(user_id), doc_id=str(doc_id))

    return {
        "doc_id": str(doc_id),
        "file_name": doc_record.file_name,
        "status": doc_record.status,
        "total_chunks": 0
    }

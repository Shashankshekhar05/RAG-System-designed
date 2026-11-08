import os
from pathlib import Path
from typing import Any

# Base uploads directory in backend/uploads
CURRENT_FILE = Path(__file__).resolve()
# backend/app/services/pdf_upload/storage.py -> parent x 4 is backend/
BACKEND_DIR = CURRENT_FILE.parents[3]
UPLOADS_DIR = BACKEND_DIR / "uploads"


def get_pdf_path(user_id: Any, doc_id: Any) -> Path:
    """Return the absolute path to a user document."""
    return UPLOADS_DIR / str(user_id) / f"{str(doc_id)}.pdf"


def save_pdf(user_id: Any, doc_id: Any, file_bytes: bytes) -> Path:
    """Save raw PDF bytes to backend/uploads/{user_id}/{doc_id}.pdf."""
    target_path = get_pdf_path(user_id, doc_id)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    with open(target_path, "wb") as f:
        f.write(file_bytes)
    return target_path


def delete_pdf(user_id: Any, doc_id: Any) -> bool:
    """Delete a PDF file from storage if it exists."""
    target_path = get_pdf_path(user_id, doc_id)
    if target_path.exists():
        try:
            target_path.unlink()
            # Clean up user folder if empty
            if target_path.parent.exists() and not any(target_path.parent.iterdir()):
                target_path.parent.rmdir()
            return True
        except Exception:
            return False
    return False

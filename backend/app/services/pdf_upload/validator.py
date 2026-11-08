from fastapi import UploadFile, HTTPException, status

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB in bytes


def validate_pdf(file: UploadFile, file_bytes: bytes) -> None:
    """
    Validate that the uploaded file is a valid PDF within the 20MB size threshold.
    Throws HTTPException if validation fails.
    """
    filename = (file.filename or "").strip()
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed"
        )

    # Content type check (allow application/pdf or application/x-pdf)
    content_type = (file.content_type or "").lower()
    if content_type and "pdf" not in content_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid MIME type. Only application/pdf is accepted."
        )

    # Size check
    file_size = len(file_bytes)
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty"
        )

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large"
        )

    # Magic byte check: Valid PDF starts with %PDF-
    if not file_bytes.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File header is not a valid PDF format"
        )

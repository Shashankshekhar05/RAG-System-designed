from pathlib import Path
from typing import List, Dict, Any, Union
import fitz  # PyMuPDF
from app.utils.logger import logger


def parse_pdf(file_path: Union[str, Path]) -> List[Dict[str, Any]]:
    """
    Extract text per page from a PDF file using PyMuPDF.
    Returns a list of dicts: [{"page_no": int, "text": str}]
    """
    path_obj = Path(file_path)
    if not path_obj.exists():
        raise FileNotFoundError(f"PDF file not found at: {file_path}")

    pages_data: List[Dict[str, Any]] = []

    try:
        doc = fitz.open(str(path_obj))
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            text = page.get_text("text")
            pages_data.append({
                "page_no": page_idx + 1,
                "text": text or ""
            })
        doc.close()
    except Exception as e:
        logger.error(f"Error parsing PDF file {file_path}: {e}")
        raise RuntimeError(f"Failed to parse PDF document: {e}")

    return pages_data

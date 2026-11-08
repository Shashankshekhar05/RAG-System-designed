from typing import List, Dict, Any
from app.utils.logger import logger


def log_retrieval(session_id: str, question: str, chunks_found: List[Dict[str, Any]]) -> None:
    """
    Log retrieval metadata to aid in future Recall@10 quality benchmarking.
    """
    chunk_count = len(chunks_found)
    logger.info(
        f"[RecallAudit] session_id={session_id} | question='{question[:50]}' | chunks_retrieved={chunk_count}"
    )

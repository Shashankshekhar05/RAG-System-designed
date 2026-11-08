from typing import Optional, List, Dict, Any
from app.services.cache.exact_cache import get_exact, set_exact
from app.services.cache.semantic_cache import get_semantic, set_semantic
from app.utils.logger import logger


def check_cache(
    question: str,
    question_embedding: List[float],
    doc_id: str,
    user_id: str
) -> Optional[Dict[str, Any]]:
    """
    Tiered caching lookup:
    1. Probe Exact Hash cache in Redis.
    2. If MISS, probe Semantic Cosine cache in Redis (>0.92 threshold).
    3. Return cached answer with 0 tokens used, or None.
    """
    # Tier 1: Exact Match
    exact_hit = get_exact(question, doc_id, user_id)
    if exact_hit:
        return exact_hit

    # Tier 2: Semantic Match
    semantic_hit = get_semantic(question_embedding, doc_id, user_id)
    if semantic_hit:
        return semantic_hit

    return None


def save_to_cache(
    question: str,
    question_embedding: List[float],
    answer: str,
    doc_id: str,
    user_id: str,
    citations: Optional[list] = None
) -> None:
    """Populate both Exact and Semantic cache stores."""
    set_exact(question, answer, doc_id, user_id, citations)
    set_semantic(question, question_embedding, answer, doc_id, user_id, citations)

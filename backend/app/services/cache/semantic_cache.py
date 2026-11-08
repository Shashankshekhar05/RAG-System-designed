import json
import uuid
from typing import Optional, List, Dict, Any
from app.redis_client import get_redis_client
from app.utils.logger import logger

SEMANTIC_CACHE_TTL = 86400  # 24 Hours
SIMILARITY_THRESHOLD = 0.92


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calculate cosine similarity between two normalized vectors (dot product)."""
    if len(vec1) != len(vec2):
        return 0.0
    return sum(a * b for a, b in zip(vec1, vec2))


def get_semantic(
    question_embedding: List[float],
    doc_id: str,
    user_id: str,
    threshold: float = SIMILARITY_THRESHOLD
) -> Optional[Dict[str, Any]]:
    """
    Search Redis for semantically similar questions for user_id + doc_id with cosine similarity >= 0.92.
    Returns matched cache item if found, else None.
    """
    redis = get_redis_client()
    if redis is None:
        return None

    pattern = f"semantic:{user_id}:{doc_id}:*"
    best_match: Optional[Dict[str, Any]] = None
    highest_similarity = -1.0

    try:
        keys = redis.keys(pattern)
        if not keys:
            return None

        # Fetch all candidate embeddings
        for key in keys:
            raw_data = redis.get(key)
            if not raw_data:
                continue

            entry = json.loads(raw_data)
            cached_emb = entry.get("embedding")
            if not cached_emb:
                continue

            sim = cosine_similarity(question_embedding, cached_emb)
            if sim > highest_similarity:
                highest_similarity = sim
                best_match = entry

        if highest_similarity >= threshold and best_match:
            logger.info(
                f"Semantic cache HIT (similarity={highest_similarity:.4f} >= {threshold}) for doc_id={doc_id}"
            )
            return {
                "answer": best_match["answer"],
                "similarity": round(highest_similarity, 4),
                "matched_question": best_match.get("question_text", ""),
                "citations": best_match.get("citations", []),
                "cache_hit": True,
                "cache_type": "semantic",
                "tokens_used": 0
            }
    except Exception as e:
        logger.warning(f"Error querying semantic cache: {e}")

    return None


def set_semantic(
    question_text: str,
    question_embedding: List[float],
    answer: str,
    doc_id: str,
    user_id: str,
    citations: Optional[list] = None,
    ttl: int = SEMANTIC_CACHE_TTL
) -> bool:
    """Save question embedding and answer to Redis semantic cache with 24h TTL."""
    redis = get_redis_client()
    if redis is None:
        return False

    item_id = str(uuid.uuid4())
    key = f"semantic:{user_id}:{doc_id}:{item_id}"
    payload = {
        "question_text": question_text,
        "embedding": question_embedding,
        "answer": answer,
        "citations": citations or [],
        "doc_id": str(doc_id),
        "user_id": str(user_id)
    }

    try:
        redis.setex(key, ttl, json.dumps(payload))
        return True
    except Exception as e:
        logger.warning(f"Error saving to semantic cache: {e}")
        return False

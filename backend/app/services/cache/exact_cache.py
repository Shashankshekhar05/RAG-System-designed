import json
import hashlib
from typing import Optional, Dict, Any
from app.redis_client import get_redis_client
from app.utils.logger import logger

EXACT_CACHE_TTL = 86400  # 24 Hours


def generate_exact_key(user_id: str, doc_id: str, question: str) -> str:
    """Generate deterministic exact cache key: exact:{user_id}:{doc_id}:{sha256}."""
    normalized = question.strip().lower()
    q_hash = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    return f"exact:{user_id}:{doc_id}:{q_hash}"


def get_exact(question_text: str, doc_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    """
    Check Redis for exact matching question for user_id + doc_id.
    Returns cached response dict if hit, else None.
    """
    redis = get_redis_client()
    if redis is None:
        return None

    key = generate_exact_key(user_id, doc_id, question_text)
    try:
        cached_data = redis.get(key)
        if cached_data:
            logger.info(f"Exact cache HIT for doc_id={doc_id}")
            result = json.loads(cached_data)
            result["cache_hit"] = True
            result["cache_type"] = "exact"
            result["tokens_used"] = 0
            return result
    except Exception as e:
        logger.warning(f"Error querying exact cache: {e}")

    return None


def set_exact(
    question: str,
    answer: str,
    doc_id: str,
    user_id: str,
    citations: Optional[list] = None,
    ttl: int = EXACT_CACHE_TTL
) -> bool:
    """Persist exact question-answer pair into Redis with 24h TTL."""
    redis = get_redis_client()
    if redis is None:
        return False

    key = generate_exact_key(user_id, doc_id, question)
    payload = {
        "question": question,
        "answer": answer,
        "citations": citations or [],
        "doc_id": str(doc_id),
        "user_id": str(user_id)
    }

    try:
        redis.setex(key, ttl, json.dumps(payload))
        return True
    except Exception as e:
        logger.warning(f"Error saving to exact cache: {e}")
        return False

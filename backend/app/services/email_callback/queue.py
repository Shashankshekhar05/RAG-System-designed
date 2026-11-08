import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from app.redis_client import get_redis_client
from app.utils.logger import logger

EMAIL_QUEUE_KEY = "email_callback_queue"


def enqueue_email_job(
    message_id: str,
    user_id: str,
    doc_id: str,
    question: str,
    session_id: str,
    to_email: Optional[str] = None
) -> str:
    """
    Push an email callback job into Redis List 'email_callback_queue'.
    Returns unique job_id string.
    """
    redis = get_redis_client()
    job_id = str(uuid.uuid4())
    job_payload = {
        "job_id": job_id,
        "message_id": str(message_id),
        "user_id": str(user_id),
        "doc_id": str(doc_id),
        "question": question,
        "session_id": str(session_id),
        "to_email": to_email,
        "retry_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    if redis is None:
        logger.error("Redis is unavailable, cannot enqueue email job")
        return job_id

    try:
        redis.rpush(EMAIL_QUEUE_KEY, json.dumps(job_payload))
        logger.info(f"Enqueued email callback job_id={job_id} for message_id={message_id}")
    except Exception as e:
        logger.error(f"Failed to enqueue email job: {e}")

    return job_id


def dequeue_email_job(timeout: int = 1) -> Optional[Dict[str, Any]]:
    """
    Pop a job from the Redis list (FIFO).
    Returns job dictionary or None if queue is empty.
    """
    redis = get_redis_client()
    if redis is None:
        return None

    try:
        raw_val = redis.lpop(EMAIL_QUEUE_KEY)
        if raw_val:
            return json.loads(raw_val)
    except Exception as e:
        logger.warning(f"Error popping from email queue: {e}")

    return None


def re_enqueue_job(job_data: Dict[str, Any]) -> None:
    """Re-push a failed job back into the Redis queue for delayed retry."""
    redis = get_redis_client()
    if redis is None:
        return

    try:
        redis.rpush(EMAIL_QUEUE_KEY, json.dumps(job_data))
        logger.info(f"Re-enqueued job_id={job_data.get('job_id')} (retry_count={job_data.get('retry_count')})")
    except Exception as e:
        logger.error(f"Failed to re-enqueue job: {e}")


def get_queue_length() -> int:
    """Return total number of pending jobs in Redis queue."""
    redis = get_redis_client()
    if redis is None:
        return 0

    try:
        return int(redis.llen(EMAIL_QUEUE_KEY))
    except Exception:
        return 0

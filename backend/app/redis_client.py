from app.config import settings

try:
    import redis
    redis_client = redis.Redis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
        socket_timeout=2.0,
        socket_connect_timeout=2.0
    )
except Exception:
    redis_client = None


def get_redis_client():
    return redis_client


def check_redis_status() -> str:
    if redis_client is None:
        return "disconnected"
    try:
        if redis_client.ping():
            return "connected"
        return "disconnected"
    except Exception:
        return "disconnected"

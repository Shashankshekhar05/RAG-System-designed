from fastapi import APIRouter
from sqlalchemy import text
from app.db import engine
from app.redis_client import check_redis_status
from app.qdrant_client import check_qdrant_status

router = APIRouter(tags=["Health"])


def check_postgres_status() -> str:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return "connected"
    except Exception:
        return "disconnected"


@router.get("/health")
def health_check():
    """
    Health check endpoint verifying PostgreSQL, Redis, and Qdrant connectivity.
    Will never throw 500 or crash even if downstream services are unreachable.
    """
    pg_status = check_postgres_status()
    redis_status = check_redis_status()
    qdrant_status = check_qdrant_status()

    return {
        "status": "ok",
        "postgres": pg_status,
        "redis": redis_status,
        "qdrant": qdrant_status
    }


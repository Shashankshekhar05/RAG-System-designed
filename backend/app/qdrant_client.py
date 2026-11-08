from app.config import settings

try:
    from qdrant_client import QdrantClient
    qdrant_client = QdrantClient(url=settings.QDRANT_URL, timeout=2.0)
except Exception:
    qdrant_client = None


def get_qdrant_client():
    return qdrant_client


def check_qdrant_status() -> str:
    if qdrant_client is None:
        return "disconnected"
    try:
        qdrant_client.get_collections()
        return "connected"
    except Exception:
        return "disconnected"

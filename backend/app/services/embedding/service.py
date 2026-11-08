from app.services.embedding.local_embedder import EMBEDDING_DIM


def get_embedding_dimension() -> int:
    """Return embedding vector dimension (384 for all-MiniLM-L6-v2)."""
    return EMBEDDING_DIM

from typing import List, Optional
from app.utils.logger import logger

# Singleton holder for SentenceTransformer model
_model_instance = None
MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384
BATCH_SIZE = 32


def get_embedding_model():
    """Lazy-load the SentenceTransformer model once (Singleton)."""
    global _model_instance
    if _model_instance is None:
        logger.info(f"Loading local embedding model '{MODEL_NAME}' into memory...")
        try:
            from sentence_transformers import SentenceTransformer
            _model_instance = SentenceTransformer(MODEL_NAME)
            logger.info(f"Model '{MODEL_NAME}' successfully loaded.")
        except Exception as e:
            logger.error(f"Failed to load sentence_transformers model '{MODEL_NAME}': {e}")
            raise RuntimeError(f"Embedding model initialization failed: {e}")
    return _model_instance


def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Generate normalized embeddings for a list of text strings in batches of 32.
    Returns: List[List[float]] with dimension 384.
    """
    if not texts:
        return []

    model = get_embedding_model()
    # Batch encode with batch_size 32
    embeddings = model.encode(
        texts,
        batch_size=BATCH_SIZE,
        show_progress_bar=False,
        normalize_embeddings=True
    )
    return embeddings.tolist()


def embed_single_query(text: str) -> List[float]:
    """
    Generate normalized embedding for a single query string (for retrieval/search).
    Returns: List[float] with dimension 384.
    """
    model = get_embedding_model()
    embedding = model.encode(
        text,
        show_progress_bar=False,
        normalize_embeddings=True
    )
    return embedding.tolist()

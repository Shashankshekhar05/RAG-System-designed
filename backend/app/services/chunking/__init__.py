from app.services.chunking.config import CHUNK_SIZE, CHUNK_OVERLAP
from app.services.chunking.chunker import chunk_text

__all__ = ["CHUNK_SIZE", "CHUNK_OVERLAP", "chunk_text"]

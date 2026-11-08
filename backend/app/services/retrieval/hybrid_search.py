from typing import List, Dict, Any
try:
    from qdrant_client.http.models import Filter, FieldCondition, MatchValue
except ImportError:
    Filter = FieldCondition = MatchValue = None
from app.qdrant_client import get_qdrant_client
from app.services.ingestion.pipeline import COLLECTION_NAME
from app.utils.logger import logger


def search(
    question_embedding: List[float],
    question_text: str,
    user_id: str,
    doc_id: str,
    top_k: int = 10
) -> List[Dict[str, Any]]:
    """
    Search Qdrant for top_k chunks matching question_embedding.
    STRICT SECURITY RULE: Query filter MUST ALWAYS enforce user_id and doc_id matching!
    """
    client = get_qdrant_client()
    if client is None:
        logger.error("Qdrant client unavailable during search")
        return []

    # Mandatory security filter
    query_filter = Filter(
        must=[
            FieldCondition(key="user_id", match=MatchValue(value=str(user_id))),
            FieldCondition(key="doc_id", match=MatchValue(value=str(doc_id))),
        ]
    )

    try:
        # qdrant-client >= 1.10 uses query_points, earlier versions use search
        if hasattr(client, "query_points"):
            response = client.query_points(
                collection_name=COLLECTION_NAME,
                query=question_embedding,
                query_filter=query_filter,
                limit=top_k
            )
            hits = response.points
        elif hasattr(client, "search"):
            hits = client.search(
                collection_name=COLLECTION_NAME,
                query_vector=question_embedding,
                query_filter=query_filter,
                limit=top_k
            )
        else:
            hits = []

        candidates: List[Dict[str, Any]] = []
        for hit in hits:
            payload = hit.payload or {}
            candidates.append({
                "chunk_text": payload.get("chunk_text", ""),
                "page_no": payload.get("page_no", 1),
                "chunk_index": payload.get("chunk_index", 0),
                "score": float(hit.score)
            })

        logger.info(f"Retrieved {len(candidates)} candidate chunks from Qdrant for doc_id={doc_id}")
        return candidates

    except Exception as e:
        logger.error(f"Error executing Qdrant search: {e}")
        return []

import re
from typing import List, Dict, Any


def extract_keywords(text: str) -> List[str]:
    """Extract lowercase alphanumeric keywords of length >= 3."""
    words = re.findall(r"\b[a-zA-Z0-9_\u0900-\u097F]{3,}\b", text.lower())
    # Exclude common stopwords
    stopwords = {
        "what", "when", "where", "which", "who", "whom", "this", "that", "these",
        "those", "have", "from", "with", "about", "your", "kya", "hai", "hain",
        "kaise", "kahan", "kitna", "kitni", "mujhe", "batao", "iska", "iski",
        "isme", "unka", "aur", "par", "the", "and", "for"
    }
    return [w for w in words if w not in stopwords]


def rerank(question_text: str, chunks: List[Dict[str, Any]], top_n: int = 3) -> List[Dict[str, Any]]:
    """
    Score and re-rank candidate chunks based on keyword matching overlap combined with vector score.
    Returns exactly top_n (default 3) most relevant chunks.
    """
    if not chunks:
        return []

    keywords = extract_keywords(question_text)

    scored_chunks = []
    for chunk in chunks:
        chunk_text_lower = chunk.get("chunk_text", "").lower()
        keyword_hits = 0

        for kw in keywords:
            if kw in chunk_text_lower:
                keyword_hits += 1

        # Hybrid score combines keyword matches and vector similarity
        vector_score = chunk.get("score", 0.0)
        # Weight keyword overlap heavily alongside vector score
        composite_score = (keyword_hits * 1.5) + vector_score

        scored_chunks.append({
            "chunk_text": chunk.get("chunk_text", ""),
            "page_no": chunk.get("page_no", 1),
            "chunk_index": chunk.get("chunk_index", 0),
            "vector_score": vector_score,
            "keyword_hits": keyword_hits,
            "final_score": composite_score
        })

    # Sort descending by final score
    scored_chunks.sort(key=lambda x: x["final_score"], reverse=True)

    # Pick Top 3
    top_chunks = scored_chunks[:top_n]
    return top_chunks

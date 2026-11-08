import re
from typing import List, Dict, Any
from app.services.chunking.config import CHUNK_SIZE, CHUNK_OVERLAP


def split_into_sentences(text: str) -> List[str]:
    """Split text into sentences while preserving meaningful punctuation."""
    # Split on sentence terminals followed by whitespace, or double newlines
    raw_sentences = re.split(r"(?<=[.!?])\s+|\n\n+", text)
    return [s.strip() for s in raw_sentences if s.strip()]


def chunk_text(pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Chunk extracted pages into pieces of approx CHUNK_SIZE (800) characters
    with CHUNK_OVERLAP (100) characters overlap, breaking on sentence boundaries where possible.
    Returns: List[{"chunk_text": str, "page_no": int, "chunk_index": int}]
    """
    chunks: List[Dict[str, Any]] = []
    chunk_index = 0

    for page in pages:
        page_no = page.get("page_no", 1)
        raw_text = page.get("text", "").strip()

        if not raw_text:
            continue

        sentences = split_into_sentences(raw_text)
        if not sentences:
            continue

        current_sentences: List[str] = []
        current_len = 0

        for sentence in sentences:
            sentence_len = len(sentence)

            # If a single sentence exceeds CHUNK_SIZE, slice it
            if sentence_len > CHUNK_SIZE:
                # Flush existing buffer first
                if current_sentences:
                    chunk_str = " ".join(current_sentences).strip()
                    if chunk_str:
                        chunks.append({
                            "chunk_text": chunk_str,
                            "page_no": page_no,
                            "chunk_index": chunk_index
                        })
                        chunk_index += 1
                    current_sentences = []
                    current_len = 0

                # Slice large sentence
                start = 0
                while start < sentence_len:
                    end = min(start + CHUNK_SIZE, sentence_len)
                    sub_text = sentence[start:end].strip()
                    if sub_text:
                        chunks.append({
                            "chunk_text": sub_text,
                            "page_no": page_no,
                            "chunk_index": chunk_index
                        })
                        chunk_index += 1
                    if end == sentence_len:
                        break
                    start += (CHUNK_SIZE - CHUNK_OVERLAP)
                continue

            # Standard accumulation
            if current_len + sentence_len + 1 > CHUNK_SIZE and current_sentences:
                chunk_str = " ".join(current_sentences).strip()
                if chunk_str:
                    chunks.append({
                        "chunk_text": chunk_str,
                        "page_no": page_no,
                        "chunk_index": chunk_index
                    })
                    chunk_index += 1

                # Calculate overlap sentences from the tail of current_sentences
                overlap_sentences: List[str] = []
                overlap_len = 0
                for s in reversed(current_sentences):
                    if overlap_len + len(s) + 1 <= CHUNK_OVERLAP:
                        overlap_sentences.insert(0, s)
                        overlap_len += len(s) + 1
                    else:
                        break

                current_sentences = overlap_sentences + [sentence]
                current_len = sum(len(s) + 1 for s in current_sentences)
            else:
                current_sentences.append(sentence)
                current_len += sentence_len + 1

        # Flush remaining sentences on page
        if current_sentences:
            chunk_str = " ".join(current_sentences).strip()
            if chunk_str:
                chunks.append({
                    "chunk_text": chunk_str,
                    "page_no": page_no,
                    "chunk_index": chunk_index
                })
                chunk_index += 1

    return chunks

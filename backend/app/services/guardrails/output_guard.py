import re
from typing import List, Dict, Any

FALLBACK_ANSWER = "Iska jawab is document me nahi mila"
FALLBACK_ANSWER_EN = "The answer to this question is not found in the document."

FALLBACK_PHRASES = [
    "iska jawab is document me nahi mila",
    "the answer to this question is not found in the document",
    "the answer was not found in this document",
    "answer not found in the document",
    "the document does not contain",
    "not found in the document",
    "not mentioned in the document",
    "not provided in the document"
]

# Internal system leak indicators
LEAK_PATTERNS = [
    r"tu\s+tokensaver\s+rag\s+hai",
    r"you\s+are\s+tokensaver\s+rag",
    r"system\s*prompt",
    r"grok_api_key",
    r"\bsk-[a-zA-Z0-9]{20,}\b",
    r"postgres://",
    r"redis://"
]


def is_hindi_chunks(chunks: List[Dict[str, Any]]) -> bool:
    """Check if the context chunks contain Devanagari Hindi text."""
    all_chunk_text = " ".join(c.get("chunk_text", "") for c in chunks)
    return len(re.findall(r"[\u0900-\u097F]", all_chunk_text)) > 20


def get_fallback_answer(chunks: List[Dict[str, Any]] = None) -> str:
    """Return language-appropriate fallback answer based on document text."""
    if chunks and is_hindi_chunks(chunks):
        return FALLBACK_ANSWER
    return FALLBACK_ANSWER_EN


def check_output(answer: str, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Validate LLM output against grounding and privacy leaks.
    Returns: {"passed": bool, "safe_answer": str}
    """
    clean_ans = answer.strip()
    fallback = get_fallback_answer(chunks)

    if not clean_ans:
        return {"passed": False, "safe_answer": fallback}

    # If the LLM faithfully responded that context doesn't contain the answer
    clean_lower = clean_ans.lower()
    for phrase in FALLBACK_PHRASES:
        if phrase in clean_lower:
            return {"passed": True, "safe_answer": fallback}

    # 1. Privacy / Leak Check
    for leak in LEAK_PATTERNS:
        if re.search(leak, clean_ans, re.IGNORECASE):
            return {"passed": False, "safe_answer": fallback}

    # 2. Grounding Check (if no chunks were provided at all, the answer cannot be grounded)
    if not chunks:
        return {"passed": False, "safe_answer": fallback}

    all_chunk_text = " ".join(c.get("chunk_text", "") for c in chunks).lower()

    # Extract distinct numerical figures from answer (e.g. $500, 2024, 45%)
    numbers_in_answer = set(re.findall(r"\b\d+(?:\.\d+)?\b", clean_ans))
    # If answer contains numbers, check if at least one number appears in the chunk text
    if numbers_in_answer:
        numbers_in_chunks = set(re.findall(r"\b\d+(?:\.\d+)?\b", all_chunk_text))
        # If numbers are cited but none match context, high hallucination probability
        matching_numbers = numbers_in_answer.intersection(numbers_in_chunks)
        if not matching_numbers and len(numbers_in_answer) > 1:
            return {"passed": False, "safe_answer": fallback}

    return {"passed": True, "safe_answer": clean_ans}

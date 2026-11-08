import re
from typing import Dict, Any

# Jailbreak & Prompt Injection patterns
JAILBREAK_PATTERNS = [
    r"ignore\s+(previous|all|the)\s+instructions",
    r"system\s*prompt\s*(dikhao|show|give|print)",
    r"you\s+are\s+now",
    r"\bdan\s+mode\b",
    r"\bjailbreak\b",
    r"apne\s+instructions\s+bhool\s+jao",
    r"disregard\s+(previous|all)\s+instructions",
    r"pretend\s+you\s+are",
    r"bypass\s+rules",
    r"reveal\s+system\s+prompt"
]

# Sensitive PII patterns (Aadhar 12 digits, Credit Card 16 digits)
PII_PATTERNS = [
    r"\b[2-9]{1}[0-9]{3}[ -]?[0-9]{4}[ -]?[0-9]{4}\b",  # Aadhar
    r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\b",  # Credit Card
]

# Out of scope conversational chit-chat patterns
OUT_OF_SCOPE_PATTERNS = [
    r"^(mujhe\s+)?(ek\s+)?joke\s+(sunao|batao|tell)",
    r"^tell\s+me\s+a\s+joke",
    r"^mausam\s+(kaisa\s+hai|today)",
    r"^what\s+is\s+the\s+weather",
    r"^sing\s+(me\s+)?a\s+song",
    r"^write\s+a\s+poem",
    r"^who\s+is\s+the\s+(president|prime\s+minister)\s+of",
    r"^cricket\s+score\s+kya\s+hai"
]


def check_input(question: str) -> Dict[str, Any]:
    """
    Validate incoming user query against prompt injection, sensitive PII,
    and out-of-scope chit-chat patterns.
    Returns: {"allowed": bool, "reason": Optional[str]}
    """
    clean_q = question.strip().lower()

    if not clean_q:
        return {"allowed": False, "reason": "empty"}

    # 1. Jailbreak & Prompt Injection Check
    for pattern in JAILBREAK_PATTERNS:
        if re.search(pattern, clean_q, re.IGNORECASE):
            return {"allowed": False, "reason": "jailbreak"}

    # 2. PII Check
    for pattern in PII_PATTERNS:
        if re.search(pattern, question):
            return {"allowed": False, "reason": "pii"}

    # 3. Out of scope Chit-Chat Check
    for pattern in OUT_OF_SCOPE_PATTERNS:
        if re.search(pattern, clean_q, re.IGNORECASE):
            return {"allowed": False, "reason": "out_of_scope"}

    return {"allowed": True, "reason": None}

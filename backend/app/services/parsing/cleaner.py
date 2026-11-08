import re


def clean_text(text: str) -> str:
    """
    Clean extracted raw text:
    - Replace Windows carriage returns
    - Consolidate 3+ newlines into 2
    - Collapse multiple spaces/tabs into a single space
    - Strip leading and trailing whitespace
    """
    if not text:
        return ""

    # Normalize CRLF
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")

    # Replace 3 or more consecutive newlines with 2
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)

    # Replace multiple spaces/tabs within lines
    normalized = re.sub(r"[ \t]+", " ", normalized)

    # Clean lines and join
    lines = [line.strip() for line in normalized.split("\n")]
    cleaned = "\n".join(lines).strip()

    return cleaned

def count_tokens(text: str) -> int:
    """Approximate token count calculation: len(text) // 4."""
    if not text:
        return 0
    return max(1, len(text) // 4)

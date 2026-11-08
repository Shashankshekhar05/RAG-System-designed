import uuid


def generate_uuid() -> str:
    """Generate a random UUID string."""
    return str(uuid.uuid4())


import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Uuid
from sqlalchemy.sql import func
from app.db import Base


class EmailJob(Base):
    __tablename__ = "email_jobs"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    message_id = Column(Uuid, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    to_email = Column(String(255), nullable=False)
    # status: pending / sent / failed
    status = Column(String(50), default="pending", nullable=False)
    retry_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

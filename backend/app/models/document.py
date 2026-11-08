import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Uuid
from sqlalchemy.sql import func
from app.db import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=False)
    # status: uploading / processing / ready / failed
    status = Column(String(50), default="uploading", nullable=False)
    total_chunks = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

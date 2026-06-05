from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.models.base import Base


class RecordingStatus(str, enum.Enum):
    UPLOADING = "uploading"
    PROCESSING = "processing"
    TRANSCRIBED = "transcribed"
    FAILED = "failed"


class Recording(Base):
    __tablename__ = "recordings"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    biography_id = Column(String, ForeignKey("biographies.id"), nullable=True)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    audio_url = Column(String, nullable=False)
    duration_seconds = Column(Integer, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)

    transcript = Column(Text, nullable=True)
    transcript_segments = Column(Text, nullable=True)

    status = Column(Enum(RecordingStatus), default=RecordingStatus.UPLOADING)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="recordings")
    biography = relationship("Biography", back_populates="recordings")
    biography_entries = relationship("BiographyEntry", back_populates="recording")

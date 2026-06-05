from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Enum, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.models.base import Base


class BiographyStyle(str, enum.Enum):
    LYRICAL = "lyrical"
    RIGOROUS = "rigorous"
    STORY = "story"
    CHRONOLOGICAL = "chronological"


class BiographyStatus(str, enum.Enum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    COMPLETED = "completed"


class Biography(Base):
    __tablename__ = "biographies"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    style = Column(Enum(BiographyStyle), default=BiographyStyle.STORY)
    status = Column(Enum(BiographyStatus), default=BiographyStatus.DRAFT)

    birth_year = Column(Integer, nullable=True)
    hometown = Column(String, nullable=True)
    key_events = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="biographies")
    recordings = relationship("Recording", back_populates="biography")
    entries = relationship("BiographyEntry", back_populates="biography", order_by="BiographyEntry.chapter_number")
    chapters = relationship("Chapter", back_populates="biography")


class BiographyEntry(Base):
    __tablename__ = "biography_entries"

    id = Column(String, primary_key=True)
    biography_id = Column(String, ForeignKey("biographies.id"), nullable=False)
    recording_id = Column(String, ForeignKey("recordings.id"), nullable=True)

    chapter_number = Column(Integer, nullable=True)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    original_transcript = Column(Text, nullable=True)

    time_period_start = Column(String, nullable=True)
    time_period_end = Column(String, nullable=True)
    location = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    biography = relationship("Biography", back_populates="entries")
    recording = relationship("Recording", back_populates="biography_entries")


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(String, primary_key=True)
    biography_id = Column(String, ForeignKey("biographies.id"), nullable=False)
    number = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    content = Column(Text, nullable=False, default="")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    biography = relationship("Biography", back_populates="chapters")

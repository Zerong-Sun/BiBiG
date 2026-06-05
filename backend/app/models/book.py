from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Enum, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.models.base import Base


class BookFormat(str, enum.Enum):
    PDF = "pdf"
    EPUB = "epub"
    DOCX = "docx"


class BookStatus(str, enum.Enum):
    GENERATING = "generating"
    READY = "ready"
    FAILED = "failed"


class Book(Base):
    __tablename__ = "books"

    id = Column(String, primary_key=True)
    biography_id = Column(String, ForeignKey("biographies.id"), nullable=False)
    title = Column(String, nullable=False)
    author_name = Column(String, nullable=True)
    cover_image_url = Column(String, nullable=True)

    format = Column(Enum(BookFormat), default=BookFormat.PDF)
    file_url = Column(String, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)

    page_count = Column(Integer, nullable=True)
    word_count = Column(Integer, nullable=True)

    status = Column(Enum(BookStatus), default=BookStatus.GENERATING)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    biography = relationship("Biography")

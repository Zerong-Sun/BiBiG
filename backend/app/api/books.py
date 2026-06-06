import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.auth import get_current_user
from app.models.base import get_db
from app.models.biography import Biography
from app.models.book import Book, BookFormat
from app.models.user import User
from app.services.book.book_generator import BookGenerator

router = APIRouter()


def _require_biography_owner(biography_id: str, current_user: User, db: Session) -> Biography:
    biography = db.query(Biography).filter(Biography.id == biography_id).first()
    if not biography:
        raise HTTPException(status_code=404, detail="Biography not found")
    if biography.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot access another user's biography")
    return biography


@router.post("/generate/{biography_id}")
async def generate_book(
    biography_id: str,
    book_format: BookFormat = BookFormat.PDF,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_biography_owner(biography_id, current_user, db)
    generator = BookGenerator(db)
    try:
        book = await generator.generate_book(biography_id, book_format)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return {
        "id": book.id,
        "biography_id": book.biography_id,
        "title": book.title,
        "format": book.format.value,
        "file_url": book.file_url,
        "status": book.status.value,
        "word_count": book.word_count,
    }


@router.get("/{book_id}")
async def get_book(
    book_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    _require_biography_owner(book.biography_id, current_user, db)

    return {
        "id": book.id,
        "biography_id": book.biography_id,
        "title": book.title,
        "format": book.format.value,
        "file_url": book.file_url,
        "status": book.status.value,
        "word_count": book.word_count,
    }


@router.get("/{book_id}/download")
async def download_book(
    book_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book or not book.file_url:
        raise HTTPException(status_code=404, detail="Book file not found")
    _require_biography_owner(book.biography_id, current_user, db)

    if os.path.isfile(book.file_url):
        return FileResponse(
            book.file_url,
            media_type="application/pdf",
            filename=f"{book.title}.pdf",
        )

    raise HTTPException(status_code=404, detail="Book file not available locally")

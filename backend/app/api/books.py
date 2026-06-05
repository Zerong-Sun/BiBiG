import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.models.base import get_db
from app.models.book import Book, BookFormat
from app.services.book.book_generator import BookGenerator

router = APIRouter()


@router.post("/generate/{biography_id}")
async def generate_book(
    biography_id: str,
    book_format: BookFormat = BookFormat.PDF,
    db: Session = Depends(get_db),
):
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
async def get_book(book_id: str, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

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
async def download_book(book_id: str, db: Session = Depends(get_db)):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book or not book.file_url:
        raise HTTPException(status_code=404, detail="Book file not found")

    if os.path.isfile(book.file_url):
        return FileResponse(
            book.file_url,
            media_type="application/pdf",
            filename=f"{book.title}.pdf",
        )

    raise HTTPException(status_code=404, detail="Book file not available locally")

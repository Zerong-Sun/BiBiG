import json
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.auth import get_current_user
from app.models.base import get_db
from app.models.biography import Biography, BiographyEntry, BiographyStyle
from app.models.book import Book
from app.models.user import User
from app.services.biography.biography_service import BiographyService
from app.services.biography.skill_fragments import get_biography_skills

router = APIRouter()


class CreateBiographyRequest(BaseModel):
    user_id: str
    title: str
    style: BiographyStyle = BiographyStyle.STORY
    description: Optional[str] = None
    birth_year: Optional[int] = None
    hometown: Optional[str] = None
    key_events: Optional[List[str]] = None
    recording_method: str = "guided"


class ProcessRecordingRequest(BaseModel):
    recording_id: str
    transcript: Optional[str] = None


class SaveAnswerRequest(BaseModel):
    question_index: int
    answer: str
    recording_id: str | None = None


class GenerateQuestionsRequest(BaseModel):
    mode: str = "ai"
    custom_questions: Optional[List[str]] = None


@router.post("/")
async def create_biography(
    request: CreateBiographyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if request.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot create biography for another user")
    service = BiographyService(db, user_id=request.user_id)
    biography = await service.create_biography(
        user_id=request.user_id,
        title=request.title,
        style=request.style,
        description=request.description,
        birth_year=request.birth_year,
        hometown=request.hometown,
        key_events=json.dumps(request.key_events, ensure_ascii=False) if request.key_events else None,
        recording_method=request.recording_method,
    )
    return {
        "id": biography.id,
        "user_id": biography.user_id,
        "title": biography.title,
        "style": biography.style.value,
        "status": biography.status.value,
        "description": biography.description,
        "birth_year": biography.birth_year,
        "hometown": biography.hometown,
        "recording_method": biography.recording_method,
    }


@router.post("/{biography_id}/process")
async def process_recording(
    biography_id: str,
    request: ProcessRecordingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biography = db.query(Biography).filter(Biography.id == biography_id).first()
    if not biography:
        raise HTTPException(status_code=404, detail="Biography not found")
    if biography.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot access another user's biography")
    service = BiographyService(db, user_id=current_user.id)
    try:
        entry = await service.organize_transcript(
            biography_id=biography_id,
            recording_id=request.recording_id,
            transcript_override=request.transcript,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return {
        "id": entry.id,
        "title": entry.title,
        "content": entry.content,
        "biography_id": entry.biography_id,
    }


@router.get("/{biography_id}/questions")
async def get_suggested_questions(
    biography_id: str,
    mode: str = Query("ai"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biography = db.query(Biography).filter(Biography.id == biography_id).first()
    if not biography:
        raise HTTPException(status_code=404, detail="Biography not found")
    if biography.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot access another user's biography")
    service = BiographyService(db, user_id=current_user.id)
    try:
        questions = await service.generate_questions(biography_id, mode=mode)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    return {"questions": questions, "skills": get_biography_skills()}


@router.post("/{biography_id}/questions")
async def generate_questions_with_options(
    biography_id: str,
    request: GenerateQuestionsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biography = db.query(Biography).filter(Biography.id == biography_id).first()
    if not biography:
        raise HTTPException(status_code=404, detail="Biography not found")
    if biography.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot access another user's biography")
    service = BiographyService(db, user_id=current_user.id)
    questions = await service.generate_questions(
        biography_id,
        mode=request.mode,
        custom_questions=request.custom_questions,
    )
    return {"questions": questions, "skills": get_biography_skills()}


@router.post("/{biography_id}/answers")
async def save_answer(
    biography_id: str,
    request: SaveAnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biography = db.query(Biography).filter(Biography.id == biography_id).first()
    if not biography:
        raise HTTPException(status_code=404, detail="Biography not found")
    if biography.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot access another user's biography")

    entry = BiographyEntry(
        id=str(uuid.uuid4()),
        biography_id=biography_id,
        recording_id=request.recording_id,
        title=f"追问回答 #{request.question_index + 1}",
        content=request.answer,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return {
        "id": entry.id,
        "biography_id": biography_id,
        "question_index": request.question_index,
        "answer": request.answer,
        "saved": True,
    }


class UpdateEntryRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


@router.put("/{biography_id}/entries/{entry_id}")
async def update_entry(
    biography_id: str,
    entry_id: str,
    request: UpdateEntryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biography = db.query(Biography).filter(Biography.id == biography_id).first()
    if not biography:
        raise HTTPException(status_code=404, detail="Biography not found")
    if biography.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot access another user's biography")

    entry = (
        db.query(BiographyEntry)
        .filter(BiographyEntry.id == entry_id, BiographyEntry.biography_id == biography_id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    if request.title is not None:
        entry.title = request.title
    if request.content is not None:
        entry.content = request.content

    db.commit()
    db.refresh(entry)

    return {
        "id": entry.id,
        "title": entry.title,
        "content": entry.content,
        "original_transcript": entry.original_transcript,
    }


def _status_value(status) -> str:
    return status.value if hasattr(status, "value") else str(status)


@router.get("/user/{user_id}/works")
async def list_user_works(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot access another user's biographies")
    from sqlalchemy import func

    biographies = (
        db.query(Biography)
        .filter(Biography.user_id == user_id)
        .order_by(Biography.created_at.desc())
        .all()
    )
    if not biographies:
        return []

    bio_ids = [b.id for b in biographies]
    entry_counts = dict(
        db.query(BiographyEntry.biography_id, func.count(BiographyEntry.id))
        .filter(BiographyEntry.biography_id.in_(bio_ids))
        .group_by(BiographyEntry.biography_id)
        .all()
    )
    books = (
        db.query(Book)
        .filter(Book.biography_id.in_(bio_ids))
        .order_by(Book.created_at.desc())
        .all()
    )
    latest_book_by_bio: dict[str, Book] = {}
    for book in books:
        if book.biography_id not in latest_book_by_bio:
            latest_book_by_bio[book.biography_id] = book

    works = []
    for bio in biographies:
        entry_count = entry_counts.get(bio.id, 0)
        book = latest_book_by_bio.get(bio.id)
        book_status = _status_value(book.status) if book else None

        if book_status == "ready":
            work_status = "published"
        elif entry_count > 0 or book:
            work_status = "in_progress"
        else:
            work_status = "draft"

        works.append(
            {
                "id": bio.id,
                "title": bio.title,
                "description": bio.description,
                "style": bio.style.value if hasattr(bio.style, "value") else str(bio.style),
                "status": bio.status.value if hasattr(bio.status, "value") else str(bio.status),
                "entry_count": entry_count,
                "work_status": work_status,
                "book": (
                    {
                        "id": book.id,
                        "status": book_status,
                        "word_count": book.word_count,
                        "created_at": book.created_at.isoformat() if book.created_at else None,
                    }
                    if book
                    else None
                ),
            }
        )
    return works


@router.get("/user/{user_id}")
async def list_user_biographies(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot access another user's biographies")
    biographies = db.query(Biography).filter(Biography.user_id == user_id).all()
    return [
        {
            "id": b.id,
            "title": b.title,
            "style": b.style.value,
            "status": b.status.value,
            "description": b.description,
        }
        for b in biographies
    ]


@router.get("/{biography_id}")
async def get_biography(
    biography_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    biography = db.query(Biography).filter(Biography.id == biography_id).first()
    if not biography:
        raise HTTPException(status_code=404, detail="Biography not found")
    if biography.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot access another user's biography")

    entries = biography.entries
    key_events = []
    if biography.key_events:
        try:
            key_events = json.loads(biography.key_events)
        except json.JSONDecodeError:
            key_events = [biography.key_events]

    return {
        "id": biography.id,
        "user_id": biography.user_id,
        "title": biography.title,
        "description": biography.description,
        "style": biography.style.value,
        "status": biography.status.value,
        "birth_year": biography.birth_year,
        "hometown": biography.hometown,
        "key_events": key_events,
        "recording_method": biography.recording_method or "guided",
        "entries": [
            {
                "id": e.id,
                "title": e.title,
                "content": e.content,
                "original_transcript": e.original_transcript,
                "time_period_start": e.time_period_start,
                "time_period_end": e.time_period_end,
            }
            for e in entries
        ],
    }

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.models.base import get_db
from app.models.biography import Biography, BiographyStyle
from app.services.biography.biography_service import BiographyService

router = APIRouter()


class CreateBiographyRequest(BaseModel):
    user_id: str
    title: str
    style: BiographyStyle = BiographyStyle.STORY


class ProcessRecordingRequest(BaseModel):
    recording_id: str


class SaveAnswerRequest(BaseModel):
    question_index: int
    answer: str
    recording_id: str | None = None


@router.post("/")
async def create_biography(request: CreateBiographyRequest, db: Session = Depends(get_db)):
    service = BiographyService(db)
    biography = await service.create_biography(
        user_id=request.user_id,
        title=request.title,
        style=request.style,
    )
    return {
        "id": biography.id,
        "user_id": biography.user_id,
        "title": biography.title,
        "style": biography.style.value,
        "status": biography.status.value,
    }


@router.post("/{biography_id}/process")
async def process_recording(
    biography_id: str,
    request: ProcessRecordingRequest,
    db: Session = Depends(get_db),
):
    service = BiographyService(db)
    try:
        entry = await service.process_recording(
            biography_id=biography_id,
            recording_id=request.recording_id,
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
async def get_suggested_questions(biography_id: str, db: Session = Depends(get_db)):
    service = BiographyService(db)
    try:
        questions = await service.generate_questions(biography_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    return {"questions": questions}


@router.post("/{biography_id}/answers")
async def save_answer(
    biography_id: str,
    request: SaveAnswerRequest,
    db: Session = Depends(get_db),
):
    return {
        "biography_id": biography_id,
        "question_index": request.question_index,
        "answer": request.answer,
        "saved": True,
    }


@router.get("/user/{user_id}")
async def list_user_biographies(user_id: str, db: Session = Depends(get_db)):
    biographies = db.query(Biography).filter(Biography.user_id == user_id).all()
    return [
        {
            "id": b.id,
            "title": b.title,
            "style": b.style.value,
            "status": b.status.value,
        }
        for b in biographies
    ]


@router.get("/{biography_id}")
async def get_biography(biography_id: str, db: Session = Depends(get_db)):
    biography = db.query(Biography).filter(Biography.id == biography_id).first()
    if not biography:
        raise HTTPException(status_code=404, detail="Biography not found")

    entries = biography.entries
    return {
        "id": biography.id,
        "user_id": biography.user_id,
        "title": biography.title,
        "style": biography.style.value,
        "status": biography.status.value,
        "entries": [
            {
                "id": e.id,
                "title": e.title,
                "content": e.content,
                "time_period_start": e.time_period_start,
                "time_period_end": e.time_period_end,
            }
            for e in entries
        ],
    }

import json
import uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from app.models.base import get_db
from app.models.recording import Recording, RecordingStatus
from app.services.audio.whisper_service import WhisperService
from app.services.audio.storage_service import StorageService

router = APIRouter()
whisper_service = WhisperService()
storage_service = StorageService()


@router.post("/upload")
async def upload_recording(
    file: UploadFile = File(...),
    recording_id: str | None = Form(None),
    biography_id: str | None = Form(None),
    user_id: str = Form(...),
    title: str | None = Form(None),
    db: Session = Depends(get_db),
):
    if recording_id:
        existing = db.query(Recording).filter(Recording.id == recording_id).first()
        if existing:
            return {"id": existing.id, "status": existing.status.value, "message": "已存在"}

    file_data = await file.read()
    filename = file.filename or "recording.wav"
    audio_url = await storage_service.upload_audio(file_data, filename)

    rid = recording_id or str(uuid.uuid4())
    recording = Recording(
        id=rid,
        user_id=user_id,
        biography_id=biography_id,
        title=title or f"录音 {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        audio_url=audio_url,
        file_size_bytes=len(file_data),
        status=RecordingStatus.PROCESSING,
    )
    db.add(recording)
    db.commit()

    try:
        result = await whisper_service.transcribe(audio_url)
        recording.transcript = result["text"]
        recording.transcript_segments = json.dumps(result["segments"], ensure_ascii=False)
        recording.duration_seconds = result.get("duration", 0)
        recording.status = RecordingStatus.TRANSCRIBED
        db.commit()
    except Exception as e:
        recording.status = RecordingStatus.FAILED
        db.commit()
        return {"id": recording.id, "status": recording.status.value, "error": str(e)}

    return {"id": recording.id, "status": recording.status.value}


@router.get("/user/{user_id}")
async def list_user_recordings(user_id: str, db: Session = Depends(get_db)):
    recordings = db.query(Recording).filter(Recording.user_id == user_id).all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "status": r.status.value,
            "duration_seconds": r.duration_seconds,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in recordings
    ]


@router.get("/{recording_id}")
async def get_recording(recording_id: str, db: Session = Depends(get_db)):
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    return {
        "id": recording.id,
        "user_id": recording.user_id,
        "biography_id": recording.biography_id,
        "title": recording.title,
        "audio_url": recording.audio_url,
        "duration_seconds": recording.duration_seconds,
        "transcript": recording.transcript,
        "status": recording.status.value,
        "created_at": recording.created_at.isoformat() if recording.created_at else None,
    }

import json
import uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.auth import get_current_user
from app.models.base import get_db
from app.models.recording import Recording, RecordingStatus
from app.models.user import User
from app.services.audio.storage_service import StorageService
from app.services.settings_service import get_stt_for_user, get_effective_settings

router = APIRouter()
storage_service = StorageService()


class TranscriptUpdate(BaseModel):
    transcript: str


class RecordingUpdate(BaseModel):
    biography_id: str | None = None
    title: str | None = None


@router.post("/upload")
async def upload_recording(
    file: UploadFile = File(...),
    recording_id: str | None = Form(None),
    biography_id: str | None = Form(None),
    user_id: str = Form(...),
    title: str | None = Form(None),
    auto_transcribe: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot upload for another user")
    if recording_id:
        existing = db.query(Recording).filter(Recording.id == recording_id).first()
        if existing:
            return {
                "id": existing.id,
                "status": existing.status.value,
                "transcript": existing.transcript,
                "message": "已存在",
            }

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
        status=RecordingStatus.UPLOADING,
    )
    db.add(recording)
    db.commit()

    if auto_transcribe:
        try:
            return await _transcribe_recording(recording.id, db, current_user)
        except HTTPException as e:
            detail = e.detail if isinstance(e.detail, dict) else {"message": str(e.detail)}
            return {
                "id": recording.id,
                "status": recording.status.value,
                "transcript": recording.transcript,
                "transcribe_error": detail,
            }

    return {"id": recording.id, "status": recording.status.value}


@router.post("/{recording_id}/transcribe")
async def transcribe_recording(
    recording_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await _transcribe_recording(recording_id, db, current_user)


def _stt_error_detail(exc: Exception) -> dict:
    message = str(exc)
    lower = message.lower()
    if "deepseek" in lower and ("transcri" in lower or "audio" in lower or "whisper" in lower):
        code = "stt_deepseek_unsupported"
        message = "DeepSeek 不支持语音转写，请在设置中将 STT 改为 Mock 或 OpenAI Whisper"
    elif "api key" in lower or "未配置" in message:
        code = "stt_not_configured"
    elif "whisper not installed" in lower or "whisper" in lower and "install" in lower:
        code = "whisper_missing"
    else:
        code = "api_error"
    return {"error_code": code, "message": message}


async def _transcribe_recording(recording_id: str, db: Session, current_user: User):
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    if recording.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot access another user's recording")

    recording.status = RecordingStatus.PROCESSING
    db.commit()

    try:
        stt = get_stt_for_user(db, recording.user_id)
        eff = get_effective_settings(db, recording.user_id)
        if eff.stt_provider == "openai_api" and eff.stt_base_url and "deepseek" in eff.stt_base_url.lower():
            raise ValueError(
                "DeepSeek 不支持语音转写，请在设置中将 STT 改为 Mock 或 OpenAI Whisper"
            )
        result = await stt.transcribe(recording.audio_url)
        recording.transcript = result["text"]
        recording.transcript_segments = json.dumps(result["segments"], ensure_ascii=False)
        recording.duration_seconds = result.get("duration", 0)
        recording.status = RecordingStatus.TRANSCRIBED
        db.commit()
    except ValueError as e:
        recording.status = RecordingStatus.FAILED
        db.commit()
        raise HTTPException(status_code=400, detail=_stt_error_detail(e)) from e
    except Exception as e:
        recording.status = RecordingStatus.FAILED
        db.commit()
        raise HTTPException(status_code=500, detail=_stt_error_detail(e)) from e

    return {
        "id": recording.id,
        "status": recording.status.value,
        "transcript": recording.transcript,
        "segments": json.loads(recording.transcript_segments or "[]"),
    }


@router.patch("/{recording_id}")
async def update_recording(
    recording_id: str,
    request: RecordingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    if recording.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot access another user's recording")

    if request.biography_id is not None:
        recording.biography_id = request.biography_id or None
    if request.title is not None:
        recording.title = request.title
    db.commit()

    return {
        "id": recording.id,
        "biography_id": recording.biography_id,
        "title": recording.title,
        "status": recording.status.value,
        "transcript": recording.transcript,
    }


@router.put("/{recording_id}/transcript")
async def update_transcript(
    recording_id: str,
    request: TranscriptUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    if recording.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot access another user's recording")

    recording.transcript = request.transcript
    recording.status = RecordingStatus.TRANSCRIBED
    db.commit()

    return {
        "id": recording.id,
        "transcript": recording.transcript,
        "status": recording.status.value,
    }


@router.get("/{recording_id}/status")
async def get_recording_status(
    recording_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    if recording.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot access another user's recording")

    segments = []
    if recording.transcript_segments:
        try:
            segments = json.loads(recording.transcript_segments)
        except json.JSONDecodeError:
            segments = []

    return {
        "id": recording.id,
        "status": recording.status.value,
        "transcript": recording.transcript,
        "segments": segments,
    }


@router.get("/user/{user_id}")
async def list_user_recordings(
    user_id: str,
    biography_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot access another user's recordings")
    query = db.query(Recording).filter(Recording.user_id == user_id)
    if biography_id:
        query = query.filter(Recording.biography_id == biography_id)
    recordings = query.order_by(Recording.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "biography_id": r.biography_id,
            "status": r.status.value,
            "duration_seconds": r.duration_seconds,
            "transcript": r.transcript,
            "audio_url": r.audio_url,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in recordings
    ]


@router.get("/{recording_id}")
async def get_recording(
    recording_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    if recording.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot access another user's recording")

    segments = []
    if recording.transcript_segments:
        try:
            segments = json.loads(recording.transcript_segments)
        except json.JSONDecodeError:
            segments = []

    return {
        "id": recording.id,
        "user_id": recording.user_id,
        "biography_id": recording.biography_id,
        "title": recording.title,
        "audio_url": recording.audio_url,
        "duration_seconds": recording.duration_seconds,
        "transcript": recording.transcript,
        "segments": segments,
        "status": recording.status.value,
        "created_at": recording.created_at.isoformat() if recording.created_at else None,
    }

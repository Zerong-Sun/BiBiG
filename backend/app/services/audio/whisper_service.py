"""WhisperService — backward-compatible wrapper around STT factory."""

from typing import Dict, Any, Optional
from app.core.config import settings
from app.services.stt.factory import STTConfig, get_stt_provider


class WhisperService:
    async def transcribe(
        self,
        audio_path: str,
        user_id: Optional[str] = None,
        db=None,
    ) -> Dict[str, Any]:
        if user_id and db:
            from app.services.settings_service import get_stt_for_user

            provider = get_stt_for_user(db, user_id)
            return await provider.transcribe(audio_path)

        if settings.USE_MOCK_TRANSCRIPTION:
            provider = get_stt_provider(STTConfig(provider="mock"))
        else:
            provider = get_stt_provider(
                STTConfig(
                    provider=settings.STT_PROVIDER,
                    api_key=settings.STT_API_KEY,
                    base_url=settings.STT_BASE_URL,
                )
            )
        return await provider.transcribe(audio_path)

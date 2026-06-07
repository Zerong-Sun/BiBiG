import asyncio
import os
import tempfile
from typing import Dict, Any, Optional
from app.services.stt.base import STTProvider


class WhisperLocalProvider(STTProvider):
    def __init__(self, model_name: str = "base"):
        self.model_name = model_name
        self._model = None

    def _get_model(self):
        if self._model is None:
            try:
                import whisper
            except ImportError as e:
                raise RuntimeError(
                    "Whisper not installed. Set stt_provider to mock/openai_api or "
                    "pip install -r requirements-whisper.txt"
                ) from e
            self._model = whisper.load_model(self.model_name)
        return self._model

    async def transcribe(self, audio_path: str) -> Dict[str, Any]:
        local_path = audio_path
        if audio_path.startswith("http"):
            import httpx

            async with httpx.AsyncClient() as client:
                response = await client.get(audio_path)
                response.raise_for_status()
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                    tmp.write(response.content)
                    local_path = tmp.name

        model = await asyncio.to_thread(self._get_model)
        result = await asyncio.to_thread(
            model.transcribe, local_path, language="zh", task="transcribe"
        )

        if local_path != audio_path and os.path.exists(local_path):
            os.unlink(local_path)

        duration = 0
        if result.get("segments"):
            duration = int(result["segments"][-1].get("end", 0))

        return {
            "text": result["text"],
            "segments": [
                {"start": seg["start"], "end": seg["end"], "text": seg["text"]}
                for seg in result["segments"]
            ],
            "language": result.get("language", "zh"),
            "duration": duration,
        }

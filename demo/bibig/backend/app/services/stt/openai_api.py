import os
import tempfile
from typing import Dict, Any, Optional
import httpx
from openai import AsyncOpenAI
from app.services.stt.base import STTProvider


class OpenAISTTProvider(STTProvider):
    def __init__(
        self,
        api_key: str,
        base_url: Optional[str] = None,
        model: str = "whisper-1",
    ):
        kwargs: dict = {"api_key": api_key}
        if base_url:
            kwargs["base_url"] = base_url
        self.client = AsyncOpenAI(**kwargs)
        self.model = model

    async def transcribe(self, audio_path: str) -> Dict[str, Any]:
        local_path = audio_path
        cleanup = False

        if audio_path.startswith("http"):
            async with httpx.AsyncClient() as client:
                response = await client.get(audio_path)
                response.raise_for_status()
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                    tmp.write(response.content)
                    local_path = tmp.name
                    cleanup = True

        with open(local_path, "rb") as audio_file:
            result = await self.client.audio.transcriptions.create(
                model=self.model,
                file=audio_file,
                language="zh",
                response_format="verbose_json",
            )

        if cleanup and os.path.exists(local_path):
            os.unlink(local_path)

        segments = []
        if hasattr(result, "segments") and result.segments:
            segments = [
                {"start": seg.start, "end": seg.end, "text": seg.text}
                for seg in result.segments
            ]

        duration = 0
        if segments:
            duration = int(segments[-1]["end"])

        text = result.text if hasattr(result, "text") else str(result)

        return {
            "text": text,
            "segments": segments or [{"start": 0.0, "end": float(duration or 5), "text": text}],
            "language": "zh",
            "duration": duration,
        }

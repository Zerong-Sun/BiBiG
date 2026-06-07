from typing import Dict, Any
from app.services.stt.base import STTProvider


class MockSTTProvider(STTProvider):
    async def transcribe(self, audio_path: str) -> Dict[str, Any]:
        return {
            "text": "这是一段口述内容的示例转录文本。",
            "segments": [
                {"start": 0.0, "end": 5.0, "text": "这是一段口述内容的示例转录文本。"}
            ],
            "language": "zh",
            "duration": 5,
        }

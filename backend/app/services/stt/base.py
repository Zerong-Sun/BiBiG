from abc import ABC, abstractmethod
from typing import Dict, Any


class STTProvider(ABC):
    @abstractmethod
    async def transcribe(self, audio_path: str) -> Dict[str, Any]:
        pass

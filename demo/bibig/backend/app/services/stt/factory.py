from dataclasses import dataclass
from typing import Optional
from app.core.config import settings
from app.services.stt.base import STTProvider
from app.services.stt.mock import MockSTTProvider
from app.services.stt.whisper_local import WhisperLocalProvider
from app.services.stt.openai_api import OpenAISTTProvider


@dataclass
class STTConfig:
    provider: str = "mock"
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: str = "whisper-1"
    whisper_model: str = "base"


def get_stt_provider(config: Optional[STTConfig] = None) -> STTProvider:
    cfg = config or STTConfig(
        provider=settings.STT_PROVIDER,
        api_key=settings.STT_API_KEY,
        base_url=settings.STT_BASE_URL,
    )

    provider = cfg.provider

    if provider == "whisper_local":
        return WhisperLocalProvider(model_name=cfg.whisper_model or settings.WHISPER_MODEL)

    if provider == "openai_api":
        api_key = cfg.api_key or settings.STT_API_KEY or settings.OPENAI_API_KEY
        if not api_key:
            raise ValueError(
                "STT API Key 未配置，请在设置页填写并保存 API Key，或将转写模式改为 Mock"
            )
        return OpenAISTTProvider(
            api_key=api_key,
            base_url=cfg.base_url or settings.STT_BASE_URL or settings.OPENAI_BASE_URL,
            model=cfg.model,
        )

    return MockSTTProvider()

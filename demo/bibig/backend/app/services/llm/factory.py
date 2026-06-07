from dataclasses import dataclass
from typing import Optional
from app.core.config import settings
from app.services.llm.base import LLMProvider
from app.services.llm.openai_provider import OpenAIProvider
from app.services.llm.claude_provider import ClaudeProvider
from app.services.llm.mock_provider import MockLLMProvider
from app.services.llm.openai_compatible_provider import OpenAICompatibleProvider

_providers = {
    "openai": OpenAIProvider,
    "claude": ClaudeProvider,
    "mock": MockLLMProvider,
    "openai_compatible": OpenAICompatibleProvider,
}


@dataclass
class LLMConfig:
    provider: str = "mock"
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: str = "gpt-4o"


def get_llm_provider(
    provider_name: Optional[str] = None,
    config: Optional[LLMConfig] = None,
) -> LLMProvider:
    if config:
        name = config.provider
        api_key = config.api_key
        base_url = config.base_url
        model = config.model
    else:
        name = provider_name or settings.DEFAULT_LLM_PROVIDER
        api_key = settings.OPENAI_API_KEY
        base_url = settings.OPENAI_BASE_URL
        model = settings.OPENAI_MODEL

    if name == "openai":
        if not (api_key or settings.OPENAI_API_KEY):
            return MockLLMProvider()
        if config and (config.base_url or config.model != "gpt-4o"):
            return OpenAICompatibleProvider(
                api_key=api_key or settings.OPENAI_API_KEY,
                base_url=base_url,
                model=model,
            )
        return OpenAIProvider()

    if name == "claude":
        if not settings.ANTHROPIC_API_KEY:
            return MockLLMProvider()
        return ClaudeProvider()

    if name == "openai_compatible":
        key = api_key or settings.OPENAI_API_KEY
        if not key:
            return MockLLMProvider()
        return OpenAICompatibleProvider(
            api_key=key,
            base_url=base_url or settings.OPENAI_BASE_URL,
            model=model,
        )

    if name == "mock":
        return MockLLMProvider()

    if name not in _providers:
        raise ValueError(f"Unknown LLM provider: {name}")

    return _providers[name]()

from typing import Optional
from app.services.llm.base import LLMProvider
from app.services.llm.openai_provider import OpenAIProvider
from app.services.llm.claude_provider import ClaudeProvider
from app.services.llm.mock_provider import MockLLMProvider
from app.core.config import settings

_providers = {
    "openai": OpenAIProvider,
    "claude": ClaudeProvider,
    "mock": MockLLMProvider,
}


def get_llm_provider(provider_name: Optional[str] = None) -> LLMProvider:
    name = provider_name or settings.DEFAULT_LLM_PROVIDER

    if name == "openai" and not settings.OPENAI_API_KEY:
        return MockLLMProvider()
    if name == "claude" and not settings.ANTHROPIC_API_KEY:
        return MockLLMProvider()

    if name not in _providers:
        raise ValueError(f"Unknown LLM provider: {name}")

    return _providers[name]()

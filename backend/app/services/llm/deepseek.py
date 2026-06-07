from typing import Any, Optional


def is_deepseek(base_url: Optional[str], model: Optional[str] = None) -> bool:
    url = (base_url or "").lower()
    name = (model or "").lower()
    return "deepseek" in url or name.startswith("deepseek")


def normalize_openai_base_url(base_url: Optional[str]) -> Optional[str]:
    """Fix common Base URL mistakes that cause 404 Not Found."""
    if not base_url:
        return None
    url = base_url.strip().rstrip("/")
    for suffix in ("/chat/completions", "/completions", "/v1/chat/completions"):
        if url.endswith(suffix):
            url = url[: -len(suffix)].rstrip("/")
    if "deepseek.com" in url.lower() and not url.endswith("/v1"):
        url = f"{url}/v1"
    return url


def chat_extra_kwargs(base_url: Optional[str], model: Optional[str]) -> dict[str, Any]:
    """DeepSeek V4 defaults to thinking mode; disable for short/direct replies."""
    if is_deepseek(base_url, model):
        return {"extra_body": {"thinking": {"type": "disabled"}}}
    return {}

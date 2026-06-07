from pydantic import BaseModel
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.auth import get_current_user
from app.models.base import get_db
from app.models.user import User
from app.services.settings_service import (
    get_effective_settings,
    get_or_create_user_settings,
    get_llm_for_user,
    get_stt_for_user,
    settings_to_response,
    update_user_settings,
)

router = APIRouter()


class UserSettingsUpdate(BaseModel):
    stt_provider: Optional[str] = None
    stt_api_key: Optional[str] = None
    stt_base_url: Optional[str] = None
    llm_provider: Optional[str] = None
    llm_api_key: Optional[str] = None
    llm_base_url: Optional[str] = None
    llm_model: Optional[str] = None
    default_style: Optional[str] = None
    default_question_mode: Optional[str] = None
    theme: Optional[str] = None


class TestLLMRequest(BaseModel):
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None
    provider: Optional[str] = "openai_compatible"


class TestSTTRequest(BaseModel):
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    provider: Optional[str] = "openai_api"


@router.get("/users/{user_id}/settings")
async def get_settings(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot access another user's settings")
    row = get_or_create_user_settings(db, user_id)
    eff = get_effective_settings(db, user_id)
    return settings_to_response(row, eff)


@router.put("/users/{user_id}/settings")
async def put_settings(
    user_id: str,
    request: UserSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot update another user's settings")
    row = update_user_settings(db, user_id, request.model_dump(exclude_unset=True))
    eff = get_effective_settings(db, user_id)
    return settings_to_response(row, eff)


@router.post("/test-llm")
async def test_llm(
    request: TestLLMRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.llm.deepseek import normalize_openai_base_url
    from app.services.llm.factory import LLMConfig, get_llm_provider
    from app.services.llm.mock_provider import MockLLMProvider

    eff = get_effective_settings(db, current_user.id)
    provider_name = request.provider or eff.llm_provider or "openai_compatible"
    api_key = (request.api_key or eff.llm_api_key or "").strip() or None
    base_url = normalize_openai_base_url((request.base_url or eff.llm_base_url or "").strip() or None)
    model = (request.model or eff.llm_model or "gpt-4o").strip()

    if provider_name not in ("mock",):
        if not api_key:
            return {
                "success": False,
                "message": "请先填写 API Key（可直接在输入框填写后测试，或保存后再测试）",
            }

    provider = get_llm_provider(
        config=LLMConfig(
            provider=provider_name,
            api_key=api_key,
            base_url=base_url,
            model=model,
        )
    )

    if provider_name not in ("mock",) and isinstance(provider, MockLLMProvider):
        return {"success": False, "message": "未识别到有效 API Key，请检查提供商与 Key 是否匹配"}

    try:
        response = await provider.chat(
            [
                {"role": "system", "content": "直接输出最终回答，不要输出思考过程。"},
                {"role": "user", "content": "请只回复四个字：连接成功"},
            ],
            temperature=0,
            max_tokens=256,
        )
        text = (response or "").strip()
        if not text:
            return {
                "success": False,
                "message": "API 已连接但返回空内容，请检查模型名称是否正确（DeepSeek 请用 deepseek-v4-flash）",
            }
        return {"success": True, "message": text[:200]}
    except Exception as e:
        msg = str(e)
        body = getattr(e, "body", None)
        if body:
            msg = str(body)
        lower = msg.lower()
        if "not found" in lower and "404" in lower:
            msg = (
                f"API 地址或模型不存在（404）。请确认 Base URL 为 https://api.deepseek.com/v1，"
                f"模型为 deepseek-v4-flash。当前：{base_url or '未设置'} / {model}"
            )
        return {"success": False, "message": msg}


@router.post("/test-stt")
async def test_stt(
    request: TestSTTRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from openai import AsyncOpenAI
    from app.services.stt.factory import STTConfig, get_stt_provider

    eff = get_effective_settings(db, current_user.id)
    provider_name = request.provider or eff.stt_provider
    if provider_name == "mock":
        return {"success": True, "message": "Mock 模式已启用，无需外部连接"}
    if provider_name == "whisper_local":
        try:
            from app.services.stt.whisper_local import WhisperLocalProvider

            WhisperLocalProvider()
            return {"success": True, "message": "本地 Whisper 模块可用"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    api_key = (request.api_key or eff.stt_api_key or "").strip() or None
    base_url = (request.base_url or eff.stt_base_url or "").strip() or None

    if provider_name == "openai_api" and base_url and "deepseek" in base_url.lower():
        return {
            "success": False,
            "message": "DeepSeek 不支持语音转写。STT 请使用 OpenAI Whisper，或切换为 Mock/本地 Whisper。",
        }

    if not api_key:
        return {"success": False, "message": "请先填写 STT API Key（OpenAI Whisper），或切换为 Mock 模式"}

    try:
        get_stt_provider(
            STTConfig(
                provider=provider_name,
                api_key=api_key,
                base_url=base_url,
            )
        )
    except ValueError as e:
        return {"success": False, "message": str(e)}

    if provider_name == "openai_api":
        try:
            kwargs: dict = {"api_key": api_key}
            base_url = request.base_url or eff.stt_base_url
            if base_url:
                kwargs["base_url"] = base_url
            client = AsyncOpenAI(**kwargs)
            await client.models.list()
            return {"success": True, "message": "STT API 连接成功"}
        except Exception as e:
            return {"success": False, "message": str(e)}

    return {"success": True, "message": f"STT 提供商 {provider_name} 配置有效"}

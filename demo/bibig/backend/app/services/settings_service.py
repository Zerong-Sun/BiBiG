from dataclasses import dataclass
from typing import Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.encryption import decrypt_value, encrypt_value
from app.models.user_settings import UserSettings
from app.services.llm.deepseek import normalize_openai_base_url
from app.services.llm.base import LLMProvider
from app.services.llm.factory import LLMConfig, get_llm_provider
from app.services.stt.factory import STTConfig, get_stt_provider


@dataclass
class EffectiveSettings:
    stt_provider: str
    stt_api_key: Optional[str]
    stt_base_url: Optional[str]
    llm_provider: str
    llm_api_key: Optional[str]
    llm_base_url: Optional[str]
    llm_model: str
    default_style: str
    default_question_mode: str
    theme: str


def get_user_settings_row(db: Session, user_id: str) -> Optional[UserSettings]:
    return db.query(UserSettings).filter(UserSettings.user_id == user_id).first()


def get_or_create_user_settings(db: Session, user_id: str) -> UserSettings:
    row = get_user_settings_row(db, user_id)
    if row:
        return row
    row = UserSettings(user_id=user_id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_effective_settings(db: Session, user_id: str) -> EffectiveSettings:
    row = get_user_settings_row(db, user_id)

    stt_api_key = settings.STT_API_KEY or settings.OPENAI_API_KEY
    if row and row.stt_api_key_encrypted:
        try:
            stt_api_key = decrypt_value(row.stt_api_key_encrypted)
        except Exception:
            pass

    llm_api_key = settings.OPENAI_API_KEY
    if row and row.llm_api_key_encrypted:
        try:
            llm_api_key = decrypt_value(row.llm_api_key_encrypted)
        except Exception:
            pass

    return EffectiveSettings(
        stt_provider=(row.stt_provider if row and row.stt_provider else None) or settings.STT_PROVIDER,
        stt_api_key=stt_api_key,
        stt_base_url=(row.stt_base_url if row else None) or settings.STT_BASE_URL or settings.OPENAI_BASE_URL,
        llm_provider=(row.llm_provider if row and row.llm_provider else None) or settings.DEFAULT_LLM_PROVIDER,
        llm_api_key=llm_api_key,
        llm_base_url=(row.llm_base_url if row else None) or settings.OPENAI_BASE_URL,
        llm_model=(row.llm_model if row and row.llm_model else None) or settings.OPENAI_MODEL,
        default_style=(row.default_style if row else None) or "story",
        default_question_mode=(row.default_question_mode if row else None) or "ai",
        theme=(row.theme if row else None) or "ink",
    )


def get_stt_for_user(db: Session, user_id: str):
    eff = get_effective_settings(db, user_id)
    return get_stt_provider(
        STTConfig(
            provider=eff.stt_provider,
            api_key=eff.stt_api_key,
            base_url=eff.stt_base_url,
        )
    )


def get_llm_for_user(db: Session, user_id: str) -> LLMProvider:
    eff = get_effective_settings(db, user_id)
    return get_llm_provider(
        config=LLMConfig(
            provider=eff.llm_provider,
            api_key=eff.llm_api_key,
            base_url=normalize_openai_base_url(eff.llm_base_url),
            model=eff.llm_model,
        )
    )


def settings_to_response(row: UserSettings, eff: EffectiveSettings) -> dict:
    from app.core.encryption import mask_api_key

    return {
        "stt_provider": eff.stt_provider,
        "stt_base_url": row.stt_base_url or "",
        "stt_api_key_set": bool(row.stt_api_key_encrypted or settings.STT_API_KEY or settings.OPENAI_API_KEY),
        "stt_api_key_masked": mask_api_key(eff.stt_api_key),
        "llm_provider": eff.llm_provider,
        "llm_base_url": row.llm_base_url or "",
        "llm_model": eff.llm_model,
        "llm_api_key_set": bool(row.llm_api_key_encrypted or settings.OPENAI_API_KEY),
        "llm_api_key_masked": mask_api_key(eff.llm_api_key),
        "default_style": eff.default_style,
        "default_question_mode": eff.default_question_mode,
        "theme": eff.theme,
    }


def update_user_settings(db: Session, user_id: str, data: dict) -> UserSettings:
    row = get_or_create_user_settings(db, user_id)

    if "stt_provider" in data and data["stt_provider"] is not None:
        row.stt_provider = data["stt_provider"]
    if "stt_base_url" in data:
        row.stt_base_url = data["stt_base_url"] or None
    if data.get("stt_api_key"):
        row.stt_api_key_encrypted = encrypt_value(data["stt_api_key"])
    if "llm_provider" in data and data["llm_provider"] is not None:
        row.llm_provider = data["llm_provider"]
    if "llm_base_url" in data:
        row.llm_base_url = data["llm_base_url"] or None
    if "llm_model" in data and data["llm_model"] is not None:
        row.llm_model = data["llm_model"]
    if data.get("llm_api_key"):
        row.llm_api_key_encrypted = encrypt_value(data["llm_api_key"])
    if "default_style" in data and data["default_style"] is not None:
        row.default_style = data["default_style"]
    if "default_question_mode" in data and data["default_question_mode"] is not None:
        row.default_question_mode = data["default_question_mode"]
    if "theme" in data and data["theme"] is not None:
        row.theme = data["theme"]

    db.commit()
    db.refresh(row)
    return row

import json
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from app.services.llm.base import LLMProvider
from app.services.llm.deepseek import chat_extra_kwargs, normalize_openai_base_url
from app.services.biography.prompts import (
    build_biography_system_prompt,
    build_interview_questions_system_prompt,
)


class OpenAICompatibleProvider(LLMProvider):
    def __init__(
        self,
        api_key: str,
        base_url: Optional[str] = None,
        model: str = "gpt-4o",
    ):
        kwargs: dict = {"api_key": api_key}
        normalized = normalize_openai_base_url(base_url)
        if normalized:
            kwargs["base_url"] = normalized
        self.client = AsyncOpenAI(**kwargs)
        self.model = model
        self.base_url = normalized

    @staticmethod
    def _message_text(message) -> str:
        content = (message.content or "").strip()
        if content:
            return content
        reasoning = getattr(message, "reasoning_content", None) or ""
        return reasoning.strip()

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        base_url = str(self.base_url or getattr(self.client, "base_url", "") or "")
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            **chat_extra_kwargs(base_url, self.model),
        )
        return self._message_text(response.choices[0].message)

    async def generate_biography(
        self,
        transcript: str,
        style: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        system_prompt = build_biography_system_prompt(style)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"口述内容：\n{transcript}"},
        ]
        if context:
            messages.append(
                {
                    "role": "user",
                    "content": f"背景信息：\n{json.dumps(context, ensure_ascii=False)}",
                }
            )
        return await self.chat(messages, temperature=0.7)

    async def generate_questions(
        self,
        existing_content: str,
        missing_info: List[str],
    ) -> List[str]:
        messages = [
            {
                "role": "system",
                "content": build_interview_questions_system_prompt(missing_info),
            },
            {"role": "user", "content": f"已有传记内容：\n{existing_content or '（尚无内容）'}"},
        ]
        response = await self.chat(messages, temperature=0.8)
        questions = [
            q.strip().lstrip("0123456789.-、）) ")
            for q in response.split("\n")
            if q.strip() and ("?" in q or "？" in q or len(q.strip()) > 5)
        ]
        return questions[:5] if questions else ["您还有什么想补充的故事吗？"]

import json
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from app.services.llm.base import LLMProvider
from app.core.config import settings
from app.services.biography.prompts import (
    build_biography_system_prompt,
    build_interview_questions_system_prompt,
)


class OpenAIProvider(LLMProvider):
    def __init__(self):
        kwargs: dict = {"api_key": settings.OPENAI_API_KEY}
        if settings.OPENAI_BASE_URL:
            kwargs["base_url"] = settings.OPENAI_BASE_URL
        self.client = AsyncOpenAI(**kwargs)
        self.model = settings.OPENAI_MODEL

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content or ""

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

        return await self.chat(messages, temperature=0.8)

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
            {
                "role": "user",
                "content": f"已有内容：\n{existing_content}\n\n需要补充的信息：{', '.join(missing_info)}",
            },
        ]

        response = await self.chat(messages, temperature=0.9)
        questions = [
            q.strip().lstrip("0123456789.-) ")
            for q in response.split("\n")
            if q.strip() and not q.strip().startswith("#")
        ]
        return questions[:5]

import json
from typing import List, Dict, Any, Optional
import anthropic
from app.services.llm.base import LLMProvider
from app.core.config import settings
from app.services.biography.prompts import (
    build_biography_system_prompt,
    build_interview_questions_system_prompt,
)


class ClaudeProvider(LLMProvider):
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = "claude-3-opus-20240229"

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        system = ""
        claude_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system = msg["content"]
            else:
                claude_messages.append({"role": msg["role"], "content": msg["content"]})

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system,
            messages=claude_messages,
        )
        return response.content[0].text

    async def generate_biography(
        self,
        transcript: str,
        style: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        system_prompt = build_biography_system_prompt(style)

        user_content = f"口述内容：\n{transcript}"
        if context:
            user_content += f"\n\n背景信息：\n{json.dumps(context, ensure_ascii=False)}"

        return await self.chat(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.8,
        )

    async def generate_questions(
        self,
        existing_content: str,
        missing_info: List[str],
    ) -> List[str]:
        response = await self.chat(
            [
                {
                    "role": "system",
                    "content": build_interview_questions_system_prompt(missing_info),
                },
                {
                    "role": "user",
                    "content": f"已有内容：\n{existing_content}\n\n需要补充：{', '.join(missing_info)}",
                },
            ],
            temperature=0.9,
        )
        questions = [
            q.strip().lstrip("0123456789.-) ")
            for q in response.split("\n")
            if q.strip()
        ]
        return questions[:5]

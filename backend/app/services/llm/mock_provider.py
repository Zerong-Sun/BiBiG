import json
from typing import List, Dict, Any, Optional
from app.services.llm.base import LLMProvider


class MockLLMProvider(LLMProvider):
    """Offline LLM for development and tests."""

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        system = messages[0].get("content", "") if messages else ""
        last_user = next(
            (m["content"] for m in reversed(messages) if m["role"] == "user"),
            "",
        )

        if "章节结构" in system or "chapters" in system:
            return json.dumps(
                {
                    "chapters": [
                        {
                            "number": 1,
                            "title": "人生故事",
                            "summary": "口述整理",
                            "entry_ids": [],
                        }
                    ]
                },
                ensure_ascii=False,
            )

        if "章节标题" in system or "time_period_start" in system:
            return json.dumps(
                {
                    "title": "童年时光",
                    "time_period_start": "1950",
                    "time_period_end": "1960",
                    "location": "故乡",
                },
                ensure_ascii=False,
            )

        if "缺失" in system:
            return "童年经历\n家庭背景"

        if "追问问题" in system or "采访者" in system:
            return "\n".join(
                [
                    "您小时候最难忘的一件事是什么？",
                    "能说说您的父母吗？",
                    "您想对后辈说些什么？",
                ]
            )

        return f"【整理稿】\n\n{last_user[:500]}"

    async def generate_biography(
        self,
        transcript: str,
        style: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        return f"# 人生片段\n\n{transcript.strip()}\n\n*（{style}风格整理）*"

    async def generate_questions(
        self,
        existing_content: str,
        missing_info: List[str],
    ) -> List[str]:
        defaults = [
            "您小时候最难忘的一件事是什么？",
            "能说说您的父母或家人吗？",
            "您年轻时做过什么工作？",
            "人生中哪个时刻对您影响最大？",
            "您有什么想对孙辈说的话？",
        ]
        if missing_info:
            return [f"能再讲讲关于「{item}」的故事吗？" for item in missing_info[:3]] or defaults[:3]
        return defaults[:3]

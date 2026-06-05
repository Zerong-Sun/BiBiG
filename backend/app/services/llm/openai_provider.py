import json
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
from app.services.llm.base import LLMProvider
from app.core.config import settings


class OpenAIProvider(LLMProvider):
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o"

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
        style_prompts = {
            "lyrical": "以抒情优美的散文风格写作，注重情感描写和意境营造",
            "rigorous": "以严谨客观的纪实风格写作，注重事实准确性和细节",
            "story": "以引人入胜的故事风格写作，注重情节和人物刻画",
            "chronological": "以时间线为主轴，按年代顺序记录人生经历",
        }

        system_prompt = f"""你是一位专业的传记作家。请根据以下口述内容，{style_prompts.get(style, style_prompts['story'])}，整理成传记章节。

要求：
1. 保持口述者的真实情感和个人特色
2. 补充必要的背景信息（如果上下文提供）
3. 使用中文写作
4. 输出格式为Markdown"""

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
        system_prompt = """你是一位善于倾听的传记采访者。根据已有的口述内容，生成3-5个追问问题，帮助补充缺失的信息或深化故事。

要求：
1. 问题要自然、温暖，像和老人聊天一样
2. 避免重复已有信息
3. 引导回忆具体细节和情感
4. 每行一个问题，不要编号"""

        messages = [
            {"role": "system", "content": system_prompt},
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

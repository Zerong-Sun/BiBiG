import json
import uuid
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.biography import Biography, BiographyEntry, BiographyStyle
from app.models.recording import Recording
from app.services.llm.factory import get_llm_provider


class BiographyService:
    def __init__(self, db: Session):
        self.db = db
        self.llm = get_llm_provider()

    async def create_biography(
        self,
        user_id: str,
        title: str,
        style: BiographyStyle = BiographyStyle.STORY,
    ) -> Biography:
        biography = Biography(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=title,
            style=style,
        )
        self.db.add(biography)
        self.db.commit()
        self.db.refresh(biography)
        return biography

    async def process_recording(self, biography_id: str, recording_id: str) -> BiographyEntry:
        recording = self.db.query(Recording).filter(Recording.id == recording_id).first()
        if not recording or not recording.transcript:
            raise ValueError("Recording not found or not transcribed")

        biography = self.db.query(Biography).filter(Biography.id == biography_id).first()
        if not biography:
            raise ValueError("Biography not found")

        existing_entries = (
            self.db.query(BiographyEntry)
            .filter(BiographyEntry.biography_id == biography_id)
            .all()
        )

        context = {
            "title": biography.title,
            "existing_chapters": [e.title for e in existing_entries if e.title],
            "time_periods": list(
                {e.time_period_start for e in existing_entries if e.time_period_start}
            ),
        }

        content = await self.llm.generate_biography(
            transcript=recording.transcript,
            style=biography.style.value,
            context=context,
        )

        metadata = await self._extract_metadata(content)

        entry = BiographyEntry(
            id=str(uuid.uuid4()),
            biography_id=biography_id,
            recording_id=recording_id,
            title=metadata.get("title"),
            content=content,
            original_transcript=recording.transcript,
            time_period_start=metadata.get("time_period_start"),
            time_period_end=metadata.get("time_period_end"),
            location=metadata.get("location"),
        )

        self.db.add(entry)
        biography.status = biography.status or biography.status
        self.db.commit()
        self.db.refresh(entry)
        return entry

    async def _extract_metadata(self, content: str) -> Dict[str, Any]:
        messages = [
            {
                "role": "system",
                "content": """分析以下传记内容，提取：
1. 章节标题（简短）
2. 时间段（开始年份）
3. 时间段（结束年份）
4. 地点

返回JSON格式：{"title": "...", "time_period_start": "...", "time_period_end": "...", "location": "..."}""",
            },
            {"role": "user", "content": content},
        ]

        response = await self.llm.chat(messages, temperature=0.3)
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {"title": "未命名章节"}

    async def generate_questions(self, biography_id: str) -> List[str]:
        biography = self.db.query(Biography).filter(Biography.id == biography_id).first()
        if not biography:
            raise ValueError("Biography not found")

        entries = (
            self.db.query(BiographyEntry)
            .filter(BiographyEntry.biography_id == biography_id)
            .all()
        )

        existing_content = "\n".join([e.content for e in entries])
        missing_info = await self._analyze_missing_info(existing_content)
        return await self.llm.generate_questions(existing_content, missing_info)

    async def _analyze_missing_info(self, content: str) -> List[str]:
        messages = [
            {
                "role": "system",
                "content": """分析以下传记内容，列出可能缺失的重要信息类别：
- 童年经历
- 家庭背景
- 教育经历
- 职业发展
- 重要人生事件
- 人际关系
- 兴趣爱好
- 人生感悟

只列出明显缺失的类别，每行一个。""",
            },
            {"role": "user", "content": content or "（尚无内容）"},
        ]

        response = await self.llm.chat(messages, temperature=0.3)
        return [item.strip().lstrip("- ") for item in response.split("\n") if item.strip()]

import json
import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.biography import Biography, BiographyEntry, BiographyStyle, BiographyStatus
from app.models.recording import Recording
from app.services.llm.base import LLMProvider
from app.services.settings_service import get_llm_for_user
from app.services.biography.constants import (
    RECORDING_METHOD_PROMPTS,
    TIMELINE_TEMPLATE_QUESTIONS,
)
from app.services.biography.prompts import (
    build_metadata_extraction_system_prompt,
    build_missing_info_analysis_system_prompt,
    build_synopsis_questions_system_prompt,
)


class BiographyService:
    def __init__(self, db: Session, user_id: Optional[str] = None):
        self.db = db
        self.user_id = user_id
        self.llm: LLMProvider = get_llm_for_user(db, user_id) if user_id else None

    def _get_llm(self, user_id: str) -> LLMProvider:
        if self.llm and self.user_id == user_id:
            return self.llm
        return get_llm_for_user(self.db, user_id)

    async def create_biography(
        self,
        user_id: str,
        title: str,
        style: BiographyStyle = BiographyStyle.STORY,
        description: Optional[str] = None,
        birth_year: Optional[int] = None,
        hometown: Optional[str] = None,
        key_events: Optional[str] = None,
        recording_method: str = "guided",
    ) -> Biography:
        biography = Biography(
            id=str(uuid.uuid4()),
            user_id=user_id,
            title=title,
            style=style,
            description=description,
            birth_year=birth_year,
            hometown=hometown,
            key_events=key_events,
            recording_method=recording_method,
        )
        self.db.add(biography)
        self.db.commit()
        self.db.refresh(biography)
        return biography

    async def organize_transcript(
        self,
        biography_id: str,
        recording_id: str,
        transcript_override: Optional[str] = None,
    ) -> BiographyEntry:
        recording = self.db.query(Recording).filter(Recording.id == recording_id).first()
        if not recording:
            raise ValueError("Recording not found")

        transcript = transcript_override or recording.transcript
        if not transcript:
            raise ValueError("Recording not found or not transcribed")

        biography = self.db.query(Biography).filter(Biography.id == biography_id).first()
        if not biography:
            raise ValueError("Biography not found")

        llm = self._get_llm(biography.user_id)

        existing_entries = (
            self.db.query(BiographyEntry)
            .filter(BiographyEntry.biography_id == biography_id)
            .all()
        )

        key_events = []
        if biography.key_events:
            try:
                key_events = json.loads(biography.key_events)
            except json.JSONDecodeError:
                key_events = [biography.key_events]

        context = {
            "title": biography.title,
            "description": biography.description,
            "birth_year": biography.birth_year,
            "hometown": biography.hometown,
            "key_events": key_events,
            "recording_method": biography.recording_method,
            "existing_chapters": [e.title for e in existing_entries if e.title],
            "time_periods": list(
                {e.time_period_start for e in existing_entries if e.time_period_start}
            ),
        }

        content = await llm.generate_biography(
            transcript=transcript,
            style=biography.style.value,
            context=context,
        )

        metadata = await self._extract_metadata(content, llm)

        entry = BiographyEntry(
            id=str(uuid.uuid4()),
            biography_id=biography_id,
            recording_id=recording_id,
            title=metadata.get("title"),
            content=content,
            original_transcript=transcript,
            time_period_start=metadata.get("time_period_start"),
            time_period_end=metadata.get("time_period_end"),
            location=metadata.get("location"),
        )

        self.db.add(entry)
        if biography.status == BiographyStatus.DRAFT:
            biography.status = BiographyStatus.IN_PROGRESS
        self.db.commit()
        self.db.refresh(entry)
        return entry

    async def process_recording(self, biography_id: str, recording_id: str) -> BiographyEntry:
        return await self.organize_transcript(biography_id, recording_id)

    async def _extract_metadata(self, content: str, llm: LLMProvider) -> Dict[str, Any]:
        messages = [
            {
                "role": "system",
                "content": build_metadata_extraction_system_prompt(),
            },
            {"role": "user", "content": content},
        ]

        response = await llm.chat(messages, temperature=0.3)
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return {"title": "未命名章节"}

    async def generate_questions(
        self,
        biography_id: str,
        mode: str = "ai",
        custom_questions: Optional[List[str]] = None,
    ) -> List[str]:
        biography = self.db.query(Biography).filter(Biography.id == biography_id).first()
        if not biography:
            raise ValueError("Biography not found")

        if mode == "custom" and custom_questions:
            return custom_questions[:5]

        if mode == "template" or biography.recording_method == "timeline":
            return TIMELINE_TEMPLATE_QUESTIONS

        if mode == "synopsis" and biography.description:
            llm = self._get_llm(biography.user_id)
            response = await llm.chat(
                [
                    {
                        "role": "system",
                        "content": build_synopsis_questions_system_prompt(
                            RECORDING_METHOD_PROMPTS.get(
                                biography.recording_method or "guided", ""
                            )
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"传记梗概：{biography.description}",
                    },
                ],
                temperature=0.8,
            )
            questions = [
                q.strip().lstrip("0123456789.-、）) ")
                for q in response.split("\n")
                if q.strip()
            ]
            return questions[:5] if questions else TIMELINE_TEMPLATE_QUESTIONS

        entries = (
            self.db.query(BiographyEntry)
            .filter(BiographyEntry.biography_id == biography_id)
            .all()
        )

        existing_content = "\n".join([e.content for e in entries])
        llm = self._get_llm(biography.user_id)
        missing_info = await self._analyze_missing_info(existing_content, llm)
        return await llm.generate_questions(existing_content, missing_info)

    async def _analyze_missing_info(self, content: str, llm: LLMProvider) -> List[str]:
        messages = [
            {
                "role": "system",
                "content": build_missing_info_analysis_system_prompt(),
            },
            {"role": "user", "content": content or "（尚无内容）"},
        ]

        response = await llm.chat(messages, temperature=0.3)
        return [item.strip().lstrip("- ") for item in response.split("\n") if item.strip()]

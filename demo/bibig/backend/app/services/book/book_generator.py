import json
import uuid
from typing import List
from sqlalchemy.orm import Session
from app.models.biography import Biography, BiographyEntry, Chapter
from app.models.book import Book, BookFormat, BookStatus
from app.services.settings_service import get_llm_for_user
from app.services.book.pdf_generator import PDFGenerator
from app.services.biography.prompts import (
    build_chapter_enhance_system_prompt,
    build_chapter_structure_system_prompt,
)


class BookGenerator:
    def __init__(self, db: Session, user_id: str | None = None):
        self.db = db
        self.user_id = user_id
        self.llm = get_llm_for_user(db, user_id) if user_id else None
        self.pdf_generator = PDFGenerator()

    def _get_llm(self, user_id: str):
        if self.llm and self.user_id == user_id:
            return self.llm
        return get_llm_for_user(self.db, user_id)

    async def generate_book(self, biography_id: str, book_format: BookFormat = BookFormat.PDF) -> Book:
        biography = self.db.query(Biography).filter(Biography.id == biography_id).first()
        if not biography:
            raise ValueError("Biography not found")

        entries = (
            self.db.query(BiographyEntry)
            .filter(BiographyEntry.biography_id == biography_id)
            .order_by(BiographyEntry.time_period_start)
            .all()
        )

        if not entries:
            raise ValueError("No content to generate book")

        chapters = await self._organize_chapters(biography, entries)
        llm = self._get_llm(biography.user_id)
        book_content = await self._generate_full_content(biography, chapters, entries, llm)

        file_url = None
        if book_format == BookFormat.PDF:
            file_url = await self.pdf_generator.generate(book_content, biography.title)

        book = Book(
            id=str(uuid.uuid4()),
            biography_id=biography_id,
            title=biography.title,
            author_name=biography.user.name if biography.user else None,
            format=book_format,
            file_url=file_url,
            word_count=len(book_content["full_text"]),
            status=BookStatus.READY if file_url else BookStatus.FAILED,
        )

        self.db.add(book)
        self.db.commit()
        self.db.refresh(book)
        return book

    async def _organize_chapters(
        self, biography: Biography, entries: List[BiographyEntry]
    ) -> List[Chapter]:
        entries_text = "\n".join(
            [
                f"【{e.title or '未命名'}】{e.content[:200]}..."
                for e in entries
            ]
        )

        messages = [
            {
                "role": "system",
                "content": build_chapter_structure_system_prompt(),
            },
            {"role": "user", "content": entries_text},
        ]

        response = await self._get_llm(biography.user_id).chat(messages, temperature=0.5)
        try:
            chapters_data = json.loads(response)
        except json.JSONDecodeError:
            chapters_data = {}

        chapter_list = chapters_data.get("chapters")
        if not chapter_list:
            chapter_list = [
                {
                    "number": 1,
                    "title": biography.title,
                    "summary": "人生故事",
                    "entry_ids": [e.id for e in entries],
                }
            ]

        chapters = []
        for ch in chapter_list:
            chapter = Chapter(
                id=str(uuid.uuid4()),
                biography_id=biography.id,
                number=ch["number"],
                title=ch["title"],
                summary=ch.get("summary", ""),
                content="",
            )
            self.db.add(chapter)
            chapters.append(chapter)

        self.db.commit()
        return chapters

    async def _generate_full_content(
        self,
        biography: Biography,
        chapters: List[Chapter],
        entries: List[BiographyEntry],
        llm,
    ) -> dict:
        full_chapters = []
        combined_content = "\n\n".join([e.content for e in entries])

        for chapter in chapters:
            enhanced_content = await self._enhance_chapter(chapter, combined_content, llm)
            chapter.content = enhanced_content
            full_chapters.append(
                {
                    "number": chapter.number,
                    "title": chapter.title,
                    "content": enhanced_content,
                }
            )

        self.db.commit()

        return {
            "title": biography.title,
            "chapters": full_chapters,
            "full_text": "\n\n".join([ch["content"] for ch in full_chapters]),
        }

    async def _enhance_chapter(self, chapter: Chapter, content: str, llm) -> str:
        messages = [
            {
                "role": "system",
                "content": build_chapter_enhance_system_prompt(
                    chapter.title, chapter.summary or ""
                ),
            },
            {"role": "user", "content": content},
        ]

        return await llm.chat(messages, temperature=0.7)

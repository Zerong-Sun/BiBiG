import json
import uuid
from typing import List
from sqlalchemy.orm import Session
from app.models.biography import Biography, BiographyEntry, Chapter
from app.models.book import Book, BookFormat, BookStatus
from app.services.llm.factory import get_llm_provider
from app.services.book.pdf_generator import PDFGenerator


class BookGenerator:
    def __init__(self, db: Session):
        self.db = db
        self.llm = get_llm_provider()
        self.pdf_generator = PDFGenerator()

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
        book_content = await self._generate_full_content(biography, chapters, entries)

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
                "content": """你是一位专业的书籍编辑。请根据以下传记内容，设计合理的章节结构。

要求：
1. 章节数量控制在1-15章
2. 每章有明确的主题
3. 按时间或主题逻辑组织
4. 为每章生成简短摘要

返回JSON格式：
{
  "chapters": [
    {"number": 1, "title": "...", "summary": "...", "entry_ids": []}
  ]
}""",
            },
            {"role": "user", "content": entries_text},
        ]

        response = await self.llm.chat(messages, temperature=0.5)
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
    ) -> dict:
        full_chapters = []
        combined_content = "\n\n".join([e.content for e in entries])

        for chapter in chapters:
            enhanced_content = await self._enhance_chapter(chapter, combined_content)
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

    async def _enhance_chapter(self, chapter: Chapter, content: str) -> str:
        messages = [
            {
                "role": "system",
                "content": f"""你是一位专业的传记作家。请润色以下章节内容，使其更加流畅、完整。

章节标题：{chapter.title}
章节摘要：{chapter.summary or ''}

要求：
1. 保持原始内容的真实性和情感
2. 补充过渡语句
3. 优化段落结构
4. 添加适当的文学性描写""",
            },
            {"role": "user", "content": content},
        ]

        return await self.llm.chat(messages, temperature=0.7)

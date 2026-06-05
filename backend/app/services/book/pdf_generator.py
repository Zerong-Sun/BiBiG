import json
import os
import uuid
from typing import Dict, Any, List
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import tempfile
from app.services.audio.storage_service import StorageService


class PDFGenerator:
    FONT_NAME = "Helvetica"

    def __init__(self):
        self.storage = StorageService()
        self._register_font()
        self.styles = getSampleStyleSheet()
        self.styles.add(
            ParagraphStyle(
                name="ChineseTitle",
                parent=self.styles["Heading1"],
                fontName=self.FONT_NAME,
                fontSize=24,
                alignment=1,
                spaceAfter=30,
            )
        )
        self.styles.add(
            ParagraphStyle(
                name="ChineseBody",
                parent=self.styles["Normal"],
                fontName=self.FONT_NAME,
                fontSize=12,
                leading=18,
                firstLineIndent=24,
            )
        )

    def _register_font(self):
        font_paths = [
            "/usr/share/fonts/truetype/simsun.ttc",
            "/System/Library/Fonts/PingFang.ttc",
            "/System/Library/Fonts/STHeiti Light.ttc",
        ]
        for path in font_paths:
            if os.path.exists(path):
                try:
                    pdfmetrics.registerFont(TTFont("ChineseFont", path))
                    self.FONT_NAME = "ChineseFont"
                    return
                except Exception:
                    continue

    async def generate(self, content: Dict[str, Any], title: str) -> str:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp_path = tmp.name

        doc = SimpleDocTemplate(
            tmp_path,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=2 * cm,
            bottomMargin=2 * cm,
        )

        story = []
        story.append(Spacer(1, 5 * cm))
        story.append(Paragraph(title, self.styles["ChineseTitle"]))
        story.append(PageBreak())

        story.append(Paragraph("目录", self.styles["ChineseTitle"]))
        for ch in content["chapters"]:
            story.append(
                Paragraph(
                    f"第{ch['number']}章 {ch['title']}",
                    self.styles["ChineseBody"],
                )
            )
        story.append(PageBreak())

        for ch in content["chapters"]:
            story.append(
                Paragraph(
                    f"第{ch['number']}章 {ch['title']}",
                    self.styles["ChineseTitle"],
                )
            )
            story.append(Spacer(1, 1 * cm))

            for paragraph in ch["content"].split("\n\n"):
                if paragraph.strip():
                    safe = paragraph.strip().replace("&", "&amp;").replace("<", "&lt;")
                    story.append(Paragraph(safe, self.styles["ChineseBody"]))
                    story.append(Spacer(1, 0.5 * cm))

            story.append(PageBreak())

        doc.build(story)

        pdf_data = open(tmp_path, "rb").read()
        os.unlink(tmp_path)

        object_name = f"books/{uuid.uuid4()}/{title}.pdf"
        file_url = await self.storage.upload_file(
            pdf_data, object_name, "application/pdf"
        )
        return file_url

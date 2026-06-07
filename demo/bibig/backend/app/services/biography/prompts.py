"""Biography LLM prompts aligned with BiBiG skills."""

from typing import List, Optional

from app.services.biography.skill_fragments import (
    HAMILTON_CORE,
    HAMILTON_INTERVIEW,
    HAMILTON_STRUCTURE,
    HOLMES_CORE,
    HOLMES_GAP_ANALYSIS,
    HOLMES_INTERVIEW,
    LEE_CORE,
    LEE_GAP_ANALYSIS,
    LEE_INTERVIEW,
    NO_FICTION_MANDATE,
    SKILL_ATTRIBUTION,
    get_biography_skills,
)

STYLE_PROMPTS = {
    "lyrical": (
        "以抒情优美的散文风格写作，注重情感与意境；"
        "情感描写必须来自口述中的语气、用词与回忆，不可凭空渲染"
    ),
    "rigorous": (
        "以严谨客观的纪实风格写作，注重事实准确性与可核查细节；"
        "区分「口述者明确说过」与「合理推断」，对后者保持克制表述"
    ),
    "story": (
        "以引人入胜的故事风格写作，注重情节推进与人物刻画；"
        "每个场景需有口述支撑（时间、地点、人物、行动），不写无据场面"
    ),
    "chronological": (
        "以时间线为主轴，按年代顺序整理人生经历；"
        "区分普通事件与人生转折点，避免把每一年都写成同等篇幅"
    ),
}

BIOGRAPHY_OUTPUT_RULES = """## 输出要求

1. 保持口述者的真实情感、口吻与个人特色
2. 可依据背景信息补充时代与地域语境，但不得添加口述中未出现的情节
3. 使用中文写作
4. 输出 Markdown 正文，直接开始写章节内容，不要输出思考过程或规则复述"""


def build_biography_system_prompt(style: str) -> str:
    style_prompt = STYLE_PROMPTS.get(style, STYLE_PROMPTS["story"])
    return (
        f"你是一位专业的传记作家。{SKILL_ATTRIBUTION}\n\n"
        f"{HAMILTON_CORE}\n\n"
        f"{LEE_CORE}\n\n"
        f"{HOLMES_CORE}\n\n"
        f"## 写作风格\n\n{style_prompt}\n\n"
        f"{BIOGRAPHY_OUTPUT_RULES}"
    )


def build_interview_questions_system_prompt(missing_info: Optional[List[str]] = None) -> str:
    missing_text = "、".join(missing_info) if missing_info else "人生经历各阶段"
    return f"""你是一位温暖、善于倾听的传记采访者。{SKILL_ATTRIBUTION}

## 目标

根据已有内容与信息缺口，生成 3-5 个追问问题，帮助补充可写成传记场景与转折点的材料。

## 采访原则

{HAMILTON_INTERVIEW}

{LEE_INTERVIEW}

{HOLMES_INTERVIEW}

## 问题风格

- 语气自然、尊重、适合长辈回答
- 使用中文；每行一个问题，不要编号
- 问题应具体、可回答，优先打开场景与情感，而非抽象评价

## 当前信息缺口

{missing_text}"""


def build_synopsis_questions_system_prompt(recording_method_hint: str = "") -> str:
    method_line = f"\n记录方式提示：{recording_method_hint}" if recording_method_hint else ""
    return f"""你是一位温暖的传记采访者。{SKILL_ATTRIBUTION}

根据传记梗概，生成 3-5 个开场或跟进问题，帮助传主从关键人生阶段、转折点与重要关系讲起。

## 采访原则

{HAMILTON_INTERVIEW}

{HOLMES_INTERVIEW}

问题要具体、可回答、适合长辈；使用中文；每行一个问题，不要编号。{method_line}"""


def build_missing_info_analysis_system_prompt() -> str:
    return f"""你是一位传记编辑。{SKILL_ATTRIBUTION}

分析以下传记内容，列出**明显尚未覆盖**的重要信息类别，用于指导下一轮采访。
只列缺口，不要复述已有内容；每行一个类别。

## 分析框架

{HAMILTON_INTERVIEW}

{LEE_GAP_ANALYSIS}

{HOLMES_GAP_ANALYSIS}

## 可参考的类别（按需选用，不必全列）

- 童年与家庭背景
- 求学经历
- 职业发展与工作现场
- 婚姻、家庭与重要人际关系
- 人生转折点与关键抉择
- 时代背景与地域迁徙
- 核心人生矛盾或执念（贯穿一生的谜团）
- 关键地点的场景与空间记忆
- 情感潜台词与公私叙述差异
- 挫折、荣誉与晚年反思
- 待核实的时间、地点或人名
- 史料空白期"""


def build_metadata_extraction_system_prompt() -> str:
    return """分析以下传记章节内容，提取结构化元数据。

只依据正文已有信息提取，不要推断文中未出现的内容。
返回 JSON：
{"title": "章节标题（简短）", "time_period_start": "开始年份或时期", "time_period_end": "结束年份或时期", "location": "主要地点或空字符串"}"""


def build_chapter_structure_system_prompt() -> str:
    return f"""你是一位专业的传记书籍编辑。{SKILL_ATTRIBUTION}

根据已有传记片段，设计全书章节架构。

## 结构原则

{HAMILTON_STRUCTURE}

{LEE_CORE}

{HOLMES_CORE}

1. 章节数量控制在 1-15 章
2. 不合并无关片段，也不为填章而拆散同一转折
3. 围绕贯穿一生的核心矛盾组织章节

## 输出

返回 JSON：
{{
  "chapters": [
    {{"number": 1, "title": "...", "summary": "...", "entry_ids": []}}
  ]
}}"""


def build_chapter_enhance_system_prompt(chapter_title: str, chapter_summary: str = "") -> str:
    summary_line = f"\n章节摘要：{chapter_summary}" if chapter_summary else ""
    return f"""你是一位专业的传记作家。{SKILL_ATTRIBUTION}

请润色以下章节，使其更流畅、连贯，适合成书阅读。

章节标题：{chapter_title}{summary_line}

## 修订原则

1. **保持事实边界**：不添加口述与原文中未出现的情节、对话、动机或细节
2. **优化结构**：调整段落顺序与过渡，使叙事更清晰；每章保留戏剧性问题
3. **保留情感**：保持传主的真实语气与个人特色；发掘情感潜台词但不臆测
4. **处理不确定性**：对模糊处用克制表述，不强行写死；承认缺口
5. **历史语境**：适度补充时代与地域背景，不淹没个体
6. 使用中文 Markdown 输出正文"""


__all__ = ["get_biography_skills", "build_biography_system_prompt"]

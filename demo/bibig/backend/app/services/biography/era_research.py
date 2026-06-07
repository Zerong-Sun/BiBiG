"""Retrieve era context from external sources for interview questions."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional, Sequence, Tuple

import httpx

WIKI_API = "https://zh.wikipedia.org/w/api.php"
WIKI_HEADERS = {"User-Agent": "BiBiG-Demo/1.0 (biography era research)"}
MAX_QUERIES = 3
YEAR_PATTERN = re.compile(r"(19|20)\d{2}")


@dataclass
class EraResearchItem:
    period: str
    location: str
    query: str
    summary: str
    source: str
    source_url: str

    def to_dict(self) -> Dict[str, str]:
        return asdict(self)


def _decade_label(year: int) -> str:
    decade = (year // 10) * 10
    return f"{decade}年代"


def _extract_years(text: str) -> List[int]:
    years = [int(match.group(0)) for match in YEAR_PATTERN.finditer(text or "")]
    return sorted(set(years))


def build_era_search_targets(
    content: str,
    *,
    birth_year: Optional[int] = None,
    hometown: Optional[str] = None,
    description: Optional[str] = None,
) -> List[Tuple[str, str, str]]:
    """Return (period_label, location, search_query) candidates."""
    combined = "\n".join(filter(None, [content, description or ""]))
    years = _extract_years(combined)
    if birth_year and birth_year not in years:
        years.insert(0, birth_year)

    location = (hometown or "").strip() or "中国"
    targets: List[Tuple[str, str, str]] = []
    seen: set[str] = set()

    for year in years[:MAX_QUERIES]:
        period = _decade_label(year)
        query = f"{year}年 {location} 历史"
        key = f"{period}|{location}|{query}"
        if key not in seen:
            seen.add(key)
            targets.append((period, location, query))

    if not targets and birth_year:
        period = _decade_label(birth_year)
        query = f"{birth_year}年 {location} 社会"
        targets.append((period, location, query))

    if not targets and hometown:
        query = f"{hometown} 历史"
        targets.append(("地方背景", hometown, query))

    return targets[:MAX_QUERIES]


async def _search_wikipedia(query: str) -> Optional[Tuple[str, str, str]]:
    params = {
        "action": "opensearch",
        "search": query,
        "limit": 1,
        "namespace": 0,
        "format": "json",
    }
    try:
        async with httpx.AsyncClient(timeout=8.0, headers=WIKI_HEADERS) as client:
            response = await client.get(WIKI_API, params=params)
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError):
        return None

    if not isinstance(payload, list) or len(payload) < 4:
        return None

    titles: Sequence[str] = payload[1] if len(payload) > 1 else []
    descriptions: Sequence[str] = payload[2] if len(payload) > 2 else []
    urls: Sequence[str] = payload[3] if len(payload) > 3 else []
    if not titles:
        return None

    title = titles[0]
    summary = (descriptions[0] or "").strip()
    url = (urls[0] or "").strip()
    if not summary:
        summary = f"检索到与「{query}」相关的条目：{title}。"
    return title, summary, url


async def research_era_context(
    content: str,
    *,
    birth_year: Optional[int] = None,
    hometown: Optional[str] = None,
    description: Optional[str] = None,
) -> List[EraResearchItem]:
    items: List[EraResearchItem] = []
    for period, location, query in build_era_search_targets(
        content,
        birth_year=birth_year,
        hometown=hometown,
        description=description,
    ):
        result = await _search_wikipedia(query)
        if not result:
            continue
        title, summary, url = result
        items.append(
            EraResearchItem(
                period=period,
                location=location,
                query=query,
                summary=summary,
                source=f"维基百科《{title}》",
                source_url=url,
            )
        )
    return items


def format_era_research_for_prompt(items: Sequence[EraResearchItem]) -> str:
    if not items:
        return "（未检索到可靠的时代背景条目；请勿在问题中加入未经检索的时代细节。）"

    blocks = []
    for index, item in enumerate(items, start=1):
        blocks.append(
            f"{index}. 时期：{item.period}；地点：{item.location}\n"
            f"   检索词：{item.query}\n"
            f"   来源：{item.source}（{item.source_url}）\n"
            f"   摘要：{item.summary}"
        )
    return "\n\n".join(blocks)


def era_research_to_dicts(items: Sequence[EraResearchItem]) -> List[Dict[str, Any]]:
    return [item.to_dict() for item in items]

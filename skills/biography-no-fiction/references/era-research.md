# Era Research for Interview Questions

## Workflow

1. Extract candidate **period + location** from biography metadata and existing entries.
2. **Search** external sources (Wikipedia, regional chronicles, institutional histories) for each pair.
3. Pass only **retrieved summaries** to the question generator — not model-generated history.
4. Generate questions that use retrieval as **prompt for memory**, not as **established fact about the subject**.

## Search Output Record

Each item should include:

- `period` — e.g. "1960年代"
- `location` — e.g. "北京"
- `query` — search string used
- `summary` — short retrieved text (1–3 sentences)
- `source` — human-readable source name
- `source_url` — link when available

## Question Labeling

When a question draws on item `N`:

```
【时代背景·已检索·来源：维基百科《文化大革命》】那段时间您在北京的生活里，有哪些事现在还记得？
```

If no reliable retrieval: omit era backdrop; ask directly:

```
您还记得那段时间在北京的生活吗？能讲讲一件具体的事吗？
```

## Demo Integration

In `demo/bibig`, era research runs in `era_research.py` before `generate_questions`. API returns `era_research` array for UI display.

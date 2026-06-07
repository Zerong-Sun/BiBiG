# BiBiG Demo — 口述传记

将 BiBiG 传记 skills 接入 LLM 的参考实现。前端与产品体验非重点。

## Skill 与代码映射

| Skill | 来源 | 用途（Demo 中） |
|-------|------|----------------|
| [`how-to-do-biography`](../../skills/how-to-do-biography/) | Nigel Hamilton (2008) | 结构、转折点、证据边界 |
| [`biography-vsi`](../../skills/biography-vsi/) | Hermione Lee (2009) | 伦理、读者契约、公私平衡 |
| `footsteps` | Richard Holmes (1985) | 足迹追踪、情感考古、核心问题 |

| 组件 | 路径 |
|------|------|
| Skill 片段（三书蒸馏） | `backend/app/services/biography/skill_fragments.py` |
| LLM system prompt 组装 | `backend/app/services/biography/prompts.py` |
| 口述 → 章节 | `backend/app/services/biography/biography_service.py` |
| 全书分章润色 | `backend/app/services/book/book_generator.py` |
| 前端 skill 标注 | `frontend/src/components/SkillAttribution.tsx` |

修改传记写作行为时，**优先改 skill 原文**，再同步 `skill_fragments.py` 与 `prompts.py`。

## 本地运行

### 后端

```bash
cd demo/bibig/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

API：http://localhost:8000/docs

### 前端（可选）

```bash
cd demo/bibig/frontend
npm install && npm run dev
```

访问：http://localhost:5173

### Docker

```bash
cd demo/bibig
docker-compose up -d
```

- API：http://localhost:8000/docs
- 前端：http://localhost:3000

## 环境变量

见 `backend/.env.example`。开发可用 `DEFAULT_LLM_PROVIDER=mock` 跳过真实 LLM。

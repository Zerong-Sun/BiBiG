# BiBiG Demo — 口述传记

将 [`how-to-do-biography`](../../skills/how-to-do-biography/) 接入 LLM 的参考实现。前端与产品体验非重点。

## Skill 与代码映射

| 组件 | 路径 |
|------|------|
| Skill 定义 | `../../skills/how-to-do-biography/` |
| LLM system prompt | `backend/app/services/biography/prompts.py` |
| 口述 → 章节 | `backend/app/services/biography/biography_service.py` |
| 全书分章润色 | `backend/app/services/book/book_generator.py` |

修改传记写作行为时，**优先改 skill**，再同步 `prompts.py`。

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

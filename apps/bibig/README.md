# BiBiG — 口述传记 Demo

帮助老年人整理口述、生成传记章节的示例应用。用于验证 **`biography-writer`** skill 在真实 LLM 流程中的效果。

> 前端与产品体验**非本仓库重点**。需要本地演示时再启动即可。

## 与 Skill 的关系

| 组件 | 路径 | 作用 |
|------|------|------|
| Skill 定义 | `skills/biography-writer/` | 传记写作规范、工作流、伦理规则 |
| LLM Prompt | `backend/app/services/biography/prompts.py` | 将 skill 原则编译为 system prompt |
| 口述整理 API | `backend/app/services/biography/biography_service.py` | 转写 → 章节 → 追问 |
| 书籍生成 | `backend/app/services/book/book_generator.py` | 分章与润色 |

修改传记写作行为时，**优先改 skill 与 `prompts.py`**，保持单一来源。

## 本地运行（可选）

### 后端

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # 按需配置 LLM
uvicorn app.main:app --reload --port 8000
```

API 文档：http://localhost:8000/docs

### 前端（可选）

```bash
cd frontend
npm install && npm run dev
```

访问：http://localhost:5173

### Docker

```bash
docker-compose up -d
```

- API：http://localhost:8000/docs  
- 前端：http://localhost:3000

## 环境变量

见 `backend/.env.example`：

- `DEFAULT_LLM_PROVIDER`：`mock` | `openai` | `claude`
- `USE_MOCK_TRANSCRIPTION`：开发时跳过 Whisper

## 测试

```bash
cd backend
pip install -r requirements-dev.txt
pytest -v
```

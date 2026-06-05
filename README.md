# BiBiG - 人生传记 AI 平台

帮助老年人整理口述内容、生成完整传记书籍的 AI 平台。

## 功能

- 语音录音 + 本地 IndexedDB 防丢失（开始即保存，仅手动删除）
- Whisper 语音转文字
- 多 LLM 支持（OpenAI / Claude / Mock 离线模式）
- AI 主动追问补充资料
- 多种传记风格（抒情 / 严谨 / 故事 / 时间顺序）
- 生成 PDF 书籍

## 快速开始

### 后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API 文档: http://localhost:8000/docs

### 前端

```bash
cd frontend
npm install
npm run dev
```

访问: http://localhost:5173

### Docker

```bash
docker-compose up -d
```

- 前端: http://localhost:3000
- API: http://localhost:8000/docs

## 环境变量

见 `backend/.env.example`

- `DEFAULT_LLM_PROVIDER`: `mock` | `openai` | `claude`
- `USE_MOCK_TRANSCRIPTION`: 开发时跳过 Whisper
- `USE_LOCAL_STORAGE`: 使用本地文件存储代替 MinIO

## 测试

```bash
cd backend
pytest -v
```

## 数据库迁移

```bash
cd backend
alembic upgrade head
```

## 项目结构

```
BiBiG/
├── backend/          # FastAPI 后端
├── frontend/         # React 前端
└── docker-compose.yml
```

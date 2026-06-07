# BiBiG — Agent Skills 技能库

面向 **Cursor**、**Codex** 等 AI 编程助手的开源 **Agent Skills** 合集。  
从书籍与实践中提炼可复用的工作流、规范与工具，供任何人安装使用。

> **本仓库重点**：`skills/` 技能库与 `books/` 参考书体系。  
> `backend/`、`frontend/` 是传记写作的示例应用（非维护重点），展示如何把 skill 接入真实产品。

## 快速开始

### 在 Cursor 中使用

克隆本仓库后，技能已通过 `.cursor/skills` 软链接指向 `skills/`，在对应项目中打开即可自动发现。

也可手动安装到全局技能目录：

```bash
# 安装单个技能
cp -r skills/biography-writer ~/.cursor/skills/

# 或安装全部
cp -r skills/* ~/.cursor/skills/
```

在对话中直接提及任务，Agent 会根据 `SKILL.md` 的 `description` 自动匹配；也可显式调用，例如：

> 用 biography-writer 帮我规划这本传记的研究提纲

### 在 Codex 中使用

```bash
cp -r skills/biography-writer ~/.codex/skills/
```

## 项目结构

```
BiBiG/
├── skills/              # 技能库（本仓库核心）
│   ├── biography-writer/   # 原创：非虚构传记写作
│   ├── skill-creator/      # 创建新技能
│   ├── pdf/ docx/ pptx/    # 文档处理
│   └── ...
├── books/               # 参考书库（本地自备，不入库）
│   └── biography/          # 传记写作类参考
├── apps/                # 示例应用说明
│   └── bibig/              # 口述传记 Demo
├── backend/             # Demo 后端（FastAPI）
├── frontend/            # Demo 前端（非重点）
└── docker-compose.yml
```

## 技能分类

完整目录见 [skills/README.md](skills/README.md)。

| 分类 | 代表技能 | 说明 |
|------|----------|------|
| **写作与传记** | `biography-writer` | 从参考书提炼的传记写作规范 |
| **文档** | `pdf`, `docx`, `pptx`, `xlsx` | 办公文档读写与生成 |
| **设计** | `figma`, `canvas-design`, `frontend-design` | 设计与前端 |
| **开发流程** | `brainstorming`, `writing-plans`, `test-driven-development` | 规划、实现、验证 |
| **平台与 API** | `claude-api`, `cloudflare-deploy`, `mcp-builder` | 集成与部署 |
| **元技能** | `skill-creator`, `skill-installer` | 创建与管理技能 |

### 原创技能

| 技能 | 来源 | 状态 |
|------|------|------|
| [biography-writer](skills/biography-writer/) | `books/biography/` 参考书提炼 | 可用，持续扩展 |

更多原创技能会随参考书整理逐步加入。

## 参考书 → 技能

`books/` 存放**本地参考书**（版权原因不入 Git）。阅读、笔记、提炼后，在 `skills/` 发布对应 Agent Skill。

流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。

当前参考书主题：

- **传记写作**（`books/biography/`）→ `biography-writer`

## 示例应用：BiBiG

[apps/bibig/README.md](apps/bibig/README.md) 中的口述传记 Demo，展示 `biography-writer` 如何接入 LLM prompt。前端非维护重点，需要时本地启动即可。

```bash
cd backend && uvicorn app.main:app --reload --port 8000
```

## 贡献

欢迎提交新 skill、改进现有 skill、或补充参考书目与提炼笔记。详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可

- **Skills**：各技能目录内 LICENSE 文件为准（多数为 MIT 或 Apache-2.0）
- **参考书**：请自行合法获取，勿将受版权保护的文件提交到本仓库
- **BiBiG 应用代码**：见仓库根目录许可（如有）

# Skills 目录

本目录包含 **44** 个 Agent Skills，供 Cursor / Codex 等 AI 助手按需加载。

## 安装

```bash
# 本仓库已配置 .cursor/skills → skills/，克隆即用

# 复制到全局（Cursor）
cp -r skills/<skill-name> ~/.cursor/skills/

# 复制到全局（Codex）
cp -r skills/<skill-name> ~/.codex/skills/
```

每个技能至少包含 `SKILL.md`（必需），可选 `references/`、`scripts/`、`agents/openai.yaml`。

---

## 写作与传记

| 技能 | 说明 |
|------|------|
| [biography-writer](biography-writer/) | **原创** — 非虚构传记：研究、结构、场景、事实核查与伦理 |
| [doc-coauthoring](doc-coauthoring/) | 协作文档：规格、提案、技术文档 |
| [internal-comms](internal-comms/) | 内部沟通：周报、通报、FAQ |
| [speech](speech/) | 文字转语音与旁白（OpenAI Audio API） |

## 文档处理

| 技能 | 说明 |
|------|------|
| [pdf](pdf/) | PDF 读写、合并、OCR |
| [docx](docx/) | Word 文档 |
| [pptx](pptx/) | 演示文稿 |
| [xlsx](xlsx/) | 电子表格 |

## 设计与前端

| 技能 | 说明 |
|------|------|
| [figma](figma/) | Figma MCP：设计读取与 design-to-code |
| [figma-implement-design](figma-implement-design/) | 设计稿转生产代码 |
| [figma-generate-design](figma-generate-design/) | 代码/描述转 Figma 页面 |
| [figma-generate-library](figma-generate-library/) | 从代码库构建 Figma 设计系统 |
| [figma-code-connect-components](figma-code-connect-components/) | Figma Code Connect 映射 |
| [figma-create-design-system-rules](figma-create-design-system-rules/) | 项目设计系统规则 |
| [figma-create-new-file](figma-create-new-file/) | 创建新 Figma 文件 |
| [frontend-design](frontend-design/) | 高质量前端界面 |
| [canvas-design](canvas-design/) | 海报与静态视觉设计 |
| [algorithmic-art](algorithmic-art/) | p5.js 算法艺术 |
| [brand-guidelines](brand-guidelines/) | Anthropic 品牌规范 |
| [theme-factory](theme-factory/) | 主题与样式工具包 |
| [web-artifacts-builder](web-artifacts-builder/) | 复杂 HTML/React 制品 |

## 开发流程（Superpowers）

| 技能 | 说明 |
|------|------|
| [using-superpowers](using-superpowers/) | 技能发现与使用入口 |
| [brainstorming](brainstorming/) | 创意工作前的需求探索 |
| [writing-plans](writing-plans/) | 多步实施计划 |
| [executing-plans](executing-plans/) | 分阶段执行计划 |
| [subagent-driven-development](subagent-driven-development/) | 子代理并行开发 |
| [dispatching-parallel-agents](dispatching-parallel-agents/) | 并行独立任务 |
| [test-driven-development](test-driven-development/) | TDD |
| [systematic-debugging](systematic-debugging/) | 系统化调试 |
| [verification-before-completion](verification-before-completion/) | 完成前验证 |
| [requesting-code-review](requesting-code-review/) | 请求代码审查 |
| [receiving-code-review](receiving-code-review/) | 处理审查意见 |
| [finishing-a-development-branch](finishing-a-development-branch/) | 分支收尾与合并 |
| [using-git-worktrees](using-git-worktrees/) | Git worktree 隔离开发 |
| [define-goal](define-goal/) | 定义可衡量目标 |

## 平台、API 与工具

| 技能 | 说明 |
|------|------|
| [claude-api](claude-api/) | Claude API / Anthropic SDK |
| [cloudflare-deploy](cloudflare-deploy/) | Cloudflare Workers / Pages 部署 |
| [mcp-builder](mcp-builder/) | 构建 MCP 服务器 |
| [cli-creator](cli-creator/) | 从 API 文档构建 CLI |
| [webapp-testing](webapp-testing/) | Playwright 测试 Web 应用 |

## 元技能（创建与管理）

| 技能 | 说明 |
|------|------|
| [skill-creator](skill-creator/) | 创建与维护新技能 |
| [skill-installer](skill-installer/) | 从列表或 GitHub 安装技能 |
| [writing-skills](writing-skills/) | 技能写作与验证 |
| [template-skill](template-skill/) | 技能模板 |

---

## 技能结构

```
skill-name/
├── SKILL.md              # 必需：frontmatter + 使用说明
├── agents/openai.yaml    # 可选：UI 元数据
├── references/           # 可选：按需加载的参考文档
├── scripts/              # 可选：可执行脚本
└── assets/               # 可选：模板、字体、图标
```

创建新技能请阅读 [skill-creator](skill-creator/SKILL.md)。

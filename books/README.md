# 参考书库

本地参考书，用于阅读、做笔记，并**提炼为 `skills/` 中的 Agent Skill**。

> **版权说明**：受版权保护的电子书与 PDF **不会**提交到 Git 仓库（见根目录 `.gitignore`）。请自行合法获取，将文件放入对应子目录即可。

## 目录结构

```
books/
├── biography/     # 传记与非虚构人生写作
└── （更多主题陆续添加）
```

## 当前主题

### biography/ — 传记写作

建议自备的参考书（与本仓库 `biography-writer` skill 对应）：

| 书名 | 作者 | 用途 |
|------|------|------|
| Biography: A Very Short Introduction | — | 传记体裁入门 |
| How To Do Biography: A Primer | Nigel Hamilton | 实操方法 |
| Footsteps: Adventures of a Romantic Biographer | Richard Holmes | 田野与叙事 |
| Reflections on Biography | Paula R. Backscheider | 理论反思 |
| Writing Lives: Principia Biographica | Leon Edel | 传记原理 |
| Fact, Fiction, and Form | Ralph W. Rader 等 | 事实与形式 |

将文件放入 `books/biography/` 后，可在本地用 AI 辅助阅读与提炼；提炼结果发布到 `skills/biography-writer/references/`。

## 从书到 Skill 的流程

1. **阅读** — 在 `books/<topic>/` 放置电子书或 PDF
2. **笔记** — 提取可操作的规则、清单、工作流（非大段摘抄）
3. **起草** — 用 [skill-creator](../skills/skill-creator/SKILL.md) 创建 `skills/<skill-name>/`
4. **验证** — 用真实任务测试 skill 是否触发正确、输出是否可用
5. **发布** — 提交 PR，更新 `skills/README.md` 与根 README 的「原创技能」表

详见 [CONTRIBUTING.md](../CONTRIBUTING.md)。

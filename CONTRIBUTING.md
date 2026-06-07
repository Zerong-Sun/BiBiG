# 贡献指南

本仓库的核心产出是 **`skills/`** 中的 Agent Skills。参考书在 `books/` 本地自备，应用代码在 `backend/` / `frontend/` 仅为示例。

## 贡献什么

| 类型 | 位置 | 欢迎程度 |
|------|------|----------|
| 新 skill 或改进现有 skill | `skills/<name>/` | ⭐ 最欢迎 |
| 参考书目与提炼笔记 | `books/<topic>/` 说明、skill references | ⭐ 欢迎 |
| BiBiG 应用功能 | `backend/`, `frontend/` | 次要，不阻塞 skill 贡献 |

## 创建新 Skill

1. 阅读 [skills/skill-creator/SKILL.md](skills/skill-creator/SKILL.md)
2. 从参考书或实践中提炼**可执行**的规则，避免冗长理论摘抄
3. 目录结构：

```
skills/my-skill/
├── SKILL.md                 # name + description（触发条件写清楚）
├── agents/openai.yaml       # 推荐
└── references/              # 长文档放这里，按需加载
```

4. **SKILL.md frontmatter** 要点：
   - `name`：小写连字符，与目录名一致
   - `description`：写清「何时使用」，Agent 靠它决定是否加载

5. 在 [skills/README.md](skills/README.md) 对应分类下添加一行
6. 若是原创 skill 且来自某书主题，在根 [README.md](README.md)「原创技能」表登记

## 从参考书提炼（推荐流程）

以传记为例（可复用到其他主题）：

```
books/biography/          阅读材料（本地，不入库）
        ↓ 笔记与归纳
skills/biography-writer/
  ├── SKILL.md            核心规则与入口
  └── references/
      ├── workflow.md     完整工作流
      ├── checklists.md   检查清单
      └── ethics-*.md     专题参考
```

原则：

- **简洁**：上下文窗口是公共资源，只写模型不知道的 procedural knowledge
- **可验证**：规则应能指导具体输出（清单、表格、段落），而非空泛口号
- **不侵权**：references 用你自己的归纳，不要粘贴全书章节

## 安装与自测

```bash
# 在项目内（已配置软链接）
ls .cursor/skills/biography-writer/SKILL.md

# 或复制到全局
cp -r skills/my-skill ~/.cursor/skills/
```

用与 `description` 匹配的真实用户问题测试，确认 skill 被触发且输出符合预期。

## 不要提交

- `books/**/*.pdf`, `*.epub` 等受版权保护的电子书
- `.env`、API 密钥、`node_modules/`、`.venv/`
- 未经脱敏的私人传记原文

## Pull Request 检查清单

- [ ] `SKILL.md` 含有效 frontmatter（`name`, `description`）
- [ ] 已在 `skills/README.md` 登记
- [ ] 原创 skill 已更新根 README「原创技能」表（如适用）
- [ ] 无版权书籍文件、无密钥
- [ ] references 为原创归纳，非大段复制

感谢贡献。

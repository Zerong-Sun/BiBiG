# 贡献指南

BiBiG 是 **skill 发布库**。每个 skill 对应一本参考书的专业归纳，不是全书转载。

## 新增 skill 流程

1. 阅读参考书，提炼可执行规则（工作流、清单、决策树）
2. 复制 [template/SKILL.md](template/SKILL.md) 到 `skills/<skill-name>/`
3. 确保 `name` 与文件夹名一致（小写连字符）
4. `description` 写清触发场景（Agent 靠它决定是否加载）
5. 长文档放 `references/`，`SKILL.md` 保持简洁（建议 <500 行）
6. 添加 `references/source.md` 标明参考书目
7. 添加 `LICENSE.txt` 与 `agents/openai.yaml`
8. 更新 [skills/README.md](skills/README.md) 和根 [README.md](README.md)

## 不要提交

- 受版权保护的 PDF / EPUB 全书
- 大段摘抄原文
- API 密钥、`.env`

## PR 检查清单

- [ ] `SKILL.md` frontmatter 含 `name`、`description`
- [ ] 文件夹名与 `name` 一致
- [ ] `references/source.md` 已注明来源
- [ ] 已在 `skills/README.md` 登记
- [ ] 本地用真实问题测试 skill 能被触发

## Demo

应用代码放在 `demo/`。Skill 变更若影响 Demo prompt，同步更新 `demo/bibig/backend/app/services/biography/prompts.py`。

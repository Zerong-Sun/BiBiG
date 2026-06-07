# BiBiG — Biography Agent Skills

[![skills.sh](https://skills.sh/b/Zerong-Sun/BiBiG)](https://skills.sh/Zerong-Sun/BiBiG)

从经典传记教材提炼的 **Agent Skills**，供 Cursor、Codex 等 AI 助手安装使用。

| Skill | 来源 | 用途 |
|-------|------|------|
| [how-to-do-biography](skills/how-to-do-biography/) | Nigel Hamilton, *How To Do Biography* (2008) | 实操：议程、受众、研究、结构、写作、出版 |
| [biography-vsi](skills/biography-vsi/) | Hermione Lee, *Biography: A Very Short Introduction* (2009) | 理论：定义、隐喻、十条规则、读者契约、评判 |
| [footsteps](skills/footsteps/) | Richard Holmes, *Footsteps* (1985) | 田野：足迹追踪、断桥隐喻、文本考古、追寻叙事 |

> 本仓库 **只发布 skill**。示例应用见 [`demo/bibig/`](demo/bibig/)。

## 仓库结构

```
BiBiG/
├── README.md
├── CONTRIBUTING.md
├── template/                 # 新 skill 模板
├── skills/
│   ├── how-to-do-biography/
│   ├── biography-vsi/
│   └── footsteps/
└── demo/
    └── bibig/                # 口述传记 Demo（参考实现）
```

## 安装

### skills.sh（推荐）

安装本仓库全部 skill：

```bash
npx skills add Zerong-Sun/BiBiG
```

安装单个 skill（若 CLI 支持路径参数）：

```bash
npx skills add Zerong-Sun/BiBiG --path skills/how-to-do-biography
npx skills add Zerong-Sun/BiBiG --path skills/biography-vsi
npx skills add Zerong-Sun/BiBiG --path skills/footsteps
```

安装后重启 Agent 会话以加载新 skill。

### Codex — skill-installer

在 Codex 对话中：

```
$skill-installer install https://github.com/Zerong-Sun/BiBiG/tree/main/skills/how-to-do-biography
```

```
$skill-installer install https://github.com/Zerong-Sun/BiBiG/tree/main/skills/biography-vsi
```

```
$skill-installer install https://github.com/Zerong-Sun/BiBiG/tree/main/skills/footsteps
```

或使用安装脚本（需网络）：

```bash
# 来自 openai/skills 的 skill-installer
python ~/.codex/skills/skill-installer/scripts/install-skill-from-github.py \
  --repo Zerong-Sun/BiBiG \
  --path skills/how-to-do-biography

python ~/.codex/skills/skill-installer/scripts/install-skill-from-github.py \
  --repo Zerong-Sun/BiBiG \
  --path skills/biography-vsi

python ~/.codex/skills/skill-installer/scripts/install-skill-from-github.py \
  --repo Zerong-Sun/BiBiG \
  --path skills/footsteps
```

安装到 `~/.codex/skills/<skill-name>`。完成后 **重启 Codex**。

### Cursor

**方式 A — 克隆本仓库**（已配置 `.cursor/skills` → `skills/`）：

```bash
git clone https://github.com/Zerong-Sun/BiBiG.git
cd BiBiG
# 在 Cursor 中打开此目录即可发现 skill
```

**方式 B — 复制到全局**：

```bash
git clone https://github.com/Zerong-Sun/BiBiG.git
cp -r BiBiG/skills/how-to-do-biography ~/.cursor/skills/
cp -r BiBiG/skills/biography-vsi ~/.cursor/skills/
cp -r BiBiG/skills/footsteps ~/.cursor/skills/
```

**方式 C — Remote Rule（GitHub）**：

1. Cursor Settings → Rules → Add Rule → Remote Rule (GitHub)
2. 填入：`https://github.com/Zerong-Sun/BiBiG`

### 手动安装（任意 Agent）

```bash
git clone https://github.com/Zerong-Sun/BiBiG.git
cp -r BiBiG/skills/<skill-name> ~/.cursor/skills/   # Cursor
cp -r BiBiG/skills/<skill-name> ~/.codex/skills/    # Codex
```

## 使用示例

```
用 how-to-do-biography 帮我规划一本企业家传记：议程、受众、章节结构
```

```
用 biography-vsi 评估这份传记大纲是否符合「十条规则」
```

```
用 footsteps 帮我规划重走史蒂文森塞文山脉路线，并设计平行日记与文本考古清单
```

三个 skill 可配合：`biography-vsi` 定框架与伦理，`how-to-do-biography` 推进成书结构，`footsteps` 负责田野追寻与地方证据。

## 创建新 skill

见 [CONTRIBUTING.md](CONTRIBUTING.md) 与 [template/SKILL.md](template/SKILL.md)。

## Demo 应用

[`demo/bibig/`](demo/bibig/) 展示如何将 `how-to-do-biography` 接入 LLM prompt，**非本仓库维护重点**。

## 许可

- Skill 文件：各目录内 [LICENSE.txt](skills/how-to-do-biography/LICENSE.txt)（MIT）
- 参考书目版权归原作者；skill 内容为原创归纳，非全书转载
- Demo 应用代码：MIT

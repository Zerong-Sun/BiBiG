"""Distilled prompt fragments from BiBiG biography skills.

Sources:
- biography-no-fiction — mandatory highest-priority mandate
- how-to-do-biography — Nigel Hamilton, *How To Do Biography* (2008)
- biography-vsi — Hermione Lee, *Biography: A Very Short Introduction* (2009)
- footsteps — Richard Holmes, *Footsteps: Adventures of a Romantic Biographer* (1985)
"""

from typing import List, TypedDict


class BiographySkill(TypedDict):
    id: str
    name: str
    source: str
    priority: str


MANDATE_SKILL: BiographySkill = {
    "id": "biography-no-fiction",
    "name": "Biography No-Fiction Mandate",
    "source": "BiBiG 硬性规范",
    "priority": "highest",
}

BIOGRAPHY_SKILLS: List[BiographySkill] = [
    {
        "id": "how-to-do-biography",
        "name": "How To Do Biography",
        "source": "Nigel Hamilton (2008)",
        "priority": "guidance",
    },
    {
        "id": "biography-vsi",
        "name": "Biography: A Very Short Introduction",
        "source": "Hermione Lee (2009)",
        "priority": "guidance",
    },
    {
        "id": "footsteps",
        "name": "Footsteps",
        "source": "Richard Holmes (1985)",
        "priority": "guidance",
    },
]


def get_mandate_skill() -> BiographySkill:
    return dict(MANDATE_SKILL)


def get_biography_skills() -> List[BiographySkill]:
    return list(BIOGRAPHY_SKILLS)


SKILL_ATTRIBUTION = (
    "以下指导性规范综合自三本传记经典："
    "Hamilton《How To Do Biography》（实操与结构）、"
    "Lee《Biography: A Very Short Introduction》（理论、伦理与读者契约）、"
    "Holmes《Footsteps》（足迹追踪与情感考古）。"
    "若与硬性规范冲突，以硬性规范为准。"
)

NO_FICTION_MANDATE = """## 【最高优先级】硬性规范（biography-no-fiction）

本规范优先于一切其他传记写作/采访指引。冲突时**必须**遵守本规范。

1. **禁止编造细节**：不得虚构对话、场景、人物、动机、内心活动或未出现的传记事实。
2. **问题只开启回忆**：追问应邀请传主陈述记忆，不得把未经证实的经历写成既定事实。
3. **时代背景必须检索**：问题若涉及历史或地域背景，只能使用下方「已检索时代背景」中的内容，不得凭模型常识填充。
4. **时代背景必须标明**：引用检索内容时，句首必须标注
   `【时代背景·已检索·来源：<来源名称>】`
   检索内容仅作回忆提示，**不代表**传主亲身经历。
5. **检索失败则中性提问**：若无可靠检索结果，只问中性的回忆问题，不附加未经证实的时代细节。
6. **写作同理**：整理传记正文时同样禁止编造；不确定处保留模糊或沉默。"""

# --- how-to-do-biography ---

HAMILTON_CORE = """## 传记写作原则（how-to-do-biography / Hamilton）

这是真实人物的非虚构传记，不是小说。

1. **不虚构**：不得编造对话、事件、动机或内心独白。口述未提及的内容不能当作事实写入。
2. **口述即证据**：口述、回忆、访谈是主要来源，应忠实整理，而非用想象填补空白。
3. **写出不确定性**：时间、地点、人名、因果关系若有模糊或矛盾，在文中如实保留或标注，不要强行抹平。
4. **细节要有意义**：只保留有助于理解人物性格、重要决定、人际关系或人生转折的细节，避免无关堆砌。
5. **有形状的故事**：优先写出有主题、有转折的人生叙事；时间线作骨架，而非逐年流水账（时间顺序风格除外）。
6. **谨慎处理敏感内容**：涉及在世亲属、隐私、健康、财务、指控等内容时，提高证据要求，避免不必要的伤害与揣测。"""

HAMILTON_INTERVIEW = """### how-to-do-biography — 采访与研究

- 优先追问**人生转折点**（改变方向、自我认知、关系、工作或声誉的时刻）
- 引导回忆**具体场景**：何时、何地、有谁、发生了什么、之后怎样
- 关注重要**人际关系**及其如何影响当事人的选择
- 主动寻找**时间线、地点、人名**等待核实或补充的信息
- 对已述内容不重复追问；对矛盾或模糊处可温和请当事人再确认
- 每章/每段材料应能回答一个**戏剧性问题**，而非仅罗列年份"""

HAMILTON_STRUCTURE = """### how-to-do-biography — 结构

- 以时间线作骨架，但按**主题与转折点**分章，避免机械逐年分章
- 每章应有明确的戏剧性问题或人生议题
- 开篇确立声音、赌注与中心问题；结尾回应全书问题，不假装解决整个人生"""

# --- biography-vsi ---

LEE_CORE = """## 传记理论原则（biography-vsi / Lee）

1. **真实与缺口**：追求真实，但承认空白与不可回答之处；重复流传的「常识」需审慎对待
2. **选择与塑形**：传记必然取舍；「无所遗漏」是理想而非实践
3. **读者契约**：对推测、局限与方法保持诚实；不借生动掩盖证据不足
4. **共情与距离**：在投入与抽离之间保持平衡，避免崇拜或报复性书写
5. **历史语境**：将个人置于时代与地域之中，但不以宏大叙事淹没个体
6. **身份呈现**：通过轶事、场景、习惯与决定呈现自我，避免单一心理学理论简化一生
7. **公共与私人**：评估私生活材料是否真正有助于理解其公共角色或人生意义"""

LEE_INTERVIEW = """### biography-vsi — 采访与素材

- 捕捉**可观察的微小细节**（习惯、举止、口头禅、衣着、日常动作）及其性格启示
- 重视**对话的语气与节奏**，不只记字面词句
- 区分**公共形象**与**私下自我**；温和探问面具背后的真实感受
- 对敏感话题评估：是否显著加深理解，而非猎奇
- 记录来源与视角（谁在说、何时说、与传主何种关系）"""

LEE_GAP_ANALYSIS = """### biography-vsi — 缺口识别

- 史料丰富期与**空白期**（空白本身可能是线索）
- 公共成就与私人生活之间的关联是否已建立
- 多方证词是否已交叉；是否存在「流传版本」待核实
- 时代背景、地域迁徙是否足以理解其选择"""

# --- footsteps (Holmes) ---

HOLMES_CORE = """## 足迹与情感原则（footsteps / Holmes）

1. **足迹追踪**：重视地点与空间记忆——传主曾见何景、身处何境，场景本身是证据
2. **情感考古**：在公开行动之下，发掘隐藏的情感叙事与动机
3. **多源验证**：同一事件从不同关系层（家人、朋友、同事、对手）追问，交叉核实
4. **批判距离**：共情但不神话；避免把一生读成单一悲剧或胜利模式
5. **叙事完整**：围绕贯穿一生的**核心矛盾或谜团**组织材料，不捏造也不遗漏关键转折"""

HOLMES_INTERVIEW = """### footsteps — 采访追问

- 追问**核心人生问题**：生命中反复出现的矛盾、执念或抉择是什么？
- 引导**感官场景**：当时的光线、声音、气味、空间尺度、触感，帮助还原现场
- 在关键地点或迁徙后追问：**内在旅程**——那次搬家、远行或职业变动背后的心理驱动
- 关注**身份符号**变化：称呼、角色、署名方式转变往往标记心理重构
- 对长途旅行、重大创伤后的行为，追问传主自己如何在私密记忆中描述动机
- 识别**情感潜台词**：奇怪的细节、反复出现的意象、公私叙述的差异
- 对文件/记忆**空白期**：请当事人回忆那段时间发生了什么、是否刻意回避"""

HOLMES_GAP_ANALYSIS = """### footsteps — 缺口识别

- 人生**核心问题**是否已有足够材料支撑
- **关键节点地点**的场景与感官细节是否缺失
- 重大决定时刻的**冲突双方**是否只听到一面
- **情感地图**：外部事件与内在感受的联结是否建立
- 公私叙述不一致之处、**空白期**、身份转变节点"""

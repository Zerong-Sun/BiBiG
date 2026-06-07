from app.services.biography.prompts import STYLE_PROMPTS

RECORDING_METHOD_PROMPTS = {
    "guided": "采用引导式问答，每次只问一个具体小问题，帮助回忆细节",
    "free": "采用自由叙述模式，不打断讲述，只在必要时温和追问",
    "timeline": "按时间线逐段记录，从童年到当下依次引导",
}

QUESTION_MODE_TEMPLATES = {
    "ai": None,
    "synopsis": "根据传记梗概生成针对性问题",
    "template": "使用人生阶段模板问题",
    "custom": "用户自定义问题",
}

TIMELINE_TEMPLATE_QUESTIONS = [
    "您小时候印象最深的一件事是什么？当时在哪里、有谁在场？",
    "求学或成长过程中，有没有哪一年或哪件事改变了您后来的路？",
    "您第一份工作是怎么开始的？还记得当时的地点和情景吗？",
    "婚姻或家庭生活中，哪段关系或哪件事对您影响最大？",
    "回顾一生，您最想留给后辈的一句话或一个故事是什么？",
]

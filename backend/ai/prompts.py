"""后端 Prompt 模板 — 与前端 src/ai/prompts.ts 保持一致"""


def buildPlanPrompt() -> str:
    """知识模块拆分 Prompt"""
    return """你是本课程的备考教练。
根据导入的课件资料，拆出可考的知识点模块。每个模块必须是真正的学科知识点。

核心规则：
- 模块名称必须是真正的知识点，不能是"第1天内容""每日任务"
- 尽量完整覆盖资料里的知识点
- 重要排名从1开始，数字越小越重要
- 难度只能写低、中、高
- 涉及硬件结构、寄存器、引脚、数据通路的知识点，diagram字段必须画出结构图
- 涉及流程、算法、状态转换的知识点，diagram字段必须画出流程图
- 涉及对比的知识点，diagram字段必须用表格

每个知识点必须包含以下字段：
1. title — 知识点名称（简洁有力）
2. estimated_minutes — 预计学习时间（分钟）
3. difficulty — 难度：低/中/高
4. importance_rank — 重要程度排名（1=最重要）
5. exam_points — 考察内容
6. practice — 练习方式
7. mnemonic — 速记口诀/助记法
8. key_formula — 关键公式/核心代码（没有留空）
9. visual_hint — 一句话描述这个图帮助理解什么
10. diagram — 实际的图表内容（Mermaid/ASCII图/表格，不适合画图填空字符串）

严格输出一个JSON数组，不要输出任何其他文字或markdown标记。
格式：
[
  {
    "title":"知识点名称",
    "estimated_minutes":30,
    "difficulty":"中",
    "importance_rank":1,
    "exam_points":"考察内容",
    "practice":"练习方式",
    "mnemonic":"速记口诀",
    "key_formula":"关键公式或代码",
    "visual_hint":"一句话描述图的作用",
    "diagram":"实际图表内容"
  }
]"""


def buildQuizPrompt(count: int = 20) -> str:
    """出题 Prompt"""
    return f"""你是本课程的出题专家。
根据以下课程内容，生成{count}道测试题。

题型配比：
- 选择题（4选1，概念辨析）
- 判断题（对错判断，需说明理由）
- 简答题（简要作答）
- 程序题（代码补全/调试/分析/编写）
- 论述题（综合论述）

难度与认知层级（布鲁姆分类学）：
- 基础题（60%）：记忆+理解层次
- 提高题（30%）：理解+应用+分析层次
- 综合题（10%）：分析+评价+创造层次

程序题要求：
- 代码补全：给出部分代码，填写关键部分
- 代码调试：给出有bug的代码，找出并修正错误
- 代码分析：给出代码，分析输出或执行过程
- 代码编写：给出需求，编写完整代码

要求：
1. 题目必须严格基于课程内容，不编造。
2. 每道题附详细解析。
3. 标注重要程度：🔴必考 / 🟡重点 / 🔵高频 / 🟢了解
4. Each question must be unique.
5. 选择题的选项应具有干扰性。

严格按JSON数组输出：
[
  {{"type":"choice","question":"题目","options":["A.选项1","B.选项2","C.选项3","D.选项4"],"answer":"A","explanation":"解析","importance":"🔴必考"}},
  {{"type":"judge","question":"题目","answer":"答案","explanation":"解析","importance":"🔴必考"}},
  {{"type":"short","question":"题目","answer":"答案","explanation":"解析","importance":"🔴必考"}},
  {{"type":"programming","question":"题目","answer":"完整代码","explanation":"解析","importance":"🔴必考"}},
  {{"type":"essay","question":"题目","answer":"答案","explanation":"解析","importance":"🔴必考"}}
]"""


def buildMockPrompt(config: dict) -> str:
    """模拟考 Prompt"""
    chapters = config.get("chapters", ["全部章节"])
    duration = config.get("duration", 120)
    question_types = config.get("questionTypes", {"choice": 10, "judge": 5, "short": 5, "essay": 2, "programming": 3})
    scoring = config.get("scoring", {"choice": 2, "judge": 2, "short": 10, "essay": 15, "programming": 10})

    total = sum(question_types.values())
    total_score = sum(question_types[k] * scoring.get(k, 0) for k in question_types)

    return f"""你是本课程的模考出题专家。严格根据导入资料出题，不编造资料里没有的内容。
考试范围：{'、'.join(chapters)}
总题量：{total}道 | 总分：{total_score}分 | 时长：{duration}分钟

题型与分值：
- 选择题 {question_types.get('choice', 0)} 道 × {scoring.get('choice', 2)} 分
- 判断题 {question_types.get('judge', 0)} 道 × {scoring.get('judge', 2)} 分
- 简答题 {question_types.get('short', 0)} 道 × {scoring.get('short', 10)} 分
- 程序题 {question_types.get('programming', 0)} 道 × {scoring.get('programming', 10)} 分
- 论述题 {question_types.get('essay', 0)} 道 × {scoring.get('essay', 15)} 分

输出格式（严格遵守）：
【试卷标题】
一、选择题
1. 题目
A. 选项
B. 选项
C. 选项
D. 选项
...

二、判断题
1. 题目（  ）
...

三、简答题
1. 题目
...

四、程序题
1. 题目描述
[代码块]
...

五、论述题
1. 题目
...

【答案与解析】
选择题：1.A(解析) 2.B(解析) ...
判断题：1.✓(解析) ...
简答题：每题单独列出答案+解析
程序题：每题单独列出完整答案代码+运行结果+解析
论述题：每题单独列出答案+评分要点+解析。"""

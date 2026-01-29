"""
行为面试官智能体

专注于软技能评估，包括团队协作、问题解决、领导力等。
"""

from typing import Any, Dict, List

from backend.core.agent import Agent

from .base_interviewer import (
    Answer,
    BaseInterviewerAgent,
    Evaluation,
    InterviewerType,
    Question,
    QuestionStrategy,
)


class BehavioralInterviewerAgent(BaseInterviewerAgent):
    """
    行为面试官智能体

    负责评估候选人的软技能和行为特质，包括：
    - 团队协作能力
    - 问题解决能力
    - 领导力和影响力
    - 抗压能力
    - 沟通表达能力
    - 文化契合度
    """

    def __init__(
        self,
        agent: Agent,
        name: str = "行为面试官",
        weight: float = 1.0,
        question_strategy: QuestionStrategy = QuestionStrategy.ADAPTIVE,
        company_values: List[str] = None,
    ):
        super().__init__(
            agent=agent,
            interviewer_type=InterviewerType.BEHAVIORAL,
            name=name,
            persona="资深HR专家和组织行为学顾问，擅长通过行为面试法评估候选人的软技能和文化契合度",
            weight=weight,
            question_strategy=question_strategy,
        )
        self.company_values = company_values or [
            "诚信",
            "创新",
            "协作",
            "卓越",
        ]
        self.evaluation_dimensions = [
            "teamwork",
            "problem_solving",
            "leadership",
            "communication",
            "adaptability",
            "cultural_fit",
        ]
        self.star_method_prompt = """
使用STAR法则评估回答：
- Situation（情境）：候选人描述的背景是否清晰
- Task（任务）：面临的挑战和责任是否明确
- Action（行动）：采取的具体行动和决策过程
- Result（结果）：取得的成果和反思总结
"""

    def get_system_prompt(self) -> str:
        """获取系统提示词"""
        values_str = ", ".join(self.company_values)

        return f"""你是一位经验丰富的行为面试官，专注于评估候选人的软技能和行为特质。

## 你的背景
- 15年人力资源管理经验
- 组织行为学专家
- 擅长行为事件访谈法（BEI）
- 面试风格：亲和、洞察力强、善于挖掘深层动机

## 评估维度
1. **团队协作**：与他人合作的能力，处理冲突的方式
2. **问题解决**：面对挑战的分析和解决能力
3. **领导力**：影响他人、推动结果的能力
4. **沟通表达**：清晰表达、有效倾听的能力
5. **适应能力**：面对变化的学习和适应能力
6. **文化契合**：与公司价值观的匹配程度

## 公司价值观
{values_str}

## 提问策略
- 使用STAR法则：情境-任务-行动-结果
- 追问细节：深入挖掘具体行为和思考过程
- 压力测试：在关键时刻观察反应
- 情景模拟：设置假设场景观察应对

## 评分标准（0-100分）
- 90-100：卓越，具有出色的软技能和领导潜质
- 80-89：优秀，具备良好的协作和沟通能力
- 70-79：良好，符合一般要求
- 60-69：及格，需要进一步发展
- <60：不及格，存在明显的软技能短板

请始终保持尊重、开放、鼓励的态度，让候选人能够真实展现自己。"""

    async def generate_question(
        self,
        candidate_profile: Dict[str, Any],
        interview_history: List[Dict[str, Any]],
    ) -> Question:
        """生成行为面试问题"""
        experience = candidate_profile.get("experience_years", 0)
        target_role = candidate_profile.get("target_position", "")
        previous_roles = candidate_profile.get("previous_roles", [])

        # 确定当前评估维度
        asked_dimensions = [h.get("dimension", "") for h in interview_history]
        remaining_dimensions = [
            d for d in self.evaluation_dimensions if d not in asked_dimensions
        ]

        target_dimension = (
            remaining_dimensions[0] if remaining_dimensions else "cultural_fit"
        )

        # 根据维度选择问题类型
        question_types = {
            "teamwork": "团队合作经历",
            "problem_solving": "挑战性问题的解决",
            "leadership": "领导或影响他人的经历",
            "communication": "沟通冲突处理",
            "adaptability": "适应变化的经历",
            "cultural_fit": "价值观契合场景",
        }

        prompt = f"""
请为行为面试生成一个{question_types.get(target_dimension, "行为")}问题。

候选人信息：
- 工作经验：{experience}年
- 目标职位：{target_role}
- 过往职位：{", ".join(previous_roles) if previous_roles else "未提供"}
- 当前面试阶段：{self.state.phase.value}
- 评估维度：{target_dimension}

已评估维度：{", ".join(asked_dimensions) if asked_dimensions else "无"}

要求：
1. 使用STAR法则设计问题
2. 鼓励候选人分享具体经历
3. 问题应该开放，允许深入探讨
4. 避免引导性过强的问题
5. 预期回答时长：3-5分钟

请按以下格式输出：
问题内容：[具体问题]
评估维度：{target_dimension}
追问提示：[2-3个可能的追问方向]
"""

        response = await self.agent.chat(prompt)

        # 解析响应
        question_content = self._extract_question(response)
        follow_ups = self._extract_follow_ups(response)

        question = Question(
            content=question_content,
            type="behavioral",
            difficulty=3,
            category=target_dimension,
            expected_duration=300,
            follow_up_questions=follow_ups,
            evaluation_criteria=[
                "具体性",
                "逻辑性",
                "反思深度",
                "与价值观契合度",
            ],
        )

        self.question_pool.append(question)
        return question

    async def evaluate_answer(
        self,
        question: Question,
        answer: Answer,
    ) -> Evaluation:
        """评估行为回答"""
        prompt = f"""
请使用STAR法则评估以下行为面试回答。

问题：{question.content}
评估维度：{question.category}

候选人回答：
{answer.content}

{self.star_method_prompt}

请按以下格式输出评估结果：

分数：[0-100的数字]
维度：[teamwork/problem_solving/leadership/communication/adaptability/cultural_fit]
STAR分析：
- 情境（S）：[评价]
- 任务（T）：[评价]
- 行动（A）：[评价]
- 结果（R）：[评价]

反馈：[详细反馈]
优点：[列出主要优点]
不足：[列出需要改进的地方]
置信度：[0-1之间的数字]
"""

        response = await self.agent.chat(prompt)

        # 解析评估结果
        score = self._extract_score(response)
        dimension = self._extract_dimension(response)
        feedback = self._extract_feedback(response)
        strengths = self._extract_strengths(response)
        weaknesses = self._extract_weaknesses(response)
        confidence = self._extract_confidence(response)

        return Evaluation(
            question_id=question.id,
            score=score,
            dimension=dimension,
            feedback=feedback,
            strengths=strengths,
            weaknesses=weaknesses,
            confidence=confidence,
        )

    async def generate_stress_question(
        self,
        previous_answer: Answer,
        previous_evaluation: Evaluation,
    ) -> Question:
        """生成压力测试问题"""
        prompt = f"""
基于候选人之前的回答，生成一个压力测试问题。

候选人之前的回答：
{previous_answer.content}

评估结果：{previous_evaluation.feedback}

请生成一个能够测试候选人在压力下反应的问题。问题应该：
1. 基于之前的回答内容
2. 制造适度的认知冲突或挑战
3. 观察候选人的情绪管理和应变能力
4. 保持专业，不人身攻击

只输出问题本身。
"""

        response = await self.agent.chat(prompt)

        return Question(
            content=response.strip(),
            type="stress_test",
            difficulty=4,
            category="pressure_handling",
            expected_duration=180,
        )

    def _extract_question(self, response: str) -> str:
        """从响应中提取问题"""
        lines = response.split("\n")
        for line in lines:
            if "问题内容：" in line or "问题：" in line:
                return line.split("：", 1)[1].strip()
        return response.strip()

    def _extract_follow_ups(self, response: str) -> List[str]:
        """从响应中提取追问提示"""
        follow_ups = []
        lines = response.split("\n")
        in_follow_ups = False
        for line in lines:
            if "追问提示：" in line or "追问：" in line:
                in_follow_ups = True
                continue
            if in_follow_ups and line.strip():
                if line.strip().startswith("-") or line.strip().startswith("•"):
                    follow_ups.append(line.strip()[1:].strip())
        return follow_ups[:3]

    def _extract_score(self, response: str) -> float:
        """从响应中提取分数"""
        import re

        match = re.search(r"分数[：:]\s*(\d+)", response)
        if match:
            return float(match.group(1))
        return 70.0

    def _extract_dimension(self, response: str) -> str:
        """从响应中提取维度"""
        lines = response.split("\n")
        for line in lines:
            if "维度：" in line:
                dimension = line.split("：", 1)[1].strip()
                if dimension in self.evaluation_dimensions:
                    return dimension
        return "cultural_fit"

    def _extract_feedback(self, response: str) -> str:
        """从响应中提取反馈"""
        lines = response.split("\n")
        for i, line in enumerate(lines):
            if "反馈：" in line:
                feedback_lines = []
                for j in range(i + 1, len(lines)):
                    if lines[j].strip() and not any(
                        keyword in lines[j] for keyword in ["优点", "不足", "置信度"]
                    ):
                        feedback_lines.append(lines[j].strip())
                    else:
                        break
                return " ".join(feedback_lines)
        return "需要进一步评估"

    def _extract_strengths(self, response: str) -> List[str]:
        """从响应中提取优点"""
        strengths = []
        lines = response.split("\n")
        in_strengths = False
        for line in lines:
            if "优点：" in line or "优势：" in line:
                in_strengths = True
                continue
            if in_strengths:
                if line.strip().startswith("-") or line.strip().startswith("•"):
                    strengths.append(line.strip()[1:].strip())
                elif any(keyword in line for keyword in ["不足", "缺点", "改进"]):
                    break
        return strengths or ["回答展现了积极的态度"]

    def _extract_weaknesses(self, response: str) -> List[str]:
        """从响应中提取不足"""
        weaknesses = []
        lines = response.split("\n")
        in_weaknesses = False
        for line in lines:
            if "不足：" in line or "缺点：" in line or "改进：" in line:
                in_weaknesses = True
                continue
            if in_weaknesses:
                if line.strip().startswith("-") or line.strip().startswith("•"):
                    weaknesses.append(line.strip()[1:].strip())
        return weaknesses or ["可以分享更多具体细节"]

    def _extract_confidence(self, response: str) -> float:
        """从响应中提取置信度"""
        import re

        match = re.search(r"置信度[：:]\s*(0?\.\d+|1\.0|1)", response)
        if match:
            return float(match.group(1))
        return 0.8

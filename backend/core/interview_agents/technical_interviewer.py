"""
技术面试官智能体

专注于技术能力评估，包括编程语言、算法、系统设计等。
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


class TechnicalInterviewerAgent(BaseInterviewerAgent):
    """
    技术面试官智能体

    负责评估候选人的技术能力，包括：
    - 编程语言和框架掌握
    - 算法和数据结构
    - 系统设计和架构
    - 代码质量和最佳实践
    - 问题解决能力
    """

    def __init__(
        self,
        agent: Agent,
        name: str = "技术面试官",
        weight: float = 1.2,  # 技术面试权重较高
        question_strategy: QuestionStrategy = QuestionStrategy.ADAPTIVE,
        tech_stack: List[str] = None,
    ):
        super().__init__(
            agent=agent,
            interviewer_type=InterviewerType.TECHNICAL,
            name=name,
            persona="资深技术专家，拥有10年以上软件开发经验，擅长深入挖掘候选人的技术深度和广度",
            weight=weight,
            question_strategy=question_strategy,
        )
        self.tech_stack = tech_stack or []
        self.evaluation_dimensions = [
            "technical_depth",
            "coding_ability",
            "problem_solving",
            "system_design",
            "knowledge_breadth",
        ]

    def get_system_prompt(self) -> str:
        """获取系统提示词"""
        tech_stack_str = ", ".join(self.tech_stack) if self.tech_stack else "通用技术栈"

        return f"""你是一位经验丰富的技术面试官，专注于评估候选人的技术能力。

## 你的背景
- 10年以上软件开发经验
- 曾任职于知名科技公司，参与过大型系统架构设计
- 擅长{tech_stack_str}
- 面试风格：专业、深入、注重实践

## 评估维度
1. **技术深度**：对核心概念的深入理解
2. **编码能力**：代码质量、规范性、效率
3. **问题解决**：分析问题、提出解决方案的能力
4. **系统设计**：架构设计、可扩展性、性能考虑
5. **知识广度**：技术视野和跨领域知识

## 提问策略
- 由浅入深：从基础概念开始，逐步深入
- 结合实际：使用真实场景和案例
- 代码实操：必要时要求编写或分析代码
- 追问细节：对模糊回答进行深入追问

## 评分标准（0-100分）
- 90-100：卓越，技术专家水平
- 80-89：优秀，高级工程师水平
- 70-79：良好，符合预期
- 60-69：及格，有提升空间
- <60：不及格，基础薄弱

请始终保持专业、客观、建设性的态度。"""

    async def generate_question(
        self,
        candidate_profile: Dict[str, Any],
        interview_history: List[Dict[str, Any]],
    ) -> Question:
        """生成技术面试问题"""
        skills = candidate_profile.get("skills", [])
        experience_level = candidate_profile.get("experience_level", "mid")
        target_position = candidate_profile.get("target_position", "")

        # 根据面试阶段调整难度
        difficulty = self._calculate_difficulty(experience_level)

        # 根据已有问题避免重复
        asked_categories = [h.get("category", "") for h in interview_history]

        prompt = f"""
请为技术面试生成一个问题。

候选人信息：
- 技能：{", ".join(skills)}
- 经验水平：{experience_level}
- 目标职位：{target_position}
- 当前面试阶段：{self.state.phase.value}

已提问类别：{", ".join(asked_categories) if asked_categories else "无"}
技术栈：{", ".join(self.tech_stack) if self.tech_stack else "通用"}

要求：
1. 难度等级：{difficulty}/5
2. 问题类型：{"编码题" if self.state.phase.value == "main" else "概念理解或场景设计"}
3. 避免与已提问类别重复
4. 问题应该具体、可评估
5. 预期回答时长：3-5分钟

请按以下格式输出：
问题内容：[具体问题]
类别：[技术类别，如算法/系统设计/编程语言]
评估要点：[列出3-5个评估要点]
"""

        response = await self.agent.chat(prompt)

        # 解析响应
        question_content = self._extract_question(response)
        category = self._extract_category(response)
        evaluation_criteria = self._extract_evaluation_criteria(response)

        question = Question(
            content=question_content,
            type="technical",
            difficulty=difficulty,
            category=category,
            expected_duration=300,
            evaluation_criteria=evaluation_criteria,
        )

        self.question_pool.append(question)
        return question

    async def evaluate_answer(
        self,
        question: Question,
        answer: Answer,
    ) -> Evaluation:
        """评估技术回答"""
        prompt = f"""
请评估以下技术面试回答。

问题：{question.content}
问题类别：{question.category}
难度：{question.difficulty}/5

候选人回答：
{answer.content}

评估要点：
{"".join(f"- {criterion}" for criterion in question.evaluation_criteria)}

请按以下格式输出评估结果：

分数：[0-100的数字]
维度：[technical_depth/coding_ability/problem_solving/system_design/knowledge_breadth]
反馈：[详细反馈，包括优点和改进建议]
优点：[列出主要优点]
不足：[列出需要改进的地方]
置信度：[0-1之间的数字，表示评估置信度]
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

    def _calculate_difficulty(self, experience_level: str) -> int:
        """根据经验和阶段计算难度"""
        base_difficulty = {
            "junior": 2,
            "mid": 3,
            "senior": 4,
            "expert": 5,
        }.get(experience_level, 3)

        # 根据面试阶段调整
        phase_adjustment = {
            "warm_up": -1,
            "main": 0,
            "deep_dive": 1,
            "wrap_up": 0,
        }.get(self.state.phase.value, 0)

        return max(1, min(5, base_difficulty + phase_adjustment))

    def _extract_question(self, response: str) -> str:
        """从响应中提取问题"""
        lines = response.split("\n")
        for line in lines:
            if "问题内容：" in line or "问题：" in line:
                return line.split("：", 1)[1].strip()
        return response.strip()

    def _extract_category(self, response: str) -> str:
        """从响应中提取类别"""
        lines = response.split("\n")
        for line in lines:
            if "类别：" in line:
                return line.split("：", 1)[1].strip()
        return "general"

    def _extract_evaluation_criteria(self, response: str) -> List[str]:
        """从响应中提取评估要点"""
        criteria = []
        lines = response.split("\n")
        in_criteria = False
        for line in lines:
            if "评估要点：" in line:
                in_criteria = True
                continue
            if in_criteria and line.strip():
                if line.startswith("-") or line.startswith("•"):
                    criteria.append(line[1:].strip())
                elif "：" in line and len(criteria) > 0:
                    break
        return criteria or ["技术准确性", "回答完整性", "思路清晰度"]

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
        return "technical_depth"

    def _extract_feedback(self, response: str) -> str:
        """从响应中提取反馈"""
        lines = response.split("\n")
        for i, line in enumerate(lines):
            if "反馈：" in line:
                feedback_lines = []
                for j in range(i + 1, len(lines)):
                    if lines[j].strip() and not lines[j].startswith("优点"):
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
                elif "不足" in line or "缺点" in line:
                    break
        return strengths or ["回答基本符合要求"]

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
        return weaknesses or ["可以继续深入"]

    def _extract_confidence(self, response: str) -> float:
        """从响应中提取置信度"""
        import re
        match = re.search(r"置信度[：:]\s*(0?\.\d+|1\.0|1)", response)
        if match:
            return float(match.group(1))
        return 0.8

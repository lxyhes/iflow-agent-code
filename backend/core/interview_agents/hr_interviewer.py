"""
HR面试官智能体

专注于HR相关评估，包括职业规划、薪资期望、文化契合等。
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


class HRInterviewerAgent(BaseInterviewerAgent):
    """
    HR面试官智能体

    负责评估候选人的HR相关因素，包括：
    - 职业规划和目标
    - 薪资期望和谈判
    - 公司文化契合度
    - 工作态度和价值观
    - 稳定性和长期发展
    - 入职时间和条件
    """

    def __init__(
        self,
        agent: Agent,
        name: str = "HR面试官",
        weight: float = 0.8,
        question_strategy: QuestionStrategy = QuestionStrategy.SEQUENTIAL,
        company_info: Dict[str, Any] = None,
        position_info: Dict[str, Any] = None,
    ):
        super().__init__(
            agent=agent,
            interviewer_type=InterviewerType.HR,
            name=name,
            persona="资深HRBP，擅长人才评估和职业发展咨询，能够准确判断候选人与岗位的匹配度",
            weight=weight,
            question_strategy=question_strategy,
        )
        self.company_info = company_info or {
            "name": "我们公司",
            "culture": "开放、创新、协作",
            "benefits": ["有竞争力的薪资", "弹性工作制", "职业发展机会"],
        }
        self.position_info = position_info or {
            "title": "软件工程师",
            "level": "中级",
            "salary_range": "面议",
        }
        self.evaluation_dimensions = [
            "career_alignment",
            "cultural_fit",
            "motivation",
            "stability",
            "communication",
        ]
        self.salary_discussed = False
        self.availability_discussed = False

    def get_system_prompt(self) -> str:
        """获取系统提示词"""
        company_name = self.company_info.get("name", "我们公司")
        culture = self.company_info.get("culture", "开放、创新")
        position_title = self.position_info.get("title", "目标职位")

        return f"""你是一位经验丰富的HR面试官，代表{company_name}进行面试。

## 你的背景
- 8年以上人力资源管理经验
- 擅长人才评估和职业发展咨询
- 熟悉科技行业人才市场
- 面试风格：亲和、专业、善于倾听

## 公司信息
- 公司名称：{company_name}
- 公司文化：{culture}
- 福利待遇：{", ".join(self.company_info.get("benefits", []))}

## 职位信息
- 职位名称：{position_title}
- 级别：{self.position_info.get("level", "中级")}
- 薪资范围：{self.position_info.get("salary_range", "面议")}

## 评估维度
1. **职业契合**：职业目标与岗位发展路径的匹配
2. **文化契合**：价值观和工作方式与公司文化的匹配
3. **求职动机**：加入公司的动机和期望
4. **稳定性**：职业稳定性和长期发展意愿
5. **沟通能力**：表达清晰度和人际交往能力

## 提问策略
- 开放式提问：鼓励候选人自由表达
- 倾听为主：让候选人多说，HR多听
- 适时澄清：对模糊信息及时确认
- 期望管理：清晰传达公司期望和实际情况

## 评分标准（0-100分）
- 90-100：卓越，完美匹配，强烈推荐
- 80-89：优秀，高度匹配，推荐录用
- 70-79：良好，基本匹配，可以考虑
- 60-69：及格，部分匹配，需要权衡
- <60：不及格，匹配度低，不建议录用

## 注意事项
- 保持中立，不做过度承诺
- 尊重候选人隐私
- 避免歧视性问题
- 记录关键信息供后续决策

请始终保持专业、友善、尊重的态度。"""

    async def generate_question(
        self,
        candidate_profile: Dict[str, Any],
        interview_history: List[Dict[str, Any]],
    ) -> Question:
        """生成HR面试问题"""
        experience_years = candidate_profile.get("experience_years", 0)
        current_salary = candidate_profile.get("current_salary", "")
        expected_salary = candidate_profile.get("expected_salary", "")
        notice_period = candidate_profile.get("notice_period", "")

        # 确定当前阶段应该问什么
        question_category = self._determine_question_category(interview_history)

        prompts_by_category = {
            "career": f"""
请生成一个关于职业规划的问题。

候选人背景：
- 工作经验：{experience_years}年
- 目标职位：{self.position_info.get("title", "")}

要求：
1. 了解候选人的长期职业目标
2. 探索候选人对该职位的期望
3. 评估职业发展路径的匹配度
4. 问题应该开放、友好

请直接输出问题内容。
""",
            "motivation": f"""
请生成一个关于求职动机的问题。

公司：{self.company_info.get("name", "")}
职位：{self.position_info.get("title", "")}

要求：
1. 了解候选人为什么对我们公司感兴趣
2. 探索候选人的核心诉求
3. 评估动机与公司提供的匹配度
4. 问题应该真诚、不施压

请直接输出问题内容。
""",
            "salary": f"""
请生成一个关于薪资期望的问题。

候选人当前薪资：{current_salary or "未提供"}
候选人期望薪资：{expected_salary or "未提供"}
职位薪资范围：{self.position_info.get("salary_range", "面议")}

要求：
1. 了解候选人的薪资期望
2. 探索薪资在决策中的权重
3. 为后续谈判收集信息
4. 保持开放，不做承诺

请直接输出问题内容。
""",
            "availability": f"""
请生成一个关于入职时间的问题。

候选人离职通知期：{notice_period or "未提供"}

要求：
1. 了解候选人的可用时间
2. 确认是否有其他offer在考虑
3. 评估入职的紧迫性
4. 保持灵活和理解

请直接输出问题内容。
""",
            "cultural": f"""
请生成一个关于文化契合的问题。

公司文化：{self.company_info.get("culture", "")}

要求：
1. 了解候选人的工作风格偏好
2. 评估与公司文化的匹配度
3. 探索候选人的价值观
4. 问题应该情境化

请直接输出问题内容。
""",
        }

        prompt = prompts_by_category.get(
            question_category,
            "请生成一个通用的HR面试问题，了解候选人的基本情况。",
        )

        response = await self.agent.chat(prompt)

        question = Question(
            content=response.strip(),
            type="hr",
            difficulty=2,
            category=question_category,
            expected_duration=180,
            evaluation_criteria=[
                "回答真实性",
                "期望合理性",
                "匹配度",
                "沟通态度",
            ],
        )

        self.question_pool.append(question)

        # 更新状态
        if question_category == "salary":
            self.salary_discussed = True
        elif question_category == "availability":
            self.availability_discussed = True

        return question

    async def evaluate_answer(
        self,
        question: Question,
        answer: Answer,
    ) -> Evaluation:
        """评估HR回答"""
        category_guidance = {
            "career": "评估职业目标与岗位发展路径的匹配度",
            "motivation": "评估求职动机的合理性和真诚度",
            "salary": "评估薪资期望的合理性和谈判空间",
            "availability": "评估入职时间的可行性和灵活性",
            "cultural": "评估价值观和工作风格的契合度",
        }

        prompt = f"""
请评估以下HR面试回答。

问题：{question.content}
问题类别：{question.category}
评估指导：{category_guidance.get(question.category, "综合评估")}

候选人回答：
{answer.content}

请按以下格式输出评估结果：

分数：[0-100的数字]
维度：[career_alignment/cultural_fit/motivation/stability/communication]
反馈：[详细反馈]
优点：[列出主要优点]
不足：[列出需要关注的地方]
风险提示：[如有，列出潜在风险]
置信度：[0-1之间的数字]

注意：HR评估更注重匹配度和可行性，而非技术能力。
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

    async def generate_offer_recommendation(
        self,
        all_evaluations: List[Evaluation],
        candidate_profile: Dict[str, Any],
    ) -> Dict[str, Any]:
        """生成录用建议"""
        avg_score = sum(e.score for e in all_evaluations) / len(all_evaluations) if all_evaluations else 0

        prompt = f"""
基于以下信息，生成录用建议。

候选人平均评分：{avg_score:.1f}/100
候选人期望薪资：{candidate_profile.get("expected_salary", "未提供")}
候选人离职通知期：{candidate_profile.get("notice_period", "未提供")}

各维度评估：
"""
        for eval in all_evaluations:
            prompt += f"- {eval.dimension}: {eval.score}分 - {eval.feedback[:50]}...\n"

        prompt += """
请按以下格式输出录用建议：

建议：[强烈推荐/推荐/考虑/不推荐]
薪资建议：[建议薪资范围]
级别建议：[建议职级]
入职时间：[建议入职时间]
关键优势：[列出主要优势]
关注事项：[列出需要关注的事项]
备注：[其他建议]
"""

        response = await self.agent.chat(prompt)

        return {
            "recommendation": self._extract_recommendation(response),
            "salary_suggestion": self._extract_salary_suggestion(response),
            "level_suggestion": self._extract_level_suggestion(response),
            "notes": response,
        }

    def _determine_question_category(self, interview_history: List[Dict[str, Any]]) -> str:
        """确定下一个问题类别"""
        asked_categories = [h.get("category", "") for h in interview_history]

        # 按优先级顺序
        if "career" not in asked_categories:
            return "career"
        if "motivation" not in asked_categories:
            return "motivation"
        if "cultural" not in asked_categories:
            return "cultural"
        if not self.salary_discussed:
            return "salary"
        if not self.availability_discussed:
            return "availability"

        # 如果都问过了，根据面试阶段决定
        if self.state.phase == InterviewPhase.WRAP_UP:
            return "availability"
        return "cultural"

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
                        keyword in lines[j] for keyword in ["优点", "不足", "风险", "置信度"]
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
            if "优点：" in line or "优势：" in line or "关键优势：" in line:
                in_strengths = True
                continue
            if in_strengths:
                if line.strip().startswith("-") or line.strip().startswith("•"):
                    strengths.append(line.strip()[1:].strip())
                elif any(keyword in line for keyword in ["不足", "缺点", "关注", "风险"]):
                    break
        return strengths or ["回答积极正面"]

    def _extract_weaknesses(self, response: str) -> List[str]:
        """从响应中提取不足"""
        weaknesses = []
        lines = response.split("\n")
        in_weaknesses = False
        for line in lines:
            if "不足：" in line or "缺点：" in line or "关注事项：" in line:
                in_weaknesses = True
                continue
            if in_weaknesses:
                if line.strip().startswith("-") or line.strip().startswith("•"):
                    weaknesses.append(line.strip()[1:].strip())
        return weaknesses or ["可以进一步了解"]

    def _extract_confidence(self, response: str) -> float:
        """从响应中提取置信度"""
        import re

        match = re.search(r"置信度[：:]\s*(0?\.\d+|1\.0|1)", response)
        if match:
            return float(match.group(1))
        return 0.8

    def _extract_recommendation(self, response: str) -> str:
        """从响应中提取建议"""
        lines = response.split("\n")
        for line in lines:
            if "建议：" in line and "薪资" not in line and "级别" not in line:
                return line.split("：", 1)[1].strip()
        return "考虑"

    def _extract_salary_suggestion(self, response: str) -> str:
        """从响应中提取薪资建议"""
        lines = response.split("\n")
        for line in lines:
            if "薪资建议：" in line:
                return line.split("：", 1)[1].strip()
        return "面议"

    def _extract_level_suggestion(self, response: str) -> str:
        """从响应中提取级别建议"""
        lines = response.split("\n")
        for line in lines:
            if "级别建议：" in line:
                return line.split("：", 1)[1].strip()
        return self.position_info.get("level", "中级")

    def reset(self):
        """重置HR面试官状态"""
        super().reset()
        self.salary_discussed = False
        self.availability_discussed = False

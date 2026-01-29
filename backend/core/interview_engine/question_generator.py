"""
问题生成器

根据候选人画像和面试阶段生成个性化问题。
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class QuestionTemplate:
    """问题模板"""
    id: str = ""
    content: str = ""
    category: str = ""
    difficulty: int = 1
    target_skills: List[str] = field(default_factory=list)
    follow_up_hints: List[str] = field(default_factory=list)


class QuestionGenerator:
    """
    问题生成器

    根据候选人信息和面试上下文生成个性化问题。
    """

    # 预定义问题模板库
    QUESTION_TEMPLATES = {
        "technical": [
            QuestionTemplate(
                id="tech_001",
                content="请介绍一下你在{skill}方面的经验，并分享一个具体的项目案例。",
                category="technical_depth",
                difficulty=2,
                target_skills=["Python", "Java", "JavaScript"],
            ),
            QuestionTemplate(
                id="tech_002",
                content="在{skill}中，你是如何处理{topic}的？",
                category="technical_depth",
                difficulty=3,
                target_skills=["React", "Vue", "Angular"],
            ),
            QuestionTemplate(
                id="tech_003",
                content="请设计一个{system}的系统架构，并说明你的设计思路。",
                category="system_design",
                difficulty=4,
                target_skills=["system_design", "architecture"],
            ),
        ],
        "behavioral": [
            QuestionTemplate(
                id="beh_001",
                content="请分享一次你与团队成员产生分歧的经历，你是如何处理的？",
                category="teamwork",
                difficulty=2,
                target_skills=["communication", "conflict_resolution"],
            ),
            QuestionTemplate(
                id="beh_002",
                content="描述一个你面临巨大压力的项目，你是如何应对的？",
                category="adaptability",
                difficulty=3,
                target_skills=["stress_management", "problem_solving"],
            ),
            QuestionTemplate(
                id="beh_003",
                content="请举例说明你是如何带领团队完成一个挑战性目标的。",
                category="leadership",
                difficulty=3,
                target_skills=["leadership", "team_management"],
            ),
        ],
        "hr": [
            QuestionTemplate(
                id="hr_001",
                content="请介绍一下你的职业规划，以及这个职位如何符合你的职业目标？",
                category="career_alignment",
                difficulty=1,
                target_skills=["career_planning"],
            ),
            QuestionTemplate(
                id="hr_002",
                content="你为什么对我们公司感兴趣？",
                category="motivation",
                difficulty=1,
                target_skills=["motivation"],
            ),
            QuestionTemplate(
                id="hr_003",
                content="你的期望薪资是多少？",
                category="salary",
                difficulty=1,
                target_skills=["negotiation"],
            ),
        ],
    }

    def __init__(self):
        self.used_questions: set = set()
        self.candidate_skills: List[str] = []
        self.experience_level: str = "mid"

    def set_candidate_context(
        self,
        skills: List[str],
        experience_level: str = "mid",
    ):
        """设置候选人上下文"""
        self.candidate_skills = skills
        self.experience_level = experience_level

    def generate_question(
        self,
        category: str,
        difficulty: Optional[int] = None,
        exclude_used: bool = True,
    ) -> Optional[QuestionTemplate]:
        """
        生成问题

        Args:
            category: 问题类别（technical/behavioral/hr）
            difficulty: 难度等级
            exclude_used: 是否排除已使用的问题

        Returns:
            问题模板
        """
        templates = self.QUESTION_TEMPLATES.get(category, [])
        if not templates:
            return None

        # 过滤已使用的问题
        if exclude_used:
            templates = [t for t in templates if t.id not in self.used_questions]

        # 按难度过滤
        if difficulty is not None:
            templates = [t for t in templates if t.difficulty == difficulty]

        # 按技能匹配度排序
        if self.candidate_skills:
            templates = sorted(
                templates,
                key=lambda t: len(set(t.target_skills) & set(self.candidate_skills)),
                reverse=True,
            )

        if not templates:
            return None

        # 选择第一个匹配的问题
        selected = templates[0]
        self.used_questions.add(selected.id)

        # 填充变量
        content = self._fill_template(selected)

        return QuestionTemplate(
            id=selected.id,
            content=content,
            category=selected.category,
            difficulty=selected.difficulty,
            target_skills=selected.target_skills,
            follow_up_hints=selected.follow_up_hints,
        )

    def generate_follow_up(
        self,
        previous_question: QuestionTemplate,
        answer_quality: str = "good",
    ) -> Optional[QuestionTemplate]:
        """
        生成追问问题

        Args:
            previous_question: 上一个问题
            answer_quality: 回答质量（good/fair/poor）

        Returns:
            追问问题模板
        """
        if answer_quality == "good":
            # 深入挖掘
            content = f"你刚才提到了{previous_question.category}，能否详细说明一下具体的实现细节？"
        elif answer_quality == "fair":
            # 澄清和扩展
            content = f"关于{previous_question.category}，你能否举一个更具体的例子？"
        else:
            # 简化和引导
            content = f"让我们换个角度，你能简单描述一下你对{previous_question.category}的理解吗？"

        return QuestionTemplate(
            id=f"follow_up_{previous_question.id}",
            content=content,
            category=previous_question.category,
            difficulty=previous_question.difficulty,
        )

    def _fill_template(self, template: QuestionTemplate) -> str:
        """填充模板变量"""
        content = template.content

        # 填充技能变量
        if "{skill}" in content and self.candidate_skills:
            # 选择最相关的技能
            relevant_skills = [
                s for s in self.candidate_skills
                if s in template.target_skills
            ]
            skill = relevant_skills[0] if relevant_skills else self.candidate_skills[0]
            content = content.replace("{skill}", skill)

        # 填充主题变量
        if "{topic}" in content:
            topics = {
                "React": "状态管理",
                "Vue": "组件通信",
                "Python": "性能优化",
                "Java": "并发处理",
            }
            topic = topics.get(self.candidate_skills[0] if self.candidate_skills else "", "性能优化")
            content = content.replace("{topic}", topic)

        # 填充系统变量
        if "{system}" in content:
            systems = ["电商网站", "社交媒体平台", "在线教育平台", "金融交易系统"]
            import random
            content = content.replace("{system}", random.choice(systems))

        return content

    def reset(self):
        """重置生成器状态"""
        self.used_questions.clear()
        self.candidate_skills = []
        self.experience_level = "mid"

    def get_available_questions_count(self, category: str) -> int:
        """获取可用问题数量"""
        templates = self.QUESTION_TEMPLATES.get(category, [])
        return len([t for t in templates if t.id not in self.used_questions])

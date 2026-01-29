"""
智能问题生成器

基于候选人画像和面试历史，动态生成个性化问题。
"""

import random
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
from enum import Enum


class QuestionDifficulty(Enum):
    """问题难度等级"""
    EASY = 1
    MEDIUM = 2
    HARD = 3
    EXPERT = 4


class QuestionCategory(Enum):
    """问题类别"""
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    SYSTEM_DESIGN = "system_design"
    CODING = "coding"
    SCENARIO = "scenario"


@dataclass
class QuestionContext:
    """问题上下文"""
    candidate_level: str  # junior, mid, senior, expert
    skills: List[str]
    experience_years: float
    target_position: str
    previous_questions: List[Dict[str, Any]]
    performance_trend: List[float]  # 历史得分趋势
    weak_areas: List[str]  # 薄弱环节
    strong_areas: List[str]  # 优势领域


class SmartQuestionGenerator:
    """
    智能问题生成器

    根据候选人画像和面试表现，动态生成最合适的问题。
    """

    def __init__(self):
        self.question_templates = self._load_question_templates()

    def _load_question_templates(self) -> Dict[str, List[str]]:
        """加载问题模板库"""
        return {
            "technical": {
                "easy": [
                    "请介绍一下{skill}的基本概念和主要特性",
                    "你在项目中是如何使用{skill}的？",
                    "{skill}和{alternative_skill}有什么区别？",
                ],
                "medium": [
                    "请详细说明{skill}的工作原理，包括其核心机制",
                    "在使用{skill}时，你遇到过哪些性能问题？如何解决的？",
                    "请描述一下{skill}的{concept}机制",
                ],
                "hard": [
                    "请设计一个基于{skill}的{scenario}方案，考虑高并发场景",
                    "{skill}在{scenario}场景下有哪些潜在的坑？如何避免？",
                    "请深入分析{skill}的{concept}实现原理",
                ],
                "expert": [
                    "如果你要优化{skill}的{concept}，你会从哪些方面入手？",
                    "请设计一个{skill}的替代方案，解决其在{scenario}场景下的局限性",
                    "基于你对{skill}的深入理解，请分析其源码实现的关键设计思想",
                ],
            },
            "behavioral": {
                "easy": [
                    "请介绍一下你最近参与的一个项目",
                    "你和团队成员是如何协作的？",
                    "当你遇到困难时，通常会怎么做？",
                ],
                "medium": [
                    "请描述一次你和同事产生分歧的经历，你是如何处理的？",
                    "举例说明你是如何在压力下完成重要任务的",
                    "当你发现项目进度落后时，你会采取什么措施？",
                ],
                "hard": [
                    "请描述一次你推动团队改变工作方式的经历",
                    "当你发现上级决策有问题时，你会如何处理？",
                    "举例说明你是如何影响他人接受你的观点的",
                ],
                "expert": [
                    "请描述一次你带领团队走出困境的经历",
                    "当你需要在质量和速度之间做权衡时，你的决策逻辑是什么？",
                    "举例说明你是如何建立团队技术文化的",
                ],
            },
            "system_design": {
                "easy": [
                    "请设计一个简单的{system}系统",
                    "{system}系统需要考虑哪些核心模块？",
                ],
                "medium": [
                    "请设计一个支持{scale}用户的{system}系统",
                    "如何确保{system}系统的高可用性？",
                    "请分析{system}系统的瓶颈可能在哪里",
                ],
                "hard": [
                    "请设计一个全球化部署的{system}系统，考虑数据一致性",
                    "如果{system}系统需要支持{scale}并发，你会如何优化？",
                    "请设计{system}系统的灾备方案",
                ],
                "expert": [
                    "请重新设计{existing_system}，解决其在{scenario}场景下的架构缺陷",
                    "如果让你从零开始设计一个{system}系统，你的技术选型逻辑是什么？",
                    "请分析{system}系统在极端情况下的表现，并提出优化方案",
                ],
            },
        }

    def generate_question(
        self,
        context: QuestionContext,
        category: QuestionCategory,
        difficulty: Optional[QuestionDifficulty] = None,
    ) -> Dict[str, Any]:
        """
        生成智能问题

        Args:
            context: 问题上下文
            category: 问题类别
            difficulty: 指定难度（可选，自动计算）

        Returns:
            问题字典
        """
        # 如果没有指定难度，根据表现动态计算
        if difficulty is None:
            difficulty = self._calculate_optimal_difficulty(context)

        # 选择技能点
        skill = self._select_skill(context, category)

        # 生成问题内容
        question_content = self._generate_question_content(
            category, difficulty, skill, context
        )

        # 生成追问提示
        follow_up_hints = self._generate_follow_up_hints(category, skill)

        return {
            "content": question_content,
            "category": category.value,
            "difficulty": difficulty.value,
            "skill": skill,
            "target_level": context.candidate_level,
            "follow_up_hints": follow_up_hints,
            "estimated_time": self._estimate_time(difficulty),
        }

    def _calculate_optimal_difficulty(
        self, context: QuestionContext
    ) -> QuestionDifficulty:
        """计算最佳难度"""
        if not context.performance_trend:
            # 没有历史数据，根据经验年数判断
            if context.experience_years < 2:
                return QuestionDifficulty.EASY
            elif context.experience_years < 5:
                return QuestionDifficulty.MEDIUM
            elif context.experience_years < 8:
                return QuestionDifficulty.HARD
            else:
                return QuestionDifficulty.EXPERT

        # 根据最近3轮的表现趋势调整
        recent_scores = context.performance_trend[-3:]
        avg_score = sum(recent_scores) / len(recent_scores)

        # 如果连续高分，提升难度
        if avg_score >= 90 and all(s >= 85 for s in recent_scores):
            current_difficulty = max(context.previous_questions[-1].get("difficulty", 2) if context.previous_questions else 2, 2)
            return QuestionDifficulty(min(current_difficulty + 1, 4))

        # 如果连续低分，降低难度
        if avg_score < 60:
            current_difficulty = context.previous_questions[-1].get("difficulty", 2) if context.previous_questions else 2
            return QuestionDifficulty(max(current_difficulty - 1, 1))

        # 保持当前难度
        last_difficulty = context.previous_questions[-1].get("difficulty", 2) if context.previous_questions else 2
        return QuestionDifficulty(last_difficulty)

    def _select_skill(
        self, context: QuestionContext, category: QuestionCategory
    ) -> str:
        """选择要考察的技能点"""
        if category == QuestionCategory.TECHNICAL and context.skills:
            # 优先选择薄弱环节
            if context.weak_areas:
                return random.choice(context.weak_areas)
            # 其次选择未考察过的技能
            examined_skills = set()
            for q in context.previous_questions:
                examined_skills.add(q.get("skill", ""))
            unexamined = [s for s in context.skills if s not in examined_skills]
            if unexamined:
                return random.choice(unexamined)
            # 随机选择
            return random.choice(context.skills)

        # 默认返回通用技能
        skill_map = {
            QuestionCategory.TECHNICAL: "编程",
            QuestionCategory.BEHAVIORAL: "团队协作",
            QuestionCategory.SYSTEM_DESIGN: "系统设计",
            QuestionCategory.CODING: "算法",
            QuestionCategory.SCENARIO: "问题解决",
        }
        return skill_map.get(category, "通用技能")

    def _generate_question_content(
        self,
        category: QuestionCategory,
        difficulty: QuestionDifficulty,
        skill: str,
        context: QuestionContext,
    ) -> str:
        """生成问题内容"""
        category_key = category.value
        difficulty_key = difficulty.name.lower()

        if category_key not in self.question_templates:
            category_key = "technical"

        templates = self.question_templates[category_key].get(
            difficulty_key, self.question_templates[category_key]["medium"]
        )

        template = random.choice(templates)

        # 填充模板变量
        alternatives = {
            "skill": skill,
            "alternative_skill": self._get_alternative_skill(skill),
            "concept": self._get_related_concept(skill),
            "scenario": self._get_scenario(context),
            "system": self._get_system_type(context),
            "existing_system": self._get_existing_system(),
            "scale": self._get_scale(difficulty),
        }

        return template.format(**alternatives)

    def _generate_follow_up_hints(
        self, category: QuestionCategory, skill: str
    ) -> List[str]:
        """生成追问提示"""
        hints = {
            QuestionCategory.TECHNICAL: [
                f"深入询问{skill}的实现原理",
                f"询问{skill}在实际项目中的应用",
                f"探讨{skill}的性能优化方法",
                f"了解候选人对{skill}最佳实践的理解",
            ],
            QuestionCategory.BEHAVIORAL: [
                "追问具体的行为细节",
                "询问候选人的思考过程",
                "了解最终的结果和反思",
                "探讨如果重新来过会怎么做",
            ],
            QuestionCategory.SYSTEM_DESIGN: [
                "追问架构设计的权衡考虑",
                "询问扩展性方案",
                "了解容错和监控设计",
                "探讨技术选型的原因",
            ],
        }
        return hints.get(category, ["追问细节", "深入了解"])

    def _estimate_time(self, difficulty: QuestionDifficulty) -> int:
        """估算回答时间（分钟）"""
        time_map = {
            QuestionDifficulty.EASY: 3,
            QuestionDifficulty.MEDIUM: 5,
            QuestionDifficulty.HARD: 8,
            QuestionDifficulty.EXPERT: 12,
        }
        return time_map.get(difficulty, 5)

    def _get_alternative_skill(self, skill: str) -> str:
        """获取替代技能"""
        alternatives = {
            "Python": "Java",
            "Java": "Python",
            "React": "Vue",
            "Vue": "React",
            "MySQL": "PostgreSQL",
            "PostgreSQL": "MySQL",
            "Redis": "Memcached",
            "Docker": "Kubernetes",
        }
        return alternatives.get(skill, "其他技术")

    def _get_related_concept(self, skill: str) -> str:
        """获取相关概念"""
        concepts = {
            "Python": random.choice(["GIL", "装饰器", "生成器", "元类"]),
            "Java": random.choice(["JVM", "垃圾回收", "多线程", "反射"]),
            "React": random.choice(["虚拟DOM", "Hooks", "状态管理", "生命周期"]),
            "MySQL": random.choice(["索引", "事务", "锁机制", "查询优化"]),
            "Redis": random.choice(["持久化", "集群", "缓存策略", "数据结构"]),
        }
        return concepts.get(skill, "核心机制")

    def _get_scenario(self, context: QuestionContext) -> str:
        """获取场景"""
        scenarios = [
            "高并发",
            "大数据量",
            "分布式",
            "实时处理",
            "微服务",
            "云原生",
        ]
        return random.choice(scenarios)

    def _get_system_type(self, context: QuestionContext) -> str:
        """获取系统类型"""
        systems = [
            "电商",
            "社交网络",
            "即时通讯",
            "内容管理",
            "推荐",
            "支付",
            "搜索",
        ]
        return random.choice(systems)

    def _get_existing_system(self) -> str:
        """获取现有系统示例"""
        systems = [
            "Redis",
            "Kafka",
            "Elasticsearch",
            "Nginx",
            "MongoDB",
        ]
        return random.choice(systems)

    def _get_scale(self, difficulty: QuestionDifficulty) -> str:
        """获取规模"""
        scales = {
            QuestionDifficulty.EASY: "1万",
            QuestionDifficulty.MEDIUM: "100万",
            QuestionDifficulty.HARD: "1000万",
            QuestionDifficulty.EXPERT: "1亿",
        }
        return scales.get(difficulty, "100万")

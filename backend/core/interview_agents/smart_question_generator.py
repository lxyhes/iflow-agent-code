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
        """加载问题模板库 - 扩充至50+高质量模板"""
        return {
            "technical": {
                "easy": [
                    "请介绍一下{skill}的基本概念和主要特性",
                    "你在项目中是如何使用{skill}的？",
                    "{skill}和{alternative_skill}有什么区别？",
                    "请列举{skill}的主要使用场景",
                    "{skill}的安装和配置步骤是什么？",
                    "请解释{skill}中的{concept}概念",
                    "如何在{skill}中实现基础功能？",
                    "{skill}的常见错误有哪些？",
                ],
                "medium": [
                    "请详细说明{skill}的工作原理，包括其核心机制",
                    "在使用{skill}时，你遇到过哪些性能问题？如何解决的？",
                    "请描述一下{skill}的{concept}机制",
                    "{skill}在{scenario}场景下的最佳实践是什么？",
                    "请比较{skill}的不同版本特性差异",
                    "如何优化{skill}的性能？请给出具体方案",
                    "{skill}的{concept}是如何实现的？请详细说明",
                    "请解释{skill}的内存管理机制",
                    "在使用{skill}时，如何保证代码质量？",
                    "{skill}的调试技巧有哪些？",
                ],
                "hard": [
                    "请设计一个基于{skill}的{scenario}方案，考虑高并发场景",
                    "{skill}在{scenario}场景下有哪些潜在的坑？如何避免？",
                    "请深入分析{skill}的{concept}实现原理",
                    "如果{skill}出现性能瓶颈，你的排查思路是什么？",
                    "请设计一个{skill}的高可用架构方案",
                    "{skill}的源码中，你最欣赏哪个设计？为什么？",
                    "如何基于{skill}实现一个分布式系统？",
                    "请分析{skill}在{scenario}场景下的限制",
                    "如果让你改进{skill}，你会从哪些方面入手？",
                    "{skill}的安全漏洞有哪些？如何防范？",
                ],
                "expert": [
                    "如果你要优化{skill}的{concept}，你会从哪些方面入手？",
                    "请设计一个{skill}的替代方案，解决其在{scenario}场景下的局限性",
                    "基于你对{skill}的深入理解，请分析其源码实现的关键设计思想",
                    "请设计一个支持百万级并发的{skill}架构",
                    "如果{skill}需要支持全球化部署，你会如何设计？",
                    "请分析{skill}的架构演进历史，以及背后的设计哲学",
                    "如何基于{skill}设计一个插件化架构？",
                    "请设计{skill}的自动化测试和持续集成方案",
                    "如果让你重写{skill}，你会做哪些架构改进？",
                    "{skill}在云原生环境中的应用和挑战是什么？",
                ],
            },
            "behavioral": {
                "easy": [
                    "请介绍一下你最近参与的一个项目",
                    "你和团队成员是如何协作的？",
                    "当你遇到困难时，通常会怎么做？",
                    "你平时如何学习新技术？",
                    "请描述一次你帮助同事解决问题的经历",
                    "你认为自己最大的优点是什么？",
                    "你是如何管理自己的时间的？",
                ],
                "medium": [
                    "请描述一次你和同事产生分歧的经历，你是如何处理的？",
                    "举例说明你是如何在压力下完成重要任务的",
                    "当你发现项目进度落后时，你会采取什么措施？",
                    "请描述一次你主动承担额外工作的经历",
                    "当你接手一个遗留项目时，你会怎么做？",
                    "请举例说明你是如何处理紧急bug的",
                    "描述一次你协调多个团队完成任务的经历",
                    "当你发现团队成员工作积极性不高时，你会怎么做？",
                ],
                "hard": [
                    "请描述一次你推动团队改变工作方式的经历",
                    "当你发现上级决策有问题时，你会如何处理？",
                    "举例说明你是如何影响他人接受你的观点的",
                    "请描述一次你处理团队冲突的经历",
                    "当你负责的项目失败时，你是如何应对的？",
                    "请举例说明你是如何培养新人的",
                    "描述一次你在资源有限情况下完成项目的经历",
                    "当你需要同时处理多个优先级高的任务时，你会怎么做？",
                ],
                "expert": [
                    "请描述一次你带领团队走出困境的经历",
                    "当你需要在质量和速度之间做权衡时，你的决策逻辑是什么？",
                    "举例说明你是如何建立团队技术文化的",
                    "请描述一次你推动跨部门协作的经历",
                    "当你发现团队技术栈需要升级时，你会如何推进？",
                    "请举例说明你是如何制定团队技术规范的",
                    "描述一次你处理团队人员流失的经历",
                    "当你需要在不同技术方案之间做选择时，你的评估标准是什么？",
                    "请描述一次你主导技术架构升级的经历",
                    "举例说明你是如何平衡业务需求和技术债务的",
                ],
            },
            "system_design": {
                "easy": [
                    "请设计一个简单的{system}系统",
                    "{system}系统需要考虑哪些核心模块？",
                    "请画出{system}系统的基本架构图",
                    "{system}系统的主要功能有哪些？",
                    "请描述{system}系统的数据流",
                ],
                "medium": [
                    "请设计一个支持{scale}用户的{system}系统",
                    "如何确保{system}系统的高可用性？",
                    "请分析{system}系统的瓶颈可能在哪里",
                    "设计一个{system}系统的数据库schema",
                    "如何实现{system}系统的用户认证和授权？",
                    "请设计{system}系统的缓存策略",
                    "如何监控{system}系统的健康状况？",
                    "请设计{system}系统的API接口",
                ],
                "hard": [
                    "请设计一个全球化部署的{system}系统，考虑数据一致性",
                    "如果{system}系统需要支持{scale}并发，你会如何优化？",
                    "请设计{system}系统的灾备方案",
                    "如何实现{system}系统的实时数据同步？",
                    "请设计支持多租户的{system}系统架构",
                    "如果{system}系统需要处理PB级数据，你会如何设计？",
                    "请设计{system}系统的限流和降级策略",
                    "如何实现{system}系统的数据分片？",
                ],
                "expert": [
                    "请重新设计{existing_system}，解决其在{scenario}场景下的架构缺陷",
                    "如果让你从零开始设计一个{system}系统，你的技术选型逻辑是什么？",
                    "请分析{system}系统在极端情况下的表现，并提出优化方案",
                    "设计一个支持每秒百万级请求的{system}系统",
                    "请设计{system}系统的异地多活架构",
                    "如何实现{system}系统的自动化扩缩容？",
                    "请设计{system}系统的数据一致性保障机制",
                    "如果{system}系统需要支持99.999%可用性，你会如何设计？",
                    "请设计{system}系统的全链路追踪方案",
                    "如何实现{system}系统的智能化运维？",
                ],
            },
            "coding": {
                "easy": [
                    "请实现一个函数，实现{algorithm}算法",
                    "写一个程序，解决{problem}问题",
                    "请实现一个基础的{data_structure}",
                    "写一个函数，判断{condition}",
                    "请实现字符串的{operation}操作",
                ],
                "medium": [
                    "请优化以下代码的时间复杂度",
                    "实现一个支持{feature}的{data_structure}",
                    "请用{algorithm}解决{problem}问题",
                    "写一个函数，找出{target}",
                    "请实现一个 LRU 缓存",
                    "写一个程序，解析{format}格式",
                    "请实现二分查找的变体",
                    "写一个函数，计算{metric}",
                ],
                "hard": [
                    "请设计一个支持并发的{data_structure}",
                    "实现一个分布式{algorithm}算法",
                    "请优化以下代码，使其支持{scale}数据量",
                    "写一个程序，实现{system}的核心算法",
                    "请实现一个内存高效的{data_structure}",
                    "设计一个支持事务的缓存系统",
                    "请实现一个正则表达式引擎",
                    "写一个程序，实现数据流的中位数计算",
                ],
                "expert": [
                    "请设计一个支持水平扩展的分布式锁",
                    "实现一个高性能的{algorithm}算法",
                    "请设计一个支持海量数据的实时计算系统",
                    "实现一个自定义的内存分配器",
                    "请设计一个支持多语言的编译器前端",
                    "实现一个分布式事务协调器",
                    "请设计一个支持实时协作的编辑器算法",
                    "实现一个高性能的网络协议栈",
                ],
            },
            "scenario": {
                "easy": [
                    "如果{system}系统突然变慢，你会如何排查？",
                    "当{system}出现大量错误时，你的处理流程是什么？",
                    "如果用户反馈{system}功能不可用，你会怎么做？",
                ],
                "medium": [
                    "如果{system}数据库宕机，你会如何应急处理？",
                    "当{system}需要支持突发流量时，你会怎么做？",
                    "如果{system}出现数据不一致，你如何排查和修复？",
                    "当{system}需要迁移到云端时，你的方案是什么？",
                    "如果{system}的安全漏洞被曝光，你的应对策略是什么？",
                ],
                "hard": [
                    "如果{system}需要在不停机的情况下完成架构升级，你会如何设计？",
                    "当{system}的数据量增长100倍时，你的扩容方案是什么？",
                    "如果{system}需要支持全球化部署，你会如何解决数据合规问题？",
                    "当{system}的核心开发人员离职时，你会如何降低风险？",
                    "如果{system}的第三方服务频繁故障，你会如何设计容错机制？",
                ],
                "expert": [
                    "如果{system}需要在保持99.99%可用性的前提下完成核心重构，你的方案是什么？",
                    "当{system}面临严重的技术债务时，你会如何制定偿还计划？",
                    "如果{system}需要支持多活架构，你会如何设计数据同步方案？",
                    "当{system}的架构无法满足业务快速发展时，你会如何演进？",
                    "如果需要在{system}中引入AI能力，你的技术方案是什么？",
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

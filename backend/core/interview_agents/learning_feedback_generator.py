"""
个性化学习反馈生成器

根据面试评估结果，生成个性化的学习建议和提升路径。
帮助用户针对性提升面试能力，拿到高薪职位。
"""

from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum


class SkillLevel(Enum):
    """技能水平"""
    BEGINNER = "beginner"      # 初级
    INTERMEDIATE = "intermediate"  # 中级
    ADVANCED = "advanced"      # 高级
    EXPERT = "expert"          # 专家


@dataclass
class LearningResource:
    """学习资源"""
    title: str
    type: str  # book, course, article, practice
    url: str = ""
    description: str = ""
    difficulty: str = "medium"  # easy, medium, hard
    estimated_time: str = ""  # 预计学习时间


@dataclass
class SkillGap:
    """技能差距"""
    skill_name: str
    current_level: SkillLevel
    target_level: SkillLevel
    gap_description: str
    priority: int  # 1-5，优先级
    recommended_resources: List[LearningResource] = field(default_factory=list)


@dataclass
class LearningPath:
    """学习路径"""
    title: str
    description: str
    estimated_duration: str  # 预计总时长
    phases: List[Dict[str, Any]]  # 学习阶段
    milestones: List[str]  # 里程碑


@dataclass
class PersonalizedFeedback:
    """个性化反馈"""
    overall_assessment: str  # 总体评价
    strengths_summary: List[str]  # 优势总结
    weaknesses_summary: List[str]  # 待提升点
    skill_gaps: List[SkillGap]  # 技能差距
    learning_paths: List[LearningPath]  # 推荐学习路径
    practice_questions: List[Dict[str, Any]]  # 推荐练习题
    interview_tips: List[str]  # 面试技巧
    next_steps: List[str]  # 下一步行动


class LearningFeedbackGenerator:
    """
    个性化学习反馈生成器

    根据面试评估结果，生成针对性的学习建议和提升方案。
    """

    def __init__(self):
        self.resource_library = self._load_resource_library()
        self.skill_framework = self._load_skill_framework()

    def _load_resource_library(self) -> Dict[str, List[LearningResource]]:
        """加载学习资源库"""
        return {
            "system_design": [
                LearningResource(
                    title="《设计数据密集型应用》",
                    type="book",
                    description="系统设计的经典书籍，深入讲解分布式系统原理",
                    difficulty="hard",
                    estimated_time="40小时",
                ),
                LearningResource(
                    title="System Design Primer",
                    type="article",
                    url="https://github.com/donnemartin/system-design-primer",
                    description="GitHub上最受欢迎的系统设计学习资源",
                    difficulty="medium",
                    estimated_time="30小时",
                ),
                LearningResource(
                    title="系统设计面试指南",
                    type="course",
                    description="涵盖常见系统设计面试题和解题思路",
                    difficulty="medium",
                    estimated_time="20小时",
                ),
                LearningResource(
                    title="设计一个URL短链服务",
                    type="practice",
                    description="实战练习：从零设计一个高并发短链服务",
                    difficulty="medium",
                    estimated_time="8小时",
                ),
            ],
            "technical_depth": [
                LearningResource(
                    title="《深入理解计算机系统》",
                    type="book",
                    description="计算机基础的经典教材",
                    difficulty="hard",
                    estimated_time="60小时",
                ),
                LearningResource(
                    title="LeetCode 高频题",
                    type="practice",
                    url="https://leetcode.com",
                    description="算法和数据结构练习",
                    difficulty="medium",
                    estimated_time="持续",
                ),
                LearningResource(
                    title="技术博客精选",
                    type="article",
                    description="各大公司技术博客的精华文章",
                    difficulty="medium",
                    estimated_time="10小时",
                ),
            ],
            "leadership": [
                LearningResource(
                    title="《技术领导力的艺术》",
                    type="book",
                    description="如何成为优秀的技术领导者",
                    difficulty="medium",
                    estimated_time="15小时",
                ),
                LearningResource(
                    title="技术管理36讲",
                    type="course",
                    description="系统学习技术管理知识",
                    difficulty="medium",
                    estimated_time="20小时",
                ),
                LearningResource(
                    title="STAR法则实践指南",
                    type="article",
                    description="如何组织行为面试回答",
                    difficulty="easy",
                    estimated_time="2小时",
                ),
            ],
            "communication": [
                LearningResource(
                    title="《金字塔原理》",
                    type="book",
                    description="结构化思考和表达的经典",
                    difficulty="medium",
                    estimated_time="12小时",
                ),
                LearningResource(
                    title="技术演讲技巧",
                    type="course",
                    description="提升技术分享和演讲能力",
                    difficulty="easy",
                    estimated_time="8小时",
                ),
            ],
            "coding": [
                LearningResource(
                    title="《代码整洁之道》",
                    type="book",
                    description="编写高质量代码的指南",
                    difficulty="medium",
                    estimated_time="15小时",
                ),
                LearningResource(
                    title="Codewars",
                    type="practice",
                    url="https://codewars.com",
                    description="编程练习平台",
                    difficulty="easy",
                    estimated_time="持续",
                ),
                LearningResource(
                    title="《重构：改善既有代码的设计》",
                    type="book",
                    description="代码重构的经典书籍",
                    difficulty="medium",
                    estimated_time="20小时",
                ),
            ],
        }

    def _load_skill_framework(self) -> Dict[str, Dict[str, Any]]:
        """加载技能框架"""
        return {
            "system_design": {
                "description": "系统架构设计能力",
                "levels": {
                    SkillLevel.BEGINNER: "了解基本架构概念",
                    SkillLevel.INTERMEDIATE: "能设计简单系统",
                    SkillLevel.ADVANCED: "能设计高并发系统",
                    SkillLevel.EXPERT: "能设计复杂分布式系统",
                },
                "importance_for_senior": 5,  # 对高级职位的重要性 1-5
            },
            "technical_depth": {
                "description": "技术深度",
                "levels": {
                    SkillLevel.BEGINNER: "掌握基础语法和API",
                    SkillLevel.INTERMEDIATE: "理解原理和机制",
                    SkillLevel.ADVANCED: "能优化和调优",
                    SkillLevel.EXPERT: "深入源码，能改进",
                },
                "importance_for_senior": 4,
            },
            "leadership": {
                "description": "领导力",
                "levels": {
                    SkillLevel.BEGINNER: "能完成个人任务",
                    SkillLevel.INTERMEDIATE: "能带领小团队",
                    SkillLevel.ADVANCED: "能推动跨团队项目",
                    SkillLevel.EXPERT: "能建立技术文化",
                },
                "importance_for_senior": 5,
            },
            "communication": {
                "description": "沟通能力",
                "levels": {
                    SkillLevel.BEGINNER: "能基本表达",
                    SkillLevel.INTERMEDIATE: "能清晰表达技术观点",
                    SkillLevel.ADVANCED: "能影响他人",
                    SkillLevel.EXPERT: "能推动变革",
                },
                "importance_for_senior": 4,
            },
            "coding": {
                "description": "编码能力",
                "levels": {
                    SkillLevel.BEGINNER: "能写基本代码",
                    SkillLevel.INTERMEDIATE: "代码规范，有设计",
                    SkillLevel.ADVANCED: "高效优雅",
                    SkillLevel.EXPERT: "架构级代码",
                },
                "importance_for_senior": 3,
            },
        }

    def generate_feedback(
        self,
        evaluation_results: List[Dict[str, Any]],
        target_position: str = "",
        experience_years: float = 0,
    ) -> PersonalizedFeedback:
        """
        生成个性化学习反馈

        Args:
            evaluation_results: 评估结果列表
            target_position: 目标职位
            experience_years: 工作经验年数

        Returns:
            个性化反馈
        """
        # 分析评估结果
        dimension_scores = self._analyze_dimension_scores(evaluation_results)

        # 识别优势和待提升点
        strengths, weaknesses = self._identify_strengths_weaknesses(dimension_scores)

        # 生成技能差距分析
        skill_gaps = self._generate_skill_gaps(
            dimension_scores, target_position, experience_years
        )

        # 生成学习路径
        learning_paths = self._generate_learning_paths(skill_gaps, target_position)

        # 生成练习题
        practice_questions = self._generate_practice_questions(weaknesses)

        # 生成面试技巧
        interview_tips = self._generate_interview_tips(dimension_scores)

        # 生成下一步行动
        next_steps = self._generate_next_steps(skill_gaps)

        # 生成总体评价
        overall_assessment = self._generate_overall_assessment(
            dimension_scores, target_position
        )

        return PersonalizedFeedback(
            overall_assessment=overall_assessment,
            strengths_summary=strengths,
            weaknesses_summary=weaknesses,
            skill_gaps=skill_gaps,
            learning_paths=learning_paths,
            practice_questions=practice_questions,
            interview_tips=interview_tips,
            next_steps=next_steps,
        )

    def _analyze_dimension_scores(
        self, evaluation_results: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """分析各维度得分"""
        dimension_scores = {}
        dimension_counts = {}

        for result in evaluation_results:
            dimension = result.get("dimension", "")
            score = result.get("score", 0)

            if dimension:
                if dimension not in dimension_scores:
                    dimension_scores[dimension] = 0
                    dimension_counts[dimension] = 0
                dimension_scores[dimension] += score
                dimension_counts[dimension] += 1

        # 计算平均分
        for dimension in dimension_scores:
            dimension_scores[dimension] /= dimension_counts[dimension]

        return dimension_scores

    def _identify_strengths_weaknesses(
        self, dimension_scores: Dict[str, float]
    ) -> tuple:
        """识别优势和待提升点"""
        strengths = []
        weaknesses = []

        for dimension, score in dimension_scores.items():
            skill_name = self._get_skill_display_name(dimension)
            if score >= 80:
                strengths.append(f"{skill_name}（{score:.0f}分）- 表现优秀")
            elif score < 60:
                weaknesses.append(f"{skill_name}（{score:.0f}分）- 需要重点提升")
            elif score < 70:
                weaknesses.append(f"{skill_name}（{score:.0f}分）- 有提升空间")

        return strengths, weaknesses

    def _generate_skill_gaps(
        self,
        dimension_scores: Dict[str, float],
        target_position: str,
        experience_years: float,
    ) -> List[SkillGap]:
        """生成技能差距分析"""
        skill_gaps = []

        # 确定目标水平
        target_level = self._determine_target_level(target_position, experience_years)

        for dimension, score in dimension_scores.items():
            # 跳过高分技能
            if score >= 80:
                continue

            current_level = self._score_to_level(score)
            skill_name = self._get_skill_display_name(dimension)

            # 计算优先级
            importance = self.skill_framework.get(dimension, {}).get(
                "importance_for_senior", 3
            )
            priority = importance * (1 - score / 100)  # 重要性 × 差距

            # 获取推荐资源
            resources = self.resource_library.get(dimension, [])

            gap = SkillGap(
                skill_name=skill_name,
                current_level=current_level,
                target_level=target_level,
                gap_description=self._generate_gap_description(
                    dimension, current_level, target_level
                ),
                priority=int(priority * 2),  # 转换为1-5
                recommended_resources=resources[:3],  # 最多3个资源
            )
            skill_gaps.append(gap)

        # 按优先级排序
        skill_gaps.sort(key=lambda x: x.priority, reverse=True)

        return skill_gaps

    def _generate_learning_paths(
        self, skill_gaps: List[SkillGap], target_position: str
    ) -> List[LearningPath]:
        """生成学习路径"""
        learning_paths = []

        if not skill_gaps:
            return learning_paths

        # 主学习路径
        main_path = LearningPath(
            title=f"通往{target_position or '高级工程师'}的学习路径",
            description="基于你的面试表现，为你定制的系统化学习计划",
            estimated_duration="3-6个月",
            phases=[
                {
                    "phase": 1,
                    "title": "基础强化",
                    "duration": "4周",
                    "focus": "巩固基础知识和技能",
                    "tasks": [
                        "完成基础概念学习",
                        "每天练习算法题",
                        "阅读技术书籍",
                    ],
                },
                {
                    "phase": 2,
                    "title": "能力提升",
                    "duration": "8周",
                    "focus": "提升核心技能",
                    "tasks": [
                        "深入学习薄弱领域",
                        "完成实战项目",
                        "参与技术分享",
                    ],
                },
                {
                    "phase": 3,
                    "title": "面试准备",
                    "duration": "4周",
                    "focus": "针对性面试训练",
                    "tasks": [
                        "模拟面试练习",
                        "系统设计训练",
                        "行为面试准备",
                    ],
                },
            ],
            milestones=[
                "完成基础知识复习",
                "独立完成3个系统设计",
                "通过模拟面试",
                "准备好迎接真实面试",
            ],
        )
        learning_paths.append(main_path)

        # 专项提升路径
        if skill_gaps:
            top_gap = skill_gaps[0]
            specialized_path = LearningPath(
                title=f"{top_gap.skill_name}专项提升",
                description=f"针对{top_gap.skill_name}的强化训练计划",
                estimated_duration="2-4周",
                phases=[
                    {
                        "phase": 1,
                        "title": "理论学习",
                        "duration": "1周",
                        "focus": f"学习{top_gap.skill_name}核心知识",
                        "tasks": [
                            "阅读相关书籍和文章",
                            "观看教学视频",
                            "做笔记和总结",
                        ],
                    },
                    {
                        "phase": 2,
                        "title": "实践练习",
                        "duration": "2周",
                        "focus": "通过练习巩固知识",
                        "tasks": [
                            "完成练习题",
                            "参与实际项目",
                            "做案例分析",
                        ],
                    },
                    {
                        "phase": 3,
                        "title": "总结提升",
                        "duration": "1周",
                        "focus": "总结和反思",
                        "tasks": [
                            "整理学习笔记",
                            "写技术博客",
                            "教别人",
                        ],
                    },
                ],
                milestones=[
                    f"掌握{top_gap.skill_name}核心概念",
                    f"能独立完成{top_gap.skill_name}相关任务",
                    f"准备好{top_gap.skill_name}相关面试题",
                ],
            )
            learning_paths.append(specialized_path)

        return learning_paths

    def _generate_practice_questions(self, weaknesses: List[str]) -> List[Dict[str, Any]]:
        """生成推荐练习题"""
        practice_questions = []

        # 根据薄弱环节生成练习题
        for weakness in weaknesses[:3]:  # 最多3个薄弱环节
            if "系统设计" in weakness:
                practice_questions.extend([
                    {
                        "type": "system_design",
                        "title": "设计一个秒杀系统",
                        "difficulty": "medium",
                        "focus": "高并发、库存一致性",
                    },
                    {
                        "type": "system_design",
                        "title": "设计一个即时通讯系统",
                        "difficulty": "hard",
                        "focus": "实时性、消息可靠性",
                    },
                ])
            elif "技术深度" in weakness:
                practice_questions.extend([
                    {
                        "type": "technical",
                        "title": "深入分析Redis的持久化机制",
                        "difficulty": "hard",
                        "focus": "RDB和AOF的实现原理",
                    },
                    {
                        "type": "coding",
                        "title": "实现一个LRU缓存",
                        "difficulty": "medium",
                        "focus": "数据结构和算法",
                    },
                ])
            elif "领导力" in weakness:
                practice_questions.extend([
                    {
                        "type": "behavioral",
                        "title": "描述一次你推动团队改变的经历",
                        "difficulty": "medium",
                        "focus": "STAR法则应用",
                    },
                ])

        return practice_questions

    def _generate_interview_tips(self, dimension_scores: Dict[str, float]) -> List[str]:
        """生成面试技巧"""
        tips = []

        # 通用技巧
        tips.extend([
            "面试前充分准备，了解公司和职位要求",
            "使用STAR法则回答行为面试问题",
            "系统设计题要展示思考过程，不要直接给答案",
            "遇到不会的问题，可以坦诚说明并展示学习思路",
            "准备3-5个提问，展示你对职位的兴趣",
        ])

        # 针对性技巧
        for dimension, score in dimension_scores.items():
            if score < 60:
                if dimension == "system_design":
                    tips.append("系统设计题：先明确需求，再设计架构，最后讨论细节")
                elif dimension == "technical_depth":
                    tips.append("技术深度题：不仅要回答是什么，还要解释为什么")
                elif dimension == "leadership":
                    tips.append("领导力问题：用具体事例证明，而不是泛泛而谈")
                elif dimension == "communication":
                    tips.append("沟通表达：结构化回答，先说结论再说理由")

        return tips

    def _generate_next_steps(self, skill_gaps: List[SkillGap]) -> List[str]:
        """生成下一步行动"""
        steps = []

        if skill_gaps:
            top_gap = skill_gaps[0]
            steps.append(f"优先提升：{top_gap.skill_name}（优先级：{top_gap.priority}/5）")

            if top_gap.recommended_resources:
                resource = top_gap.recommended_resources[0]
                steps.append(f"开始学习：{resource.title}（{resource.type}）")

        steps.extend([
            "制定学习计划，每天投入1-2小时",
            "加入技术社区，与他人交流学习",
            "定期复盘，记录学习进展",
            "2周后进行模拟面试，检验学习效果",
        ])

        return steps

    def _generate_overall_assessment(
        self, dimension_scores: Dict[str, float], target_position: str
    ) -> str:
        """生成总体评价"""
        if not dimension_scores:
            return "暂无评估数据"

        avg_score = sum(dimension_scores.values()) / len(dimension_scores)

        if avg_score >= 85:
            return f"你的整体表现优秀，已经具备{target_position or '高级工程师'}的技术水平。建议继续保持，并在特定领域深入钻研。"
        elif avg_score >= 70:
            return f"你的整体表现良好，基本符合{target_position or '目标职位'}的要求。建议针对薄弱环节进行针对性提升。"
        elif avg_score >= 60:
            return f"你的整体表现及格，但距离{target_position or '目标职位'}还有一定差距。建议系统性地提升技术能力。"
        else:
            return f"你的整体表现需要大幅提升才能达到{target_position or '目标职位'}的要求。建议从基础开始，制定长期学习计划。"

    def _get_skill_display_name(self, dimension: str) -> str:
        """获取技能显示名称"""
        name_map = {
            "system_design": "系统设计",
            "technical_depth": "技术深度",
            "coding_ability": "编码能力",
            "problem_solving": "问题解决",
            "leadership": "领导力",
            "technical_influence": "技术影响力",
            "cross_team_collaboration": "跨团队协作",
            "org_building": "组织建设",
            "talent_development": "人才培养",
            "communication": "沟通表达",
            "adaptability": "适应能力",
            "cultural_fit": "文化契合",
            "scalability": "可扩展性",
            "availability": "高可用性",
            "consistency": "数据一致性",
            "performance": "性能优化",
            "security": "安全设计",
            "cost_efficiency": "成本效益",
            "tech_decision": "技术选型",
            "troubleshooting": "故障排查",
        }
        return name_map.get(dimension, dimension)

    def _score_to_level(self, score: float) -> SkillLevel:
        """分数转换为水平等级"""
        if score >= 85:
            return SkillLevel.EXPERT
        elif score >= 70:
            return SkillLevel.ADVANCED
        elif score >= 60:
            return SkillLevel.INTERMEDIATE
        else:
            return SkillLevel.BEGINNER

    def _determine_target_level(
        self, target_position: str, experience_years: float
    ) -> SkillLevel:
        """确定目标水平"""
        # 根据目标职位判断
        if target_position:
            if "专家" in target_position or "架构师" in target_position or "P8" in target_position:
                return SkillLevel.EXPERT
            elif "高级" in target_position or "资深" in target_position or "P7" in target_position:
                return SkillLevel.ADVANCED

        # 根据经验判断
        if experience_years >= 8:
            return SkillLevel.EXPERT
        elif experience_years >= 5:
            return SkillLevel.ADVANCED
        elif experience_years >= 2:
            return SkillLevel.INTERMEDIATE
        else:
            return SkillLevel.BEGINNER

    def _generate_gap_description(
        self, dimension: str, current: SkillLevel, target: SkillLevel
    ) -> str:
        """生成差距描述"""
        framework = self.skill_framework.get(dimension, {})
        levels = framework.get("levels", {})

        current_desc = levels.get(current, "")
        target_desc = levels.get(target, "")

        return f"当前水平：{current_desc}\n目标水平：{target_desc}"

    def to_dict(self, feedback: PersonalizedFeedback) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "overall_assessment": feedback.overall_assessment,
            "strengths_summary": feedback.strengths_summary,
            "weaknesses_summary": feedback.weaknesses_summary,
            "skill_gaps": [
                {
                    "skill_name": gap.skill_name,
                    "current_level": gap.current_level.value,
                    "target_level": gap.target_level.value,
                    "gap_description": gap.gap_description,
                    "priority": gap.priority,
                    "recommended_resources": [
                        {
                            "title": r.title,
                            "type": r.type,
                            "description": r.description,
                            "difficulty": r.difficulty,
                            "estimated_time": r.estimated_time,
                        }
                        for r in gap.recommended_resources
                    ],
                }
                for gap in feedback.skill_gaps
            ],
            "learning_paths": [
                {
                    "title": path.title,
                    "description": path.description,
                    "estimated_duration": path.estimated_duration,
                    "phases": path.phases,
                    "milestones": path.milestones,
                }
                for path in feedback.learning_paths
            ],
            "practice_questions": feedback.practice_questions,
            "interview_tips": feedback.interview_tips,
            "next_steps": feedback.next_steps,
        }

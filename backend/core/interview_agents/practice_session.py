"""
练习模式会话管理

提供面试练习功能，允许用户针对特定技能进行专项练习。
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Any, Dict, List, Optional
from uuid import uuid4

from .base_interviewer import Answer, Evaluation, Question
from .smart_question_generator import SmartQuestionGenerator, QuestionCategory, QuestionDifficulty


class PracticeMode(Enum):
    """练习模式"""
    SYSTEM_DESIGN = "system_design"      # 系统设计专项
    CODING = "coding"                    # 编码专项
    BEHAVIORAL = "behavioral"            # 行为面试专项
    TECHNICAL = "technical"              # 技术深度专项
    MIXED = "mixed"                      # 混合模式


class PracticeDifficulty(Enum):
    """练习难度"""
    BEGINNER = "beginner"                # 初级
    INTERMEDIATE = "intermediate"        # 中级
    ADVANCED = "advanced"                # 高级
    EXPERT = "expert"                    # 专家


@dataclass
class PracticeQuestion:
    """练习问题"""
    id: str = field(default_factory=lambda: str(uuid4()))
    question: Question = field(default_factory=Question)
    category: str = ""
    difficulty: str = ""
    expected_answer_points: List[str] = field(default_factory=list)
    hints: List[str] = field(default_factory=list)
    reference_answer: str = ""
    common_mistakes: List[str] = field(default_factory=list)


@dataclass
class PracticeAttempt:
    """练习尝试记录"""
    id: str = field(default_factory=lambda: str(uuid4()))
    question_id: str = ""
    answer: str = ""
    evaluation: Optional[Evaluation] = None
    time_spent: int = 0  # 秒
    hints_used: int = 0
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class PracticeStats:
    """练习统计"""
    total_questions: int = 0
    completed_questions: int = 0
    average_score: float = 0.0
    total_time: int = 0  # 秒
    category_scores: Dict[str, List[float]] = field(default_factory=dict)
    improvement_trend: List[float] = field(default_factory=list)
    streak_days: int = 0


@dataclass
class PracticeSessionConfig:
    """练习会话配置"""
    session_id: str = field(default_factory=lambda: str(uuid4()))
    mode: PracticeMode = PracticeMode.MIXED
    difficulty: PracticeDifficulty = PracticeDifficulty.INTERMEDIATE
    question_count: int = 5
    time_limit_per_question: int = 600  # 秒
    enable_hints: bool = True
    enable_instant_feedback: bool = True
    focus_areas: List[str] = field(default_factory=list)


class PracticeSession:
    """
    练习会话

    管理用户的练习过程，包括问题生成、评估、反馈等。
    """

    def __init__(self, config: PracticeSessionConfig = None):
        self.config = config or PracticeSessionConfig()
        self.question_generator = SmartQuestionGenerator()
        self.questions: List[PracticeQuestion] = []
        self.attempts: List[PracticeAttempt] = []
        self.current_question_index: int = 0
        self.stats = PracticeStats()
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.is_active: bool = False

    async def start(self) -> bool:
        """开始练习会话"""
        if self.is_active:
            return False

        self.start_time = datetime.now()
        self.is_active = True

        # 生成练习问题
        await self._generate_questions()

        return True

    async def _generate_questions(self):
        """生成练习问题"""
        from .shared_context import QuestionContext

        # 根据模式确定问题类别
        category_map = {
            PracticeMode.SYSTEM_DESIGN: QuestionCategory.SYSTEM_DESIGN,
            PracticeMode.CODING: QuestionCategory.CODING,
            PracticeMode.BEHAVIORAL: QuestionCategory.BEHAVIORAL,
            PracticeMode.TECHNICAL: QuestionCategory.TECHNICAL,
            PracticeMode.MIXED: None,
        }

        target_category = category_map.get(self.config.mode)

        # 根据难度确定问题难度
        difficulty_map = {
            PracticeDifficulty.BEGINNER: QuestionDifficulty.EASY,
            PracticeDifficulty.INTERMEDIATE: QuestionDifficulty.MEDIUM,
            PracticeDifficulty.ADVANCED: QuestionDifficulty.HARD,
            PracticeDifficulty.EXPERT: QuestionDifficulty.EXPERT,
        }
        target_difficulty = difficulty_map.get(self.config.difficulty, QuestionDifficulty.MEDIUM)

        # 生成问题上下文
        context = QuestionContext(
            candidate_level=self.config.difficulty.value,
            skills=self.config.focus_areas,
            experience_years=0,
            target_position="",
            previous_questions=[],
            performance_trend=[],
            weak_areas=self.config.focus_areas,
            strong_areas=[],
        )

        # 生成问题
        for i in range(self.config.question_count):
            if self.config.mode == PracticeMode.MIXED:
                # 混合模式：轮换类别
                categories = [
                    QuestionCategory.TECHNICAL,
                    QuestionCategory.SYSTEM_DESIGN,
                    QuestionCategory.BEHAVIORAL,
                ]
                category = categories[i % len(categories)]
            else:
                category = target_category

            question_data = self.question_generator.generate_question(
                context=context,
                category=category,
                difficulty=target_difficulty,
            )

            practice_question = PracticeQuestion(
                question=Question(
                    content=question_data["content"],
                    type=question_data["category"],
                    difficulty=question_data["difficulty"],
                    category=question_data["skill"],
                ),
                category=question_data["category"],
                difficulty=question_data["difficulty"],
                expected_answer_points=self._generate_expected_points(question_data),
                hints=self._generate_hints(question_data),
            )

            self.questions.append(practice_question)

    def _generate_expected_points(self, question_data: Dict[str, Any]) -> List[str]:
        """生成预期回答要点"""
        category = question_data.get("category", "")

        points_map = {
            "system_design": [
                "明确需求和约束",
                "设计高层架构",
                "详细设计核心组件",
                "考虑扩展性和可用性",
                "讨论权衡和替代方案",
            ],
            "technical": [
                "解释核心概念",
                "说明工作原理",
                "举例说明应用场景",
                "讨论优缺点",
            ],
            "behavioral": [
                "描述具体情境",
                "说明任务和目标",
                "详细描述行动",
                "总结结果和反思",
            ],
            "coding": [
                "理解题目要求",
                "设计算法思路",
                "编写正确代码",
                "分析时间复杂度",
                "考虑边界情况",
            ],
        }

        return points_map.get(category, ["回答完整", "逻辑清晰", "有深度"])

    def _generate_hints(self, question_data: Dict[str, Any]) -> List[str]:
        """生成提示"""
        category = question_data.get("category", "")

        hints_map = {
            "system_design": [
                "先明确功能需求和非功能需求",
                "考虑系统的QPS和存储需求",
                "思考系统的瓶颈在哪里",
                "考虑如何处理故障",
            ],
            "technical": [
                "从基础概念开始解释",
                "结合实际应用场景",
                "思考底层实现原理",
            ],
            "behavioral": [
                "使用STAR法则组织回答",
                "提供具体的数字和结果",
                "展示你的思考和成长",
            ],
            "coding": [
                "先理解题目要求",
                "考虑边界情况",
                "先写伪代码理清思路",
            ],
        }

        return hints_map.get(category, ["仔细思考", "结构化回答"])

    def get_current_question(self) -> Optional[PracticeQuestion]:
        """获取当前问题"""
        if 0 <= self.current_question_index < len(self.questions):
            return self.questions[self.current_question_index]
        return None

    def get_hint(self) -> Optional[str]:
        """获取提示"""
        if not self.config.enable_hints:
            return None

        question = self.get_current_question()
        if not question or not question.hints:
            return None

        # 获取当前尝试
        current_attempt = None
        for attempt in reversed(self.attempts):
            if attempt.question_id == question.id:
                current_attempt = attempt
                break

        if not current_attempt:
            return question.hints[0]

        # 返回下一个提示
        hint_index = current_attempt.hints_used
        if hint_index < len(question.hints):
            current_attempt.hints_used += 1
            return question.hints[hint_index]

        return None

    async def submit_answer(self, answer: str, time_spent: int = 0) -> Dict[str, Any]:
        """
        提交回答

        Args:
            answer: 回答内容
            time_spent: 花费时间（秒）

        Returns:
            评估结果
        """
        question = self.get_current_question()
        if not question:
            return {"error": "没有当前问题"}

        # 创建尝试记录
        attempt = PracticeAttempt(
            question_id=question.id,
            answer=answer,
            time_spent=time_spent,
        )

        # 评估回答
        evaluation = await self._evaluate_answer(question, answer)
        attempt.evaluation = evaluation

        self.attempts.append(attempt)

        # 更新统计
        self._update_stats(evaluation)

        # 移动到下一个问题
        self.current_question_index += 1

        result = {
            "evaluation": {
                "score": evaluation.score,
                "feedback": evaluation.feedback,
                "strengths": evaluation.strengths,
                "weaknesses": evaluation.weaknesses,
            },
            "expected_points": question.expected_answer_points,
            "is_complete": self.current_question_index >= len(self.questions),
            "progress": {
                "current": self.current_question_index,
                "total": len(self.questions),
            },
        }

        # 如果是即时反馈模式，添加详细反馈
        if self.config.enable_instant_feedback:
            result["detailed_feedback"] = self._generate_detailed_feedback(
                question, answer, evaluation
            )

        return result

    async def _evaluate_answer(
        self, question: PracticeQuestion, answer: str
    ) -> Evaluation:
        """评估回答"""
        # 简化的评估逻辑
        # 实际实现中应该调用LLM进行评估

        score = 70.0  # 基础分

        # 根据回答长度调整分数
        answer_length = len(answer)
        if answer_length < 50:
            score -= 10
        elif answer_length > 200:
            score += 5

        # 检查是否包含预期要点
        covered_points = 0
        for point in question.expected_answer_points:
            if any(keyword in answer.lower() for keyword in point.lower().split()):
                covered_points += 1

        if covered_points > 0:
            score += min(covered_points * 5, 20)

        # 限制分数范围
        score = max(0, min(100, score))

        # 生成反馈
        if score >= 80:
            feedback = "回答优秀！涵盖了大部分要点。"
        elif score >= 60:
            feedback = "回答良好，但还有提升空间。"
        else:
            feedback = "回答需要改进，建议参考要点重新组织。"

        return Evaluation(
            question_id=question.question.id,
            score=score,
            dimension=question.category,
            feedback=feedback,
            strengths=["回答完整"] if score >= 70 else [],
            weaknesses=["需要更多细节"] if score < 80 else [],
            confidence=0.8,
        )

    def _generate_detailed_feedback(
        self,
        question: PracticeQuestion,
        answer: str,
        evaluation: Evaluation,
    ) -> Dict[str, Any]:
        """生成详细反馈"""
        # 检查覆盖的要点
        covered_points = []
        missed_points = []

        for point in question.expected_answer_points:
            if any(keyword in answer.lower() for keyword in point.lower().split()):
                covered_points.append(point)
            else:
                missed_points.append(point)

        return {
            "covered_points": covered_points,
            "missed_points": missed_points,
            "suggestions": self._generate_suggestions(question.category, missed_points),
            "reference_resources": self._get_reference_resources(question.category),
        }

    def _generate_suggestions(self, category: str, missed_points: List[str]) -> List[str]:
        """生成改进建议"""
        suggestions = []

        if missed_points:
            suggestions.append(f"下次回答时请特别注意：{', '.join(missed_points[:3])}")

        category_suggestions = {
            "system_design": [
                "建议多画图辅助说明",
                "先明确需求再设计架构",
                "多考虑边界情况和故障处理",
            ],
            "technical": [
                "深入理解原理，不只是会用",
                "结合实际项目经验说明",
                "多阅读源码和技术博客",
            ],
            "behavioral": [
                "使用STAR法则组织回答",
                "准备3-5个通用案例",
                "量化你的成果",
            ],
            "coding": [
                "先写伪代码理清思路",
                "注意边界条件处理",
                "优化时间和空间复杂度",
            ],
        }

        suggestions.extend(category_suggestions.get(category, []))

        return suggestions[:3]

    def _get_reference_resources(self, category: str) -> List[Dict[str, str]]:
        """获取参考资源"""
        resources_map = {
            "system_design": [
                {"title": "System Design Primer", "type": "github"},
                {"title": "设计数据密集型应用", "type": "book"},
            ],
            "technical": [
                {"title": "官方文档", "type": "doc"},
                {"title": "技术博客", "type": "article"},
            ],
            "behavioral": [
                {"title": "STAR法则指南", "type": "article"},
                {"title": "行为面试题库", "type": "practice"},
            ],
            "coding": [
                {"title": "LeetCode", "type": "practice"},
                {"title": "算法导论", "type": "book"},
            ],
        }

        return resources_map.get(category, [])

    def _update_stats(self, evaluation: Evaluation):
        """更新统计信息"""
        self.stats.completed_questions += 1

        # 更新平均分
        total_score = self.stats.average_score * (self.stats.completed_questions - 1)
        total_score += evaluation.score
        self.stats.average_score = total_score / self.stats.completed_questions

        # 更新类别分数
        if evaluation.dimension not in self.stats.category_scores:
            self.stats.category_scores[evaluation.dimension] = []
        self.stats.category_scores[evaluation.dimension].append(evaluation.score)

        # 更新趋势
        self.stats.improvement_trend.append(evaluation.score)

    def get_stats(self) -> Dict[str, Any]:
        """获取练习统计"""
        return {
            "total_questions": len(self.questions),
            "completed_questions": self.stats.completed_questions,
            "average_score": self.stats.average_score,
            "total_time": self.stats.total_time,
            "category_scores": {
                cat: sum(scores) / len(scores)
                for cat, scores in self.stats.category_scores.items()
            },
            "improvement_trend": self.stats.improvement_trend,
            "accuracy": self.stats.completed_questions / len(self.questions) * 100 if self.questions else 0,
        }

    def get_progress(self) -> Dict[str, Any]:
        """获取进度"""
        return {
            "current_question": self.current_question_index + 1,
            "total_questions": len(self.questions),
            "completed": self.current_question_index,
            "percentage": (self.current_question_index / len(self.questions) * 100) if self.questions else 0,
            "is_complete": self.current_question_index >= len(self.questions),
        }

    async def end(self) -> Dict[str, Any]:
        """结束练习会话"""
        self.is_active = False
        self.end_time = datetime.now()

        # 计算总时长
        if self.start_time:
            duration = (self.end_time - self.start_time).total_seconds()
            self.stats.total_time = int(duration)

        return {
            "session_id": self.config.session_id,
            "stats": self.get_stats(),
            "total_time": self.stats.total_time,
            "summary": self._generate_summary(),
        }

    def _generate_summary(self) -> str:
        """生成练习总结"""
        stats = self.get_stats()
        avg_score = stats["average_score"]

        if avg_score >= 85:
            return "表现优秀！继续保持，你已经具备了很强的面试能力。"
        elif avg_score >= 70:
            return "表现良好，但还有提升空间。建议针对薄弱环节继续练习。"
        elif avg_score >= 60:
            return "基本及格，但需要更多练习。建议系统性地提升技能。"
        else:
            return "需要加强练习。建议从基础开始，逐步提升。"


class PracticeSessionManager:
    """
    练习会话管理器

    管理所有练习会话的创建、获取和销毁。
    """

    def __init__(self):
        self.sessions: Dict[str, PracticeSession] = {}

    def create_session(self, config: PracticeSessionConfig = None) -> PracticeSession:
        """创建练习会话"""
        session = PracticeSession(config=config)
        self.sessions[session.config.session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[PracticeSession]:
        """获取练习会话"""
        return self.sessions.get(session_id)

    def delete_session(self, session_id: str) -> bool:
        """删除练习会话"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False

    def list_sessions(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """列出现有会话"""
        sessions = []
        for session_id, session in self.sessions.items():
            sessions.append({
                "session_id": session_id,
                "mode": session.config.mode.value,
                "difficulty": session.config.difficulty.value,
                "is_active": session.is_active,
                "progress": session.get_progress(),
            })
        return sessions

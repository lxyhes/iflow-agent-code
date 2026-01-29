"""
智能面试策略引擎

根据候选人表现动态调整面试策略和流程。
"""

from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum
import random


class InterviewStrategy(Enum):
    """面试策略类型"""
    STANDARD = "standard"           # 标准流程
    DEEP_DIVE = "deep_dive"         # 深度挖掘
    FAST_TRACK = "fast_track"       # 快速通道（表现优秀）
    REMEDIAL = "remedial"           # 补救模式（基础薄弱）
    CHALLENGE = "challenge"         # 挑战模式（压力测试）


class InterviewPhase(Enum):
    """面试阶段"""
    WARM_UP = "warm_up"             # 热身阶段
    CORE_SKILLS = "core_skills"     # 核心技能
    ADVANCED = "advanced"           # 进阶考察
    REAL_WORLD = "real_world"       # 实战场景
    CULTURE_FIT = "culture_fit"     # 文化契合
    REMEDIAL = "remedial"           # 补救阶段


@dataclass
class StrategyContext:
    """策略上下文"""
    candidate_level: str
    experience_years: float
    target_position: str
    current_phase: InterviewPhase
    rounds_completed: int
    performance_history: List[Dict[str, Any]] = field(default_factory=list)
    strategy: InterviewStrategy = InterviewStrategy.STANDARD
    focus_areas: List[str] = field(default_factory=list)
    skip_areas: List[str] = field(default_factory=list)


class SmartStrategyEngine:
    """
    智能面试策略引擎

    根据候选人表现动态调整面试策略，实现个性化面试流程。
    """

    def __init__(self):
        self.strategy_rules = self._load_strategy_rules()
        self.phase_transitions = self._load_phase_transitions()

    def _load_strategy_rules(self) -> Dict[InterviewStrategy, Dict[str, Any]]:
        """加载策略规则"""
        return {
            InterviewStrategy.STANDARD: {
                "description": "标准面试流程",
                "question_count": 5,
                "follow_up_depth": 1,
                "difficulty_curve": "linear",  # 线性递增
                "focus_areas": [],
                "time_allocation": {
                    "technical": 0.4,
                    "behavioral": 0.3,
                    "system_design": 0.2,
                    "hr": 0.1,
                },
            },
            InterviewStrategy.DEEP_DIVE: {
                "description": "深度挖掘模式",
                "question_count": 4,
                "follow_up_depth": 3,
                "difficulty_curve": "aggressive",  # 快速提升
                "focus_areas": ["technical", "system_design"],
                "time_allocation": {
                    "technical": 0.5,
                    "behavioral": 0.2,
                    "system_design": 0.25,
                    "hr": 0.05,
                },
            },
            InterviewStrategy.FAST_TRACK: {
                "description": "快速通道模式",
                "question_count": 3,
                "follow_up_depth": 1,
                "difficulty_curve": "steep",  # 陡峭提升
                "focus_areas": ["system_design", "advanced_technical"],
                "time_allocation": {
                    "technical": 0.3,
                    "behavioral": 0.2,
                    "system_design": 0.4,
                    "hr": 0.1,
                },
            },
            InterviewStrategy.REMEDIAL: {
                "description": "补救模式",
                "question_count": 6,
                "follow_up_depth": 2,
                "difficulty_curve": "gentle",  # 温和提升
                "focus_areas": ["fundamentals", "basic_behavioral"],
                "time_allocation": {
                    "technical": 0.5,
                    "behavioral": 0.3,
                    "system_design": 0.1,
                    "hr": 0.1,
                },
            },
            InterviewStrategy.CHALLENGE: {
                "description": "挑战模式",
                "question_count": 5,
                "follow_up_depth": 2,
                "difficulty_curve": "extreme",  # 极限难度
                "focus_areas": ["complex_systems", "edge_cases"],
                "time_allocation": {
                    "technical": 0.45,
                    "behavioral": 0.15,
                    "system_design": 0.35,
                    "hr": 0.05,
                },
            },
        }

    def _load_phase_transitions(self) -> Dict[InterviewPhase, Dict[str, Any]]:
        """加载阶段转换规则"""
        return {
            InterviewPhase.WARM_UP: {
                "next": InterviewPhase.CORE_SKILLS,
                "condition": "always",
                "duration": 1,  # 轮数
            },
            InterviewPhase.CORE_SKILLS: {
                "next": InterviewPhase.ADVANCED,
                "condition": "score_threshold",
                "threshold": 70,
                "fallback": InterviewPhase.CULTURE_FIT,
                "duration": 2,
            },
            InterviewPhase.ADVANCED: {
                "next": InterviewPhase.REAL_WORLD,
                "condition": "score_threshold",
                "threshold": 80,
                "fallback": InterviewPhase.CULTURE_FIT,
                "duration": 2,
            },
            InterviewPhase.REAL_WORLD: {
                "next": InterviewPhase.CULTURE_FIT,
                "condition": "always",
                "duration": 1,
            },
            InterviewPhase.CULTURE_FIT: {
                "next": None,
                "condition": "end",
                "duration": 1,
            },
        }

    def determine_strategy(self, context: StrategyContext) -> InterviewStrategy:
        """
        确定面试策略

        Args:
            context: 策略上下文

        Returns:
            面试策略
        """
        if not context.performance_history:
            # 没有历史数据，根据经验判断
            return self._strategy_by_experience(context)

        # 分析最近表现
        recent_performances = context.performance_history[-3:]
        avg_score = sum(p["score"] for p in recent_performances) / len(recent_performances)
        score_trend = self._calculate_trend(recent_performances)

        # 根据表现选择策略
        if avg_score >= 90 and score_trend == "up":
            return InterviewStrategy.FAST_TRACK
        elif avg_score >= 85:
            return InterviewStrategy.DEEP_DIVE
        elif avg_score < 60:
            return InterviewStrategy.REMEDIAL
        elif avg_score >= 80 and score_trend == "down":
            return InterviewStrategy.CHALLENGE
        else:
            return InterviewStrategy.STANDARD

    def _strategy_by_experience(self, context: StrategyContext) -> InterviewStrategy:
        """根据经验选择策略"""
        if context.experience_years >= 8:
            return InterviewStrategy.DEEP_DIVE
        elif context.experience_years >= 5:
            return InterviewStrategy.STANDARD
        elif context.experience_years >= 2:
            return InterviewStrategy.STANDARD
        else:
            return InterviewStrategy.REMEDIAL

    def _calculate_trend(self, performances: List[Dict[str, Any]]) -> str:
        """计算表现趋势"""
        if len(performances) < 2:
            return "stable"

        scores = [p["score"] for p in performances]
        if scores[-1] > scores[0] + 10:
            return "up"
        elif scores[-1] < scores[0] - 10:
            return "down"
        else:
            return "stable"

    def get_next_phase(self, context: StrategyContext) -> Optional[InterviewPhase]:
        """
        获取下一个面试阶段

        Args:
            context: 策略上下文

        Returns:
            下一阶段，如果面试结束则返回None
        """
        current_phase_config = self.phase_transitions.get(context.current_phase)
        if not current_phase_config:
            return None

        condition = current_phase_config["condition"]

        if condition == "always":
            return current_phase_config["next"]

        elif condition == "score_threshold":
            threshold = current_phase_config["threshold"]
            recent_scores = [p["score"] for p in context.performance_history[-2:]]
            avg_score = sum(recent_scores) / len(recent_scores) if recent_scores else 0

            if avg_score >= threshold:
                return current_phase_config["next"]
            else:
                return current_phase_config.get("fallback", InterviewPhase.CULTURE_FIT)

        elif condition == "end":
            return None

        return None

    def should_advance_difficulty(
        self, context: StrategyContext, current_score: float
    ) -> bool:
        """
        判断是否应提升难度

        Args:
            context: 策略上下文
            current_score: 当前得分

        Returns:
            是否提升难度
        """
        strategy_config = self.strategy_rules.get(context.strategy, {})
        difficulty_curve = strategy_config.get("difficulty_curve", "linear")

        if difficulty_curve == "linear":
            return current_score >= 75
        elif difficulty_curve == "aggressive":
            return current_score >= 70
        elif difficulty_curve == "steep":
            return current_score >= 80
        elif difficulty_curve == "gentle":
            return current_score >= 85
        elif difficulty_curve == "extreme":
            return current_score >= 75

        return current_score >= 75

    def get_question_allocation(
        self, context: StrategyContext
    ) -> Dict[str, int]:
        """
        获取问题分配

        Args:
            context: 策略上下文

        Returns:
            各类别问题数量
        """
        strategy_config = self.strategy_rules.get(context.strategy, {})
        time_allocation = strategy_config.get("time_allocation", {})
        total_questions = strategy_config.get("question_count", 5)

        allocation = {}
        for category, ratio in time_allocation.items():
            allocation[category] = max(1, int(total_questions * ratio))

        return allocation

    def generate_interview_summary(
        self, context: StrategyContext
    ) -> Dict[str, Any]:
        """
        生成面试总结建议

        Args:
            context: 策略上下文

        Returns:
            总结建议
        """
        if not context.performance_history:
            return {
                "overall_assessment": "暂无足够数据",
                "recommendation": "继续面试",
                "focus_areas": [],
            }

        # 计算总体表现
        all_scores = [p["score"] for p in context.performance_history]
        avg_score = sum(all_scores) / len(all_scores)
        max_score = max(all_scores)
        min_score = min(all_scores)

        # 识别优势和劣势领域
        dimension_scores = {}
        for perf in context.performance_history:
            dim = perf.get("dimension", "general")
            if dim not in dimension_scores:
                dimension_scores[dim] = []
            dimension_scores[dim].append(perf["score"])

        dimension_avg = {
            dim: sum(scores) / len(scores)
            for dim, scores in dimension_scores.items()
        }

        strong_areas = [dim for dim, score in dimension_avg.items() if score >= 80]
        weak_areas = [dim for dim, score in dimension_avg.items() if score < 60]

        # 生成评估
        if avg_score >= 85:
            assessment = "优秀候选人，技术能力突出"
            recommendation = "强烈推荐"
        elif avg_score >= 70:
            assessment = "良好候选人，符合预期"
            recommendation = "推荐"
        elif avg_score >= 60:
            assessment = "及格候选人，有提升空间"
            recommendation = "考虑"
        else:
            assessment = "不符合要求"
            recommendation = "不推荐"

        return {
            "overall_assessment": assessment,
            "recommendation": recommendation,
            "average_score": round(avg_score, 1),
            "score_range": f"{min_score}-{max_score}",
            "strong_areas": strong_areas,
            "weak_areas": weak_areas,
            "interview_strategy": context.strategy.value,
            "total_rounds": len(context.performance_history),
        }

    def adjust_strategy_mid_interview(
        self, context: StrategyContext, new_performance: Dict[str, Any]
    ) -> StrategyContext:
        """
        面试中动态调整策略

        Args:
            context: 当前策略上下文
            new_performance: 最新表现

        Returns:
            调整后的策略上下文
        """
        # 更新表现历史
        context.performance_history.append(new_performance)

        # 重新评估策略
        new_strategy = self.determine_strategy(context)

        if new_strategy != context.strategy:
            context.strategy = new_strategy
            # 更新关注领域
            strategy_config = self.strategy_rules.get(new_strategy, {})
            context.focus_areas = strategy_config.get("focus_areas", [])

        # 检查是否需要转换阶段
        next_phase = self.get_next_phase(context)
        if next_phase and next_phase != context.current_phase:
            context.current_phase = next_phase

        return context

"""
共享上下文模块

实现面试过程中智能体之间的信息共享机制。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from .base_interviewer import Answer, Evaluation, Question


@dataclass
class CandidateProfile:
    """候选人画像"""
    id: str = field(default_factory=lambda: str(uuid4()))
    name: str = ""
    email: str = ""
    phone: str = ""
    resume_summary: str = ""
    skills: List[str] = field(default_factory=list)
    experience_years: float = 0.0
    education: List[Dict[str, Any]] = field(default_factory=list)
    previous_roles: List[str] = field(default_factory=list)
    target_position: str = ""
    current_salary: str = ""
    expected_salary: str = ""
    notice_period: str = ""
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "name": self.name,
            "skills": self.skills,
            "experience_years": self.experience_years,
            "education": self.education,
            "previous_roles": self.previous_roles,
            "target_position": self.target_position,
            "strengths": self.strengths,
            "weaknesses": self.weaknesses,
        }


@dataclass
class InterviewTurn:
    """面试回合记录"""
    id: str = field(default_factory=lambda: str(uuid4()))
    round_number: int = 0
    agent_type: str = ""
    agent_name: str = ""
    question: Optional[Question] = None
    answer: Optional[Answer] = None
    evaluation: Optional[Evaluation] = None
    follow_up_questions: List[Question] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)
    duration: int = 0  # 回合持续时间（秒）


@dataclass
class InterviewMetrics:
    """面试指标"""
    total_questions: int = 0
    total_duration: int = 0  # 总时长（秒）
    average_answer_duration: float = 0.0
    average_score: float = 0.0
    score_trend: List[float] = field(default_factory=list)
    dimension_scores: Dict[str, List[float]] = field(default_factory=dict)
    agent_scores: Dict[str, List[float]] = field(default_factory=dict)


class SharedInterviewContext:
    """
    共享面试上下文

    管理面试过程中的共享信息，包括：
    - 候选人画像
    - 面试历史记录
    - 评估结果汇总
    - 实时状态信息
    """

    def __init__(self):
        self.session_id: str = str(uuid4())
        self.candidate_profile: Optional[CandidateProfile] = None
        self.interview_turns: List[InterviewTurn] = []
        self.current_round: int = 0
        self.current_agent_index: int = 0
        self.agent_order: List[str] = []
        self.metrics = InterviewMetrics()
        self.global_context: Dict[str, Any] = {}
        self.flags: Dict[str, bool] = {}
        self.notes: List[str] = []
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None

    def set_candidate_profile(self, profile: CandidateProfile):
        """设置候选人画像"""
        self.candidate_profile = profile

    def get_candidate_profile(self) -> Optional[CandidateProfile]:
        """获取候选人画像"""
        return self.candidate_profile

    def add_turn(self, turn: InterviewTurn) -> InterviewTurn:
        """添加面试回合"""
        turn.round_number = len(self.interview_turns) + 1
        self.interview_turns.append(turn)
        self._update_metrics(turn)
        return turn

    def get_turns(
        self,
        agent_type: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[InterviewTurn]:
        """
        获取面试回合

        Args:
            agent_type: 按智能体类型过滤
            limit: 限制返回数量

        Returns:
            面试回合列表
        """
        turns = self.interview_turns
        if agent_type:
            turns = [t for t in turns if t.agent_type == agent_type]
        if limit:
            turns = turns[-limit:]
        return turns

    def get_last_turn(self, agent_type: Optional[str] = None) -> Optional[InterviewTurn]:
        """获取最后一个回合"""
        turns = self.get_turns(agent_type=agent_type)
        return turns[-1] if turns else None

    def get_interview_history(self) -> List[Dict[str, Any]]:
        """获取面试历史（用于智能体决策）"""
        history = []
        for turn in self.interview_turns:
            history.append({
                "round": turn.round_number,
                "agent_type": turn.agent_type,
                "agent_name": turn.agent_name,
                "question": turn.question.content if turn.question else "",
                "question_category": turn.question.category if turn.question else "",
                "answer": turn.answer.content if turn.answer else "",
                "evaluation_score": turn.evaluation.score if turn.evaluation else 0,
                "evaluation_dimension": turn.evaluation.dimension if turn.evaluation else "",
                "duration": turn.duration,
            })
        return history

    def set_agent_order(self, agent_order: List[str]):
        """设置智能体轮询顺序"""
        self.agent_order = agent_order

    def get_next_agent(self) -> Optional[str]:
        """获取下一个智能体"""
        if not self.agent_order:
            return None
        self.current_agent_index = (self.current_agent_index + 1) % len(self.agent_order)
        return self.agent_order[self.current_agent_index]

    def get_current_agent(self) -> Optional[str]:
        """获取当前智能体"""
        if not self.agent_order:
            return None
        return self.agent_order[self.current_agent_index % len(self.agent_order)]

    def set_global_context(self, key: str, value: Any):
        """设置全局上下文"""
        self.global_context[key] = value

    def get_global_context(self, key: str, default: Any = None) -> Any:
        """获取全局上下文"""
        return self.global_context.get(key, default)

    def set_flag(self, flag: str, value: bool = True):
        """设置标志位"""
        self.flags[flag] = value

    def get_flag(self, flag: str, default: bool = False) -> bool:
        """获取标志位"""
        return self.flags.get(flag, default)

    def add_note(self, note: str):
        """添加备注"""
        self.notes.append(f"[{datetime.now().strftime('%H:%M:%S')}] {note}")

    def get_notes(self) -> List[str]:
        """获取所有备注"""
        return self.notes

    def start_interview(self):
        """开始面试"""
        self.start_time = datetime.now()

    def end_interview(self):
        """结束面试"""
        self.end_time = datetime.now()

    def get_duration(self) -> int:
        """获取面试时长（秒）"""
        if self.start_time:
            end = self.end_time or datetime.now()
            return int((end - self.start_time).total_seconds())
        return 0

    def get_summary(self) -> Dict[str, Any]:
        """获取面试摘要"""
        return {
            "session_id": self.session_id,
            "candidate_name": self.candidate_profile.name if self.candidate_profile else "",
            "total_turns": len(self.interview_turns),
            "duration": self.get_duration(),
            "average_score": self.metrics.average_score,
            "agent_order": self.agent_order,
            "flags": self.flags,
        }

    def get_evaluation_summary(self, weights: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
        """
        获取评估摘要（支持权重配置）

        Args:
            weights: 维度权重配置，如 {"system_design": 0.25, "technical_depth": 0.20}

        Returns:
            评估摘要
        """
        evaluations = []
        for turn in self.interview_turns:
            if turn.evaluation:
                evaluations.append({
                    "agent_type": turn.agent_type,
                    "dimension": turn.evaluation.dimension,
                    "score": turn.evaluation.score,
                    "confidence": turn.evaluation.confidence,
                })

        if not evaluations:
            return {
                "evaluations": [],
                "dimension_averages": {},
                "agent_averages": {},
                "overall_average": 0,
                "weighted_overall": 0,
            }

        # 按维度汇总
        dimension_scores = {}
        for eval in evaluations:
            dim = eval["dimension"]
            if dim not in dimension_scores:
                dimension_scores[dim] = []
            dimension_scores[dim].append(eval["score"])

        dimension_averages = {
            dim: sum(scores) / len(scores)
            for dim, scores in dimension_scores.items()
        }

        # 按智能体汇总
        agent_scores = {}
        for eval in evaluations:
            agent = eval["agent_type"]
            if agent not in agent_scores:
                agent_scores[agent] = []
            agent_scores[agent].append(eval["score"])

        agent_averages = {
            agent: sum(scores) / len(scores)
            for agent, scores in agent_scores.items()
        }

        # 计算简单平均分
        simple_average = sum(e["score"] for e in evaluations) / len(evaluations)

        # 计算加权平均分
        weighted_overall = self._calculate_weighted_score(
            dimension_averages, weights
        )

        return {
            "evaluations": evaluations,
            "dimension_averages": dimension_averages,
            "agent_averages": agent_averages,
            "overall_average": simple_average,
            "weighted_overall": weighted_overall,
            "weights_used": weights or self._get_default_weights(),
        }

    def _calculate_weighted_score(
        self,
        dimension_averages: Dict[str, float],
        weights: Optional[Dict[str, float]] = None
    ) -> float:
        """
        计算加权分数

        Args:
            dimension_averages: 各维度平均分
            weights: 权重配置

        Returns:
            加权总分
        """
        if not dimension_averages:
            return 0

        weights = weights or self._get_default_weights()

        total_weight = 0
        weighted_sum = 0

        for dimension, score in dimension_averages.items():
            weight = weights.get(dimension, 0.1)  # 默认权重0.1
            weighted_sum += score * weight
            total_weight += weight

        # 归一化
        if total_weight > 0:
            return weighted_sum / total_weight
        return 0

    def _get_default_weights(self) -> Dict[str, float]:
        """
        获取默认权重配置

        针对高薪职位的权重配置
        """
        return {
            # 系统设计（高薪职位核心）
            "system_design": 0.20,
            "scalability": 0.05,
            "availability": 0.05,
            "consistency": 0.05,
            "performance": 0.05,

            # 技术深度
            "technical_depth": 0.15,
            "coding_ability": 0.10,
            "problem_solving": 0.10,

            # 领导力（P7+必备）
            "leadership": 0.10,
            "technical_influence": 0.05,
            "cross_team_collaboration": 0.05,

            # 其他
            "communication": 0.05,
            "adaptability": 0.05,
            "cultural_fit": 0.05,
        }

    def _update_metrics(self, turn: InterviewTurn):
        """更新指标"""
        self.metrics.total_questions += 1
        if turn.evaluation:
            self.metrics.score_trend.append(turn.evaluation.score)
            self.metrics.average_score = sum(self.metrics.score_trend) / len(self.metrics.score_trend)

            # 更新维度分数
            dim = turn.evaluation.dimension
            if dim not in self.metrics.dimension_scores:
                self.metrics.dimension_scores[dim] = []
            self.metrics.dimension_scores[dim].append(turn.evaluation.score)

            # 更新智能体分数
            agent = turn.agent_type
            if agent not in self.metrics.agent_scores:
                self.metrics.agent_scores[agent] = []
            self.metrics.agent_scores[agent].append(turn.evaluation.score)

        if turn.duration > 0:
            total_duration = sum(t.duration for t in self.interview_turns)
            self.metrics.average_answer_duration = total_duration / len(self.interview_turns)

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "session_id": self.session_id,
            "candidate_profile": self.candidate_profile.to_dict() if self.candidate_profile else None,
            "total_turns": len(self.interview_turns),
            "duration": self.get_duration(),
            "metrics": {
                "total_questions": self.metrics.total_questions,
                "average_score": self.metrics.average_score,
                "dimension_scores": self.metrics.dimension_scores,
                "agent_scores": self.metrics.agent_scores,
            },
            "evaluation_summary": self.get_evaluation_summary(),
        }

    def reset(self):
        """重置上下文"""
        self.session_id = str(uuid4())
        self.candidate_profile = None
        self.interview_turns = []
        self.current_round = 0
        self.current_agent_index = 0
        self.agent_order = []
        self.metrics = InterviewMetrics()
        self.global_context = {}
        self.flags = {}
        self.notes = []
        self.start_time = None
        self.end_time = None

"""
基础面试官智能体

定义所有面试官智能体的基类，包含通用功能和接口。
"""

from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Any, AsyncGenerator, Dict, List, Optional, Union
from uuid import uuid4

from backend.core.agent import Agent


class InterviewerType(Enum):
    """面试官类型"""
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    HR = "hr"
    SYSTEM_DESIGN = "system_design"
    CODING = "coding"


class QuestionStrategy(Enum):
    """提问策略"""
    SEQUENTIAL = auto()      # 顺序提问
    ADAPTIVE = auto()        # 自适应提问
    DEPTH_FIRST = auto()     # 深度优先
    BREADTH_FIRST = auto()   # 广度优先
    PRESSURE = auto()        # 压力测试


class InterviewPhase(Enum):
    """面试阶段"""
    WARM_UP = "warm_up"           # 热身
    MAIN = "main"                 # 主要环节
    DEEP_DIVE = "deep_dive"       # 深入追问
    WRAP_UP = "wrap_up"           # 收尾


@dataclass
class Question:
    """面试问题"""
    id: str = field(default_factory=lambda: str(uuid4()))
    content: str = ""
    type: str = "general"         # 问题类型
    difficulty: int = 1           # 难度 1-5
    category: str = ""            # 分类
    expected_duration: int = 300  # 预期回答时长(秒)
    follow_up_questions: List[str] = field(default_factory=list)
    evaluation_criteria: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class Answer:
    """候选人回答"""
    question_id: str = ""
    content: str = ""
    duration: int = 0             # 回答时长(秒)
    confidence: float = 0.0       # 置信度
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class Evaluation:
    """评估结果"""
    question_id: str = ""
    score: float = 0.0            # 分数 0-100
    dimension: str = ""           # 评估维度
    feedback: str = ""            # 反馈
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)
    confidence: float = 0.0       # 评估置信度
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class InterviewerState:
    """面试官状态"""
    phase: InterviewPhase = InterviewPhase.WARM_UP
    current_question_index: int = 0
    questions_asked: List[str] = field(default_factory=list)
    evaluations: List[Evaluation] = field(default_factory=list)
    is_active: bool = False
    last_activity: datetime = field(default_factory=datetime.now)


class BaseInterviewerAgent(ABC):
    """
    基础面试官智能体

    所有具体面试官智能体的基类，定义通用接口和行为。
    """

    def __init__(
        self,
        agent: Agent,
        interviewer_type: InterviewerType,
        name: str,
        persona: str,
        weight: float = 1.0,
        question_strategy: QuestionStrategy = QuestionStrategy.ADAPTIVE,
    ):
        self.agent = agent
        self.interviewer_type = interviewer_type
        self.name = name
        self.persona = persona
        self.weight = weight
        self.question_strategy = question_strategy
        self.state = InterviewerState()
        self.question_pool: List[Question] = []
        self.context: Dict[str, Any] = {}

    @abstractmethod
    async def generate_question(
        self,
        candidate_profile: Dict[str, Any],
        interview_history: List[Dict[str, Any]],
    ) -> Question:
        """
        生成面试问题

        Args:
            candidate_profile: 候选人画像
            interview_history: 面试历史记录

        Returns:
            生成的面试问题
        """
        pass

    @abstractmethod
    async def evaluate_answer(
        self,
        question: Question,
        answer: Answer,
    ) -> Evaluation:
        """
        评估候选人回答

        Args:
            question: 问题
            answer: 回答

        Returns:
            评估结果
        """
        pass

    @abstractmethod
    def get_system_prompt(self) -> str:
        """获取系统提示词"""
        pass

    async def ask_question(self, question: Question) -> AsyncGenerator[Union[str, Dict[str, Any]], None]:
        """
        向候选人提问

        Args:
            question: 要问的问题

        Yields:
            问题内容流
        """
        self.state.questions_asked.append(question.id)
        self.state.last_activity = datetime.now()

        # 将问题添加到问题池，以便后续查找
        if question not in self.question_pool:
            self.question_pool.append(question)

        # 只发送问题内容，不调用 LLM 生成额外内容
        # 这样可以避免 LLM 生成开场白等不必要的内容
        yield {
            "type": "question",
            "content": question.content,
            "agent_type": self.interviewer_type.value,
            "agent_name": self.name,
        }

    async def process_answer(self, answer: Answer) -> Evaluation:
        """
        处理候选人回答并评估

        Args:
            answer: 候选人回答

        Returns:
            评估结果
        """
        question = self._get_question_by_id(answer.question_id)
        if not question:
            raise ValueError(f"Question not found: {answer.question_id}")

        evaluation = await self.evaluate_answer(question, answer)
        self.state.evaluations.append(evaluation)
        self.state.last_activity = datetime.now()

        return evaluation

    async def generate_follow_up(
        self,
        question: Question,
        answer: Answer,
        evaluation: Evaluation,
    ) -> Optional[Question]:
        """
        生成追问问题

        Args:
            question: 原问题
            answer: 候选人回答
            evaluation: 评估结果

        Returns:
            追问问题，如果不需要追问则返回None
        """
        if evaluation.score >= 85:
            return None

        prompt = f"""
基于以下信息生成一个追问问题：

原问题：{question.content}
候选人回答：{answer.content}
评估分数：{evaluation.score}/100
评估反馈：{evaluation.feedback}

请生成一个针对性的追问问题，深入挖掘候选人在该领域的理解深度。
追问应该：
1. 针对回答中的薄弱环节
2. 考察更深层次的理解
3. 保持专业和礼貌

只输出追问问题本身，不要有多余内容。
"""

        response = await self.agent.chat(prompt)

        if response and len(response.strip()) > 10:
            return Question(
                content=response.strip(),
                type="follow_up",
                difficulty=min(question.difficulty + 1, 5),
                category=question.category,
            )

        return None

    def get_score_summary(self) -> Dict[str, Any]:
        """
        获取评分摘要

        Returns:
            评分摘要
        """
        if not self.state.evaluations:
            return {
                "average_score": 0.0,
                "evaluations_count": 0,
                "dimensions": {},
            }

        scores = [e.score for e in self.state.evaluations]
        dimensions = {}

        for eval in self.state.evaluations:
            if eval.dimension not in dimensions:
                dimensions[eval.dimension] = []
            dimensions[eval.dimension].append(eval.score)

        dimension_averages = {
            dim: sum(scores) / len(scores)
            for dim, scores in dimensions.items()
        }

        return {
            "average_score": sum(scores) / len(scores),
            "evaluations_count": len(scores),
            "dimensions": dimension_averages,
            "weight": self.weight,
        }

    def reset(self):
        """重置面试官状态"""
        self.state = InterviewerState()
        self.question_pool = []
        self.context = {}

    def activate(self):
        """激活面试官"""
        self.state.is_active = True
        self.state.last_activity = datetime.now()

    def deactivate(self):
        """停用面试官"""
        self.state.is_active = False

    def _build_question_prompt(self, question: Question) -> str:
        """构建提问提示词"""
        return f"""
{self.get_system_prompt()}

当前面试阶段：{self.state.phase.value}
你的角色：{self.name}
人设：{self.persona}

请向候选人提出以下问题：
{question.content}

要求：
1. 保持专业和友好的态度
2. 根据候选人背景适当调整表达方式
3. 如果候选人需要澄清，可以提供适当的提示
4. 记录候选人的回答以便后续评估

请以自然的方式提出问题。
"""

    def _get_question_by_id(self, question_id: str) -> Optional[Question]:
        """根据ID获取问题"""
        for q in self.question_pool:
            if q.id == question_id:
                return q
        return None

    def update_context(self, key: str, value: Any):
        """更新上下文"""
        self.context[key] = value

    def get_context(self, key: str, default: Any = None) -> Any:
        """获取上下文"""
        return self.context.get(key, default)

    def should_transition_phase(self) -> bool:
        """判断是否应转换面试阶段"""
        if self.state.phase == InterviewPhase.WARM_UP:
            return len(self.state.questions_asked) >= 2
        elif self.state.phase == InterviewPhase.MAIN:
            return len(self.state.questions_asked) >= 5
        elif self.state.phase == InterviewPhase.DEEP_DIVE:
            return len(self.state.questions_asked) >= 8
        return False

    def transition_phase(self):
        """转换面试阶段"""
        phases = list(InterviewPhase)
        current_index = phases.index(self.state.phase)
        if current_index < len(phases) - 1:
            self.state.phase = phases[current_index + 1]

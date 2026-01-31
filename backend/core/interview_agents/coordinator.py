"""
智能体协调器

管理多个面试官智能体的协作流程。
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Any, AsyncGenerator, Dict, List, Optional, Union
from uuid import uuid4

from backend.core.agent import Agent

from .base_interviewer import (
    Answer,
    BaseInterviewerAgent,
    Evaluation,
    InterviewPhase,
    InterviewerType,
    Question,
)
from .behavioral_interviewer import BehavioralInterviewerAgent
from .hr_interviewer import HRInterviewerAgent
from .message_bus import MessageBus, MessagePriority, MessageType
from .shared_context import CandidateProfile, InterviewTurn, SharedInterviewContext
from .technical_interviewer import TechnicalInterviewerAgent
from .system_design_interviewer import SystemDesignInterviewerAgent
from .smart_question_generator import SmartQuestionGenerator, QuestionContext, QuestionCategory
from .deep_dive_engine import DeepDiveEngine, AnswerDepth
from .smart_strategy_engine import SmartStrategyEngine, StrategyContext, InterviewStrategy, InterviewPhase
from .learning_feedback_generator import LearningFeedbackGenerator
from .pressure_test_engine import PressureTestEngine, PressureTestConfig


class CoordinationMode(Enum):
    """协调模式"""
    SEQUENTIAL = auto()      # 顺序模式：智能体按顺序轮流
    COLLABORATIVE = auto()   # 协作模式：多智能体同时参与
    ARBITRATED = auto()      # 仲裁模式：主控智能体协调


class InterviewStatus(Enum):
    """面试状态"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


@dataclass
class InterviewConfig:
    """面试配置"""
    session_id: str = field(default_factory=lambda: str(uuid4()))
    mode: CoordinationMode = CoordinationMode.SEQUENTIAL
    total_rounds: int = 5
    max_duration: int = 3600  # 最大时长（秒）
    agent_order: List[InterviewerType] = field(default_factory=lambda: [
        InterviewerType.TECHNICAL,
        InterviewerType.SYSTEM_DESIGN,
        InterviewerType.BEHAVIORAL,
        InterviewerType.HR,
    ])
    enable_follow_up: bool = True
    enable_stress_test: bool = False
    enable_pressure_test: bool = False  # 启用压力测试
    pressure_test_level: str = "medium"  # low, medium, high
    auto_transition: bool = True
    demo_mode: bool = False  # 演示模式：自动回答
    demo_delay: int = 3  # 演示模式下自动回答的延迟（秒）
    enable_smart_questions: bool = True  # 启用智能问题生成
    enable_deep_dive: bool = True  # 启用深度追问
    enable_smart_strategy: bool = True  # 启用智能策略


class AgentCoordinator:
    """
    智能体协调器

    管理多个面试官智能体的协作，包括：
    - 智能体注册和管理
    - 面试流程控制
    - 消息协调
    - 状态管理
    """

    def __init__(
        self,
        config: Optional[InterviewConfig] = None,
        message_bus: Optional[MessageBus] = None,
    ):
        self.config = config or InterviewConfig()
        self.message_bus = message_bus or MessageBus()
        self.context = SharedInterviewContext()
        self.agents: Dict[str, BaseInterviewerAgent] = {}
        self.status = InterviewStatus.PENDING
        self.current_turn: Optional[InterviewTurn] = None
        self._event_callbacks: Dict[str, List[callable]] = {}
        self._lock = asyncio.Lock()

        # 智能引擎
        self.question_generator = SmartQuestionGenerator()
        self.deep_dive_engine = DeepDiveEngine()
        self.strategy_engine = SmartStrategyEngine()
        self.learning_feedback_generator = LearningFeedbackGenerator()
        self.pressure_test_engine = PressureTestEngine(
            PressureTestConfig(
                enabled=self.config.enable_pressure_test,
                level=self._parse_pressure_level(self.config.pressure_test_level),
            )
        )
        self.strategy_context: Optional[StrategyContext] = None
        self.performance_history: List[Dict[str, Any]] = []

        # 智能体问题计数
        self.agent_question_count: Dict[str, int] = {}
        self.current_agent_id: Optional[str] = None
        self.questions_per_agent: int = 2  # 每个智能体默认问2个问题

    def _parse_pressure_level(self, level: str):
        """解析压力等级"""
        from .pressure_test_engine import PressureLevel
        return PressureLevel(level) if level in ["low", "medium", "high"] else PressureLevel.MEDIUM

    def register_agent(self, agent: BaseInterviewerAgent) -> str:
        """
        注册智能体

        Args:
            agent: 要注册的智能体

        Returns:
            智能体ID
        """
        agent_id = f"{agent.interviewer_type.value}_{len(self.agents)}"
        self.agents[agent_id] = agent
        self.agent_question_count[agent_id] = 0

        # 订阅消息
        self.message_bus.subscribe(agent_id, self._create_message_handler(agent_id))

        return agent_id

    def unregister_agent(self, agent_id: str):
        """注销智能体"""
        if agent_id in self.agents:
            del self.agents[agent_id]

    async def initialize_interview(
        self,
        candidate_profile: CandidateProfile,
    ) -> bool:
        """
        初始化面试

        Args:
            candidate_profile: 候选人画像

        Returns:
            是否初始化成功
        """
        async with self._lock:
            if self.status != InterviewStatus.PENDING:
                return False

            # 设置上下文
            self.context.set_candidate_profile(candidate_profile)
            self.context.set_agent_order([
                agent.interviewer_type.value for agent in self.agents.values()
            ])

            # 启动消息总线
            await self.message_bus.start()

            # 初始化所有智能体
            for agent in self.agents.values():
                agent.reset()
                agent.update_context("candidate_profile", candidate_profile.to_dict())
                agent.update_context("session_id", self.config.session_id)

            self.status = InterviewStatus.IN_PROGRESS
            self.context.start_interview()

            # 广播面试开始消息
            await self.message_bus.broadcast(
                message_type=MessageType.SYSTEM,
                content={
                    "event": "interview_started",
                    "session_id": self.config.session_id,
                    "candidate_name": candidate_profile.name,
                },
                sender="coordinator",
            )

            return True

    async def run_interview_turn(
        self,
        candidate_answer: Optional[str] = None,
    ) -> AsyncGenerator[Union[str, Dict[str, Any]], None]:
        """
        运行一个面试回合（集成智能功能）

        Args:
            candidate_answer: 候选人的回答（如果是第一轮则为None）

        Yields:
            面试内容流
        """
        async with self._lock:
            if self.status != InterviewStatus.IN_PROGRESS:
                yield {"type": "error", "message": "面试未在进行中"}
                return

            # 处理候选人回答
            if candidate_answer and self.current_turn:
                answer = Answer(
                    question_id=self.current_turn.question.id if self.current_turn.question else "",
                    content=candidate_answer,
                    duration=0,
                )
                self.current_turn.answer = answer

                # 评估回答
                agent = self._get_current_agent()
                if agent:
                    evaluation = await agent.process_answer(answer)
                    self.current_turn.evaluation = evaluation

                    # 保存回合
                    self.context.add_turn(self.current_turn)

                    # 记录表现历史（用于智能策略）
                    self.performance_history.append({
                        "score": evaluation.score,
                        "dimension": evaluation.dimension,
                        "agent_type": agent.interviewer_type.value,
                    })

                    # 广播评估结果
                    await self.message_bus.broadcast(
                        message_type=MessageType.EVALUATION,
                        content={
                            "agent_type": agent.interviewer_type.value,
                            "score": evaluation.score,
                            "dimension": evaluation.dimension,
                        },
                        sender=agent.interviewer_type.value,
                    )

                    # 智能评估分析
                    smart_analysis = None
                    if self.config.enable_deep_dive:
                        smart_analysis = self.deep_dive_engine.analyze_answer(
                            question=self.current_turn.question.content,
                            answer=candidate_answer,
                            question_category=agent.interviewer_type.value,
                        )

                    evaluation_result = {
                        "type": "evaluation",
                        "agent_type": agent.interviewer_type.value,
                        "agent_name": agent.name,
                        "score": evaluation.score,
                        "feedback": evaluation.feedback,
                        "strengths": evaluation.strengths,
                        "weaknesses": evaluation.weaknesses,
                    }

                    # 添加智能分析结果
                    if smart_analysis:
                        evaluation_result["smart_analysis"] = {
                            "depth_level": smart_analysis.depth.name,
                            "depth_value": smart_analysis.depth.value,
                            "key_points": smart_analysis.key_points,
                            "missing_aspects": smart_analysis.missing_aspects,
                            "vague_areas": smart_analysis.vague_areas,
                            "answer_strengths": smart_analysis.strengths,
                            "answer_weaknesses": smart_analysis.weaknesses,
                            "follow_up_suggestions": smart_analysis.follow_up_suggestions,
                        }

                    yield evaluation_result

                    # 确定追问类型（优先级：深度追问 > 普通追问 > 无追问）
                    follow_up_type = self._determine_follow_up_type(
                        smart_analysis,
                        self.current_turn.evaluation if self.current_turn else None
                    )

                    if follow_up_type == "deep_dive":
                        # 智能深度追问
                        deep_follow_up = self.deep_dive_engine.generate_deep_dive_question(
                            analysis=smart_analysis,
                            original_question=self.current_turn.question.content,
                        )

                        if deep_follow_up:
                            # 更新追问计数
                            if not hasattr(self.current_turn, 'follow_up_count'):
                                self.current_turn.follow_up_count = 0
                            self.current_turn.follow_up_count += 1

                            self.current_turn = InterviewTurn(
                                agent_type=agent.interviewer_type.value,
                                agent_name=agent.name,
                                question=Question(content=deep_follow_up, type="deep_follow_up"),
                            )

                            yield {
                                "type": "deep_follow_up",
                                "agent_type": agent.interviewer_type.value,
                                "agent_name": agent.name,
                                "reason": "基于回答深度分析的智能追问",
                            }

                            async for chunk in agent.ask_question(self.current_turn.question):
                                yield chunk
                            return

                    elif follow_up_type == "standard":
                        # 普通追问（基于分数）
                        follow_up = await agent.generate_follow_up(
                            self.current_turn.question,
                            self.current_turn.answer,
                            self.current_turn.evaluation,
                        )
                        if follow_up:
                            self.current_turn = InterviewTurn(
                                agent_type=agent.interviewer_type.value,
                                agent_name=agent.name,
                                question=follow_up,
                            )

                            yield {
                                "type": "follow_up",
                                "agent_type": agent.interviewer_type.value,
                                "agent_name": agent.name,
                            }

                            async for chunk in agent.ask_question(follow_up):
                                yield chunk
                            return

            # 更新智能策略上下文
            if self.config.enable_smart_strategy and self.strategy_context:
                if self.performance_history:
                    self.strategy_context = self.strategy_engine.adjust_strategy_mid_interview(
                        self.strategy_context,
                        self.performance_history[-1]
                    )

            # 检查当前智能体是否还需要继续提问
            should_switch_agent = True
            if self.current_agent_id:
                current_count = self.agent_question_count.get(self.current_agent_id, 0)
                if current_count < self.questions_per_agent:
                    # 当前智能体还没问够，继续提问
                    should_switch_agent = False
                    agent = self.agents.get(self.current_agent_id)

            if should_switch_agent:
                # 切换到下一个智能体
                next_agent_id = self._get_next_agent_id()
                if not next_agent_id:
                    yield {"type": "error", "message": "没有可用的智能体"}
                    return

                self.current_agent_id = next_agent_id
                self.agent_question_count[next_agent_id] = 0

                agent = self.agents.get(next_agent_id)
                if not agent:
                    yield {"type": "error", "message": f"智能体 {next_agent_id} 未找到"}
                    return

                # 激活智能体
                agent.activate()

                # 发送智能体切换消息
                yield {
                    "type": "agent_switch",
                    "agent_type": agent.interviewer_type.value,
                    "agent_name": agent.name,
                    "persona": agent.persona,
                }
            else:
                # 继续使用当前智能体
                agent = self.agents.get(self.current_agent_id)

            # 生成问题（使用智能问题生成或原方法）
            if self.config.enable_smart_questions:
                question = await self._generate_smart_question(agent)
            else:
                question = await agent.generate_question(
                    candidate_profile=self.context.candidate_profile.to_dict() if self.context.candidate_profile else {},
                    interview_history=self.context.get_interview_history(),
                )

            # 增加问题计数
            if self.current_agent_id:
                self.agent_question_count[self.current_agent_id] += 1

            # 创建新回合
            self.current_turn = InterviewTurn(
                agent_type=agent.interviewer_type.value,
                agent_name=agent.name,
                question=question,
            )

            # 广播问题消息
            await self.message_bus.broadcast(
                message_type=MessageType.QUESTION,
                content={
                    "agent_type": agent.interviewer_type.value,
                    "agent_name": agent.name,
                    "question": question.content,
                },
                sender=agent.interviewer_type.value,
            )

            # 提问
            async for chunk in agent.ask_question(question):
                yield chunk

    async def _generate_smart_question(self, agent: BaseInterviewerAgent) -> Question:
        """生成智能问题"""
        # 构建问题上下文
        candidate_profile = self.context.candidate_profile

        # 确定问题类别
        category_map = {
            InterviewerType.TECHNICAL: QuestionCategory.TECHNICAL,
            InterviewerType.BEHAVIORAL: QuestionCategory.BEHAVIORAL,
        }
        category = category_map.get(agent.interviewer_type, QuestionCategory.TECHNICAL)

        # 构建历史问题列表
        previous_questions = []
        for turn in self.context.interview_turns:
            if turn.question:
                previous_questions.append({
                    "content": turn.question.content,
                    "difficulty": getattr(turn.question, 'difficulty', 2),
                    "skill": getattr(turn.question, 'category', 'general'),
                })

        # 计算表现趋势
        performance_trend = [p["score"] for p in self.performance_history]

        # 识别薄弱环节（得分低于60的领域）
        weak_areas = []
        strong_areas = []
        for perf in self.performance_history:
            if perf["score"] < 60:
                weak_areas.append(perf.get("dimension", "general"))
            elif perf["score"] >= 80:
                strong_areas.append(perf.get("dimension", "general"))

        # 创建问题上下文
        question_context = QuestionContext(
            candidate_level=self._determine_candidate_level(),
            skills=candidate_profile.skills if candidate_profile else [],
            experience_years=candidate_profile.experience_years if candidate_profile else 0,
            target_position=candidate_profile.target_position if candidate_profile else "",
            previous_questions=previous_questions,
            performance_trend=performance_trend,
            weak_areas=list(set(weak_areas)),
            strong_areas=list(set(strong_areas)),
        )

        # 生成智能问题
        smart_question = self.question_generator.generate_question(
            context=question_context,
            category=category,
        )

        question = Question(
            content=smart_question["content"],
            type=smart_question["category"],
            difficulty=smart_question["difficulty"],
            category=smart_question["skill"],
        )

        # 将问题添加到 agent 的问题池
        agent.question_pool.append(question)

        return question

    def _determine_follow_up_type(
        self,
        smart_analysis: Optional[Any],
        evaluation: Optional[Any]
    ) -> str:
        """
        确定追问类型

        优先级：深度追问 > 普通追问 > 无追问

        Returns:
            "deep_dive": 深度追问
            "standard": 普通追问
            "none": 无需追问
        """
        # 检查是否启用深度追问
        if not self.config.enable_deep_dive:
            # 只考虑普通追问
            if (self.config.enable_follow_up and
                evaluation and
                evaluation.score < 85):
                return "standard"
            return "none"

        # 检查深度追问条件
        if smart_analysis:
            follow_up_count = getattr(self.current_turn, 'follow_up_count', 0)
            should_deep_dive = self.deep_dive_engine.should_continue_deep_dive(
                smart_analysis,
                follow_up_count=follow_up_count,
                max_follow_ups=2,
            )

            if should_deep_dive:
                return "deep_dive"

        # 检查普通追问条件（深度追问不满足时）
        if (self.config.enable_follow_up and
            evaluation and
            evaluation.score < 85):
            return "standard"

        return "none"

    def _determine_candidate_level(self) -> str:
        """确定候选人级别"""
        if not self.performance_history:
            # 根据经验判断
            candidate_profile = self.context.candidate_profile
            if candidate_profile:
                if candidate_profile.experience_years >= 8:
                    return "expert"
                elif candidate_profile.experience_years >= 5:
                    return "senior"
                elif candidate_profile.experience_years >= 2:
                    return "mid"
            return "junior"

        # 根据表现判断
        avg_score = sum(p["score"] for p in self.performance_history) / len(self.performance_history)
        if avg_score >= 90:
            return "expert"
        elif avg_score >= 80:
            return "senior"
        elif avg_score >= 60:
            return "mid"
        return "junior"

    async def end_interview(self) -> Dict[str, Any]:
        """
        结束面试

        Returns:
            面试结果摘要（包含个性化学习反馈）
        """
        async with self._lock:
            if self.status not in [InterviewStatus.IN_PROGRESS, InterviewStatus.PAUSED]:
                return {"error": "面试未在进行中"}

            self.status = InterviewStatus.COMPLETED
            self.context.end_interview()

            # 停用所有智能体
            for agent in self.agents.values():
                agent.deactivate()

            # 停止消息总线
            await self.message_bus.stop()

            # 广播面试结束消息
            await self.message_bus.broadcast(
                message_type=MessageType.SYSTEM,
                content={
                    "event": "interview_completed",
                    "session_id": self.config.session_id,
                    "duration": self.context.get_duration(),
                },
                sender="coordinator",
            )

            # 生成面试结果
            result = self.get_interview_result()

            # 生成个性化学习反馈
            learning_feedback = self._generate_learning_feedback()
            result["learning_feedback"] = learning_feedback

            return result

    def _generate_learning_feedback(self) -> Dict[str, Any]:
        """生成个性化学习反馈"""
        # 准备评估结果
        evaluation_results = []
        for turn in self.context.interview_turns:
            if turn.evaluation:
                evaluation_results.append({
                    "dimension": turn.evaluation.dimension,
                    "score": turn.evaluation.score,
                    "feedback": turn.evaluation.feedback,
                })

        # 获取候选人信息
        candidate_profile = self.context.candidate_profile
        target_position = candidate_profile.target_position if candidate_profile else ""
        experience_years = candidate_profile.experience_years if candidate_profile else 0

        # 生成反馈
        feedback = self.learning_feedback_generator.generate_feedback(
            evaluation_results=evaluation_results,
            target_position=target_position,
            experience_years=experience_years,
        )

        # 转换为字典
        return self.learning_feedback_generator.to_dict(feedback)

    def get_interview_result(self) -> Dict[str, Any]:
        """获取面试结果"""
        evaluation_summary = self.context.get_evaluation_summary()

        return {
            "session_id": self.config.session_id,
            "status": self.status.value,
            "candidate_profile": self.context.candidate_profile.to_dict() if self.context.candidate_profile else None,
            "duration": self.context.get_duration(),
            "total_turns": len(self.context.interview_turns),
            "evaluation_summary": evaluation_summary,
            "agent_scores": {
                agent_id: agent.get_score_summary()
                for agent_id, agent in self.agents.items()
            },
            "overall_score": evaluation_summary.get("overall_average", 0),
            "notes": self.context.get_notes(),
        }

    def get_current_status(self) -> Dict[str, Any]:
        """获取当前状态"""
        current_agent = self._get_current_agent()

        return {
            "status": self.status.value,
            "current_agent": {
                "type": current_agent.interviewer_type.value if current_agent else None,
                "name": current_agent.name if current_agent else None,
            },
            "current_turn": self.current_turn.round_number if self.current_turn else 0,
            "total_turns": len(self.context.interview_turns),
            "duration": self.context.get_duration(),
        }

    def pause_interview(self) -> bool:
        """暂停面试"""
        if self.status == InterviewStatus.IN_PROGRESS:
            self.status = InterviewStatus.PAUSED
            return True
        return False

    def resume_interview(self) -> bool:
        """恢复面试"""
        if self.status == InterviewStatus.PAUSED:
            self.status = InterviewStatus.IN_PROGRESS
            return True
        return False

    def cancel_interview(self) -> bool:
        """取消面试"""
        if self.status in [InterviewStatus.PENDING, InterviewStatus.IN_PROGRESS, InterviewStatus.PAUSED]:
            self.status = InterviewStatus.CANCELLED
            return True
        return False

    def _get_current_agent(self) -> Optional[BaseInterviewerAgent]:
        """获取当前智能体"""
        current_agent_type = self.context.get_current_agent()
        if not current_agent_type:
            return None

        for agent in self.agents.values():
            if agent.interviewer_type.value == current_agent_type:
                return agent
        return None

    def _get_next_agent_id(self) -> Optional[str]:
        """获取下一个智能体ID"""
        if not self.context.agent_order:
            return None

        next_agent_type = self.context.get_next_agent()
        if not next_agent_type:
            return None

        for agent_id, agent in self.agents.items():
            if agent.interviewer_type.value == next_agent_type:
                return agent_id
        return None

    def _create_message_handler(self, agent_id: str):
        """创建消息处理器"""
        async def handler(message):
            # 处理接收到的消息
            if message.type == MessageType.HANDOFF:
                # 处理交接请求
                if message.receiver == agent_id:
                    await self._handle_handoff(agent_id, message.content)
            elif message.type == MessageType.FOLLOW_UP:
                # 处理追问请求
                await self._handle_follow_up_request(agent_id, message.content)

        return handler

    async def _handle_handoff(self, agent_id: str, content: Dict[str, Any]):
        """处理交接"""
        # 实现交接逻辑
        pass

    async def _handle_follow_up_request(self, agent_id: str, content: Dict[str, Any]):
        """处理追问请求"""
        # 实现追问协调逻辑
        pass

    def on_event(self, event: str, callback: callable):
        """注册事件回调"""
        if event not in self._event_callbacks:
            self._event_callbacks[event] = []
        self._event_callbacks[event].append(callback)

    def _trigger_event(self, event: str, data: Any):
        """触发事件"""
        if event in self._event_callbacks:
            for callback in self._event_callbacks[event]:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        asyncio.create_task(callback(data))
                    else:
                        callback(data)
                except Exception as e:
                    print(f"Error triggering event {event}: {e}")

    @classmethod
    def create_default_coordinator(
        cls,
        base_agent: Agent,
        config: Optional[InterviewConfig] = None,
    ) -> "AgentCoordinator":
        """
        创建默认协调器

        Args:
            base_agent: 基础智能体
            config: 面试配置

        Returns:
            配置好的协调器
        """
        coordinator = cls(config=config)

        # 创建并注册默认智能体
        technical_agent = TechnicalInterviewerAgent(
            agent=base_agent,
            name="技术面试官",
            tech_stack=["Python", "JavaScript", "React", "FastAPI"],
        )
        coordinator.register_agent(technical_agent)

        system_design_agent = SystemDesignInterviewerAgent(
            agent=base_agent,
            name="系统设计面试官",
        )
        coordinator.register_agent(system_design_agent)

        behavioral_agent = BehavioralInterviewerAgent(
            agent=base_agent,
            name="行为面试官",
            company_values=["诚信", "创新", "协作", "卓越"],
        )
        coordinator.register_agent(behavioral_agent)

        hr_agent = HRInterviewerAgent(
            agent=base_agent,
            name="HR面试官",
        )
        coordinator.register_agent(hr_agent)

        return coordinator

"""
面试会话管理

管理面试会话的生命周期和状态。
"""

from __future__ import annotations

import json
import sqlite3
from dataclasses import asdict, dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from backend.core.interview_agents import (
    AgentCoordinator,
    CandidateProfile,
    InterviewConfig,
)


class SessionStatus(Enum):
    """会话状态"""
    CREATED = "created"
    INITIALIZING = "initializing"
    READY = "ready"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ERROR = "error"


@dataclass
class SessionMetadata:
    """会话元数据"""
    session_id: str = field(default_factory=lambda: str(uuid4()))
    candidate_id: str = ""
    job_position_id: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: SessionStatus = SessionStatus.CREATED
    current_round: int = 0
    total_rounds: int = 5
    duration: int = 0  # 时长（秒）


class InterviewSession:
    """
    面试会话

    封装单个面试会话的所有信息和操作。
    """

    def __init__(
        self,
        session_id: Optional[str] = None,
        coordinator: Optional[AgentCoordinator] = None,
        config: Optional[InterviewConfig] = None,
    ):
        self.metadata = SessionMetadata(session_id=session_id or str(uuid4()))
        self.coordinator = coordinator
        self.config = config or InterviewConfig(session_id=self.metadata.session_id)
        self.candidate_profile: Optional[CandidateProfile] = None
        self._data: Dict[str, Any] = {}

    async def initialize(
        self,
        candidate_profile: CandidateProfile,
    ) -> bool:
        """
        初始化会话

        Args:
            candidate_profile: 候选人画像

        Returns:
            是否初始化成功
        """
        try:
            self.metadata.status = SessionStatus.INITIALIZING
            self.candidate_profile = candidate_profile

            if not self.coordinator:
                from backend.core.agent import Agent
                base_agent = Agent(name="InterviewAgent")
                self.coordinator = AgentCoordinator.create_default_coordinator(
                    base_agent=base_agent,
                    config=self.config,
                )

            success = await self.coordinator.initialize_interview(candidate_profile)
            if success:
                self.metadata.status = SessionStatus.READY
                self.metadata.started_at = datetime.now()
                return True
            else:
                self.metadata.status = SessionStatus.ERROR
                return False

        except Exception as e:
            self.metadata.status = SessionStatus.ERROR
            self._data["error"] = str(e)
            return False

    async def start(self) -> bool:
        """开始面试"""
        if self.metadata.status == SessionStatus.READY:
            self.metadata.status = SessionStatus.IN_PROGRESS
            return True
        # 幂等性：如果已经是进行中状态，也返回成功
        if self.metadata.status == SessionStatus.IN_PROGRESS:
            return True
        return False

    async def process_turn(self, candidate_answer: Optional[str] = None):
        """
        处理一个面试回合

        Args:
            candidate_answer: 候选人回答

        Yields:
            面试内容流
        """
        if self.metadata.status != SessionStatus.IN_PROGRESS:
            yield {"type": "error", "message": "会话不在进行中状态"}
            return

        if not self.coordinator:
            yield {"type": "error", "message": "协调器未初始化"}
            return

        # 检查是否已达到最大轮数
        if self.metadata.current_round >= self.metadata.total_rounds:
            yield {"type": "status", "message": "面试已达到最大轮数"}
            result = await self.complete()
            yield {"type": "completed", "result": result}
            return

        # 处理当前回合（提问或回答）
        question_received = False
        async for chunk in self.coordinator.run_interview_turn(candidate_answer):
            yield chunk
            # 检测到问题消息，标记已收到问题
            if isinstance(chunk, dict) and chunk.get("type") == "question":
                question_received = True

        self.metadata.current_round += 1
        self._update_duration()

        # 演示模式：如果刚收到问题，自动生成回答并继续下一轮
        if self.config.demo_mode and question_received and self.metadata.current_round < self.metadata.total_rounds:
            # 延迟一段时间模拟用户思考
            import asyncio
            await asyncio.sleep(self.config.demo_delay)

            # 生成模拟回答
            demo_answer = self._generate_demo_answer()
            yield {
                "type": "demo_answer",
                "content": demo_answer,
                "message": "[演示模式] 自动生成回答"
            }

            # 继续处理下一轮（提交回答）
            async for chunk in self.process_turn(demo_answer):
                yield chunk

    def _generate_demo_answer(self) -> str:
        """生成演示模式的模拟回答"""
        import random

        # 根据候选人画像生成相关回答
        skills = []
        if self.candidate_profile and self.candidate_profile.skills:
            skills = self.candidate_profile.skills

        demo_answers = [
            "这是一个很好的问题。让我分享一下我的相关经验...",
            "在我的上一份工作中，我遇到过类似的情况...",
            "我认为这个问题可以从几个方面来考虑...",
            "根据我的经验，我通常会采用以下方法...",
            "这是一个很有挑战性的问题。我的思路是...",
        ]

        if skills:
            skill = random.choice(skills)
            demo_answers.extend([
                f"我在{skill}方面有3年的实践经验，曾经参与过多个相关项目...",
                f"关于{skill}，我熟悉其核心概念和最佳实践...",
                f"使用{skill}时，我会特别注意性能和可维护性...",
            ])

        return random.choice(demo_answers)

    async def pause(self) -> bool:
        """暂停面试"""
        if self.coordinator and self.coordinator.pause_interview():
            self.metadata.status = SessionStatus.PAUSED
            return True
        return False

    async def resume(self) -> bool:
        """恢复面试"""
        if self.coordinator and self.coordinator.resume_interview():
            self.metadata.status = SessionStatus.IN_PROGRESS
            return True
        return False

    async def complete(self) -> Dict[str, Any]:
        """
        完成面试

        Returns:
            面试结果
        """
        if not self.coordinator:
            return {"error": "协调器未初始化"}

        result = await self.coordinator.end_interview()
        self.metadata.status = SessionStatus.COMPLETED
        self.metadata.completed_at = datetime.now()
        self._update_duration()
        return result

    async def cancel(self) -> bool:
        """取消面试"""
        if self.coordinator and self.coordinator.cancel_interview():
            self.metadata.status = SessionStatus.CANCELLED
            return True
        return False

    def get_status(self) -> Dict[str, Any]:
        """获取会话状态"""
        self._update_duration()

        status = {
            "session_id": self.metadata.session_id,
            "status": self.metadata.status.value,
            "current_round": self.metadata.current_round,
            "total_rounds": self.metadata.total_rounds,
            "duration": self.metadata.duration,
        }

        if self.coordinator:
            coordinator_status = self.coordinator.get_current_status()
            status.update(coordinator_status)

        return status

    def get_result(self) -> Optional[Dict[str, Any]]:
        """获取面试结果"""
        if self.coordinator:
            return self.coordinator.get_interview_result()
        return None

    def _update_duration(self):
        """更新时长"""
        if self.metadata.started_at:
            end_time = self.metadata.completed_at or datetime.now()
            self.metadata.duration = int((end_time - self.metadata.started_at).total_seconds())

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "metadata": {
                "session_id": self.metadata.session_id,
                "candidate_id": self.metadata.candidate_id,
                "job_position_id": self.metadata.job_position_id,
                "status": self.metadata.status.value,
                "current_round": self.metadata.current_round,
                "total_rounds": self.metadata.total_rounds,
                "duration": self.metadata.duration,
                "created_at": self.metadata.created_at.isoformat(),
                "started_at": self.metadata.started_at.isoformat() if self.metadata.started_at else None,
                "completed_at": self.metadata.completed_at.isoformat() if self.metadata.completed_at else None,
            },
            "candidate_profile": self.candidate_profile.to_dict() if self.candidate_profile else None,
            "result": self.get_result(),
        }


class InterviewSessionManager:
    """
    面试会话管理器

    管理所有面试会话的创建、存储和检索。
    """

    def __init__(self, db_path: str = ":memory:"):
        self.db_path = db_path
        self._sessions: Dict[str, InterviewSession] = {}
        self._init_db()

    def _init_db(self):
        """初始化数据库"""
        if self.db_path != ":memory:":
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS interview_sessions (
                    session_id TEXT PRIMARY KEY,
                    candidate_id TEXT,
                    job_position_id TEXT,
                    status TEXT,
                    data TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            conn.close()

    def create_session(
        self,
        candidate_id: str = "",
        job_position_id: str = "",
        config: Optional[InterviewConfig] = None,
    ) -> InterviewSession:
        """
        创建新会话

        Args:
            candidate_id: 候选人ID
            job_position_id: 职位ID
            config: 面试配置

        Returns:
            新创建的会话
        """
        session = InterviewSession(config=config)
        session.metadata.candidate_id = candidate_id
        session.metadata.job_position_id = job_position_id

        self._sessions[session.metadata.session_id] = session

        # 保存到数据库
        self._save_session(session)

        return session

    def get_session(self, session_id: str) -> Optional[InterviewSession]:
        """
        获取会话

        Args:
            session_id: 会话ID

        Returns:
            会话对象，如果不存在则返回None
        """
        # 先从内存获取
        if session_id in self._sessions:
            return self._sessions[session_id]

        # 从数据库加载
        return self._load_session(session_id)

    def list_sessions(
        self,
        candidate_id: Optional[str] = None,
        status: Optional[SessionStatus] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        列会话

        Args:
            candidate_id: 按候选人ID过滤
            status: 按状态过滤
            limit: 返回数量限制

        Returns:
            会话列表
        """
        sessions = []

        for session in self._sessions.values():
            if candidate_id and session.metadata.candidate_id != candidate_id:
                continue
            if status and session.metadata.status != status:
                continue
            sessions.append(session.to_dict())

        return sessions[:limit]

    def delete_session(self, session_id: str) -> bool:
        """
        删除会话

        Args:
            session_id: 会话ID

        Returns:
            是否删除成功
        """
        if session_id in self._sessions:
            del self._sessions[session_id]

        # 从数据库删除
        if self.db_path != ":memory:":
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM interview_sessions WHERE session_id = ?",
                (session_id,)
            )
            conn.commit()
            conn.close()

        return True

    def _save_session(self, session: InterviewSession):
        """保存会话到数据库"""
        if self.db_path == ":memory:":
            return

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        data = json.dumps(session.to_dict())

        cursor.execute("""
            INSERT OR REPLACE INTO interview_sessions
            (session_id, candidate_id, job_position_id, status, data, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (
            session.metadata.session_id,
            session.metadata.candidate_id,
            session.metadata.job_position_id,
            session.metadata.status.value,
            data,
        ))

        conn.commit()
        conn.close()

    def _load_session(self, session_id: str) -> Optional[InterviewSession]:
        """从数据库加载会话"""
        if self.db_path == ":memory:":
            return None

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            "SELECT data FROM interview_sessions WHERE session_id = ?",
            (session_id,)
        )
        row = cursor.fetchone()
        conn.close()

        if row:
            data = json.loads(row[0])
            session = InterviewSession(session_id=session_id)
            # 恢复数据
            session.metadata.status = SessionStatus(data["metadata"]["status"])
            session.metadata.current_round = data["metadata"]["current_round"]
            session.metadata.duration = data["metadata"]["duration"]
            return session

        return None

    def cleanup_expired_sessions(self, max_age_hours: int = 24):
        """
        清理过期会话

        Args:
            max_age_hours: 最大存活时间（小时）
        """
        expired_ids = []
        now = datetime.now()

        for session_id, session in self._sessions.items():
            age = (now - session.metadata.created_at).total_seconds() / 3600
            if age > max_age_hours and session.metadata.status in [
                SessionStatus.COMPLETED,
                SessionStatus.CANCELLED,
            ]:
                expired_ids.append(session_id)

        for session_id in expired_ids:
            del self._sessions[session_id]

        # 清理数据库
        if self.db_path != ":memory:":
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM interview_sessions
                WHERE status IN ('completed', 'cancelled')
                AND updated_at < datetime('now', '-{} hours')
            """.format(max_age_hours))
            conn.commit()
            conn.close()

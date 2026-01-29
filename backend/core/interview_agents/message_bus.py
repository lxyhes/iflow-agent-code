"""
消息总线模块

实现智能体之间的异步消息通信机制。
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Any, Callable, Dict, List, Optional
from uuid import uuid4


class MessageType(Enum):
    """消息类型"""
    QUESTION = auto()           # 问题消息
    ANSWER = auto()             # 回答消息
    EVALUATION = auto()         # 评估结果
    HANDOFF = auto()            # 交接请求
    FOLLOW_UP = auto()          # 追问请求
    CONTEXT_UPDATE = auto()     # 上下文更新
    PHASE_CHANGE = auto()       # 阶段变更
    SYSTEM = auto()             # 系统消息


class MessagePriority(Enum):
    """消息优先级"""
    HIGH = 1
    NORMAL = 2
    LOW = 3


@dataclass
class Message:
    """消息数据结构"""
    id: str = field(default_factory=lambda: str(uuid4()))
    type: MessageType = MessageType.SYSTEM
    sender: str = ""                    # 发送者ID
    receiver: Optional[str] = None      # 接收者ID，None表示广播
    content: Dict[str, Any] = field(default_factory=dict)
    priority: MessagePriority = MessagePriority.NORMAL
    timestamp: datetime = field(default_factory=datetime.now)
    correlation_id: Optional[str] = None  # 关联消息ID（用于追踪对话）


class MessageBus:
    """
    消息总线

    实现智能体之间的异步消息通信，支持：
    - 点对点消息
    - 广播消息
    - 消息订阅
    - 消息队列
    """

    def __init__(self):
        self._subscribers: Dict[str, List[Callable[[Message], None]]] = {}
        self._message_queue: asyncio.Queue = asyncio.Queue()
        self._message_history: List[Message] = []
        self._max_history = 1000
        self._running = False
        self._dispatcher_task: Optional[asyncio.Task] = None

    async def start(self):
        """启动消息总线"""
        if self._running:
            return

        self._running = True
        self._dispatcher_task = asyncio.create_task(self._dispatcher())

    async def stop(self):
        """停止消息总线"""
        self._running = False
        if self._dispatcher_task:
            self._dispatcher_task.cancel()
            try:
                await self._dispatcher_task
            except asyncio.CancelledError:
                pass

    async def publish(self, message: Message) -> bool:
        """
        发布消息

        Args:
            message: 要发布的消息

        Returns:
            是否成功加入队列
        """
        if not self._running:
            return False

        await self._message_queue.put(message)
        return True

    def subscribe(
        self,
        agent_id: str,
        callback: Callable[[Message], None],
    ) -> Callable[[], None]:
        """
        订阅消息

        Args:
            agent_id: 订阅者ID
            callback: 消息回调函数

        Returns:
            取消订阅函数
        """
        if agent_id not in self._subscribers:
            self._subscribers[agent_id] = []

        self._subscribers[agent_id].append(callback)

        def unsubscribe():
            if agent_id in self._subscribers:
                self._subscribers[agent_id].remove(callback)

        return unsubscribe

    async def send_to(
        self,
        receiver: str,
        message_type: MessageType,
        content: Dict[str, Any],
        sender: str = "system",
        priority: MessagePriority = MessagePriority.NORMAL,
        correlation_id: Optional[str] = None,
    ) -> bool:
        """
        发送点对点消息

        Args:
            receiver: 接收者ID
            message_type: 消息类型
            content: 消息内容
            sender: 发送者ID
            priority: 优先级
            correlation_id: 关联ID

        Returns:
            是否成功发送
        """
        message = Message(
            type=message_type,
            sender=sender,
            receiver=receiver,
            content=content,
            priority=priority,
            correlation_id=correlation_id,
        )
        return await self.publish(message)

    async def broadcast(
        self,
        message_type: MessageType,
        content: Dict[str, Any],
        sender: str = "system",
        priority: MessagePriority = MessagePriority.NORMAL,
        exclude: Optional[List[str]] = None,
    ) -> int:
        """
        广播消息

        Args:
            message_type: 消息类型
            content: 消息内容
            sender: 发送者ID
            priority: 优先级
            exclude: 排除的接收者列表

        Returns:
            成功发送的数量
        """
        message = Message(
            type=message_type,
            sender=sender,
            receiver=None,  # 广播
            content=content,
            priority=priority,
        )

        success_count = 0
        exclude_set = set(exclude or [])

        for agent_id in self._subscribers:
            if agent_id not in exclude_set:
                msg_copy = Message(
                    id=message.id,
                    type=message.type,
                    sender=message.sender,
                    receiver=agent_id,
                    content=message.content,
                    priority=message.priority,
                    timestamp=message.timestamp,
                    correlation_id=message.correlation_id,
                )
                if await self.publish(msg_copy):
                    success_count += 1

        return success_count

    async def _dispatcher(self):
        """消息分发器"""
        while self._running:
            try:
                message: Message = await asyncio.wait_for(
                    self._message_queue.get(),
                    timeout=1.0
                )

                # 保存到历史
                self._message_history.append(message)
                if len(self._message_history) > self._max_history:
                    self._message_history = self._message_history[-self._max_history:]

                # 分发消息
                await self._deliver_message(message)

            except asyncio.TimeoutError:
                continue
            except Exception as e:
                print(f"Message bus dispatcher error: {e}")

    async def _deliver_message(self, message: Message):
        """投递消息到订阅者"""
        if message.receiver:
            # 点对点消息
            if message.receiver in self._subscribers:
                for callback in self._subscribers[message.receiver]:
                    try:
                        if asyncio.iscoroutinefunction(callback):
                            await callback(message)
                        else:
                            callback(message)
                    except Exception as e:
                        print(f"Error delivering message to {message.receiver}: {e}")
        else:
            # 广播消息
            for agent_id, callbacks in self._subscribers.items():
                if agent_id != message.sender:
                    for callback in callbacks:
                        try:
                            if asyncio.iscoroutinefunction(callback):
                                await callback(message)
                            else:
                                callback(message)
                        except Exception as e:
                            print(f"Error broadcasting message to {agent_id}: {e}")

    def get_message_history(
        self,
        message_type: Optional[MessageType] = None,
        sender: Optional[str] = None,
        receiver: Optional[str] = None,
        limit: int = 100,
    ) -> List[Message]:
        """
        获取消息历史

        Args:
            message_type: 过滤消息类型
            sender: 过滤发送者
            receiver: 过滤接收者
            limit: 返回数量限制

        Returns:
            消息列表
        """
        filtered = self._message_history

        if message_type:
            filtered = [m for m in filtered if m.type == message_type]
        if sender:
            filtered = [m for m in filtered if m.sender == sender]
        if receiver:
            filtered = [m for m in filtered if m.receiver == receiver]

        return filtered[-limit:]

    def clear_history(self):
        """清空消息历史"""
        self._message_history = []

    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return {
            "subscribers_count": len(self._subscribers),
            "message_count": len(self._message_history),
            "queue_size": self._message_queue.qsize(),
            "is_running": self._running,
        }

"""
Agent 执行链路追踪

提供完整的 Agent 执行过程追踪和可视化能力：
- ReAct 循环步骤追踪
- 技能调用链路
- 决策过程记录
- 性能指标采集
"""

import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Callable
from enum import Enum, auto
from collections import defaultdict


class TraceEventType(Enum):
    """追踪事件类型"""
    REACT_THOUGHT = auto()
    REACT_ACTION = auto()
    REACT_OBSERVATION = auto()
    REACT_ANSWER = auto()
    SKILL_CALL = auto()
    SKILL_RESULT = auto()
    DECISION_START = auto()
    DECISION_OPINION = auto()
    DECISION_END = auto()
    LLM_CALL = auto()
    LLM_RESPONSE = auto()
    ERROR = auto()


@dataclass
class TraceEvent:
    """追踪事件"""
    event_type: TraceEventType
    timestamp: float
    duration_ms: float
    data: Dict[str, Any]
    parent_id: Optional[str] = None
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))


@dataclass
class ExecutionTrace:
    """
    执行链路
    
    记录一次完整的 Agent 执行过程
    """
    trace_id: str
    agent_id: str
    session_id: Optional[str]
    start_time: float
    end_time: Optional[float] = None
    events: List[TraceEvent] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def add_event(self, event: TraceEvent):
        """添加事件"""
        self.events.append(event)
    
    def finish(self):
        """完成追踪"""
        self.end_time = time.time()
    
    def get_duration_ms(self) -> float:
        """获取总耗时（毫秒）"""
        end = self.end_time or time.time()
        return (end - self.start_time) * 1000
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "trace_id": self.trace_id,
            "agent_id": self.agent_id,
            "session_id": self.session_id,
            "duration_ms": self.get_duration_ms(),
            "event_count": len(self.events),
            "events": [
                {
                    "event_id": e.event_id,
                    "type": e.event_type.name,
                    "timestamp": e.timestamp,
                    "duration_ms": e.duration_ms,
                    "data": e.data,
                    "parent_id": e.parent_id,
                }
                for e in self.events
            ],
            "metadata": self.metadata,
        }


class AgentExecutionTracer:
    """
    Agent 执行链路追踪器
    
    提供：
    - 自动追踪 ReAct 循环
    - 技能调用链路记录
    - 性能指标采集
    - 决策过程可视化数据
    
    使用示例：
        tracer = AgentExecutionTracer()
        
        with tracer.start_trace("agent_1", "session_123") as trace:
            # 执行 ReAct 循环
            result = await agent.react_loop(query)
            
        # 获取可视化数据
        viz_data = tracer.get_visualization_data(trace.trace_id)
    """
    
    def __init__(self, max_traces: int = 1000):
        self.max_traces = max_traces
        self._traces: Dict[str, ExecutionTrace] = {}
        self._current_trace: Optional[ExecutionTrace] = None
        self._event_stack: List[str] = []  # 用于追踪嵌套事件
        
        # 统计信息
        self._stats = {
            "total_traces": 0,
            "total_events": 0,
            "event_counts": defaultdict(int),
            "avg_duration_ms": 0,
        }
    
    def start_trace(
        self,
        agent_id: str,
        session_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ExecutionTrace:
        """
        开始新的执行链路追踪
        
        Args:
            agent_id: Agent ID
            session_id: 会话 ID
            metadata: 元数据
            
        Returns:
            ExecutionTrace 对象
        """
        trace = ExecutionTrace(
            trace_id=str(uuid.uuid4()),
            agent_id=agent_id,
            session_id=session_id,
            start_time=time.time(),
            metadata=metadata or {},
        )
        
        self._traces[trace.trace_id] = trace
        self._current_trace = trace
        self._event_stack = []
        
        # 清理旧追踪
        self._cleanup_old_traces()
        
        self._stats["total_traces"] += 1
        
        return trace
    
    def end_trace(self, trace_id: Optional[str] = None):
        """结束追踪"""
        trace = self._get_trace(trace_id)
        if trace:
            trace.finish()
            self._update_stats(trace)
            
            if self._current_trace and self._current_trace.trace_id == trace.trace_id:
                self._current_trace = None
    
    def trace_event(
        self,
        event_type: TraceEventType,
        data: Dict[str, Any],
        duration_ms: float = 0,
        parent_id: Optional[str] = None,
    ) -> Optional[TraceEvent]:
        """
        记录追踪事件
        
        Args:
            event_type: 事件类型
            data: 事件数据
            duration_ms: 耗时
            parent_id: 父事件 ID
            
        Returns:
            TraceEvent 对象
        """
        trace = self._current_trace
        if not trace:
            return None
        
        event = TraceEvent(
            event_type=event_type,
            timestamp=time.time(),
            duration_ms=duration_ms,
            data=data,
            parent_id=parent_id or (self._event_stack[-1] if self._event_stack else None),
        )
        
        trace.add_event(event)
        self._stats["total_events"] += 1
        self._stats["event_counts"][event_type.name] += 1
        
        return event
    
    def trace_react_step(
        self,
        step_type: str,
        content: str,
        iteration: int,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """追踪 ReAct 步骤"""
        event_type_map = {
            "thought": TraceEventType.REACT_THOUGHT,
            "action": TraceEventType.REACT_ACTION,
            "observation": TraceEventType.REACT_OBSERVATION,
            "answer": TraceEventType.REACT_ANSWER,
        }
        
        event_type = event_type_map.get(step_type, TraceEventType.REACT_THOUGHT)
        
        self.trace_event(
            event_type=event_type,
            data={
                "content": content,
                "iteration": iteration,
                **(metadata or {}),
            },
        )
    
    def trace_skill_call(
        self,
        skill_name: str,
        parameters: Dict[str, Any],
    ) -> str:
        """
        追踪技能调用
        
        Returns:
            事件 ID，用于后续记录结果
        """
        event = self.trace_event(
            event_type=TraceEventType.SKILL_CALL,
            data={
                "skill_name": skill_name,
                "parameters": parameters,
            },
        )
        
        if event:
            self._event_stack.append(event.event_id)
            return event.event_id
        return ""
    
    def trace_skill_result(
        self,
        parent_id: str,
        result: Any,
        duration_ms: float,
        success: bool = True,
    ):
        """追踪技能执行结果"""
        self.trace_event(
            event_type=TraceEventType.SKILL_RESULT,
            data={
                "result": result,
                "success": success,
            },
            duration_ms=duration_ms,
            parent_id=parent_id,
        )
        
        # 弹出事件栈
        if parent_id in self._event_stack:
            self._event_stack.remove(parent_id)
    
    def trace_decision(
        self,
        decision_type: str,
        data: Dict[str, Any],
    ):
        """追踪决策过程"""
        event_type_map = {
            "start": TraceEventType.DECISION_START,
            "opinion": TraceEventType.DECISION_OPINION,
            "end": TraceEventType.DECISION_END,
        }
        
        event_type = event_type_map.get(decision_type, TraceEventType.DECISION_START)
        self.trace_event(event_type=event_type, data=data)
    
    def trace_llm_call(
        self,
        prompt: str,
        model: Optional[str] = None,
    ) -> str:
        """
        追踪 LLM 调用
        
        Returns:
            事件 ID
        """
        event = self.trace_event(
            event_type=TraceEventType.LLM_CALL,
            data={
                "prompt": prompt[:500] + "..." if len(prompt) > 500 else prompt,
                "model": model,
                "prompt_length": len(prompt),
            },
        )
        
        if event:
            self._event_stack.append(event.event_id)
            return event.event_id
        return ""
    
    def trace_llm_response(
        self,
        parent_id: str,
        response: str,
        duration_ms: float,
        tokens_used: Optional[int] = None,
    ):
        """追踪 LLM 响应"""
        self.trace_event(
            event_type=TraceEventType.LLM_RESPONSE,
            data={
                "response": response[:500] + "..." if len(response) > 500 else response,
                "response_length": len(response),
                "tokens_used": tokens_used,
            },
            duration_ms=duration_ms,
            parent_id=parent_id,
        )
        
        if parent_id in self._event_stack:
            self._event_stack.remove(parent_id)
    
    def trace_error(self, error: Exception, context: Optional[Dict] = None):
        """追踪错误"""
        self.trace_event(
            event_type=TraceEventType.ERROR,
            data={
                "error_type": type(error).__name__,
                "error_message": str(error),
                "context": context or {},
            },
        )
    
    def get_trace(self, trace_id: str) -> Optional[ExecutionTrace]:
        """获取追踪记录"""
        return self._traces.get(trace_id)
    
    def get_all_traces(self) -> List[ExecutionTrace]:
        """获取所有追踪记录"""
        return list(self._traces.values())
    
    def get_traces_by_agent(self, agent_id: str) -> List[ExecutionTrace]:
        """获取指定 Agent 的追踪记录"""
        return [t for t in self._traces.values() if t.agent_id == agent_id]
    
    def get_traces_by_session(self, session_id: str) -> List[ExecutionTrace]:
        """获取指定会话的追踪记录"""
        return [t for t in self._traces.values() if t.session_id == session_id]
    
    def get_visualization_data(self, trace_id: str) -> Optional[Dict[str, Any]]:
        """
        获取可视化数据
        
        将追踪数据转换为前端可视化所需的格式
        """
        trace = self._traces.get(trace_id)
        if not trace:
            return None
        
        # 构建节点和边
        nodes = []
        edges = []
        
        # 根节点
        nodes.append({
            "id": "root",
            "type": "root",
            "label": f"Agent: {trace.agent_id}",
            "timestamp": trace.start_time,
        })
        
        # 事件节点
        for i, event in enumerate(trace.events):
            node_id = event.event_id
            node_type = self._get_node_type(event.event_type)
            
            nodes.append({
                "id": node_id,
                "type": node_type,
                "label": self._get_node_label(event),
                "timestamp": event.timestamp,
                "duration_ms": event.duration_ms,
                "data": event.data,
            })
            
            # 添加边
            if event.parent_id:
                edges.append({
                    "source": event.parent_id,
                    "target": node_id,
                    "type": "child",
                })
            else:
                edges.append({
                    "source": "root",
                    "target": node_id,
                    "type": "root_to_event",
                })
        
        return {
            "trace_id": trace_id,
            "agent_id": trace.agent_id,
            "duration_ms": trace.get_duration_ms(),
            "nodes": nodes,
            "edges": edges,
            "stats": {
                "total_events": len(trace.events),
                "event_breakdown": self._get_event_breakdown(trace),
            },
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return {
            **self._stats,
            "active_traces": len(self._traces),
        }
    
    def clear(self):
        """清空所有追踪记录"""
        self._traces.clear()
        self._current_trace = None
        self._event_stack = []
        self._stats = {
            "total_traces": 0,
            "total_events": 0,
            "event_counts": defaultdict(int),
            "avg_duration_ms": 0,
        }
    
    def _get_trace(self, trace_id: Optional[str]) -> Optional[ExecutionTrace]:
        """获取追踪记录"""
        if trace_id:
            return self._traces.get(trace_id)
        return self._current_trace
    
    def _cleanup_old_traces(self):
        """清理旧追踪记录"""
        if len(self._traces) > self.max_traces:
            # 按开始时间排序，删除最早的
            sorted_traces = sorted(
                self._traces.items(),
                key=lambda x: x[1].start_time
            )
            to_remove = len(self._traces) - self.max_traces
            for trace_id, _ in sorted_traces[:to_remove]:
                del self._traces[trace_id]
    
    def _update_stats(self, trace: ExecutionTrace):
        """更新统计信息"""
        duration = trace.get_duration_ms()
        
        # 更新平均耗时
        n = self._stats["total_traces"]
        old_avg = self._stats["avg_duration_ms"]
        self._stats["avg_duration_ms"] = (old_avg * (n - 1) + duration) / n
    
    def _get_node_type(self, event_type: TraceEventType) -> str:
        """获取节点类型"""
        type_map = {
            TraceEventType.REACT_THOUGHT: "thought",
            TraceEventType.REACT_ACTION: "action",
            TraceEventType.REACT_OBSERVATION: "observation",
            TraceEventType.REACT_ANSWER: "answer",
            TraceEventType.SKILL_CALL: "skill_call",
            TraceEventType.SKILL_RESULT: "skill_result",
            TraceEventType.DECISION_START: "decision_start",
            TraceEventType.DECISION_OPINION: "decision_opinion",
            TraceEventType.DECISION_END: "decision_end",
            TraceEventType.LLM_CALL: "llm_call",
            TraceEventType.LLM_RESPONSE: "llm_response",
            TraceEventType.ERROR: "error",
        }
        return type_map.get(event_type, "unknown")
    
    def _get_node_label(self, event: TraceEvent) -> str:
        """获取节点标签"""
        data = event.data
        
        if event.event_type == TraceEventType.REACT_THOUGHT:
            return f"Thought: {data.get('content', '')[:50]}..."
        elif event.event_type == TraceEventType.REACT_ACTION:
            return f"Action: {data.get('content', '')[:50]}..."
        elif event.event_type == TraceEventType.SKILL_CALL:
            return f"Skill: {data.get('skill_name', 'unknown')}"
        elif event.event_type == TraceEventType.LLM_CALL:
            return f"LLM Call ({data.get('prompt_length', 0)} chars)"
        elif event.event_type == TraceEventType.ERROR:
            return f"Error: {data.get('error_type', 'Unknown')}"
        else:
            return event.event_type.name
    
    def _get_event_breakdown(self, trace: ExecutionTrace) -> Dict[str, int]:
        """获取事件分类统计"""
        breakdown = defaultdict(int)
        for event in trace.events:
            breakdown[event.event_type.name] += 1
        return dict(breakdown)


# 上下文管理器支持
class TraceContext:
    """追踪上下文管理器"""
    
    def __init__(
        self,
        tracer: AgentExecutionTracer,
        agent_id: str,
        session_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.tracer = tracer
        self.agent_id = agent_id
        self.session_id = session_id
        self.metadata = metadata
        self.trace: Optional[ExecutionTrace] = None
    
    async def __aenter__(self) -> ExecutionTrace:
        self.trace = self.tracer.start_trace(
            agent_id=self.agent_id,
            session_id=self.session_id,
            metadata=self.metadata,
        )
        return self.trace
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_val:
            self.tracer.trace_error(exc_val)
        self.tracer.end_trace(self.trace.trace_id if self.trace else None)
    
    def __enter__(self) -> ExecutionTrace:
        self.trace = self.tracer.start_trace(
            agent_id=self.agent_id,
            session_id=self.session_id,
            metadata=self.metadata,
        )
        return self.trace
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_val:
            self.tracer.trace_error(exc_val)
        self.tracer.end_trace(self.trace.trace_id if self.trace else None)

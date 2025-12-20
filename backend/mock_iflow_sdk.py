import asyncio
from typing import AsyncGenerator, Optional, List, Union, Dict, Any
from dataclasses import dataclass, field
from enum import Enum

# --- 最新文档同步的枚举与数据结构 ---

class StopReason(Enum):
    END_TURN = "end_turn"
    MAX_TOKENS = "max_tokens"
    STOP_SEQUENCE = "stop_sequence"

class ApprovalMode(Enum):
    DEFAULT = "default"      # 需要确认
    AUTO_EDIT = "auto_edit"  # 自动执行
    YOLO = "yolo"            # 自动执行+自动回退
    PLAN = "plan"            # 只读模式

@dataclass
class AuthMethodInfo:
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model_name: Optional[str] = None

@dataclass
class AgentInfo:
    agent_id: str = "agent-mock-001"
    task_id: Optional[str] = "task-mock-001"
    agent_index: Optional[int] = 0
    timestamp: Optional[int] = 1735123456789

    @staticmethod
    def from_agent_id_only(agent_id: str):
        return AgentInfo(agent_id=agent_id)

@dataclass
class Chunk:
    text: str

class Message:
    pass

@dataclass
class AssistantMessage(Message):
    chunk: Chunk
    agent_info: Optional[AgentInfo] = None

@dataclass
class ToolCallMessage(Message):
    status: str
    tool_name: str
    label: Optional[str] = None
    agent_info: Optional[AgentInfo] = None

@dataclass
class PlanEntry:
    content: str
    priority: int = 1
    status: str = "pending"

@dataclass
class PlanMessage(Message):
    entries: List[PlanEntry] = field(default_factory=list)
    plan_details: str = "" # 兼容旧逻辑

@dataclass
class TaskFinishMessage(Message):
    stop_reason: StopReason = StopReason.END_TURN

class IFlowOptions:
    def __init__(self, 
                 url: str = "ws://localhost:8090/acp", 
                 auto_start_process: bool = True, 
                 timeout: float = 30.0,
                 log_level: str = "INFO",
                 cwd: Optional[str] = None,
                 approval_mode: ApprovalMode = ApprovalMode.YOLO,
                 file_access: bool = False,
                 auth_method_id: Optional[str] = None,
                 auth_method_info: Optional[AuthMethodInfo] = None,
                 **kwargs):
        self.url = url
        self.auto_start_process = auto_start_process
        self.timeout = timeout
        self.log_level = log_level
        self.cwd = cwd
        self.approval_mode = approval_mode
        self.file_access = file_access
        self.auth_method_id = auth_method_id
        self.auth_method_info = auth_method_info

class IFlowClient:
    def __init__(self, options: Optional[IFlowOptions] = None):
        self.options = options or IFlowOptions()
        self._response_queue = asyncio.Queue()

    async def __aenter__(self):
        print(f"[MockSDK] Connecting (Mode: {self.options.approval_mode}, CWD: {self.options.cwd})")
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb): pass

    async def send_message(self, message: str):
        # 模拟响应逻辑
        if "plan" in message.lower():
            await self._response_queue.put(PlanMessage(entries=[PlanEntry(content="Analyzing requirements")]))
        
        await self._response_queue.put(AssistantMessage(chunk=Chunk(text=f"Echo: {message}"), agent_info=AgentInfo()))
        await self._response_queue.put(TaskFinishMessage(stop_reason=StopReason.END_TURN))

    async def receive_messages(self) -> AsyncGenerator[Message, None]:
        while not self._response_queue.empty():
            yield await self._response_queue.get()

# 模拟异常
class ConnectionError(Exception): pass
class TimeoutError(Exception): pass

async def query(question: str, options: Optional[IFlowOptions] = None) -> str:
    return f"Mock answer to: {question}"
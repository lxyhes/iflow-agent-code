"""
iFlow SDK 客户端 - 使用 Python SDK 实现的高级功能
支持实时流式响应、工具调用监控、任务计划查看等
"""

import asyncio
import logging
import platform
import time
from typing import AsyncGenerator, List, Dict, Any, Optional, Union, Callable
from enum import Enum
from functools import wraps

logger = logging.getLogger("IFlowSDKClient")


class IFlowError(Exception):
    """iFlow SDK 基础错误类"""
    pass


class ConnectionError(IFlowError):
    """连接错误"""
    pass


class TimeoutError(IFlowError):
    """超时错误"""
    pass


class AuthenticationError(IFlowError):
    """认证错误"""
    pass


class ToolExecutionError(IFlowError):
    """工具执行错误"""
    pass


def retry_on_failure(max_retries: int = 3, delay: float = 1.0, backoff: float = 2.0):
    """
    重试装饰器

    Args:
        max_retries: 最大重试次数
        delay: 初始延迟（秒）
        backoff: 退避因子
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            current_delay = delay

            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {current_delay}s...")
                        await asyncio.sleep(current_delay)
                        current_delay *= backoff
                    else:
                        logger.error(f"All {max_retries} attempts failed: {e}")

            raise last_exception if last_exception else IFlowError("Unknown error occurred")

        return wrapper
    return decorator

try:
    from iflow_sdk import (
        IFlowClient,
        IFlowOptions,
        AssistantMessage,
        ToolCallMessage,
        PlanMessage,
        TaskFinishMessage,
        AgentInfo,
        ToolCallStatus,
        StopReason,
        ApprovalMode
    )
    SDK_AVAILABLE = True
except ImportError:
    logger.warning("iflow_sdk not available, falling back to legacy implementation")
    SDK_AVAILABLE = False
    IFlowClient = None
    IFlowOptions = None
    AssistantMessage = None
    ToolCallMessage = None
    PlanMessage = None
    TaskFinishMessage = None
    AgentInfo = None
    ToolCallStatus = None
    StopReason = None
    ApprovalMode = None


class MessageType(Enum):
    """消息类型枚举"""
    ASSISTANT = "assistant"
    TOOL_CALL = "tool_call"
    PLAN = "plan"
    FINISH = "finish"
    ERROR = "error"
    RETRY = "retry"  # 重试消息
    STATUS = "status"  # 状态消息


class ToolCallStatus(Enum):
    """工具调用状态"""
    STARTED = "started"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class IFlowSDKClient:
    """
    基于 iFlow Python SDK 的客户端
    提供实时流式响应、工具调用监控、任务计划查看等高级功能
    """

    def __init__(
        self,
        cwd: str = None,
        approval_mode: str = "yolo",
        model: str = None,
        mcp_servers: List[Dict[str, Any]] = None,
        persona: str = "partner",
        system_prompt: str = None,
        auth_method_id: str = None,
        auth_method_info: Dict[str, Any] = None,
        file_access: bool = True,
        file_allowed_dirs: Optional[List[str]] = None,
        file_read_only: bool = False,
        file_max_size: int = 10485760,
        timeout: float = 300.0,
        url: str = "ws://localhost:8090/acp",
        auto_start_process: bool = True,
        process_start_port: int = 8090,
        session_id: Optional[str] = None,
        auto_approve_types: Optional[List[str]] = None,
        hooks: Optional[Dict[str, List[Dict[str, Any]]]] = None,
        commands: Optional[List[Dict[str, Any]]] = None,
        agents: Optional[List[Dict[str, Any]]] = None,
        session_settings: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        log_level: str = "INFO"
    ):
        """
        初始化 iFlow SDK 客户端

        Args:
            cwd: 工作目录
            approval_mode: 工具执行模式 (default, auto_edit, yolo, plan)
            model: 模型名称
            mcp_servers: MCP 服务器配置
            persona: AI 性格
            system_prompt: 系统提示词
            auth_method_id: 认证方法 ID
            auth_method_info: 认证信息
            file_access: 是否启用文件访问
            file_allowed_dirs: 允许访问的目录列表
            file_read_only: 是否只读模式
            file_max_size: 读取操作允许的最大文件大小（字节），默认 10MB
            timeout: 超时时间（秒）
            url: WebSocket 连接 URL
            auto_start_process: 是否自动启动 iFlow 进程
            process_start_port: 自动启动 iFlow 进程时使用的起始端口号
            session_id: 会话 ID，用于恢复现有会话
            auto_approve_types: 自动批准的工具类型列表
            hooks: 各种生命周期事件的钩子配置
            commands: 命令配置列表
            agents: 代理配置列表
            session_settings: 会话特定设置
            metadata: 随请求发送的额外元数据
            log_level: 日志级别
        """
        self.cwd = cwd or "."
        self.approval_mode = approval_mode
        self.model = model or "GLM-4.7"
        self.mcp_servers = mcp_servers or []
        self.persona = persona
        self.system_prompt = system_prompt
        self.auth_method_id = auth_method_id
        self.auth_method_info = auth_method_info
        self.file_access = file_access
        self.file_allowed_dirs = file_allowed_dirs
        self.file_read_only = file_read_only
        self.file_max_size = file_max_size
        self.timeout = timeout
        self.url = url
        # Windows 上禁用自动进程启动，因为 asyncio.create_subprocess_exec 在 Windows 上有兼容性问题
        # iFlow CLI 应该通过 launch_all_fixed.bat 手动启动
        if platform.system() == 'Windows':
            self.auto_start_process = False
        else:
            self.auto_start_process = auto_start_process
        self.process_start_port = process_start_port
        self.session_id = session_id
        self.auto_approve_types = auto_approve_types or ["edit", "fetch"]
        self.hooks = hooks
        self.commands = commands
        self.agents = agents
        self.session_settings = session_settings
        self.metadata = metadata or {}
        self.log_level = log_level

        self.client = None
        self.current_session_id = session_id

        # 消息统计
        self.message_count = 0
        self.tool_call_count = 0

        logger.info(f"IFlowSDKClient initialized: cwd={self.cwd}, model={self.model}, mode={approval_mode}, session_id={session_id}")

    async def _get_options(self) -> IFlowOptions:
        """构建 SDK 配置选项"""
        # Windows 上禁用自动进程启动，避免事件循环策略问题
        # 默认情况下，Windows 上 auto_start_process 应该为 False
        if platform.system() == 'Windows':
            auto_start_process = False
        else:
            auto_start_process = self.auto_start_process

        # 转换 approval_mode 字符串为枚举
        approval_mode_enum = self._get_approval_mode_enum()

        options = IFlowOptions(
            url=self.url,
            auto_start_process=auto_start_process,
            process_start_port=self.process_start_port,
            timeout=self.timeout,
            cwd=self.cwd,
            log_level=self.log_level
        )

        # 设置工具执行权限模式
        if SDK_AVAILABLE and approval_mode_enum:
            options.approval_mode = approval_mode_enum

        # 设置文件访问权限
        if SDK_AVAILABLE:
            options.file_access = self.file_access
            if self.file_allowed_dirs:
                options.file_allowed_dirs = self.file_allowed_dirs
            options.file_read_only = self.file_read_only
            options.file_max_size = self.file_max_size

        # 设置自动批准的工具类型
        if SDK_AVAILABLE and self.auto_approve_types:
            options.auto_approve_types = self.auto_approve_types

        # 设置认证信息
        if self.auth_method_id:
            options.auth_method_id = self.auth_method_id
            if self.auth_method_info:
                options.auth_method_info = self.auth_method_info

        # 设置 MCP 服务器
        if self.mcp_servers:
            options.mcp_servers = self.mcp_servers

        # 设置钩子
        if self.hooks:
            options.hooks = self.hooks

        # 设置命令
        if self.commands:
            options.commands = self.commands

        # 设置代理
        if self.agents:
            options.agents = self.agents

        # 设置会话设置
        if self.session_settings:
            options.session_settings = self.session_settings

        # 设置元数据
        if self.metadata:
            options.metadata = self.metadata

        logger.debug(f"IFlowOptions created: url={self.url}, auto_start_process={auto_start_process}, approval_mode={approval_mode_enum}")
        return options

    def _get_approval_mode_enum(self) -> Optional[ApprovalMode]:
        """将 approval_mode 字符串转换为 ApprovalMode 枚举"""
        if not SDK_AVAILABLE or not ApprovalMode:
            return None

        mode_map = {
            "default": ApprovalMode.DEFAULT,
            "auto_edit": ApprovalMode.AUTO_EDIT,
            "yolo": ApprovalMode.YOLO,
            "plan": ApprovalMode.PLAN
        }
        return mode_map.get(self.approval_mode.lower())

    async def chat_stream(self, user_input: str, max_retries: int = 3) -> AsyncGenerator[Dict[str, Any], None]:
        """
        流式对话（带重试机制）

        Args:
            user_input: 用户输入
            max_retries: 最大重试次数

        Yields:
            消息字典，包含 type 和 metadata
        """
        if not SDK_AVAILABLE:
            logger.error("iFlow SDK not available")
            yield {
                "type": "error",
                "content": "iFlow SDK 未安装，请运行: pip install iflow-cli-sdk",
                "metadata": {"error_type": "sdk_not_available"}
            }
            return

        # 重试逻辑
        last_exception = None
        for attempt in range(max_retries):
            try:
                async for message in self._chat_stream_impl(user_input):
                    yield message
                return  # 成功完成，退出重试循环
            except Exception as e:
                last_exception = e
                logger.error(f"Chat stream attempt {attempt + 1} failed: {e}")

                if attempt < max_retries - 1:
                    # 发送重试消息
                    yield {
                        "type": "error",
                        "content": f"连接出现问题，正在重试 ({attempt + 1}/{max_retries})...",
                        "metadata": {
                            "error_type": "retry",
                            "attempt": attempt + 1,
                            "max_retries": max_retries
                        }
                    }
                    await asyncio.sleep(1.0 * (2 ** attempt))  # 指数退避

        # 所有重试都失败
        logger.error(f"All {max_retries} attempts failed: {last_exception}")
        yield {
            "type": "error",
            "content": self._format_error_message(last_exception),
            "metadata": {
                "error_type": self._classify_error(last_exception),
                "error_details": str(last_exception) if last_exception else None
            }
        }

    async def _chat_stream_impl(self, user_input: str) -> AsyncGenerator[Dict[str, Any], None]:
        """实际的 chat_stream 实现（内部方法）"""
        try:
            # 获取配置选项
            options = await self._get_options()

            # 使用官方推荐的简洁方式
            async with IFlowClient(options) as client:
                self.client = client

                # 添加系统提示词（如果有）
                full_input = user_input
                if self.system_prompt:
                    full_input = f"{self.system_prompt}\n\n{user_input}"

                # 发送消息
                await client.send_message(full_input)
                self.message_count += 1

                # 接收消息流
                async for message in client.receive_messages():
                    if isinstance(message, AssistantMessage):
                        # AI 助手响应
                        yield {
                            "type": "assistant",
                            "content": message.chunk.text,
                            "metadata": {
                                "agent_info": self._serialize_agent_info(message.agent_info) if message.agent_info else None
                            }
                        }

                    elif isinstance(message, ToolCallMessage):
                        # 工具调用
                        self.tool_call_count += 1
                        tool_status = self._get_tool_call_status(message.status)
                        tool_call_id = getattr(message, "tool_call_id", None) or getattr(message, "id", None)
                        tool_type = getattr(message, "tool_type", None)
                        tool_params = (
                            getattr(message, "tool_params", None)
                            or getattr(message, "params", None)
                            or getattr(message, "arguments", None)
                        )
                        
                        # 从 message.content 中提取结果数据
                        result = None
                        old_content = None
                        new_content = None
                        
                        # 调试日志：打印完整的消息结构
                        logger.debug(f"[ToolCallMessage] Full message structure:")
                        logger.debug(f"  id: {getattr(message, 'id', None)}")
                        logger.debug(f"  tool_name: {message.tool_name}")
                        logger.debug(f"  status: {message.status} ({type(message.status)})")
                        logger.debug(f"  label: {message.label}")
                        logger.debug(f"  content: {message.content} (type: {type(message.content)})")
                        logger.debug(f"  agent_info: {message.agent_info}")
                        
                        if message.content:
                            logger.debug(f"  content attributes:")
                            for attr in dir(message.content):
                                if not attr.startswith('_'):
                                    value = getattr(message.content, attr)
                                    if not callable(value):
                                        logger.debug(f"    {attr}: {value}")
                            
                            if hasattr(message.content, 'markdown'):
                                result = message.content.markdown
                                logger.debug(f"  Extracted markdown result (length: {len(result) if result else 0})")
                            if hasattr(message.content, 'old_text'):
                                old_content = message.content.old_text
                                logger.debug(f"  Extracted old_text (length: {len(old_content) if old_content else 0})")
                            if hasattr(message.content, 'new_text'):
                                new_content = message.content.new_text
                                logger.debug(f"  Extracted new_text (length: {len(new_content) if new_content else 0})")
                            if hasattr(message.content, 'path'):
                                # 如果没有其他结果，将路径作为结果
                                if result is None:
                                    result = f"File: {message.content.path}"
                                    logger.debug(f"  Using path as result: {result}")
                        else:
                            logger.warning(f"[ToolCallMessage] message.content is None for tool: {message.tool_name}")

                        yield {
                            "type": "tool_call",
                            "content": message.label or f"执行工具: {message.tool_name or 'unknown'}",
                            "metadata": {
                                "tool_call_id": tool_call_id,
                                "tool_name": message.tool_name,
                                "tool_type": tool_type,
                                "status": tool_status,
                                "status_enum": str(message.status) if message.status else None,
                                "agent_info": self._serialize_agent_info(message.agent_info) if message.agent_info else None,
                                "tool_params": tool_params,
                                "result": result,
                                "old_content": old_content,
                                "new_content": new_content,
                            }
                        }

                    elif isinstance(message, PlanMessage):
                        # 任务计划
                        plan_entries = []
                        if hasattr(message, 'entries') and message.entries:
                            plan_entries = [
                                {
                                    "content": entry.content,
                                    "priority": str(entry.priority) if hasattr(entry, 'priority') else "0",
                                    "status": str(entry.status) if hasattr(entry, 'status') else "pending"
                                }
                                for entry in message.entries
                            ]

                        yield {
                            "type": "plan",
                            "content": "执行计划:",
                            "metadata": {
                                "entries": plan_entries
                            }
                        }

                    elif isinstance(message, TaskFinishMessage):
                        # 任务完成
                        stop_reason_details = self._get_stop_reason_details(message.stop_reason)

                        yield {
                            "type": "finish",
                            "content": "",
                            "metadata": {
                                "stop_reason": stop_reason_details["reason"],
                                "stop_reason_enum": str(message.stop_reason),
                                "stop_reason_description": stop_reason_details["description"],
                                "message_count": self.message_count,
                                "tool_call_count": self.tool_call_count
                            }
                        }
                        break

        except Exception as e:
            logger.exception(f"Error in _chat_stream_impl: {e}")
            raise  # 重新抛出异常，由外层的重试逻辑处理

    def _classify_error(self, error: Optional[Exception]) -> str:
        """分类错误类型"""
        if error is None:
            return "unknown"

        error_str = str(error).lower()

        if "connection" in error_str or "connect" in error_str:
            return "connection"
        elif "timeout" in error_str:
            return "timeout"
        elif "auth" in error_str or "unauthorized" in error_str:
            return "authentication"
        elif "tool" in error_str:
            return "tool_execution"
        else:
            return "general"

    def _format_error_message(self, error: Optional[Exception]) -> str:
        """格式化错误消息"""
        if error is None:
            return "发生未知错误"

        error_type = self._classify_error(error)
        error_messages = {
            "connection": "❌ 连接错误：无法连接到 iFlow 服务。请确保 iFlow CLI 已安装并正在运行。",
            "timeout": "⏱️ 超时错误：请求超时。请检查网络连接或增加超时时间。",
            "authentication": "🔐 认证错误：认证失败。请检查您的认证配置。",
            "tool_execution": "🔧 工具执行错误：工具执行失败。",
            "general": f"❌ 错误：{str(error)}"
        }

        message = error_messages.get(error_type, error_messages["general"])
        return f"{message}\n\n提示: 请确保 iFlow CLI 已安装: pip install iflow-cli-sdk"

    def _get_tool_call_status(self, status: Optional[ToolCallStatus]) -> str:
        """获取工具调用状态的字符串表示"""
        if not status or not SDK_AVAILABLE:
            return "unknown"

        status_map = {
            ToolCallStatus.STARTED: "started",
            ToolCallStatus.RUNNING: "running",
            ToolCallStatus.COMPLETED: "completed",
            ToolCallStatus.FAILED: "failed"
        }
        return status_map.get(status, "unknown")

    def _get_stop_reason_details(self, stop_reason: Optional[StopReason]) -> Dict[str, str]:
        """获取任务完成原因的详细信息"""
        if not stop_reason or not SDK_AVAILABLE:
            return {"reason": "unknown", "description": "未知原因"}

        reason_map = {
            StopReason.END_TURN: {
                "reason": "end_turn",
                "description": "任务正常完成"
            },
            StopReason.MAX_TOKENS: {
                "reason": "max_tokens",
                "description": "达到最大令牌限制"
            },
            StopReason.REFUSAL: {
                "reason": "refusal",
                "description": "请求被拒绝"
            },
            StopReason.CANCELLED: {
                "reason": "cancelled",
                "description": "任务被取消"
            }
        }
        return reason_map.get(stop_reason, {"reason": "unknown", "description": "未知原因"})

    def _serialize_agent_info(self, agent_info: Optional[AgentInfo]) -> Optional[Dict[str, Any]]:
        """序列化代理信息"""
        if not agent_info:
            return None

        return {
            "agent_id": agent_info.agent_id,
            "agent_index": agent_info.agent_index,
            "task_id": agent_info.task_id,
            "timestamp": agent_info.timestamp
        }

    def get_stats(self) -> Dict[str, Any]:
        """获取会话统计信息"""
        return {
            "message_count": self.message_count,
            "tool_call_count": self.tool_call_count,
            "current_session_id": self.current_session_id,
            "model": self.model,
            "approval_mode": self.approval_mode,
            "persona": self.persona,
            "sdk_available": SDK_AVAILABLE,
            "cwd": self.cwd,
            "timeout": self.timeout
        }

    def get_debug_info(self) -> Dict[str, Any]:
        """获取调试信息"""
        return {
            "sdk_available": SDK_AVAILABLE,
            "platform": platform.system(),
            "python_version": platform.python_version(),
            "client_config": {
                "url": self.url,
                "auto_start_process": self.auto_start_process,
                "process_start_port": self.process_start_port,
                "timeout": self.timeout,
                "log_level": self.log_level,
                "approval_mode": self.approval_mode,
                "model": self.model,
                "cwd": self.cwd
            },
            "file_access": {
                "enabled": self.file_access,
                "allowed_dirs": self.file_allowed_dirs,
                "read_only": self.file_read_only,
                "max_size": self.file_max_size
            },
            "mcp_servers_count": len(self.mcp_servers) if self.mcp_servers else 0,
            "has_auth": bool(self.auth_method_id),
            "has_hooks": bool(self.hooks),
            "has_commands": bool(self.commands),
            "has_agents": bool(self.agents),
            "has_session_settings": bool(self.session_settings),
            "metadata_keys": list(self.metadata.keys()) if self.metadata else []
        }

    def set_log_level(self, level: str):
        """设置日志级别"""
        self.log_level = level.upper()
        logger.setLevel(self.log_level)
        logger.info(f"Log level set to: {self.log_level}")

    def enable_debug_mode(self):
        """启用调试模式"""
        self.set_log_level("DEBUG")
        logger.debug("Debug mode enabled")
        logger.debug(f"Debug info: {self.get_debug_info()}")

    def set_session_id(self, session_id: str):
        """设置会话 ID"""
        self.session_id = session_id
        self.current_session_id = session_id
        logger.info(f"Session ID set to: {session_id}")

    def get_session_id(self) -> Optional[str]:
        """获取当前会话 ID"""
        return self.current_session_id

    def reset(self):
        """重置客户端状态"""
        self.message_count = 0
        self.tool_call_count = 0
        self.current_session_id = self.session_id  # 保留原始 session_id
        logger.info("IFlowSDKClient reset (session_id preserved)")
        logger.debug(f"Stats after reset: {self.get_stats()}")


def create_sdk_client(
    cwd: str = None,
    mode: str = "yolo",
    model: str = None,
    mcp_servers: List[Dict[str, Any]] = None,
    persona: str = "partner",
    system_prompt: str = None,
    auth_method_id: str = None,
    auth_method_info: Dict[str, Any] = None,
    file_access: bool = True,
    file_allowed_dirs: Optional[List[str]] = None,
    file_read_only: bool = False,
    file_max_size: int = 10485760,
    timeout: float = 300.0,
    url: str = "ws://localhost:8090/acp",
    auto_start_process: bool = True,
    process_start_port: int = 8090,
    session_id: Optional[str] = None,
    auto_approve_types: Optional[List[str]] = None,
    hooks: Optional[Dict[str, List[Dict[str, Any]]]] = None,
    commands: Optional[List[Dict[str, Any]]] = None,
    agents: Optional[List[Dict[str, Any]]] = None,
    session_settings: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    log_level: str = "INFO",
    **kwargs
) -> IFlowSDKClient:
    """
    创建 SDK 客户端的工厂函数

    Args:
        cwd: 工作目录
        mode: 执行模式
        model: 模型名称
        mcp_servers: MCP 服务器配置
        persona: AI 性格
        system_prompt: 系统提示词
        auth_method_id: 认证方法 ID
        auth_method_info: 认证信息
        file_access: 是否启用文件访问
        file_allowed_dirs: 允许访问的目录列表
        file_read_only: 是否只读模式
        file_max_size: 读取操作允许的最大文件大小（字节）
        timeout: 超时时间（秒）
        url: WebSocket 连接 URL
        auto_start_process: 是否自动启动 iFlow 进程
        process_start_port: 自动启动 iFlow 进程时使用的起始端口号
        session_id: 会话 ID
        auto_approve_types: 自动批准的工具类型列表
        hooks: 各种生命周期事件的钩子配置
        commands: 命令配置列表
        agents: 代理配置列表
        session_settings: 会话特定设置
        metadata: 随请求发送的额外元数据
        log_level: 日志级别
        **kwargs: 其他参数

    Returns:
        IFlowSDKClient: SDK 客户端实例

    Example:
        >>> # 基础使用
        >>> client = create_sdk_client(cwd="/path/to/project", mode="yolo")
        >>> async for message in client.chat_stream("你好"):
        ...     print(message)
        >>>
        >>> # 高级配置
        >>> client = create_sdk_client(
        ...     cwd="/path/to/project",
        ...     mode="yolo",
        ...     model="GLM-4.7",
        ...     file_access=True,
        ...     file_allowed_dirs=["/path/to/project"],
        ...     timeout=600.0,
        ...     session_id="my-session-123"
        ... )
        >>> async for message in client.chat_stream("帮我创建一个Python项目"):
        ...     if message["type"] == "assistant":
        ...         print(message["content"])
    """
    return IFlowSDKClient(
        cwd=cwd,
        approval_mode=mode,
        model=model,
        mcp_servers=mcp_servers,
        persona=persona,
        system_prompt=system_prompt,
        auth_method_id=auth_method_id,
        auth_method_info=auth_method_info,
        file_access=file_access,
        file_allowed_dirs=file_allowed_dirs,
        file_read_only=file_read_only,
        file_max_size=file_max_size,
        timeout=timeout,
        url=url,
        auto_start_process=auto_start_process,
        process_start_port=process_start_port,
        session_id=session_id,
        auto_approve_types=auto_approve_types,
        hooks=hooks,
        commands=commands,
        agents=agents,
        session_settings=session_settings,
        metadata=metadata,
        log_level=log_level,
        **kwargs
    )


# 使用示例
if __name__ == "__main__":
    import asyncio

    async def basic_example():
        """基础使用示例"""
        print("=== 基础使用示例 ===")

        client = create_sdk_client(
            cwd=".",
            mode="yolo",
            model="GLM-4.7"
        )

        async for message in client.chat_stream("你好，请介绍一下Python"):
            if message["type"] == "assistant":
                print(message["content"], end="", flush=True)
            elif message["type"] == "finish":
                print("\n\n=== 完成 ===")
                break

    async def advanced_example():
        """高级使用示例"""
        print("=== 高级使用示例 ===")

        client = create_sdk_client(
            cwd=".",
            mode="yolo",
            model="GLM-4.7",
            file_access=True,
            file_allowed_dirs=["."],
            timeout=600.0,
            session_id="advanced-example-session"
        )

        # 启用调试模式
        client.enable_debug_mode()
        print(f"调试信息: {client.get_debug_info()}")

        async for message in client.chat_stream("列出当前目录的文件"):
            msg_type = message["type"]
            content = message.get("content", "")
            metadata = message.get("metadata", {})

            if msg_type == "assistant":
                print(content, end="", flush=True)
            elif msg_type == "tool_call":
                print(f"\n[工具] {metadata.get('tool_name', 'unknown')}: {metadata.get('status', 'unknown')}")
            elif msg_type == "plan":
                entries = metadata.get("entries", [])
                print(f"\n[计划] {len(entries)} 项任务")
                for entry in entries:
                    print(f"  - {entry.get('content', '')}")
            elif msg_type == "finish":
                print(f"\n\n=== 完成 ===")
                print(f"消息数: {metadata.get('message_count', 0)}")
                print(f"工具调用数: {metadata.get('tool_call_count', 0)}")
                print(f"完成原因: {metadata.get('stop_reason_description', 'unknown')}")
                break

    async def error_handling_example():
        """错误处理示例"""
        print("=== 错误处理示例 ===")

        # 故意使用错误的配置来演示错误处理
        client = create_sdk_client(
            cwd=".",
            mode="yolo",
            timeout=1.0  # 设置很短的超时时间
        )

        async for message in client.chat_stream("测试错误处理"):
            if message["type"] == "error":
                print(f"错误: {message['content']}")
                print(f"错误类型: {message.get('metadata', {}).get('error_type', 'unknown')}")
                break

    # 运行示例
    # asyncio.run(basic_example())
    # asyncio.run(advanced_example())
    # asyncio.run(error_handling_example())

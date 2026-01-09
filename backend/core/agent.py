import asyncio
from typing import AsyncGenerator, Optional, List, Dict, Any, Union
from .iflow_client import create_iflow_client
from .iflow_sdk_client import create_sdk_client, MessageType

class Agent:
    def __init__(self, name: str = "IFlowAgent", cwd: str = None, mode: str = "yolo", model: str = None, mcp_servers: List[Dict[str, Any]] = None, persona: str = "partner", system_prompt: str = None, auth_method_id: str = None, auth_method_info: Dict[str, Any] = None, use_sdk: bool = True):
        self.name = name
        self.persona = persona
        self.system_prompt = system_prompt
        self.use_sdk = use_sdk
        self.auth_method_id = auth_method_id
        self.auth_method_info = auth_method_info

        # 根据配置选择客户端
        if use_sdk:
            try:
                self.client = create_sdk_client(
                    cwd=cwd,
                    mode=mode,
                    model=model,
                    mcp_servers=mcp_servers,
                    persona=persona,
                    system_prompt=system_prompt,
                    auth_method_id=auth_method_id,
                    auth_method_info=auth_method_info
                )
                self.is_sdk_available = True
            except Exception as e:
                print(f"SDK 客户端初始化失败，回退到旧实现: {e}")
                self.client = create_iflow_client(cwd=cwd, mode=mode, model=model, mcp_servers=mcp_servers)
                self.is_sdk_available = False
        else:
            self.client = create_iflow_client(cwd=cwd, mode=mode, model=model, mcp_servers=mcp_servers)
            self.is_sdk_available = False

    async def chat(self, user_input: str) -> str:
        full_response = ""
        async for chunk in self.chat_stream(user_input):
            if isinstance(chunk, str):
                full_response += chunk
            elif isinstance(chunk, dict):
                # SDK 模式返回字典，只提取 assistant 消息
                if chunk.get("type") == MessageType.ASSISTANT.value:
                    full_response += chunk.get("content", "")
        return full_response

    async def chat_stream(self, user_input: str) -> AsyncGenerator[Union[str, Dict[str, Any]], None]:
        # 如果有 system_prompt，将其添加到用户消息前
        if self.system_prompt:
            full_input = f"{self.system_prompt}\n\nUser: {user_input}"
        else:
            full_input = user_input

        if self.is_sdk_available:
            # 使用 SDK 客户端（增强版）
            async for message in self.client.chat_stream(full_input):
                yield message
        else:
            # 使用旧客户端（兼容版）
            async for chunk in self.client.chat_stream(full_input):
                yield chunk

    def reset(self):
        print(f"Agent {self.name} reset.")
        if self.is_sdk_available:
            self.client.reset()
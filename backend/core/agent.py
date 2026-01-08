import asyncio
from typing import AsyncGenerator, Optional, List, Dict, Any
from .iflow_client import create_iflow_client

class Agent:
    def __init__(self, name: str = "IFlowAgent", cwd: str = None, mode: str = "yolo", model: str = None, mcp_servers: List[Dict[str, Any]] = None, persona: str = "partner", system_prompt: str = None, auth_method_id: str = None, auth_method_info: Dict[str, Any] = None):
        self.name = name
        self.persona = persona
        self.system_prompt = system_prompt
        self.client = create_iflow_client(cwd=cwd, mode=mode, model=model, mcp_servers=mcp_servers, system_prompt=system_prompt, auth_method_id=auth_method_id, auth_method_info=auth_method_info)

    async def chat(self, user_input: str) -> str:
        full_response = ""
        async for chunk in self.chat_stream(user_input):
            full_response += chunk
        return full_response

    async def chat_stream(self, user_input: str) -> AsyncGenerator[str, None]:
        # 如果有 system_prompt，将其添加到用户消息前
        if self.system_prompt:
            full_input = f"{self.system_prompt}\n\nUser: {user_input}"
        else:
            full_input = user_input
        async for chunk in self.client.chat_stream(full_input):
            yield chunk

    def reset(self):
        print(f"Agent {self.name} reset.")
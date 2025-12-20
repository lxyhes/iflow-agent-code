import asyncio
from typing import AsyncGenerator, Optional
from .iflow_client import create_iflow_client

class Agent:
    def __init__(self, name: str = "IFlowAgent", cwd: str = None, mode: str = "yolo"):
        self.name = name
        # 根据参数创建 client
        self.client = create_iflow_client(cwd=cwd, mode=mode)

    async def chat(self, user_input: str) -> str:
        full_response = ""
        async for chunk in self.chat_stream(user_input):
            full_response += chunk
        return full_response

    async def chat_stream(self, user_input: str) -> AsyncGenerator[str, None]:
        async for chunk in self.client.chat_stream(user_input):
            yield chunk

    def reset(self):
        print(f"Agent {self.name} reset.")
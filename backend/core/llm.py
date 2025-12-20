from abc import ABC, abstractmethod
from typing import List, AsyncGenerator, Dict, Any, Union
from .schema import Message, Role, ToolCall
import json
import asyncio

# Try importing real SDK, fallback to Mock
try:
    from iflow_sdk import IFlowClient, AssistantMessage, ToolCallMessage, TaskFinishMessage, PlanMessage
except ImportError:
    print("Warning: iflow-cli-sdk not found. Using Mock SDK.")
    from ..mock_iflow_sdk import IFlowClient, AssistantMessage, ToolCallMessage, TaskFinishMessage, PlanMessage

class LLMProvider(ABC):
    @abstractmethod
    async def chat(self, messages: List[Message], tools: List[Dict[str, Any]] = None) -> Message:
        pass

    @abstractmethod
    async def chat_stream(self, messages: List[Message], tools: List[Dict[str, Any]] = None) -> AsyncGenerator[Union[str, Message], None]:
        pass

class IFlowProvider(LLMProvider):
    def __init__(self, api_key: str = None):
        self.api_key = api_key

    async def chat(self, messages: List[Message], tools: List[Dict[str, Any]] = None) -> Message:
        # Non-streaming wrapper around stream
        full_content = ""
        tool_calls = []
        
        async for chunk in self.chat_stream(messages, tools):
            if isinstance(chunk, str):
                full_content += chunk
            # TODO: Handle capturing tool calls from the stream if needed for non-stream response
            
        return Message(role=Role.ASSISTANT, content=full_content)

    async def chat_stream(self, messages: List[Message], tools: List[Dict[str, Any]] = None) -> AsyncGenerator[Union[str, Message], None]:
        """
        Connects to IFlow SDK and yields text chunks or internal ToolCall structures.
        """
        # Get the last user message to send
        # IFlow maintains its own history, so we typically just send the new prompt.
        # But we should be careful if the user edits history.
        last_user_msg = next((m for m in reversed(messages) if m.role == Role.USER), None)
        if not last_user_msg:
             yield "Error: No user message found."
             return

        async with IFlowClient() as client:
            await client.send_message(last_user_msg.content)
            
            async for msg in client.receive_messages():
                if isinstance(msg, AssistantMessage):
                    if msg.chunk and msg.chunk.text:
                        yield msg.chunk.text
                        
                elif isinstance(msg, ToolCallMessage):
                    # Map IFlow ToolCall to our schema
                    # Note: IFlow SDK docs say it sends status/name. 
                    # If IFlow executes it internally, we might just yield a log message
                    # Or if we need to execute it, we yield a ToolCall object.
                    # Based on docs "iFlow will ask...", it implies IFlow does the heavy lifting.
                    # We will yield a status update for the UI.
                    yield f"\n[Tool: {msg.tool_name} ({msg.status})]\n"
                    
                elif isinstance(msg, PlanMessage):
                    yield f"\n[Plan: {msg.plan_details if hasattr(msg, 'plan_details') else 'Updating plan...'}]\n"
                    
                elif isinstance(msg, TaskFinishMessage):
                    break
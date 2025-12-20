import asyncio
import json
import os
from typing import AsyncGenerator, Optional

try:
    from iflow_sdk import (
        IFlowClient, 
        IFlowOptions,
        AssistantMessage, 
        ToolCallMessage, 
        PlanMessage, 
        TaskFinishMessage,
        StopReason,
        ApprovalMode,
        AuthMethodInfo,
        ConnectionError,
        TimeoutError
    )
except ImportError:
    from ..mock_iflow_sdk import (
        IFlowClient, 
        IFlowOptions,
        AssistantMessage, 
        ToolCallMessage, 
        PlanMessage, 
        TaskFinishMessage,
        StopReason,
        ApprovalMode,
        AuthMethodInfo,
        ConnectionError,
        TimeoutError
    )

class IFlowWrapper:
    def __init__(self, cwd: str = None, approval_mode: str = "yolo"):
        # Map generic modes to SDK enums
        mode_map = {
            "default": ApprovalMode.DEFAULT,
            "auto_edit": ApprovalMode.AUTO_EDIT,
            "yolo": ApprovalMode.YOLO,
            "plan": ApprovalMode.PLAN
        }
        
        # Advanced configuration from the latest SDK documentation
        self.options = IFlowOptions(
            auto_start_process=True,
            timeout=300.0,
            log_level="INFO",
            cwd=cwd or os.getcwd(),
            approval_mode=mode_map.get(approval_mode, ApprovalMode.YOLO),
            file_access=True,
            file_max_size=20 * 1024 * 1024, # Increased to 20MB
            # If we had real keys, we would put them here
            auth_method_id="iflow",
            auth_method_info=AuthMethodInfo(
                api_key=os.environ.get("IFLOW_API_KEY", "your-api-key"),
                model_name="iflow-default-model"
            )
        )

    async def chat_stream(self, user_input: str) -> AsyncGenerator[str, None]:
        print(f"[IFlow] CWD: {self.options.cwd} | Mode: {self.options.approval_mode}")
        
        try:
            async with IFlowClient(self.options) as client:
                await client.send_message(user_input)
                
                async for message in client.receive_messages():
                    
                    # 1. Text Content
                    if isinstance(message, AssistantMessage):
                        if message.chunk and message.chunk.text:
                            yield message.chunk.text
                    
                    # 2. Planning (Enhanced UI)
                    elif isinstance(message, PlanMessage):
                        if hasattr(message, 'entries') and message.entries:
                            yield "\n\n---\n**📋 Agent Plan**\n\n"
                            for entry in message.entries:
                                icon = "✅" if entry.status == "completed" else "⚪"
                                yield f"{icon} **{entry.content}**\n"
                            yield "---\n\n"
                        elif hasattr(message, 'plan_details'):
                            yield f"\n\n> **📋 Plan**: {message.plan_details}\n\n"
                    
                    # 3. Tool Execution (Enhanced UI)
                    elif isinstance(message, ToolCallMessage):
                        tool_name = getattr(message, 'tool_name', 'System')
                        status = getattr(message, 'status', 'executing')
                        
                        # Use blockquotes and bold for tools to make them stand out
                        if tool_name == "list_files" or tool_name == "ls":
                             yield f"\n> 📂 **List Files**: `Executing...`\n\n"
                        elif tool_name == "read_file":
                             yield f"\n> 📖 **Read File**: `Reading...`\n\n"
                        elif tool_name == "edit_file":
                             yield f"\n> ✏️ **Edit File**: `Applying changes...`\n\n"
                        elif tool_name == "bash":
                             yield f"\n> 💻 **Terminal**: `Running command...`\n\n"
                        else:
                             yield f"\n> 🔧 **{tool_name}**: `{status}`\n\n"

                    # 4. Finish
                    elif isinstance(message, TaskFinishMessage):
                        if message.stop_reason == StopReason.MAX_TOKENS:
                            yield "\n\n*(Response truncated due to length limit)*"
                        break
                        
        except ConnectionError:
            yield "\n\n❌ **Connection Failed**: Could not connect to iFlow CLI. Is it installed?"
        except TimeoutError:
            yield "\n\n⏱️ **Timeout**: The agent took too long to respond."
        except Exception as e:
            yield f"\n\n💥 **System Error**: {str(e)}"

def create_iflow_client(cwd: str = None, mode: str = "yolo"):
    return IFlowWrapper(cwd=cwd, approval_mode=mode)
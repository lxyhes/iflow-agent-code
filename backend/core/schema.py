from enum import Enum
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
import json

class Role(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"

@dataclass
class ToolCall:
    id: str
    function_name: str
    arguments: Dict[str, Any]

@dataclass
class Message:
    role: Role
    content: str
    name: Optional[str] = None
    tool_calls: List[ToolCall] = field(default_factory=list)
    tool_call_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert message to a generic dictionary format."""
        msg = {
            "role": self.role.value,
            "content": self.content
        }
        if self.name:
            msg["name"] = self.name
        if self.tool_calls:
            msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function_name,
                        "arguments": json.dumps(tc.arguments)
                    }
                }
                for tc in self.tool_calls
            ]
        if self.tool_call_id:
            msg["tool_call_id"] = self.tool_call_id
        return msg

import inspect
import json
from typing import Callable, Dict, Any, get_type_hints
from functools import wraps

class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, Callable] = {}
        self._schemas: Dict[str, Any] = {}

    def register(self, func: Callable):
        """Decorator to register a function as a tool."""
        schema = self._generate_schema(func)
        self._tools[schema["function"]["name"]] = func
        self._schemas[schema["function"]["name"]] = schema
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper

    def get_tools_schema(self) -> list[Dict[str, Any]]:
        return list(self._schemas.values())

    def get_tool(self, name: str) -> Callable:
        return self._tools.get(name)

    def _generate_schema(self, func: Callable) -> Dict[str, Any]:
        """Generates an OpenAI-compatible function schema from docstrings and type hints."""
        sig = inspect.signature(func)
        doc = inspect.getdoc(func) or "No description provided."
        
        parameters = {
            "type": "object",
            "properties": {},
            "required": []
        }
        
        type_hints = get_type_hints(func)
        
        for name, param in sig.parameters.items():
            if name == "self": continue
            
            param_type = "string" # Default
            if name in type_hints:
                t = type_hints[name]
                if t == int: param_type = "integer"
                elif t == bool: param_type = "boolean"
                elif t == float: param_type = "number"
            
            parameters["properties"][name] = {
                "type": param_type,
                "description": f"Parameter {name}" # Simplified, ideally parse docstring
            }
            if param.default == inspect.Parameter.empty:
                parameters["required"].append(name)
                
        return {
            "type": "function",
            "function": {
                "name": func.__name__,
                "description": doc,
                "parameters": parameters
            }
        }

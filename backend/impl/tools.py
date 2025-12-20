import os
from ..core.registry import ToolRegistry

# Create a registry specifically for Code Review tools
code_review_registry = ToolRegistry()

@code_review_registry.register
def list_files(path: str = ".") -> str:
    """
    Lists files and directories in the specified path.
    path: The relative path to list. Defaults to current directory.
    """
    try:
        # Security check: rudimentary prevention of going up too far
        if ".." in path:
            return "Error: Accessing parent directories is restricted for safety."
        
        if not os.path.exists(path):
            return f"Error: Path {path} does not exist."
            
        items = os.listdir(path)
        output = []
        for item in items:
            full_path = os.path.join(path, item)
            if os.path.isdir(full_path):
                output.append(f"[DIR]  {item}")
            else:
                output.append(f"[FILE] {item}")
        return "\n".join(output)
    except Exception as e:
        return f"Error listing files: {str(e)}"

@code_review_registry.register
def read_file(file_path: str) -> str:
    """
    Reads the content of a file.
    file_path: The relative path to the file.
    """
    try:
        if ".." in file_path:
             return "Error: Accessing parent directories is restricted."
             
        if not os.path.exists(file_path):
            return f"Error: File {file_path} does not exist."
            
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Truncate if too long (mocking context window management)
        if len(content) > 10000:
             return content[:10000] + "\n...[Content Truncated]..."
             
        return content
    except Exception as e:
        return f"Error reading file: {str(e)}"

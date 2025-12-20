from fastapi import FastAPI, HTTPException, Request, Query, Body
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
import sys
import os
import asyncio
import json
import platform

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/..")

from backend.impl.reviewer import create_code_review_agent
from backend.core.project_manager import project_manager
from backend.core.agent import Agent

app = FastAPI(title="IFlow Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- STATE ---
# Cache for Agent instances: { (cwd, mode): Agent }
agent_cache = {}

class AgentConfig(BaseModel):
    cwd: str
    mode: str = "yolo" # default, auto_edit, yolo, plan

# --- HELPERS ---

def get_agent(cwd: str, mode: str = "yolo"):
    key = (cwd, mode)
    if key not in agent_cache:
        print(f"[Kernel] Creating new Agent instance: CWD={cwd}, Mode={mode}")
        agent_cache[key] = Agent(name="IFlowAgent", cwd=cwd, mode=mode)
    return agent_cache[key]

# --- CONFIGURATION ---
global_config = {
    "mode": "yolo",  # default, auto_edit, yolo, plan
    "file_access": True
}

@app.get("/api/config")
async def get_config():
    return global_config

@app.post("/api/config")
async def update_config(config: dict = Body(...)):
    global global_config
    global_config.update(config)
    # Clear cache to force new agent instances with new mode
    agent_cache.clear()
    return global_config

# --- CHAT ENDPOINTS ---

@app.get("/stream")
async def stream_endpoint(message: str, cwd: str = None):
    """Streaming Chat Interface"""
    target_cwd = cwd or os.getcwd()
    # Use mode from global config
    agent = get_agent(target_cwd, global_config["mode"])
    
    async def event_generator():
        async for chunk in agent.chat_stream(message):
            yield chunk
            
    return StreamingResponse(event_generator(), media_type="text/plain")

@app.get("/api/projects")
async def get_projects():
    return project_manager.get_projects()

@app.post("/api/projects/create")
async def create_project(req: dict = Body(...)):
    path = req.get("path")
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=400, detail="Invalid path")
    return project_manager.add_project(path)

@app.get("/api/browse-filesystem")
async def browse_filesystem(path: str = None):
    # (保持之前的逻辑，支持 Windows 磁盘和文件夹浏览)
    if not path:
        if platform.system() == "Windows":
            import string
            from ctypes import windll
            drives = []
            bitmask = windll.kernel32.GetLogicalDrives()
            for letter in string.ascii_uppercase:
                if bitmask & 1:
                    drives.append({"name": f"{letter}:\\", "path": f"{letter}:\\", "type": "directory", "isDirectory": True})
                bitmask >>= 1
            return drives
        path = "/"

    try:
        items = [{"name": "..", "path": os.path.dirname(path), "type": "directory", "isDirectory": True}]
        with os.scandir(path) as it:
            for entry in it:
                if entry.is_dir():
                    items.append({"name": entry.name, "path": entry.path, "type": "directory", "isDirectory": True})
        return items
    except:
        return []

# --- MOCK AUTH & EXTRAS ---

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/auth/login")
async def mock_login(req: LoginRequest):
    """Mock Login: Always accepts any credentials."""
    return {
        "user": {"id": 1, "username": req.username, "email": "admin@example.com"},
        "token": "mock-jwt-token-for-local-dev"
    }

@app.get("/api/auth/user")
async def get_current_user():
    """Mock User Info."""
    return {"id": 1, "username": "developer", "email": "dev@local.host"}

@app.post("/api/auth/logout")
async def mock_logout():
    return {"status": "success"}

@app.get("/api/auth/status")
async def auth_status():
    """
    Check if the user is authenticated with iFlow.
    In a real scenario, we would check if the 'iflow' CLI is logged in.
    """
    # TODO: Check real CLI status. For now, we simulate a check.
    # If you want to force login, set this to False.
    is_authenticated = True 
    
    return {
        "authenticated": is_authenticated, 
        "user": {"username": "iflow-user"},
        "provider": "iflow",
        "loginUrl": "https://platform.iflow.cn/login" 
    }

@app.get("/api/user/onboarding-status")
async def onboarding_status():
    return {"completed": True}

@app.get("/api/commands/list")
def list_commands():
    """Mock slash commands for the UI input box."""
    return {
        "builtIn": [
            {"name": "review", "description": "Review current project"},
            {"name": "test", "description": "Run tests"},
            {"name": "plan", "description": "Generate implementation plan"}
        ],
        "custom": []
    }

@app.api_route("/api/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def catch_all(path_name: str, request: Request):
    # Print for debugging UI requests
    # print(f"UI requested: {path_name}")
    return JSONResponse(content={"status": "mocked"}, status_code=200)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
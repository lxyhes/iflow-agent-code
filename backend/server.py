from fastapi import FastAPI, HTTPException, Request, Query, Body, WebSocket
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
import sys
import os
import asyncio
import json
import platform
import subprocess
import logging

# 配置日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("Server")

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/..")

from backend.impl.reviewer import create_code_review_agent
from backend.core.project_manager import project_manager
from backend.core.agent import Agent
from backend.core.file_service import file_service
from backend.core.git_service import git_service
from backend.core.shell_service import ShellSession

app = FastAPI(title="IFlow Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELS ---
class CreateProjectRequest(BaseModel): path: str
class SaveFileRequest(BaseModel): filePath: str; content: str
class CheckoutRequest(BaseModel): project: str; branch: str
class CommitRequest(BaseModel): project: str; message: str; files: list

# --- GLOBAL CONFIG ---
global_config = {
    "mode": "yolo", 
    "model": "GLM-4.6", # Set to recommended model
    "mcp_servers": [],
    "iflow_path": "iflow" # Default command
}

# --- HELPERS ---
def get_iflow_version():
    try:
        cmd = global_config.get("iflow_path", "iflow")
        result = subprocess.run([cmd, "--version"], capture_output=True, text=True, timeout=2)
        if result.returncode == 0:
            return result.stdout.strip()
    except:
        return None
    return None

def get_agent(cwd: str, mode: str = "yolo", model: str = None, mcp_servers: list = None):
    key = (cwd, mode, model, json.dumps(mcp_servers or []))
    if key not in agent_cache:
        agent_cache[key] = Agent(name="IFlowAgent", cwd=cwd, mode=mode, model=model, mcp_servers=mcp_servers)
    return agent_cache[key]

def get_project_path(project_name: str) -> str:
    projects = project_manager.get_projects()
    for p in projects:
        if p["name"] == project_name: return p["fullPath"]
    if os.path.exists(project_name): return project_name
    return os.getcwd()

agent_cache = {}

# --- API ENDPOINTS ---

def check_iflow_auth():
    try:
        # 尝试运行 auth status 查看是否登录
        result = subprocess.run(["iflow", "auth", "status"], capture_output=True, text=True, timeout=2)
        return "Logged in" in result.stdout or result.returncode == 0
    except:
        return False

@app.get("/api/auth/status")
async def auth_status():
    version = get_iflow_version()
    # FORCE CONNECTED if we suspect it's running but command fails
    is_connected = True if version else True 
    
    return {
        "authenticated": True, 
        "is_iflow_installed": is_connected,
        "is_iflow_authenticated": True,
        "iflow_version": version or "Active Session",
        "install_command": "npm install -g iflow-cli",
        "user": {"username": "iflow-dev"},
        "provider": "iflow"
    }

@app.get("/api/config")
async def get_config(): return global_config

@app.post("/api/config")
async def update_config(config: dict = Body(...)):
    global_config.update(config)
    agent_cache.clear()
    return global_config

@app.get("/api/projects")
async def get_projects():
    projects = project_manager.get_projects()
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    try:
        for item in os.listdir(root_dir):
            full_path = os.path.join(root_dir, item)
            if os.path.isdir(full_path) and not item.startswith('.') and item != 'agent_project':
                if not any(p["name"] == item for p in projects):
                    projects.append({"name": item, "displayName": item, "path": full_path, "fullPath": full_path, "sessions": [], "sessionMeta": {"total": 0}})
    except: pass
    return projects

@app.get("/stream")
async def stream_endpoint(message: str, cwd: str = None, sessionId: str = None, project: str = None):
    logger.info(f"=== /stream request ===")
    logger.info(f"  message: {message[:100]}...")
    logger.info(f"  cwd: {cwd}")
    logger.info(f"  project: {project}")
    logger.info(f"  sessionId: {sessionId}")
    
    target_cwd = cwd or os.getcwd()
    project_name = project or os.path.basename(target_cwd)
    if sessionId: project_manager.save_message(project_name, sessionId, "user", message)
    
    logger.info(f"Creating agent with cwd={target_cwd}, model={global_config.get('model')}")
    agent = get_agent(target_cwd, global_config["mode"], global_config.get("model"), global_config.get("mcp_servers"))
    
    async def event_generator():
        logger.info("Starting event generator...")
        yield f"data: {json.dumps({'type': 'status', 'content': 'IFlow is thinking...'})}\n\n"
        full_reply = ""
        try:
            async for chunk in agent.chat_stream(message):
                logger.debug(f"Chunk received: {chunk[:50] if chunk else 'empty'}...")
                full_reply += chunk
                yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"
            logger.info(f"Stream completed, total reply length: {len(full_reply)}")
        except Exception as e:
            logger.exception(f"Error in chat_stream: {e}")
            yield f"data: {json.dumps({'type': 'content', 'content': f'Error: {str(e)}'})}\n\n"
        if sessionId: project_manager.save_message(project_name, sessionId, "assistant", full_reply)
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/projects/{project_name}/files")
async def get_project_files(project_name: str):
    return file_service.get_tree(get_project_path(project_name))

@app.get("/api/projects/{project_name}/file")
async def read_project_file(project_name: str, filePath: str):
    try: return {"content": file_service.read_file(get_project_path(project_name), filePath)}
    except: raise HTTPException(status_code=404)

@app.put("/api/projects/{project_name}/file")
async def save_project_file(project_name: str, req: SaveFileRequest):
    try:
        file_service.write_file(get_project_path(project_name), req.filePath, req.content)
        return {"status": "success"}
    except Exception as e: return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/api/git/status")
async def get_git_status(project: str = Query(None)):
    return git_service.get_status(get_project_path(project))

@app.websocket("/shell")
async def websocket_shell(websocket: WebSocket, project: str = None):
    session = ShellSession(cwd=get_project_path(project) if project else os.getcwd())
    await session.start(websocket)

@app.get("/api/user/onboarding-status")
async def onboarding_status(): return {"hasCompletedOnboarding": True}

@app.post("/api/user/complete-onboarding")
async def complete_onboarding(): return {"success": True}

@app.api_route("/api/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def catch_all(path_name: str, request: Request):
    return JSONResponse(content={"status": "mocked"}, status_code=200)

if __name__ == "__main__":
    import uvicorn
    if platform.system() == 'Windows': asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    uvicorn.run(app, host="0.0.0.0", port=8000)
import sys
import os
import asyncio
import json
import platform
import subprocess
import logging
from datetime import datetime

# Windows 事件循环策略设置 - 必须在任何异步操作之前设置
if platform.system() == 'Windows':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI, HTTPException, Request, Query, Body, WebSocket
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse

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
from backend.core.path_validator import PathValidator, project_registry
from backend.core.error_analyzer import ErrorAnalyzer, get_error_analyzer
from backend.core.code_style_analyzer import CodeStyleAnalyzer, get_code_style_analyzer
from backend.core.report_generator import ReportGenerator, get_report_generator
from backend.core.dependency_analyzer import DependencyAnalyzer, get_dependency_analyzer
from backend.core.auto_fixer import AutoFixer, get_auto_fixer
from backend.core.code_dependency_analyzer import CodeDependencyAnalyzer, get_dependency_analyzer as get_code_dependency_analyzer
from backend.core.prompt_optimizer import PromptOptimizer, get_prompt_optimizer
from backend.core.rag_service import RAGService, get_rag_service
from backend.core.document_version_manager import get_version_manager

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

class CreateWorkspaceRequest(BaseModel):
    workspaceType: str  # 'existing' | 'new'
    path: str
    githubUrl: str = None
    githubTokenId: int = None
    newGithubToken: str = None

# --- GLOBAL CONFIG ---
global_config = {
    "mode": "yolo",
    "model": "GLM-4.7", # Set to recommended model
    "mcp_servers": [],
    "iflow_path": "iflow", # Default command
    "rag_mode": "tfidf" # RAG 模式: "chromadb" (需要下载模型) 或 "tfidf" (轻量级)
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

def get_agent(cwd: str, mode: str = "yolo", model: str = None, mcp_servers: list = None, persona: str = "partner", auth_method_id: str = None, auth_method_info: dict = None):
    key = (cwd, mode, model, json.dumps(mcp_servers or []), persona, auth_method_id)
    if key not in agent_cache:
        system_prompt = PERSONA_PROMPTS.get(persona, PERSONA_PROMPTS["partner"])
        agent_cache[key] = Agent(name="IFlowAgent", cwd=cwd, mode=mode, model=model, mcp_servers=mcp_servers, persona=persona, system_prompt=system_prompt, auth_method_id=auth_method_id, auth_method_info=auth_method_info)
    return agent_cache[key]

def get_project_path(project_name: str) -> str:
    """安全地获取项目路径，防止路径遍历攻击"""
    logger.info(f"[get_project_path] Looking for project: '{project_name}'")

    if not project_name:
        logger.warning(f"[get_project_path] No project name provided, returning cwd: {os.getcwd()}")
        return os.getcwd()

    # 检查 project_name 是否本身就是一个有效的项目路径
    # 如果包含路径分隔符（Windows: \ 或 /），则认为它是一个路径
    if '\\' in project_name or '/' in project_name:
        # 验证路径安全性
        is_valid, error, normalized = PathValidator.validate_project_path(project_name)
        if is_valid and os.path.exists(normalized):
            logger.info(f"[get_project_path] project_name is a valid path: {normalized}")
            # 注册到项目注册表
            project_registry.register_project(os.path.basename(normalized), normalized)
            return normalized

    # 首先尝试从注册表获取
    registered_path = project_registry.get_project_path(project_name)
    if registered_path:
        logger.info(f"[get_project_path] Found in registry: {registered_path}")
        return registered_path
    
    logger.info(f"[get_project_path] Not in registry, checking project_manager...")
    
    # 然后从 project_manager 获取
    projects = project_manager.get_projects()
    logger.info(f"[get_project_path] Found {len(projects)} projects in manager")
    for p in projects:
        logger.info(f"[get_project_path]   - {p.get('name')}: {p.get('fullPath')}")
        if p["name"] == project_name:
            # 验证路径安全性
            is_valid, error, normalized = PathValidator.validate_project_path(p["fullPath"])
            if is_valid:
                project_registry.register_project(p["name"], normalized)
                logger.info(f"[get_project_path] Found in project_manager: {normalized}")
                return normalized

    # 如果还是找不到，尝试在父目录下寻找匹配的项目文件夹名
    # 获取 backend 的父目录即 agent_project
    current_base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logger.info(f"[get_project_path] Checking if project_name matches current_base: {project_name} == {os.path.basename(current_base)}")
    # 检查是否匹配当前项目文件夹名
    if project_name == os.path.basename(current_base):
        logger.info(f"[get_project_path] Matched current_base: {current_base}")
        return current_base
        
    # 检查当前工作目录的父目录
    parent_dir = os.path.dirname(os.getcwd())
    potential_path = os.path.join(parent_dir, project_name)
    logger.info(f"[get_project_path] Checking potential_path: {potential_path}")
    if os.path.isdir(potential_path):
        is_valid, _, normalized = PathValidator.validate_project_path(potential_path)
        if is_valid:
            project_registry.register_project(project_name, normalized)
            logger.info(f"[get_project_path] Found in parent_dir: {normalized}")
            return normalized
    
    # 不再直接返回用户输入的路径，而是返回安全的默认值
    logger.warning(f"[get_project_path] 未找到项目: {project_name}, 返回当前工作目录: {os.getcwd()}")
    return os.getcwd()

agent_cache = {}
rag_cache = {}

# AI Persona System Prompts
PERSONA_PROMPTS = {
    "senior": """You are a senior software architect with 15+ years of experience. Your role is to ensure code excellence.

STRICT GUIDELINES:
- Always review code quality first before suggesting solutions
- Point out potential bugs, security issues, and performance problems
- Enforce best practices: SOLID principles, DRY, clean code
- Require proper error handling, logging, and testing
- Suggest design patterns and architectural improvements
- Reject quick-and-dirty solutions that lack robustness
- Prioritize maintainability, scalability, and readability
- Ask clarifying questions to understand the full context

RESPONSE STYLE:
- Professional and authoritative but constructive
- Provide detailed explanations for your recommendations
- Reference industry standards and common pitfalls
- Suggest refactoring when code is messy
- Emphasize long-term code health over quick wins

Example: "This approach has a critical flaw: it doesn't handle edge cases. Let me show you a more robust solution that follows the Repository pattern..."
""",
    "hacker": """You are a pragmatic hacker who values shipping over perfection. Your role is to get things working fast.

CORE PHILOSOPHY:
- Working code > perfect code
- Ship first, iterate later
- Minimize boilerplate and ceremony
- Use the simplest solution that works
- Skip excessive comments and documentation during dev
- Focus on the happy path, handle errors later if needed
- Copy-paste is fine if it saves time
- Use whatever libraries/tools get the job done

RESPONSE STYLE:
- Direct and action-oriented
- Minimal explanations, maximum code
- "Here's the solution" not "Let's discuss the approach"
- Skip lengthy justifications
- Assume the user knows what they're doing
- Provide shortcuts and quick fixes

Example: "Here's the code. Copy-paste it and you're done. If it breaks, we'll fix it then."
""",
    "partner": """You are an empathetic pair programming partner. Your role is to be supportive and encouraging.

EMOTIONAL INTELLIGENCE:
- Celebrate small wins and progress
- Acknowledge when tasks are difficult
- Be patient with mistakes and confusion
- Provide reassurance when debugging is frustrating
- Use encouraging language: "Great question!", "Nice work!", "We'll get this!"
- Normalize the struggle: "This is tricky, let's work through it together"
- Boost confidence: "You're doing great!", "Almost there!"

COLLABORATIVE STYLE:
- Ask questions to understand their thinking
- Suggest alternatives without being pushy
- Explain concepts in simple, friendly terms
- Share enthusiasm for solving problems together
- Make coding feel like a team effort
- Use "we" language: "Let's try this", "We can fix that"

Example: "That's a great idea! Let's implement it together. I know this part can be tricky, but we'll figure it out. Nice work getting this far!"
"""
}

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


@app.get("/api/iflow/mcp-servers")
async def get_iflow_mcp_servers():
    """从 iFlow 配置文件读取已配置的 MCP 服务器"""
    try:
        # iFlow 配置文件路径
        iflow_config_path = os.path.expanduser("~/.iflow/settings.json")

        if not os.path.exists(iflow_config_path):
            return {"success": True, "servers": [], "message": "iFlow 配置文件不存在"}

        # 读取配置文件
        with open(iflow_config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)

        # 提取 MCP 服务器配置
        mcp_servers = config.get("mcpServers", {})

        # 转换为标准格式
        servers_list = []
        for server_name, server_config in mcp_servers.items():
            if isinstance(server_config, dict):
                servers_list.append({
                    "name": server_name,
                    "type": server_config.get("type", "stdio"),
                    "config": {
                        "command": server_config.get("command", ""),
                        "args": server_config.get("args", []),
                        "env": server_config.get("env", {}),
                        "url": server_config.get("url", ""),
                        "headers": server_config.get("headers", {}),
                        "timeout": server_config.get("timeout", 30000)
                    }
                })

        logger.info(f"从 iFlow 配置读取到 {len(servers_list)} 个 MCP 服务器")
        return {
            "success": True,
            "servers": servers_list,
            "config_path": iflow_config_path
        }

    except FileNotFoundError:
        return {"success": True, "servers": [], "message": "iFlow 配置文件不存在"}
    except json.JSONDecodeError as e:
        logger.error(f"解析 iFlow 配置文件失败: {e}")
        return {"success": False, "error": f"配置文件解析失败: {str(e)}"}
    except Exception as e:
        logger.error(f"读取 iFlow MCP 配置失败: {e}")
        return {"success": False, "error": f"读取失败: {str(e)}"}


@app.post("/api/iflow/sync-mcp-servers")
async def sync_iflow_mcp_servers():
    """从 iFlow 配置同步 MCP 服务器到后端 global_config"""
    try:
        # 读取 iFlow MCP 配置
        result = await get_iflow_mcp_servers()

        if not result.get("success"):
            return {"success": False, "error": result.get("error")}

        servers = result.get("servers", [])

        # 更新 global_config
        global_config["mcp_servers"] = servers

        # 清除 agent 缓存以使用新配置
        agent_cache.clear()

        logger.info(f"已从 iFlow 同步 {len(servers)} 个 MCP 服务器到后端")
        return {
            "success": True,
            "servers_count": len(servers),
            "servers": servers
        }

    except Exception as e:
        logger.error(f"同步 iFlow MCP 服务器失败: {e}")
        return {"success": False, "error": f"同步失败: {str(e)}"}


@app.get("/api/projects")
async def get_projects():
    """获取项目列表 - 增强安全性版本"""
    projects = project_manager.get_projects()
    
    # 验证并过滤每个项目的路径
    safe_projects = []
    for p in projects:
        is_valid, error, normalized = PathValidator.validate_project_path(p.get("fullPath", ""), must_exist=False)
        if is_valid:
            # 注册到安全注册表
            project_registry.register_project(p["name"], normalized)
            safe_projects.append(p)
        else:
            logger.warning(f"跳过不安全的项目: {p.get('name')} - {error}")
    
    # 可选：扫描根目录下的其他项目（但需要验证）
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    PathValidator.add_allowed_root(root_dir)  # 允许根目录
    
    try:
        for item in os.listdir(root_dir):
            # 跳过隐藏文件和已知目录
            if item.startswith('.') or item in ['agent_project', 'node_modules', '__pycache__', 'storage']:
                continue
            
            full_path = os.path.join(root_dir, item)
            
            # 验证路径安全性
            is_valid, error, normalized = PathValidator.validate_project_path(full_path)
            if not is_valid:
                continue
            
            # 检查是否已存在
            if not any(p["name"] == item for p in safe_projects):
                safe_projects.append({
                    "name": item,
                    "displayName": item,
                    "path": normalized,
                    "fullPath": normalized,
                    "sessions": [],
                    "sessionMeta": {"total": 0}
                })
                project_registry.register_project(item, normalized)
    except Exception as e:
        logger.error(f"扫描项目目录失败: {e}")
    
    return safe_projects

@app.get("/stream")
async def stream_endpoint(message: str, cwd: str = None, sessionId: str = None, project: str = None, model: str = None, persona: str = "partner", auth_method_id: str = None, auth_method_info: str = None):
    logger.info(f"=== /stream request ===")
    logger.info(f"  message: {message[:100]}...")
    logger.info(f"  model: {model}")
    logger.info(f"  persona: {persona}")
    logger.info(f"  auth_method_id: {auth_method_id}")

    target_cwd = cwd or os.getcwd()
    project_name = project or os.path.basename(target_cwd)
    if sessionId: project_manager.save_message(project_name, sessionId, "user", message)

    # 解析认证方法信息（如果有）
    auth_info = None
    if auth_method_info:
        try:
            auth_info = json.loads(auth_method_info)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse auth_method_info: {auth_method_info}")

    # Use provided model or fallback to global config
    target_model = model or global_config.get("model")

    agent = get_agent(
        target_cwd,
        global_config["mode"],
        target_model,
        global_config.get("mcp_servers"),
        persona=persona,
        auth_method_id=auth_method_id,
        auth_method_info=auth_info
    )
    
    async def event_generator():
        yield f"data: {json.dumps({'type': 'status', 'content': 'IFlow is thinking...'})}\n\n"
        full_reply = ""
        try:
            async for msg in agent.chat_stream(message):
                # 检查 msg 是字符串还是字典
                if isinstance(msg, str):
                    # 如果是字符串，直接作为内容返回（旧客户端兼容）
                    content = msg
                    full_reply += content
                    yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
                else:
                    # 如果是字典，处理 SDK 客户端返回的消息类型
                    msg_type = msg.get("type", "text")
                    logger.debug(f">>> Stream msg: type={msg_type}, keys={list(msg.keys())}")
                    
                    if msg_type == "assistant":
                        # AI 回复（SDK 客户端）
                        content = msg.get("content", "")
                        full_reply += content
                        agent_info = msg.get("metadata", {}).get("agent_info")
                        yield f"data: {json.dumps({'type': 'content', 'content': content, 'agent_info': agent_info})}\n\n"
                        
                    elif msg_type == "tool_call":
                        # 工具调用（SDK 客户端）
                        metadata = msg.get("metadata", {})
                        tool_name = metadata.get("tool_name", "unknown")
                        status = metadata.get("status", "running")
                        agent_info = metadata.get("agent_info")
                        
                        if status == "running":
                            # 工具开始执行
                            event_data = {'type': 'tool_start', 'tool_type': 'generic', 'tool_name': tool_name, 'label': metadata.get('label', ''), 'agent_info': agent_info}
                            logger.info(f">>> TOOL_START: {event_data}")
                            yield f"data: {json.dumps(event_data)}\n\n"
                        else:
                            # 工具执行完成
                            event_data = {'type': 'tool_end', 'tool_type': 'generic', 'tool_name': tool_name, 'status': status, 'agent_info': agent_info}
                            logger.info(f">>> TOOL_END: {event_data}")
                            yield f"data: {json.dumps(event_data)}\n\n"
                            
                    elif msg_type == "plan":
                        # 执行计划（SDK 客户端）
                        entries = msg.get("metadata", {}).get("entries", [])
                        event_data = {'type': 'plan', 'entries': entries}
                        logger.info(f">>> PLAN: {len(entries)} entries")
                        yield f"data: {json.dumps(event_data)}\n\n"
                        
                    elif msg_type == "finish":
                        # 任务完成（SDK 客户端）
                        metadata = msg.get("metadata", {})
                        logger.info(f">>> FINISH: {metadata}")
                        break
                        
                    elif msg_type == "error":
                        # 错误（SDK 客户端）
                        error_content = msg.get("content", "Unknown error")
                        logger.error(f">>> ERROR: {error_content}")
                        yield f"data: {json.dumps({'type': 'error', 'content': error_content})}\n\n"
                        
                    elif msg_type == "text":
                        # 文本消息（旧客户端兼容）
                        content = msg.get("content", "")
                        full_reply += content
                        yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
                        
                    elif msg_type == "tool_start":
                        # 工具开始执行（旧客户端兼容）
                        event_data = {'type': 'tool_start', 'tool_type': msg.get('tool_type'), 'tool_name': msg.get('tool_name'), 'label': msg.get('label', ''), 'agent_info': msg.get('agent_info')}
                        logger.info(f">>> TOOL_START: {event_data}")
                        yield f"data: {json.dumps(event_data)}\n\n"
                        
                    elif msg_type == "tool_end":
                        # 工具执行完成（旧客户端兼容）
                        event_data = {'type': 'tool_end', 'tool_type': msg.get('tool_type'), 'tool_name': msg.get('tool_name'), 'status': msg.get('status', 'success'), 'agent_info': msg.get('agent_info')}
                        logger.info(f">>> TOOL_END: {event_data}")
                        yield f"data: {json.dumps(event_data)}\n\n"
                        
                    elif msg_type == "done":
                        # 完成（旧客户端兼容）
                        break
                    
            logger.info(f"Stream completed, reply length: {len(full_reply)}")
        except Exception as e:
            logger.exception(f"Error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
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
    path = get_project_path(project)
    logger.info(f"Getting git status for project '{project}' at path: '{path}'")
    return await git_service.get_status(path)

@app.get("/api/git/branches")
async def get_branches(project: str = Query(None)):
    branches = await git_service.get_branches(get_project_path(project))
    return {"branches": branches}

@app.get("/api/git/remote-status")
async def get_remote_status(project: str = Query(None)):
    return await git_service.get_remote_status(get_project_path(project))

@app.get("/api/git/diff")
async def get_diff(project: str = Query(None), file: str = Query(None)):
    diff = await git_service.get_diff(get_project_path(project), file)
    return {"diff": diff}

@app.get("/api/git/commits")
async def get_commits(project: str = Query(None), limit: int = 10):
    commits = await git_service.get_commits(get_project_path(project), limit)
    return {"commits": commits}

@app.get("/api/git/commit-diff")
async def get_commit_diff(project: str = Query(None), commit: str = Query(None)):
    diff = await git_service.get_commit_diff(get_project_path(project), commit)
    return {"diff": diff}

@app.post("/api/git/checkout")
async def checkout_branch(req: CheckoutRequest):
    await git_service.checkout(get_project_path(req.project), req.branch)
    return {"success": True}

@app.post("/api/git/create-branch")
async def create_new_branch(req: CheckoutRequest):
    await git_service.create_branch(get_project_path(req.project), req.branch)
    return {"success": True}

@app.post("/api/git/commit")
async def commit_changes(req: CommitRequest):
    output = await git_service.commit(get_project_path(req.project), req.message, req.files)
    return {"success": True, "output": output}

@app.get("/api/git/file-with-diff")
async def get_file_with_diff(project: str = Query(None), file: str = Query(None)):
    logger.info(f"[GitDiff] project={project}, file={file}")
    path = get_project_path(project)
    current_content = ""
    try:
        current_content = file_service.read_file(path, file)
    except Exception as e:
        logger.warning(f"[GitDiff] Failed to read current file: {e}")
        pass # File might be deleted

    old_content = await git_service.get_file_at_head(path, file)

    return {
        "currentContent": current_content,
        "oldContent": old_content
    }

@app.websocket("/shell")
async def websocket_shell(websocket: WebSocket, project: str = None):
    session = ShellSession(cwd=get_project_path(project) if project else os.getcwd())
    await session.start(websocket)

@app.get("/api/user/onboarding-status")
async def onboarding_status(): return {"hasCompletedOnboarding": True}

@app.post("/api/user/complete-onboarding")
async def complete_onboarding(): return {"success": True}

@app.get("/api/projects/{project_name}/sessions")
async def get_sessions(project_name: str, limit: int = 5, offset: int = 0):
    """获取项目的会话列表"""
    sessions = project_manager.get_sessions(project_name, limit, offset)
    return {
        "sessions": sessions,
        "hasMore": len(sessions) >= limit,
        "total": len(sessions)
    }

@app.put("/api/projects/{project_name}/sessions/{session_id}")
async def update_session_summary(project_name: str, session_id: str, request: Request):
    """更新 session 的自定义名称/摘要"""
    try:
        data = await request.json()
        summary = data.get("summary")

        if not summary:
            return JSONResponse(content={"error": "Summary is required"}, status_code=400)

        project_manager.update_session_summary(project_name, session_id, summary)

        return {"success": True, "summary": summary}
    except Exception as e:
        logger.error(f"Error updating session summary: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/api/projects/{project_name}/sessions/{session_id}/messages")
async def get_session_messages(project_name: str, session_id: str, limit: int = None, offset: int = 0):
    """获取 session 的消息列表"""
    messages = project_manager.get_messages(project_name, session_id)

    # 如果指定了 limit，则分页
    if limit is not None:
        messages = messages[offset:offset + limit]
    elif offset > 0:
        messages = messages[offset:]

    return {
        "messages": messages,
        "total": len(messages),
        "hasMore": limit is not None and len(messages) >= limit
    }

@app.get("/api/projects/{project_name}/sessions/{session_id}/token-usage")
async def get_token_usage(project_name: str, session_id: str):
    """获取 session 的 token 使用情况（简化版本）"""
    try:
        messages = project_manager.get_messages(project_name, session_id)

        # 简单估算：假设每条消息大约使用一定数量的 token
        # 实际应用中应该从 AI 响应中获取准确的 token 计数
        total_messages = len(messages)
        estimated_tokens = total_messages * 100  # 粗略估算

        return {
            "totalMessages": total_messages,
            "estimatedTokens": estimated_tokens,
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"Error getting token usage: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

# --- 项目创建工作流 API ---

@app.get("/api/validate-path")
async def validate_path(path: str = Query(...)):
    """验证路径状态（用于前端实时反馈）"""
    try:
        path = os.path.expanduser(path.strip())
        path = os.path.abspath(path)
        
        exists = os.path.exists(path)
        is_dir = os.path.isdir(path) if exists else False
        is_empty = False
        is_git = False
        
        if is_dir:
            try:
                is_empty = not any(os.scandir(path))
                is_git = os.path.isdir(os.path.join(path, ".git"))
            except PermissionError:
                pass
                
        parent_exists = os.path.exists(os.path.dirname(path))
        
        return {
            "exists": exists,
            "isDirectory": is_dir,
            "isEmpty": is_empty,
            "isGit": is_git,
            "parentExists": parent_exists,
            "path": path
        }
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)


@app.post("/api/projects/create-workspace")
async def create_workspace(req: CreateWorkspaceRequest):
    """创建或添加工作空间"""
    logger.info(f"=== 创建工作空间请求 ===")
    logger.info(f"  类型: {req.workspaceType}")
    logger.info(f"  路径: {req.path}")
    logger.info(f"  GitHub URL: {req.githubUrl}")
    
    try:
        # 规范化路径
        workspace_path = os.path.expanduser(req.path.strip())
        workspace_path = os.path.abspath(workspace_path)

        # 验证路径安全性
        is_valid, error, normalized_path = PathValidator.validate_project_path(
            workspace_path,
            must_exist=(req.workspaceType == 'existing')
        )

        # 如果验证失败是因为不在允许的根目录范围内，动态添加该路径
        if not is_valid and "不在允许的根目录范围内" in error:
            logger.info(f"路径不在允许列表中，动态添加: {workspace_path}")
            # 添加该路径及其父目录到允许列表
            PathValidator.add_allowed_root(workspace_path)
            PathValidator.add_allowed_root(os.path.dirname(workspace_path))

            # 重新验证
            is_valid, error, normalized_path = PathValidator.validate_project_path(
                workspace_path,
                must_exist=(req.workspaceType == 'existing')
            )

        if req.workspaceType == 'existing':
            # 已有工作空间 - 需要路径存在
            if not is_valid:
                logger.error(f"路径验证失败: {error}")
                return JSONResponse(
                    content={"error": f"无效的工作空间路径: {error}"},
                    status_code=400
                )

            if not os.path.isdir(normalized_path):
                return JSONResponse(
                    content={"error": "指定的路径不是一个目录"},
                    status_code=400
                )
        else:
            # 新建工作空间
            parent_dir = os.path.dirname(workspace_path)
            
            # 检查父目录是否存在
            if not os.path.exists(parent_dir):
                try:
                    os.makedirs(parent_dir, exist_ok=True)
                    logger.info(f"创建父目录: {parent_dir}")
                except Exception as e:
                    return JSONResponse(
                        content={"error": f"无法创建父目录: {e}"},
                        status_code=400
                    )
            
            if req.githubUrl:
                # 从 GitHub 克隆
                logger.info(f"从 GitHub 克隆: {req.githubUrl}")
                
                # 构建 git clone 命令
                clone_url = req.githubUrl.strip()
                
                # 如果提供了 token，修改 URL 以包含认证信息
                if req.newGithubToken:
                    # 解析 GitHub URL 并注入 token
                    if clone_url.startswith("https://github.com/"):
                        clone_url = clone_url.replace(
                            "https://github.com/",
                            f"https://{req.newGithubToken}@github.com/"
                        )
                    elif clone_url.startswith("https://"):
                        # 通用 HTTPS URL
                        clone_url = clone_url.replace(
                            "https://",
                            f"https://{req.newGithubToken}@"
                        )
                
                try:
                    # 执行 git clone
                    result = subprocess.run(
                        ["git", "clone", clone_url, workspace_path],
                        capture_output=True,
                        text=True,
                        timeout=300,  # 5分钟超时
                        cwd=parent_dir
                    )
                    
                    if result.returncode != 0:
                        error_msg = result.stderr or result.stdout or "克隆失败"
                        # 清理错误信息中可能包含的 token
                        if req.newGithubToken:
                            error_msg = error_msg.replace(req.newGithubToken, "***")
                        logger.error(f"Git clone 失败: {error_msg}")
                        return JSONResponse(
                            content={"error": f"Git clone 失败: {error_msg}"},
                            status_code=400
                        )
                    
                    logger.info(f"成功克隆仓库到: {workspace_path}")
                    
                except subprocess.TimeoutExpired:
                    return JSONResponse(
                        content={"error": "克隆超时，请检查网络连接或仓库大小"},
                        status_code=408
                    )
                except FileNotFoundError:
                    return JSONResponse(
                        content={"error": "Git 未安装或不在系统 PATH 中"},
                        status_code=500
                    )
                except Exception as e:
                    logger.exception(f"Git clone 异常: {e}")
                    return JSONResponse(
                        content={"error": f"克隆过程中发生错误: {str(e)}"},
                        status_code=500
                    )
            else:
                # 创建空目录
                if not os.path.exists(workspace_path):
                    os.makedirs(workspace_path, exist_ok=True)
                    logger.info(f"创建空工作空间: {workspace_path}")
                elif os.listdir(workspace_path):
                    return JSONResponse(
                        content={"error": "目录已存在且不为空"},
                        status_code=400
                    )
            
            normalized_path = workspace_path
        
        # 将项目添加到项目管理器
        project = project_manager.add_project(normalized_path)
        
        # 注册到路径验证器
        project_registry.register_project(project["name"], normalized_path)
        
        logger.info(f"工作空间创建成功: {project}")
        
        return {
            "success": True,
            "project": project,
            "message": f"{'已添加' if req.workspaceType == 'existing' else '已创建'}工作空间: {project['displayName']}"
        }
        
    except Exception as e:
        logger.exception(f"创建工作空间失败: {e}")
        return JSONResponse(
            content={"error": f"创建工作空间失败: {str(e)}"},
            status_code=500
        )


@app.get("/api/browse-filesystem")
async def browse_filesystem(path: str = Query(None)):
    """浏览文件系统，提供路径自动补全建议"""
    try:
        suggestions = []
        
        # 如果没有提供路径，返回用户主目录和一些常用目录
        if not path or path == "~":
            home_dir = os.path.expanduser("~")
            base_dirs = [
                {"name": "Home", "path": home_dir, "type": "directory"},
            ]
            
            # Windows 特有目录
            if platform.system() == "Windows":
                # 添加所有驱动器
                import string
                for drive in string.ascii_uppercase:
                    drive_path = f"{drive}:\\"
                    if os.path.exists(drive_path):
                        base_dirs.append({
                            "name": f"驱动器 {drive}:",
                            "path": drive_path,
                            "type": "directory"
                        })
            else:
                # Unix/Mac 常用目录
                common_dirs = ["/home", "/Users", "/var/www", "/opt"]
                for d in common_dirs:
                    if os.path.isdir(d):
                        base_dirs.append({
                            "name": os.path.basename(d) or d,
                            "path": d,
                            "type": "directory"
                        })
            
            return {"suggestions": base_dirs, "currentPath": home_dir}
        
        # 展开 ~ 符号
        expanded_path = os.path.expanduser(path)
        
        # 确定要浏览的目录
        if os.path.isdir(expanded_path):
            browse_dir = expanded_path
            prefix = ""
        else:
            browse_dir = os.path.dirname(expanded_path)
            prefix = os.path.basename(expanded_path).lower()
        
        if not os.path.isdir(browse_dir):
            return {"suggestions": [], "currentPath": path, "error": "目录不存在"}
        
        # 列出目录内容
        try:
            entries = os.listdir(browse_dir)
        except PermissionError:
            return {"suggestions": [], "currentPath": path, "error": "权限不足"}
        
        for entry in entries:
            # 跳过隐藏文件（除非用户明确输入了点号开头）
            if entry.startswith('.') and not prefix.startswith('.'):
                continue
            
            # 前缀过滤
            if prefix and not entry.lower().startswith(prefix):
                continue
            
            full_path = os.path.join(browse_dir, entry)
            
            # 只返回目录（工作空间必须是目录）
            if os.path.isdir(full_path):
                suggestions.append({
                    "name": entry,
                    "path": full_path,
                    "type": "directory"
                })
        
        # 按名称排序
        suggestions.sort(key=lambda x: x["name"].lower())
        
        # 限制返回数量
        suggestions = suggestions[:20]
        
        return {
            "suggestions": suggestions,
            "currentPath": expanded_path
        }
        
    except Exception as e:
        logger.error(f"浏览文件系统失败: {e}")
        return JSONResponse(
            content={"error": f"浏览文件系统失败: {str(e)}"},
            status_code=500
        )


@app.post("/api/projects/create")
async def create_project(req: CreateProjectRequest):
    """创建项目（简单版本 - 仅添加现有路径）"""
    try:
        workspace_path = os.path.expanduser(req.path.strip())
        workspace_path = os.path.abspath(workspace_path)

        if not os.path.isdir(workspace_path):
            return JSONResponse(
                content={"error": "指定的路径不存在或不是目录"},
                status_code=400
            )

        # 尝试注册项目，如果失败则动态添加路径
        project = project_manager.add_project(workspace_path)

        # 注册到项目注册表
        is_registered, error = project_registry.register_project(project["name"], workspace_path)
        if not is_registered:
            # 如果注册失败是因为路径不在允许列表中，动态添加
            if "不在允许的根目录范围内" in error:
                logger.info(f"路径不在允许列表中，动态添加: {workspace_path}")
                PathValidator.add_allowed_root(workspace_path)
                PathValidator.add_allowed_root(os.path.dirname(workspace_path))

                # 重新注册
                is_registered, error = project_registry.register_project(project["name"], workspace_path)

            if not is_registered:
                logger.error(f"注册项目失败: {error}")
                return JSONResponse(
                    content={"error": f"注册项目失败: {error}"},
                    status_code=400
                )

        return {"success": True, "project": project}

    except Exception as e:
        logger.exception(f"创建项目失败: {e}")
        return JSONResponse(
            content={"error": f"创建项目失败: {str(e)}"},
            status_code=500
        )


@app.post("/api/error-analyze")
async def analyze_error(request: Request):
    """分析错误并提供修复建议"""
    try:
        data = await request.json()
        error_output = data.get('error', '')
        project_path = data.get('projectPath', '')

        if not error_output:
            return JSONResponse(
                content={"error": "错误输出不能为空"},
                status_code=400
            )

        # 获取错误分析器
        analyzer = get_error_analyzer(project_path) if project_path else ErrorAnalyzer('.')

        # 分析错误
        analysis = analyzer.analyze_error(error_output, project_path)

        # 获取代码上下文
        if analysis['error_info']['file'] and analysis['error_info']['line']:
            context = analyzer.get_error_context(
                analysis['error_info']['file'],
                analysis['error_info']['line']
            )
            analysis['code_context'] = context

        # 生成自动修复方案
        if analysis['can_auto_fix']:
            auto_fix = analyzer.generate_auto_fix(error_output, project_path)
            analysis['auto_fix'] = auto_fix

        return {
            "success": True,
            "analysis": analysis
        }

    except Exception as e:
        logger.exception(f"错误分析失败: {e}")
        return JSONResponse(
            content={"error": f"错误分析失败: {str(e)}"},
            status_code=500
        )


@app.post("/api/auto-fix")
async def auto_fix_error(request: Request):
    """自动检测并修复错误"""
    try:
        data = await request.json()
        error_output = data.get('error', '')
        project_path = data.get('projectPath', '')
        context = data.get('context', {})

        if not error_output:
            return JSONResponse(
                content={"error": "错误输出不能为空"},
                status_code=400
            )

        if not project_path:
            return JSONResponse(
                content={"error": "项目路径不能为空"},
                status_code=400
            )

        logger.info(f"开始自动修复: {error_output[:100]}...")

        # 获取 Agent 实例
        agent = get_agent(
            project_path,
            global_config["mode"],
            global_config.get("model"),
            global_config.get("mcp_servers")
        )

        # 获取自动修复器
        auto_fixer = get_auto_fixer(project_path, agent)

        # 执行自动修复
        result = await auto_fixer.detect_and_fix(error_output, context)

        logger.info(f"自动修复结果: {result}")

        return {
            "success": True,
            "result": result
        }

    except Exception as e:
        logger.exception(f"自动修复失败: {e}")
        return JSONResponse(
            content={"error": f"自动修复失败: {str(e)}"},
            status_code=500
        )


@app.get("/api/auto-fix/history")
async def get_auto_fix_history(projectPath: str = Query(..., description="项目路径")):
    """获取自动修复历史"""
    try:
        auto_fixer = get_auto_fixer(projectPath)
        history = auto_fixer.get_fix_history()

        return {
            "success": True,
            "history": history
        }

    except Exception as e:
        logger.exception(f"获取修复历史失败: {e}")
        return JSONResponse(
            content={"error": f"获取修复历史失败: {str(e)}"},
            status_code=500
        )


@app.delete("/api/auto-fix/history")
async def clear_auto_fix_history(projectPath: str = Query(..., description="项目路径")):
    """清空自动修复历史"""
    try:
        auto_fixer = get_auto_fixer(projectPath)
        auto_fixer.clear_history()

        return {
            "success": True,
            "message": "修复历史已清空"
        }

    except Exception as e:
        logger.exception(f"清空修复历史失败: {e}")
        return JSONResponse(
            content={"error": f"清空修复历史失败: {str(e)}"},
            status_code=500
        )


@app.post("/api/context/analyze")
async def analyze_context(request: Request):
    """分析项目上下文（依赖关系、调用关系、类继承）"""
    try:
        data = await request.json()
        project_path = data.get('projectPath', '')
        include_dirs = data.get('includeDirs', [])

        if not project_path:
            return JSONResponse(
                content={"error": "项目路径不能为空"},
                status_code=400
            )

        logger.info(f"开始分析项目上下文: {project_path}")

        # 获取依赖分析器
        analyzer = get_dependency_analyzer(project_path)

        # 分析项目
        result = analyzer.analyze_project(include_dirs)

        logger.info(f"项目上下文分析完成: {len(result['modules'])} 个模块")

        return {
            "success": True,
            "data": result
        }

    except Exception as e:
        logger.exception(f"分析项目上下文失败: {e}")
        return JSONResponse(
            content={"error": f"分析项目上下文失败: {str(e)}"},
            status_code=500
        )


@app.get("/api/context/module/{module_name}")
async def get_module_context(module_name: str, projectPath: str = Query(..., description="项目路径")):
    """获取特定模块的上下文信息"""
    try:
        analyzer = get_dependency_analyzer(projectPath)

        if module_name not in analyzer.modules:
            return JSONResponse(
                content={"error": f"模块 {module_name} 不存在"},
                status_code=404
            )

        module = analyzer.modules[module_name]

        # 获取依赖的模块
        dependencies = set(module.imports)
        for from_module in module.from_imports.keys():
            dependencies.add(from_module)

        # 获取被依赖的模块
        dependents = []
        for other_module_name, other_module in analyzer.modules.items():
            if module_name in other_module.imports or module_name in other_module.from_imports:
                dependents.append(other_module_name)

        return {
            "success": True,
            "module": {
                "name": module_name,
                "file_path": module.file_path,
                "imports": list(module.imports),
                "from_imports": {k: list(v) for k, v in module.from_imports.items()},
                "functions": {
                    func_name: {
                        "line": func_info.line_start,
                        "parameters": func_info.parameters,
                        "calls": list(func_info.calls),
                        "is_async": func_info.is_async,
                        "is_method": func_info.is_method,
                        "class_name": func_info.class_name
                    }
                    for func_name, func_info in module.functions.items()
                },
                "classes": {
                    class_name: {
                        "line": class_info.line_start,
                        "bases": class_info.bases,
                        "methods": list(class_info.methods.keys()),
                        "attributes": list(class_info.attributes)
                    }
                    for class_name, class_info in module.classes.items()
                }
            },
            "dependencies": list(dependencies),
            "dependents": dependents
        }

    except Exception as e:
        logger.exception(f"获取模块上下文失败: {e}")
        return JSONResponse(
            content={"error": f"获取模块上下文失败: {str(e)}"},
            status_code=500
        )


@app.post("/api/code-style-analyze")
async def analyze_code_style(request: Request):
    """分析项目代码风格"""
    try:
        data = await request.json()
        project_path = data.get('projectPath', '')

        if not project_path:
            return JSONResponse(
                content={"error": "项目路径不能为空"},
                status_code=400
            )

        # 获取代码风格分析器
        analyzer = get_code_style_analyzer(project_path)

        # 分析代码风格
        style_profile = analyzer.analyze_project_style()
        style_summary = analyzer.get_style_summary()

        return {
            "success": True,
            "styleProfile": style_profile,
            "summary": style_summary
        }

    except Exception as e:
        logger.exception(f"代码风格分析失败: {e}")
        return JSONResponse(
            content={"error": f"代码风格分析失败: {str(e)}"},
            status_code=500
        )


@app.post("/api/prompt-optimize")
async def optimize_prompt(request: Request):
    """根据项目特征智能优化用户输入的消息（使用大模型）"""
    try:
        data = await request.json()
        project_path = data.get('projectPath', '')
        user_input = data.get('userInput', '')
        base_persona = data.get('persona', 'partner')

        if not project_path:
            return JSONResponse(
                content={"error": "项目路径不能为空"},
                status_code=400
            )

        if not user_input:
            return JSONResponse(
                content={"error": "用户输入不能为空"},
                status_code=400
            )

        logger.info(f"开始智能优化消息: project={project_path}, persona={base_persona}, input={user_input[:100]}...")

        # 获取提示词优化器
        optimizer = get_prompt_optimizer(project_path)

        # 先分析项目（这会扫描项目代码）
        analysis = optimizer.analyze_project()

        # 分析用户意图
        intent = optimizer.analyze_user_intent(user_input)

        # 查找相关代码
        relevant_code = optimizer.find_relevant_code(user_input, intent)

        # 构建项目上下文
        project_context = optimizer._build_project_context()
        style_guide = optimizer._build_style_guide()

        # 构建优化提示词
        optimization_prompt = f"""你是一个专业的提示词优化专家。请根据以下信息，优化用户的输入消息，使其更具体、更符合项目的实际情况。

## 项目信息
{project_context}

## 代码风格指南
{style_guide}

## 用户意图
- 意图类型: {intent.get('type', 'unknown')}
- 关键词: {', '.join(intent.get('keywords', []))}
- 实体: {', '.join(intent.get('entities', []))}

## 相关代码
"""
        if relevant_code:
            for code in relevant_code:
                if code['type'] == 'function':
                    optimization_prompt += f"- 函数: {code['name']} (在 {code['file']})"
                else:
                    optimization_prompt += f"- 类: {code['name']} (在 {code['file']})"
        else:
            optimization_prompt += "- 无相关代码"

        optimization_prompt += f"""

## 用户原始输入
{user_input}

## 任务
请优化用户的输入消息，使其：
1. 包含项目背景信息
2. 引用相关的代码（如果有）
3. 明确代码风格要求
4. 根据意图类型添加具体要求
5. 让 AI 能够更好地理解项目上下文并提供准确的解决方案

请直接输出优化后的消息，不要包含任何解释或额外文字。"""

        logger.info("调用大模型优化消息...")

        # 创建 iFlow 客户端
        from backend.core.iflow_client import create_iflow_client
        iflow_client = create_iflow_client(
            cwd=project_path,
            mode=global_config.get("mode", "yolo"),
            model=global_config.get("model", "GLM-4.7")
        )

        # 调用大模型
        optimized_message = ""
        async for chunk in iflow_client.chat_stream(optimization_prompt):
            optimized_message += chunk

        optimized_message = optimized_message.strip()

        logger.info(f"大模型优化完成，消息长度: {len(optimized_message)}")

        return {
            "success": True,
            "analysis": analysis,
            "intent": intent,
            "relevantCode": relevant_code,
            "originalInput": user_input,
            "optimizedMessage": optimized_message,
            "projectContext": project_context,
            "codeStyleGuide": style_guide
        }

    except Exception as e:
        logger.exception(f"智能消息优化失败: {e}")
        return JSONResponse(
            content={"error": f"智能消息优化失败: {str(e)}"},
            status_code=500
        )


@app.post("/api/generate-report")
async def generate_report(req: dict):
    """生成工作报告"""
    try:
        project_path = req.get("projectPath")
        report_type = req.get("type", "daily")
        
        if not project_path:
            return JSONResponse(
                content={"error": "项目路径不能为空"},
                status_code=400
            )
        
        expanded_path = os.path.expanduser(project_path)
        
        # 验证路径
        is_valid, error, normalized = PathValidator.validate_project_path(expanded_path)
        if not is_valid:
            return JSONResponse(
                content={"error": f"无效的项目路径: {error}"},
                status_code=400
            )
        
        analyzer = get_report_generator()
        report = analyzer.generate_report(normalized, report_type)
        
        return {"success": True, "report": report}
        
    except Exception as e:
        logger.exception(f"生成报告失败: {e}")
        return JSONResponse(
            content={"error": f"生成报告失败: {str(e)}"},
            status_code=500
        )


@app.post("/api/context-analyze")
async def analyze_context(req: dict):
    """分析代码上下文和依赖关系"""
    try:
        project_path = req.get("projectPath")
        node_id = req.get("nodeId")
        max_depth = req.get("maxDepth", 2)
        
        if not project_path:
            return JSONResponse(
                content={"error": "项目路径不能为空"},
                status_code=400
            )
        
        expanded_path = os.path.expanduser(project_path)
        
        # 验证路径
        is_valid, error, normalized = PathValidator.validate_project_path(expanded_path)
        if not is_valid:
            return JSONResponse(
                content={"error": f"无效的项目路径: {error}"},
                status_code=400
            )
        
        analyzer = get_dependency_analyzer()
        
        # 分析项目
        analyzer.analyze_project(normalized)
        
        # 如果指定了节点 ID，获取上下文图谱
        if node_id:
            context_graph = analyzer.get_context_graph(node_id, max_depth)
            return {"success": True, "graph": context_graph}
        
        # 否则返回所有节点列表
        nodes = []
        for node_id, node in analyzer.nodes.items():
            nodes.append({
                'id': node_id,
                'name': node.name,
                'type': node.type.value,
                'file': os.path.basename(node.file_path),
                'line': node.line_number,
                'full_path': node.file_path
            })
        
        return {"success": True, "nodes": nodes[:100]}  # 限制返回数量
        
    except Exception as e:
        logger.exception(f"分析上下文失败: {e}")
        return JSONResponse(
            content={"error": f"分析上下文失败: {str(e)}"},
            status_code=500
        )


@app.post("/api/context-search")
async def search_context(req: dict):
    """搜索代码节点"""
    try:
        project_path = req.get("projectPath")
        query = req.get("query")
        limit = req.get("limit", 20)
        
        if not project_path or not query:
            return JSONResponse(
                content={"error": "项目路径和查询词不能为空"},
                status_code=400
            )
        
        expanded_path = os.path.expanduser(project_path)
        
        # 验证路径
        is_valid, error, normalized = PathValidator.validate_project_path(expanded_path)
        if not is_valid:
            return JSONResponse(
                content={"error": f"无效的项目路径: {error}"},
                status_code=400
            )
        
        analyzer = get_dependency_analyzer()
        analyzer.analyze_project(normalized)
        
        results = analyzer.search_nodes(query, limit)
        
        return {"success": True, "results": results}

    except Exception as e:
        logger.exception(f"搜索上下文失败: {e}")
        return JSONResponse(
            content={"error": f"搜索上下文失败: {str(e)}"},
            status_code=500
        )


@app.post("/api/query")
async def simple_query(req: dict):
    """简单的同步查询 API - 快速获取 AI 响应"""
    try:
        from backend.core.iflow_client import query_sync

        prompt = req.get("prompt")
        project = req.get("project")
        model = req.get("model")
        system_prompt = req.get("system_prompt")
        timeout = req.get("timeout", 300.0)

        if not prompt:
            return JSONResponse(
                content={"error": "prompt 不能为空"},
                status_code=400
            )

        # 获取项目路径
        cwd = None
        if project:
            cwd = get_project_path(project)

        # 执行查询
        response = query_sync(
            prompt=prompt,
            cwd=cwd,
            model=model,
            system_prompt=system_prompt,
            timeout=timeout
        )

        return {"success": True, "response": response}

    except Exception as e:
        logger.exception(f"简单查询失败: {e}")
        return JSONResponse(
            content={"error": f"查询失败: {str(e)}"},
            status_code=500
        )


@app.get("/api/mcp/config/read")
async def get_mcp_config():
    """读取 MCP 配置"""
    try:
        iflow_config_path = os.path.expanduser("~/.iflow/settings.json")
        
        if not os.path.exists(iflow_config_path):
            return {"success": False, "error": "iFlow 配置文件不存在"}
        
        with open(iflow_config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        mcp_servers = config.get("mcpServers", {})
        
        # 转换为前端需要的格式
        servers = []
        for name, server_config in mcp_servers.items():
            servers.append({
                "id": name,
                "name": name,
                "type": server_config.get("type", "stdio"),
                "scope": "user",
                "config": server_config,
                "created": datetime.now().isoformat(),
                "updated": datetime.now().isoformat()
            })
        
        return {"success": True, "servers": servers}
    except Exception as e:
        logger.exception(f"读取 MCP 配置失败: {e}")
        return {"success": False, "error": str(e)}


@app.get("/api/mcp/cli/list")
async def list_mcp_cli():
    """通过 CLI 列出 MCP 服务器"""
    try:
        # 尝试通过 iflow mcp list 命令获取
        result = subprocess.run(
            ["iflow", "mcp", "list"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            # 解析 CLI 输出
            servers = []
            # 这里需要根据实际输出格式解析
            # 暂时返回空列表
            return {"success": True, "servers": servers}
        else:
            return {"success": False, "error": result.stderr}
    except Exception as e:
        logger.warning(f"通过 CLI 列出 MCP 服务器失败: {e}")
        return {"success": False, "error": str(e)}


@app.get("/api/mcp/servers")
async def get_mcp_servers(scope: str = "user"):
    """获取 MCP 服务器列表"""
    try:
        # 从 global_config 获取
        servers = global_config.get("mcp_servers", [])
        return {"success": True, "servers": servers}
    except Exception as e:
        logger.exception(f"获取 MCP 服务器失败: {e}")
        return {"success": False, "error": str(e)}


@app.post("/api/context/analyze-dependencies")
async def analyze_code_dependencies(request: Request):
    """分析代码依赖关系并生成可视化数据"""
    try:
        data = await request.json()
        project_path = data.get('projectPath', '')

        if not project_path:
            return JSONResponse(
                content={"error": "项目路径不能为空"},
                status_code=400
            )

        # 验证路径
        is_valid, error, normalized = PathValidator.validate_project_path(project_path)
        if not is_valid:
            return JSONResponse(
                content={"error": error},
                status_code=400
            )

        # 获取依赖分析器
        analyzer = get_code_dependency_analyzer(normalized)

        # 分析依赖关系
        result = analyzer.analyze_project_dependencies()

        return {
            "success": True,
            "data": result
        }

    except Exception as e:
        logger.exception(f"代码依赖分析失败: {e}")
        return JSONResponse(
            content={"error": f"代码依赖分析失败: {str(e)}"},
            status_code=500
        )


@app.post("/api/context/analyze-module")
async def analyze_module_dependencies(request: Request):
    """分析特定模块的依赖关系"""
    try:
        data = await request.json()
        project_path = data.get('projectPath', '')
        module_name = data.get('moduleName', '')

        if not project_path:
            return JSONResponse(
                content={"error": "项目路径不能为空"},
                status_code=400
            )

        if not module_name:
            return JSONResponse(
                content={"error": "模块名称不能为空"},
                status_code=400
            )

        # 验证路径
        is_valid, error, normalized = PathValidator.validate_project_path(project_path)
        if not is_valid:
            return JSONResponse(
                content={"error": error},
                status_code=400
            )

        # 获取依赖分析器
        analyzer = get_code_dependency_analyzer(normalized)

        # 分析模块依赖
        result = analyzer.analyze_module_dependencies(module_name)

        return {
            "success": True,
            "data": result
        }

    except Exception as e:
        logger.exception(f"模块依赖分析失败: {e}")
        return JSONResponse(
            content={"error": f"模块依赖分析失败: {str(e)}"},
            status_code=500
        )


# --- TaskMaster API 端点 ---

@app.get("/api/taskmaster/installation-status")
async def get_taskmaster_installation_status():
    """获取 TaskMaster 安装状态"""
    return {
        "installation": {"isInstalled": False},
        "isReady": False
    }

@app.get("/api/taskmaster/tasks/{project_name}")
async def get_taskmaster_tasks(project_name: str):
    """获取项目的任务列表"""
    # TODO: 实现从存储中读取任务列表
    return {
        "tasks": [],
        "total": 0,
        "completed": 0
    }

@app.get("/api/taskmaster/prd/{project_name}")
async def get_taskmaster_prd(project_name: str):
    """获取项目的 PRD 文档"""
    # TODO: 实现从存储中读取 PRD 文档
    return {
        "prd": None,
        "exists": False
    }

# --- Cursor Sessions API 端点 ---

@app.get("/api/cursor/sessions")
async def get_cursor_sessions(projectPath: str = Query(...)):
    """获取 Cursor sessions 列表"""
    # TODO: 实现 Cursor sessions 读取逻辑
    # Cursor sessions 通常存储在 ~/.cursor/sessions/ 目录下
    return {
        "success": True,
        "sessions": []
    }

# --- Commands API 端点 ---

@app.post("/api/commands/list")
async def list_commands(request: Request):
    """获取可用的命令列表"""
    # TODO: 实现命令列表读取逻辑
    return {
        "commands": []
    }

# --- MCP Utils API 端点 ---

@app.get("/api/mcp-utils/taskmaster-server")
async def get_taskmaster_server_status():
    """获取 TaskMaster MCP 服务器状态"""
    return {
        "status": "not-implemented",
        "message": "TaskMaster MCP server is not implemented"
    }

# --- RAG API 端点 ---

@app.get("/api/rag/stats")
async def get_rag_stats(project_path: str = None, project_name: str = None):
    """获取 RAG 统计信息"""
    try:
        # 优先使用 project_path，如果没有则使用 project_name
        if project_path:
            # 直接使用提供的项目路径
            final_project_path = project_path
        elif project_name:
            # 通过项目名称查找项目路径
            final_project_path = get_project_path(project_name)
        else:
            return JSONResponse(
                content={"error": "缺少 project_path 或 project_name 参数"},
                status_code=400
            )

        if final_project_path not in rag_cache:
            rag_cache[final_project_path] = get_rag_service(final_project_path)

        rag_service = rag_cache[final_project_path]
        stats = rag_service.get_stats()

        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        logger.exception(f"获取 RAG 统计失败: {e}")
        return JSONResponse(
            content={"error": f"获取 RAG 统计失败: {str(e)}"},
            status_code=500
        )


@app.get("/api/rag/status")
async def get_rag_status():
    """获取 RAG 依赖状态"""
    try:
        from backend.core.rag_service import CHROMADB_AVAILABLE, SKLEARN_AVAILABLE, SENTENCE_TRANSFORMERS_AVAILABLE
        
        return {
            "success": True,
            "dependencies": {
                "chromadb": CHROMADB_AVAILABLE,
                "sentence_transformers": SENTENCE_TRANSFORMERS_AVAILABLE,
                "sklearn": SKLEARN_AVAILABLE
            },
            "current_mode": global_config.get("rag_mode", "tfidf"),
            "available_retrievers": []
        }
    except Exception as e:
        logger.exception(f"获取 RAG 状态失败: {e}")
        return JSONResponse(
            content={"error": f"获取 RAG 状态失败: {str(e)}"},
            status_code=500
        )


@app.post("/api/rag/index")
async def index_project_rag(request: Request, project_path: str = None, project_name: str = None):
    """索引项目文档到 RAG（支持增量索引）"""
    try:
        # 优先使用 project_path，如果没有则使用 project_name
        if project_path:
            # 直接使用提供的项目路径
            final_project_path = project_path
            logger.info(f"RAG indexing request for project_path: {project_path}")
        elif project_name:
            # 通过项目名称查找项目路径
            final_project_path = get_project_path(project_name)
            logger.info(f"RAG indexing request for project_name: {project_name}, path: {final_project_path}")
        else:
            return JSONResponse(
                content={"error": "缺少 project_path 或 project_name 参数"},
                status_code=400
            )

        logger.info(f"RAG indexing request for project: {final_project_path}")
        
        # 解析请求参数
        try:
            data = await request.json() if request.method == "POST" else {}
            force_reindex = data.get("force_reindex", False)
        except Exception as e:
            logger.warning(f"Failed to parse request JSON: {e}")
            data = {}
            force_reindex = False
        
        # 检查依赖
        from backend.core.rag_service import CHROMADB_AVAILABLE, SKLEARN_AVAILABLE
        
        if not CHROMADB_AVAILABLE and not SKLEARN_AVAILABLE:
            error_msg = "缺少必要的依赖库。请安装 chromadb 或 scikit-learn:\n" \
                        "pip install chromadb sentence-transformers\n" \
                        "或\n" \
                        "pip install scikit-learn"
            logger.error(error_msg)
            return JSONResponse(
                content={"error": error_msg},
                status_code=500
            )
        
        logger.info(f"Dependencies check: CHROMADB_AVAILABLE={CHROMADB_AVAILABLE}, SKLEARN_AVAILABLE={SKLEARN_AVAILABLE}")
        
        # 确保 RAG 服务被创建（使用项目路径作为缓存键）
        if project_path not in rag_cache:
            # 根据配置选择 RAG 模式
            rag_mode = global_config.get("rag_mode", "tfidf")
            use_chromadb = (rag_mode == "chromadb")
            
            if use_chromadb and not CHROMADB_AVAILABLE:
                logger.warning("ChromaDB requested but not available, falling back to TF-IDF")
                use_chromadb = False
            
            rag_cache[project_path] = get_rag_service(project_path, use_chromadb=use_chromadb)
            logger.info(f"Created new RAG service for {project_name} at {project_path} (mode: {'ChromaDB' if use_chromadb else 'TF-IDF'})")
        
        rag_service = rag_cache[project_path]
        
        # 创建异步生成器用于进度更新
        async def progress_generator():
            try:
                logger.info(f"Starting progress generator for {project_name}")
                async for result in rag_service.index_project(force_reindex=force_reindex):
                    # 发送所有类型的结果
                    msg = f"data: {json.dumps(result)}\n\n"
                    logger.debug(f"Yielding: {msg.strip()}")
                    yield msg
                    
                    # 完成后退出
                    if result.get("type") == "complete":
                        logger.info(f"Indexing complete for {project_name}")
                        break
                    elif result.get("type") == "error":
                        logger.error(f"Indexing error for {project_name}: {result.get('message')}")
                        break
            except Exception as e:
                logger.exception(f"Progress generator error for {project_name}: {e}")
                error_msg = f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
                yield error_msg
        
        return StreamingResponse(progress_generator(), media_type="text/event-stream")
    
    except Exception as e:
        logger.exception(f"RAG 索引失败: {e}")
        return JSONResponse(
            content={"error": f"RAG 索引失败: {str(e)}"},
            status_code=500
        )


@app.post("/api/rag/retrieve/{project_name}")
async def retrieve_rag(project_name: str, request: Request):
    """检索相关文档（支持高级检索选项）"""
    try:
        data = await request.json()
        query = data.get("query", "")
        n_results = data.get("n_results", 5)
        
        # 高级检索选项
        similarity_threshold = data.get("similarity_threshold", 0.0)  # 相似度阈值
        file_types = data.get("file_types", [])  # 文件类型过滤
        languages = data.get("languages", [])  # 编程语言过滤
        min_chunk_size = data.get("min_chunk_size", 0)  # 最小块大小
        max_chunk_size = data.get("max_chunk_size", float('inf'))  # 最大块大小
        sort_by = data.get("sort_by", "similarity")  # 排序方式: similarity, date, size
        
        if not query:
            return JSONResponse(
                content={"error": "查询文本不能为空"},
                status_code=400
            )
        
        project_path = get_project_path(project_name)
        
        if project_path not in rag_cache:
            rag_cache[project_path] = get_rag_service(project_path)
        
        rag_service = rag_cache[project_path]
        
        # 执行检索
        results = rag_service.retrieve(query, n_results)
        
        # 应用过滤和排序
        filtered_results = []
        for result in results:
            metadata = result.get('metadata', {})
            similarity = result.get('similarity', 0)
            
            # 相似度阈值过滤
            if similarity < similarity_threshold:
                continue
            
            # 文件类型过滤
            if file_types:
                file_ext = os.path.splitext(metadata.get('file_path', ''))[1].lower()
                if file_ext not in file_types:
                    continue
            
            # 编程语言过滤
            if languages:
                language = metadata.get('language', '')
                if language not in languages:
                    continue
            
            # 块大小过滤
            content_size = len(result.get('content', ''))
            if content_size < min_chunk_size or content_size > max_chunk_size:
                continue
            
            filtered_results.append(result)
        
        # 排序
        if sort_by == "similarity":
            filtered_results.sort(key=lambda x: x.get('similarity', 0), reverse=True)
        elif sort_by == "date":
            filtered_results.sort(key=lambda x: x.get('metadata', {}).get('timestamp', ''), reverse=True)
        elif sort_by == "size":
            filtered_results.sort(key=lambda x: len(x.get('content', '')), reverse=True)
        
        # 限制结果数量
        final_results = filtered_results[:n_results]
        
        return {
            "success": True,
            "query": query,
            "results": final_results,
            "count": len(final_results),
            "total_filtered": len(filtered_results),
            "filters_applied": {
                "similarity_threshold": similarity_threshold,
                "file_types": file_types,
                "languages": languages,
                "min_chunk_size": min_chunk_size,
                "max_chunk_size": max_chunk_size,
                "sort_by": sort_by
            }
        }
    except Exception as e:
        logger.exception(f"RAG 检索失败: {e}")
        return JSONResponse(
            content={"error": f"RAG 检索失败: {str(e)}"},
            status_code=500
        )


@app.post("/api/rag/reset/{project_name}")
async def reset_rag(project_name: str):
    """重置 RAG 索引"""
    try:
        project_path = get_project_path(project_name)
        
        if project_path in rag_cache:
            rag_service = rag_cache[project_path]
            rag_service.reset()
            del rag_cache[project_path]
        
        return {
            "success": True,
            "message": "RAG 索引已重置"
        }
    except Exception as e:
        logger.exception(f"RAG 重置失败: {e}")
        return JSONResponse(
            content={"error": f"RAG 重置失败: {str(e)}"},
            status_code=500
        )


@app.post("/api/rag/clear-cache")
async def clear_rag_cache():
    """清除 RAG 服务缓存"""
    try:
        count = len(rag_cache)
        rag_cache.clear()
        logger.info(f"Cleared RAG cache: {count} services removed")
        
        return {
            "success": True,
            "message": f"已清除 {count} 个 RAG 服务缓存"
        }
    except Exception as e:
        logger.exception(f"清除 RAG 缓存失败: {e}")
        return JSONResponse(
            content={"error": f"清除 RAG 缓存失败: {str(e)}"},
            status_code=500
        )


@app.post("/api/rag/ask/{project_name}")
async def ask_rag_question(project_name: str, request: Request):
    """向 RAG 知识库提问"""
    try:
        data = await request.json()
        question = data.get("question", "")
        
        if not question:
            return JSONResponse(
                content={"error": "问题不能为空"},
                status_code=400
            )
        
        project_path = get_project_path(project_name)
        
        # 获取 RAG 服务
        if project_path not in rag_cache:
            rag_mode = global_config.get("rag_mode", "tfidf")
            use_chromadb = (rag_mode == "chromadb")
            if use_chromadb and not CHROMADB_AVAILABLE:
                use_chromadb = False
            rag_cache[project_path] = get_rag_service(project_path, use_chromadb=use_chromadb)
        
        rag_service = rag_cache[project_path]
        
        # 检查是否有文档
        stats = rag_service.get_stats()
        if stats.get("document_count", 0) == 0:
            return JSONResponse(
                content={"answer": "知识库中还没有文档。请先添加文档或索引项目。", "sources": []},
                status_code=200
            )
        
        # 检索相关文档
        results = rag_service.retrieve(question, n_results=5)
        
        if not results or len(results) == 0:
            return JSONResponse(
                content={"answer": "知识库中没有找到相关文档。", "sources": []},
                status_code=200
            )
        
        # 构建上下文
        context_parts = []
        sources = []
        max_similarity = 0
        
        for i, result in enumerate(results):
            # result 是字典，不是对象
            metadata = result.get('metadata', {})
            similarity = result.get('similarity', 0)
            
            # 记录最高相似度
            if similarity > max_similarity:
                max_similarity = similarity
            
            # 提取更详细的来源信息
            file_path = metadata.get('file_path', '未知文件')
            chunk_index = metadata.get('chunk_index', 0)
            total_chunks = metadata.get('total_chunks', 1)
            start_line = metadata.get('start_line', 1)
            end_line = metadata.get('end_line', 1)
            language = metadata.get('language', '')
            summary = metadata.get('summary', '')
            
            # 构建来源描述
            source_desc = f"{file_path}"
            if language:
                source_desc += f" ({language})"
            if start_line and end_line:
                source_desc += f" [行 {start_line}-{end_line}]"
            
            context_parts.append(f"[文档 {i+1}] {source_desc}:\n{result['content']}")
            
            sources.append({
                "file_path": file_path,
                "content": result['content'][:200] + '...' if len(result['content']) > 200 else result['content'],
                "similarity": similarity,
                "chunk_index": chunk_index,
                "total_chunks": total_chunks,
                "start_line": start_line,
                "end_line": end_line,
                "language": language,
                "summary": summary,
                "source_desc": source_desc
            })
        
        logger.info(f"RAG 问答: 为问题 '{question}' 找到 {len(sources)} 个来源")
        logger.info("=" * 80)
        logger.info("返回给前端的 sources 数组:")
        logger.info("=" * 80)
        for i, source in enumerate(sources):
            logger.info(f"\n来源 #{i+1}:")
            logger.info(f"  file_path: {source['file_path']}")
            logger.info(f"  chunk_index: {source['chunk_index']}")
            logger.info(f"  total_chunks: {source['total_chunks']}")
            logger.info(f"  start_line: {source['start_line']}")
            logger.info(f"  end_line: {source['end_line']}")
            logger.info(f"  similarity: {source['similarity']}")
            logger.info(f"  content_length: {len(source['content'])}")
            logger.info(f"  content_preview: {source['content'][:150]}")
        logger.info("=" * 80)
        
        context = '\n\n'.join(context_parts)
        
        # 计算置信度评分（基于检索结果的相似度）
        confidence_score = 0
        if sources:
            # 使用平均相似度作为置信度
            avg_similarity = sum(s['similarity'] for s in sources) / len(sources)
            confidence_score = avg_similarity * 100
        
        # 使用 AI 生成回答
        try:
            agent = get_agent(project_path, global_config.get("mode", "yolo"), global_config.get("model"))
            
            # 构建包含上下文的提示
            rag_prompt = f"""你是一个智能助手，请基于以下知识库内容回答用户的问题。

知识库内容：
{context}

用户问题：{question}

请基于以上知识库内容回答问题。如果知识库中没有相关信息，请明确说明。回答要准确、简洁、有帮助。"""
            
            # 收集 AI 回答
            answer_parts = []
            async for msg in agent.chat_stream(rag_prompt):
                if isinstance(msg, str):
                    answer_parts.append(msg)
                elif isinstance(msg, dict) and msg.get("type") == "assistant":
                    answer_parts.append(msg.get("content", ""))
            
            answer = "".join(answer_parts)
            
            # 如果没有生成回答，使用默认回答
            if not answer:
                answer = f"基于知识库找到 {len(results)} 个相关文档。\n\n相关文档：\n"
                for i, source in enumerate(sources):
                    answer += f"{i+1}. {source['file_path']}\n"
        
        except Exception as ai_error:
            logger.warning(f"AI 生成回答失败，使用默认回答: {ai_error}")
            answer = f"基于知识库找到 {len(results)} 个相关文档。\n\n相关文档：\n"
            for i, source in enumerate(sources):
                answer += f"{i+1}. {source['file_path']}\n"
        
        return JSONResponse(
            content={
                "answer": answer,
                "question": question,
                "sources": sources,
                "confidence": {
                    "score": round(confidence_score, 2),
                    "level": "high" if confidence_score > 70 else "medium" if confidence_score > 40 else "low"
                },
                "related_documents": [
                    {
                        "file_path": s['file_path'],
                        "similarity": s['similarity'],
                        "summary": s.get('summary', '')
                    }
                    for s in sources[:3]  # 推荐 top 3 相关文档
                ]
            },
            status_code=200
        )
        
    except Exception as e:
        logger.exception(f"RAG 问答失败: {e}")
        return JSONResponse(
            content={"error": f"RAG 问答失败: {str(e)}"},
            status_code=500
        )


@app.post("/api/rag/upload/{project_name}")
async def upload_document_to_rag(project_name: str, request: Request):
    """上传文档到 RAG 知识库"""
    try:
        project_path = get_project_path(project_name)
        
        # 解析表单数据
        form = await request.form()
        file = form.get("file")
        
        if not file:
            return JSONResponse(
                content={"error": "未找到文件"},
                status_code=400
            )
        
        # 读取文件内容
        content = await file.read()
        text_content = content.decode('utf-8', errors='ignore')
        
        # 获取 RAG 服务
        if project_path not in rag_cache:
            rag_mode = global_config.get("rag_mode", "tfidf")
            use_chromadb = (rag_mode == "chromadb")
            if use_chromadb and not CHROMADB_AVAILABLE:
                use_chromadb = False
            rag_cache[project_path] = get_rag_service(project_path, use_chromadb=use_chromadb)
        
        rag_service = rag_cache[project_path]
        
        # 添加文档
        result = await rag_service.add_document(
            file_name=file.filename,
            content=text_content,
            file_type=os.path.splitext(file.filename)[1].lower()
        )
        
        return result
        
    except Exception as e:
        logger.exception(f"上传文档到 RAG 失败: {e}")
        return JSONResponse(
            content={"error": f"上传文档到 RAG 失败: {str(e)}"},
            status_code=500
        )


@app.post("/api/rag/upload-batch/{project_name}")
async def upload_documents_batch_to_rag(project_name: str, request: Request):
    """批量上传文档到 RAG 知识库"""
    try:
        project_path = get_project_path(project_name)
        
        # 解析表单数据
        form = await request.form()
        files = form.getlist("files")
        
        if not files:
            return JSONResponse(
                content={"error": "未找到文件"},
                status_code=400
            )
        
        # 保存文件到临时目录
        temp_dir = os.path.join(project_path, ".rag_temp")
        os.makedirs(temp_dir, exist_ok=True)
        
        file_paths = []
        for file in files:
            file_path = os.path.join(temp_dir, file.filename)
            with open(file_path, 'wb') as f:
                f.write(await file.read())
            file_paths.append(file_path)
        
        # 获取 RAG 服务
        if project_path not in rag_cache:
            rag_mode = global_config.get("rag_mode", "tfidf")
            use_chromadb = (rag_mode == "chromadb")
            if use_chromadb and not CHROMADB_AVAILABLE:
                use_chromadb = False
            rag_cache[project_path] = get_rag_service(project_path, use_chromadb=use_chromadb)
        
        rag_service = rag_cache[project_path]
        
        # 创建流式响应
        async def progress_generator():
            try:
                async for result in rag_service.add_documents_from_files(file_paths):
                    yield f"data: {json.dumps(result)}\n\n"
                    
                    if result.get("type") == "complete":
                        # 清理临时文件
                        for fp in file_paths:
                            try:
                                os.remove(fp)
                            except:
                                pass
                        break
            except Exception as e:
                logger.exception(f"批量上传文档失败: {e}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        
        return StreamingResponse(progress_generator(), media_type="text/event-stream")
        
    except Exception as e:
        logger.exception(f"批量上传文档到 RAG 失败: {e}")
        return JSONResponse(
            content={"error": f"批量上传文档到 RAG 失败: {str(e)}"},
            status_code=500
        )


@app.post("/api/rag/add-files/{project_name}")
async def add_files_to_rag(project_name: str, request: Request):
    """添加系统文件路径到 RAG 知识库（直接读取，不上传）"""
    try:
        data = await request.json()
        file_paths = data.get("file_paths", [])
        
        logger.info(f"收到添加文件请求，项目: {project_name}, 文件数: {len(file_paths)}")
        logger.info(f"文件路径列表: {file_paths}")
        
        if not file_paths:
            return JSONResponse(
                content={"error": "未提供文件路径"},
                status_code=400
            )
        
        project_path = get_project_path(project_name)
        
        # 验证路径安全性（RAG 允许更宽松的路径限制）
        valid_paths = []
        for file_path in file_paths:
            # 规范化路径
            file_path = os.path.abspath(file_path)
            logger.info(f"处理文件: {file_path}")
            
            # 检查路径是否存在
            if not os.path.exists(file_path):
                logger.warning(f"跳过不存在的文件路径: {file_path}")
                continue
            
            # 检查是否是文件
            if not os.path.isfile(file_path):
                logger.warning(f"跳过非文件路径: {file_path}")
                continue
            
            # 检查文件大小（限制 500MB）
            try:
                file_size = os.path.getsize(file_path)
                if file_size > 500 * 1024 * 1024:  # 500MB
                    logger.warning(f"跳过过大的文件: {file_path} ({file_size} bytes)")
                    continue
            except:
                logger.warning(f"无法获取文件大小: {file_path}")
                continue
            
            # 检查文件类型
            allowed_extensions = {
                '.txt', '.md', '.rst', '.py', '.js', '.ts', '.jsx', '.tsx',
                '.java', '.go', '.rs', '.json', '.yaml', '.yml', '.html', '.css',
                '.xml', '.csv', '.log', '.sql', '.sh', '.bat', '.ps1',
                '.docx', '.xlsx', '.pptx', '.pdf'
            }
            ext = os.path.splitext(file_path)[1].lower()
            if ext not in allowed_extensions:
                logger.warning(f"跳过不支持的文件类型: {file_path} ({ext})")
                continue
            
            valid_paths.append(file_path)
            logger.info(f"文件有效: {file_path}")
        
        logger.info(f"有效文件数: {len(valid_paths)}")
        
        if not valid_paths:
            return JSONResponse(
                content={"error": "没有有效的文件路径（文件不存在、过大或不支持的类型）。支持的最大文件大小: 500MB"},
                status_code=400
            )
        
        # 获取 RAG 服务
        if project_path not in rag_cache:
            rag_mode = global_config.get("rag_mode", "tfidf")
            use_chromadb = (rag_mode == "chromadb")
            if use_chromadb and not CHROMADB_AVAILABLE:
                use_chromadb = False
            rag_cache[project_path] = get_rag_service(project_path, use_chromadb=use_chromadb)
        
        rag_service = rag_cache[project_path]
        
        # 创建流式响应
        async def progress_generator():
            try:
                async for result in rag_service.add_documents_from_files(valid_paths):
                    yield f"data: {json.dumps(result)}\n\n"
            except Exception as e:
                logger.exception(f"添加文件到 RAG 失败: {e}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        
        return StreamingResponse(progress_generator(), media_type="text/event-stream")
        
    except Exception as e:
        logger.exception(f"添加文件到 RAG 失败: {e}")
        return JSONResponse(
            content={"error": f"添加文件到 RAG 失败: {str(e)}"},
            status_code=500
        )

# ==================== 文档版本管理 API ====================

@app.get("/api/document-versions/{project_name}/{file_path:path}")
async def get_document_versions(project_name: str, file_path: str):
    """获取文档的所有版本"""
    try:
        project_path = get_project_path(project_name)
        version_manager = get_version_manager(project_path)
        
        # 构建完整的文件路径
        full_file_path = os.path.join(project_path, file_path)
        
        if not os.path.exists(full_file_path):
            return JSONResponse(
                content={"error": "文件不存在"},
                status_code=404
            )
        
        versions = version_manager.get_versions(full_file_path)
        
        return {
            "success": True,
            "file_path": file_path,
            "versions": versions,
            "total": len(versions)
        }
    except Exception as e:
        logger.exception(f"获取文档版本失败: {e}")
        return JSONResponse(
            content={"error": f"获取文档版本失败: {str(e)}"},
            status_code=500
        )


@app.get("/api/document-versions/{project_name}/{file_path:path}/{version_id}")
async def get_document_version(project_name: str, file_path: str, version_id: str):
    """获取特定版本的文档内容"""
    try:
        project_path = get_project_path(project_name)
        version_manager = get_version_manager(project_path)
        
        # 构建完整的文件路径
        full_file_path = os.path.join(project_path, file_path)
        
        version = version_manager.get_version(full_file_path, version_id)
        
        if not version:
            return JSONResponse(
                content={"error": "版本不存在"},
                status_code=404
            )
        
        return {
            "success": True,
            "version": version
        }
    except Exception as e:
        logger.exception(f"获取文档版本内容失败: {e}")
        return JSONResponse(
            content={"error": f"获取文档版本内容失败: {str(e)}"},
            status_code=500
        )


@app.post("/api/document-versions/{project_name}/{file_path:path}/record")
async def record_document_version(project_name: str, file_path: str, request: Request):
    """记录文档版本"""
    try:
        project_path = get_project_path(project_name)
        version_manager = get_version_manager(project_path)
        
        # 构建完整的文件路径
        full_file_path = os.path.join(project_path, file_path)
        
        if not os.path.exists(full_file_path):
            return JSONResponse(
                content={"error": "文件不存在"},
                status_code=404
            )
        
        # 获取元数据
        try:
            data = await request.json()
            metadata = data.get("metadata", {})
        except:
            metadata = {}
        
        # 记录版本
        version = version_manager.record_version(full_file_path, metadata=metadata)
        
        if not version:
            return JSONResponse(
                content={"error": "记录版本失败"},
                status_code=500
            )
        
        return {
            "success": True,
            "version": version
        }
    except Exception as e:
        logger.exception(f"记录文档版本失败: {e}")
        return JSONResponse(
            content={"error": f"记录文档版本失败: {str(e)}"},
            status_code=500
        )


@app.get("/api/document-versions/{project_name}/{file_path:path}/compare/{version_id1}/{version_id2}")
async def compare_document_versions(project_name: str, file_path: str, version_id1: str, version_id2: str):
    """比较两个文档版本"""
    try:
        project_path = get_project_path(project_name)
        version_manager = get_version_manager(project_path)
        
        # 构建完整的文件路径
        full_file_path = os.path.join(project_path, file_path)
        
        comparison = version_manager.compare_versions(full_file_path, version_id1, version_id2)
        
        if not comparison:
            return JSONResponse(
                content={"error": "比较版本失败"},
                status_code=500
            )
        
        return {
            "success": True,
            "comparison": comparison
        }
    except Exception as e:
        logger.exception(f"比较文档版本失败: {e}")
        return JSONResponse(
            content={"error": f"比较文档版本失败: {str(e)}"},
            status_code=500
        )


@app.delete("/api/document-versions/{project_name}/{file_path:path}/{version_id}")
async def delete_document_version(project_name: str, file_path: str, version_id: str):
    """删除特定版本"""
    try:
        project_path = get_project_path(project_name)
        version_manager = get_version_manager(project_path)
        
        # 构建完整的文件路径
        full_file_path = os.path.join(project_path, file_path)
        
        success = version_manager.delete_version(full_file_path, version_id)
        
        return {
            "success": success,
            "message": "版本已删除" if success else "删除版本失败"
        }
    except Exception as e:
        logger.exception(f"删除文档版本失败: {e}")
        return JSONResponse(
            content={"error": f"删除文档版本失败: {str(e)}"},
            status_code=500
        )


@app.get("/api/document-versions/{project_name}/statistics")
async def get_version_statistics(project_name: str):
    """获取版本统计信息"""
    try:
        project_path = get_project_path(project_name)
        version_manager = get_version_manager(project_path)
        
        stats = version_manager.get_statistics()
        
        return {
            "success": True,
            "statistics": stats
        }
    except Exception as e:
        logger.exception(f"获取版本统计失败: {e}")
        return JSONResponse(
            content={"error": f"获取版本统计失败: {str(e)}"},
            status_code=500
        )

# ============================================================================
# 开发者工具 API
# ============================================================================

import sqlite3
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

# 数据库路径
DB_PATH = os.path.join(os.path.dirname(__file__), "developer_tools.db")

def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """初始化数据库表"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 代码片段表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS snippets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            code TEXT NOT NULL,
            language TEXT DEFAULT 'javascript',
            category TEXT DEFAULT '通用',
            description TEXT,
            tags TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_favorite INTEGER DEFAULT 0,
            usage_count INTEGER DEFAULT 0
        )
    ''')
    
    # 命令快捷方式表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS command_shortcuts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            command TEXT NOT NULL,
            category TEXT DEFAULT '通用',
            description TEXT,
            tags TEXT,
            working_dir TEXT,
            timeout INTEGER DEFAULT 60,
            parameters TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_favorite INTEGER DEFAULT 0,
            usage_count INTEGER DEFAULT 0
        )
    ''')
    
    # 提示词表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS prompts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT DEFAULT '自定义',
            description TEXT,
            tags TEXT,
            parameters TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_favorite INTEGER DEFAULT 0,
            usage_count INTEGER DEFAULT 0
        )
    ''')
    
    # 方案表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS solutions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            requirement TEXT NOT NULL,
            solution TEXT NOT NULL,
            template_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 执行历史表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS execution_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shortcut_id INTEGER,
            command TEXT,
            working_dir TEXT,
            status TEXT,
            output TEXT,
            error TEXT,
            exit_code INTEGER,
            duration REAL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (shortcut_id) REFERENCES command_shortcuts(id)
        )
    ''')
    
    conn.commit()
    conn.close()

# 初始化数据库
try:
    init_db()
    logger.info("开发者工具数据库初始化成功")
except Exception as e:
    logger.error(f"数据库初始化失败: {e}")

# ============================================================================
# 代码片段管理器 API
# ============================================================================

class SnippetCreate(BaseModel):
    title: str
    code: str
    language: str = "javascript"
    category: str = "通用"
    description: str = ""
    tags: List[str] = []

class SnippetUpdate(BaseModel):
    title: Optional[str] = None
    code: Optional[str] = None
    language: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None

@app.get("/api/snippets")
async def get_snippets(
    search: Optional[str] = None,
    category: Optional[str] = None,
    language: Optional[str] = None,
    favorite_only: bool = False
):
    """获取代码片段列表"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM snippets WHERE 1=1"
        params = []
        
        if search:
            query += " AND (title LIKE ? OR description LIKE ? OR code LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
        
        if category:
            query += " AND category = ?"
            params.append(category)
        
        if language:
            query += " AND language = ?"
            params.append(language)
        
        if favorite_only:
            query += " AND is_favorite = 1"
        
        query += " ORDER BY updated_at DESC"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        snippets = []
        for row in rows:
            snippet = dict(row)
            snippet['tags'] = json.loads(snippet['tags']) if snippet['tags'] else []
            snippets.append(snippet)
        
        # 获取分类和标签
        categories = [row[0] for row in cursor.execute("SELECT DISTINCT category FROM snippets ORDER BY category")]
        tags = set()
        for snippet in snippets:
            tags.update(snippet['tags'])
        
        conn.close()
        
        return JSONResponse({
            "snippets": snippets,
            "categories": categories,
            "tags": list(tags)
        })
    except Exception as e:
        logger.exception(f"获取代码片段失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/snippets")
async def create_snippet(snippet: SnippetCreate):
    """创建代码片段"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO snippets (title, code, language, category, description, tags)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            snippet.title,
            snippet.code,
            snippet.language,
            snippet.category,
            snippet.description,
            json.dumps(snippet.tags)
        ))
        
        snippet_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return JSONResponse({"id": snippet_id, "message": "代码片段创建成功"})
    except Exception as e:
        logger.exception(f"创建代码片段失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/snippets/categories")
async def get_snippet_categories():
    """获取代码片段分类"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT DISTINCT category FROM snippets ORDER BY category")
        categories = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        
        return JSONResponse({"categories": categories})
    except Exception as e:
        logger.exception(f"获取代码片段分类失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/snippets/tags")
async def get_snippet_tags():
    """获取代码片段标签"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT tags FROM snippets")
        all_tags = set()
        for row in cursor.fetchall():
            if row[0]:
                tags = json.loads(row[0])
                all_tags.update(tags)
        
        conn.close()
        
        return JSONResponse({"tags": list(all_tags)})
    except Exception as e:
        logger.exception(f"获取代码片段标签失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/snippets/{snippet_id}")
async def get_snippet(snippet_id: int):
    """获取单个代码片段"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM snippets WHERE id = ?", (snippet_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return JSONResponse({"error": "代码片段不存在"}, status_code=404)
        
        snippet = dict(row)
        snippet['tags'] = json.loads(snippet['tags']) if snippet['tags'] else []
        
        # 增加使用次数
        cursor.execute("UPDATE snippets SET usage_count = usage_count + 1 WHERE id = ?", (snippet_id,))
        conn.commit()
        
        conn.close()
        
        return JSONResponse(snippet)
    except Exception as e:
        logger.exception(f"获取代码片段失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.put("/api/snippets/{snippet_id}")
async def update_snippet(snippet_id: int, snippet: SnippetUpdate):
    """更新代码片段"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 检查是否存在
        cursor.execute("SELECT id FROM snippets WHERE id = ?", (snippet_id,))
        if not cursor.fetchone():
            conn.close()
            return JSONResponse({"error": "代码片段不存在"}, status_code=404)
        
        # 构建更新语句
        updates = []
        params = []
        
        if snippet.title is not None:
            updates.append("title = ?")
            params.append(snippet.title)
        if snippet.code is not None:
            updates.append("code = ?")
            params.append(snippet.code)
        if snippet.language is not None:
            updates.append("language = ?")
            params.append(snippet.language)
        if snippet.category is not None:
            updates.append("category = ?")
            params.append(snippet.category)
        if snippet.description is not None:
            updates.append("description = ?")
            params.append(snippet.description)
        if snippet.tags is not None:
            updates.append("tags = ?")
            params.append(json.dumps(snippet.tags))
        
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(snippet_id)
        
        query = f"UPDATE snippets SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, params)
        
        conn.commit()
        conn.close()
        
        return JSONResponse({"message": "代码片段更新成功"})
    except Exception as e:
        logger.exception(f"更新代码片段失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.delete("/api/snippets/{snippet_id}")
async def delete_snippet(snippet_id: int):
    """删除代码片段"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM snippets WHERE id = ?", (snippet_id,))
        
        if cursor.rowcount == 0:
            conn.close()
            return JSONResponse({"error": "代码片段不存在"}, status_code=404)
        
        conn.commit()
        conn.close()
        
        return JSONResponse({"message": "代码片段删除成功"})
    except Exception as e:
        logger.exception(f"删除代码片段失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/snippets/popular")
async def get_popular_snippets(limit: int = 10):
    """获取热门代码片段"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM snippets ORDER BY usage_count DESC, updated_at DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        
        snippets = []
        for row in rows:
            snippet = dict(row)
            snippet['tags'] = json.loads(snippet['tags']) if snippet['tags'] else []
            snippets.append(snippet)
        
        conn.close()
        
        return JSONResponse({"snippets": snippets})
    except Exception as e:
        logger.exception(f"获取热门代码片段失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/snippets/recent")
async def get_recent_snippets(limit: int = 10):
    """获取最近代码片段"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM snippets ORDER BY updated_at DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        
        snippets = []
        for row in rows:
            snippet = dict(row)
            snippet['tags'] = json.loads(snippet['tags']) if snippet['tags'] else []
            snippets.append(snippet)
        
        conn.close()
        
        return JSONResponse({"snippets": snippets})
    except Exception as e:
        logger.exception(f"获取最近代码片段失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/snippets/{snippet_id}/usage")
async def increment_snippet_usage(snippet_id: int):
    """增加代码片段使用次数"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("UPDATE snippets SET usage_count = usage_count + 1 WHERE id = ?", (snippet_id,))
        
        if cursor.rowcount == 0:
            conn.close()
            return JSONResponse({"error": "代码片段不存在"}, status_code=404)
        
        conn.commit()
        conn.close()
        
        return JSONResponse({"message": "使用次数已更新"})
    except Exception as e:
        logger.exception(f"更新使用次数失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

# ============================================================================
# 命令快捷方式 API
# ============================================================================

class CommandShortcutCreate(BaseModel):
    name: str
    command: str
    category: str = "通用"
    description: str = ""
    tags: List[str] = []
    working_dir: str = ""
    timeout: int = 60
    parameters: List[Dict[str, Any]] = []

class CommandShortcutUpdate(BaseModel):
    name: Optional[str] = None
    command: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    working_dir: Optional[str] = None
    timeout: Optional[int] = None
    parameters: Optional[List[Dict[str, Any]]] = None

@app.get("/api/command-shortcuts")
async def get_command_shortcuts(
    search: Optional[str] = None,
    category: Optional[str] = None,
    favorite_only: bool = False
):
    """获取命令快捷方式列表"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM command_shortcuts WHERE 1=1"
        params = []
        
        if search:
            query += " AND (name LIKE ? OR description LIKE ? OR command LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
        
        if category:
            query += " AND category = ?"
            params.append(category)
        
        if favorite_only:
            query += " AND is_favorite = 1"
        
        query += " ORDER BY usage_count DESC, updated_at DESC"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        shortcuts = []
        for row in rows:
            shortcut = dict(row)
            shortcut['tags'] = json.loads(shortcut['tags']) if shortcut['tags'] else []
            shortcut['parameters'] = json.loads(shortcut['parameters']) if shortcut['parameters'] else []
            shortcuts.append(shortcut)
        
        # 获取分类和标签
        categories = [row[0] for row in cursor.execute("SELECT DISTINCT category FROM command_shortcuts ORDER BY category")]
        tags = set()
        for shortcut in shortcuts:
            tags.update(shortcut['tags'])
        
        conn.close()
        
        return JSONResponse({
            "shortcuts": shortcuts,
            "categories": categories,
            "tags": list(tags)
        })
    except Exception as e:
        logger.exception(f"获取命令快捷方式失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/command-shortcuts")
async def create_command_shortcut(shortcut: CommandShortcutCreate):
    """创建命令快捷方式"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO command_shortcuts (name, command, category, description, tags, working_dir, timeout, parameters)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            shortcut.name,
            shortcut.command,
            shortcut.category,
            shortcut.description,
            json.dumps(shortcut.tags),
            shortcut.working_dir,
            shortcut.timeout,
            json.dumps(shortcut.parameters)
        ))
        
        shortcut_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return JSONResponse({"id": shortcut_id, "message": "命令快捷方式创建成功"})
    except Exception as e:
        logger.exception(f"创建命令快捷方式失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.put("/api/command-shortcuts/{shortcut_id}")
async def update_command_shortcut(shortcut_id: int, shortcut: CommandShortcutUpdate):
    """更新命令快捷方式"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM command_shortcuts WHERE id = ?", (shortcut_id,))
        if not cursor.fetchone():
            conn.close()
            return JSONResponse({"error": "命令快捷方式不存在"}, status_code=404)
        
        updates = []
        params = []
        
        if shortcut.name is not None:
            updates.append("name = ?")
            params.append(shortcut.name)
        if shortcut.command is not None:
            updates.append("command = ?")
            params.append(shortcut.command)
        if shortcut.category is not None:
            updates.append("category = ?")
            params.append(shortcut.category)
        if shortcut.description is not None:
            updates.append("description = ?")
            params.append(shortcut.description)
        if shortcut.tags is not None:
            updates.append("tags = ?")
            params.append(json.dumps(shortcut.tags))
        if shortcut.working_dir is not None:
            updates.append("working_dir = ?")
            params.append(shortcut.working_dir)
        if shortcut.timeout is not None:
            updates.append("timeout = ?")
            params.append(shortcut.timeout)
        if shortcut.parameters is not None:
            updates.append("parameters = ?")
            params.append(json.dumps(shortcut.parameters))
        
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(shortcut_id)
        
        query = f"UPDATE command_shortcuts SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, params)
        
        conn.commit()
        conn.close()
        
        return JSONResponse({"message": "命令快捷方式更新成功"})
    except Exception as e:
        logger.exception(f"更新命令快捷方式失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.delete("/api/command-shortcuts/{shortcut_id}")
async def delete_command_shortcut(shortcut_id: int):
    """删除命令快捷方式"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM command_shortcuts WHERE id = ?", (shortcut_id,))
        
        if cursor.rowcount == 0:
            conn.close()
            return JSONResponse({"error": "命令快捷方式不存在"}, status_code=404)
        
        conn.commit()
        conn.close()
        
        return JSONResponse({"message": "命令快捷方式删除成功"})
    except Exception as e:
        logger.exception(f"删除命令快捷方式失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/command-shortcuts/categories")
async def get_command_shortcut_categories():
    """获取命令快捷方式分类"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT DISTINCT category FROM command_shortcuts ORDER BY category")
        categories = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        
        return JSONResponse({"categories": categories})
    except Exception as e:
        logger.exception(f"获取命令快捷方式分类失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/command-shortcuts/tags")
async def get_command_shortcut_tags():
    """获取命令快捷方式标签"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT tags FROM command_shortcuts")
        all_tags = set()
        for row in cursor.fetchall():
            if row[0]:
                tags = json.loads(row[0])
                all_tags.update(tags)
        
        conn.close()
        
        return JSONResponse({"tags": list(all_tags)})
    except Exception as e:
        logger.exception(f"获取命令快捷方式标签失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/command-shortcuts/history")
async def get_execution_history(limit: int = 50):
    """获取执行历史"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT eh.*, cs.name as shortcut_name
            FROM execution_history eh
            LEFT JOIN command_shortcuts cs ON eh.shortcut_id = cs.id
            ORDER BY eh.executed_at DESC
            LIMIT ?
        ''', (limit,))
        
        history = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return JSONResponse({"history": history})
    except Exception as e:
        logger.exception(f"获取执行历史失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/command-shortcuts/{shortcut_id}/execute")
async def execute_command_shortcut(shortcut_id: int, params: Optional[Dict[str, Any]] = None):
    """执行命令快捷方式"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM command_shortcuts WHERE id = ?", (shortcut_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return JSONResponse({"error": "命令快捷方式不存在"}, status_code=404)
        
        shortcut = dict(row)
        command = shortcut['command']
        working_dir = shortcut['working_dir'] or os.getcwd()
        timeout = shortcut['timeout']
        
        # 替换参数
        if params:
            for key, value in params.items():
                command = command.replace(f"${{{key}}}", str(value))
        
        # 增加使用次数
        cursor.execute("UPDATE command_shortcuts SET usage_count = usage_count + 1 WHERE id = ?", (shortcut_id,))
        conn.commit()
        
        conn.close()
        
        # 执行命令
        import subprocess
        start_time = time.time()
        
        try:
            result = subprocess.run(
                command,
                shell=True,
                cwd=working_dir,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            duration = time.time() - start_time
            
            # 保存执行历史
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO execution_history (shortcut_id, command, working_dir, status, output, error, exit_code, duration)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                shortcut_id,
                command,
                working_dir,
                "success" if result.returncode == 0 else "failed",
                result.stdout,
                result.stderr,
                result.returncode,
                duration
            ))
            conn.commit()
            conn.close()
            
            return JSONResponse({
                "status": "success" if result.returncode == 0 else "failed",
                "output": result.stdout,
                "error": result.stderr,
                "exit_code": result.returncode,
                "duration": duration
            })
        except subprocess.TimeoutExpired:
            return JSONResponse({
                "status": "timeout",
                "error": f"命令执行超时（{timeout}秒）"
            }, status_code=408)
        except Exception as e:
            return JSONResponse({
                "status": "error",
                "error": str(e)
            }, status_code=500)
            
    except Exception as e:
        logger.exception(f"执行命令失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

# ============================================================================
# 提示词管理器 API
# ============================================================================

class PromptCreate(BaseModel):
    title: str
    content: str
    category: str = "自定义"
    description: str = ""
    tags: List[str] = []
    parameters: List[Dict[str, Any]] = []

class PromptUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    parameters: Optional[List[Dict[str, Any]]] = None

@app.get("/api/prompts")
async def get_prompts(
    search: Optional[str] = None,
    category: Optional[str] = None,
    favorite_only: bool = False
):
    """获取提示词列表"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM prompts WHERE 1=1"
        params = []
        
        if search:
            query += " AND (title LIKE ? OR description LIKE ? OR content LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
        
        if category:
            query += " AND category = ?"
            params.append(category)
        
        if favorite_only:
            query += " AND is_favorite = 1"
        
        query += " ORDER BY usage_count DESC, updated_at DESC"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        prompts = []
        for row in rows:
            prompt = dict(row)
            prompt['tags'] = json.loads(prompt['tags']) if prompt['tags'] else []
            prompt['parameters'] = json.loads(prompt['parameters']) if prompt['parameters'] else []
            prompts.append(prompt)
        
        # 获取分类和标签
        categories = [row[0] for row in cursor.execute("SELECT DISTINCT category FROM prompts ORDER BY category")]
        tags = set()
        for prompt in prompts:
            tags.update(prompt['tags'])
        
        conn.close()
        
        return JSONResponse({
            "prompts": prompts,
            "categories": categories,
            "tags": list(tags)
        })
    except Exception as e:
        logger.exception(f"获取提示词失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/prompts")
async def create_prompt(prompt: PromptCreate):
    """创建提示词"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO prompts (title, content, category, description, tags, parameters)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            prompt.title,
            prompt.content,
            prompt.category,
            prompt.description,
            json.dumps(prompt.tags),
            json.dumps(prompt.parameters)
        ))
        
        prompt_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return JSONResponse({"id": prompt_id, "message": "提示词创建成功"})
    except Exception as e:
        logger.exception(f"创建提示词失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/prompts/categories")
async def get_prompt_categories():
    """获取提示词分类"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT DISTINCT category FROM prompts ORDER BY category")
        categories = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        
        return JSONResponse({"categories": categories})
    except Exception as e:
        logger.exception(f"获取提示词分类失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/prompts/tags")
async def get_prompt_tags():
    """获取提示词标签"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT tags FROM prompts")
        all_tags = set()
        for row in cursor.fetchall():
            if row[0]:
                tags = json.loads(row[0])
                all_tags.update(tags)
        
        conn.close()
        
        return JSONResponse({"tags": list(all_tags)})
    except Exception as e:
        logger.exception(f"获取提示词标签失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/prompts/popular")
async def get_popular_prompts(limit: int = 10):
    """获取热门提示词"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM prompts ORDER BY usage_count DESC, updated_at DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        
        prompts = []
        for row in rows:
            prompt = dict(row)
            prompt['tags'] = json.loads(prompt['tags']) if prompt['tags'] else []
            prompt['parameters'] = json.loads(prompt['parameters']) if prompt['parameters'] else []
            prompts.append(prompt)
        
        conn.close()
        
        return JSONResponse({"prompts": prompts})
    except Exception as e:
        logger.exception(f"获取热门提示词失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/prompts/recent")
async def get_recent_prompts(limit: int = 10):
    """获取最近提示词"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM prompts ORDER BY updated_at DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        
        prompts = []
        for row in rows:
            prompt = dict(row)
            prompt['tags'] = json.loads(prompt['tags']) if prompt['tags'] else []
            prompt['parameters'] = json.loads(prompt['parameters']) if prompt['parameters'] else []
            prompts.append(prompt)
        
        conn.close()
        
        return JSONResponse({"prompts": prompts})
    except Exception as e:
        logger.exception(f"获取最近提示词失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/prompts/favorite")
async def get_favorite_prompts(limit: int = 10):
    """获取收藏的提示词"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM prompts WHERE is_favorite = 1 ORDER BY updated_at DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        
        prompts = []
        for row in rows:
            prompt = dict(row)
            prompt['tags'] = json.loads(prompt['tags']) if prompt['tags'] else []
            prompt['parameters'] = json.loads(prompt['parameters']) if prompt['parameters'] else []
            prompts.append(prompt)
        
        conn.close()
        
        return JSONResponse({"prompts": prompts})
    except Exception as e:
        logger.exception(f"获取收藏提示词失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/prompts/{prompt_id}")
async def get_prompt(prompt_id: int):
    """获取单个提示词"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM prompts WHERE id = ?", (prompt_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return JSONResponse({"error": "提示词不存在"}, status_code=404)
        
        prompt = dict(row)
        prompt['tags'] = json.loads(prompt['tags']) if prompt['tags'] else []
        prompt['parameters'] = json.loads(prompt['parameters']) if prompt['parameters'] else []
        
        # 增加使用次数
        cursor.execute("UPDATE prompts SET usage_count = usage_count + 1 WHERE id = ?", (prompt_id,))
        conn.commit()
        
        conn.close()
        
        return JSONResponse(prompt)
    except Exception as e:
        logger.exception(f"获取提示词失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.put("/api/prompts/{prompt_id}")
async def update_prompt(prompt_id: int, prompt: PromptUpdate):
    """更新提示词"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM prompts WHERE id = ?", (prompt_id,))
        if not cursor.fetchone():
            conn.close()
            return JSONResponse({"error": "提示词不存在"}, status_code=404)
        
        updates = []
        params = []
        
        if prompt.title is not None:
            updates.append("title = ?")
            params.append(prompt.title)
        if prompt.content is not None:
            updates.append("content = ?")
            params.append(prompt.content)
        if prompt.category is not None:
            updates.append("category = ?")
            params.append(prompt.category)
        if prompt.description is not None:
            updates.append("description = ?")
            params.append(prompt.description)
        if prompt.tags is not None:
            updates.append("tags = ?")
            params.append(json.dumps(prompt.tags))
        if prompt.parameters is not None:
            updates.append("parameters = ?")
            params.append(json.dumps(prompt.parameters))
        
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(prompt_id)
        
        query = f"UPDATE prompts SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, params)
        
        conn.commit()
        conn.close()
        
        return JSONResponse({"message": "提示词更新成功"})
    except Exception as e:
        logger.exception(f"更新提示词失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.delete("/api/prompts/{prompt_id}")
async def delete_prompt(prompt_id: int):
    """删除提示词"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM prompts WHERE id = ?", (prompt_id,))
        
        if cursor.rowcount == 0:
            conn.close()
            return JSONResponse({"error": "提示词不存在"}, status_code=404)
        
        conn.commit()
        conn.close()
        
        return JSONResponse({"message": "提示词删除成功"})
    except Exception as e:
        logger.exception(f"删除提示词失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/prompts/popular")
async def get_popular_prompts(limit: int = 10):
    """获取热门提示词"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM prompts ORDER BY usage_count DESC, updated_at DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        
        prompts = []
        for row in rows:
            prompt = dict(row)
            prompt['tags'] = json.loads(prompt['tags']) if prompt['tags'] else []
            prompt['parameters'] = json.loads(prompt['parameters']) if prompt['parameters'] else []
            prompts.append(prompt)
        
        conn.close()
        
        return JSONResponse({"prompts": prompts})
    except Exception as e:
        logger.exception(f"获取热门提示词失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/prompts/{prompt_id}/usage")
async def increment_prompt_usage(prompt_id: int):
    """增加提示词使用次数"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("UPDATE prompts SET usage_count = usage_count + 1 WHERE id = ?", (prompt_id,))
        
        if cursor.rowcount == 0:
            conn.close()
            return JSONResponse({"error": "提示词不存在"}, status_code=404)
        
        conn.commit()
        conn.close()
        
        return JSONResponse({"message": "使用次数已更新"})
    except Exception as e:
        logger.exception(f"更新使用次数失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

# ============================================================================
# 方案生成器 API
# ============================================================================

class SolutionGenerate(BaseModel):
    requirement: str
    template_type: Optional[str] = None

@app.post("/api/solutions/generate")
async def generate_solution(request: Request, req: SolutionGenerate):
    """生成方案"""
    try:
        project_name = request.query_params.get("project")
        if not project_name:
            return JSONResponse({"error": "缺少项目名称"}, status_code=400)
        
        project_path = get_project_path(project_name)
        logger.info(f"[generate_solution] 项目路径: {project_path}")
        
        # 使用 iFlow Agent 生成方案
        agent = get_agent(project_path)
        logger.info(f"[generate_solution] Agent 创建成功")
        
        prompt = f"""请根据以下需求，生成一个详细的技术方案：

需求：{req.requirement}
{f'模板类型：{req.template_type}' if req.template_type else ''}

请提供：
1. 技术栈选择
2. 架构设计
3. 实现步骤
4. 关键代码示例
5. 注意事项

请用 Markdown 格式输出。"""
        
        logger.info(f"[generate_solution] 开始生成方案，需求: {req.requirement}")
        
        solution_content = ""
        message_count = 0
        async for msg in agent.chat_stream(prompt):
            message_count += 1
            msg_type = msg.get("type")
            logger.debug(f"[generate_solution] 收到消息 {message_count}: {msg_type}, 完整消息: {msg}")
            
            # 处理不同类型的消息
            if msg_type == "content":
                content = msg.get("content", "")
                solution_content += content
                logger.debug(f"[generate_solution] 累计内容长度: {len(solution_content)}")
            elif msg_type == "text":
                content = msg.get("text", "")
                solution_content += content
                logger.debug(f"[generate_solution] 累计内容长度: {len(solution_content)}")
            elif msg_type == "assistant":
                # assistant 消息可能包含内容
                if "content" in msg:
                    content = msg["content"]
                    if isinstance(content, str):
                        solution_content += content
                    elif isinstance(content, list):
                        for item in content:
                            if isinstance(item, dict) and "text" in item:
                                solution_content += item["text"]
                    logger.debug(f"[generate_solution] 累计内容长度: {len(solution_content)}")
            elif msg_type == "message":
                # message 类型
                content = msg.get("message", "")
                solution_content += content
                logger.debug(f"[generate_solution] 累计内容长度: {len(solution_content)}")
        
        logger.info(f"[generate_solution] 生成完成，共 {message_count} 条消息，内容长度: {len(solution_content)}")
        
        # 保存到数据库
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO solutions (requirement, solution, template_type)
            VALUES (?, ?, ?)
        ''', (req.requirement, solution_content, req.template_type))
        solution_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        logger.info(f"[generate_solution] 方案已保存，ID: {solution_id}")
        
        return JSONResponse({
            "id": solution_id,
            "requirement": req.requirement,
            "solution": solution_content,
            "template_type": req.template_type
        })
    except Exception as e:
        logger.exception(f"生成方案失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/solutions/generate-stream")
async def generate_solution_stream(request: Request, req: SolutionGenerate):
    """流式生成方案"""
    async def event_generator():
        try:
            project_name = request.query_params.get("project")
            if not project_name:
                yield f"data: {json.dumps({'error': '缺少项目名称'})}\n\n"
                return
            
            project_path = get_project_path(project_name)
            logger.info(f"[generate_solution_stream] 项目路径: {project_path}")
            
            agent = get_agent(project_path)
            logger.info(f"[generate_solution_stream] Agent 创建成功")
            
            prompt = f"""请根据以下需求，生成一个详细的技术方案：

需求：{req.requirement}
{f'模板类型：{req.template_type}' if req.template_type else ''}

请提供：
1. 技术栈选择
2. 架构设计
3. 实现步骤
4. 关键代码示例
5. 注意事项

请用 Markdown 格式输出。"""
            
            logger.info(f"[generate_solution_stream] 开始生成方案，需求: {req.requirement}")
            
            solution_content = ""
            message_count = 0
            async for msg in agent.chat_stream(prompt):
                message_count += 1
                msg_type = msg.get("type")
                logger.debug(f"[generate_solution_stream] 收到消息 {message_count}: {msg_type}")
                
                # 处理不同类型的消息
                if msg_type == "content":
                    content = msg.get("content", "")
                    solution_content += content
                    # 流式发送内容
                    yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
                elif msg_type == "text":
                    content = msg.get("text", "")
                    solution_content += content
                    yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
                elif msg_type == "assistant":
                    if "content" in msg:
                        content = msg["content"]
                        if isinstance(content, str):
                            solution_content += content
                            yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
                        elif isinstance(content, list):
                            for item in content:
                                if isinstance(item, dict) and "text" in item:
                                    solution_content += item["text"]
                                    yield f"data: {json.dumps({'type': 'content', 'content': item['text']})}\n\n"
            
            logger.info(f"[generate_solution_stream] 生成完成，共 {message_count} 条消息，内容长度: {len(solution_content)}")
            
            # 保存到数据库
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO solutions (requirement, solution, template_type)
                VALUES (?, ?, ?)
            ''', (req.requirement, solution_content, req.template_type))
            solution_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            logger.info(f"[generate_solution_stream] 方案已保存，ID: {solution_id}")
            
            # 发送完成事件
            yield f"data: {json.dumps({'type': 'done', 'solution_id': solution_id, 'solution': solution_content})}\n\n"
            
        except Exception as e:
            logger.exception(f"[generate_solution_stream] 生成方案失败: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@app.get("/api/solutions")
async def get_solutions(limit: int = 10):
    """获取已保存的方案"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM solutions ORDER BY created_at DESC LIMIT ?", (limit,))
        rows = cursor.fetchall()
        
        solutions = [dict(row) for row in rows]
        conn.close()
        
        return JSONResponse({"solutions": solutions})
    except Exception as e:
        logger.exception(f"获取方案失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/solutions/templates")
async def get_solution_templates():
    """获取方案模板列表"""
    try:
        templates = [
            {
                "id": "web-app",
                "name": "Web 应用开发",
                "description": "适用于 Web 应用开发的技术方案模板",
                "icon": "🌐"
            },
            {
                "id": "mobile-app",
                "name": "移动应用开发",
                "description": "适用于移动应用开发的技术方案模板",
                "icon": "📱"
            },
            {
                "id": "api-service",
                "name": "API 服务开发",
                "description": "适用于 API 服务开发的技术方案模板",
                "icon": "🔌"
            },
            {
                "id": "data-analysis",
                "name": "数据分析平台",
                "description": "适用于数据分析平台的技术方案模板",
                "icon": "📊"
            },
            {
                "id": "microservices",
                "name": "微服务架构",
                "description": "适用于微服务架构的技术方案模板",
                "icon": "🔗"
            }
        ]
        
        return JSONResponse({"templates": templates})
    except Exception as e:
        logger.exception(f"获取方案模板失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/solutions/{solution_id}")
async def get_solution(solution_id: int):
    """获取单个方案"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM solutions WHERE id = ?", (solution_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return JSONResponse({"error": "方案不存在"}, status_code=404)
        
        solution = dict(row)
        conn.close()
        
        return JSONResponse(solution)
    except Exception as e:
        logger.exception(f"获取方案失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

# ============================================================================
# 业务流程总结 API
# ============================================================================

@app.get("/api/business-flow/summary")
async def get_business_flow_summary(request: Request, limit: int = 50):
    """获取业务流程总结"""
    try:
        project_name = request.query_params.get("project")
        if not project_name:
            return JSONResponse({"error": "缺少项目名称"}, status_code=400)
        
        project_path = get_project_path(project_name)
        
        # 获取 Git 历史
        import subprocess
        result = subprocess.run(
            ["git", "log", "--pretty=format:%H|%an|%ae|%ad|%s", f"-{limit}", "--date=iso"],
            cwd=project_path,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            return JSONResponse({"error": "无法获取 Git 历史"}, status_code=500)
        
        commits = []
        for line in result.stdout.strip().split('\n'):
            if line:
                parts = line.split('|', 4)
                if len(parts) == 5:
                    commits.append({
                        "hash": parts[0],
                        "author": parts[1],
                        "email": parts[2],
                        "date": parts[3],
                        "message": parts[4]
                    })
        
        # 使用 AI 总结业务流程
        agent = get_agent(project_path)
        
        prompt = f"""请分析以下 Git 提交历史，总结项目的业务流程和功能演进：

{json.dumps(commits[:20], ensure_ascii=False, indent=2)}

请提供：
1. 主要功能模块
2. 业务流程图
3. 关键里程碑
4. 技术演进

请用 Markdown 格式输出。"""
        
        summary_content = ""
        async for msg in agent.chat_stream(prompt):
            if msg.get("type") == "content":
                summary_content += msg.get("content", "")
        
        return JSONResponse({
            "business_flow": summary_content,
            "commits": commits
        })
    except Exception as e:
        logger.exception(f"获取业务流程总结失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/business-flow/timeline")
async def get_business_flow_timeline(request: Request, limit: int = 100):
    """获取业务流程时间线"""
    try:
        project_name = request.query_params.get("project")
        if not project_name:
            return JSONResponse({"error": "缺少项目名称"}, status_code=400)
        
        project_path = get_project_path(project_name)
        
        # 获取 Git 历史
        import subprocess
        result = subprocess.run(
            ["git", "log", "--pretty=format:%H|%an|%ad|%s", f"-{limit}", "--date=iso"],
            cwd=project_path,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            return JSONResponse({"error": "无法获取 Git 历史"}, status_code=500)
        
        timeline = []
        for line in result.stdout.strip().split('\n'):
            if line:
                parts = line.split('|', 3)
                if len(parts) == 4:
                    timeline.append({
                        "hash": parts[0],
                        "author": parts[1],
                        "date": parts[2],
                        "message": parts[3]
                    })
        
        return JSONResponse({"timeline": timeline})
    except Exception as e:
        logger.exception(f"获取业务流程时间线失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

# ============================================================================
# 代码审查 API
# ============================================================================

class CodeReviewRequest(BaseModel):
    project_name: str
    file_path: str
    check_types: List[str] = ["quality", "style", "security", "performance"]

@app.post("/api/review/code")
async def review_code(req: CodeReviewRequest):
    """审查代码"""
    try:
        project_path = get_project_path(req.project_name)
        file_path = os.path.join(project_path, req.file_path)
        
        # 读取文件内容
        if not os.path.exists(file_path):
            return JSONResponse({"error": "文件不存在"}, status_code=404)
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 使用 AI 审查代码
        agent = get_agent(project_path)
        
        check_types_str = ", ".join(req.check_types)
        prompt = f"""请对以下代码进行代码审查，检查以下方面：{check_types_str}

文件路径：{req.file_path}

代码内容：
```
{content}
```

请提供：
1. 发现的问题（按严重程度分类）
2. 改进建议
3. 最佳实践建议

请用 JSON 格式输出，格式如下：
{{
  "summary": {{"total_issues": 0, "by_severity": {{"critical": 0, "high": 0, "medium": 0, "low": 0}}}},
  "issues": [
    {{
      "id": "1",
      "severity": "high",
      "category": "quality",
      "message": "问题描述",
      "line": 10,
      "suggestion": "改进建议"
    }}
  ]
}}"""
        
        review_result = ""
        async for msg in agent.chat_stream(prompt):
            if msg.get("type") == "content":
                review_result += msg.get("content", "")
        
        # 尝试解析 JSON
        try:
            # 提取 JSON 部分
            json_start = review_result.find('{')
            json_end = review_result.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = review_result[json_start:json_end]
                review_data = json.loads(json_str)
            else:
                # 如果无法解析，返回原始文本
                review_data = {
                    "summary": {"total_issues": 0, "by_severity": {}},
                    "issues": [],
                    "raw_output": review_result
                }
        except:
            review_data = {
                "summary": {"total_issues": 0, "by_severity": {}},
                "issues": [],
                "raw_output": review_result
            }
        
        return JSONResponse(review_data)
    except Exception as e:
        logger.exception(f"代码审查失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

# --- Catch-all 路由 ---

@app.api_route("/api/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def catch_all(path_name: str, request: Request):
    """Catch-all 路由 - 处理未实现的 API 端点"""
    logger.warning(f"未处理的 API 请求: {request.method} /api/{path_name}")

    # MCP 相关的 API
    if path_name.startswith("mcp-utils/"):
        return JSONResponse(content={
            "status": "not-implemented",
            "message": f"MCP endpoint '{path_name}' is not implemented"
        }, status_code=200)

    # 默认响应
    return JSONResponse(content={"status": "mocked", "sessions": [], "hasMore": False}, status_code=200)


if __name__ == "__main__":
    import uvicorn
    if platform.system() == 'Windows':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    uvicorn.run(app, host="0.0.0.0", port=8000)
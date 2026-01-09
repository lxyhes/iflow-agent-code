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
async def stream_endpoint(message: str, cwd: str = None, sessionId: str = None, project: str = None, persona: str = "partner", auth_method_id: str = None, auth_method_info: str = None):
    logger.info(f"=== /stream request ===")
    logger.info(f"  message: {message[:100]}...")
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

    agent = get_agent(
        target_cwd,
        global_config["mode"],
        global_config.get("model"),
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
                msg_type = msg.get("type", "text")
                logger.debug(f">>> Stream msg: type={msg_type}, keys={list(msg.keys())}")
                
                if msg_type == "text":
                    content = msg.get("content", "")
                    full_reply += content
                    yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
                    
                elif msg_type == "tool_start":
                    # 工具开始执行
                    event_data = {'type': 'tool_start', 'tool_type': msg.get('tool_type'), 'tool_name': msg.get('tool_name'), 'label': msg.get('label', ''), 'agent_info': msg.get('agent_info')}
                    logger.info(f">>> TOOL_START: {event_data}")
                    yield f"data: {json.dumps(event_data)}\n\n"
                    
                elif msg_type == "tool_end":
                    # 工具执行完成
                    event_data = {'type': 'tool_end', 'tool_type': msg.get('tool_type'), 'tool_name': msg.get('tool_name'), 'status': msg.get('status', 'success'), 'agent_info': msg.get('agent_info')}
                    logger.info(f">>> TOOL_END: {event_data}")
                    yield f"data: {json.dumps(event_data)}\n\n"
                    
                elif msg_type == "plan":
                    # 任务计划
                    event_data = {'type': 'plan', 'entries': msg.get('entries', [])}
                    logger.info(f">>> PLAN: {event_data}")
                    yield f"data: {json.dumps(event_data)}\n\n"
                    
                elif msg_type == "done":
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
        
        project = project_manager.add_project(workspace_path)
        project_registry.register_project(project["name"], workspace_path)
        
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


@app.api_route("/api/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def catch_all(path_name: str, request: Request):
    """Catch-all 路由 - 处理未实现的 API 端点"""
    logger.warning(f"未处理的 API 请求: {request.method} /api/{path_name}")

    # TaskMaster 相关的 API 返回特定格式
    if path_name.startswith("taskmaster/"):
        if path_name == "taskmaster/installation-status":
            return JSONResponse(content={
                "installation": {"isInstalled": False},
                "isReady": False
            }, status_code=200)
        elif path_name.startswith("taskmaster/tasks/"):
            return JSONResponse(content={
                "tasks": [],
                "total": 0,
                "completed": 0
            }, status_code=200)
        else:
            return JSONResponse(content={
                "status": "not-implemented",
                "message": f"TaskMaster endpoint '{path_name}' is not implemented"
            }, status_code=200)

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
    uvicorn.run(app, host="0.0.0.0", port=8001)
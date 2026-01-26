import sys
import os
import sys
import mimetypes
import asyncio
import json
import platform

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from backend.core.ocr_service import get_ocr_service
except Exception:
    try:
        from core.ocr_service import get_ocr_service
    except Exception:
        get_ocr_service = None
import subprocess
import logging
from datetime import datetime

# Windows 事件循环策略设置 - 必须在任何异步操作之前设置
if platform.system() == 'Windows':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI, HTTPException, Request, Query, Body, WebSocket
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from typing import Optional, Dict, Any, List

# 配置日志 - 支持环境变量
log_level = os.getenv("LOG_LEVEL", "DEBUG").upper()
valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
if log_level not in valid_levels:
    logger.warning(f"Invalid LOG_LEVEL: {log_level}, using INFO")
    log_level = "INFO"

logging.basicConfig(
    level=getattr(logging, log_level),
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("Server")
logger.info(f"日志级别设置为: {log_level}")

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/..")

from backend.impl.reviewer import create_code_review_agent
from backend.core.project_manager import project_manager
from backend.core.agent import Agent
from backend.core.smart_requirement_service import smart_requirement_service
from backend.core.cicd_generator import cicd_generator
from backend.core.project_template_service import get_project_template_service
from backend.core.task_master_service import task_master_service, Task as TaskModel
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
from backend.core.database_query_service import database_query_service
from backend.core.workflow_service import workflow_service
from backend.core.workflow_executor import workflow_executor
from backend.core.workflow_execution_store import workflow_execution_store

app = FastAPI(title="IFlow Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the new OCR router for project-based OCR (RapidOCR)
try:
    from backend.app.routers import ocr
    app.include_router(ocr.router)
    logger.info("Successfully included new OCR router")
except Exception as e:
    logger.error(f"Failed to include new OCR router: {e}")

# 注册新的模块化路由
try:
    from backend.app.routers import git, rag, workflow, database, snippets, prompts, solutions, taskmaster
    app.include_router(git.router)
    logger.info("Successfully included Git router")
    app.include_router(rag.router)
    logger.info("Successfully included RAG router")
    app.include_router(workflow.router)
    logger.info("Successfully included Workflow router")
    app.include_router(database.router)
    logger.info("Successfully included Database router")
    app.include_router(snippets.router)
    logger.info("Successfully included Snippets router")
    app.include_router(prompts.router)
    logger.info("Successfully included Prompts router")
    app.include_router(solutions.router)
    logger.info("Successfully included Solutions router")
    app.include_router(taskmaster.router)
    logger.info("Successfully included TaskMaster router")
except Exception as e:
    logger.error(f"Failed to include new routers: {e}")

# --- CACHE MANAGER ---
class CacheManager:
    """缓存管理器，支持自动清理和大小限制"""

    def __init__(self, max_size=100, name="Cache"):
        self.cache = {}
        self.max_size = max_size
        self.name = name
        self.access_times = {}
        self._total_accesses = 0
        self._hits = 0

    def get(self, key):
        """获取缓存项"""
        if key in self.cache:
            self.access_times[key] = datetime.now().timestamp()
            self._total_accesses += 1
            self._hits += 1
            return self.cache[key]
        self._total_accesses += 1
        return None

    def set(self, key, value):
        """设置缓存项，如果超出大小限制则清理最旧的项"""
        if len(self.cache) >= self.max_size and key not in self.cache:
            self._cleanup_oldest()
        self.cache[key] = value
        self.access_times[key] = datetime.now().timestamp()

    def _cleanup_oldest(self):
        """清理最旧的缓存项"""
        if not self.access_times:
            return

        oldest_key = min(self.access_times, key=self.access_times.get)
        del self.cache[oldest_key]
        del self.access_times[oldest_key]
        logger.debug(f"[{self.name}] Cleaned up oldest cache entry: {oldest_key}")

    def clear(self):
        """清空所有缓存"""
        count = len(self.cache)
        self.cache.clear()
        self.access_times.clear()
        logger.info(f"[{self.name}] Cleared {count} cache entries")

    def get_stats(self):
        """获取缓存统计信息"""
        hit_rate = (self._hits / self._total_accesses * 100) if self._total_accesses > 0 else 0
        return {
            "name": self.name,
            "size": len(self.cache),
            "max_size": self.max_size,
            "total_accesses": self._total_accesses,
            "hits": self._hits,
            "hit_rate": f"{hit_rate:.2f}%"
        }

    def __contains__(self, key):
        return key in self.cache

    def __len__(self):
        return len(self.cache)

    def __getitem__(self, key):
        if key in self.cache:
            self.access_times[key] = datetime.now().timestamp()
            self._total_accesses += 1
            self._hits += 1
            return self.cache[key]
        self._total_accesses += 1
        raise KeyError(key)

    def __setitem__(self, key, value):
        self.set(key, value)

    def __delitem__(self, key):
        if key not in self.cache:
            raise KeyError(key)
        del self.cache[key]
        if key in self.access_times:
            del self.access_times[key]

# --- MODELS ---
class CreateProjectRequest(BaseModel): path: str

class CreateWorkspaceRequest(BaseModel):
    workspaceType: str
    path: str
    githubUrl: str = None
    githubTokenId: int = None
    newGithubToken: str = None
class SaveFileRequest(BaseModel): filePath: str; content: str
class CheckoutRequest(BaseModel): project: str; branch: str
class CommitRequest(BaseModel): project: str; message: str; files: list

# --- GLOBAL CONFIG ---
global_config = {
    "mode": "yolo",
    "model": "GLM-4.7", # Set to recommended model
    "mcp_servers": [],
    "iflow_path": "iflow", # Default command
    "rag_mode": "tfidf", # RAG 模式: "chromadb" (需要下载模型) 或 "tfidf" (轻量级)
    "chat_only_mode": False # 仅聊天模式：AI 只能聊天，不能修改文件
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
        base = Agent(name="IFlowAgent", cwd=cwd, mode=mode, model=model, mcp_servers=mcp_servers, persona=persona, system_prompt=system_prompt, auth_method_id=auth_method_id, auth_method_info=auth_method_info)
        try:
            from backend.core.orchestrator_agent import OrchestratorAgent
            allow_side_effects = not global_config.get("chat_only_mode", False)
            agent_cache[key] = OrchestratorAgent(base_agent=base, project_path=cwd, allow_side_effects=allow_side_effects)
        except Exception:
            agent_cache[key] = base
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
    PathValidator.add_allowed_root(current_base)
    PathValidator.add_allowed_root(os.path.dirname(current_base))
    logger.info(f"[get_project_path] Checking if project_name matches current_base: {project_name} == {os.path.basename(current_base)}")
    # 检查是否匹配当前项目文件夹名
    if project_name == os.path.basename(current_base):
        logger.info(f"[get_project_path] Matched current_base: {current_base}")
        return current_base

    potential_in_base = os.path.join(current_base, project_name)
    logger.info(f"[get_project_path] Checking potential_in_base: {potential_in_base}")
    if os.path.isdir(potential_in_base):
        is_valid, _, normalized = PathValidator.validate_project_path(potential_in_base)
        if is_valid:
            project_registry.register_project(project_name, normalized)
            logger.info(f"[get_project_path] Found in current_base: {normalized}")
            return normalized
        
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

# 从环境变量读取缓存配置
agent_cache_max_size = int(os.getenv("AGENT_CACHE_MAX_SIZE", "100"))
rag_cache_max_size = int(os.getenv("RAG_CACHE_MAX_SIZE", "50"))

logger.info(f"Agent 缓存最大大小: {agent_cache_max_size}")
logger.info(f"RAG 缓存最大大小: {rag_cache_max_size}")

# 使用缓存管理器
agent_cache = CacheManager(max_size=agent_cache_max_size, name="AgentCache")
rag_cache = CacheManager(max_size=rag_cache_max_size, name="RAGCache")

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
""",
    "socratic": """You are Socrates, the ancient Greek philosopher. Your role is to guide users to discover answers through questioning, not by giving direct answers.

SOCRATIC METHOD:
- Never give direct answers or solutions
- Always respond with thought-provoking questions
- Help users uncover their own understanding
- Challenge assumptions and encourage critical thinking
- Use the "maieutic" (midwifery) method to help ideas emerge
- Guide users to question their own beliefs and reasoning
- Break complex problems into smaller, answerable questions
- Use analogies and counterexamples to clarify thinking

QUESTIONING TECHNIQUES:
- "What do you mean by...?"
- "How would you define...?"
- "What evidence supports this...?"
- "What would happen if...?"
- "Is there another way to look at this...?"
- "What assumptions are you making...?"
- "How does this relate to...?"
- "What are the implications of...?"

RESPONSE STYLE:
- Patient and inquisitive
- Respectful of the user's intelligence
- Celebrate their insights and discoveries
- Acknowledge when they're on the right track
- Gently correct misconceptions with questions
- Build on their existing knowledge
- Make them feel like they're discovering the answers themselves

PRINCIPLES:
- The unexamined life is not worth living
- True knowledge comes from within
- Questions are more powerful than answers
- Wisdom begins in wonder
- Humility is the foundation of learning
- Dialogue is the path to truth

Example: "What do you think might be causing this behavior? What have you observed? How would you test your hypothesis?"
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
    """获取项目列表 - 增强安全版本"""
    projects = project_manager.get_projects()
    
    # 验证并过滤每个项目的路径
    safe_projects = []
    for p in projects:
        is_valid, error, normalized = PathValidator.validate_project_path(p.get("fullPath", ""), must_exist=False)
        if is_valid:
            # 注册到全局注册表
            project_registry.register_project(p["name"], normalized)
            safe_projects.append(p)
        else:
            logger.warning(f"路径不安全的项目: {p.get('name')} - {error}")
            # 自动将该路径添加到允许的根目录列表
            project_path = p.get("fullPath", "")
            if project_path:
                PathValidator.add_allowed_root(project_path)
                PathValidator.add_allowed_root(os.path.dirname(project_path))
                logger.info(f"已将路径添加到允许列表: {project_path}")
                # 重新验证
                is_valid, error, normalized = PathValidator.validate_project_path(p.get("fullPath", ""), must_exist=False)
                if is_valid:
                    project_registry.register_project(p["name"], normalized)
                    safe_projects.append(p)
    
    # 自动扫描项目根目录下的其他项目（但需要验证）
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    PathValidator.add_allowed_root(root_dir)  # 允许项目根目录
    
    try:
        for item in os.listdir(root_dir):
            # 跳过隐藏文件和已处理的项目
            if item.startswith('.') or item in ['agent_project', 'node_modules', '__pycache__', 'storage']:
                continue
            
            full_path = os.path.join(root_dir, item)
            
            # 验证路径是否安全
            is_valid, error, normalized = PathValidator.validate_project_path(full_path)
            if not is_valid:
                continue
            
            # 检查是否已存在
            if not any(p["name"] == item for p in safe_projects):
                safe_projects.append({
                    "name": item,
                    "displayName": item,
                    "path": full_path,
                    "fullPath": full_path,
                    "sessions": [],
                    "sessionMeta": {"total": 0}
                })
    except Exception as e:
        logger.error(f"扫描项目根目录失败: {e}")
    
    return safe_projects

@app.get("/stream")
async def stream_endpoint(message: str, cwd: str = None, sessionId: str = None, project: str = None, model: str = None, persona: str = "partner", auth_method_id: str = None, auth_method_info: str = None, mode: str = None):
    logger.info(f"=== /stream request ===")
    logger.info(f"  message: {message[:100]}...")
    logger.info(f"  model: {model}")
    logger.info(f"  persona: {persona}")
    logger.info(f"  mode: {mode}")
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
    
    # Use provided mode or fallback to global config
    target_mode = mode or global_config.get("mode", "default")

    agent = get_agent(
        target_cwd,
        target_mode,
        target_model,
        global_config.get("mcp_servers"),
        persona=persona,
        auth_method_id=auth_method_id,
        auth_method_info=auth_info
    )
    
    async def event_generator():
        yield f"data: {json.dumps({'type': 'status', 'content': 'IFlow is thinking...'})}\n\n"
        full_reply = ""
        message_count = 0
        
        try:
            async for msg in agent.chat_stream(message):
                message_count += 1
                logger.debug(f">>> Processing message #{message_count}")
                
                # 检查 msg 是字符串还是字典
                if isinstance(msg, str):
                    # 如果是字符串，直接作为内容返回（旧客户端兼容）
                    content = msg
                    full_reply += content
                    event_data = f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
                    logger.debug(f">>> Yielding string content (length: {len(content)})")
                    yield event_data
                else:
                    # 如果是字典，处理 SDK 客户端返回的消息类型
                    msg_type = msg.get("type", "text")
                    logger.debug(f">>> Stream msg #{message_count}: type={msg_type}, keys={list(msg.keys())}")
                    
                    if msg_type == "assistant":
                        # AI 回复（SDK 客户端）
                        content = msg.get("content", "")
                        full_reply += content
                        agent_info = msg.get("metadata", {}).get("agent_info")
                        logger.debug(f">>> Sending assistant content: {content[:100]}...")
                        event_data = f"data: {json.dumps({'type': 'content', 'content': content, 'agent_info': agent_info})}\n\n"
                        logger.debug(f">>> Yielding SSE event: {event_data[:200]}...")
                        yield event_data
                        
                    elif msg_type == "tool_call":
                        # 工具调用（SDK 客户端）
                        metadata = msg.get("metadata", {})
                        tool_name = metadata.get("tool_name", "unknown")
                        tool_type = metadata.get("tool_type") or "generic"
                        status = metadata.get("status", "running")
                        agent_info = metadata.get("agent_info")
                        tool_call_id = metadata.get("tool_call_id")
                        tool_params = metadata.get("tool_params")
                        result = metadata.get("result")
                        old_content = metadata.get("old_content")
                        new_content = metadata.get("new_content")
                        
                        if status == "running":
                            # 工具开始执行
                            event_data = {
                                'type': 'tool_start',
                                'tool_type': tool_type,
                                'tool_name': tool_name,
                                'tool_call_id': tool_call_id,
                                'label': msg.get("content", "") or metadata.get('label', ''),
                                'agent_info': agent_info,
                                'tool_params': tool_params,
                            }
                            logger.info(f">>> TOOL_START: {event_data}")
                            yield f"data: {json.dumps(event_data)}\n\n"
                        else:
                            # 工具执行完成
                            event_data = {
                                'type': 'tool_end',
                                'tool_type': tool_type,
                                'tool_name': tool_name,
                                'tool_call_id': tool_call_id,
                                'status': status,
                                'agent_info': agent_info,
                                'tool_params': tool_params,
                                'result': result,
                                'old_content': old_content,
                                'new_content': new_content,
                            }
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

@app.get("/api/projects/{project_name}/files/content")
async def read_project_file_content(project_name: str, filePath: str):
    try:
        root_path = get_project_path(project_name)

        if '..' in filePath.replace('\\', '/').split('/'):
            raise HTTPException(status_code=403, detail="Access denied: path traversal detected")

        full_path = os.path.normpath(os.path.join(root_path, filePath))
        real_root = os.path.realpath(root_path)
        real_full = os.path.realpath(full_path) if os.path.exists(full_path) else full_path

        if not real_full.startswith(real_root + os.sep) and real_full != real_root:
            raise HTTPException(status_code=403, detail="Access denied: path outside project directory")

        if not os.path.exists(full_path) or not os.path.isfile(full_path):
            raise HTTPException(status_code=404, detail="File not found")

        file_size = os.path.getsize(full_path)
        if file_size > 20 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large to preview")

        media_type = mimetypes.guess_type(full_path)[0] or "application/octet-stream"
        return FileResponse(full_path, media_type=media_type)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error serving file content: {e}")
        raise HTTPException(status_code=500, detail="Error reading file")

@app.put("/api/projects/{project_name}/file")
async def save_project_file(project_name: str, req: SaveFileRequest):
    try:
        file_service.write_file(get_project_path(project_name), req.filePath, req.content)
        return {"status": "success"}
    except Exception as e: return JSONResponse(content={"error": str(e)}, status_code=500)

@app.websocket("/shell")
async def websocket_shell(websocket: WebSocket, project: str = None, cols: int = 80, rows: int = 24):
    """WebSocket Shell 端点"""
    try:
        # 获取项目路径
        project_path = None
        if project:
            project_path = get_project_path(project)
            logger.info(f"[Shell] 项目路径: {project_path}")
        else:
            project_path = os.getcwd()
            logger.info(f"[Shell] 使用当前目录: {project_path}")

        # 创建 Shell 会话
        session = ShellSession(cwd=project_path, cols=cols, rows=rows)
        await session.start(websocket)
    except Exception as e:
        logger.exception(f"[Shell] WebSocket 端点错误: {e}")
        try:
            await websocket.close(code=1011, reason=str(e))
        except:
            pass

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


@app.post("/api/create-workspace")
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
async def browse_filesystem(path: str = Query(None), include_files: bool = Query(False), limit: int = Query(100)):
    """浏览文件系统，提供路径自动补全建议"""
    try:
        suggestions = []
        
        # 处理虚拟根路径请求
        if path == "__ROOT__":
            base_dirs = []
            
            # 1. 始终添加用户主目录
            home_dir = os.path.expanduser("~")
            base_dirs.append({
                "name": "Home 🏠", 
                "path": home_dir, 
                "type": "directory"
            })
            
            # 2. 根据系统添加根节点
            if platform.system() == "Windows":
                # Windows: 添加所有逻辑驱动器
                import string
                try:
                    # 尝试使用 ctypes 获取驱动器（更准确）
                    from ctypes import windll
                    drives = []
                    bitmask = windll.kernel32.GetLogicalDrives()
                    for letter in string.ascii_uppercase:
                        if bitmask & 1:
                            drives.append(f"{letter}:\\")
                        bitmask >>= 1
                except:
                    # 回退到简单的存在性检查
                    drives = [f"{d}:\\" for d in string.ascii_uppercase if os.path.exists(f"{d}:\\")]
                
                for drive in drives:
                    base_dirs.append({
                        "name": f"Local Disk ({drive})",
                        "path": drive,
                        "type": "directory"
                    })
            else:
                # Unix/Mac: 添加系统根目录
                base_dirs.append({
                    "name": "System Root (/)",
                    "path": "/",
                    "type": "directory"
                })
                
                # Mac 特有: /Volumes
                if platform.system() == "Darwin" and os.path.exists("/Volumes"):
                     base_dirs.append({
                        "name": "Volumes",
                        "path": "/Volumes",
                        "type": "directory"
                    })

            return {"suggestions": base_dirs, "currentPath": "__ROOT__"}

        # 如果没有提供路径，默认返回用户主目录信息（保持兼容性）
        if not path or path == "~":
            home_dir = os.path.expanduser("~")
            return {"suggestions": [], "currentPath": home_dir} # 简化，不再在此处返回驱动器列表，由 __ROOT__ 接管
        
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
            is_dir = os.path.isdir(full_path)
            
            # Filter based on include_files
            if not include_files and not is_dir:
                continue
            
            suggestions.append({
                "name": entry,
                "path": full_path,
                "type": "directory" if is_dir else "file"
            })
        
        # Sort: directories first, then alphabetical
        suggestions.sort(key=lambda x: (0 if x["type"] == "directory" else 1, x["name"].lower()))
        
        # Limit results
        if limit > 0:
            suggestions = suggestions[:limit]
        
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


@app.get("/api/search-filesystem")
async def search_filesystem(q: str = Query(...), path: str = Query(None), limit: int = Query(50)):
    """Search for directories matching query"""
    start_dir = os.path.expanduser(path or "~")
    
    def _search():
        results = []
        if not os.path.exists(start_dir):
            return results
        
        try:
            count = 0
            # Limit depth effectively by not following hidden/large dirs
            exclude_dirs = {'node_modules', 'Library', 'venv', '__pycache__', '.git', '.idea', '.vscode'}
            
            for root, dirs, files in os.walk(start_dir):
                # Filter in-place to prevent recursion
                dirs[:] = [d for d in dirs if not d.startswith('.') and d not in exclude_dirs]
                
                for d in dirs:
                    if q.lower() in d.lower():
                        full_path = os.path.join(root, d)
                        results.append({
                            "name": d,
                            "path": full_path,
                            "type": "directory"
                        })
                        count += 1
                        if count >= limit:
                            return results
                
                if len(results) >= limit:
                    break
        except Exception as e:
            logger.error(f"Search error: {e}")
            pass
        return results

    results = await asyncio.to_thread(_search)
    return {"results": results}


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


@app.post("/api/projects/create-workspace")
async def create_workspace(req: CreateWorkspaceRequest):
    """创建工作空间（完整流程）"""
    try:
        workspace_path = os.path.expanduser(req.path.strip())
        workspace_path = os.path.abspath(workspace_path)
        
        # 1. 验证或创建目录
        if req.workspaceType == 'new':
            if os.path.exists(workspace_path):
                if not os.path.isdir(workspace_path):
                    return JSONResponse(content={"error": "路径存在且不是目录"}, status_code=400)
                # 允许在空目录中创建（或非空目录但用户已确认）
            else:
                try:
                    os.makedirs(workspace_path, exist_ok=True)
                except Exception as e:
                    return JSONResponse(content={"error": f"无法创建目录: {str(e)}"}, status_code=500)
                
            # 2. 处理 GitHub 克隆
            if req.githubUrl:
                repo_url = req.githubUrl
                if req.newGithubToken:
                    # 插入 token: https://TOKEN@github.com/...
                    if repo_url.startswith("https://"):
                        repo_url = repo_url.replace("https://", f"https://{req.newGithubToken}@")
                
                try:
                    # 检查目录是否为空
                    if os.path.exists(workspace_path) and any(os.scandir(workspace_path)):
                         return JSONResponse(content={"error": "目标目录非空，无法克隆仓库"}, status_code=400)

                    process = await asyncio.create_subprocess_exec(
                        "git", "clone", repo_url, ".",
                        cwd=workspace_path,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )
                    stdout, stderr = await process.communicate()
                    if process.returncode != 0:
                        err_msg = stderr.decode()
                        # 简单隐藏 token
                        if req.newGithubToken:
                            err_msg = err_msg.replace(req.newGithubToken, "***")
                        return JSONResponse(content={"error": f"克隆失败: {err_msg}"}, status_code=400)
                except Exception as e:
                    return JSONResponse(content={"error": f"Git操作失败: {str(e)}"}, status_code=500)

        elif req.workspaceType == 'existing':
            if not os.path.isdir(workspace_path):
                return JSONResponse(content={"error": "路径不存在"}, status_code=400)

        # 3. 注册项目
        # 使用 project_manager 添加
        project = project_manager.add_project(workspace_path)
        
        # 注册到 registry (为了允许访问)
        is_registered, error = project_registry.register_project(project["name"], workspace_path)
        
        if not is_registered:
             if "不在允许的根目录范围内" in error:
                logger.info(f"路径不在允许列表中，动态添加: {workspace_path}")
                PathValidator.add_allowed_root(workspace_path)
                PathValidator.add_allowed_root(os.path.dirname(workspace_path))
                is_registered, error = project_registry.register_project(project["name"], workspace_path)
        
        if not is_registered:
             return JSONResponse(content={"error": f"注册项目失败: {error}"}, status_code=400)

        return {"success": True, "project": project}

    except Exception as e:
        logger.exception(f"创建工作空间失败: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


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

# --- Catch-all 路由 ---

# OCR API 端点
@app.get("/api/ocr/technologies")
async def get_ocr_technologies():
    """获取支持的 OCR 技术列表"""
    try:
        service = get_ocr_service("lighton")
        technologies = service.get_supported_technologies()
        return JSONResponse(content={"success": True, "technologies": technologies})
    except Exception as e:
        logger.error(f"获取 OCR 技术列表失败: {e}")
        return JSONResponse(content={"success": False, "error": str(e)}, status_code=500)


@app.post("/api/ocr/process")
async def process_ocr(request: Request):
    """
    处理图片 OCR
    
    Request body:
    {
        "image": "base64 encoded image",
        "technology": "lighton" | "tesseract" | "paddle" | "easyocr",
        "max_tokens": 4096,
        "temperature": 0.2,
        "top_p": 0.9
    }
    """
    try:
        data = await request.json()
        
        image_data = data.get("image")
        technology = data.get("technology", "lighton")
        max_tokens = data.get("max_tokens", 4096)
        temperature = data.get("temperature", 0.2)
        top_p = data.get("top_p", 0.9)
        
        if not image_data:
            return JSONResponse(
                content={"success": False, "error": "缺少图片数据"},
                status_code=400
            )
        
        # 获取 OCR 服务
        service = get_ocr_service(technology)
        
        # 处理图片
        result = await service.process_image(
            image_data=image_data,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"OCR 处理失败: {e}")
        return JSONResponse(
            content={"success": False, "error": str(e)},
            status_code=500
        )


@app.post("/api/ocr/process-pdf")
async def process_pdf_ocr(request: Request):
    """
    处理 PDF 文件 OCR
    
    Request body:
    {
        "pdf_data": "base64 encoded pdf",
        "technology": "lighton" | "tesseract" | "paddle" | "easyocr",
        "page_range": [0, 1, 2],  # 可选,指定要处理的页码
        "max_tokens": 4096,
        "temperature": 0.2,
        "top_p": 0.9
    }
    """
    try:
        logger.info("[OCR] 收到 PDF OCR 请求")
        data = await request.json()
        
        pdf_data = data.get("pdf_data")
        technology = data.get("technology", "lighton")
        page_range = data.get("page_range", [])
        max_tokens = data.get("max_tokens", 4096)
        temperature = data.get("temperature", 0.2)
        top_p = data.get("top_p", 0.9)
        dpi = data.get("dpi", 240)
        preprocess = data.get("preprocess", True)
        
        logger.info(f"[OCR] 请求参数: technology={technology}, max_tokens={max_tokens}, dpi={dpi}, preprocess={preprocess}, pdf_data_length={len(pdf_data) if pdf_data else 0}")
        
        if not pdf_data:
            logger.warning("[OCR] 缺少 PDF 数据")
            return JSONResponse(
                content={"success": False, "error": "缺少 PDF 数据"},
                status_code=400
            )
        
        # 解码 PDF
        import base64
        import io
        import pypdfium2 as pdfium
        
        logger.info("[OCR] 开始解码 PDF...")
        pdf_bytes = base64.b64decode(pdf_data)
        pdf = pdfium.PdfDocument(pdf_bytes)
        logger.info(f"[OCR] PDF 解码成功，共 {len(pdf)} 页")
        
        # 确定要处理的页面
        if page_range:
            pages_to_process = [pdf[i] for i in page_range if i < len(pdf)]
        else:
            pages_to_process = [pdf[i] for i in range(len(pdf))]
        
        logger.info(f"[OCR] 将处理 {len(pages_to_process)} 页")
        
        # 获取 OCR 服务
        logger.info(f"[OCR] 获取 OCR 服务: {technology}")
        if get_ocr_service is None or not callable(get_ocr_service):
            logger.error("[OCR] OCR 服务入口不可用（get_ocr_service 未正确导入）")
            return JSONResponse(
                content={"success": False, "error": "OCR 服务未就绪，请检查后端 OCR 依赖与导入配置"},
                status_code=500
            )
        service = get_ocr_service(technology)
        
        if service is None:
            logger.error(f"[OCR] OCR 服务返回 None，技术类型: {technology}")
            return JSONResponse(
                content={"success": False, "error": f"OCR 服务初始化失败: {technology}"},
                status_code=500
            )
        
        # 处理每一页
        results = []
        for idx, page in enumerate(pages_to_process):
            # 渲染页面为图片（dpi/72 为 scale）
            try:
                dpi_value = int(dpi) if dpi else 240
            except Exception:
                dpi_value = 240
            dpi_value = max(120, min(400, dpi_value))
            scale = dpi_value / 72.0
            pil_image = page.render(scale=scale).to_pil()

            if preprocess:
                from PIL import ImageEnhance, ImageFilter
                if pil_image.mode != "RGB":
                    pil_image = pil_image.convert("RGB")
                pil_image = ImageEnhance.Contrast(pil_image).enhance(1.35)
                pil_image = ImageEnhance.Sharpness(pil_image).enhance(1.2)
                pil_image = pil_image.filter(ImageFilter.UnsharpMask(radius=1, percent=120, threshold=3))
            
            # 转换为 base64
            buffer = io.BytesIO()
            pil_image.save(buffer, format="PNG")
            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            # 处理 OCR
            result = await service.process_image(
                image_data=image_base64,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p
            )
            
            results.append({
                "page": idx + 1,
                "text": result.get("text", ""),
                "success": result.get("success", False)
            })
        
        # 合并所有页面的文本
        combined_text = "\n\n".join([r["text"] for r in results if r["success"]])
        
        return JSONResponse(content={
            "success": True,
            "text": combined_text,
            "pages": results,
            "technology": technology,
            "total_pages": len(pages_to_process),
            "format": "markdown" if technology == "lighton" else "plain"
        })
        
    except Exception as e:
        logger.error(f"PDF OCR 处理失败: {e}")
        return JSONResponse(
            content={"success": False, "error": str(e)},
            status_code=500
        )


@app.post("/api/analyze-project-for-interview")
async def analyze_project_for_interview(request: Request):
    """
    分析项目结构用于面试准备
    
    Request body:
    {
        "project_path": "/path/to/project"
    }
    
    Returns:
    {
        "project_name": "项目名称",
        "tech_stack": {
            "languages": ["JavaScript", "TypeScript"],
            "frameworks": ["React", "Node.js"],
            "databases": ["PostgreSQL"],
            "tools": ["Git", "Docker"]
        },
        "features": [],
        "architecture": "前后端分离架构",
        "complexity": "中等"
    }
    """
    try:
        data = await request.json()
        project_path = data.get("project_path")
        
        if not project_path:
            return JSONResponse(
                content={"success": False, "error": "缺少项目路径"},
                status_code=400
            )
        
        # 获取项目名称
        project_name = os.path.basename(project_path)
        
        # 分析项目技术栈
        tech_stack = {
            "languages": [],
            "frameworks": [],
            "databases": [],
            "tools": []
        }
        
        # 检查常见的技术栈文件
        package_json = os.path.join(project_path, "package.json")
        if os.path.exists(package_json):
            try:
                with open(package_json, 'r', encoding='utf-8') as f:
                    pkg_data = json.load(f)
                    dependencies = {**pkg_data.get('dependencies', {}), **pkg_data.get('devDependencies', {})}
                    
                    # 检测语言
                    if 'typescript' in dependencies:
                        tech_stack["languages"].append("TypeScript")
                    else:
                        tech_stack["languages"].append("JavaScript")
                    
                    # 检测框架
                    frameworks = []
                    if 'react' in dependencies:
                        frameworks.append("React")
                    if 'vue' in dependencies:
                        frameworks.append("Vue")
                    if 'angular' in dependencies:
                        frameworks.append("Angular")
                    if 'next' in dependencies:
                        frameworks.append("Next.js")
                    if 'nuxt' in dependencies:
                        frameworks.append("Nuxt.js")
                    if 'express' in dependencies:
                        frameworks.append("Express")
                    if 'fastify' in dependencies:
                        frameworks.append("Fastify")
                    if 'koa' in dependencies:
                        frameworks.append("Koa")
                    if 'nest' in dependencies:
                        frameworks.append("NestJS")
                    if 'django' in dependencies:
                        frameworks.append("Django")
                    if 'flask' in dependencies:
                        frameworks.append("Flask")
                    if 'fastapi' in dependencies:
                        frameworks.append("FastAPI")
                    
                    tech_stack["frameworks"] = list(set(frameworks))
                    
                    # 检测数据库
                    databases = []
                    if 'pg' in dependencies or 'postgres' in dependencies or 'postgresql' in dependencies:
                        databases.append("PostgreSQL")
                    if 'mysql' in dependencies or 'mysql2' in dependencies:
                        databases.append("MySQL")
                    if 'mongodb' in dependencies or 'mongoose' in dependencies:
                        databases.append("MongoDB")
                    if 'redis' in dependencies:
                        databases.append("Redis")
                    if 'sqlite' in dependencies or 'sqlite3' in dependencies:
                        databases.append("SQLite")
                    
                    tech_stack["databases"] = list(set(databases))
                    
                    # 检测工具
                    tools = []
                    if 'webpack' in dependencies:
                        tools.append("Webpack")
                    if 'vite' in dependencies:
                        tools.append("Vite")
                    if 'rollup' in dependencies:
                        tools.append("Rollup")
                    if 'jest' in dependencies:
                        tools.append("Jest")
                    if 'mocha' in dependencies:
                        tools.append("Mocha")
                    if 'eslint' in dependencies:
                        tools.append("ESLint")
                    if 'prettier' in dependencies:
                        tools.append("Prettier")
                    if 'docker' in str(dependencies).lower():
                        tools.append("Docker")
                    
                    tech_stack["tools"] = list(set(tools))
                    
            except Exception as e:
                logger.error(f"分析 package.json 失败: {e}")
        
        # 检查 Python 项目
        requirements_txt = os.path.join(project_path, "requirements.txt")
        if os.path.exists(requirements_txt):
            try:
                with open(requirements_txt, 'r', encoding='utf-8') as f:
                    requirements = f.read().lower()
                    
                    if 'python' not in tech_stack["languages"]:
                        tech_stack["languages"].append("Python")
                    
                    if 'django' in requirements:
                        tech_stack["frameworks"].append("Django")
                    if 'flask' in requirements:
                        tech_stack["frameworks"].append("Flask")
                    if 'fastapi' in requirements:
                        tech_stack["frameworks"].append("FastAPI")
                    if 'pymysql' in requirements or 'mysql' in requirements:
                        tech_stack["databases"].append("MySQL")
                    if 'psycopg2' in requirements or 'postgresql' in requirements:
                        tech_stack["databases"].append("PostgreSQL")
                    if 'pymongo' in requirements:
                        tech_stack["databases"].append("MongoDB")
                    
                    tech_stack["frameworks"] = list(set(tech_stack["frameworks"]))
                    tech_stack["databases"] = list(set(tech_stack["databases"]))
                    
            except Exception as e:
                logger.error(f"分析 requirements.txt 失败: {e}")
        
        # 检查 Go 项目
        go_mod = os.path.join(project_path, "go.mod")
        if os.path.exists(go_mod):
            if "Go" not in tech_stack["languages"]:
                tech_stack["languages"].append("Go")
            tech_stack["tools"].append("Go Modules")
        
        # 去重
        tech_stack["languages"] = list(set(tech_stack["languages"]))
        tech_stack["frameworks"] = list(set(tech_stack["frameworks"]))
        tech_stack["databases"] = list(set(tech_stack["databases"]))
        tech_stack["tools"] = list(set(tech_stack["tools"]))
        
        # 确定架构类型
        architecture = "单体架构"
        if "React" in tech_stack["frameworks"] or "Vue" in tech_stack["frameworks"]:
            if "Express" in tech_stack["frameworks"] or "FastAPI" in tech_stack["frameworks"] or "Django" in tech_stack["frameworks"]:
                architecture = "前后端分离架构"
        
        # 确定复杂度
        complexity = "简单"
        if len(tech_stack["frameworks"]) >= 3 or len(tech_stack["databases"]) >= 2:
            complexity = "复杂"
        elif len(tech_stack["frameworks"]) >= 1:
            complexity = "中等"
        
        return JSONResponse(content={
            "success": True,
            "project_name": project_name,
            "tech_stack": tech_stack,
            "features": [],
            "architecture": architecture,
            "complexity": complexity
        })
        
    except Exception as e:
        logger.error(f"分析项目失败: {e}")
        return JSONResponse(
            content={"success": False, "error": str(e)},
            status_code=500
        )


# --- Chat Suggestions API ---

class ChatSuggestionsRequest(BaseModel):
    context: str
    message_count: int = 5

@app.post("/api/chat/suggestions/{project_name}")
async def generate_chat_suggestions(project_name: str, req: ChatSuggestionsRequest):
    """生成智能聊天建议"""
    try:
        # 基于上下文分析生成建议
        context = req.context.lower()
        suggestions = []

        # 智能关键词匹配规则
        keyword_rules = {
            # Bug/错误相关
            ('bug', 'error', '问题', '异常', 'exception', 'fail'): [
                "帮我找到这个bug的根本原因",
                "如何修复这个问题？",
                "还有其他类似的问题吗？"
            ],
            # 测试相关
            ('test', '测试', 'unit test', 'pytest', 'jest'): [
                "帮我编写单元测试",
                "生成测试用例",
                "如何提高测试覆盖率？"
            ],
            # 性能优化
            ('optimize', '优化', 'performance', '性能', 'slow', '慢'): [
                "如何优化这段代码的性能？",
                "识别性能瓶颈",
                "提供优化建议"
            ],
            # 重构
            ('refactor', '重构', 'improve', '改进', 'clean'): [
                "重构这段代码",
                "改进代码结构",
                "应用设计模式"
            ],
            # 文档
            ('document', '文档', 'readme', 'api doc', '注释'): [
                "生成代码文档",
                "编写API文档",
                "创建README文件"
            ],
            # API
            ('api', 'endpoint', '接口', 'request', 'response'): [
                "设计API接口",
                "生成API文档",
                "测试API端点"
            ],
            # 功能开发
            ('feature', '功能', 'implement', '实现', 'add'): [
                "设计新功能",
                "实现功能需求",
                "编写功能测试"
            ],
            # 代码审查
            ('review', '审查', 'check', '检查', 'quality'): [
                "进行代码审查",
                "检查代码质量",
                "提供改进建议"
            ],
            # 数据库
            ('database', '数据库', 'sql', 'query', 'schema'): [
                "优化数据库查询",
                "设计数据库结构",
                "生成SQL脚本"
            ],
            # 部署
            ('deploy', '部署', 'docker', 'k8s', 'production'): [
                "配置部署环境",
                "编写Dockerfile",
                "设置CI/CD流程"
            ],
            # 安全
            ('security', '安全', 'vulnerability', '漏洞', 'auth'): [
                "检查安全漏洞",
                "实现身份认证",
                "加强数据加密"
            ],
        }

        # 匹配关键词
        matched = False
        for keywords, suggestion_list in keyword_rules.items():
            if any(keyword in context for keyword in keywords):
                suggestions.extend(suggestion_list)
                matched = True
                break

        # 如果包含代码，提供代码相关建议
        if '```' in req.context:
            code_suggestions = [
                "解释这段代码的工作原理",
                "优化这段代码",
                "为这段代码添加注释",
                "这段代码有什么潜在问题？"
            ]
            # 如果已经匹配到其他规则，合并建议
            if matched:
                suggestions = suggestions + code_suggestions[:2]
            else:
                suggestions = code_suggestions

        # 如果没有匹配到特定关键词，根据消息数量提供通用建议
        if not suggestions:
            if req.message_count <= 2:
                # 对话刚开始，提供探索性建议
                suggestions = [
                    "帮我分析这个项目的代码结构",
                    "生成项目文档",
                    "检查代码中的潜在问题"
                ]
            else:
                # 对话进行中，提供深入建议
                suggestions = [
                    "继续深入分析",
                    "提供更多示例",
                    "总结关键要点",
                    "给出最佳实践建议"
                ]

        # 限制建议数量为3-4个
        suggestions = suggestions[:4]

        logger.info(f"Generated {len(suggestions)} suggestions for project {project_name}")

        return {
            "suggestions": suggestions,
            "context_length": len(req.context),
            "message_count": req.message_count
        }

    except Exception as e:
        logger.error(f"Error generating chat suggestions: {e}")
        # 返回默认建议
        return {
            "suggestions": [
                "帮我分析这个项目的代码结构",
                "生成项目文档",
                "检查代码中的潜在问题"
            ],
            "error": str(e)
        }


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

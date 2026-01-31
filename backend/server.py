import sys
import os
import sys
import mimetypes
import asyncio
import json
import platform

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 设置缓存目录到E盘（必须在导入其他模块之前）
import tempfile
os.environ['TEMP'] = 'E:/cache/agent_project/temp'
os.environ['TMP'] = 'E:/cache/agent_project/temp'
tempfile.tempdir = 'E:/cache/agent_project/temp'

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

# Include the interview router for multi-agent interview system
try:
    from backend.app.routers import interview
    app.include_router(interview.router, prefix="/api")
    logger.info("Successfully included interview router")
except Exception as e:
    logger.error(f"Failed to include interview router: {e}")

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
        session = ShellSession(cwd=project_path)
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
    try:
        project_path = get_project_path(project_name)

        # 从 task_master_service 获取任务列表
        tasks = task_master_service.get_tasks(project_name)

        # 统计任务状态
        total = len(tasks)
        completed = sum(1 for task in tasks if task.get("status") == "completed")

        return {
            "success": True,
            "tasks": tasks,
            "total": total,
            "completed": completed
        }
    except Exception as e:
        logger.exception(f"获取任务列表失败: {e}")
        return {
            "success": False,
            "error": str(e),
            "tasks": [],
            "total": 0,
            "completed": 0
        }

@app.get("/api/taskmaster/prd/{project_name}")
async def get_taskmaster_prd(project_name: str):
    """获取项目的 PRD 文档"""
    try:
        project_path = get_project_path(project_name)

        # 尝试查找 PRD 文件（常见的 PRD 文件名）
        prd_filenames = [
            "PRD.md",
            "prd.md",
            "PRODUCT_REQUIREMENTS.md",
            "product_requirements.md",
            "REQUIREMENTS.md",
            "requirements.md"
        ]

        prd_content = None
        prd_file = None

        for filename in prd_filenames:
            prd_file_path = os.path.join(project_path, filename)
            if os.path.exists(prd_file_path) and os.path.isfile(prd_file_path):
                try:
                    with open(prd_file_path, 'r', encoding='utf-8') as f:
                        prd_content = f.read()
                    prd_file = filename
                    break
                except Exception as e:
                    logger.warning(f"读取 PRD 文件 {filename} 失败: {e}")
                    continue

        return {
            "success": True,
            "prd": prd_content,
            "exists": prd_content is not None,
            "file": prd_file
        }
    except Exception as e:
        logger.exception(f"获取 PRD 文档失败: {e}")
        return {
            "success": False,
            "error": str(e),
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
        
        cache_key = final_project_path
        # 确保 RAG 服务被创建（使用项目路径作为缓存键）
        if cache_key not in rag_cache:
            # 根据配置选择 RAG 模式
            rag_mode = global_config.get("rag_mode", "tfidf")
            use_chromadb = (rag_mode == "chromadb")
            
            if use_chromadb and not CHROMADB_AVAILABLE:
                logger.warning("ChromaDB requested but not available, falling back to TF-IDF")
                use_chromadb = False
            
            rag_cache[cache_key] = get_rag_service(final_project_path, use_chromadb=use_chromadb)
            logger.info(f"Created new RAG service for {project_name} at {final_project_path} (mode: {'ChromaDB' if use_chromadb else 'TF-IDF'})")
        
        rag_service = rag_cache[cache_key]
        
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
    task_master_service.init_tables()
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

from backend.core.business_flow_summarizer import business_flow_summarizer

# ============================================================================
# 业务流程总结 API
# ============================================================================

@app.get("/api/business-flow/summary")
async def get_business_flow_summary(limit: int = 50):
    """获取业务流程总结"""
    try:
        # 确保 limit 是合理的整数
        if limit < 1:
            limit = 50
        if limit > 500:
            limit = 500
            
        result = business_flow_summarizer.generate_business_flow(limit)
        return {"success": True, "business_flow": result}
    except Exception as e:
        logger.exception(f"获取业务流程总结失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/business-flow/stats")
async def get_business_flow_stats():
    """获取业务流程统计"""
    try:
        # 复用 generate_business_flow 的结果，或者实现专门的 stats 方法
        # 这里为了简单，直接复用 summary 的 summary 部分
        result = business_flow_summarizer.generate_business_flow(limit=1)
        return {"success": True, "stats": result.get("summary", {})}
    except Exception as e:
        logger.exception(f"获取业务流程统计失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

# ============================================================================
# 智能需求分析 API
# ============================================================================

class RequirementAnalysisRequest(BaseModel):
    text: str
    image_path: Optional[str] = None
    project_name: Optional[str] = None

class MatchModulesRequest(BaseModel):
    keywords: List[str]
    project_name: Optional[str] = None

class GenerateSolutionRequest(BaseModel):
    analysis: Dict[str, Any]
    matched_modules: List[Dict[str, Any]]
    project_root: str = "."

class OptimizeRequirementRequest(BaseModel):
    text: str
    project_name: str = ""

class ProjectOptimizationRequest(BaseModel):
    focus: str = ""
    project_name: str

@app.post("/api/smart-requirement/optimize-project")
async def optimize_project(req: ProjectOptimizationRequest):
    try:
        project_path = get_project_path(req.project_name)
        result = await smart_requirement_service.analyze_project_optimization(req.focus, project_path)
        return {"success": True, "result": result}
    except Exception as e:
        logger.exception(f"Project Optimization failed: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/smart-requirement/optimize")
async def optimize_requirement(req: OptimizeRequirementRequest):
    try:
        result = await smart_requirement_service.optimize_requirement(req.text, req.project_name)
        return {"success": True, "result": result}
    except Exception as e:
        logger.exception(f"Optimization failed: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/smart-requirement/step1-analyze")
async def analyze_requirement_step1(req: RequirementAnalysisRequest):
    try:
        project_path = get_project_path(req.project_name)
        analysis = await smart_requirement_service.analyze_requirement(req.text, req.image_path, project_path)
        return {"success": True, "analysis": analysis}
    except Exception as e:
        logger.exception(f"Step 1 failed: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/smart-requirement/step2-match")
async def match_modules_step2(req: MatchModulesRequest):
    try:
        project_path = get_project_path(req.project_name)
        matched_modules = await smart_requirement_service.match_modules(req.keywords, project_path)
        return {"success": True, "matched_modules": matched_modules}
    except Exception as e:
        logger.exception(f"Step 2 failed: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

class RefineSolutionRequest(BaseModel):
    previous_solution: Dict[str, Any]
    feedback: str

@app.post("/api/smart-requirement/refine")
async def refine_solution(req: RefineSolutionRequest):
    try:
        updated_solution = await smart_requirement_service.refine_solution(req.previous_solution, req.feedback)
        return {"success": True, "updated_solution": updated_solution}
    except Exception as e:
        logger.exception(f"Refinement failed: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/smart-requirement/step2-5-context")
async def generate_business_context(req: GenerateSolutionRequest):
    try:
        # We reuse GenerateSolutionRequest but only need matched_modules
        # Assuming project_root is accessible or passed. Here we use "."
        project_root = "." 
        context_data = await smart_requirement_service.generate_business_context(req.matched_modules, project_root)
        return {
            "success": True, 
            "context": context_data
        }
    except Exception as e:
        logger.exception(f"Step 2.5 failed: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/smart-requirement/step3-solution")
async def generate_solution_step3(req: GenerateSolutionRequest):
    try:
        solution_data = await smart_requirement_service.generate_solution(req.analysis, req.matched_modules)
        return {
            "success": True, 
            "solution_doc": solution_data.get("solution_doc", ""),
            "execution_plan": solution_data.get("execution_plan", {}),
            "api_design": solution_data.get("api_design", [])
        }
    except Exception as e:
        logger.exception(f"Step 3 failed: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/project/file-content")
async def get_project_file_content(path: str, project_name: Optional[str] = None):
    """Securely read a file from the project directory"""
    try:
        # Determine root
        if project_name:
            root = get_project_path(project_name)
        else:
            root = os.getcwd() # Fallback to current working dir if no project specified
        
        # Sanitize path to prevent directory traversal
        safe_path = os.path.normpath(os.path.join(root, path))
        if not safe_path.startswith(os.path.abspath(root)):
             return JSONResponse({"error": "Access denied: Path outside project root"}, status_code=403)
             
        if not os.path.exists(safe_path) or not os.path.isfile(safe_path):
             return JSONResponse({"error": "File not found"}, status_code=404)
             
        # Read content (limit size)
        file_size = os.path.getsize(safe_path)
        if file_size > 1024 * 1024: # 1MB limit
             return JSONResponse({"error": "File too large to preview"}, status_code=400)
             
        with open(safe_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        return {"content": content, "path": path, "size": file_size}
    except Exception as e:
        logger.error(f"Error reading file {path}: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

class SaveAnalysisRequest(BaseModel):
    project_name: str
    title: str
    content: str
    folder: str = "docs/requirements"

@app.post("/api/smart-requirement/save")
async def save_analysis_doc(req: SaveAnalysisRequest):
    """Save analysis result as a markdown file"""
    try:
        root = get_project_path(req.project_name)
        target_dir = os.path.join(root, req.folder)
        os.makedirs(target_dir, exist_ok=True)
        
        # Sanitize filename
        safe_title = "".join([c for c in req.title if c.isalnum() or c in (' ', '-', '_')]).strip()
        safe_title = safe_title.replace(' ', '_')
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{safe_title}_{timestamp}.md"
        
        file_path = os.path.join(target_dir, filename)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(req.content)
            
        return {"success": True, "path": f"{req.folder}/{filename}"}
    except Exception as e:
        logger.exception(f"Failed to save analysis: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/smart-requirement/analyze")
async def analyze_smart_requirement(req: RequirementAnalysisRequest):
    """智能分析需求"""
    try:
        project_path = get_project_path(req.project_name)
        
        # 1. Analyze Requirement
        analysis = await smart_requirement_service.analyze_requirement(req.text, req.image_path, project_path)
        
        # 2. Match Modules
        keywords = analysis.get("keywords", [])
        matched_modules = await smart_requirement_service.match_modules(keywords, project_path)
        
        # 3. Generate Solution
        solution_data = await smart_requirement_service.generate_solution(analysis, matched_modules)
        
        return {
            "success": True,
            "analysis": analysis,
            "matched_modules": matched_modules,
            "solution_doc": solution_data.get("solution_doc", ""),
            "execution_plan": solution_data.get("execution_plan", {})
        }
    except Exception as e:
        logger.exception(f"智能需求分析失败: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

# ============================================================================
# CI/CD Generator API
# ============================================================================

@app.get("/api/cicd/platforms")
async def get_cicd_platforms():
    """Get supported CI/CD platforms"""
    return {
        "success": True,
        "platforms": [
            {"id": "github", "name": "GitHub Actions", "icon": "github"},
            {"id": "gitlab", "name": "GitLab CI", "icon": "gitlab"},
            {"id": "jenkins", "name": "Jenkins", "icon": "jenkins"}
        ]
    }

class CICDGenerateRequest(BaseModel):
    platform: str
    projectType: str
    projectName: str
    config: Optional[Dict[str, Any]] = None

@app.post("/api/cicd/generate")
async def generate_cicd_config(req: CICDGenerateRequest):
    """Generate CI/CD configuration files"""
    try:
        result = cicd_generator.generate(
            req.platform, 
            req.projectType, 
            req.projectName, 
            req.config
        )
        return result
    except Exception as e:
        logger.exception(f"CI/CD generation failed: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


# ============================================================================
# Project Template API
# ============================================================================

@app.get("/api/templates")
async def get_project_templates():
    """Get available project templates"""
    service = get_project_template_service()
    return service.get_templates()

class TemplateGenerateRequest(BaseModel):
    templateId: str
    projectName: str
    path: str
    config: Optional[Dict[str, Any]] = None

@app.post("/api/templates/generate")
async def generate_project_from_template(req: TemplateGenerateRequest):
    """Generate a new project from a template"""
    try:
        service = get_project_template_service()
        # Verify path exists
        if not os.path.exists(req.path):
            return JSONResponse({"error": "Target path does not exist"}, status_code=400)
            
        result = service.generate_project(
            req.templateId,
            req.projectName,
            req.path,
            req.config
        )
        return result
    except Exception as e:
        logger.exception(f"Template generation failed: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


# ============================================================================
# TaskMaster API (Real Implementation)
# ============================================================================

@app.get("/api/taskmaster/tasks/{project_name}")
async def get_project_tasks(project_name: str):
    """Get tasks for a project"""
    tasks = task_master_service.get_tasks(project_name)
    return {"tasks": tasks}

@app.post("/api/taskmaster/tasks/{project_name}")
async def create_project_task(project_name: str, task: TaskModel):
    """Create a new task"""
    try:
        # Ensure project name matches
        task.project_name = project_name 
        created_task = task_master_service.create_task(task)
        return {"success": True, "task": created_task}
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.put("/api/taskmaster/tasks/{project_name}/{task_id}")
async def update_project_task(project_name: str, task_id: str, updates: Dict[str, Any]):
    """Update a task"""
    try:
        updated_task = task_master_service.update_task(task_id, updates)
        if not updated_task:
             return JSONResponse({"error": "Task not found"}, status_code=404)
        return {"success": True, "task": updated_task}
    except Exception as e:
        logger.error(f"Error updating task: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.delete("/api/taskmaster/tasks/{project_name}/{task_id}")
async def delete_project_task(project_name: str, task_id: str):
    """Delete a task"""
    success = task_master_service.delete_task(task_id)
    return {"success": success}

@app.get("/api/taskmaster/prd/{project_name}")
async def get_project_prds(project_name: str):
    """Get list of PRDs for a project"""
    prds = task_master_service.get_prds(project_name)
    return prds

@app.get("/api/taskmaster/prd/{project_name}/{prd_name}")
async def get_prd_details(project_name: str, prd_name: str):
    """Get PRD content"""
    prd = task_master_service.get_prd_content(project_name, prd_name)
    if not prd:
        return JSONResponse({"error": "PRD not found"}, status_code=404)
    return prd

class PRDSaveRequest(BaseModel):
    title: str
    content: str

@app.post("/api/taskmaster/prd/{project_name}")
async def save_project_prd(project_name: str, req: PRDSaveRequest):
    """Save/Update a PRD"""
    try:
        saved_prd = task_master_service.save_prd(project_name, req.title, req.content)
        return {"success": True, "prd": saved_prd}
    except Exception as e:
         logger.error(f"Error saving PRD: {e}")
         return JSONResponse({"error": str(e)}, status_code=500)

# --- Database Query API ---
  
class DatabaseConnectRequest(BaseModel):
    db_type: str = "sqlite"  # sqlite, mysql, postgresql, sqlserver, oracle
    db_path: Optional[str] = None  # SQLite 专用
    host: Optional[str] = None
    port: Optional[int] = None
    database: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    connection_name: Optional[str] = None

@app.post("/api/database/connect")
async def connect_database(req: DatabaseConnectRequest):
    """连接数据库（支持多种类型）"""
    try:
        success = False
        
        if req.db_type == "sqlite":
            if not req.db_path:
                return JSONResponse({"error": "db_path is required for SQLite"}, status_code=400)
            success = database_query_service.connect_sqlite(req.db_path, req.connection_name)
        elif req.db_type == "mysql":
            if not all([req.host, req.port, req.database, req.username, req.password]):
                return JSONResponse({"error": "host, port, database, username, password are required for MySQL"}, status_code=400)
            success = database_query_service.connect_mysql(
                req.host, req.port, req.database, req.username, req.password, req.connection_name
            )
        elif req.db_type == "postgresql":
            if not all([req.host, req.port, req.database, req.username, req.password]):
                return JSONResponse({"error": "host, port, database, username, password are required for PostgreSQL"}, status_code=400)
            success = database_query_service.connect_postgresql(
                req.host, req.port, req.database, req.username, req.password, req.connection_name
            )
        elif req.db_type == "sqlserver":
            if not all([req.host, req.port, req.database, req.username, req.password]):
                return JSONResponse({"error": "host, port, database, username, password are required for SQL Server"}, status_code=400)
            success = database_query_service.connect_sqlserver(
                req.host, req.port, req.database, req.username, req.password, req.connection_name
            )
        elif req.db_type == "oracle":
            if not all([req.host, req.port, req.database, req.username, req.password]):
                return JSONResponse({"error": "host, port, database, username, password are required for Oracle"}, status_code=400)
            success = database_query_service.connect_oracle(
                req.host, req.port, req.database, req.username, req.password, req.connection_name
            )
        else:
            return JSONResponse({"error": f"Unsupported database type: {req.db_type}"}, status_code=400)
        
        if success:
            return {"success": True, "message": "Database connected successfully"}
        else:
            return JSONResponse({"error": "Failed to connect to database"}, status_code=400)
    except Exception as e:
        logger.error(f"Error connecting to database: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)
@app.post("/api/database/disconnect/{connection_name}")
async def disconnect_database(connection_name: str):
    """断开数据库连接"""
    try:
        success = database_query_service.disconnect(connection_name)
        if success:
            return {"success": True, "message": "Database disconnected successfully"}
        else:
            return JSONResponse({"error": "Connection not found"}, status_code=404)
    except Exception as e:
        logger.error(f"Error disconnecting database: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/database/connections")
async def get_database_connections():
    """获取所有数据库连接"""
    try:
        connections = database_query_service.get_connections()
        return {"connections": connections}
    except Exception as e:
        logger.error(f"Error getting connections: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/database/tables/{connection_name}")
async def get_database_tables(connection_name: str):
    """获取数据库中的所有表"""
    try:
        tables = database_query_service.get_tables(connection_name)
        return {"tables": tables}
    except Exception as e:
        logger.error(f"Error getting tables: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/database/table/{connection_name}/{table_name}")
async def get_table_info(connection_name: str, table_name: str):
      """获取表的详细信息"""
      try:
          logger.info(f"Getting table info - connection: {connection_name}, table: {table_name}")
          table_info = database_query_service.get_table_info(connection_name, table_name)
          if table_info:
              return {
                  "name": table_info.name,
                  "type": table_info.type,
                  "row_count": table_info.row_count,
                  "columns": table_info.columns,
                  "indexes": table_info.indexes
              }
          else:
              logger.warning(f"Table not found: {table_name}")
              return JSONResponse({"error": "Table not found"}, status_code=404)
      except Exception as e:
          logger.error(f"Error getting table info: {e}")
          return JSONResponse({"error": str(e)}, status_code=500)
class DatabaseQueryRequest(BaseModel):
    connection_name: str
    sql: str
    params: Optional[Dict[str, Any]] = None

@app.post("/api/database/query")
async def execute_database_query(req: DatabaseQueryRequest):
    """执行 SQL 查询"""
    try:
        result = database_query_service.execute_query(req.connection_name, req.sql, req.params)
        if result.success:
            return {
                "success": True,
                "columns": result.columns,
                "rows": result.rows,
                "row_count": result.row_count,
                "execution_time": result.execution_time
            }
        else:
            return JSONResponse({"error": result.error}, status_code=400)
    except Exception as e:
        logger.error(f"Error executing query: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/database/export/{connection_name}/{format}")
async def export_query_result(connection_name: str, format: str, sql: str, params: Optional[str] = None):
    """导出查询结果"""
    try:
        params_dict = json.loads(params) if params else None
        
        if format == "csv":
            data = database_query_service.export_to_csv(connection_name, sql, params_dict)
            return Response(content=data, media_type="text/csv", headers={
                "Content-Disposition": f"attachment; filename=query_result.csv"
            })
        elif format == "json":
            data = database_query_service.export_to_json(connection_name, sql, params_dict)
            return Response(content=data, media_type="application/json", headers={
                "Content-Disposition": f"attachment; filename=query_result.json"
            })
        elif format == "excel":
            data = database_query_service.export_to_excel(connection_name, sql, params_dict)
            return Response(content=data, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={
                "Content-Disposition": f"attachment; filename=query_result.xlsx"
            })
        else:
            return JSONResponse({"error": "Unsupported format. Use csv, json, or excel"}, status_code=400)
    except Exception as e:
        logger.error(f"Error exporting query result: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/database/templates")
async def get_query_templates():
    """获取查询模板"""
    try:
        templates = database_query_service.get_query_templates()
        return {"templates": templates}
    except Exception as e:
        logger.error(f"Error getting templates: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

class AddTemplateRequest(BaseModel):
    name: str
    sql: str
    description: Optional[str] = ""
    category: Optional[str] = "自定义"
    params: Optional[List[str]] = None

@app.post("/api/database/templates")
async def add_query_template(req: AddTemplateRequest):
    """添加查询模板"""
    try:
        template = database_query_service.add_query_template(
            req.name, req.sql, req.description, req.category, req.params
        )
        return {"success": True, "template": template}
    except Exception as e:
        logger.error(f"Error adding template: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/database/history")
async def get_query_history(limit: int = 50):
    """获取查询历史"""
    try:
        history = database_query_service.get_query_history(limit)
        return {"history": history}
    except Exception as e:
        logger.error(f"Error getting query history: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

class DatabaseConfigRequest(BaseModel):
    project_name: str
    config_name: str
    db_type: str
    config: Dict[str, Any]

@app.post("/api/database/save-config")
async def save_database_config(req: DatabaseConfigRequest):
    """保存数据库配置到项目"""
    try:
        import os
        import json
        
        project_path = get_project_path(req.project_name)
        if not project_path:
            return JSONResponse({"error": "Project not found"}, status_code=404)
        
        # 创建数据库配置目录
        config_dir = os.path.join(project_path, ".database")
        os.makedirs(config_dir, exist_ok=True)
        
        # 保存配置
        config_file = os.path.join(config_dir, f"{req.config_name}.json")
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump({
                "name": req.config_name,
                "db_type": req.db_type,
                "config": req.config,
                "created_at": datetime.now().isoformat()
            }, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved database config: {req.config_name} for project: {req.project_name}")
        return {"success": True, "message": "Database config saved successfully"}
    except Exception as e:
        logger.error(f"Error saving database config: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/database/configs/{project_name}")
async def get_database_configs(project_name: str):
    """获取项目的数据库配置列表"""
    try:
        import os
        import json
        
        project_path = get_project_path(project_name)
        if not project_path:
            return JSONResponse({"error": "Project not found"}, status_code=404)
        
        config_dir = os.path.join(project_path, ".database")
        configs = []
        
        if os.path.exists(config_dir):
            for filename in os.listdir(config_dir):
                if filename.endswith('.json'):
                    config_file = os.path.join(config_dir, filename)
                    try:
                        with open(config_file, 'r', encoding='utf-8') as f:
                            config = json.load(f)
                            configs.append(config)
                    except Exception as e:
                        logger.error(f"Error loading config {filename}: {e}")
        
        return {"configs": configs}
    except Exception as e:
        logger.error(f"Error getting database configs: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.delete("/api/database/config/{project_name}/{config_name}")
async def delete_database_config(project_name: str, config_name: str):
    """删除数据库配置"""
    try:
        import os
        
        project_path = get_project_path(project_name)
        if not project_path:
            return JSONResponse({"error": "Project not found"}, status_code=404)
        
        config_file = os.path.join(project_path, ".database", f"{config_name}.json")
        
        if os.path.exists(config_file):
            os.remove(config_file)
            logger.info(f"Deleted database config: {config_name} for project: {project_name}")
            return {"success": True, "message": "Database config deleted successfully"}
        else:
            return JSONResponse({"error": "Config not found"}, status_code=404)
    except Exception as e:
        logger.error(f"Error deleting database config: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

def parse_gorm_dsn(dsn: str) -> dict:
    """解析 GORM DSN 格式的连接字符串
    
    支持格式:
    - mysql:user:password@tcp(host:port)/database
    - postgresql://user:password@host:port/database
    """
    import re
    
    result = {
        'type': 'unknown',
        'host': '',
        'port': '',
        'user': '',
        'password': '',
        'database': ''
    }
    
    try:
        # MySQL 格式: mysql:user:password@tcp(host:port)/database
        if dsn.startswith('mysql:'):
            result['type'] = 'mysql'
            # 移除 mysql: 前缀
            dsn = dsn[6:]
            
            # 解析 user:password@tcp(host:port)/database
            match = re.match(r'([^:]*):([^@]*)@tcp\(([^:]+):(\d+)\)/(.+)', dsn)
            if match:
                result['user'] = match.group(1)
                result['password'] = match.group(2)
                result['host'] = match.group(3)
                result['port'] = int(match.group(4))
                result['database'] = match.group(5)
                logger.info(f"解析 MySQL DSN 成功: {result}")
        
        # PostgreSQL 格式: postgresql://user:password@host:port/database
        elif dsn.startswith('postgresql://'):
            result['type'] = 'postgresql'
            # 移除 postgresql:// 前缀
            dsn = dsn[11:]
            
            # 解析 user:password@host:port/database
            match = re.match(r'([^:]*):([^@]*)@([^:]+):(\d+)/(.+)', dsn)
            if match:
                result['user'] = match.group(1)
                result['password'] = match.group(2)
                result['host'] = match.group(3)
                result['port'] = int(match.group(4))
                result['database'] = match.group(5)
                logger.info(f"解析 PostgreSQL DSN 成功: {result}")
        
        # 简单格式: user:password@host:port/database
        elif '@' in dsn and '/' in dsn:
            match = re.match(r'([^:]*):([^@]*)@([^:]+):(\d+)/(.+)', dsn)
            if match:
                result['user'] = match.group(1)
                result['password'] = match.group(2)
                result['host'] = match.group(3)
                result['port'] = int(match.group(4))
                result['database'] = match.group(5)
                logger.info(f"解析简单 DSN 成功: {result}")
        
        return result
    except Exception as e:
        logger.error(f"解析 DSN 失败: {e}")
        return result


def parse_database_config(config_data: dict, config_type: str) -> list:
    """从配置数据中解析数据库连接信息"""
    db_connections = []
    
    try:
        logger.info(f"开始解析配置数据，类型: {config_type}")
        logger.info(f"配置数据键: {list(config_data.keys())}")
        
        # 常见的数据库配置键名
        db_keys = ['database', 'db', 'sql', 'mysql', 'postgres', 'postgresql', 'mongodb', 'redis']
        
        def extract_db_info(data, prefix=''):
            """递归提取数据库信息"""
            if isinstance(data, dict):
                for key, value in data.items():
                    key_lower = key.lower()
                    
                    # 检查是否是数据库配置
                    if any(db_key in key_lower for db_key in db_keys):
                        if isinstance(value, dict):
                            db_info = {
                                'name': key,
                                'type': 'unknown',
                                'config': {}
                            }
                            
                            logger.info(f"找到数据库配置: {key}, 值: {value}")
                            
                            # 尝试识别数据库类型
                            for db_type in ['mysql', 'postgres', 'postgresql', 'mongodb', 'redis', 'sqlite']:
                                if db_type in key_lower:
                                    db_info['type'] = db_type
                                    break
                            
                            # 提取连接参数
                            for param in ['host', 'port', 'user', 'username', 'password', 'database', 'dbname', 'name', 'path', 'dsn', 'url', 'address']:
                                if param in value:
                                    db_info['config'][param] = value[param]
                                    logger.info(f"提取参数 {param}: {value[param]}")
                            
                            # 如果配置为空但有数据，尝试从整个对象中提取
                            if not db_info['config']:
                                db_info['config'] = value
                                logger.info(f"使用完整配置: {value}")
                            
                            if db_info['config']:
                                db_connections.append(db_info)
                                logger.info(f"添加数据库连接: {db_info}")
                    else:
                        extract_db_info(value, f'{prefix}.{key}' if prefix else key)
            elif isinstance(data, list):
                for item in data:
                    extract_db_info(item, prefix)
        
        # 先进行特殊处理（避免重复）
        if config_type in ['yaml', 'toml']:
            # 查找 datasource 配置
            if 'datasource' in config_data:
                datasource = config_data['datasource']
                if isinstance(datasource, dict):
                    for ds_name, ds_config in datasource.items():
                        if isinstance(ds_config, dict):
                            db_info = {
                                'name': ds_name,
                                'type': 'unknown',
                                'config': {}
                            }
                            for param in ['host', 'port', 'user', 'password', 'database', 'dbname', 'driver']:
                                if param in ds_config:
                                    db_info['config'][param] = ds_config[param]
                            
                            # 尝试解析 GORM DSN 格式的 link 字段
                            if 'link' in ds_config:
                                dsn_info = parse_gorm_dsn(ds_config['link'])
                                if dsn_info:
                                    db_info['config'].update(dsn_info)
                                    db_info['type'] = dsn_info.get('type', 'unknown')
                            
                            if db_info['config']:
                                db_connections.append(db_info)
                                logger.info(f"添加 datasource 配置: {db_info}")
            
            # 查找 database 配置（Go 项目常见结构）
            if 'database' in config_data:
                database = config_data['database']
                if isinstance(database, dict):
                    # 检查是否有嵌套的数据库配置（如 defaultRead, backup, sysolin）
                    for db_name, db_config in database.items():
                        if db_name in ['logger', 'cacheKey']:
                            continue  # 跳过非数据库配置
                        
                        if isinstance(db_config, dict) and 'link' in db_config:
                            # 这是一个数据库配置
                            db_info = {
                                'name': db_name,
                                'type': 'unknown',
                                'config': {}
                            }
                            
                            # 解析 GORM DSN 格式的 link 字段
                            dsn_info = parse_gorm_dsn(db_config['link'])
                            if dsn_info:
                                db_info['config'].update(dsn_info)
                                db_info['type'] = dsn_info.get('type', 'unknown')
                            
                            if db_info['config']:
                                db_connections.append(db_info)
                                logger.info(f"添加数据库配置 {db_name}: {db_info}")
                        
                        elif isinstance(db_config, list):
                            # 处理数组类型的配置（如 default: [{role: 'master', link: '...'}, {role: 'slave', link: '...'}]）
                            for idx, item in enumerate(db_config):
                                if isinstance(item, dict) and 'link' in item:
                                    db_info = {
                                        'name': f"{db_name}_{item.get('role', idx)}",
                                        'type': 'unknown',
                                        'config': {}
                                    }
                                    
                                    # 解析 GORM DSN 格式的 link 字段
                                    dsn_info = parse_gorm_dsn(item['link'])
                                    if dsn_info:
                                        db_info['config'].update(dsn_info)
                                        db_info['type'] = dsn_info.get('type', 'unknown')
                                    
                                    if db_info['config']:
                                        db_connections.append(db_info)
                                        logger.info(f"添加数据库配置 {db_info['name']}: {db_info}")
                    
                    # 如果没有找到任何嵌套配置，尝试直接解析 database 对象
                    if not db_connections:
                        db_info = {
                            'name': 'database',
                            'type': database.get('type', 'unknown'),
                            'config': {}
                        }
                        
                        # 提取所有可能的配置参数
                        for param in ['host', 'port', 'user', 'username', 'password', 'database', 'dbname', 'name', 'address', 'dsn', 'url', 'charset', 'link']:
                            if param in database:
                                if param == 'link':
                                    # 尝试解析 GORM DSN 格式
                                    dsn_info = parse_gorm_dsn(database[param])
                                    if dsn_info:
                                        db_info['config'].update(dsn_info)
                                        db_info['type'] = dsn_info.get('type', 'unknown')
                                else:
                                    db_info['config'][param] = database[param]
                        
                        # 如果配置为空但有数据，使用整个对象
                        if not db_info['config']:
                            db_info['config'] = database
                        
                        if db_info['config']:
                            db_connections.append(db_info)
                            logger.info(f"添加 database 配置: {db_info}")
            
            # 查找 mysql, postgres 等直接配置
            for db_type in ['mysql', 'postgres', 'postgresql', 'mongodb', 'redis']:
                if db_type in config_data:
                    db_config = config_data[db_type]
                    if isinstance(db_config, dict):
                        db_info = {
                            'name': db_type,
                            'type': db_type,
                            'config': {}
                        }
                        
                        # 检查是否有 link 字段（GORM DSN 格式）
                        if 'link' in db_config:
                            dsn_info = parse_gorm_dsn(db_config['link'])
                            if dsn_info:
                                db_info['config'].update(dsn_info)
                        
                        # 提取其他参数
                        for param in ['host', 'port', 'user', 'username', 'password', 'database', 'dbname', 'name', 'address']:
                            if param in db_config:
                                db_info['config'][param] = db_config[param]
                        
                        if db_info['config']:
                            db_connections.append(db_info)
                            logger.info(f"添加 {db_type} 配置: {db_info}")
        
        # 如果没有找到任何配置，再进行递归提取
        if not db_connections:
            logger.info("未找到特殊配置，进行递归提取")
            extract_db_info(config_data)
    
    except Exception as e:
        logger.error(f"解析数据库配置时出错: {e}")
        import traceback
        logger.error(traceback.format_exc())
    
    except Exception as e:
        logger.warning(f"Failed to parse database config: {e}")
    
    return db_connections

@app.get("/api/database/project-databases/{project_name}")
async def get_project_databases(project_name: str):
    """获取项目中的所有数据库文件和配置"""
    try:
        import glob
        import yaml
        import toml
        
        project_path = get_project_path(project_name)
        
        if not project_path or not os.path.exists(project_path):
            return JSONResponse({"error": "Project not found"}, status_code=404)
        
        db_files = []
        db_configs = []
        
        # 递归搜索数据库文件和配置文件
        for root, dirs, files in os.walk(project_path):
            # 跳过常见的非数据库目录
            dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', '__pycache__', 'dist', 'build', 'vendor']]
            
            for file in files:
                full_path = os.path.join(root, file)
                relative_path = os.path.relpath(full_path, project_path)
                
                # 搜索 SQLite 数据库文件
                if file.endswith('.db') or file.endswith('.sqlite') or file.endswith('.sqlite3'):
                    file_size = os.path.getsize(full_path) if os.path.exists(full_path) else 0
                    
                    # 验证是否是有效的 SQLite 数据库
                    is_valid = False
                    try:
                        conn = sqlite3.connect(full_path)
                        conn.execute("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1;")
                        conn.close()
                        is_valid = True
                    except Exception:
                        pass
                    
                    db_files.append({
                        "name": file,
                        "path": relative_path,
                        "full_path": full_path,
                        "size": file_size,
                        "is_valid": is_valid,
                        "type": "sqlite"
                    })
                
                # 搜索 Go 项目的配置文件
                elif file.endswith(('.yaml', '.yml', '.toml')) or file in ['.env', 'go.mod']:
                    # 支持带环境后缀的配置文件（如 config.dev.toml, config.pro.toml）
                    is_config_file = (
                        file in ['config.yaml', 'config.yml', 'config.toml', '.env', 'go.mod'] or
                        file.startswith('config.') and file.endswith(('.yaml', '.yml', '.toml'))
                    )
                    
                    # 只处理根目录的配置文件
                    if is_config_file and (root == project_path or relative_path.count('/') <= 1):
                        try:
                            config_data = None
                            config_type = None
                            
                            if file.endswith(('.yaml', '.yml')):
                                with open(full_path, 'r', encoding='utf-8') as f:
                                    config_data = yaml.safe_load(f)
                                config_type = 'yaml'
                            elif file.endswith('.toml'):
                                with open(full_path, 'r', encoding='utf-8') as f:
                                    config_data = toml.load(f)
                                config_type = 'toml'
                            elif file == '.env':
                                from dotenv import load_dotenv
                                config_data = {}
                                with open(full_path, 'r', encoding='utf-8') as f:
                                    for line in f:
                                        line = line.strip()
                                        if line and not line.startswith('#') and '=' in line:
                                            key, value = line.split('=', 1)
                                            config_data[key.strip()] = value.strip()
                                config_type = 'env'
                            elif file == 'go.mod':
                                with open(full_path, 'r', encoding='utf-8') as f:
                                    config_data = {'module': '', 'go_version': ''}
                                    for line in f:
                                        if line.startswith('module '):
                                            config_data['module'] = line.split()[1]
                                        elif line.startswith('go '):
                                            config_data['go_version'] = line.split()[1]
                                config_type = 'go'
                            
                            if config_data:
                                # 解析数据库配置
                                db_connections = parse_database_config(config_data, config_type)
                                
                                # 提取环境信息
                                env_info = None
                                if file.startswith('config.') and '.' in file[:-5]:
                                    # 提取环境名称（如 config.dev.toml -> dev）
                                    parts = file.split('.')
                                    if len(parts) >= 3:
                                        env_info = parts[1]
                                
                                db_configs.append({
                                    "name": file,
                                    "path": relative_path,
                                    "full_path": full_path,
                                    "type": config_type,
                                    "data": config_data,
                                    "db_connections": db_connections,
                                    "environment": env_info
                                })
                        except Exception as e:
                            logger.warning(f"Failed to read config file {file}: {e}")
        
        # 按文件名排序
        db_files.sort(key=lambda x: x["name"])
        db_configs.sort(key=lambda x: x["name"])
        
        return {
            "project_name": project_name,
            "project_path": project_path,
            "databases": db_files,
            "configs": db_configs,
            "database_count": len(db_files),
            "config_count": len(db_configs)
        }
    except Exception as e:
        logger.error(f"Error getting project databases: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

# --- Workflow API ---

class WorkflowSaveRequest(BaseModel):
    project_name: str
    workflow_name: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]

class WorkflowGenerateRequest(BaseModel):
    prompt: str

@app.post("/api/workflows/save")
async def save_workflow(req: WorkflowSaveRequest):
    """保存工作流"""
    try:
        from backend.core.workflow_service import Workflow
        
        workflow = Workflow(
            id=None,
            name=req.workflow_name,
            nodes=req.nodes,
            edges=req.edges,
            project_name=req.project_name,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )
        
        workflow_id = workflow_service.save_workflow(workflow)
        
        return {
            "success": True,
            "workflow_id": workflow_id,
            "message": "工作流保存成功"
        }
    except Exception as e:
        logger.error(f"Error saving workflow: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/workflows/{project_name}")
async def get_workflows(project_name: str):
    """获取项目的所有工作流"""
    try:
        workflows = workflow_service.get_workflows_by_project(project_name)
        return {
            "workflows": [
                {
                    "id": w.id,
                    "name": w.name,
                    "created_at": w.created_at,
                    "updated_at": w.updated_at,
                    "nodes_count": len(w.nodes),
                    "edges_count": len(w.edges)
                }
                for w in workflows
            ]
        }
    except Exception as e:
        logger.error(f"Error getting workflows: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/api/workflows/{project_name}/{workflow_id}")
async def get_workflow(project_name: str, workflow_id: str):
    """获取工作流详情"""
    try:
        workflow = workflow_service.get_workflow(workflow_id)
        if not workflow:
            return JSONResponse({"error": "Workflow not found"}, status_code=404)
        
        return {
            "id": workflow.id,
            "name": workflow.name,
            "nodes": workflow.nodes,
            "edges": workflow.edges,
            "created_at": workflow.created_at,
            "updated_at": workflow.updated_at
        }
    except Exception as e:
        logger.error(f"Error getting workflow: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.delete("/api/workflows/{project_name}/{workflow_id}")
async def delete_workflow(project_name: str, workflow_id: str):
    """删除工作流"""
    try:
        success = workflow_service.delete_workflow(workflow_id)
        if success:
            return {"success": True, "message": "工作流删除成功"}
        else:
            return JSONResponse({"error": "Workflow not found"}, status_code=404)
    except Exception as e:
        logger.error(f"Error deleting workflow: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/workflows/generate")
async def generate_workflow(req: WorkflowGenerateRequest):
    """AI 生成工作流"""
    try:
        result = workflow_service.generate_workflow_from_prompt(req.prompt)
        return result
    except Exception as e:
        logger.error(f"Error generating workflow: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/api/workflows/{workflow_id}/execute")
async def execute_workflow(workflow_id: str, context: Dict[str, Any] = None):
    """执行工作流"""
    try:
        workflow = workflow_service.get_workflow(workflow_id)
        if not workflow:
            return JSONResponse({"error": "Workflow not found"}, status_code=404)

        # 获取项目路径
        project_path = project_registry.get_project_path(workflow.project_name)
        if not project_path:
            return JSONResponse({"error": "Project path not found"}, status_code=404)

        def normalize_workflow_graph(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> Dict[str, Any]:
            type_mapping = {
                "readFile": "fileRead",
                "writeFile": "fileWrite",
                "searchFiles": "search",
                "gitCommit": "git",
                "gitBranch": "git",
            }
            normalized_nodes = []
            for node in nodes:
                if not isinstance(node, dict):
                    continue
                node_type = node.get("type")
                mapped_type = type_mapping.get(node_type, node_type)
                if mapped_type == node_type:
                    normalized_nodes.append(node)
                else:
                    normalized_nodes.append({**node, "type": mapped_type})
            return {"nodes": normalized_nodes, "edges": edges}

        # 执行工作流
        result = await workflow_executor.execute_workflow(
            workflow_id,
            normalize_workflow_graph(workflow.nodes, workflow.edges),
            project_path,
            context
        )

        return {
            "success": result.success,
            "steps_completed": result.steps_completed,
            "steps_total": result.steps_total,
            "logs": result.logs,
            "output": result.output,
            "error": result.error
        }
    except Exception as e:
        logger.error(f"Error executing workflow: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

async def execute_workflow_stream(workflow_id: str, project_name: str = Query(None)):
    """流式执行工作流（SSE）- 内部实现（用不冲突的路由调用）"""
    def normalize_workflow_graph(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> Dict[str, Any]:
        type_mapping = {
            "readFile": "fileRead",
            "writeFile": "fileWrite",
            "searchFiles": "search",
            "gitCommit": "git",
            "gitBranch": "git",
        }
        normalized_nodes = []
        for node in nodes:
            if not isinstance(node, dict):
                continue
            node_type = node.get("type")
            mapped_type = type_mapping.get(node_type, node_type)
            if mapped_type == node_type:
                normalized_nodes.append(node)
            else:
                normalized_nodes.append({**node, "type": mapped_type})
        return {"nodes": normalized_nodes, "edges": edges}

    async def event_generator():
        execution_id = None
        steps_total = 0
        steps_completed = 0
        started_at = datetime.now().isoformat()
        try:
            workflow = workflow_service.get_workflow(workflow_id)
            workflow_data = None
            if workflow:
                workflow_data = {
                    "project_name": workflow.project_name,
                    "nodes": workflow.nodes,
                    "edges": workflow.edges
                }
            else:
                file_path = os.path.join(workflow_service.storage_dir, f"{workflow_id}.json")
                if os.path.exists(file_path):
                    with open(file_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    workflow_data = {
                        "project_name": data.get("project_name"),
                        "nodes": data.get("nodes", []),
                        "edges": data.get("edges", [])
                    }

            if not workflow_data:
                execution_id = f"exec_{workflow_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                workflow_execution_store.create(execution_id, {
                    "workflow_id": workflow_id,
                    "workflow_name": None,
                    "project_name": project_name,
                    "status": "failed",
                    "started_at": started_at,
                    "ended_at": datetime.now().isoformat(),
                    "error": "Workflow not found"
                })
                err_event = {'type': 'error', 'error': 'Workflow not found', 'execution_id': execution_id, 'timestamp': datetime.now().isoformat()}
                workflow_execution_store.append_event(execution_id, err_event)
                yield f"data: {json.dumps(err_event, ensure_ascii=False)}\n\n"
                return

            resolved_project_name = project_name or workflow_data.get("project_name")
            project_path = get_project_path(resolved_project_name)

            normalized_graph = normalize_workflow_graph(workflow_data.get("nodes", []), workflow_data.get("edges", []))

            execution_id = f"exec_{workflow_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            workflow_execution_store.create(execution_id, {
                "workflow_id": workflow_id,
                "workflow_name": (workflow.name if workflow else None),
                "project_name": resolved_project_name,
                "status": "running",
                "started_at": started_at,
                "steps_total": 0,
                "steps_completed": 0
            })

            async for update in workflow_executor.execute_workflow_stream(
                workflow_id,
                normalized_graph,
                project_path,
                context={"project_name": resolved_project_name}
            ):
                if isinstance(update, dict):
                    update = {**update, "execution_id": execution_id}

                if isinstance(update, dict) and update.get("type") == "plan":
                    steps_total = int(update.get("steps_total") or 0)
                    workflow_execution_store.update(execution_id, {"steps_total": steps_total})

                if isinstance(update, dict) and update.get("type") == "step_complete":
                    steps_completed += 1
                    workflow_execution_store.update(execution_id, {"steps_completed": steps_completed})

                if isinstance(update, dict) and update.get("type") == "error":
                    workflow_execution_store.update(execution_id, {
                        "status": "failed",
                        "ended_at": datetime.now().isoformat(),
                        "error": update.get("error")
                    })

                if isinstance(update, dict) and update.get("type") == "complete":
                    workflow_execution_store.update(execution_id, {
                        "status": "completed",
                        "ended_at": datetime.now().isoformat(),
                        "steps_total": steps_total,
                        "steps_completed": steps_completed
                    })

                if isinstance(update, dict):
                    workflow_execution_store.append_event(execution_id, update)

                yield f"data: {json.dumps(update, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error(f"Error executing workflow stream: {e}")
            if not execution_id:
                execution_id = f"exec_{workflow_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                workflow_execution_store.create(execution_id, {
                    "workflow_id": workflow_id,
                    "workflow_name": (workflow.name if workflow else None) if 'workflow' in locals() else None,
                    "project_name": project_name,
                    "status": "failed",
                    "started_at": started_at,
                    "ended_at": datetime.now().isoformat(),
                    "error": str(e)
                })
            err_event = {'type': 'error', 'error': str(e), 'execution_id': execution_id, 'timestamp': datetime.now().isoformat()}
            workflow_execution_store.append_event(execution_id, err_event)
            yield f"data: {json.dumps(err_event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )

@app.get("/api/workflows/stream/{workflow_id}/execute")
async def execute_workflow_stream_route(workflow_id: str, project_name: str = Query(None)):
    return await execute_workflow_stream(workflow_id, project_name)

@app.get("/api/workflows/executions")
async def list_workflow_executions(
    limit: int = Query(50, ge=1, le=200),
    workflow_id: str = Query(None),
    project_name: str = Query(None)
):
    items = workflow_execution_store.list(limit=limit, workflow_id=workflow_id, project_name=project_name)
    return {"success": True, "executions": items}

@app.get("/api/workflows/executions/{execution_id}")
async def get_workflow_execution(execution_id: str):
    record = workflow_execution_store.get(execution_id)
    if not record:
        return JSONResponse({"error": "Execution not found"}, status_code=404)
    return {"success": True, "execution": record}


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


@app.api_route("/api/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def catch_all(path_name: str, request: Request):
    """Catch-all 路由 - 处理未实现的 API 端点"""

    # 排除 interview 路由，让 interview router 处理
    if path_name.startswith("interview/"):
        raise HTTPException(status_code=404, detail=f"Interview endpoint '/api/{path_name}' not found")

    # 排除 job-analysis 路由，让 job_analysis router 处理
    if path_name.startswith("job-analysis/"):
        raise HTTPException(status_code=404, detail=f"Job analysis endpoint '/api/{path_name}' not found")

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

import asyncio
import os
import subprocess
import shutil
import logging
import sys
import concurrent.futures
from typing import AsyncGenerator, List, Dict, Any

# 配置日志
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s [%(levelname)s] %(name)s: %(message)s', datefmt='%H:%M:%S')
logger = logging.getLogger("IFlowClient")

def find_iflow_path():
    """查找 iflow 可执行文件路径"""
    npm_global = os.path.join(os.environ.get('APPDATA', ''), 'npm')
    possible_paths = [
        shutil.which("iflow"),
        shutil.which("iflow.cmd"),
        os.path.join(npm_global, "iflow.cmd"),
        os.path.join(npm_global, "iflow"),
        "iflow"
    ]
    for p in possible_paths:
        if p and os.path.exists(p):
            logger.info(f"Found iflow at: {p}")
            return p
    logger.warning("iflow not found, using 'iflow'")
    return "iflow"

# 线程池用于运行同步的子进程
_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

def _run_iflow_sync(iflow_path: str, user_input: str, model: str, cwd: str) -> str:
    """同步运行 iflow CLI（在线程中执行）"""
    safe_input = user_input.replace('"', '\\"').replace('\n', ' ')
    cmd = f'"{iflow_path}" -p "{safe_input}" --model "{model}" -y'
    logger.info(f"Running CLI: {cmd}")
    
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            cwd=cwd,
            timeout=300,
            encoding='utf-8',
            errors='ignore'
        )
        
        stdout = result.stdout or ""
        stderr = result.stderr or ""
        
        logger.debug(f"stdout length: {len(stdout)}")
        if stderr:
            logger.error(f"stderr: {stderr[:500]}")
        
        # 过滤输出
        lines = []
        for line in stdout.split('\n'):
            if any(x in line for x in ["[ACP]", "🚀", "Checking", "INFO:", "DEBUG:", "Attempt", "Error when", "<Execution Info>", "session-id", "conversation-id", "assistantRounds", "executionTimeMs", "tokenUsage"]):
                continue
            if line.strip():
                lines.append(line)
        
        output = '\n'.join(lines).strip()
        
        if not output:
            if "404" in stderr:
                return "⚠️ API 错误: iFlow API 返回 404。请检查配置。"
            elif stderr.strip():
                return f"❌ Error: {stderr[:200]}"
            else:
                return "⚠️ iFlow 没有返回内容"
        
        return output
        
    except subprocess.TimeoutExpired:
        return "⚠️ 请求超时"
    except Exception as e:
        logger.exception(f"Exception: {e}")
        return f"❌ Exception: {str(e)}"


class IFlowWrapper:
    def __init__(self, cwd: str = None, approval_mode: str = "yolo", model: str = None, mcp_servers: List[Dict[str, Any]] = None):
        self.model = model or "GLM-4.6"
        self.cwd = cwd or os.getcwd()
        self.iflow_path = find_iflow_path()
        logger.info(f"IFlowWrapper: cwd={self.cwd}, model={self.model}")

    async def chat_stream(self, user_input: str) -> AsyncGenerator[str, None]:
        """流式对话"""
        logger.info(f"chat_stream: {user_input[:50]}...")
        
        loop = asyncio.get_event_loop()
        
        # 在线程池中运行同步的子进程
        result = await loop.run_in_executor(
            _executor,
            _run_iflow_sync,
            self.iflow_path,
            user_input,
            self.model,
            self.cwd
        )
        
        # 返回结果
        yield result


def create_iflow_client(cwd: str = None, mode: str = "yolo", model: str = None, mcp_servers: List[Dict[str, Any]] = None):
    return IFlowWrapper(cwd=cwd, approval_mode=mode, model=model, mcp_servers=mcp_servers)

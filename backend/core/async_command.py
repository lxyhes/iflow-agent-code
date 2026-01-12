"""
异步命令执行工具 (Async Command Executor)
使用 asyncio.create_subprocess_exec 实现真正的异步命令执行
"""

import asyncio
import logging
from typing import List, Optional, AsyncGenerator, Dict, Any

logger = logging.getLogger("AsyncCommandExecutor")


class AsyncCommandExecutor:
    """异步命令执行器"""
    
    def __init__(self):
        self.active_processes: Dict[str, asyncio.subprocess.Process] = {}
    
    async def execute_command(
        self,
        command: List[str],
        cwd: Optional[str] = None,
        env: Optional[Dict[str, str]] = None,
        timeout: Optional[int] = None,
        capture_output: bool = True
    ) -> Dict[str, Any]:
        """
        执行命令并返回结果
        
        Args:
            command: 命令列表
            cwd: 工作目录
            env: 环境变量
            timeout: 超时时间（秒）
            capture_output: 是否捕获输出
        
        Returns:
            执行结果
        """
        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                cwd=cwd,
                env=env,
                stdout=asyncio.subprocess.PIPE if capture_output else None,
                stderr=asyncio.subprocess.PIPE if capture_output else None
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout
                )
            except asyncio.TimeoutError:
                process.kill()
                stdout, stderr = await process.communicate()
                return {
                    "success": False,
                    "return_code": -1,
                    "stdout": stdout.decode('utf-8', errors='ignore') if stdout else "",
                    "stderr": stderr.decode('utf-8', errors='ignore') if stderr else "",
                    "error": "Command timed out"
                }
            
            return {
                "success": process.returncode == 0,
                "return_code": process.returncode,
                "stdout": stdout.decode('utf-8', errors='ignore') if stdout else "",
                "stderr": stderr.decode('utf-8', errors='ignore') if stderr else "",
                "pid": process.pid
            }
        
        except Exception as e:
            logger.error(f"Command execution failed: {e}")
            return {
                "success": False,
                "return_code": -1,
                "stdout": "",
                "stderr": "",
                "error": str(e)
            }
    
    async def execute_command_stream(
        self,
        command: List[str],
        cwd: Optional[str] = None,
        env: Optional[Dict[str, str]] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        流式执行命令，实时返回输出
        
        Args:
            command: 命令列表
            cwd: 工作目录
            env: 环境变量
        
        Yields:
            输出块
        """
        process_id = f"{'-'.join(command)}-{asyncio.get_event_loop().time()}"
        
        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                cwd=cwd,
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            self.active_processes[process_id] = process
            
            yield {
                "type": "started",
                "pid": process.pid
            }
            
            # 异步读取输出
            async def read_stream(stream, stream_type):
                while True:
                    line = await stream.readline()
                    if not line:
                        break
                    yield {
                        "type": "output",
                        "stream": stream_type,
                        "data": line.decode('utf-8', errors='ignore')
                    }
            
            # 并发读取 stdout 和 stderr
            async for output in read_stream(process.stdout, "stdout"):
                yield output
            
            async for output in read_stream(process.stderr, "stderr"):
                yield output
            
            # 等待进程结束
            return_code = await process.wait()
            
            yield {
                "type": "completed",
                "return_code": return_code,
                "success": return_code == 0
            }
        
        except Exception as e:
            logger.error(f"Stream command execution failed: {e}")
            yield {
                "type": "error",
                "error": str(e)
            }
        
        finally:
            if process_id in self.active_processes:
                del self.active_processes[process_id]
    
    async def kill_process(self, process_id: str) -> bool:
        """
        终止正在运行的进程
        
        Args:
            process_id: 进程 ID
        
        Returns:
            是否成功终止
        """
        if process_id in self.active_processes:
            process = self.active_processes[process_id]
            process.kill()
            await process.wait()
            del self.active_processes[process_id]
            return True
        return False
    
    async def kill_all_processes(self):
        """终止所有正在运行的进程"""
        for process_id, process in list(self.active_processes.items()):
            try:
                process.kill()
                await process.wait()
            except Exception as e:
                logger.error(f"Failed to kill process {process_id}: {e}")
        
        self.active_processes.clear()


# 全局实例
_async_command_executor = None


def get_async_command_executor() -> AsyncCommandExecutor:
    """获取异步命令执行器实例"""
    global _async_command_executor
    if _async_command_executor is None:
        _async_command_executor = AsyncCommandExecutor()
    return _async_command_executor
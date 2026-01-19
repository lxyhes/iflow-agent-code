import asyncio
import subprocess
import os
import platform
import threading
import json
import queue
import io
import logging
from typing import Dict, Optional
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger("ShellService")

class ShellSession:
    def __init__(self, cwd: str = None):
        # 验证并设置工作目录
        self.cwd = self._validate_cwd(cwd)
        self.process = None
        self.websocket = None
        self.output_queue = queue.Queue()
        self.running = False

    def _validate_cwd(self, cwd: Optional[str]) -> str:
        """验证工作目录，确保它存在且可访问"""
        if not cwd:
            cwd = os.getcwd()

        # 规范化路径
        cwd = os.path.abspath(cwd)

        # 检查目录是否存在
        if not os.path.exists(cwd):
            logger.warning(f"工作目录不存在: {cwd}，使用当前目录")
            cwd = os.getcwd()

        # 检查是否为目录
        if not os.path.isdir(cwd):
            logger.warning(f"路径不是目录: {cwd}，使用当前目录")
            cwd = os.getcwd()

        # 检查是否有读权限
        if not os.access(cwd, os.R_OK | os.X_OK):
            logger.warning(f"工作目录无访问权限: {cwd}，使用当前目录")
            cwd = os.getcwd()

        logger.info(f"Shell 工作目录: {cwd}")
        return cwd

    def _get_shell_command(self) -> list:
        """获取适合当前平台的 shell 命令"""
        system = platform.system()

        if system == "Windows":
            return ["powershell.exe", "-NoLogo", "-NoProfile", "-Command", "-"]
        elif system == "Darwin":
            # macOS 默认使用 zsh
            zsh_path = subprocess.run(["which", "zsh"], capture_output=True, text=True).stdout.strip()
            if zsh_path and os.path.exists(zsh_path):
                logger.info(f"使用 zsh: {zsh_path}")
                return [zsh_path, "-i"]
            else:
                # 回退到 bash
                bash_path = subprocess.run(["which", "bash"], capture_output=True, text=True).stdout.strip()
                if bash_path and os.path.exists(bash_path):
                    logger.info(f"使用 bash: {bash_path}")
                    return [bash_path, "-i"]
                else:
                    # 最后回退到 /bin/bash
                    logger.warning("未找到 zsh 或 bash，使用 /bin/bash")
                    return ["/bin/bash", "-i"]
        else:
            # Linux 使用 bash
            bash_path = subprocess.run(["which", "bash"], capture_output=True, text=True).stdout.strip()
            if bash_path and os.path.exists(bash_path):
                logger.info(f"使用 bash: {bash_path}")
                return [bash_path, "-i"]
            else:
                logger.warning("未找到 bash，使用 /bin/bash")
                return ["/bin/bash", "-i"]

    async def start(self, websocket: WebSocket):
        self.websocket = websocket
        self.running = True

        try:
            await websocket.accept()
            logger.info(f"Shell WebSocket accepted, cwd={self.cwd}")
        except Exception as e:
            logger.error(f"Shell WebSocket accept failed: {e}")
            return

        # 发送初始消息
        await self._send("output", f"Connecting to shell...\r\n")

        try:
            # 获取 shell 命令
            shell_cmd = self._get_shell_command()
            logger.info(f"Shell 命令: {' '.join(shell_cmd)}")

            # 创建进程
            loop = asyncio.get_event_loop()

            def create_process():
                try:
                    return subprocess.Popen(
                        shell_cmd,
                        cwd=self.cwd,
                        stdin=subprocess.PIPE,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        text=True,
                        bufsize=0,
                        env=os.environ.copy()  # 传递环境变量
                    )
                except Exception as e:
                    logger.error(f"创建进程失败: {e}")
                    raise

            self.process = await loop.run_in_executor(None, create_process)

            logger.info(f"Shell 进程已启动, PID={self.process.pid}")
            await self._send("output", f"Shell ready (PID: {self.process.pid})\r\nCWD: {self.cwd}\r\n\r\n$ ")

        except FileNotFoundError as e:
            logger.error(f"Shell 可执行文件未找到: {e}")
            await self._send("output", f"Error: Shell 可执行文件未找到: {e}\r\n")
            await self._send("output", "请确保系统已安装 shell (bash/zsh)\r\n")
            return
        except PermissionError as e:
            logger.error(f"权限错误: {e}")
            await self._send("output", f"Error: 权限不足: {e}\r\n")
            return
        except Exception as e:
            logger.error(f"Shell 进程启动失败: {e}")
            await self._send("output", f"Error: {e}\r\n")
            return

        # 启动输出读取线程
        reader = threading.Thread(target=self._reader_thread, daemon=True)
        reader.start()

        # 主循环
        try:
            while self.running:
                # 刷新输出
                await self._flush_output()

                # 检查进程状态
                if self.process and self.process.poll() is not None:
                    await self._flush_output()
                    await self._send("output", "\r\n[Shell exited]\r\n")
                    break

                # 接收输入
                try:
                    msg = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)
                    await self._process_input(msg)
                except asyncio.TimeoutError:
                    continue
                except WebSocketDisconnect:
                    logger.info("Shell WebSocket disconnected")
                    break
                except Exception as e:
                    logger.error(f"Shell 接收错误: {e}")
                    break

        except Exception as e:
            logger.error(f"Shell 主循环错误: {e}")
        finally:
            self.running = False
            self._cleanup()
            logger.info("Shell 会话已结束")

    async def _process_input(self, raw: str):
        """处理输入消息"""
        data = raw
        try:
            msg = json.loads(raw)
            if isinstance(msg, dict):
                msg_type = msg.get("type", "")
                if msg_type == "init":
                    print(f"[Shell] Init received")
                    return
                if msg_type == "resize":
                    return
                if msg_type == "input":
                    data = msg.get("data", "")
        except:
            pass
        
        if data and self.process and self.process.stdin:
            try:
                # 写入命令 - 如果是文本模式，直接写入字符串
                if isinstance(self.process.stdin, io.TextIOWrapper):
                    self.process.stdin.write(data)
                else:
                    self.process.stdin.write(data.encode('utf-8'))
                self.process.stdin.flush()
                print(f"[Shell] Sent: {repr(data)}")
            except Exception as e:
                print(f"[Shell] Write error: {e}")

    def _reader_thread(self):
        """在线程中读取进程输出"""
        logger.info("Shell 读取线程已启动")
        try:
            while self.running and self.process:
                if self.process.poll() is not None:
                    # 读取剩余输出
                    try:
                        rest = self.process.stdout.read()
                        if rest:
                            self.output_queue.put(rest)
                    except Exception as e:
                        logger.warning(f"读取剩余输出失败: {e}")
                    break

                try:
                    # 读取一行（非阻塞）
                    line = self.process.stdout.readline()
                    if line:
                        self.output_queue.put(line)
                    else:
                        # 如果没有数据，短暂休眠
                        import time
                        time.sleep(0.01)
                except Exception as e:
                    logger.warning(f"Shell 读取错误: {e}")
                    break
        except Exception as e:
            logger.error(f"Shell 读取线程错误: {e}")
        finally:
            logger.info("Shell 读取线程已结束")

    async def _flush_output(self):
        """发送队列中的输出"""
        output = ""
        while not self.output_queue.empty():
            try:
                output += self.output_queue.get_nowait()
            except:
                break
        
        if output:
            await self._send("output", output)

    async def _send(self, msg_type: str, data: str):
        """发送消息到 WebSocket"""
        if self.websocket:
            try:
                await self.websocket.send_text(json.dumps({"type": msg_type, "data": data}))
            except Exception as e:
                logger.error(f"Shell 发送消息失败: {e}")

    def _cleanup(self):
        """清理资源"""
        self.running = False
        if self.process:
            try:
                # 先尝试优雅终止
                self.process.terminate()
                logger.info(f"Shell 进程已终止 (PID: {self.process.pid})")
            except Exception as e:
                logger.warning(f"终止进程失败: {e}")

            try:
                # 等待进程结束
                import time
                self.process.wait(timeout=2)
            except:
                pass

            try:
                # 如果还没结束，强制杀死
                if self.process.poll() is None:
                    self.process.kill()
                    logger.info(f"Shell 进程已强制杀死 (PID: {self.process.pid})")
            except Exception as e:
                logger.warning(f"强制杀死进程失败: {e}")

            self.process = None

shell_manager: Dict[str, ShellSession] = {}

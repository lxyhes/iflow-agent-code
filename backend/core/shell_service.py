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

# Conditional Imports for PTY support
WINPTY_AVAILABLE = False
PTY_AVAILABLE = False

if os.name == 'nt':
    try:
        from winpty import PtyProcess
        WINPTY_AVAILABLE = True
        logger.info("Winpty (pywinpty) is available.")
    except ImportError:
        logger.warning("Winpty not available. Install 'pywinpty' for better shell experience.")
else:
    try:
        import pty
        import fcntl
        import termios
        import struct
        PTY_AVAILABLE = True
        logger.info("PTY module is available.")
    except ImportError:
        logger.warning("PTY module not available.")

class ShellSession:
    def __init__(self, cwd: str = None):
        # 验证并设置工作目录
        self.cwd = self._validate_cwd(cwd)
        self.process = None
        self.master_fd = None # For POSIX PTY
        self.websocket = None
        self.output_queue = queue.Queue()
        self.running = False
        self.use_pty = False
        self.winpty_proc = None # For Windows Winpty

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
            return ["powershell.exe", "-NoLogo", "-NoProfile"]
        elif system == "Darwin":
            # macOS 默认使用 zsh
            zsh_path = "/bin/zsh"
            if os.path.exists(zsh_path):
                return [zsh_path, "-l"]
            return ["/bin/bash", "-l"]
        else:
            # Linux 使用 bash
            bash_path = "/bin/bash"
            if os.path.exists(bash_path):
                return [bash_path]
            return ["/bin/sh"]

    def _decode_data(self, data: bytes) -> str:
        """Decode binary data to string with fallback"""
        try:
            return data.decode('utf-8')
        except UnicodeDecodeError:
            try:
                # Try system preferred encoding (e.g., cp1252, gbk)
                import locale
                return data.decode(locale.getpreferredencoding())
            except:
                try:
                    return data.decode('gbk')
                except:
                    return data.decode('utf-8', errors='replace')

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
            shell_cmd = self._get_shell_command()
            logger.info(f"Shell 命令: {shell_cmd}")

            # --- Windows with WinPty ---
            if WINPTY_AVAILABLE and os.name == 'nt':
                self.use_pty = True
                cmd_str = " ".join(shell_cmd)
                # winpty spawn needs a string command usually, or we pass executable
                self.winpty_proc = PtyProcess.spawn(
                    shell_cmd,
                    cwd=self.cwd,
                    dimensions=(24, 80) # Default size, will be resized
                )
                self.process = self.winpty_proc # Alias for common checks if needed, but methods differ
                logger.info(f"WinPty 进程已启动, PID={self.winpty_proc.pid}")
                await self._send("output", f"Shell ready (WinPty)\r\nCWD: {self.cwd}\r\n")

            # --- POSIX with PTY ---
            elif PTY_AVAILABLE and os.name != 'nt':
                self.use_pty = True
                self.master_fd, self.slave_fd = pty.openpty()
                
                self.process = subprocess.Popen(
                    shell_cmd,
                    cwd=self.cwd,
                    stdin=self.slave_fd,
                    stdout=self.slave_fd,
                    stderr=self.slave_fd,
                    preexec_fn=os.setsid,
                    close_fds=True,
                    env=os.environ.copy()
                )
                os.close(self.slave_fd) # Close slave in parent
                logger.info(f"PTY Shell 进程已启动, PID={self.process.pid}")
                await self._send("output", f"Shell ready (PTY)\r\nCWD: {self.cwd}\r\n")

            # --- Fallback to Subprocess (No PTY) ---
            else:
                self.use_pty = False
                logger.warning("Fallback to basic subprocess shell (No PTY).")
                
                env = os.environ.copy()
                env["TERM"] = "xterm-256color"
                env["PYTHONIOENCODING"] = "utf-8"

                self.process = subprocess.Popen(
                    shell_cmd,
                    cwd=self.cwd,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=False,
                    bufsize=0,
                    env=env
                )
                logger.info(f"Basic Shell 进程已启动, PID={self.process.pid}")
                await self._send("output", f"Shell ready (Basic)\r\nCWD: {self.cwd}\r\nWarning: PTY not available, interactive features may be limited.\r\n$ ")

        except Exception as e:
            logger.error(f"Shell 启动失败: {e}")
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
                is_alive = True
                if self.use_pty and os.name == 'nt':
                    is_alive = self.winpty_proc.isalive()
                elif self.process:
                    is_alive = (self.process.poll() is None)
                
                if not is_alive:
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
        msg_type = ""
        cols = 80
        rows = 24

        try:
            msg = json.loads(raw)
            if isinstance(msg, dict):
                msg_type = msg.get("type", "")
                if msg_type == "init":
                    # Initial resize
                    cols = msg.get("cols", 80)
                    rows = msg.get("rows", 24)
                    self._resize(cols, rows)
                    return
                if msg_type == "resize":
                    cols = msg.get("cols", 80)
                    rows = msg.get("rows", 24)
                    self._resize(cols, rows)
                    return
                if msg_type == "input":
                    data = msg.get("data", "")
        except:
            pass
        
        # Write data to shell
        if not data:
            return

        try:
            if self.use_pty and os.name == 'nt':
                # WinPty write
                self.winpty_proc.write(data)
            
            elif self.use_pty and os.name != 'nt':
                # POSIX PTY write
                if self.master_fd:
                    os.write(self.master_fd, data.encode('utf-8'))
            
            elif self.process and self.process.stdin:
                # Basic Subprocess write
                encoded_data = data.encode('utf-8', errors='ignore')
                self.process.stdin.write(encoded_data)
                self.process.stdin.flush()

        except Exception as e:
            print(f"[Shell] Write error: {e}")

    def _resize(self, cols: int, rows: int):
        """Resize terminal"""
        try:
            if self.use_pty and os.name == 'nt':
                self.winpty_proc.setwinsize(rows, cols)
            elif self.use_pty and os.name != 'nt':
                if self.master_fd:
                    winsize = struct.pack("HHHH", rows, cols, 0, 0)
                    fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, winsize)
        except Exception as e:
            logger.warning(f"Resize failed: {e}")

    def _reader_thread(self):
        """在线程中读取进程输出"""
        logger.info("Shell 读取线程已启动")
        try:
            while self.running:
                text = ""
                
                # --- Windows WinPty Read ---
                if self.use_pty and os.name == 'nt':
                    if not self.winpty_proc.isalive():
                        break
                    try:
                        # Blocking read
                        text = self.winpty_proc.read(1024)
                        # Filter out DEL characters which cause xterm.js parsing errors
                        if text:
                            text = text.replace('\x7f', '')
                    except Exception as e:
                        if "EOF" in str(e):
                            break
                        # logger.warning(f"WinPty read error: {e}")
                        break

                # --- POSIX PTY Read ---
                elif self.use_pty and os.name != 'nt':
                    try:
                        data = os.read(self.master_fd, 1024)
                        if not data:
                            break
                        text = self._decode_data(data)
                        # Filter DEL here too just in case
                        if text:
                            text = text.replace('\x7f', '')
                    except OSError:
                        break

                # --- Basic Subprocess Read ---
                elif self.process:
                    if self.process.poll() is not None:
                        # Read remaining
                        rest = self.process.stdout.read()
                        if rest:
                            decoded = self._decode_data(rest)
                            self.output_queue.put(decoded.replace('\x7f', ''))
                        break
                    
                    try:
                        data = self.process.stdout.read(4096)
                        if data:
                            text = self._decode_data(data)
                            if text:
                                text = text.replace('\x7f', '')
                        else:
                            break
                    except:
                        break
                
                if text:
                    self.output_queue.put(text)
                else:
                    import time
                    time.sleep(0.01)

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
        
        if self.use_pty and os.name == 'nt' and self.winpty_proc:
            try:
                self.winpty_proc.close()
            except:
                pass
            self.winpty_proc = None

        if self.use_pty and os.name != 'nt' and self.master_fd:
            try:
                os.close(self.master_fd)
            except:
                pass
            self.master_fd = None

        if self.process:
            try:
                self.process.terminate()
            except:
                pass
            try:
                if self.process.poll() is None:
                    self.process.kill()
            except:
                pass
            self.process = None

shell_manager: Dict[str, ShellSession] = {}

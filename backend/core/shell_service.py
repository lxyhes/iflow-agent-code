import asyncio
import subprocess
import os
import platform
import threading
import json
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
    def __init__(self, cwd: str = None, cols: int = 80, rows: int = 24):
        self.cwd = self._validate_cwd(cwd)
        self.cols = cols
        self.rows = rows
        self.process = None
        self.master_fd = None # For POSIX PTY
        self.websocket: Optional[WebSocket] = None
        self.output_queue: asyncio.Queue = asyncio.Queue() # Use asyncio.Queue
        self.running = False
        self.use_pty = False
        self.winpty_proc = None # For Windows Winpty
        self.loop = None

    def _validate_cwd(self, cwd: Optional[str]) -> str:
        """Validate working directory"""
        if not cwd:
            cwd = os.getcwd()
        cwd = os.path.abspath(cwd)
        if not os.path.exists(cwd) or not os.path.isdir(cwd):
            logger.warning(f"Invalid CWD: {cwd}, fallback to current")
            cwd = os.getcwd()
        return cwd

    def _get_shell_command(self) -> list:
        system = platform.system()
        if system == "Windows":
            return ["powershell.exe", "-NoLogo", "-NoProfile"]
        elif system == "Darwin":
            return ["/bin/zsh", "-l"] if os.path.exists("/bin/zsh") else ["/bin/bash", "-l"]
        else:
            return ["/bin/bash"] if os.path.exists("/bin/bash") else ["/bin/sh"]

    def _decode_data(self, data: bytes) -> str:
        try:
            return data.decode('utf-8')
        except UnicodeDecodeError:
            try:
                import locale
                return data.decode(locale.getpreferredencoding())
            except:
                return data.decode('utf-8', errors='replace')

    async def start(self, websocket: WebSocket):
        self.websocket = websocket
        self.loop = asyncio.get_running_loop()
        self.running = True

        try:
            await websocket.accept()
            logger.info(f"Shell WS accepted, cwd={self.cwd}")
        except Exception as e:
            logger.error(f"WS accept failed: {e}")
            return

        # Send connecting status
        await self._send_json({"type": "output", "data": "Connecting to shell environment...\r\n"})

        try:
            shell_cmd = self._get_shell_command()
            logger.info(f"Starting shell: {shell_cmd}")

            if WINPTY_AVAILABLE and os.name == 'nt':
                self.use_pty = True
                self.winpty_proc = PtyProcess.spawn(
                    shell_cmd,
                    cwd=self.cwd,
                    dimensions=(self.rows, self.cols)
                )
                logger.info(f"WinPty started, PID={self.winpty_proc.pid}")
                await self._send_json({"type": "output", "data": f"Shell ready (WinPty)\r\nCWD: {self.cwd}\r\n"})

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
                os.close(self.slave_fd)
                logger.info(f"PTY started, PID={self.process.pid}")
                await self._send_json({"type": "output", "data": f"Shell ready (PTY)\r\nCWD: {self.cwd}\r\n"})

            else:
                self.use_pty = False
                logger.warning("Fallback to basic subprocess (No PTY)")
                env = os.environ.copy()
                env["PYTHONIOENCODING"] = "utf-8"
                # Important: bufsize=0 for unbuffered I/O
                self.process = subprocess.Popen(
                    shell_cmd,
                    cwd=self.cwd,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT, # Merge stderr to stdout
                    bufsize=0, 
                    env=env
                )
                logger.info(f"Basic process started, PID={self.process.pid}")
                await self._send_json({"type": "output", "data": f"Shell ready (Basic)\r\nCWD: {self.cwd}\r\n"})

        except Exception as e:
            logger.exception("Failed to start shell process")
            await self._send_json({"type": "output", "data": f"Error starting shell: {str(e)}\r\n"})
            return

        # Start the background reader thread
        # Thread reads from blocking stdout and puts into asyncio.Queue via call_soon_threadsafe
        self.reader_thread = threading.Thread(target=self._reader_thread_func, daemon=True)
        self.reader_thread.start()

        # Run send/receive loops concurrently
        try:
            await asyncio.gather(
                self._sender_loop(),
                self._receiver_loop()
            )
        except Exception as e:
            logger.error(f"Shell loop error: {e}")
        finally:
            self._cleanup()

    async def _sender_loop(self):
        """Consume output_queue and send to WebSocket"""
        try:
            while self.running:
                # Wait for data from the reader thread
                data = await self.output_queue.get()
                if data is None: # Sentinel to stop
                    break
                
                await self._send_json({"type": "output", "data": data})
                self.output_queue.task_done()
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Sender loop error: {e}")

    async def _receiver_loop(self):
        """Receive data from WebSocket and write to process stdin"""
        try:
            while self.running:
                msg_text = await self.websocket.receive_text()
                try:
                    msg = json.loads(msg_text)
                    msg_type = msg.get("type")
                    
                    if msg_type == "input":
                        data = msg.get("data", "")
                        if data:
                            await self._write_to_process(data)
                    elif msg_type == "resize":
                        self._resize(msg.get("cols", 80), msg.get("rows", 24))
                    elif msg_type == "init":
                        self._resize(msg.get("cols", 80), msg.get("rows", 24))
                        
                except json.JSONDecodeError:
                    pass
        except WebSocketDisconnect:
            logger.info("WebSocket disconnected")
        except Exception as e:
            logger.error(f"Receiver loop error: {e}")
        finally:
            # When receiver stops (disconnect), signal everything to stop
            self.running = False
            self.output_queue.put_nowait(None) # Unblock sender

    async def _write_to_process(self, data: str):
        """Write input data to the shell process"""
        # Run in executor to avoid blocking the event loop with IO
        await self.loop.run_in_executor(None, self._write_sync, data)

    def _write_sync(self, data: str):
        try:
            if self.use_pty and os.name == 'nt' and self.winpty_proc:
                self.winpty_proc.write(data)
            elif self.use_pty and os.name != 'nt' and self.master_fd:
                os.write(self.master_fd, data.encode('utf-8'))
            elif self.process and self.process.stdin:
                self.process.stdin.write(data.encode('utf-8'))
                self.process.stdin.flush()
        except Exception as e:
            logger.error(f"Write error: {e}")

    def _reader_thread_func(self):
        """Thread to read stdout blocking/synchronously"""
        logger.info("Reader thread started")
        try:
            while self.running:
                text = None
                
                # --- Windows WinPty ---
                if self.use_pty and os.name == 'nt' and self.winpty_proc:
                    try:
                        text = self.winpty_proc.read(1024)
                    except Exception:
                        break # EOF or error

                # --- POSIX PTY ---
                elif self.use_pty and os.name != 'nt' and self.master_fd:
                    try:
                        data = os.read(self.master_fd, 1024)
                        if not data: break
                        text = self._decode_data(data)
                    except OSError:
                        break

                # --- Basic Subprocess ---
                elif self.process and self.process.stdout:
                    try:
                        # Blocking read
                        data = self.process.stdout.read1(4096) if hasattr(self.process.stdout, 'read1') else self.process.stdout.read(4096)
                        if not data: break
                        text = self._decode_data(data)
                    except Exception:
                        break

                if text:
                    # Thread-safe put into asyncio Queue
                    self.loop.call_soon_threadsafe(self.output_queue.put_nowait, text)
                else:
                    if not self._is_process_alive():
                        break
                    import time
                    time.sleep(0.01) # Tiny sleep to prevent CPU spin if read is non-blocking but returning empty

        except Exception as e:
            logger.error(f"Reader thread error: {e}")
        finally:
            logger.info("Reader thread stopped")
            self.running = False
            self.loop.call_soon_threadsafe(self.output_queue.put_nowait, None) # Signal sender to stop

    def _is_process_alive(self):
        if self.use_pty and os.name == 'nt':
            return self.winpty_proc and self.winpty_proc.isalive()
        if self.process:
            return self.process.poll() is None
        return False

    def _resize(self, cols: int, rows: int):
        try:
            if self.use_pty and os.name == 'nt' and self.winpty_proc:
                self.winpty_proc.setwinsize(rows, cols)
            elif self.use_pty and os.name != 'nt' and self.master_fd:
                winsize = struct.pack("HHHH", rows, cols, 0, 0)
                fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, winsize)
        except:
            pass

    async def _send_json(self, data: dict):
        if self.websocket:
            try:
                await self.websocket.send_text(json.dumps(data))
            except:
                pass

    def _cleanup(self):
        self.running = False
        try:
            if self.winpty_proc:
                del self.winpty_proc
                self.winpty_proc = None
            if self.master_fd:
                os.close(self.master_fd)
                self.master_fd = None
            if self.process:
                self.process.terminate()
                self.process = None
        except:
            pass

shell_manager: Dict[str, ShellSession] = {}
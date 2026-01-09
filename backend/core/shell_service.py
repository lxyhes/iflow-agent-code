import asyncio
import subprocess
import os
import platform
import threading
import json
import queue
import io
from typing import Dict
from fastapi import WebSocket, WebSocketDisconnect

class ShellSession:
    def __init__(self, cwd: str = None):
        self.cwd = cwd or os.getcwd()
        self.process = None
        self.websocket = None
        self.output_queue = queue.Queue()
        self.running = False
        
    async def start(self, websocket: WebSocket):
        self.websocket = websocket
        self.running = True
        
        try:
            await websocket.accept()
            print(f"[Shell] WebSocket accepted, cwd={self.cwd}")
        except Exception as e:
            print(f"[Shell] Accept failed: {e}")
            return
        
        # 发送初始消息
        await self._send("output", f"Connecting to shell...\r\n")
        
        try:
            # Windows: 使用 powershell，Linux/Mac: 使用 bash
            if platform.system() == "Windows":
                # PowerShell 交互模式 - 在线程池中创建进程
                loop = asyncio.get_event_loop()
                self.process = await loop.run_in_executor(
                    None,
                    lambda: subprocess.Popen(
                        ["powershell.exe", "-NoLogo", "-NoProfile", "-Command", "-"],
                        cwd=self.cwd,
                        stdin=subprocess.PIPE,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        text=True,
                        bufsize=0,
                        creationflags=subprocess.CREATE_NO_WINDOW
                    )
                )
            else:
                # Linux/Mac: 使用 bash
                loop = asyncio.get_event_loop()
                self.process = await loop.run_in_executor(
                    None,
                    lambda: subprocess.Popen(
                        ["/bin/bash", "-i"],
                        cwd=self.cwd,
                        stdin=subprocess.PIPE,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        text=True,
                        bufsize=0
                    )
                )

            print(f"[Shell] Process started, PID={self.process.pid}")
            await self._send("output", f"Shell ready (PID: {self.process.pid})\r\nCWD: {self.cwd}\r\n\r\nPS> ")

        except Exception as e:
            print(f"[Shell] Process start failed: {e}")
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
                    print("[Shell] WebSocket disconnected")
                    break
                except Exception as e:
                    print(f"[Shell] Receive error: {e}")
                    break
                    
        except Exception as e:
            print(f"[Shell] Main loop error: {e}")
        finally:
            self.running = False
            self._cleanup()
            print("[Shell] Session ended")

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
        print("[Shell] Reader thread started")
        try:
            while self.running and self.process:
                if self.process.poll() is not None:
                    # 读取剩余
                    try:
                        rest = self.process.stdout.read()
                        if rest:
                            self.output_queue.put(rest.decode('utf-8', errors='replace'))
                    except:
                        pass
                    break
                
                try:
                    # 读取一个字节（阻塞）
                    b = self.process.stdout.read(1)
                    if b:
                        char = b.decode('utf-8', errors='replace')
                        self.output_queue.put(char)
                    else:
                        break
                except Exception as e:
                    print(f"[Shell] Read error: {e}")
                    break
        except Exception as e:
            print(f"[Shell] Reader thread error: {e}")
        print("[Shell] Reader thread ended")

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
                print(f"[Shell] Send error: {e}")

    def _cleanup(self):
        """清理资源"""
        self.running = False
        if self.process:
            try:
                self.process.terminate()
            except:
                pass
            try:
                self.process.kill()
            except:
                pass
            self.process = None

shell_manager: Dict[str, ShellSession] = {}

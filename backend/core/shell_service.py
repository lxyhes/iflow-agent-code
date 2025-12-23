import asyncio
import subprocess
import sys
import os
import platform
import threading
import json
from typing import Dict
from fastapi import WebSocket

class ShellSession:
    def __init__(self, cwd: str = None):
        self.cwd = cwd or os.getcwd()
        self.process = None
        self.websocket = None
        
    async def start(self, websocket: WebSocket):
        self.websocket = websocket
        await websocket.accept()
        
        shell_cmd = "powershell.exe" if platform.system() == "Windows" else "bash"
        
        self.process = subprocess.Popen(
            [shell_cmd],
            cwd=self.cwd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=0,
            shell=False 
        )
        
        # Initial greeting in JSON format expected by frontend
        # Frontend expects { type: 'output', data: '...' }
        await self.send_json("output", f"Welcome to IFlow Shell ({shell_cmd})\r\nCWD: {self.cwd}\r\n\r\n")

        read_thread = threading.Thread(target=self._read_stdout, daemon=True)
        read_thread.start()

        try:
            while True:
                data = await websocket.receive_text()
                
                if self.process.poll() is not None:
                    await self.send_json("output", "\r\n[Process terminated]\r\n")
                    break
                
                # Parse input
                cmd = data
                try:
                    msg = json.loads(data)
                    if isinstance(msg, dict):
                        if msg.get("type") == "init":
                            # Maybe resize or set env
                            continue
                        if msg.get("type") == "resize":
                            # Ignore resize for now
                            continue
                        if msg.get("type") == "input":
                            cmd = msg.get("data", "")
                        else:
                            # If it's just raw input sent as string, cmd is already set
                            pass
                except:
                    # Raw string input
                    pass

                # If cmd is empty, skip
                if not cmd: continue

                self.process.stdin.write(cmd.encode('utf-8'))
                self.process.stdin.flush()
                
        except Exception as e:
            print(f"WebSocket closed: {e}")
        finally:
            self.terminate()

    def _read_stdout(self):
        try:
            while self.process and self.process.poll() is None:
                char = self.process.stdout.read(1)
                if not char: break
                
                if self.websocket:
                    text = char.decode('utf-8', errors='ignore')
                    if text == '\n': text = '\r\n'
                    
                    asyncio.run_coroutine_threadsafe(
                        self.send_json("output", text), 
                        asyncio.get_event_loop()
                    )
        except Exception as e:
            print(f"Read error: {e}")

    async def send_json(self, type: str, data: str):
        try:
            await self.websocket.send_text(json.dumps({
                "type": type,
                "data": data
            }))
        except:
            pass

    def terminate(self):
        if self.process:
            self.process.terminate()
            self.process = None

shell_manager: Dict[str, ShellSession] = {}
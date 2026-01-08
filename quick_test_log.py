"""
快速测试 - 验证日志查看器的核心功能
"""

import tkinter as tk
from tkinter import ttk, scrolledtext
import subprocess
import threading
from datetime import datetime

class QuickLogTest:
    def __init__(self, root):
        self.root = root
        self.root.title("日志查看器快速测试")
        self.root.geometry("800x600")
        
        # 创建 UI
        self.create_ui()
        
    def create_ui(self):
        # 控制按钮
        control_frame = tk.Frame(self.root, bg="#ecf0f1", height=60)
        control_frame.pack(fill=tk.X)
        
        tk.Button(
            control_frame,
            text="启动测试进程",
            command=self.start_test,
            bg="#27ae60",
            fg="white",
            font=("Microsoft YaHei", 10, "bold"),
            padx=20,
            pady=8
        ).pack(side=tk.LEFT, padx=10, pady=10)
        
        tk.Button(
            control_frame,
            text="停止进程",
            command=self.stop_test,
            bg="#e74c3c",
            fg="white",
            font=("Microsoft YaHei", 10, "bold"),
            padx=20,
            pady=8
        ).pack(side=tk.LEFT, padx=10, pady=10)
        
        # 日志显示区域
        log_frame = tk.Frame(self.root)
        log_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        self.log_text = scrolledtext.ScrolledText(
            log_frame,
            font=("Consolas", 9),
            bg="#1e1e1e",
            fg="#d4d4d4",
            insertbackground="white",
            wrap=tk.WORD
        )
        self.log_text.pack(fill=tk.BOTH, expand=True)
        
        self.process = None
        self.append_log("准备就绪，点击 '启动测试进程' 开始测试", "INFO")
    
    def start_test(self):
        """启动测试进程"""
        if self.process:
            self.append_log("进程已在运行中", "WARNING")
            return
        
        try:
            self.append_log("启动测试进程...", "INFO")
            
            # 创建一个简单的 Python 脚本作为测试
            test_script = '''
import time
import sys
print("测试启动")
sys.stdout.flush()
for i in range(10):
    print(f"日志行 {i+1}: 这是一条测试消息")
    sys.stdout.flush()
    time.sleep(0.5)
print("测试完成")
sys.stdout.flush()
'''
            
            import os
            env = os.environ.copy()
            env['PYTHONIOENCODING'] = 'utf-8'
            
            self.process = subprocess.Popen(
                ["python", "-c", test_script],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding='utf-8',
                errors='replace',
                bufsize=1,
                universal_newlines=True,
                env=env
            )
            
            self.append_log(f"进程已启动，PID: {self.process.pid}", "SUCCESS")
            
            # 启动日志读取线程
            threading.Thread(target=self.read_logs, daemon=True).start()
            
        except Exception as e:
            self.append_log(f"启动失败: {str(e)}", "ERROR")
            import traceback
            self.append_log(f"错误详情:\n{traceback.format_exc()}", "ERROR")
    
    def stop_test(self):
        """停止测试进程"""
        if self.process:
            self.process.terminate()
            self.append_log("进程已停止", "WARNING")
            self.process = None
        else:
            self.append_log("没有运行的进程", "WARNING")
    
    def read_logs(self):
        """读取进程日志"""
        try:
            line_count = 0
            while True:
                line = self.process.stdout.readline()
                if not line:
                    self.root.after(0, lambda: self.append_log(f"流结束，共读取 {line_count} 行", "DEBUG"))
                    break
                
                line = line.strip()
                if line:
                    self.root.after(0, lambda l=line: self.append_log(l))
                    line_count += 1
        except Exception as e:
            self.root.after(0, lambda: self.append_log(f"读取失败: {str(e)}", "ERROR"))
    
    def append_log(self, message, tag=None):
        """添加日志"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_line = f"[{timestamp}] {message}\n"
        
        if not tag:
            if "ERROR" in message.upper():
                tag = "ERROR"
            elif "WARNING" in message.upper():
                tag = "WARNING"
            elif "INFO" in message.upper() or "SUCCESS" in message.upper():
                tag = "INFO"
            elif "DEBUG" in message.upper():
                tag = "DEBUG"
        
        if tag:
            self.log_text.insert(tk.END, log_line, tag)
        else:
            self.log_text.insert(tk.END, log_line)
        
        self.log_text.see(tk.END)
        
        # 配置标签颜色
        self.log_text.tag_config("INFO", foreground="#3498db")
        self.log_text.tag_config("WARNING", foreground="#f39c12")
        self.log_text.tag_config("ERROR", foreground="#e74c3c")
        self.log_text.tag_config("DEBUG", foreground="#95a5a6")
        self.log_text.tag_config("SUCCESS", foreground="#27ae60")

if __name__ == "__main__":
    root = tk.Tk()
    app = QuickLogTest(root)
    root.mainloop()
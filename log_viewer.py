"""
日志查看器 - 实时查看后端和前端日志
"""

import tkinter as tk
from tkinter import ttk, scrolledtext
import subprocess
import threading
import queue
import os
from datetime import datetime

class LogViewer:
    def __init__(self, root):
        self.root = root
        self.root.title("IFlow Agent 日志查看器")
        self.root.geometry("1200x800")
        
        # 日志队列
        self.log_queues = {
            "backend": queue.Queue(),
            "frontend": queue.Queue()
        }
        
        # 进程列表
        self.processes = {}
        
        # 创建 UI
        self.create_ui()
        
        # 开始监控
        self.start_monitoring()
    
    def create_ui(self):
        # 标题栏
        title_frame = tk.Frame(self.root, bg="#2c3e50", height=50)
        title_frame.pack(fill=tk.X)
        
        title_label = tk.Label(
            title_frame, 
            text="🔍 IFlow Agent 日志查看器", 
            font=("Microsoft YaHei", 16, "bold"),
            bg="#2c3e50",
            fg="white"
        )
        title_label.pack(pady=10)
        
        # 控制按钮
        control_frame = tk.Frame(self.root, bg="#ecf0f1", height=60)
        control_frame.pack(fill=tk.X)
        
        tk.Button(
            control_frame,
            text="🚀 启动所有服务",
            command=self.start_all,
            bg="#27ae60",
            fg="white",
            font=("Microsoft YaHei", 10, "bold"),
            padx=20,
            pady=8
        ).pack(side=tk.LEFT, padx=10, pady=10)
        
        tk.Button(
            control_frame,
            text="⏹️ 停止所有服务",
            command=self.stop_all,
            bg="#e74c3c",
            fg="white",
            font=("Microsoft YaHei", 10, "bold"),
            padx=20,
            pady=8
        ).pack(side=tk.LEFT, padx=10, pady=10)
        
        tk.Button(
            control_frame,
            text="🧹 清空日志",
            command=self.clear_logs,
            bg="#3498db",
            fg="white",
            font=("Microsoft YaHei", 10, "bold"),
            padx=20,
            pady=8
        ).pack(side=tk.LEFT, padx=10, pady=10)
        
        # 状态标签
        self.status_label = tk.Label(
            control_frame,
            text="状态: 未启动",
            font=("Microsoft YaHei", 10),
            bg="#ecf0f1",
            fg="#7f8c8d"
        )
        self.status_label.pack(side=tk.RIGHT, padx=20, pady=10)
        
        # 创建标签页
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # 后端日志标签页
        self.backend_frame = tk.Frame(self.notebook)
        self.notebook.add(self.backend_frame, text="🔧 后端日志")
        self.create_log_area(self.backend_frame, "backend")
        
        # 前端日志标签页
        self.frontend_frame = tk.Frame(self.notebook)
        self.notebook.add(self.frontend_frame, text="🌐 前端日志")
        self.create_log_area(self.frontend_frame, "frontend")
        
        # 系统日志标签页
        self.system_frame = tk.Frame(self.notebook)
        self.notebook.add(self.system_frame, text="💻 系统日志")
        self.create_log_area(self.system_frame, "system")
    
    def create_log_area(self, parent, service_name):
        # 工具栏
        toolbar = tk.Frame(parent, bg="#ecf0f1", height=40)
        toolbar.pack(fill=tk.X)
        
        # 搜索框
        search_frame = tk.Frame(toolbar, bg="#ecf0f1")
        search_frame.pack(side=tk.LEFT, padx=10, pady=5)
        
        tk.Label(
            search_frame,
            text="🔍 搜索:",
            bg="#ecf0f1",
            font=("Microsoft YaHei", 9)
        ).pack(side=tk.LEFT)
        
        search_entry = tk.Entry(search_frame, width=30, font=("Consolas", 9))
        search_entry.pack(side=tk.LEFT, padx=5)
        
        tk.Button(
            search_frame,
            text="搜索",
            command=lambda: self.search_logs(service_name, search_entry.get()),
            bg="#95a5a6",
            font=("Microsoft YaHei", 8)
        ).pack(side=tk.LEFT)
        
        # 日志显示区域
        log_frame = tk.Frame(parent)
        log_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        log_text = scrolledtext.ScrolledText(
            log_frame,
            font=("Consolas", 9),
            bg="#1e1e1e",
            fg="#d4d4d4",
            insertbackground="white",
            wrap=tk.WORD
        )
        log_text.pack(fill=tk.BOTH, expand=True)
        
        # 配置标签颜色
        log_text.tag_config("INFO", foreground="#3498db")
        log_text.tag_config("WARNING", foreground="#f39c12")
        log_text.tag_config("ERROR", foreground="#e74c3c")
        log_text.tag_config("DEBUG", foreground="#95a5a6")
        log_text.tag_config("SUCCESS", foreground="#27ae60")
        
        setattr(self, f"{service_name}_log", log_text)
    
    def start_all(self):
        """启动所有服务"""
        self.update_status("正在启动服务...")
        
        # 启动后端
        self.start_backend()
        
        # 等待后端启动
        self.root.after(3000, self.start_frontend)
        
        # 5秒后检查进程状态
        self.root.after(5000, self.check_processes)
    
    def start_backend(self):
        """启动后端服务"""
        try:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            
            self.append_log("backend", f"📂 工作目录: {base_dir}", "DEBUG")
            self.append_log("backend", f"🔧 启动命令: python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload", "DEBUG")
            
            # 在 Windows 上设置环境变量以支持 UTF-8
            env = os.environ.copy()
            env['PYTHONIOENCODING'] = 'utf-8'
            
            self.append_log("backend", f"🌍 环境变量: PYTHONIOENCODING={env.get('PYTHONIOENCODING')}", "DEBUG")
            
            process = subprocess.Popen(
                ["python", "-m", "uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
                cwd=base_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding='utf-8',
                errors='replace',
                bufsize=1,
                universal_newlines=True,
                env=env
            )
            
            self.processes["backend"] = process
            self.append_log("backend", f"🎯 进程已创建，PID: {process.pid}", "DEBUG")
            self.append_log("backend", f"📊 stdout 类型: {type(process.stdout)}", "DEBUG")
            
            # 启动日志读取线程
            self.append_log("backend", f"🧵 启动日志读取线程...", "DEBUG")
            threading.Thread(target=self.read_logs, args=("backend", process), daemon=True).start()
            
            self.append_log("backend", "✅ 后端服务已启动", "SUCCESS")
            self.update_status("后端已启动")
            
        except Exception as e:
            self.append_log("backend", f"❌ 启动后端失败: {str(e)}", "ERROR")
            import traceback
            self.append_log("backend", f"📋 错误详情:\n{traceback.format_exc()}", "ERROR")
            self.update_status(f"启动失败: {str(e)}")
    
    def start_frontend(self):
        """启动前端服务"""
        try:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            frontend_dir = os.path.join(base_dir, "frontend")
            
            self.append_log("frontend", f"📂 工作目录: {frontend_dir}", "DEBUG")
            self.append_log("frontend", f"🔧 启动命令: npm run dev", "DEBUG")
            
            process = subprocess.Popen(
                ["npm", "run", "dev"],
                cwd=frontend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding='utf-8',
                errors='replace',
                bufsize=1,
                universal_newlines=True
            )
            
            self.processes["frontend"] = process
            self.append_log("frontend", f"🎯 进程已创建，PID: {process.pid}", "DEBUG")
            
            # 启动日志读取线程
            self.append_log("frontend", f"🧵 启动日志读取线程...", "DEBUG")
            threading.Thread(target=self.read_logs, args=("frontend", process), daemon=True).start()
            
            self.append_log("frontend", "✅ 前端服务已启动", "SUCCESS")
            self.append_log("system", f"✅ 所有服务已启动\n  后端: http://localhost:8000\n  前端: http://localhost:5173", "SUCCESS")
            self.update_status("所有服务已运行")
            
        except Exception as e:
            self.append_log("frontend", f"❌ 启动前端失败: {str(e)}", "ERROR")
            import traceback
            self.append_log("frontend", f"📋 错误详情:\n{traceback.format_exc()}", "ERROR")
            self.append_log("system", f"⚠️ 前端启动失败: {str(e)}", "WARNING")
            self.update_status(f"前端启动失败: {str(e)}")
    
    def stop_all(self):
        """停止所有服务"""
        for name, process in self.processes.items():
            try:
                process.terminate()
                self.append_log(name, "⏹️ 服务已停止", "WARNING")
            except:
                pass
        
        self.processes.clear()
        self.update_status("所有服务已停止")
    
    def read_logs(self, service_name, process):
        """读取进程日志"""
        try:
            self.append_log(service_name, f"📡 开始读取 {service_name} 日志...", "INFO")
            self.append_log(service_name, f"🔧 进程 PID: {process.pid}", "DEBUG")
            
            line_count = 0
            # 逐行读取输出
            while True:
                try:
                    line = process.stdout.readline()
                    if not line:
                        self.root.after(0, lambda: self.append_log(service_name, f"📡 流结束，共读取 {line_count} 行", "DEBUG"))
                        break
                    
                    # 解码并显示
                    try:
                        if isinstance(line, bytes):
                            # 尝试多种编码解码
                            line = line.decode('utf-8', errors='ignore')
                        line = line.strip()
                        if line:
                            # 使用 after 方法在主线程中更新 UI
                            self.root.after(0, lambda l=line: self.append_log(service_name, l))
                            line_count += 1
                    except Exception as e:
                        self.root.after(0, lambda: self.append_log(service_name, f"⚠️ 解码失败: {str(e)}", "WARNING"))
                        
                except Exception as e:
                    self.root.after(0, lambda: self.append_log(service_name, f"❌ 读取行失败: {str(e)}", "ERROR"))
                    break
                    
        except Exception as e:
            self.root.after(0, lambda: self.append_log(service_name, f"❌ 读取日志失败: {str(e)}", "ERROR"))
            import traceback
            self.root.after(0, lambda: self.append_log(service_name, f"📋 错误详情:\n{traceback.format_exc()}", "ERROR"))
            pass
    
    def append_log(self, service_name, message, tag=None):
        """添加日志"""
        log_widget = getattr(self, f"{service_name}_log", None)
        if not log_widget:
            return
        
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_line = f"[{timestamp}] {message}\n"
        
        # 自动识别日志级别
        if not tag:
            if "ERROR" in message.upper() or "❌" in message:
                tag = "ERROR"
            elif "WARNING" in message.upper() or "⚠️" in message:
                tag = "WARNING"
            elif "INFO" in message.upper() or "✅" in message:
                tag = "INFO"
            elif "DEBUG" in message.upper():
                tag = "DEBUG"
        
        if tag:
            log_widget.insert(tk.END, log_line, tag)
        else:
            log_widget.insert(tk.END, log_line)
        
        log_widget.see(tk.END)
        
        # 限制日志行数
        lines = int(log_widget.index('end-1c').split('.')[0])
        if lines > 1000:
            log_widget.delete('1.0', '100.0')
    
    def search_logs(self, service_name, keyword):
        """搜索日志"""
        log_widget = getattr(self, f"{service_name}_log", None)
        if not log_widget or not keyword:
            return
        
        # 清除当前选择
        log_widget.tag_remove('search', '1.0', tk.END)
        
        # 搜索并高亮
        content = log_widget.get('1.0', tk.END)
        start_pos = 0  # 使用整数位置
        
        while True:
            pos = content.find(keyword, start_pos)
            if pos == -1:
                break
            
            line_num = content[:pos].count('\n') + 1
            line_start = f"{line_num}.0"
            line_end = f"{line_num}.end"
            
            log_widget.tag_add('search', line_start, line_end)
            start_pos = pos + len(keyword)
        
        # 配置搜索高亮样式
        log_widget.tag_config('search', background='yellow', foreground='black')
        
        # 滚动到第一个匹配项
        if log_widget.tag_ranges('search'):
            log_widget.see(log_widget.tag_nextrange('search', '1.0'))
    
    def clear_logs(self):
        """清空所有日志"""
        for service_name in ["backend", "frontend", "system"]:
            log_widget = getattr(self, f"{service_name}_log", None)
            if log_widget:
                log_widget.delete('1.0', tk.END)
        
        self.append_log("system", "🧹 日志已清空", "INFO")
    
    def update_status(self, status):
        """更新状态"""
        self.status_label.config(text=f"状态: {status}")
    
    def check_processes(self):
        """检查进程状态"""
        self.append_log("system", "🔍 检查进程状态...", "INFO")
        
        for name, process in self.processes.items():
            if process.poll() is None:
                self.append_log("system", f"✅ {name} 进程运行中 (PID: {process.pid})", "SUCCESS")
            else:
                self.append_log("system", f"❌ {name} 进程已停止 (退出码: {process.poll()})", "ERROR")
                
                # 尝试读取剩余输出
                try:
                    remaining_output = process.stdout.read()
                    if remaining_output:
                        self.append_log(name, f"📋 剩余输出:\n{remaining_output}", "WARNING")
                except:
                    pass
    
    def start_monitoring(self):
        """启动监控"""
        self.append_log("system", "🚀 日志查看器已启动", "SUCCESS")
        self.append_log("system", "💡 点击 '启动所有服务' 按钮开始", "INFO")


if __name__ == "__main__":
    root = tk.Tk()
    
    # 设置主题
    style = ttk.Style()
    style.theme_use('clam')
    
    app = LogViewer(root)
    root.mainloop()
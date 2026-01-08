"""
简单测试 - 检查 Python 进程输出
"""

import subprocess
import sys
import os
import io

# 设置控制台输出为 UTF-8
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

print("开始测试...")

base_dir = os.path.dirname(os.path.abspath(__file__))
env = os.environ.copy()
env['PYTHONIOENCODING'] = 'utf-8'

# 启动一个简单的 Python 脚本
test_script = '''
import time
import sys
print("Line 1: Starting...")
sys.stdout.flush()
time.sleep(0.5)
print("Line 2: Processing...")
sys.stdout.flush()
time.sleep(0.5)
print("Line 3: Done!")
sys.stdout.flush()
'''

print(f"工作目录: {base_dir}")
print(f"启动测试进程...")

process = subprocess.Popen(
    [sys.executable, '-c', test_script],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    encoding='utf-8',
    errors='replace',
    bufsize=1,
    universal_newlines=True,
    env=env
)

print(f"进程 PID: {process.pid}")
print("开始读取输出...")

line_count = 0
import time
start_time = time.time()

while True:
    # 检查是否超时（最多等待 10 秒）
    if time.time() - start_time > 10:
        print(f"超时，停止读取")
        break
    
    # 检查进程是否结束
    if process.poll() is not None:
        print(f"进程已结束，退出码: {process.poll()}")
        # 读取剩余输出
        remaining = process.stdout.read()
        if remaining:
            print(f"剩余输出: {remaining}")
        break
    
    # 读取一行
    line = process.stdout.readline()
    if line:
        print(f"[{line_count}] {line.strip()}")
        line_count += 1
    else:
        time.sleep(0.01)

print(f"总共读取 {line_count} 行")
print("测试完成")
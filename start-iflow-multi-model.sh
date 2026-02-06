#!/bin/bash

# 启动多模型 iFlow CLI 进程
# 每个模型监听不同的端口

# 清理旧进程
echo "Cleaning up old iFlow processes..."
lsof -ti:8091 | xargs kill -9 2>/dev/null
lsof -ti:8092 | xargs kill -9 2>/dev/null
sleep 2

# 启动不同模型的 iFlow 进程
echo "Starting iFlow for model: iFlow-ROME-30BA3B (port 8091)"
nohup iflow --experimental-acp --port 8091 --model iFlow-ROME-30BA3B > /tmp/iflow-8091.log 2>&1 &
sleep 2

echo "Starting iFlow for model: glm-4.7 (port 8092)"
nohup iflow --experimental-acp --port 8092 --model glm-4.7 > /tmp/iflow-8092.log 2>&1 &
sleep 2

# 检查进程状态
echo "Checking iFlow processes..."
ps aux | grep "iflow.*--port 809" | grep -v grep

echo "Multi-model iFlow processes started successfully!"
echo "Port 8090: glm-4 (default)"
echo "Port 8091: iFlow-ROME-30BA3B"
echo "Port 8092: glm-4.7"
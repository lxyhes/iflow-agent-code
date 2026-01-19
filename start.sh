#!/bin/bash
# 启动前后端项目

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BASE_DIR"

# 清理现有进程
echo "[INFO] 清理现有进程..."
lsof -ti:8090 | xargs kill -9 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
sleep 1

# 启动 Node.js 后端 (Auth/Settings/Shell)
echo "[1/3] 启动 Node.js 后端 (端口 3001)..."
cd "$BASE_DIR/frontend"
nohup npm run server > /tmp/node_server.log 2>&1 &
NODE_PID=$!
cd "$BASE_DIR"
echo "   PID: $NODE_PID"

# 启动 Python 后端
echo "[2/3] 启动 Python 后端 (端口 8000, 热重载)..."
export PYTHONPATH="$BASE_DIR"
# 使用新的重构后的入口
nohup python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "   PID: $BACKEND_PID"

# 安装前端依赖并启动
echo "[3/3] 启动前端 (端口 5173)..."
cd "$BASE_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "   安装依赖中..."
    npm install > /dev/null 2>&1
fi
nohup npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
cd "$BASE_DIR"
echo "   PID: $FRONTEND_PID"

sleep 3

echo ""
echo "========================================"
echo "  服务已启动!"
echo "========================================"
echo "  Node后端: http://localhost:3001"
echo "  Py后端:   http://localhost:8000"
echo "  前端:     http://localhost:5173"
echo ""
echo "  查看日志:"
echo "  tail -f /tmp/node_server.log"
echo "  tail -f /tmp/backend.log"
echo "  tail -f /tmp/frontend.log"
echo ""
echo "  停止服务:"
echo "  kill $NODE_PID $BACKEND_PID $FRONTEND_PID"
echo "========================================"

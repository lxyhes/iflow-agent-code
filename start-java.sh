#!/bin/bash
# 启动前后端项目 (macOS/Linux) - Java 后端版本

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ "${BASE_DIR: -1}" == "/" ]; then
    BASE_DIR="${BASE_DIR:0:-1}"
fi

echo "==================================================="
echo "  IFlow Agent Launcher (Java Backend)"
echo "==================================================="
echo ""
echo "[INFO] Base: $BASE_DIR"

# 检查 Java
if ! command -v java &> /dev/null; then
    echo "[ERROR] Java not found!"
    exit 1
fi
echo "[OK] Java found: $(java -version 2>&1 | head -n 1)"

# 检查 Maven
if ! command -v mvn &> /dev/null; then
    echo "[ERROR] Maven not found!"
    exit 1
fi
echo "[OK] Maven found"

# 清理现有进程
echo ""
echo "[INFO] Cleaning up existing processes..."
lsof -ti:8090 | xargs kill -9 2>/dev/null
lsof -ti:8080 | xargs kill -9 2>/dev/null
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
echo "Waiting 2 seconds..."
sleep 2

# 启动 iFlow CLI
echo ""
echo "[1/4] Starting iFlow CLI..."
echo "[INFO] iFlow will run on port 8090"
nohup iflow --experimental-acp --port 8090 > /tmp/iflow.log 2>&1 &
IFLOW_PID=$!
echo "   PID: $IFLOW_PID"

echo "Waiting 5 seconds for iFlow to start..."
sleep 5

# 构建并启动 Java 后端
echo ""
echo "[2/4] Building & Starting Java Backend..."
cd "$BASE_DIR/backend-java"

# 检查是否需要构建
if [ ! -d "target/classes" ] || [ -n "$(find src -newer target/classes -type f 2>/dev/null | head -1)" ]; then
    echo "[INFO] Building Java project..."
    mvn clean compile -q
    if [ $? -ne 0 ]; then
        echo "[ERROR] Java build failed!"
        exit 1
    fi
    echo "[OK] Build successful"
fi

# 启动 Java 后端（支持热加载）
nohup mvn spring-boot:run -Dspring-boot.run.fork=false > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
cd "$BASE_DIR"
echo "   PID: $BACKEND_PID"
echo "   Port: 8080"

echo "Waiting 10 seconds for Java backend to start..."
sleep 10

# 启动 Node.js Server
echo ""
echo "[3/4] Starting Node.js Server..."
cd "$BASE_DIR/frontend"
nohup npm run server > /tmp/node_server.log 2>&1 &
NODE_PID=$!
cd "$BASE_DIR"
echo "   PID: $NODE_PID"

echo "Waiting 5 seconds for Node.js server to start..."
sleep 5

# 启动前端
echo ""
echo "[4/4] Starting Frontend..."
if [ ! -f "$BASE_DIR/frontend/package.json" ]; then
    echo "[ERROR] frontend/package.json not found!"
    exit 1
fi

cd "$BASE_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install > /dev/null 2>&1
fi
nohup npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
cd "$BASE_DIR"
echo "   PID: $FRONTEND_PID"

echo ""
echo "==================================================="
echo "  All Services Started!"
echo "==================================================="
echo "  iFlow CLI:        ws://localhost:8090/acp"
echo "  Backend (Java):   http://localhost:8080"
echo "  Backend (Node):   http://localhost:3001"
echo "  Frontend:         http://localhost:5173"
echo "==================================================="
echo ""
echo "[INFO] Logs location:"
echo "  iFlow CLI:        tail -f /tmp/iflow.log"
echo "  Backend (Java):   tail -f /tmp/backend.log"
echo "  Node.js Server:   tail -f /tmp/node_server.log"
echo "  Frontend:         tail -f /tmp/frontend.log"
echo ""
echo "[INFO] Press Ctrl+C to stop all services..."
echo ""

# 显示后端日志（在后台运行，用户可以按 Ctrl+C 停止）
(sleep 2 && echo "" && echo "[INFO] Showing Java backend logs (last 50 lines)..." && echo "---" && tail -n 50 -f /tmp/backend.log) &
LOG_VIEWER_PID=$!

# 保存 PID 到文件
PID_FILE="$BASE_DIR/.launcher_pids.txt"
echo "$IFLOW_PID" > "$PID_FILE"
echo "$BACKEND_PID" >> "$PID_FILE"
echo "$NODE_PID" >> "$PID_FILE"
echo "$FRONTEND_PID" >> "$PID_FILE"

# 监控 Ctrl+C
trap "echo ''; echo '[INFO] Stopping all services...'; kill $LOG_VIEWER_PID $IFLOW_PID $BACKEND_PID $NODE_PID $FRONTEND_PID 2>/dev/null; rm -f $PID_FILE; echo '[INFO] All services stopped!'; exit 0" INT TERM

# 保持脚本运行
while true; do
    sleep 1
done

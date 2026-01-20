#!/bin/bash
# 停止所有服务

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BASE_DIR"

echo "===================================================="
echo "  Stop IFlow Agent Services"
echo "===================================================="
echo ""

# Kill PID file if exists
PID_FILE="$BASE_DIR/.launcher_pids.txt"
if [ -f "$PID_FILE" ]; then
    echo "[INFO] Found PID file, cleaning up..."
    while read -r pid; do
        echo "[INFO] Killing process $pid..."
        kill -9 "$pid" 2>/dev/null
    done < "$PID_FILE"
    rm -f "$PID_FILE"
fi

# Kill iFlow CLI on port 8090
echo ""
echo "[INFO] Stopping iFlow CLI (port 8090)..."
lsof -ti:8090 | xargs kill -9 2>/dev/null

# Kill Backend on port 8000
echo ""
echo "[INFO] Stopping Backend (port 8000)..."
lsof -ti:8000 | xargs kill -9 2>/dev/null

# Kill Node.js Server on port 3001
echo ""
echo "[INFO] Stopping Node.js Server (port 3001)..."
lsof -ti:3001 | xargs kill -9 2>/dev/null

# Kill Frontend on port 5173
echo ""
echo "[INFO] Stopping Frontend (port 5173)..."
lsof -ti:5173 | xargs kill -9 2>/dev/null

echo ""
echo "===================================================="
echo "  All Services Stopped!"
echo "===================================================="
echo ""
sleep 2
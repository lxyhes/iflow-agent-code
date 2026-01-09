@echo off
chcp 65001 >nul
echo ========================================
echo 正在清理后端服务器进程...
echo ========================================

REM 查找并终止所有占用 8000 端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo 正在终止进程 %%a...
    taskkill /F /PID %%a 2>nul
)

echo.
echo 等待 2 秒...
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo 正在启动后端服务器...
echo ========================================
cd /d "%~dp0"
python backend\server.py

pause
@echo off
chcp 65001 >nul
echo ========================================
echo IFlow Agent - 清理并启动所有服务
echo ========================================
echo.

echo [1/4] 检查并清理 8000 端口...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo    发现占用进程 %%a，正在终止...
    taskkill /F /PID %%a 2>nul
)
echo    ✓ 8000 端口已清理
echo.

echo [2/4] 检查并清理 5173 端口（前端）...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    echo    发现占用进程 %%a，正在终止...
    taskkill /F /PID %%a 2>nul
)
echo    ✓ 5173 端口已清理
echo.

echo [3/4] 等待端口释放...
timeout /t 3 /nobreak >nul
echo.

echo [4/4] 启动后端和前端服务...
echo.
echo 后端将在此窗口启动，前端将在新窗口启动...
echo.

REM 启动后端（当前窗口）
echo [启动后端] http://localhost:8000
start "IFlow Backend" cmd /k "cd /d %~dp0 && python backend\server.py"

REM 等待后端启动
timeout /t 5 /nobreak >nul

REM 启动前端（新窗口）
echo [启动前端] http://localhost:5173
start "IFlow Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo ========================================
echo 所有服务已启动！
echo 后端: http://localhost:8000
echo 前端: http://localhost:5173
echo ========================================
echo.
echo 按任意键关闭此窗口（服务将继续运行）...
pause >nul
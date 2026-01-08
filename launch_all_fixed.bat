@echo off
chcp 65001 >nul 2>&1
title IFlow Agent Launcher

echo ====================================================
echo    IFlow Agent Launcher
echo ====================================================
echo.

:: Get script directory
set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"
echo [INFO] Base: %BASE_DIR%

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found!
    goto :error
)
echo [OK] Python found

:: Start Log Viewer
echo.
echo [0/3] Starting Log Viewer...
start "Log Viewer" cmd /k "cd /d %BASE_DIR% && python log_viewer.py"

:: Start Backend
echo.
echo [1/3] Starting Backend (with hot reload)...
start "Backend" cmd /k "cd /d %BASE_DIR% && set PYTHONPATH=%BASE_DIR% && python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload"

echo Waiting 5 seconds...
ping 127.0.0.1 -n 6 >nul

:: Start Frontend
echo.
echo [2/3] Starting Frontend...
if not exist "%BASE_DIR%\frontend\package.json" (
    echo [ERROR] frontend/package.json not found!
    goto :error
)

start "Frontend" cmd /k "cd /d %BASE_DIR%\frontend && npm run dev"

echo.
echo ====================================================
echo    [3/3] All Services Started!
echo    Backend: http://localhost:8000
echo    Frontend: http://localhost:5173
echo    Log Viewer: Check the Log Viewer window
echo ====================================================
echo.
echo [INFO] You can view all logs in the Log Viewer window
echo [INFO] Use the Log Viewer to start/stop services and search logs
echo.
goto :end

:error
echo.
echo [ERROR] Something went wrong!

:end
echo.
pause

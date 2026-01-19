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

:: Kill any existing iFlow process on port 8090
echo.
echo [INFO] Checking for existing iFlow process on port 8090...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8090" ^| findstr "LISTENING"') do (
    echo [INFO] Killing process %%a on port 8090...
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill any existing backend process on port 8000
echo.
echo [INFO] Checking for existing backend process on port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo [INFO] Killing process %%a on port 8000...
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill any existing Node.js server process on port 3001
echo.
echo [INFO] Checking for existing Node.js server process on port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
    echo [INFO] Killing process %%a on port 3001...
    taskkill /F /PID %%a >nul 2>&1
)

echo Waiting 2 seconds...
ping 127.0.0.1 -n 3 >nul

:: Start iFlow CLI
echo.
echo [1/4] Starting iFlow CLI...
echo [INFO] iFlow will run on port 8090
start "IFlow CLI" cmd /k "iflow --experimental-acp --port 8090"

echo Waiting 5 seconds for iFlow to start...
ping 127.0.0.1 -n 6 >nul

:: Start Backend
echo.
echo [2/4] Starting Backend (with hot reload)...
start "Backend" cmd /k "cd /d %BASE_DIR% && set PYTHONPATH=%BASE_DIR% && python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload"

echo Waiting 5 seconds...
ping 127.0.0.1 -n 6 >nul

:: Start Node.js Server
echo.
echo [3/4] Starting Node.js Server...
start "Node.js Server" cmd /k "cd /d %BASE_DIR%\frontend && npm run server"

echo Waiting 5 seconds for Node.js server to start...
ping 127.0.0.1 -n 6 >nul

:: Start Frontend
echo.
echo [4/4] Starting Frontend...
if not exist "%BASE_DIR%\frontend\package.json" (
    echo [ERROR] frontend/package.json not found!
    goto :error
)

start "Frontend" cmd /k "cd /d %BASE_DIR%\frontend && npm run dev"

echo.
echo ====================================================
echo    All Services Started!
echo    iFlow CLI: ws://localhost:8090/acp
echo    Backend (Python): http://localhost:8000
echo    Backend (Node.js): http://localhost:3001
echo    Frontend: http://localhost:5173
echo ====================================================
echo.
goto :end

:error
echo.
echo [ERROR] Something went wrong!

:end
echo.
pause

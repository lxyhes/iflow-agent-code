@echo off
setlocal
title IFlow Agent Launcher

echo ====================================================
echo    IFlow Agent Master Launcher (ASCII Mode)
echo ====================================================

:: --- 1. Initialize Paths ---
:: Get the directory where this script is located
set "BASE_DIR=%~dp0"
:: Remove trailing backslash if present
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"

echo [INFO] Project Root: %BASE_DIR%

:: --- 2. Check Python ---
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in your PATH.
    echo Please install Python or add it to your PATH environment variable.
    pause
    exit /b
)

:: --- 3. Start Backend ---
echo.
echo [STEP 1/2] Starting Python Backend...
:: We use 'start' to open a new window for the backend
:: We set PYTHONPATH to ensure imports work correctly
start "Agent-Backend" cmd /k "cd /d "%BASE_DIR%" && set PYTHONPATH=%BASE_DIR% && python backend/server.py"

echo [WAIT] Waiting 5 seconds for backend to initialize...
timeout /t 5 /nobreak >nul

:: --- 4. Start Frontend ---
echo.
echo [STEP 2/2] Starting Frontend UI...

cd /d "%BASE_DIR%\frontend"

:: Check if we are in the right folder
if not exist "package.json" (
    echo [ERROR] Could not find package.json in: %CD%
    echo Please ensure the directory structure is correct.
    pause
    exit /b
)

:: Check for node_modules
if not exist "node_modules" (
    echo [INFO] node_modules folder missing. Running 'npm install'...
    echo This might take a few minutes...
    call npm install
)

echo [INFO] Launching Vite Server in a new window...
start "Agent-Frontend" cmd /k "npm run dev"

:: --- 5. Finish ---
echo.
echo ====================================================
echo    SUCCESS! Services have been launched.
echo ====================================================
echo.
echo    Backend API: http://localhost:8000
echo    Frontend UI: http://localhost:5173
echo.
echo    You can now minimize this window (do not close the other two).
echo ====================================================
pause

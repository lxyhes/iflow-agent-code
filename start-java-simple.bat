@echo off
title IFlow Agent Launcher

echo ====================================================
echo    IFlow Agent Launcher (Java Backend)
echo ====================================================
echo.

set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"
echo [INFO] Base: %BASE_DIR%
echo.

:: Start iFlow CLI
echo [1/3] Starting iFlow CLI...
start "IFlow CLI" cmd /k "iflow --experimental-acp --port 8090"

echo Waiting 5 seconds...
ping 127.0.0.1 -n 6 >nul

:: Start Java Backend
echo [2/3] Starting Java Backend...
cd /d "%BASE_DIR%\backend-java"
start "Java Backend" cmd /k "mvn spring-boot:run"

cd /d "%BASE_DIR%"
echo Waiting 5 seconds...
ping 127.0.0.1 -n 6 >nul

:: Start Frontend
echo [3/3] Starting Frontend...
start "Frontend" cmd /k "cd /d %BASE_DIR%\frontend && npm run dev"

echo.
echo ====================================================
echo    All Services Started!
echo ====================================================
echo    iFlow CLI:        ws://localhost:8090/acp
echo    Backend (Java):   http://localhost:8080
echo    Frontend:         http://localhost:5173
echo ====================================================
echo.
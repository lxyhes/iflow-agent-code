@echo off
title IFlow Agent Launcher (Simple)

echo ====================================================
echo    IFlow Agent Launcher (Simple)
echo ====================================================
echo.

set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"
echo [INFO] Base: %BASE_DIR%
echo.

:: Start iFlow CLI
echo [1/2] Starting iFlow CLI...
start "IFlow CLI" cmd /k "iflow --experimental-acp --port 8090"

echo Waiting 5 seconds...
ping 127.0.0.1 -n 6 >nul

:: Start Frontend
echo [2/2] Starting Frontend...
start "Frontend" cmd /k "cd /d %BASE_DIR%\frontend && npm run dev"

echo.
echo ====================================================
echo    Services Started!
echo ====================================================
echo    iFlow CLI:        ws://localhost:8090/acp
echo    Frontend:         http://localhost:5173
echo ====================================================
echo.
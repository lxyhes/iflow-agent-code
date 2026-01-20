@echo off
chcp 65001 >nul 2>&1
title Stop IFlow Agent Services

echo ====================================================
echo    Stop IFlow Agent Services
echo ====================================================
echo.

:: Get script directory
set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"

:: Kill PID file if exists
set "PID_FILE=%BASE_DIR%\.launcher_pids.txt"
if exist "%PID_FILE%" (
    echo [INFO] Found PID file, cleaning up...
    for /f "tokens=1" %%p in (%PID_FILE%) do (
        echo [INFO] Killing process %%p...
        taskkill /F /PID %%p >nul 2>&1
    )
    del "%PID_FILE%" >nul 2>&1
)

:: Kill iFlow CLI on port 8090
echo.
echo [INFO] Stopping iFlow CLI (port 8090)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8090" ^| findstr "LISTENING"') do (
    echo [INFO] Killing process %%a...
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill Backend on port 8000
echo.
echo [INFO] Stopping Backend (port 8000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo [INFO] Killing process %%a...
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill Node.js Server on port 3001
echo.
echo [INFO] Stopping Node.js Server (port 3001)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
    echo [INFO] Killing process %%a...
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill Frontend on port 5173
echo.
echo [INFO] Stopping Frontend (port 5173)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo [INFO] Killing process %%a...
    taskkill /F /PID %%a >nul 2>&1
)

:: Close all related windows
echo.
echo [INFO] Closing related windows...
taskkill /F /FI "WINDOWTITLE eq IFlow CLI*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Backend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Node.js Server*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Frontend*" >nul 2>&1

echo.
echo ====================================================
echo    All Services Stopped!
echo ====================================================
echo.
timeout /t 2 >nul
@echo off
chcp 65001 >nul 2>&1
title Stop All Services

echo ====================================================
echo    Stopping All Services
echo ====================================================
echo.

:: Kill iFlow CLI process on port 8090
echo [1/4] Stopping iFlow CLI...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8090" ^| findstr "LISTENING"') do (
    echo [INFO] Killing process %%a on port 8090...
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill backend process on port 8000
echo [2/4] Stopping Backend...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo [INFO] Killing process %%a on port 8000...
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill frontend process on port 5173
echo [3/4] Stopping Frontend...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo [INFO] Killing process %%a on port 5173...
    taskkill /F /PID %%a >nul 2>&1
)

:: Force close all related cmd windows
echo [4/4] Closing service windows...
taskkill /FI "WINDOWTITLE eq Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq IFlow*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq 选择 Backend*" /F >nul 2>&1

echo.
echo ====================================================
echo    All Services Stopped!
echo ====================================================
echo.
pause
@echo off
title IFlow Agent Launcher (with Hot Reload)

echo ====================================================
echo    IFlow Agent Launcher (with Hot Reload)
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

echo Waiting 10 seconds...
ping 127.0.0.1 -n 11 >nul

:: Start Hot Reload Monitor
echo [3/3] Starting Hot Reload Monitor...
start "Hot Reload Monitor" cmd /k "hot-reload-monitor.bat"

:: Start Frontend
echo [4/4] Starting Frontend...
start "Frontend" cmd /k "cd /d %BASE_DIR%\frontend && npm run dev"

echo.
echo ====================================================
echo    All Services Started!
echo ====================================================
echo    iFlow CLI:          ws://localhost:8090/acp
echo    Backend (Java):     http://localhost:8080
echo    Frontend:           http://localhost:5173
echo    Hot Reload Monitor: Running
echo ====================================================
echo.
echo [INFO] 热重载说明：
echo   - 修改 Java 文件后，监控器会自动编译
echo   - Spring Boot 会自动重启应用（约5-10秒）
echo   - 查看编译日志：在 "Hot Reload Monitor" 窗口
echo   - 查看重启日志：在 "Java Backend" 窗口
echo.
@echo off
title IFlow Agent Launcher (Java Backend with Hot Reload)

echo ====================================================
echo    IFlow Agent Launcher (Java Backend with Hot Reload)
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

:: Start Java Backend with Spring DevTools
echo [2/2] Starting Java Backend (with hot reload)...
cd /d "%BASE_DIR%\backend-java"
start "Java Backend" cmd /k "mvn spring-boot:run -Dspring-boot.run.fork=false"

echo.
echo ====================================================
echo    All Services Started!
echo ====================================================
echo    iFlow CLI:        ws://localhost:8090/acp
echo    Backend (Java):   http://localhost:8080
echo    Frontend:         http://localhost:5173
echo ====================================================
echo.
echo [INFO] Java Backend supports hot reload via Spring DevTools
echo [INFO] Modify Java files and save to trigger reload
echo [INFO] Note: Hot reload may take 2-3 seconds to take effect
echo.
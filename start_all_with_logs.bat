@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   iFlow Agent - Hot Reload Launcher
echo   Java Backend + React Frontend
echo ========================================
echo.

:: Set project root
set "PROJECT_ROOT=%~dp0"
set "JAVA_BACKEND=%PROJECT_ROOT%backend-java"
set "FRONTEND=%PROJECT_ROOT%frontend"

:: Set ports
set "BACKEND_PORT=8080"
set "FRONTEND_PORT=5173"

:: Check if ports are in use
echo [1/5] Checking port usage...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%BACKEND_PORT%" 2^>nul') do (
    echo   Port %BACKEND_PORT% is in use (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
    echo   Process terminated
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%FRONTEND_PORT%" 2^>nul') do (
    echo   Port %FRONTEND_PORT% is in use (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
    echo   Process terminated
)
echo.

:: Clean old log files
echo [2/5] Cleaning old logs...
if exist "%PROJECT_ROOT%backend_log.txt" del "%PROJECT_ROOT%backend_log.txt"
if exist "%PROJECT_ROOT%frontend_log.txt" del "%PROJECT_ROOT%frontend_log.txt"
echo.

:: Create log directory
if not exist "%PROJECT_ROOT%logs" mkdir "%PROJECT_ROOT%logs"

:: Start Java Backend (with hot reload)
echo [3/5] Starting Java Backend (port: %BACKEND_PORT%)...
echo   Using Spring Boot DevTools for hot reload
cd /d "%JAVA_BACKEND%"

:: Start backend with log output
start "Java Backend - Hot Reload" cmd /k "cd /d %JAVA_BACKEND% && echo [Java Backend] Starting... && echo [Java Backend] Port: %BACKEND_PORT% && echo [Java Backend] Hot Reload: Enabled && echo ======================================== && mvn spring-boot:run -Dspring-boot.run.arguments=--server.port=%BACKEND_PORT%"

echo   Backend process started, logs will show in new window
echo.

:: Wait for backend to start
echo [4/5] Waiting for backend to start...
timeout /t 10 /nobreak >nul
echo.

:: Start Frontend (with hot reload)
echo [5/5] Starting React Frontend (port: %FRONTEND_PORT%)...
echo   Using Vite for hot reload
cd /d "%FRONTEND%"

:: Start frontend with log output
start "React Frontend - Hot Reload" cmd /k "cd /d %FRONTEND% && echo [React Frontend] Starting... && echo [React Frontend] Port: %FRONTEND_PORT% && echo [React Frontend] Hot Reload: Enabled && echo ======================================== && npm run dev"

echo   Frontend process started, logs will show in new window
echo.

:: Display access information
echo ========================================
echo   Startup Complete!
echo ========================================
echo.
echo   Frontend: http://localhost:%FRONTEND_PORT%
echo   Backend:  http://localhost:%BACKEND_PORT%
echo   API Docs: http://localhost:%BACKEND_PORT%/swagger-ui.html
echo.
echo   Log Windows:
echo      - Java Backend: Check the new window
echo      - React Frontend: Check the new window
echo.
echo   Hot Reload Info:
echo      - Java Backend: Auto-recompile and restart on file change
echo      - React Frontend: Auto-refresh browser on file change
echo.
echo   Stop Services:
echo      - Close the respective command windows
echo      - Or run: stop_all.bat
echo.
echo ========================================
echo.

:: Save port info to file
echo %BACKEND_PORT% > "%PROJECT_ROOT%.backend_port"
echo %FRONTEND_PORT% > "%PROJECT_ROOT%.frontend_port"

:: Open browser (optional)
echo Opening browser in 5 seconds...
timeout /t 5 /nobreak >nul
start http://localhost:%FRONTEND_PORT%

echo.
echo Press any key to close this window...
pause >nul

endlocal
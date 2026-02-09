@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Shell Connection Diagnostics
echo ========================================
echo.

echo [1/6] Checking backend process...
netstat -ano | findstr :8080 | findstr LISTENING
if %errorlevel% equ 0 (
    echo [OK] Backend is listening on port 8080
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') do set BACKEND_PID=%%a
    echo     PID: !BACKEND_PID!
) else (
    echo [ERROR] Backend is NOT listening on port 8080
    echo     Please start the backend with: cd backend-java ^&^& mvn spring-boot:run
    goto :end
)
echo.

echo [2/6] Checking frontend process...
netstat -ano | findstr :5173 | findstr LISTENING
if %errorlevel% equ 0 (
    echo [OK] Frontend is listening on port 5173
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do set FRONTEND_PID=%%a
    echo     PID: !FRONTEND_PID!
) else (
    echo [WARN] Frontend is NOT listening on port 5173
    echo     Please start the frontend with: cd frontend ^&^& npm run dev
)
echo.

echo [3/6] Checking for TIME_WAIT connections (connection reuse issue)...
set TIME_WAIT_COUNT=0
for /f %%a in ('netstat -ano ^| findstr :8080 ^| findstr TIME_WAIT ^| find /c /v ""') do set TIME_WAIT_COUNT=%%a
if !TIME_WAIT_COUNT! gtr 0 (
    echo [WARN] Found !TIME_WAIT_COUNT! TIME_WAIT connections on port 8080
    echo     This may cause connection issues
    echo     Solution: Wait a few seconds or restart backend
) else (
    echo [OK] No TIME_WAIT connections found
)
echo.

echo [4/6] Checking WebSocket handler compilation status...
cd /d "%~dp0backend-java"
if exist target\classes\com\iflow\agent\handler\ShellWebSocketHandler.class (
    echo [OK] ShellWebSocketHandler.class exists (compiled)
    echo     Timestamp:
    dir /t:w target\classes\com\iflow\agent\handler\ShellWebSocketHandler.class | findstr ShellWebSocketHandler
) else (
    echo [WARN] ShellWebSocketHandler.class not found (not compiled)
    echo     Try: mvn compile
)
echo.

echo [5/6] Testing HTTP connection to backend...
curl -s -o nul -w "%%{http_code}" http://localhost:8080/api/projects
if !errorlevel! equ 0 (
    echo [OK] Backend HTTP API is accessible
) else (
    echo [ERROR] Backend HTTP API is NOT accessible
)
echo.

echo [6/6] Testing WebSocket connection...
echo     Attempting WebSocket connection...
echo     (This will timeout after 5 seconds if connection fails)
echo     To test manually, open: http://localhost:5173/test-shell.html
echo.

echo ========================================
echo Recommendations:
echo ========================================
echo.
echo If connection fails:
echo 1. Restart the backend: Stop process !BACKEND_PID! and run "mvn spring-boot:run"
echo 2. Check backend logs for errors
echo 3. Try the test page: http://localhost:5173/test-shell.html
echo 4. Clear browser cache and reload
echo.
echo If connection succeeds but shell doesn't work:
echo 1. Check project path is valid
echo 2. Check PowerShell is available
echo 3. Check backend logs for shell process errors
echo.

:end
echo ========================================
echo Diagnostics Complete
echo ========================================
pause
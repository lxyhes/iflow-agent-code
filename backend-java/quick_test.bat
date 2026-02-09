@echo off
echo ========================================
echo Java Backend Quick Test
echo ========================================
echo.
echo Checking Java version...
java -version
echo.
echo Checking Maven version...
mvn -version
echo.
echo Checking if backend is running...
netstat -ano | findstr :8080
if %errorlevel% equ 0 (
    echo.
    echo [OK] Backend is running on port 8080
) else (
    echo.
    echo [ERROR] Backend is NOT running on port 8080
    echo Please start the backend with: mvn spring-boot:run
)
echo.
echo Checking WebSocket handler file...
if exist "src\main\java\com\iflow\agent\handler\ShellWebSocketHandler.java" (
    echo [OK] ShellWebSocketHandler.java exists
) else (
    echo [ERROR] ShellWebSocketHandler.java not found
)
echo.
echo Checking configuration files...
if exist "src\main\resources\application.yml" (
    echo [OK] application.yml exists
) else (
    echo [ERROR] application.yml not found
)
echo.
echo Checking WebSocket config...
if exist "src\main\java\com\iflow\agent\config\WebSocketConfig.java" (
    echo [OK] WebSocketConfig.java exists
) else (
    echo [ERROR] WebSocketConfig.java not found
)
echo.
echo ========================================
echo Test Complete
echo ========================================
echo.
echo Next steps:
echo 1. Start the backend: mvn spring-boot:run
echo 2. Open test page: http://localhost:5173/test-shell.html
echo 3. Test WebSocket connection
echo.
pause
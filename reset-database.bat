@echo off
echo ====================================================
echo    Reset Database and Restart Services
echo ====================================================
echo.

echo [1/3] Stopping Java Backend...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo    Killed process %%a
)

echo.
echo [2/3] Deleting database file...
set "DB_FILE=%~dp0backend-java\database\agent.db"
if exist "%DB_FILE%" (
    del "%DB_FILE%"
    echo    Database deleted
) else (
    echo    Database file not found
)

echo.
echo [3/3] Database reset complete!
echo.
echo Please restart Java Backend manually:
echo   cd backend-java
echo   mvn spring-boot:run
echo.
pause
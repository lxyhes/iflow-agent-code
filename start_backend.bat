@echo off
echo Starting Java Backend...
echo.

cd /d "%~dp0backend-java"

echo Current directory: %CD%
echo.

echo Checking if port 8080 is available...
netstat -ano | findstr :8080 | findstr LISTENING > nul
if %errorlevel% equ 0 (
    echo [WARN] Port 8080 is already in use
    echo Existing processes:
    netstat -ano | findstr :8080 | findstr LISTENING
    echo.
    set /p KILL="Do you want to kill existing process? (y/n): "
    if /i "%KILL%"=="y" (
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') do (
            echo Killing process %%a...
            taskkill /F /PID %%a
        )
        timeout /t 2 /nobreak > nul
    )
)

echo.
echo Starting backend with Maven...
echo This may take a few minutes on first run...
echo.

mvn spring-boot:run

echo.
echo Backend stopped.
pause
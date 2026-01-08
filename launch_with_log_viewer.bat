@echo off
chcp 65001 >nul 2>&1
title IFlow Agent Launcher with Log Viewer

echo ====================================================
echo    IFlow Agent Launcher with Log Viewer
echo ====================================================
echo.

:: Get script directory
set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"
echo [INFO] Base: %BASE_DIR%

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found!
    goto :error
)
echo [OK] Python found

:: Start Log Viewer
echo.
echo [INFO] Starting Log Viewer...
start "Log Viewer" cmd /k "cd /d %BASE_DIR% && python log_viewer.py"

echo.
echo ====================================================
echo    Log Viewer 已启动！
echo    你可以在日志查看器中启动和管理服务
echo ====================================================
goto :end

:error
echo.
echo [ERROR] Something went wrong!

:end
echo.
pause
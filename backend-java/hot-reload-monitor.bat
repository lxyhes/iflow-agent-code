@echo off
chcp 65001 >nul
title Java Backend Hot Reload Monitor

set "BASE_DIR=%~dp0"
set "BACKEND_DIR=%BASE_DIR%backend-java"
set "MONITOR_DIR=%BACKEND_DIR%\src\main\java"

echo ====================================================
echo    Java Backend 热重载监控
echo ====================================================
echo.
echo 监控目录: %MONITOR_DIR%
echo 按 Ctrl+C 停止监控
echo.

cd /d "%BACKEND_DIR%"

:main_loop
echo [%time%] 正在编译 Java 文件...
call mvn compile -q
if %ERRORLEVEL% EQU 0 (
    echo [%time%] 编译成功！检测到更改，等待应用重启...
) else (
    echo [%time%] 编译失败，请检查错误
)

:: 每3秒检查一次文件变化
timeout /t 3 /nobreak >nul
goto main_loop
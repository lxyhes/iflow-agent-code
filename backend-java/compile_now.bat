@echo off
cd /d "%~dp0"
echo Starting compilation...
mvn compile -DskipTests
echo.
echo Compilation completed.
pause
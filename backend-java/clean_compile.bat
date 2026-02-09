@echo off
echo Cleaning and compiling...
cd /d "%~dp0"

echo Cleaning...
del /S /Q target\classes 2>nul
echo.

echo Compiling...
mvn clean compile -DskipTests

echo.
echo Done.
pause
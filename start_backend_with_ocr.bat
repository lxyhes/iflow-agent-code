@echo off
setlocal

chcp 65001 >nul 2>&1
title Backend with LightOnOCR Support

:: Set environment variables
set "PYTHONPATH=E:\zhihui-soft\agent_project"
set "HF_ENDPOINT=https://hf-mirror.com"
set "TRANSFORMERS_CACHE=E:\zhihui-soft\agent_project\storage\hf_cache"
set "HF_HOME=E:\zhihui-soft\agent_project\storage\hf_home"
set "HF_HUB_CACHE=E:\zhihui-soft\agent_project\storage\hf_hub"
set "MPLCONFIGDIR=E:\zhihui-soft\agent_project\storage\mpl"

echo ====================================================
echo    Starting Backend with LightOnOCR Support
echo ====================================================
echo.
echo [INFO] PYTHONPATH=%PYTHONPATH%
echo [INFO] HF_ENDPOINT=%HF_ENDPOINT%
echo [INFO] TRANSFORMERS_CACHE=%TRANSFORMERS_CACHE%
echo.

:: Create cache directories
if not exist "%TRANSFORMERS_CACHE%" mkdir "%TRANSFORMERS_CACHE%"
if not exist "%HF_HOME%" mkdir "%HF_HOME%"
if not exist "%HF_HUB_CACHE%" mkdir "%HF_HUB_CACHE%"
if not exist "%MPLCONFIGDIR%" mkdir "%MPLCONFIGDIR%"

echo [INFO] Cache directories created
echo.

:: Start backend
echo [INFO] Starting backend server on port 8000...
echo [INFO] LightOnOCR model will be downloaded on first use (may take several minutes)
echo.

cd /d "E:\zhihui-soft\agent_project"
python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload

pause

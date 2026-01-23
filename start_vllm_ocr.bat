@echo off
chcp 65001 >nul
echo ========================================
echo Starting LightOnOCR vLLM Service
echo ========================================
echo.

REM Check if vllm is installed
python -c "import vllm" 2>nul
if errorlevel 1 (
    echo [ERROR] vllm package not found
    echo.
    echo Please install vllm first:
    echo   pip install vllm==0.11.2
    echo.
    pause
    exit /b 1
)

echo [INFO] vllm is installed
echo.

REM Set environment variables
set VLLM_OCR_ENDPOINT=http://localhost:8000/v1/chat/completions
set VLLM_OCR_MODEL=lightonai/LightOnOCR-1B-1025

echo [INFO] Configuration:
echo   - Endpoint: %VLLM_OCR_ENDPOINT%
echo   - Model: %VLLM_OCR_MODEL%
echo.

REM Check if port is in use
netstat -ano | findstr ":8000" >nul
if not errorlevel 1 (
    echo [WARNING] Port 8000 is already in use
    echo.
    echo Please stop the process using this port or use a different port
    echo.
    pause
    exit /b 1
)

echo [INFO] Starting vLLM service...
echo.

REM Start vLLM service
vllm serve lightonai/LightOnOCR-1B-1025 ^
    --limit-mm-per-prompt "{\"image\": 1}" ^
    --mm-processor-cache-gb 0 ^
    --no-enable-prefix-caching ^
    --host 0.0.0.0 ^
    --port 8000

if errorlevel 1 (
    echo.
    echo [ERROR] vLLM service failed to start
    echo.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] vLLM service stopped
pause
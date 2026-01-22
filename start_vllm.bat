@echo off
REM vLLM 服务启动脚本 (Windows)
REM 使用方法: start_vllm.bat [模型名称]

setlocal enabledelayedexpansion

REM 默认配置
if "%~1"=="" (
    set "MODEL_NAME=Qwen/Qwen2.5-5B-Instruct"
) else (
    set "MODEL_NAME=%~1"
)

set "HOST=%VLLM_HOST%"
if "%HOST%"=="" set "HOST=0.0.0.0"

set "PORT=%VLLM_PORT%"
if "%PORT%"=="" set "PORT=8000"

set "API_KEY=%VLLM_API_KEY%"
if "%API_KEY%"=="" set "API_KEY=token-abc123"

set "GPU_MEMORY_UTILIZATION=%VLLM_GPU_MEMORY%"
if "%GPU_MEMORY_UTILIZATION%"=="" set "GPU_MEMORY_UTILIZATION=0.90"

set "MAX_MODEL_LEN=%VLLM_MAX_LEN%"
if "%MAX_MODEL_LEN%"=="" set "MAX_MODEL_LEN=65536"

set "DTYPE=%VLLM_DTYPE%"
if "%DTYPE%"=="" set "DTYPE=auto"

echo ========================================
echo    vLLM 服务启动脚本 (Windows)
echo ========================================
echo.

REM 检查 Python
python --version
if %errorlevel% neq 0 (
    echo [错误] 未找到 Python,请先安装 Python 3.8+
    pause
    exit /b 1
)

REM 检查 vLLM
python -c "import vllm" 2>nul
if %errorlevel% neq 0 (
    echo [警告] vLLM 未安装,正在安装...
    pip install vllm
)

echo.
echo 启动配置:
echo   模型: %MODEL_NAME%
echo   地址: %HOST%:%PORT%
echo   API Key: %API_KEY%
echo   GPU 内存利用率: %GPU_MEMORY_UTILIZATION%
echo   最大模型长度: %MAX_MODEL_LEN%
echo   数据类型: %DTYPE%
echo.

echo 正在启动 vLLM 服务...
echo.

REM 启动 vLLM 服务
vllm serve "%MODEL_NAME%" ^
  --host "%HOST%" ^
  --port "%PORT%" ^
  --api-key "%API_KEY%" ^
  --gpu-memory-utilization "%GPU_MEMORY_UTILIZATION%" ^
  --max-model-len "%MAX_MODEL_LEN%" ^
  --dtype "%DTYPE%" ^
  --disable-log-requests

echo.
echo vLLM 服务已停止
pause
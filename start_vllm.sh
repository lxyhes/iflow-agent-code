#!/bin/bash
# vLLM 服务启动脚本
# 使用方法: ./start_vllm.sh [模型名称]

set -e

# 默认配置
MODEL_NAME=${1:-"Qwen/Qwen2.5-7B-Instruct"}
HOST=${VLLM_HOST:-"0.0.0.0"}
PORT=${VLLM_PORT:-8000}
API_KEY=${VLLM_API_KEY:-"token-abc123"}
GPU_MEMORY_UTILIZATION=${VLLM_GPU_MEMORY:-0.95}
MAX_MODEL_LEN=${VLLM_MAX_LEN:-131072}
DTYPE=${VLLM_DTYPE:-"auto"}

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   vLLM 服务启动脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查 CUDA
if command -v nvidia-smi &> /dev/null; then
    echo -e "${YELLOW}✓ CUDA 环境检测通过${NC}"
    nvidia-smi --query-gpu=memory.total,memory.free --format=csv,noheader,nounits
else
    echo -e "${YELLOW}⚠ 未检测到 CUDA,将使用 CPU 模式${NC}"
    export VLLM_USE_CUDA=0
fi

# 检查 Python
echo -e "${YELLOW}✓ Python 版本:${NC} $(python --version)"

# 检查 vLLM
if command -v vllm &> /dev/null; then
    echo -e "${YELLOW}✓ vLLM 版本:${NC} $(vllm --version)"
else
    echo -e "${YELLOW}✗ vLLM 未安装,正在安装...${NC}"
    pip install vllm
fi

echo ""
echo -e "${GREEN}启动配置:${NC}"
echo -e "  模型: ${MODEL_NAME}"
echo -e "  地址: ${HOST}:${PORT}"
echo -e "  API Key: ${API_KEY}"
echo -e "  GPU 内存利用率: ${GPU_MEMORY_UTILIZATION}"
echo -e "  最大模型长度: ${MAX_MODEL_LEN}"
echo -e "  数据类型: ${DTYPE}"
echo ""

# 启动 vLLM 服务
echo -e "${GREEN}正在启动 vLLM 服务...${NC}"
echo ""

vllm serve "${MODEL_NAME}" \
  --host "${HOST}" \
  --port "${PORT}" \
  --api-key "${API_KEY}" \
  --gpu-memory-utilization "${GPU_MEMORY_UTILIZATION}" \
  --max-model-len "${MAX_MODEL_LEN}" \
  --dtype "${DTYPE}" \
  --disable-log-requests

echo ""
echo -e "${GREEN}vLLM 服务已停止${NC}"
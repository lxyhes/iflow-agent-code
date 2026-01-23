#!/bin/bash

echo "========================================"
echo "启动 LightOnOCR vLLM 服务"
echo "========================================"
echo ""

# 检查是否已安装 vllm
python -c "import vllm" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "[错误] 未检测到 vllm 包"
    echo ""
    echo "请先安装 vllm:"
    echo "  pip install vllm==0.11.2"
    echo ""
    exit 1
fi

echo "[信息] vllm 已安装"
echo ""

# 设置环境变量
export VLLM_OCR_ENDPOINT=http://localhost:8000/v1/chat/completions
export VLLM_OCR_MODEL=lightonai/LightOnOCR-1B-1025

echo "[信息] 配置:"
echo "  - 端点: $VLLM_OCR_ENDPOINT"
echo "  - 模型: $VLLM_OCR_MODEL"
echo ""

# 检查端口是否被占用
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[警告] 端口 8000 已被占用"
    echo ""
    echo "请先停止占用该端口的进程，或修改配置使用其他端口"
    echo ""
    exit 1
fi

echo "[信息] 正在启动 vLLM 服务..."
echo ""

# 启动 vLLM 服务
vllm serve lightonai/LightOnOCR-1B-1025 \
    --limit-mm-per-prompt '{"image": 1}' \
    --mm-processor-cache-gb 0 \
    --no-enable-prefix-caching \
    --host 0.0.0.0 \
    --port 8000

if [ $? -ne 0 ]; then
    echo ""
    echo "[错误] vLLM 服务启动失败"
    echo ""
    exit 1
fi

echo ""
echo "[成功] vLLM 服务已停止"
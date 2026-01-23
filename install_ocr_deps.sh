#!/bin/bash

echo "========================================"
echo "OCR 依赖安装脚本"
echo "========================================"
echo

# 检查 Python 环境
echo "[1/4] 检查 Python 环境..."
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到 Python3,请先安装 Python 3.9+"
    exit 1
fi
python3 --version
echo

# 升级 pip
echo "[2/4] 升级 pip..."
python3 -m pip install --upgrade pip
echo

# 安装 OCR 依赖
echo "[3/4] 安装 OCR 依赖..."
echo "正在安装 PyTorch (CPU版本)..."
python3 -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

echo
echo "正在安装 Transformers..."
python3 -m pip install transformers>=4.30.0

echo
echo "正在安装其他依赖..."
python3 -m pip install pillow pypdfium2 pypdf pdfplumber numpy opencv-python

echo
echo "[4/4] 安装可选 OCR 技术..."
echo
read -p "是否安装 PaddleOCR? (需要较长时间) [y/N]: " install_paddle
if [ "$install_paddle" = "y" ] || [ "$install_paddle" = "Y" ]; then
    echo "正在安装 PaddleOCR..."
    python3 -m pip install paddleocr
fi

echo
read -p "是否安装 EasyOCR? (需要较长时间) [y/N]: " install_easy
if [ "$install_easy" = "y" ] || [ "$install_easy" = "Y" ]; then
    echo "正在安装 EasyOCR..."
    python3 -m pip install easyocr
fi

echo
read -p "是否安装 Tesseract OCR? (需要单独安装 tesseract 可执行文件) [y/N]: " install_tesseract
if [ "$install_tesseract" = "y" ] || [ "$install_tesseract" = "Y" ]; then
    echo "正在安装 pytesseract (需要先安装 tesseract 可执行文件)..."
    python3 -m pip install pytesseract
    echo
    echo "请从以下地址下载并安装 Tesseract:"
    echo "https://github.com/UB-Mannheim/tesseract/wiki"
fi

echo
echo "========================================"
echo "OCR 依赖安装完成!"
echo "========================================"
echo
echo "使用说明:"
echo "1. LightOnOCR-2-1B: 已安装,推荐用于简历 OCR"
echo "2. PaddleOCR: 可选,中文识别优秀"
echo "3. EasyOCR: 可选,简单易用"
echo "4. Tesseract: 可选,需要单独安装 tesseract"
echo
echo "默认使用 LightOnOCR-2-1B,支持 Markdown 输出"
echo
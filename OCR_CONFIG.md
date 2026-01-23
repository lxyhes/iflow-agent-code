# OCR 配置和使用指南

## 📋 概述

本系统集成了多种 OCR 技术,包括 LightOnOCR vLLM、LightOnOCR-2-1B、RapidOCR 等,用于简历和图片的文字识别。

**推荐方案:**
- 🚀 **LightOnOCR vLLM** - 高性能服务,支持批量处理
- ⚡ **RapidOCR** - 快速轻量,适合简单识别

## 🚀 快速开始 (LightOnOCR vLLM)

### 1. 安装 vLLM

```bash
# 创建虚拟环境 (Python 3.12+)
pip install uv
uv venv --python 3.12 --seed

# 激活虚拟环境
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# 安装 vLLM 和依赖
uv pip install vllm==0.11.2
uv pip install pypdfium2 pillow requests
```

### 2. 启动 vLLM 服务

**Windows:**
```bash
start_vllm_ocr.bat
```

**Linux/Mac:**
```bash
chmod +x start_vllm_ocr.sh
./start_vllm_ocr.sh
```

服务将在 `http://localhost:8000` 启动。

### 3. 配置环境变量 (可选)

```bash
# vLLM 服务端点
export VLLM_OCR_ENDPOINT=http://localhost:8000/v1/chat/completions

# 模型名称
export VLLM_OCR_MODEL=lightonai/LightOnOCR-1B-1025
```

### 4. 使用

在面试准备页面上传简历时,系统会自动使用 vLLM OCR 服务。

## 🔧 依赖安装

### 快速安装(推荐)

**Windows:**
```bash
install_ocr_deps.bat
```

**Linux/macOS:**
```bash
chmod +x install_ocr_deps.sh
./install_ocr_deps.sh
```

### 手动安装

如果快速安装失败,可以手动安装依赖:

```bash
# 1. 安装 PyTorch (CPU 版本)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# 2. 安装 Transformers
pip install transformers>=4.30.0

# 3. 安装其他依赖
pip install pillow pypdfium2 pypdf pdfplumber numpy opencv-python

# 4. (可选) 安装其他 OCR 技术
pip install paddleocr easyocr pytesseract rapidocr-onnxruntime
```

## 🚀 使用方法

### 1. 在面试页面上传简历

1. 进入"面试准备"页面
2. 点击"模拟面试"标签
3. 点击"上传简历"按钮
4. 选择 PDF 或 TXT 格式的简历文件
5. 等待 OCR 提取完成
6. 开始基于简历的面试

### 2. API 使用

#### 处理 PDF 文件
```bash
curl -X POST http://localhost:8000/api/ocr/process-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "pdf_data": "<base64_encoded_pdf>",
    "technology": "lighton",
    "max_tokens": 16384
  }'
```

#### 处理图片
```bash
curl -X POST http://localhost:8000/api/ocr/process \
  -H "Content-Type: application/json" \
  -d '{
    "image": "<base64_encoded_image>",
    "technology": "lighton",
    "max_tokens": 4096
  }'
```

#### 获取支持的 OCR 技术
```bash
curl http://localhost:8000/api/ocr/technologies
```

## ⚙️ 配置选项

### 环境变量

```bash
# OCR 模型缓存目录
export IFLOW_OCR_CACHE_DIR=/path/to/cache

# LightOnOCR 模型 ID
export LIGHTON_OCR_MODEL_ID=lightonai/LightOnOCR-2-1B

# 本地模型路径(如果有)
export LIGHTON_OCR_MODEL_PATH=/path/to/model
```

### 支持的 OCR 技术

1. **LightOnOCR vLLM** (推荐) 🚀
   - 基于 vLLM 的高性能服务
   - 支持 Markdown 输出
   - 识别表格、数学公式
   - 多栏布局识别
   - 支持批量处理
   - 需要单独启动 vLLM 服务

2. **LightOnOCR-2-1B** (Transformers)
   - 支持 Markdown 输出
   - 识别表格、数学公式
   - 多栏布局识别
   - 需要网络下载模型

3. **RapidOCR** (快速)
   - 基于 ONNX,速度最快
   - 中文识别优秀
   - 轻量级,无需 GPU
   - 适合快速处理

4. **PaddleOCR**
   - 百度开源,中文识别优秀
   - 支持方向分类
   - 多语言支持

5. **Tesseract OCR**
   - 开源 OCR 引擎
   - 支持多语言
   - 需要单独安装 tesseract 可执行文件

6. **EasyOCR**
   - 简单易用
   - 多语言支持
   - 支持 GPU 加速

## 🎯 应用场景

### 1. 简历 OCR
- 提取 PDF 简历中的文本内容
- 保留格式和布局
- 用于面试准备

### 2. 图片文字识别
- 截图文字提取
- 图片转文字
- 文档数字化

### 3. 表格识别
- 提取表格数据
- 保留表格结构
- 支持 Markdown 输出

### 4. 数学公式识别
- 识别数学公式
- 支持 LaTeX 格式
- 保留公式结构

## 🐛 故障排除

### 问题 1: 所有 OCR 服务都不可用

**错误信息:**
```
所有 OCR 服务都不可用: LightOnOCR 模型不可用
```

**解决方案:**
1. 运行安装脚本: `install_ocr_deps.bat` (Windows) 或 `install_ocr_deps.sh` (Linux/Mac)
2. 检查网络连接
3. 配置代理访问 Hugging Face
4. 使用本地模型(如果有)

### 问题 2: 网络连接失败

**错误信息:**
```
SSLError: EOF occurred in violation of protocol
```

**解决方案:**
1. 检查网络连接
2. 配置代理:
   ```bash
   export HTTP_PROXY=http://proxy.example.com:8080
   export HTTPS_PROXY=http://proxy.example.com:8080
   ```
3. 使用镜像站:
   ```bash
   export HF_ENDPOINT=https://hf-mirror.com
   ```

### 问题 3: 模型下载失败

**解决方案:**
1. 检查磁盘空间
2. 手动下载模型:
   ```bash
   huggingface-cli download lightonai/LightOnOCR-2-1B
   ```
3. 使用本地模型路径:
   ```bash
   export LIGHTON_OCR_MODEL_PATH=/path/to/model
   ```

### 问题 4: 内存不足

**解决方案:**
1. 使用 RapidOCR 代替 LightOnOCR
2. 减少 `max_tokens` 参数
3. 使用 CPU 而不是 GPU

### 问题 5: PDF 处理失败

**解决方案:**
1. 确保 PDF 文件未加密
2. 尝试将 PDF 转换为图片再处理
3. 使用其他 OCR 技术

## 📊 性能优化

### 1. 使用 RapidOCR 提升速度
```javascript
{
  "technology": "rapidocr",
  "max_tokens": 4096
}
```

### 2. 限制处理页数
```javascript
{
  "page_range": [0, 1, 2],  // 只处理前3页
  "max_tokens": 4096
}
```

### 3. 调整 DPI
```javascript
{
  "dpi": 200,  // 降低 DPI 可以提升速度
  "max_tokens": 4096
}
```

## 🔒 安全注意事项

1. 不要上传敏感信息
2. OCR 处理在本地进行,数据不会上传到外部服务器
3. PDF 文件会被临时保存在服务器内存中
4. 处理完成后会自动清理临时文件

## 📚 参考资料

- [LightOnOCR GitHub](https://github.com/LightOn-AI/LightOnOCR)
- [Transformers 文档](https://huggingface.co/docs/transformers/)
- [Hugging Face Model Hub](https://huggingface.co/models)

## 💡 最佳实践

1. **使用 PDF 格式**: PDF 格式可以保留格式和布局
2. **高质量扫描**: 确保扫描清晰,避免模糊
3. **合理设置 max_tokens**: 根据文档长度调整
4. **选择合适的 OCR 技术**: LightOnOCR 适合复杂文档,RapidOCR 适合快速处理
5. **定期更新依赖**: 保持 OCR 库为最新版本

---

**最后更新**: 2026-01-23
**维护者**: iFlow Team
# LightOnOCR vLLM 集成指南

## 📖 概述

本系统已集成 vLLM 版本的 LightOnOCR,提供高性能的 OCR 服务。相比传统的 Transformers 版本,vLLM 版本具有以下优势:

- 🚀 **更高的性能**: 基于 vLLM 框架,推理速度更快
- 📦 **批量处理**: 支持批量处理多个请求
- 🔄 **独立服务**: 作为独立服务运行,不影响主应用
- 💾 **模型缓存**: 自动缓存模型,减少重复加载

## 🚀 快速开始

### 方式一: 一键启动(推荐)

**Windows:**
```bash
launch_with_vllm_ocr.bat
```

这将自动启动:
1. vLLM OCR 服务 (端口 8000)
2. 后端服务 (端口 8001)
3. iFlow CLI (端口 8090)
4. Node.js 服务器 (端口 3001)
5. 前端 (端口 5173)

### 方式二: 手动启动

#### 1. 启动 vLLM OCR 服务

**Windows:**
```bash
start_vllm_ocr.bat
```

**Linux/Mac:**
```bash
chmod +x start_vllm_ocr.sh
./start_vllm_ocr.sh
```

#### 2. 启动其他服务

在新的终端窗口中运行:
```bash
launch_all_fixed.bat
```

注意:后端会使用端口 8001,避免与 vLLM OCR 端口 8000 冲突。

## 🔧 配置

### 环境变量

```bash
# vLLM OCR 服务端点
export VLLM_OCR_ENDPOINT=http://localhost:8000/v1/chat/completions

# 模型名称
export VLLM_OCR_MODEL=lightonai/LightOnOCR-1B-1025
```

### 修改端口

如果需要修改 vLLM OCR 服务的端口:

1. 编辑 `start_vllm_ocr.bat` 或 `start_vllm_ocr.sh`
2. 修改 `--port` 参数
3. 更新环境变量 `VLLM_OCR_ENDPOINT`

## 📝 使用方法

### 在面试准备页面上传简历

1. 启动所有服务
2. 打开 http://localhost:5173
3. 进入"面试准备"页面
4. 点击"模拟面试"标签
5. 点击"上传简历"按钮
6. 选择 PDF 或 TXT 格式的简历文件
7. 等待 OCR 提取完成(使用 vLLM OCR)
8. 开始基于简历的面试

### API 调用

```python
from backend.core.ocr_service import get_ocr_service

# 使用 vLLM OCR
ocr_service = get_ocr_service("lighton_vllm")
result = await ocr_service.process_image(image_base64)

if result['success']:
    print(f"识别结果: {result['text']}")
else:
    print(f"错误: {result['error']}")
```

## 🧪 测试

运行测试脚本验证 vLLM OCR 集成:

```bash
python test_vllm_ocr.py
```

测试脚本会:
1. 检查支持的 OCR 技术
2. 验证 vLLM 服务连接
3. 创建测试图片
4. 执行 OCR 识别
5. 显示识别结果

## 📊 性能对比

| 特性 | LightOnOCR vLLM | LightOnOCR Transformers | RapidOCR |
|------|----------------|------------------------|----------|
| 推理速度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 批量处理 | ✅ | ❌ | ❌ |
| Markdown 输出 | ✅ | ✅ | ❌ |
| 表格识别 | ✅ | ✅ | ⚠️ |
| 数学公式 | ✅ | ✅ | ❌ |
| 内存占用 | 中 | 高 | 低 |
| 首次启动 | 快 | 慢 | 快 |

## 🐛 故障排除

### 问题 1: vLLM OCR 服务启动失败

**错误信息:**
```
[错误] 未检测到 vllm 包
```

**解决方案:**
```bash
# 安装 vLLM (需要 Python 3.12+)
pip install uv
uv venv --python 3.12 --seed
source .venv/bin/activate  # Linux/Mac
# 或
.venv\Scripts\activate  # Windows

uv pip install vllm==0.11.2
uv pip install pypdfium2 pillow requests
```

### 问题 2: 端口 8000 被占用

**错误信息:**
```
[警告] 端口 8000 已被占用
```

**解决方案:**
```bash
# Windows: 查找并停止占用端口的进程
netstat -ano | findstr ":8000"
taskkill /F /PID <PID>

# Linux/Mac:
lsof -ti:8000 | xargs kill -9
```

或修改 vLLM OCR 使用的端口。

### 问题 3: 模型下载失败

**错误信息:**
```
OSError: Can't load tokenizer for 'lightonai/LightOnOCR-1B-1025'
```

**解决方案:**

1. 检查网络连接
2. 使用镜像站:
```bash
export HF_ENDPOINT=https://hf-mirror.com
```
3. 手动下载模型并指定本地路径

### 问题 4: OCR 识别失败

**错误信息:**
```
❌ OCR 处理失败: 无法连接到 vLLM 服务
```

**解决方案:**

1. 确认 vLLM OCR 服务已启动
2. 检查服务端点配置是否正确
3. 查看服务日志获取详细错误信息

## 📚 相关文档

- [OCR 配置指南](OCR_CONFIG.md)
- [vLLM 官方文档](https://docs.vllm.ai/)
- [LightOnOCR GitHub](https://github.com/LightOn-AI/LightOnOCR)

## 💡 提示

1. **首次运行**: vLLM OCR 首次启动会下载模型(~2GB),请耐心等待
2. **GPU 加速**: 如果有 GPU,vLLM 会自动使用 GPU 加速
3. **内存要求**: 建议至少 8GB RAM
4. **Python 版本**: vLLM 需要 Python 3.12 或更高版本
5. **独立运行**: vLLM OCR 可以独立运行,不依赖主应用

## 🔄 更新日志

### 2026-01-23
- ✅ 添加 vLLM OCR 支持
- ✅ 创建启动脚本
- ✅ 添加测试脚本
- ✅ 更新文档
- ✅ 集成到面试准备功能

---

**最后更新**: 2026年1月23日
**维护者**: iFlow Agent Team
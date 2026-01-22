# OCR 功能集成指南

## 概述

本项目已成功集成 LightOnOCR-2-1B 及其他 OCR 技术,提供强大的图片和 PDF 文字识别功能。

## 支持的 OCR 技术

1. **LightOnOCR-2-1B** (推荐)
   - 高性能 OCR 模型
   - 支持 Markdown 结构化输出
   - 数学公式识别
   - 表格识别
   - 多栏布局处理

2. **Tesseract OCR**
   - 开源 OCR 引擎
   - 支持多语言
   - 离线运行

3. **PaddleOCR**
   - 百度开源 OCR 工具
   - 中文识别优秀
   - 方向分类

4. **EasyOCR**
   - 简单易用
   - 多语言支持
   - GPU 加速

## 后端 API

### 1. 获取支持的 OCR 技术列表

```bash
GET /api/ocr/technologies
```

响应:
```json
{
  "success": true,
  "technologies": [
    {
      "id": "lighton",
      "name": "LightOnOCR-2-1B",
      "description": "高性能 OCR 模型,支持 Markdown 输出",
      "features": ["Markdown 输出", "数学公式识别", "表格识别", "多栏布局"],
      "recommended": true
    }
  ]
}
```

### 2. 处理图片 OCR

```bash
POST /api/ocr/process
```

请求体:
```json
{
  "image": "base64 encoded image",
  "technology": "lighton",
  "max_tokens": 4096,
  "temperature": 0.2,
  "top_p": 0.9
}
```

响应:
```json
{
  "success": true,
  "text": "识别出的文本内容",
  "technology": "lighton",
  "format": "markdown"
}
```

### 3. 处理 PDF OCR

```bash
POST /api/ocr/process-pdf
```

请求体:
```json
{
  "pdf_data": "base64 encoded pdf",
  "technology": "lighton",
  "page_range": [0, 1, 2],
  "max_tokens": 4096,
  "temperature": 0.2,
  "top_p": 0.9
}
```

响应:
```json
{
  "success": true,
  "text": "所有页面的合并文本",
  "pages": [
    {
      "page": 1,
      "text": "第一页文本",
      "success": true
    }
  ],
  "technology": "lighton",
  "total_pages": 3,
  "format": "markdown"
}
```

## 前端组件

### 1. OCRProcessor 组件

完整的 OCR 处理界面,包含:
- 文件上传(拖拽/点击)
- OCR 技术选择
- 参数配置
- 结果展示
- 复制/下载功能

使用示例:
```jsx
import OCRProcessor from './components/OCRProcessor';

function MyPage() {
  return <OCRProcessor />;
}
```

### 2. OCRTechnologySelector 组件

OCR 技术选择器,可嵌入到其他组件中。

使用示例:
```jsx
import OCRTechnologySelector from './components/OCRTechnologySelector';

function MyComponent() {
  const [selectedTech, setSelectedTech] = useState('lighton');

  return (
    <div>
      <OCRTechnologySelector
        selectedTechnology={selectedTech}
        onTechnologyChange={setSelectedTech}
        showDescription={true}
        compact={false}
      />
    </div>
  );
}
```

Props:
- `selectedTechnology`: 当前选择的技术 ID
- `onTechnologyChange`: 技术变化回调函数
- `disabled`: 是否禁用
- `showDescription`: 是否显示描述
- `compact`: 是否使用紧凑模式

## 安装依赖

### 后端依赖

```bash
pip install transformers pillow pypdfium2
```

可选依赖(根据需要安装):
```bash
# Tesseract
pip install pytesseract

# PaddleOCR
pip install paddleocr

# EasyOCR
pip install easyocr
```

### 前端依赖

前端依赖已包含在 package.json 中:
- `react-markdown` - Markdown 渲染
- `lucide-react` - 图标库

## 使用示例

### 在现有组件中集成 OCR 功能

```jsx
import React, { useState } from 'react';
import OCRTechnologySelector from './OCRTechnologySelector';
import { authenticatedFetch } from '../utils/api';

function MyComponent() {
  const [selectedTech, setSelectedTech] = useState('lighton');
  const [result, setResult] = useState(null);

  const handleOCR = async (imageBase64) => {
    const response = await authenticatedFetch('/api/ocr/process', {
      method: 'POST',
      body: JSON.stringify({
        image: imageBase64,
        technology: selectedTech,
        max_tokens: 4096
      }),
    });

    const data = await response.json();
    setResult(data);
  };

  return (
    <div>
      <OCRTechnologySelector
        selectedTechnology={selectedTech}
        onTechnologyChange={setSelectedTech}
      />
      {/* 其他 UI */}
    </div>
  );
}
```

## 特性

- ✅ 支持多种 OCR 技术
- ✅ 图片和 PDF 文件处理
- ✅ Markdown 结构化输出(LightOnOCR)
- ✅ 实时进度显示
- ✅ 结果复制和下载
- ✅ 响应式设计
- ✅ 深色模式支持

## 注意事项

1. **LightOnOCR-2-1B 首次加载需要下载模型**,约 2GB,请确保网络畅通
2. **PDF 处理需要 pypdfium2 库**
3. **大文件处理可能需要较长时间**,建议添加进度提示
4. **GPU 加速可以显著提升速度**,推荐在有 CUDA 环境的机器上使用

## 性能优化建议

1. 使用 GPU 加速(CUDA)
2. 批量处理多页 PDF
3. 调整 `max_tokens` 参数控制输出长度
4. 根据场景选择合适的 OCR 技术

## 故障排除

### 模型加载失败

检查网络连接和磁盘空间,确保可以访问 Hugging Face。

### OCR 结果不准确

尝试:
- 调整 `temperature` 和 `top_p` 参数
- 使用不同的 OCR 技术
- 提高图片分辨率

### 内存不足

减少 `max_tokens` 参数或使用较小的模型。
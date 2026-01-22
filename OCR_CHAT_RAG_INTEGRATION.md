# OCR 功能集成到 Chat 和 RAG 组件

## 概述

已成功将 OCR 功能集成到 Chat 和 RAG 组件中,支持图片和 PDF 的自动文字识别。

## 集成的组件

### 1. ChatInputWithOCR 组件

**位置**: `frontend/src/components/chat/ChatInputWithOCR.jsx`

**功能**:
- ✅ 拖拽/点击上传图片
- ✅ 自动 OCR 识别
- ✅ OCR 结果自动添加到聊天输入
- ✅ 图片预览和状态显示
- ✅ OCR 技术选择
- ✅ 实时处理进度

**使用方法**:

```jsx
import ChatInputWithOCR from './components/chat/ChatInputWithOCR';

function ChatInterface() {
  const [input, setInput] = useState('');
  const [ocrText, setOcrText] = useState('');

  const handleOCRResult = (text, fileName) => {
    // 将 OCR 结果添加到输入框
    setInput(prev => prev + `\n\n[OCR 识别结果 - ${fileName}]\n${text}\n`);
  };

  return (
    <ChatInputWithOCR
      input={input}
      isLoading={isLoading}
      textareaRef={textareaRef}
      getRootProps={getRootProps}
      getInputProps={getInputProps}
      handleInputChange={handleInputChange}
      handleKeyDown={handleKeyDown}
      handlePaste={handlePaste}
      handleSubmit={handleSubmit}
      isInputFocused={isInputFocused}
      setIsInputFocused={setIsInputFocused}
      provider={provider}
      onOCRResult={handleOCRResult}
    />
  );
}
```

**Props**:
- `input`: 输入框内容
- `isLoading`: 是否正在加载
- `textareaRef`: textarea 引用
- `getRootProps`: 拖拽区域 props
- `getInputProps`: 输入框 props
- `handleInputChange`: 输入变化处理
- `handleKeyDown`: 键盘事件处理
- `handlePaste`: 粘贴事件处理
- `handleSubmit`: 提交处理
- `isInputFocused`: 输入框是否聚焦
- `setIsInputFocused`: 设置聚焦状态
- `provider`: 提供商 (cursor/iflow)
- `onOCRResult`: OCR 结果回调函数

### 2. RAGUploadWithOCR 组件

**位置**: `frontend/src/components/rag/RAGUploadWithOCR.jsx`

**功能**:
- ✅ OCR 模式开关
- ✅ 支持图片和 PDF 上传
- ✅ 自动 OCR 识别
- ✅ OCR 结果作为文本文件上传
- ✅ OCR 技术选择
- ✅ 批量处理
- ✅ 处理进度显示

**使用方法**:

```jsx
import RAGUploadWithOCR from './components/rag/RAGUploadWithOCR';

function RAGPanel() {
  const handleUpload = async (file) => {
    // 普通文件上传
    await uploadDocumentToRAG(projectName, [file]);
  };

  const handleOCRUpload = async (textFile, ocrResult) => {
    // OCR 结果上传
    await uploadDocumentToRAG(projectName, [textFile]);
    
    // 可选: 保存 OCR 元数据
    console.log('OCR 结果:', ocrResult);
  };

  return (
    <RAGUploadWithOCR
      projectId={projectName}
      onUpload={handleUpload}
      onOCRUpload={handleOCRUpload}
    />
  );
}
```

**Props**:
- `projectId`: 项目 ID
- `onUpload`: 普通文件上传回调
- `onOCRUpload`: OCR 文件上传回调
- `disabled`: 是否禁用

## 使用场景

### 场景 1: Chat 中识别图片文字

用户上传截图或图片,系统自动识别文字并添加到聊天输入中,然后发送给 AI 进行分析。

**流程**:
1. 用户拖拽图片到聊天输入框
2. 系统自动进行 OCR 识别
3. 识别结果自动添加到输入框
4. 用户可以编辑后发送给 AI

### 场景 2: RAG 中识别扫描文档

用户上传扫描的 PDF 或图片文档,系统识别后添加到知识库中。

**流程**:
1. 用户开启 OCR 模式
2. 上传 PDF 或图片
3. 系统识别文字
4. 识别结果作为文本文件添加到知识库
5. 可以进行 RAG 检索

## 集成步骤

### 步骤 1: 替换 ChatInput 组件

在 `ChatInterfaceMinimal.jsx` 或其他聊天组件中:

```jsx
// 原来的导入
// import ChatInput from './components/chat/ChatInput';

// 改为
import ChatInputWithOCR from './components/chat/ChatInputWithOCR';

// 添加 OCR 结果处理
const handleOCRResult = (text, fileName) => {
  setChatInput(prev => prev + `\n\n[OCR 识别结果 - ${fileName}]\n${text}\n`);
};

// 使用新组件
<ChatInputWithOCR
  // ... 其他 props
  onOCRResult={handleOCRResult}
/>
```

### 步骤 2: 替换 RAG 上传组件

在 `RAGPanel.jsx` 中:

```jsx
// 添加导入
import RAGUploadWithOCR from './components/rag/RAGUploadWithOCR';

// 添加 OCR 上传处理
const handleOCRUpload = async (textFile, ocrResult) => {
  await uploadDocumentToRAG(projectName, [textFile]);
  // 可选: 显示成功提示
  setSuccess(`OCR 识别成功: ${ocrResult.technology}`);
};

// 在上传区域使用
<RAGUploadWithOCR
  projectId={projectName}
  onUpload={handleUpload}
  onOCRUpload={handleOCRUpload}
/>
```

## 配置选项

### OCR 技术选择

两种组件都支持选择不同的 OCR 技术:

- **lighton**: LightOnOCR-2-1B (推荐)
- **tesseract**: Tesseract OCR
- **paddle**: PaddleOCR
- **easyocr**: EasyOCR

### 参数调整

可以在后端 API 调用时调整参数:

```javascript
{
  technology: 'lighton',
  max_tokens: 4096,  // 最大输出 tokens
  temperature: 0.2,  // 温度参数
  top_p: 0.9        // Top-p 采样
}
```

## 注意事项

1. **首次加载**: LightOnOCR-2-1B 首次使用需要下载模型(约 2GB)
2. **处理时间**: 大文件或复杂文档可能需要较长时间处理
3. **内存占用**: OCR 处理会占用较多内存,建议服务器有足够资源
4. **网络要求**: 首次下载模型需要稳定的网络连接
5. **GPU 加速**: 使用 GPU 可以显著提升处理速度

## 优化建议

1. **批量处理**: 对于多页 PDF,使用批量处理 API
2. **缓存结果**: 缓存已识别的文件,避免重复处理
3. **进度提示**: 显示处理进度,提升用户体验
4. **错误处理**: 完善的错误处理和重试机制
5. **资源限制**: 限制同时处理的文件数量

## 故障排除

### OCR 识别失败

检查:
1. 后端是否安装了必要的依赖
2. 模型是否成功加载
3. 图片格式是否支持
4. 网络连接是否正常

### 内存不足

解决方案:
1. 减少 `max_tokens` 参数
2. 使用较小的 OCR 模型
3. 增加服务器内存
4. 分批处理文件

### 识别结果不准确

尝试:
1. 调整 `temperature` 和 `top_p` 参数
2. 使用不同的 OCR 技术
3. 提高图片分辨率
4. 预处理图片(去噪、增强对比度)

## 示例代码

### 完整的 Chat 集成示例

```jsx
import React, { useState } from 'react';
import ChatInputWithOCR from './components/chat/ChatInputWithOCR';

function ChatInterface() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  const handleOCRResult = (text, fileName) => {
    // 将 OCR 结果添加到输入框
    setInput(prev => prev + `\n\n[OCR 识别结果 - ${fileName}]\n${text}\n`);
    
    // 可选: 自动添加一条系统消息
    setMessages(prev => [...prev, {
      type: 'system',
      content: `已识别图片 "${fileName}" 中的文字`,
      timestamp: new Date()
    }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    
    // 发送消息
    await sendMessage(input);
    
    setInput('');
    setIsLoading(false);
  };

  return (
    <div className="chat-interface">
      {/* 消息列表 */}
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id}>{msg.content}</div>
        ))}
      </div>

      {/* 输入框 */}
      <ChatInputWithOCR
        input={input}
        isLoading={isLoading}
        onOCRResult={handleOCRResult}
        handleSubmit={handleSubmit}
        // ... 其他 props
      />
    </div>
  );
}
```

### 完整的 RAG 集成示例

```jsx
import React, { useState } from 'react';
import RAGUploadWithOCR from './components/rag/RAGUploadWithOCR';
import { uploadDocumentToRAG } from '../utils/rag';

function RAGPanel({ projectName }) {
  const [success, setSuccess] = useState(null);

  const handleUpload = async (file) => {
    try {
      await uploadDocumentToRAG(projectName, [file]);
      setSuccess(`文件 "${file.name}" 上传成功`);
    } catch (error) {
      setSuccess(`文件上传失败: ${error.message}`);
    }
  };

  const handleOCRUpload = async (textFile, ocrResult) => {
    try {
      await uploadDocumentToRAG(projectName, [textFile]);
      setSuccess(`OCR 识别成功: ${ocrResult.technology} - ${ocrResult.format}`);
    } catch (error) {
      setSuccess(`OCR 上传失败: ${error.message}`);
    }
  };

  return (
    <div className="rag-panel">
      {/* 其他 RAG 功能 */}
      
      {/* 上传区域 */}
      <RAGUploadWithOCR
        projectId={projectName}
        onUpload={handleUpload}
        onOCRUpload={handleOCRUpload}
      />

      {/* 成功提示 */}
      {success && (
        <div className="success-message">
          {success}
        </div>
      )}
    </div>
  );
}
```

## 总结

通过集成 OCR 功能,你的项目现在可以:

1. ✅ 在 Chat 中识别图片文字
2. ✅ 在 RAG 中识别扫描文档
3. ✅ 支持多种 OCR 技术
4. ✅ 自动化处理流程
5. ✅ 提升用户体验

用户可以轻松地上传图片或 PDF,系统会自动识别文字,让 AI 能够理解和分析这些内容。
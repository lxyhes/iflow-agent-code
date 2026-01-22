/**
 * ChatInput with OCR Component
 * 带有 OCR 功能的聊天输入框组件
 */

import React, { useState, useRef, useCallback } from 'react';
import { Upload, Image as ImageIcon, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { authenticatedFetch } from '../../utils/api';

const ChatInputWithOCR = ({
  input,
  isLoading,
  textareaRef,
  getRootProps,
  getInputProps,
  handleInputChange,
  handleKeyDown,
  handlePaste,
  handleSubmit,
  isInputFocused,
  setIsInputFocused,
  provider,
  onOCRResult // 新增: OCR 结果回调
}) => {
  const [ocrImages, setOcrImages] = useState([]);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResults, setOcrResults] = useState({});
  const [showOCRSettings, setShowOCRSettings] = useState(false);
  const [selectedOCR Tech, setSelectedOCRTech] = useState('lighton');

  // 处理文件上传
  const handleFileUpload = useCallback(async (files) => {
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );

    if (imageFiles.length === 0) return;

    // 添加图片到列表
    const newImages = imageFiles.map(file => ({
      id: `img-${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending'
    }));

    setOcrImages(prev => [...prev, ...newImages]);

    // 处理 OCR
    for (const img of newImages) {
      await processOCR(img);
    }
  }, []);

  // 处理 OCR
  const processOCR = async (imageData) => {
    setOcrProcessing(true);
    setOcrImages(prev => prev.map(img => 
      img.id === imageData.id ? { ...img, status: 'processing' } : img
    ));

    try {
      // 转换为 base64
      const base64 = await fileToBase64(imageData.file);

      // 调用 OCR API
      const response = await authenticatedFetch('/api/ocr/process', {
        method: 'POST',
        body: JSON.stringify({
          image: base64,
          technology: selectedOCRTech,
          max_tokens: 4096
        }),
      });

      const data = await response.json();

      if (data.success) {
        setOcrResults(prev => ({
          ...prev,
          [imageData.id]: data
        }));

        setOcrImages(prev => prev.map(img => 
          img.id === imageData.id ? { ...img, status: 'completed' } : img
        ));

        // 通知父组件
        if (onOCRResult) {
          onOCRResult(data.text, imageData.file.name);
        }
      } else {
        throw new Error(data.error || 'OCR 处理失败');
      }
    } catch (error) {
      console.error('OCR 处理失败:', error);
      setOcrImages(prev => prev.map(img => 
        img.id === imageData.id ? { ...img, status: 'error', error: error.message } : img
      ));
    } finally {
      setOcrProcessing(false);
    }
  };

  // 文件转 base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // 移除图片
  const removeImage = (imageId) => {
    setOcrImages(prev => {
      const img = prev.find(i => i.id === imageId);
      if (img?.preview) {
        URL.revokeObjectURL(img.preview);
      }
      return prev.filter(i => i.id !== imageId);
    });
    setOcrResults(prev => {
      const newResults = { ...prev };
      delete newResults[imageId];
      return newResults;
    });
  };

  // 处理拖拽上传
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  }, [handleFileUpload]);

  // 处理粘贴
  const handlePasteWithOCR = useCallback((e) => {
    // 先调用原有的粘贴处理
    if (handlePaste) {
      handlePaste(e);
    }

    // 检查是否有图片
    const items = e.clipboardData?.items;
    if (items) {
      const files = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          files.push(items[i].getAsFile());
        }
      }
      if (files.length > 0) {
        handleFileUpload(files);
      }
    }
  }, [handlePaste, handleFileUpload]);

  return (
    <div className="flex-1">
      <form onSubmit={(e) => handleSubmit(e)} className="relative">
        {/* OCR 图片预览区 */}
        {ocrImages.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {ocrImages.map(img => (
              <div key={img.id} className="relative group">
                <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                  <img
                    src={img.preview}
                    alt="OCR preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* 状态指示器 */}
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center">
                  {img.status === 'processing' && (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Loader2 className="w-3 h-3 text-white animate-spin" />
                    </div>
                  )}
                  {img.status === 'completed' && (
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {img.status === 'error' && (
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>

                {/* OCR 结果提示 */}
                {img.status === 'completed' && ocrResults[img.id] && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs px-2 py-1 bg-black/70 rounded">
                      已识别
                    </span>
                  </div>
                )}
              </div>
            ))}

            {/* OCR 设置按钮 */}
            <button
              type="button"
              onClick={() => setShowOCRSettings(!showOCRSettings)}
              className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400 mt-1">OCR</span>
            </button>
          </div>
        )}

        {/* OCR 设置面板 */}
        {showOCRSettings && (
          <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                OCR 设置
              </span>
              <button
                onClick={() => setShowOCRSettings(false)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <select
              value={selectedOCRTech}
              onChange={(e) => setSelectedOCRTech(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
            >
              <option value="lighton">LightOnOCR-2-1B (推荐)</option>
              <option value="tesseract">Tesseract OCR</option>
              <option value="paddle">PaddleOCR</option>
              <option value="easyocr">EasyOCR</option>
            </select>
          </div>
        )}

        <div
          {...getRootProps()}
          onDrop={handleDrop}
          className={`relative backdrop-blur-xl rounded-2xl border transition-all duration-300 overflow-hidden group ${
            isInputFocused
              ? 'bg-white/80 dark:bg-gray-800/80 border-blue-400/50 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20'
              : 'bg-white/60 dark:bg-gray-800/60 border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md hover:border-blue-300/30'
          }`}
        >
          <input {...getInputProps()} />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePasteWithOCR}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            placeholder={`Ask ${provider === 'cursor' ? 'Cursor' : 'IFlow'} anything...`}
            disabled={isLoading}
            className="block w-full px-4 py-3 bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 disabled:opacity-50 resize-none min-h-[60px] max-h-[400px] placeholder-gray-400 dark:placeholder-gray-500"
          />

          {/* 拖拽上传提示 */}
          <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="text-blue-600 dark:text-blue-400 text-sm font-medium">
              Drop files here to upload
            </div>
          </div>

          {/* 发送按钮 */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`absolute right-2 bottom-2 w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all duration-300 ${
              !input.trim() || isLoading
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105 active:scale-95'
            }`}
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>

          {/* 装饰性渐变边框 */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500 pointer-events-none" />
        </div>

        {/* 底部提示 */}
        <div className="flex items-center justify-between mt-2 px-2 text-xs text-gray-400 dark:text-gray-500">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-medium">Enter</kbd>
              <span>发送</span>
            </span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-medium">Shift + Enter</kbd>
              <span>换行</span>
            </span>
            {ocrProcessing && (
              <>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>OCR 处理中...</span>
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>支持拖拽上传 · OCR 自动识别</span>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatInputWithOCR;
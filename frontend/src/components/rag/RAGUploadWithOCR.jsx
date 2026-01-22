/**
 * RAG Upload with OCR Component
 * 带有 OCR 功能的 RAG 文档上传组件
 */

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon, FileText, Sparkles, Settings } from 'lucide-react';

const RAGUploadWithOCR = ({
  onUpload,
  onOCRUpload,
  projectId,
  disabled = false
}) => {
  const [files, setFiles] = useState([]);
  const [ocrMode, setOcrMode] = useState(false);
  const [ocrTech, setOcrTech] = useState('lighton');
  const [showSettings, setShowSettings] = useState(false);
  const [processing, setProcessing] = useState({});
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const processFile = async (file) => {
    const fileId = `${file.name}-${Date.now()}`;
    setProcessing(prev => ({ ...prev, [fileId]: true }));

    try {
      if (ocrMode && file.type.startsWith('image/')) {
        // OCR 模式: 处理图片
        const base64 = await fileToBase64(file);
        
        const response = await fetch('/api/ocr/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64,
            technology: ocrTech,
            max_tokens: 4096
          }),
        });

        const data = await response.json();

        if (data.success && onOCRUpload) {
          // 将 OCR 结果作为文本文件上传
          const textBlob = new Blob([data.text], { type: 'text/plain' });
          const textFile = new File([textBlob], `${file.name}_ocr.txt`, { type: 'text/plain' });
          await onOCRUpload(textFile, data);
        }
      } else if (ocrMode && file.type === 'application/pdf') {
        // OCR 模式: 处理 PDF
        const base64 = await fileToBase64(file);
        
        const response = await fetch('/api/ocr/process-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdf_data: base64,
            technology: ocrTech,
            max_tokens: 4096
          }),
        });

        const data = await response.json();

        if (data.success && onOCRUpload) {
          // 将 OCR 结果作为文本文件上传
          const textBlob = new Blob([data.text], { type: 'text/plain' });
          const textFile = new File([textBlob], `${file.name}_ocr.txt`, { type: 'text/plain' });
          await onOCRUpload(textFile, data);
        }
      } else {
        // 普通模式: 直接上传
        if (onUpload) {
          await onUpload(file);
        }
      }
    } catch (error) {
      console.error('文件处理失败:', error);
      alert(`文件处理失败: ${error.message}`);
    } finally {
      setProcessing(prev => {
        const newProcessing = { ...prev };
        delete newProcessing[fileId];
        return newProcessing;
      });
    }
  };

  const handleUploadAll = async () => {
    for (const file of files) {
      await processFile(file);
    }
    setFiles([]);
  };

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

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4" />;
    }
    if (file.type === 'application/pdf') {
      return <FileText className="w-4 h-4" />;
    }
    return <Sparkles className="w-4 h-4" />;
  };

  const isImageOrPDF = (file) => {
    return file.type.startsWith('image/') || file.type === 'application/pdf';
  };

  return (
    <div className="space-y-4">
      {/* OCR 开关 */}
      <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={ocrMode}
              onChange={(e) => setOcrMode(e.target.checked)}
              className="w-4 h-4 text-indigo-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              启用 OCR 识别
            </span>
          </label>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            (自动识别图片和 PDF 中的文字)
          </span>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </button>
      </div>

      {/* OCR 设置 */}
      {showSettings && (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              OCR 技术
            </label>
            <select
              value={ocrTech}
              onChange={(e) => setOcrTech(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
            >
              <option value="lighton">LightOnOCR-2-1B (推荐)</option>
              <option value="tesseract">Tesseract OCR</option>
              <option value="paddle">PaddleOCR</option>
              <option value="easyocr">EasyOCR</option>
            </select>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <p>• LightOnOCR-2-1B: 支持 Markdown 输出,数学公式识别</p>
            <p>• Tesseract: 开源,多语言支持</p>
            <p>• PaddleOCR: 中文识别优秀</p>
            <p>• EasyOCR: 简单易用</p>
          </div>
        </div>
      )}

      {/* 文件上传区 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
          id="rag-file-upload-with-ocr"
        />
        <label
          htmlFor="rag-file-upload-with-ocr"
          className="flex flex-col items-center justify-center cursor-pointer"
        >
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            点击选择或拖拽文件
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            支持代码、Markdown、PDF、图片等
            {ocrMode && ' · 图片/PDF 将自动进行 OCR 识别'}
          </p>
        </label>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {files.map((file, index) => {
            const fileId = `${file.name}-${index}`;
            const isProcessing = processing[fileId];
            const canOCR = ocrMode && isImageOrPDF(file);
            
            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-white dark:bg-gray-700 rounded-lg">
                    {getFileIcon(file)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(file.size / 1024).toFixed(2)} KB
                      {canOCR && ' · 将进行 OCR 识别'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isProcessing && (
                    <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                  )}
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 上传按钮 */}
      {files.length > 0 && (
        <button
          onClick={handleUploadAll}
          disabled={disabled || Object.keys(processing).length > 0}
          className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {Object.keys(processing).length > 0 ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              处理中...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              上传{ocrMode ? '并识别' : ''}
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default RAGUploadWithOCR;
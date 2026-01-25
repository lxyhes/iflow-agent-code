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
      <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={ocrMode}
              onChange={(e) => setOcrMode(e.target.checked)}
              className="w-4 h-4 text-indigo-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 transition-colors"
            />
            <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              启用 OCR 识别
            </span>
          </label>
          <span className="text-[10px] uppercase font-black text-indigo-500/60 dark:text-indigo-400/40 tracking-widest bg-white dark:bg-indigo-950/30 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800/30">
            Auto-Detect
          </span>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-1.5 rounded-lg transition-all ${
            showSettings 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
              : 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800/50'
          }`}
          title="OCR 设置"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* OCR 设置 */}
      {showSettings && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">
              OCR Engine / 技术引擎
            </label>
            <select
              value={ocrTech}
              onChange={(e) => setOcrTech(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
            >
              <option value="lighton">LightOnOCR-2-1B (推荐)</option>
              <option value="tesseract">Tesseract OCR</option>
              <option value="paddle">PaddleOCR</option>
              <option value="easyocr">EasyOCR</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { label: 'LightOn', desc: 'Markdown支持, 公式识别', color: 'bg-blue-500' },
              { label: 'Paddle', desc: '中文识别优秀', color: 'bg-emerald-500' },
              { label: 'Tesseract', desc: '开源多语言支持', color: 'bg-purple-500' },
              { label: 'EasyOCR', desc: '简单易用', color: 'bg-orange-500' }
            ].map((tech, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                <div className={`w-1 h-full min-h-[24px] rounded-full ${tech.color}`} />
                <div>
                  <p className="text-[10px] font-bold text-gray-900 dark:text-white leading-none mb-1">{tech.label}</p>
                  <p className="text-[9px] text-gray-500 dark:text-gray-500">{tech.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 文件上传区 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="group relative border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-[2rem] p-10 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 transition-all duration-300 overflow-hidden"
      >
        <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        
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
          className="relative flex flex-col items-center justify-center cursor-pointer"
        >
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-inner border border-gray-200 dark:border-gray-700">
            <Upload className="w-10 h-10 text-gray-400 group-hover:text-indigo-500 transition-colors" />
          </div>
          <p className="text-lg font-black text-gray-900 dark:text-white mb-2 tracking-tight">
            点击选择或拖拽文件
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs text-center leading-relaxed">
            支持代码、Markdown、PDF、图片等
            {ocrMode && <span className="block mt-1 font-bold text-indigo-500 dark:text-indigo-400">✨ 图片/PDF 将自动进行智能 OCR 识别</span>}
          </p>
        </label>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-2">
          {files.map((file, index) => {
            const fileId = `${file.name}-${index}`;
            const isProcessing = processing[fileId];
            const canOCR = ocrMode && isImageOrPDF(file);
            
            return (
              <div
                key={index}
                className="group flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors border border-gray-100 dark:border-gray-800">
                    {getFileIcon(file)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </span>
                      {canOCR && (
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter">
                          Ready for OCR
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isProcessing && (
                    <div className="flex items-center gap-2 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                      <Loader2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400 animate-spin" />
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Processing</span>
                    </div>
                  )}
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-all"
                  >
                    <X className="w-4 h-4" />
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
          className="group w-full p-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-[1.5rem] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 active:scale-95"
        >
          {Object.keys(processing).length > 0 ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="tracking-tight uppercase text-sm">Synchronizing Data...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
              <span className="tracking-tight uppercase text-sm">上传并集成{ocrMode ? '识别' : ''}结果</span>
            </>
          )}
        </button>
      )}
    </div>
  );
  );
};

export default RAGUploadWithOCR;
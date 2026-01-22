/**
 * OCR 处理组件
 * 支持多种 OCR 技术的选择和图片/PDF 处理
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload, FileText, Image as ImageIcon, Download, Copy, CheckCircle2,
  Loader2, AlertCircle, Settings, Sparkles, Zap, BookOpen, Eye,
  ChevronDown, X, RefreshCw, Trash2
} from 'lucide-react';
import { authenticatedFetch } from '../utils/api';
import ReactMarkdown from 'react-markdown';

const OCRProcessor = () => {
  const [technologies, setTechnologies] = useState([]);
  const [selectedTechnology, setSelectedTechnology] = useState('lighton');
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // OCR 参数
  const [maxTokens, setMaxTokens] = useState(4096);
  const [temperature, setTemperature] = useState(0.2);
  const [topP, setTopP] = useState(0.9);

  // 加载支持的 OCR 技术
  useEffect(() => {
    loadTechnologies();
  }, []);

  const loadTechnologies = async () => {
    try {
      const response = await authenticatedFetch('/api/ocr/technologies');
      if (response.ok) {
        const data = await response.json();
        setTechnologies(data.technologies || []);
      }
    } catch (err) {
      console.error('加载 OCR 技术失败:', err);
      setError('加载 OCR 技术失败');
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // 移除 data:image/xxx;base64, 前缀
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const processOCR = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setProgress(0);

    try {
      const base64 = await fileToBase64(file);
      const isPDF = file.type === 'application/pdf';
      
      const endpoint = isPDF ? '/api/ocr/process-pdf' : '/api/ocr/process';
      const payload = isPDF 
        ? {
            pdf_data: base64,
            technology: selectedTechnology,
            max_tokens: maxTokens,
            temperature: temperature,
            top_p: topP
          }
        : {
            image: base64,
            technology: selectedTechnology,
            max_tokens: maxTokens,
            temperature: temperature,
            top_p: topP
          };

      // 模拟进度
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await authenticatedFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'OCR 处理失败');
      }
    } catch (err) {
      console.error('OCR 处理失败:', err);
      setError('OCR 处理失败: ' + err.message);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const copyToClipboard = () => {
    if (result?.text) {
      navigator.clipboard.writeText(result.text);
      // 可以添加复制成功的提示
    }
  };

  const downloadResult = () => {
    if (result?.text) {
      const blob = new Blob([result.text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ocr_result_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getTechnologyIcon = (tech) => {
    switch (tech.id) {
      case 'lighton':
        return <Sparkles className="w-5 h-5" />;
      case 'tesseract':
        return <BookOpen className="w-5 h-5" />;
      case 'paddle':
        return <Zap className="w-5 h-5" />;
      case 'easyocr':
        return <Eye className="w-5 h-5" />;
      default:
        return <ImageIcon className="w-5 h-5" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* 头部 */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ImageIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                OCR 文字识别
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                智能图片/PDF 文字提取工具
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                技术选择
              </label>
              <select
                value={selectedTechnology}
                onChange={(e) => setSelectedTechnology(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {technologies.map(tech => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name} {tech.recommended && '(推荐)'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                最大 Tokens
              </label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                温度
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full flex flex-col lg:flex-row gap-6">
          {/* 左侧: 文件上传区 */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 flex flex-col items-center justify-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                 onDrop={handleDrop}
                 onDragOver={handleDragOver}>
              {file ? (
                <div className="text-center">
                  <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full inline-block mb-4">
                    <FileText className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {file.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                  <button
                    onClick={() => setFile(null)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 inline mr-2" />
                    移除文件
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full inline-block mb-4">
                    <Upload className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    拖拽文件到这里
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    或者点击选择文件
                  </p>
                  <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors">
                    选择文件
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* 处理按钮 */}
            <div className="mt-4">
              <button
                onClick={processOCR}
                disabled={!file || isProcessing}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    处理中... {progress}%
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    开始识别
                  </>
                )}
              </button>
            </div>

            {/* 技术信息 */}
            {technologies.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  当前技术: {technologies.find(t => t.id === selectedTechnology)?.name}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {technologies.find(t => t.id === selectedTechnology)?.features.map((feature, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 右侧: 结果展示区 */}
          <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                识别结果
              </h3>
              {result && (
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    title="复制"
                  >
                    <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={downloadResult}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    title="下载"
                  >
                    <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                      处理失败
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {result && result.success && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {result.format === 'markdown' ? (
                    <ReactMarkdown>{result.text}</ReactMarkdown>
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-gray-100">
                      {result.text}
                    </pre>
                  )}
                </div>
              )}

              {!result && !error && !isProcessing && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="p-4 bg-gray-200 dark:bg-gray-700 rounded-full mb-4">
                    <FileText className="w-12 h-12 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">
                    上传文件后点击"开始识别"查看结果
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OCRProcessor;
import React, { useState } from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  Download,
  Loader,
  CheckCircle,
  Copy,
  Check
} from 'lucide-react';

/**
 * 文档生成器组件
 * 支持生成 PDF、Word、PPT 文档
 */
const DocumentGenerator = () => {
  const [activeTab, setActiveTab] = useState('pdf'); // pdf, word, ppt
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState('default');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // 生成 PDF
  const handleGeneratePdf = async () => {
    if (!content.trim()) {
      alert('请输入内容');
      return;
    }

    setGenerating(true);
    setResult(null);

    try {
      const response = await fetch('/api/document/generate/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title, template })
      });

      if (!response.ok) throw new Error('生成失败');
      
      const data = await response.json();
      setResult(data);

    } catch (error) {
      alert('生成失败：' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  // 生成 Word
  const handleGenerateWord = async () => {
    if (!content.trim()) {
      alert('请输入内容');
      return;
    }

    setGenerating(true);
    setResult(null);

    try {
      const response = await fetch('/api/document/generate/word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title })
      });

      if (!response.ok) throw new Error('生成失败');
      
      const data = await response.json();
      setResult(data);

    } catch (error) {
      alert('生成失败：' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  // 生成 PPT
  const handleGeneratePpt = async () => {
    if (!content.trim()) {
      alert('请输入 Markdown 内容');
      return;
    }

    setGenerating(true);
    setResult(null);

    try {
      const response = await fetch('/api/document/generate/ppt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: content, template })
      });

      if (!response.ok) throw new Error('生成失败');
      
      const data = await response.json();
      setResult(data);

    } catch (error) {
      alert('生成失败：' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  // 下载文档
  const handleDownload = () => {
    if (result?.downloadUrl) {
      window.open(result.downloadUrl, '_blank');
    }
  };

  // 复制内容
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 插入模板
  const insertTemplate = (type) => {
    const templates = {
      report: `# 项目报告

## 项目概述
这里是项目的基本描述...

## 主要成果
- 成果 1
- 成果 2
- 成果 3

## 数据分析
详细的数据分析内容...

## 下一步计划
1. 计划 1
2. 计划 2
3. 计划 3`,
      meeting: `# 会议纪要

## 会议信息
- 时间：2026 年 2 月 23 日
- 地点：会议室 A
- 参会人员：...

## 讨论议题
### 议题 1
讨论内容...

### 议题 2
讨论内容...

## 决议事项
1. 决议 1
2. 决议 2

## 待办事项
- [ ] 任务 1
- [ ] 任务 2
- [ ] 任务 3`,
      proposal: `# 项目提案

## 背景
项目背景描述...

## 目标
- 目标 1
- 目标 2
- 目标 3

## 方案
详细方案描述...

## 预算
预算详情...

## 时间表
- 阶段 1：第 1-2 周
- 阶段 2：第 3-4 周
- 阶段 3：第 5-8 周`
    };
    setContent(templates[type] || '');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        文档生成器
      </h1>

      {/* 选项卡 */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('pdf')}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'pdf'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          PDF
        </button>
        <button
          onClick={() => setActiveTab('word')}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'word'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Word
        </button>
        <button
          onClick={() => setActiveTab('ppt')}
          className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'ppt'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Presentation className="w-4 h-4" />
          PPT
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 左侧：输入区域 */}
        <div className="space-y-4">
          {/* 标题输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              文档标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入文档标题"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* 模板选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              快速模板
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => insertTemplate('report')}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                项目报告
              </button>
              <button
                onClick={() => insertTemplate('meeting')}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                会议纪要
              </button>
              <button
                onClick={() => insertTemplate('proposal')}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                项目提案
              </button>
            </div>
          </div>

          {/* 内容输入 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                文档内容 (支持 Markdown)
              </label>
              <button
                onClick={handleCopy}
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? '已复制' : '复制'}
              </button>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入文档内容，支持 Markdown 格式..."
              rows={15}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm resize-y"
            />
          </div>

          {/* 生成按钮 */}
          <button
            onClick={
              activeTab === 'pdf' ? handleGeneratePdf :
              activeTab === 'word' ? handleGenerateWord :
              handleGeneratePpt
            }
            disabled={generating || !content.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
          >
            {generating ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                {activeTab === 'pdf' ? <FileText className="w-5 h-5" /> :
                 activeTab === 'word' ? <FileSpreadsheet className="w-5 h-5" /> :
                 <Presentation className="w-5 h-5" />}
                生成{activeTab === 'pdf' ? 'PDF' : activeTab === 'word' ? 'Word' : 'PPT'}
              </>
            )}
          </button>
        </div>

        {/* 右侧：结果区域 */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">
            生成结果
          </h3>

          {!result && (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>暂无生成结果</p>
                <p className="text-sm mt-2">输入内容并点击生成按钮</p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">生成成功</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">文件名</div>
                  <div className="font-medium text-gray-900 dark:text-white">{result.fileName}</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">文件大小</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {(result.fileSize / 1024).toFixed(2)} KB
                  </div>
                </div>
                {result.slideCount && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400">幻灯片数</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {result.slideCount} 页
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleDownload}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                下载文档
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentGenerator;

/**
 * DocGeneratorPanel.jsx - 智能文档生成面板
 * 
 * 支持 API 文档、README、代码注释的自动生成
 */

import React, { useState, useCallback } from 'react';
import { FileText, Book, MessageSquare, Download, Copy, Check, RefreshCw, X, Code, File } from 'lucide-react';
import { authenticatedFetch } from '../utils/api';

const DocGeneratorPanel = ({ 
  projectName, 
  filePaths, 
  visible, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState('readme');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [copied, setCopied] = useState(false);

  // 生成 API 文档
  const generateApiDocs = useCallback(async () => {
    if (!projectName || !filePaths || filePaths.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/docs/generate-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_name: projectName,
          file_paths: filePaths
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedContent(data.docs);
      } else {
        setError('生成 API 文档失败');
      }
    } catch (err) {
      setError(`生成 API 文档失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [projectName, filePaths]);

  // 生成 README
  const generateReadme = useCallback(async () => {
    if (!projectName || !filePaths || filePaths.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/docs/generate-readme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_name: projectName,
          file_paths: filePaths
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedContent(data.readme);
      } else {
        setError('生成 README 失败');
      }
    } catch (err) {
      setError(`生成 README 失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [projectName, filePaths]);

  // 生成代码注释
  const generateComments = useCallback(async (filePath) => {
    if (!projectName || !filePath) return;

    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/docs/generate-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_name: projectName,
          file_path: filePath
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedContent(data.comments);
      } else {
        setError('生成代码注释失败');
      }
    } catch (err) {
      setError(`生成代码注释失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [projectName]);

  // 切换标签时重新生成
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setGeneratedContent(null);
    
    if (tab === 'api') {
      generateApiDocs();
    } else if (tab === 'readme') {
      generateReadme();
    }
  };

  // 复制内容
  const handleCopy = () => {
    if (!generatedContent) return;

    const content = JSON.stringify(generatedContent, null, 2);
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 下载内容
  const handleDownload = () => {
    if (!generatedContent) return;

    let filename = '';
    let content = '';

    if (activeTab === 'api') {
      filename = 'api-docs.json';
      content = JSON.stringify(generatedContent, null, 2);
    } else if (activeTab === 'readme') {
      filename = 'README.md';
      content = formatReadme(generatedContent);
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 格式化 README
  const formatReadme = (readme) => {
    let content = `# ${readme.title}\n\n`;
    
    if (readme.description) {
      content += `${readme.description}\n\n`;
    }
    
    if (readme.features && readme.features.length > 0) {
      content += '## 功能特性\n\n';
      readme.features.forEach(feature => {
        content += `- ${feature}\n`;
      });
      content += '\n';
    }
    
    if (readme.installation) {
      content += '## 安装\n\n' + readme.installation + '\n\n';
    }
    
    if (readme.usage) {
      content += '## 使用\n\n' + readme.usage + '\n\n';
    }
    
    if (readme.structure && readme.structure.length > 0) {
      content += '## 项目结构\n\n';
      readme.structure.forEach(item => {
        content += `- ${item.path}\n`;
      });
      content += '\n';
    }
    
    return content;
  };

  if (!visible) return null;

  return (
    <div className="fixed right-4 top-20 w-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] overflow-hidden flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">智能文档生成</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* 标签页 */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => handleTabChange('readme')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'readme'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Book className="w-4 h-4" />
          README
        </button>
        <button
          onClick={() => handleTabChange('api')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'api'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Code className="w-4 h-4" />
          API 文档
        </button>
        <button
          onClick={() => handleTabChange('comments')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'comments'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          代码注释
        </button>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">生成中...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          </div>
        ) : !generatedContent ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              点击标签开始生成文档
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* README 内容 */}
            {activeTab === 'readme' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{generatedContent.title}</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      {copied ? '已复制' : '复制'}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      下载
                    </button>
                  </div>
                </div>
                
                <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
                  {formatReadme(generatedContent)}
                </pre>
              </div>
            )}

            {/* API 文档内容 */}
            {activeTab === 'api' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{generatedContent.title}</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      {copied ? '已复制' : '复制'}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      下载
                    </button>
                  </div>
                </div>

                {generatedContent.endpoints && generatedContent.endpoints.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">API 端点</h5>
                    {generatedContent.endpoints.map((endpoint, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 text-xs font-bold rounded ${
                            endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                            endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                            endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                            endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {endpoint.method}
                          </span>
                          <span className="font-mono text-sm text-gray-900 dark:text-white">{endpoint.path}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {endpoint.name} - {endpoint.file}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {generatedContent.models && generatedContent.models.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">数据模型</h5>
                    {generatedContent.models.map((model, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="font-mono text-sm text-gray-900 dark:text-white">{model.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{model.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 代码注释内容 */}
            {activeTab === 'comments' && (
              <div>
                {generatedContent.suggestions && generatedContent.suggestions.length > 0 ? (
                  <div className="space-y-2">
                    {generatedContent.suggestions.map((suggestion, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          {suggestion.type === 'function' && <Code className="w-4 h-4 text-green-500" />}
                          {suggestion.type === 'method' && <File className="w-4 h-4 text-blue-500" />}
                          <span className="font-mono text-sm text-gray-900 dark:text-white">{suggestion.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">行 {suggestion.line}</span>
                        </div>
                        <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                          {suggestion.suggestion}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      没有找到需要添加注释的函数
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocGeneratorPanel;

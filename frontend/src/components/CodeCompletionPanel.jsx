/**
 * CodeCompletionPanel.jsx - 智能代码补全面板
 * 
 * 基于项目上下文的智能代码补全建议
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Lightbulb, Zap, Code, File, X, RefreshCw, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { authenticatedFetch } from '../utils/api';

const CodeCompletionPanel = ({ 
  projectName, 
  filePath, 
  content, 
  line, 
  column, 
  visible, 
  onClose, 
  onApplySuggestion 
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [triggerCharacter, setTriggerCharacter] = useState(null);

  // 获取补全建议
  const fetchSuggestions = useCallback(async () => {
    if (!projectName || !filePath || !content || !visible) return;

    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_name: projectName,
          file_path: filePath,
          content: content,
          line_number: line,
          column: column,
          trigger_character: triggerCharacter
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } else {
        setError('获取补全建议失败');
      }
    } catch (err) {
      setError(`获取补全建议失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [projectName, filePath, content, line, column, triggerCharacter, visible]);

  // 监听内容变化和位置变化
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        fetchSuggestions();
      }, 300); // 防抖 300ms

      return () => clearTimeout(timer);
    }
  }, [content, line, column, visible, fetchSuggestions]);

  // 应用建议
  const handleApply = (suggestion) => {
    if (onApplySuggestion) {
      onApplySuggestion(suggestion);
    }
  };

  // 刷新建议
  const handleRefresh = () => {
    fetchSuggestions();
  };

  // 清除缓存
  const handleClearCache = async () => {
    try {
      await authenticatedFetch('/api/completion/clear-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      fetchSuggestions();
    } catch (err) {
      console.error('清除缓存失败:', err);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed right-4 top-20 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] overflow-hidden flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">智能补全</h3>
          {suggestions.length > 0 && (
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
              {suggestions.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="刷新"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="关闭"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">分析中...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            <button
              onClick={handleClearCache}
              className="mt-4 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              清除缓存重试
            </button>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              没有找到合适的补全建议
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              尝试输入更多代码或移动光标位置
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.id || index}
                className={`bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all ${
                  expandedId === suggestion.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {/* 标题 */}
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setExpandedId(expandedId === suggestion.id ? null : suggestion.id)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {suggestion.type === 'function' && <Code className="w-4 h-4 text-green-500 flex-shrink-0" />}
                    {suggestion.type === 'variable' && <File className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                    {suggestion.type === 'snippet' && <Zap className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                    
                    <span className="font-mono text-sm text-gray-900 dark:text-white truncate">
                      {suggestion.label}
                    </span>
                    
                    {suggestion.confidence && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {Math.round(suggestion.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApply(suggestion);
                      }}
                      className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
                      title="应用"
                    >
                      <Check className="w-4 h-4 text-blue-500" />
                    </button>
                    {expandedId === suggestion.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                </div>

                {/* 详情 */}
                {expandedId === suggestion.id && (
                  <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700">
                    <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono overflow-x-auto">
                      <code>{suggestion.insert_text}</code>
                    </pre>
                    
                    {suggestion.documentation && (
                      <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        {suggestion.documentation}
                      </p>
                    )}
                    
                    {suggestion.context && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">上下文:</p>
                        <pre className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                          {suggestion.context}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部 */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          基于 RAG + 代码分析的智能补全
        </p>
      </div>
    </div>
  );
};

export default CodeCompletionPanel;
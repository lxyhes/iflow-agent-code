import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Info, X, Filter, RefreshCw, Lightbulb, Shield, Zap, Wrench, Search } from 'lucide-react';

const RefactorSuggestionPanel = ({ projectName, fileContent, filePath, onClose }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, critical, high, medium, low
  const [categoryFilter, setCategoryFilter] = useState('all'); // all, performance, readability, maintainability, security, best-practice
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [summary, setSummary] = useState(null);

  // 分析重构建议
  const analyzeRefactor = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedSuggestion(null);

    try {
      const response = await fetch('/api/refactor/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: filePath || 'unknown.js',
          content: fileContent || '',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuggestions(data.suggestions);
        setSummary(data.summary);
      } else {
        setError(data.error || '分析失败');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fileContent, filePath]);

  // 初始化分析
  useEffect(() => {
    if (fileContent) {
      analyzeRefactor();
    }
  }, [fileContent, analyzeRefactor]);

  // 过滤建议
  const filteredSuggestions = suggestions.filter(s => {
    if (filter !== 'all' && s.severity !== filter) return false;
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
    return true;
  });

  // 获取严重性图标和颜色
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <Info className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'high':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'low':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  // 获取类别图标
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'performance':
        return <Zap className="w-4 h-4" />;
      case 'readability':
        return <Lightbulb className="w-4 h-4" />;
      case 'maintainability':
        return <Wrench className="w-4 h-4" />;
      case 'security':
        return <Shield className="w-4 h-4" />;
      case 'best-practice':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">重构建议</h2>
          </div>

          {summary && (
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1 text-red-400">
                <AlertTriangle size={14} />
                <span>{summary.critical}</span>
              </div>
              <div className="flex items-center gap-1 text-orange-400">
                <AlertTriangle size={14} />
                <span>{summary.high}</span>
              </div>
              <div className="flex items-center gap-1 text-yellow-400">
                <Info size={14} />
                <span>{summary.medium}</span>
              </div>
              <div className="flex items-center gap-1 text-blue-400">
                <Info size={14} />
                <span>{summary.low}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={analyzeRefactor}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="重新分析"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-800/50 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="all">所有严重性</option>
            <option value="critical">严重</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:outline-none focus:border-blue-500"
          >
            <option value="all">所有类别</option>
            <option value="performance">性能</option>
            <option value="readability">可读性</option>
            <option value="maintainability">可维护性</option>
            <option value="security">安全性</option>
            <option value="best-practice">最佳实践</option>
          </select>
        </div>

        <div className="flex-1"></div>

        <div className="text-sm text-gray-400">
          显示 {filteredSuggestions.length} / {suggestions.length} 条建议
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">正在分析代码...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">{error}</p>
              <button
                onClick={analyzeRefactor}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                重试
              </button>
            </div>
          </div>
        )}

        {!loading && !error && filteredSuggestions.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-400">没有发现重构建议</p>
            </div>
          </div>
        )}

        {!loading && !error && filteredSuggestions.length > 0 && (
          <div className="flex h-full">
            {/* 建议列表 */}
            <div className="w-1/2 overflow-y-auto p-4 space-y-3">
              {filteredSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedSuggestion(suggestion)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedSuggestion === suggestion
                      ? 'bg-gray-700 border-blue-500'
                      : 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(suggestion.severity)}
                      <span className="text-sm font-medium text-white">
                        {suggestion.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getCategoryIcon(suggestion.category)}
                      <span className="text-xs text-gray-400 capitalize">
                        {suggestion.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-400 mb-2">{suggestion.description}</p>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded border ${getSeverityColor(
                        suggestion.severity
                      )}`}
                    >
                      {suggestion.severity}
                    </span>
                    <span className="text-xs text-gray-500">
                      行 {suggestion.line_number}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 建议详情 */}
            <div className="w-1/2 border-l border-gray-700 overflow-y-auto p-4">
              {selectedSuggestion ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                      {selectedSuggestion.title}
                    </h3>
                    <button
                      onClick={() => setSelectedSuggestion(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {getSeverityIcon(selectedSuggestion.severity)}
                      <span className="text-sm font-medium text-gray-300">严重性</span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded border ${getSeverityColor(
                          selectedSuggestion.severity
                        )}`}
                      >
                        {selectedSuggestion.severity}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {getCategoryIcon(selectedSuggestion.category)}
                      <span className="text-sm font-medium text-gray-300">类别</span>
                      <span className="text-sm text-gray-400 capitalize">
                        {selectedSuggestion.category}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">描述</h4>
                    <p className="text-sm text-gray-400">
                      {selectedSuggestion.description}
                    </p>
                  </div>

                  {selectedSuggestion.code_snippet && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">代码片段</h4>
                      <pre className="bg-gray-800 p-3 rounded-lg text-sm text-gray-300 overflow-x-auto">
                        <code>{selectedSuggestion.code_snippet}</code>
                      </pre>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-2">建议修复</h4>
                    <p className="text-sm text-gray-400">
                      {selectedSuggestion.suggested_fix}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-700">
                    <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                      应用修复
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">选择一个建议查看详情</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RefactorSuggestionPanel;
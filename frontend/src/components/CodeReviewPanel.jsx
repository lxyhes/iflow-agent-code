/**
 * CodeReviewPanel.jsx - AI 代码审查助手面板
 * 
 * 支持代码质量检查、风格检查、安全漏洞检测
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, X, Filter, FileCode, Bug, Zap, Code, TrendingUp } from 'lucide-react';
import { authenticatedFetch } from '../utils/api';

const CodeReviewPanel = ({ 
  projectName, 
  filePath, 
  content, 
  visible, 
  onClose, 
  onFixIssue 
}) => {
  const [issues, setIssues] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [expandedIssueId, setExpandedIssueId] = useState(null);

  // 审查代码
  const reviewCode = useCallback(async () => {
    if (!projectName || !filePath || !content || !visible) return;

    setLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch('/api/review/code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_name: projectName,
          file_path: filePath,
          check_types: ['quality', 'style', 'security', 'performance']
        })
      });

      if (response.ok) {
        const data = await response.json();
        setIssues(data.issues || []);
        setSummary(data.summary || {});
      } else {
        const errorData = await response.json();
        setError(errorData.error || '代码审查失败');
      }
    } catch (err) {
      setError(`代码审查失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [projectName, filePath, content, visible]);

  // 监听内容变化
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        reviewCode();
      }, 500); // 防抖 500ms

      return () => clearTimeout(timer);
    }
  }, [content, visible, reviewCode]);

  // 过滤问题
  const filteredIssues = issues.filter(issue => {
    if (filterSeverity !== 'all' && issue.severity !== filterSeverity) {
      return false;
    }
    if (filterCategory !== 'all' && issue.category !== filterCategory) {
      return false;
    }
    return true;
  });

  // 获取严重程度图标
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // 获取类别图标
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'quality':
        return <Code className="w-4 h-4 text-purple-500" />;
      case 'style':
        return <Code className="w-4 h-4 text-pink-500" />;
      case 'security':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'performance':
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'best_practice':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      default:
        return <Bug className="w-4 h-4 text-gray-500" />;
    }
  };

  // 获取严重程度标签
  const getSeverityLabel = (severity) => {
    const labels = {
      critical: '严重',
      high: '高',
      medium: '中',
      low: '低',
      info: '信息'
    };
    return labels[severity] || severity;
  };

  // 获取类别标签
  const getCategoryLabel = (category) => {
    const labels = {
      quality: '代码质量',
      style: '代码风格',
      security: '安全问题',
      performance: '性能问题',
      best_practice: '最佳实践'
    };
    return labels[category] || category;
  };

  // 修复问题
  const handleFix = (issue) => {
    if (onFixIssue) {
      onFixIssue(issue);
    }
  };

  // 刷新审查
  const handleRefresh = () => {
    reviewCode();
  };

  if (!visible) return null;

  return (
    <div className="fixed right-4 top-20 w-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 max-h-[80vh] overflow-hidden flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">代码审查</h3>
          {summary && (
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
              {summary.total} 个问题
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

      {/* 过滤器 */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">所有严重程度</option>
          <option value="critical">严重</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">所有类别</option>
          <option value="quality">代码质量</option>
          <option value="style">代码风格</option>
          <option value="security">安全问题</option>
          <option value="performance">性能问题</option>
          <option value="best_practice">最佳实践</option>
        </select>
      </div>

      {/* 摘要统计 */}
      {summary && (
        <div className="grid grid-cols-5 gap-1 p-3 border-b border-gray-200 dark:border-gray-700">
          {Object.entries(summary.by_severity).map(([severity, count]) => (
            <div key={severity} className="text-center">
              <div className={`text-lg font-bold ${
                severity === 'critical' ? 'text-red-600' :
                severity === 'high' ? 'text-orange-500' :
                severity === 'medium' ? 'text-yellow-500' :
                severity === 'low' ? 'text-blue-500' :
                'text-gray-500'
              }`}>
                {count}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {getSeverityLabel(severity)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">审查中...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {issues.length === 0 ? '没有发现问题，代码质量良好！' : '没有符合过滤条件的问题'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredIssues.map((issue, index) => (
              <div
                key={issue.id || index}
                className={`bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all ${
                  expandedIssueId === issue.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {/* 标题 */}
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setExpandedIssueId(expandedIssueId === issue.id ? null : issue.id)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getSeverityIcon(issue.severity)}
                    {getCategoryIcon(issue.category)}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {issue.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        行 {issue.line} · {getSeverityLabel(issue.severity)} · {getCategoryLabel(issue.category)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {issue.suggestion && onFixIssue && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFix(issue);
                        }}
                        className="p-1 hover:bg-green-100 dark:hover:bg-green-900 rounded transition-colors"
                        title="修复"
                      >
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </button>
                    )}
                    {expandedIssueId === issue.id ? (
                      <div className="w-4 h-4 text-gray-500 dark:text-gray-400">▲</div>
                    ) : (
                      <div className="w-4 h-4 text-gray-500 dark:text-gray-400">▼</div>
                    )}
                  </div>
                </div>

                {/* 详情 */}
                {expandedIssueId === issue.id && (
                  <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                      {issue.description}
                    </p>
                    
                    {issue.code_snippet && (
                      <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono overflow-x-auto">
                        <code>{issue.code_snippet}</code>
                      </pre>
                    )}
                    
                    {issue.suggestion && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">建议:</p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          {issue.suggestion}
                        </p>
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
          基于 AI 的代码质量、风格、安全和性能检查
        </p>
      </div>
    </div>
  );
};

export default CodeReviewPanel;
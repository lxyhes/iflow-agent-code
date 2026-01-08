import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, X, Zap, ChevronDown, ChevronUp, Copy, Play, Sparkles, Timer } from 'lucide-react';
import { authenticatedFetch } from '../utils/api';

export function ErrorFixPrompt({ error, projectPath, onApplyFix, onDismiss }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [applying, setApplying] = useState(false);
  const [autoFixEnabled, setAutoFixEnabled] = useState(true);
  const [fixCountdown, setFixCountdown] = useState(5);

  useEffect(() => {
    if (error) {
      analyzeError();
    }
  }, [error]);

  // 自动修复倒计时
  useEffect(() => {
    if (autoFixEnabled && analysis?.can_auto_fix && !applying) {
      const timer = setInterval(() => {
        setFixCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAutoFix();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [autoFixEnabled, analysis, applying]);

  const analyzeError = async () => {
    setLoading(true);
    setFixCountdown(5);
    try {
      const response = await authenticatedFetch('/api/error-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: error,
          projectPath: projectPath
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.analysis);
      }
    } catch (err) {
      console.error('Error analysis failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFix = async () => {
    if (!analysis?.auto_fix) return;

    setApplying(true);
    try {
      const response = await authenticatedFetch('/api/auto-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: error,
          projectPath: projectPath,
          context: {}
        })
      });

      const data = await response.json();

      if (data.success && data.result?.fix_successful) {
        if (onApplyFix) {
          onApplyFix(data.result);
        }
      }
    } catch (err) {
      console.error('Auto fix failed:', err);
    } finally {
      setApplying(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="fixed top-4 right-4 z-50 max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">正在分析错误...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full animate-slide-in-right">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className={`mt-0.5 ${getSeverityColor(analysis.severity)} rounded-full p-1`}>
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                  检测到错误
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {analysis.error_info?.message || analysis.suggested_fix}
                </p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Error Type */}
          {analysis.error_type && (
            <div className="mb-3">
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {analysis.error_type.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
          )}

          {/* Suggested Fix */}
          {analysis.suggested_fix && (
            <div className="mb-3">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {analysis.suggested_fix}
              </p>
            </div>
          )}

          {/* Code Fix */}
          {analysis.fix_code && (
            <div className="mb-3">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    隐藏修复代码
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    查看修复代码
                  </>
                )}
              </button>

              {showDetails && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-md overflow-x-auto">
                  <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
                    {analysis.fix_code}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Code Context */}
          {analysis.code_context && (
            <div className="mb-3">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    隐藏代码上下文
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    查看代码上下文
                  </>
                )}
              </button>

              {showDetails && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-md overflow-x-auto">
                  <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
                    {analysis.code_context}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Auto Fix Button */}
          {analysis.can_auto_fix && analysis.auto_fix && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleAutoFix}
                disabled={applying}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-md py-2 px-4 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed btn-glow"
              >
                {applying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    正在修复...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    自动修复
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              if (analysis.fix_code) {
                navigator.clipboard.writeText(analysis.fix_code);
              }
            }}
            className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <Copy className="w-3 h-3" />
            复制修复代码
          </button>
          <button
            onClick={onDismiss}
            className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            稍后处理
          </button>
        </div>
      </div>
    </div>
  );
}

export default ErrorFixPrompt;
import React, { useState, useEffect, useCallback } from 'react';
import { Play, RefreshCw, X, ExternalLink, Code, Monitor, AlertCircle, CheckCircle } from 'lucide-react';
import { CodeMirror } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

const SandboxPreview = ({ projectName, componentCode, componentType = 'react', onClose }) => {
  const [sandboxId, setSandboxId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [code, setCode] = useState(componentCode || '');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshTimer, setRefreshTimer] = useState(null);
  const [status, setStatus] = useState('idle');

  // 创建沙盒
  const createSandbox = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatus('creating');

    try {
      const response = await fetch('/api/sandbox/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_name: projectName,
          component_code: code,
          component_type: componentType,
        }),
      });

      const data = await response.json();

      if (data.success && data.sandbox) {
        setSandboxId(data.sandbox.sandbox_id);
        setPreviewUrl(data.sandbox.preview_url);
        setStatus('running');
      } else {
        setError(data.error || '创建沙盒失败');
        setStatus('error');
      }
    } catch (err) {
      setError(err.message);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }, [projectName, code, componentType]);

  // 更新沙盒组件
  const updateSandbox = useCallback(async () => {
    if (!sandboxId || !autoRefresh) return;

    try {
      const response = await fetch(`/api/sandbox/${sandboxId}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          component_code: code,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('updated');
        setTimeout(() => setStatus('running'), 2000);
      } else {
        setError(data.error || '更新沙盒失败');
      }
    } catch (err) {
      setError(err.message);
    }
  }, [sandboxId, code, autoRefresh]);

  // 销毁沙盒
  const destroySandbox = useCallback(async () => {
    if (sandboxId) {
      try {
        await fetch(`/api/sandbox/${sandboxId}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Failed to destroy sandbox:', err);
      }
    }
  }, [sandboxId]);

  // 代码变更处理
  const handleCodeChange = useCallback((value) => {
    setCode(value);
  }, []);

  // 自动刷新沙盒
  useEffect(() => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }

    if (autoRefresh && sandboxId && code !== componentCode) {
      const timer = setTimeout(() => {
        updateSandbox();
      }, 1000); // 1秒后自动刷新
      setRefreshTimer(timer);
    }

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [code, sandboxId, autoRefresh, updateSandbox, refreshTimer]);

  // 初始化创建沙盒
  useEffect(() => {
    if (projectName && code && !sandboxId) {
      createSandbox();
    }

    return () => {
      destroySandbox();
    };
  }, [projectName, code, sandboxId, createSandbox, destroySandbox]);

  // 手动刷新
  const handleRefresh = () => {
    if (sandboxId) {
      updateSandbox();
    } else {
      createSandbox();
    }
  };

  // 获取状态图标和颜色
  const getStatusIcon = () => {
    switch (status) {
      case 'creating':
        return <RefreshCw className="w-4 h-4 animate-spin text-yellow-500" />;
      case 'running':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'updated':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Monitor className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'creating':
        return '正在创建沙盒...';
      case 'running':
        return '运行中';
      case 'updated':
        return '已更新';
      case 'error':
        return '错误';
      default:
        return '准备就绪';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">实时代码预览</h2>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-full">
            {getStatusIcon()}
            <span className="text-sm text-gray-300">{getStatusText()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {autoRefresh ? '自动刷新: 开' : '自动刷新: 关'}
          </button>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="刷新预览"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>

          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="在新窗口打开"
            >
              <ExternalLink size={20} />
            </a>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 代码编辑器 */}
        <div className="w-1/2 flex flex-col border-r border-gray-700">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">组件代码</span>
            </div>
            <span className="text-xs text-gray-500">{componentType}</span>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <CodeMirror
              value={code}
              height="100%"
              theme={oneDark}
              extensions={[javascript({ jsx: true })]}
              onChange={handleCodeChange}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: true,
                highlightSpecialChars: true,
                foldGutter: true,
                drawSelection: true,
                dropCursor: true,
                allowMultipleSelections: true,
                indentOnInput: true,
                syntaxHighlighting: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                rectangularSelection: true,
                crosshairCursor: true,
                highlightActiveLine: true,
                highlightSelectionMatches: true,
                closeBracketsKeymap: true,
                searchKeymap: true,
                foldKeymap: true,
                completionKeymap: true,
                lintKeymap: true,
              }}
            />
          </div>
        </div>

        {/* 预览区域 */}
        <div className="w-1/2 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">实时预览</span>
            </div>
            {previewUrl && (
              <span className="text-xs text-green-400">● Live</span>
            )}
          </div>

          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-400">正在启动预览环境...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  重试
                </button>
              </div>
            </div>
          )}

          {previewUrl && !loading && !error && (
            <div className="flex-1 bg-white">
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title="Component Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          )}

          {!previewUrl && !loading && !error && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Play className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">点击刷新按钮启动预览</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SandboxPreview;
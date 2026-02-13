/**
 * ApiKeySettings - API Key配置组件
 *
 * 配置全局API Key用于AI功能
 */

import React, { useState, useEffect } from 'react';
import {
  Key,
  X,
  Save,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Settings,
  Trash2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

const ApiKeySettings = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [keyStatus, setKeyStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // 加载已保存的API Key
  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('iflow_api_key');
      if (savedKey) {
        setApiKey(savedKey);
      }
      // 检测API Key状态
      checkApiKeyStatus();
    }
  }, [isOpen]);

  // 检测API Key状态
  const checkApiKeyStatus = async () => {
    setCheckingStatus(true);
    try {
      const response = await fetch('/api/iflow/api-key-status');
      if (response.ok) {
        const data = await response.json();
        setKeyStatus(data);
      } else {
        setKeyStatus({ valid: false, status: 'error', message: '检测失败' });
      }
    } catch (error) {
      console.error('Failed to check API key status:', error);
      setKeyStatus({ valid: false, status: 'error', message: '无法连接到后端服务' });
    } finally {
      setCheckingStatus(false);
    }
  };

  // 保存API Key
  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('请输入API Key');
      return;
    }

    if (apiKey.length < 10) {
      setError('API Key长度太短，请检查输入');
      return;
    }

    try {
      // 调用后端 API 动态更新 API Key
      const response = await fetch('/api/iflow/api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || '保存失败');
        return;
      }

      // 同时保存到 localStorage 作为备份
      localStorage.setItem('iflow_api_key', apiKey.trim());
      
      setSaved(true);
      setError('');
      
      // 触发全局事件，通知其他组件API Key已更新
      window.dispatchEvent(new CustomEvent('apikey-changed', {
        detail: { apiKey: apiKey.trim() }
      }));

      // 重新检测状态
      await checkApiKeyStatus();

      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError('保存失败: ' + err.message);
    }
  };

  // 清除API Key
  const handleClear = async () => {
    if (window.confirm('确定要清除已保存的API Key吗？')) {
      try {
        // 调用后端 API 清除动态 API Key
        await fetch('/api/iflow/api-key', {
          method: 'DELETE',
        });

        localStorage.removeItem('iflow_api_key');
        setApiKey('');
        setSaved(true);
        
        window.dispatchEvent(new CustomEvent('apikey-changed', {
          detail: { apiKey: null }
        }));

        // 重新检测状态
        await checkApiKeyStatus();

        setTimeout(() => {
          setSaved(false);
        }, 1500);
      } catch (err) {
        setError('清除失败: ' + err.message);
      }
    }
  };

  if (!isOpen) return null;

  const hasSavedKey = localStorage.getItem('iflow_api_key');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                API Key设置
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                配置AI功能所需的API Key
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* API Key 状态 */}
          {keyStatus && (
            <div className={`rounded-lg p-4 border ${
              keyStatus.valid
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${
                      keyStatus.valid
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      API Key 状态: {keyStatus.valid ? '正常' : keyStatus.status === 'expired' ? '已过期' : keyStatus.status === 'disconnected' ? '未连接' : '异常'}
                    </p>
                    <button
                      onClick={checkApiKeyStatus}
                      disabled={checkingStatus}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <RefreshCw className={`w-3 h-3 ${checkingStatus ? 'animate-spin' : ''}`} />
                      重新检测
                    </button>
                  </div>
                  <p className={`text-xs mt-1 ${
                    keyStatus.valid
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    {keyStatus.message}
                  </p>
                  {!keyStatus.valid && keyStatus.action === 'renew_token' && (
                    <a
                      href="https://platform.iflow.cn/docs/api-key-management"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <ExternalLink className="w-3 h-3" />
                      前往 iFlow 平台重置 Token
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 说明 */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>提示：</strong>API Key用于AI功能（智能描述生成、简历诊断等）。
              输入新的 API Key 后点击保存，将立即生效，无需重启服务。
            </p>
          </div>



          {/* API Key输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              IFLOW API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError('');
                  setSaved(false);
                }}
                placeholder="请输入您的API Key"
                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {hasSavedKey && (
              <p className="mt-1 text-xs text-gray-500">
                已保存API Key，输入新值将覆盖原有设置
              </p>
            )}
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* 成功提示 */}
          {saved && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <Check className="w-4 h-4" />
              保存成功！
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          {hasSavedKey ? (
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              清除
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySettings;

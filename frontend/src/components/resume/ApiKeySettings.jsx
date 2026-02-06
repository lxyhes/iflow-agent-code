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
  Trash2
} from 'lucide-react';

const ApiKeySettings = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // 加载已保存的API Key
  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('iflow_api_key');
      if (savedKey) {
        // 只显示前8位和后4位，中间用*代替
        const maskedKey = savedKey.length > 12 
          ? `${savedKey.substring(0, 8)}...${savedKey.substring(savedKey.length - 4)}`
          : '已设置';
        setApiKey(savedKey);
      }
    }
  }, [isOpen]);

  // 保存API Key
  const handleSave = () => {
    if (!apiKey.trim()) {
      setError('请输入API Key');
      return;
    }

    if (apiKey.length < 10) {
      setError('API Key长度太短，请检查输入');
      return;
    }

    try {
      localStorage.setItem('iflow_api_key', apiKey.trim());
      setSaved(true);
      setError('');
      
      // 触发全局事件，通知其他组件API Key已更新
      window.dispatchEvent(new CustomEvent('apikey-changed', {
        detail: { apiKey: apiKey.trim() }
      }));

      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError('保存失败，请重试');
    }
  };

  // 清除API Key
  const handleClear = () => {
    if (window.confirm('确定要清除已保存的API Key吗？')) {
      localStorage.removeItem('iflow_api_key');
      setApiKey('');
      setSaved(true);
      
      window.dispatchEvent(new CustomEvent('apikey-changed', {
        detail: { apiKey: null }
      }));

      setTimeout(() => {
        setSaved(false);
      }, 1500);
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
          {/* 说明 */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>提示：</strong>API Key用于AI功能（智能描述生成、简历诊断等）。
              Key将保存在您的浏览器本地存储中，不会上传到服务器。
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

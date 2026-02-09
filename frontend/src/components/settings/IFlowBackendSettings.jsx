/**
 * AI 工作台BackendSettings.jsx - AI 工作台 后端设置组件
 * 允许用户选择使用 SDK 还是 subprocess 方式调用 AI 工作台
 */

import React, { useState, useEffect } from 'react';
import { Server, Terminal, Info, Save, AlertCircle } from 'lucide-react';

const IFlowBackendSettings = () => {
  const [backendMode, setBackendMode] = useState(() => {
    return localStorage.getItem('iflow-backend-mode') || 'sdk';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('glm-4.7');
  const [isSwitchingModel, setIsSwitchingModel] = useState(false);
  const [processStatus, setProcessStatus] = useState({ running: false, loading: false });

  const availableModels = [
    { id: 'glm-4', name: 'GLM-4', description: '基础模型' },
    { id: 'glm-4.7', name: 'GLM-4.7', description: '推荐模型' },
    { id: 'AI 工作台-ROME-30BA3B', name: 'AI 工作台-ROME-30BA3B', description: '高性能模型' },
    { id: 'glm-4-flash', name: 'GLM-4-Flash', description: '快速响应模型' }
  ];

  const backendModes = [
    {
      id: 'sdk',
      name: 'SDK 模式',
      icon: Server,
      description: '使用 AI 工作台 Java SDK 进行通信',
      advantages: [
        '类型安全',
        '更好的错误处理',
        '官方支持',
        '更稳定的连接'
      ],
      disadvantages: [
        '不支持动态模型切换',
        '需要 SDK 依赖',
        '切换模型需要重启 AI 工作台 进程'
      ]
    },
    {
      id: 'subprocess',
      name: 'Subprocess 模式',
      icon: Terminal,
      description: '通过命令行调用 AI CLI',
      advantages: [
        '支持动态模型切换',
        '灵活的参数配置',
        '无需 SDK 依赖'
      ],
      disadvantages: [
        '进程管理开销',
        '需要正确配置环境变量'
      ]
    }
  ];

  // 加载后端当前配置
  const loadBackendConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/iflow/backend/mode');
      if (response.ok) {
        const data = await response.json();
        setBackendMode(data.mode);
        localStorage.setItem('iflow-backend-mode', data.mode);
      }
    } catch (error) {
      console.error('Failed to load backend config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 检查进程状态
  const checkProcessStatus = async () => {
    setProcessStatus(prev => ({ ...prev, loading: true }));
    try {
      const response = await fetch('/api/iflow/backend/process/status');
      if (response.ok) {
        const data = await response.json();
        setProcessStatus({ running: data.running, loading: false });
      }
    } catch (error) {
      console.error('Failed to check process status:', error);
      setProcessStatus({ running: false, loading: false });
    }
  };

  // 切换模型
  const handleSwitchModel = async (model) => {
    setIsSwitchingModel(true);
    setSaveStatus(null);

    try {
      const response = await fetch('/api/iflow/backend/model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to switch model');
      }

      const result = await response.json();
      console.log('Model switched:', result);

      setSaveStatus('success');
      setSelectedModel(model);

      // 刷新进程状态
      setTimeout(() => {
        checkProcessStatus();
      }, 3000);

      setTimeout(() => setSaveStatus(null), 5000);
    } catch (error) {
      console.error('Failed to switch model:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setIsSwitchingModel(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    try {
      // 保存到 localStorage
      localStorage.setItem('iflow-backend-mode', backendMode);

      // 通知后端更新配置
      const response = await fetch('/api/iflow/backend/mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode: backendMode }),
      });

      if (!response.ok) {
        throw new Error('Failed to update backend configuration');
      }

      const result = await response.json();
      console.log('Backend mode updated:', result);

      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Failed to save backend mode:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    // 从 localStorage 加载配置
    const savedMode = localStorage.getItem('iflow-backend-mode');
    if (savedMode) {
      setBackendMode(savedMode);
    }
    
    // 加载后端当前配置
    loadBackendConfig();

    // 检查进程状态
    checkProcessStatus();

    // 定期检查进程状态（每 10 秒）
    const interval = setInterval(checkProcessStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          AI 工作台 后端模式
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          选择 AI 工作台 后端的通信方式。SDK 模式更稳定但不支持动态模型切换，Subprocess 模式支持模型切换但有额外的进程开销。
        </p>
      </div>

      {/* 当前模式显示 */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            {isLoading ? (
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                加载后端配置中...
              </p>
            ) : (
              <>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  当前模式: {backendMode === 'sdk' ? 'SDK 模式' : 'Subprocess 模式'}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {backendMode === 'sdk' 
                    ? 'SDK 模式需要重启 AI 工作台 进程来切换模型'
                    : 'Subprocess 模式支持动态模型切换，无需重启'}
                </p>
                {processStatus.loading ? (
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    检查进程状态中...
                  </p>
                ) : (
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    AI 工作台 进程状态: {processStatus.running ? '✓ 运行中' : '✗ 未运行'}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 模式选择 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {backendModes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = backendMode === mode.id;

          return (
            <div
              key={mode.id}
              onClick={() => setBackendMode(mode.id)}
              className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  isSelected
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    {mode.name}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    {mode.description}
                  </p>

                  {/* 优点 */}
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                        优点:
                      </p>
                      <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                        {mode.advantages.map((advantage, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-green-500 dark:text-green-400">✓</span>
                            {advantage}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 缺点 */}
                    <div>
                      <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-1">
                        缺点:
                      </p>
                      <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                        {mode.disadvantages.map((disadvantage, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-orange-500 dark:text-orange-400">✗</span>
                            {disadvantage}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* 选中标记 */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 保存按钮和状态 */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              保存成功
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              保存失败
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Save className="w-4 h-4" />
          {isSaving ? '保存中...' : '保存设置'}
        </button>
      </div>
    </div>
  );
};

export default IFlowBackendSettings;
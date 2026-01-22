/**
 * vLLM 模型选择器组件
 * 用于选择和管理 vLLM 模型
 */

import React, { useState, useEffect } from 'react';
import { 
  Cpu, Zap, HardDrive, Settings, CheckCircle2, AlertCircle, 
  RefreshCw, ChevronDown, Info, Download, Play, StopCircle
} from 'lucide-react';

const VLLMModelSelector = ({ 
  selectedModel, 
  onModelChange,
  onServiceStart,
  onServiceStop,
  serviceStatus,
  compact = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    host: '0.0.0.0',
    port: 8000,
    apiKey: 'token-abc123',
    gpuMemoryUtilization: 0.95,
    maxModelLen: 131072,
    dtype: 'auto'
  });

  // 推荐模型列表
  const recommendedModels = [
    {
      id: 'Qwen/Qwen2.5-7B-Instruct',
      name: 'Qwen2.5-7B-Instruct',
      provider: 'Qwen',
      size: '7B',
      description: '中文对话模型,性能优秀',
      features: ['中文优化', '对话能力强', '推理速度快'],
      recommended: true,
      minVram: 16,
      minRam: 32
    },
    {
      id: 'Qwen/Qwen2.5-14B-Instruct',
      name: 'Qwen2.5-14B-Instruct',
      provider: 'Qwen',
      size: '14B',
      description: '更大参数,更强能力',
      features: ['中文优化', '多轮对话', '复杂推理'],
      recommended: false,
      minVram: 24,
      minRam: 48
    },
    {
      id: 'THUDM/glm-4-9b-chat',
      name: 'GLM-4-9B-Chat',
      provider: '智谱 AI',
      size: '9B',
      description: '智谱 AI 开源模型',
      features: ['中文理解', '代码生成', '逻辑推理'],
      recommended: true,
      minVram: 18,
      minRam: 32
    },
    {
      id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B',
      name: 'DeepSeek-R1-Distill',
      provider: 'DeepSeek',
      size: '1.5B',
      description: '推理能力强的轻量模型',
      features: ['推理优化', '思维链', '快速响应'],
      recommended: false,
      minVram: 8,
      minRam: 16
    },
    {
      id: 'meta-llama/Llama-3.1-8B-Instruct',
      name: 'Llama-3.1-8B-Instruct',
      provider: 'Meta',
      size: '8B',
      description: 'Meta 开源模型',
      features: ['英文优秀', '多功能', '开源'],
      recommended: false,
      minVram: 16,
      minVram: 32
    }
  ];

  useEffect(() => {
    setModels(recommendedModels);
  }, []);

  const handleModelSelect = (modelId) => {
    onModelChange(modelId);
    setIsOpen(false);
  };

  const handleConfigChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const getHardwareIcon = (requirement) => {
    switch (requirement.type) {
      case 'gpu':
        return <Cpu className="w-4 h-4" />;
      case 'ram':
        return <HardDrive className="w-4 h-4" />;
      case 'performance':
        return <Zap className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const selectedModelData = models.find(m => m.id === selectedModel);

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => !loading && setIsOpen(!isOpen)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
          ) : selectedModelData ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-900 dark:text-white">
                {selectedModelData.name}
              </span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-500">选择模型</span>
            </>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>

        {isOpen && !loading && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className="absolute z-20 mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    选择 vLLM 模型
                  </span>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <span className="text-gray-400">×</span>
                  </button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {models.map(model => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model.id)}
                    className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left ${
                      selectedModel === model.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        model.recommended 
                          ? 'bg-purple-100 dark:bg-purple-900/30' 
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        {model.recommended ? (
                          <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        ) : (
                          <Play className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {model.name}
                        </span>
                        {model.recommended && (
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded">
                            推荐
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {model.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-gray-500">
                          <HardDrive className="w-3 h-3" />
                          {model.size}
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <Cpu className="w-3 h-3" />
                          {model.minVram}GB VRAM
                        </span>
                      </div>
                    </div>
                    {selectedModel === model.id && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 模型选择器 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          vLLM 模型
        </label>
        <div className="relative">
          <button
            onClick={() => !loading && setIsOpen(!isOpen)}
            disabled={loading}
            className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-500"
          >
            <div className="flex items-center gap-3">
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500">加载中...</span>
                </>
              ) : selectedModelData ? (
                <>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedModelData.recommended 
                      ? 'bg-purple-100 dark:bg-purple-900/30' 
                      : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    {selectedModelData.recommended ? (
                      <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedModelData.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedModelData.provider} · {selectedModelData.size} 参数
                    </div>
                  </div>
                </>
              ) : (
                <span className="text-sm text-gray-500">选择模型</span>
              )}
            </div>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </button>

          {isOpen && !loading && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
              <div className="absolute z-20 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
                {/* 头部 */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        选择 vLLM 模型
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        选择适合你硬件的模型
                      </p>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <span className="text-gray-400">×</span>
                    </button>
                  </div>
                </div>

                {/* 模型列表 */}
                <div className="max-h-[500px] overflow-y-auto">
                  {models.map(model => (
                    <button
                      key={model.id}
                      onClick={() => handleModelSelect(model.id)}
                      className={`w-full px-4 py-4 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left border-b border-gray-100 dark:border-gray-800 last:border-0 ${
                        selectedModel === model.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      {/* 图标 */}
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          model.recommended 
                            ? 'bg-purple-100 dark:bg-purple-900/30' 
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          {model.recommended ? (
                            <CheckCircle2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <Play className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {model.name}
                          </h4>
                          {model.recommended && (
                            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded">
                              推荐
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {model.description}
                        </p>

                        {/* 特性标签 */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {model.features.map((feature, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>

                        {/* 硬件要求 */}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3.5 h-3.5" />
                            {model.size} 参数
                          </span>
                          <span className="flex items-center gap-1">
                            <Cpu className="w-3.5 h-3.5" />
                            {model.minVram}GB VRAM
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3.5 h-3.5" />
                            {model.minRam}GB RAM
                          </span>
                        </div>
                      </div>

                      {/* 选中标记 */}
                      {selectedModel === model.id && (
                        <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 服务状态 */}
      {serviceStatus && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              服务状态
            </span>
            <div className="flex items-center gap-2">
              {serviceStatus.running ? (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  运行中
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-sm">
                  <StopCircle className="w-4 h-4" />
                  已停止
                </span>
              )}
              {serviceStatus.running && (
                <button
                  onClick={onServiceStop}
                  className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                >
                  <StopCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                </button>
              )}
            </div>
          </div>
          {serviceStatus.running && (
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center justify-between">
                <span>地址:</span>
                <span className="font-mono">{serviceStatus.host}:{serviceStatus.port}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>模型:</span>
                <span className="font-mono truncate">{selectedModelData?.name}</span>
              </div>
              {serviceStatus.metrics && (
                <>
                  <div className="flex items-center justify-between">
                    <span>GPU 利用率:</span>
                    <span>{serviceStatus.metrics.gpu_utilization}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>内存使用:</span>
                    <span>{serviceStatus.metrics.memory_usage}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 配置面板 */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              高级配置
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              主机地址
            </label>
            <input
              type="text"
              value={config.host}
              onChange={(e) => handleConfigChange('host', e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              端口
            </label>
            <input
              type="number"
              value={config.port}
              onChange={(e) => handleConfigChange('port', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              GPU 内存利用率
            </label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={config.gpuMemoryUtilization}
              onChange={(e) => handleConfigChange('gpuMemoryUtilization', parseFloat(e.target.value))}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              最大模型长度
            </label>
            <input
              type="number"
              value={config.maxModelLen}
              onChange={(e) => handleConfigChange('maxModelLen', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VLLMModelSelector;
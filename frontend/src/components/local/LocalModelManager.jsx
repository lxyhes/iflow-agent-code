import React, { useState, useEffect } from 'react';
import { Server, Cpu, Wifi, WifiOff, Play, Trash2, Loader, CheckCircle, XCircle } from 'lucide-react';

/**
 * 本地模型管理组件 (Ollama/LM Studio)
 */
const LocalModelManager = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ollamaStatus, setOllamaStatus] = useState(null);

  useEffect(() => {
    checkOllama();
    fetchModels();
  }, []);

  const checkOllama = async () => {
    try {
      const response = await fetch('/api/local/ollama/status');
      const data = await response.json();
      setOllamaStatus(data);
    } catch (error) {
      setOllamaStatus({ available: false });
    }
  };

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/local/models');
      if (!response.ok) throw new Error('获取模型失败');
      const data = await response.json();
      setModels(data.models || getMockModels());
    } catch (error) {
      console.error('获取模型失败:', error);
      setModels(getMockModels());
    } finally {
      setLoading(false);
    }
  };

  const getMockModels = () => [
    { id: 1, name: 'llama2:7b', provider: 'ollama', status: 'active' },
    { id: 2, name: 'codellama:7b', provider: 'ollama', status: 'inactive' },
    { id: 3, name: 'mistral:7b', provider: 'ollama', status: 'active' },
  ];

  const handlePullModel = async (modelName) => {
    try {
      await fetch('/api/local/ollama/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
      });
      fetchModels();
    } catch (error) {
      alert('拉取模型失败：' + error.message);
    }
  };

  const handleDeleteModel = async (id) => {
    if (!confirm('确定要删除此模型吗？')) return;
    try {
      await fetch(`/api/local/models/${id}`, { method: 'DELETE' });
      fetchModels();
    } catch (error) {
      alert('删除失败：' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            本地模型管理
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            管理 Ollama 和 LM Studio 本地模型
          </p>
        </div>
      </div>

      {/* Ollama 状态 */}
      <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
        ollamaStatus?.available ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
      }`}>
        {ollamaStatus?.available ? (
          <CheckCircle className="w-6 h-6 text-green-600" />
        ) : (
          <XCircle className="w-6 h-6 text-red-600" />
        )}
        <div>
          <h3 className="font-medium">
            Ollama {ollamaStatus?.available ? '已连接' : '未连接'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {ollamaStatus?.available ? `运行中 (${ollamaStatus.version})` : '请确保 Ollama 服务正在运行'}
          </p>
        </div>
      </div>

      {/* 模型列表 */}
      <div className="space-y-3">
        {models.map(model => (
          <div
            key={model.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {model.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    提供商：{model.provider}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePullModel(model.name)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                  title="拉取模型"
                >
                  <Play className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeleteModel(model.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  title="删除"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LocalModelManager;

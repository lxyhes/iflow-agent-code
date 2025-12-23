import React, { useState, useEffect } from 'react';

const models = [
  { id: 'GLM-4.6', label: 'GLM-4.6 (推荐)', icon: '✨' },
  { id: 'DeepSeek-V3.2', label: 'DeepSeek-V3.2', icon: '🐋' },
  { id: 'Qwen3-Coder-Plus', label: 'Qwen3-Coder-Plus', icon: '🤖' },
  { id: 'Kimi-K2-Thinking', label: 'Kimi-K2-Thinking', icon: '🧠' },
  { id: 'MiniMax-M2', label: 'MiniMax-M2', icon: '⚡' },
  { id: 'Kimi-K2-0905', label: 'Kimi-K2-0905', icon: '📝' }
];

const IFlowModelSelector = () => {
  const [currentModel, setCurrentModel] = useState('GLM-4.6');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Sync with current server config on mount
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
          if (data.model) setCurrentModel(data.model);
      })
      .catch(console.error);
  }, []);

  const handleModelChange = (modelId) => {
    setCurrentModel(modelId);
    setShowDropdown(false);
    
    // Notify backend to switch model
    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelId })
    })
    .then(() => {
        console.log(`[Model] Switched to ${modelId}`);
    })
    .catch(console.error);
  };

  const currentModelInfo = models.find(m => m.id === currentModel) || models[0];

  return (
    <div className="relative mr-2">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors shadow-sm"
        title="Select IFlow Model"
      >
        <span role="img" aria-label="icon">{currentModelInfo.icon}</span>
        <span className="hidden sm:inline font-bold">{currentModelInfo.label}</span>
        <svg className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M19 9l-7 7-7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2">
            <div className="px-3 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Available Models
            </div>
            <div className="space-y-1">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelChange(model.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all ${
                    currentModel === model.id 
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{model.icon}</span>
                    <span className="text-sm font-semibold">{model.label}</span>
                  </div>
                  {currentModel === model.id && (
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IFlowModelSelector;
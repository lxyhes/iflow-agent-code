import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const models = [
  { id: 'GLM-4.7', label: 'GLM-4.7 (推荐)', icon: '✨' },
  { id: 'iFlow-ROME-30BA3B', label: 'iFlow-ROME-30BA3B (预览版)', icon: '🔬' },
  { id: 'DeepSeek-V3.2', label: 'DeepSeek-V3.2', icon: '🐋' },
  { id: 'Qwen3-Coder-Plus', label: 'Qwen3-Coder-Plus', icon: '🤖' },
  { id: 'Kimi-K2-Thinking', label: 'Kimi-K2-Thinking', icon: '🧠' },
  { id: 'MiniMax-M2.1', label: 'MiniMax-M2.1', icon: '⚡' },
  { id: 'Kimi-K2-0905', label: 'Kimi-K2-0905', icon: '📝' }
];

const IFlowModelSelector = () => {
  const [currentModel, setCurrentModel] = useState(() => {
    return localStorage.getItem('iflow-model') || 'GLM-4.7';
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = React.useRef(null);

  useEffect(() => {
    // Sync with current server config on mount
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
          if (data.model) {
            setCurrentModel(data.model);
            localStorage.setItem('iflow-model', data.model);
          }
      })
      .catch(console.error);
  }, []);

  // 计算下拉菜单位置
  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 224; // 下拉菜单的宽度
      const windowWidth = window.innerWidth;
      
      // 计算左边位置,确保不会超出屏幕右侧
      let left = rect.right - dropdownWidth;
      if (left < 10) {
        left = 10; // 最小左边距
      }
      if (left + dropdownWidth > windowWidth - 10) {
        left = windowWidth - dropdownWidth - 10; // 确保不会超出右侧
      }
      
      // 计算顶部位置,确保不会超出屏幕底部
      let top = rect.bottom + 4;
      const windowHeight = window.innerHeight;
      const dropdownHeight = 400; // 最大高度
      
      if (top + dropdownHeight > windowHeight - 10) {
        top = rect.top - dropdownHeight - 4; // 向上显示
      }
      
      setDropdownPosition({
        top,
        left
      });
    }
  };

  useEffect(() => {
    if (showDropdown) {
      updateDropdownPosition();
      const handleScroll = () => {
        setShowDropdown(false);
      };
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleScroll);
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [showDropdown]);

  const handleModelChange = async (modelId) => {
    setCurrentModel(modelId);
    localStorage.setItem('iflow-model', modelId);
    // Dispatch custom event so ChatInterface can update immediately
    window.dispatchEvent(new CustomEvent('iflow-model-changed', { detail: { model: modelId } }));
    setShowDropdown(false);
    
    // Check backend mode first
    let needRestart = false;
    try {
      const modeResponse = await fetch('/api/iflow/backend/mode');
      if (modeResponse.ok) {
        const modeData = await modeResponse.json();
        needRestart = modeData.mode === 'sdk';
      }
    } catch (error) {
      console.error('Failed to check backend mode:', error);
    }

    // Notify backend to switch model
    if (needRestart) {
      // SDK 模式：需要重启 iFlow 进程
      fetch('/api/iflow/backend/model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId })
      })
      .then(response => response.json())
      .then(data => {
        console.log(`[Model] Switched to ${modelId} (with iFlow process restart)`);
        console.log('[Model]', data.message);
      })
      .catch(error => {
        console.error('Failed to switch model:', error);
      });
    } else {
      // Subprocess 模式：直接通知后端，无需重启
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId })
      })
      .then(() => {
        console.log(`[Model] Switched to ${modelId} (Subprocess mode)`);
      })
      .catch(error => {
        console.error('Failed to switch model:', error);
      });
    }
  };

  const currentModelInfo = models.find(m => m.id === currentModel) || models[0];

  return (
    <div className="relative mr-2 z-50">
      <button
        ref={buttonRef}
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

      {showDropdown && createPortal(
        <div 
          className="fixed w-56 rounded-xl shadow-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-[99999] animate-in fade-in zoom-in-95 duration-200 overflow-y-auto"
          style={{ 
            maxHeight: '400px',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            position: 'fixed',
            zIndex: 99999
          }}
        >
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default IFlowModelSelector;
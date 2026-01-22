import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Cpu } from 'lucide-react';

/**
 * 模型选择器组件
 * @param {Object} props
 * @param {string} props.value - 当前选中的模型
 * @param {Function} props.onChange - 模型改变时的回调函数
 * @param {string} props.className - 自定义样式类名
 * @param {boolean} props.disabled - 是否禁用
 * @param {string} props.label - 显示的标签
 */
const ModelSelector = ({ 
  value = 'GLM-4.7', 
  onChange, 
  className = '',
  disabled = false,
  label = 'AI 模型'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = React.useRef(null);

  // 可用的模型列表 - 使用真实的官方图标
  const availableModels = [
    { 
      id: 'GLM-4.7', 
      name: 'GLM-4.7', 
      description: '推荐模型', 
      icon: '/icons/zhipu.svg',
      fallbackIcon: '✨'
    },
    { 
      id: 'iFlow-ROME-30BA3B', 
      name: 'iFlow-ROME-30BA3B', 
      description: '预览版', 
      icon: '/icons/iflow.svg',
      fallbackIcon: '🔬'
    },
    { 
      id: 'DeepSeek-V3.2', 
      name: 'DeepSeek-V3.2', 
      description: '深度求索模型', 
      icon: '/icons/deepseek.svg',
      fallbackIcon: '🐋'
    },
    { 
      id: 'Qwen3-Coder-Plus', 
      name: 'Qwen3-Coder-Plus', 
      description: '通义千问代码模型', 
      icon: '/icons/qwen.svg',
      fallbackIcon: '🤖'
    },
    { 
      id: 'Kimi-K2-Thinking', 
      name: 'Kimi-K2-Thinking', 
      description: '思考型模型', 
      icon: '/icons/kimi.svg',
      fallbackIcon: '🧠'
    },
    { 
      id: 'MiniMax-M2.1', 
      name: 'MiniMax-M2.1', 
      description: '快速模型', 
      icon: '/icons/minimax.svg',
      fallbackIcon: '⚡'
    },
    { 
      id: 'Kimi-K2-0905', 
      name: 'Kimi-K2-0905', 
      description: 'Kimi 模型', 
      icon: '/icons/kimi.svg',
      fallbackIcon: '📝'
    }
  ];

  useEffect(() => {
    // 从全局配置加载可用模型
    const loadModels = async () => {
      try {
        const response = await fetch('/api/config');
        if (response.ok) {
          const config = await response.json();
          // 如果配置中有自定义模型列表，使用它
          if (config.available_models && config.available_models.length > 0) {
            setModels(config.available_models);
          } else {
            setModels(availableModels);
          }
        }
      } catch (error) {
        console.error('Failed to load models:', error);
        setModels(availableModels);
      } finally {
        setLoading(false);
      }
    };

    loadModels();
  }, []);

  // 更新下拉菜单位置
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  const selectedModel = models.find(m => m.id === value) || models[0];

  const handleSelect = (modelId) => {
    if (onChange) {
      onChange(modelId);
    }
    setIsOpen(false);
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <Cpu className="w-4 h-4 text-gray-400 animate-pulse" />
        <span className="text-sm text-gray-500">加载中...</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* 标签 */}
      {label && (
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      
      {/* 选择器按钮 */}
      <button
        ref={buttonRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center justify-between gap-2 w-full px-3 py-2 
          bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
          rounded-lg text-sm text-gray-900 dark:text-white
          hover:border-gray-400 dark:hover:border-gray-500
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span className="font-medium">{selectedModel?.name || value}</span>
        <ChevronDown 
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* 下拉菜单 - 使用 Portal 渲染到 body */}
      {isOpen && !disabled && createPortal(
        <>
          {/* 遮罩层 */}
          <div 
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          
          {/* 菜单内容 - 绝对定位在 body 层级 */}
          <div 
            className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width
            }}
          >
            <div className="max-h-60 overflow-y-auto">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model.id)}
                  className={`
                    w-full px-3 py-2 text-left text-sm
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    transition-colors
                    flex items-start justify-between gap-2
                  `}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {model.name}
                      </span>
                      {model.id === value && (
                        <Check className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {model.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default ModelSelector;
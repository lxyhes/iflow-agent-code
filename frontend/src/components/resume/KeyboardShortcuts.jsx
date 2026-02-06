/**
 * KeyboardShortcuts - 快捷键支持组件
 * 
 * 提供简历编辑器的键盘快捷键功能
 */

import React, { useEffect, useCallback, useState } from 'react';
import { 
  Keyboard, 
  X, 
  Command,
  Save,
  Undo,
  Redo,
  Eye,
  FileText,
  Zap,
  HelpCircle
} from 'lucide-react';

// 快捷键配置
const SHORTCUTS = [
  {
    category: '文件操作',
    items: [
      { key: 'Ctrl+S', description: '保存简历', icon: Save },
      { key: 'Ctrl+Shift+S', description: '另存为新版本', icon: FileText },
    ]
  },
  {
    category: '编辑操作',
    items: [
      { key: 'Ctrl+Z', description: '撤销', icon: Undo },
      { key: 'Ctrl+Shift+Z', description: '重做', icon: Redo },
      { key: 'Ctrl+F', description: '查找内容', icon: null },
    ]
  },
  {
    category: '导航切换',
    items: [
      { key: 'Ctrl+1', description: '个人信息', icon: null },
      { key: 'Ctrl+2', description: '工作经历', icon: null },
      { key: 'Ctrl+3', description: '教育经历', icon: null },
      { key: 'Ctrl+4', description: '技能特长', icon: null },
      { key: 'Ctrl+5', description: '项目经历', icon: null },
    ]
  },
  {
    category: '功能快捷',
    items: [
      { key: 'Ctrl+P', description: '预览简历', icon: Eye },
      { key: 'Ctrl+D', description: '简历诊断', icon: Zap },
      { key: 'Ctrl+?', description: '显示快捷键帮助', icon: HelpCircle },
    ]
  },
];

const KeyboardShortcuts = ({ 
  onSave, 
  onUndo, 
  onRedo, 
  onPreview, 
  onDiagnostic,
  onTabChange,
  currentTab,
  children 
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [pressedKeys, setPressedKeys] = useState(new Set());

  // 处理键盘事件
  const handleKeyDown = useCallback((e) => {
    const { key, ctrlKey, shiftKey, altKey, metaKey } = e;
    
    // 如果在输入框中，不触发快捷键（除了特定组合）
    const isInput = e.target.tagName === 'INPUT' || 
                    e.target.tagName === 'TEXTAREA' ||
                    e.target.isContentEditable;
    
    // 构建快捷键标识
    const modifiers = [];
    if (ctrlKey || metaKey) modifiers.push('Ctrl');
    if (shiftKey) modifiers.push('Shift');
    if (altKey) modifiers.push('Alt');
    
    const shortcutKey = modifiers.length > 0 
      ? `${modifiers.join('+')}+${key.toUpperCase()}`
      : key.toUpperCase();

    // 更新按下的键（用于显示）
    setPressedKeys(prev => new Set([...prev, key.toUpperCase()]));

    // 处理快捷键
    switch (shortcutKey) {
      case 'CTRL+S':
      case 'META+S':
        e.preventDefault();
        onSave?.();
        break;
        
      case 'CTRL+Z':
      case 'META+Z':
        if (!isInput) {
          e.preventDefault();
          onUndo?.();
        }
        break;
        
      case 'CTRL+SHIFT+Z':
      case 'META+SHIFT+Z':
        if (!isInput) {
          e.preventDefault();
          onRedo?.();
        }
        break;
        
      case 'CTRL+P':
      case 'META+P':
        e.preventDefault();
        onPreview?.();
        break;
        
      case 'CTRL+D':
      case 'META+D':
        e.preventDefault();
        onDiagnostic?.();
        break;
        
      case 'CTRL+1':
      case 'META+1':
        e.preventDefault();
        onTabChange?.('personal');
        break;
        
      case 'CTRL+2':
      case 'META+2':
        e.preventDefault();
        onTabChange?.('experience');
        break;
        
      case 'CTRL+3':
      case 'META+3':
        e.preventDefault();
        onTabChange?.('education');
        break;
        
      case 'CTRL+4':
      case 'META+4':
        e.preventDefault();
        onTabChange?.('skills');
        break;
        
      case 'CTRL+5':
      case 'META+5':
        e.preventDefault();
        onTabChange?.('projects');
        break;
        
      case 'CTRL+?':
      case 'META+?':
      case 'CTRL+/':
      case 'META+/':
        e.preventDefault();
        setShowHelp(true);
        break;
        
      case 'ESCAPE':
        if (showHelp) {
          setShowHelp(false);
        }
        break;
        
      default:
        break;
    }
  }, [onSave, onUndo, onRedo, onPreview, onDiagnostic, onTabChange, showHelp]);

  const handleKeyUp = useCallback((e) => {
    setPressedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(e.key.toUpperCase());
      return newSet;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return (
    <>
      {children}
      
      {/* 快捷键提示按钮 */}
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-gray-800 dark:bg-gray-700 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-110 z-40"
        title="快捷键帮助 (Ctrl+?)"
      >
        <Command className="w-5 h-5" />
      </button>

      {/* 快捷键帮助面板 */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                  <Keyboard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    键盘快捷键
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    使用快捷键提高编辑效率
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {SHORTCUTS.map((category, idx) => (
                  <div key={idx} className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                      {category.category}
                    </h4>
                    <div className="space-y-2">
                      {category.items.map((item, itemIdx) => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={itemIdx}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {Icon && (
                                <Icon className="w-4 h-4 text-gray-400" />
                              )}
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {item.description}
                              </span>
                            </div>
                            <kbd className="px-2 py-1 text-xs font-mono bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded shadow-sm text-gray-700 dark:text-gray-300">
                              {item.key}
                            </kbd>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* 提示 */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <strong>提示：</strong>在输入框中编辑时，Ctrl+Z 会执行输入框的撤销操作。
                  要执行简历的撤销操作，请先点击输入框外部。
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                按 <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-600 border rounded text-gray-700 dark:text-gray-300">Esc</kbd> 关闭此面板
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 按键显示（调试/反馈用） */}
      {pressedKeys.size > 0 && (
        <div className="fixed bottom-20 right-6 flex gap-2 z-30">
          {Array.from(pressedKeys).map((key, idx) => (
            <kbd
              key={idx}
              className="px-3 py-1.5 bg-gray-800 dark:bg-gray-700 text-white text-sm font-mono rounded-lg shadow-lg animate-pulse"
            >
              {key}
            </kbd>
          ))}
        </div>
      )}
    </>
  );
};

export default KeyboardShortcuts;

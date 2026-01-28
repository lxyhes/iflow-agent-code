/**
 * MentionPicker Component
 * @ 提及选择器 - 显示文件/代码补全列表
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FileCode, Folder, Search } from 'lucide-react';

const MentionPicker = ({
  isOpen,
  onClose,
  onSelect,
  searchTerm,
  projectFiles = [],
  cursorPosition
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredItems, setFilteredItems] = useState([]);
  const containerRef = useRef(null);

  // 标准化文件路径 - 支持多种格式
  const normalizedFiles = useMemo(() => {
    if (!Array.isArray(projectFiles)) {
      console.log('[MentionPicker] projectFiles is not an array:', typeof projectFiles);
      return [];
    }
    
    return projectFiles.map(file => {
      // 如果是字符串，直接使用
      if (typeof file === 'string') return file;
      // 如果是对象，尝试获取 path 或 name 属性
      if (typeof file === 'object' && file !== null) {
        return file.path || file.name || file.id || String(file);
      }
      return String(file);
    }).filter(Boolean);
  }, [projectFiles]);

  // 调试日志
  useEffect(() => {
    if (isOpen) {
      console.log('[MentionPicker] Opened with', normalizedFiles.length, 'files');
      console.log('[MentionPicker] Search term:', searchTerm);
    }
  }, [isOpen, normalizedFiles.length, searchTerm]);

  // 过滤和排序文件列表
  useEffect(() => {
    if (!searchTerm) {
      // 显示最近使用的文件或常用文件
      setFilteredItems(normalizedFiles.slice(0, 10));
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = normalizedFiles
      .filter(file => file.toLowerCase().includes(term))
      .sort((a, b) => {
        // 优先匹配文件名开头
        const aStarts = a.toLowerCase().startsWith(term);
        const bStarts = b.toLowerCase().startsWith(term);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        // 其次按路径长度排序（越短越靠前）
        return a.length - b.length;
      })
      .slice(0, 15); // 最多显示 15 个

    setFilteredItems(filtered);
    setSelectedIndex(0);
  }, [searchTerm, normalizedFiles]);

  // 键盘导航
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredItems.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            onSelect(filteredItems[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onSelect, onClose]);

  // 确保选中项可见
  useEffect(() => {
    if (containerRef.current && isOpen) {
      const selectedEl = containerRef.current.children[selectedIndex];
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, isOpen]);

  // 获取文件图标
  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const codeExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs'];
    const styleExts = ['css', 'scss', 'less', 'sass'];
    const configExts = ['json', 'yaml', 'yml', 'toml', 'ini'];
    
    if (codeExts.includes(ext)) return <FileCode className="w-4 h-4 text-blue-500" />;
    if (styleExts.includes(ext)) return <FileCode className="w-4 h-4 text-pink-500" />;
    if (configExts.includes(ext)) return <FileCode className="w-4 h-4 text-gray-500" />;
    return <FileCode className="w-4 h-4 text-gray-400" />;
  };

  // 高亮匹配文本
  const highlightMatch = (text, term) => {
    if (!term) return text;
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === term.toLowerCase() ? (
        <span key={i} className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium">
          {part}
        </span>
      ) : part
    );
  };

  if (!isOpen) return null;

  return (
    <div 
      className="absolute left-0 right-0 bottom-full mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
      style={{ maxHeight: '320px' }}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Search className="w-3.5 h-3.5" />
          <span>选择文件引用</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <kbd className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded border">↑↓</kbd>
          <span>选择</span>
          <kbd className="px-1 py-0.5 bg-white dark:bg-gray-700 rounded border ml-1">Enter</kbd>
          <span>确认</span>
        </div>
      </div>

      {/* 文件列表 */}
      <div 
        ref={containerRef}
        className="overflow-y-auto"
        style={{ maxHeight: '240px' }}
      >
        {filteredItems.length > 0 ? (
          filteredItems.map((file, index) => (
            <button
              key={file}
              onClick={() => onSelect(file)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                index === selectedIndex 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              {getFileIcon(file)}
              <span className="flex-1 truncate font-mono text-xs">
                {highlightMatch(file, searchTerm)}
              </span>
            </button>
          ))
        ) : (
          <div className="px-3 py-8 text-center text-gray-400 dark:text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {normalizedFiles.length === 0 
                ? '暂无项目文件' 
                : '未找到匹配的文件'}
            </p>
            <p className="text-xs mt-1 opacity-70">
              {normalizedFiles.length === 0 
                ? '请确保已选择项目' 
                : `已加载 ${normalizedFiles.length} 个文件`}
            </p>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700 text-[10px] text-gray-400 text-center">
        {filteredItems.length > 0 
          ? `找到 ${filteredItems.length} 个文件` 
          : normalizedFiles.length > 0 
            ? '输入关键词搜索文件'
            : '无可用文件'}
      </div>
    </div>
  );
};

export default MentionPicker;

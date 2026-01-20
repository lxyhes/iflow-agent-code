/**
 * SQL Query Editor Component
 * 强大的 SQL 查询编辑器，支持语法高亮、自动补全等
 */

import React, { useState, useRef, useEffect } from 'react';
import { Play, Save, History, Copy, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

const SqlEditor = ({
  value,
  onChange,
  onExecute,
  onSave,
  templates,
  history,
  onTemplateSelect,
  onHistorySelect,
  placeholder = "输入 SQL 查询语句..."
}) => {
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const textareaRef = useRef(null);

  const handleKeyDown = (e) => {
    // Ctrl+Enter 执行查询
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onExecute();
    }
    // Tab 键插入 2 个空格
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const insertTemplate = (template) => {
    onChange(template.sql);
    setIsTemplatesOpen(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const insertHistory = (historyItem) => {
    onChange(historyItem.sql);
    setIsHistoryOpen(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const clearEditor = () => {
    onChange('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <button
            onClick={onExecute}
            className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
            title="执行查询 (Ctrl+Enter)"
          >
            <Play className="w-4 h-4" />
            <span>执行</span>
          </button>

          <button
            onClick={onSave}
            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
            title="保存为模板"
          >
            <Save className="w-4 h-4" />
            <span>保存</span>
          </button>

          <div className="relative">
            <button
              onClick={() => {
                setIsTemplatesOpen(!isTemplatesOpen);
                setIsHistoryOpen(false);
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
              title="查询模板"
            >
              <History className="w-4 h-4" />
              <span>模板</span>
              {isTemplatesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>

            {isTemplatesOpen && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                <div className="px-4 py-2 border-b border-gray-700">
                  <h3 className="text-sm font-semibold text-white">查询模板</h3>
                </div>
                {templates.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-400 text-sm">
                    暂无模板
                  </div>
                ) : (
                  templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => insertTemplate(template)}
                      className="px-4 py-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-white">{template.name}</div>
                          <div className="text-xs text-gray-400 mt-1">{template.description}</div>
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">
                          {template.category}
                        </span>
                      </div>
                      {template.params && template.params.length > 0 && (
                        <div className="text-xs text-blue-400 mt-2">
                          参数: {template.params.join(', ')}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setIsHistoryOpen(!isHistoryOpen);
                setIsTemplatesOpen(false);
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
              title="查询历史"
            >
              <History className="w-4 h-4" />
              <span>历史</span>
              {isHistoryOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>

            {isHistoryOpen && (
              <div className="absolute top-full left-0 mt-2 w-96 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                <div className="px-4 py-2 border-b border-gray-700">
                  <h3 className="text-sm font-semibold text-white">查询历史</h3>
                </div>
                {history.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-400 text-sm">
                    暂无历史记录
                  </div>
                ) : (
                  history.slice().reverse().map((item, index) => (
                    <div
                      key={index}
                      onClick={() => insertHistory(item)}
                      className="px-4 py-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
                    >
                      <div className="text-xs text-gray-400 mb-1">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                      <div className="text-sm text-white font-mono truncate">
                        {item.sql}
                      </div>
                      <div className="flex items-center space-x-4 mt-2 text-xs">
                        <span className={item.success ? 'text-green-400' : 'text-red-400'}>
                          {item.success ? '✓ 成功' : '✗ 失败'}
                        </span>
                        {item.row_count !== undefined && (
                          <span className="text-gray-400">{item.row_count} 行</span>
                        )}
                        {item.execution_time && (
                          <span className="text-gray-400">{item.execution_time.toFixed(3)}s</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={clearEditor}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
            title="清空编辑器"
          >
            <Trash2 className="w-4 h-4" />
            <span>清空</span>
          </button>
        </div>
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full h-full bg-gray-900 text-gray-100 font-mono text-sm p-4 resize-none focus:outline-none"
          spellCheck="false"
        />
      </div>

      {/* 状态栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex items-center space-x-4">
          <span>行数: {value.split('\n').length}</span>
          <span>字符数: {value.length}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-gray-500">Ctrl+Enter</span>
          <span>执行查询</span>
        </div>
      </div>
    </div>
  );
};

export default SqlEditor;
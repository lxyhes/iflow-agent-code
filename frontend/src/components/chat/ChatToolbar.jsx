/**
 * ChatToolbar Component
 * 聊天工具栏组件
 */

import React, { useState } from 'react';
import { Download, MoreVertical } from 'lucide-react';
import { exportToMarkdown, exportToJSON, exportToText } from '../../utils/exportChat';
import ModelSelector from '../ModelSelector';

const ChatToolbar = ({
  showMoreMenu,
  setShowMoreMenu,
  onShowDeveloperTools,
  messages,
  selectedProject,
  selectedSession,
  model,
  onModelChange
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExport = (format) => {
    if (format === 'markdown') {
      exportToMarkdown(messages, selectedProject?.name, selectedSession?.id);
    } else if (format === 'json') {
      exportToJSON(messages, selectedProject?.name, selectedSession?.id);
    } else if (format === 'text') {
      exportToText(messages, selectedProject?.name, selectedSession?.id);
    }
    setShowExportMenu(false);
  };

  return (
    <div className="flex items-center gap-3">
      {/* 模型选择器 */}
      {onModelChange && (
        <ModelSelector
          value={model}
          onChange={onModelChange}
          className="w-40"
          label=""
        />
      )}

      <div className="relative">
        <button
          onClick={() => setShowExportMenu(!showExportMenu)}
          className="w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl flex items-center justify-center transition-all"
          title="Export chat"
        >
          <Download className="w-5 h-5" />
        </button>

        {showExportMenu && (
          <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-bottom-2">
            <button
              onClick={() => handleExport('markdown')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <span className="text-sm">Markdown</span>
            </button>
            <button
              onClick={() => handleExport('json')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <span className="text-sm">JSON</span>
            </button>
            <button
              onClick={() => handleExport('text')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <span className="text-sm">Plain Text</span>
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowMoreMenu(!showMoreMenu)}
        className="w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl flex items-center justify-center transition-all"
        title="More options"
      >
        <MoreVertical className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ChatToolbar;
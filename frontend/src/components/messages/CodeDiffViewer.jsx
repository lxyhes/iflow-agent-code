/**
 * CodeDiffViewer Component
 * 代码差异对比组件
 * 
 * 显示文件修改前后的代码对比，支持：
 * - 并排对比模式
 * - 统一差异模式
 * - 语法高亮
 * - 行号显示
 * - 可折叠的代码块
 */

import React, { useState } from 'react';

const CodeDiffViewer = ({ 
  oldContent, 
  newContent, 
  fileName, 
  language = 'javascript',
  mode = 'unified' // 'unified' or 'split'
}) => {
  const [viewMode, setViewMode] = useState(mode);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  // 计算差异
  const computeDiff = (oldText, newText) => {
    const oldLines = (oldText || '').split('\n');
    const newLines = (newText || '').split('\n');
    const diff = [];
    
    let i = 0, j = 0;
    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        diff.push({ type: 'unchanged', oldLine: i + 1, newLine: j + 1, content: oldLines[i] });
        i++; j++;
      } else if (j < newLines.length && (i >= oldLines.length || oldLines.indexOf(newLines[j], i) === -1)) {
        diff.push({ type: 'added', oldLine: null, newLine: j + 1, content: newLines[j] });
        j++;
      } else if (i < oldLines.length) {
        diff.push({ type: 'removed', oldLine: i + 1, newLine: null, content: oldLines[i] });
        i++;
      }
    }
    
    return diff;
  };

  const diffLines = computeDiff(oldContent, newContent);

  // 统计信息
  const stats = {
    additions: diffLines.filter(l => l.type === 'added').length,
    deletions: diffLines.filter(l => l.type === 'removed').length,
    unchanged: diffLines.filter(l => l.type === 'unchanged').length
  };

  // 获取语言图标
  const getLanguageIcon = (lang) => {
    const icons = {
      javascript: '📜',
      typescript: '📘',
      python: '🐍',
      java: '☕',
      cpp: '⚙️',
      css: '🎨',
      html: '🌐',
      json: '📋',
      markdown: '📝',
      default: '📄'
    };
    return icons[lang.toLowerCase()] || icons.default;
  };

  // 语法高亮（简化版）
  const highlightCode = (code, language) => {
    // 这里可以集成 prism.js 或 highlight.js
    // 暂时返回原始代码
    return code;
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-xl">{getLanguageIcon(language)}</span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {fileName || '代码修改'}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-green-600 dark:text-green-400">
                +{stats.additions} 行
              </span>
              <span className="text-xs text-red-600 dark:text-red-400">
                -{stats.deletions} 行
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                共 {stats.unchanged + stats.additions + stats.deletions} 行
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 视图模式切换 */}
          <button
            onClick={() => setViewMode('unified')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              viewMode === 'unified'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            统一视图
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              viewMode === 'split'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            分屏视图
          </button>

          {/* 行号切换 */}
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              showLineNumbers
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            行号
          </button>

          {/* 展开/折叠 */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <svg 
              className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 代码对比区域 */}
      {isExpanded && (
        <div className="overflow-x-auto">
          {viewMode === 'unified' ? (
            // 统一视图
            <div className="font-mono text-xs">
              {diffLines.map((line, index) => (
                <div
                  key={index}
                  className={`flex ${
                    line.type === 'added'
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : line.type === 'removed'
                        ? 'bg-red-50 dark:bg-red-900/20'
                        : 'bg-white dark:bg-gray-900'
                  }`}
                >
                  {/* 行号 */}
                  {showLineNumbers && (
                    <>
                      <div className={`w-12 flex-shrink-0 text-right pr-2 py-0.5 select-none ${
                        line.type === 'added'
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                          : line.type === 'removed'
                            ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500'
                      }`}>
                        {line.oldLine || ''}
                      </div>
                      <div className={`w-12 flex-shrink-0 text-right pr-2 py-0.5 select-none ${
                        line.type === 'added'
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                          : line.type === 'removed'
                            ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500'
                      }`}>
                        {line.newLine || ''}
                      </div>
                    </>
                  )}

                  {/* 差异标记 */}
                  <div className={`w-8 flex-shrink-0 text-center py-0.5 select-none font-bold ${
                    line.type === 'added'
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                      : line.type === 'removed'
                        ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                  }`}>
                    {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                  </div>

                  {/* 代码内容 */}
                  <div className="flex-1 px-2 py-0.5 whitespace-pre text-gray-800 dark:text-gray-200">
                    {highlightCode(line.content, language)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // 分屏视图
            <div className="grid grid-cols-2 font-mono text-xs">
              {/* 旧代码 */}
              <div className="border-r border-gray-200 dark:border-gray-700">
                {diffLines.map((line, index) => (
                  line.type !== 'added' && (
                    <div
                      key={`old-${index}`}
                      className={`flex ${
                        line.type === 'removed'
                          ? 'bg-red-50 dark:bg-red-900/20'
                          : 'bg-white dark:bg-gray-900'
                      }`}
                    >
                      {showLineNumbers && (
                        <div className={`w-12 flex-shrink-0 text-right pr-2 py-0.5 select-none ${
                          line.type === 'removed'
                            ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500'
                        }`}>
                          {line.oldLine || ''}
                        </div>
                      )}
                      <div className="flex-1 px-2 py-0.5 whitespace-pre text-gray-800 dark:text-gray-200">
                        {highlightCode(line.content, language)}
                      </div>
                    </div>
                  )
                ))}
              </div>

              {/* 新代码 */}
              <div>
                {diffLines.map((line, index) => (
                  line.type !== 'removed' && (
                    <div
                      key={`new-${index}`}
                      className={`flex ${
                        line.type === 'added'
                          ? 'bg-green-50 dark:bg-green-900/20'
                          : 'bg-white dark:bg-gray-900'
                      }`}
                    >
                      {showLineNumbers && (
                        <div className={`w-12 flex-shrink-0 text-right pr-2 py-0.5 select-none ${
                          line.type === 'added'
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500'
                        }`}>
                          {line.newLine || ''}
                        </div>
                      )}
                      <div className="flex-1 px-2 py-0.5 whitespace-pre text-gray-800 dark:text-gray-200">
                        {highlightCode(line.content, language)}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CodeDiffViewer;

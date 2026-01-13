import React, { useState, useCallback } from 'react';
import SnippetManager from './SnippetManager';
import CommandShortcut from './CommandShortcut';
import PromptManager from './PromptManager';
import SolutionGenerator from './SolutionGenerator';
import BusinessFlowSummarizer from './BusinessFlowSummarizer';

/**
 * 开发者工具栏组件
 * 集成代码片段管理器、命令快捷方式等开发工具
 * 现代化 Glassmorphism 设计
 */

const DeveloperTools = ({ onInsertSnippet, onInsertPrompt }) => {
  const [activeTool, setActiveTool] = useState(null); // 'snippets' | 'commands' | 'prompts' | 'solution' | 'flow' | null
  const [isCodeReviewOpen, setIsCodeReviewOpen] = useState(false);

  const handleToolClick = (tool) => {
    setActiveTool(activeTool === tool ? null : tool);
  };

  const handleClose = () => {
    setActiveTool(null);
  };

  const tools = [
    {
      id: 'snippets',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      label: '代码片段',
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'commands',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      label: '命令快捷',
      color: 'green',
      gradient: 'from-green-500 to-green-600'
    },
    {
      id: 'codeReview',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: '代码审查',
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      id: 'prompts',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      label: '提示词',
      color: 'yellow',
      gradient: 'from-yellow-500 to-yellow-600'
    },
    {
      id: 'solution',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      label: '方案生成',
      color: 'indigo',
      gradient: 'from-indigo-500 to-indigo-600'
    },
    {
      id: 'flow',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      label: '业务流程',
      color: 'pink',
      gradient: 'from-pink-500 to-pink-600'
    }
  ];

  return (
    <div className="relative z-40">
      {/* 现代化标签栏 */}
      <div className="relative inline-flex items-center gap-1 px-2 py-2 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
        {/* 标签按钮 */}
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => tool.id === 'codeReview' ? setIsCodeReviewOpen(true) : handleToolClick(tool.id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              (activeTool === tool.id || (tool.id === 'codeReview' && isCodeReviewOpen))
                ? `bg-gradient-to-r ${tool.gradient} text-white shadow-lg shadow-${tool.color}-500/25 transform scale-105`
                : 'bg-white/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80 hover:shadow-md'
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              {tool.icon}
              <span>{tool.label}</span>
            </span>
            
            {/* 激活状态的高光效果 */}
            {(activeTool === tool.id || (tool.id === 'codeReview' && isCodeReviewOpen)) && (
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-xl" />
            )}
          </button>
        ))}

        {/* 右下角装饰性渐变 */}
        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-br-xl opacity-60 blur-sm" />
      </div>

      {/* 模态框弹出面板 */}
      {activeTool && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="w-[1200px] h-[700px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            {/* 面板头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tools.find(t => t.id === activeTool)?.gradient} flex items-center justify-center`}>
                  {tools.find(t => t.id === activeTool)?.icon}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {tools.find(t => t.id === activeTool)?.label}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activeTool === 'snippets' && '管理和快速插入代码片段'}
                    {activeTool === 'commands' && '保存和执行常用命令'}
                    {activeTool === 'prompts' && '管理提示词模板'}
                    {activeTool === 'solution' && '快速生成技术方案'}
                    {activeTool === 'flow' && '查看业务流程总结'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors group"
              >
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 面板内容 */}
            <div className="flex-1 overflow-hidden">
              {activeTool === 'snippets' && (
                <SnippetManager
                  onInsertSnippet={onInsertSnippet}
                  onClose={handleClose}
                />
              )}
              {activeTool === 'commands' && (
                <CommandShortcut
                  onClose={handleClose}
                />
              )}
              {activeTool === 'prompts' && (
                <PromptManager
                  onInsertPrompt={onInsertPrompt}
                  onClose={handleClose}
                />
              )}
              {activeTool === 'solution' && (
                <SolutionGenerator
                  onClose={handleClose}
                />
              )}
              {activeTool === 'flow' && (
                <BusinessFlowSummarizer
                  onClose={handleClose}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 代码审查对话框 */}
      {isCodeReviewOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="w-[800px] h-[600px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  代码审查
                </h2>
              </div>
              <button
                onClick={() => setIsCodeReviewOpen(false)}
                className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors group"
              >
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 flex items-center justify-center">
                  <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">代码审查功能</p>
                <p className="text-sm mb-4">
                  此功能允许您审查代码质量、安全性和性能问题。
                </p>
                <p className="text-sm">
                  选择文件后，系统会自动分析代码并提供改进建议。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperTools;
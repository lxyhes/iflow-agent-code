/**
 * Tool Usage Card Component
 * 工具调用卡片组件
 */

import React from 'react';

const ToolUsageCard = ({ message }) => {
  if (!message.isToolUse || !message.toolType) return null;

  const isRunning = message.toolStatus === 'running';
  const isFailed = message.toolStatus === 'failed';
  const isSuccess = message.toolStatus === 'success' || message.toolStatus === 'completed';

  return (
    <div className={`group relative border-l-2 pl-3 py-2 my-2 rounded-r-lg transition-all duration-300 ${
        isRunning
          ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-400 animate-pulse'
          : isFailed
            ? 'bg-red-50/50 dark:bg-red-900/20 border-red-400'
            : isSuccess
              ? 'bg-green-50/50 dark:bg-green-900/20 border-green-400'
              : 'bg-gray-50/50 dark:bg-gray-900/20 border-gray-400'
      }`}>
      <div className="flex items-center gap-2 text-sm">
        {/* 运行中动画 */}
        {isRunning && (
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        )}

        {/* 成功图标 */}
        {isSuccess && (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}

        {/* 失败图标 */}
        {isFailed && (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}

        {/* 工具类型图标 */}
        {message.toolType === 'read_file' && (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )}
        {message.toolType === 'write_file' && (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )}
        {message.toolType === 'command' && (
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
        {message.toolType === 'search' && (
          <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}
        {message.toolType === 'run_shell_command' && (
          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
        {!['read_file', 'write_file', 'command', 'search', 'run_shell_command'].includes(message.toolType) && (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}

        {/* 工具名称 */}
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {message.toolType === 'read_file' ? 'Read file' :
            message.toolType === 'write_file' ? 'Write file' :
              message.toolType === 'command' ? 'Command' :
                message.toolType === 'search' ? 'Search' :
                  message.toolType === 'run_shell_command' ? 'Shell Command' :
                    message.toolName || 'Tool'}
        </span>

        {/* 运行中状态文字 */}
        {isRunning && (
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse">
            Running...
          </span>
        )}

        {/* 工具参数显示 */}
        {message.toolLabel && (
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-xs">
            {message.toolLabel}
          </span>
        )}

        {/* AgentInfo 显示 - 支持多种格式 */}
        {message.agentInfo && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-200 dark:border-indigo-800">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {message.agentInfo.name || message.agentInfo.role ||
             (message.agentInfo.agent_index !== undefined && message.agentInfo.agent_index !== null && `Agent ${message.agentInfo.agent_index}`) ||
             'Agent'}
          </span>
        )}
      </div>
    </div>
  );
};

export default ToolUsageCard;
/**
 * Tool Usage Card Component
 * 工具调用卡片组件 - 增强版
 * 
 * 支持显示：
 * - 工具调用状态
 * - 工具参数
 * - Agent 信息
 * - 代码修改对比（write_file）
 * - 命令执行结果（run_shell_command）
 */

import React, { useState } from 'react';
import CodeDiffViewer from './CodeDiffViewer';

const ToolUsageCard = ({ message }) => {
  // 如果消息有 tools 数组，渲染工具调用摘要
  if (message.tools && Array.isArray(message.tools) && message.tools.length > 0) {
    return <ToolSummary tools={message.tools} />;
  }

  // 兼容旧版本：如果消息本身是工具调用
  if (!message.isToolUse || !message.toolType) return null;
  return <SingleToolCard tool={message} />;
};

// 工具调用摘要组件（合并显示）
const ToolSummary = ({ tools }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 统计工具调用
  const toolStats = tools.reduce((acc, tool) => {
    const key = tool.toolType || 'unknown';
    if (!acc[key]) {
      acc[key] = { count: 0, successful: 0, failed: 0, running: 0, tools: [] };
    }
    acc[key].count++;
    acc[key].tools.push(tool);
    if (tool.toolStatus === 'success' || tool.toolStatus === 'completed') acc[key].successful++;
    else if (tool.toolStatus === 'failed' || tool.toolStatus === 'error') acc[key].failed++;
    else if (tool.toolStatus === 'running') acc[key].running++;
    return acc;
  }, {});

  // 计算总状态
  const totalTools = tools.length;
  const successfulTools = tools.filter(t => t.toolStatus === 'success' || t.toolStatus === 'completed').length;
  const failedTools = tools.filter(t => t.toolStatus === 'failed' || t.toolStatus === 'error').length;
  const runningTools = tools.filter(t => t.toolStatus === 'running').length;

  // 判断是否全部完成
  const allCompleted = runningTools === 0 && (successfulTools + failedTools === totalTools);

  return (
    <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* 工具调用摘要栏 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm">
          <svg
            className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>

          {runningTools > 0 && (
            <svg className="w-4 h-4 text-yellow-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}

          <span className="text-gray-700 dark:text-gray-300">
            工具调用 ({totalTools})
          </span>

          {/* 成功/失败/进行中计数 */}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {successfulTools > 0 && <span className="text-green-600 dark:text-green-400">✓ {successfulTools}</span>}
            {failedTools > 0 && <span className="text-red-600 dark:text-red-400 ml-1">✗ {failedTools}</span>}
            {runningTools > 0 && <span className="text-yellow-600 dark:text-yellow-400 ml-1">⏳ {runningTools}</span>}
          </span>
        </div>

        {/* 工具类型徽章 */}
        <div className="flex items-center gap-1">
          {Object.keys(toolStats).map((toolType) => (
            <span
              key={toolType}
              className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full"
            >
              {toolType}: {toolStats[toolType].count}
            </span>
          ))}
        </div>
      </button>

      {/* 展开的工具调用详情 */}
      {isExpanded && (
        <div className="p-3 space-y-2 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          {tools.map((tool, index) => (
            <SingleToolCard key={tool.id || index} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
};

// 单个工具调用卡片组件
const SingleToolCard = ({ tool }) => {
  const [showDiff, setShowDiff] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const isRunning = tool.toolStatus === 'running';
  const isFailed = tool.toolStatus === 'failed';
  const isSuccess = tool.toolStatus === 'success' || tool.toolStatus === 'completed';

  // 判断是否是文件写入操作
  const isFileWrite = tool.toolType === 'write_file' || tool.toolType === 'replace';

  // 判断是否是命令执行操作
  const isCommand = tool.toolType === 'command' || tool.toolType === 'run_shell_command';

  const imageItems = (() => {
    const imgs = [];
    const addDataUrl = (dataUrl) => {
      const s = String(dataUrl || '');
      if (!s.startsWith('data:image/')) return;
      imgs.push({ src: s });
    };
    const addHttpUrl = (url) => {
      const s = String(url || '');
      if (!/^https?:\/\//i.test(s)) return;
      if (!/\.(png|jpg|jpeg|gif|webp|svg)(\?|#|$)/i.test(s)) return;
      imgs.push({ src: s });
    };

    if (typeof tool.result === 'string') {
      addDataUrl(tool.result);
      addHttpUrl(tool.result);
    } else if (tool.result && typeof tool.result === 'object') {
      if (typeof tool.result.image_base64 === 'string' && tool.result.image_base64) {
        addDataUrl(`data:image/png;base64,${tool.result.image_base64}`);
      }
      if (typeof tool.result.preview_url === 'string') addHttpUrl(tool.result.preview_url);
      if (Array.isArray(tool.result.images)) {
        for (const it of tool.result.images) {
          if (!it) continue;
          if (typeof it === 'string') {
            addDataUrl(it);
            addHttpUrl(it);
          } else if (typeof it === 'object') {
            if (typeof it.dataUrl === 'string') addDataUrl(it.dataUrl);
            if (typeof it.url === 'string') addHttpUrl(it.url);
            if (typeof it.base64 === 'string' && it.base64) addDataUrl(`data:${it.mimeType || 'image/png'};base64,${it.base64}`);
          }
          if (imgs.length >= 6) break;
        }
      }
    }

    return imgs;
  })();

  // 提取文件信息
  const fileName = tool.toolLabel?.match(/path:\s*([^\s,]+)/)?.[1] ||
                  tool.toolLabel?.split(',')[0] ||
                  'unknown.js';

  // 提取语言类型
  const language = fileName.split('.').pop() || 'javascript';

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
      {/* 工具信息头部 */}
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
        {tool.toolType === 'read_file' && (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )}
        {tool.toolType === 'write_file' && (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )}
        {tool.toolType === 'command' && (
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
        {tool.toolType === 'search' && (
          <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}
        {tool.toolType === 'run_shell_command' && (
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}

        {/* 默认工具图标 */}
        {!['read_file', 'write_file', 'command', 'search', 'run_shell_command'].includes(tool.toolType) && (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}

        {/* 工具名称 */}
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {tool.toolType === 'read_file' ? 'Read file' :
          tool.toolType === 'write_file' ? 'Write file' :
          tool.toolType === 'command' ? 'Command' :
          tool.toolType === 'search' ? 'Search' :
          tool.toolType === 'run_shell_command' ? 'Shell Command' :
          tool.toolName || 'Tool'}
        </span>

        {/* 工具标签/描述 */}
        {tool.toolLabel && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            {tool.toolLabel}
          </span>
        )}

        {/* Agent 信息 */}
        {tool.agentInfo && (
          <span className="text-xs text-purple-600 dark:text-purple-400 ml-2">
            {tool.agentInfo.name || tool.agentInfo.role ||
            (tool.agentInfo.agent_index !== undefined && tool.agentInfo.agent_index !== null && `Agent ${tool.agentInfo.agent_index}`) ||
            'Agent'}
          </span>
        )}

        {/* 运行中状态文字 */}
        {isRunning && (
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse">
            Running...
          </span>
        )}

        {/* 工具参数显示 */}
        {tool.toolLabel && (
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-xs">
            {tool.toolLabel}
          </span>
        )}

        {/* AgentInfo 显示 */}
        {tool.agentInfo && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-200 dark:border-indigo-800">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {tool.agentInfo.name || tool.agentInfo.role ||
             (tool.agentInfo.agent_index !== undefined && tool.agentInfo.agent_index !== null && `Agent ${tool.agentInfo.agent_index}`) ||
             'Agent'}
          </span>
        )}

        {/* 展开/折叠按钮 */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="ml-auto p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <svg 
            className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${showDetails ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* 详细信息区域 */}
      {showDetails && (
        <div className="mt-3 space-y-3">
          {/* 文件写入操作 - 显示代码对比 */}
          {isFileWrite && tool.oldContent && tool.newContent && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  代码修改对比
                </span>
                <button
                  onClick={() => setShowDiff(!showDiff)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    showDiff
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {showDiff ? '隐藏对比' : '显示对比'}
                </button>
              </div>

              {showDiff && (
                <CodeDiffViewer
                  oldContent={tool.oldContent}
                  newContent={tool.newContent}
                  fileName={fileName}
                  language={language}
                  mode="unified"
                />
              )}
            </div>
          )}

          {/* 命令执行操作 - 显示命令和输出 */}
          {isCommand && (
            <div className="space-y-2">
              <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-green-400 font-mono">$</span>
                  <code className="text-xs text-gray-300 dark:text-gray-200 font-mono flex-1">
                    {tool.toolLabel || 'command'}
                  </code>
                </div>
                {tool.output && (
                  <div className="mt-2 pt-2 border-t border-gray-700">
                    <pre className="text-xs text-gray-400 dark:text-gray-500 font-mono whitespace-pre-wrap">
                      {tool.output}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 工具参数详情 */}
          {tool.toolParams && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                参数详情
              </span>
              <pre className="text-xs text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap">
                {JSON.stringify(tool.toolParams, null, 2)}
              </pre>
            </div>
          )}

          {/* 执行结果 */}
          {tool.result && !isCommand && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 block">
                执行结果
              </span>
              {imageItems.length > 0 && (
                <div className="mb-2 grid grid-cols-2 gap-2">
                  {imageItems.map((img, idx) => (
                    <img
                      key={idx}
                      src={img.src}
                      alt="tool preview"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
              
              {/* Read 工具特殊处理 */}
                            {tool.toolType === 'read_file' && typeof tool.result === 'string' ? (
                              (() => {
                                const fileContent = tool.result;
                                const contentLength = fileContent.length;
                                const isSmallFile = contentLength < 1000;
                                const [isExpanded, setIsExpanded] = useState(isSmallFile);
              
                                return (
                                  <div>
                                    {!isExpanded && contentLength > 0 && (
                                      <button
                                        onClick={() => setIsExpanded(true)}
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline mb-2"                        >
                          查看内容 ({contentLength} 字符)
                        </button>
                      )}
                      {isExpanded && (
                        <div className="relative">
                          <button
                            onClick={() => setIsExpanded(false)}
                            className="absolute top-0 right-0 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            隐藏
                          </button>
                          <pre className="text-xs text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap bg-gray-900 dark:bg-gray-950 rounded-lg p-3 overflow-x-auto max-h-96 overflow-y-auto">
                            <code>{fileContent}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <pre className="text-xs text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap">
                                  {typeof tool.result === 'string'
                                    ? tool.result
                                    : JSON.stringify(tool.result, null, 2)}
                                </pre>              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolUsageCard;

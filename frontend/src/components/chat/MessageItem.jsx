/**
 * MessageItem.jsx - 单个消息组件
 *
 * 显示用户消息、助手消息和工具调用消息
 */

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Copy, Check, ChevronDown, ChevronUp, Code, Play, Terminal, FileText, GitBranch, Zap } from 'lucide-react';
import { api } from '../../utils/api';

const MessageItem = ({ message, onFileOpen, onTaskClick, onShowAllTasks, showRawParameters }) => {
  const [copiedCode, setCopiedCode] = useState({});
  const [expandedTools, setExpandedTools] = useState({});

  const handleCopyCode = async (code, index) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode({ ...copiedCode, [index]: true });
      setTimeout(() => setCopiedCode({ ...copiedCode, [index]: false }), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const toggleToolExpand = (toolIndex) => {
    setExpandedTools({
      ...expandedTools,
      [toolIndex]: !expandedTools[toolIndex]
    });
  };

  const renderToolMessage = (toolMessage) => {
    const toolType = toolMessage.tool_type || 'unknown';
    const toolName = toolMessage.tool_name || 'Tool';
    const status = toolMessage.status || 'unknown';
    const label = toolMessage.label || '';
    const parameters = toolMessage.parameters || {};

    // 获取工具图标
    const getToolIcon = (type) => {
      switch (type) {
        case 'read_file':
        case 'write_file':
          return <FileText className="w-4 h-4" />;
        case 'shell':
        case 'run_shell_command':
          return <Terminal className="w-4 h-4" />;
        case 'git':
          return <GitBranch className="w-4 h-4" />;
        case 'task':
          return <Zap className="w-4 h-4" />;
        default:
          return <Code className="w-4 h-4" />;
      }
    };

    // 获取状态颜色
    const getStatusColor = (status) => {
      switch (status) {
        case 'success':
        case 'completed':
          return 'text-green-500 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
        case 'error':
        case 'failed':
          return 'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
        case 'running':
        case 'in_progress':
          return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
        default:
          return 'text-gray-500 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
      }
    };

    const isExpanded = expandedTools[toolMessage.id] || false;

    return (
      <div className="my-2 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* 工具头部 */}
        <div
          className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={() => toggleToolExpand(toolMessage.id)}
        >
          {getToolIcon(toolType)}
          <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{toolName}</span>
          {label && (
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">
              {label}
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(status)}`}>
            {status}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>

        {/* 工具详情 */}
        {isExpanded && (
          <div className="p-3 bg-white dark:bg-gray-900">
            {/* 参数 */}
            {showRawParameters && Object.keys(parameters).length > 0 && (
              <div className="mb-2">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">参数:</div>
                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
                  {JSON.stringify(parameters, null, 2)}
                </pre>
              </div>
            )}

            {/* 结果 */}
            {toolMessage.result && (
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">结果:</div>
                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-64">
                  {typeof toolMessage.result === 'string'
                    ? toolMessage.result
                    : JSON.stringify(toolMessage.result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // 渲染代码块
  const renderCodeBlock = (code, language, index) => {
    return (
      <div className="relative group">
        <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
          <code className={`language-${language || 'text'}`}>{code}</code>
        </pre>
        <button
          onClick={() => handleCopyCode(code, index)}
          className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          title="复制代码"
        >
          {copiedCode[index] ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-gray-300" />
          )}
        </button>
      </div>
    );
  };

  // 渲染用户消息
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-2">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  // 渲染助手消息
  if (message.role === 'assistant') {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[80%] bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-2 shadow-sm">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                return !inline ? (
                  renderCodeBlock(String(children).replace(/\n$/, ''), language, `${message.id}-${node?.position?.start?.offset || 0}`)
                ) : (
                  <code className={`${className} bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-sm`} {...props}>
                    {children}
                  </code>
                );
              },
              a({ href, children }) {
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 underline"
                  >
                    {children}
                  </a>
                );
              }
            }}
          >
            {message.content}
          </ReactMarkdown>

          {/* 渲染工具消息 */}
          {message.tools && message.tools.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.tools.map((tool, idx) => (
                <div key={idx}>{renderToolMessage(tool)}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 渲染系统消息
  if (message.role === 'system') {
    return (
      <div className="flex justify-center mb-4">
        <div className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg px-4 py-2 text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return null;
};

export default React.memo(MessageItem);

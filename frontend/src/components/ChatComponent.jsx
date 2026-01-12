/**
 * 可复用的聊天组件
 * 支持流式响应、消息历史、自动滚动、Markdown 渲染
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, User, Bot, Copy, Check, Sparkles, FileText, ChevronDown, ChevronUp, ExternalLink, TrendingUp, Star } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatComponent = ({
  messages = [],
  onSendMessage,
  isLoading = false,
  placeholder = "输入消息...",
  disabled = false,
  showCopyButton = true,
  showSources = true,
  className = "",
  maxHeight = "400px"
}) => {
  const [inputValue, setInputValue] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 复制消息
  const handleCopy = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // 切换来源展开/收起
  const toggleSources = (index) => {
    setExpandedSources(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // 发送消息
  const handleSend = () => {
    if (!inputValue.trim() || isLoading || disabled) return;
    onSendMessage(inputValue);
    setInputValue('');
  };

  // 处理键盘事件
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-slate-900/30 ${className}`}>
      {/* 消息列表 */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar"
        style={{ maxHeight }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-60">
            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 ring-1 ring-slate-700/50">
              <Sparkles className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-sm font-medium text-slate-400">开始一次新的对话</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              <div className={`flex items-start gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* 头像 */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 ring-2 ring-blue-500/20' 
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600 ring-2 ring-emerald-500/20'
                }`}>
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* 消息内容 */}
                <div className={`relative group shadow-md transition-all ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl rounded-tr-sm border border-blue-500/30'
                    : 'bg-slate-800/90 text-slate-100 rounded-2xl rounded-tl-sm border border-slate-700/50 backdrop-blur-sm'
                } px-5 py-3.5`}>
                  <div className="text-sm leading-relaxed break-words prose prose-invert max-w-none">
                    {msg.role === 'assistant' ? (
                      <>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({node, ...props}) => <h1 className="text-lg font-bold mt-4 mb-2 text-white border-b border-white/10 pb-1" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-base font-bold mt-3 mb-2 text-white" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-sm font-bold mt-2 mb-1 text-slate-200" {...props} />,
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc list-outside ml-4 mb-2 space-y-1" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-1" {...props} />,
                            li: ({node, ...props}) => <li className="" {...props} />,
                            a: ({node, ...props}) => <a className="text-blue-300 hover:text-blue-200 underline decoration-blue-300/30 underline-offset-2 transition-colors" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                            code: ({node, inline, ...props}) => 
                              inline 
                                ? <code className="bg-slate-900/50 px-1.5 py-0.5 rounded text-xs font-mono text-amber-200 border border-amber-500/10" {...props} />
                                : <code className="block bg-slate-950/50 p-3 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto border border-slate-800 my-2 shadow-inner" {...props} />,
                            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-slate-600 pl-3 my-2 text-slate-400 italic bg-slate-900/20 py-1 pr-2 rounded-r" {...props} />,
                            table: ({node, ...props}) => <div className="overflow-x-auto my-2 rounded-lg border border-slate-700"><table className="min-w-full divide-y divide-slate-700" {...props} /></div>,
                            th: ({node, ...props}) => <th className="bg-slate-900/50 px-3 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider" {...props} />,
                            td: ({node, ...props}) => <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-300 border-t border-slate-800" {...props} />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                        
                        {/* 显示来源信息 */}
                        {showSources && msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-700/50">
                            {/* 置信度评分 */}
                            {msg.confidence && (
                              <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-xs text-slate-400">
                                  置信度: <span className={`font-medium ${
                                    msg.confidence.level === 'high' ? 'text-green-400' :
                                    msg.confidence.level === 'medium' ? 'text-yellow-400' :
                                    'text-red-400'
                                  }`}>{msg.confidence.score}%</span>
                                  <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${
                                    msg.confidence.level === 'high' ? 'bg-green-900/30 text-green-300' :
                                    msg.confidence.level === 'medium' ? 'bg-yellow-900/30 text-yellow-300' :
                                    'bg-red-900/30 text-red-300'
                                  }`}>
                                    {msg.confidence.level === 'high' ? '高' :
                                     msg.confidence.level === 'medium' ? '中' : '低'}
                                  </span>
                                </span>
                              </div>
                            )}
                            
                            {/* 相关文档推荐 */}
                            {msg.related_documents && msg.related_documents.length > 0 && (
                              <div className="flex items-center gap-2 mb-2">
                                <Star className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-xs text-slate-400">
                                  相关文档推荐
                                </span>
                              </div>
                            )}
                            
                            <button
                              onClick={() => toggleSources(index)}
                              className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors mb-2"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="font-medium">参考来源 ({msg.sources.length})</span>
                              {expandedSources[index] ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                            
                            {expandedSources[index] && (
                              <div className="space-y-2 mt-2">
                                {msg.sources.map((source, sourceIndex) => (
                                  <div
                                    key={sourceIndex}
                                    className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-700/30 hover:border-slate-600/50 transition-colors"
                                  >
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <FileText className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                        <span className="text-xs font-mono text-slate-300 truncate flex-1">
                                          {source.file_path}
                                        </span>
                                      </div>
                                      <span className="text-xs text-slate-500 flex-shrink-0">
                                        {source.similarity ? `相似度: ${(source.similarity * 100).toFixed(0)}%` : ''}
                                      </span>
                                    </div>
                                    
                                    {(source.start_line || source.end_line) && (
                                      <div className="text-xs text-slate-500 mb-1.5">
                                        行 {source.start_line || '?'}-{source.end_line || '?'}
                                        {source.language && ` · ${source.language}`}
                                      </div>
                                    )}
                                    
                                    {source.summary && (
                                      <p className="text-xs text-slate-400 italic mb-1.5">
                                        {source.summary}
                                      </p>
                                    )}
                                    
                                    <p className="text-xs text-slate-500 line-clamp-2">
                                      {source.content}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>

                  {/* 复制按钮 */}
                  {showCopyButton && msg.role === 'assistant' && (
                    <button
                      onClick={() => handleCopy(msg.content, index)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 hover:bg-white/10 rounded-md backdrop-blur-sm"
                      title="复制内容"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="p-4 bg-slate-900/20 backdrop-blur-sm border-t border-white/5">
        <div className="relative flex items-end gap-2 bg-slate-800/50 border border-slate-700/50 rounded-xl p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500/50 transition-all">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading || disabled}
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
            className="w-full bg-transparent border-0 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:ring-0 resize-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading || disabled}
            className={`flex-shrink-0 p-2.5 rounded-lg mb-0.5 transition-all duration-200 ${
              !inputValue.trim() || isLoading || disabled
                ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 active:scale-95'
            }`}
            title="发送 (Enter)"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="text-center mt-2">
            <p className="text-[10px] text-slate-500">
               按 <kbd className="font-sans px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">Enter</kbd> 发送，<kbd className="font-sans px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">Shift + Enter</kbd> 换行
            </p>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;
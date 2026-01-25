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
    <div className={`flex flex-col h-full bg-white dark:bg-slate-900/30 ${className}`}>
      {/* 消息列表 */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar"
        style={{ maxHeight }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 opacity-60">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 ring-1 ring-gray-200 dark:ring-slate-700/50">
              <Sparkles className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
            </div>
            <p className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Start a new conversation</p>
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
                <div className={`relative group shadow-sm transition-all ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl rounded-tr-sm border border-blue-500/20'
                    : 'bg-gray-50 dark:bg-slate-800/90 text-gray-800 dark:text-slate-100 rounded-2xl rounded-tl-sm border border-gray-200 dark:border-slate-700/50 backdrop-blur-sm'
                } px-5 py-3.5`}>
                  <div className={`text-sm leading-relaxed break-words prose ${msg.role === 'user' ? 'prose-invert' : 'dark:prose-invert'} max-w-none`}>
                    {msg.role === 'assistant' ? (
                      <>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({node, ...props}) => <h1 className="text-lg font-black mt-4 mb-2 border-b border-black/5 dark:border-white/10 pb-1 text-gray-900 dark:text-white" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-base font-black mt-3 mb-2 text-gray-900 dark:text-white" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-sm font-black mt-2 mb-1 opacity-80 text-gray-800 dark:text-slate-200" {...props} />,
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0 font-medium" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc list-outside ml-4 mb-2 space-y-1" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-1" {...props} />,
                            li: ({node, ...props}) => <li className="font-medium" {...props} />,
                            a: ({node, ...props}) => <a className="text-indigo-600 dark:text-blue-300 hover:opacity-80 underline decoration-indigo-500/30 underline-offset-2 transition-colors" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-black text-gray-900 dark:text-white" {...props} />,
                            code: ({node, inline, ...props}) => 
                              inline 
                                ? <code className="bg-gray-200 dark:bg-slate-900/50 px-1.5 py-0.5 rounded text-[11px] font-mono text-indigo-600 dark:text-amber-200 border border-indigo-500/10" {...props} />
                                : <code className="block bg-gray-100 dark:bg-slate-950/50 p-4 rounded-xl text-xs font-mono text-gray-800 dark:text-slate-300 overflow-x-auto border border-gray-200 dark:border-slate-800 my-3 shadow-inner" {...props} />,
                            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-500/30 dark:border-slate-600 pl-4 my-3 text-gray-500 dark:text-slate-400 italic bg-indigo-50/30 dark:bg-slate-900/20 py-2 pr-3 rounded-r-lg" {...props} />,
                            table: ({node, ...props}) => <div className="overflow-x-auto my-3 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm"><table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700" {...props} /></div>,
                            th: ({node, ...props}) => <th className="bg-gray-50 dark:bg-bg-slate-900/50 px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-300" {...props} />,
                            td: ({node, ...props}) => <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600 dark:text-slate-300 border-t border-gray-100 dark:border-slate-800" {...props} />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                        
                        {/* 显示来源信息 */}
                        {showSources && msg.sources && msg.sources.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700/50">
                            {/* 置信度评分 */}
                            {msg.confidence && (
                              <div className="flex items-center gap-2 mb-3">
                                <TrendingUp className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                                <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-tight">
                                  Confidence Index: <span className={`font-black ${
                                    msg.confidence.level === 'high' ? 'text-emerald-600 dark:text-green-400' :
                                    msg.confidence.level === 'medium' ? 'text-amber-600 dark:text-yellow-400' :
                                    'text-rose-600 dark:text-red-400'
                                  }`}>{msg.confidence.score}%</span>
                                  <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-black ${
                                    msg.confidence.level === 'high' ? 'bg-emerald-100 dark:bg-green-900/30 text-emerald-700 dark:text-green-300' :
                                    msg.confidence.level === 'medium' ? 'bg-amber-100 dark:bg-yellow-900/30 text-amber-700 dark:text-yellow-300' :
                                    'bg-rose-100 dark:bg-red-900/30 text-rose-700 dark:text-red-300'
                                  }`}>
                                    {msg.confidence.level === 'high' ? 'SECURE' :
                                     msg.confidence.level === 'medium' ? 'PROBABLE' : 'UNCERTAIN'}
                                  </span>
                                </span>
                              </div>
                            )}
                            
                            <button
                              onClick={() => toggleSources(index)}
                              className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-indigo-600 dark:hover:text-slate-200 transition-all uppercase tracking-widest mb-3"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Reference Sources ({msg.sources.length})</span>
                              {expandedSources[index] ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                            
                            {expandedSources[index] && (
                              <div className="space-y-2 mt-3">
                                {msg.sources.map((source, sourceIndex) => (
                                  <div
                                    key={sourceIndex}
                                    className="bg-white dark:bg-slate-900/50 rounded-xl p-3 border border-gray-200 dark:border-slate-700/30 hover:border-indigo-500/30 dark:hover:border-slate-600/50 transition-all shadow-sm"
                                  >
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <FileText className="w-3.5 h-3.5 text-indigo-500 dark:text-emerald-400 flex-shrink-0" />
                                        <span className="text-[10px] font-mono font-bold text-gray-700 dark:text-slate-300 truncate flex-1 tracking-tighter">
                                          {source.file_path}
                                        </span>
                                      </div>
                                      <span className="text-[9px] font-black text-emerald-600 dark:text-slate-500 flex-shrink-0">
                                        {source.similarity ? `${(source.similarity * 100).toFixed(0)}% MATCH` : ''}
                                      </span>
                                    </div>
                                    
                                    {(source.start_line || source.end_line) && (
                                      <div className="text-[10px] font-bold text-gray-400 dark:text-slate-500 mb-2 flex gap-2">
                                        <span>LINE {source.start_line || '?'}-{source.end_line || '?'}</span>
                                        {source.language && <span className="uppercase opacity-60 tracking-widest border-l border-gray-200 dark:border-slate-700 pl-2">{source.language}</span>}
                                      </div>
                                    )}
                                    
                                    {source.summary && (
                                      <p className="text-[11px] text-gray-500 dark:text-slate-400 italic mb-2 leading-relaxed border-l-2 border-indigo-500/10 pl-2">
                                        {source.summary}
                                      </p>
                                    )}
                                    
                                    <div className="text-[11px] text-gray-400 dark:text-slate-500 line-clamp-3 bg-gray-50 dark:bg-black/20 p-2 rounded-lg font-mono">
                                      <span className="font-black text-[9px] uppercase tracking-widest text-indigo-500 dark:text-gray-400 mb-1 block">Context Preview:</span>
                                      {(() => {
                                        let content = source.content;
                                        const imageInfoMatch = content.match(/\[文档包含 \d+ 张图片\][\s\S]*?\n\n/);
                                        if (imageInfoMatch) content = content.replace(imageInfoMatch[0], '');
                                        return content;
                                      })()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                    )}
                  </div>

                  {/* 复制按钮 */}
                  {showCopyButton && msg.role === 'assistant' && (
                    <button
                      onClick={() => handleCopy(msg.content, index)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-gray-500 dark:text-white rounded-xl shadow-sm backdrop-blur-md border border-gray-200 dark:border-white/10"
                      title="复制内容"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
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
      <div className="p-6 bg-white dark:bg-slate-900/40 backdrop-blur-md border-t border-gray-100 dark:border-white/5">
        <div className="relative flex items-end gap-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-2xl p-2 shadow-inner focus-within:ring-4 focus-within:ring-indigo-500/5 focus-within:border-indigo-500/30 transition-all duration-300">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading || disabled}
            rows={1}
            style={{ minHeight: '44px', maxHeight: '150px' }}
            className="w-full bg-transparent border-0 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:ring-0 resize-none disabled:opacity-50 font-medium"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading || disabled}
            className={`flex-shrink-0 p-3.5 rounded-xl mb-0.5 transition-all duration-300 ${
              !inputValue.trim() || isLoading || disabled
                ? 'bg-gray-200 dark:bg-slate-700/50 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20 active:scale-90'
            }`}
            title="发送 (Enter)"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <div className="flex justify-center mt-3">
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
               <span className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">Enter</span>
               <span>to Send</span>
               <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-slate-700 mx-1" />
               <span className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">Shift+Enter</span>
               <span>for Line Break</span>
            </p>
        </div>
      </div>
    </div>
  );
};

export default ChatComponent;
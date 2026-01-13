import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import IFlowLogo from './IFlowLogo.jsx';
import CursorLogo from './CursorLogo.jsx';
import TodoList from './TodoList';
import { api, authenticatedFetch } from '../utils/api';

// Helper function to decode HTML entities in text
function decodeHtmlEntities(text) {
  if (!text) return text;
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

// Normalize markdown text
function normalizeInlineCodeFences(text) {
  if (!text || typeof text !== 'string') return text;
  try {
    return text.replace(/```\s*([^\n\r]+?)\s*```/g, '`$1`');
  } catch {
    return text;
  }
}

// Unescape while protecting LaTeX formulas
function unescapeWithMathProtection(text) {
  if (!text || typeof text !== 'string') return text;
  const mathBlocks = [];
  const PLACEHOLDER_PREFIX = '__MATH_BLOCK_';
  const PLACEHOLDER_SUFFIX = '__';
  let processedText = text.replace(/\$\$([\s\S]*?)\$\$|\$([^\$\n]+?)\$/g, (match) => {
    const index = mathBlocks.length;
    mathBlocks.push(match);
    return `${PLACEHOLDER_PREFIX}${index}${PLACEHOLDER_SUFFIX}`;
  });
  processedText = processedText.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
  processedText = processedText.replace(new RegExp(`${PLACEHOLDER_PREFIX}(\\d+)${PLACEHOLDER_SUFFIX}`, 'g'), (match, index) => {
    return mathBlocks[parseInt(index)];
  });
  return processedText;
}

// Format "IFlow AI usage limit reached|<epoch>" into a local time string
function formatUsageLimitText(text) {
  try {
    if (typeof text !== 'string') return text;
    return text.replace(/IFlow AI usage limit reached\|(\d{10,13})/g, (match, ts) => {
      let timestampMs = parseInt(ts, 10);
      if (!Number.isFinite(timestampMs)) return match;
      if (timestampMs < 1e12) timestampMs *= 1000;
      const reset = new Date(timestampMs);
      return `IFlow usage limit reached. Your limit will reset at **${reset.toLocaleString()}**`;
    });
  } catch {
    return text;
  }
}

// Markdown Components
const markdownComponents = {
  code: ({ node, inline, className, children, ...props }) => {
    const [copied, setCopied] = React.useState(false);
    const raw = Array.isArray(children) ? children.join('') : String(children ?? '');
    const looksMultiline = /[\r\n]/.test(raw);
    const shouldInline = inline || !looksMultiline;
    if (shouldInline) {
      return (
        <code className="font-mono text-[0.9em] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-900 border border-gray-200 dark:bg-gray-800/60 dark:text-gray-100 dark:border-gray-700 whitespace-pre-wrap break-words" {...props}>
          {children}
        </code>
      );
    }
    return (
      <div className="relative group my-2">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(raw);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className={`absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-all text-xs px-2 py-1 rounded-md bg-gray-700/80 text-white border border-gray-600 ${copied ? 'text-emerald-400' : ''}`}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <pre className="bg-gray-900 dark:bg-gray-950 border border-gray-700/40 rounded-lg p-3 overflow-x-auto scrollbar-thin">
          <code className={`text-gray-100 text-sm font-mono ${className || ''}`} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 my-2">{children}</blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50 dark:bg-gray-800">{children}</thead>,
  th: ({ children }) => <th className="px-3 py-2 text-left text-sm font-semibold border border-gray-200 dark:border-gray-700">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2 align-top text-sm border border-gray-200 dark:border-gray-700">{children}</td>,
  p: ({ children }) => <div className="mb-2 last:mb-0">{children}</div>
};

// Markdown Wrapper
const Markdown = ({ children, className }) => {
  const content = normalizeInlineCodeFences(String(children ?? ''));
  const remarkPlugins = useMemo(() => [remarkGfm, remarkMath], []);
  const rehypePlugins = useMemo(() => [rehypeKatex], []);
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

// Thinking Block Component
const ThinkingBlock = ({ content, isStreaming, isFinished }) => {
  const [isOpen, setIsOpen] = useState(isStreaming && !isFinished);
  const [showContent, setShowContent] = useState(false);
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowContent(true), 50);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);
  useEffect(() => {
    if (isFinished && isOpen) {
      const timer = setTimeout(() => setIsOpen(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isFinished]);
  return (
    <div className="my-3 rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/30 overflow-hidden transition-all duration-300 ease-in-out hover:border-gray-300 dark:hover:border-gray-600">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer group">
        <div className="flex items-center gap-2.5">
          <div className={`p-1 rounded-md ${isStreaming && !isFinished ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
            <svg className={`w-3.5 h-3.5 ${isStreaming && !isFinished ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className={`text-xs font-medium ${isStreaming && !isFinished ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {isStreaming && !isFinished ? '深度思考中...' : '思考过程'}
          </span>
        </div>
        <div className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'} overflow-y-auto scrollbar-thin`}>
        <div className="px-4 pb-4 pt-1">
          <div className="relative pl-3 border-l-2 border-gray-200 dark:border-gray-700">
            <div className={`text-xs font-mono leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre-wrap transition-opacity duration-300 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
              {content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ChatMessage Component
const ChatMessage = memo(({
  message,
  index,
  prevMessage,
  createDiff,
  onFileOpen,
  onShowSettings,
  autoExpandTools = true,
  showRawParameters,
  showThinking = true,
  selectedProject,
  onEditMessage,
  onRegenerate,
  onCopyMessage,
  onDeleteMessage,
  onToggleFavorite,
  editingMessageId,
  editingContent,
  setEditingContent,
  handleSaveEdit,
  handleCancelEdit,
  copiedMessageId,
  regeneratingMessageId,
  favoritedMessages,
  isLoading
}) => {
  const isGrouped = prevMessage && prevMessage.type === message.type &&
    ['assistant', 'user', 'tool', 'plan', 'error'].includes(prevMessage.type);
  const messageRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!autoExpandTools || !messageRef.current || !message.isToolUse) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !isExpanded) {
          setIsExpanded(true);
          messageRef.current.querySelectorAll('details').forEach(detail => { detail.open = true; });
        }
      });
    }, { threshold: 0.1 });
    observer.observe(messageRef.current);
    return () => { if (messageRef.current) observer.unobserve(messageRef.current); };
  }, [autoExpandTools, isExpanded, message.isToolUse]);

  const provider = localStorage.getItem('selected-provider') || 'iflow';

  return (
    <div ref={messageRef} className={`chat-message ${message.type} ${isGrouped ? 'grouped' : ''} ${message.type === 'user' ? 'flex justify-end' : ''} animate-fade-in-up`}>
      {message.type === 'user' ? (
        <div className="flex w-full justify-end gap-3 pl-12 pr-4 mb-6 group">
          <div className="flex flex-col items-end flex-1 min-w-0">
            {!isGrouped && (
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">You</span>
              </div>
            )}
            <div className="bg-blue-600 dark:bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4.5 py-2.5 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="text-[15px] whitespace-pre-wrap break-words leading-relaxed font-normal">{message.content}</div>
              {message.images && message.images.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {message.images.map((img, idx) => (
                    <img key={idx} src={img.data} alt={img.name} className="rounded-lg max-w-full h-auto border border-white/10 cursor-pointer" onClick={() => window.open(img.data, '_blank')} />
                  ))}
                </div>
              )}
            </div>
            {/* Actions */}
            <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEditMessage(message.id)} className="p-1 text-gray-400 hover:text-blue-500" title="编辑"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
              <button onClick={() => onDeleteMessage(message.id)} className="p-1 text-gray-400 hover:text-red-500" title="删除"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
            </div>
            {/* Edit Mode */}
            {editingMessageId === message.id && (
              <div className="mt-2 w-full max-w-md">
                <textarea value={editingContent} onChange={(e) => setEditingContent(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => handleSaveEdit(message.id)} className="px-3 py-1 bg-blue-600 text-white text-xs rounded">保存</button>
                  <button onClick={() => handleCancelEdit()} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-xs rounded text-gray-700 dark:text-gray-300">取消</button>
                </div>
              </div>
            )}
          </div>
          <div className="flex-shrink-0 mt-0.5">{!isGrouped ? <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm ring-1 ring-blue-400/30">U</div> : <div className="w-8" />}</div>
        </div>
      ) : (
        <div className="flex gap-4 w-full max-w-4xl pr-4 group mb-2">
          <div className="flex-shrink-0 flex flex-col items-center">
            {!isGrouped && (
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shadow-sm ring-1 ring-inset ${message.type === 'error' ? 'bg-red-50 text-red-600 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800' : message.type === 'tool' ? 'bg-gray-50 text-gray-600 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700' : message.type === 'plan' ? 'bg-purple-50 text-purple-600 ring-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:ring-purple-800' : 'bg-white text-gray-600 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700'}`}>
                {message.type === 'error' ? <span className="font-bold">!</span> : message.type === 'tool' ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> : message.type === 'plan' ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> : provider === 'cursor' ? <CursorLogo className="w-5 h-5" /> : <IFlowLogo className="w-5 h-5" />}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            {!isGrouped && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{message.type === 'error' ? 'Error' : message.type === 'tool' ? 'Tool' : message.type === 'plan' ? 'Plan' : (provider === 'cursor' ? 'Cursor' : 'IFlow')}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
            <div className="text-[15px] leading-7 text-gray-800 dark:text-gray-200 font-normal">
              {message.isToolUse ? (
                <div className={`group relative border-l-2 pl-3 py-2 my-2 ${message.toolStatus === 'failed' ? 'bg-red-50/50 dark:bg-red-900/20 border-red-400' : 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-400'}`}>
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{message.toolName || message.toolType}</span>
                    {message.agentInfo && (
                      <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-200 dark:border-indigo-800">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        {message.agentInfo.name || message.agentInfo.role || 'Agent'}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 font-mono truncate max-w-[100px]">{message.toolId}</span>
                    {message.toolStatus === 'running' && <span className="text-xs text-blue-500 flex items-center gap-1"><span className="animate-spin">⟳</span> Running</span>}
                    {message.toolStatus === 'success' && <span className="text-xs text-green-500">✓ Success</span>}
                    {message.toolStatus === 'failed' && <span className="text-xs text-red-500">✗ Failed</span>}
                  </div>
                  {message.toolInput && (
                    <details open={autoExpandTools} className="text-xs">
                      <summary className="cursor-pointer text-gray-500 hover:text-blue-500 flex items-center gap-1"><svg className="w-3 h-3 details-chevron transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>Parameters</summary>
                      <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded font-mono overflow-x-auto whitespace-pre-wrap">{message.toolInput}</pre>
                    </details>
                  )}
                  {/* Tool specific: Edit/Write/Grep/Glob/Bash */}
                  {message.toolName === 'Edit' && message.toolInput && (() => {
                    try {
                      const input = JSON.parse(message.toolInput);
                      if (input.old_string && input.new_string) return (
                        <div className="mt-2"><button onClick={() => onFileOpen(input.file_path, { old_string: input.old_string, new_string: input.new_string })} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-2 py-1 rounded hover:underline">View Diff: {input.file_path}</button></div>
                      );
                    } catch(e) {}
                  })()}
                  {message.toolName === 'TodoWrite' && message.toolInput && (() => {
                    try {
                      const input = JSON.parse(message.toolInput);
                      if (input.todos) return <div className="mt-2"><TodoList todos={input.todos} /></div>;
                    } catch(e) {}
                  })()}
                  {message.toolResult && (
                    <div className={`mt-3 p-3 rounded-lg border ${message.toolResult.isError ? 'bg-red-50 dark:bg-red-900/10 border-red-200' : 'bg-green-50 dark:bg-green-900/10 border-green-200'}`}>
                      <div className="text-xs font-semibold mb-1 flex items-center gap-1">{message.toolResult.isError ? <span className="text-red-600">⚠ Error</span> : <span className="text-green-600">✓ Result</span>}</div>
                      {(message.toolName === 'Grep' || message.toolName === 'Glob') && message.toolResult.toolUseResult?.filenames ? (
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {message.toolResult.toolUseResult.filenames.map((f, i) => (
                            <div key={i} onClick={() => onFileOpen(f)} className="text-xs font-mono text-blue-600 cursor-pointer hover:underline truncate">{f}</div>
                          ))}
                        </div>
                      ) : (
                        <div className={`text-sm ${message.toolResult.isError ? 'text-red-800 dark:text-red-200' : 'text-green-800 dark:text-green-200'}`}>
                          {message.toolName === 'Read' ? (
                            <details><summary className="cursor-pointer text-xs opacity-70">View Content</summary><pre className="mt-1 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">{message.toolResult.content}</pre></details>
                          ) : <Markdown className="prose prose-sm max-w-none dark:prose-invert">{message.toolResult.content}</Markdown>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {showThinking && message.reasoning && <ThinkingBlock content={message.reasoning} isStreaming={message.isStreaming && !message.content} isFinished={!message.isStreaming} />}
                  {message.type === 'plan' && message.entries ? (
                    <div className="bg-purple-50/50 dark:bg-purple-900/20 border-l-2 border-purple-400 pl-3 py-2 my-2">
                      <h4 className="text-xs font-bold text-purple-600 mb-2 uppercase">Execution Plan</h4>
                      <ul className="space-y-1">{message.entries.map((entry, idx) => (
                        <li key={idx} className="text-sm flex gap-2"><span className="text-purple-500 font-mono">{idx+1}.</span><span>{entry.content}</span>{entry.status && <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded">{entry.status}</span>}</li>
                      ))}</ul>
                    </div>
                  ) : (
                    <Markdown className="prose prose-sm max-w-none dark:prose-invert prose-p:mb-2 prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-code:px-1 prose-code:py-0.5 prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700">
                      {unescapeWithMathProtection(formatUsageLimitText(message.content))}
                    </Markdown>
                  )}
                </>
              )}
            </div>
            {/* AI Actions */}
            <div className={`flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity`}>
              <button onClick={() => onCopyMessage(message.content, message.id)} className="p-1 text-gray-400 hover:text-green-500" title="复制">{copiedMessageId === message.id ? <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}</button>
              <button onClick={() => onToggleFavorite(message.id)} className={`p-1 transition-all ${favoritedMessages.has(message.id) ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`} title="收藏"><svg className="w-3.5 h-3.5" fill={favoritedMessages.has(message.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg></button>
              {message.type === 'assistant' && !isLoading && <button onClick={() => onRegenerate(message.id)} className="p-1 text-gray-400 hover:text-purple-500" title="重新生成"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ChatMessage;
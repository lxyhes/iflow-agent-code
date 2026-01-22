/**
 * Assistant Message Component
 * 助手消息卡片组件
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import IFlowLogo from '../IFlowLogo.jsx';
import CursorLogo from '../CursorLogo.jsx';
import MarkdownRenderer from '../markdown/MarkdownRenderer';
import ThinkingBlock from '../markdown/ThinkingBlock';
import ToolUsageCard from './ToolUsageCard';
import WorkflowTemplateCards from '../workflow/WorkflowTemplateCards';

const autoParagraphize = (text) => {
  const s = String(text || '');
  if (!s) return s;
  if (s.includes('\n\n') || s.length < 380) return s;
  const parts = s.split(/```[\s\S]*?```/g);
  const blocks = s.match(/```[\s\S]*?```/g) || [];
  const out = [];

  const formatPlain = (plain) => {
    const src = plain.replace(/\r\n/g, '\n');
    let buf = '';
    let run = 0;
    for (let i = 0; i < src.length; i += 1) {
      const ch = src[i];
      buf += ch;
      run += 1;
      const next = src[i + 1] || '';
      const isBreakable = /[。！？.!?]/.test(ch) && (next === ' ' || next === '\n' || next === '\t' || next === '');
      if (run > 220 && isBreakable) {
        buf += '\n\n';
        run = 0;
      }
      if (ch === '\n') run = 0;
    }
    return buf;
  };

  for (let i = 0; i < parts.length; i += 1) {
    out.push(formatPlain(parts[i]));
    if (blocks[i]) out.push(blocks[i]);
  }
  return out.join('');
};

const TypedMarkdown = ({ content, isStreaming }) => {
  const target = useMemo(() => autoParagraphize(content), [content]);
  const [typed, setTyped] = useState(target);
  const rafRef = useRef(null);
  const lastKeyRef = useRef(null);

  useEffect(() => {
    const key = target;
    if (lastKeyRef.current !== key) {
      lastKeyRef.current = key;
      if (!isStreaming) {
        setTyped(key);
        return;
      }
      setTyped((prev) => (prev.length > key.length ? '' : prev));
    }
  }, [target, isStreaming]);

  useEffect(() => {
    if (!isStreaming) {
      if (typed !== target) setTyped(target);
      return;
    }
    if (typed.length >= target.length) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    let last = performance.now();
    const step = (now) => {
      const dt = now - last;
      last = now;
      const remaining = target.length - typed.length;
      const rate = Math.max(120, Math.min(520, Math.floor(target.length / 10)));
      const add = Math.max(8, Math.floor((rate * dt) / 1000));
      const nextLen = Math.min(target.length, typed.length + Math.min(add, remaining));
      setTyped(target.slice(0, nextLen));
      if (nextLen < target.length) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isStreaming, target, typed]);

  return (
    <MarkdownRenderer className="prose prose-sm dark:prose-invert max-w-none prose-p:mb-3 prose-strong:bg-yellow-50 prose-strong:text-gray-900 dark:prose-strong:bg-yellow-900/30 dark:prose-strong:text-white prose-strong:rounded prose-strong:px-1">
      {typed}
    </MarkdownRenderer>
  );
};

const AssistantMessage = ({ 
  message, 
  isGrouped, 
  showThinking,
  onCopyMessage,
  onEditMessage,
  onDeleteMessage,
  onRegenerate,
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
  const provider = localStorage.getItem('selected-provider') || 'iflow';
  const [showMenu, setShowMenu] = useState(false);
  const isEditing = editingMessageId === message.id;
  const isFavorited = favoritedMessages?.has(message.id);
  const shouldSeparate = !isGrouped && message.type === 'assistant' && !message.isToolUse;

  return (
    <div className={`flex gap-4 w-full max-w-4xl pr-4 group relative ${shouldSeparate ? 'mb-6 pb-6 border-b border-gray-100 dark:border-gray-800' : 'mb-2'}`}>
      {/* Left Column: Avatar */}
      <div className="flex-shrink-0 flex flex-col items-center">
        {!isGrouped && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shadow-sm ring-1 ring-inset ${
            message.type === 'error' ? 'bg-red-50 text-red-600 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800' :
            message.type === 'tool' ? 'bg-gray-50 text-gray-600 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700' :
            message.type === 'plan' ? 'bg-purple-50 text-purple-600 ring-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:ring-purple-800' :
            'bg-white text-gray-600 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700'
          }`}>
            {message.type === 'error' ? (
              <span className="font-bold">!</span>
            ) : message.type === 'tool' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            ) : message.type === 'plan' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            ) : (
              provider === 'cursor' ? <CursorLogo className="w-5 h-5" /> : <IFlowLogo className="w-5 h-5" />
            )}
          </div>
        )}
      </div>

      {/* Right Column: Content */}
      <div className="flex-1 min-w-0 overflow-hidden relative">
        {!isGrouped && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {message.type === 'error' ? 'Error' : message.type === 'tool' ? 'Tool Usage' : message.type === 'plan' ? 'Plan' : (provider === 'cursor' ? 'Cursor' : 'IFlow')}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
        
        <div className="text-[15px] leading-7 text-gray-800 dark:text-gray-200 font-normal">
          {/* Thinking Block */}
          {showThinking && message.thinking && (
            <ThinkingBlock 
              content={message.thinking} 
              isStreaming={message.isStreaming} 
              isFinished={!message.isStreaming} 
            />
          )}

          {/* Tool Usage Card */}
          <ToolUsageCard message={message} />

          {Array.isArray(message.workflowTemplates) && message.workflowTemplates.length > 0 ? (
            <div className="my-3">
              <WorkflowTemplateCards
                templates={message.workflowTemplates}
                limit={Number.isFinite(message.workflowTemplatesLimit) ? message.workflowTemplatesLimit : 9}
                includeCustom={false}
                title={message.workflowTemplatesTitle || '工作流模板'}
              />
            </div>
          ) : null}

          {/* Content */}
          {message.content && (
            <TypedMarkdown content={message.content} isStreaming={!!message.isStreaming} />
          )}
        </div>

        {/* 操作菜单按钮 */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="absolute -left-10 top-2 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>

        {/* 操作菜单 */}
        {showMenu && (
          <div className="absolute -left-32 top-0 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1 min-w-[120px] z-50">
            <button
              onClick={() => {
                onCopyMessage(message.id);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              复制
            </button>
            <button
              onClick={() => {
                onEditMessage(message.id);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              编辑
            </button>
            <button
              onClick={() => {
                onRegenerate(message.id);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:gray-700 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              重新生成
            </button>
            <button
              onClick={() => {
                onToggleFavorite(message.id);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l-7.07 7.071.42.42 6.6.6 1.417.921 1.603.921 1.902 0 7.828-7.787 7.828-7.787 0-1.051.42-1.417.921-1.603.921-1.902 0l-7.07 7.071c-.42.42-.6-1.417-.921-1.902-.921-.485 0-.921.42-1.417.921l-7.07 7.07c-.42.42-.6.42-1.417.921-1.902 0l7.07-7.07c.921-.42 1.603-.42 1.902 0l7.07 7.07c.42.42.6 1.417.921 1.902 0 .921-.42 1.603-.921 1.902 0l-7.07-7.07c-.42-.42-.6-1.417-.921-1.902-.921-.485 0-.921.42-1.417.921l-7.07 7.07c-.42.42-.6.42-1.417.921-1.902 0l7.07-7.07c.921-.42 1.603-.42 1.902 0l7.07 7.07c.42.42.6 1.417.921 1.902 0 .921-.42 1.603-.921 1.902 0z" />
              </svg>
              {isFavorited ? '取消收藏' : '收藏'}
            </button>
            <button
              onClick={() => {
                onDeleteMessage(message.id);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 011-1h2a1 1 0 011 1v3M4 7h16" />
              </svg>
              删除
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssistantMessage;

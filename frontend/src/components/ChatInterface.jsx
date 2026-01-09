/*
 * ChatInterface.jsx - Chat Component with Session Protection Integration
 * 
 * SESSION PROTECTION INTEGRATION:
 * ===============================
 * 
 * This component integrates with the Session Protection System to prevent project updates
 * from interrupting active conversations:
 * 
 * Key Integration Points:
 * 1. handleSubmit() - Marks session as active when user sends message (including temp ID for new sessions)
 * 2. session-created handler - Replaces temporary session ID with real WebSocket session ID  
 * 3. iflow-complete handler - Marks session as inactive when conversation finishes
 * 4. session-aborted handler - Marks session as inactive when conversation is aborted
 * 
 * This ensures uninterrupted chat experience by coordinating with App.jsx to pause sidebar updates.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { Wrench, Network } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useDropzone } from 'react-dropzone';
import { Virtuoso } from 'react-virtuoso';
import TodoList from './TodoList';
import IFlowLogo from './IFlowLogo.jsx';
import CursorLogo from './CursorLogo.jsx';
import NextTaskBanner from './NextTaskBanner.jsx';
import { useTasksSettings } from '../contexts/TasksSettingsContext';
import { useWebSocketContext } from '../contexts/WebSocketContext';
import { chatStorage, draftStorage, migrateFromLocalStorage } from '../utils/indexedDBStorage';

import IFlowStatus from './IFlowStatus';
import TokenUsagePie from './TokenUsagePie';
import { MicButton } from './MicButton.jsx';
import { api, authenticatedFetch } from '../utils/api';
import Fuse from 'fuse.js';
import CommandMenu from './CommandMenu';
import { TypingIndicator, CompactTypingIndicator } from './TypingIndicator';
import { ConnectionStatus, ConnectionIndicator } from './ConnectionStatus';
import ErrorFixPrompt from './ErrorFixPrompt';
import Shell from './Shell';
import AutoFixPanel from './AutoFixPanel';
import ContextVisualizer from './ContextVisualizer';


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

// Normalize markdown text where providers mistakenly wrap short inline code with single-line triple fences.
// Only convert fences that do NOT contain any newline to avoid touching real code blocks.
function normalizeInlineCodeFences(text) {
  if (!text || typeof text !== 'string') return text;
  try {
    // ```code```  -> `code`
    return text.replace(/```\s*([^\n\r]+?)\s*```/g, '`$1`');
  } catch {
    return text;
  }
}

// Unescape \n, \t, \r while protecting LaTeX formulas ($...$ and $$...$$) from being corrupted
function unescapeWithMathProtection(text) {
  if (!text || typeof text !== 'string') return text;

  const mathBlocks = [];
  const PLACEHOLDER_PREFIX = '__MATH_BLOCK_';
  const PLACEHOLDER_SUFFIX = '__';

  // Extract and protect math formulas
  let processedText = text.replace(/\$\$([\s\S]*?)\$\$|\$([^\$\n]+?)\$/g, (match) => {
    const index = mathBlocks.length;
    mathBlocks.push(match);
    return `${PLACEHOLDER_PREFIX}${index}${PLACEHOLDER_SUFFIX}`;
  });

  // Process escape sequences on non-math content
  processedText = processedText.replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r');

  // Restore math formulas
  processedText = processedText.replace(
    new RegExp(`${PLACEHOLDER_PREFIX}(\\d+)${PLACEHOLDER_SUFFIX}`, 'g'),
    (match, index) => {
      return mathBlocks[parseInt(index)];
    }
  );

  return processedText;
}

// Small wrapper to keep markdown behavior consistent in one place
const Markdown = ({ children, className }) => {
  const content = normalizeInlineCodeFences(String(children ?? ''));
  const remarkPlugins = useMemo(() => [remarkGfm, remarkMath], []);
  const rehypePlugins = useMemo(() => [rehypeKatex], []);

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// Format "IFlow AI usage limit reached|<epoch>" into a local time string
function formatUsageLimitText(text) {
  try {
    if (typeof text !== 'string') return text;
    return text.replace(/IFlow AI usage limit reached\|(\d{10,13})/g, (match, ts) => {
      let timestampMs = parseInt(ts, 10);
      if (!Number.isFinite(timestampMs)) return match;
      if (timestampMs < 1e12) timestampMs *= 1000; // seconds → ms
      const reset = new Date(timestampMs);

      // Time HH:mm in local time
      const timeStr = new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(reset);

      // Human-readable timezone: GMT±HH[:MM] (City)
      const offsetMinutesLocal = -reset.getTimezoneOffset();
      const sign = offsetMinutesLocal >= 0 ? '+' : '-';
      const abs = Math.abs(offsetMinutesLocal);
      const offH = Math.floor(abs / 60);
      const offM = abs % 60;
      const gmt = `GMT${sign}${offH}${offM ? ':' + String(offM).padStart(2, '0') : ''}`;
      const tzId = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const cityRaw = tzId.split('/').pop() || '';
      const city = cityRaw
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
      const tzHuman = city ? `${gmt} (${city})` : gmt;

      // Readable date like "8 Jun 2025"
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateReadable = `${reset.getDate()} ${months[reset.getMonth()]} ${reset.getFullYear()}`;

      return `IFlow usage limit reached. Your limit will reset at **${timeStr} ${tzHuman}** - ${dateReadable}`;
    });
  } catch {
    return text;
  }
}

// Safe localStorage utility to handle quota exceeded errors
const safeLocalStorage = {
  setItem: (key, value) => {
    try {
      // For chat messages, implement compression and size limits
      if (key.startsWith('chat_messages_') && typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          // Limit to last 50 messages to prevent storage bloat
          if (Array.isArray(parsed) && parsed.length > 50) {
            console.warn(`Truncating chat history for ${key} from ${parsed.length} to 50 messages`);
            const truncated = parsed.slice(-50);
            value = JSON.stringify(truncated);
          }
        } catch (parseError) {
          console.warn('Could not parse chat messages for truncation:', parseError);
        }
      }

      localStorage.setItem(key, value);
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, clearing old data');
        // Clear old chat messages to free up space
        const keys = Object.keys(localStorage);
        const chatKeys = keys.filter(k => k.startsWith('chat_messages_')).sort();

        // Remove oldest chat data first, keeping only the 3 most recent projects
        if (chatKeys.length > 3) {
          chatKeys.slice(0, chatKeys.length - 3).forEach(k => {
            localStorage.removeItem(k);
            console.log(`Removed old chat data: ${k}`);
          });
        }

        // If still failing, clear draft inputs too
        const draftKeys = keys.filter(k => k.startsWith('draft_input_'));
        draftKeys.forEach(k => {
          localStorage.removeItem(k);
        });

        // Try again with reduced data
        try {
          localStorage.setItem(key, value);
        } catch (retryError) {
          console.error('Failed to save to localStorage even after cleanup:', retryError);
          // Last resort: Try to save just the last 10 messages
          if (key.startsWith('chat_messages_') && typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed) && parsed.length > 10) {
                const minimal = parsed.slice(-10);
                localStorage.setItem(key, JSON.stringify(minimal));
                console.warn('Saved only last 10 messages due to quota constraints');
              }
            } catch (finalError) {
              console.error('Final save attempt failed:', finalError);
            }
          }
        }
      } else {
        console.error('localStorage error:', error);
      }
    }
  },
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('localStorage getItem error:', error);
      return null;
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('localStorage removeItem error:', error);
    }
  }
};

// Common markdown components to ensure consistent rendering (tables, inline code, links, etc.)
const markdownComponents = {
  code: ({ node, inline, className, children, ...props }) => {
    const [copied, setCopied] = React.useState(false);
    const raw = Array.isArray(children) ? children.join('') : String(children ?? '');
    const looksMultiline = /[\r\n]/.test(raw);
    const inlineDetected = inline || (node && node.type === 'inlineCode');
    const shouldInline = inlineDetected || !looksMultiline; // fallback to inline if single-line
    if (shouldInline) {
      return (
        <code
          className={`font-mono text-[0.9em] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-900 border border-gray-200 dark:bg-gray-800/60 dark:text-gray-100 dark:border-gray-700 whitespace-pre-wrap break-words ${className || ''
            }`}
          {...props}
        >
          {children}
        </code>
      );
    }
    const textToCopy = raw;

    const handleCopy = () => {
      const doSet = () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      };
      try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textToCopy).then(doSet).catch(() => {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = textToCopy;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch { }
            document.body.removeChild(ta);
            doSet();
          });
        } else {
          const ta = document.createElement('textarea');
          ta.value = textToCopy;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); } catch { }
          document.body.removeChild(ta);
          doSet();
        }
      } catch { }
    };

    return (
      <div className="relative group my-2">
        <button
          type="button"
          onClick={handleCopy}
          className={`absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 focus:opacity-100 active:opacity-100 transition-all text-xs px-2 py-1 rounded-md bg-gray-700/80 hover:bg-gray-700 text-white border border-gray-600 btn-glow ${copied ? 'copy-success' : ''}`}
          title={copied ? 'Copied!' : 'Copy code'}
          aria-label={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Copied!
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
              </svg>
              Copy
            </span>
          )}
        </button>
        <pre className="bg-gray-900 dark:bg-gray-900 border border-gray-700/40 rounded-lg p-3 overflow-x-auto scrollbar-thin">
          <code className={`text-gray-100 dark:text-gray-100 text-sm font-mono ${className || ''}`} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 my-2">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  p: ({ children }) => <div className="mb-2 last:mb-0">{children}</div>,
  div: ({ children, className, ...props }) => (
    <div className={`my-1 ${className || ''}`} {...props}>{children}</div>
  ),
  // GFM tables
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-50 dark:bg-gray-800">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-sm font-semibold border border-gray-200 dark:border-gray-700">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 align-top text-sm border border-gray-200 dark:border-gray-700">{children}</td>
  )
};

// Modern Thinking/Reasoning Component
const ThinkingBlock = ({ content, isStreaming, isFinished }) => {
  // Auto-expand if streaming reasoning, collapse when finished
  const [isOpen, setIsOpen] = useState(isStreaming && !isFinished);
  const [showContent, setShowContent] = useState(false);

  // Smooth animation for content rendering
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowContent(true), 50);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  // Effect to auto-close when thinking is done (optional, can stay open if preferred)
  // Currently set to auto-close 1s after thinking finishes to show user the final result clearly
  useEffect(() => {
    if (isFinished && isOpen) {
      const timer = setTimeout(() => setIsOpen(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isFinished]);

  return (
    <div className="my-3 rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/30 overflow-hidden transition-all duration-300 ease-in-out hover:border-gray-300 dark:hover:border-gray-600">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer group"
      >
        <div className="flex items-center gap-2.5">
          <div className={`p-1 rounded-md ${isStreaming && !isFinished ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
            <svg 
              className={`w-3.5 h-3.5 ${isStreaming && !isFinished ? 'animate-pulse' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
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
      
      <div 
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        } overflow-y-auto scrollbar-thin`}
      >
        <div className="px-4 pb-4 pt-1">
          <div className="relative pl-3 border-l-2 border-gray-200 dark:border-gray-700">
            <div className={`text-xs font-mono leading-relaxed text-gray-600 dark:text-gray-400 whitespace-pre-wrap transition-opacity duration-300 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
              {content}
              {isStreaming && !isFinished && (
                <span className="inline-block w-1.5 h-3 ml-1 bg-blue-500 animate-pulse align-middle rounded-full"></span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Memoized message component to prevent unnecessary re-renders
const MessageComponent = memo(({ message, index, prevMessage, createDiff, onFileOpen, onShowSettings, autoExpandTools, showRawParameters, showThinking, selectedProject }) => {
  const isGrouped = prevMessage && prevMessage.type === message.type &&
    ((prevMessage.type === 'assistant') ||
      (prevMessage.type === 'user') ||
      (prevMessage.type === 'tool') ||
      (prevMessage.type === 'plan') ||
      (prevMessage.type === 'error'));
  const messageRef = React.useRef(null);
  const [isExpanded, setIsExpanded] = React.useState(false);
  React.useEffect(() => {
    if (!autoExpandTools || !messageRef.current || !message.isToolUse) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isExpanded) {
            setIsExpanded(true);
            // Find all details elements and open them
            const details = messageRef.current.querySelectorAll('details');
            details.forEach(detail => {
              detail.open = true;
            });
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(messageRef.current);

    return () => {
      if (messageRef.current) {
        observer.unobserve(messageRef.current);
      }
    };
  }, [autoExpandTools, isExpanded, message.isToolUse]);

  return (
    <div
      ref={messageRef}
      className={`chat-message ${message.type} ${isGrouped ? 'grouped' : ''} ${message.type === 'user' ? 'flex justify-end' : ''} animate-fade-in-up`}
    >
      {message.type === 'user' ? (
        /* User message bubble on the right */
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
              <div className="text-[15px] whitespace-pre-wrap break-words leading-relaxed font-normal">
                {message.content}
              </div>
              {message.images && message.images.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {message.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img.data}
                      alt={img.name}
                      className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity border border-white/10"
                      onClick={() => window.open(img.data, '_blank')}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* User Avatar - Fixed on the right */}
          <div className="flex-shrink-0 mt-0.5">
            {!isGrouped ? (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm ring-1 ring-blue-400/30">
                U
              </div>
            ) : (
              <div className="w-8" /> /* Spacer for grouped messages */
            )}
          </div>
        </div>
      ) : (
        /* Assistant/System messages - 2 Column Layout */
        <div className="flex gap-4 w-full max-w-4xl pr-4 group mb-2">
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
                  (localStorage.getItem('selected-provider') || 'iflow') === 'cursor' ? <CursorLogo className="w-5 h-5" /> : <IFlowLogo className="w-5 h-5" />
                )}
              </div>
            )}
          </div>

          {/* Right Column: Content */}
          <div className="flex-1 min-w-0 overflow-hidden">
            {!isGrouped && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {message.type === 'error' ? 'Error' : message.type === 'tool' ? 'Tool Usage' : message.type === 'plan' ? 'Plan' : ((localStorage.getItem('selected-provider') || 'iflow') === 'cursor' ? 'Cursor' : 'IFlow')}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
            
            <div className="text-[15px] leading-7 text-gray-800 dark:text-gray-200 font-normal">

            {/* 新的工具卡片渲染 - 基于 toolType */}
            {message.isToolUse && message.toolType ? (
              <div className={`group relative border-l-2 pl-3 py-2 my-2 ${message.toolStatus === 'running'
                  ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-400'
                  : message.toolStatus === 'failed'
                    ? 'bg-red-50/50 dark:bg-red-900/20 border-red-400'
                    : 'bg-green-50/50 dark:bg-green-900/20 border-green-400'
                }`}>
                <div className="flex items-center gap-2 text-sm">
                  {/* 图标 */}
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
                  {!['read_file', 'write_file', 'command', 'search'].includes(message.toolType) && (
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
                            message.toolName || 'Tool'}
                  </span>

                  {/* AgentInfo 显示 */}
                  {message.agentInfo && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-200 dark:border-indigo-800">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {message.agentInfo.name || message.agentInfo.role || 'Agent'}
                    </span>
                  )}

                  {/* 文件名/命令 */}
                  {message.toolLabel && (
                    <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-300 max-w-xs truncate">
                      {message.toolLabel}
                    </code>
                  )}

                  {/* 状态指示器 */}
                  <span className="ml-auto">
                    {message.toolStatus === 'running' && (
                      <span className="flex items-center gap-1 text-xs text-blue-500">
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        运行中
                      </span>
                    )}
                    {message.toolStatus === 'success' && (
                      <span className="text-xs text-green-500">✓ 完成</span>
                    )}
                    {message.toolStatus === 'failed' && (
                      <span className="text-xs text-red-500">✗ 失败</span>
                    )}
                  </span>
                </div>
              </div>
            ) : message.isToolUse && !['Read', 'TodoWrite', 'TodoRead'].includes(message.toolName) ? (
              (() => {
                // Minimize Grep and Glob tools since they happen frequently
                const isSearchTool = ['Grep', 'Glob'].includes(message.toolName);

                if (isSearchTool) {
                  return (
                    <>
                      <div className="group relative bg-gray-50/50 dark:bg-gray-800/30 border-l-2 border-blue-400 dark:border-blue-500 pl-3 py-2 my-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 flex-1 min-w-0">
                            <svg className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span className="font-medium flex-shrink-0">{message.toolName}</span>
                            {message.agentInfo && (
                              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-200 dark:border-indigo-800">
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {message.agentInfo.name || message.agentInfo.role || 'Agent'}
                              </span>
                            )}
                            <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">•</span>
                            {message.toolInput && (() => {
                              try {
                                const input = JSON.parse(message.toolInput);
                                return (
                                  <span className="font-mono truncate flex-1 min-w-0">
                                    {input.pattern && <span>pattern: <span className="text-blue-600 dark:text-blue-400">{input.pattern}</span></span>}
                                    {input.path && <span className="ml-2">in: {input.path}</span>}
                                  </span>
                                );
                              } catch (e) {
                                return null;
                              }
                            })()}
                          </div>
                          {message.toolResult && (
                            <a
                              href={`#tool-result-${message.toolId}`}
                              className="flex-shrink-0 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors flex items-center gap-1"
                            >
                              <span>results</span>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    </>
                  );
                }

                // Full display for other tools
                return (
                  <div className="group relative bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-100/30 dark:border-blue-800/30 rounded-lg p-3 mb-2">
                    {/* Decorative gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 to-indigo-500/3 dark:from-blue-400/3 dark:to-indigo-400/3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    <div className="relative flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 dark:shadow-blue-400/20">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {/* Subtle pulse animation */}
                          <div className="absolute inset-0 rounded-lg bg-blue-500 dark:bg-blue-400 animate-pulse opacity-20"></div>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-white text-sm">
                              {message.toolName}
                            </span>
                            {message.agentInfo && (
                              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-200 dark:border-indigo-800">
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {message.agentInfo.name || message.agentInfo.role || 'Agent'}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {message.toolId}
                          </span>
                        </div>
                      </div>
                      {onShowSettings && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onShowSettings();
                          }}
                          className="p-2 rounded-lg hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all duration-200 group/btn backdrop-blur-sm"
                          title="Tool Settings"
                        >
                          <svg className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/btn:text-blue-600 dark:group-hover/btn:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {message.toolInput && message.toolName === 'Edit' && (() => {
                      try {
                        const input = JSON.parse(message.toolInput);
                        if (input.file_path && input.old_string && input.new_string) {
                          return (
                            <details className="relative mt-3 group/details" open={autoExpandTools}>
                              <summary className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 p-2.5 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50">
                                <svg className="w-4 h-4 transition-transform duration-200 group-open/details:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                <span className="flex items-center gap-2">
                                  <span>View edit diff for</span>
                                </span>
                                <button
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!onFileOpen) return;

                                    try {
                                      // Fetch the current file (after the edit)
                                      const response = await api.readFile(selectedProject?.name, input.file_path);
                                      const data = await response.json();

                                      if (!response.ok || data.error) {
                                        console.error('Failed to fetch file:', data.error);
                                        onFileOpen(input.file_path);
                                        return;
                                      }

                                      const currentContent = data.content || '';

                                      // Reverse apply the edit: replace new_string back to old_string to get the file BEFORE the edit
                                      const oldContent = currentContent.replace(input.new_string, input.old_string);

                                      // Pass the full file before and after the edit
                                      onFileOpen(input.file_path, {
                                        old_string: oldContent,
                                        new_string: currentContent
                                      });
                                    } catch (error) {
                                      console.error('Error preparing diff:', error);
                                      onFileOpen(input.file_path);
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-md bg-white/60 dark:bg-gray-800/60 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-mono text-xs font-medium transition-all duration-200 shadow-sm"
                                >
                                  {input.file_path.split('/').pop()}
                                </button>
                              </summary>
                              <div className="mt-3 pl-6">
                                <div className="bg-white dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-700/60 rounded-lg overflow-hidden shadow-sm">
                                  <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/80 dark:to-gray-800/40 border-b border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm">
                                    <button
                                      onClick={async () => {
                                        if (!onFileOpen) return;

                                        try {
                                          // Fetch the current file (after the edit)
                                          const response = await api.readFile(selectedProject?.name, input.file_path);
                                          const data = await response.json();

                                          if (!response.ok || data.error) {
                                            console.error('Failed to fetch file:', data.error);
                                            onFileOpen(input.file_path);
                                            return;
                                          }

                                          const currentContent = data.content || '';
                                          // Reverse apply the edit: replace new_string back to old_string
                                          const oldContent = currentContent.replace(input.new_string, input.old_string);

                                          // Pass the full file before and after the edit
                                          onFileOpen(input.file_path, {
                                            old_string: oldContent,
                                            new_string: currentContent
                                          });
                                        } catch (error) {
                                          console.error('Error preparing diff:', error);
                                          onFileOpen(input.file_path);
                                        }
                                      }}
                                      className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 truncate cursor-pointer font-medium transition-colors"
                                    >
                                      {input.file_path}
                                    </button>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium px-2 py-0.5 bg-gray-100 dark:bg-gray-700/50 rounded">
                                      Diff
                                    </span>
                                  </div>
                                  <div className="text-xs font-mono">
                                    {createDiff(input.old_string, input.new_string).map((diffLine, i) => (
                                      <div key={i} className="flex">
                                        <span className={`w-8 text-center border-r ${diffLine.type === 'removed'
                                          ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                                          : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                                          }`}>
                                          {diffLine.type === 'removed' ? '-' : '+'}
                                        </span>
                                        <span className={`px-2 py-0.5 flex-1 whitespace-pre-wrap ${diffLine.type === 'removed'
                                          ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                                          : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                                          }`}>
                                          {diffLine.content}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                {showRawParameters && (
                                  <details className="relative mt-3 pl-6 group/raw" open={autoExpandTools}>
                                    <summary className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50">
                                      <svg className="w-3 h-3 transition-transform duration-200 group-open/raw:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                      View raw parameters
                                    </summary>
                                    <pre className="mt-2 text-xs bg-gray-50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/60 p-3 rounded-lg whitespace-pre-wrap break-words overflow-hidden text-gray-700 dark:text-gray-300 font-mono">
                                      {message.toolInput}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            </details>
                          );
                        }
                      } catch (e) {
                        // Fall back to raw display if parsing fails
                      }
                      return (
                        <details className="relative mt-3 group/params" open={autoExpandTools}>
                          <summary className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 p-2.5 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50">
                            <svg className="w-4 h-4 transition-transform duration-200 group-open/params:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            View input parameters
                          </summary>
                          <pre className="mt-3 text-xs bg-gray-50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/60 p-3 rounded-lg whitespace-pre-wrap break-words overflow-hidden text-gray-700 dark:text-gray-300 font-mono">
                            {message.toolInput}
                          </pre>
                        </details>
                      );
                    })()}
                    {message.toolInput && message.toolName !== 'Edit' && (() => {
                      // Debug log to see what we're dealing with

                      // Special handling for Write tool
                      if (message.toolName === 'Write') {
                        try {
                          let input;
                          // Handle both JSON string and already parsed object
                          if (typeof message.toolInput === 'string') {
                            input = JSON.parse(message.toolInput);
                          } else {
                            input = message.toolInput;
                          }


                          if (input.file_path && input.content !== undefined) {
                            return (
                              <details className="relative mt-3 group/details" open={autoExpandTools}>
                                <summary className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 p-2.5 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50">
                                  <svg className="w-4 h-4 transition-transform duration-200 group-open/details:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                  <span className="flex items-center gap-2">
                                    <span className="text-lg leading-none">📄</span>
                                    <span>Creating new file:</span>
                                  </span>
                                  <button
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (!onFileOpen) return;

                                      try {
                                        // Fetch the written file from disk
                                        const response = await api.readFile(selectedProject?.name, input.file_path);
                                        const data = await response.json();

                                        const newContent = (response.ok && !data.error) ? data.content || '' : input.content || '';

                                        // New file: old_string is empty, new_string is the full file
                                        onFileOpen(input.file_path, {
                                          old_string: '',
                                          new_string: newContent
                                        });
                                      } catch (error) {
                                        console.error('Error preparing diff:', error);
                                        // Fallback to tool input content
                                        onFileOpen(input.file_path, {
                                          old_string: '',
                                          new_string: input.content || ''
                                        });
                                      }
                                    }}
                                    className="px-2.5 py-1 rounded-md bg-white/60 dark:bg-gray-800/60 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-mono text-xs font-medium transition-all duration-200 shadow-sm"
                                  >
                                    {input.file_path.split('/').pop()}
                                  </button>
                                </summary>
                                <div className="mt-3 pl-6">
                                  <div className="bg-white dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-700/60 rounded-lg overflow-hidden shadow-sm">
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/80 dark:to-gray-800/40 border-b border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm">
                                      <button
                                        onClick={async () => {
                                          if (!onFileOpen) return;

                                          try {
                                            // Fetch the written file from disk
                                            const response = await api.readFile(selectedProject?.name, input.file_path);
                                            const data = await response.json();

                                            const newContent = (response.ok && !data.error) ? data.content || '' : input.content || '';

                                            // New file: old_string is empty, new_string is the full file
                                            onFileOpen(input.file_path, {
                                              old_string: '',
                                              new_string: newContent
                                            });
                                          } catch (error) {
                                            console.error('Error preparing diff:', error);
                                            // Fallback to tool input content
                                            onFileOpen(input.file_path, {
                                              old_string: '',
                                              new_string: input.content || ''
                                            });
                                          }
                                        }}
                                        className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 truncate cursor-pointer font-medium transition-colors"
                                      >
                                        {input.file_path}
                                      </button>
                                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                                        New File
                                      </span>
                                    </div>
                                    <div className="text-xs font-mono">
                                      {createDiff('', input.content).map((diffLine, i) => (
                                        <div key={i} className="flex">
                                          <span className={`w-8 text-center border-r ${diffLine.type === 'removed'
                                            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                                            : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                                            }`}>
                                            {diffLine.type === 'removed' ? '-' : '+'}
                                          </span>
                                          <span className={`px-2 py-0.5 flex-1 whitespace-pre-wrap ${diffLine.type === 'removed'
                                            ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                                            : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                                            }`}>
                                            {diffLine.content}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  {showRawParameters && (
                                    <details className="relative mt-3 pl-6 group/raw" open={autoExpandTools}>
                                      <summary className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50">
                                        <svg className="w-3 h-3 transition-transform duration-200 group-open/raw:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        View raw parameters
                                      </summary>
                                      <pre className="mt-2 text-xs bg-gray-50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/60 p-3 rounded-lg whitespace-pre-wrap break-words overflow-hidden text-gray-700 dark:text-gray-300 font-mono">
                                        {message.toolInput}
                                      </pre>
                                    </details>
                                  )}
                                </div>
                              </details>
                            );
                          }
                        } catch (e) {
                          // Fall back to regular display
                        }
                      }

                      // Special handling for TodoWrite tool
                      if (message.toolName === 'TodoWrite') {
                        try {
                          const input = JSON.parse(message.toolInput);
                          if (input.todos && Array.isArray(input.todos)) {
                            return (
                              <details className="relative mt-3 group/todo" open={autoExpandTools}>
                                <summary className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 p-2.5 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50">
                                  <svg className="w-4 h-4 transition-transform duration-200 group-open/todo:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                  <span className="flex items-center gap-2">
                                    <span className="text-lg leading-none">✓</span>
                                    <span>Updating Todo List</span>
                                  </span>
                                </summary>
                                <div className="mt-3">
                                  <TodoList todos={input.todos} />
                                  {showRawParameters && (
                                    <details className="relative mt-3 group/raw" open={autoExpandTools}>
                                      <summary className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50">
                                        <svg className="w-3 h-3 transition-transform duration-200 group-open/raw:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                        View raw parameters
                                      </summary>
                                      <pre className="mt-2 text-xs bg-gray-50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/60 p-3 rounded-lg overflow-x-auto text-gray-700 dark:text-gray-300 font-mono">
                                        {message.toolInput}
                                      </pre>
                                    </details>
                                  )}
                                </div>
                              </details>
                            );
                          }
                        } catch (e) {
                          // Fall back to regular display
                        }
                      }

                      // Special handling for Bash tool
                      if (message.toolName === 'Bash') {
                        try {
                          const input = JSON.parse(message.toolInput);
                          return (
                            <div className="my-2">
                              <div className="bg-gray-900 dark:bg-gray-950 rounded-md px-3 py-2 font-mono text-sm">
                                <span className="text-green-400">$</span>
                                <span className="text-gray-100 ml-2">{input.command}</span>
                              </div>
                              {input.description && (
                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic ml-1">
                                  {input.description}
                                </div>
                              )}
                            </div>
                          );
                        } catch (e) {
                          // Fall back to regular display
                        }
                      }

                      // Special handling for Read tool
                      if (message.toolName === 'Read') {
                        try {
                          const input = JSON.parse(message.toolInput);
                          if (input.file_path) {
                            const filename = input.file_path.split('/').pop();

                            return (
                              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                                Read{' '}
                                <button
                                  onClick={() => onFileOpen && onFileOpen(input.file_path)}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline font-mono"
                                >
                                  {filename}
                                </button>
                              </div>
                            );
                          }
                        } catch (e) {
                          // Fall back to regular display
                        }
                      }

                      // Special handling for exit_plan_mode tool
                      if (message.toolName === 'exit_plan_mode') {
                        try {
                          const input = JSON.parse(message.toolInput);
                          if (input.plan) {
                            // Replace escaped newlines with actual newlines
                            const planContent = input.plan.replace(/\\n/g, '\n');
                            return (
                              <details className="mt-2" open={autoExpandTools}>
                                <summary className="text-sm text-blue-700 dark:text-blue-300 cursor-pointer hover:text-blue-800 dark:hover:text-blue-200 flex items-center gap-2">
                                  <svg className="w-4 h-4 transition-transform details-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                  📋 View implementation plan
                                </summary>
                                <Markdown className="mt-3 prose prose-sm max-w-none dark:prose-invert prose-p:mb-2 prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-code:px-1 prose-code:py-0.5 prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700">
                                  {planContent}
                                </Markdown>
                              </details>
                            );
                          }
                        } catch (e) {
                          // Fall back to regular display
                        }
                      }

                      // Regular tool input display for other tools
                      return (
                        <details className="relative mt-3 group/params" open={autoExpandTools}>
                          <summary className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 p-2.5 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50">
                            <svg className="w-4 h-4 transition-transform duration-200 group-open/params:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            View input parameters
                          </summary>
                          <pre className="mt-3 text-xs bg-gray-50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/60 p-3 rounded-lg whitespace-pre-wrap break-words overflow-hidden text-gray-700 dark:text-gray-300 font-mono">
                            {message.toolInput}
                          </pre>
                        </details>
                      );
                    })()}

                    {/* Tool Result Section */}
                    {message.toolResult && (() => {
                      // Hide tool results for Edit/Write/Bash unless there's an error
                      const shouldHideResult = !message.toolResult.isError &&
                        (message.toolName === 'Edit' || message.toolName === 'Write' || message.toolName === 'ApplyPatch' || message.toolName === 'Bash');

                      if (shouldHideResult) {
                        return null;
                      }

                      return (
                        <div
                          id={`tool-result-${message.toolId}`}
                          className={`relative mt-4 p-4 rounded-lg border backdrop-blur-sm scroll-mt-4 ${message.toolResult.isError
                            ? 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-red-200/60 dark:border-red-800/60'
                            : 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200/60 dark:border-green-800/60'
                            }`}>
                          {/* Decorative gradient overlay */}
                          <div className={`absolute inset-0 rounded-lg opacity-50 ${message.toolResult.isError
                            ? 'bg-gradient-to-br from-red-500/5 to-rose-500/5 dark:from-red-400/5 dark:to-rose-400/5'
                            : 'bg-gradient-to-br from-green-500/5 to-emerald-500/5 dark:from-green-400/5 dark:to-emerald-400/5'
                            }`}></div>

                          <div className="relative flex items-center gap-2.5 mb-3">
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shadow-md ${message.toolResult.isError
                              ? 'bg-gradient-to-br from-red-500 to-rose-600 dark:from-red-400 dark:to-rose-500 shadow-red-500/20'
                              : 'bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500 shadow-green-500/20'
                              }`}>
                              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {message.toolResult.isError ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                )}
                              </svg>
                            </div>
                            <span className={`text-sm font-semibold ${message.toolResult.isError
                              ? 'text-red-800 dark:text-red-200'
                              : 'text-green-800 dark:text-green-200'
                              }`}>
                              {message.toolResult.isError ? 'Tool Error' : 'Tool Result'}
                            </span>
                          </div>

                          <div className={`relative text-sm ${message.toolResult.isError
                            ? 'text-red-900 dark:text-red-100'
                            : 'text-green-900 dark:text-green-100'
                            }`}>
                            {(() => {
                              const content = String(message.toolResult.content || '');

                              // Special handling for TodoWrite/TodoRead results
                              if ((message.toolName === 'TodoWrite' || message.toolName === 'TodoRead') &&
                                (content.includes('Todos have been modified successfully') ||
                                  content.includes('Todo list') ||
                                  (content.startsWith('[') && content.includes('"content"') && content.includes('"status"')))) {
                                try {
                                  // Try to parse if it looks like todo JSON data
                                  let todos = null;
                                  if (content.startsWith('[')) {
                                    todos = JSON.parse(content);
                                  } else if (content.includes('Todos have been modified successfully')) {
                                    // For TodoWrite success messages, we don't have the data in the result
                                    return (
                                      <div>
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="font-medium">Todo list has been updated successfully</span>
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (todos && Array.isArray(todos)) {
                                    return (
                                      <div>
                                        <div className="flex items-center gap-2 mb-3">
                                          <span className="font-medium">Current Todo List</span>
                                        </div>
                                        <TodoList todos={todos} isResult={true} />
                                      </div>
                                    );
                                  }
                                } catch (e) {
                                  // Fall through to regular handling
                                }
                              }

                              // Special handling for exit_plan_mode tool results
                              if (message.toolName === 'exit_plan_mode') {
                                try {
                                  // The content should be JSON with a "plan" field
                                  const parsed = JSON.parse(content);
                                  if (parsed.plan) {
                                    // Replace escaped newlines with actual newlines
                                    const planContent = parsed.plan.replace(/\\n/g, '\n');
                                    return (
                                      <div>
                                        <div className="flex items-center gap-2 mb-3">
                                          <span className="font-medium">Implementation Plan</span>
                                        </div>
                                        <Markdown className="prose prose-sm max-w-none dark:prose-invert prose-p:mb-2 prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-code:px-1 prose-code:py-0.5 prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700">
                                          {planContent}
                                        </Markdown>
                                      </div>
                                    );
                                  }
                                } catch (e) {
                                  // Fall through to regular handling
                                }
                              }

                              // Special handling for Grep/Glob results with structured data
                              if ((message.toolName === 'Grep' || message.toolName === 'Glob') && message.toolResult?.toolUseResult) {
                                const toolData = message.toolResult.toolUseResult;

                                // Handle files_with_matches mode or any tool result with filenames array
                                if (toolData.filenames && Array.isArray(toolData.filenames) && toolData.filenames.length > 0) {
                                  return (
                                    <div>
                                      <div className="flex items-center gap-2 mb-3">
                                        <span className="font-medium">
                                          Found {toolData.numFiles || toolData.filenames.length} {(toolData.numFiles === 1 || toolData.filenames.length === 1) ? 'file' : 'files'}
                                        </span>
                                      </div>
                                      <div className="space-y-1 max-h-96 overflow-y-auto">
                                        {toolData.filenames.map((filePath, index) => {
                                          const fileName = filePath.split('/').pop();
                                          const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));

                                          return (
                                            <div
                                              key={index}
                                              onClick={() => {
                                                if (onFileOpen) {
                                                  onFileOpen(filePath);
                                                }
                                              }}
                                              className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-green-100/50 dark:hover:bg-green-800/20 cursor-pointer transition-colors"
                                            >
                                              <svg className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                              </svg>
                                              <div className="flex-1 min-w-0">
                                                <div className="font-mono text-sm font-medium text-green-800 dark:text-green-200 truncate group-hover:text-green-900 dark:group-hover:text-green-100">
                                                  {fileName}
                                                </div>
                                                <div className="font-mono text-xs text-green-600/70 dark:text-green-400/70 truncate">
                                                  {dirPath}
                                                </div>
                                              </div>
                                              <svg className="w-4 h-4 text-green-600 dark:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                              </svg>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                }
                              }

                              // Special handling for interactive prompts
                              if (content.includes('Do you want to proceed?') && message.toolName === 'Bash') {
                                const lines = content.split('\n');
                                const promptIndex = lines.findIndex(line => line.includes('Do you want to proceed?'));
                                const beforePrompt = lines.slice(0, promptIndex).join('\n');
                                const promptLines = lines.slice(promptIndex);

                                // Extract the question and options
                                const questionLine = promptLines.find(line => line.includes('Do you want to proceed?')) || '';
                                const options = [];

                                // Parse numbered options (1. Yes, 2. No, etc.)
                                promptLines.forEach(line => {
                                  const optionMatch = line.match(/^\s*(\d+)\.\s+(.+)$/);
                                  if (optionMatch) {
                                    options.push({
                                      number: optionMatch[1],
                                      text: optionMatch[2].trim()
                                    });
                                  }
                                });

                                // Find which option was selected (usually indicated by "> 1" or similar)
                                const selectedMatch = content.match(/>\s*(\d+)/);
                                const selectedOption = selectedMatch ? selectedMatch[1] : null;

                                return (
                                  <div className="space-y-3">
                                    {beforePrompt && (
                                      <div className="bg-gray-900 dark:bg-gray-950 text-gray-100 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                                        <pre className="whitespace-pre-wrap break-words">{beforePrompt}</pre>
                                      </div>
                                    )}
                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                      <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                        </div>
                                        <div className="flex-1">
                                          <h4 className="font-semibold text-amber-900 dark:text-amber-100 text-base mb-2">
                                            Interactive Prompt
                                          </h4>
                                          <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                                            {questionLine}
                                          </p>

                                          {/* Option buttons */}
                                          <div className="space-y-2 mb-4">
                                            {options.map((option) => (
                                              <button
                                                key={option.number}
                                                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${selectedOption === option.number
                                                  ? 'bg-amber-600 dark:bg-amber-700 text-white border-amber-600 dark:border-amber-700 shadow-md'
                                                  : 'bg-white dark:bg-gray-800 text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700 hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-sm'
                                                  } ${selectedOption ? 'cursor-default' : 'cursor-not-allowed opacity-75'
                                                  }`}
                                                disabled
                                              >
                                                <div className="flex items-center gap-3">
                                                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${selectedOption === option.number
                                                    ? 'bg-white/20'
                                                    : 'bg-amber-100 dark:bg-amber-800/50'
                                                    }`}>
                                                    {option.number}
                                                  </span>
                                                  <span className="text-sm sm:text-base font-medium flex-1">
                                                    {option.text}
                                                  </span>
                                                  {selectedOption === option.number && (
                                                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                  )}
                                                </div>
                                              </button>
                                            ))}
                                          </div>

                                          {selectedOption && (
                                            <div className="bg-amber-100 dark:bg-amber-800/30 rounded-lg p-3">
                                              <p className="text-amber-900 dark:text-amber-100 text-sm font-medium mb-1">
                                                ✓ IFlow selected option {selectedOption}
                                              </p>
                                              <p className="text-amber-800 dark:text-amber-200 text-xs">
                                                In the CLI, you would select this option interactively using arrow keys or by typing the number.
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              const fileEditMatch = content.match(/The file (.+?) has been updated\./);
                              if (fileEditMatch) {
                                return (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="font-medium">File updated successfully</span>
                                    </div>
                                    <button
                                      onClick={async () => {
                                        if (!onFileOpen) return;

                                        // Fetch FULL file content with diff from git
                                        try {
                                          const response = await authenticatedFetch(`/api/git/file-with-diff?project=${encodeURIComponent(selectedProject?.name)}&file=${encodeURIComponent(fileEditMatch[1])}`);
                                          const data = await response.json();

                                          if (!data.error && data.oldContent !== undefined && data.currentContent !== undefined) {
                                            onFileOpen(fileEditMatch[1], {
                                              old_string: data.oldContent || '',
                                              new_string: data.currentContent || ''
                                            });
                                          } else {
                                            onFileOpen(fileEditMatch[1]);
                                          }
                                        } catch (error) {
                                          console.error('Error fetching file diff:', error);
                                          onFileOpen(fileEditMatch[1]);
                                        }
                                      }}
                                      className="text-xs font-mono bg-green-100 dark:bg-green-800/30 px-2 py-1 rounded text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline cursor-pointer"
                                    >
                                      {fileEditMatch[1]}
                                    </button>
                                  </div>
                                );
                              }

                              // Handle Write tool output for file creation
                              const fileCreateMatch = content.match(/(?:The file|File) (.+?) has been (?:created|written)(?: successfully)?\.?/);
                              if (fileCreateMatch) {
                                return (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="font-medium">File created successfully</span>
                                    </div>
                                    <button
                                      onClick={async () => {
                                        if (!onFileOpen) return;

                                        // Fetch FULL file content with diff from git
                                        try {
                                          const response = await authenticatedFetch(`/api/git/file-with-diff?project=${encodeURIComponent(selectedProject?.name)}&file=${encodeURIComponent(fileCreateMatch[1])}`);
                                          const data = await response.json();

                                          if (!data.error && data.oldContent !== undefined && data.currentContent !== undefined) {
                                            onFileOpen(fileCreateMatch[1], {
                                              old_string: data.oldContent || '',
                                              new_string: data.currentContent || ''
                                            });
                                          } else {
                                            onFileOpen(fileCreateMatch[1]);
                                          }
                                        } catch (error) {
                                          console.error('Error fetching file diff:', error);
                                          onFileOpen(fileCreateMatch[1]);
                                        }
                                      }}
                                      className="text-xs font-mono bg-green-100 dark:bg-green-800/30 px-2 py-1 rounded text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline cursor-pointer"
                                    >
                                      {fileCreateMatch[1]}
                                    </button>
                                  </div>
                                );
                              }

                              // Special handling for Write tool - hide content if it's just the file content
                              if (message.toolName === 'Write' && !message.toolResult.isError) {
                                // For Write tool, the diff is already shown in the tool input section
                                // So we just show a success message here
                                return (
                                  <div className="text-green-700 dark:text-green-300">
                                    <div className="flex items-center gap-2">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span className="font-medium">File written successfully</span>
                                    </div>
                                    <p className="text-xs mt-1 text-green-600 dark:text-green-400">
                                      The file content is displayed in the diff view above
                                    </p>
                                  </div>
                                );
                              }

                              if (content.includes('cat -n') && content.includes('→')) {
                                return (
                                  <details open={autoExpandTools}>
                                    <summary className="text-sm text-green-700 dark:text-green-300 cursor-pointer hover:text-green-800 dark:hover:text-green-200 mb-2 flex items-center gap-2">
                                      <svg className="w-4 h-4 transition-transform details-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                      View file content
                                    </summary>
                                    <div className="mt-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                      <div className="text-xs font-mono p-3 whitespace-pre-wrap break-words overflow-hidden">
                                        {content}
                                      </div>
                                    </div>
                                  </details>
                                );
                              }

                              if (content.length > 300) {
                                return (
                                  <details open={autoExpandTools}>
                                    <summary className="text-sm text-green-700 dark:text-green-300 cursor-pointer hover:text-green-800 dark:hover:text-green-200 mb-2 flex items-center gap-2">
                                      <svg className="w-4 h-4 transition-transform details-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                      View full output ({content.length} chars)
                                    </summary>
                                    <Markdown className="mt-2 prose prose-sm max-w-none prose-green dark:prose-invert prose-p:mb-2 prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-code:px-1 prose-code:py-0.5 prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700">
                                      {content}
                                    </Markdown>
                                  </details>
                                );
                              }

                              return (
                                <Markdown className="prose prose-sm max-w-none prose-green dark:prose-invert prose-p:mb-2 prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-code:px-1 prose-code:py-0.5 prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700">
                                  {content}
                                </Markdown>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()
            ) : message.isInteractivePrompt ? (
              // Special handling for interactive prompts
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100 text-base mb-3">
                      Interactive Prompt
                    </h4>
                    {(() => {
                      const lines = message.content.split('\n').filter(line => line.trim());
                      const questionLine = lines.find(line => line.includes('?')) || lines[0] || '';
                      const options = [];

                      // Parse the menu options
                      lines.forEach(line => {
                        // Match lines like "❯ 1. Yes" or "  2. No"
                        const optionMatch = line.match(/[❯\s]*(\d+)\.\s+(.+)/);
                        if (optionMatch) {
                          const isSelected = line.includes('❯');
                          options.push({
                            number: optionMatch[1],
                            text: optionMatch[2].trim(),
                            isSelected
                          });
                        }
                      });

                      return (
                        <>
                          <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                            {questionLine}
                          </p>

                          {/* Option buttons */}
                          <div className="space-y-2 mb-4">
                            {options.map((option) => (
                              <button
                                key={option.number}
                                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${option.isSelected
                                  ? 'bg-amber-600 dark:bg-amber-700 text-white border-amber-600 dark:border-amber-700 shadow-md'
                                  : 'bg-white dark:bg-gray-800 text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700'
                                  } cursor-not-allowed opacity-75`}
                                disabled
                              >
                                <div className="flex items-center gap-3">
                                  <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${option.isSelected
                                    ? 'bg-white/20'
                                    : 'bg-amber-100 dark:bg-amber-800/50'
                                    }`}>
                                    {option.number}
                                  </span>
                                  <span className="text-sm sm:text-base font-medium flex-1">
                                    {option.text}
                                  </span>
                                  {option.isSelected && (
                                    <span className="text-lg">❯</span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>

                          <div className="bg-amber-100 dark:bg-amber-800/30 rounded-lg p-3">
                            <p className="text-amber-900 dark:text-amber-100 text-sm font-medium mb-1">
                              ⏳ Waiting for your response in the CLI
                            </p>
                            <p className="text-amber-800 dark:text-amber-200 text-xs">
                              Please select an option in your terminal where IFlow is running.
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ) : message.isToolUse && message.toolName === 'Read' ? (
              // Simple Read tool indicator
              (() => {
                try {
                  const input = JSON.parse(message.toolInput);
                  if (input.file_path) {
                    const filename = input.file_path.split('/').pop();
                    return (
                      <div className="bg-gray-50/50 dark:bg-gray-800/30 border-l-2 border-gray-400 dark:border-gray-500 pl-3 py-2 my-2">
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          <span className="font-medium">Read</span>
                          <button
                            onClick={() => onFileOpen && onFileOpen(input.file_path)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-mono transition-colors"
                          >
                            {filename}
                          </button>
                        </div>
                      </div>
                    );
                  }
                } catch (e) {
                  return (
                    <div className="bg-gray-50/50 dark:bg-gray-800/30 border-l-2 border-gray-400 dark:border-gray-500 pl-3 py-2 my-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span className="font-medium">Read file</span>
                      </div>
                    </div>
                  );
                }
              })()
            ) : message.isToolUse && message.toolName === 'TodoWrite' ? (
              // Simple TodoWrite tool indicator with tasks
              (() => {
                try {
                  const input = JSON.parse(message.toolInput);
                  if (input.todos && Array.isArray(input.todos)) {
                    return (
                      <div className="bg-gray-50/50 dark:bg-gray-800/30 border-l-2 border-gray-400 dark:border-gray-500 pl-3 py-2 my-2">
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-2">
                          <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          <span className="font-medium">Update todo list</span>
                        </div>
                        <TodoList todos={input.todos} />
                      </div>
                    );
                  }
                } catch (e) {
                  return (
                    <div className="bg-gray-50/50 dark:bg-gray-800/30 border-l-2 border-gray-400 dark:border-gray-500 pl-3 py-2 my-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <span className="font-medium">Update todo list</span>
                      </div>
                    </div>
                  );
                }
              })()
            ) : message.isToolUse && message.toolName === 'TodoRead' ? (
              // Simple TodoRead tool indicator
              <div className="bg-gray-50/50 dark:bg-gray-800/30 border-l-2 border-gray-400 dark:border-gray-500 pl-3 py-2 my-2">
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="font-medium">Read todo list</span>
                </div>
              </div>
            ) : message.type === 'plan' ? (
              <div className="bg-purple-50/50 dark:bg-purple-900/20 border-l-2 border-purple-400 dark:border-purple-500 pl-3 py-2 my-2 rounded-r-lg">
                <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 mb-2">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span className="font-medium">Execution Plan</span>
                </div>
                {message.entries && Array.isArray(message.entries) && message.entries.length > 0 ? (
                  <ol className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                    {message.entries.map((entry, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-full text-xs font-medium">
                          {idx + 1}
                        </span>
                        <span className="flex-1">{entry.content || ''}</span>
                        {entry.status && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${entry.status === 'completed' ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' :
                              entry.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' :
                                'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}>
                            {entry.status}
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400 italic">No plan entries available</div>
                )}
              </div>
            ) : (
              <div className="text-gray-700 dark:text-gray-300">
                {/* Thinking accordion for reasoning */}
                {message.reasoning && (
                  <ThinkingBlock 
                    content={message.reasoning} 
                    isStreaming={message.isStreaming && !message.content}
                    isFinished={!message.isStreaming}
                  />
                )}

                {(() => {
                  const content = formatUsageLimitText(String(message.content || ''));

                  // Detect if content is pure JSON (starts with { or [)
                  const trimmedContent = content.trim();
                  if ((trimmedContent.startsWith('{') || trimmedContent.startsWith('[')) &&
                    (trimmedContent.endsWith('}') || trimmedContent.endsWith(']'))) {
                    try {
                      const parsed = JSON.parse(trimmedContent);
                      const formatted = JSON.stringify(parsed, null, 2);

                      return (
                        <div className="my-2">
                          <div className="flex items-center gap-2 mb-2 text-sm text-gray-600 dark:text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="font-medium">JSON Response</span>
                          </div>
                          <div className="bg-gray-800 dark:bg-gray-900 border border-gray-600/30 dark:border-gray-700 rounded-lg overflow-hidden">
                            <pre className="p-4 overflow-x-auto">
                              <code className="text-gray-100 dark:text-gray-200 text-sm font-mono block whitespace-pre">
                                {formatted}
                              </code>
                            </pre>
                          </div>
                        </div>
                      );
                    } catch (e) {
                      // Not valid JSON, fall through to normal rendering
                    }
                  }

                  // Normal rendering for non-JSON content
                  return message.type === 'assistant' ? (
                    <Markdown className="prose prose-sm max-w-none dark:prose-invert prose-gray prose-p:mb-2 prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-code:px-1 prose-code:py-0.5 prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700">
                      {content}
                    </Markdown>
                  ) : (
                    <div className="whitespace-pre-wrap">
                      {content}
                    </div>
                  );
                })()}
              </div>
            )}

            <div className={`text-xs text-gray-400 dark:text-gray-500 mt-1 pl-1 ${isGrouped ? 'opacity-0 group-hover:opacity-100 transition-opacity' : 'hidden'}`}>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
});

// ImageAttachment component for displaying image previews
const ImageAttachment = ({ file, onRemove, uploadProgress, error }) => {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="relative group">
      <img src={preview} alt={file.name} className="w-20 h-20 object-cover rounded" />
      {uploadProgress !== undefined && uploadProgress < 100 && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-white text-xs">{uploadProgress}%</div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

// ChatInterface: Main chat component with Session Protection System integration
// 
// Session Protection System prevents automatic project updates from interrupting active conversations:
// - onSessionActive: Called when user sends message to mark session as protected
// - onSessionInactive: Called when conversation completes/aborts to re-enable updates
// - onReplaceTemporarySession: Called to replace temporary session ID with real WebSocket session ID
//
// This ensures uninterrupted chat experience by pausing sidebar refreshes during conversations.
function ChatInterface({ selectedProject, selectedSession, ws, sendMessage, messages, onFileOpen, onInputFocusChange, onSessionActive, onSessionInactive, onSessionProcessing, onSessionNotProcessing, processingSessions, onReplaceTemporarySession, onNavigateToSession, onShowSettings, autoExpandTools, showRawParameters, showThinking, autoScrollToBottom, sendByCtrlEnter, externalMessageUpdate, onTaskClick, onShowAllTasks, aiPersona }) {
  const { tasksEnabled, isTaskMasterInstalled } = useTasksSettings();
  const [input, setInput] = useState(() => {
    if (typeof window !== 'undefined' && selectedProject) {
      return safeLocalStorage.getItem(`draft_input_${selectedProject.name}`) || '';
    }
    return '';
  });
  const [chatMessages, setChatMessages] = useState(() => {
    if (typeof window !== 'undefined' && selectedProject) {
      const saved = safeLocalStorage.getItem(`chat_messages_${selectedProject.name}`);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Load messages from IndexedDB on mount
  useEffect(() => {
    if (selectedProject) {
      const sessionId = selectedProject.name;
      
      chatStorage.getMessages(sessionId).then(messages => {
        if (messages.length > 0) {
          setChatMessages(messages);
        }
      }).catch(error => {
        console.error('Error loading messages from IndexedDB:', error);
        // Fallback to localStorage
        const fallbackMessages = safeLocalStorage.getItem(`chat_messages_${sessionId}`);
        if (fallbackMessages) {
          try {
            setChatMessages(JSON.parse(fallbackMessages));
          } catch (e) {
            console.error('Error parsing fallback messages:', e);
          }
        }
      });
    }
  }, [selectedProject?.name]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize IndexedDB and migrate data from localStorage
  useEffect(() => {
    let mounted = true;

    const initializeIndexedDB = async () => {
      try {
        // Check if migration has already been done
        const migrationComplete = localStorage.getItem('indexeddb_migration_complete');
        
        if (!migrationComplete) {
          console.log('Starting IndexedDB migration...');
          const success = await migrateFromLocalStorage();
          
          if (success && mounted) {
            localStorage.setItem('indexeddb_migration_complete', 'true');
            console.log('IndexedDB migration completed successfully');
          }
        }
      } catch (error) {
        console.error('Error during IndexedDB initialization:', error);
      }
    };

    initializeIndexedDB();

    return () => {
      mounted = false;
    };
  }, []);
  const [currentSessionId, setCurrentSessionId] = useState(selectedSession?.id || null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [sessionMessages, setSessionMessages] = useState([]);
  const [isLoadingSessionMessages, setIsLoadingSessionMessages] = useState(false);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [messagesOffset, setMessagesOffset] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);
  const MESSAGES_PER_PAGE = 20;
  const [isSystemSessionChange, setIsSystemSessionChange] = useState(false);
  const [permissionMode, setPermissionMode] = useState('default');
  const [attachedImages, setAttachedImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(new Map());
  const [imageErrors, setImageErrors] = useState(new Map());
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const inputContainerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isLoadingSessionRef = useRef(false); // Track session loading to prevent multiple scrolls
  // Streaming throttle buffers
  const streamBufferRef = useRef('');
  const streamTimerRef = useRef(null);
  const commandQueryTimerRef = useRef(null);
  const abortControllerRef = useRef(null); // Ref to hold the current request's AbortController
  const [debouncedInput, setDebouncedInput] = useState('');
  const [showFileDropdown, setShowFileDropdown] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(-1);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [atSymbolPosition, setAtSymbolPosition] = useState(-1);
  const [canAbortSession, setCanAbortSession] = useState(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const scrollPositionRef = useRef({ height: 0, top: 0 });
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [slashCommands, setSlashCommands] = useState([]);
  const [filteredCommands, setFilteredCommands] = useState([]);
  const [showAutoFixPanel, setShowAutoFixPanel] = useState(false);
  const [showContextVisualizer, setShowContextVisualizer] = useState(false);
  const [showPromptOptimizer, setShowPromptOptimizer] = useState(false);
  const [promptOptimizerResult, setPromptOptimizerResult] = useState(null);
  const [promptOptimizerLoading, setPromptOptimizerLoading] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [isTextareaExpanded, setIsTextareaExpanded] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [errorDetected, setErrorDetected] = useState(null);
  const [tokenBudget, setTokenBudget] = useState(null);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(-1);
  const [slashPosition, setSlashPosition] = useState(-1);
  const [visibleMessageCount, setVisibleMessageCount] = useState(100);
  const [iflowStatus, setIflowStatus] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [lastHeartbeat, setLastHeartbeat] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [provider, setProvider] = useState(() => {
    return localStorage.getItem('selected-provider') || 'iflow';
  });
  const [cursorModel, setCursorModel] = useState(() => {
    return localStorage.getItem('cursor-model') || 'gpt-5';
  });
  const [iflowModel, setIflowModel] = useState(() => {
    return localStorage.getItem('iflow-model') || 'GLM-4.7';
  });

  // Listen for model changes from the selector
  useEffect(() => {
    const handleModelChange = (e) => {
      if (e.detail && e.detail.model) {
        setIflowModel(e.detail.model);
      }
    };

    window.addEventListener('iflow-model-changed', handleModelChange);
    return () => window.removeEventListener('iflow-model-changed', handleModelChange);
  }, []);

  // Current agent info for typing indicator
  const currentAgentInfo = useMemo(() => {
    if (provider === 'cursor') {
      return cursorModel;
    } else {
      return iflowModel;
    }
  }, [provider, cursorModel, iflowModel]);
  // Load permission mode for the current session
  useEffect(() => {
    if (selectedSession?.id) {
      const savedMode = localStorage.getItem(`permissionMode-${selectedSession.id}`);
      if (savedMode) {
        setPermissionMode(savedMode);
      } else {
        setPermissionMode('default');
      }
    }
  }, [selectedSession?.id]);

  const handleAbortSession = useCallback(() => {
    if (currentSessionId && canAbortSession) {
      sendMessage({
        type: 'abort-session',
        sessionId: currentSessionId,
        provider: provider
      });
    }
  }, [currentSessionId, canAbortSession, sendMessage, provider]);

  // Handle global ESC key to abort generation
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape' && isLoading) {
        e.preventDefault();
        console.log('ESC pressed, aborting session...');

        // 1. Abort local fetch
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }

        // 2. Notify backend to kill process
        handleAbortSession();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isLoading, handleAbortSession]);

  // When selecting a session from Sidebar, auto-switch provider to match session's origin
  useEffect(() => {
    if (selectedSession && selectedSession.__provider && selectedSession.__provider !== provider) {
      setProvider(selectedSession.__provider);
      localStorage.setItem('selected-provider', selectedSession.__provider);
    }
  }, [selectedSession]);

  // Load Cursor default model from config
  useEffect(() => {
    if (provider === 'cursor') {
      authenticatedFetch('/api/cursor/config')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.config?.model?.modelId) {
            // Map Cursor model IDs to our simplified names
            const modelMap = {
              'gpt-5': 'gpt-5',
              'iflow-4-sonnet': 'sonnet-4',
              'sonnet-4': 'sonnet-4',
              'iflow-4-opus': 'opus-4.1',
              'opus-4.1': 'opus-4.1'
            };
            const mappedModel = modelMap[data.config.model.modelId] || data.config.model.modelId;
            if (!localStorage.getItem('cursor-model')) {
              setCursorModel(mappedModel);
            }
          }
        })
        .catch(err => console.error('Error loading Cursor config:', err));
    }
  }, [provider]);

  // Handle keyboard events for Focus Mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
      }
    };

    if (focusMode) {
      document.addEventListener('keydown', handleKeyDown);
      // Add focus mode class to body
      document.body.classList.add('focus-mode');
    } else {
      document.body.classList.remove('focus-mode');
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('focus-mode');
    };
  }, [focusMode]);

  // Fetch slash commands on mount and when project changes
  useEffect(() => {
    const fetchCommands = async () => {
      if (!selectedProject) return;

      try {
        const response = await authenticatedFetch('/api/commands/list', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectPath: selectedProject.path
          })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch commands');
        }

        const data = await response.json();

        // Combine built-in and custom commands
        const allCommands = [
          ...(data.builtIn || []).map(cmd => ({ ...cmd, type: 'built-in' })),
          ...(data.custom || []).map(cmd => ({ ...cmd, type: 'custom' }))
        ];

        setSlashCommands(allCommands);

        // Load command history from localStorage
        const historyKey = `command_history_${selectedProject.name}`;
        const history = safeLocalStorage.getItem(historyKey);
        if (history) {
          try {
            const parsedHistory = JSON.parse(history);
            // Sort commands by usage frequency
            const sortedCommands = allCommands.sort((a, b) => {
              const aCount = parsedHistory[a.name] || 0;
              const bCount = parsedHistory[b.name] || 0;
              return bCount - aCount;
            });
            setSlashCommands(sortedCommands);
          } catch (e) {
            console.error('Error parsing command history:', e);
          }
        }
      } catch (error) {
        console.error('Error fetching slash commands:', error);
        setSlashCommands([]);
      }
    };

    fetchCommands();
  }, [selectedProject]);

  // Create Fuse instance for fuzzy search
  const fuse = useMemo(() => {
    if (!slashCommands.length) return null;

    return new Fuse(slashCommands, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'description', weight: 1 }
      ],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 1
    });
  }, [slashCommands]);

  // Filter commands based on query
  useEffect(() => {
    if (!commandQuery) {
      setFilteredCommands(slashCommands);
      return;
    }

    if (!fuse) {
      setFilteredCommands([]);
      return;
    }

    const results = fuse.search(commandQuery);
    setFilteredCommands(results.map(result => result.item));
  }, [commandQuery, slashCommands, fuse]);

  // Calculate frequently used commands
  const frequentCommands = useMemo(() => {
    if (!selectedProject || slashCommands.length === 0) return [];

    const historyKey = `command_history_${selectedProject.name}`;
    const history = safeLocalStorage.getItem(historyKey);

    if (!history) return [];

    try {
      const parsedHistory = JSON.parse(history);

      // Sort commands by usage count
      const commandsWithUsage = slashCommands
        .map(cmd => ({
          ...cmd,
          usageCount: parsedHistory[cmd.name] || 0
        }))
        .filter(cmd => cmd.usageCount > 0)
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5); // Top 5 most used

      return commandsWithUsage;
    } catch (e) {
      console.error('Error parsing command history:', e);
      return [];
    }
  }, [selectedProject, slashCommands]);

  // Command selection callback with history tracking
  const handleCommandSelect = useCallback((command, index, isHover) => {
    if (!command || !selectedProject) return;

    // If hovering, just update the selected index
    if (isHover) {
      setSelectedCommandIndex(index);
      return;
    }

    // Update command history
    const historyKey = `command_history_${selectedProject.name}`;
    const history = safeLocalStorage.getItem(historyKey);
    let parsedHistory = {};

    try {
      parsedHistory = history ? JSON.parse(history) : {};
    } catch (e) {
      console.error('Error parsing command history:', e);
    }

    parsedHistory[command.name] = (parsedHistory[command.name] || 0) + 1;
    safeLocalStorage.setItem(historyKey, JSON.stringify(parsedHistory));

    // Execute the command
    executeCommand(command);
  }, [selectedProject]);

  // Execute a command
  const handleBuiltInCommand = useCallback((result) => {
    const { action, data } = result;

    switch (action) {
      case 'clear':
        // Clear conversation history
        setChatMessages([]);
        setSessionMessages([]);
        break;

      case 'help':
        // Show help content
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: data.content,
          timestamp: Date.now()
        }]);
        break;

      case 'model':
        // Show model information
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `**Current Model**: ${data.current.model}\n\n**Available Models**:\n\nIFlow: ${data.available.iflow.join(', ')}\n\nCursor: ${data.available.cursor.join(', ')}`,
          timestamp: Date.now()
        }]);
        break;

      case 'cost': {
        const costMessage = `**Token Usage**: ${data.tokenUsage.used.toLocaleString()} / ${data.tokenUsage.total.toLocaleString()} (${data.tokenUsage.percentage}%)\n\n**Estimated Cost**:\n- Input: $${data.cost.input}\n- Output: $${data.cost.output}\n- **Total**: $${data.cost.total}\n\n**Model**: ${data.model}`;
        setChatMessages(prev => [...prev, { role: 'assistant', content: costMessage, timestamp: Date.now() }]);
        break;
      }

      case 'status': {
        const statusMessage = `**System Status**\n\n- Version: ${data.version}\n- Uptime: ${data.uptime}\n- Model: ${data.model}\n- Provider: ${data.provider}\n- Node.js: ${data.nodeVersion}\n- Platform: ${data.platform}`;
        setChatMessages(prev => [...prev, { role: 'assistant', content: statusMessage, timestamp: Date.now() }]);
        break;
      }
      case 'memory':
        // Show memory file info
        if (data.error) {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `⚠️ ${data.message}`,
            timestamp: Date.now()
          }]);
        } else {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `📝 ${data.message}\n\nPath: \`${data.path}\``,
            timestamp: Date.now()
          }]);
          // Optionally open file in editor
          if (data.exists && onFileOpen) {
            onFileOpen(data.path);
          }
        }
        break;

      case 'config':
        // Open settings
        if (onShowSettings) {
          onShowSettings();
        }
        break;

      case 'rewind':
        // Rewind conversation
        if (data.error) {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `⚠️ ${data.message}`,
            timestamp: Date.now()
          }]);
        } else {
          // Remove last N messages
          setChatMessages(prev => prev.slice(0, -data.steps * 2)); // Remove user + assistant pairs
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `⏪ ${data.message}`,
            timestamp: Date.now()
          }]);
        }
        break;

      default:
        console.warn('Unknown built-in command action:', action);
    }
  }, [onFileOpen, onShowSettings]);

  // Ref to store handleSubmit so we can call it from handleCustomCommand
  const handleSubmitRef = useRef(null);

  // Handle custom command execution
  const handleCustomCommand = useCallback(async (result, args) => {
    const { content, hasBashCommands, hasFileIncludes } = result;

    // Show confirmation for bash commands
    if (hasBashCommands) {
      const confirmed = window.confirm(
        'This command contains bash commands that will be executed. Do you want to proceed?'
      );
      if (!confirmed) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: '❌ Command execution cancelled',
          timestamp: Date.now()
        }]);
        return;
      }
    }

    // Set the input to the command content
    setInput(content);

    // Wait for state to update, then directly call handleSubmit
    setTimeout(() => {
      if (handleSubmitRef.current) {
        // Create a fake event to pass to handleSubmit
        const fakeEvent = { preventDefault: () => { } };
        handleSubmitRef.current(fakeEvent);
      }
    }, 50);
  }, []);
  const executeCommand = useCallback(async (command) => {
    if (!command || !selectedProject) return;

    try {
      // Parse command and arguments from current input
      const commandMatch = input.match(new RegExp(`${command.name}\\s*(.*)`));
      const args = commandMatch && commandMatch[1]
        ? commandMatch[1].trim().split(/\s+/)
        : [];

      // Prepare context for command execution
      const context = {
        projectPath: selectedProject.path,
        projectName: selectedProject.name,
        sessionId: currentSessionId,
        provider,
        model: provider === 'cursor' ? cursorModel : iflowModel,
        tokenUsage: tokenBudget
      };

      // Call the execute endpoint
      const response = await authenticatedFetch('/api/commands/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commandName: command.name,
          commandPath: command.path,
          args,
          context
        })
      });

      if (!response.ok) {
        throw new Error('Failed to execute command');
      }

      const result = await response.json();

      // Handle built-in commands
      if (result.type === 'builtin') {
        handleBuiltInCommand(result);
      } else if (result.type === 'custom') {
        // Handle custom commands - inject as system message
        await handleCustomCommand(result, args);
      }

      // Clear the input after successful execution
      setInput('');
      setShowCommandMenu(false);
      setSlashPosition(-1);
      setCommandQuery('');
      setSelectedCommandIndex(-1);

    } catch (error) {
      console.error('Error executing command:', error);
      // Show error message to user
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error executing command: ${error.message}`,
        timestamp: Date.now()
      }]);
    }
  }, [input, selectedProject, currentSessionId, provider, cursorModel, tokenBudget]);

  // Handle built-in command actions


  // Memoized diff calculation to prevent recalculating on every render
  const createDiff = useMemo(() => {
    const cache = new Map();
    return (oldStr, newStr) => {
      const key = `${oldStr.length}-${newStr.length}-${oldStr.slice(0, 50)}`;
      if (cache.has(key)) {
        return cache.get(key);
      }

      const result = calculateDiff(oldStr, newStr);
      cache.set(key, result);
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      return result;
    };
  }, []);

  // Load session messages from API with pagination
  const loadSessionMessages = useCallback(async (projectName, sessionId, loadMore = false) => {
    if (!projectName || !sessionId) return [];

    const isInitialLoad = !loadMore;
    if (isInitialLoad) {
      setIsLoadingSessionMessages(true);
    } else {
      setIsLoadingMoreMessages(true);
    }

    try {
      const currentOffset = loadMore ? messagesOffset : 0;
      const response = await api.sessionMessages(projectName, sessionId, MESSAGES_PER_PAGE, currentOffset);
      if (!response.ok) {
        throw new Error('Failed to load session messages');
      }
      const data = await response.json();

      // Handle paginated response
      if (data.hasMore !== undefined) {
        setHasMoreMessages(data.hasMore);
        setTotalMessages(data.total);
        setMessagesOffset(currentOffset + (data.messages?.length || 0));
        return data.messages || [];
      } else {
        // Backward compatibility for non-paginated response
        const messages = data.messages || [];
        setHasMoreMessages(false);
        setTotalMessages(messages.length);
        return messages;
      }
    } catch (error) {
      console.error('Error loading session messages:', error);
      return [];
    } finally {
      if (isInitialLoad) {
        setIsLoadingSessionMessages(false);
      } else {
        setIsLoadingMoreMessages(false);
      }
    }
  }, [messagesOffset]);

  // Load Cursor session messages from SQLite via backend
  const loadCursorSessionMessages = useCallback(async (projectPath, sessionId) => {
    if (!projectPath || !sessionId) return [];
    setIsLoadingSessionMessages(true);
    try {
      const url = `/api/cursor/sessions/${encodeURIComponent(sessionId)}?projectPath=${encodeURIComponent(projectPath)}`;
      const res = await authenticatedFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      const blobs = data?.session?.messages || [];
      const converted = [];
      const toolUseMap = {}; // Map to store tool uses by ID for linking results

      // First pass: process all messages maintaining order
      for (let blobIdx = 0; blobIdx < blobs.length; blobIdx++) {
        const blob = blobs[blobIdx];
        const content = blob.content;
        let text = '';
        let role = 'assistant';
        let reasoningText = null; // Move to outer scope
        try {
          // Handle different Cursor message formats
          if (content?.role && content?.content) {
            // Direct format: {"role":"user","content":[{"type":"text","text":"..."}]}
            // Skip system messages
            if (content.role === 'system') {
              continue;
            }

            // Handle tool messages
            if (content.role === 'tool') {
              // Tool result format - find the matching tool use message and update it
              if (Array.isArray(content.content)) {
                for (const item of content.content) {
                  if (item?.type === 'tool-result') {
                    // Map ApplyPatch to Edit for consistency
                    let toolName = item.toolName || 'Unknown Tool';
                    if (toolName === 'ApplyPatch') {
                      toolName = 'Edit';
                    }
                    const toolCallId = item.toolCallId || content.id;
                    const result = item.result || '';

                    // Store the tool result to be linked later
                    if (toolUseMap[toolCallId]) {
                      toolUseMap[toolCallId].toolResult = {
                        content: result,
                        isError: false
                      };
                    } else {
                      // No matching tool use found, create a standalone result message
                      converted.push({
                        type: 'assistant',
                        content: '',
                        timestamp: new Date(Date.now() + blobIdx * 1000),
                        blobId: blob.id,
                        sequence: blob.sequence,
                        rowid: blob.rowid,
                        isToolUse: true,
                        toolName: toolName,
                        toolId: toolCallId,
                        toolInput: null,
                        toolResult: {
                          content: result,
                          isError: false
                        }
                      });
                    }
                  }
                }
              }
              continue; // Don't add tool messages as regular messages
            } else {
              // User or assistant messages
              role = content.role === 'user' ? 'user' : 'assistant';

              if (Array.isArray(content.content)) {
                // Extract text, reasoning, and tool calls from content array
                const textParts = [];

                for (const part of content.content) {
                  if (part?.type === 'text' && part?.text) {
                    textParts.push(decodeHtmlEntities(part.text));
                  } else if (part?.type === 'reasoning' && part?.text) {
                    // Handle reasoning type - will be displayed in a collapsible section
                    reasoningText = decodeHtmlEntities(part.text);
                  } else if (part?.type === 'tool-call') {
                    // First, add any text/reasoning we've collected so far as a message
                    if (textParts.length > 0 || reasoningText) {
                      converted.push({
                        type: role,
                        content: textParts.join('\n'),
                        reasoning: reasoningText,
                        timestamp: new Date(Date.now() + blobIdx * 1000),
                        blobId: blob.id,
                        sequence: blob.sequence,
                        rowid: blob.rowid
                      });
                      textParts.length = 0;
                      reasoningText = null;
                    }

                    // Tool call in assistant message - format like IFlow Code
                    // Map ApplyPatch to Edit for consistency with IFlow Code
                    let toolName = part.toolName || 'Unknown Tool';
                    if (toolName === 'ApplyPatch') {
                      toolName = 'Edit';
                    }
                    const toolId = part.toolCallId || `tool_${blobIdx}`;

                    // Create a tool use message with IFlow Code format
                    // Map Cursor args format to IFlow Code format
                    let toolInput = part.args;

                    if (toolName === 'Edit' && part.args) {
                      // ApplyPatch uses 'patch' format, convert to Edit format
                      if (part.args.patch) {
                        // Parse the patch to extract old and new content
                        const patchLines = part.args.patch.split('\n');
                        let oldLines = [];
                        let newLines = [];
                        let inPatch = false;

                        for (const line of patchLines) {
                          if (line.startsWith('@@')) {
                            inPatch = true;
                          } else if (inPatch) {
                            if (line.startsWith('-')) {
                              oldLines.push(line.substring(1));
                            } else if (line.startsWith('+')) {
                              newLines.push(line.substring(1));
                            } else if (line.startsWith(' ')) {
                              // Context line - add to both
                              oldLines.push(line.substring(1));
                              newLines.push(line.substring(1));
                            }
                          }
                        }

                        const filePath = part.args.file_path;
                        const absolutePath = filePath && !filePath.startsWith('/')
                          ? `${projectPath}/${filePath}`
                          : filePath;
                        toolInput = {
                          file_path: absolutePath,
                          old_string: oldLines.join('\n') || part.args.patch,
                          new_string: newLines.join('\n') || part.args.patch
                        };
                      } else {
                        // Direct edit format
                        toolInput = part.args;
                      }
                    } else if (toolName === 'Read' && part.args) {
                      // Map 'path' to 'file_path'
                      // Convert relative path to absolute if needed
                      const filePath = part.args.path || part.args.file_path;
                      const absolutePath = filePath && !filePath.startsWith('/')
                        ? `${projectPath}/${filePath}`
                        : filePath;
                      toolInput = {
                        file_path: absolutePath
                      };
                    } else if (toolName === 'Write' && part.args) {
                      // Map fields for Write tool
                      const filePath = part.args.path || part.args.file_path;
                      const absolutePath = filePath && !filePath.startsWith('/')
                        ? `${projectPath}/${filePath}`
                        : filePath;
                      toolInput = {
                        file_path: absolutePath,
                        content: part.args.contents || part.args.content
                      };
                    }

                    const toolMessage = {
                      type: 'assistant',
                      content: '',
                      timestamp: new Date(Date.now() + blobIdx * 1000),
                      blobId: blob.id,
                      sequence: blob.sequence,
                      rowid: blob.rowid,
                      isToolUse: true,
                      toolName: toolName,
                      toolId: toolId,
                      toolInput: toolInput ? JSON.stringify(toolInput) : null,
                      toolResult: null // Will be filled when we get the tool result
                    };
                    converted.push(toolMessage);
                    toolUseMap[toolId] = toolMessage; // Store for linking results
                  } else if (part?.type === 'tool_use') {
                    // Old format support
                    if (textParts.length > 0 || reasoningText) {
                      converted.push({
                        type: role,
                        content: textParts.join('\n'),
                        reasoning: reasoningText,
                        timestamp: new Date(Date.now() + blobIdx * 1000),
                        blobId: blob.id,
                        sequence: blob.sequence,
                        rowid: blob.rowid
                      });
                      textParts.length = 0;
                      reasoningText = null;
                    }

                    const toolName = part.name || 'Unknown Tool';
                    const toolId = part.id || `tool_${blobIdx}`;

                    const toolMessage = {
                      type: 'assistant',
                      content: '',
                      timestamp: new Date(Date.now() + blobIdx * 1000),
                      blobId: blob.id,
                      sequence: blob.sequence,
                      rowid: blob.rowid,
                      isToolUse: true,
                      toolName: toolName,
                      toolId: toolId,
                      toolInput: part.input ? JSON.stringify(part.input) : null,
                      toolResult: null
                    };
                    converted.push(toolMessage);
                    toolUseMap[toolId] = toolMessage;
                  } else if (typeof part === 'string') {
                    textParts.push(part);
                  }
                }

                // Add any remaining text/reasoning
                if (textParts.length > 0) {
                  text = textParts.join('\n');
                  if (reasoningText && !text) {
                    // Just reasoning, no text
                    converted.push({
                      type: role,
                      content: '',
                      reasoning: reasoningText,
                      timestamp: new Date(Date.now() + blobIdx * 1000),
                      blobId: blob.id,
                      sequence: blob.sequence,
                      rowid: blob.rowid
                    });
                    text = ''; // Clear to avoid duplicate
                  }
                } else {
                  text = '';
                }
              } else if (typeof content.content === 'string') {
                text = content.content;
              }
            }
          } else if (content?.message?.role && content?.message?.content) {
            // Nested message format
            if (content.message.role === 'system') {
              continue;
            }
            role = content.message.role === 'user' ? 'user' : 'assistant';
            if (Array.isArray(content.message.content)) {
              text = content.message.content
                .map(p => (typeof p === 'string' ? p : (p?.text || '')))
                .filter(Boolean)
                .join('\n');
            } else if (typeof content.message.content === 'string') {
              text = content.message.content;
            }
          }
        } catch (e) {
          console.log('Error parsing blob content:', e);
        }
        if (text && text.trim()) {
          const message = {
            type: role,
            content: text,
            timestamp: new Date(Date.now() + blobIdx * 1000),
            blobId: blob.id,
            sequence: blob.sequence,
            rowid: blob.rowid
          };

          // Add reasoning if we have it
          if (reasoningText) {
            message.reasoning = reasoningText;
          }

          converted.push(message);
        }
      }

      // Sort messages by sequence/rowid to maintain chronological order
      converted.sort((a, b) => {
        // First sort by sequence if available (clean 1,2,3... numbering)
        if (a.sequence !== undefined && b.sequence !== undefined) {
          return a.sequence - b.sequence;
        }
        // Then try rowid (original SQLite row IDs)
        if (a.rowid !== undefined && b.rowid !== undefined) {
          return a.rowid - b.rowid;
        }
        // Fallback to timestamp
        return new Date(a.timestamp) - new Date(b.timestamp);
      });

      return converted;
    } catch (e) {
      console.error('Error loading Cursor session messages:', e);
      return [];
    } finally {
      setIsLoadingSessionMessages(false);
    }
  }, []);

  // Actual diff calculation function
  const calculateDiff = (oldStr, newStr) => {
    const oldLines = oldStr.split('\n');
    const newLines = newStr.split('\n');

    // Simple diff algorithm - find common lines and differences
    const diffLines = [];
    let oldIndex = 0;
    let newIndex = 0;

    while (oldIndex < oldLines.length || newIndex < newLines.length) {
      const oldLine = oldLines[oldIndex];
      const newLine = newLines[newIndex];

      if (oldIndex >= oldLines.length) {
        // Only new lines remaining
        diffLines.push({ type: 'added', content: newLine, lineNum: newIndex + 1 });
        newIndex++;
      } else if (newIndex >= newLines.length) {
        // Only old lines remaining
        diffLines.push({ type: 'removed', content: oldLine, lineNum: oldIndex + 1 });
        oldIndex++;
      } else if (oldLine === newLine) {
        // Lines are the same - skip in diff view (or show as context)
        oldIndex++;
        newIndex++;
      } else {
        // Lines are different
        diffLines.push({ type: 'removed', content: oldLine, lineNum: oldIndex + 1 });
        diffLines.push({ type: 'added', content: newLine, lineNum: newIndex + 1 });
        oldIndex++;
        newIndex++;
      }
    }

    return diffLines;
  };

  const convertSessionMessages = (rawMessages) => {
    const converted = [];
    const toolResults = new Map(); // Map tool_use_id to tool result

    // First pass: collect all tool results
    for (const msg of rawMessages) {
      if (msg.message?.role === 'user' && Array.isArray(msg.message?.content)) {
        for (const part of msg.message.content) {
          if (part.type === 'tool_result') {
            toolResults.set(part.tool_use_id, {
              content: part.content,
              isError: part.is_error,
              timestamp: new Date(msg.timestamp || Date.now()),
              // Extract structured tool result data (e.g., for Grep, Glob)
              toolUseResult: msg.toolUseResult || null
            });
          }
        }
      }
    }

    // Second pass: process messages and attach tool results to tool uses
    for (const msg of rawMessages) {
      // Handle user messages
      if (msg.message?.role === 'user' && msg.message?.content) {
        let content = '';
        let messageType = 'user';

        if (Array.isArray(msg.message.content)) {
          // Handle array content, but skip tool results (they're attached to tool uses)
          const textParts = [];

          for (const part of msg.message.content) {
            if (part.type === 'text') {
              textParts.push(decodeHtmlEntities(part.text));
            }
            // Skip tool_result parts - they're handled in the first pass
          }

          content = textParts.join('\n');
        } else if (typeof msg.message.content === 'string') {
          content = decodeHtmlEntities(msg.message.content);
        } else {
          content = decodeHtmlEntities(String(msg.message.content));
        }

        // Skip command messages, system messages, and empty content
        const shouldSkip = !content ||
          content.startsWith('<command-name>') ||
          content.startsWith('<command-message>') ||
          content.startsWith('<command-args>') ||
          content.startsWith('<local-command-stdout>') ||
          content.startsWith('<system-reminder>') ||
          content.startsWith('Caveat:') ||
          content.startsWith('This session is being continued from a previous') ||
          content.startsWith('[Request interrupted');

        if (!shouldSkip) {
          // Unescape with math formula protection
          content = unescapeWithMathProtection(content);
          converted.push({
            type: messageType,
            content: content,
            timestamp: msg.timestamp || new Date().toISOString()
          });
        }
      }

      // Handle assistant messages
      else if (msg.message?.role === 'assistant' && msg.message?.content) {
        if (Array.isArray(msg.message.content)) {
          for (const part of msg.message.content) {
            if (part.type === 'text') {
              // Unescape with math formula protection
              let text = part.text;
              if (typeof text === 'string') {
                text = unescapeWithMathProtection(text);
              }
              converted.push({
                type: 'assistant',
                content: text,
                timestamp: msg.timestamp || new Date().toISOString()
              });
            } else if (part.type === 'tool_use') {
              // Get the corresponding tool result
              const toolResult = toolResults.get(part.id);

              converted.push({
                type: 'assistant',
                content: '',
                timestamp: msg.timestamp || new Date().toISOString(),
                isToolUse: true,
                toolName: part.name,
                toolInput: JSON.stringify(part.input),
                toolResult: toolResult ? {
                  content: typeof toolResult.content === 'string' ? toolResult.content : JSON.stringify(toolResult.content),
                  isError: toolResult.isError,
                  toolUseResult: toolResult.toolUseResult
                } : null,
                toolError: toolResult?.isError || false,
                toolResultTimestamp: toolResult?.timestamp || new Date()
              });
            }
          }
        } else if (typeof msg.message.content === 'string') {
          // Unescape with math formula protection
          let text = msg.message.content;
          text = unescapeWithMathProtection(text);
          converted.push({
            type: 'assistant',
            content: text,
            timestamp: msg.timestamp || new Date().toISOString()
          });
        }
      }
    }

    return converted;
  };

  // Memoize expensive convertSessionMessages operation
  const convertedMessages = useMemo(() => {
    return convertSessionMessages(sessionMessages);
  }, [sessionMessages]);

  // Note: Token budgets are not saved to JSONL files, only sent via WebSocket
  // So we don't try to extract them from loaded sessionMessages

  // Define scroll functions early to avoid hoisting issues in useEffect dependencies
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      // Virtuoso provides scrollToIndex method
      scrollContainerRef.current.scrollToIndex({
        index: 'LAST',
        behavior: 'smooth'
      });
      // Don't reset isUserScrolledUp here - let the scroll handler manage it
      // This prevents fighting with user's scroll position during streaming
    }
  }, []);

  // Check if user is near the bottom of the scroll container
  const isNearBottom = useCallback(() => {
    if (!scrollContainerRef.current) return false;
    // Virtuoso provides state.range to get current scroll state
    const state = scrollContainerRef.current.getState();
    if (!state) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = state;
    // Consider "near bottom" if within 50px of the bottom
    return scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  // Handle scroll events to detect when user manually scrolls up and load more messages
  const handleScroll = useCallback(async (event) => {
    if (scrollContainerRef.current) {
      const container = event.target;
      const nearBottom = isNearBottom();
      setIsUserScrolledUp(!nearBottom);

      // Check if we should load more messages (scrolled near top)
      const scrolledNearTop = container.scrollTop < 100;
      const provider = localStorage.getItem('selected-provider') || 'iflow';

      if (scrolledNearTop && hasMoreMessages && !isLoadingMoreMessages && selectedSession && selectedProject && provider !== 'cursor') {
        // Save current scroll position
        const previousScrollHeight = container.scrollHeight;
        const previousScrollTop = container.scrollTop;

        // Load more messages
        const moreMessages = await loadSessionMessages(selectedProject.name, selectedSession.id, true);

        if (moreMessages.length > 0) {
          // Prepend new messages to the existing ones
          setSessionMessages(prev => [...moreMessages, ...prev]);

          // Restore scroll position after DOM update
          setTimeout(() => {
            if (scrollContainerRef.current && scrollContainerRef.current.scrollerRef?.current) {
              const scroller = scrollContainerRef.current.scrollerRef.current;
              const newScrollHeight = scroller.scrollHeight;
              const scrollDiff = newScrollHeight - previousScrollHeight;
              scroller.scrollTop = previousScrollTop + scrollDiff;
            }
          }, 0);
        }
      }
    }
  }, [isNearBottom, hasMoreMessages, isLoadingMoreMessages, selectedSession, selectedProject, loadSessionMessages]);

  useEffect(() => {
    // Load session messages when session changes
    const loadMessages = async () => {
      if (selectedSession && selectedProject) {
        const provider = localStorage.getItem('selected-provider') || 'iflow';

        // Mark that we're loading a session to prevent multiple scroll triggers
        isLoadingSessionRef.current = true;

        // Only reset state if the session ID actually changed (not initial load)
        const sessionChanged = currentSessionId !== null && currentSessionId !== selectedSession.id;

        if (sessionChanged) {
          // Reset pagination state when switching sessions
          setMessagesOffset(0);
          setHasMoreMessages(false);
          setTotalMessages(0);
          // Reset token budget when switching sessions
          // It will update when user sends a message and receives new budget from WebSocket
          setTokenBudget(null);
          // Reset loading state when switching sessions (unless the new session is processing)
          // The restore effect will set it back to true if needed
          setIsLoading(false);

          // Check if the session is currently processing on the backend
          if (ws && sendMessage) {
            sendMessage({
              type: 'check-session-status',
              sessionId: selectedSession.id,
              provider
            });
          }
        } else if (currentSessionId === null) {
          // Initial load - reset pagination but not token budget
          setMessagesOffset(0);
          setHasMoreMessages(false);
          setTotalMessages(0);

          // Check if the session is currently processing on the backend
          if (ws && sendMessage) {
            sendMessage({
              type: 'check-session-status',
              sessionId: selectedSession.id,
              provider
            });
          }
        }

        if (provider === 'cursor') {
          // For Cursor, set the session ID for resuming
          setCurrentSessionId(selectedSession.id);
          sessionStorage.setItem('cursorSessionId', selectedSession.id);

          // Only load messages from SQLite if this is NOT a system-initiated session change
          // For system-initiated changes, preserve existing messages
          if (!isSystemSessionChange) {
            // Load historical messages for Cursor session from SQLite
            const projectPath = selectedProject.fullPath || selectedProject.path;
            const converted = await loadCursorSessionMessages(projectPath, selectedSession.id);
            setSessionMessages([]);
            setChatMessages(converted);
          } else {
            // Reset the flag after handling system session change
            setIsSystemSessionChange(false);
          }
        } else {
          // For IFlow, load messages normally with pagination
          setCurrentSessionId(selectedSession.id);

          // Only load messages from API if this is a user-initiated session change
          // For system-initiated changes, preserve existing messages and rely on WebSocket
          if (!isSystemSessionChange) {
            const messages = await loadSessionMessages(selectedProject.name, selectedSession.id, false);
            setSessionMessages(messages);
            // convertedMessages will be automatically updated via useMemo
            // Scroll will be handled by the main scroll useEffect after messages are rendered
          } else {
            // Reset the flag after handling system session change
            setIsSystemSessionChange(false);
          }
        }
      } else {
        // Only clear messages if this is NOT a system-initiated session change AND we're not loading
        // During system session changes or while loading, preserve the chat messages
        if (!isSystemSessionChange && !isLoading) {
          setChatMessages([]);
          setSessionMessages([]);
        }
        setCurrentSessionId(null);
        sessionStorage.removeItem('cursorSessionId');
        setMessagesOffset(0);
        setHasMoreMessages(false);
        setTotalMessages(0);
      }

      // Mark loading as complete after messages are set
      // Use setTimeout to ensure state updates and DOM rendering are complete
      setTimeout(() => {
        isLoadingSessionRef.current = false;
      }, 250);
    };

    loadMessages();
  }, [selectedSession, selectedProject, loadCursorSessionMessages, scrollToBottom, isSystemSessionChange]);

  // External Message Update Handler: Reload messages when external CLI modifies current session
  // This triggers when App.jsx detects a JSONL file change for the currently-viewed session
  // Only reloads if the session is NOT active (respecting Session Protection System)
  useEffect(() => {
    if (externalMessageUpdate > 0 && selectedSession && selectedProject) {
      const reloadExternalMessages = async () => {
        try {
          const provider = localStorage.getItem('selected-provider') || 'iflow';

          if (provider === 'cursor') {
            // Reload Cursor messages from SQLite
            const projectPath = selectedProject.fullPath || selectedProject.path;
            const converted = await loadCursorSessionMessages(projectPath, selectedSession.id);
            setSessionMessages([]);
            setChatMessages(converted);
          } else {
            // Reload IFlow messages from API/JSONL
            const messages = await loadSessionMessages(selectedProject.name, selectedSession.id, false);
            setSessionMessages(messages);
            // convertedMessages will be automatically updated via useMemo

            // Smart scroll behavior: only auto-scroll if user is near bottom
            if (isNearBottom && autoScrollToBottom) {
              setTimeout(() => scrollToBottom(), 200);
            }
            // If user scrolled up, preserve their position (they're reading history)
          }
        } catch (error) {
          console.error('Error reloading messages from external update:', error);
        }
      };

      reloadExternalMessages();
    }
  }, [externalMessageUpdate, selectedSession, selectedProject, loadCursorSessionMessages, loadSessionMessages, isNearBottom, autoScrollToBottom, scrollToBottom]);

  // Update chatMessages when convertedMessages changes
  useEffect(() => {
    if (sessionMessages.length > 0) {
      setChatMessages(convertedMessages);
    }
  }, [convertedMessages, sessionMessages]);

  // Notify parent when input focus changes
  useEffect(() => {
    if (onInputFocusChange) {
      onInputFocusChange(isInputFocused);
    }
  }, [isInputFocused, onInputFocusChange]);

  // Persist input draft to IndexedDB
  useEffect(() => {
    if (selectedProject) {
      const sessionId = selectedProject.name;
      if (input !== '') {
        draftStorage.saveDraft(sessionId, input);
      } else {
        draftStorage.deleteDraft(sessionId);
      }
    }
  }, [input, selectedProject]);

  // Persist chat messages to IndexedDB
  useEffect(() => {
    if (selectedProject && chatMessages.length > 0) {
      const sessionId = selectedProject.name;
      chatStorage.saveMessages(sessionId, chatMessages);
    }
  }, [chatMessages, selectedProject]);

  // Load saved state when project changes (but don't interfere with session loading)
  useEffect(() => {
    if (selectedProject) {
      const sessionId = selectedProject.name;
      
      // Load from IndexedDB
      draftStorage.getDraft(sessionId).then(savedInput => {
        if (savedInput && savedInput !== input) {
          setInput(savedInput);
        }
      }).catch(error => {
        console.error('Error loading draft from IndexedDB:', error);
        // Fallback to localStorage
        const fallbackInput = safeLocalStorage.getItem(`draft_input_${sessionId}`) || '';
        if (fallbackInput !== input) {
          setInput(fallbackInput);
        }
      });
    }
  }, [selectedProject?.name]);

  // Track processing state: notify parent when isLoading becomes true
  // Note: onSessionNotProcessing is called directly in completion message handlers
  useEffect(() => {
    if (currentSessionId && isLoading && onSessionProcessing) {
      onSessionProcessing(currentSessionId);
    }
  }, [isLoading, currentSessionId, onSessionProcessing]);

  // Restore processing state when switching to a processing session
  useEffect(() => {
    if (currentSessionId && processingSessions) {
      const shouldBeProcessing = processingSessions.has(currentSessionId);
      if (shouldBeProcessing && !isLoading) {
        setIsLoading(true);
        setCanAbortSession(true); // Assume processing sessions can be aborted
      }
    }
  }, [currentSessionId, processingSessions]);

  // Sync WebSocket connection state with local state for UI display
  const { ws: wsFromContext, isConnected, messages: wsMessages } = useWebSocketContext();
  useEffect(() => {
    if (wsFromContext) {
      const updateConnectionState = () => {
        if (wsFromContext.readyState === WebSocket.OPEN) {
          setConnectionState('connected');
        } else if (wsFromContext.readyState === WebSocket.CONNECTING) {
          setConnectionState('connecting');
        } else if (wsFromContext.readyState === WebSocket.CLOSED) {
          setConnectionState('closed');
        }
      };

      // Initial state
      updateConnectionState();

      // Listen for state changes
      wsFromContext.addEventListener('open', () => setConnectionState('connected'));
      wsFromContext.addEventListener('close', () => {
        setConnectionState('disconnected');
        setLastHeartbeat(null);
      });
      wsFromContext.addEventListener('error', () => setConnectionState('error'));

      // Listen for heartbeat messages
      const handleHeartbeat = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'heartbeat') {
            setLastHeartbeat(Date.now());
            if (connectionState !== 'connected') {
              setConnectionState('connected');
            }
          }
        } catch (e) {
          // Not a JSON message, ignore
        }
      };
      wsFromContext.addEventListener('message', handleHeartbeat);

      return () => {
        wsFromContext.removeEventListener('open', updateConnectionState);
        wsFromContext.removeEventListener('close', updateConnectionState);
        wsFromContext.removeEventListener('error', updateConnectionState);
        wsFromContext.removeEventListener('message', handleHeartbeat);
      };
    }
  }, [wsFromContext]);

  // Handle reconnect
  const handleReconnect = useCallback(() => {
    if (ws && ws.readyState !== WebSocket.OPEN) {
      setConnectionState('connecting');
      setReconnectAttempts(prev => prev + 1);
      // The actual reconnection will be handled by the useWebSocket hook
      // We just trigger a reconnection attempt by closing and letting the hook reconnect
      ws.close();
    }
  }, [ws]);

  useEffect(() => {
    // Handle WebSocket messages
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];

      // Filter messages by session ID to prevent cross-session interference
      // Skip filtering for global messages that apply to all sessions
      const globalMessageTypes = ['projects_updated', 'taskmaster-project-updated', 'session-created', 'iflow-complete'];
      const isGlobalMessage = globalMessageTypes.includes(latestMessage.type);

      // For new sessions (currentSessionId is null), allow messages through
      if (!isGlobalMessage && latestMessage.sessionId && currentSessionId && latestMessage.sessionId !== currentSessionId) {
        // Message is for a different session, ignore it
        console.log('⏭️ Skipping message for different session:', latestMessage.sessionId, 'current:', currentSessionId);
        return;
      }

      switch (latestMessage.type) {
        case 'session-created':
          // New session created by IFlow CLI - we receive the real session ID here
          // Store it temporarily until conversation completes (prevents premature session association)
          if (latestMessage.sessionId && !currentSessionId) {
            sessionStorage.setItem('pendingSessionId', latestMessage.sessionId);

            // Session Protection: Replace temporary "new-session-*" identifier with real session ID
            // This maintains protection continuity - no gap between temp ID and real ID
            // The temporary session is removed and real session is marked as active
            if (onReplaceTemporarySession) {
              onReplaceTemporarySession(latestMessage.sessionId);
            }
          }
          break;

        case 'token-budget':
          // Token budget now fetched via API after message completion instead of WebSocket
          // This case is kept for compatibility but does nothing
          break;

        case 'iflow-response':
          const messageData = latestMessage.data.message || latestMessage.data;

          // Handle Cursor streaming format (content_block_delta / content_block_stop)
          if (messageData && typeof messageData === 'object' && messageData.type) {
            if (messageData.type === 'content_block_delta' && messageData.delta?.text) {
              // Decode HTML entities and buffer deltas
              const decodedText = decodeHtmlEntities(messageData.delta.text);
              streamBufferRef.current += decodedText;
              if (!streamTimerRef.current) {
                streamTimerRef.current = setTimeout(() => {
                  const chunk = streamBufferRef.current;
                  streamBufferRef.current = '';
                  streamTimerRef.current = null;
                  if (!chunk) return;
                  setChatMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.type === 'assistant' && !last.isToolUse && last.isStreaming) {
                      last.content = (last.content || '') + chunk;
                    } else {
                      updated.push({ type: 'assistant', content: chunk, timestamp: new Date(), isStreaming: true });
                    }
                    return updated;
                  });
                }, 100);
              }
              return;
            }
            if (messageData.type === 'content_block_stop') {
              // Flush any buffered text and mark streaming message complete
              if (streamTimerRef.current) {
                clearTimeout(streamTimerRef.current);
                streamTimerRef.current = null;
              }
              const chunk = streamBufferRef.current;
              streamBufferRef.current = '';
              if (chunk) {
                setChatMessages(prev => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.type === 'assistant' && !last.isToolUse && last.isStreaming) {
                    last.content = (last.content || '') + chunk;
                  } else {
                    updated.push({ type: 'assistant', content: chunk, timestamp: new Date(), isStreaming: true });
                  }
                  return updated;
                });
              }
              setChatMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.type === 'assistant' && last.isStreaming) {
                  last.isStreaming = false;
                }
                return updated;
              });
              return;
            }
          }

          // Handle IFlow CLI session duplication bug workaround:
          // When resuming a session, IFlow CLI creates a new session instead of resuming.
          // We detect this by checking for system/init messages with session_id that differs
          // from our current session. When found, we need to switch the user to the new session.
          // This works exactly like new session detection - preserve messages during navigation.
          if (latestMessage.data.type === 'system' &&
            latestMessage.data.subtype === 'init' &&
            latestMessage.data.session_id &&
            currentSessionId &&
            latestMessage.data.session_id !== currentSessionId) {

            console.log('🔄 IFlow CLI session duplication detected:', {
              originalSession: currentSessionId,
              newSession: latestMessage.data.session_id
            });

            // Mark this as a system-initiated session change to preserve messages
            // This works exactly like new session init - messages stay visible during navigation
            setIsSystemSessionChange(true);

            // Switch to the new session using React Router navigation
            // This triggers the session loading logic in App.jsx without a page reload
            if (onNavigateToSession) {
              onNavigateToSession(latestMessage.data.session_id);
            }
            return; // Don't process the message further, let the navigation handle it
          }

          // Handle system/init for new sessions (when currentSessionId is null)
          if (latestMessage.data.type === 'system' &&
            latestMessage.data.subtype === 'init' &&
            latestMessage.data.session_id &&
            !currentSessionId) {

            console.log('🔄 New session init detected:', {
              newSession: latestMessage.data.session_id
            });

            // Mark this as a system-initiated session change to preserve messages
            setIsSystemSessionChange(true);

            // Switch to the new session
            if (onNavigateToSession) {
              onNavigateToSession(latestMessage.data.session_id);
            }
            return; // Don't process the message further, let the navigation handle it
          }

          // For system/init messages that match current session, just ignore them
          if (latestMessage.data.type === 'system' &&
            latestMessage.data.subtype === 'init' &&
            latestMessage.data.session_id &&
            currentSessionId &&
            latestMessage.data.session_id === currentSessionId) {
            console.log('🔄 System init message for current session, ignoring');
            return; // Don't process the message further
          }

          // Handle different types of content in the response
          if (Array.isArray(messageData.content)) {
            for (const part of messageData.content) {
              if (part.type === 'tool_use') {
                // Add tool use message
                const toolInput = part.input ? JSON.stringify(part.input, null, 2) : '';
                setChatMessages(prev => [...prev, {
                  type: 'assistant',
                  content: '',
                  timestamp: new Date(),
                  isToolUse: true,
                  toolName: part.name,
                  toolInput: toolInput,
                  toolId: part.id,
                  toolResult: null // Will be updated when result comes in
                }]);
              } else if (part.type === 'text' && part.text?.trim()) {
                // Decode HTML entities and normalize usage limit message to local time
                let content = decodeHtmlEntities(part.text);
                content = formatUsageLimitText(content);

                // Add regular text message
                setChatMessages(prev => [...prev, {
                  type: 'assistant',
                  content: content,
                  timestamp: new Date()
                }]);
              }
            }
          } else if (typeof messageData.content === 'string' && messageData.content.trim()) {
            // Decode HTML entities and normalize usage limit message to local time
            let content = decodeHtmlEntities(messageData.content);
            content = formatUsageLimitText(content);

            // Add regular text message
            setChatMessages(prev => [...prev, {
              type: 'assistant',
              content: content,
              timestamp: new Date()
            }]);
          }

          // Handle tool results from user messages (these come separately)
          if (messageData.role === 'user' && Array.isArray(messageData.content)) {
            for (const part of messageData.content) {
              if (part.type === 'tool_result') {
                // Find the corresponding tool use and update it with the result
                setChatMessages(prev => prev.map(msg => {
                  if (msg.isToolUse && msg.toolId === part.tool_use_id) {
                    return {
                      ...msg,
                      toolResult: {
                        content: part.content,
                        isError: part.is_error,
                        timestamp: new Date()
                      }
                    };
                  }
                  return msg;
                }));
              }
            }
          }
          break;

        case 'iflow-output':
          {
            const cleaned = String(latestMessage.data || '');
            if (cleaned.trim()) {
              streamBufferRef.current += (streamBufferRef.current ? `\n${cleaned}` : cleaned);
              if (!streamTimerRef.current) {
                streamTimerRef.current = setTimeout(() => {
                  const chunk = streamBufferRef.current;
                  streamBufferRef.current = '';
                  streamTimerRef.current = null;
                  if (!chunk) return;
                  setChatMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.type === 'assistant' && !last.isToolUse && last.isStreaming) {
                      last.content = last.content ? `${last.content}\n${chunk}` : chunk;
                    } else {
                      updated.push({ type: 'assistant', content: chunk, timestamp: new Date(), isStreaming: true });
                    }
                    return updated;
                  });
                }, 100);
              }
            }
          }
          break;
        case 'iflow-interactive-prompt':
          // Handle interactive prompts from CLI
          setChatMessages(prev => [...prev, {
            type: 'assistant',
            content: latestMessage.data,
            timestamp: new Date(),
            isInteractivePrompt: true
          }]);
          break;

        case 'iflow-error':
          setChatMessages(prev => [...prev, {
            type: 'error',
            content: `Error: ${latestMessage.error}`,
            timestamp: new Date()
          }]);
          break;

        case 'cursor-system':
          // Handle Cursor system/init messages similar to IFlow
          try {
            const cdata = latestMessage.data;
            if (cdata && cdata.type === 'system' && cdata.subtype === 'init' && cdata.session_id) {
              // If we already have a session and this differs, switch (duplication/redirect)
              if (currentSessionId && cdata.session_id !== currentSessionId) {
                console.log('🔄 Cursor session switch detected:', { originalSession: currentSessionId, newSession: cdata.session_id });
                setIsSystemSessionChange(true);
                if (onNavigateToSession) {
                  onNavigateToSession(cdata.session_id);
                }
                return;
              }
              // If we don't yet have a session, adopt this one
              if (!currentSessionId) {
                console.log('🔄 Cursor new session init detected:', { newSession: cdata.session_id });
                setIsSystemSessionChange(true);
                if (onNavigateToSession) {
                  onNavigateToSession(cdata.session_id);
                }
                return;
              }
            }
            // For other cursor-system messages, avoid dumping raw objects to chat
          } catch (e) {
            console.warn('Error handling cursor-system message:', e);
          }
          break;

        case 'cursor-user':
          // Handle Cursor user messages (usually echoes)
          // Don't add user messages as they're already shown from input
          break;

        case 'cursor-tool-use':
          // Handle Cursor tool use messages
          setChatMessages(prev => [...prev, {
            type: 'assistant',
            content: `Using tool: ${latestMessage.tool} ${latestMessage.input ? `with ${latestMessage.input}` : ''}`,
            timestamp: new Date(),
            isToolUse: true,
            toolName: latestMessage.tool,
            toolInput: latestMessage.input
          }]);
          break;

        case 'cursor-error':
          // Show Cursor errors as error messages in chat
          setChatMessages(prev => [...prev, {
            type: 'error',
            content: `Cursor error: ${latestMessage.error || 'Unknown error'}`,
            timestamp: new Date()
          }]);
          break;

        case 'cursor-result':
          // Get session ID from message or fall back to current session
          const cursorCompletedSessionId = latestMessage.sessionId || currentSessionId;

          // Only update UI state if this is the current session
          if (cursorCompletedSessionId === currentSessionId) {
            setIsLoading(false);
            setCanAbortSession(false);
            setIflowStatus(null);
          }

          // Always mark the completed session as inactive and not processing
          if (cursorCompletedSessionId) {
            if (onSessionInactive) {
              onSessionInactive(cursorCompletedSessionId);
            }
            if (onSessionNotProcessing) {
              onSessionNotProcessing(cursorCompletedSessionId);
            }
          }

          // Only process result for current session
          if (cursorCompletedSessionId === currentSessionId) {
            try {
              const r = latestMessage.data || {};
              const textResult = typeof r.result === 'string' ? r.result : '';
              // Flush buffered deltas before finalizing
              if (streamTimerRef.current) {
                clearTimeout(streamTimerRef.current);
                streamTimerRef.current = null;
              }
              const pendingChunk = streamBufferRef.current;
              streamBufferRef.current = '';

              setChatMessages(prev => {
                const updated = [...prev];
                // Try to consolidate into the last streaming assistant message
                const last = updated[updated.length - 1];
                if (last && last.type === 'assistant' && !last.isToolUse && last.isStreaming) {
                  // Replace streaming content with the final content so deltas don't remain
                  const finalContent = textResult && textResult.trim() ? textResult : (last.content || '') + (pendingChunk || '');
                  last.content = finalContent;
                  last.isStreaming = false;
                } else if (textResult && textResult.trim()) {
                  updated.push({ type: r.is_error ? 'error' : 'assistant', content: textResult, timestamp: new Date(), isStreaming: false });
                }
                return updated;
              });
            } catch (e) {
              console.warn('Error handling cursor-result message:', e);
            }
          }

          // Store session ID for future use and trigger refresh (for new sessions)
          const pendingCursorSessionId = sessionStorage.getItem('pendingSessionId');
          if (cursorCompletedSessionId && !currentSessionId && cursorCompletedSessionId === pendingCursorSessionId) {
            setCurrentSessionId(cursorCompletedSessionId);
            sessionStorage.removeItem('pendingSessionId');

            // Trigger a project refresh to update the sidebar with the new session
            if (window.refreshProjects) {
              setTimeout(() => window.refreshProjects(), 500);
            }
          }
          break;

        case 'cursor-output':
          // Handle Cursor raw terminal output; strip ANSI and ignore empty control-only payloads
          try {
            const raw = String(latestMessage.data ?? '');
            const cleaned = raw.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
            if (cleaned) {
              streamBufferRef.current += (streamBufferRef.current ? `\n${cleaned}` : cleaned);
              if (!streamTimerRef.current) {
                streamTimerRef.current = setTimeout(() => {
                  const chunk = streamBufferRef.current;
                  streamBufferRef.current = '';
                  streamTimerRef.current = null;
                  if (!chunk) return;
                  setChatMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.type === 'assistant' && !last.isToolUse && last.isStreaming) {
                      last.content = last.content ? `${last.content}\n${chunk}` : chunk;
                    } else {
                      updated.push({ type: 'assistant', content: chunk, timestamp: new Date(), isStreaming: true });
                    }
                    return updated;
                  });
                }, 100);
              }
            }
          } catch (e) {
            console.warn('Error handling cursor-output message:', e);
          }
          break;

        case 'iflow-complete':
          // Get session ID from message or fall back to current session
          const completedSessionId = latestMessage.sessionId || currentSessionId || sessionStorage.getItem('pendingSessionId');

          // Update UI state if this is the current session OR if we don't have a session ID yet (new session)
          if (completedSessionId === currentSessionId || !currentSessionId) {
            setIsLoading(false);
            setCanAbortSession(false);
            setIflowStatus(null);

            // Fetch updated token usage after message completes
            if (selectedProject && selectedSession?.id) {
              const fetchUpdatedTokenUsage = async () => {
                try {
                  const url = `/api/projects/${selectedProject.name}/sessions/${selectedSession.id}/token-usage`;
                  const response = await authenticatedFetch(url);
                  if (response.ok) {
                    const data = await response.json();
                    setTokenBudget(data);
                  }
                } catch (error) {
                  console.error('Failed to fetch updated token usage:', error);
                }
              };
              fetchUpdatedTokenUsage();
            }
          }

          // Always mark the completed session as inactive and not processing
          if (completedSessionId) {
            if (onSessionInactive) {
              onSessionInactive(completedSessionId);
            }
            if (onSessionNotProcessing) {
              onSessionNotProcessing(completedSessionId);
            }
          }

          // If we have a pending session ID and the conversation completed successfully, use it
          const pendingSessionId = sessionStorage.getItem('pendingSessionId');
          if (pendingSessionId && !currentSessionId && latestMessage.exitCode === 0) {
            setCurrentSessionId(pendingSessionId);
            sessionStorage.removeItem('pendingSessionId');

            // No need to manually refresh - projects_updated WebSocket message will handle it
            console.log('✅ New session complete, ID set to:', pendingSessionId);
          }

          // Clear persisted chat messages after successful completion
          if (selectedProject && latestMessage.exitCode === 0) {
            safeLocalStorage.removeItem(`chat_messages_${selectedProject.name}`);
          }
          break;

        case 'session-aborted': {
          // Get session ID from message or fall back to current session
          const abortedSessionId = latestMessage.sessionId || currentSessionId;

          // Only update UI state if this is the current session
          if (abortedSessionId === currentSessionId) {
            setIsLoading(false);
            setCanAbortSession(false);
            setIflowStatus(null);
          }

          // Always mark the aborted session as inactive and not processing
          if (abortedSessionId) {
            if (onSessionInactive) {
              onSessionInactive(abortedSessionId);
            }
            if (onSessionNotProcessing) {
              onSessionNotProcessing(abortedSessionId);
            }
          }

          setChatMessages(prev => [...prev, {
            type: 'assistant',
            content: 'Session interrupted by user.',
            timestamp: new Date()
          }]);
          break;
        }

        case 'session-status': {
          const statusSessionId = latestMessage.sessionId;
          const isCurrentSession = statusSessionId === currentSessionId ||
            (selectedSession && statusSessionId === selectedSession.id);
          if (isCurrentSession && latestMessage.isProcessing) {
            // Session is currently processing, restore UI state
            setIsLoading(true);
            setCanAbortSession(true);
            if (onSessionProcessing) {
              onSessionProcessing(statusSessionId);
            }
          }
          break;
        }

        case 'iflow-status':
          // Handle IFlow working status messages
          const statusData = latestMessage.data;
          if (statusData) {
            // Parse the status message to extract relevant information
            let statusInfo = {
              text: 'Working...',
              tokens: 0,
              can_interrupt: true
            };

            // Check for different status message formats
            if (statusData.message) {
              statusInfo.text = statusData.message;
            } else if (statusData.status) {
              statusInfo.text = statusData.status;
            } else if (typeof statusData === 'string') {
              statusInfo.text = statusData;
            }

            // Extract token count
            if (statusData.tokens) {
              statusInfo.tokens = statusData.tokens;
            } else if (statusData.token_count) {
              statusInfo.tokens = statusData.token_count;
            }

            // Check if can interrupt
            if (statusData.can_interrupt !== undefined) {
              statusInfo.can_interrupt = statusData.can_interrupt;
            }

            setIflowStatus(statusInfo);
            setIsLoading(true);
            setCanAbortSession(statusInfo.can_interrupt);
          }
          break;

      }
    }
  }, [messages]);

  // Load file list when project changes
  useEffect(() => {
    if (selectedProject) {
      fetchProjectFiles();
    }
  }, [selectedProject]);

  const fetchProjectFiles = async () => {
    try {
      const response = await api.getFiles(selectedProject.name);
      if (response.ok) {
        const files = await response.json();
        // Flatten the file tree to get all file paths
        const flatFiles = flattenFileTree(files);
        setFileList(flatFiles);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  const flattenFileTree = (files, basePath = '') => {
    let result = [];
    for (const file of files) {
      const fullPath = basePath ? `${basePath}/${file.name}` : file.name;
      if (file.type === 'directory' && file.children) {
        result = result.concat(flattenFileTree(file.children, fullPath));
      } else if (file.type === 'file') {
        result.push({
          name: file.name,
          path: fullPath,
          relativePath: file.path
        });
      }
    }
    return result;
  };

  // Handle @ symbol detection and file filtering
  useEffect(() => {
    const textBeforeCursor = input.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if there's a space after the @ symbol (which would end the file reference)
      if (!textAfterAt.includes(' ')) {
        setAtSymbolPosition(lastAtIndex);
        setShowFileDropdown(true);

        // Filter files based on the text after @
        const filtered = fileList.filter(file =>
          file.name.toLowerCase().includes(textAfterAt.toLowerCase()) ||
          file.path.toLowerCase().includes(textAfterAt.toLowerCase())
        ).slice(0, 10); // Limit to 10 results

        setFilteredFiles(filtered);
        setSelectedFileIndex(-1);
      } else {
        setShowFileDropdown(false);
        setAtSymbolPosition(-1);
      }
    } else {
      setShowFileDropdown(false);
      setAtSymbolPosition(-1);
    }
  }, [input, cursorPosition, fileList]);

  // Debounced input handling
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInput(input);
    }, 150); // 150ms debounce

    return () => clearTimeout(timer);
  }, [input]);

  // Show only recent messages for better performance
  const visibleMessages = useMemo(() => {
    if (chatMessages.length <= visibleMessageCount) {
      return chatMessages;
    }
    return chatMessages.slice(-visibleMessageCount);
  }, [chatMessages, visibleMessageCount]);

  // Capture scroll position before render when auto-scroll is disabled
  useEffect(() => {
    if (!autoScrollToBottom && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      scrollPositionRef.current = {
        height: container.scrollHeight,
        top: container.scrollTop
      };
    }
  });

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollContainerRef.current && chatMessages.length > 0) {
      if (autoScrollToBottom) {
        // If auto-scroll is enabled, always scroll to bottom unless user has manually scrolled up
        if (!isUserScrolledUp) {
          setTimeout(() => scrollToBottom(), 50); // Small delay to ensure DOM is updated
        }
      } else {
        // When auto-scroll is disabled, preserve the visual position
        const container = scrollContainerRef.current;
        const prevHeight = scrollPositionRef.current.height;
        const prevTop = scrollPositionRef.current.top;
        const newHeight = container.scrollHeight;
        const heightDiff = newHeight - prevHeight;

        // If content was added above the current view, adjust scroll position
        if (heightDiff > 0 && prevTop > 0) {
          container.scrollTop = prevTop + heightDiff;
        }
      }
    }
  }, [chatMessages.length, isUserScrolledUp, scrollToBottom, autoScrollToBottom]);

  // Scroll to bottom when messages first load after session switch
  useEffect(() => {
    if (scrollContainerRef.current && chatMessages.length > 0 && !isLoadingSessionRef.current) {
      // Only scroll if we're not in the middle of loading a session
      // This prevents the "double scroll" effect during session switching
      // Reset scroll state when switching sessions
      setIsUserScrolledUp(false);
      setTimeout(() => {
        scrollToBottom();
        // After scrolling, the scroll event handler will naturally set isUserScrolledUp based on position
      }, 200); // Delay to ensure full rendering
    }
  }, [selectedSession?.id, selectedProject?.name]); // Only trigger when session/project changes

  // Add scroll event listener to detect user scrolling
  useEffect(() => {
    const virtuoso = scrollContainerRef.current;
    if (virtuoso) {
      // Virtuoso provides a different API for scroll events
      // We'll use the scrollerRef to access the underlying scroll container
      const scrollerRef = virtuoso.scrollerRef?.current;
      if (scrollerRef) {
        scrollerRef.addEventListener('scroll', handleScroll);
        return () => scrollerRef.removeEventListener('scroll', handleScroll);
      }
    }
  }, [handleScroll]);

  // Initial textarea setup - set to 2 rows height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';

      // Check if initially expanded
      const lineHeight = parseInt(window.getComputedStyle(textareaRef.current).lineHeight);
      const isExpanded = textareaRef.current.scrollHeight > lineHeight * 2;
      setIsTextareaExpanded(isExpanded);
    }
  }, []); // Only run once on mount

  // Reset textarea height when input is cleared programmatically
  useEffect(() => {
    if (textareaRef.current && !input.trim()) {
      textareaRef.current.style.height = 'auto';
      setIsTextareaExpanded(false);
    }
  }, [input]);

  // Load token usage when session changes (but don't poll to avoid conflicts with WebSocket)
  useEffect(() => {
    if (!selectedProject || !selectedSession?.id || selectedSession.id.startsWith('new-session-')) {
      // Reset for new/empty sessions
      setTokenBudget(null);
      return;
    }

    // Fetch token usage once when session loads
    const fetchInitialTokenUsage = async () => {
      try {
        const url = `/api/projects/${selectedProject.name}/sessions/${selectedSession.id}/token-usage`;

        const response = await authenticatedFetch(url);

        if (response.ok) {
          const data = await response.json();
          setTokenBudget(data);
        } else {
          setTokenBudget(null);
        }
      } catch (error) {
        console.error('Failed to fetch initial token usage:', error);
      }
    };

    fetchInitialTokenUsage();
  }, [selectedSession?.id, selectedProject?.path]);

  const handleTranscript = useCallback((text) => {
    if (text.trim()) {
      setInput(prevInput => {
        const newInput = prevInput.trim() ? `${prevInput} ${text}` : text;

        // Update textarea height after setting new content
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';

            // Check if expanded after transcript
            const lineHeight = parseInt(window.getComputedStyle(textareaRef.current).lineHeight);
            const isExpanded = textareaRef.current.scrollHeight > lineHeight * 2;
            setIsTextareaExpanded(isExpanded);
          }
        }, 0);

        return newInput;
      });
    }
  }, []);

  // Load earlier messages by increasing the visible message count
  const loadEarlierMessages = useCallback(() => {
    setVisibleMessageCount(prevCount => prevCount + 100);
  }, []);

  // Handle image files from drag & drop or file picker
  const handleImageFiles = useCallback((files) => {
    const validFiles = files.filter(file => {
      try {
        // Validate file object and properties
        if (!file || typeof file !== 'object') {
          console.warn('Invalid file object:', file);
          return false;
        }

        if (!file.type || !file.type.startsWith('image/')) {
          return false;
        }

        if (!file.size || file.size > 5 * 1024 * 1024) {
          // Safely get file name with fallback
          const fileName = file.name || 'Unknown file';
          setImageErrors(prev => {
            const newMap = new Map(prev);
            newMap.set(fileName, 'File too large (max 5MB)');
            return newMap;
          });
          return false;
        }

        return true;
      } catch (error) {
        console.error('Error validating file:', error, file);
        return false;
      }
    });

    if (validFiles.length > 0) {
      setAttachedImages(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 images
    }
  }, []);

  // Handle clipboard paste for images
  const handlePaste = useCallback(async (e) => {
    const items = Array.from(e.clipboardData.items);

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          handleImageFiles([file]);
        }
      }
    }

    // Fallback for some browsers/platforms
    if (items.length === 0 && e.clipboardData.files.length > 0) {
      const files = Array.from(e.clipboardData.files);
      const imageFiles = files.filter(f => f.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        handleImageFiles(imageFiles);
      }
    }
  }, [handleImageFiles]);

  // Setup dropzone
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
    onDrop: handleImageFiles,
    noClick: true, // We'll use our own button
    noKeyboard: true
  });

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !selectedProject) return;

    // Upload images first if any
    let uploadedImages = [];
    if (attachedImages.length > 0) {
      const formData = new FormData();
      attachedImages.forEach(file => {
        formData.append('images', file);
      });

      try {
        const response = await authenticatedFetch(`/api/projects/${selectedProject.name}/upload-images`, {
          method: 'POST',
          headers: {}, // Let browser set Content-Type for FormData
          body: formData
        });

        if (!response.ok) {
          throw new Error('Failed to upload images');
        }

        const result = await response.json();
        uploadedImages = result.images;
      } catch (error) {
        console.error('Image upload failed:', error);
        setChatMessages(prev => [...prev, {
          type: 'error',
          content: `Failed to upload images: ${error.message}`,
          timestamp: new Date()
        }]);
        return;
      }
    }

    const userMessage = {
      type: 'user',
      content: input,
      images: uploadedImages,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setCanAbortSession(true);
    // Set a default status when starting
    setIflowStatus({
      text: 'Processing',
      tokens: 0,
      can_interrupt: true
    });

    // Always scroll to bottom when user sends a message and reset scroll state
    setIsUserScrolledUp(false); // Reset scroll state so auto-scroll works for IFlow's response
    setTimeout(() => scrollToBottom(), 100); // Longer delay to ensure message is rendered

    // Determine effective session id for replies to avoid race on state updates
    const effectiveSessionId = currentSessionId || selectedSession?.id || sessionStorage.getItem('cursorSessionId');

    // Session Protection: Mark session as active to prevent automatic project updates during conversation
    // Use existing session if available; otherwise a temporary placeholder until backend provides real ID
    const sessionToActivate = effectiveSessionId || `new-session-${Date.now()}`;
    if (onSessionActive) {
      onSessionActive(sessionToActivate);
    }

    // Get tools settings from localStorage based on provider
    const getToolsSettings = () => {
      try {
        const settingsKey = provider === 'cursor' ? 'cursor-tools-settings' : 'iflow-settings';
        const savedSettings = safeLocalStorage.getItem(settingsKey);
        if (savedSettings) {
          return JSON.parse(savedSettings);
        }
      } catch (error) {
        console.error('Error loading tools settings:', error);
      }
      return {
        allowedTools: [],
        disallowedTools: [],
        skipPermissions: false
      };
    };

    const toolsSettings = getToolsSettings();

    // --- MODIFIED FOR IFLOW AGENT ---
    // Start with an empty assistant message
    setChatMessages(prev => [...prev, {
      type: 'assistant',
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }]);

    try {
      // Get the current project path (CWD)
      const cwd = selectedProject?.fullPath || selectedProject?.path || '';
      // Get or generate session ID
      const sessionId = selectedSession?.id || `session-${Date.now()}`;
      const projectName = selectedProject?.name || 'default';

      // Determine model based on provider
      // Always read from localStorage to get the latest selection
      const currentCursorModel = localStorage.getItem('cursor-model') || 'gpt-5';
      const currentIFlowModel = localStorage.getItem('iflow-model') || 'GLM-4.7';
      const targetModel = provider === 'cursor' ? currentCursorModel : currentIFlowModel;

      // Use relative path - Vite proxy handles the rest
      const streamUrl = `/stream?message=${encodeURIComponent(input)}&cwd=${encodeURIComponent(cwd)}&sessionId=${encodeURIComponent(sessionId)}&project=${encodeURIComponent(projectName)}&persona=${encodeURIComponent(aiPersona || 'partner')}&model=${encodeURIComponent(targetModel)}`;

      // Create new AbortController
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const response = await fetch(streamUrl, {
        signal: abortController.signal
      });
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let partialData = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        partialData += chunk;

        // Process SSE data: lines starting with "data: "
        const lines = partialData.split('\n');
        // Keep the last partial line
        partialData = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.replace('data: ', '').trim();
              if (!jsonStr) continue;
              const data = JSON.parse(jsonStr);

              if (data.type === 'content') {
                setChatMessages(prev => {
                  const lastMsg = prev[prev.length - 1];
                  const isAssistant = lastMsg && (
                    lastMsg.role === 'assistant' ||
                    lastMsg.type === 'assistant' ||
                    lastMsg.role === 'iflow' ||
                    lastMsg.type === 'iflow'
                  ) && !lastMsg.isToolUse;

                  if (isAssistant) {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1] = { ...lastMsg, content: (lastMsg.content || '') + data.content };
                    return newHistory;
                  } else {
                    return [...prev, {
                      role: 'assistant',
                      type: 'assistant',
                      content: data.content,
                      timestamp: new Date()
                    }];
                  }
                });
              } else if (data.type === 'tool_start') {
                // 工具开始执行 - 添加工具卡片
                setChatMessages(prev => [...prev, {
                  type: 'assistant',
                  isToolUse: true,
                  toolName: data.tool_name,
                  toolType: data.tool_type,
                  toolLabel: data.label,
                  toolStatus: 'running',
                  agentInfo: data.agent_info,
                  timestamp: new Date()
                }]);
              } else if (data.type === 'tool_end') {
                // 工具执行完成 - 更新工具卡片状态
                setChatMessages(prev => {
                  const newHistory = [...prev];
                  // 找到最后一个匹配的工具卡片
                  for (let i = newHistory.length - 1; i >= 0; i--) {
                    if (newHistory[i].isToolUse && newHistory[i].toolName === data.tool_name && newHistory[i].toolStatus === 'running') {
                      newHistory[i] = { ...newHistory[i], toolStatus: data.status, agentInfo: data.agent_info };
                      break;
                    }
                  }
                  return newHistory;
                });
              } else if (data.type === 'plan') {
                // 任务计划 - 添加计划消息
                setChatMessages(prev => [...prev, {
                  type: 'plan',
                  entries: data.entries || [],
                  timestamp: new Date()
                }]);
              } else if (data.type === 'status') {
                setIflowStatus({ text: data.content, tokens: 0, can_interrupt: true });
              } else if (data.type === 'error') {
                setChatMessages(prev => [...prev, {
                  type: 'error',
                  content: data.content,
                  timestamp: new Date()
                }]);
              } else if (data.type === 'done') {
                setIflowStatus(null);
                // 处理任务完成原因
                if (data.stop_reason) {
                  console.log(`Task finished with reason: ${data.stop_reason}`);
                }
              }
            } catch (e) {
              console.error("Error parsing SSE chunk:", e, line);
            }
          }
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        console.log('Stream request aborted by user');
        setChatMessages(prev => [...prev, { type: 'assistant', content: '\n\n*(已停止生成)*', timestamp: new Date() }]);
      } else {
        console.error("Agent Error:", e);
        setChatMessages(prev => [...prev, { type: 'error', content: "Failed to connect to Agent: " + e.toString(), timestamp: new Date() }]);
      }
    } finally {
      setIsLoading(false);
      setCanAbortSession(false);
      abortControllerRef.current = null;
      if (onSessionInactive) onSessionInactive(currentSessionId);
    }

    /*
    // Send command based on provider
    if (provider === 'cursor') {
      // Send Cursor command (always use cursor-command; include resume/sessionId when replying)
      sendMessage({
        type: 'cursor-command',
        command: input,
        sessionId: effectiveSessionId,
        options: {
          // Prefer fullPath (actual cwd for project), fallback to path
          cwd: selectedProject.fullPath || selectedProject.path,
          projectPath: selectedProject.fullPath || selectedProject.path,
          sessionId: effectiveSessionId,
          resume: !!effectiveSessionId,
          model: cursorModel,
          skipPermissions: toolsSettings?.skipPermissions || false,
          toolsSettings: toolsSettings
        }
      });
    } else {
      // Send IFlow command (existing code)
      sendMessage({
        type: 'iflow-command',
        command: input,
        options: {
          projectPath: selectedProject.path,
          cwd: selectedProject.fullPath,
          sessionId: currentSessionId,
          resume: !!currentSessionId,
          toolsSettings: toolsSettings,
          permissionMode: permissionMode,
          model: iflowModel,
          images: uploadedImages // Pass images to backend
        }
      });
    }
    */

    setInput('');
    setAttachedImages([]);
    setUploadingImages(new Map());
    setImageErrors(new Map());
    setIsTextareaExpanded(false);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Clear the saved draft since message was sent
    if (selectedProject) {
      safeLocalStorage.removeItem(`draft_input_${selectedProject.name}`);
    }
  }, [input, isLoading, selectedProject, attachedImages, currentSessionId, selectedSession, provider, permissionMode, onSessionActive, cursorModel, iflowModel, sendMessage, setInput, setAttachedImages, setUploadingImages, setImageErrors, setIsTextareaExpanded, textareaRef, setChatMessages, setIsLoading, setCanAbortSession, setIflowStatus, setIsUserScrolledUp, scrollToBottom]);

  // Store handleSubmit in ref so handleCustomCommand can access it
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  const selectCommand = (command) => {
    if (!command) return;

    // Prepare the input with command name and any arguments that were already typed
    const textBeforeSlash = input.slice(0, slashPosition);
    const textAfterSlash = input.slice(slashPosition);
    const spaceIndex = textAfterSlash.indexOf(' ');
    const textAfterQuery = spaceIndex !== -1 ? textAfterSlash.slice(spaceIndex) : '';

    const newInput = textBeforeSlash + command.name + ' ' + textAfterQuery;

    // Update input temporarily so executeCommand can parse arguments
    setInput(newInput);

    // Hide command menu
    setShowCommandMenu(false);
    setSlashPosition(-1);
    setCommandQuery('');
    setSelectedCommandIndex(-1);

    // Clear debounce timer
    if (commandQueryTimerRef.current) {
      clearTimeout(commandQueryTimerRef.current);
    }

    // Execute the command (which will load its content and send to IFlow)
    executeCommand(command);
  };

  const handleKeyDown = (e) => {
    // Handle command menu navigation
    if (showCommandMenu && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex(prev =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex(prev =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        if (selectedCommandIndex >= 0) {
          selectCommand(filteredCommands[selectedCommandIndex]);
        } else if (filteredCommands.length > 0) {
          selectCommand(filteredCommands[0]);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommandMenu(false);
        setSlashPosition(-1);
        setCommandQuery('');
        setSelectedCommandIndex(-1);
        if (commandQueryTimerRef.current) {
          clearTimeout(commandQueryTimerRef.current);
        }
        return;
      }
    }

    // Handle file dropdown navigation
    if (showFileDropdown && filteredFiles.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedFileIndex(prev =>
          prev < filteredFiles.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedFileIndex(prev =>
          prev > 0 ? prev - 1 : filteredFiles.length - 1
        );
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        if (selectedFileIndex >= 0) {
          selectFile(filteredFiles[selectedFileIndex]);
        } else if (filteredFiles.length > 0) {
          selectFile(filteredFiles[0]);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowFileDropdown(false);
        return;
      }
    }

    // Handle Tab key for mode switching (only when dropdowns are not showing)
    if (e.key === 'Tab' && !showFileDropdown && !showCommandMenu) {
      e.preventDefault();
      const modes = ['default', 'acceptEdits', 'bypassPermissions', 'plan'];
      const currentIndex = modes.indexOf(permissionMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      const newMode = modes[nextIndex];
      setPermissionMode(newMode);

      // Save mode for this session
      if (selectedSession?.id) {
        localStorage.setItem(`permissionMode-${selectedSession.id}`, newMode);
      }
      return;
    }

    // Handle Enter key: Ctrl+Enter (Cmd+Enter on Mac) sends, Shift+Enter creates new line
    if (e.key === 'Enter') {
      // If we're in composition, don't send message
      if (e.nativeEvent.isComposing) {
        return; // Let IME handle the Enter key
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        // Ctrl+Enter or Cmd+Enter: Send message
        e.preventDefault();
        handleSubmit(e);
      } else if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Plain Enter: Send message only if not in IME composition
        if (!sendByCtrlEnter) {
          e.preventDefault();
          handleSubmit(e);
        }
      }
      // Shift+Enter: Allow default behavior (new line)
    }
  };

  const selectFile = (file) => {
    const textBeforeAt = input.slice(0, atSymbolPosition);
    const textAfterAtQuery = input.slice(atSymbolPosition);
    const spaceIndex = textAfterAtQuery.indexOf(' ');
    const textAfterQuery = spaceIndex !== -1 ? textAfterAtQuery.slice(spaceIndex) : '';

    const newInput = textBeforeAt + '@' + file.path + ' ' + textAfterQuery;
    const newCursorPos = textBeforeAt.length + 1 + file.path.length + 1;

    // Immediately ensure focus is maintained
    if (textareaRef.current && !textareaRef.current.matches(':focus')) {
      textareaRef.current.focus();
    }

    // Update input and cursor position
    setInput(newInput);
    setCursorPosition(newCursorPos);

    // Hide dropdown
    setShowFileDropdown(false);
    setAtSymbolPosition(-1);

    // Set cursor position synchronously 
    if (textareaRef.current) {
      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          // Ensure focus is maintained
          if (!textareaRef.current.matches(':focus')) {
            textareaRef.current.focus();
          }
        }
      });
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;

    // Auto-select IFlow provider if no session exists and user starts typing
    if (!currentSessionId && newValue.trim() && provider === 'iflow') {
      // Provider is already set to 'iflow' by default, so no need to change it
      // The session will be created automatically when they submit
    }

    setInput(newValue);
    setCursorPosition(cursorPos);

    // Handle height reset when input becomes empty
    if (!newValue.trim()) {
      e.target.style.height = 'auto';
      setIsTextareaExpanded(false);
      setShowCommandMenu(false);
      setSlashPosition(-1);
      setCommandQuery('');
      return;
    }

    // Detect slash command at cursor position
    // Look backwards from cursor to find a slash that starts a command
    const textBeforeCursor = newValue.slice(0, cursorPos);

    // Check if we're in a code block (simple heuristic: between triple backticks)
    const backticksBefore = (textBeforeCursor.match(/```/g) || []).length;
    const inCodeBlock = backticksBefore % 2 === 1;

    if (inCodeBlock) {
      // Don't show command menu in code blocks
      setShowCommandMenu(false);
      setSlashPosition(-1);
      setCommandQuery('');
      return;
    }

    // Find the last slash before cursor that could start a command
    // Slash is valid if it's at the start or preceded by whitespace
    const slashPattern = /(^|\s)\/(\S*)$/;
    const match = textBeforeCursor.match(slashPattern);

    if (match) {
      const slashPos = match.index + match[1].length; // Position of the slash
      const query = match[2]; // Text after the slash

      // Update states with debouncing for query
      setSlashPosition(slashPos);
      setShowCommandMenu(true);
      setSelectedCommandIndex(-1);

      // Debounce the command query update
      if (commandQueryTimerRef.current) {
        clearTimeout(commandQueryTimerRef.current);
      }

      commandQueryTimerRef.current = setTimeout(() => {
        setCommandQuery(query);
      }, 150); // 150ms debounce
    } else {
      // No slash command detected
      setShowCommandMenu(false);
      setSlashPosition(-1);
      setCommandQuery('');

      if (commandQueryTimerRef.current) {
        clearTimeout(commandQueryTimerRef.current);
      }
    }
  };

  const handleTextareaClick = (e) => {
    setCursorPosition(e.target.selectionStart);
  };



  const handleNewSession = () => {
    setChatMessages([]);
    setInput('');
    setIsLoading(false);
    setCanAbortSession(false);
  };

  const handleModeSwitch = () => {
    const modes = ['default', 'acceptEdits', 'bypassPermissions', 'plan'];
    const currentIndex = modes.indexOf(permissionMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const newMode = modes[nextIndex];
    setPermissionMode(newMode);

    // Save mode for this session
    if (selectedSession?.id) {
      localStorage.setItem(`permissionMode-${selectedSession.id}`, newMode);
    }
  };

  const handleErrorDetected = (errorOutput, project) => {
    console.log('Error detected:', errorOutput);
    setErrorDetected({
      error: errorOutput,
      projectPath: project?.path || selectedProject?.path
    });

    // 5秒后自动隐藏
    setTimeout(() => {
      setErrorDetected(null);
    }, 10000);
  };

  const handleApplyFix = (fixPlan) => {
    console.log('Applying fix:', fixPlan);
    // 这里可以执行修复命令或让 AI 应用修复
    setErrorDetected(null);
  };

  const handleOptimizePrompt = async () => {
    if (!selectedProject?.path) {
      alert('请先选择一个项目');
      return;
    }

    if (!input.trim()) {
      alert('请先在输入框中输入内容');
      return;
    }

    setShowPromptOptimizer(true);
    setPromptOptimizerLoading(true);
    setPromptOptimizerResult(null);

    try {
      const response = await authenticatedFetch('/api/prompt-optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectPath: selectedProject.path,
          userInput: input,
          persona: 'partner', // 默认使用共情模式
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '优化失败');
      }

      const data = await response.json();
      setPromptOptimizerResult(data);
    } catch (error) {
      console.error('消息优化失败:', error);
      alert('消息优化失败: ' + error.message);
    } finally {
      setPromptOptimizerLoading(false);
    }
  };

  const copyOptimizedPrompt = () => {
    if (promptOptimizerResult?.optimizedMessage) {
      navigator.clipboard.writeText(promptOptimizerResult.optimizedMessage);
      alert('优化后的消息已复制到剪贴板');
    }
  };

  const applyOptimizedPrompt = () => {
    if (promptOptimizerResult?.optimizedMessage) {
      const optimizedMessage = promptOptimizerResult.optimizedMessage;
      // 将优化后的消息替换到输入框
      setInput(optimizedMessage);
      setShowPromptOptimizer(false);
      // 聚焦到输入框
      if (textareaRef.current) {
        textareaRef.current.focus();
        // 调整输入框高度
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      }
    }
  };

  // Don't render if no project is selected
  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p>Select a project to start chatting with IFlow</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          details[open] .details-chevron {
            transform: rotate(180deg);
          }
        `}
      </style>

      {/* Focus Mode Exit Hint */}
      {focusMode && (
        <div className="focus-exit-hint">
          按 ESC 退出专注模式
        </div>
      )}

      {/* Error Fix Prompt */}
      {errorDetected && (
        <ErrorFixPrompt
          error={errorDetected.error}
          projectPath={errorDetected.projectPath}
          onApplyFix={handleApplyFix}
          onDismiss={() => setErrorDetected(null)}
        />
      )}

      <div className="h-full flex flex-col">
        {/* Messages Area - Scrollable Middle Section with Virtual Scrolling */}
        {isLoadingSessionMessages && chatMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                <p>Loading session messages...</p>
              </div>
            </div>
          </div>
        ) : chatMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            {!selectedSession && !currentSessionId && (
              <div className="text-center px-6 sm:px-4 py-8 max-w-2xl">
                <div className="mx-auto h-24 w-24 flex items-center justify-center rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 mb-8 shadow-xl shadow-blue-500/10 transform hover:scale-105 transition-transform duration-300">
                  <IFlowLogo className="h-14 w-14 text-blue-600 dark:text-blue-400 drop-shadow-sm" />
                </div>
                <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 mb-6 tracking-tight">IFlow Agent</h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 leading-relaxed font-light">
                  Your autonomous AI development partner. <br />Ready to build something amazing?
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                  <div className="p-5 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/60 dark:bg-gray-800/40 hover:bg-white dark:hover:bg-gray-800 text-left transition-all duration-200 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800/50 cursor-pointer group backdrop-blur-sm" onClick={() => setInput("Review code architecture")}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">Code Review</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed pl-1">Analyze architecture and find potential bugs</p>
                  </div>
                  <div className="p-5 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-white/60 dark:bg-gray-800/40 hover:bg-white dark:hover:bg-gray-800 text-left transition-all duration-200 hover:shadow-lg hover:border-green-200 dark:hover:border-green-800/50 cursor-pointer group backdrop-blur-sm" onClick={() => setInput("Implement a new feature")}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-800/40 transition-colors">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400">Auto Dev</p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed pl-1">Implement features and fix issues automatically</p>
                  </div>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse font-medium">
                  Start typing below to begin...
                </p>
              </div>
            )}
            {selectedSession && (
              <div className="text-center text-gray-500 dark:text-gray-400 px-6 sm:px-4">
                <p className="font-bold text-lg sm:text-xl mb-3">Continue your conversation</p>
                <p className="text-sm sm:text-base leading-relaxed">
                  Ask questions about your code, request changes, or get help with development tasks
                </p>

                {/* Show NextTaskBanner for existing sessions too, only if TaskMaster is installed */}
                {tasksEnabled && isTaskMasterInstalled && (
                  <div className="mt-4 px-4 sm:px-0">
                    <NextTaskBanner
                      onStartTask={() => setInput('Start the next task')}
                      onShowAllTasks={onShowAllTasks}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden relative">
            <Virtuoso
              ref={scrollContainerRef}
              style={{ height: '100%', paddingLeft: '16px', paddingRight: '20px' }}
              scrollerRef={(ref) => {
                if (ref) {
                  ref.style.overflowX = 'hidden';
                }
              }}
              data={visibleMessages}
              initialTopMostItemIndex={visibleMessages.length - 1}
              components={{
                Header: () => (
                  <>
                    {/* Loading indicator for older messages */}
                    {isLoadingMoreMessages && (
                      <div className="text-center text-gray-500 dark:text-gray-400 py-3">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                          <p className="text-sm">Loading older messages...</p>
                        </div>
                      </div>
                    )}

                    {/* Indicator showing there are more messages to load */}
                    {hasMoreMessages && !isLoadingMoreMessages && (
                      <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-2 border-b border-gray-200 dark:border-gray-700">
                        {totalMessages > 0 && (
                          <span>
                            Showing {sessionMessages.length} of {totalMessages} messages •
                            <span className="text-xs">Scroll up to load more</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Legacy message count indicator (for non-paginated view) */}
                    {!hasMoreMessages && chatMessages.length > visibleMessageCount && (
                      <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-2 border-b border-gray-200 dark:border-gray-700">
                        Showing last {visibleMessageCount} messages ({chatMessages.length} total) •
                        <button
                          className="ml-1 text-blue-600 hover:text-blue-700 underline"
                          onClick={loadEarlierMessages}
                        >
                          Load earlier messages
                        </button>
                      </div>
                    )}
                  </>
                ),
                Footer: () => (
                  <>
                    {isLoading && (
                      <div className="ai-thinking-container py-2">
                        <TypingIndicator
                          agent={provider === 'cursor' ? 'Cursor' : 'IFlow'}
                          agentInfo={currentAgentInfo}
                        />
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )
              }}
              itemContent={(index, message) => {
                const prevMessage = index > 0 ? visibleMessages[index - 1] : null;

                return (
                  <div className="space-y-3 sm:space-y-4">
                    <MessageComponent
                      key={index}
                      message={message}
                      index={index}
                      prevMessage={prevMessage}
                      createDiff={createDiff}
                      onFileOpen={onFileOpen}
                      onShowSettings={onShowSettings}
                      autoExpandTools={autoExpandTools}
                      showRawParameters={showRawParameters}
                      showThinking={showThinking}
                      selectedProject={selectedProject}
                    />
                  </div>
                );
              }}
            />
          </div>
        )}


        {/* Input Area - Fixed Bottom */}
        <div className={`p-2 sm:p-4 md:p-4 flex-shrink-0 ${isInputFocused ? 'pb-2 sm:pb-4 md:pb-6' : 'pb-2 sm:pb-4 md:pb-6'
          }`}>

          {/* Focus Mode Toggle Button */}
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`focus-mode-toggle ${focusMode ? 'active' : ''}`}
            style={{ right: '80px' }}
            title={focusMode ? '退出专注模式 (按 ESC)' : '进入专注模式'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {focusMode ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              )}
            </svg>
          </button>

          {/* Generate Report Button */}
          <button
            onClick={async () => {
              if (!selectedProject) return;
              
              try {
                const response = await authenticatedFetch('/api/generate-report', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    projectPath: selectedProject.path,
                    type: 'daily'
                  })
                });

                if (response.ok) {
                  const data = await response.json();
                  const report = data.report;
                  
                  // 将报告作为消息添加到聊天中
                  const reportMessage = `
## 📊 今日工作报告

**日期**: ${report.date}

### 📝 工作摘要
${report.summary}

### 📈 详细指标
- **提交次数**: ${report.metrics.commit_count}
- **代码变更**: ${report.metrics.lines_changed} 行
- **修改文件**: ${report.metrics.files_changed} 个
- **Bug 修复**: ${report.metrics.bug_fixes} 个
- **新功能**: ${report.metrics.new_features} 个
- **生产力分数**: ${report.metrics.productivity_score.toFixed(1)}/100

### 🔧 代码变更详情
- **新增行数**: ${report.details.code_changes.lines_added}
- **删除行数**: ${report.details.code_changes.lines_deleted}
- **文件类型分布**: ${Object.entries(report.details.code_changes.file_types).map(([ext, count]) => `${ext}: ${count}`).join(', ')}

### 💡 新功能
${report.details.features.length > 0 ? report.details.features.map(f => `- ${f}`).join('\n') : '暂无新功能'}

### 🐛 Bug 修复
${report.metrics.bug_fixes > 0 ? `修复了 ${report.metrics.bug_fixes} 个 Bug` : '无 Bug 修复'}
`;
                  
                  setChatMessages(prev => [...prev, {
                    type: 'assistant',
                    content: reportMessage,
                    timestamp: new Date()
                  }]);
                }
              } catch (err) {
                console.error('生成报告失败:', err);
              }
            }}
            className="focus-mode-toggle"
            style={{ right: '24px', bottom: '80px' }}
            title="生成今日工作报告"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>

          <div className="flex-1">
            <ConnectionStatus
              connectionState={connectionState}
              lastHeartbeat={lastHeartbeat}
              reconnectAttempts={reconnectAttempts}
              onReconnect={handleReconnect}
            />
            <IFlowStatus
              status={iflowStatus}
              isLoading={isLoading}
              onAbort={handleAbortSession}
              provider={provider}
              showThinking={showThinking}
            />
          </div>
          {/* Permission Mode Selector with scroll to bottom button - Above input, clickable for mobile */}
          <div ref={inputContainerRef} className="max-w-4xl mx-auto mb-3">
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleModeSwitch}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${permissionMode === 'default'
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                  : permissionMode === 'acceptEdits'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-300 dark:border-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'
                    : permissionMode === 'bypassPermissions'
                      ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                      : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                  }`}
                title="Click to change permission mode (or press Tab in input)"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${permissionMode === 'default'
                    ? 'bg-gray-500'
                    : permissionMode === 'acceptEdits'
                      ? 'bg-green-500'
                      : permissionMode === 'bypassPermissions'
                        ? 'bg-orange-500'
                        : 'bg-blue-500'
                    }`} />
                  <span>
                    {permissionMode === 'default' && 'Default Mode'}
                    {permissionMode === 'acceptEdits' && 'Accept Edits'}
                    {permissionMode === 'bypassPermissions' && 'Bypass Permissions'}
                    {permissionMode === 'plan' && 'Plan Mode'}
                  </span>
                </div>
              </button>
              {/* Token usage pie chart - positioned next to mode indicator */}
              <TokenUsagePie
                used={tokenBudget?.used || 0}
                total={tokenBudget?.total || parseInt(import.meta.env.VITE_CONTEXT_WINDOW) || 160000}
              />

              {/* Slash commands button */}
              <button
                type="button"
                onClick={() => {
                  const isOpening = !showCommandMenu;
                  setShowCommandMenu(isOpening);
                  setCommandQuery('');
                  setSelectedCommandIndex(-1);

                  // When opening, ensure all commands are shown
                  if (isOpening) {
                    setFilteredCommands(slashCommands);
                  }

                  if (textareaRef.current) {
                    textareaRef.current.focus();
                  }
                }}
                className="relative w-8 h-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:ring-offset-gray-800"
                title="Show all commands"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
                {/* Command count badge */}
                {slashCommands.length > 0 && (
                  <span
                    className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                    style={{ fontSize: '10px' }}
                  >
                    {slashCommands.length}
                  </span>
                )}
              </button>

              {/* Clear input button - positioned to the right of token pie, only shows when there's input */}
              {input.trim() && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setInput('');
                    if (textareaRef.current) {
                      textareaRef.current.style.height = 'auto';
                      textareaRef.current.focus();
                    }
                    setIsTextareaExpanded(false);
                  }}
                  className="w-8 h-8 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center transition-all duration-200 group shadow-sm"
                  title="Clear input"
                >
                  <svg
                    className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}

              {/* Scroll to bottom button - positioned next to mode indicator */}
              {isUserScrolledUp && chatMessages.length > 0 && (
                <button
                  onClick={scrollToBottom}
                  className="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:ring-offset-gray-800"
                  title="Scroll to bottom"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
            {/* Drag overlay */}
            {isDragActive && (
              <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
                  <svg className="w-8 h-8 text-blue-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm font-medium">Drop images here</p>
                </div>
              </div>
            )}

            {/* Image attachments preview */}
            {attachedImages.length > 0 && (
              <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex flex-wrap gap-2">
                  {attachedImages.map((file, index) => (
                    <ImageAttachment
                      key={index}
                      file={file}
                      onRemove={() => {
                        setAttachedImages(prev => prev.filter((_, i) => i !== index));
                      }}
                      uploadProgress={uploadingImages.get(file.name)}
                      error={imageErrors.get(file.name)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* File dropdown - positioned outside dropzone to avoid conflicts */}
            {showFileDropdown && filteredFiles.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50 backdrop-blur-sm">
                {filteredFiles.map((file, index) => (
                  <div
                    key={file.path}
                    className={`px-4 py-3 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 touch-manipulation ${index === selectedFileIndex
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    onMouseDown={(e) => {
                      // Prevent textarea from losing focus on mobile
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      selectFile(file);
                    }}
                  >
                    <div className="font-medium text-sm">{file.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {file.path}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Command Menu */}
            <CommandMenu
              commands={filteredCommands}
              selectedIndex={selectedCommandIndex}
              onSelect={handleCommandSelect}
              onClose={() => {
                setShowCommandMenu(false);
                setSlashPosition(-1);
                setCommandQuery('');
                setSelectedCommandIndex(-1);
              }}
              position={{
                top: textareaRef.current
                  ? Math.max(16, textareaRef.current.getBoundingClientRect().top - 316)
                  : 0,
                left: textareaRef.current
                  ? textareaRef.current.getBoundingClientRect().left
                  : 16,
                bottom: textareaRef.current
                  ? window.innerHeight - textareaRef.current.getBoundingClientRect().top + 8
                  : 90
              }}
              isOpen={showCommandMenu}
              frequentCommands={commandQuery ? [] : frequentCommands}
            />

            <div {...getRootProps()} className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] border border-gray-100 dark:border-gray-700/50 focus-within:ring-2 focus-within:ring-blue-500/20 dark:focus-within:ring-blue-500/20 transition-all duration-300 overflow-hidden ${isTextareaExpanded ? 'chat-input-expanded' : ''}`}>
              <input {...getInputProps()} />
              <div className="absolute left-2 bottom-2 sm:bottom-3 flex items-center gap-0.5 sm:gap-1 z-10">
                {/* Image upload button */}
                <button
                  type="button"
                  onClick={open}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all hover:scale-110 active:scale-95 group"
                  title="Attach images"
                >
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>

                {/* Auto Fix button */}
                <button
                  type="button"
                  onClick={() => setShowAutoFixPanel(true)}
                  className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-xl transition-all hover:scale-110 active:scale-95 group"
                  title="Auto Fix Errors"
                >
                  <Wrench className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                </button>

                {/* Context Visualizer button */}
                <button
                  type="button"
                  onClick={() => setShowContextVisualizer(true)}
                  className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-xl transition-all hover:scale-110 active:scale-95 group"
                  title="Context Visualizer"
                >
                  <Network className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                </button>

                {/* Prompt Optimizer button */}
                <button
                  type="button"
                  onClick={handleOptimizePrompt}
                  className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl transition-all hover:scale-110 active:scale-95 group"
                  title="优化提示词"
                >
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </button>
              </div>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onClick={handleTextareaClick}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                onInput={(e) => {
                  // Immediate resize on input for better UX
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                  setCursorPosition(e.target.selectionStart);

                  // Check if textarea is expanded (more than 2 lines worth of height)
                  const lineHeight = parseInt(window.getComputedStyle(e.target).lineHeight);
                  const isExpanded = e.target.scrollHeight > lineHeight * 2;
                  setIsTextareaExpanded(isExpanded);
                }}
                placeholder={`Type / for commands, @ for files, or ask ${provider === 'cursor' ? 'Cursor' : 'IFlow'} anything...`}
                disabled={isLoading}
                className="chat-input-placeholder block w-full pl-44 pr-16 sm:pr-20 py-3 sm:py-4 bg-transparent rounded-2xl focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 resize-none min-h-[50px] sm:min-h-[60px] max-h-[40vh] sm:max-h-[300px] overflow-y-auto text-sm sm:text-base leading-[21px] sm:leading-6 transition-all duration-200"
                style={{ height: '50px' }}
              />

              {/* Send button container */}
              <div className="absolute right-2 bottom-2 sm:bottom-3 flex items-center gap-2">
                {/* Mic button - HIDDEN */}
                <div style={{ display: 'none' }}>
                  <MicButton
                    onTranscript={handleTranscript}
                    className="w-10 h-10"
                  />
                </div>

                {/* Send button */}
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSubmit(e);
                  }}
                  className="w-10 h-10 sm:w-11 sm:h-11 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 rounded-xl flex items-center justify-center transition-all duration-200 shadow-md shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-95"
                >
                  <svg
                    className="w-5 h-5 text-white transform rotate-90"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </div>

              {/* Hint text inside input box at bottom - Desktop only */}
              <div className={`absolute bottom-1 left-12 right-14 sm:right-40 text-xs text-gray-400 dark:text-gray-500 pointer-events-none hidden sm:block transition-opacity duration-200 ${input.trim() ? 'opacity-0' : 'opacity-100'
                }`}>
                {sendByCtrlEnter
                  ? "Ctrl+Enter to send • Shift+Enter for new line • Tab to change modes • / for slash commands"
                  : "Enter to send • Shift+Enter for new line • Tab to change modes • / for slash commands"}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Auto Fix Panel */}
      {showAutoFixPanel && (
        <AutoFixPanel
          projectPath={selectedProject?.fullPath}
          visible={showAutoFixPanel}
          onClose={() => setShowAutoFixPanel(false)}
        />
      )}

      {/* Context Visualizer */}
      {showContextVisualizer && (
        <ContextVisualizer
          projectPath={selectedProject?.fullPath}
          visible={showContextVisualizer}
          onClose={() => setShowContextVisualizer(false)}
          onNodeClick={(nodeData) => {
            // 点击节点时打开文件
            if (nodeData.file_path) {
              onFileOpen(nodeData.file_path);
            }
          }}
        />
      )}

      {/* Prompt Optimizer Modal */}
      {showPromptOptimizer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                ⚡ 提示词优化器
              </h2>
              <button
                onClick={() => setShowPromptOptimizer(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {promptOptimizerLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">正在分析项目并优化消息...</p>
                </div>
              ) : promptOptimizerResult ? (
                <div className="space-y-4">
                  {/* 项目分析结果 */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h3 className="font-medium mb-3 text-gray-900 dark:text-gray-100">📊 项目分析结果</h3>

                    {/* 技术栈 */}
                    {promptOptimizerResult.analysis?.tech_stack?.length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">技术栈</div>
                        <div className="flex flex-wrap gap-2">
                          {promptOptimizerResult.analysis.tech_stack.map((tech, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded text-xs">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 架构模式 */}
                    {promptOptimizerResult.analysis?.architecture_patterns?.length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">架构模式</div>
                        <div className="flex flex-wrap gap-2">
                          {promptOptimizerResult.analysis.architecture_patterns.map((pattern, index) => (
                            <span key={index} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded text-xs">
                              {pattern}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 代码风格 */}
                    {promptOptimizerResult.analysis?.code_style && (
                      <div>
                        <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">代码风格</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          {promptOptimizerResult.analysis.code_style.languages?.length > 0 && (
                            <div>主要语言: {promptOptimizerResult.analysis.code_style.languages.join(', ')}</div>
                          )}
                          {promptOptimizerResult.analysis.code_style.general?.indentation !== 'unknown' && (
                            <div>缩进: {promptOptimizerResult.analysis.code_style.general.indentation}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 原始消息 */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h3 className="font-medium mb-2 text-gray-900 dark:text-gray-100">📝 原始消息</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {promptOptimizerResult.originalInput}
                    </p>
                  </div>

                  {/* 优化后的消息 */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">✨ 优化后的消息</h3>
                      <button
                        onClick={copyOptimizedPrompt}
                        className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      >
                        📋 复制
                      </button>
                    </div>
                    <pre className="text-sm whitespace-pre-wrap overflow-x-auto bg-white dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                      {promptOptimizerResult.optimizedMessage}
                    </pre>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowPromptOptimizer(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                关闭
              </button>
              {promptOptimizerResult && (
                <button
                  onClick={applyOptimizedPrompt}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  ✨ 应用到输入框
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default React.memo(ChatInterface);

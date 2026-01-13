/**
 * Thinking Block Component
 * 深度思考过程展示组件
 */

import React, { useState, useEffect } from 'react';

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
  }, [isFinished, isOpen]);

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

export default ThinkingBlock;
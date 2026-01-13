/**
 * Assistant Message Component
 * 助手消息卡片组件
 */

import React from 'react';
import IFlowLogo from '../IFlowLogo.jsx';
import CursorLogo from '../CursorLogo.jsx';
import MarkdownRenderer from '../markdown/MarkdownRenderer';
import ThinkingBlock from '../markdown/ThinkingBlock';
import ToolUsageCard from './ToolUsageCard';

const AssistantMessage = ({ message, isGrouped, showThinking }) => {
  const provider = localStorage.getItem('selected-provider') || 'iflow';

  return (
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
              provider === 'cursor' ? <CursorLogo className="w-5 h-5" /> : <IFlowLogo className="w-5 h-5" />
            )}
          </div>
        )}
      </div>

      {/* Right Column: Content */}
      <div className="flex-1 min-w-0 overflow-hidden">
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

          {/* Content */}
          {message.content && (
            <MarkdownRenderer className="prose prose-sm dark:prose-invert max-w-none">
              {message.content}
            </MarkdownRenderer>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssistantMessage;
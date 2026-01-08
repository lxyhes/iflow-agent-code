/**
 * OptimizedMessageList.jsx - 优化的消息列表组件
 *
 * 结合虚拟滚动和自动滚动控制，提供最佳性能和用户体验
 */

import React, { useRef, useCallback, useEffect } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { ArrowDown, MessageSquare } from 'lucide-react';
import MessageItem from './MessageItem';
import { useVirtualScroll } from '../../hooks/useVirtualScroll';

const OptimizedMessageList = ({
  messages,
  onFileOpen,
  onTaskClick,
  onShowAllTasks,
  showRawParameters,
  isStreaming,
  currentStreamingMessage,
  autoScrollToBottom = true
}) => {
  const virtuosoRef = useRef(null);
  const containerRef = useRef(null);

  const {
    isAutoScrollEnabled,
    hasScrolledUp,
    showScrollToBottom,
    scrollToBottom
  } = useVirtualScroll({
    messages,
    isStreaming,
    currentStreamingMessage,
    autoScrollToBottom
  });

  // 自动滚动到底部
  useEffect(() => {
    if (autoScrollToBottom && isAutoScrollEnabled && virtuosoRef.current) {
      // 使用 requestAnimationFrame 确保在下一帧滚动
      requestAnimationFrame(() => {
        virtuosoRef.current?.scrollToIndex({
          index: 'LAST',
          behavior: 'smooth'
        });
      });
    }
  }, [messages.length, isStreaming, currentStreamingMessage, autoScrollToBottom, isAutoScrollEnabled]);

  // 渲染单个消息项
  const renderItem = useCallback((index) => {
    const message = messages[index];
    if (!message) return null;

    return (
      <div className="px-4 py-2">
        <MessageItem
          message={message}
          onFileOpen={onFileOpen}
          onTaskClick={onTaskClick}
          onShowAllTasks={onShowAllTasks}
          showRawParameters={showRawParameters}
        />
      </div>
    );
  }, [messages, onFileOpen, onTaskClick, onShowAllTasks, showRawParameters]);

  // 计算消息的预估高度
  const computeItemHeight = useCallback((index) => {
    const message = messages[index];
    if (!message) return 100;

    const baseHeight = 80;
    const contentLength = message.content?.length || 0;
    const contentHeight = Math.min(contentLength * 0.5, 400);
    const toolsHeight = (message.tools?.length || 0) * 120;
    const fileAttachments = (message.files?.length || 0) * 40;

    return Math.max(baseHeight + contentHeight + toolsHeight + fileAttachments, 60);
  }, [messages]);

  // 底部组件（当前流式消息）
  const Footer = useCallback(() => {
    if (isStreaming && currentStreamingMessage) {
      return (
        <div className="px-4 py-2">
          <div className="flex justify-start mb-4">
            <div className="max-w-[80%] bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-2 shadow-sm border border-blue-200 dark:border-blue-800">
              <div className="text-gray-700 dark:text-gray-300">
                {currentStreamingMessage}
                <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }, [isStreaming, currentStreamingMessage]);

  // 空状态
  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
        <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg">开始对话吧...</p>
        <p className="text-sm mt-2">输入消息或上传文件开始</p>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <Virtuoso
        ref={virtuosoRef}
        style={{ height: '100%' }}
        data={messages}
        itemContent={renderItem}
        computeItemKey={(index) => messages[index]?.id || index}
        computeItemHeight={computeItemHeight}
        components={{
          Footer
        }}
        followOutput={isAutoScrollEnabled ? 'smooth' : false}
        // 性能优化配置
        increaseViewportBy={{ top: 200, bottom: 400 }}
        overscan={200}
        // 滚动行为
        smoothScroll
        className="scroll-smooth"
      />

      {/* 滚动到底部按钮 */}
      {showScrollToBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 z-10 p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          title="滚动到底部"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default React.memo(OptimizedMessageList);
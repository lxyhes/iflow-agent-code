/**
 * VirtualMessageList.jsx - 虚拟滚动消息列表组件
 *
 * 使用 react-virtuoso 实现高性能虚拟滚动，优化长对话的渲染性能
 */

import React, { useRef, useCallback, useEffect } from 'react';
import { Virtuoso } from 'react-virtuoso';
import MessageItem from './MessageItem';

const VirtualMessageList = ({
  messages,
  onFileOpen,
  onTaskClick,
  onShowAllTasks,
  showRawParameters,
  autoScrollToBottom,
  isStreaming,
  currentStreamingMessage
}) => {
  const virtuosoRef = useRef(null);
  const lastMessageCountRef = useRef(0);

  // 自动滚动到底部
  useEffect(() => {
    if (autoScrollToBottom && virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({
        index: 'LAST',
        behavior: 'smooth'
      });
    }
  }, [messages.length, isStreaming, currentStreamingMessage, autoScrollToBottom]);

  // 当消息数量变化时，记录变化
  useEffect(() => {
    const count = messages.length;
    if (count !== lastMessageCountRef.current) {
      lastMessageCountRef.current = count;
    }
  }, [messages.length]);

  // 渲染单个消息项
  const renderItem = useCallback((index) => {
    const message = messages[index];
    if (!message) return null;

    return (
      <div
        key={message.id || index}
        className="px-4 py-2"
        style={{
          // 为虚拟滚动提供固定高度估算
          minHeight: message.role === 'user' ? 80 : 120
        }}
      >
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

    // 根据消息内容和类型估算高度
    const baseHeight = 80;
    const contentHeight = Math.min(message.content?.length * 0.5, 300);
    const toolsHeight = (message.tools?.length || 0) * 100;

    return baseHeight + contentHeight + toolsHeight;
  }, [messages]);

  // 底部组件（当前流式消息）
  const Footer = useCallback(() => {
    if (isStreaming && currentStreamingMessage) {
      return (
        <div className="px-4 py-2">
          <div className="flex justify-start mb-4">
            <div className="max-w-[80%] bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-2 shadow-sm">
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
      <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
        <p>开始对话吧...</p>
      </div>
    );
  }

  return (
    <Virtuoso
      ref={virtuosoRef}
      style={{ height: '100%' }}
      data={messages}
      itemContent={renderItem}
      computeItemKey={(index) => messages[index]?.id || index}
      computeItemHeight={computeItemHeight}
      components={{
        Footer: Footer
      }}
      followOutput={autoScrollToBottom ? 'smooth' : false}
      // 性能优化配置
      increaseViewportBy={{ top: 200, bottom: 400 }}
      overscan={200}
      // 滚动行为
      smoothScroll
    />
  );
};

export default React.memo(VirtualMessageList);
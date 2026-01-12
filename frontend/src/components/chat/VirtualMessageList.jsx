/**
 * 虚拟滚动消息列表组件
 * 使用 react-virtuoso 实现高性能的长列表渲染
 */

import React, { useRef, useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import MessageItem from './MessageItem';

export default function VirtualMessageList({ messages, onCopyCode, onRetry }) {
  const virtuosoRef = useRef(null);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    if (virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({
        index: messages.length - 1,
        behavior: 'smooth',
      });
    }
  }, [messages.length]);

  // 当有新消息时自动滚动到底部
  React.useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p>开始对话吧！</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full">
      <Virtuoso
        ref={virtuosoRef}
        style={{ height: '100%' }}
        data={messages}
        itemContent={(index, message) => (
          <div className="px-4 py-2">
            <MessageItem
              key={message.id || index}
              message={message}
              onCopyCode={onCopyCode}
              onRetry={onRetry}
            />
          </div>
        )}
        components={{
          Footer: () => <div className="h-4" />, // 底部留白
        }}
        followOutput="auto"
      />
    </div>
  );
}
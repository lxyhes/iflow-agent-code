/**
 * 消息列表组件
 * 优化的消息渲染，支持虚拟滚动（未来扩展）
 */

import React, { useRef, useEffect } from 'react';
import MessageItem from './MessageItem';

export default function MessageList({ messages, onCopyCode, onRetry }) {
  const messagesEndRef = useRef(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p>开始对话吧！</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((message, index) => (
        <MessageItem
          key={message.id || index}
          message={message}
          onCopyCode={onCopyCode}
          onRetry={onRetry}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
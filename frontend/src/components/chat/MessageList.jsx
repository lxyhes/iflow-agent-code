/**
 * MessageList.jsx - 消息列表组件
 *
 * 显示所有消息，支持自动滚动
 */

import React, { useRef, useEffect } from 'react';
import MessageItem from './MessageItem';

const MessageList = ({
  messages,
  onFileOpen,
  onTaskClick,
  onShowAllTasks,
  showRawParameters,
  autoScrollToBottom
}) => {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // 自动滚动到底部
  useEffect(() => {
    if (autoScrollToBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScrollToBottom]);

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      style={{ scrollBehavior: 'smooth' }}
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
          <p>开始对话吧...</p>
        </div>
      ) : (
        messages.map((message, index) => (
          <MessageItem
            key={message.id || index}
            message={message}
            onFileOpen={onFileOpen}
            onTaskClick={onTaskClick}
            onShowAllTasks={onShowAllTasks}
            showRawParameters={showRawParameters}
          />
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default React.memo(MessageList);
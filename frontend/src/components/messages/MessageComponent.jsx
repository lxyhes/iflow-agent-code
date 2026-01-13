/**
 * Message Component
 * 统一的消息容器组件，处理消息分组和渲染
 */

import React, { memo, useRef, useEffect, useState } from 'react';
import UserMessage from './UserMessage';
import AssistantMessage from './AssistantMessage';

const MessageComponent = memo(({ 
  message, 
  index, 
  prevMessage, 
  autoExpandTools, 
  showThinking,
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
    ((prevMessage.type === 'assistant') ||
      (prevMessage.type === 'user') ||
      (prevMessage.type === 'tool') ||
      (prevMessage.type === 'plan') ||
      (prevMessage.type === 'error'));
  
  const messageRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
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
        <UserMessage 
          message={message} 
          isGrouped={isGrouped}
          onCopyMessage={onCopyMessage}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
          onRegenerate={onRegenerate}
          editingMessageId={editingMessageId}
          editingContent={editingContent}
          setEditingContent={setEditingContent}
          handleSaveEdit={handleSaveEdit}
          handleCancelEdit={handleCancelEdit}
          copiedMessageId={copiedMessageId}
          isLoading={isLoading}
        />
      ) : (
        <AssistantMessage 
          message={message} 
          isGrouped={isGrouped} 
          showThinking={showThinking}
          onCopyMessage={onCopyMessage}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
          onRegenerate={onRegenerate}
          onToggleFavorite={onToggleFavorite}
          editingMessageId={editingMessageId}
          editingContent={editingContent}
          setEditingContent={setEditingContent}
          handleSaveEdit={handleSaveEdit}
          handleCancelEdit={handleCancelEdit}
          copiedMessageId={copiedMessageId}
          regeneratingMessageId={regeneratingMessageId}
          favoritedMessages={favoritedMessages}
          isLoading={isLoading}
        />
      )}
    </div>
  );
});

export default MessageComponent;
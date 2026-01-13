/**
 * MessageList Component
 * 消息列表容器组件
 */

import React, { memo } from 'react';
import MessageComponent from '../messages/MessageComponent';
import UsageLimitBanner from '../UsageLimitBanner';
import LoadingIndicator from './LoadingIndicator';

const MessageList = memo(({
  messages,
  isLoading,
  scrollContainerRef,
  autoExpandTools,
  showRawParameters,
  showThinking,
  selectedProject,
  onFileOpen,
  onShowSettings,
  messageActions,
  provider = 'iflow'
}) => {
  return (
    <div 
      className="overflow-y-auto" 
      style={{ height: '100%', width: '100%', paddingLeft: '16px', paddingRight: '20px' }}
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          <p>暂无消息</p>
        </div>
      ) : (
        <>
          {messages.map((message, index) => {
            // 检查是否为配额限制消息
            if (message.content && message.content.includes('IFlow AI usage limit reached')) {
              return <UsageLimitBanner key={index} text={message.content} />;
            }

            return (
              <MessageComponent
                key={index}
                message={message}
                index={index}
                prevMessage={index > 0 ? messages[index - 1] : null}
                autoExpandTools={autoExpandTools}
                showRawParameters={showRawParameters}
                showThinking={showThinking}
                selectedProject={selectedProject}
                onFileOpen={onFileOpen}
                onShowSettings={onShowSettings}
                onEditMessage={messageActions.handleEditMessage}
                onRegenerate={messageActions.handleRegenerate}
                onCopyMessage={messageActions.handleCopyMessage}
                onDeleteMessage={messageActions.handleDeleteMessage}
                onToggleFavorite={messageActions.handleToggleFavorite}
                editingMessageId={messageActions.editingMessageId}
                editingContent={messageActions.editingContent}
                setEditingContent={messageActions.setEditingContent}
                handleSaveEdit={messageActions.handleSaveEdit}
                handleCancelEdit={messageActions.handleCancelEdit}
                copiedMessageId={messageActions.copiedMessageId}
                regeneratingMessageId={messageActions.regeneratingMessageId}
                favoritedMessages={messageActions.favoritedMessages}
                isLoading={isLoading}
              />
            );
          })}
          {isLoading && <LoadingIndicator isLoading={true} provider={provider} />}
        </>
      )}
    </div>
  );
});

export default MessageList;
/**
 * MessageList Component
 * 消息列表容器组件
 */

import React, { memo } from 'react';
import { Virtuoso } from 'react-virtuoso';
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
    <div className="flex-1 overflow-hidden relative">
      <Virtuoso
        ref={scrollContainerRef}
        style={{ height: '100%', paddingLeft: '16px', paddingRight: '20px' }}
        data={messages}
        initialTopMostItemIndex={messages.length - 1}
        components={{
          Footer: () => <LoadingIndicator isLoading={isLoading} provider={provider} />
        }}
        itemContent={(index, message) => {
          // 检查是否为配额限制消息
          if (message.content && message.content.includes('IFlow AI usage limit reached')) {
            return <UsageLimitBanner text={message.content} />;
          }

          return (
            <MessageComponent
              message={message}
              index={index}
              prevMessage={index > 0 ? messages[index - 1] : null}
              createDiff={messageActions.createDiff}
              onFileOpen={onFileOpen}
              onShowSettings={onShowSettings}
              autoExpandTools={autoExpandTools}
              showRawParameters={showRawParameters}
              showThinking={showThinking}
              selectedProject={selectedProject}
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
        }}
      />
    </div>
  );
});

export default MessageList;
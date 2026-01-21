/**
 * MessageList Component
 * 消息列表容器组件
 */

import React, { memo, useEffect, useMemo, useRef } from 'react';
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
  const pinnedToBottomRef = useRef(true);
  const lastScrollAtRef = useRef(0);

  const lastMessageKey = useMemo(() => {
    const m = messages[messages.length - 1];
    if (!m) return '';
    return [
      m.id || '',
      m.type || '',
      m.isStreaming ? '1' : '0',
      m.toolStatus || '',
      String(m.content || '').length
    ].join('|');
  }, [messages]);

  const smoothScrollToBottom = (durationMs = 380) => {
    const el = scrollContainerRef?.current;
    if (!el) return;
    const target = el.scrollHeight - el.clientHeight;
    const start = el.scrollTop;
    const change = target - start;
    if (Math.abs(change) < 2) return;

    const startTime = performance.now();
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const step = (now) => {
      const elapsed = now - startTime;
      const p = Math.min(1, elapsed / durationMs);
      el.scrollTop = start + change * easeOutCubic(p);
      if (p < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  useEffect(() => {
    const el = scrollContainerRef?.current;
    if (!el) return;

    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      pinnedToBottomRef.current = distance < 80;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollContainerRef]);

  useEffect(() => {
    const el = scrollContainerRef?.current;
    if (!el) return;

    const last = messages[messages.length - 1];
    const shouldForce =
      (last && last.type === 'user') || isLoading || pinnedToBottomRef.current;

    if (!shouldForce) return;

    const now = Date.now();
    if (now - lastScrollAtRef.current < 120) return;
    lastScrollAtRef.current = now;
    setTimeout(() => smoothScrollToBottom(380), 0);
  }, [lastMessageKey, isLoading, messages, scrollContainerRef]);

  return (
    <div 
      className="overflow-y-auto" 
      style={{ height: '100%', width: '100%', paddingLeft: '16px', paddingRight: '20px' }}
      ref={scrollContainerRef}
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

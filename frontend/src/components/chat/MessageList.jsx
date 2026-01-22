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

  // 按时间戳和原始索引排序消息,确保消息顺序正确且稳定
  const sortedMessages = useMemo(() => {
    const sorted = [...messages].map((msg, idx) => ({ ...msg, _originalIndex: idx }))
      .sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        // 先按时间戳排序,如果时间戳相同则按原始索引排序
        if (timeA !== timeB) {
          return timeA - timeB;
        }
        return a._originalIndex - b._originalIndex;
      });
    
    // 调试:输出消息顺序和类型
    if (process.env.NODE_ENV === 'development') {
      console.log('[MessageList] Message order:', sorted.map((m, i) => ({
        index: i,
        type: m.type,
        content: m.content?.substring(0, 30) || '(empty)',
        timestamp: m.timestamp,
        isStreaming: m.isStreaming
      })));
    }
    
    return sorted;
  }, [messages]);

  const lastMessageKey = useMemo(() => {
    const m = sortedMessages[sortedMessages.length - 1];
    if (!m) return '';
    return [
      m.id || '',
      m.type || '',
      m.isStreaming ? '1' : '0',
      m.toolStatus || '',
      String(m.content || '').length
    ].join('|');
  }, [sortedMessages]);

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

    const last = sortedMessages[sortedMessages.length - 1];
    const shouldForce =
      (last && last.type === 'user') || isLoading || pinnedToBottomRef.current;

    if (!shouldForce) return;

    const now = Date.now();
    if (now - lastScrollAtRef.current < 120) return;
    lastScrollAtRef.current = now;
    setTimeout(() => smoothScrollToBottom(380), 0);
  }, [lastMessageKey, isLoading, sortedMessages, scrollContainerRef]);

  return (
    <div 
      className="overflow-y-auto" 
      style={{ height: '100%', width: '100%', paddingLeft: '16px', paddingRight: '20px' }}
      ref={scrollContainerRef}
    >
      {sortedMessages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          <p>暂无消息</p>
        </div>
      ) : (
        <>
          {sortedMessages.map((message, index) => {
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

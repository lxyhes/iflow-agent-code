/**
 * useScrollManagement Hook
 * 管理消息列表的滚动逻辑
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export const useScrollManagement = (chatMessages, autoScrollToBottom) => {
  const scrollContainerRef = useRef(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const scrollPositionRef = useRef({ height: 0, top: 0 });
  const rafRef = useRef(null);
  const lastAutoScrollAtRef = useRef(0);

  const getScroller = () => {
    const cur = scrollContainerRef.current;
    if (!cur) return null;
    if (cur.scrollerRef?.current) return cur.scrollerRef.current;
    return cur;
  };

  const smoothScroll = (el, to, durationMs = 380) => {
    if (!el) return;
    const start = el.scrollTop;
    const change = to - start;
    if (Math.abs(change) < 2) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const startTime = performance.now();
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const p = Math.min(1, (now - startTime) / durationMs);
      el.scrollTop = start + change * easeOutCubic(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  // 滚动到底部（兼容 Virtuoso 与普通 DOM 容器）
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const cur = scrollContainerRef.current;
    if (!cur) return;

    if (typeof cur.scrollToIndex === 'function') {
      cur.scrollToIndex({
        index: 'LAST',
        align: 'end',
        behavior: behavior === 'auto' ? 'auto' : 'smooth'
      });
      return;
    }

    const el = getScroller();
    if (!el) return;
    const target = el.scrollHeight - el.clientHeight;
    if (behavior === 'auto') {
      el.scrollTop = target;
    } else {
      smoothScroll(el, target, 380);
    }
  }, []);

  // 滚动到指定消息
  const scrollToMessage = useCallback((messageId) => {
    if (!scrollContainerRef.current) return;
    
    const index = chatMessages.findIndex(m => m.id === messageId);
    if (index === -1) return;

    const cur = scrollContainerRef.current;
    if (typeof cur.scrollToIndex === 'function') {
      scrollContainerRef.current.scrollToIndex({
        index,
        align: 'start',
        behavior: 'smooth'
      });
      return;
    }
    const el = getScroller();
    if (!el) return;
    const node = el.querySelector?.(`[data-message-id="${CSS.escape(String(messageId))}"]`);
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [chatMessages]);

  // 自动滚动到底部
  useEffect(() => {
    if (!scrollContainerRef.current || chatMessages.length === 0 || !autoScrollToBottom) return;

    // 检查最后一条消息是否正在流式输出
    const lastMessage = chatMessages[chatMessages.length - 1];
    const isLastMessageStreaming = lastMessage?.isStreaming === true;

    // 如果最后一条消息正在流式输出，强制滚动到底部（忽略用户是否向上滚动）
    // 否则，只有当用户在底部时才自动滚动
    if (!isLastMessageStreaming && isUserScrolledUp) return;

    const now = Date.now();
    // 流式输出时减少节流时间，确保更流畅的滚动
    const throttleTime = isLastMessageStreaming ? 50 : 120;
    if (now - lastAutoScrollAtRef.current < throttleTime) return;
    lastAutoScrollAtRef.current = now;
    scrollToBottom('auto');
  }, [chatMessages, isUserScrolledUp, autoScrollToBottom]);

  // 处理滚动事件
  const handleScroll = useCallback((e) => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setIsUserScrolledUp(!isNearBottom);
    scrollPositionRef.current = {
      height: scrollHeight,
      top: scrollTop
    };
  }, []);

  return {
    scrollContainerRef,
    isUserScrolledUp,
    setIsUserScrolledUp,
    scrollToBottom,
    scrollToMessage,
    handleScroll
  };
};

export default useScrollManagement;

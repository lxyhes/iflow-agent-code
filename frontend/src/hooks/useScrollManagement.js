/**
 * useScrollManagement Hook
 * 管理消息列表的滚动逻辑
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export const useScrollManagement = (chatMessages, autoScrollToBottom) => {
  const scrollContainerRef = useRef(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const scrollPositionRef = useRef({ height: 0, top: 0 });

  // 滚动到底部
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollToIndex({
        index: 'LAST',
        align: 'end',
        behavior
      });
    }
  }, []);

  // 滚动到指定消息
  const scrollToMessage = useCallback((messageId) => {
    if (!scrollContainerRef.current) return;
    
    const index = chatMessages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      scrollContainerRef.current.scrollToIndex({
        index,
        align: 'start',
        behavior: 'smooth'
      });
    }
  }, [chatMessages]);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollContainerRef.current && chatMessages.length > 0 && !isUserScrolledUp && autoScrollToBottom) {
      scrollContainerRef.current.scrollToIndex({
        index: 'LAST',
        align: 'end',
        behavior: 'auto'
      });
    }
  }, [chatMessages.length, isUserScrolledUp, autoScrollToBottom]);

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
/**
 * useVirtualScroll.js - 虚拟滚动配置 Hook
 *
 * 提供虚拟滚动的配置和优化选项
 */

import { useState, useCallback, useEffect, useMemo } from 'react';

export const useVirtualScroll = ({
  messages = [],
  isStreaming = false,
  currentStreamingMessage = '',
  autoScrollToBottom = true,
  threshold = 100 // 距离底部多少像素时自动滚动
}) => {
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(autoScrollToBottom);
  const [hasScrolledUp, setHasScrolledUp] = useState(false);
  const lastMessageCountRef = useRef(0);

  // 监听消息数量变化
  useEffect(() => {
    const count = messages.length;
    const prevCount = lastMessageCountRef.current;

    // 如果有新消息且用户没有向上滚动，则自动滚动到底部
    if (count > prevCount && isAutoScrollEnabled && !hasScrolledUp) {
      // 触发自动滚动（由父组件处理）
    }

    lastMessageCountRef.current = count;
  }, [messages.length, isAutoScrollEnabled, hasScrolledUp]);

  // 处理滚动事件
  const handleScroll = useCallback((event) => {
    const { scrollTop, scrollHeight, clientHeight } = event.target;

    // 计算距离底部的距离
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // 如果距离底部很近，启用自动滚动
    if (distanceFromBottom < threshold) {
      setIsAutoScrollEnabled(true);
      setHasScrolledUp(false);
    } else {
      setIsAutoScrollEnabled(false);
      setHasScrolledUp(true);
    }
  }, [threshold]);

  // 手动滚动到底部
  const scrollToBottom = useCallback(() => {
    setIsAutoScrollEnabled(true);
    setHasScrolledUp(false);
  }, []);

  // 判断是否应该显示"滚动到底部"按钮
  const showScrollToBottom = useMemo(() => {
    return hasScrolledUp && messages.length > 5;
  }, [hasScrolledUp, messages.length]);

  return {
    isAutoScrollEnabled,
    hasScrolledUp,
    showScrollToBottom,
    handleScroll,
    scrollToBottom
  };
};

export default useVirtualScroll;
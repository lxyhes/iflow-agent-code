/**
 * queryClient.js - React Query 客户端配置
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 数据保持新鲜的时间（毫秒）
      staleTime: 1000 * 60 * 5, // 5 分钟
      // 缓存时间（毫秒）
      cacheTime: 1000 * 60 * 30, // 30 分钟
      // 重试次数
      retry: 3,
      // 重试延迟
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // 窗口聚焦时重新获取
      refetchOnWindowFocus: false,
      // 网络重连时重新获取
      refetchOnReconnect: true,
    },
    mutations: {
      // 变更失败时重试
      retry: 1,
    },
  },
});

export default queryClient;
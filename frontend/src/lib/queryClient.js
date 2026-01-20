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
      gcTime: 1000 * 60 * 30, // 30 分钟
      // 重试次数
      retry: (failureCount, error) => {
        // 对于 4xx 错误不重试
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // 对于 5xx 错误和网络错误最多重试 3 次
        return failureCount < 3;
      },
      // 重试延迟
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // 窗口聚焦时重新获取
      refetchOnWindowFocus: false,
      // 网络重连时重新获取
      refetchOnReconnect: true,
      // 组件挂载时重新获取
      refetchOnMount: true,
      // 后台重新获取间隔
      refetchInterval: false,
    },
    mutations: {
      // 变更失败时重试
      retry: (failureCount, error) => {
        // 对于 4xx 错误不重试
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

// 缓存键常量
export const queryKeys = {
  projects: ['projects'],
  project: (name) => ['project', name],
  sessions: (projectName) => ['sessions', projectName],
  sessionMessages: (projectName, sessionId) => 
    ['sessionMessages', projectName, sessionId],
  files: (projectName) => ['files', projectName],
  file: (projectName, filePath) => 
    ['file', projectName, filePath],
  gitStatus: (projectName) => ['gitStatus', projectName],
  ragResults: (projectName, query) => 
    ['ragResults', projectName, query],
};

// 缓存工具函数
export const cacheUtils = {
  // 使特定查询失效
  invalidateQueries: (key) => {
    queryClient.invalidateQueries({ queryKey: key });
  },

  // 预取数据
  prefetchQuery: async (key, queryFn) => {
    return queryClient.prefetchQuery({ queryKey: key, queryFn });
  },

  // 设置缓存数据
  setQueryData: (key, data) => {
    queryClient.setQueryData(key, data);
  },

  // 获取缓存数据
  getQueryData: (key) => {
    return queryClient.getQueryData(key);
  },

  // 清除所有缓存
  clear: () => {
    queryClient.clear();
  },
};

export default queryClient;
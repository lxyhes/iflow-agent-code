/**
 * useSessions.js - 会话管理 Hook
 *
 * 使用 React Query 管理会话数据
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedFetch } from '../utils/api';

// 获取项目的会话列表
export const useSessions = (projectId) => {
  return useQuery({
    queryKey: ['sessions', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const response = await authenticatedFetch(`/api/projects/${projectId}/sessions`);
      if (!response.ok) {
        throw new Error('获取会话列表失败');
      }
      const data = await response.json();
      return data.sessions || [];
    },
    enabled: !!projectId, // 只有当 projectId 存在时才执行查询
  });
};

// 获取会话详情
export const useSession = (projectId, sessionId) => {
  return useQuery({
    queryKey: ['session', projectId, sessionId],
    queryFn: async () => {
      if (!projectId || !sessionId) return null;
      const response = await authenticatedFetch(
        `/api/projects/${projectId}/sessions/${sessionId}`
      );
      if (!response.ok) {
        throw new Error('获取会话详情失败');
      }
      return response.json();
    },
    enabled: !!projectId && !!sessionId,
  });
};

// 创建会话
export const useCreateSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, title }) => {
      const response = await authenticatedFetch(`/api/projects/${projectId}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) {
        throw new Error('创建会话失败');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      // 重新获取会话列表
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.projectId] });
    },
  });
};

// 删除会话
export const useDeleteSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, sessionId }) => {
      const response = await authenticatedFetch(
        `/api/projects/${projectId}/sessions/${sessionId}`,
        {
          method: 'DELETE',
        }
      );
      if (!response.ok) {
        throw new Error('删除会话失败');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      // 重新获取会话列表
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.projectId] });
    },
  });
};

// 更新会话
export const useUpdateSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, sessionId, updates }) => {
      const response = await authenticatedFetch(
        `/api/projects/${projectId}/sessions/${sessionId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );
      if (!response.ok) {
        throw new Error('更新会话失败');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      // 重新获取会话列表
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.projectId] });
      // 重新获取会话详情
      queryClient.invalidateQueries({
        queryKey: ['session', variables.projectId, variables.sessionId],
      });
    },
  });
};
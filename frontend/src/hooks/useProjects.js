/**
 * useProjects.js - 项目管理 Hook
 *
 * 使用 React Query 管理项目数据
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedFetch } from '../utils/api';

// 获取项目列表
export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/projects');
      if (!response.ok) {
        throw new Error('获取项目列表失败');
      }
      return response.json();
    },
  });
};

// 创建项目
export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectData) => {
      const response = await authenticatedFetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });
      if (!response.ok) {
        throw new Error('创建项目失败');
      }
      return response.json();
    },
    onSuccess: () => {
      // 重新获取项目列表
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

// 删除项目
export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId) => {
      const response = await authenticatedFetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('删除项目失败');
      }
      return response.json();
    },
    onSuccess: () => {
      // 重新获取项目列表
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

// 更新项目
export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, updates }) => {
      const response = await authenticatedFetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error('更新项目失败');
      }
      return response.json();
    },
    onSuccess: () => {
      // 重新获取项目列表
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};
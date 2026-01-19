import { useState, useCallback } from 'react';
import { api } from '../utils/api';

/**
 * 项目管理 Hook
 *
 * 管理项目、会话和会话保护相关的状态和逻辑
 */
export const useProjectManagement = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // 会话保护系统：跟踪有活跃对话的会话
  const [activeSessions, setActiveSessions] = useState(new Set());

  // 处理会话：跟踪当前正在思考/处理的会话
  const [processingSessions, setProcessingSessions] = useState(new Set());

  // 外部消息更新触发器
  const [externalMessageUpdate, setExternalMessageUpdate] = useState(0);

  /**
   * 加载项目列表
   */
  const loadProjects = useCallback(async () => {
    try {
      setIsLoadingProjects(true);
      const response = await api.projects.list();
      const data = await response.json();
      setProjects(data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  /**
   * 标记会话为活跃状态
   */
  const markSessionActive = useCallback((sessionId) => {
    setActiveSessions(prev => new Set(prev).add(sessionId));
  }, []);

  /**
   * 取消会话活跃状态
   */
  const markSessionInactive = useCallback((sessionId) => {
    setActiveSessions(prev => {
      const newSet = new Set(prev);
      newSet.delete(sessionId);
      return newSet;
    });
  }, []);

  /**
   * 标记会话为处理中
   */
  const markSessionProcessing = useCallback((sessionId) => {
    setProcessingSessions(prev => new Set(prev).add(sessionId));
  }, []);

  /**
   * 取消会话处理状态
   */
  const markSessionComplete = useCallback((sessionId) => {
    setProcessingSessions(prev => {
      const newSet = new Set(prev);
      newSet.delete(sessionId);
      return newSet;
    });
  }, []);

  /**
   * 触发外部消息更新
   */
  const triggerExternalUpdate = useCallback(() => {
    setExternalMessageUpdate(prev => prev + 1);
  }, []);

  /**
   * 检查会话是否活跃
   */
  const isSessionActive = useCallback((sessionId) => {
    return activeSessions.has(sessionId);
  }, [activeSessions]);

  /**
   * 检查会话是否正在处理
   */
  const isSessionProcessing = useCallback((sessionId) => {
    return processingSessions.has(sessionId);
  }, [processingSessions]);

  return {
    // 状态
    projects,
    selectedProject,
    selectedSession,
    isLoadingProjects,
    activeSessions,
    processingSessions,
    externalMessageUpdate,

    // 设置器
    setProjects,
    setSelectedProject,
    setSelectedSession,

    // 方法
    loadProjects,
    markSessionActive,
    markSessionInactive,
    markSessionProcessing,
    markSessionComplete,
    triggerExternalUpdate,
    isSessionActive,
    isSessionProcessing,
  };
};
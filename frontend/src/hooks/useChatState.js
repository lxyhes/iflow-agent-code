﻿﻿﻿﻿/**
 * useChatState Hook
 * 管理聊天的核心状态
 */

import { useState, useCallback, useMemo } from 'react';
import { chatStorage, draftStorage } from '../utils/indexedDBStorage';
import { useChatHistory } from './useChatHistory';
import safeLocalStorage from '../utils/safeStorage';

export const useChatState = (selectedProject, selectedSession, messages) => {
  const [currentSessionId, setCurrentSessionId] = useState(selectedSession?.id || null);
  
  // 使用自定义 hook 管理聊天历史
  const [chatMessages, setChatMessages] = useChatHistory(selectedProject, selectedSession, currentSessionId, messages);

  const [isLoading, setIsLoading] = useState(false);
  const [canAbortSession, setCanAbortSession] = useState(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  // 连接状态
  const [connectionState, setConnectionState] = useState('connected');
  const [lastHeartbeat, setLastHeartbeat] = useState(Date.now());
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // IFlow 状态
  const [iflowStatus, setIflowStatus] = useState('idle');
  const [provider, setProvider] = useState(() => {
    return localStorage.getItem('selected-provider') || 'iflow';
  });

  // Token 预算
  const [tokenBudget, setTokenBudget] = useState(null);

  // 权限模式
  const [permissionMode, setPermissionMode] = useState('default');

  // 任务进度
  const [taskProgress, setTaskProgress] = useState(0);
  const [taskStatus, setTaskStatus] = useState('idle');
  const [currentTaskName, setCurrentTaskName] = useState('');
  const [taskSteps, setTaskSteps] = useState([]);

  // 通知
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // 搜索
  const [showSearch, setShowSearch] = useState(false);

  // 更多菜单
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // 拖拽上传
  const [isDragActive, setIsDragActive] = useState(false);
  const [attachedImages, setAttachedImages] = useState([]);

  // 高级功能状态
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandSearchTerm, setCommandSearchTerm] = useState('');
  const [showAutoFix, setShowAutoFix] = useState(false);
  const [autoFixError, setAutoFixError] = useState(null);
  const [showContextVisualizer, setShowContextVisualizer] = useState(false);

  // 可见消息数量
  const visibleMessageCount = 1000;

  // 同步外部 Session ID
  const syncSessionId = useCallback((sessionId) => {
    if (sessionId !== currentSessionId) {
      setCurrentSessionId(sessionId || null);
    }
  }, [currentSessionId]);

  // 清除聊天历史
  const clearChatHistory = useCallback(() => {
    setChatMessages([]);
    const sessionId = selectedSession?.id || currentSessionId || 'default';
    chatStorage.deleteMessages(sessionId);
    const messagesKey = `chat_messages_${sessionId}`;
    safeLocalStorage.removeItem(messagesKey);
  }, [selectedSession?.id, currentSessionId, setChatMessages]);

  // 添加用户消息
  const addUserMessage = useCallback((content, images = []) => {
    const userMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content,
      images,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    
    // 保存到 safeLocalStorage
    const sessionId = selectedSession?.id || currentSessionId || 'default';
    const messagesKey = `chat_messages_${sessionId}`;
    setTimeout(() => {
      safeLocalStorage.setItem(messagesKey, JSON.stringify([...chatMessages, userMessage]));
    }, 100);

    return userMessage;
  }, [chatMessages, currentSessionId, selectedSession?.id, setChatMessages]);

  // 添加错误消息
  const addErrorMessage = useCallback((error) => {
    setChatMessages(prev => [...prev, {
      type: 'error',
      content: `Error: ${error.toString()}`,
      timestamp: new Date()
    }]);
  }, [setChatMessages]);

  // 设置任务进度
  const setTaskProgressInfo = useCallback((progress, status, name) => {
    setTaskProgress(progress);
    setTaskStatus(status);
    if (name) setCurrentTaskName(name);
  }, []);

  // 切换通知显示
  const toggleNotifications = useCallback(() => {
    setShowNotifications(prev => !prev);
  }, []);

  // 清除所有通知
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadMessages(0);
  }, []);

  // 标记通知为已读
  const markNotificationAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  }, []);

  // 切换权限模式
  const handleModeSwitch = useCallback(() => {
    setPermissionMode(prev => {
      const modes = ['default', 'auto_edit', 'yolo', 'plan'];
      return modes[(modes.indexOf(prev) + 1) % modes.length];
    });
  }, []);

  // 获取可见消息（使用 useMemo 缓存结果）
  const visibleMessages = useMemo(() => {
    return chatMessages.length <= visibleMessageCount 
      ? chatMessages 
      : chatMessages.slice(-visibleMessageCount);
  }, [chatMessages, visibleMessageCount]);

  return {
    // 状态
    currentSessionId,
    chatMessages,
    isLoading,
    canAbortSession,
    isUserScrolledUp,
    connectionState,
    lastHeartbeat,
    reconnectAttempts,
    iflowStatus,
    provider,
    tokenBudget,
    permissionMode,
    taskProgress,
    taskStatus,
    currentTaskName,
    taskSteps,
    showNotifications,
    notifications,
    unreadMessages,
    showSearch,
    showMoreMenu,
    isDragActive,
    attachedImages,
    showCommandMenu,
    commandSearchTerm,
    showAutoFix,
    autoFixError,
    showContextVisualizer,
    
    // Setters
    setCurrentSessionId,
    setChatMessages,
    setIsLoading,
    setCanAbortSession,
    setIsUserScrolledUp,
    setConnectionState,
    setLastHeartbeat,
    setReconnectAttempts,
    setIflowStatus,
    setProvider,
    setTokenBudget,
    setPermissionMode,
    setTaskProgress,
    setTaskStatus,
    setCurrentTaskName,
    setTaskSteps,
    setShowNotifications,
    setNotifications,
    setUnreadMessages,
    setShowSearch,
    setShowMoreMenu,
    setIsDragActive,
    setAttachedImages,
    setShowCommandMenu,
    setCommandSearchTerm,
    setShowAutoFix,
    setAutoFixError,
    setShowContextVisualizer,
    
    // 方法
    syncSessionId,
    clearChatHistory,
    addUserMessage,
    addErrorMessage,
    setTaskProgressInfo,
    toggleNotifications,
    clearAllNotifications,
    markNotificationAsRead,
    handleModeSwitch,
    visibleMessages
  };
};

export default useChatState;
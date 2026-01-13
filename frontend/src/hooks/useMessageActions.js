/**
 * useMessageActions Hook
 * 处理消息操作（编辑、复制、删除、收藏、重新生成）
 */

import { useState, useCallback } from 'react';

export const useMessageActions = (chatMessages, setChatMessages, selectedProject, selectedSession, currentSessionId, sendMessage, permissionMode) => {
  // 消息编辑状态
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState(null);
  const [favoritedMessages, setFavoritedMessages] = useState(new Set());

  // 编辑消息
  const handleEditMessage = useCallback((messageId) => {
    const message = chatMessages.find(m => m.id === messageId);
    if (message) {
      setEditingMessageId(messageId);
      setEditingContent(message.content);
    }
  }, [chatMessages]);

  // 保存编辑
  const handleSaveEdit = useCallback((messageId) => {
    setChatMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        return { ...msg, content: editingContent, timestamp: new Date() };
      }
      return msg;
    }));
    setEditingMessageId(null);
    setEditingContent('');
  }, [editingContent, setChatMessages]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingContent('');
  }, []);

  // 重新生成消息
  const handleRegenerate = useCallback(async (messageId) => {
    const messageIndex = chatMessages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const message = chatMessages[messageIndex];
    if (message.type !== 'assistant') return;

    setRegeneratingMessageId(messageId);

    try {
      // 查找对应的用户消息
      let userMessage = null;
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (chatMessages[i].type === 'user') {
          userMessage = chatMessages[i];
          break;
        }
      }

      if (!userMessage) throw new Error('找不到对应的用户消息');

      // 删除原消息
      setChatMessages(prev => prev.filter(m => m.id !== messageId));

      // 重新发送
      sendMessage({
        type: 'message',
        content: userMessage.content,
        sessionId: selectedSession?.id || currentSessionId,
        projectName: selectedProject?.name,
        projectPath: selectedProject?.path || selectedProject?.fullPath,
        permissionMode: permissionMode,
        images: userMessage.images || []
      });
    } catch (error) {
      console.error('重新生成失败:', error);
    } finally {
      setRegeneratingMessageId(null);
    }
  }, [chatMessages, currentSessionId, selectedProject, sendMessage, permissionMode, selectedSession, setChatMessages]);

  // 复制消息
  const handleCopyMessage = useCallback(async (content, messageId) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  }, []);

  // 删除消息
  const handleDeleteMessage = useCallback((messageId) => {
    if (window.confirm('确定要删除这条消息吗？')) {
      setChatMessages(prev => prev.filter(m => m.id !== messageId));
    }
  }, [setChatMessages]);

  // 切换收藏
  const handleToggleFavorite = useCallback((messageId) => {
    setFavoritedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  }, []);

  // 创建 diff
  const createDiff = useCallback((oldText, newText) => {
    const oldLines = (oldText || '').split('\n');
    const newLines = (newText || '').split('\n');
    const diff = [];
    let i = 0, j = 0;
    
    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        diff.push({ type: 'unchanged', content: oldLines[i] });
        i++; j++;
      } else if (j < newLines.length && (i >= oldLines.length || oldLines.indexOf(newLines[j], i) === -1)) {
        diff.push({ type: 'added', content: newLines[j] });
        j++;
      } else if (i < oldLines.length) {
        diff.push({ type: 'removed', content: oldLines[i] });
        i++;
      }
    }
    
    return diff;
  }, []);

  return {
    // 状态
    editingMessageId,
    editingContent,
    copiedMessageId,
    regeneratingMessageId,
    favoritedMessages,
    
    // Setters
    setEditingContent,
    
    // 方法
    handleEditMessage,
    handleSaveEdit,
    handleCancelEdit,
    handleRegenerate,
    handleCopyMessage,
    handleDeleteMessage,
    handleToggleFavorite,
    createDiff
  };
};

export default useMessageActions;
/**
 * useChatSession.js - 聊天会话 Hook
 *
 * 管理会话状态、消息发送和接收
 */

import { useState, useCallback, useRef } from 'react';

export const useChatSession = ({
  ws,
  selectedProject,
  selectedSession,
  onSessionActive,
  onSessionInactive,
  onSessionProcessing,
  onSessionNotProcessing,
  onReplaceTemporarySession
}) => {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const sessionIdRef = useRef(null);

  // 发送消息
  const sendMessage = useCallback(async (input, files = []) => {
    if (!ws || !ws.current || !selectedProject) {
      console.error('WebSocket 未连接或未选择项目');
      return;
    }

    // 标记会话为活跃状态
    const sessionId = selectedSession?.id || `temp-${Date.now()}`;
    sessionIdRef.current = sessionId;

    if (onSessionActive) onSessionActive(sessionId);
    if (onSessionProcessing) onSessionProcessing(sessionId);

    setIsStreaming(true);
    setCurrentStreamingMessage('');

    try {
      // 创建用户消息
      const userMessage = {
        id: Date.now(),
        role: 'user',
        content: input,
        timestamp: new Date().toISOString(),
        files: files.map(f => f.name)
      };

      setMessages(prev => [...prev, userMessage]);

      // 发送到 WebSocket
      const messageData = {
        type: 'chat',
        sessionId: sessionId,
        message: input,
        project: selectedProject.name,
        files: files
      };

      ws.current.send(JSON.stringify(messageData));

    } catch (error) {
      console.error('发送消息失败:', error);
      setIsStreaming(false);
      setCurrentStreamingMessage('');
      if (onSessionNotProcessing) onSessionNotProcessing(sessionId);
    }
  }, [ws, selectedProject, selectedSession, onSessionActive, onSessionProcessing, onSessionNotProcessing]);

  // 处理流式响应
  const handleStreamChunk = useCallback((chunk) => {
    setCurrentStreamingMessage(prev => prev + chunk);
  }, []);

  // 完成流式响应
  const handleStreamComplete = useCallback(() => {
    if (currentStreamingMessage) {
      const assistantMessage = {
        id: Date.now(),
        role: 'assistant',
        content: currentStreamingMessage,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    }

    setIsStreaming(false);
    setCurrentStreamingMessage('');

    const sessionId = sessionIdRef.current;
    if (onSessionNotProcessing) onSessionNotProcessing(sessionId);
    if (onSessionInactive) onSessionInactive(sessionId);
  }, [currentStreamingMessage, onSessionNotProcessing, onSessionInactive]);

  // 加载历史消息
  const loadMessages = useCallback(async (sessionId) => {
    if (!sessionId || !selectedProject) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}/messages`);
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('加载消息失败:', error);
    }
  }, [selectedProject]);

  // 清空消息
  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentStreamingMessage('');
    setIsStreaming(false);
  }, []);

  return {
    messages,
    isStreaming,
    currentStreamingMessage,
    sendMessage,
    handleStreamChunk,
    handleStreamComplete,
    loadMessages,
    clearMessages
  };
};

export default useChatSession;
/**
 * useWebSocketHandler Hook
 * 处理 WebSocket 消息
 */

import { useEffect, useCallback, useRef } from 'react';

export const useWebSocketHandler = (ws, currentSessionId, setChatMessages, setIsLoading, setCanAbortSession, setTaskProgressInfo, setCurrentSessionId) => {
  // 使用 ref 来保存回调函数，避免依赖项变化导致重新订阅
  const handlersRef = useRef({
    setChatMessages,
    setIsLoading,
    setCanAbortSession,
    setTaskProgressInfo,
    setCurrentSessionId,
    currentSessionId
  });

  // 更新 ref
  useEffect(() => {
    handlersRef.current = {
      setChatMessages,
      setIsLoading,
      setCanAbortSession,
      setTaskProgressInfo,
      setCurrentSessionId,
      currentSessionId
    };
  }, [setChatMessages, setIsLoading, setCanAbortSession, setTaskProgressInfo, setCurrentSessionId, currentSessionId]);

  const handleMessage = useCallback((event) => {
    try {
      console.log('[useWebSocketHandler] Received message:', event.data);
      const data = JSON.parse(event.data);
      console.log('[useWebSocketHandler] Parsed data:', data);
      
      const { setChatMessages, setIsLoading, setCanAbortSession, setTaskProgressInfo, setCurrentSessionId, currentSessionId: currentId } = handlersRef.current;
      
      // 更新 Session ID
      if (data.sessionId && data.sessionId !== currentId) {
        console.log('[useWebSocketHandler] Updating session ID:', data.sessionId);
        setCurrentSessionId(data.sessionId);
      }

      switch (data.type || data.messageType) {
        case 'iflow-response':
          console.log('[useWebSocketHandler] Processing iflow-response');
          const messageData = data.data?.message || data.data;
          if (!messageData) {
            console.log('[useWebSocketHandler] No messageData in response');
            break;
          }
          
          if (messageData.type === 'content_block_delta' && messageData.delta?.text) {
            const decodedText = messageData.delta.text;
            console.log('[useWebSocketHandler] Content delta:', decodedText);
            setChatMessages(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.type === 'assistant' && last.isStreaming) {
                last.content = (last.content || '') + decodedText;
              } else {
                updated.push({
                  id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  type: 'assistant', 
                  content: decodedText, 
                  timestamp: new Date(), 
                  isStreaming: true
                });
              }
              return updated;
            });
          } else if (messageData.type === 'content_block_stop') {
            console.log('[useWebSocketHandler] Content block stopped');
            setChatMessages(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.isStreaming) last.isStreaming = false;
              return updated;
            });
          } else if (typeof messageData.content === 'string' && messageData.content.trim()) {
            console.log('[useWebSocketHandler] Simple content:', messageData.content);
            setChatMessages(prev => [...prev, {
              id: `msg-${Date.now()}`, 
              type: 'assistant', 
              content: messageData.content, 
              timestamp: new Date()
            }]);
          }
          break;
          
        case 'iflow-complete':
          console.log('[useWebSocketHandler] Flow completed');
          setIsLoading(false);
          setCanAbortSession(false);
          setTaskProgressInfo(100, 'completed', '任务完成');
          break;
          
        case 'iflow-error':
          console.log('[useWebSocketHandler] Flow error:', data.error);
          setIsLoading(false);
          setCanAbortSession(false);
          setChatMessages(prev => [...prev, { 
            type: 'error', 
            content: `Error: ${data.error || '发生未知错误'}`, 
            timestamp: new Date() 
          }]);
          break;
          
        case 'tool-call':
          console.log('[useWebSocketHandler] Tool call:', data.toolName);
          // 处理工具调用消息
          if (data.toolName && data.toolInput) {
            setChatMessages(prev => [...prev, {
              id: `msg-${Date.now()}`,
              type: 'tool',
              toolName: data.toolName,
              toolInput: data.toolInput,
              toolId: data.toolId,
              agentInfo: data.agentInfo,
              timestamp: new Date()
            }]);
          }
          break;
          
        case 'tool-result':
          console.log('[useWebSocketHandler] Tool result:', data.toolId);
          // 处理工具结果
          setChatMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.type === 'tool' && last.toolId === data.toolId) {
              last.toolResult = data.result;
              last.toolStatus = data.error ? 'failed' : 'success';
            }
            return updated;
          });
          break;
          
        default:
          console.log('[useWebSocketHandler] Unknown message type:', data.type || data.messageType);
      }
    } catch (e) {
      console.error('WS parse error:', e);
    }
  }, []); // 空依赖数组，使用 ref 来获取最新的回调

  useEffect(() => {
    if (!ws) return;

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, handleMessage]);
};

export default useWebSocketHandler;
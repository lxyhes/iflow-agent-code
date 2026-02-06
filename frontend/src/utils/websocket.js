import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket() {
  const [ws, setWs] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [lastHeartbeat, setLastHeartbeat] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const messageQueueRef = useRef([]);
  const wsRef = useRef(null);
  const isAIProcessingRef = useRef(false); // 使用 ref 代替 state

  const MAX_RECONNECT_ATTEMPTS = 10;
  const INITIAL_RECONNECT_DELAY = 1000;
  const MAX_RECONNECT_DELAY = 30000;
  const HEARTBEAT_INTERVAL = 15000; // 心跳间隔 15 秒
  const CONNECTION_TIMEOUT = 60000; // 连接超时 60 秒
  const AI_PROCESSING_HEARTBEAT = 5000; // AI 处理期间更频繁的心跳：5 秒

  const getReconnectDelay = useCallback((attempt) => {
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, attempt - 1),
      MAX_RECONNECT_DELAY
    );
    return delay + Math.random() * 1000;
  }, []);

  const processMessageQueue = useCallback((websocket) => {
    while (messageQueueRef.current.length > 0) {
      const message = messageQueueRef.current.shift();
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify(message));
      }
    }
  }, []);

  const sendHeartbeat = useCallback((websocket) => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      try {
        websocket.send(JSON.stringify({ 
          type: 'ping', 
          timestamp: Date.now(),
          aiProcessing: isAIProcessingRef.current // 使用 ref 获取状态
        }));
      } catch (error) {
        console.warn('Failed to send heartbeat:', error);
      }
    }
  }, []);

  const updateHeartbeatInterval = useCallback((websocket) => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // AI 处理期间使用更频繁的心跳
    const interval = isAIProcessingRef.current ? AI_PROCESSING_HEARTBEAT : HEARTBEAT_INTERVAL;
    heartbeatIntervalRef.current = setInterval(() => {
      sendHeartbeat(websocket);
    }, interval);
  }, [sendHeartbeat]);

  const connect = useCallback(async () => {
    try {
      setConnectionState('connecting');

      const isPlatform = import.meta.env.VITE_IS_PLATFORM === 'true';
      let wsUrl;

      if (isPlatform) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws`;
      } else {
        const token = localStorage.getItem('auth-token');
        if (!token) {
          console.warn('No authentication token found for WebSocket connection');
          setConnectionState('auth_failed');
          return;
        }
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;
      }

      const connectionTimeout = setTimeout(() => {
        setConnectionState('timeout');
      }, CONNECTION_TIMEOUT);

      const websocket = new WebSocket(wsUrl);
      wsRef.current = websocket;

      websocket.onopen = () => {
        clearTimeout(connectionTimeout);
        setIsConnected(true);
        setConnectionState('connected');
        setWs(websocket);
        reconnectAttemptsRef.current = 0;

        // 启动心跳机制
        updateHeartbeatInterval(websocket);

        processMessageQueue(websocket);
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'pong') {
            setLastHeartbeat(Date.now());
            return;
          }

          // 检测 AI 开始处理（流式响应开始）
          if (data.type === 'content' || data.type === 'tool_start' || data.type === 'thinking') {
            isAIProcessingRef.current = true; // 使用 ref 设置状态
            // 更新心跳频率
            if (wsRef.current) {
              updateHeartbeatInterval(wsRef.current);
            }
          }

          // 检测 AI 处理完成
          if (data.type === 'tool_end' || data.type === 'done' || data.type === 'error') {
            isAIProcessingRef.current = false; // 使用 ref 设置状态
            // 恢复正常心跳频率
            if (wsRef.current) {
              updateHeartbeatInterval(wsRef.current);
            }
          }

          setMessages(prev => {
            // 只保留最后 100 条消息，避免内存泄漏
            const updated = [...prev, data];
            if (updated.length > 100) {
              return updated.slice(-100);
            }
            return updated;
          });
        } catch (error) {
          console.warn('Failed to parse WebSocket message:', error);
        }
      };

      websocket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        setIsConnected(false);
        wsRef.current = null;

        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        if (event.code === 1000) {
          setConnectionState('closed');
          return;
        }

        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setConnectionState('max_attempts_reached');
          return;
        }

        setConnectionState('reconnecting');
        reconnectAttemptsRef.current += 1;

        const delay = getReconnectDelay(reconnectAttemptsRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      websocket.onerror = (error) => {
        console.warn('WebSocket error:', error);
        if (!wsRef.current) {
          setConnectionState('error');
        }
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionState('error');
    }
  }, [getReconnectDelay, sendHeartbeat, processMessageQueue]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message) => {
    if (ws && isConnected) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send message:', error);
        messageQueueRef.current.push(message);
      }
    } else {
      messageQueueRef.current.push(message);
    }
  }, [ws, isConnected]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
    }
    setIsConnected(false);
    setConnectionState('disconnected');
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    messageQueueRef.current = [];
    setTimeout(() => {
      connect();
    }, 100);
  }, [connect, disconnect]);

  return {
    ws,
    sendMessage,
    messages,
    isConnected,
    connectionState,
    lastHeartbeat,
    clearMessages,
    disconnect,
    reconnect,
    connectionStats: {
      reconnectAttempts: reconnectAttemptsRef.current,
      queuedMessages: messageQueueRef.current.length
    }
  };
}

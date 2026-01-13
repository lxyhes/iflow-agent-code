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

  const MAX_RECONNECT_ATTEMPTS = 10;
  const INITIAL_RECONNECT_DELAY = 1000;
  const MAX_RECONNECT_DELAY = 30000;
  const HEARTBEAT_INTERVAL = 30000;
  const CONNECTION_TIMEOUT = 10000;

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
        websocket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      } catch (error) {
        console.warn('Failed to send heartbeat:', error);
      }
    }
  }, []);

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

        heartbeatIntervalRef.current = setInterval(() => {
          sendHeartbeat(websocket);
        }, HEARTBEAT_INTERVAL);

        processMessageQueue(websocket);
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'pong') {
            setLastHeartbeat(Date.now());
            return;
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

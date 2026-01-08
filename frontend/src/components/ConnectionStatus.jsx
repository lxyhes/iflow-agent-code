import React, { memo, useMemo } from 'react';

const ConnectionStatus = memo(({ connectionState, lastHeartbeat, reconnectAttempts, onReconnect }) => {
  const statusConfig = useMemo(() => {
    switch (connectionState) {
      case 'connected':
        return {
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ),
          label: '已连接',
          color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
          pulse: false
        };
      case 'connecting':
        return {
          icon: (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ),
          label: '连接中...',
          color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
          pulse: true
        };
      case 'reconnecting':
        return {
          icon: (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ),
          label: `重连中... (${reconnectAttempts})`,
          color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
          pulse: true
        };
      case 'disconnected':
        return {
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ),
          label: '已断开',
          color: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
          pulse: false
        };
      case 'auth_failed':
        return {
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          ),
          label: '认证失败',
          color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
          pulse: false
        };
      case 'timeout':
        return {
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          ),
          label: '连接超时',
          color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
          pulse: false
        };
      case 'max_attempts_reached':
        return {
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ),
          label: '重连失败',
          color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
          pulse: false
        };
      case 'error':
        return {
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ),
          label: '连接错误',
          color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
          pulse: false
        };
      case 'closed':
        return {
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
            </svg>
          ),
          label: '已关闭',
          color: 'text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-500',
          pulse: false
        };
      default:
        return {
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          ),
          label: '未知状态',
          color: 'text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
          pulse: false
        };
    }
  }, [connectionState, reconnectAttempts]);

  const formatHeartbeat = (timestamp) => {
    if (!timestamp) return '无';
    const diff = Date.now() - timestamp;
    if (diff < 1000) return '刚刚';
    if (diff < 60000) return `${Math.floor(diff / 1000)}秒前`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    return new Date(timestamp).toLocaleTimeString();
  };

  const showReconnectButton = ['disconnected', 'error', 'timeout', 'max_attempts_reached'].includes(connectionState);

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${statusConfig.color} ${statusConfig.pulse ? 'animate-pulse' : ''}`}>
        <span className="flex-shrink-0">{statusConfig.icon}</span>
        <span className="truncate">{statusConfig.label}</span>
      </div>

      {lastHeartbeat && connectionState === 'connected' && (
        <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>心跳: {formatHeartbeat(lastHeartbeat)}</span>
        </div>
      )}

      {reconnectAttempts > 0 && connectionState !== 'connected' && (
        <div className="hidden sm:flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>重连 {reconnectAttempts} 次</span>
        </div>
      )}

      {showReconnectButton && onReconnect && (
        <button
          onClick={onReconnect}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          title="重新连接"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline">重连</span>
        </button>
      )}
    </div>
  );
});

ConnectionStatus.displayName = 'ConnectionStatus';

const ConnectionIndicator = memo(({ connectionState }) => {
  const colorMap = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500 animate-pulse',
    reconnecting: 'bg-orange-500 animate-pulse',
    disconnected: 'bg-gray-400',
    auth_failed: 'bg-red-500',
    timeout: 'bg-red-500',
    error: 'bg-red-500',
    max_attempts_reached: 'bg-red-500',
    closed: 'bg-gray-500'
  };

  return (
    <div className="relative">
      <div className={`w-2.5 h-2.5 rounded-full ${colorMap[connectionState] || 'bg-gray-400'} transition-colors duration-300`} />
      {['connecting', 'reconnecting'].includes(connectionState) && (
        <div className={`absolute inset-0 ${colorMap[connectionState]} rounded-full animate-ping opacity-75`} />
      )}
    </div>
  );
});

ConnectionIndicator.displayName = 'ConnectionIndicator';

export { ConnectionStatus, ConnectionIndicator };

export default ConnectionStatus;

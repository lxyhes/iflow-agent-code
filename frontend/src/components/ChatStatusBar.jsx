import React from 'react';
import IFlowStatus from './IFlowStatus';
import TokenUsagePie from './TokenUsagePie';
import ConnectionStatus from './ConnectionStatus';

/**
 * 状态栏组件
 * 显示连接状态、Token使用、模式切换等
 */
const ChatStatusBar = ({
  connectionState,
  lastHeartbeat,
  reconnectAttempts,
  onReconnect,
  iflowStatus,
  isLoading,
  provider,
  showThinking,
  tokenBudget,
  permissionMode,
  handleModeSwitch,
  taskProgress,
  taskStatus,
  currentTaskName,
  taskSteps,
  unreadMessages,
  showNotifications,
  setShowNotifications,
  notifications,
  toggleNotifications,
  clearAllNotifications,
  markNotificationAsRead,
  chatMessages,
  scrollContainerRef
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
      {/* 左侧：连接状态和 Token 使用 */}
      <div className="flex items-center gap-4">
        <ConnectionStatus
          connectionState={connectionState}
          lastHeartbeat={lastHeartbeat}
          reconnectAttempts={reconnectAttempts}
          onReconnect={onReconnect}
        />
        
        <IFlowStatus
          status={iflowStatus}
          isLoading={isLoading}
          provider={provider}
          showThinking={showThinking}
        />
        
        <TokenUsagePie
          used={tokenBudget?.used || 0}
          total={tokenBudget?.total || parseInt(import.meta.env.VITE_CONTEXT_WINDOW) || 160000}
        />
      </div>

      {/* 中间：模式切换 */}
      <button
        type="button"
        onClick={handleModeSwitch}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
          permissionMode === 'default'
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
            : permissionMode === 'acceptEdits'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-300 dark:border-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'
              : permissionMode === 'bypassPermissions'
                ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30'
        }`}
        title={
          permissionMode === 'default' ? '默认模式：需要手动确认所有操作' :
          permissionMode === 'acceptEdits' ? '接受编辑模式：自动接受文件编辑，其他操作需确认' :
          permissionMode === 'bypassPermissions' ? '绕过权限模式：自动执行所有操作（谨慎使用）' :
          '计划模式：只规划不执行，适合复杂任务'
        }
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            permissionMode === 'default'
              ? 'bg-gray-500'
              : permissionMode === 'acceptEdits'
                ? 'bg-green-500'
                : permissionMode === 'bypassPermissions'
                  ? 'bg-orange-500'
                  : 'bg-blue-500'
          }`} />
          <span>
            {permissionMode === 'default' && '默认模式'}
            {permissionMode === 'acceptEdits' && '接受编辑'}
            {permissionMode === 'bypassPermissions' && '绕过权限'}
            {permissionMode === 'plan' && '计划模式'}
          </span>
        </div>
      </button>

      {/* 右侧：通知和搜索 */}
      <div className="flex items-center gap-2">
        {/* 通知按钮 */}
        <button
          type="button"
          onClick={toggleNotifications}
          className="relative w-8 h-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:ring-offset-gray-800"
          title="通知"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center" style={{ fontSize: '10px' }}>
              {unreadMessages > 99 ? '99+' : unreadMessages}
            </span>
          )}
        </button>

        {/* 通知面板 */}
        {showNotifications && (
          <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">通知</h3>
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  清除全部
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">暂无通知</p>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationAsRead(notif.id);
                        if (notif.messageId) {
                          scrollContainerRef.current?.scrollToIndex({
                            index: chatMessages.findIndex(m => m.id === notif.messageId),
                            behavior: 'smooth'
                          });
                        }
                      }}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        notif.read 
                          ? 'bg-gray-50 dark:bg-gray-700/30 opacity-60' 
                          : 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          notif.type === 'success' ? 'bg-green-500' :
                          notif.type === 'error' ? 'bg-red-500' :
                          notif.type === 'info' ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {notif.title || '通知'}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {notif.message}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {new Date(notif.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatStatusBar;
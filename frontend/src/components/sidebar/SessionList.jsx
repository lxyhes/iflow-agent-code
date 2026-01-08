/**
 * SessionList.jsx - 会话列表组件
 *
 * 显示会话列表，支持选择和操作
 */

import React, { useState } from 'react';
import { MessageSquare, Plus, Search, MoreVertical, Trash2, Clock } from 'lucide-react';
import { Button, Input, Badge } from '../ui';

const SessionList = ({
  sessions,
  selectedSession,
  onSessionSelect,
  onSessionCreate,
  onSessionDelete,
  processingSessions
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMenu, setShowMenu] = useState(null);

  const filteredSessions = sessions.filter(session =>
    session.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.messages?.some(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedSessions = [...filteredSessions].sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  const handleMenuClick = (e, sessionId) => {
    e.stopPropagation();
    setShowMenu(showMenu === sessionId ? null : sessionId);
  };

  const handleDeleteSession = (e, session) => {
    e.stopPropagation();
    if (confirm(`确定要删除会话 "${session.title || '未命名'}" 吗？`)) {
      onSessionDelete(session);
      setShowMenu(null);
    }
  };

  const getSessionPreview = (session) => {
    if (!session.messages || session.messages.length === 0) return '空会话';
    const firstUserMessage = session.messages.find(m => m.role === 'user');
    return firstUserMessage?.content?.substring(0, 50) || '空会话';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-3">
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="搜索会话..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 创建新会话按钮 */}
      <Button
        onClick={onSessionCreate}
        className="w-full"
        variant="outline"
      >
        <Plus className="w-4 h-4 mr-2" />
        新建会话
      </Button>

      {/* 会话列表 */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {sortedSessions.map((session) => {
          const isProcessing = processingSessions?.includes(session.id);

          return (
            <div
              key={session.id}
              onClick={() => onSessionSelect(session)}
              className={`group relative p-3 rounded-lg border transition-all cursor-pointer ${
                selectedSession?.id === session.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {session.title || '未命名会话'}
                    </h3>
                    {isProcessing && (
                      <Badge variant="secondary" className="text-xs">
                        处理中
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {getSessionPreview(session)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(session.createdAt)}
                    </span>
                  </div>
                </div>

                {/* 操作菜单 */}
                <div className="relative">
                  <button
                    onClick={(e) => handleMenuClick(e, session.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {showMenu === session.id && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                      <button
                        onClick={(e) => handleDeleteSession(e, session)}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      >
                        <Trash2 className="w-3 h-3" />
                        删除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {sortedSessions.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>没有找到会话</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionList;
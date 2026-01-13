/**
 * CollaborationPanel.jsx - 协作面板组件
 * 显示在线协作者和实时协作信息
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Wifi, WifiOff, MessageSquare, Share2, UserPlus, MoreVertical } from 'lucide-react';
import collaborationService from '../services/collaborationService';

const CollaborationPanel = ({ visible, projectPath, projectName }) => {
  const [status, setStatus] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  // 模拟当前用户
  const currentUser = {
    id: 'user_1',
    name: '当前用户',
    avatar: '👤',
    color: '#3b82f6'
  };

  // 初始化协作服务
  useEffect(() => {
    if (!visible || !projectPath) return;

    // 连接到协作服务
    collaborationService.connect(projectPath, currentUser);

    // 监听事件
    const handleConnected = () => {
      setStatus('connected');
    };

    const handleDisconnected = () => {
      setStatus('disconnected');
    };

    const handleUserJoin = (user) => {
      setCollaborators(prev => [...prev, user]);
    };

    const handleUserLeave = (userId) => {
      setCollaborators(prev => prev.filter(u => u.id !== userId));
    };

    const handleChatMessage = (message) => {
      setChatMessages(prev => [...prev, message]);
    };

    // 注册事件监听器
    collaborationService.on('connected', handleConnected);
    collaborationService.on('disconnected', handleDisconnected);
    collaborationService.on('user_join', handleUserJoin);
    collaborationService.on('user_leave', handleUserLeave);
    collaborationService.on('chat_message', handleChatMessage);

    // 初始状态
    setStatus('connecting');
    setCollaborators([]);

    // 清理
    return () => {
      collaborationService.off('connected', handleConnected);
      collaborationService.off('disconnected', handleDisconnected);
      collaborationService.off('user_join', handleUserJoin);
      collaborationService.off('user_leave', handleUserLeave);
      collaborationService.off('chat_message', handleChatMessage);
    };
  }, [visible, projectPath]);

  // 更新状态
  useEffect(() => {
    const serviceStatus = collaborationService.getStatus();
    setStatus(serviceStatus.connected ? 'connected' : 'disconnected');
    setCollaborators(serviceStatus.collaborators);
  }, [visible]);

  // 发送消息
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim()) return;

    collaborationService.sendChatMessage(newMessage);
    setChatMessages(prev => [...prev, {
      user: currentUser,
      content: newMessage,
      timestamp: new Date()
    }]);
    setNewMessage('');
  }, [newMessage, currentUser]);

  // 复制邀请链接
  const handleCopyInviteLink = useCallback(() => {
    const inviteLink = `${window.location.origin}?project=${encodeURIComponent(projectPath)}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setShowInvite(false);
    });
  }, [projectPath]);

  if (!visible) return null;

  return (
    <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-4 space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === 'connected' ? (
            <Wifi className="w-5 h-5 text-green-400" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-400" />
          )}
          <h3 className="text-sm font-medium text-gray-200">实时协作</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="p-2 rounded-lg bg-gray-700/50 text-gray-400 hover:bg-gray-700 transition-colors"
            title="邀请协作者"
          >
            <UserPlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-2 rounded-lg transition-colors ${
              showChat
                ? 'bg-blue-600/20 text-blue-400'
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
            }`}
            title="聊天"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 邀请面板 */}
      {showInvite && (
        <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-200">邀请协作者</h4>
          <p className="text-xs text-gray-400">
            分享此链接邀请其他人加入协作：
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={`${window.location.origin}?project=${encodeURIComponent(projectPath)}`}
              readOnly
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-400"
            />
            <button
              onClick={handleCopyInviteLink}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              复制
            </button>
          </div>
        </div>
      )}

      {/* 在线协作者 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">在线协作者 ({collaborators.length + 1})</span>
        </div>
        
        {/* 当前用户 */}
        <div className="flex items-center gap-3 p-2 bg-gray-900/50 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
            <span className="text-sm">{currentUser.avatar}</span>
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-200">{currentUser.name}</div>
            <div className="text-xs text-gray-500">你</div>
          </div>
          <div className="w-2 h-2 bg-green-400 rounded-full" />
        </div>

        {/* 其他协作者 */}
        {collaborators.map((collaborator) => (
          <div
            key={collaborator.id}
            className="flex items-center gap-3 p-2 bg-gray-900/50 rounded-lg"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${collaborator.color}20` }}
            >
              <span className="text-sm">{collaborator.avatar || '👤'}</span>
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-200">{collaborator.name}</div>
              <div className="text-xs text-gray-500">
                {collaborator.joinedAt && `加入于 ${new Date(collaborator.joinedAt).toLocaleTimeString()}`}
              </div>
            </div>
            <div className="w-2 h-2 bg-green-400 rounded-full" />
          </div>
        ))}

        {collaborators.length === 0 && (
          <div className="text-center py-4 text-xs text-gray-500">
            暂无其他协作者
          </div>
        )}
      </div>

      {/* 聊天面板 */}
      {showChat && (
        <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-200">团队聊天</h4>
          
          {/* 消息列表 */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {chatMessages.length === 0 ? (
              <div className="text-center py-4 text-xs text-gray-500">
                开始聊天吧
              </div>
            ) : (
              chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-2 ${
                    message.user.id === currentUser.id ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div className="flex-shrink-0">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                      style={{ backgroundColor: `${message.user.color}20` }}
                    >
                      {message.user.avatar || '👤'}
                    </div>
                  </div>
                  <div className={`flex-1 ${
                    message.user.id === currentUser.id ? 'text-right' : ''
                  }`}>
                    <div className="text-xs text-gray-400 mb-1">
                      {message.user.name}
                    </div>
                    <div
                      className={`inline-block px-3 py-1.5 rounded-lg text-sm ${
                        message.user.id === currentUser.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 输入框 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="输入消息..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              发送
            </button>
          </div>
        </div>
      )}

      {/* 状态指示 */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• 状态: {status === 'connected' ? '已连接' : status === 'connecting' ? '连接中...' : '未连接'}</p>
        <p>• 项目: {projectName || '未选择'}</p>
      </div>
    </div>
  );
};

export default CollaborationPanel;
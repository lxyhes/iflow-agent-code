/**
 * User Message Component
 * 用户消息气泡组件
 */

import React, { useState } from 'react';
import { formatRelativeTime, formatTime } from '../../utils/timeFormat';

const UserMessage = ({ 
  message, 
  isGrouped,
  onCopyMessage,
  onEditMessage,
  onDeleteMessage,
  onRegenerate,
  editingMessageId,
  editingContent,
  setEditingContent,
  handleSaveEdit,
  handleCancelEdit,
  copiedMessageId,
  isLoading
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const isEditing = editingMessageId === message.id;

  return (
    <div className={`flex w-full justify-end gap-3 pl-12 pr-4 ${isGrouped ? 'mb-2' : 'mb-6'} group relative`}>
      <div className="flex flex-col items-end flex-1 min-w-0">
        {!isGrouped && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">You</span>
            <span 
              className="text-[11px] text-gray-400 dark:text-gray-500 font-medium cursor-help"
              title={new Date(message.timestamp).toLocaleString()}
            >
              {formatRelativeTime(message.timestamp)}
            </span>
          </div>
        )}
        
        <div className="relative">
          {/* 编辑状态 */}
          {isEditing ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tr-sm shadow-lg p-3 w-full max-w-2xl">
              <textarea
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none text-sm"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 mt-2 justify-end">
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          ) : (
            <div 
              className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white rounded-2xl rounded-tr-sm px-5 py-3 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <div className="text-[15px] whitespace-pre-wrap break-words leading-relaxed font-normal">
                {message.content}
              </div>
              {message.images && message.images.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {message.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img.data}
                      alt={img.name}
                      className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity border border-white/20 hover:border-white/40"
                      onClick={() => window.open(img.data, '_blank')}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Token 使用量 */}
          {message.content && (
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>~{Math.ceil((message.content?.length || 0) / 4)} tokens</span>
            </div>
          )}

          {/* 操作菜单按钮 */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="absolute -left-10 top-2 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {/* 操作菜单 */}
          {showMenu && (
            <div className="absolute -left-32 top-0 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1 min-w-[120px] z-50">
              <button
                onClick={() => {
                  onCopyMessage(message.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                复制
              </button>
              <button
                onClick={() => {
                  onEditMessage(message.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                编辑
              </button>
              <button
                onClick={() => {
                  onRegenerate(message.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                重新生成
              </button>
              <button
                onClick={() => {
                  onDeleteMessage(message.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 011-1h2a1 1 0 011 1v3M4 7h16" />
                </svg>
                删除
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* User Avatar - Fixed on the right */}
      <div className="flex-shrink-0 mt-0.5">
        {!isGrouped ? (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-blue-500/20 ring-2 ring-blue-400/30">
            U
          </div>
        ) : (
          <div className="w-8" /> /* Spacer for grouped messages */
        )}
      </div>
    </div>
  );
};

export default UserMessage;
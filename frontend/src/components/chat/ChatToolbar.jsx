/**
 * ChatToolbar Component
 * 聊天工具栏组件
 */

import React from 'react';

const ChatToolbar = ({
  showMoreMenu,
  setShowMoreMenu,
  onShowDeveloperTools
}) => {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setShowMoreMenu(!showMoreMenu)}
        className="w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-all"
        title="More options"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>
    </div>
  );
};

export default ChatToolbar;
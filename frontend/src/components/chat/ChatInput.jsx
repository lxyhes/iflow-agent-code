/**
 * ChatInput Component
 * 聊天输入框组件 - 现代化 Glassmorphism 设计
 */

import React from 'react';

const ChatInput = ({
  input,
  isLoading,
  textareaRef,
  getRootProps,
  getInputProps,
  handleInputChange,
  handleKeyDown,
  handlePaste,
  handleSubmit,
  isInputFocused,
  setIsInputFocused,
  provider
}) => {
  return (
    <div className="flex-shrink-0 p-4">
      <div className="flex items-center gap-3 w-full">
        <form onSubmit={(e) => handleSubmit(e)} className="flex-1 relative">
          <div
            {...getRootProps()}
            className={`relative backdrop-blur-xl rounded-2xl border transition-all duration-300 overflow-hidden group ${
              isInputFocused
                ? 'bg-white/80 dark:bg-gray-800/80 border-blue-400/50 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20'
                : 'bg-white/60 dark:bg-gray-800/60 border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md hover:border-blue-300/30'
            }`}
          >
            <input {...getInputProps()} />

            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              placeholder={`Ask ${provider === 'cursor' ? 'Cursor' : 'IFlow'} anything...`}
              disabled={isLoading}
              className="block w-full px-4 py-3 bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 disabled:opacity-50 resize-none min-h-[60px] max-h-[400px] placeholder-gray-400 dark:placeholder-gray-500"
            />

            {/* 拖拽上传提示 */}
            <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 dark:bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                Drop files here to upload
              </div>
            </div>

            {/* 发送按钮 */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`absolute right-2 bottom-2 w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all duration-300 ${
                !input.trim() || isLoading
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-105 active:scale-95'
              }`}
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>

            {/* 装饰性渐变边框 */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500 pointer-events-none" />
          </div>

          {/* 底部提示 */}
          <div className="flex items-center justify-between mt-2 px-2 text-xs text-gray-400 dark:text-gray-500">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-medium">Enter</kbd>
                <span>发送</span>
              </span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-medium">Shift + Enter</kbd>
                <span>换行</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>支持拖拽上传</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInput;
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
  attachedImages,
  removeAttachedImage,
  provider
}) => {
  return (
    <div className="flex-1">
      <form onSubmit={(e) => handleSubmit(e)} className="relative">
        <div
          {...getRootProps()}
          className={`relative backdrop-blur-xl rounded-2xl border transition-all duration-300 overflow-hidden group ${
            isInputFocused
              ? 'bg-white/80 dark:bg-gray-800/80 border-blue-400/50 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20'
              : 'bg-white/60 dark:bg-gray-800/60 border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md hover:border-blue-300/30'
          }`}
        >
          <input {...getInputProps()} />

          {/* 图片预览区域 */}
          {attachedImages && attachedImages.length > 0 && (
            <div className="px-4 pt-3 pb-2 flex flex-wrap gap-2 border-b border-gray-200/50 dark:border-gray-700/50">
              {attachedImages.map((img, idx) => (
                <div key={idx} className="relative group/img">
                  <img
                    src={img.data}
                    alt={img.name || `Image ${idx + 1}`}
                    className="h-16 w-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachedImage(idx)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity shadow-md"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

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
        </div>

        {/* 底部提示 */}
        <div className="flex items-center justify-between mt-2 px-2 text-xs text-gray-400 dark:text-gray-500">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-medium">Enter</kbd>
              <span>发送</span>
            </span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-medium">Shift + Enter</kbd>
              <span>换行</span>
            </span>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;
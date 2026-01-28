/**
 * ChatInput Component
 * 聊天输入框组件 - 现代化 Glassmorphism 设计
 * 
 * 优化功能：
 * - Token 用量提示
 * - 输入字数统计
 * - 智能提示
 * - @ 提及功能
 */

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import MentionPicker from './MentionPicker';

// 简单估算 Token 数
const estimateTokens = (text) => {
  if (!text) return 0;
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  const otherChars = text.length - chineseChars - englishWords;
  return Math.ceil(chineseChars * 1.5 + englishWords * 1.3 + otherChars * 0.5);
};

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
  provider,
  // Token 用量相关 props（可选）
  tokenUsage = null,
  // @ 提及相关 props
  projectFiles = []
}) => {
  // 计算输入框当前 Token 数
  const inputTokens = useMemo(() => estimateTokens(input), [input]);
  const inputLength = input.length;
  
  // Token 进度条颜色
  const getTokenBarColor = (percent) => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  // @ 提及功能状态
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState('');
  const [mentionCursorPosition, setMentionCursorPosition] = useState(0);
  const mentionStartIndexRef = useRef(-1);
  
  // 检测 @ 提及
  const detectMention = useCallback((value, cursorPos) => {
    // 查找光标前的 @
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) {
      setShowMentionPicker(false);
      return;
    }
    
    // 检查 @ 后是否有空格或换行（如果有，说明已经选择了）
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
      setShowMentionPicker(false);
      return;
    }
    
    // 显示提及选择器
    mentionStartIndexRef.current = lastAtIndex;
    setMentionSearchTerm(textAfterAt);
    setMentionCursorPosition(cursorPos);
    setShowMentionPicker(true);
  }, []);
  
  // 处理输入变化（包装原有的 handleInputChange）
  const handleInputChangeWithMention = useCallback((e) => {
    const { value, selectionStart } = e.target;
    
    // 调用原有的处理函数
    handleInputChange(e);
    
    // 检测 @ 提及
    detectMention(value, selectionStart);
  }, [handleInputChange, detectMention]);
  
  // 处理选择文件
  const handleSelectMention = useCallback((filePath) => {
    if (mentionStartIndexRef.current === -1) return;
    
    const beforeMention = input.substring(0, mentionStartIndexRef.current);
    const afterMention = input.substring(mentionCursorPosition);
    const newValue = `${beforeMention}@${filePath} ${afterMention}`;
    
    // 创建合成事件对象
    const syntheticEvent = {
      target: {
        value: newValue
      }
    };
    
    handleInputChange(syntheticEvent);
    setShowMentionPicker(false);
    mentionStartIndexRef.current = -1;
    
    // 聚焦回输入框
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }, [input, mentionCursorPosition, handleInputChange, textareaRef]);
  
  // 关闭提及选择器
  const handleCloseMention = useCallback(() => {
    setShowMentionPicker(false);
    mentionStartIndexRef.current = -1;
  }, []);
  
  return (
    <div className="flex-1">
      {/* Token 用量提示条 */}
      {tokenUsage && (
        <div className="mb-2 px-1">
          <div className="flex items-center justify-between text-xs mb-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">
                上下文: {tokenUsage.totalTokens.toLocaleString()} / {tokenUsage.contextLimit.toLocaleString()} tokens
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                tokenUsage.usagePercent >= 90 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                tokenUsage.usagePercent >= 70 ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {tokenUsage.statusText}
              </span>
            </div>
            <span className="text-gray-400 dark:text-gray-500">
              本次输入: ~{inputTokens} tokens
            </span>
          </div>
          {/* 进度条 */}
          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${getTokenBarColor(tokenUsage.usagePercent)}`}
              style={{ width: `${Math.min(100, tokenUsage.usagePercent)}%` }}
            />
          </div>
        </div>
      )}
      
      <form onSubmit={(e) => handleSubmit(e)} className="relative">
        {/* @ 提及选择器 */}
        <MentionPicker
          isOpen={showMentionPicker}
          onClose={handleCloseMention}
          onSelect={handleSelectMention}
          searchTerm={mentionSearchTerm}
          projectFiles={projectFiles}
        />
        
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
            onChange={handleInputChangeWithMention}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            placeholder={`Ask ${provider === 'cursor' ? 'Cursor' : 'IFlow'} anything... 输入 @ 引用文件`}
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
          
          {/* 字数统计 */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 dark:text-gray-500">
              {inputLength.toLocaleString()} 字符
              {inputTokens > 0 && (
                <span className="text-gray-300 dark:text-gray-600 ml-1">
                  (~{inputTokens} tokens)
                </span>
              )}
            </span>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;
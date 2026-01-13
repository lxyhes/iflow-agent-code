/**
 * InputArea.jsx - 输入区域组件
 *
 * 包含输入框、文件上传、语音输入等功能
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import MicButton from '../MicButton.jsx';

const InputArea = ({
  input,
  setInput,
  onSend,
  onFileUpload,
  onVoiceInput,
  onFocusChange,
  sendByCtrlEnter,
  disabled = false,
  placeholder = "输入消息..."
}) => {
  const [attachedFiles, setAttachedFiles] = useState([]);
  const inputRef = useRef(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      setAttachedFiles([...attachedFiles, ...acceptedFiles]);
      if (onFileUpload) {
        onFileUpload(acceptedFiles);
      }
    },
    noClick: true,
    noKeyboard: true
  });

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (sendByCtrlEnter) {
        if (e.ctrlKey) {
          e.preventDefault();
          handleSend();
        }
      } else {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const handleSend = () => {
    if (!input.trim() && attachedFiles.length === 0) return;

    onSend(input, attachedFiles);
    setInput('');
    setAttachedFiles([]);

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleRemoveFile = (index) => {
    const newFiles = attachedFiles.filter((_, i) => i !== index);
    setAttachedFiles(newFiles);
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div {...getRootProps()} className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
      <input {...getInputProps()} />

      {/* 拖拽上传提示 */}
      {isDragActive && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-50">
          <p className="text-blue-500 font-medium">释放以上传文件</p>
        </div>
      )}

      {/* 附件列表 */}
      {attachedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-1.5"
            >
              <Paperclip className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                {file.name}
              </span>
              <button
                onClick={() => handleRemoveFile(index)}
                className="text-gray-500 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 输入框 */}
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => onFocusChange && onFocusChange(true)}
            onBlur={() => onFocusChange && onFocusChange(false)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full min-h-[60px] max-h-[200px] px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
          />
        </div>

        {/* 工具按钮 */}
        <div className="flex items-center gap-2">
          {/* 文件上传按钮 */}
          <button
            onClick={() => document.querySelector('input[type="file"]').click()}
            disabled={disabled}
            className="p-3 text-gray-500 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="上传文件"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* 语音输入按钮 */}
          {onVoiceInput && (
            <MicButton
              onTranscript={(text) => setInput(input + ' ' + text)}
              disabled={disabled}
            />
          )}

          {/* 发送按钮 */}
          <button
            onClick={handleSend}
            disabled={disabled || (!input.trim() && attachedFiles.length === 0)}
            className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="发送"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 提示文本 */}
      <div className="mt-2 text-xs text-gray-400">
        {sendByCtrlEnter ? 'Ctrl + Enter 发送' : 'Enter 发送，Shift + Enter 换行'}
      </div>
    </div>
  );
};

export default React.memo(InputArea);
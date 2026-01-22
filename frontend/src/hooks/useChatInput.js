/**
 * useChatInput Hook
 * 管理输入框的状态和逻辑
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import safeLocalStorage from '../utils/safeStorage';
import { scopedKey } from '../utils/projectScope';

export const useChatInput = (selectedProject, selectedSession, currentSessionId, isLoading, sendByCtrlEnter, onSubmit) => {
  const [input, setInput] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isTextareaExpanded, setIsTextareaExpanded] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [attachedImages, setAttachedImages] = useState([]);
  
  const textareaRef = useRef(null);

  // 加载草稿
  useEffect(() => {
    if (selectedProject) {
      const sessionId = selectedSession?.id || currentSessionId || 'default';
      const draftKey = scopedKey(selectedProject, `draft_input_${sessionId}`);
      const savedDraft = safeLocalStorage.getItem(draftKey);
      if (savedDraft) setInput(savedDraft);
    }
  }, [selectedProject, selectedSession?.id, currentSessionId]);

  // 保存草稿
  useEffect(() => {
    if (selectedProject && input) {
      const sessionId = selectedSession?.id || currentSessionId || 'default';
      const draftKey = scopedKey(selectedProject, `draft_input_${sessionId}`);
      const timer = setTimeout(() => safeLocalStorage.setItem(draftKey, input), 1000);
      return () => clearTimeout(timer);
    }
  }, [input, selectedProject, selectedSession?.id, currentSessionId]);

  // 自动调整 textarea 高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
      const isExpanded = textareaRef.current.scrollHeight > 48;
      setIsTextareaExpanded(isExpanded);
    }
  }, [input]);

  // 拖拽上传
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      const validFiles = acceptedFiles.filter(f => 
        f.type?.startsWith('image/') && f.size <= 5 * 1024 * 1024
      );
      if (validFiles.length > 0) {
        setAttachedImages(prev => [...prev, ...validFiles].slice(0, 5));
      }
    },
    noClick: true, 
    noKeyboard: true
  });

  // 处理输入变化
  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value;
    setInput(newValue);
    setCursorPosition(e.target.selectionStart);
  }, []);

  // 提交消息
  const handleSubmit = useCallback((e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const messageContent = input.trim();
    setInput('');
    setAttachedImages([]);

    onSubmit(messageContent, attachedImages);
  }, [input, isLoading, attachedImages, onSubmit]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e) => {
    if (e.nativeEvent.isComposing) return;
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      // 触发搜索
      return;
    }
    
    if (e.key === 'Enter') {
      const isCommand = input.trim().startsWith('/');
      const shouldSend = isCommand
        ? !e.shiftKey
        : (sendByCtrlEnter ? (e.ctrlKey || e.metaKey) : !e.shiftKey);

      if (shouldSend) {
        e.preventDefault();
        handleSubmit();
      }
      return;
    }
    
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      // 触发模式切换
      return;
    }
    
    if (e.key === 'Escape') {
      // 关闭菜单
      return;
    }
  }, [input, sendByCtrlEnter, handleSubmit]);

  // 处理粘贴
  const handlePaste = useCallback((e) => {
    const items = Array.from(e.clipboardData.items);
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => setAttachedImages(prev => 
            [...prev, { 
              name: file.name, 
              type: file.type, 
              data: ev.target.result 
            }].slice(0, 5)
          );
          reader.readAsDataURL(file);
        }
      }
    }
  }, []);

  // 清空输入
  const clearInput = useCallback(() => {
    setInput('');
    setAttachedImages([]);
  }, []);

  // 移除附加图片
  const removeAttachedImage = useCallback((index) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  return {
    // 状态
    input,
    isInputFocused,
    isTextareaExpanded,
    cursorPosition,
    attachedImages,
    textareaRef,
    
    // Setters
    setInput,
    setIsInputFocused,
    setCursorPosition,
    setAttachedImages,
    
    // 方法
    getRootProps,
    getInputProps,
    handleInputChange,
    handleKeyDown,
    handlePaste,
    handleSubmit,
    clearInput,
    removeAttachedImage
  };
};

export default useChatInput;

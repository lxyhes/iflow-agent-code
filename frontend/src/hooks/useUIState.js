import { useState, useCallback, useEffect } from 'react';
import useLocalStorage from './useLocalStorage';

/**
 * UI 状态管理 Hook
 *
 * 管理 UI 相关的状态，如侧边栏、设置面板、命令面板等
 */
export const useUIState = () => {
  // 基础 UI 状态
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'files'
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  // 设置面板
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('tools');
  const [showQuickSettings, setShowQuickSettings] = useState(false);

  // 命令面板
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // 版本更新
  const [showVersionModal, setShowVersionModal] = useState(false);

  // 本地存储的 UI 设置
  const [autoExpandTools, setAutoExpandTools] = useLocalStorage('autoExpandTools', false);
  const [showRawParameters, setShowRawParameters] = useLocalStorage('showRawParameters', false);
  const [showThinking, setShowThinking] = useLocalStorage('showThinking', true);
  const [autoScrollToBottom, setAutoScrollToBottom] = useLocalStorage('autoScrollToBottom', true);
  const [sendByCtrlEnter, setSendByCtrlEnter] = useLocalStorage('sendByCtrlEnter', false);
  const [sidebarVisible, setSidebarVisible] = useLocalStorage('sidebarVisible', true);

  // 检测是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 检测是否为 PWA
  useEffect(() => {
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone ||
        document.referrer.includes('android-app://');
      setIsPWA(isStandalone);

      // 添加 CSS 类
      if (isStandalone) {
        document.documentElement.classList.add('pwa-mode');
        document.body.classList.add('pwa-mode');
      } else {
        document.documentElement.classList.remove('pwa-mode');
        document.body.classList.remove('pwa-mode');
      }
    };

    checkPWA();

    // 添加触摸事件监听器（防止 iOS 双击缩放）
    document.addEventListener('touchstart', {}, { passive: true });
  }, []);

  // 命令面板快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /**
   * 切换侧边栏
   */
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  /**
   * 打开设置面板
   */
  const openSettings = useCallback((tab = 'tools') => {
    setSettingsInitialTab(tab);
    setShowSettings(true);
  }, []);

  /**
   * 关闭设置面板
   */
  const closeSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  /**
   * 切换快速设置面板
   */
  const toggleQuickSettings = useCallback(() => {
    setShowQuickSettings(prev => !prev);
  }, []);

  /**
   * 切换命令面板
   */
  const toggleCommandPalette = useCallback(() => {
    setShowCommandPalette(prev => !prev);
  }, []);

  return {
    // 状态
    activeTab,
    isMobile,
    sidebarOpen,
    isInputFocused,
    isPWA,
    showSettings,
    settingsInitialTab,
    showQuickSettings,
    showCommandPalette,
    showVersionModal,
    autoExpandTools,
    showRawParameters,
    showThinking,
    autoScrollToBottom,
    sendByCtrlEnter,
    sidebarVisible,

    // 设置器
    setActiveTab,
    setIsMobile,
    setSidebarOpen,
    setIsInputFocused,
    setShowSettings,
    setShowQuickSettings,
    setShowCommandPalette,
    setShowVersionModal,
    setAutoExpandTools,
    setShowRawParameters,
    setShowThinking,
    setAutoScrollToBottom,
    setSendByCtrlEnter,
    setSidebarVisible,

    // 方法
    toggleSidebar,
    openSettings,
    closeSettings,
    toggleQuickSettings,
    toggleCommandPalette,
  };
};
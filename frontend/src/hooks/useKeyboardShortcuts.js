/**
 * useKeyboardShortcuts Hook
 * 管理键盘快捷键
 */

import { useEffect, useCallback } from 'react';

export const useKeyboardShortcuts = ({
  isLoading,
  canAbortSession,
  onAbortSession,
  onOpenSearch,
  onCloseSearch,
  isSearchOpen
}) => {
  const handleGlobalKeyDown = useCallback((e) => {
    // ESC 键
    if (e.key === 'Escape') {
      if (isSearchOpen) {
        e.preventDefault();
        onCloseSearch();
      } else if (isLoading && canAbortSession) {
        e.preventDefault();
        console.log('ESC pressed, aborting session...');
        onAbortSession();
      }
    }

    // Ctrl/Cmd + K - 打开搜索
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (!isSearchOpen) {
        onOpenSearch();
      } else {
        onCloseSearch();
      }
    }

    // Ctrl/Cmd + / - 打开命令菜单
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      // TODO: 打开命令菜单
    }
  }, [isLoading, canAbortSession, onAbortSession, onOpenSearch, onCloseSearch, isSearchOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);
};

export default useKeyboardShortcuts;
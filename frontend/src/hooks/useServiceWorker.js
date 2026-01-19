import { useEffect, useState, useCallback } from 'react';

/**
 * Service Worker Hook
 *
 * 管理 Service Worker 的注册、更新和状态
 */
export const useServiceWorker = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [swSupported, setSwSupported] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [swRegistration, setSwRegistration] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // 检查是否支持 Service Worker
    if ('serviceWorker' in navigator) {
      setSwSupported(true);

      // 注册 Service Worker
      registerSW();

      // 监听网络状态
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const registerSW = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[SW] Service Worker registered:', registration);
      setSwRegistration(registration);
      setSwReady(true);

      // 监听更新
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[SW] New Service Worker found');

        newWorker.addEventListener('statechange', () => {
          console.log('[SW] New Service Worker state:', newWorker.state);

          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
            console.log('[SW] New content is available; please refresh.');
          }
        });
      });

      // 监听控制器变化
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Controller changed');
        window.location.reload();
      });
    } catch (error) {
      console.error('[SW] Service Worker registration failed:', error);
    }
  };

  const handleOnline = () => {
    setIsOnline(true);
    console.log('[SW] Network online');
  };

  const handleOffline = () => {
    setIsOnline(false);
    console.log('[SW] Network offline');
  };

  /**
   * 跳过等待并激活新的 Service Worker
   */
  const skipWaiting = useCallback(() => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [swRegistration]);

  /**
   * 清除所有缓存
   */
  const clearCache = useCallback(async () => {
    if (swRegistration && swRegistration.active) {
      swRegistration.active.postMessage({ type: 'CLEAR_CACHE' });
    }
  }, [swRegistration]);

  /**
   * 手动触发同步
   */
  const triggerSync = useCallback(async () => {
    if (swRegistration && swRegistration.sync) {
      await swRegistration.sync.register('sync-projects');
    }
  }, [swRegistration]);

  return {
    // 状态
    isOnline,
    swSupported,
    swReady,
    updateAvailable,

    // 方法
    skipWaiting,
    clearCache,
    triggerSync,
  };
};
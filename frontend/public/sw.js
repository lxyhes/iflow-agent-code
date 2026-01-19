/**
 * Service Worker for iFlow Agent
 *
 * 提供离线支持和缓存功能
 */

const CACHE_NAME = 'iflow-agent-v1';
const STATIC_CACHE = 'iflow-static-v1';
const API_CACHE = 'iflow-api-v1';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
  // 添加其他需要缓存的静态资源
];

// 需要缓存的 API 端点
const CACHEABLE_APIS = [
  '/api/auth/status',
  '/api/config',
  '/api/projects',
];

/**
 * 安装 Service Worker
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');

  event.waitUntil(
    Promise.all([
      // 缓存静态资源
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // 预缓存 API 响应
      caches.open(API_CACHE).then((cache) => {
        console.log('[SW] Pre-caching API responses');
        return Promise.all(
          CACHEABLE_APIS.map((url) =>
            fetch(url).then((response) => {
              if (!response.ok) throw new Error(`Failed to cache ${url}`);
              return cache.put(url, response.clone());
            }).catch((err) => {
              console.warn(`[SW] Failed to pre-cache ${url}:`, err);
            })
          )
        );
      }),
    ])
  );

  // 立即激活新的 Service Worker
  self.skipWaiting();
});

/**
 * 激活 Service Worker
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');

  event.waitUntil(
    Promise.all([
      // 清理旧缓存
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return (
                cacheName !== STATIC_CACHE &&
                cacheName !== API_CACHE &&
                cacheName !== CACHE_NAME
              );
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // 立即控制所有客户端
      self.clients.claim(),
    ])
  );
});

/**
 * 拦截网络请求
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源请求
  if (url.origin !== self.location.origin) {
    return;
  }

  // 处理静态资源请求
  if (request.method === 'GET' && STATIC_ASSETS.some((asset) => url.pathname === asset)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', request.url);
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          // 缓存新的响应
          const responseToCache = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        });
      })
    );
    return;
  }

  // 处理 API 请求
  if (request.method === 'GET' && url.pathname.startsWith('/api/')) {
    // 检查是否为可缓存的 API
    const isCacheable = CACHEABLE_APIS.some((api) => url.pathname === api);

    if (isCacheable) {
      event.respondWith(
        caches.match(request).then((cachedResponse) => {
          // 先返回缓存，然后后台更新
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              const responseToCache = networkResponse.clone();
              caches.open(API_CACHE).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          });

          return cachedResponse || fetchPromise;
        })
      );
      return;
    }
  }

  // 其他请求直接通过网络
  event.respondWith(fetch(request));
});

/**
 * 处理消息
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

/**
 * 后台同步
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-projects') {
    event.waitUntil(
      fetch('/api/projects')
        .then((response) => response.json())
        .then((data) => {
          console.log('[SW] Projects synced:', data);
        })
        .catch((error) => {
          console.error('[SW] Sync failed:', error);
        })
    );
  }
});

/**
 * 推送通知
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };

  event.waitUntil(
    self.registration.showNotification('iFlow Agent', options)
  );
});

/**
 * 通知点击
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  event.waitUntil(
    self.clients.openWindow('/')
  );
});
// Autoshine Service Worker for Offline Assets & Native Push / Notifications
const CACHE_NAME = 'autoshine-v2';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/autoshine_logo.jpg',
  '/robots.txt'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Precache notice:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Purge any stale caches from previous versions to conserve client storage footprint
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Cache strategy: Stale-While-Revalidate for static assets, network-only for APIs & SSE
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept or cache non-GET requests, API queries, live realtime SSE streams, or uploads
  if (
    request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/uploads/') ||
    url.pathname.includes('/realtime/')
  ) {
    return;
  }

  // Optimize static assets (JS chunks, CSS stylesheets, images, web fonts)
  if (
    url.pathname.startsWith('/assets/') ||
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
});

// Listen for push events from server push or client trigger
self.addEventListener('push', (event) => {
  let data = {
    title: 'Autoshine Notification',
    body: 'You have a new update.',
    icon: '/autoshine_logo.jpg',
    badge: '/autoshine_logo.jpg',
    tag: 'autoshine-alert',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/autoshine_logo.jpg',
    badge: data.badge || '/autoshine_logo.jpg',
    vibrate: [150, 80, 150],
    data: data.url || '/',
    tag: data.tag || 'autoshine-booking',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Click notification to focus existing window or open target deep-link
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = (event.notification.data && event.notification.data.url) || event.notification.data || '/';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If there is an existing client from our origin, navigate it to targetUrl and focus
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            return client.navigate(targetUrl).then((c) => c ? c.focus() : client.focus());
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

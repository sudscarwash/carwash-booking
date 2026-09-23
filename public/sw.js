// Autoshine Service Worker for Offline Assets & Native Push / Notifications
const CACHE_NAME = 'autoshine-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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

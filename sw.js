// GitHub Pages용 AI 일정관리 Service Worker
const CACHE_NAME = 'ai-scheduler-pages-v1';
const BASE_PATH = new URL('./', self.registration.scope).pathname;
const APP_ASSETS = [
  BASE_PATH,
  `${BASE_PATH}static/index.html`,
  `${BASE_PATH}manifest.json`,
  `${BASE_PATH}static/icon-192.png`,
  `${BASE_PATH}static/icon-512.png`,
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      ),
    ])
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const action = event.action;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: action === 'snooze' ? 'SNOOZE_ALARM' : 'DISMISS_ALARM',
            eventId: event.notification.tag,
          });
          return;
        }
      }
      return clients.openWindow ? clients.openWindow(BASE_PATH) : undefined;
    })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
    )
  );
});

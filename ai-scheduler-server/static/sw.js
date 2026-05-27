// AI 일정관리 Service Worker
const CACHE_NAME = 'ai-scheduler-v1';

// 설치 시 캐시 (오프라인 기본 지원)
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['/', '/manifest.json', '/icon-192.png', '/icon-512.png'])
    )
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// 알림 클릭 시 앱 열기
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const action = event.action;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // 이미 열린 창이 있으면 포커스
      for (const client of list) {
        if ('focus' in client) {
          client.focus();
          if (action === 'snooze') {
            client.postMessage({ type: 'SNOOZE_ALARM', eventId: event.notification.tag });
          } else {
            client.postMessage({ type: 'DISMISS_ALARM' });
          }
          return;
        }
      }
      // 없으면 새 창 열기
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});

// 알림 닫기 (X 버튼)
self.addEventListener('notificationclose', () => {});

// 네트워크 요청 처리 (API는 항상 네트워크, 정적 파일은 캐시 우선)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return; // API는 캐시 안 함
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

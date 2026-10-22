// Service Worker for «Хроники Сыщика» (Build: 2026-10-22T23:51:27.767Z)
const CACHE_NAME = 'detective-noir-1792713087768';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first strategy: always fetch latest prod build when online, fallback to cache offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const isNav = event.request.mode === 'navigate';
  event.respondWith(
    fetch(isNav ? new Request(event.request, { cache: 'reload' }) : event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// GediOn Resilient PWA Service Worker
const CACHE_NAME = 'gedion-pwa-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Resilient non-blocking fetch handler
self.addEventListener('fetch', (event) => {
  // Let non-GET or cross-origin requests bypass custom handling directly
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful local asset responses safely in the background
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback to cache if offline or network failure
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }
        if (event.request.mode === 'navigate') {
          const indexFallback = await caches.match('./index.html') || await caches.match('/');
          if (indexFallback) {
            return indexFallback;
          }
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      })
  );
});

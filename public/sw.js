const CACHE_NAME = '7flow-shell-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/index.html', networkResponse.clone());
          return networkResponse;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match('/index.html')) || (await cache.match('/'));
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);

      if (cachedResponse) {
        event.waitUntil(
          (async () => {
            try {
              const networkResponse = await fetch(request);
              if (networkResponse.ok) {
                await cache.put(request, networkResponse.clone());
              }
            } catch {
              // Keep the cached copy if the network is unavailable.
            }
          })(),
        );
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          await cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        return cachedResponse || Response.error();
      }
    })(),
  );
});

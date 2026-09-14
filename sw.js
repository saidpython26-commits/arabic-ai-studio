const CACHE_NAME = 'freegen-ai-v7';

// Force immediate takeover
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Network-first strategy for navigation and HTML so installed PWA updates immediately
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // APIs always direct to network
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Network First for all assets to guarantee latest updates
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request).then((res) => res || (event.request.mode === 'navigate' ? caches.match('/index.html') : null)))
  );
});


const CACHE = 'media-posters-v1';

// On install, take control immediately
self.addEventListener('install', () => self.skipWaiting());

// On activate, drop old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Always hit the network for API calls — data must be fresh
  if (url.pathname.startsWith('/api/')) return;

  // For everything else (app shell, JS/CSS bundles, icons):
  // serve from cache if available, fetch and cache otherwise
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res.ok && request.method === 'GET') {
          caches.open(CACHE).then(c => c.put(request, res.clone()));
        }
        return res;
      });
    })
  );
});

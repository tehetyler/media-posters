const CACHE = 'media-posters-v1';

self.addEventListener('install', () => self.skipWaiting());

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

  // Never intercept: API calls, the SW itself, or the manifest
  // These must always go to the network fresh and unmodified
  if (url.pathname.startsWith('/api/') ||
      url.pathname === '/sw.js' ||
      url.pathname === '/manifest.json') return;

  // Cache-first for everything else (app shell, JS/CSS, icons)
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res.ok && request.method === 'GET') {
          const clone = res.clone(); // clone before body is consumed
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return res;
      }).catch(() => new Response('Offline', { status: 503 }));
    })
  );
});

// Use the same offline cache and HTML key the monitor checks in its status banner.
const CACHE_NAME = 'pcc-direct-browser-v6';
const homeUrl = new URL(self.registration.scope);
const indexUrl = new URL('index.html', homeUrl);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.add(new Request(indexUrl, { cache: 'reload' }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Check the published page online and keep the latest successful copy for offline use.
async function loadMonitor(request) {
  let response;
  try {
    response = await fetch(request, { cache: 'no-store' });
  } catch {
    // An offline navigation can still use the saved monitor below.
  }

  if (response?.ok) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(indexUrl, response.clone());
    } catch {
      // A storage failure should not prevent the live monitor from opening.
    }
    return response;
  }

  if (response && response.status < 500) return response;
  const saved = await caches.match(indexUrl, { cacheName: CACHE_NAME }).catch(() => undefined);
  return saved ?? response ?? Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;

  const url = new URL(request.url);
  if (url.origin === homeUrl.origin &&
      (url.pathname === homeUrl.pathname || url.pathname === indexUrl.pathname)) {
    event.respondWith(loadMonitor(request));
  }
});

// /shower-pwa/sw-v3.js
const CACHE_VER = 'shower-admin-v3';
const ASSET_CACHE = CACHE_VER + '-assets';

self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k.startsWith(CACHE_VER) ? null : caches.delete(k)));
    await self.clients.claim();
  })());
});

// HTMLは network-first（/admin/ の画面は毎回最新を取りに行く）
async function handleHTML(req) {
  try { return await fetch(req, { cache: 'no-store' }); }
  catch { return await caches.match(req) || new Response('Offline', { status: 503 }); }
}

// CSS/JS/画像は SWR
async function handleAsset(req) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(req);
  const fetching = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; });
  return cached ? (fetching.catch(() => cached)) : fetching;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  const isHTML = req.mode === 'navigate' || req.destination === 'document' || url.pathname.endsWith('.html');
  e.respondWith(isHTML ? handleHTML(req) : handleAsset(req));
});

self.addEventListener('message', (e) => { if (e.data?.type === 'SKIP_WAITING') self.skipWaiting(); });

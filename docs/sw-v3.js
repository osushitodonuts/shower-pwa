// /shower-pwa/sw.js  ←上書き
const CACHE_VER = 'shower-admin-v4';   // ←必ず新しい名前に
const ASSET_CACHE = CACHE_VER + '-assets';

// もう admin.html はプリキャッシュしない。静的資産だけでOK
const ASSETS = [
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // 必要なら CSS/JS を列挙（相対でも絶対でもOK）
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(ASSET_CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k.startsWith(CACHE_VER) ? null : caches.delete(k)));
    await self.clients.claim();
  })());
});

// HTML(ナビゲーション)は必ずネット優先 = いつも最新の index.html を取る
async function handleHTML(req) {
  try {
    return await fetch(req, { cache: 'no-store' });
  } catch {
    // オフライン時のみ最後のキャッシュにフォールバック
    return (await caches.match(req)) || new Response('Offline', { status: 503 });
  }
}

// 画像/CSS/JS等はSWR
async function handleAsset(req) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(req);
  const fetching = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  return cached ? (fetching.catch(() => cached)) : fetching;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  const isHTML = req.mode === 'navigate' || req.destination === 'document';
  e.respondWith(isHTML ? handleHTML(req) : handleAsset(req));
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

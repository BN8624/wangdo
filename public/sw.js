// 왕도 서비스 워커: 그림·폰트를 기기에 담아 두고, 화면 파일은 늘 새로 받는다.
// - 화면(HTML): 네트워크 먼저, 끊기면 담아 둔 것. version.json은 건드리지 않는다(새 버전 알림이 늘 새로 받게).
// - 빌드 파일(assets/): 이름에 해시가 붙어 있으니 담아 둔 것 먼저.
// - 그림(art/)과 폰트: 담아 둔 것을 바로 보여 주고, 뒤에서 새로 받아 바꿔 둔다(그림을 다시 그려도 다음 번엔 새 그림).
const CACHE = 'wangdo-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('wangdo-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req, { cache: 'no-store' });
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, wait) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const fresh = fetch(req)
    .then((res) => {
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit || Response.error());
  if (hit) {
    wait(fresh);
    return hit;
  }
  return fresh;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const wait = (p) => e.waitUntil(p.catch(() => undefined));
  if (url.origin === location.origin) {
    if (url.pathname.endsWith('/version.json')) return;
    if (req.mode === 'navigate') return e.respondWith(networkFirst(req));
    if (url.pathname.includes('/assets/')) return e.respondWith(cacheFirst(req));
    if (url.pathname.includes('/art/')) return e.respondWith(staleWhileRevalidate(req, wait));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') e.respondWith(staleWhileRevalidate(req, wait));
});

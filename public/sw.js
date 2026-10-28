// 예전 게임(v2)이 설치한 서비스 워커를 걷어 낸다. 기기에 남은 캐시를 지우고 스스로 해제한 뒤 열린 화면을 새로 고친다.
// v3는 서비스 워커를 쓰지 않는다. 예전 게임을 해 본 기기가 모두 한 번씩 들어올 때까지 이 파일을 남겨 둔다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) await caches.delete(k);
      await self.registration.unregister();
      for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
    })(),
  );
});

// 온라인 학교 서비스 워커: 한 번 받은 파일은 기기에 저장해 두고 다음부터 빠르게 열기
// - 페이지(html): 인터넷 먼저 → 안 되면 저장본 (새 버전이 바로 반영되게)
// - 그림·소리·스크립트: 저장본 먼저 → 없으면 받아서 저장
// - 실시간 서버(supabase) 요청은 건드리지 않음
const CACHE = 'school-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './manifest.webmanifest', './icons/icon-192.png'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // supabase 등 다른 서버는 그대로
  if (req.mode === 'navigate' || url.pathname.endsWith('.json')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./'))),
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

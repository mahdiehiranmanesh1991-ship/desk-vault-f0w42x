// سرویس‌ورکر پوسته: فقط کش‌های با پیشوند cdesk- را مدیریت می‌کند
const CACHE = 'cdesk-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './data.enc.json',
  './robots.txt',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './favicon.ico',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks =>
      Promise.all(ks.filter(k => k.startsWith('cdesk-') && k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const path = url.pathname;
  const isNav = req.mode === 'navigate';
  const isHtml = isNav || path.endsWith('.html') || /\/$/.test(path);
  const isData = path.endsWith('data.enc.json');

  if (isHtml || isData) {
    e.respondWith(
      fetch(req)
        .then(r => {
          if (r && r.ok) {
            const cp = r.clone();
            const cacheKey = isData ? './data.enc.json' : (isNav ? './index.html' : req);
            caches.open(CACHE).then(c => c.put(cacheKey, cp));
          }
          return r;
        })
        .catch(() =>
          caches.match(req).then(r => r || (isData ? caches.match('./data.enc.json') : caches.match('./index.html')))
        )
    );
    return;
  }

  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    if (res && res.ok) {
      const cp = res.clone();
      caches.open(CACHE).then(c => c.put(req, cp));
    }
    return res;
  })));
});

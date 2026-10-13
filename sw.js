// 神椿TCG tokenカウンター：電波がなくても開けるようにするキャッシュ
const CACHE = 'kt-live-v1';
const CORE = ['./', './index.html', './peerjs.min.js', './manifest.json', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const put = (req, res) => { if (res && (res.ok || res.type === 'opaque')){ const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; };
const withTimeout = (p, ms) => new Promise((ok, ng) => { const t = setTimeout(() => ng(new Error('timeout')), ms); p.then(r => { clearTimeout(t); ok(r); }, e => { clearTimeout(t); ng(e); }); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin){
    if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html')){
      // ページ本体：まずネットから最新版（4秒で諦める）→だめならキャッシュ
      e.respondWith(withTimeout(fetch(req), 4000).then(res => put(req, res))
        .catch(() => caches.match(req, {ignoreSearch: true}).then(m => m || caches.match('./index.html'))));
    } else {
      // 画像・スクリプト：キャッシュ優先、裏で更新
      e.respondWith(caches.match(req, {ignoreSearch: true}).then(m => {
        const net = fetch(req).then(res => put(req, res)).catch(() => m);
        return m || net;
      }));
    }
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'){
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(res => put(req, res)).catch(() => m)));
  }
});

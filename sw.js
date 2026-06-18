// Service worker da fachada — network-first no documento, cache-first nos assets.
const CACHE = 'bolao-copa-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const req = e.request;
  const u = new URL(req.url);
  if (u.origin !== location.origin) return;   // não intercepta o iframe (Google)

  // Documento de navegação (index.html) → network-first: pega a versão nova (URL /exec atual);
  // só usa o cache se estiver offline. Evita servir a casca velha até bump manual.
  if (req.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  // Assets (ícones/manifest) → cache-first.
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});

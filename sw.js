/* GerinGonça — service worker: guarda o jogo para funcionar sem internet. */
const CACHE = 'geringonca-v28';
const CORE = ['./', './index.html', './engine.js', './levels.js', './sprites.js', './atlas.js', './art.js', './game.js', './assets/gonca.webp', './assets/gerin.webp', './assets/objetos3.webp', './assets/objetos1.jpg', './manifest.webmanifest', './icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(CORE.map(u => c.add(u)))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => {
    const net = fetch(e.request).then(res => { if (res && (res.ok || res.type === 'opaque')) caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; }).catch(() => hit);
    return hit || net;
  }));
});

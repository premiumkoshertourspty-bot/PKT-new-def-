const CACHE_NAME = 'pkt-clean-v3';
const FILES = ['./','./index.html','./manifest.json','./service-worker.js','./logo.jpg'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  // Only serve the app's own files from the cache; let other requests (e.g. the Google Sheet link) go straight to the network.
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

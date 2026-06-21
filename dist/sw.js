// Self-destructing Service Worker — removes all Choser caches and unregisters
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.keys().then(names => 
      Promise.all(names.filter(n => n.startsWith('choser')).map(n => caches.delete(n)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n.startsWith('choser')).map(n => caches.delete(n)))
    ).then(() => self.clients.claim()).then(() => self.registration.unregister())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request).catch(() => new Response('reload', {
    headers: { 'Content-Type': 'text/html' }
  })));
});

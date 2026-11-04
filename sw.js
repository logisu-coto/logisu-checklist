// LOGISU Checklist - Service Worker
// Cambiar la versión cada vez que se modifique index.html o manifest.json
const CACHE = 'logisu-checklist-v2';
const SHELL = ['./', './index.html', './manifest.json'];

// Instalación: guarda la app en caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Activación: borra cachés viejas y toma control enseguida
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Solo maneja archivos propios (GET del mismo origen).
// Google Analytics y Microsoft Forms pasan directo, sin intervención.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Responde al instante desde caché y actualiza en segundo plano
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => null);

        if (cached) {
          event.waitUntil(network);
          return cached;
        }
        return network.then((res) =>
          res || new Response('Sin conexión. Intentá de nuevo.', {
            status: 503,
            statusText: 'Offline',
            headers: { 'Content-Type': 'text/plain; charset=UTF-8' }
          })
        );
      })
    )
  );
});

// ─── GymTracker Pro — Service Worker ───
// Estrategia: Network-first para index.html (siempre trae la versión más nueva)
//             Cache-first para íconos y manifest (no cambian seguido)

const CACHE = 'gymtracker-v3';
const STATIC_ASSETS = [
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// Instalación: solo precargar assets estáticos, NO el html
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

// Activación: limpiar caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first para HTML, cache-first para el resto
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Para index.html → siempre intentar la red primero
  if (e.request.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(networkRes => {
          // Guardar la copia nueva en cache por si se cae el internet
          const clone = networkRes.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return networkRes;
        })
        .catch(() => {
          // Sin conexión: usar el cache como fallback
          return caches.match(e.request).then(r => r || caches.match('./index.html'));
        })
    );
    return;
  }

  // Para el resto (íconos, manifest) → cache-first
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(networkRes => {
      const clone = networkRes.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return networkRes;
    }))
  );
});

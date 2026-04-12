/* ════════════════════════════════════
   SERVICE WORKER — La mia Spesa PWA
   Versione cache: aggiorna il numero
   per forzare il refresh su tutti i
   dispositivi che hanno già installato
════════════════════════════════════ */
const CACHE = 'spesa-v1';

/* File da mettere in cache al primo avvio */
const PRECACHE = [
  './',
  './index.html',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap',
];

/* Installazione: metti in cache le risorse principali */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Aggiungi le risorse locali — ignora errori sulle esterne
      return cache.addAll(['./index.html']).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

/* Attivazione: elimina cache vecchie */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Fetch: strategia "cache first, poi rete" per risorse statiche
   "rete first" per le API (Open Food Facts, ecc.) */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API esterne → sempre dalla rete, niente cache
  if (
    url.hostname.includes('openfoodfacts.org') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.hostname.includes('unpkg.com')
  ) {
    e.respondWith(
      fetch(e.request).catch(() => {
        // Se offline e la risorsa non è in cache, risposta vuota
        return new Response('', { status: 503 });
      })
    );
    return;
  }

  // Risorse locali (HTML, CSS, JS) → cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      // Non in cache: prendi dalla rete e metti in cache
      return fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Completamente offline: prova a restituire index.html
        return caches.match('./index.html');
      });
    })
  );
});

/* Messaggio dall'app per forzare aggiornamento */
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

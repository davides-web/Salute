// Service worker: salva i file dell'app per farla funzionare offline.
// Quando modifichi l'app, cambia VERSIONE (così i telefoni scaricano i file nuovi).
const VERSIONE = 'salute-v1';
const FILE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/stile.css',
  'icone/icon-192.png',
  'icone/icon-512.png',
  'icone/icon-maskable-512.png',
  'icone/icon.svg',
  'js/app.js',
  'js/core/charts.js',
  'js/core/csv.js',
  'js/core/db.js',
  'js/core/dom.js',
  'js/core/segnali.js',
  'js/core/store.js',
  'js/core/util.js',
  'js/logica/backup.js',
  'js/logica/fitness.js',
  'js/logica/forza.js',
  'js/logica/impostazioni.js',
  'js/logica/livelli.js',
  'js/logica/nutrizione.js',
  'js/logica/peso.js',
  'js/logica/riepilogo.js',
  'js/logica/timer.js',
  'js/viste/altro.js',
  'js/viste/attivita.js',
  'js/viste/cibo.js',
  'js/viste/forza.js',
  'js/viste/home.js',
  'js/viste/impostazioni.js',
  'js/viste/peso.js',
  'js/viste/riepilogo.js',
  'js/viste/timer.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSIONE).then((c) => c.addAll(FILE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((nomi) => Promise.all(nomi.filter((n) => n !== VERSIONE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()));
});

// Risponde subito dalla copia salvata e intanto la aggiorna in background.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSIONE).then(async (cache) => {
      const salvata = await cache.match(req, { ignoreSearch: true });
      const rete = fetch(req).then((r) => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
      return salvata || (await rete) || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
    }));
});

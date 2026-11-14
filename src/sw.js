/* Service worker del Tejo (solo en GitHub Pages): permite instalar el juego y jugar sin internet contra Don Chepe.
   - La página se pide primero a la red, sin caché del navegador (así llegan las versiones nuevas) y, sin internet, sale de la caché.
   - version.json nunca se guarda: la página lo consulta para avisar que hay una versión nueva.
   - Three.js, el cargador de la mano, las fuentes y los íconos se guardan al instalar y se sirven desde la caché.
   - La música de fondo también se descarga al instalar, pero en una caché aparte (MEDIA) que no se borra con cada versión:
     así suena sin internet y no se vuelve a bajar en cada actualización. Si algún día cambia el mp3, subir MEDIA a v2.
   - Las salas en línea necesitan internet: sus conexiones no pasan por aquí. */
const VERSION = '{{VERSION}}';
const CACHE = 'tejo-' + VERSION;
const PRECACHE = {{PRECACHE}};
const MEDIA = 'tejo-media-v1';
const MEDIA_FILES = ['musica-vallenato.mp3'];
const isMedia = url => url.origin === location.origin && MEDIA_FILES.some(f => url.pathname.endsWith('/' + f));

self.addEventListener('install', e => {
  e.waitUntil(Promise.all([
    caches.open(CACHE).then(c => Promise.all(PRECACHE.map(u => c.add(u).catch(() => null)))),
    caches.open(MEDIA).then(c => Promise.all(MEDIA_FILES.map(u => c.match(u).then(hit => hit || c.add(u)).catch(() => null)))),   // solo si no está ya guardada
  ]).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('tejo-') && k !== CACHE && k !== MEDIA).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return;
  if (url.origin === location.origin && /\/(version\.json|sw\.js)$/.test(url.pathname)) return;   // siempre de la red
  const page = req.mode === 'navigate' || (url.origin === location.origin && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')));
  if (page) {
    e.respondWith(fetch(req, { cache: 'no-store' }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./', copy)); return r; })
      .catch(() => caches.match('./').then(r => r || caches.match(req))));
    return;
  }
  if (isMedia(url)) {   // la música: de la caché aparte y, si no está, se baja y se guarda ahí
    e.respondWith(caches.open(MEDIA).then(c => c.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {
      if (r && r.ok && r.status === 200) c.put(req, r.clone());
      return r;
    }))));
    return;
  }
  const cacheable = url.origin === location.origin || /(^|\.)(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
  if (!cacheable) return;
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r && (r.ok || r.type === 'opaque')) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});

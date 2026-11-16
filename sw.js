/* Service worker del Tejo (solo en GitHub Pages): permite instalar el juego y jugar sin internet contra Don Chepe.
   - La página se pide a la red revalidando (si no cambió, el servidor responde "igual" y no se baja otra vez el
     juego completo). Si en 3,5 s no llega (señal mala), se abre la copia guardada y la nueva queda lista para la
     próxima vez. Sin internet, sale la guardada. Solo se guarda una respuesta buena: un error nunca reemplaza al juego.
   - version.json nunca se guarda: la página lo consulta para avisar que hay una versión nueva.
   - Los íconos se guardan al instalar, en la caché de esta versión (CACHE).
   - Three.js, el cargador de la mano, las fuentes y la música van en una caché aparte (KEEP) que no se borra con
     cada versión: sus direcciones llevan la versión de cada librería y la música no cambia, así que se bajan una
     sola vez. Si algún día cambia el mp3, subir KEEP a v2.
   - Las salas en línea necesitan internet: sus conexiones no pasan por aquí. */
const VERSION = '1.62.7';
const CACHE = 'tejo-' + VERSION;
const PRECACHE = [
  "./",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "apple-touch-icon.png",
  "favicon.png",
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
  "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js",
  "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/meshopt_decoder.js",
  "https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&display=swap"
];
const KEEP = 'tejo-media-v1';
const KEEP_FILES = ['musica-vallenato.mp3'];
const PAGE_WAIT = 3500;
const isKeep = url => url.origin === location.origin ? KEEP_FILES.some(f => url.pathname.endsWith('/' + f)) : true;
const good = r => r && (r.ok || r.type === 'opaque');

self.addEventListener('install', e => {
  const here = PRECACHE.filter(u => !/^https?:/.test(u)), far = PRECACHE.filter(u => /^https?:/.test(u)).concat(KEEP_FILES);
  e.waitUntil(Promise.all([
    caches.open(CACHE).then(c => Promise.all(here.map(u => c.add(u).catch(() => null)))),
    caches.open(KEEP).then(c => Promise.all(far.map(u => c.match(u).then(hit => hit || c.add(u)).catch(() => null)))),   // solo lo que falte
  ]).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('tejo-') && k !== CACHE && k !== KEEP).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return;
  if (url.origin === location.origin && /\/(version\.json|sw\.js)$/.test(url.pathname)) return;   // siempre de la red
  const page = req.mode === 'navigate' || (url.origin === location.origin && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')));
  if (page) {
    const net = fetch(req, { cache: 'no-cache' }).then(r => {
      if (r && r.ok && r.status === 200 && r.type === 'basic') { const copy = r.clone(); return caches.open(CACHE).then(c => c.put('./', copy)).then(() => r, () => r); }
      return r;
    });
    e.waitUntil(net.catch(() => null));   // aunque se abra la guardada, la nueva se termina de bajar y se guarda
    e.respondWith(caches.match('./').then(saved => {
      if (!saved) return net.catch(() => caches.match(req));
      const slow = new Promise(res => setTimeout(() => res(saved), PAGE_WAIT));
      return Promise.race([net.then(r => r && r.ok ? r : saved, () => saved), slow]);
    }));
    return;
  }
  const cacheable = url.origin === location.origin || /(^|\.)(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
  if (!cacheable) return;
  const keep = isKeep(url);
  e.respondWith(caches.match(req, keep && url.origin === location.origin ? { ignoreSearch: true } : undefined).then(hit => hit || fetch(req).then(r => {
    if (good(r) && (r.status === 200 || r.type === 'opaque')) { const copy = r.clone(); caches.open(keep ? KEEP : CACHE).then(c => c.put(req, copy)); }
    return r;
  })));
});


/* ================= Música de fondo =================
   Un vallenato suave mientras se juega: "Vallenato con ritmo o aire de son" de vjgalaxy, vía Pixabay
   (licencia de contenido de Pixabay, ver LICENSES/musica-pixabay.md).
   Suena por debajo de los efectos, se apaga con el switch "Música de fondo" del menú y también calla con el botón de silencio.
   El archivo se baja la primera vez que hace falta y se repite sin parar; al volver a jugar sigue donde iba. */

const MUSIC_URL = 'musica-vallenato.mp3', MUSIC_VOL = .08;
const MUSIC = { buf: null, loading: false, failed: 0, play: null, at: 0 };

function musicWanted() { return settings.music !== false && phase !== 'menu' && phase !== 'boot'; }

function musicLoad() {
  if (MUSIC.buf || MUSIC.loading || !A.ctx || (MUSIC.failed && performance.now() - MUSIC.failed < 30000)) return;   // si falló (sin internet) reintenta en 30 s
  MUSIC.loading = true;
  fetch(MUSIC_URL).then(r => { if (!r.ok) throw new Error('sin música'); return r.arrayBuffer(); })
    .then(b => new Promise((ok, ko) => A.ctx.decodeAudioData(b, ok, ko)))   // con callbacks: Safari viejo no devuelve promesa
    .then(buf => { MUSIC.buf = buf; MUSIC.loading = false; musicSync(); })
    .catch(() => { MUSIC.loading = false; MUSIC.failed = performance.now(); });
}

// Se llama en cada cuadro: solo hace algo cuando cambia si debe sonar o no
function musicSync() {
  if (!A.ctx || !A.out) return;
  const want = musicWanted(), c = A.ctx, t = c.currentTime;
  if (want && !MUSIC.play) {
    if (!MUSIC.buf) { musicLoad(); return; }
    const src = c.createBufferSource(), g = c.createGain();
    src.buffer = MUSIC.buf; src.loop = true; g.gain.value = 0;
    src.connect(g); g.connect(A.out);   // pasa por el volumen general: el botón de silencio también la calla
    const at = MUSIC.at % MUSIC.buf.duration;
    src.start(t, at); g.gain.setTargetAtTime(MUSIC_VOL, t, .7);   // entra suave
    MUSIC.play = { src, g, t0: t - at };
  } else if (!want && MUSIC.play) {
    const p = MUSIC.play; MUSIC.play = null;
    MUSIC.at = (t - p.t0) % MUSIC.buf.duration;   // para seguir donde iba la próxima vez
    p.g.gain.cancelScheduledValues(t); p.g.gain.setValueAtTime(p.g.gain.value, t); p.g.gain.setTargetAtTime(0, t, .3);   // sale suave
    try { p.src.stop(t + 1.5); } catch (e) { }
  }
}

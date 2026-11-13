
/* ================= Música de fondo =================
   Un vallenato suave mientras se juega: "Vallenato con ritmo o aire de son" de vjgalaxy, vía Pixabay
   (licencia de contenido de Pixabay, ver LICENSES/musica-pixabay.md).
   Suena por debajo de los efectos. Se prende y se apaga con el switch "Música de fondo" del menú o tocando un parlante del salón;
   los efectos del juego siempre suenan.
   El archivo se baja la primera vez que hace falta y se repite sin parar; al volver a jugar sigue donde iba. */

const MUSIC_URL = 'musica-vallenato.mp3', MUSIC_VOL = .08;
const MUSIC = { buf: null, loading: false, failed: 0, play: null, at: 0, bus: null, an: null, data: null, level: 0 };

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
    if (!MUSIC.bus) {   // va directo al compresor, no por el volumen de los efectos; el analizador mueve los conos de los parlantes
      MUSIC.bus = c.createGain(); MUSIC.an = c.createAnalyser(); MUSIC.an.fftSize = 256; MUSIC.data = new Uint8Array(MUSIC.an.fftSize);
      MUSIC.bus.connect(A.comp || A.out); MUSIC.bus.connect(MUSIC.an);
    }
    src.connect(g); g.connect(MUSIC.bus);
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

// Tocar un parlante del salón prende o apaga la música
function speakerHit(e) {
  if (!AMB || !AMB.speakers) return false;
  const r = renderer.domElement.getBoundingClientRect(), rc = new THREE.Raycaster();
  rc.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, cam);
  return rc.intersectObjects(AMB.speakers.map(s => s.hit), false).length > 0;
}
function toggleMusic() {
  settings.music = settings.music === false; saveSettings(); A.init(); A.wake();
  if (settings.music) musicLoad();
  toast(settings.music ? 'Música prendida' : 'Música apagada');
  if (typeof renderMenu === 'function') renderMenu();
}
function updateSpeakers(dt) {
  if (!AMB || !AMB.speakers) return;
  let lvl = 0;
  if (MUSIC.play && MUSIC.an) {   // qué tan duro va la música ahora (sin contar el volumen bajito de fondo)
    MUSIC.an.getByteTimeDomainData(MUSIC.data); let sum = 0;
    for (let i = 0; i < MUSIC.data.length; i++) { const v = (MUSIC.data[i] - 128) / 128; sum += v * v; }
    lvl = Math.min(1, Math.sqrt(sum / MUSIC.data.length) / MUSIC_VOL * 2.2);
  }
  MUSIC.level += (lvl - MUSIC.level) * Math.min(1, dt * 30);
  const on = settings.music !== false;
  AMB.speakers.forEach(s => { s.cone.position.z = s.cone.userData.z0 + MUSIC.level * .014; s.led.material.color.set(on ? '#38e070' : '#b3261e'); });
}


/* ================= El garitero =================
   Un campesino de sombrero que está de pie junto a la cancha, a la izquierda. Al terminar cada ronda de tejo
   camina a la cancha, saca los tejos y pone las mechas nuevas; en el bolo, cuando caen palos, va y los para.
   Mientras tanto respira y cambia de pie, y cuando alguien revienta mecha o mete el tejo, saluda con la mano.
   Llega siempre en GARI_GO segundos (fijo: en las salas todos esperan lo mismo, se vea o no se vea el garitero).
   Modelo de Quaternius (Ultimate Modular Men, CC0; ver LICENSES/quaternius-garitero.md).
   Es decoración: el tejo no choca con él y en las salas cada quien ve el suyo. */

const GARI_GO = 2.2;                  // segundos que tarda en llegar a la cancha o a los palos
const GARI_WALK = 1.15;               // m/s a los que se ve bien la animación de caminar a ritmo normal
const GARI_HOME = [-2.45, 2.4];       // x y la distancia desde la cancha hacia la raya (z = -D + dz)
const GARI_COLORS = { Skin: '#c98e66', Eyebrows: '#1d140e', Hair: '#1d140e' };   // trigueño, pelo y cejas negras
let GARI = null;

function loadGaritero() {
  if (GARI || !THREE.GLTFLoader || typeof GARI_GLB !== 'string') return;
  GARI = { src: null, p: null };
  try {
    const bin = Uint8Array.from(atob(GARI_GLB), ch => ch.charCodeAt(0)).buffer;
    const L = new THREE.GLTFLoader();
    if (window.MeshoptDecoder) L.setMeshoptDecoder(MeshoptDecoder);
    L.parse(bin, '', g => { GARI.src = g; placeGaritero(); }, () => { });
  } catch (e) { }
}

// Se pone en su puesto (se llama cada vez que se arma el salón, que cambia con la distancia)
function placeGaritero() {
  if (!GARI || !GARI.src || !hall) return;
  if (GARI.p && GARI.p.root.parent) GARI.p.root.parent.remove(GARI.p.root);
  const root = GARI.src.scene, D = W.D, [x, dz] = GARI_HOME, z = -D + dz;
  root.traverse(o => {
    if (!o.isMesh) return;
    o.frustumCulled = false; o.castShadow = true;
    [].concat(o.material).forEach(m => { m.metalness = 0; m.roughness = Math.max(.6, m.roughness); if (GARI_COLORS[m.name]) m.color.set(GARI_COLORS[m.name]); });
  });
  root.position.set(x, 0, z); root.rotation.set(0, Math.atan2(0 - x, -D + .3 - z), 0);   // mirando a la cancha
  hall.add(root);
  if (!GARI.p) {
    const mixer = new THREE.AnimationMixer(root), acts = {};
    GARI.src.animations.forEach(c => { acts[c.name] = mixer.clipAction(c); });
    const idle = acts.Idle || acts.Idle_Neutral;
    if (idle) idle.play();
    GARI.p = { root, mixer, acts, idle, cur: idle, cheerIn: 0, waveT: 0, task: null, home: null };
  }
  const p = GARI.p; p.task = null; p.home = { pos: root.position.clone(), yaw: root.rotation.y };
  gPlay(p, p.idle, 0);
}

// Pasa a otra animación con un cruce suave; once: una sola vez y se queda en el último cuadro
function gPlay(p, act, fade = .3, once = false) {
  if (!act || p.cur === act) return;
  act.reset(); act.enabled = true; act.setEffectiveWeight(1);
  if (once) { act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; } else act.setLoop(THREE.LoopRepeat, Infinity);
  act.play(); if (p.cur && fade) p.cur.crossFadeTo(act, fade, false); else if (p.cur) p.cur.stop(); p.cur = act;
}
// Alguien hizo algo bueno: saluda (si no está trabajando)
function gariCheer() { const p = GARI && GARI.p; if (p && !p.task && !p.waveT) p.cheerIn = .25 + Math.random() * .3; }

function gariSpot(kind, p) {
  const side = Math.sign(p.home.pos.x) || -1;
  if (kind === 'bolo') return { pos: V(side * .55, 0, BOLO.Z0 + .5), look: V(0, 0, BOLO.Z0) };   // al lado de los palos
  return { pos: V(side * (HU + .4), 0, W.C.z + .65), look: V(W.C.x, 0, W.C.z) };                // en la esquina de adelante de la cancha
}
function gariWalk(p, to, dur, look, next) {
  const from = p.root.position.clone(), dist = from.distanceTo(to);
  p.task = { phase: 'walk', from, to, dur: Math.max(.3, dur), t: 0, look, next };
  p.cheerIn = 0; p.waveT = 0;
  if (p.acts.Walk) p.acts.Walk.timeScale = clamp(dist / p.task.dur / GARI_WALK, .6, 1.6);
  gPlay(p, p.acts.Walk, .25);
}
// Va a arreglar la cancha (o a parar los palos) y, al llegar, after() hace el cambio de verdad (la ronda o el turno nuevo)
function gariRun(kind, after) {
  const p = GARI && GARI.p;
  if (p && !p.task) { const sp = gariSpot(kind, p); gariWalk(p, sp.pos, GARI_GO, sp.look, 'work'); }
  later(GARI_GO, () => { if (p && p.task && p.task.phase === 'walk' && p.task.next === 'work') gariArrive(p); after(); });
}
function gariArrive(p) {
  const t = p.task; p.root.position.copy(t.to);
  p.root.rotation.y = Math.atan2(t.look.x - t.to.x, t.look.z - t.to.z);
  const it = p.acts.Interact; gPlay(p, it, .2, true);
  p.task = { phase: 'work', t: 0, dur: it ? it.getClip().duration * .95 : 1 };
}
function gariHome(p) { p.root.position.copy(p.home.pos); p.root.rotation.y = p.home.yaw; p.task = null; gPlay(p, p.idle, .35); }

function updateGaritero(dt) {
  const p = GARI && GARI.p; if (!p || !dt) return;
  const t = p.task;
  if (t && t.phase === 'walk') {   // camina mirando hacia donde va
    t.t += dt; const k = Math.min(1, t.t / t.dur);
    p.root.position.lerpVectors(t.from, t.to, k);
    const yaw = Math.atan2(t.to.x - t.from.x, t.to.z - t.from.z), d = Math.atan2(Math.sin(yaw - p.root.rotation.y), Math.cos(yaw - p.root.rotation.y));
    p.root.rotation.y += d * Math.min(1, dt * 8);
    if (k >= 1) { if (t.next === 'work') gariArrive(p); else gariHome(p); }
  } else if (t && t.phase === 'work') {   // saca los tejos y pone las mechas (o para los palos), y se devuelve
    t.t += dt;
    if (t.t >= t.dur) gariWalk(p, p.home.pos, p.root.position.distanceTo(p.home.pos) / GARI_WALK, null, 'home');
  }
  const w = p.acts.Wave;
  if (p.cheerIn > 0 && w && !p.task) { p.cheerIn -= dt; if (p.cheerIn <= 0) { p.cheerIn = 0; gPlay(p, w, .25, true); p.waveT = w.getClip().duration * .92; } }
  if (p.waveT > 0 && !p.task) { p.waveT -= dt; if (p.waveT <= 0) { p.waveT = 0; gPlay(p, p.idle, .4); } }
  p.mixer.update(dt);
}


/* ================= El garitero =================
   Un campesino de sombrero sentado en la silla de la mesa de la izquierda, la que mira a la cancha; sigue con
   la cabeza el tejo (o la bola) mientras va, y cuando alguien revienta mecha o embocina saluda desde la silla.
   Si el perro pasa cerca, lo espanta con la mano: a veces el perro sale corriendo y a veces ni caso le hace.
   Al acabar una ronda de tejo en la que se reventaron mechas, se para, va a la cancha, se arrodilla y pone mechas
   nuevas solo donde se reventaron (cada una aparece cuando la pone); la cámara lo sigue. Luego empieza la otra ronda
   y él se devuelve a su silla. Si no se reventó ninguna, no se para. En el bolo, cuando caen palos, va y los para.
   Los tiempos son fijos (GARI_*): en las salas todos esperan lo mismo, se vea o no se vea el garitero.
   Modelo de Quaternius (Ultimate Modular Men, CC0; ver LICENSES/quaternius-garitero.md); sentado y arrodillado son
   poses hechas en Blender sobre sus animaciones. Es decoración: el tejo no choca con él. */

const GARI_UP = .5;          // pararse de la silla
const GARI_WALKT = 2.6;      // ir de la silla a la cancha (o a los palos): son unos 4 m
const GARI_DOWN = .45;       // arrodillarse
const GARI_WORK = 2.1;       // poniendo mechas: cuatro pasadas de la mano, una por mecha
const GARI_PASSES = 4;
const GARI_RISE = .45;       // pararse
const GARI_SIT = .8;         // voltearse y sentarse
const GARI_VISIT = GARI_UP + GARI_WALKT + GARI_DOWN + GARI_WORK;   // lo que se alarga el cambio de ronda cuando hay mechas por poner
const GARI_PINS = GARI_UP + GARI_WALKT + GARI_DOWN + .6;           // en el bolo: llega, se arrodilla y para los palos con la mano
const GARI_WALK = 1.15;      // m/s a los que se ve bien la animación de caminar a ritmo normal
const GARI_CHAIR = { x: -2.55, dz: 4.45, yaw: 1.83 };   // la silla de adelante de la mesa de la izquierda (la pone 01d-ambiente): mirando al salón, un poquito hacia la cancha
const GARI_HAND = V(-.325, .418, .578);   // dónde queda la mano derecha arrodillado, respecto a sus pies (mirando hacia +z)
const GARI_COLORS = { Skin: '#c98e66', Eyebrows: '#1d140e', Hair: '#1d140e' };   // trigueño, pelo y cejas negras
const GARI_NECK = 1.05;      // lo más que voltea la cabeza (rad)
const GARI_SHOO = { d: 2.6, flee: .55, at: .7 };   // a qué distancia espanta al perro, qué tan seguido el perro le hace caso y cuándo (s)
let GARI = null;

function loadGaritero() {
  if (GARI || !THREE.GLTFLoader || typeof GARI_GLB !== 'string') return;
  GARI = { src: null, p: null, show: false };
  try {
    const bin = Uint8Array.from(atob(GARI_GLB), ch => ch.charCodeAt(0)).buffer;
    const L = new THREE.GLTFLoader();
    if (window.MeshoptDecoder) L.setMeshoptDecoder(MeshoptDecoder);
    L.parse(bin, '', g => { GARI.src = g; placeGaritero(); }, () => { });
  } catch (e) { }
}

const gYaw = (v, yaw) => v.clone().applyAxisAngle(_gup, yaw);
// la silla y los puntos alrededor (cambian con la distancia de la cancha)
function gariSpots() {
  const c = V(GARI_CHAIR.x, 0, -W.D + GARI_CHAIR.dz), yaw = GARI_CHAIR.yaw;
  return { chair: c, yaw, seat: c.clone().add(gYaw(V(0, 0, .04), yaw)), stand: c.clone().add(gYaw(V(0, 0, .42), yaw)) };
}
// dónde se arrodilla para que la mano caiga en las mechas (o en los palos del bolo)
function gariKneel(kind) {
  const yaw = kind === 'bolo' ? Math.PI / 2 : Math.PI;
  // en el tejo, un poquito a la izquierda del centro: así el pie de adelante queda por fuera de la caja de la cancha
  const tgt = kind === 'bolo' ? V(0, 0, BOLO.Z0 - BOLO.GAP) : V(W.C.x - .04, 0, W.C.z - .05);
  return { pos: tgt.sub(gYaw(V(GARI_HAND.x, 0, GARI_HAND.z), yaw)), yaw };
}

// Se sienta en su silla (se llama cada vez que se arma el salón, que cambia con la distancia)
function placeGaritero() {
  if (!GARI || !GARI.src || !hall) return;
  if (GARI.p && GARI.p.root.parent) GARI.p.root.parent.remove(GARI.p.root);
  const root = GARI.src.scene;
  root.traverse(o => {
    if (!o.isMesh) return;
    o.frustumCulled = false; o.castShadow = true;
    [].concat(o.material).forEach(m => { m.metalness = 0; m.roughness = Math.max(.6, m.roughness); if (GARI_COLORS[m.name]) m.color.set(GARI_COLORS[m.name]); });
  });
  hall.add(root);
  if (!GARI.p) {
    const mixer = new THREE.AnimationMixer(root), acts = {};
    GARI.src.animations.forEach(c => { acts[c.name] = mixer.clipAction(c); });
    GARI.p = { root, mixer, acts, cur: null, plan: null, wave: 0, cheerIn: 0, shoo: 0, shooFlee: 0, neck: root.getObjectByName('Neck'), head: root.getObjectByName('Head'), ly: 0, lp: 0 };
  }
  gariSeat(GARI.p);
}
function gariSeat(p) {
  const sp = gariSpots();
  p.plan = null; p.wave = 0; p.cheerIn = 0; p.shoo = p.shooFlee = 0; p.ly = p.lp = 0;
  p.root.position.copy(sp.seat); p.root.rotation.set(0, sp.yaw, 0);
  gPlay(p, p.acts.Sentado, 0);
}

// Pasa a otra animación con un cruce suave; once: una sola vez y se queda en el último cuadro
function gPlay(p, act, fade = .3, once = false) {
  if (!act || p.cur === act) return;
  act.reset(); act.enabled = true; act.setEffectiveWeight(1); act.timeScale = 1;
  if (once) { act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; } else act.setLoop(THREE.LoopRepeat, Infinity);
  act.play(); if (p.cur && fade) p.cur.crossFadeTo(act, fade, false); else if (p.cur) p.cur.stop(); p.cur = act;
}
// Alguien hizo algo bueno: saluda desde la silla
function gariCheer() { const p = GARI && GARI.p; if (p && !p.plan && !p.wave && !p.shoo) p.cheerIn = .25 + Math.random() * .3; }

/* ---------- Ir a la cancha y volver ----------
   El plan es una lista de pasos: pararse, caminar, arrodillarse, trabajar, pararse, caminar y sentarse. */
function gariGo(p, kind, mechas) {
  const sp = gariSpots(), kn = gariKneel(kind);
  p.wave = 0; p.cheerIn = 0; p.shoo = p.shooFlee = 0;
  p.plan = { kind, i: -1, t: 0, mechas: mechas || [], pins: kind === 'bolo', steps: [
    { k: 'up', dur: GARI_UP, from: p.root.position.clone(), to: sp.stand, yaw: sp.yaw },
    { k: 'walk', dur: GARI_WALKT, to: kn.pos },
    { k: 'down', dur: GARI_DOWN, yaw: kn.yaw },
    { k: 'work', dur: kind === 'bolo' ? 1.1 : GARI_WORK },
    ...gariBackSteps(kn.pos),
  ] };
  gariNext(p);
}
function gariBackSteps(from) {
  const sp = gariSpots();
  return [{ k: 'rise', dur: GARI_RISE }, { k: 'walk', dur: Math.max(.6, from.distanceTo(sp.stand) / GARI_WALK), to: sp.stand },
    { k: 'sit', dur: GARI_SIT, to: sp.seat, yaw: sp.yaw }];
}
// La ronda nueva empezó antes de que acabara (tocaron la pantalla): deja lo que esté haciendo y se devuelve
function gariBack(p) {
  const pl = p.plan; if (!pl) return;
  const s = pl.steps[pl.i];
  if (!s || s.k === 'rise' || (s.k === 'walk' && pl.i > 2) || s.k === 'sit') return;   // ya va de vuelta
  pl.mechas = []; pl.pins = false;
  const back = gariBackSteps(p.root.position);
  pl.steps = s.k === 'down' || s.k === 'work' ? back : back.slice(1);
  pl.i = -1; gariNext(p);
}
function gariNext(p) {
  const pl = p.plan; pl.i++; pl.t = 0;
  const s = pl.steps[pl.i];
  if (!s) { p.plan = null; gariSeat(p); return; }
  s.from = s.from || p.root.position.clone(); s.yaw0 = p.root.rotation.y;
  const A = p.acts;
  if (s.k === 'up' || s.k === 'rise') gPlay(p, A.Idle, s.dur * .9);
  else if (s.k === 'walk') {
    gPlay(p, A.Walk, .3);
    if (A.Walk) A.Walk.timeScale = clamp(s.from.distanceTo(s.to) / s.dur / GARI_WALK, .6, 1.6);
  } else if (s.k === 'down') {
    gPlay(p, A.Agachado, s.dur);
    const ag = A.Agachado; if (ag) ag.timeScale = GARI_PASSES * ag.getClip().duration / GARI_WORK;
  } else if (s.k === 'work') { const ag = A.Agachado; pl.phase = ag ? (ag.time / ag.getClip().duration) % 1 : 0; }
  else if (s.k === 'sit') gPlay(p, A.Sentado, s.dur * .8);
}
const gEase = k => k * k * (3 - 2 * k);
function gTurn(r, yaw, k) { r.rotation.y += Math.atan2(Math.sin(yaw - r.rotation.y), Math.cos(yaw - r.rotation.y)) * k; }
function gariStep(p, dt) {
  const pl = p.plan, s = pl.steps[pl.i], r = p.root;
  pl.t += dt; const k = Math.min(1, pl.t / s.dur);
  if (s.k === 'up') { r.position.lerpVectors(s.from, s.to, gEase(k)); r.rotation.y = s.yaw; }
  else if (s.k === 'walk') {   // camina mirando hacia donde va
    r.position.lerpVectors(s.from, s.to, k);
    gTurn(r, Math.atan2(s.to.x - s.from.x, s.to.z - s.from.z), Math.min(1, dt * 9));
  } else if (s.k === 'down') gTurn(r, s.yaw, Math.min(1, dt * 7));
  else if (s.k === 'work') {   // cada vez que la mano llega a la greda pone una de las mechas que faltan
    const ag = p.acts.Agachado;
    if (ag) {
      const ph = (ag.time / ag.getClip().duration) % 1;
      if (pl.phase < .5 && ph >= .5) { if (pl.mechas.length) gariPut(pl.mechas.shift()); if (pl.pins) { pl.pins = false; boloResetPins(); } }   // en el bolo: la primera vez que la mano llega, se paran los palos
      pl.phase = ph;
    }
  } else if (s.k === 'sit') {   // se voltea dándole la espalda a la silla y se sienta
    gTurn(r, s.yaw, Math.min(1, dt * 6)); r.position.lerpVectors(s.from, s.to, gEase(Math.max(0, (k - .25) / .75)));
  }
  if (k >= 1) { if (s.k === 'work') { pl.mechas.splice(0).forEach(gariPut); if (pl.pins) { pl.pins = false; boloResetPins(); } } gariNext(p); }
}
function gariPut(m) { if (!m || m.userData.alive) return; m.visible = true; m.userData.alive = true; m.scale.setScalar(.01); m.userData.grow = 0; }

// Va a arreglar la cancha (o a parar los palos) y after() hace el cambio de verdad (la ronda o el turno nuevo)
function gariRun(kind, after) {
  const p = GARI && GARI.p;
  if (kind === 'tejo') {
    const burst = mechaMeshes.filter(m => !m.userData.alive);
    if (!burst.length) return after();   // no se reventó ninguna: no hay nada que poner
    if (p) { if (p.plan) gariSeat(p); gariGo(p, 'tejo', burst); }
    if (GARI) GARI.show = true;
    later(GARI_VISIT, () => { if (GARI) GARI.show = false; if (p) gariBack(p); after(); });
  } else {
    if (p) { if (p.plan) gariSeat(p); gariGo(p, 'bolo'); }
    later(GARI_PINS, after);
  }
}
// La cámara lo sigue mientras va a poner las mechas: por detrás mientras camina y, al arrodillarse, desde atrás y
// arriba (se ven la rodilla de arriba, la otra en el piso y la mano en la greda; de lado lo tapan las tablas)
// En el bolo, mientras va a parar los palos: más lejos y más alto que la cámara de los palos, para verlo llegar y arrodillarse
function gariBoloCam() {
  const pl = GARI && GARI.p && GARI.p.plan; if (!pl || pl.kind !== 'bolo') return null;
  const c = boloPinsCenter(), r = GARI.p.root.position, f = V(lerp(c.x, r.x, .5), .55, lerp(c.z, r.z, .5)), portrait = cam.aspect < 1;
  return { pos: f.clone().add(portrait ? V(1.9, 1.35, 3.0) : V(1.6, 1.1, 2.5)), look: f, fov: portrait ? 46 : 38, k: 3 };
}
function gariCamOn() { return !!(GARI && GARI.show && GARI.p && GARI.p.plan && phase === 'roundEnd' && !isRana() && !isBolo()); }
function gariCamPose() {
  const r = GARI.p.root.position, c = W.C, w = gEase(clamp(1 - r.distanceTo(gariKneel('tejo').pos) / 1.6, 0, 1));
  const portrait = cam.aspect < 1, s = portrait ? 1 : .8;
  const fWalk = V(lerp(r.x, c.x, .15), .8, lerp(r.z, c.z, .15)), pWalk = fWalk.clone().add(V(-.3 * s, 1.4, 3.8 * s));
  const fWork = V(c.x - .35, .45, c.z + .25), pWork = fWork.clone().add(V(-.15 * s, 2.05, 2.35 * s));
  return { pos: pWalk.lerp(pWork, w), look: fWalk.lerp(fWork, w), fov: portrait ? 48 : 36 };
}

function updateGaritero(dt) {
  const p = GARI && GARI.p; if (!p || !dt) return;
  if (p.plan) gariStep(p, dt);
  else {   // sentado: saluda cuando le toca, espanta al perro si pasa cerca y vuelve a quedarse quieto
    gariShoo(p, dt);
    const w = p.acts.SentadoSaludo;
    if (p.cheerIn > 0 && w) { p.cheerIn -= dt; if (p.cheerIn <= 0) { p.cheerIn = 0; gPlay(p, w, .3, true); p.wave = w.getClip().duration * .92; } }
    if (p.wave > 0) { p.wave -= dt; if (p.wave <= 0) { p.wave = 0; gPlay(p, p.acts.Sentado, .45); } }
  }
  // three.js solo reescribe un hueso si la animación lo movió: se le devuelve la pose de la animación antes de
  // actualizar, para que el giro de la cabeza no se vaya sumando de un cuadro a otro
  const bones = [p.neck, p.head].filter(Boolean);
  if (p.pose) bones.forEach((b, i) => b.quaternion.copy(p.pose[i]));
  p.mixer.update(dt);
  p.pose = bones.map((b, i) => (p.pose && p.pose[i] || new THREE.Quaternion()).copy(b.quaternion));
  gariLook(p, dt);
}

/* ---------- El perro ----------
   Una vez por visita, si el perro le pasa cerca, le hace ¡chite! con la mano. A veces el perro sale corriendo (el mismo
   susto de la bola del bolo) y a veces se queda ahí oliendo como si nada. */
function gariShoo(p, dt) {
  const dog = PETS && PETS.cur, sh = p.acts.SentadoEspantar;
  if (dog && sh && !dog.scared && !dog.gari && !p.wave && !p.shoo && dog.p.root.visible && dog.p.root.position.distanceTo(p.root.position) < GARI_SHOO.d) {
    dog.gari = true; p.cheerIn = 0;
    gPlay(p, sh, .25, true); p.shoo = sh.getClip().duration * .95;
    if (Math.random() < GARI_SHOO.flee) p.shooFlee = GARI_SHOO.at;
    else { if (!dog.stopDone && !dog.stopped) dog.stopAt = dog.s; A.woof(1, { rate: dog.p.spec.bark, delay: .55 }); }   // ni caso: le ladra una vez y se para a oler ahí mismo
  }
  if (p.shoo <= 0) return;
  p.shoo -= dt;
  if (p.shooFlee > 0) { p.shooFlee -= dt; if (p.shooFlee <= 0 && dog && dog.gari && !dog.scared) petScare(p.root.position, false); }
  if (p.shoo <= 0) { p.shoo = p.shooFlee = 0; gPlay(p, p.acts.Sentado, .45); }
}

/* ---------- A dónde mira ---------- */
// lo que va en el aire (o lo último que se lanzó, hasta que se acaba el tiro); si no, al frente
function gariTarget() {
  if (!game || !['flight', 'result', 'roundEnd'].includes(phase)) return null;
  if (isBolo()) { const m = bflight ? bflight.mesh : game.ball; return m && m.visible ? m.position : null; }
  if (isRana()) return rflight && rflight.mesh ? rflight.mesh.position : null;
  const m = flight ? flight.mesh : game.tejos.length && game.tejos[game.tejos.length - 1].mesh;
  return m ? m.position : null;
}
const gWrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const _gqa = new THREE.Quaternion(), _gqb = new THREE.Quaternion(), _gqw = new THREE.Quaternion(), _gqp = new THREE.Quaternion();
const _gax = new THREE.Vector3(), _ghp = new THREE.Vector3(), _gup = new THREE.Vector3(0, 1, 0);
// Sentado voltea la cabeza (mitad el cuello y mitad la cabeza) hacia lo que va en el aire; caminando o trabajando
// mira al frente. Va después de la animación: la cabeza se mueve encima de lo que esté haciendo.
function gariLook(p, dt) {
  if (!p.head) return;
  const dog = p.shoo > 0 && PETS && PETS.cur && PETS.cur.p.root.visible ? PETS.cur.p.root.position.clone().setY(.25) : null;   // espantando: mira al perro
  const r = p.root, T = !p.plan && (dog || gariTarget()); let yaw = 0, pitch = 0;
  if (T) {
    r.updateMatrixWorld(true); p.head.getWorldPosition(_ghp);
    yaw = clamp(gWrap(Math.atan2(T.x - _ghp.x, T.z - _ghp.z) - r.rotation.y), -GARI_NECK, GARI_NECK);
    pitch = clamp(Math.atan2(T.y - _ghp.y, Math.hypot(T.x - _ghp.x, T.z - _ghp.z)), -.55, .5);
  }
  const k = Math.min(1, dt * 7); p.ly += (yaw - p.ly) * k; p.lp += (pitch - p.lp) * k;
  if (Math.abs(p.ly) + Math.abs(p.lp) < 1e-3) return;
  r.updateMatrixWorld(true);
  const look = r.rotation.y + p.ly; _gax.set(-Math.cos(look), 0, Math.sin(look));   // el eje para subir o bajar la cara
  _gqa.setFromAxisAngle(_gup, p.ly / 2); _gqb.setFromAxisAngle(_gax, p.lp / 2); _gqa.premultiply(_gqb);
  [p.neck, p.head].forEach(b => {
    if (!b || !b.parent) return;
    b.getWorldQuaternion(_gqw).premultiply(_gqa); b.parent.getWorldQuaternion(_gqp).invert();
    b.quaternion.copy(_gqp.multiply(_gqw)); b.updateMatrixWorld(true);
  });
}

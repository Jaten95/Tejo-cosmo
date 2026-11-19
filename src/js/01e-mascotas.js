
/* ================= Mascotas de paso =================
   De vez en cuando un perro cruza el salón: entra por un lado, se mete hasta cerca de la cancha,
   cruza el carril y vuelve por el otro lado. En algún punto del camino se detiene a oler o a mirar y sigue.
   Modelos de Quaternius (CC0, ver LICENSES/quaternius-animales.md).
   Es decoración: el tejo no choca con ellos. En las salas el anfitrión decide cuándo sale y manda una semilla:
   con ella todos sacan el mismo perro, el mismo pelaje, el mismo camino y las mismas paradas (ver petOnline).
   En el bolo sí: si la bola le pasa cerca se asusta (brinca y sale corriendo) y si le pega, chilla y huye
   (y el que lanzó pierde un punto, ver 04c-bolo.js). En las salas de bolo, el que lanza manda cómo iba su perro al
   soltar la bola y todos ponen el suyo igual (petState / petSync): así la bola le pega, o no, en todos los celulares. */

const PET_TIMING = { first: [20, 45], every: [45, 90] };   // segundos: primera visita y las siguientes
const PET_SPEC = {   // qué tan seguido sale, escala, velocidad en m/s, ritmo de la caminada, tono del ladrido, qué hace al detenerse y sus colores
  perro: {   // perro criollo: el shiba con pelajes de la calle
    weight: 3, scale: .2, speed: .9, walkRate: 1.9, bark: 1.04, stops: ['Eating', 'Idle_2_HeadLow', 'Idle'], mats: ['Main', 'Main_Light'],
    colors: [['#7a4420', '#dccbb0'], ['#121110', '#cdb999'], ['#b8894a', '#efe3cc'], ['#45291a', '#d6c3a3'], ['#e9e2d6', '#f4efe6']],   // canela, negro, mono, café, blanco
  },
  husky: { weight: 1, scale: .22, speed: .95, walkRate: 1.9, bark: .88, stops: ['Eating', 'Idle_2_HeadLow', 'Idle'], mats: ['Material', 'Material.001'], colors: [['#4a4d52', '#ebe8e2']] },
};
let PETS = null;

function loadPets() {
  if (PETS || !THREE.GLTFLoader || typeof PET_GLB !== 'object') return;
  PETS = { list: {}, cur: null, wait: rand(...PET_TIMING.first) };
  Object.entries(PET_GLB).forEach(([name, b64]) => {
    try {
      const bin = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0)).buffer;
      new THREE.GLTFLoader().parse(bin, '', g => {
        const spec = PET_SPEC[name], root = new THREE.Group(), o = g.scene;
        o.scale.setScalar(spec.scale); root.add(o);
        const mats = {};
        o.traverse(m => {
          if (!m.isMesh) return;
          m.castShadow = true; m.frustumCulled = false;   // con esqueleto la caja no sirve para recortar
          [].concat(m.material).forEach(mt => { mt.metalness = 0; mt.roughness = Math.max(.6, mt.roughness); mats[mt.name] = mt; });   // sin brillo metálico
        });
        const mixer = new THREE.AnimationMixer(o), acts = {};
        g.animations.forEach(a => { acts[a.name] = mixer.clipAction(a); });
        if (!acts.Walk) return;
        root.visible = false; scene.add(root);
        PETS.list[name] = { name, spec, root, mixer, acts, mats };
      }, () => { });
    } catch (e) { }
  });
}

// Números al azar a partir de una semilla (mulberry32): con la misma semilla, la misma visita en todos los celulares
function petRng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// El recorrido: entra por detrás de quien lanza, se mete hasta cerca de la cancha, cruza y vuelve por el otro lado
function petPath(rev, R = Math.random) {
  const zt = Math.min(-6, -(W.D - 4.6)), f = k => k * zt;
  const pts = [[-3.1, 2.7], [-2.95, -1.2], [-2.3, f(.33)], [-1.6, f(.47)], [-1.15, f(.7)], [-.7, f(.94)], [.1, f(1)], [.9, f(1.02)],
    [1.5, f(.97)], [1.8, f(.88)], [1.75, f(.72)], [1.6, f(.56)], [1.5, f(.42)], [2.3, -2.4], [2.95, .2], [3.1, 2.7]];
  if (rev) pts.reverse();
  return new THREE.CatmullRomCurve3(pts.map(([x, z], i) => V(x + (i && i < pts.length - 1 ? (R() - .5) * .3 : 0), 0, z)), false, 'centripetal');
}

/* Todo lo que se sortea en la visita sale de la semilla y de una vez, en el mismo orden en todos los celulares
   (sortear después, en plena caminada, podría caer en otro orden en cada uno) */
function startPet(seed = Math.random() * 4294967296) {
  const pets = Object.values(PETS.list).sort((a, b) => a.name < b.name ? -1 : 1); if (!pets.length) return;   // el orden en que cargan los modelos cambia de un celular a otro
  if (PETS.cur) endPet();
  const R = petRng(seed);
  let r = R() * pets.reduce((a, q) => a + q.spec.weight, 0), p = pets[0];
  for (const q of pets) { r -= q.spec.weight; if (r < 0) { p = q; break; } }
  const col = p.spec.colors[Math.floor(R() * p.spec.colors.length)];   // cada visita con su pelaje
  p.spec.mats.forEach((n, i) => { if (p.mats[n]) p.mats[n].color.set(col[i]); });
  const curve = petPath(R() < .5, R), len = curve.getLength();
  const stopAt = (.15 + R() * .7) * len, stopFor = 2.5 + R() * 2.5, stopPick = R(), flee = R() < GARI_SHOO.flee;   // flee: si el garitero lo espanta, ¿le hace caso?
  PETS.cur = { p, seed, curve, len, s: 0, stopAt, stopFor, stopPick, flee, stopT: 0, stopped: false, stopDone: false, yaw: null };
  p.mixer.stopAllAction();
  const w = p.acts.Walk; w.reset(); w.timeScale = p.spec.walkRate; w.setEffectiveWeight(1); w.play();
  p.root.visible = true; placePet(PETS.cur, 0);
}
function placePet(c, dt) {
  const u = Math.min(1, c.s / c.len), tan = c.curve.getTangentAt(u), yaw = Math.atan2(tan.x, tan.z);   // el modelo mira hacia +z
  c.p.root.position.copy(c.curve.getPointAt(u));
  if (c.yaw === null) c.yaw = yaw; else { const d = Math.atan2(Math.sin(yaw - c.yaw), Math.cos(yaw - c.yaw)); c.yaw += d * Math.min(1, dt * 5); }
  c.p.root.rotation.y = c.yaw;
}
function petFade(from, to, rate) { to.reset(); to.timeScale = rate; to.setEffectiveWeight(1); to.play(); from.crossFadeTo(to, .4, false); }
function endPet() {
  const c = PETS.cur;
  if (c) { c.p.root.visible = false; c.p.mixer.stopAllAction(); }
  PETS.cur = null; PETS.wait = rand(...PET_TIMING.every);
}

/* En las salas: solo el anfitrión cuenta el tiempo y sortea la semilla. La manda en su estado (pet: {n, s}) y
   cada uno arranca la visita apenas le llega (petHear, desde netSync). Si el anfitrión se va, el nuevo sigue contando. */
function petOnline() { return online() && !!NET.sala; }
function petHostStart() {
  const seed = Math.floor(Math.random() * 4294967296);
  PETS.n = (PETS.n || 0) + 1;
  NET.sala.presence({ pet: { n: PETS.n, s: seed } }).catch(() => { });
  startPet(seed);
}
function petHear(peers) {
  if (!PETS || !NET.g) return;
  NET.petSeen = NET.petSeen || {};
  const host = NET.g.host; if (host === NET.pid) return;
  for (const peer of peers) {
    const pr = peer.presence || {}; if (pr.pid !== host) continue;
    const v = pr.pet, n = v && Number.isInteger(v.n) ? v.n : 0, seen = NET.petSeen[host];
    if (seen === undefined || n <= seen) { if (seen === undefined) NET.petSeen[host] = n; return; }   // al llegar a la sala no se repite una visita vieja
    NET.petSeen[host] = n;
    if (Number.isFinite(v.s) && phase !== 'menu' && phase !== 'boot' && !isRana() && !(PETS.cur && PETS.cur.seed === v.s)) startPet(v.s);   // (si ya la arrancó un tiro de bolo, sigue)
    return;
  }
}

/* Bolo en las salas: cómo va el perro al soltar la bola (en qué punto del camino, si está parado y cuánto le falta,
   si ya se paró antes y si el garitero ya lo espantó). Viaja con el tiro. */
function petState() {
  const c = PETS && PETS.cur; if (!c || c.scared || !c.p.root.visible || !Number.isFinite(c.seed)) return null;
  const r3 = x => Math.round(x * 1e3) / 1e3;
  return { k: c.seed, s: r3(c.s), a: r3(c.stopAt), w: c.stopped ? r3(Math.max(0, c.stopT)) : -1, d: c.stopDone ? 1 : 0, g: c.gari ? 1 : 0 };
}
function petStateOk(d) {
  return d && typeof d === 'object' && [d.k, d.s, d.a, d.w].every(Number.isFinite) ? { k: d.k, s: d.s, a: d.a, w: d.w, d: d.d ? 1 : 0, g: d.g ? 1 : 0 } : null;
}
/* Pone el perro tal cual venía en el celular del que lanzó (también en el del que lanzó: sin fundido de animaciones a
   medias, que cambiaría lo que avanza). Dice si esta vez se revisa la bola contra el perro. */
function petSync(d) {
  d = petStateOk(d); if (!PETS || !d) return false;
  let c = PETS.cur;
  if (c && c.scared) return false;   // aquí ya iba corriendo asustado: este tiro no lo toca
  if (!c || c.seed !== d.k) { startPet(d.k); c = PETS.cur; if (!c) return false; }   // aquí todavía no había llegado esa visita
  const walk = c.p.acts.Walk, st = c.p.spec.stops;
  c.s = clamp(d.s, 0, c.len); c.stopAt = d.a; c.stopDone = !!d.d; if (d.g) c.gari = true;
  c.stopped = d.w >= 0; c.stopT = c.stopped ? d.w : 0;
  c.stopAct = c.stopped ? c.p.acts[st[Math.floor(c.stopPick * st.length)]] || c.p.acts.Idle || walk : null;
  const act = c.stopped ? c.stopAct : walk;
  c.p.mixer.stopAllAction(); act.reset(); act.timeScale = act === walk ? c.p.spec.walkRate : 1; act.setEffectiveWeight(1); act.play();
  placePet(c, 0);
  return true;
}

/* Bolo: el perro y la bola. petBallCheck dice si la bola le pegó (hit) y a qué distancia le pasa por el piso (d) */
const PET_RUN = 3.4;   // corriendo asustado: la caminada a este ritmo
function petBody() {
  const c = PETS && PETS.cur; if (!c || !c.p.root.visible) return null;
  const r = c.p.root.position, fw = V(Math.sin(c.p.root.rotation.y), 0, Math.cos(c.p.root.rotation.y)), hl = .27 * c.p.spec.scale / .2;
  return { a: r.clone().addScaledVector(fw, -hl).setY(.2), b: r.clone().addScaledVector(fw, hl).setY(.24), r: .13 * c.p.spec.scale / .2 };
}
function petBallCheck(ball, rad) {
  const c = PETS && PETS.cur, body = petBody(); if (!c || !body || c.scared) return null;
  const ab = body.b.clone().sub(body.a), u = clamp(ball.clone().sub(body.a).dot(ab) / ab.lengthSq(), 0, 1), q = body.a.clone().addScaledVector(ab, u);
  return { hit: ball.distanceTo(q) < body.r + rad, d: ball.y < 1.4 ? Math.hypot(ball.x - q.x, ball.z - q.z) : 9 };
}
// Se asusta: brinca y sale corriendo por el lado contrario a la bola, de vuelta hacia atrás del salón
function petScare(ball, hit) {
  const c = PETS && PETS.cur; if (!c || c.scared) return;
  const p0 = c.p.root.position.clone().setY(0), side = Math.sign(p0.x - ball.x) || (p0.x >= 0 ? 1 : -1), x = side * 2.95;
  c.curve = new THREE.CatmullRomCurve3([p0, V((p0.x + x) / 2, 0, p0.z + .9), V(x, 0, p0.z + 3), V(x, 0, Math.min(1.5, p0.z + 9)), V(side * 3.1, 0, 2.7)], false, 'centripetal');
  c.len = c.curve.getLength(); c.s = 0; c.yaw = null; c.stopDone = true;
  c.scared = { t: 0, hit };
  const walk = c.p.acts.Walk;
  if (c.stopped && c.stopAct && c.stopAct !== walk) petFade(c.stopAct, walk, c.p.spec.walkRate * PET_RUN); else { walk.timeScale = c.p.spec.walkRate * PET_RUN; if (!walk.isRunning()) { walk.reset(); walk.play(); } }
  c.stopped = false;
  if (hit) { A.tone(1250, .13, { f1: 820, type: 'triangle', gain: .32 }); A.tone(1350, .16, { f1: 760, type: 'triangle', gain: .3, delay: .2 }); A.tone(1200, .2, { f1: 650, type: 'triangle', gain: .26, delay: .45 }); }   // ¡cain, cain!
  else A.woof(2, { rate: c.p.spec.bark });   // ¡guau, guau!
}
function updatePets(dt) {
  if (!PETS) return;
  if (isRana()) { if (PETS.cur) endPet(); return; }   // en la rana no pasan perros
  const c = PETS.cur, inGame = phase !== 'menu' && phase !== 'boot';
  if (!c) {
    if (!inGame || !dt) return;
    PETS.wait -= dt;
    if (petOnline()) { if (amHost() && PETS.wait <= 0 && (phase === 'aim' || phase === 'wait')) petHostStart(); return; }   // los demás esperan la semilla del anfitrión
    if (PETS.wait <= 0 && (phase === 'aim' || phase === 'cpu')) startPet();
    return;
  }
  if (!inGame) { endPet(); return; }
  if (!dt) return;
  c.p.mixer.update(dt);
  const walk = c.p.acts.Walk;
  if (c.stopped) {
    c.stopT -= dt;
    if (c.stopT <= 0) { c.stopped = false; c.stopDone = true; petFade(c.stopAct, walk, c.p.spec.walkRate); }
  } else if (!c.stopDone && c.s >= c.stopAt) {
    c.stopped = true; c.stopT = c.stopFor;
    const st = c.p.spec.stops; c.stopAct = c.p.acts[st[Math.floor(c.stopPick * st.length)]] || c.p.acts.Idle || walk;
    if (c.stopAct !== walk) petFade(walk, c.stopAct, 1);
  }
  // avanza al ritmo de la caminada: frena suave al detenerse y arranca suave al seguir
  const k = walk.isRunning() ? walk.getEffectiveWeight() : 0;
  c.s += c.p.spec.speed * k * dt * (c.scared ? PET_RUN : 1);
  placePet(c, dt);
  if (c.scared) {   // el brinco del susto (más alto si lo golpearon) y, si lo golpearon, se ladea un momento
    const q = c.scared; q.t += dt; const h = q.hit ? .22 : .14, d = .38;
    c.p.root.position.y = q.t < d ? Math.sin(Math.PI * q.t / d) * h : 0;
    c.p.root.rotation.z = q.hit && q.t < .5 ? Math.sin(q.t * 30) * .25 * (1 - q.t / .5) : 0;
  }
  if (c.s >= c.len) endPet();
}

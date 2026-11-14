
/* ================= Mascotas de paso =================
   De vez en cuando un perro cruza el salón: entra por un lado, se mete hasta cerca de la cancha,
   cruza el carril y vuelve por el otro lado. En algún punto del camino se detiene a oler o a mirar y sigue.
   Modelos de Quaternius (CC0, ver LICENSES/quaternius-animales.md).
   Es decoración: el tejo no choca con ellos y en las salas cada quien ve los suyos.
   En el bolo sí: si la bola le pasa cerca se asusta (brinca y sale corriendo) y si le pega, chilla y huye
   (y el que lanzó pierde un punto, ver 04c-bolo.js). Por eso en las salas de bolo no pasan perros. */

const PET_TIMING = { first: [20, 45], every: [45, 90] };   // segundos: primera visita y las siguientes
const PET_SPEC = {   // qué tan seguido sale, escala, velocidad en m/s, ritmo de la caminada, qué hace al detenerse y sus colores
  perro: {   // perro criollo: el shiba con pelajes de la calle
    weight: 3, scale: .2, speed: .9, walkRate: 1.9, stops: ['Eating', 'Idle_2_HeadLow', 'Idle'], mats: ['Main', 'Main_Light'],
    colors: [['#7a4420', '#dccbb0'], ['#121110', '#cdb999'], ['#b8894a', '#efe3cc'], ['#45291a', '#d6c3a3'], ['#e9e2d6', '#f4efe6']],   // canela, negro, mono, café, blanco
  },
  husky: { weight: 1, scale: .22, speed: .95, walkRate: 1.9, stops: ['Eating', 'Idle_2_HeadLow', 'Idle'], mats: ['Material', 'Material.001'], colors: [['#4a4d52', '#ebe8e2']] },
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

// El recorrido: entra por detrás de quien lanza, se mete hasta cerca de la cancha, cruza y vuelve por el otro lado
function petPath(rev) {
  const zt = Math.min(-6, -(W.D - 4.6)), f = k => k * zt;
  const pts = [[-3.1, 2.7], [-2.95, -1.2], [-2.3, f(.33)], [-1.6, f(.47)], [-1.15, f(.7)], [-.7, f(.94)], [.1, f(1)], [.9, f(1.02)],
    [1.5, f(.97)], [1.8, f(.88)], [1.75, f(.72)], [1.6, f(.56)], [1.5, f(.42)], [2.3, -2.4], [2.95, .2], [3.1, 2.7]];
  if (rev) pts.reverse();
  return new THREE.CatmullRomCurve3(pts.map(([x, z], i) => V(x + (i && i < pts.length - 1 ? rand(-.15, .15) : 0), 0, z)), false, 'centripetal');
}

function startPet() {
  const pets = Object.values(PETS.list); if (!pets.length) return;
  let r = Math.random() * pets.reduce((a, q) => a + q.spec.weight, 0), p = pets[0];
  for (const q of pets) { r -= q.spec.weight; if (r < 0) { p = q; break; } }
  const col = p.spec.colors[Math.floor(Math.random() * p.spec.colors.length)];   // cada visita con su pelaje
  p.spec.mats.forEach((n, i) => { if (p.mats[n]) p.mats[n].color.set(col[i]); });
  const curve = petPath(Math.random() < .5), len = curve.getLength();
  PETS.cur = { p, curve, len, s: 0, stopAt: rand(.15, .85) * len, stopT: 0, stopped: false, stopDone: false, yaw: null };
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
  else { A.tone(520, .09, { f1: 380, type: 'sawtooth', gain: .12 }); A.tone(560, .1, { f1: 400, type: 'sawtooth', gain: .12, delay: .15 }); }   // ¡guau!
}
function updatePets(dt) {
  if (!PETS) return;
  if (isRana() || (isBolo() && online())) { if (PETS.cur) endPet(); return; }   // en la rana no pasan perros; en las salas de bolo tampoco (cada quien vería el suyo y un golpe cambiaría los puntos)
  const c = PETS.cur, inGame = phase !== 'menu' && phase !== 'boot';
  if (!c) {
    if (!inGame || !dt) return;
    PETS.wait -= dt;
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
    c.stopped = true; c.stopT = rand(2.5, 5);
    const st = c.p.spec.stops; c.stopAct = c.p.acts[st[Math.floor(Math.random() * st.length)]] || c.p.acts.Idle || walk;
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

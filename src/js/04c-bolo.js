
/* ================= Bolo criollo =================
   El juego santandereano de los tres palos: tres palos de pino de 60 cm en fila india (separados 20 cm) al fondo
   del carril de tierra, donde estaba la greda, y detrás las tablas (los matacheros) donde rebota la bola.
   Un tiro por turno, por el aire, con una bola de aluminio. Vale cada palo que la bola tumbe pegándole
   por el lado de la mano de quien lanza (al derecho, por la derecha; al zurdo, por la izquierda), y los que esos
   palos tumben al caer. Los que tumba por el otro lado o de rebote en las tablas no valen. Los tres de un tiro: ¡CHUZA!
   La física es propia y determinista (el aleatorio sale de una semilla), así en las salas todos ven lo mismo.
   Estadísticas por jugador (en los mismos campos del tejo para que las salas no cambien):
   st.mechas = palos que valieron · st.mon = chuzas · st.manos = palos que no valieron · st.nulos = tiros en blanco · st.tiros = tiros. */

const BOLO = {
  D: 20.5,                          // largo del salón (donde estaba la greda); los palos quedan a unos 20 m de la raya
  Z0: -19.55,                       // el palo de adelante (deja espacio para que los palos caigan antes de las tablas)
  ZB: -20.76,                       // la cara de las tablas de atrás, delante del tablero del salón
  PH: .6, PR: .028, GAP: .2,        // palo: alto, radio y separación (en fila india)
  BR: .052,                         // radio de la bola
  ROLL: 4.8,                        // freno de la tierra cuando la bola ya cayó y rueda (m/s²): es pesada y la tierra la agarra
  KEEP: [.13, .22],                 // lo que le queda de velocidad al caer (se entierra un poco): rueda más entre más duro venga
  P0: .55, SPAN: 15,                // fuerza que llega a los palos y metros por unidad de fuerza
  THETA: .42,                       // ángulo de salida por el aire
  KNOCK: .45,                       // velocidad mínima para tumbar un palo (m/s)
};
const BOLO_GOAL = { presets: [15], min: 3, max: 99, step: 1 };
function clampBoloGoal(v) { v = Math.round(+v); return isFinite(v) ? Math.min(BOLO_GOAL.max, Math.max(BOLO_GOAL.min, v)) : 15; }
const boloPinPos = i => ({ x: 0, z: BOLO.Z0 - i * BOLO.GAP });

let BOLO_M = null;    // los palos, las tablas y lo del lado izquierdo, en la escena
let bflight = null;   // la bola en el aire (y rodando después de caer)
let breplay = null;   // repetición de la chuza
function isBolo() { return !!(game && game.kind === 'bolo'); }
// Qué juego se ve en el salón: en el menú el que está escogido; jugando, el de la partida
function shownGame() { return (phase === 'menu' || phase === 'boot' || !game) ? settings.game : (game.kind || 'tejo'); }
function handOf(p) { return p && p.zurdo ? -1 : 1; }   // 1 = derecho, -1 = zurdo

/* ---------- Física de la bola y los palos ---------- */
// Dónde sale la bola: el derecho lanza desde la derecha del carril, el zurdo desde la izquierda
function boloStart(hand) { return V(hand * .32, 1.0, -.25); }
// Velocidad de salida: va derecho hacia el punto de los palos que se apunta (L = metros de lado en la fila de palos);
// la fuerza dice dónde cae
function boloVel(aim, hand) {
  const s = boloStart(hand), tx = aim.L, tz = BOLO.Z0;
  const dx = tx - s.x, dz = tz - s.z, d0 = Math.hypot(dx, dz), ux = dx / d0, uz = dz / d0;
  const reach = Math.max(1.5, -BOLO.Z0 + (aim.P - BOLO.P0) * BOLO.SPAN + s.z);   // a lo largo de la dirección
  const c = Math.cos(BOLO.THETA), tn = Math.tan(BOLO.THETA), h = BOLO.BR - s.y;
  const v = Math.sqrt(G * reach * reach / (2 * c * c * Math.max(.05, reach * tn - h)));
  return V(ux * v * c, v * Math.sin(BOLO.THETA), uz * v * c);
}

/* Simula el tiro completo. k es el número del tiro: con él sale el aleatorio, igual en todos los celulares.
   withPins = false sirve para la mira: dónde cae la bola si no pega en nada. */
function boloSimulate(aim, hand, k, withPins = true) {
  const rnd = i => seeded(aim.L * 5.31 + i * .191, aim.P * 7.13 + k * .277, k * 2.3 + i + 7);
  const p = boloStart(hand), v = boloVel(aim, hand), dt = 1 / 240, R = BOLO.BR;
  const pins = [0, 1, 2].map(i => ({ i, ...boloPinPos(i), down: false }));
  const path = [{ t: 0, p: p.clone() }], events = [], falls = [];
  const drift = (rnd(0) - .5) * .012;   // la tierra no es pareja: la bola se va un poquito de lado al rodar
  let t = 0, mode = 'air', rebound = false, land = null, ri = 1;
  const ev = (kind, q, extra) => events.push({ t, kind, p: q.clone(), ...extra });
  const fall = (pin, dir, at, valid, why) => {
    pin.down = true; falls.push({ i: pin.i, t: at, dir: { x: dir.x, z: dir.z }, valid, why });
    if (why === 'palo') events.push({ t: at, kind: 'palo', p: V(pin.x, .12, pin.z), chain: true });
    events.push({ t: at + .36, kind: 'suelo', p: V(pin.x + dir.x * .3, .02, pin.z + dir.z * .3) });
    // al caer tumba los que estén en su camino (un palo mide 60 cm y están a 20)
    pins.forEach(o => {
      if (o.down) return;
      const rx = o.x - pin.x, rz = o.z - pin.z, pr = rx * dir.x + rz * dir.z, perp = Math.abs(rx * dir.z - rz * dir.x);
      if (pr > 0 && pr < BOLO.PH * .92 && perp < BOLO.PR * 2 + .008) {
        const n = Math.hypot(rx, rz), nd = V(dir.x * .8 + rx / n * .2, 0, dir.z * .8 + rz / n * .2).normalize();
        fall(o, nd, at + .12 + .22 * pr / BOLO.PH, valid, 'palo');
      }
    });
  };
  for (let i = 0; i < 2400; i++) {
    if (mode === 'air') { v.y -= G * dt; p.addScaledVector(v, dt); }
    else {
      const sp = Math.hypot(v.x, v.z), dec = BOLO.ROLL * dt;
      if (sp <= dec) { v.set(0, 0, 0); break; }
      v.x -= v.x / sp * dec; v.z -= v.z / sp * dec;
      if (sp > .3) { const lat = drift * dt; v.x += -v.z / sp * lat; v.z += v.x / sp * lat; }
      p.x += v.x * dt; p.z += v.z * dt;
    }
    t += dt;
    // toca el piso: la tierra se la traga un poco y sigue rodando
    if (mode === 'air' && p.y <= R) {
      p.y = R; mode = 'roll';
      const keep = BOLO.KEEP[0] + rnd(ri++) * (BOLO.KEEP[1] - BOLO.KEEP[0]);
      const a = (rnd(ri++) - .5) * .16, c = Math.cos(a), s = Math.sin(a), x = v.x * c - v.z * s, z = v.x * s + v.z * c;
      v.x = x * keep; v.z = z * keep; v.y = 0;
      if (!land) land = p.clone();
      ev('cae', p);
    }
    // los palos
    if (withPins) pins.forEach(pin => {
      if (pin.down) return;
      const dx = pin.x - p.x, dz = pin.z - p.z, dh = Math.hypot(dx, dz);
      if (dh >= R + BOLO.PR || p.y - R > BOLO.PH) return;
      const sp3 = v.length(), spH = Math.hypot(v.x, v.z);
      const n = dh > 1e-4 ? V(dx / dh, 0, dz / dh) : V(v.x / (spH || 1), 0, v.z / (spH || 1));
      const vn = v.x * n.x + v.z * n.z;
      if (vn <= 0 && mode !== 'air') { p.x = pin.x - n.x * (R + BOLO.PR + .001); p.z = pin.z - n.z * (R + BOLO.PR + .001); return; }
      if (sp3 >= BOLO.KNOCK) {
        // vale si le pega por el lado de la mano (o de frente) yendo hacia atrás, y sin haber rebotado en las tablas
        const side = n.x * hand <= .12, front = mode === 'air' || v.z < 0;
        const valid = side && front && !rebound, why = !side ? 'lado' : rebound ? 'rebote' : !front ? 'atras' : 'bola';
        const vd = spH > 1e-3 ? V(v.x / spH, 0, v.z / spH) : n, j = (rnd(ri++) - .5) * .22;
        const d = V(n.x * .7 + vd.x * .3, 0, n.z * .7 + vd.z * .3).normalize(), c = Math.cos(j), s = Math.sin(j);
        fall(pin, V(d.x * c - d.z * s, 0, d.x * s + d.z * c), t, valid, why);
        ev('palo', p, { i: pin.i });
        v.x -= n.x * vn * .85; v.z -= n.z * vn * .85; v.multiplyScalar(.82);
      } else {   // muy despacio: lo toca, el palo se mece y la bola se queda ahí
        v.x -= n.x * vn * 1.5; v.z -= n.z * vn * 1.5; v.multiplyScalar(.4); ev('toque', p, { i: pin.i });
      }
      p.x = pin.x - n.x * (R + BOLO.PR + .001); p.z = pin.z - n.z * (R + BOLO.PR + .001);
    });
    // las tablas de atrás (matacheros): rebota hacia adelante; lo que tumbe de vuelta no vale
    const zB = BOLO.ZB + R;
    if (p.z < zB && p.y < .55 + R && Math.abs(p.x) < 1.62) { p.z = zB; v.z = Math.abs(v.z) * .35; v.x *= .7; if (v.y > 0) v.y *= .3; rebound = true; ev('tabla', p); }
    // las tablas de los lados, junto a los palos
    if (p.z < -BOLO.D + 1.1 && p.z > -BOLO.D - 1.3 && Math.abs(p.x) > 1.62 - R && Math.abs(p.x) < 1.75) { p.x = Math.sign(p.x) * (1.62 - R); v.x = -v.x * .4; ev('tabla', p); }
    if (Math.abs(p.x) > 3.3) { p.x = Math.sign(p.x) * 3.3; v.x = 0; }
    if (i % 2 === 0) path.push({ t, p: p.clone() });
    if (t > 7) break;
  }
  path.push({ t, p: p.clone() });
  events.sort((a, b) => a.t - b.t);
  const lastFall = falls.reduce((m, f) => Math.max(m, f.t), 0);
  const valid = falls.filter(f => f.valid).length;
  return { path, events, falls, duration: Math.max(t, falls.length ? lastFall + .7 : 0) + .15, ballEnd: t, land: land || p.clone(), stop: p.clone(),
    res: { pts: valid, invalid: falls.length - valid, chuza: valid === 3 } };
}

/* ---------- La cancha de bolo ---------- */
let PIN_GEO = null, PIN_MAT = null, BALL_GEO = null, BALL_MAT = null, BALL_PLUG = null;
function makePalo() {
  if (!PIN_GEO) {
    // palo de pino torneado: base ancha, cuerpo derecho y cabeza redondeada
    const R = BOLO.PR, H = BOLO.PH, pts = [[0, 0], [R * 1.05, 0], [R * 1.1, .02], [R, .08], [R * .92, H * .78], [R * .78, H * .9], [R * .82, H * .95], [R * .6, H * .99], [0, H]];
    PIN_GEO = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 14);
    PIN_MAT = std({ map: makeWoodTex('#e2c28c', null), roughness: .7 });
  }
  const m = new THREE.Mesh(PIN_GEO, PIN_MAT); m.castShadow = true; m.receiveShadow = true; return m;
}
// Bola de aluminio fundido como las de verdad: gris mate con anillos torneados alrededor y un huequito de lado
// (por ahí se le echa arena o plomo para darle el peso)
function bolaTex() {
  const W2 = 512, H2 = 256, [c, g] = cnv(W2, H2), [cb, gb] = cnv(W2, H2);
  g.fillStyle = '#a9adb1'; g.fillRect(0, 0, W2, H2); gb.fillStyle = '#808080'; gb.fillRect(0, 0, W2, H2);
  for (let i = 0; i < 9000; i++) {   // poros del metal fundido
    const x = Math.random() * W2, y = Math.random() * H2, k = Math.random();
    g.fillStyle = k < .5 ? 'rgba(60,64,70,.16)' : 'rgba(235,238,240,.14)'; g.fillRect(x, y, 1.4, 1.4);
    gb.fillStyle = k < .5 ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.2)'; gb.fillRect(x, y, 1.4, 1.4);
  }
  // los anillos: una raya clara (el filo torneado) con su sombrita debajo; de polo a polo, más juntos cerca del centro
  for (let k = -6; k <= 6; k++) {
    const lat = k * .21 + (k % 2 ? .02 : 0), y = H2 * (.5 - lat / Math.PI);
    g.fillStyle = 'rgba(240,242,244,.85)'; g.fillRect(0, y - 1.4, W2, 2.2);
    g.fillStyle = 'rgba(70,74,78,.55)'; g.fillRect(0, y + .9, W2, 1.6);
    gb.fillStyle = '#000'; gb.fillRect(0, y - 1, W2, 2.6);
  }
  return { map: tex(c), bump: tex(cb, 1, 1, false) };
}
function makeBola() {
  if (!BALL_GEO) {
    BALL_GEO = new THREE.SphereGeometry(BOLO.BR, 32, 20);
    const t = bolaTex();
    BALL_MAT = std({ map: t.map, bumpMap: t.bump, bumpScale: .0012, color: '#ffffff', metalness: .55, roughness: .55 });
    BALL_PLUG = std({ color: '#141312', metalness: .2, roughness: .9 });
  }
  const g = new THREE.Group(), b = new THREE.Mesh(BALL_GEO, BALL_MAT); b.castShadow = true; g.add(b);
  // el huequito de lado, en la mitad
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(BOLO.BR * .12, BOLO.BR * .12, .003, 14), BALL_PLUG);
  hole.rotation.z = Math.PI / 2; hole.position.x = BOLO.BR - .0008; g.add(hole);
  return g;
}
function buildBolo() {
  if (BOLO_M && BOLO_M.hall === hall) return;
  if (BOLO_M) BOLO_M.g.parent && BOLO_M.g.parent.remove(BOLO_M.g);
  const g = new THREE.Group(), wood = std({ map: T.woodPlain, roughness: .85 }), dark = std({ color: '#2a1d12', roughness: 1 });
  // el piso es el mismo del tejo; solo un cuadro marcado con cal donde se paran los palos
  const zp = BOLO.Z0 - BOLO.GAP;
  const lime = std({ color: '#efe6d2', roughness: 1 });
  [[.36, .02, 0, zp + .32], [.36, .02, 0, zp - .32], [.02, .66, -.17, zp], [.02, .66, .17, zp]].forEach(([w, h, x, z]) => {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lime); l.rotation.x = -Math.PI / 2; l.position.set(x, .005, z); g.add(l);
  });
  // las tablas de atrás (matacheros), parados sobre el piso y con su refuerzo
  const zB = BOLO.ZB;
  for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(3.24, .17, .05), wood); b.position.set(0, .09 + k * .18, zB - .025); b.castShadow = b.receiveShadow = true; g.add(b); }
  [-1.2, 0, 1.2].forEach(x => { const s = new THREE.Mesh(new THREE.BoxGeometry(.07, .6, .07), dark); s.position.set(x, .3, zB - .085); g.add(s); });
  // los tres palos
  const pins = [0, 1, 2].map(i => { const m = makePalo(), q = boloPinPos(i); m.position.set(q.x, 0, q.z); g.add(m); return m; });
  // lado izquierdo (donde estaban la pala, las mechas y la greda): palos de repuesto y bolas
  const side = new THREE.Group(); side.position.set(0, 0, -W.D); g.add(side);
  [[-2.05, -.25, .16, 0], [-2.13, -.15, .2, .1], [-2.2, -.33, .18, -.1], [-2.28, -.2, .22, .06]].forEach(([x, z, lean, yaw]) => {   // recostados en la pared del cajón
    const m = makePalo(); m.position.set(x, 0, z); m.rotation.set(0, yaw, lean); side.add(m);
  });
  [[-2.5, .55, 1.2], [-2.62, .42, 1.6]].forEach(([x, z, yaw]) => { const m = makePalo(); m.rotation.set(0, yaw, Math.PI / 2); m.position.set(x, BOLO.PR, z); side.add(m); });   // acostados en el piso
  const rack = new THREE.Group(); rack.position.set(-2.1, 0, .45); rack.rotation.y = .25; side.add(rack);   // cajón con las bolas
  [[.62, .04, .3, 0, .02, 0], [.62, .14, .02, 0, .09, .14], [.62, .14, .02, 0, .09, -.14], [.02, .14, .3, .3, .09, 0], [.02, .14, .3, -.3, .09, 0]]
    .forEach(([w, h, d, x, y, z]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; rack.add(b); });
  [[-.2, 0, .9], [-.07, .02, .95], [.06, -.03, 1], [.2, .01, .85]].forEach(([x, z, s]) => { const b = makeBola(); b.scale.setScalar(s); b.position.set(x, .04 + BOLO.BR * s, z); b.rotation.set(x * 9, z * 7, 1); rack.add(b); });
  const loose = makeBola(); loose.position.set(-1.9, BOLO.BR, .95); side.add(loose);
  const bucket = makeBucket('#24519a', 'barro'); bucket.position.set(-2.45, 0, .05); bucket.rotation.y = -.4; side.add(bucket);   // la arena para llenar las bolas
  g.visible = false; hall.add(g);
  BOLO_M = { g, hall, pins };
  boloResetPins();
}
// El garitero vuelve a parar los palos
function boloResetPins() {
  if (!BOLO_M) return;
  BOLO_M.pins.forEach((m, i) => { const q = boloPinPos(i); m.position.set(q.x, 0, q.z); m.quaternion.identity(); m.userData.f = null; });
}
// Un palo cayendo: gira desde el borde de su base, en la dirección en que lo empujaron, y queda acostado
function boloPinAt(m, i, f, tt) {
  const q = boloPinPos(i);
  if (!f || tt < f.t) { m.position.set(q.x, 0, q.z); m.quaternion.identity(); return; }
  const u = tt - f.t, full = Math.PI / 2 - .04;
  let a = Math.min(full, Math.pow(u / .36, 2) * full);
  if (u > .36) a = full - Math.abs(Math.sin((u - .36) * 18)) * .1 * Math.exp(-(u - .36) * 7);   // rebotadita al caer
  const d = V(f.dir.x, 0, f.dir.z), axis = V(0, 1, 0).cross(d).normalize();
  const rq = new THREE.Quaternion().setFromAxisAngle(axis, a), piv = V(q.x, 0, q.z).addScaledVector(d, BOLO.PR);
  m.quaternion.copy(rq); m.position.copy(piv).add(d.clone().multiplyScalar(-BOLO.PR).applyQuaternion(rq));
}
// Quita del salón lo del tejo que no va en el bolo (la greda con su cajón; la pala, las mechas y la arcilla del lado izquierdo)
function boloFrame() {
  const g = shownGame(), bolo = g === 'bolo';
  if (bolo) buildBolo();
  if (BOLO_M) BOLO_M.g.visible = bolo && BOLO_M.hall === hall;
  const tejo = g === 'tejo';
  if (cancha && cancha.visible !== tejo) { cancha.visible = tejo; canchaFondo.forEach(o => o.visible = tejo); }
  tejoLeftProps.forEach(o => { if (o.visible === bolo) o.visible = !bolo; });
}

/* ---------- Turno, tiro y resultado ---------- */
function boloPrepare() { game.kind = 'bolo'; buildBolo(); boloResetPins(); }
function boloNewTurn() {
  if (bflight && bflight.mesh) scene.remove(bflight.mesh);
  if (game && game.ball) { scene.remove(game.ball); game.ball = null; }
  bflight = null; boloResetPins();
}
function boloLaunch(a, opts) {
  const p = current(), hand = handOf(p);
  lastP[p.name] = a.P;
  const sim = boloSimulate(a, hand, game.thrown);
  const mesh = makeBola(); mesh.position.copy(sim.path[0].p); scene.add(mesh);
  bflight = { sim, mesh, t: 0, ev: 0, owner: game.order[game.idx], timeout: !!(opts && opts.timeout), done: false, hit: false, roll: new THREE.Quaternion() };
  reticle.visible = false; phase = 'flight'; hint('', false); setGauge(a.P, lastP[p.name]);
  game.thrown++;
  A.whoosh(); buzz(15);
}
function boloEvents(f, sim, t) {
  while (f.ev < sim.events.length && sim.events[f.ev].t <= t) {
    const e = sim.events[f.ev++];
    if (e.kind === 'palo') { A.wood(); if (!e.chain) dirt(e.p.clone().setY(.05), V(0, 1, 0), 8); f.hit = true; }
    else if (e.kind === 'suelo') { A.floor(); dirt(e.p, V(0, 1, 0), 6); }
    else if (e.kind === 'toque') A.wood();
    else if (e.kind === 'tabla') { A.wood(); A.thud(.4); }
    else if (e.kind === 'cae') { A.thud(.7); dirt(e.p.clone().setY(.02), V(0, 1, 0), 16); }
  }
}
// Mueve la bola por el camino y la hace rodar según lo que avanzó
function boloBallAt(mesh, sim, t, rq) {
  const prev = mesh.position.clone(), p = samplePath(sim.path, Math.min(t, sim.ballEnd));
  mesh.position.copy(p);
  const d = p.clone().sub(prev); d.y = 0; const L = d.length();
  if (L > 1e-5 && p.y <= BOLO.BR + .002) { const ax = V(0, 1, 0).cross(d).normalize(); rq.premultiply(new THREE.Quaternion().setFromAxisAngle(ax, L / BOLO.BR)); }
  else if (L > 1e-5) rq.premultiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -L * 3));
  mesh.quaternion.copy(rq);
}
function boloUpdate(dt) {
  const f = bflight; if (!f || f.done) return;
  f.t += dt; const sim = f.sim;
  boloEvents(f, sim, f.t);
  boloBallAt(f.mesh, sim, f.t, f.roll);
  if (BOLO_M) BOLO_M.pins.forEach((m, i) => boloPinAt(m, i, sim.falls.find(x => x.i === i), f.t));
  if (f.t >= sim.duration) boloFinish();
}
function boloFinish() {
  const f = bflight; if (!f || f.done) return; f.done = true;
  const p = game.players[f.owner], r = f.sim.res;
  game.ball = f.mesh; bflight = null;
  game.lastSim = f.sim; game.lastOwner = f.owner;
  p.st.tiros++; p.st.manos += r.invalid;
  phase = 'result'; resultAt = performance.now();
  const bad = r.invalid ? ` · ${r.invalid} no ${r.invalid === 1 ? 'valió' : 'valieron'}` : '';
  if (r.pts) {
    p.score += r.pts; p.st.mechas += r.pts;
    if (r.chuza) {
      p.st.mon++;
      announce('¡CHUZA!', `${p.name.toUpperCase()} +3`, true); A.cheer(); flashScreen(); buzz([40, 30, 80]);
      feed(p, 'CHUZA +3');
    } else { toast(`${r.pts} ${r.pts === 1 ? 'palo' : 'palos'}${bad}`); A.tick(); feed(p, `${r.pts} ${r.pts === 1 ? 'palo' : 'palos'} +${r.pts}`); }
    bumpChip(f.owner);
  } else {
    p.st.nulos++;
    const why = f.sim.falls.length ? (f.sim.falls.some(x => x.why === 'lado') ? 'Le pegó por el otro lado: no vale' : 'De rebote no vale') : f.timeout ? 'Se acabó el tiempo' : 'No tumbó nada';
    toast(why); feed(p, f.timeout ? 'Se le acabó el tiempo' : f.sim.falls.length ? `${f.sim.falls.length} sin valer` : 'En blanco');
  }
  renderBoard();
  if (r.chuza && !reduceMotion && !online()) later(1.6, () => boloStartReplay(f.sim, f.owner, advance));
  else later(r.chuza ? 2.4 : 1.4, advance);
}
function boloAdvance() {
  if (breplay) { const r = breplay; r.done = null; boloEndReplay(); }
  if (phase === 'over') return;
  const leader = winnerNow(); if (leader) return gameOver(leader);
  game.idx++;
  if (game.idx < game.order.length) return nextThrow();
  startRound(game.order[0]);   // nueva ronda: siempre en el mismo orden
}

/* ---------- La chuza en cámara lenta ---------- */
function boloStartReplay(sim, owner, done) {
  if (!game || phase === 'over' || breplay) { done && done(); return; }
  if (game.ball) game.ball.visible = false;
  const ghost = makeBola(); scene.add(ghost);
  const t0 = Math.max(0, (sim.falls.length ? Math.min(...sim.falls.map(x => x.t)) : sim.ballEnd) - 1.2);
  breplay = { sim, ghost, done, t: t0, ev: sim.events.findIndex(e => e.t >= t0), roll: new THREE.Quaternion(), end: sim.duration };
  if (breplay.ev < 0) breplay.ev = sim.events.length;
  ghost.position.copy(samplePath(sim.path, t0));
  $('replayTag').hidden = false; $('turn').style.visibility = 'hidden'; A.whoosh();
}
function boloUpdateReplay(dt) {
  const r = breplay; if (!r) return;
  r.t += dt * REPLAY_SPEED;
  boloEvents(r, r.sim, r.t);
  boloBallAt(r.ghost, r.sim, r.t, r.roll);
  if (BOLO_M) BOLO_M.pins.forEach((m, i) => boloPinAt(m, i, r.sim.falls.find(x => x.i === i), r.t));
  if (r.t >= r.end) boloEndReplay();
}
function boloEndReplay() {
  const r = breplay; if (!r) return;
  breplay = null; scene.remove(r.ghost); if (game && game.ball) game.ball.visible = true;
  $('replayTag').hidden = true; $('turn').style.visibility = '';
  if (r.done) r.done();
}

/* ---------- Puntería y cámaras ---------- */
function boloAimInfo(aim) {
  const p = current(), s = boloSimulate(aim, handOf(p), game.thrown, false);
  return { at: s.land };
}
function boloShowReticle(aim) {
  if (!aimHelpNow()) { reticle.visible = false; return; }
  const i = boloAimInfo(aim), q = i.at;
  // amarilla si la bola llega a los palos con fuerza y va por el lado de la mano
  const hand = handOf(current()), x = aim.L * hand;
  const good = q.z <= BOLO.Z0 + .4 && q.z > BOLO.Z0 - 6 && x > -.02 && x < BOLO.BR + BOLO.PR * 2;
  // en el piso casi no se vería desde la raya: va parada mirando a la cámara, con el borde de abajo tocando la tierra
  const sc = 1.5 * (1 + (drag ? clamp(((performance.now() - drag.t0) / 1000 - 1.6) * .25, 0, .8) : 0));
  reticle.visible = true; reticle.position.set(q.x, .066 * sc, q.z);
  reticle.quaternion.copy(cam.quaternion);
  reticleCore.color.set(good ? '#f3c22f' : '#d8392d');
  reticle.scale.setScalar(sc);
  reticle.userData.uv = null;
}
function boloPinsCenter() { return V(0, .3, BOLO.Z0 - BOLO.GAP); }
function boloCamPose() {
  const c = boloPinsCenter();
  if (breplay) {   // la repetición: de lado y bajito, mirando los palos
    const g = breplay.ghost.position, near = g.z < BOLO.Z0 + 3;
    return near ? { pos: V(1.25, .55, c.z + 1.1), look: c.clone().add(V(-.1, -.05, 0)), fov: 38, k: 6 }
      : { pos: g.clone().add(V(.35, .4, 1.4)), look: g.clone().lerp(c, .5), fov: 40, k: 8 };
  }
  if (phase === 'flight' && bflight) {   // detrás de la bola y, ya cerca, de lado viendo caer los palos
    const f = bflight, b = f.mesh.position;
    if (b.z < BOLO.Z0 + 2.6 || f.hit) return { pos: V(1.15, .9, c.z + 1.9), look: c.clone().add(V(-.05, -.08, 0)), fov: 42, k: 4 };
    if (f.t < .12) return { ...aimPose(), k: 6 };
    return { pos: b.clone().add(V(.15, .55, 1.7)).setY(Math.max(.6, b.y + .5)), look: b.clone().lerp(c, .55), fov: 46, k: 7 };
  }
  if (phase === 'result' || phase === 'roundEnd') return { pos: V(1.15, .95, c.z + 2.1), look: c.clone().add(V(-.05, -.1, 0)), fov: 42, k: 3 };
  return { ...aimPose(), k: 5 };
}
function boloMenuPose(orbit) {
  const c = boloPinsCenter(), a = Math.sin(orbit * .8) * .8, r = 2.4;
  return { pos: V(Math.sin(a) * r, 1.15, c.z + Math.cos(a) * r), look: c, fov: 40 };
}
function boloLupa() {   // la lupa mira los palos un poco de lado (por el lado de la mano), así se ven los tres
  const c = boloPinsCenter(), h = game && game.order.length ? handOf(current()) : 1;
  lupaCam.up.set(0, 1, 0); lupaCam.position.set(h * .75, .55, c.z + 1.9); lupaCam.lookAt(c.x, .24, c.z);
}

/* ---------- Don Chepe en el bolo ---------- */
function boloPlanCpu(p) {
  const d = settings.diff, hand = handOf(p);
  // le apunta al palo de adelante, un poquito por el lado de su mano, para que caiga encima o justo antes
  const L = hand * (BOLO.BR + BOLO.PR) * (.25 + Math.random() * .25), P = BOLO.P0 - .2 / BOLO.SPAN + Math.random() * .04;
  const sx = [.22, .12, .065, .04][d], sp = [1.6, 1.0, .6, .4][d];
  const fin = { L: clamp(L + gauss() * sx, -AIM.L, AIM.L), P: clamp(P + gauss() * sp / BOLO.SPAN, .02, 1) };
  cpuAim = { from: { L: rand(-.5, .5), P: rand(.2, .45) }, to: fin, t: 0, dur: rand(1, 1.5) };
}

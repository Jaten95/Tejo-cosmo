
/* ================= Física del lanzamiento ================= */
const AIM = { P0: 0.6, span: () => 2.4 + W.D * 0.05, L: 0.9 };

// Velocidad de salida para que el tejo pase por (L, CY, -D - dz)
function solveThrow(L, dz) {
  const tx = L, tz = -W.D - dz;
  const dx = tx - REL.x, dzz = tz - REL.z;
  const Dh = Math.hypot(dx, dzz), h = CY - REL.y;
  const c = Math.cos(THETA), tn = Math.tan(THETA);
  const v = Math.sqrt(G * Dh * Dh / (2 * c * c * (Dh * tn - h)));
  return V(dx / Dh * v * c, v * Math.sin(THETA), dzz / Dh * v * c);
}
function aimToVel(aim) { return solveThrow(aim.L, (aim.P - AIM.P0) * AIM.span()); }

function detect(a, b) {
  const fa = a.clone().sub(W.C).dot(W.n), fb = b.clone().sub(W.C).dot(W.n);
  if (fa > 0 && fb <= 0) {
    const x = a.clone().lerp(b, fa / (fa - fb)); const { u, v } = toUV(x);
    if (Math.abs(u) <= HU + FW && Math.abs(v) <= HV + FW) {
      const inClay = Math.abs(u) <= HU - RT * .3 && Math.abs(v) <= HV - RT * .3;
      return { kind: inClay ? 'clay' : 'frame', p: x, n: W.n.clone(), u, v };
    }
  }
  if (fb <= 0 && fb > -.5) { // dentro del cajón por detrás de la cara
    const { u, v } = toUV(b);
    if (Math.abs(u) <= HU + FW && Math.abs(v) <= HV + FW) return { kind: 'frame', p: fromUV(u, v, .003), n: W.n.clone(), u, v };
  }
  if (a.z > W.ZB && b.z <= W.ZB && b.y < 2.5 && Math.abs(b.x) < 1.65) return { kind: 'board', p: V(b.x, b.y, W.ZB + .002), n: V(0, 0, 1) };
  if (b.z < -W.D + 1.1 && b.y < 1.7) {
    if (a.x < 1.6 && b.x >= 1.6) return { kind: 'board', p: V(1.6, b.y, b.z), n: V(-1, 0, 0) };
    if (a.x > -1.6 && b.x <= -1.6) return { kind: 'board', p: V(-1.6, b.y, b.z), n: V(1, 0, 0) };
  }
  if (b.x > 3.44) return { kind: 'wall', p: V(3.44, b.y, b.z), n: V(-1, 0, 0) };
  if (b.x < -3.44) return { kind: 'wall', p: V(-3.44, b.y, b.z), n: V(1, 0, 0) };
  if (Math.abs(b.x) < .56 && b.y < .34 && a.z >= -W.D - .025 && b.z < -W.D - .025) return { kind: 'board', p: V(b.x, b.y, -W.D - .023), n: V(0, 0, 1) };
  if (b.y <= TT / 2) return { kind: 'floor', p: V(b.x, TT / 2, b.z), n: V(0, 1, 0) };
  return null;
}

function simulate(p0, v0, stopAtFirst) {
  const dt = 1 / 300;
  const p = p0.clone(), v = v0.clone(); let t = 0;
  const path = [{ t: 0, p: p.clone() }];
  const out = { path, first: null, firstT: 0, firstP: null, events: [], clay: null };
  let onFloor = false, bounces = 0;
  for (let i = 0; i < 3600; i++) {
    const prev = p.clone();
    if (onFloor) {
      const sp = Math.hypot(v.x, v.z), dec = 4.5 * dt;
      if (sp <= dec) { v.set(0, 0, 0); break; }
      v.x -= v.x / sp * dec; v.z -= v.z / sp * dec; p.addScaledVector(v, dt); p.y = TT / 2;
    } else { v.y -= G * dt; p.addScaledVector(v, dt); }
    t += dt;
    const hit = detect(prev, p);
    if (hit && !(onFloor && hit.kind === 'floor')) {
      p.copy(hit.p);
      if (!out.first) { out.first = hit.kind; out.firstT = t; out.firstP = hit.p.clone(); out.firstN = hit.n.clone(); }
      out.events.push({ t, kind: hit.kind, p: hit.p.clone(), speed: v.length() });
      if (hit.kind === 'clay') { out.clay = hit; out.vEnd = v.clone(); break; }
      if (stopAtFirst) break;
      const n = hit.n, vn = v.dot(n);
      if (vn < 0) {
        v.addScaledVector(n, -(1 + .3) * vn);
        const vt = v.clone().addScaledVector(n, -v.dot(n)); v.addScaledVector(vt, -.35);
      }
      p.addScaledVector(n, .003); bounces++;
      if (hit.kind === 'floor' && Math.abs(v.y) < 1.1) { onFloor = true; v.y = 0; p.y = TT / 2; }
      if (bounces > 12) break;
    }
    if (i % 2 === 0) path.push({ t, p: p.clone() });
  }
  path.push({ t, p: p.clone() });
  out.duration = t; out.end = p.clone(); out.onFloor = onFloor;
  return out;
}

function predict(aim) {
  const sim = simulate(V(REL.x, REL.y, REL.z), aimToVel(aim), true);
  return sim.first ? { kind: sim.first, p: sim.firstP, n: sim.firstN } : null;
}

/* ---------- Choques entre tejos sobre la greda ----------
   Se calcula igual en todos los celulares: las posiciones se redondean a 0,1 mm y no hay azar.
   El tejo que llega empuja a los que toque (y esos a los siguientes); queda donde termina el choque. */
const R4 = x => Math.round(x * 1e4) / 1e4;
function resolveHits(u, v, vEnd, others) {
  const vu = vEnd ? vEnd.dot(W.a) : 0, vv = vEnd ? vEnd.dot(W.s) : 1, vs = Math.hypot(vu, vv) || 1;
  const P = [{ u, v, i: -1 }].concat(others.map(o => ({ u: o.u, v: o.v, i: o.i })));
  const active = new Set([0]), hits = [];
  let contact = null;
  for (let it = 0; it < 8; it++) {
    let any = false;
    for (let a = 0; a < P.length; a++) {
      if (!active.has(a)) continue;
      for (let b = 0; b < P.length; b++) {
        if (a === b) continue;
        const pa = P[a], pb = P[b];
        let du = pb.u - pa.u, dv = pb.v - pa.v, d = Math.hypot(du, dv);
        if (d >= 2 * RT - 1e-6) continue;
        let nu, nv;
        if (d < 1e-5) { nu = vu / vs; nv = vv / vs; d = 0; } else { nu = du / d; nv = dv / d; }
        if (a === 0) {   // si cae casi encima, el empujón sigue la dirección en que venía el tejo
          const w = 1 - d / (2 * RT); let bu = nu * (1 - w) + (vu / vs) * w, bv = nv * (1 - w) + (vv / vs) * w; const bl = Math.hypot(bu, bv);
          if (bl > 1e-4) { nu = bu / bl; nv = bv / bl; }
        }
        const over = 2 * RT - d;
        const head = a === 0 ? Math.max(0, (vu * nu + vv * nv) / vs) : .5;   // 1 = de frente, 0 = de refilón
        const kb = .55 + .35 * head;                                           // cuánto del choque se lleva el golpeado
        const kick = (a === 0 ? .016 : .006) * head;
        if (a === 0 && !contact) contact = { u: pa.u + nu * RT, v: pa.v + nv * RT };
        pb.u += nu * (over * kb + kick); pb.v += nv * (over * kb + kick);
        pa.u -= nu * over * (1 - kb); pa.v -= nv * over * (1 - kb);
        active.add(b); any = true;
        if (a === 0 && pb.i >= 0 && !hits.includes(pb.i)) hits.push(pb.i);
      }
    }
    if (!any) break;
  }
  const lim = (x, h) => R4(clamp(x, -h + RT * .6, h - RT * .6));
  P.forEach(p => { p.u = lim(p.u, HU); p.v = lim(p.v, HV); });
  const moved = P.slice(1).filter((p, k) => p.u !== others[k].u || p.v !== others[k].v).map(p => ({ i: p.i, u: p.u, v: p.v }));
  return { u: P[0].u, v: P[0].v, moved, hits, contact };
}

/* ---------- Rebote: si cae casi encima de otro tejo, pega en el metal y sale rebotado ---------- */
const REBOTE_D = RT * .7;
function reboundSim(landU, landV, vEnd, tj) {
  const ou = landU - tj.u, ov = landV - tj.v, od = Math.hypot(ou, ov);
  const side = od > 1e-5 ? W.a.clone().multiplyScalar(ou / od).addScaledVector(W.s, ov / od) : V();
  const n = W.n.clone().addScaledVector(side, Math.min(1, od / REBOTE_D) * .9).normalize();  // más de lado, más se desvía
  const vn = vEnd.dot(n), vt = vEnd.clone().addScaledVector(n, -vn);
  const v1 = vt.multiplyScalar(.6).addScaledVector(n, -vn * .38);
  return simulate(fromUV(landU, landV, .036), v1, false);
}

function evaluate(sim, others) {
  if (sim.first !== 'clay') return { valid: false, kind: 'nulo', why: sim.first, pts: 0, moved: [], hits: [], landMoved: [] };
  others = others || [];
  const landU = R4(sim.clay.u), landV = R4(sim.clay.v);
  let near = null, nd = REBOTE_D;
  others.forEach(o => { const d = Math.hypot(o.u - landU, o.v - landV); if (d < nd) { nd = d; near = o; } });
  if (!near) { const r = scoreAt(landU, landV, sim.vEnd, others); r.landMoved = r.moved; return r; }
  // el golpe corre al otro tejo (menos que un choque normal: casi toda la fuerza se va en el rebote)
  const col1 = resolveHits(landU, landV, sim.vEnd, others);
  const mv1 = col1.moved.map(m => { const o = others.find(x => x.i === m.i); return { i: m.i, u: R4(o.u + (m.u - o.u) * .5), v: R4(o.v + (m.v - o.v) * .5) }; });
  const others1 = others.map(o => mv1.find(x => x.i === o.i) || o);
  const sim2 = reboundSim(landU, landV, sim.vEnd, near);
  const rebound = { t: sim.firstT, sim2, at: { u: landU, v: landV }, contact: col1.contact || { u: landU, v: landV }, moved: mv1, hit: near.i };
  if (sim2.first !== 'clay') return { valid: false, kind: 'nulo', why: sim2.first, pts: 0, moved: mv1, hits: [near.i], landMoved: [], rebound };
  const r = scoreAt(R4(sim2.clay.u), R4(sim2.clay.v), sim2.vEnd, others1);
  const merged = mv1.filter(m => !r.moved.some(x => x.i === m.i)).concat(r.moved);
  r.landMoved = r.moved; r.moved = merged; r.hits = [near.i].concat(r.hits.filter(h => h !== near.i)); r.rebound = rebound;
  return r;
}

/* Puntaje del tejo en la greda: primero se resuelven los choques, luego cuenta donde quedó */
function scoreAt(landU, landV, vEnd, others) {
  const col = resolveHits(landU, landV, vEnd, others);
  const u = col.u, v = col.v, d = Math.hypot(u, v);
  const mechas = mechaMeshes.filter(m => m.userData.alive && Math.hypot(m.userData.u - u, m.userData.v - v) < MECHA_HIT);
  const emb = d <= R_EMB;
  const ring = !emb && Math.abs(d - RB) < RT * .95;
  let kind = 'greda', pts = 0;
  if (emb && mechas.length) { kind = 'monona'; pts = 9; }
  else if (emb) { kind = 'embocinada'; pts = 6; }
  else if (mechas.length) { kind = 'mecha'; pts = 3; }
  return { valid: true, kind, pts, d, u, v, mechas, ring, emb, landU, landV, moved: col.moved, hits: col.hits, contact: col.contact };
}

/* Pose final de un tejo clavado en la greda */
function embedPose(u, v, vEnd, emb) {
  const pos = fromUV(u, v, emb ? -.004 : TT * .12);
  const back = vEnd ? vEnd.clone().normalize().negate() : W.n.clone();
  const axis = emb ? W.n.clone() : W.n.clone().multiplyScalar(.7).addScaledVector(back, .3).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), axis);
  q.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), rand(0, 6.28)));
  return { pos, q };
}

/* ================= Efectos ================= */
const fx = [];
let shake = 0;
function addFx(o) { fx.push(o); }
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) { if (!fx[i].update(dt)) { fx[i].dispose && fx[i].dispose(); fx.splice(i, 1); } }
}
function burst(pos, normal, { count = 60, colors = ['#ffd27a', '#ff8a3a', '#fff3c4'], speed = [1.5, 4], grav = 3, life = .9, size = .035, spread = 1 }) {
  if (reduceMotion) count = Math.ceil(count / 3);
  const geo = new THREE.BufferGeometry();
  const P = new Float32Array(count * 3), C = new Float32Array(count * 3), vel = [];
  const col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    P.set([pos.x, pos.y, pos.z], i * 3);
    col.set(colors[i % colors.length]); C.set([col.r, col.g, col.b], i * 3);
    const d = V(gauss() * spread, gauss() * spread, gauss() * spread).add(normal.clone().multiplyScalar(1.6)).normalize();
    vel.push(d.multiplyScalar(rand(speed[0], speed[1])));
  }
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
  const mat = new THREE.PointsMaterial({ size, map: T.soft, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat); scene.add(pts);
  let t = 0;
  addFx({
    update(dt) {
      t += dt; const a = geo.attributes.position.array;
      for (let i = 0; i < count; i++) { vel[i].y -= grav * dt; vel[i].multiplyScalar(1 - 1.2 * dt); a[i * 3] += vel[i].x * dt; a[i * 3 + 1] += vel[i].y * dt; a[i * 3 + 2] += vel[i].z * dt; }
      geo.attributes.position.needsUpdate = true; mat.opacity = Math.max(0, 1 - t / life); return t < life;
    }, dispose() { scene.remove(pts); geo.dispose(); mat.dispose(); }
  });
}
function dirt(pos, normal, n = 26) {
  burst(pos, normal, { count: n, colors: ['#9a5532', '#b8723f', '#74401f'], speed: [.6, 1.8], grav: 7, life: .7, size: .028, spread: .8 });
}
function smoke(pos, n = 9) {
  if (reduceMotion) n = 4;
  for (let i = 0; i < n; i++) {
    const m = new THREE.SpriteMaterial({ map: T.soft, color: '#cfc4b4', transparent: true, opacity: .55, depthWrite: false });
    const s = new THREE.Sprite(m); s.position.copy(pos).add(V(gauss() * .04, gauss() * .04, gauss() * .04)); s.scale.setScalar(.08);
    const vel = W.n.clone().multiplyScalar(rand(.25, .7)).add(V(gauss() * .12, rand(.15, .45), gauss() * .12));
    scene.add(s); let t = -i * .03; const life = rand(1.6, 2.6);
    addFx({ update(dt) { t += dt; if (t < 0) return true; s.position.addScaledVector(vel, dt); vel.multiplyScalar(1 - .8 * dt); s.scale.setScalar(.08 + t * .45); m.opacity = .55 * Math.max(0, 1 - t / life); return t < life; }, dispose() { scene.remove(s); m.dispose(); } });
  }
}
function flashLight(pos, power = 6) {
  const l = new THREE.PointLight('#ffb35c', power, 6, 2); l.position.copy(pos).addScaledVector(W.n, .2); scene.add(l);
  let t = 0; addFx({ update(dt) { t += dt; l.intensity = power * Math.max(0, 1 - t / .35); return t < .35; }, dispose() { scene.remove(l); } });
}
const decals = [];
function decal(u, v, texture, size, lift = .0015) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  m.position.set(u, v, lift); m.rotation.z = rand(0, 6.28); m.renderOrder = 2; cancha.add(m); decals.push(m); return m;
}
function clearDecals() { decals.forEach(d => { d.parent && d.parent.remove(d); d.geometry.dispose(); d.material.dispose(); }); decals.length = 0; }
function explodeMecha(m) {
  m.userData.alive = false; m.visible = false;
  const wp = fromUV(m.userData.u, m.userData.v, .01);
  burst(wp, W.n, { count: 90, speed: [1.2, 4.2], grav: 2.5, life: 1.0, size: .028 });
  burst(wp, W.n, { count: 24, colors: ['#ffffff', '#ffe9b0'], speed: [.4, 1.4], grav: .5, life: .45, size: .045 });
  smoke(wp); flashLight(wp, 9);
  decal(m.userData.u, m.userData.v, T.scorch, .16, .002);
  shake = Math.max(shake, reduceMotion ? .006 : .03);
}

/* ================= Sonido (sintetizado) ================= */
const A = {
  ctx: null, out: null, noise: null, muted: false,
  init() {
    try {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor(); comp.connect(this.ctx.destination);
      this.out = this.ctx.createGain(); this.out.gain.value = this.muted ? 0 : .85; this.out.connect(comp);
      const len = this.ctx.sampleRate * 2, b = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = b;
    } catch (e) { this.ctx = null; }
  },
  setMuted(m) { this.muted = m; if (this.out) this.out.gain.setTargetAtTime(m ? 0 : .85, this.ctx.currentTime, .02); },
  ok() { return this.ctx && !this.muted; },
  nz(dur, { type = 'lowpass', f0 = 1000, f1 = f0, q = .7, gain = .5, attack = .005, delay = 0, dest = null, at = null } = {}) {
    if (!this.ok()) return; const c = this.ctx, t = (at === null ? c.currentTime : at) + delay;
    const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.out); s.start(t, Math.random()); s.stop(t + dur + .05);
  },
  tone(f0, dur, { f1 = f0, type = 'sine', gain = .4, attack = .004, delay = 0, dest = null, at = null } = {}) {
    if (!this.ok()) return; const c = this.ctx, t = (at === null ? c.currentTime : at) + delay;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.out); o.start(t); o.stop(t + dur + .05);
  },
  whoosh() { this.nz(.55, { type: 'bandpass', f0: 380, f1: 1900, q: 1.4, gain: .22, attack: .2 }); },
  thud(k = 1) { this.tone(105, .28, { f1: 42, gain: .9 * k }); this.nz(.2, { f0: 900, f1: 160, gain: .55 * k }); },
  clank() { [523, 1187, 1964, 2875, 3920].forEach((f, i) => this.tone(f, .5 + .25 * Math.random(), { gain: .1 / (1 + i * .3), f1: f * .995 })); },
  hit() { [1480, 2210, 3170].forEach((f, i) => this.tone(f, .12 + i * .03, { gain: .16 / (1 + i * .5), f1: f * .97 })); this.nz(.05, { type: 'highpass', f0: 2800, gain: .45 }); this.tone(320, .09, { f1: 180, type: 'triangle', gain: .35 }); },
  wood() { this.tone(230, .14, { f1: 150, type: 'triangle', gain: .45 }); this.nz(.09, { type: 'bandpass', f0: 1400, gain: .3 }); },
  floor() { this.nz(.14, { f0: 700, f1: 200, gain: .4 }); this.tone(150, .12, { f1: 80, gain: .3 }); },
  boom(big) {
    this.nz(1.2, { f0: 3200, f1: 110, gain: 1, attack: .002 });
    this.tone(78, .8, { f1: 30, gain: 1 });
    for (let i = 0; i < 10; i++) this.nz(.04, { type: 'highpass', f0: 2500, gain: .25, delay: .05 + Math.random() * .45 });
    if (big) this.nz(.9, { f0: 1800, f1: 90, gain: .8, attack: .002, delay: .12 });
  },
  cheer() {
    for (let i = 0; i < 7; i++) this.nz(1.6 + Math.random(), { type: 'bandpass', f0: rand(700, 1200), f1: rand(900, 1500), q: .9, gain: .12, attack: .35, delay: i * .12 });
    [0, .18, .36].forEach((d, i) => this.tone(660 + i * 220, .16, { type: 'square', gain: .04, delay: .1 + d }));
  },
  aww() { this.nz(1.2, { type: 'bandpass', f0: 900, f1: 420, q: 1.2, gain: .14, attack: .2 }); },
  tick() { this.tone(880, .05, { type: 'square', gain: .035 }); },
};
function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } }


/* ================= Rana =================
   El otro juego del salón, como la rana de la foto: tabla azul con diez huecos, la rana de metal atrás (boca grande, 80)
   y el sapito de adelante (boca chica, 100). Debajo, los cajones: 10 80 10 / 20 100 20 / 30 45 30 / 40 50 40.
   Cada jugador lanza 6 argollas por turno desde la raya (a 3,5 m de la mesa); cada hueco tiene su puntaje en
   el cajón de abajo y gana el primero que llegue a la meta. La física es propia y determinista (el aleatorio sale
   de una semilla), así en las salas todos ven caer la argolla en el mismo hueco.
   Estadísticas por jugador (van en los mismos campos del tejo para que las salas no cambien):
   st.mon = ranas (80) · st.emb = sapitos (100) · st.mechas = argollas que entraron · st.nulos = afuera · st.tiros = lanzadas. */

const RANA = {
  Z: -3.8, TOP: .8, HW: .3, HD: .3,   // centro de la mesa (el borde de adelante queda a 3,5 m de la raya), altura y media tabla
  AR: .024, AT: .006,                 // argolla: radio del aro y medio grosor
  HOLE: .05, PER_TURN: 6, PANEL_H: .44,
  P0: .55, SPAN: 1.6, LX: .36, THETA: .72,   // puntería: fuerza que cae en el centro, metros por unidad de fuerza y de lado, ángulo de salida
  FR: 8, KEEP: [.15, .35], HOP: .25,         // al caer: freno al arrastrarse (m/s²), cuánta velocidad le queda y qué tan seguido rebota
};
// Puntos de cada cajón, de la fila de atrás a la de adelante (como en la foto del cajón)
const RANA_PTS = [[10, 80, 10], [20, 100, 20], [30, 45, 30], [40, 50, 40]];
const RANA_COLS = [-.17, 0, .17], RANA_ROWS = [-.21, -.07, .07, .21];
function ranaSlotKind(r, c) { return c === 1 && r === 0 ? 'rana' : c === 1 && r === 1 ? 'sapito' : 'hueco'; }
const RANA_SLOTS = [];
RANA_PTS.forEach((row, r) => row.forEach((pts, c) => RANA_SLOTS.push({ i: r * 3 + c, r, c, pts, kind: ranaSlotKind(r, c), x: RANA_COLS[c], z: RANA_ROWS[r] })));
// Las dos figuras de metal (en coordenadas de la mesa: y desde la tabla, z positiva hacia el jugador).
// La argolla tiene que entrar por la boca; si pega en el cuerpo, rebota.
const FIGS = [
  { slot: 1, how: 'rana', body: V(0, .055, -.235), bodyR: .058, mouth: V(0, .132, -.17), mouthN: V(0, .3, .95).normalize(), mouthR: .032, cap: .027 },
  { slot: 4, how: 'sapito', body: V(0, .024, -.085), bodyR: .034, mouth: V(0, .054, -.04), mouthN: V(0, .55, .83).normalize(), mouthR: .021, cap: .017 },
];
const FROG = FIGS[0];

let RANA_M = null;    // la mesa en la escena
let rflight = null;   // argolla en el aire
function isRana() { return !!(game && game.kind === 'rana'); }
function ranaWorld(x, y, z) { return V(x, RANA.TOP + y, RANA.Z + z); }

/* ---------- Física de la argolla ---------- */
// Velocidad de salida para que caiga en la tabla donde se apunta
function ranaTarget(aim) { return { x: aim.L * RANA.LX, z: RANA.Z + (RANA.P0 - aim.P) * RANA.SPAN }; }
function ranaVel(aim) {
  const tg = ranaTarget(aim), dx = tg.x - REL.x, dz = tg.z - REL.z, Dh = Math.max(.3, Math.hypot(dx, dz)), h = RANA.TOP + RANA.AT - REL.y;
  const c = Math.cos(RANA.THETA), tn = Math.tan(RANA.THETA);
  const v = Math.sqrt(G * Dh * Dh / (2 * c * c * Math.max(.05, Dh * tn - h)));
  return V(dx / Dh * v * c, v * Math.sin(RANA.THETA), dz / Dh * v * c);
}
// Dónde cruza la argolla un plano z (para que Don Chepe apunte a la boca o a los huecos de atrás)
function ranaAt(aim, zw) { const v = ranaVel(aim), t = (zw - REL.z) / v.z; return V(REL.x + v.x * t, REL.y + v.y * t - G * t * t / 2, zw); }

/* Simula el tiro completo. k es el número del tiro: con él sale el aleatorio, igual en todos los celulares. */
function ranaSimulate(aim, k) {
  const rnd = i => seeded(aim.L * 7.31 + i * .173, aim.P * 5.17 + k * .311, k * 1.7 + i);
  const p = V(REL.x, REL.y, REL.z), v = ranaVel(aim), dt = 1 / 400, T = RANA.TOP;
  const path = [{ t: 0, p: p.clone() }], events = [];
  let t = 0, mode = 'air', res = null, ri = 0, hops = 0, lands = 0;
  const L = q => V(q.x, q.y - T, q.z - RANA.Z);   // a coordenadas de la mesa
  const ev = (kind, q) => events.push({ t, kind, p: q.clone(), speed: v.length() });
  const jitter = (amp) => { const a = (rnd(ri++) - .5) * amp, c = Math.cos(a), s = Math.sin(a), x = v.x * c - v.z * s, z = v.x * s + v.z * c; v.x = x; v.z = z; };
  const end = (slot, how, extra) => { res = { slot, how, pts: slot >= 0 ? RANA_SLOTS[slot].pts : 0, ...extra }; };
  const holeAt = (x, z, rad) => { for (const s of RANA_SLOTS) if (s.kind === 'hueco' && Math.hypot(x - s.x, z - s.z) < rad) return s.i; return -1; };
  for (let i = 0; i < 5000 && !res; i++) {
    const prev = p.clone();
    if (mode === 'air') { v.y -= G * dt; p.addScaledVector(v, dt); }
    else {
      const sp = Math.hypot(v.x, v.z), dec = RANA.FR * dt;
      if (sp <= dec) { v.set(0, 0, 0); end(-1, 'mesa', { at: p.clone() }); break; }
      v.x -= v.x / sp * dec; v.z -= v.z / sp * dec; p.x += v.x * dt; p.z += v.z * dt;
    }
    t += dt;
    const a = L(prev), b = L(p);
    if (mode === 'air') {
      // 1) las bocas de la rana y del sapito; 2) si pega en el cuerpo de metal, rebota
      let inMouth = null;
      for (const f of FIGS) {
        const da = a.clone().sub(f.mouth).dot(f.mouthN), db = b.clone().sub(f.mouth).dot(f.mouthN);
        if (da > 0 && db <= 0 && a.clone().lerp(b, da / (da - db)).distanceTo(f.mouth) < f.cap) { inMouth = f; break; }
      }
      if (inMouth) { ev(inMouth.how, p); end(inMouth.slot, inMouth.how, { at: ranaWorld(inMouth.mouth.x, inMouth.mouth.y, inMouth.mouth.z) }); break; }
      for (const f of FIGS) {
        if (b.distanceTo(f.body) < f.bodyR + RANA.AR * .5) {
          const n = b.clone().sub(f.body).normalize(), vn = v.dot(n);
          if (vn < 0) { v.addScaledVector(n, -1.35 * vn); v.multiplyScalar(.6); jitter(.7); }
          p.copy(ranaWorld(0, 0, 0).add(f.body).addScaledVector(n, f.bodyR + RANA.AR * .5 + .002)); ev('metal', p); hops++;
        }
      }
      // 3) el tablero de atrás (y el marcador de encima): rebota hacia adelante
      if (a.z > -RANA.HD && b.z <= -RANA.HD && Math.abs(b.x) < RANA.HW && b.y > 0 && b.y < RANA.PANEL_H + .3) {
        v.z = Math.abs(v.z) * .45; v.x *= .7; v.y *= .6; jitter(.5); p.z = RANA.Z - RANA.HD + .002; ev('madera', p); hops++;
      }
      // 5) las barandas de los lados
      if (Math.abs(b.z) < RANA.HD && b.y > -.01 && b.y < .05 && Math.abs(a.x) < RANA.HW && Math.abs(b.x) >= RANA.HW) {
        v.x = -v.x * .35; p.x = Math.sign(b.x) * (RANA.HW - .002); ev('madera', p); hops++;
      }
      // 6) cae en la tabla: si cae encima de un hueco se va adentro; si no, rebota un poquito (es metal sobre madera) y se arrastra
      if (a.y > RANA.AT && b.y <= RANA.AT && Math.abs(b.x) <= RANA.HW && Math.abs(b.z) <= RANA.HD) {
        ev('mesa', p);
        const h = holeAt(b.x, b.z, RANA.HOLE * .7);
        if (h >= 0) { end(h, 'hueco', { at: ranaWorld(RANA_SLOTS[h].x, 0, RANA_SLOTS[h].z) }); break; }
        p.y = T + RANA.AT;
        if (!lands++ && Math.abs(v.y) > .9 && rnd(ri++) < RANA.HOP) { v.y = Math.abs(v.y) * (.12 + rnd(ri++) * .1); const keep = .3 + rnd(ri++) * .2; v.x *= keep; v.z *= keep; jitter(1.1); hops++; }
        else { mode = 'slide'; v.y = 0; const keep = RANA.KEEP[0] + rnd(ri++) * (RANA.KEEP[1] - RANA.KEEP[0]); v.x *= keep; v.z *= keep; jitter(.5); }
      }
      // 7) le pega al frente de la mesa y se cae
      if (a.z > RANA.HD && b.z <= RANA.HD && b.y < 0 && Math.abs(b.x) < RANA.HW + .02) { v.z = Math.abs(v.z) * .25; v.x *= .5; p.z = RANA.Z + RANA.HD + .002; ev('madera', p); hops++; }
      // 8) al piso
      if (p.y <= RANA.AT) { p.y = RANA.AT; ev('piso', p); const s = .12 + rnd(ri++) * .2; p.x += v.x * .03 * s; p.z += v.z * .03 * s; end(-1, 'piso', { at: p.clone() }); break; }
      if (hops > 14 || t > 4) { end(-1, 'piso', { at: V(p.x, RANA.AT, p.z) }); break; }
    } else {
      // arrastrándose por la tabla: si pasa despacio por un hueco se cae; rápido, solo si pasa por el centro
      const sp2 = Math.hypot(v.x, v.z), h = holeAt(b.x, b.z, sp2 < .6 ? .046 : sp2 < 1.5 ? .042 : .03);
      if (h >= 0) { end(h, 'hueco', { at: ranaWorld(RANA_SLOTS[h].x, 0, RANA_SLOTS[h].z) }); break; }
      for (const f of FIGS) {   // las figuras de metal la desvían
        const fd = Math.hypot(b.x - f.body.x, b.z - f.body.z), fr = f.bodyR * .85 + RANA.AR;
        if (fd < fr) {
          const nx = (b.x - f.body.x) / fd, nz = (b.z - f.body.z) / fd, vn = v.x * nx + v.z * nz;
          if (vn < 0) { v.x -= 1.4 * vn * nx; v.z -= 1.4 * vn * nz; jitter(.5); }
          p.x = f.body.x + nx * (fr + .002); p.z = RANA.Z + f.body.z + nz * (fr + .002); ev('metal', p);
        }
      }
      if (b.z < -RANA.HD + RANA.AR) { v.z = Math.abs(v.z) * .6; p.z = RANA.Z - RANA.HD + RANA.AR; ev('madera', p); }
      if (Math.abs(b.x) > RANA.HW - RANA.AR) { v.x = -v.x * .55; p.x = Math.sign(b.x) * (RANA.HW - RANA.AR); ev('madera', p); }
      if (b.z > RANA.HD + RANA.AR * .3) {   // se sale por el borde de adelante: cae al piso
        mode = 'air'; v.y = 0;
      }
    }
    if (i % 2 === 0) path.push({ t, p: p.clone() });
  }
  if (!res) end(-1, 'piso', { at: V(p.x, RANA.AT, p.z) });
  path.push({ t, p: p.clone() });
  // al entrar se ve cómo se mete por el hueco o por la boca
  if (res.slot >= 0) {
    const s = res.at.clone(), steps = 10;
    const fig = FIGS.find(f => f.how === res.how);
    const inside = fig ? s.clone().addScaledVector(fig.mouthN, -.04).add(V(0, -.05, 0)) : s.clone().add(V(0, -.07, 0));
    const from = p.clone();
    for (let j = 1; j <= steps; j++) { const u = j / steps; path.push({ t: t + u * .14, p: from.clone().lerp(s, Math.min(1, u * 2)).lerp(inside, Math.max(0, u * 2 - 1)) }); }
    t += .14;
  }
  return { path, events, duration: t, res, end: path[path.length - 1].p.clone() };
}

/* ---------- La mesa ---------- */
// Argolla de rana: disco de bronce dorado con cuatro ventanas, como las de verdad
let ARG_GEO = null, ARG_MAT = null;
function makeArgolla() {
  if (!ARG_GEO) {
    const R = RANA.AR + .001, sh = new THREE.Shape(); sh.absarc(0, 0, R, 0, Math.PI * 2, false);
    for (let k = 0; k < 4; k++) {   // ventanas en forma de riñón entre los rayos
      const a0 = k * Math.PI / 2 + .3, a1 = a0 + Math.PI / 2 - .6, r1 = R * .3, r2 = R * .76, h = new THREE.Path();
      h.moveTo(r1 * Math.cos(a0), r1 * Math.sin(a0)); h.absarc(0, 0, r2, a0, a1, false); h.lineTo(r1 * Math.cos(a1), r1 * Math.sin(a1)); h.absarc(0, 0, r1, a1, a0, true);
      sh.holes.push(h);
    }
    ARG_GEO = new THREE.ExtrudeGeometry(sh, { depth: RANA.AT * .7, bevelEnabled: true, bevelThickness: .0008, bevelSize: .0008, bevelSegments: 1, curveSegments: 18 });
    ARG_GEO.translate(0, 0, -RANA.AT * .35);
    ARG_MAT = std({ color: '#d8b04a', metalness: .6, roughness: .3 });
  }
  const m = new THREE.Mesh(ARG_GEO, ARG_MAT); m.castShadow = true; return m;
}
function feltTex(color) {   // paño de la tabla
  const S = 512, [c, g] = cnv(S, S);
  g.fillStyle = color; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.06)'; g.fillRect(Math.random() * S, Math.random() * S, 1.5, 1.5); }
  return [c, g];
}
function ranaTopTex() {   // la tabla de paño azul con sus diez huecos
  const S = 512, [c, g] = feltTex('#1d4c93'), k = S / (RANA.HW * 2);
  RANA_SLOTS.filter(s => s.kind === 'hueco').forEach(s => {
    const x = (s.x + RANA.HW) * k, y = (s.z + RANA.HD) * k, r = RANA.HOLE * k;
    const gr = g.createRadialGradient(x, y - r * .2, r * .1, x, y, r); gr.addColorStop(0, '#0a0503'); gr.addColorStop(.7, '#3a1c0a'); gr.addColorStop(1, '#8a4a1c');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  });
  return tex(c);
}
function ranaPanelTex() {   // tablero de atrás: el mismo paño azul con el nombre en esténcil
  return fontTex(512, Math.round(512 * RANA.PANEL_H / (RANA.HW * 2)), (g, w, h) => {
    g.fillStyle = '#1d4c93'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.06)'; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
    g.fillStyle = 'rgba(14,16,22,.85)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '92px "Alfa Slab One"'; g.fillText('RANA', w / 2, h * .26);
  });
}
function ranaSlatTex(row) {   // tablilla naranja con los puntos de la fila en esténcil, como el cajón de la foto
  return fontTex(512, 96, (g, w, h) => {
    g.fillStyle = '#e0913a'; g.fillRect(0, 0, w, h);
    g.globalAlpha = .16; for (let i = 0; i < 18; i++) { g.strokeStyle = Math.random() < .5 ? '#7a3f12' : '#fff'; g.lineWidth = rand(.5, 2); g.beginPath(); const y = rand(0, h); g.moveTo(0, y); g.lineTo(w, y + rand(-3, 3)); g.stroke(); }
    g.globalAlpha = 1; g.fillStyle = '#2a211b'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '64px "Alfa Slab One"';
    RANA_PTS[row].forEach((pts, c) => g.fillText(String(pts), w * (c + .5) / 3, h * .55));
  });
}
function ranaLabelTex() {
  return fontTex(512, 96, (g, w, h) => {
    g.fillStyle = '#e0913a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2a211b'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '62px "Alfa Slab One"'; g.fillText('RANA', w / 2, h * .54);
  });
}
// Figura de metal plateado con la boca abierta hacia la raya (la rana grande atrás, el sapito adelante)
function makeFigure(f, big) {
  const g = new THREE.Group(), m = std({ color: '#cfcfca', metalness: .55, roughness: .32 }), dark = new THREE.MeshBasicMaterial({ color: '#050403' });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), m); body.scale.set(f.bodyR * 1.05, f.body.y * 1.1, f.bodyR); body.position.copy(f.body); g.add(body);
  const hc = f.mouth.clone().addScaledVector(f.mouthN, -f.mouthR * .9);   // la cabeza alrededor de la boca
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), m); head.scale.set(f.mouthR * 1.65, f.mouthR * 1.45, f.mouthR * 1.3); head.position.copy(hc); g.add(head);
  if (big) { const neck = new THREE.Mesh(new THREE.CylinderGeometry(f.mouthR * 1.2, f.bodyR * .8, hc.y - f.body.y, 18), m); neck.position.set(0, (hc.y + f.body.y) / 2, (hc.z + f.body.z) / 2); g.add(neck); }
  const lip = new THREE.Mesh(new THREE.TorusGeometry(f.mouthR + .004, .0055, 10, 28), m);
  lip.position.copy(f.mouth); lip.lookAt(lip.position.clone().add(f.mouthN)); g.add(lip);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(f.mouthR + .001, 24), dark); hole.position.copy(f.mouth).addScaledVector(f.mouthN, .001); hole.lookAt(hole.position.clone().add(f.mouthN)); g.add(hole);
  [-1, 1].forEach(sx => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(f.mouthR * .45, 12, 10), m); eye.position.set(sx * f.mouthR * .9, hc.y + f.mouthR * 1.2, hc.z + f.mouthR * .3); g.add(eye);
    const pup = new THREE.Mesh(new THREE.SphereGeometry(f.mouthR * .2, 10, 8), dark); pup.position.set(sx * f.mouthR * .95, hc.y + f.mouthR * 1.3, hc.z + f.mouthR * .68); g.add(pup);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), m); foot.scale.set(f.bodyR * .32, f.bodyR * .18, f.bodyR * .45); foot.position.set(sx * f.bodyR * .65, f.bodyR * .12, f.body.z + f.bodyR * .7); g.add(foot);
  });
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
// Siete segmentos para el marcador de luces
function draw7(g, str, x, y, w, h, on, off) {
  const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', ' ': '' };
  const t = w * .16, gap = w * .28;
  [...str].forEach((ch, k) => {
    const ox = x + k * (w + gap), lit = SEG[ch] || '';
    const segs = { a: [ox + t, y, w - 2 * t, t], b: [ox + w - t, y + t, t, h / 2 - 1.5 * t], c: [ox + w - t, y + h / 2 + t / 2, t, h / 2 - 1.5 * t], d: [ox + t, y + h - t, w - 2 * t, t],
      e: [ox, y + h / 2 + t / 2, t, h / 2 - 1.5 * t], f: [ox, y + t, t, h / 2 - 1.5 * t], g: [ox + t, y + h / 2 - t / 2, w - 2 * t, t] };
    for (const s in segs) { g.fillStyle = lit.includes(s) ? on : off; const [a, b, c2, d] = segs[s]; g.fillRect(a, b, c2, d); }
  });
}
function ranaBoardDraw() {
  const M = RANA_M; if (!M) return;
  const g = M.boardG, W2 = M.boardC.width, H2 = M.boardC.height;
  g.fillStyle = '#0b0a09'; g.fillRect(0, 0, W2, H2);
  const p = isRana() && game.order.length ? current() : null;
  g.fillStyle = '#f5eddd'; g.font = '800 40px "Bricolage Grotesque", sans-serif'; g.textBaseline = 'top'; g.textAlign = 'left';
  g.fillText(p ? p.name.toUpperCase().slice(0, 14) : 'RANA', 22, 16);
  g.fillStyle = '#8c7b62'; g.font = '700 22px "Bricolage Grotesque", sans-serif'; g.textAlign = 'right';
  g.fillText(p && isRana() ? `META ${game.goal}` : '', W2 - 22, 26);
  const total = p ? String(Math.min(9999, p.score)).padStart(4, ' ') : '   0';
  g.shadowColor = '#ff2a1a'; g.shadowBlur = 16;
  draw7(g, total, 26, 78, 58, 110, '#ff3b24', '#2a0d09');
  g.shadowBlur = 10; g.fillStyle = '#8c7b62'; g.shadowBlur = 0; g.textAlign = 'left'; g.font = '700 20px "Bricolage Grotesque", sans-serif';
  g.fillText('TANDA', 360, 76);
  g.shadowColor = '#ffb21a'; g.shadowBlur = 12;
  draw7(g, (p && isRana() ? String(Math.min(999, game.turnPts)) : '0').padStart(3, ' '), 360, 104, 30, 56, '#ffb72a', '#2a1a06');
  g.shadowBlur = 0;
  const left = p && isRana() ? RANA.PER_TURN - game.arg - (phase === 'flight' || phase === 'result' || phase === 'roundEnd' ? 1 : 0) : RANA.PER_TURN;
  for (let i = 0; i < RANA.PER_TURN; i++) { g.beginPath(); g.arc(372 + i * 22, 196, 7, 0, Math.PI * 2); g.fillStyle = i < left ? '#3ddc6a' : '#1d2a1f'; g.fill(); }
  M.boardT.needsUpdate = true;
}
function buildRana() {
  if (RANA_M) return;
  const g = new THREE.Group(), T0 = RANA.TOP, HW = RANA.HW, HD = RANA.HD;
  const pine = std({ map: makeWoodTex('#d4842e', null), roughness: .75 }), dark = std({ color: '#2a1407', roughness: 1 });
  const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; };
  // tabla de arriba: paño azul con los huecos
  const topM = std({ map: ranaTopTex(), roughness: .95 });
  box(HW * 2, .04, HD * 2, 0, T0 - .02, 0, [pine, pine, topM, pine, pine, pine]);
  // costados con baranda, cuerpo y patas
  [-1, 1].forEach(sx => {
    box(.025, T0 + .06, HD * 2 + .02, sx * (HW + .0125), (T0 + .06) / 2, 0, pine);
  });
  box(HW * 2, T0 - .05, .02, 0, (T0 - .05) / 2 + .03, -HD + .01, pine);   // fondo del cuerpo
  // frente: franja con el letrero, los cajones abiertos y las tablillas con los puntos
  const front = HD + .01, label = std({ map: ranaLabelTex(), roughness: .7 });
  box(HW * 2, .1, .02, 0, T0 - .09, front, [pine, pine, pine, pine, label, pine]);
  const rowH = .15, slatH = .05, y0 = T0 - .14;
  for (let r = 0; r < 4; r++) {
    const yTop = y0 - r * rowH, slatY = yTop - (rowH - slatH) - slatH / 2;
    box(HW * 2, slatH, .02, 0, slatY, front, [pine, pine, pine, pine, std({ map: ranaSlatTex(r), roughness: .75 }), pine]);
    box(HW * 2, .008, .3, 0, yTop - (rowH - slatH) + .004, front - .15, dark);   // piso del cajón
    [-1, 1].forEach(sx => box(.012, rowH - slatH, .3, sx * HW / 3, yTop - (rowH - slatH) / 2, front - .15, pine));   // divisiones
  }
  box(HW * 2, rowH * 4, .01, 0, y0 - rowH * 2, front - .3, dark);   // fondo oscuro de los cajones
  box(HW * 2, y0 - rowH * 4, .02, 0, (y0 - rowH * 4) / 2, front, pine);   // zócalo
  // tablero de atrás de paño azul, con un gancho y una argolla colgada (adorno, como en la foto)
  const panelM = std({ map: ranaPanelTex(), roughness: .95 });
  box(HW * 2 + .05, RANA.PANEL_H, .025, 0, T0 + RANA.PANEL_H / 2, -HD - .0125, [pine, pine, pine, pine, panelM, pine]);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(.008, .0018, 6, 16, Math.PI * 1.4), std({ color: '#b9b4a8', metalness: .6, roughness: .3 }));
  hook.position.set(0, T0 + RANA.PANEL_H * .66, -HD + .012); hook.rotation.set(0, Math.PI / 2, Math.PI * .8); g.add(hook);
  const deco = makeArgolla(); deco.position.set(0, T0 + RANA.PANEL_H * .66 - .03, -HD + .008); g.add(deco);
  // marcador de luces encima del tablero, con marco de madera
  const [bc, bg] = cnv(512, 224), bt = tex(bc);
  const boardY = T0 + RANA.PANEL_H + .14;
  box(HW * 2 + .08, .3, .05, 0, boardY, -HD - .02, pine);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2 - .02, .26), new THREE.MeshBasicMaterial({ map: bt, toneMapped: false }));
  screen.position.set(0, boardY, -HD + .006); g.add(screen);
  // la rana grande atrás y el sapito adelante
  FIGS.forEach((f, i) => { const m = makeFigure(f, i === 0); m.position.set(0, T0, 0); g.add(m); });
  g.position.set(0, 0, RANA.Z); g.visible = false; scene.add(g);
  RANA_M = { g, boardC: bc, boardG: bg, boardT: bt };
  ranaBoardDraw(); onFont('64px "Bricolage Grotesque"', ranaBoardDraw);
}

/* ---------- Las argollas de la tanda ---------- */
// Donde queda la argolla en el cajón de su hueco (se ven por el frente de la mesa)
function ranaDrawerPos(slot, n) {
  const s = RANA_SLOTS[slot], rowH = .15, slatH = .05, yTop = RANA.TOP - .14 - s.r * rowH, floor = yTop - (rowH - slatH) + .008;
  const jx = ((n * 37 + slot * 11) % 9 - 4) * .012, jz = ((n * 53 + slot * 7) % 5 - 2) * .02;
  return V(RANA_COLS[s.c] * (2 * RANA.HW / 3) / .17 + jx, floor + RANA.AT + n * .011, RANA.Z + RANA.HD - .09 + jz);
}
function ranaPlaceRing(mesh, slot, n) {
  mesh.position.copy(ranaDrawerPos(slot, n)); mesh.rotation.set(Math.PI / 2, 0, (slot * 1.7 + n * 2.3) % 6.28); mesh.visible = true;
}
function ranaClearRings() { if (game && game.rings) game.rings.forEach(r => scene.remove(r.mesh)); if (game) game.rings = []; }

/* ---------- Turno, tiro y resultado ---------- */
function ranaPrepare() { buildRana(); game.kind = 'rana'; game.arg = 0; game.turnPts = 0; game.rings = []; ranaBoardDraw(); }
function ranaLaunch(a, opts) {
  const p = current();
  lastP[p.name] = a.P;
  const sim = ranaSimulate(a, game.thrown);
  const mesh = makeArgolla(); mesh.position.copy(sim.path[0].p); scene.add(mesh);
  rflight = { sim, mesh, t: 0, ev: 0, owner: game.order[game.idx], timeout: !!(opts && opts.timeout), spin: 9 + seeded(a.L, a.P, game.thrown) * 6, landed: false, done: false };
  reticle.visible = false; phase = 'flight'; hint('', false); setGauge(a.P, lastP[p.name]);
  game.thrown++;
  A.whoosh(); buzz(15); ranaBoardDraw();
}
function ranaUpdate(dt) {
  const f = rflight; if (!f || f.done) return;
  f.t += dt;
  const sim = f.sim;
  while (f.ev < sim.events.length && sim.events[f.ev].t <= f.t) {
    const e = sim.events[f.ev++];
    if (e.kind === 'metal' || e.kind === 'rana' || e.kind === 'sapito') { A.hit(); sparks(e.p, 10); }
    else if (e.kind === 'piso') { A.floor(); }
    else { A.wood(); }
    if (e.kind === 'mesa' || e.kind === 'madera') f.landed = true;
  }
  f.mesh.position.copy(samplePath(sim.path, Math.min(f.t, sim.duration)));
  if (!f.landed) f.mesh.rotation.set(Math.PI / 2 + Math.sin(f.t * 5) * .5, f.t * 2, f.t * f.spin);
  else f.mesh.rotation.set(Math.PI / 2, 0, f.mesh.rotation.z + dt * 3);
  if (f.t >= sim.duration) ranaFinish();
}
function ranaFinish() {
  const f = rflight; if (!f || f.done) return; f.done = true; rflight = null;
  const p = game.players[f.owner], r = f.sim.res;
  const n = game.rings.filter(x => x.slot === r.slot).length;
  game.rings.push({ owner: f.owner, mesh: f.mesh, slot: r.slot, pts: r.pts });
  if (r.slot >= 0) { ranaPlaceRing(f.mesh, r.slot, n); A.wood(); }
  else { f.mesh.position.copy(r.at); f.mesh.rotation.set(Math.PI / 2, 0, f.spin); }
  p.st.tiros++;
  phase = 'result'; resultAt = performance.now();
  if (r.pts) {
    p.score += r.pts; game.turnPts += r.pts; p.st.mechas++;
    if (r.how === 'rana' || r.how === 'sapito') {
      if (r.how === 'rana') p.st.mon++; else p.st.emb++;
      announce(r.how === 'rana' ? '¡RANA!' : '¡SAPITO!', `${p.name.toUpperCase()} +${r.pts}`, true); A.cheer(); A.clank(); flashScreen(); buzz([40, 30, 80]);
    } else { toast(`+${r.pts}`); A.tick(); }
    bumpChip(f.owner); feed(p, `${{ rana: 'RANA', sapito: 'SAPITO', hueco: 'Hueco' }[r.how]} +${r.pts}`);
  } else if (r.how === 'mesa') { toast('Se quedó en la mesa'); feed(p, 'Quedó en la mesa'); }
  else { p.st.nulos++; toast(f.timeout ? 'Se acabó el tiempo' : 'Afuera'); feed(p, f.timeout ? 'Se le acabó el tiempo' : 'Afuera'); }
  renderBoard(); ranaBoardDraw();
  later(r.how === 'rana' || r.how === 'sapito' ? 2.2 : 1.0, advance);
}
function ranaAdvance() {
  if (phase === 'over') return;
  const leader = winnerNow(); if (leader) return gameOver(leader);
  game.arg++;
  if (game.arg < RANA.PER_TURN) return nextThrow();
  // terminó la tanda de 6 argollas: se recogen y sigue el siguiente
  const p = current();
  phase = 'roundEnd'; resultAt = performance.now();
  toast(game.turnPts ? `Tanda de ${p.name}: +${game.turnPts}` : `${p.name} no metió nada en esta tanda`);
  later(1.5, () => {
    ranaClearRings(); game.arg = 0; game.turnPts = 0;
    game.idx++;
    if (game.idx < game.order.length) nextThrow(); else startRound();
  });
}

/* ---------- Puntería y cámaras ---------- */
function ranaShowReticle(aim) {
  if (!aimHelpNow()) { reticle.visible = false; return; }
  const tg = ranaTarget(aim), lx = tg.x, lz = tg.z - RANA.Z;
  let pos, n = V(0, 1, 0), good = false;
  if (Math.abs(lx) <= RANA.HW && Math.abs(lz) <= RANA.HD) { pos = V(lx, RANA.TOP + .004, tg.z); good = true; }
  else if (lz < -RANA.HD) {
    const q = ranaAt(aim, RANA.Z - RANA.HD + .003), y = q.y - RANA.TOP;
    if (y > 0 && y < RANA.PANEL_H && Math.abs(q.x) < RANA.HW) { pos = q; n = V(0, 0, 1); }
  }
  if (!pos) { const v = ranaVel(aim), t = (v.y + Math.sqrt(v.y * v.y + 2 * G * (REL.y - .004))) / G; pos = V(REL.x + v.x * t, .004, REL.z + v.z * t); }
  reticle.visible = true; reticle.position.copy(pos);
  reticle.quaternion.setFromUnitVectors(V(0, 0, 1), n);
  reticleCore.color.set(good ? '#f3c22f' : '#d8392d');
  reticle.scale.setScalar(.42 * (1 + (drag ? clamp(((performance.now() - drag.t0) / 1000 - 1.6) * .25, 0, .8) : 0)));
  reticle.userData.uv = null;
}
function ranaCamPose() {
  const asp = isFinite(cam.aspect) && cam.aspect > 0 ? cam.aspect : .5, D = 4.3, t = performance.now() / 1000;
  // un poco más abierta y mirando más arriba para que el marcador quede debajo de los puntajes de arriba
  const fov = Math.max(2 * Math.atan(.48 / (D * asp)), 2 * Math.atan(.86 / D)) * 180 / Math.PI * 1.25;
  return { pos: V(Math.sin(t * .5) * .012, 1.74 + Math.sin(t * .8) * .006, RANA.Z + D), look: V(0, 1.1, RANA.Z), fov };
}
function ranaMenuPose(orbit) {
  const a = Math.sin(orbit * .8) * .9, r = 2.3;
  return { pos: V(Math.sin(a) * r, 1.45, RANA.Z + Math.cos(a) * r), look: V(0, RANA.TOP + .1, RANA.Z), fov: 40 };
}
function ranaLupa() {   // la lupa mira la tabla desde arriba, con la raya hacia abajo
  lupaCam.up.set(0, 0, -1); lupaCam.position.set(0, RANA.TOP + 1.05, RANA.Z + .02); lupaCam.lookAt(0, RANA.TOP, RANA.Z);
}
// La mesa solo se ve cuando se juega rana (o se escoge en el menú)
function ranaFrame() {
  const want = (phase === 'menu' || phase === 'boot') ? settings.game === 'rana' : isRana();
  if (want && !RANA_M) buildRana();
  if (RANA_M) RANA_M.g.visible = want;
}

/* ---------- Don Chepe en la rana ---------- */
// Fuerza para que la argolla pase por el punto (x, y, z): primero el lado, luego la fuerza (bisección)
function ranaAimThrough(x, y, z) {
  let L = x / RANA.LX, P = .5;
  for (let k = 0; k < 3; k++) {
    let lo = 0, hi = 1;
    for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2, q = ranaAt({ L, P: m }, z); if (q.y < y) lo = m; else hi = m; }
    P = (lo + hi) / 2;
    const q = ranaAt({ L, P }, z); L += (x - q.x) / RANA.LX;
  }
  return { L, P };
}
function ranaAimLand(x, z) { return { L: x / RANA.LX, P: RANA.P0 - (z - RANA.Z) / RANA.SPAN }; }
function ranaPlanCpu(p) {
  const d = settings.diff, r = Math.random(), sd = [.075, .045, .03, .022][d];
  // los buenos le apuntan al sapito (100) y a la rana (80); los demás, a los huecos que más dan
  const want = d === 3 ? (r < .4 ? 'sapito' : r < .75 ? 'rana' : 'hueco') : d === 2 ? (r < .2 ? 'sapito' : r < .5 ? 'rana' : 'hueco')
    : d === 1 ? (r < .08 ? 'sapito' : r < .25 ? 'rana' : 'hueco') : (r < .05 ? 'rana' : 'hueco');
  let ideal;
  const fig = FIGS.find(f => f.how === want);
  if (fig) { const m = ranaWorld(fig.mouth.x, fig.mouth.y, fig.mouth.z); ideal = ranaAimThrough(m.x, m.y, m.z); }
  else {
    const hs = RANA_SLOTS.filter(s => s.kind === 'hueco' && (d >= 2 ? s.pts >= 40 : true)), s = hs[Math.floor(Math.random() * hs.length)];
    ideal = ranaAimLand(s.x, RANA.Z + s.z + .015);
  }
  const fin = { L: ideal.L + gauss() * sd / RANA.LX, P: clamp(ideal.P + gauss() * sd / RANA.SPAN, .02, 1) };
  cpuAim = { from: { L: rand(-.5, .5), P: rand(.2, .45) }, to: fin, t: 0, dur: rand(.9, 1.3) };
}

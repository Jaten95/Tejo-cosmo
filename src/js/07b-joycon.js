/* ================= Joy-Con (Chrome o Edge en computador, por WebHID) =================
   La palanca apunta; se mantiene ZR (o R), se echa el brazo como en la cancha y al soltar sale el tejo.
   La fuerza sale de qué tan rápido gira el Joy-Con al final del lance. Vibra con los golpes del juego. */
const JC_POW = { lo: 120, hi: 820, hiBolo: 1050 };   // °/s del lance: lo = sin fuerza, hi = fuerza completa (la bola pesa: pide más brazo)
const JC_WIN = .35;                    // s: el lance que cuenta es el de este último pedacito antes de soltar
const JC_DPS = .07;                    // °/s por unidad del giroscopio
const JC_KIND = { 0x2006: 'L', 0x2007: 'R', 0x2009: 'Pro' };
const JC_NAME = { L: 'Joy-Con (L)', R: 'Joy-Con (R)', Pro: 'Pro Controller' };
const JC = { list: [], n: 0, last: null };

function jcCan() { return 'hid' in navigator && !window.claude && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent); }
function jcOn() { return JC.list.length > 0; }
function jcHint() { return 'Joy-Con: la palanca apunta · mantén ZR, echa el brazo y suelta'; }
function jcPow(w) { return clamp((w - JC_POW.lo) / ((isBolo() ? JC_POW.hiBolo : JC_POW.hi) - JC_POW.lo), 0, 1); }

/* ---------- Enviar ---------- */
// cada Joy-Con lleva su propia fila de envíos: Windows se queja si se le mandan dos reportes a la vez
function jcSend(j, id, bytes) {
  j.q = j.q.then(() => j.dev.opened ? j.dev.sendReport(id, new Uint8Array(bytes)) : null).catch(() => { });
  return j.q;
}
const JC_NEUTRAL = [0x00, 0x01, 0x40, 0x40];
function jcSub(j, cmd, args = []) { return jcSend(j, 0x01, [JC.n++ & 15, ...JC_NEUTRAL, ...JC_NEUTRAL, cmd, ...args]); }
// vibración HD: frecuencia baja, alta (Hz) y fuerza 0–1, a los dos motores por igual
function jcRumbleBytes(lf, hf, amp) {
  lf = clamp(lf, 40.875885, 626.286133); hf = clamp(hf, 81.75177, 1252.572266); amp = clamp(amp, 0, 1);
  const hfE = (Math.round(32 * Math.log2(hf * .1)) - 0x60) * 4, lfE = (Math.round(32 * Math.log2(lf * .1)) - 0x40) & 255;
  let ha = amp === 0 ? 0 : amp < .117 ? (Math.log2(amp * 1000) * 32 - 0x60) / (5 - amp * amp) - 1 : amp < .23 ? Math.log2(amp * 1000) * 32 - 0x60 - 0x5c : (Math.log2(amp * 1000) * 32 - 0x60) * 2 - 0xf6;
  ha = Math.max(0, Math.trunc(ha)) & 255;
  let la = Math.trunc(ha * .5); const par = la % 2; if (par) la--; la = (la >> 1) + 0x40; if (par) la |= 0x8000;
  return [hfE & 255, (((hfE >> 8) & 255) + ha) & 255, (lfE + ((la >> 8) & 255)) & 255, la & 255];
}
function jcRumble(j, amp) { const r = amp > 0 ? jcRumbleBytes(160, 320, amp) : JC_NEUTRAL; return jcSend(j, 0x10, [JC.n++ & 15, ...r, ...r]); }
// lo llama buzz(): el mismo patrón que vibra el celular (ms prendido, apagado, prendido…)
function jcBuzz(ms) {
  if (!jcOn()) return;
  const pat = Array.isArray(ms) ? ms : [ms];
  let t = 0;
  pat.forEach((d, i) => {
    if (i % 2 === 0) { const amp = clamp(.3 + d / 120, .3, .8); setTimeout(() => JC.list.forEach(j => jcRumble(j, amp)), t); }
    t += d;
    if (i % 2 === 0) setTimeout(() => JC.list.forEach(j => jcRumble(j, 0)), t);
  });
}
function jcLights() { JC.list.forEach((j, i) => jcSub(j, 0x30, [1 << Math.min(i, 3)])); }   // la lucecita dice qué número de control es

/* ---------- Conectar ---------- */
async function jcOpen(dev) {
  if (!JC_KIND[dev.productId] || JC.list.some(j => j.dev === dev)) return;
  try { if (!dev.opened) await dev.open(); } catch (e) { toast('No se pudo abrir el ' + (dev.productName || 'Joy-Con')); return; }
  const kind = JC_KIND[dev.productId];
  const j = { dev, kind, name: JC_NAME[kind], q: Promise.resolve(), btn: 0, prev: 0, sx: 0, cx: null, w: [], wNow: 0, hold: null, bat: -1 };
  dev.addEventListener('inputreport', e => jcReport(j, e));
  JC.list.push(j);
  await jcSub(j, 0x03, [0x30]);   // reporte completo, 60 veces por segundo
  await jcSub(j, 0x40, [0x01]);   // prende giroscopio y acelerómetro
  await jcSub(j, 0x48, [0x01]);   // prende la vibración
  jcLights(); jcBuzz([60]);
  toast(j.name + ' conectado'); jcShow();
}
async function jcConnect() {
  A.init();
  try {
    const devs = await navigator.hid.requestDevice({ filters: [{ vendorId: 0x057e }] });
    if (!devs.length) return;
    for (const d of devs) await jcOpen(d);
  } catch (e) { toast('Este navegador no deja usar el Joy-Con'); }
}
function jcGone(dev) {
  const i = JC.list.findIndex(j => j.dev === dev); if (i < 0) return;
  const j = JC.list[i]; JC.list.splice(i, 1);
  if (drag && drag.id === 'jc') { drag = null; if (reticle) reticle.visible = false; }
  toast('Se desconectó el ' + j.name); jcLights(); jcShow();
}
function jcInit() {
  if (!jcCan()) return;
  $('jcSub').hidden = $('jcRows').hidden = false;
  $('btnJc').addEventListener('click', jcConnect);
  navigator.hid.addEventListener('connect', e => jcOpen(e.device));   // se despertó o volvió a prender
  navigator.hid.addEventListener('disconnect', e => jcGone(e.device));
  navigator.hid.getDevices().then(ds => ds.forEach(jcOpen)).catch(() => { });   // los que ya tenían permiso se conectan solos
  jcShow();
}

/* ---------- Leer ---------- */
const JC_BAT = ['vacía', 'casi vacía', 'baja', 'media', 'llena'];
function jcReport(j, e) {
  if (e.reportId !== 0x30) return;
  const d = e.data; if (d.byteLength < 48) return;
  const now = performance.now() / 1000;
  j.bat = d.getUint8(1) >> 5;   // 0 vacía … 4 llena
  j.btn = d.getUint8(2) | d.getUint8(3) << 8 | d.getUint8(4) << 16;
  const o = j.kind === 'L' ? 5 : j.kind === 'R' ? 8 : 5;   // el Pro apunta con la palanca izquierda
  const x = d.getUint8(o) | (d.getUint8(o + 1) & 15) << 8;
  if (j.cx === null) j.cx = x > 1600 && x < 2500 ? x : 2048;   // donde está quieta al conectar es el centro
  const sx = (x - j.cx) / 1250; j.sx = Math.abs(sx) < .18 ? 0 : clamp(sx, -1, 1);
  for (let k = 0; k < 3; k++) {   // trae tres lecturas del giroscopio, una cada 5 ms
    const b = 12 + k * 12, w = Math.hypot(d.getInt16(b + 6, true), d.getInt16(b + 8, true), d.getInt16(b + 10, true)) * JC_DPS;
    j.w.push({ t: now - (2 - k) * .005, w });
  }
  while (j.w.length && j.w[0].t < now - 1) j.w.shift();
  j.wNow = jcPeak(j, .05, now);
  jcButtons(j, now);
  j.prev = j.btn;
  if (!$('mSheet').hidden) jcShow();
}
// lo más rápido que giró en los últimos s segundos, promediando de a tres lecturas para quitar picos sueltos
function jcPeak(j, s, now) {
  let m = 0; const a = j.w;
  for (let i = 2; i < a.length; i++) if (a[i].t >= now - s) m = Math.max(m, (a[i].w + a[i - 1].w + a[i - 2].w) / 3);
  return m;
}

/* ---------- Jugar ---------- */
const JC_B = { Y: 1, X: 2, B: 4, A: 8, R: 0x40, ZR: 0x80, MINUS: 0x100, PLUS: 0x200, DOWN: 0x10000, UP: 0x20000, RIGHT: 0x40000, LEFT: 0x80000, L: 0x400000, ZL: 0x800000 };
const JC_SHOOT = JC_B.R | JC_B.ZR | JC_B.L | JC_B.ZL, JC_OK = JC_B.A | JC_B.B | JC_B.X | JC_B.Y | JC_B.DOWN | JC_B.UP | JC_B.RIGHT | JC_B.LEFT;
function jcButtons(j, now) {
  const down = j.btn & ~j.prev, up = ~j.btn & j.prev;
  if (down & (JC_B.PLUS | JC_B.MINUS)) { if (paused) resume(); else pause(); return; }
  if (!game || paused) { if (up & JC_SHOOT) jcTry(j, now); return; }
  if ((down & JC_OK) && (phase === 'result' || phase === 'roundEnd')) { if (performance.now() - resultAt > 700) skipWait(); return; }
  if (down & JC_SHOOT) jcPress(j, now);
  if ((up & JC_SHOOT) && !(j.btn & JC_SHOOT)) jcRelease(j, now);
}
// en los ajustes (sin partida) el lance solo se mide, para practicar
function jcTry(j, now) { const w = jcPeak(j, JC_WIN, now); JC.last = { w, P: jcPow(w) }; jcShow(); }
function jcMine() { return phase === 'aim' && !paused && !armBusy() && (!drag || drag.id === 'jc'); }
function jcPress(j, now) {
  if (!jcMine()) return;
  A.init();
  if (!drag) drag = { id: 'jc', L: 0, P: lastP[current().name] ?? .4, t0: performance.now() };
  drag.t0 = performance.now(); drag.warned = false; j.hold = { t: now, live: false };
  helpHint('Echa el brazo y suelta ZR al lanzar');
}
function jcRelease(j, now) {
  if (!j.hold) return;
  const w = jcPeak(j, JC_WIN, now), P = jcPow(w); j.hold = null;
  JC.last = { w, P };
  if (!drag || drag.id !== 'jc' || phase !== 'aim') return;
  if (P < .06) { setGauge(0, lastP[current().name]); helpHint('Mueve más el brazo para darle fuerza'); drag.P = lastP[current().name] ?? .4; return; }
  drag.P = P;
  const aim = currentAim(performance.now()); drag = null;
  const fa = finalAim(aim);
  armRelease(() => { if (phase !== 'aim') return; if (online()) netThrow(fa); else launch(fa); });
}
// cada cuadro: la palanca mueve la mira y, mientras se mantiene ZR, la fuerza sigue al brazo
function jcUpdate(dt) {
  if (!jcOn() || !game || paused) return;
  const now = performance.now() / 1000;
  JC.list.forEach(j => {
    if (j.sx && jcMine()) {
      if (!drag) drag = { id: 'jc', L: 0, P: lastP[current().name] ?? .4, t0: performance.now() };
      if (drag.id === 'jc') {
        drag.L = clamp(drag.L + Math.sign(j.sx) * j.sx * j.sx * AIM.L * .9 * dt, -AIM.L, AIM.L);
        if (!j.hold) drag.t0 = performance.now();
      }
    }
    if (j.hold && drag && drag.id === 'jc') {
      const w = jcPeak(j, JC_WIN, now);
      if (w > JC_POW.lo + 30) j.hold.live = true;   // hasta que no se mueva, la mira se queda con la fuerza de antes
      if (j.hold.live) drag.P = jcPow(w);
    }
  });
}

/* ---------- Ajustes ---------- */
function jcShow() {
  if (!jcCan()) return;
  const on = jcOn();
  $('btnJc').textContent = on ? 'Agregar otro' : 'Conectar';
  $('jcInfo').textContent = on ? JC.list.map(j => j.name + (j.bat >= 0 ? ' · batería ' + JC_BAT[Math.min(4, j.bat)] : '')).join(' · ')
    : 'Lanza moviendo el brazo. Primero emparéjalo por Bluetooth en el computador';
  $('jcMeter').hidden = !on;
  if (!on) return;
  const w = Math.max(...JC.list.map(j => j.wNow));
  $('jcBar').style.width = Math.round(clamp(w / JC_POW.hi, 0, 1) * 100) + '%';
  $('jcRead').textContent = JC.last ? `Último lance: ${Math.round(JC.last.w)} °/s → fuerza ${Math.round(JC.last.P * 100)} %` : 'Mantén ZR, echa el brazo y suelta para probar la fuerza';
}

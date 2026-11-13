
/* ================= Sonidos de fondo =================
   Todo se sintetiza en el navegador: no hay archivos de audio ni música de nadie más.
   - Ambiente: gente hablando (voces sintetizadas sílaba por sílaba), risas, el «¡uyyy!» de otras canchas,
     botellas, tejos y mechas lejanas.
   - Música: carranga original en Sol (bajo, rasgueo de tiple, requinto y guacharaca), 16 compases en bucle. */
const BG = { ambGain: null, musGain: null, room: null, talkers: [], next: 0, step: 0, ev: {}, timer: 0 };
const BPM = 118, EIGHTH = 60 / BPM / 2;
const N = { G2: 98, A2: 110, C2: 65.41, D2: 73.42, E2: 82.41, G3: 196, B3: 246.9, D3: 146.8, 'F#3': 185, A3: 220, C3: 130.8, E3: 164.8,
  D4: 293.7, G4: 392, A4: 440, B4: 493.9, C5: 523.3, D5: 587.3, E5: 659.3, 'F#5': 740, G5: 784, 'F#4': 370, C4: 261.6 };
const CHORD = { G: ['G3', 'B3', 'D4', 'G4'], D: ['D3', 'F#3', 'A3', 'D4'], C: ['C3', 'E3', 'G3', 'C4'] };
const BASS = { G: ['G2', 'D2'], D: ['D2', 'A2'], C: ['C2', 'G2'] };
const PROG = ['G', 'G', 'D', 'D', 'D', 'D', 'G', 'G', 'C', 'C', 'G', 'G', 'D', 'D', 'G', 'G'];
const MELODY = [
  'B4 D5 G5 D5', 'B4 . A4 G4', 'A4 D5 F#5 D5', 'C5 . B4 A4', 'A4 F#4 A4 D5', 'F#5 E5 D5 C5', 'B4 D5 B4 G4', 'G4 . . .',
  'E5 G5 E5 C5', 'E5 . D5 C5', 'B4 D5 G5 D5', 'B4 . A4 B4', 'A4 C5 D5 F#5', 'E5 D5 C5 A4', 'G4 B4 D5 B4', 'G4 . . .'
].map(b => b.split(' '));

function bgEnsure() {
  if (!A.ctx || BG.ambGain) return;
  const c = A.ctx;
  BG.ambGain = c.createGain(); BG.ambGain.gain.value = 0; BG.ambGain.connect(A.out);
  BG.musGain = c.createGain(); BG.musGain.gain.value = 0; BG.musGain.connect(A.out);
  BG.room = makeRoom(BG.ambGain);
  BG.talkers = Array.from({ length: 6 }, (_, i) => newTalker(i));
  BG.timer = setInterval(bgTick, 100);
}
function bgApply() {
  if (!A.ctx) return;
  bgEnsure();
  const t = A.ctx.currentTime;
  BG.ambGain.gain.setTargetAtTime(settings.amb ? .5 : 0, t, .5);
  BG.musGain.gain.setTargetAtTime(settings.music ? .3 : 0, t, .5);
  document.querySelectorAll('[data-bg]').forEach(b => b.setAttribute('aria-checked', String(!!settings[b.dataset.bg])));
}
const rnd = (a, b) => a + Math.random() * (b - a);
function every(key, a, b, fn) { const now = A.ctx.currentTime; if (!BG.ev[key]) BG.ev[key] = now + rnd(a, b); if (now >= BG.ev[key]) { BG.ev[key] = now + rnd(a, b); fn(); } }
function bgTick() {
  const c = A.ctx; if (!c || c.state !== 'running' || A.muted) return;
  const now = c.currentTime, amb = { dest: BG.ambGain };
  if (settings.amb) {
    talkersSchedule(now + .4);
    every('laugh', 9, 22, () => laugh());
    every('uy', 20, 45, () => uyy());
    every('clink', 5, 13, () => { const f = rnd(2500, 3400); A.tone(f, .22, { gain: .05, ...amb }); A.tone(f * 1.34, .18, { gain: .035, delay: rnd(.05, .12), ...amb }); });
    every('tejo', 4, 10, () => { A.tone(rnd(80, 100), .22, { f1: 45, gain: .09, ...amb }); A.nz(.12, { f0: 600, f1: 150, gain: .06, ...amb }); });
    every('boom', 14, 30, () => { A.nz(1.1, { f0: 900, f1: 70, gain: .16, attack: .008, ...amb }); for (let i = 0; i < 5; i++) A.nz(.04, { type: 'highpass', f0: 2200, gain: .05, delay: rnd(.05, .4), ...amb }); });
  }
  if (settings.music) {
    if (BG.next < now) BG.next = now + .08;
    while (BG.next < now + .35) { musicStep(BG.step, BG.next); BG.next += EIGHTH; BG.step = (BG.step + 1) % (PROG.length * 4); }
  } else BG.next = 0;
}
function pluck(freq, t, dur, gain, bright, dest) {
  const c = A.ctx, o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
  o.type = 'sawtooth'; o2.type = 'triangle'; o.frequency.value = freq; o2.frequency.value = freq * 2.003;
  f.type = 'lowpass'; f.Q.value = 1.5; f.frequency.setValueAtTime(bright, t); f.frequency.exponentialRampToValueAtTime(Math.max(150, freq * 1.3), t + dur * .7);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(f); o2.connect(f); f.connect(g); g.connect(dest); o.start(t); o2.start(t); o.stop(t + dur + .05); o2.stop(t + dur + .05);
}
function musicStep(step, t) {
  const bar = Math.floor(step / 4), b = step % 4, ch = PROG[bar], d = BG.musGain;
  // bajo: tónica y quinta
  if (b === 0) pluck(N[BASS[ch][0]], t, .4, .3, 700, d);
  if (b === 2) pluck(N[BASS[ch][1]], t, .35, .24, 700, d);
  // tiple: rasgueo en los contratiempos (el golpe carranguero), suave en el tiempo
  if (b === 1 || b === 3) CHORD[ch].forEach((n, i) => pluck(N[n] * 2, t + i * .012, .26, .055, 2600, d));
  if (b === 0 || b === 2) CHORD[ch].forEach((n, i) => pluck(N[n] * 2, t + i * .01, .14, .022, 1800, d));
  // requinto: la melodía
  const m = MELODY[bar][b]; if (m !== '.') pluck(N[m], t, .32, .12, 3800, d);
  // guacharaca: raspado en cada corchea, más largo en el contratiempo
  A.nz(b % 2 ? .11 : .045, { type: 'bandpass', f0: b % 2 ? 2600 : 4200, f1: b % 2 ? 5200 : 4600, q: 1.2, gain: b % 2 ? .07 : .04, attack: .004, at: t, dest: d });
}
// arranca con el primer toque (el navegador no deja sonar antes) y se calla con la app en segundo plano
const baseInit = A.init.bind(A);
A.init = function () { baseInit(); try { bgApply(); } catch (e) { } };
document.addEventListener('visibilitychange', () => { try { if (!A.ctx) return; if (document.hidden) A.ctx.suspend(); else if (!A.muted) A.ctx.resume(); } catch (e) { } });
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-bg]'); if (!b) return;
  settings[b.dataset.bg] = !settings[b.dataset.bg]; saveSettings(); A.init(); bgApply();
});

/* ---------- Gente hablando ----------
   Cada «persona» dice frases de sílabas: una voz (diente de sierra con su tono) pasa por dos filtros
   que forman una vocal, con un golpe de consonante de vez en cuando. Lejos, opaco y con eco de salón,
   se oye como murmullo de gente y no se entiende ninguna palabra. */
const VOWELS = [[800, 1200], [500, 1900], [320, 2300], [520, 900], [340, 800], [650, 1500]];   // a, e, i, o, u y una intermedia
function makeRoom(dest) {
  const c = A.ctx, inp = c.createGain(), lp = c.createBiquadFilter(), out = c.createGain();
  lp.type = 'lowpass'; lp.frequency.value = 2300; inp.connect(lp); lp.connect(out);
  [.061, .097, .143].forEach((dt, i) => {
    const d = c.createDelay(.5), f = c.createBiquadFilter(), fb = c.createGain();
    d.delayTime.value = dt; f.type = 'lowpass'; f.frequency.value = 1600; fb.gain.value = .34 - i * .07;
    lp.connect(d); d.connect(f); f.connect(fb); fb.connect(d); f.connect(out);
  });
  out.connect(dest); return inp;
}
function newTalker(i) { return { p: i % 2 ? rnd(180, 235) : rnd(95, 140), next: 0, left: 0, phrase: 0, vol: 1 }; }
function talkersSchedule(until) {
  const now = A.ctx.currentTime;
  BG.talkers.forEach(tk => {
    if (tk.next < now) tk.next = now + rnd(0, 1.2);
    while (tk.next < until) {
      if (tk.left <= 0) { tk.left = Math.floor(rnd(3, 14)); tk.phrase = 0; tk.vol = rnd(.45, 1); tk.next += rnd(.4, 2.4); continue; }   // pausa entre frases
      const d = rnd(.07, .2);
      syllable(tk, tk.next, d);
      tk.left--; tk.phrase++;
      tk.next += d + rnd(.015, .09);
    }
  });
}
function syllable(tk, t, d, o = {}) {
  const c = A.ctx, [f1, f2] = o.vowel || VOWELS[Math.floor(Math.random() * VOWELS.length)];
  const decl = 1 - Math.min(.18, (tk.phrase || 0) * .015);           // la voz baja al final de la frase
  const p0 = tk.p * decl * (o.pitch || 1) * rnd(.94, 1.1), p1 = p0 * (o.rise || rnd(.88, 1.06));
  const osc = c.createOscillator(); osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(p0, t); osc.frequency.linearRampToValueAtTime(p1, t + d);
  const b1 = c.createBiquadFilter(), b2 = c.createBiquadFilter(), g = c.createGain(), g2 = c.createGain();
  b1.type = b2.type = 'bandpass'; b1.frequency.value = f1 * rnd(.9, 1.1); b2.frequency.value = f2 * rnd(.9, 1.1); b1.Q.value = 6; b2.Q.value = 8; g2.gain.value = .5;
  const a = .32 * (tk.vol || 1) * (o.gain || 1);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(a, t + Math.min(.03, d * .3));
  g.gain.setValueAtTime(a, t + d * .6); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  osc.connect(b1); osc.connect(b2); b1.connect(g); b2.connect(g2); g2.connect(g); g.connect(BG.room);
  osc.start(t); osc.stop(t + d + .03);
  if (!o.vowel && Math.random() < .35) A.nz(rnd(.025, .05), { type: 'highpass', f0: rnd(3000, 5000), gain: a * .12, attack: .003, at: Math.max(0, t - .02), dest: BG.room });
}
/* alguien se ríe: «ja ja ja» que va bajando */
function laugh(t0) {
  const tk = BG.talkers[Math.floor(Math.random() * BG.talkers.length)], n = Math.floor(rnd(4, 7));
  t0 = t0 === undefined ? A.ctx.currentTime + .05 : t0;
  for (let k = 0; k < n; k++) {
    syllable({ ...tk, phrase: 0, vol: 1 }, t0 + k * .15, .09, { vowel: [820, 1250], pitch: 1.4 - k * .05, gain: 1.15 - k * .12, rise: .9 });
    A.nz(.06, { type: 'bandpass', f0: 1400, q: 1, gain: .012, attack: .004, at: t0 + k * .15, dest: BG.room });
  }
}
/* en otra cancha casi hacen mecha: varios dicen «¡uyyy!» a la vez */
function uyy(t0) {
  t0 = t0 === undefined ? A.ctx.currentTime + .05 : t0;
  BG.talkers.slice(0, 5).forEach((tk, i) => syllable({ ...tk, phrase: 0, vol: 1 }, t0 + rnd(0, .14), rnd(.55, .9),
    { vowel: i % 2 ? [340, 800] : [380, 2100], pitch: rnd(1.3, 1.55), rise: rnd(.7, .82), gain: 1.1 }));
}

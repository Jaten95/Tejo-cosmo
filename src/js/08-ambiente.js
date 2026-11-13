
/* ================= Sonidos de fondo =================
   Todo se sintetiza en el navegador: no hay archivos de audio ni música de nadie más.
   - Ambiente: murmullo de gente (ruido en bandas de voz que sube y baja), botellas, tejos y mechas de otras canchas.
   - Música: carranga original en Sol (bajo, rasgueo de tiple, requinto y guacharaca), 16 compases en bucle. */
const BG = { ambGain: null, musGain: null, voices: [], next: 0, step: 0, ev: {}, timer: 0 };
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
  [[300, .9], [620, 1.1], [1100, 1.3], [1900, 1.6]].forEach(([f, q], i) => {
    const s = c.createBufferSource(); s.buffer = A.noise; s.loop = true; s.playbackRate.value = .9 + i * .07;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    const g = c.createGain(); g.gain.value = .03;
    s.connect(bp); bp.connect(g); g.connect(BG.ambGain); s.start(0, Math.random() * 1.8);
    BG.voices.push(g);
  });
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
    BG.voices.forEach(g => { if (Math.random() < .35) g.gain.setTargetAtTime(rnd(.012, .07), now, rnd(.08, .35)); });
    every('clink', 5, 13, () => { const f = rnd(2500, 3400); A.tone(f, .22, { gain: .05, ...amb }); A.tone(f * 1.34, .18, { gain: .035, delay: rnd(.05, .12), ...amb }); });
    every('tejo', 4, 10, () => { A.tone(rnd(80, 100), .22, { f1: 45, gain: .09, ...amb }); A.nz(.12, { f0: 600, f1: 150, gain: .06, ...amb }); });
    every('boom', 14, 30, () => { A.nz(1.1, { f0: 900, f1: 70, gain: .16, attack: .008, ...amb }); for (let i = 0; i < 5; i++) A.nz(.04, { type: 'highpass', f0: 2200, gain: .05, delay: rnd(.05, .4), ...amb }); });
    every('cheer', 25, 50, () => A.nz(rnd(1.4, 2.2), { type: 'bandpass', f0: rnd(800, 1100), f1: rnd(900, 1300), q: .9, gain: .07, attack: .45, ...amb }));
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

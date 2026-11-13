
/* ================= Greda y tablero pintado =================
   La greda es barro anaranjado: relieve de grumos, pasadas de la pala y huecos de tejos viejos, con la luz
   ya pintada y además un mapa de relieve para el reflejo. El tablero de atrás va pintado a mano como en las
   canchas de barrio: tablas amarillas, rayos rojos, un águila en el medallón, número de cancha y el letrero del club, gastado y con barro. */

/* La fuente del club (Alfa Slab One) puede llegar tarde, sobre todo en el celular la primera vez. Las texturas
   con letras se dibujan de una vez con la letra de respaldo y se vuelven a dibujar cuando la fuente llega. */
const CLUB_FONT = '64px "Alfa Slab One"';
function clubFontReady() { try { return document.fonts.check(CLUB_FONT); } catch (e) { return true; } }
const fontWaiters = [];
function onClubFont(fn) {
  if (clubFontReady()) return;
  fontWaiters.push(fn);
  if (fontWaiters.length > 1) return;
  const run = () => { if (!fontWaiters.length || !clubFontReady()) return; fontWaiters.splice(0).forEach(f => { try { f(); } catch (e) { } }); };
  try { document.fonts.load(CLUB_FONT).then(run, () => { }); document.fonts.addEventListener('loadingdone', run); } catch (e) { }
  let n = 0; const iv = setInterval(() => { run(); if (!fontWaiters.length || ++n > 90) clearInterval(iv); }, 1000);   // por si el navegador no avisa
}
function fontTex(w, h, draw) {
  const [c, g] = cnv(w, h); draw(g, w, h); const t = tex(c);
  onClubFont(() => {
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, w, h); draw(g, w, h); t.needsUpdate = true;
  });
  return t;
}

/* Ruido suave por capas: cuadrículas de valores al azar agrandadas con suavizado */
function noiseLayers(S, layers) {
  const [c, g] = cnv(S, S);
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  layers.forEach(([cells, alpha]) => {
    const [s, sg] = cnv(cells, cells), id = sg.createImageData(cells, cells);
    for (let i = 0; i < cells * cells; i++) { const v = Math.random() * 255; id.data.set([v, v, v, 255], i * 4); }
    sg.putImageData(id, 0, 0);
    g.globalAlpha = alpha; g.drawImage(s, 0, 0, S, S);
  });
  g.globalAlpha = 1; return [c, g];
}

function makeGreda() {
  const S = 1024;
  const [hc, hg] = noiseLayers(S, [[6, .55], [18, .4], [60, .3], [200, .22]]);
  // pasadas de la pala: franjas alisadas y algo más bajas
  hg.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 14; i++) {
    hg.globalAlpha = rand(.08, .18); hg.strokeStyle = Math.random() < .6 ? '#5a5a5a' : '#9a9a9a'; hg.lineWidth = rand(40, 110); hg.lineCap = 'round';
    const y = rand(0, S); hg.beginPath(); hg.moveTo(-60, y); hg.bezierCurveTo(S * .3, y + rand(-90, 90), S * .7, y + rand(-90, 90), S + 60, y + rand(-60, 60)); hg.stroke();
  }
  // grumos de barro
  for (let i = 0; i < 260; i++) {
    const x = rand(0, S), y = rand(0, S), r = rand(4, 16), gr = hg.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    hg.globalAlpha = 1; hg.fillStyle = gr; hg.beginPath(); hg.arc(x, y, r, 0, 7); hg.fill();
  }
  // huecos de tejos viejos: hundidos en el centro, con el borde levantado
  for (let i = 0; i < 14; i++) {
    const x = rand(30, S - 30), y = rand(30, S - 30), r = rand(24, 44), sx = rand(.75, 1.3), rot = rand(0, 3.14);
    hg.save(); hg.translate(x, y); hg.rotate(rot); hg.scale(sx, 1 / sx);
    const rim = hg.createRadialGradient(0, 0, r * .7, 0, 0, r * 1.3);
    rim.addColorStop(0, 'rgba(255,255,255,0)'); rim.addColorStop(.35, 'rgba(255,255,255,.3)'); rim.addColorStop(1, 'rgba(255,255,255,0)');
    hg.fillStyle = rim; hg.beginPath(); hg.arc(0, 0, r * 1.3, 0, 7); hg.fill();
    const pit = hg.createRadialGradient(rand(-5, 5), rand(-5, 5), 0, 0, 0, r * .95);
    pit.addColorStop(0, 'rgba(0,0,0,.36)'); pit.addColorStop(.7, 'rgba(0,0,0,.15)'); pit.addColorStop(1, 'rgba(0,0,0,0)');
    hg.fillStyle = pit; hg.beginPath(); hg.arc(0, 0, r, 0, 7); hg.fill(); hg.restore();
  }
  // barro embarrado con la mano: rayones curvos suaves, unos más altos y otros más bajos
  hg.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const x = rand(0, S), y = rand(0, S), a = rand(0, 6.28), L = rand(20, 70);
    hg.globalAlpha = rand(.06, .16); hg.strokeStyle = Math.random() < .55 ? '#ffffff' : '#000000'; hg.lineWidth = rand(5, 16);
    hg.beginPath(); hg.moveTo(x, y); hg.quadraticCurveTo(x + Math.cos(a) * L * .5 + rand(-12, 12), y + Math.sin(a) * L * .5 + rand(-12, 12), x + Math.cos(a) * L, y + Math.sin(a) * L); hg.stroke();
  }
  hg.globalAlpha = 1;
  // color a partir del relieve, con la luz pintada (viene de arriba a la izquierda) y granitos
  const H = hg.getImageData(0, 0, S, S).data, [cc, cg] = cnv(S, S), out = cg.createImageData(S, S), o = out.data;
  const lo = [96, 48, 26], mid = [146, 80, 46], hi = [188, 118, 74];
  const h = (x, y) => H[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const v = h(x, y), dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1);
    const shade = clamp(1 - (dx + dy) * 3.2, .55, 1.45);
    const t = clamp((v - .25) / .5, 0, 1), base = t < .5 ? lo.map((a, k) => a + (mid[k] - a) * t * 2) : mid.map((a, k) => a + (hi[k] - a) * (t - .5) * 2);
    const grain = (Math.random() - .5) * 22, i = (y * S + x) * 4;
    o[i] = clamp(base[0] * shade + grain, 0, 255); o[i + 1] = clamp(base[1] * shade + grain * .7, 0, 255); o[i + 2] = clamp(base[2] * shade + grain * .5, 0, 255); o[i + 3] = 255;
  }
  cg.putImageData(out, 0, 0);
  const map = tex(cc); const bump = tex(hc, 1, 1, false);
  return { map, bump };
}

/* Cabeza de águila de perfil (mirando a la izquierda), en coordenadas de -1 a 1 */
function drawEagle(g) {
  const navy = '#16213d', white = '#fbf8f0', tan = '#c9a77a', beak = '#f2b52c', beakDark = '#c98712';
  const head = () => {
    g.beginPath(); g.moveTo(-.34, -.44);
    g.bezierCurveTo(-.22, -.7, .2, -.8, .5, -.56);
    g.lineTo(.8, -.36); g.lineTo(.6, -.26); g.lineTo(.86, -.08); g.lineTo(.63, -.02); g.lineTo(.84, .22); g.lineTo(.6, .24);
    g.lineTo(.68, .6); g.lineTo(.44, .4); g.lineTo(.42, .84); g.lineTo(.22, .5); g.lineTo(.1, .9); g.lineTo(-.02, .52);
    g.lineTo(-.2, .8); g.lineTo(-.22, .46); g.lineTo(-.44, .64); g.lineTo(-.34, .28);
    g.quadraticCurveTo(-.42, .12, -.3, -.04); g.closePath();
  };
  // cabeza blanca con plumas tostadas por detrás
  head(); g.fillStyle = white; g.fill();
  g.save(); head(); g.clip(); g.fillStyle = tan;
  [[.18, -.66, .78, -.34, .52, -.3], [.3, -.38, .86, -.06, .56, -.04], [.36, -.06, .84, .24, .52, .22], [.3, .2, .66, .6, .4, .44], [.12, .3, .4, .84, .22, .52]]
    .forEach(([x0, y0, x1, y1, x2, y2]) => { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + .06, (y0 + y1) / 2 - .06, x1, y1); g.lineTo(x2, y2); g.quadraticCurveTo((x0 + x2) / 2, (y0 + y2) / 2, x0, y0); g.fill(); });
  g.fillStyle = 'rgba(22,33,61,.18)'; g.beginPath(); g.moveTo(-.36, .02); g.quadraticCurveTo(-.1, .1, .1, .02); g.lineTo(.0, .3); g.quadraticCurveTo(-.2, .22, -.36, .26); g.fill();
  g.restore();
  head(); g.lineJoin = 'miter'; g.miterLimit = 6; g.lineWidth = .07; g.strokeStyle = navy; g.stroke();
  // pico ganchudo
  g.beginPath(); g.moveTo(-.3, -.46);
  g.bezierCurveTo(-.62, -.52, -.9, -.32, -.86, .04); g.quadraticCurveTo(-.85, .16, -.78, .26);
  g.quadraticCurveTo(-.72, .06, -.56, .0); g.lineTo(-.16, -.06); g.quadraticCurveTo(-.26, -.24, -.3, -.46); g.closePath();
  g.fillStyle = beak; g.fill(); g.lineWidth = .06; g.lineJoin = 'round'; g.stroke();
  g.beginPath(); g.moveTo(-.56, .0); g.quadraticCurveTo(-.42, .14, -.18, .04); g.lineTo(-.16, -.06); g.closePath();
  g.fillStyle = beakDark; g.fill(); g.lineWidth = .045; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.moveTo(-.36, -.38); g.quadraticCurveTo(-.66, -.4, -.76, -.14); g.quadraticCurveTo(-.6, -.32, -.36, -.32); g.fill();
  // ojo con ceja brava
  g.fillStyle = beak; g.beginPath(); g.arc(-.08, -.3, .11, 0, 7); g.fill(); g.lineWidth = .04; g.strokeStyle = navy; g.stroke();
  g.fillStyle = navy; g.beginPath(); g.arc(-.07, -.3, .06, 0, 7); g.fill();
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-.05, -.33, .022, 0, 7); g.fill();
  g.fillStyle = navy; g.beginPath(); g.moveTo(-.34, -.44); g.quadraticCurveTo(-.08, -.52, .22, -.36); g.quadraticCurveTo(-.04, -.4, -.26, -.36); g.closePath(); g.fill();
}

function makeBackboard() { return fontTex(1024, 776, drawBackboard); }
function drawBackboard(g, Wd, Hd) {
  const cx = Wd / 2, cy = Hd * .27;
  // tablas amarillas
  const planks = 8, ph = Hd / planks;
  for (let k = 0; k < planks; k++) {
    g.fillStyle = `hsl(${rand(43, 47)}, ${rand(78, 86)}%, ${rand(50, 55)}%)`; g.fillRect(0, k * ph, Wd, ph);
    g.globalAlpha = .08; for (let j = 0; j < 30; j++) { g.strokeStyle = Math.random() < .5 ? '#5a3b10' : '#fff3c0'; g.lineWidth = rand(.6, 2); const y = k * ph + rand(2, ph - 2); g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(Wd * .3, y + rand(-3, 3), Wd * .7, y + rand(-3, 3), Wd, y + rand(-2, 2)); g.stroke(); }
    g.globalAlpha = 1;
  }
  // rayos rojos que salen del centro
  g.save(); g.translate(cx, cy);
  for (let i = 0; i < 14; i++) {
    if (i % 2) continue;
    const a0 = i / 14 * Math.PI * 2 - Math.PI / 2 + .1, a1 = a0 + Math.PI * 2 / 14;
    g.fillStyle = '#d8432a'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, Wd, a0, a1); g.closePath(); g.fill();
  }
  g.restore();
  // suelo naranja abajo, como un atardecer
  const sun = g.createLinearGradient(0, Hd * .5, 0, Hd); sun.addColorStop(0, 'rgba(232,140,40,0)'); sun.addColorStop(.25, 'rgba(232,140,40,.9)'); sun.addColorStop(1, 'rgba(214,110,36,.95)');
  g.fillStyle = sun; g.fillRect(0, Hd * .5, Wd, Hd * .5);
  g.fillStyle = '#e9b520'; g.beginPath(); g.ellipse(cx, Hd * .64, Wd * .55, Hd * .07, 0, Math.PI, 0); g.fill();
  // medallón con el águila
  g.fillStyle = '#2b5fae'; g.beginPath(); g.arc(cx, cy, 96, 0, 7); g.fill();
  g.lineWidth = 14; g.strokeStyle = '#c4361f'; g.stroke();
  g.lineWidth = 4; g.strokeStyle = '#f2e6c8'; g.beginPath(); g.arc(cx, cy, 86, 0, 7); g.stroke();
  g.save(); g.beginPath(); g.arc(cx, cy, 84, 0, 7); g.clip(); g.translate(cx + 4, cy + 2); g.scale(84, 84); drawEagle(g); g.restore();
  // letrero del club en una banda azul curva
  g.save();
  g.beginPath(); g.moveTo(Wd * .16, cy + 136); g.quadraticCurveTo(cx, cy + 84, Wd * .84, cy + 136); g.lineTo(Wd * .84, cy + 256); g.quadraticCurveTo(cx, cy + 204, Wd * .16, cy + 256); g.closePath();
  g.fillStyle = '#2b5fae'; g.fill(); g.lineWidth = 8; g.strokeStyle = '#f2e6c8'; g.stroke(); g.restore();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '400 38px "Alfa Slab One", Georgia, serif'; g.lineJoin = 'round'; g.lineWidth = 7; g.strokeStyle = '#16110c';
  g.strokeText('CLUB DE TEJO', cx, cy + 134); g.fillStyle = '#ffd23a'; g.fillText('CLUB DE TEJO', cx, cy + 134);
  g.font = '400 66px "Alfa Slab One", Georgia, serif'; g.fillStyle = '#16110c'; g.fillText('EL COSMO', cx + 4, cy + 196); g.fillStyle = '#ffffff'; g.fillText('EL COSMO', cx, cy + 192);
  // número de cancha arriba
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(Wd * .86, 64, 42, 0, 7); g.fill(); g.lineWidth = 9; g.strokeStyle = '#c4361f'; g.stroke();
  g.font = '400 56px "Alfa Slab One", Georgia, serif'; g.fillStyle = '#c4361f'; g.fillText('3', Wd * .86, 68);
  // juntas entre tablas
  for (let k = 1; k < planks; k++) { g.fillStyle = 'rgba(70,40,10,.55)'; g.fillRect(0, k * ph - 2, Wd, 3); g.fillStyle = 'rgba(255,240,190,.25)'; g.fillRect(0, k * ph + 1, Wd, 1); }
  // pintura saltada (se ve la madera)
  for (let i = 0; i < 160; i++) { g.fillStyle = Math.random() < .7 ? '#9a7448' : '#6f5233'; g.globalAlpha = rand(.5, .95); g.beginPath(); g.ellipse(rand(0, Wd), rand(0, Hd), rand(2, 16), rand(1, 6), rand(0, 3), 0, 7); g.fill(); }
  // barro de la greda salpicado, más abajo y al centro, y golpes de tejo
  for (let i = 0; i < 520; i++) {
    const y = Hd - Math.abs(gauss()) * Hd * .28, x = cx + gauss() * Wd * .2;
    g.globalAlpha = rand(.35, .85); g.fillStyle = Math.random() < .5 ? '#a45a31' : '#7e4223';
    g.beginPath(); g.ellipse(x, y, rand(1.5, 7), rand(1, 5), rand(0, 3), 0, 7); g.fill();
  }
  for (let i = 0; i < 22; i++) { const x = cx + gauss() * Wd * .16, y = Hd * .55 + Math.random() * Hd * .42; g.globalAlpha = .7; g.fillStyle = '#4b2a14'; g.beginPath(); g.ellipse(x, y, rand(6, 11), rand(4, 8), rand(0, 3), 0, 7); g.fill(); }
  // tierra acumulada abajo
  g.globalAlpha = 1; const dust = g.createLinearGradient(0, Hd * .82, 0, Hd); dust.addColorStop(0, 'rgba(150,80,40,0)'); dust.addColorStop(1, 'rgba(150,80,40,.75)');
  g.fillStyle = dust; g.fillRect(0, Hd * .82, Wd, Hd * .18);
  // desgaste general
  g.globalAlpha = .1; for (let i = 0; i < 4000; i++) { g.fillStyle = Math.random() < .5 ? '#000' : '#fff'; g.fillRect(rand(0, Wd), rand(0, Hd), rand(1, 3), rand(1, 2)); }
  g.globalAlpha = 1;
}

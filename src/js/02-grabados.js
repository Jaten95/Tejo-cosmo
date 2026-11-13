
/* ================= Diseños grabados en el tejo ================= */
const DESIGNS = [
  { id: 'sol', n: 'Sol muisca' }, { id: 'rana', n: 'Rana muisca' }, { id: 'espiral', n: 'Espiral muisca' }, { id: 'poporo', n: 'Poporo' },
  { id: 'condor', n: 'Cóndor' }, { id: 'colibri', n: 'Colibrí' }, { id: 'orquidea', n: 'Orquídea' }, { id: 'cafe', n: 'Café' },
  { id: 'palma', n: 'Palma de cera' }, { id: 'sombrero', n: 'Vueltiao' }, { id: 'mecha', n: 'Mecha' }, { id: 'bocin', n: 'Bocín' },
  { id: 'nueve', n: 'Moñona 9' }, { id: 'orgullo', n: 'Orgullo', color: true }, { id: 'ini', n: 'Iniciales' }
];
const DESIGN_IDS = DESIGNS.map(d => d.id);
const designName = id => (DESIGNS.find(d => d.id === id) || { n: 'Sin diseño' }).n;
function initials(name) {
  const w = String(name || '').trim().split(/\s+/).filter(Boolean);
  const s = w.length > 1 ? w[0][0] + w[1][0] : (w[0] || '?').slice(0, 2);
  return s.toUpperCase();
}
function freeDesign(prefer, taken) { return prefer.concat(DESIGN_IDS).find(id => !taken.includes(id)) || null; }

/* Cada diseño se dibuja en blanco sobre un círculo de radio 1 (y hacia abajo) */
const DRAW = {
  sol(g) {
    g.lineWidth = .1; g.beginPath(); g.arc(0, 0, .4, 0, 7); g.stroke();
    g.beginPath(); g.arc(0, 0, .14, 0, 7); g.fill();
    for (let i = 0; i < 16; i++) {
      g.save(); g.rotate(i * Math.PI / 8); g.beginPath();
      const L = i % 2 ? .78 : .97; g.moveTo(-.07, -.5); g.lineTo(0, -L); g.lineTo(.07, -.5); g.closePath(); g.fill(); g.restore();
    }
  },
  rana(g) {
    g.beginPath(); g.ellipse(0, .08, .3, .4, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(0, -.42, .23, .18, 0, 0, 7); g.fill();
    g.lineWidth = .12; g.lineCap = 'round'; g.lineJoin = 'round';
    [-1, 1].forEach(s => {
      g.beginPath(); g.moveTo(.2 * s, -.12); g.lineTo(.55 * s, -.3); g.lineTo(.58 * s, -.62); g.stroke();
      g.beginPath(); g.moveTo(.22 * s, .32); g.lineTo(.62 * s, .42); g.lineTo(.42 * s, .82); g.stroke();
      [[.58, -.7], [.36, .88]].forEach(([x, y]) => { g.beginPath(); g.arc(x * s, y, .09, 0, 7); g.fill(); });
    });
    g.globalCompositeOperation = 'destination-out';
    [-1, 1].forEach(s => { g.beginPath(); g.arc(.1 * s, -.47, .05, 0, 7); g.fill(); });
    g.lineWidth = .05; g.beginPath(); g.moveTo(0, -.15); g.lineTo(0, .35); g.stroke();
    g.globalCompositeOperation = 'source-over';
  },
  espiral(g) {
    g.lineWidth = .1; g.lineCap = 'round'; g.beginPath();
    for (let t = 0; t <= 15.4; t += .04) { const r = .04 + t * .056; const x = Math.cos(t) * r, y = Math.sin(t) * r; t ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  },
  poporo(g) {
    g.beginPath(); g.ellipse(0, .32, .5, .45, 0, 0, 7); g.fill();
    g.fillRect(-.09, -.6, .18, .6);
    g.beginPath(); g.ellipse(0, -.66, .2, .07, 0, 0, 7); g.fill();
    [[-.22, -.12], [.22, -.12], [-.16, -.32], [.16, -.32]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, .085, 0, 7); g.fill(); });
    g.globalCompositeOperation = 'destination-out'; g.lineWidth = .05;
    [.18, .42].forEach(y => { g.beginPath(); g.ellipse(0, y, .44, .08, 0, 0, Math.PI); g.stroke(); });
    g.globalCompositeOperation = 'source-over';
  },
  condor(g) {
    const R = [[.12, -.2], [.45, -.34], [.76, -.36], [.97, -.28], [.86, -.2], [.96, -.11], [.84, -.07], [.9, .02], [.74, .02], [.58, .1], [.34, .14], [.14, .2]];
    g.beginPath(); g.moveTo(0, -.2); R.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(.1, .5); g.lineTo(-.1, .5);
    R.slice().reverse().forEach(([x, y]) => g.lineTo(-x, y)); g.closePath(); g.fill();
    g.beginPath(); g.arc(0, -.36, .1, 0, 7); g.fill();
    g.beginPath(); g.moveTo(-.04, -.3); g.lineTo(0, -.18); g.lineTo(.04, -.3); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.lineWidth = .045;
    g.beginPath(); g.arc(0, -.22, .13, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    [-1, 1].forEach(s => { for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo((.3 + k * .17) * s, -.2 + k * .02); g.lineTo((.38 + k * .17) * s, .02 + k * .01); g.stroke(); } });
    g.globalCompositeOperation = 'source-over';
  },
  colibri(g) {
    g.beginPath(); g.ellipse(.06, .1, .38, .17, -.5, 0, 7); g.fill();
    g.beginPath(); g.arc(-.28, -.12, .14, 0, 7); g.fill();
    g.lineWidth = .055; g.lineCap = 'round'; g.beginPath(); g.moveTo(-.38, -.16); g.lineTo(-.95, -.36); g.stroke();
    g.beginPath(); g.ellipse(.14, -.3, .46, .13, -1.05, 0, 7); g.fill();
    g.beginPath(); g.moveTo(.3, .28); g.lineTo(.62, .66); g.lineTo(.46, .3); g.lineTo(.72, .46); g.lineTo(.38, .2); g.closePath(); g.fill();
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.arc(-.31, -.15, .035, 0, 7); g.fill();
    g.lineWidth = .035; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(.0 + k * .1, -.18 - k * .08); g.lineTo(.22 + k * .1, -.52 - k * .06); g.stroke(); }
    g.globalCompositeOperation = 'source-over';
  },
  orquidea(g) {
    [-90, -18, 54, 126, 198].forEach(d => { const a = d * Math.PI / 180; g.beginPath(); g.ellipse(Math.cos(a) * .44, Math.sin(a) * .44, .34, .15, a, 0, 7); g.fill(); });
    g.beginPath(); g.ellipse(0, .36, .24, .3, 0, 0, 7); g.fill();
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.arc(0, 0, .1, 0, 7); g.fill();
    g.lineWidth = .035; [-90, -18, 54, 126, 198].forEach(d => { const a = d * Math.PI / 180; g.beginPath(); g.moveTo(Math.cos(a) * .2, Math.sin(a) * .2); g.lineTo(Math.cos(a) * .7, Math.sin(a) * .7); g.stroke(); });
    g.beginPath(); g.moveTo(0, .16); g.lineTo(0, .58); g.stroke();
    g.globalCompositeOperation = 'source-over';
  },
  cafe(g) {
    [[-.27, .02, -.45], [.27, -.02, .45]].forEach(([x, y, r]) => { g.beginPath(); g.ellipse(x, y, .3, .5, r, 0, 7); g.fill(); });
    g.globalCompositeOperation = 'destination-out'; g.lineWidth = .07; g.lineCap = 'round';
    [[-.27, .02, -.45], [.27, -.02, .45]].forEach(([x, y, r]) => {
      g.save(); g.translate(x, y); g.rotate(r); g.beginPath(); g.moveTo(0, -.4); g.bezierCurveTo(.14, -.12, -.14, .12, 0, .4); g.stroke(); g.restore();
    });
    g.globalCompositeOperation = 'source-over';
  },
  palma(g) {
    g.beginPath(); g.moveTo(-.05, -.3); g.lineTo(.05, -.3); g.lineTo(.08, .9); g.lineTo(-.08, .9); g.closePath(); g.fill();
    g.lineWidth = .075; g.lineCap = 'round';
    [[-.85, -.05], [-.7, -.55], [-.3, -.82], [.3, -.82], [.7, -.55], [.85, -.05], [0, -.88]].forEach(([x, y]) => {
      g.beginPath(); g.moveTo(0, -.32); g.quadraticCurveTo(x * .45, y < -.7 ? -.95 : -.75, x, y); g.stroke();
    });
    g.globalCompositeOperation = 'destination-out'; g.lineWidth = .025;
    for (let y = -.1; y < .85; y += .16) { g.beginPath(); g.moveTo(-.1, y); g.lineTo(.1, y); g.stroke(); }
    g.globalCompositeOperation = 'source-over';
  },
  sombrero(g) {
    g.beginPath(); g.ellipse(0, .34, .96, .3, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(-.42, .32); g.lineTo(-.32, -.48); g.quadraticCurveTo(0, -.62, .32, -.48); g.lineTo(.42, .32); g.closePath(); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.lineWidth = .045;
    [-.3, -.02, .2].forEach((y, k) => { g.beginPath(); const w = .36 + k * .03; for (let x = -w; x <= w + .001; x += .09) { const yy = y + ((Math.round((x + w) / .09) % 2) ? .06 : -.03); x === -w ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke(); });
    g.beginPath(); g.ellipse(0, .36, .72, .18, 0, .2, Math.PI - .2); g.stroke();
    g.globalCompositeOperation = 'source-over';
  },
  mecha(g) {
    g.beginPath(); g.moveTo(0, -.08); g.lineTo(-.44, .72); g.lineTo(.44, .72); g.closePath(); g.fill();
    g.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 - Math.PI / 2, r = i % 2 ? .16 : .42; g.lineTo(Math.cos(a) * r, -.5 + Math.sin(a) * r); } g.closePath(); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.lineWidth = .05;
    g.beginPath(); g.moveTo(-.22, .55); g.lineTo(.22, .55); g.stroke();
    g.globalCompositeOperation = 'source-over';
  },
  bocin(g) {
    g.lineWidth = .15; g.beginPath(); g.arc(0, 0, .66, 0, 7); g.stroke();
    g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? .17 : .42; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
  },
  nueve(g) { textAt(g, '9', 1.55); },
  ini(g, name) { const t = initials(name); textAt(g, t, t.length > 1 ? 1.05 : 1.45); },
  none(g) { textAt(g, '?', 1.2); },
  /* Bandera del orgullo ondeando, sin asta: seis franjas con esmalte de color dentro del grabado */
  orgullo(g, name, colored) {
    const C = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#004dff', '#750787'];
    const x0 = -.82, x1 = .82, top = -.5, h = 1 / 6, wave = x => .07 * Math.sin((x - x0) * 4.2);
    for (let k = 0; k < 6; k++) {
      if (colored) g.fillStyle = C[k];
      g.beginPath();
      for (let x = x0; x <= x1 + .001; x += .04) g.lineTo(x, top + k * h + wave(x) - .003);
      for (let x = x1; x >= x0 - .001; x -= .04) g.lineTo(x, top + (k + 1) * h + wave(x) + .003);
      g.closePath(); g.fill();
    }
  }
};
function textAt(g, t, size) {
  const R = g.__R, S = g.canvas.width;
  g.save(); g.setTransform(1, 0, 0, 1, S / 2, S / 2);
  g.font = `400 ${Math.round(size * R)}px "Alfa Slab One", Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(t, 0, .06 * R); g.restore();
}

/* Máscara del diseño (blanco = grabado) */
function designMask(id, name, S, colored) {
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.translate(S / 2, S / 2); const R = S * .34; g.scale(R, R); g.__R = R;
  g.fillStyle = '#fff'; g.strokeStyle = '#fff';
  (DRAW[id] || DRAW.none)(g, name, colored);
  return c;
}
/* Cara del tejo: acero cepillado, aro con el color del jugador y el diseño grabado (borde de sombra y de luz) */
function engraveCanvas(id, color, name, S) {
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), h = S / 2;
  const gr = g.createRadialGradient(h * .8, h * .7, S * .05, h, h, h); gr.addColorStop(0, '#b3b8bc'); gr.addColorStop(1, '#7b8085');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  g.globalAlpha = .12; for (let r = 4; r < h; r += 3) { g.strokeStyle = r % 2 ? '#fff' : '#3b3f43'; g.lineWidth = 1; g.beginPath(); g.arc(h, h, r, 0, 7); g.stroke(); }
  g.globalAlpha = 1;
  g.lineWidth = S * .1; g.strokeStyle = color; g.beginPath(); g.arc(h, h, h * .86, 0, 7); g.stroke();
  g.lineWidth = S * .012; g.strokeStyle = 'rgba(20,16,12,.65)'; g.beginPath(); g.arc(h, h, h * .76, 0, 7); g.stroke();
  const m = designMask(id, name, S), off = Math.max(1, S / 110);
  const layer = (fill, dx, dy) => {   // máscara menos máscara corrida = borde de un lado
    const l = document.createElement('canvas'); l.width = l.height = S; const lg = l.getContext('2d');
    lg.drawImage(m, 0, 0); lg.globalCompositeOperation = 'source-in'; lg.fillStyle = fill; lg.fillRect(0, 0, S, S);
    if (dx || dy) { lg.globalCompositeOperation = 'destination-out'; lg.drawImage(m, dx, dy); }
    return l;
  };
  const d = DESIGNS.find(x => x.id === id);
  g.drawImage(d && d.color ? designMask(id, name, S, true) : layer('#34373b', 0, 0), 0, 0);   // fondo del grabado (o esmalte de color)
  g.drawImage(layer('rgba(10,10,12,.85)', off, off), 0, 0);   // sombra arriba-izquierda
  g.drawImage(layer('rgba(235,238,240,.9)', -off, -off), 0, 0); // brillo abajo-derecha
  return c;
}
function bumpCanvas(id, name, S) {
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
  const m = designMask(id, name, S), l = document.createElement('canvas'); l.width = l.height = S; const lg = l.getContext('2d');
  lg.drawImage(m, 0, 0); lg.globalCompositeOperation = 'source-in'; lg.fillStyle = '#000'; lg.fillRect(0, 0, S, S);
  g.drawImage(l, 0, 0); return c;
}
const topMatCache = {};
function tejoTopMaterial(color, id, name) {
  const key = [color, id || 'none', id === 'ini' ? initials(name) : ''].join('|');
  if (topMatCache[key]) return topMatCache[key];
  const map = new THREE.CanvasTexture(engraveCanvas(id, color, name, 256)); map.encoding = THREE.sRGBEncoding; map.anisotropy = 4;
  const bump = new THREE.CanvasTexture(bumpCanvas(id, name, 256));
  return (topMatCache[key] = new THREE.MeshStandardMaterial({ color: '#b4b4b4', map, bumpMap: bump, bumpScale: .006, metalness: .6, roughness: .45 }));
}
const iconCache = {};
function designIcon(id, color, name) {
  const key = [color, id || 'none', id === 'ini' ? initials(name) : ''].join('|');
  if (iconCache[key]) return iconCache[key];
  const S = 96, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 1, 0, 7); g.clip();
  g.drawImage(engraveCanvas(id, color, name, S), 0, 0);
  return (iconCache[key] = c.toDataURL());
}

/* ---------- selector de diseño ---------- */
let pickerCb = null;
function openPicker({ title, current, taken, color, name, onPick }) {
  const box = $('pickGrid'); box.innerHTML = '';
  $('pickTitle').textContent = title || 'Escoge tu grabado';
  DESIGNS.forEach(d => {
    const b = document.createElement('button'); b.className = 'pk'; b.type = 'button';
    const busy = taken.includes(d.id) && d.id !== current;
    b.disabled = busy; if (d.id === current) b.setAttribute('aria-pressed', 'true');
    const img = document.createElement('img'); img.src = designIcon(d.id, color, name); img.alt = '';
    const s = document.createElement('span'); s.textContent = busy ? 'Ocupado' : d.n;
    b.append(img, s);
    b.addEventListener('click', () => { closePicker(); A.tick(); onPick(d.id); });
    box.appendChild(b);
  });
  pickerCb = onPick; $('picker').hidden = false;
}
function closePicker() { $('picker').hidden = true; pickerCb = null; }

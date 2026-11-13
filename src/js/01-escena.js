'use strict';
/* ================= Constantes del mundo (metros) ================= */
const G = 9.81;
const S2 = Math.SQRT1_2;
const CY = 0.62;            // altura del centro de la cara de greda
const HU = 0.45, HV = 0.5;  // medias dimensiones de la greda (ancho / a lo largo de la pendiente)
const FW = 0.10;            // ancho del marco
const RB = 0.075;           // radio del bocín (aro)
const R_EMB = 0.056;        // centro del tejo dentro de este radio = embocinada
const RT = 0.045, TT = 0.03;// radio y grosor del tejo
const MECHA_R = 0.079;      // distancia de cada mecha al centro
const MECHA_HIT = 0.045;    // distancia tejo–mecha para reventarla
const MECHA_ANG = [45, 135, 225, 315].map(a => a * Math.PI / 180);
const THETA = 0.6;          // ángulo de salida del lanzamiento (rad)
const REL = { x: 0, y: 1.0, z: -0.25 }; // punto donde se suelta el tejo
const COLORS = ['#d8392d', '#2565b3', '#2f915c', '#f3c22f'];
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const rand = (a, b) => a + Math.random() * (b - a);
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

/* Geometría de la cancha (se recalcula con la distancia) */
const W = {
  D: 18.5,
  C: V(0, CY, -18.5),
  n: V(0, S2, S2),   // normal de la greda (mira al lanzador y hacia arriba)
  s: V(0, S2, -S2),  // dirección "arriba" de la pendiente
  a: V(1, 0, 0),
  ZB: -18.5 - 0.8,   // tablero de atrás
};
function setDistance(D) {
  W.D = D; W.C.set(0, CY, -D); W.ZB = -D - 0.8;
}
function toUV(p) { const d = p.clone().sub(W.C); return { u: d.dot(W.a), v: d.dot(W.s) }; }
function fromUV(u, v, lift = 0) { return W.C.clone().addScaledVector(W.a, u).addScaledVector(W.s, v).addScaledVector(W.n, lift); }

/* ================= Texturas pintadas en canvas ================= */
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, rx = 1, ry = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  if (srgb) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 4; return t;
}
function noiseFill(g, w, h, base, n, spread, alpha) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    const l = rand(-spread, spread);
    g.fillStyle = l > 0 ? `rgba(255,248,235,${alpha * l / spread})` : `rgba(20,12,4,${-alpha * l / spread})`;
    const r = rand(.6, 3.2); g.beginPath(); g.arc(rand(0, w), rand(0, h), r, 0, 7); g.fill();
  }
}
function makeClayTex() {
  const [c, g] = cnv(512, 512);
  noiseFill(g, 512, 512, '#6a6356', 9000, 1, .16);
  g.globalAlpha = .18;
  for (let i = 0; i < 26; i++) { // pasadas de la pala
    g.strokeStyle = Math.random() < .5 ? '#5d564b' : '#9a9283'; g.lineWidth = rand(8, 30);
    g.beginPath(); const y = rand(0, 512); g.moveTo(-20, y); g.bezierCurveTo(150, y + rand(-40, 40), 350, y + rand(-40, 40), 540, y + rand(-30, 30)); g.stroke();
  }
  g.globalAlpha = .35;
  for (let i = 0; i < 18; i++) { // huellas de tejos viejos
    const x = rand(30, 482), y = rand(30, 482), r = rand(14, 22);
    const gr = g.createRadialGradient(x, y, r * .3, x, y, r); gr.addColorStop(0, '#4b453c'); gr.addColorStop(.8, '#5e574c'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  g.globalAlpha = 1; return tex(c);
}
function makeFloorTex() {
  const [c, g] = cnv(512, 512);
  noiseFill(g, 512, 512, '#5e4a3a', 12000, 1, .22);
  g.globalAlpha = .12; g.fillStyle = '#2a1d12';
  for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(rand(0, 512), rand(0, 512), rand(20, 70), rand(8, 30), rand(0, 3), 0, 7); g.fill(); }
  g.globalAlpha = 1; return tex(c, 3, 8);
}
function makeWallTex() {
  const [c, g] = cnv(512, 512);
  noiseFill(g, 512, 512, '#e7dcc6', 6000, 1, .10);
  g.globalAlpha = .08; g.fillStyle = '#6d5b44';
  for (let i = 0; i < 30; i++) { g.beginPath(); g.ellipse(rand(0, 512), rand(0, 512), rand(30, 90), rand(20, 60), 0, 0, 7); g.fill(); }
  g.globalAlpha = 1; return tex(c, 6, 1);
}
function makeWoodTex(base, edge) {
  const [c, g] = cnv(256, 256);
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  g.globalAlpha = .16;
  for (let i = 0; i < 60; i++) { g.strokeStyle = Math.random() < .5 ? '#000' : '#fff'; g.lineWidth = rand(.5, 2); g.beginPath(); const y = rand(0, 256); g.moveTo(0, y); g.bezierCurveTo(80, y + rand(-6, 6), 170, y + rand(-6, 6), 256, y + rand(-4, 4)); g.stroke(); }
  g.globalAlpha = .3;
  for (let i = 0; i < 80; i++) { g.fillStyle = '#1b130b'; g.fillRect(rand(0, 256), rand(0, 256), rand(1, 4), rand(1, 2)); } // pintura saltada
  if (edge) { g.globalAlpha = 1; g.fillStyle = edge; g.fillRect(0, 0, 256, 18); g.fillRect(0, 238, 256, 18); }
  g.globalAlpha = 1; return tex(c);
}
function makeStripeTex() {
  const [c, g] = cnv(64, 64);
  g.fillStyle = '#fcd116'; g.fillRect(0, 0, 64, 32);   // bandera de Colombia
  g.fillStyle = '#003893'; g.fillRect(0, 32, 64, 16);
  g.fillStyle = '#ce1126'; g.fillRect(0, 48, 64, 16);
  return tex(c, 1, 1);
}
function signTex(lines, bg, fg, shadow, w = 1024, h = 256) {
  const [c, g] = cnv(w, h);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.globalAlpha = .12; for (let i = 0; i < 2500; i++) { g.fillStyle = Math.random() < .5 ? '#000' : '#fff'; g.fillRect(rand(0, w), rand(0, h), rand(1, 3), rand(1, 2)); }
  g.globalAlpha = 1;
  g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((ln, i) => {
    const size = ln.size; g.font = `${size}px "Alfa Slab One", Georgia, serif`;
    const y = ln.y * h;
    g.fillStyle = shadow; g.fillText(ln.t, w / 2 + size * .06, y + size * .06);
    g.fillStyle = ln.c || fg; g.fillText(ln.t, w / 2, y);
  });
  return tex(c);
}
function softTex() {
  const [c, g] = cnv(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return tex(c, 1, 1, false);
}
function craterTex() {
  const [c, g] = cnv(128, 128);
  const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64);
  gr.addColorStop(0, 'rgba(30,24,18,.95)'); gr.addColorStop(.55, 'rgba(50,42,34,.7)'); gr.addColorStop(.75, 'rgba(160,150,135,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return tex(c, 1, 1, false);
}
function scorchTex() {
  const [c, g] = cnv(128, 128);
  for (let i = 0; i < 14; i++) {
    const a = rand(0, 7), r = rand(20, 60);
    const gr = g.createRadialGradient(64, 64, 0, 64 + Math.cos(a) * r * .4, 64 + Math.sin(a) * r * .4, r);
    gr.addColorStop(0, 'rgba(15,10,6,.5)'); gr.addColorStop(1, 'rgba(15,10,6,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  return tex(c, 1, 1, false);
}

/* ================= Escena ================= */
let renderer, scene, cam, lupaCam, hall, cancha, mechaMeshes = [], reticle, reticleCore, clayMat;
const T = {}; // texturas
const mats = {};

function buildRenderer() {
  const canvas = document.getElementById('gl');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = false;
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#1a140e');
  scene.fog = new THREE.Fog('#1a140e', 26, 46);
  cam = new THREE.PerspectiveCamera(14, 1, 0.05, 90);
  lupaCam = new THREE.PerspectiveCamera(26, 1, 0.02, 20);
}

function buildTextures() {
  T.clay = makeClayTex(); T.floor = makeFloorTex(); T.wall = makeWallTex();
  T.woodGreen = makeWoodTex('#2b6b47', '#f3c22f');
  T.woodRed = makeWoodTex('#7d2a21', null);
  T.woodPlain = makeWoodTex('#5a4029', null);
  T.stripes = makeStripeTex(); T.soft = softTex(); T.crater = craterTex(); T.scorch = scorchTex();
  T.sign = signTex([
    { t: 'CLUB DE TEJO', size: 92, y: .38, c: '#f3c22f' },
    { t: 'EL COSMO', size: 70, y: .74, c: '#f5eddd' }], '#2565b3', '#f3c22f', '#16110c');
  T.fia = signTex([
    { t: 'HOY NO SE FÍA', size: 84, y: .38, c: '#d8392d' },
    { t: 'MAÑANA SÍ', size: 84, y: .74, c: '#2565b3' }], '#f2ead8', '#d8392d', 'rgba(0,0,0,.25)');
}

function std(opts) { return new THREE.MeshStandardMaterial(opts); }

function buildHall() {
  if (hall) scene.remove(hall);
  hall = new THREE.Group(); scene.add(hall);
  const D = W.D, len = D + 6, zMid = 3 - len / 2;
  T.floor.repeat.set(3, len / 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(7, len), std({ map: T.floor, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, zMid); floor.receiveShadow = true; hall.add(floor);
  // carril de tiro un poco más claro
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(2.4, D - 1.2), std({ color: '#7a6450', roughness: 1, transparent: true, opacity: .35 }));
  lane.rotation.x = -Math.PI / 2; lane.position.set(0, .002, -D / 2 + .2); lane.receiveShadow = true; hall.add(lane);
  // línea de lanzamiento
  const line = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .06), std({ color: '#f5eddd', roughness: .9 }));
  line.rotation.x = -Math.PI / 2; line.position.set(0, .004, 0); hall.add(line);
  T.wall.repeat.set(len / 3, 1);
  const wallMat = std({ map: T.wall, roughness: 1 });
  [-3.5, 3.5].forEach(x => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(len, 4.2), wallMat);
    w.position.set(x, 2.1, zMid); w.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; w.receiveShadow = true; hall.add(w);
    const band = new THREE.Mesh(new THREE.PlaneGeometry(len, .34), std({ map: T.stripes, roughness: .8 }));
    band.position.set(x * .998, 1.05, zMid); band.rotation.y = w.rotation.y; hall.add(band);
    const zocalo = new THREE.Mesh(new THREE.PlaneGeometry(len, .5), std({ color: '#2b6b47', roughness: .9 }));
    zocalo.position.set(x * .998, .25, zMid); zocalo.rotation.y = w.rotation.y; hall.add(zocalo);
  });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.2), wallMat.clone()); back.material.map = T.wall.clone(); back.material.map.repeat.set(2, 1); back.material.map.needsUpdate = true;
  back.position.set(0, 2.1, W.ZB - .9); hall.add(back);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.2), wallMat); front.position.set(0, 2.1, 3); front.rotation.y = Math.PI; hall.add(front);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(7, len), std({ color: '#21180f', roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 4.2, zMid); hall.add(ceil);
  const beamMat = std({ map: T.woodPlain, roughness: .9 });
  for (let z = 1; z > -D - 1; z -= 4.2) { const b = new THREE.Mesh(new THREE.BoxGeometry(7, .22, .2), beamMat); b.position.set(0, 4.05, z); hall.add(b); }
  // letreros
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, .85), std({ map: T.sign, roughness: .8 }));
  sign.position.set(0, 3.05, W.ZB - .88); hall.add(sign);
  const fia = new THREE.Mesh(new THREE.PlaneGeometry(1.8, .45), std({ map: T.fia, roughness: .9 }));
  fia.position.set(-3.48, 2.2, -D * .45); fia.rotation.y = Math.PI / 2; hall.add(fia);
  // bombillos colgantes
  const bulbMat = new THREE.MeshBasicMaterial({ color: '#ffd9a0' });
  [-2, -D * .5, -D + 1.2].forEach((z, i) => {
    const bx = i % 2 ? -1.35 : 1.35;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 10), bulbMat); bulb.position.set(bx, 3.55, z); hall.add(bulb);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .6), std({ color: '#111' })); cord.position.set(bx, 3.9, z); hall.add(cord);
    if (i < 2) { const pl = new THREE.PointLight('#ffc98a', i ? 1.1 : .8, 14, 1.6); pl.position.set(bx, 3.45, z); hall.add(pl); }
  });
  // canasta y butaco junto a la línea
  const crate = new THREE.Mesh(new THREE.BoxGeometry(.45, .3, .32), std({ color: '#b8352a', roughness: .7 }));
  crate.position.set(-1.9, .15, .4); crate.rotation.y = .3; crate.castShadow = true; hall.add(crate);
  const crate2 = crate.clone(); crate2.position.set(-1.85, .45, .42); crate2.rotation.y = .1; hall.add(crate2);
  const stool = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .04, 18), std({ map: T.woodPlain })); seat.position.y = .46; stool.add(seat);
  for (let k = 0; k < 3; k++) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .46), std({ color: '#3a2a1b' })); const a = k * 2.1; leg.position.set(Math.cos(a) * .12, .23, Math.sin(a) * .12); stool.add(leg); }
  stool.position.set(1.9, 0, .6); hall.add(stool);

  // luces
  const hemi = new THREE.HemisphereLight('#ffe8c8', '#3a2a1c', .55); hall.add(hemi);
  const spot = new THREE.SpotLight('#fff1d8', 1.7, 12, .62, .5, 1.2);
  spot.position.copy(W.C).add(V(.8, 3.2, 2.2)); spot.target.position.copy(W.C);
  spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0006; spot.shadow.camera.near = .5; spot.shadow.camera.far = 8;
  hall.add(spot, spot.target);
  const fill = new THREE.PointLight('#ffb070', .7, 8, 1.5); fill.position.copy(W.C).add(V(-1.2, 1.2, 2.5)); hall.add(fill);

  buildCancha();
}

function buildCancha() {
  if (cancha) hall.remove(cancha);
  cancha = new THREE.Group();
  const m = new THREE.Matrix4().makeBasis(W.a, W.s, W.n);
  cancha.quaternion.setFromRotationMatrix(m); cancha.position.copy(W.C);
  hall.add(cancha);
  clayMat = std({ map: T.clay, roughness: .96, metalness: 0, color: '#ffffff' });
  const clay = new THREE.Mesh(new THREE.PlaneGeometry(HU * 2, HV * 2, 1, 1), clayMat); clay.receiveShadow = true; cancha.add(clay);
  const frameMat = std({ map: T.woodGreen, roughness: .8 });
  const fw = FW, depth = .2;
  const parts = [
    [HU * 2 + fw * 2, fw, 0, HV + fw / 2], [HU * 2 + fw * 2, fw, 0, -HV - fw / 2],
    [fw, HV * 2, HU + fw / 2, 0], [fw, HV * 2, -HU - fw / 2, 0]];
  parts.forEach(([w, h, x, y]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), frameMat); b.position.set(x, y, -depth / 2 + .018); b.castShadow = b.receiveShadow = true; cancha.add(b); });
  const body = new THREE.Mesh(new THREE.BoxGeometry(HU * 2 + fw * 2, HV * 2 + fw * 2, .35), std({ map: T.woodRed, roughness: .9 }));
  body.position.z = -.35 / 2 - .17; body.castShadow = true; cancha.add(body);
  // bocín
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RB, .0075, 12, 56), std({ color: '#9aa0a4', metalness: .9, roughness: .32 }));
  ring.position.z = .001; ring.castShadow = true; cancha.add(ring);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(RB - .006, 40), std({ color: '#5f584d', roughness: 1 }));
  inner.position.z = -.004; cancha.add(inner);
  // soporte y tablero
  const sup = new THREE.Mesh(new THREE.BoxGeometry(HU * 2 + fw * 2, .34, .75), std({ map: T.woodRed, roughness: .9 }));
  sup.position.set(0, .17, -W.D - .4); sup.castShadow = true; hall.add(sup); cancha.userData.sup = sup;
  const board = new THREE.Mesh(new THREE.BoxGeometry(3.3, 2.5, .08), std({ map: T.woodPlain, roughness: .85, color: '#d9b08a' }));
  board.position.set(0, 1.25, W.ZB - .04); board.receiveShadow = true; hall.add(board);
  const boardBand = new THREE.Mesh(new THREE.PlaneGeometry(3.3, .22), std({ map: T.stripes, roughness: .8 }));
  boardBand.position.set(0, 2.38, W.ZB + .002); hall.add(boardBand);
  [-1.65, 1.65].forEach(x => { const sb = new THREE.Mesh(new THREE.BoxGeometry(.06, 1.7, 2.4), std({ map: T.woodPlain, roughness: .85 })); sb.position.set(x, .85, -W.D - .1); sb.castShadow = sb.receiveShadow = true; hall.add(sb); });
  buildMechas();
  buildReticle();
}

function mechaGeo() {
  const sh = new THREE.Shape(); sh.moveTo(0, .03); sh.lineTo(-.026, -.024); sh.lineTo(.026, -.024); sh.closePath();
  return new THREE.ExtrudeGeometry(sh, { depth: .006, bevelEnabled: true, bevelThickness: .003, bevelSize: .003, bevelSegments: 1 });
}
let MECHA_GEO;
function buildMechas() {
  mechaMeshes.forEach(m => m.parent && m.parent.remove(m)); mechaMeshes = [];
  MECHA_GEO = MECHA_GEO || mechaGeo();
  const mm = std({ color: '#f6eee8', roughness: .85 });
  const edge = std({ color: '#e07a8a', roughness: .85 });
  MECHA_ANG.forEach((a, i) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(MECHA_GEO, mm); body.castShadow = true; g.add(body);
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(.03, .006), edge); stripe.position.set(0, -.008, .0105); g.add(stripe);
    g.position.set(Math.cos(a) * MECHA_R, Math.sin(a) * MECHA_R, .002);
    g.rotation.z = a + Math.PI / 2; // la punta mira al centro
    g.userData = { i, alive: true, u: Math.cos(a) * MECHA_R, v: Math.sin(a) * MECHA_R };
    cancha.add(g); mechaMeshes.push(g);
  });
}
function resetMechas(animate) {
  mechaMeshes.forEach(m => { m.visible = true; m.userData.alive = true; if (animate) { m.scale.set(.01, .01, .01); m.userData.grow = 0; } });
}

function buildReticle() {
  if (reticle) scene.remove(reticle);
  reticle = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: '#f3c22f', transparent: true, opacity: .95, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(.05, .062, 40), mat); reticle.add(ring);
  const cross = new THREE.Group();
  [[.13, .008], [.008, .13]].forEach(([w, h]) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); cross.add(p); });
  reticle.add(cross);
  reticleCore = mat; reticle.renderOrder = 5; reticle.visible = false; scene.add(reticle);
}

function makeTejo(color, design, name) {
  const geo = new THREE.CylinderGeometry(RT * .92, RT, TT, 30, 1);
  const steel = std({ color: '#6f7376', metalness: .85, roughness: .42 });
  const paint = tejoTopMaterial(color, design, name);
  const m = new THREE.Mesh(geo, [steel, paint, steel]);
  m.castShadow = true; return m;
}

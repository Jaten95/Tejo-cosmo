
/* ================= Herramientas junto a la cancha =================
   Lo que hay al lado de una cancha de verdad: la pala para arreglar la greda y costales de greda a un lado;
   al otro, un balde con agua para mojarla, otro con barro y la caja de las mechas. Es decoración: el tejo no choca con esto. */

function burlapTex() {
  const [c, g] = cnv(256, 256);
  g.fillStyle = '#b39b72'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 4) {   // tejido de fique
    g.fillStyle = `rgba(80,60,30,${rand(.18, .32)})`; g.fillRect(i, 0, 1.5, 256);
    g.fillStyle = `rgba(80,60,30,${rand(.18, .32)})`; g.fillRect(0, i + 2, 256, 1.5);
  }
  g.globalAlpha = .15; for (let i = 0; i < 600; i++) { g.fillStyle = Math.random() < .5 ? '#5a4426' : '#e0cda4'; g.fillRect(rand(0, 256), rand(0, 256), rand(1, 3), rand(1, 3)); }
  g.globalAlpha = 1;
  for (let i = 0; i < 9; i++) {   // manchas de greda
    const x = rand(0, 256), y = rand(0, 256), r = rand(10, 40), gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(150,80,44,.55)'); gr.addColorStop(1, 'rgba(150,80,44,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return tex(c, 2, 2);
}

function propShadows(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }

// Pala con la hoja de hierro oxidado y barro en la punta; el origen es la punta de la hoja
function makeShovel() {
  const g = new THREE.Group(), wood = std({ color: '#6a4a2c', roughness: .85 }), iron = rustMat();
  const sh = new THREE.Shape(); sh.moveTo(-.12, .32); sh.lineTo(.12, .32); sh.lineTo(.12, .12); sh.quadraticCurveTo(.11, .03, 0, 0); sh.quadraticCurveTo(-.11, .03, -.12, .12); sh.closePath();
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .006, bevelEnabled: false }), iron); blade.position.z = -.003; g.add(blade);
  const sock = new THREE.Mesh(new THREE.CylinderGeometry(.024, .03, .13, 10), iron); sock.position.y = .385; g.add(sock);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 1.06, 10), wood); handle.position.y = .97; g.add(handle);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, .15, 8), wood); grip.rotation.z = Math.PI / 2; grip.position.y = 1.5; g.add(grip);
  const mud = std({ map: T.clay, color: '#a8a8a8', roughness: .95 });
  for (let i = 0; i < 5; i++) {   // barro embarrado en la punta
    const b = new THREE.Mesh(new THREE.SphereGeometry(rand(.025, .045), 10, 6), mud); b.scale.set(1.3, .8, .12);
    b.position.set(rand(-.06, .06), rand(.03, .1), .005); b.rotation.z = rand(0, 3); g.add(b);
  }
  return propShadows(g);
}

// Costal de fique: acostado (lleno y amarrado) o parado y abierto con greda adentro
function makeSack(open, mat) {
  const g = new THREE.Group();
  if (!open) {
    const body = new THREE.Mesh(new THREE.SphereGeometry(.2, 16, 12), mat); body.scale.set(1.45, .62, .95); body.position.y = .12; g.add(body);
    const knot = new THREE.Mesh(new THREE.ConeGeometry(.05, .12, 8), mat); knot.rotation.z = Math.PI / 2; knot.position.set(.33, .13, 0); g.add(knot);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(.035, .008, 6, 14), std({ color: '#d9c9a0', roughness: 1 })); tie.rotation.y = Math.PI / 2; tie.position.set(.28, .13, 0); g.add(tie);
  } else {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.17, .21, .46, 16, 3, true), mat); body.position.y = .23; g.add(body);
    const pos = body.geometry.attributes.position;   // un poco abombado
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i), k = 1 + .12 * Math.cos(y / .46 * Math.PI); pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k); }
    body.geometry.computeVertexNormals();
    const fold = new THREE.Mesh(new THREE.TorusGeometry(.18, .025, 8, 20), mat); fold.rotation.x = Math.PI / 2; fold.position.y = .46; g.add(fold);
    const heap = new THREE.Mesh(new THREE.SphereGeometry(.17, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), clayMat); heap.scale.y = .4; heap.position.y = .43; g.add(heap);
  }
  return propShadows(g);
}

// Balde plástico con agua o con barro
function makeBucket(color, fill) {
  const g = new THREE.Group(), plastic = std({ color, roughness: .45, side: THREE.DoubleSide });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(.15, .12, .3, 22, 1, true), plastic); wall.position.y = .15; g.add(wall);
  const base = new THREE.Mesh(new THREE.CircleGeometry(.12, 22), plastic); base.rotation.x = -Math.PI / 2; base.position.y = .004; g.add(base);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.15, .009, 6, 26), plastic); rim.rotation.x = Math.PI / 2; rim.position.y = .3; g.add(rim);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.15, .004, 4, 20, Math.PI), std({ color: '#9aa0a4', metalness: .7, roughness: .4 }));
  handle.position.y = .29; handle.rotation.x = -.9; g.add(handle);
  const top = fill === 'agua'
    ? std({ color: '#3e5862', metalness: .2, roughness: .08, transparent: true, opacity: .88 })
    : clayMat;
  const surf = new THREE.Mesh(new THREE.CircleGeometry(.142, 22), top); surf.rotation.x = -Math.PI / 2; surf.position.y = .25; g.add(surf);
  return propShadows(g);
}

// Caja de madera con las mechas, encima de un cajón
function makeMechaBox() {
  const g = new THREE.Group(), wood = std({ map: T.woodPlain, roughness: .85 });
  const W2 = .36, D2 = .26, H2 = .14, t = .015;
  [[W2, t, D2, 0, t / 2, 0], [W2, H2, t, 0, H2 / 2, D2 / 2], [W2, H2, t, 0, H2 / 2, -D2 / 2], [t, H2, D2, W2 / 2, H2 / 2, 0], [t, H2, D2, -W2 / 2, H2 / 2, 0]]
    .forEach(([w, h, d, x, y, z]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood); m.position.set(x, y, z); g.add(m); });
  const label = fontTex(256, 72, (c, w, h) => {
    c.fillStyle = '#5a4029'; c.fillRect(0, 0, w, h);
    c.font = '400 44px "Alfa Slab One", Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#f3c22f'; c.fillText('MECHAS', w / 2, h / 2 + 2);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(.3, .084), std({ map: label, roughness: .9 })); sign.position.set(0, H2 / 2, D2 / 2 + t / 2 + .001); g.add(sign);
  MECHA_GEO = MECHA_GEO || mechaGeo();
  const paper = std({ color: '#f6eee8', roughness: .85 });
  for (let i = 0; i < 16; i++) {   // mechas sueltas, unas encima de otras
    const m = new THREE.Mesh(MECHA_GEO, paper);
    m.position.set(rand(-.14, .14), .1 + Math.random() * .05, rand(-.09, .09));
    m.rotation.set(-Math.PI / 2 + rand(-.5, .5), rand(-.4, .4), rand(0, 6.28)); g.add(m);
  }
  const stand = new THREE.Mesh(new THREE.BoxGeometry(.44, .36, .36), std({ map: T.woodPlain, roughness: .9 })); stand.position.y = -.18; g.add(stand);
  return propShadows(g);
}

/* Canasta de cerveza como las de las tiendas: plástico negro con ventanas, 30 botellas retornables de vidrio café
   con etiqueta amarilla y tapa plateada (sin marca) */
function crateSideTex(w, h, long) {
  const [c, g] = cnv(w, h);
  g.fillStyle = '#211c18'; g.fillRect(0, 0, w, h);
  g.globalAlpha = .25; for (let x = 6; x < w; x += 9) { g.fillStyle = x % 18 < 9 ? '#000' : '#3a332c'; g.fillRect(x, 0, 2, h); }   // nervaduras del plástico
  g.globalAlpha = 1; g.fillStyle = '#2c2621'; g.fillRect(0, 0, w, h * .07); g.fillRect(0, h * .93, w, h * .07);
  const hole = (x0, y0, x1, y1, r) => { const x = x0 * w, y = y0 * h, ww = (x1 - x0) * w, hh = (y1 - y0) * h; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + ww, y, x + ww, y + hh, r); g.arcTo(x + ww, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + ww, y, r); g.fill(); };
  g.globalCompositeOperation = 'destination-out';
  if (long) { hole(.14, .16, .86, .44, 26); hole(.07, .56, .27, .86, 10); hole(.73, .56, .93, .86, 10); }   // ventana larga arriba y dos abajo
  else hole(.2, .14, .8, .74, 22);                                                                            // agarradera
  g.globalCompositeOperation = 'source-over';
  if (long) { g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 3; g.beginPath(); g.arc(w / 2, h * .68, h * .13, 0, 7); g.stroke(); }   // relieve del centro
  g.globalAlpha = .1; for (let i = 0; i < 500; i++) { g.fillStyle = Math.random() < .5 ? '#000' : '#fff'; g.fillRect(rand(0, w), rand(0, h), rand(1, 3), rand(1, 2)); }
  g.globalAlpha = 1;
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
function labelTex() {
  const [c, g] = cnv(128, 64);
  g.fillStyle = '#e9b925'; g.fillRect(0, 0, 128, 64);
  g.fillStyle = '#b8232a'; g.fillRect(0, 6, 128, 3); g.fillRect(0, 55, 128, 3);
  g.fillStyle = '#f6e7b4'; g.beginPath(); g.ellipse(64, 32, 20, 14, 0, 0, 7); g.fill();
  g.strokeStyle = '#b8232a'; g.lineWidth = 2; g.stroke();
  return tex(c);
}
let BOTTLE = null;
function bottleParts() {   // botella retornable: vidrio, etiqueta, etiqueta del cuello y tapa
  if (BOTTLE) return BOTTLE;
  const lathe = (pts, seg = 16, open = false) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
  BOTTLE = {
    glass: lathe([[0, 0], [.03, 0], [.032, .006], [.032, .14], [.029, .165], [.015, .2], [.0115, .225], [.0115, .238], [.0135, .243], [0, .243]]),
    label: new THREE.CylinderGeometry(.0325, .0325, .07, 16, 1, true).translate(0, .08, 0),
    neck: new THREE.CylinderGeometry(.0122, .0168, .042, 14, 1, true).translate(0, .205, 0),
    cap: new THREE.CylinderGeometry(.0145, .0145, .009, 14).translate(0, .246, 0),
    mats: {
      glass: std({ color: '#3a1905', roughness: .1, metalness: .1, transparent: true, opacity: .94 }),
      label: std({ map: labelTex(), roughness: .6 }),
      neck: std({ color: '#e9b925', roughness: .45, metalness: .3 }),
      cap: std({ color: '#e2e4e6', roughness: .35, metalness: .35 }) },
  };
  return BOTTLE;
}
function makeCrate(fill) {
  const g = new THREE.Group(), W3 = .47, D3 = .33, H3 = .23;
  const mk = long => std({ map: crateSideTex(long ? 376 : 264, 184, long), transparent: true, alphaTest: .5, side: THREE.DoubleSide, roughness: .5 });
  const long = mk(true), short = mk(false);
  [[W3, 0, D3 / 2, 0, long], [W3, 0, -D3 / 2, Math.PI, long], [D3, W3 / 2, 0, Math.PI / 2, short], [D3, -W3 / 2, 0, -Math.PI / 2, short]].forEach(([w, x, z, ry, m]) => {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, H3), m); pl.position.set(x, H3 / 2, z); pl.rotation.y = ry; g.add(pl);
  });
  const solid = std({ color: '#211c18', roughness: .5 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(W3, .012, D3), solid); base.position.y = .006; g.add(base);
  [[W3 + .012, .018, .016, 0, H3 - .009, D3 / 2], [W3 + .012, .018, .016, 0, H3 - .009, -D3 / 2], [.016, .018, D3 + .012, W3 / 2, H3 - .009, 0], [.016, .018, D3 + .012, -W3 / 2, H3 - .009, 0]]
    .forEach(([w, h, d, x, y, z]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), solid); b.position.set(x, y, z); g.add(b); });   // borde de arriba
  for (let i = 1; i < 6; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(.004, H3 * .55, D3), solid); d.position.set(-W3 / 2 + W3 * i / 6, H3 * .275, 0); g.add(d); }   // separadores
  for (let j = 1; j < 5; j++) { const d = new THREE.Mesh(new THREE.BoxGeometry(W3, H3 * .55, .004), solid); d.position.set(0, H3 * .275, -D3 / 2 + D3 * j / 5); g.add(d); }
  if (fill) {   // 30 botellas (6 x 5); a veces falta alguna
    const b = bottleParts(), spots = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) if (Math.random() < fill) spots.push([-W3 / 2 + W3 * (i + .5) / 6, -D3 / 2 + D3 * (j + .5) / 5]);
    const m4 = new THREE.Matrix4();
    ['glass', 'label', 'neck', 'cap'].forEach(k => {
      const im = new THREE.InstancedMesh(b[k], b.mats[k], spots.length);
      spots.forEach(([x, z], n) => { m4.makeRotationY(n * 1.7); m4.setPosition(x, .012, z); im.setMatrixAt(n, m4); });
      g.add(im);
    });
  }
  return propShadows(g);
}
function makeBottle(lying) {
  const b = bottleParts(), g = new THREE.Group();
  ['glass', 'label', 'neck', 'cap'].forEach(k => g.add(new THREE.Mesh(b[k], b.mats[k])));
  if (lying) { g.rotation.z = Math.PI / 2; g.position.y = .033; }
  return propShadows(g);
}

/* Banderines de Colombia colgados en las cuatro paredes: cada uno es la bandera ('bandera')
   o van intercalados amarillo, azul y rojo ('colores') */
let BUNTING_STYLE = 'colores';
function pennantTex(flag) {
  const [c, g] = cnv(64, 96);
  if (flag) { g.fillStyle = '#fcd116'; g.fillRect(0, 0, 64, 48); g.fillStyle = '#003893'; g.fillRect(0, 48, 64, 24); g.fillStyle = '#ce1126'; g.fillRect(0, 72, 64, 24); }
  else { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 96); }
  const sh = g.createLinearGradient(0, 0, 0, 96); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.2)');
  g.fillStyle = sh; g.fillRect(0, 0, 64, 96);
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(6, 8); g.quadraticCurveTo(32, 26, 58, 8); g.stroke();   // pliegue de arriba, como tela
  g.lineWidth = 2; g.beginPath(); g.moveTo(10, 14); g.quadraticCurveTo(32, 30, 54, 14); g.stroke();
  return tex(c);
}
function pennantGeo() {   // banderín con la punta en V
  const w = .2, h = .28, n = .08, sh = new THREE.Shape();
  sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, -h); sh.lineTo(0, -h + n); sh.lineTo(-w / 2, -h); sh.closePath();
  const geo = new THREE.ShapeGeometry(sh), uv = geo.attributes.uv, pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h) / h);
  return geo;
}
function buildBunting() {
  const D = W.D, flag = BUNTING_STYLE === 'bandera', spots = [];
  const runs = [   // [desde, hasta, giro para mirar hacia adentro]
    [V(-3.46, 0, 2.6), V(-3.46, 0, -D - 1.62), Math.PI / 2],
    [V(3.46, 0, -D - 1.62), V(3.46, 0, 2.6), -Math.PI / 2],
    [V(-3.4, 0, -D - 1.66), V(3.4, 0, -D - 1.66), 0],
    [V(3.4, 0, 2.94), V(-3.4, 0, 2.94), Math.PI]];
  const cord = new THREE.LineBasicMaterial({ color: '#2a2018' });
  runs.forEach(([a, b, ry]) => {
    const L = a.distanceTo(b), swags = Math.max(1, Math.round(L / 2.6)), n = Math.floor(L / .3);
    const yAt = t => { const s = (t * swags) % 1; return 3.58 - .3 * 4 * s * (1 - s); };   // la cuerda se descuelga entre clavo y clavo
    const pts = []; for (let i = 0; i <= swags * 12; i++) { const t = i / (swags * 12); pts.push(a.clone().lerp(b, t).setY(yAt(t))); }
    hall.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cord));
    for (let i = 0; i < n; i++) {
      const t = (i + .5) / n, p = a.clone().lerp(b, t); p.y = yAt(t);
      const slope = (yAt(Math.min(1, t + .002)) - yAt(Math.max(0, t - .002))) / (.004 * L);
      spots.push({ p, ry, rz: Math.atan(slope) * .6 + rand(-.05, .05), rx: rand(-.25, .25), k: spots.length });
    }
  });
  const im = new THREE.InstancedMesh(pennantGeo(), std({ map: pennantTex(flag), roughness: .75, side: THREE.DoubleSide }), spots.length);
  const m = new THREE.Matrix4(), cols = ['#fcd116', '#1f4fa8', '#ce1126'].map(c => new THREE.Color(c));
  spots.forEach(({ p, ry, rz, rx }, i) => {
    m.makeRotationY(ry).multiply(new THREE.Matrix4().makeRotationZ(rz)).multiply(new THREE.Matrix4().makeRotationX(rx)); m.setPosition(p);
    im.setMatrixAt(i, m); if (!flag) im.setColorAt(i, cols[i % 3]);
  });
  hall.add(im);
}

let tejoLeftProps = [];   // la pala, las mechas, los baldes y los bultos de greda (en el bolo se esconden)
function buildProps() {
  // todo en la esquina izquierda, entre la tabla del costado de la cancha y la pared (ahí no llega el tejo)
  const z0 = -W.D, sack = std({ map: burlapTex(), roughness: 1, side: THREE.DoubleSide });
  const box = makeMechaBox(); box.position.set(-2.12, .36, z0 - .4); box.rotation.y = .2; hall.add(box);
  const b1 = makeBucket('#a8231a', 'agua'); b1.position.set(-2.0, 0, z0 + .3); b1.rotation.y = .6; hall.add(b1);
  const b2 = makeBucket('#24519a', 'barro'); b2.position.set(-2.38, 0, z0 + .1); b2.rotation.y = -.4; hall.add(b2);
  const s1 = makeSack(true, sack); s1.position.set(-2.85, 0, z0 - .3); hall.add(s1);
  const s2 = makeSack(false, sack); s2.position.set(-2.9, 0, z0 + .45); s2.rotation.y = 1.35; hall.add(s2);
  const s3 = makeSack(false, sack); s3.position.set(-2.92, .2, z0 + .4); s3.rotation.set(0, 1.6, .08); s3.scale.setScalar(.9); hall.add(s3);
  tejoLeftProps = [box, b1, b2, s1, s2, s3];
  // lado derecho: canastas de cerveza apiladas y botellas regadas
  const crates = [   // [botellas, x, z, giro, giro extra]
    [.97, 2.3, z0 - .35, .05], [.97, 2.3, z0 - .35, .28, -.04], [.95, 2.3, z0 - .35, .51, .03],
    [.97, 2.92, z0 + .15, .4], [.7, 2.92, z0 + .15, .68, .06],
    [.8, 2.08, z0 + .55, 1.45]];
  const lv = {};
  crates.forEach(([fill, x, z, ry, dry = 0]) => {
    const key = x + ',' + z, y = (lv[key] || 0) * .252; lv[key] = (lv[key] || 0) + 1;
    const c = makeCrate(fill); c.position.set(x, y, z); c.rotation.y = ry + dry; hall.add(c);
  });
  [[1.92, z0 + .95, 0], [2.02, z0 + 1.02, 0], [2.4, z0 + .85, 1]].forEach(([x, z, lying]) => { const b = makeBottle(lying); b.position.x = x; b.position.z = z; if (lying) b.rotation.y = .7; hall.add(b); });
  buildBunting();
  buildAmbience();
  // la pala recostada en la tabla, por fuera
  const shovel = makeShovel(); shovel.position.set(-1.95, 0, z0 + .85); shovel.rotation.set(0, -.25, -.17); hall.add(shovel); tejoLeftProps.push(shovel);
}

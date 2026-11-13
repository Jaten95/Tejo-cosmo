
/* ================= Ambiente del salón =================
   Bombillos encendidos con luz cálida (uno titila de vez en cuando) y polvo flotando en la luz;
   a los lados, una mesa de madera con botellas, sillas plásticas amarillas y una caneca azul con un trapo.
   Es decoración: el tejo no choca con esto. */

let AMB = null;

function glowTex() {   // halo del bombillo
  const S = 128, [c, g] = cnv(S, S), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,236,190,1)'); gr.addColorStop(.18, 'rgba(255,214,150,.55)'); gr.addColorStop(.5, 'rgba(255,190,110,.12)'); gr.addColorStop(1, 'rgba(255,170,90,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S); return tex(c);
}
function dustTex() {
  const S = 32, [c, g] = cnv(S, S), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,240,210,1)'); gr.addColorStop(1, 'rgba(255,240,210,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S); return tex(c);
}

// Bombillo de vidrio con sóquet y cable, colgando del techo
function makeBulb(glowMat) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.LatheGeometry([[0, -.085], [.03, -.08], [.05, -.055], [.055, -.025], [.045, .005], [.022, .03], [.02, .045]].map(([x, y]) => new THREE.Vector2(x, y)), 18),
    new THREE.MeshBasicMaterial({ color: '#fff0c8' }));
  g.add(glass);
  const socket = new THREE.Mesh(new THREE.CylinderGeometry(.024, .022, .06, 12), std({ color: '#1b1a19', roughness: .6 })); socket.position.y = .075; g.add(socket);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .55, 6), std({ color: '#111' })); cord.position.y = .38; g.add(cord);
  const halo = new THREE.Sprite(glowMat); halo.scale.set(.75, .75, 1); halo.position.y = -.03; g.add(halo);
  return { g, glass, halo };
}

// Silla plástica con brazos, como las de las tiendas (sin marca)
function makeChair(color) {
  const g = new THREE.Group(), m = std({ color, roughness: .35 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(.46, .035, .42), m); seat.position.y = .44; g.add(seat);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(.46, .05, .03), m); lip.position.set(0, .425, .205); g.add(lip);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {   // patas un poco abiertas
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.028, .034, .45, 10), m);
    leg.position.set(sx * .21, .22, sz * .18); leg.rotation.z = -sx * .07; leg.rotation.x = sz * .07; g.add(leg);
  });
  const back = new THREE.Group(); back.position.set(0, .46, -.2); back.rotation.x = -.16; g.add(back);   // espaldar inclinado
  [-.21, .21].forEach(x => { const p = new THREE.Mesh(new THREE.BoxGeometry(.035, .44, .03), m); p.position.set(x, .22, 0); back.add(p); });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(.46, .07, .03), m); rail.position.y = .43; back.add(rail);
  for (let i = 0; i < 5; i++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(.04, .32, .02), m); sl.position.set(-.14 + i * .07, .23, 0); back.add(sl); }
  [-1, 1].forEach(sx => {   // brazos
    const arm = new THREE.Mesh(new THREE.BoxGeometry(.045, .03, .36), m); arm.position.set(sx * .235, .63, -.01); g.add(arm);
    const post = new THREE.Mesh(new THREE.BoxGeometry(.04, .2, .035), m); post.position.set(sx * .235, .53, .15); g.add(post);
  });
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// Mesa de madera con botellas encima
function makeTable() {
  const g = new THREE.Group(), wood = std({ map: T.woodPlain, color: '#a48262', roughness: .8 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(.8, .04, .8), wood); top.position.y = .74; g.add(top);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(.05, .72, .05), wood); l.position.set(sx * .34, .36, sz * .34); g.add(l); });
  [[-.18, .1], [.05, -.15], [.2, .12], [-.05, .05]].forEach(([x, z], i) => { const b = makeBottle(false); b.position.set(x, .76, z); g.add(b); });
  const lying = makeBottle(true); lying.position.set(.1, .76, .25); lying.rotation.y = .9; g.add(lying);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// Caneca plástica azul con un trapo negro encima
function makeBarrel() {
  const g = new THREE.Group(), m = std({ color: '#1846b0', roughness: .5 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.29, .29, .88, 24), m); body.position.y = .44; g.add(body);
  [.2, .44, .68].forEach(y => { const r = new THREE.Mesh(new THREE.TorusGeometry(.292, .012, 6, 28), m); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); });
  const cloth = std({ color: '#1e1d1c', roughness: 1, side: THREE.DoubleSide });
  const topC = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .015, 20), cloth); topC.position.y = .885; g.add(topC);
  const hang = new THREE.Mesh(new THREE.PlaneGeometry(.34, .42), cloth); hang.position.set(.05, .69, .3); hang.rotation.x = .05; g.add(hang);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function buildAmbience() {
  const D = W.D, glowMat = new THREE.SpriteMaterial({ map: glowTex(), color: '#ffd9a0', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  AMB = { bulbs: [], t: 0, flick: 0 };
  // bombillos a lo largo del salón (los dos primeros y el de la cancha dan luz)
  const spots = [[1.35, -2], [-1.35, -D * .3], [1.35, -D * .55], [-1.35, -D * .8], [1.35, -D + 1.2]];
  spots.forEach(([x, z], i) => {
    const b = makeBulb(glowMat.clone()); b.g.position.set(x, 3.55, z); hall.add(b.g);
    if (i === 0 || i === 2 || i === 4) { b.light = new THREE.PointLight('#ffc98a', i === 4 ? .7 : 1.0, 12, 1.6); b.light.position.set(x, 3.45, z); hall.add(b.light); b.base = b.light.intensity; }
    AMB.bulbs.push(b);
  });
  AMB.flicker = AMB.bulbs[2];   // este titila de vez en cuando
  // polvo flotando cerca de los bombillos
  const N = 260, pos = new Float32Array(N * 3), seeds = [];
  for (let i = 0; i < N; i++) {
    const [x, z] = spots[i % spots.length];
    const p = [x + rand(-1.1, 1.1), rand(.6, 3.4), z + rand(-1.4, 1.4)]; pos.set(p, i * 3); seeds.push([p[0], p[1], p[2], rand(0, 6.28), rand(.03, .09)]);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  AMB.dust = new THREE.Points(geo, new THREE.PointsMaterial({ map: dustTex(), color: '#ffe3b5', size: .035, transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false }));
  AMB.seeds = seeds; hall.add(AMB.dust);
  // a la izquierda: mesa con botellas y dos sillas mirando la cancha
  const table = makeTable(); table.position.set(-2.75, 0, -D + 5.4); table.rotation.y = .2; hall.add(table);
  const c1 = makeChair('#f2b400'); c1.position.set(-2.55, 0, -D + 4.45); c1.rotation.y = 2.4; hall.add(c1);
  const c2 = makeChair('#efb000'); c2.position.set(-2.2, 0, -D + 5.95); c2.rotation.y = 1.1; hall.add(c2);
  // a la derecha: dos sillas y la caneca azul
  const c3 = makeChair('#f2b400'); c3.position.set(2.6, 0, -D + 4.3); c3.rotation.y = -2.2; hall.add(c3);
  const c4 = makeChair('#f4b800'); c4.position.set(2.75, 0, -D + 5.15); c4.rotation.y = -1.7; hall.add(c4);
  const barrel = makeBarrel(); barrel.position.set(2.95, 0, -D + 3.2); barrel.rotation.y = -.6; hall.add(barrel);
}

function updateAmbience(dt) {
  if (!AMB) return;
  AMB.t += dt; const t = AMB.t;
  // el polvo se mece despacio
  const a = AMB.dust.geometry.attributes.position;
  for (let i = 0; i < AMB.seeds.length; i++) {
    const [x, y, z, ph, sp] = AMB.seeds[i];
    a.setXYZ(i, x + Math.sin(t * sp * 3 + ph) * .25, y + ((t * sp + ph) % 1.2) * .5 - .3, z + Math.cos(t * sp * 2 + ph) * .25);
  }
  a.needsUpdate = true;
  // los bombillos respiran un poquito y uno titila de vez en cuando
  AMB.bulbs.forEach((b, i) => { b.halo.material.opacity = .85 + Math.sin(t * 2.1 + i) * .05; });
  const f = AMB.flicker;
  if (dt) { AMB.flick -= dt; if (AMB.flick <= 0) AMB.flick = rand(4, 9); }
  const off = AMB.flick < .35 && Math.sin(AMB.flick * 60) > 0;   // dos o tres parpadeos rápidos
  f.halo.material.opacity = off ? .15 : f.halo.material.opacity; f.glass.material.color.set(off ? '#8a7a60' : '#fff0c8');
  if (f.light) f.light.intensity = off ? f.base * .25 : f.base;
}

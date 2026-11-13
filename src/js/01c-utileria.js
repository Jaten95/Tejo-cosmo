
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

function buildProps() {
  // todo en la esquina izquierda, entre la tabla del costado de la cancha y la pared (ahí no llega el tejo)
  const z0 = -W.D, sack = std({ map: burlapTex(), roughness: 1, side: THREE.DoubleSide });
  const box = makeMechaBox(); box.position.set(-2.12, .36, z0 - .4); box.rotation.y = .2; hall.add(box);
  const b1 = makeBucket('#a8231a', 'agua'); b1.position.set(-2.0, 0, z0 + .3); b1.rotation.y = .6; hall.add(b1);
  const b2 = makeBucket('#24519a', 'barro'); b2.position.set(-2.38, 0, z0 + .1); b2.rotation.y = -.4; hall.add(b2);
  const s1 = makeSack(true, sack); s1.position.set(-2.85, 0, z0 - .3); hall.add(s1);
  const s2 = makeSack(false, sack); s2.position.set(-2.9, 0, z0 + .45); s2.rotation.y = 1.35; hall.add(s2);
  const s3 = makeSack(false, sack); s3.position.set(-2.92, .2, z0 + .4); s3.rotation.set(0, 1.6, .08); s3.scale.setScalar(.9); hall.add(s3);
  // la pala recostada en la tabla, por fuera
  const shovel = makeShovel(); shovel.position.set(-1.95, 0, z0 + .85); shovel.rotation.set(0, -.25, -.17); hall.add(shovel);
}

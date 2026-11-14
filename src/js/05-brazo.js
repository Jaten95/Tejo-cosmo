
/* ================= Brazo en primera persona =================
   Lanzamiento por debajo, en péndulo: al arrastrar el brazo baja y se va hacia atrás
   (como la medida); al soltar viene hacia adelante, suelta el tejo y remata apuntando a la cancha. */
const ARM = { scene: null, cam: null, root: null, upper: null, elbow: null, fore: null, hand: null, slot: null, tejo: null,
  key: '', state: 'hidden', t: 0, th: 60, be: 40, vis: 0, cb: null, released: false, from: 0 };
function armMats() {
  return {
    sleeve: new THREE.MeshStandardMaterial({ color: '#7d2a21', roughness: .85 }),
    cuff: new THREE.MeshStandardMaterial({ color: '#f2ead8', roughness: .8 }),
    skin: new THREE.MeshStandardMaterial({ color: '#4f2d1a', roughness: .55, emissive: '#1c0b05', emissiveIntensity: .6 })
  };
}
function buildArm() {
  const s = ARM.scene = new THREE.Scene();
  ARM.cam = new THREE.PerspectiveCamera(60, 1, .01, 6);
  s.add(new THREE.HemisphereLight('#ffe9cc', '#3a2a1c', .55));
  const key = new THREE.DirectionalLight('#fff1d8', .95); key.position.set(-.6, 1.2, .4); s.add(key);
  const rim = new THREE.DirectionalLight('#ffb070', .5); rim.position.set(.8, -.2, -1); s.add(rim);
  const M = ARM.mats = armMats();
  const root = ARM.root = new THREE.Group(); s.add(root);
  ARM.upper = new THREE.Mesh(new THREE.CylinderGeometry(.047, .052, 1, 20), M.sleeve);
  ARM.elbow = new THREE.Mesh(new THREE.SphereGeometry(.048, 14, 10), M.sleeve);
  ARM.cuffM = new THREE.Mesh(new THREE.CylinderGeometry(.043, .043, .03, 20), M.cuff);
  ARM.fore = new THREE.Mesh((() => { const g = new THREE.CylinderGeometry(.021, .03, 1, 24); g.scale(1.2, 1, .86); return g; })(), M.skin);
  root.add(ARM.upper, ARM.elbow, ARM.cuffM, ARM.fore);
  // mano derecha con la palma hacia arriba: dedos de 3 falanges que abrazan el borde del tejo y pulgar encima
  const hand = ARM.hand = new THREE.Group();
  const sk = M.skin;
  const ball = (r, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), sk); m.position.set(x, y, z); m.scale.set(sx, sy, sz); hand.add(m); return m; };
  // palma: una sola pieza con contorno de mano (nudillos en arco, más angosta en la muñeca) y bordes redondeados
  const pal = new THREE.Shape();
  pal.moveTo(-.029, -.046);
  pal.quadraticCurveTo(-.044, -.02, -.043, .012);            // borde del meñique
  pal.quadraticCurveTo(-.043, .036, -.031, .039);
  pal.quadraticCurveTo(-.012, .049, .006, .05);              // arco de los nudillos
  pal.quadraticCurveTo(.03, .049, .04, .038);
  pal.quadraticCurveTo(.05, .02, .047, -.004);               // lado del pulgar
  pal.quadraticCurveTo(.044, -.034, .03, -.046);
  pal.quadraticCurveTo(0, -.052, -.029, -.046);               // talón
  const palmGeo = new THREE.ExtrudeGeometry(pal, { depth: .014, bevelEnabled: true, bevelThickness: .008, bevelSize: .007, bevelSegments: 6, curveSegments: 14 });
  palmGeo.rotateX(-Math.PI / 2); palmGeo.computeVertexNormals();
  const palm = new THREE.Mesh(palmGeo, sk); palm.position.set(0, -.011, -.004); hand.add(palm);
  ball(.02, .03, .001, .012, 1.05, .52, 1.55);               // eminencia del pulgar
  ball(.022, -.026, .002, .018, 1, .5, 1.3);                 // borde del meñique (hipotenar)
  // muñeca ovalada que une la palma con el antebrazo
  const wristGeo = new THREE.CylinderGeometry(.025, .026, .06, 24); wristGeo.rotateX(Math.PI / 2); wristGeo.scale(1.3, .72, 1);
  const wrist = new THREE.Mesh(wristGeo, sk); wrist.position.set(0, -.004, .058); hand.add(wrist);
  const phal = (len, r0, r1, last) => {          // falange: tubo un poco aplanado (más ancho que alto) hacia -Z
    const g = new THREE.Group();
    const geo = new THREE.CylinderGeometry(r1, r0, len, 18); geo.scale(1.12, 1, .86);
    const c = new THREE.Mesh(geo, sk); c.rotation.x = -Math.PI / 2; c.position.z = -len / 2; g.add(c);
    const jg = new THREE.SphereGeometry(r0 * 1.03, 18, 12); jg.scale(1.12, .86, 1);
    g.add(new THREE.Mesh(jg, sk));
    const tip = new THREE.Group(); tip.position.z = -len; g.add(tip);
    if (last) { const tg = new THREE.SphereGeometry(r1, 18, 12); tg.scale(1.1, .84, 1.5); const t = new THREE.Mesh(tg, sk); t.position.z = -r1 * .25; tip.add(t); }
    return { g, tip };
  };
  const FING = [
    { x: .028, z: -.049, yaw: -.06, L: [.04, .025, .019], r: .0098 },   // índice
    { x: .009, z: -.053, yaw: 0, L: [.044, .028, .02], r: .0102 },      // corazón
    { x: -.01, z: -.051, yaw: .06, L: [.041, .026, .019], r: .0096 },   // anular
    { x: -.028, z: -.044, yaw: .15, L: [.032, .02, .017], r: .0083 }    // meñique
  ];
  ARM.fingers = FING.map(f => {
    const base = new THREE.Group(); base.position.set(f.x, .001, f.z); base.rotation.y = f.yaw; hand.add(base);
    const p1 = phal(f.L[0], f.r, f.r * .92), p2 = phal(f.L[1], f.r * .92, f.r * .85), p3 = phal(f.L[2], f.r * .85, f.r * .76, true);
    base.add(p1.g); p1.tip.add(p2.g); p2.tip.add(p3.g);
    return [p1.g, p2.g, p3.g];
  });
  // pulgar por puntos: sube por fuera del borde derecho y se apoya encima del tejo, sin atravesarlo
  ARM.thumbSegs = [[.0128, .0118], [.0116, .0105], [.0105, .0092]].map(([r0, r1]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 1, 18), sk); hand.add(m); return m; });
  ARM.thumbJoints = [.0132, .0118, .0105, .0092].map((r, i) => { const g = new THREE.SphereGeometry(r, 18, 12); if (i === 3) g.scale(1, 1, 1.3); const m = new THREE.Mesh(g, sk); hand.add(m); return m; });
  ARM.curl = 1;
  const slot = ARM.slot = new THREE.Group(); slot.position.set(0, .033, -.022); slot.rotation.x = .22; hand.add(slot);
  root.add(hand);
  ARM.procParts = hand.children.filter(o => o !== slot);
  buildBand(hand);
  root.visible = false;
  loadHandModel();
}
function armSetPlayer(p) {
  const key = [isRana() ? 'rana' : 'tejo', p.color, p.design, p.name].join('|');
  if (key === ARM.key) return; ARM.key = key;
  if (ARM.tejo) ARM.slot.remove(ARM.tejo);
  if (isRana()) {   // en la rana la argolla se sostiene entre el pulgar y el índice; los otros tres dedos van recogidos
    ARM.tejo = makeArgolla(); const G = ARG_GRIP;
    ARM.tejo.position.fromArray(G.pos).sub(ARM.slot.position).applyAxisAngle(V(1, 0, 0), -ARM.slot.rotation.x);
    ARM.tejo.quaternion.setFromUnitVectors(V(0, 0, 1), V(...G.n).normalize()).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), G.spin))
      .premultiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -ARM.slot.rotation.x));   // de la mano al soporte
    ARM.tejo.scale.setScalar(G.s);
  }
  else ARM.tejo = makeTejo(p.color, p.design, p.name);
  ARM.tejo.castShadow = false; ARM.slot.add(ARM.tejo);
  if (ARM.medal) ARM.medal.material[1] = tejoTopMaterial(p.color, p.design, p.name);
  const c = new THREE.Color(p.color); c.multiplyScalar(.55); ARM.mats.sleeve.color.copy(c);
}
const _Y = new THREE.Vector3(0, 1, 0);
function armSeg(mesh, a, b) {
  const d = b.clone().sub(a), len = d.length();
  mesh.position.copy(a).addScaledVector(d, .5); mesh.scale.set(1, len, 1);
  mesh.quaternion.setFromUnitVectors(_Y, d.normalize());
}
/* th: ángulo del hombro (0 = brazo colgando, positivo = hacia adelante); be: doblez del codo */
function armPose(th, be) {
  const r = Math.PI / 180, a = th * r, b = (th + be) * r;
  const S = V(.17, -.2, -.08);
  const E = S.clone().add(V(-.02 * Math.sin(a), -Math.cos(a) * .3, -Math.sin(a) * .3));
  const W = E.clone().add(V(-.07 * Math.max(0, Math.sin(b)), -Math.cos(b) * .29, -Math.sin(b) * .29));
  armSeg(ARM.upper, S, E); ARM.elbow.position.copy(E);
  {   // antebrazo alineado con la mano para que el óvalo coincida con la muñeca
    const d0 = W.clone().sub(E), len = d0.length(), dn = d0.clone().normalize();
    let up0 = V(0, 1, 0).sub(dn.clone().multiplyScalar(dn.y)); if (up0.lengthSq() < 1e-4) up0.set(0, 0, 1); up0.normalize();
    const rgt = new THREE.Vector3().crossVectors(up0, dn.clone().negate()).normalize();
    const zz = new THREE.Vector3().crossVectors(rgt, dn).normalize();
    ARM.fore.position.copy(E).addScaledVector(d0, .5); ARM.fore.scale.set(1, len, 1);
    ARM.fore.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(rgt, dn, zz));
  }
  const dir = W.clone().sub(E).normalize();
  ARM.cuffM.position.copy(E).addScaledVector(dir, .045); ARM.cuffM.quaternion.setFromUnitVectors(_Y, dir);
  // la mano sigue al antebrazo con la palma hacia arriba
  const m = new THREE.Matrix4(), fwd = dir.clone(), up = V(0, 1, 0).sub(fwd.clone().multiplyScalar(fwd.y)).normalize();
  if (up.lengthSq() < .01) up.set(0, 0, 1);
  const right = new THREE.Vector3().crossVectors(up, fwd.clone().negate()).normalize();
  m.makeBasis(right, up, fwd.clone().negate()); ARM.hand.quaternion.setFromRotationMatrix(m);
  ARM.hand.position.copy(W).addScaledVector(dir, ARM.model ? .064 : .045);
  if (isRana()) {   // con la argolla la mano va de medio lado y la C abre hacia adentro, como en la foto
    const R = ARG_HAND, q = new THREE.Quaternion().setFromEuler(new THREE.Euler(R.pitch, R.yaw, R.roll, 'YXZ'));
    const piv = V(0, 0, .05);   // gira desde la muñeca para no despegarse del antebrazo
    ARM.hand.position.add(piv.clone().sub(piv.clone().applyQuaternion(q)).applyQuaternion(ARM.hand.quaternion));
    ARM.hand.quaternion.multiply(q);
    if (ARM.band) { const qi = q.clone().invert(); ARM.band.quaternion.copy(qi); ARM.band.position.set(0, 0, .07).sub(piv).applyQuaternion(qi).add(piv); }   // la manilla se queda en el antebrazo
  } else if (ARM.band) { ARM.band.quaternion.identity(); ARM.band.position.set(0, 0, .07); }
}
function armVisibleTurn() {
  if (!game || game.over || paused) return false;
  const p = current(); if (!p || p.cpu) return false;
  if (online() && p.pid !== NET.pid) return false;
  return phase === 'aim';
}
/* Soltar: corre el balanceo y llama cb en el momento de soltar el tejo */
function armRelease(cb) {
  if (!ARM.root || !ARM.root.visible || reduceMotion) { cb(); return; }
  ARM.state = 'swing'; ARM.t = 0; ARM.cb = cb; ARM.released = false; ARM.from = ARM.th;
}
function armBusy() { return ARM.state === 'swing'; }
function updateArm(dt, now) {
  if (!ARM.root) return;
  const show = armVisibleTurn() || ARM.state === 'swing' || ARM.state === 'follow';   // después del remate el brazo se va, aunque el tiro siga en primera persona
  if (show && ARM.state === 'hidden') { ARM.state = 'ready'; ARM.th = 30; ARM.be = 30; }
  if (show && ARM.state === 'ready') armSetPlayer(current());   // nuevo tejo en la mano solo cuando vuelve a apuntar
  ARM.vis += ((show ? 1 : 0) - ARM.vis) * (1 - Math.exp(-(show ? 7 : 14) * dt));
  if (!show && ARM.vis < .02) { ARM.state = 'hidden'; ARM.root.visible = false; }
  else ARM.root.visible = true;
  const k = 1 - Math.exp(-16 * dt);
  if (ARM.state === 'ready') {
    const R0 = isRana() ? ARG_ARM : [62, 42];   // con la argolla el antebrazo va más parado, como en la foto
    let th = R0[0] + Math.sin(now / 520) * 2.5, be = R0[1], L = 0;
    if (drag) {
      const P = clamp(drag.P, 0, 1), e = P * P * (3 - 2 * P);
      th = lerp(R0[0], -48, e); be = lerp(R0[1], 4, e); L = drag.L || 0;
      const w = drag.aim && drag.aim.amp ? (drag.aim.amp - .016) * 220 : 0;   // el pulso que tiembla
      th += Math.sin(now / 47) * w; be += Math.cos(now / 61) * w * .6;
    }
    ARM.th += (th - ARM.th) * k; ARM.be += (be - ARM.be) * k;
    ARM.root.rotation.y += ((-L * .18) - ARM.root.rotation.y) * k;
  } else if (ARM.state === 'swing') {
    ARM.t += dt; const u = Math.min(1, ARM.t / .3), e = u * u;            // acelera hacia adelante
    ARM.th = lerp(ARM.from, 112, e); ARM.be = lerp(ARM.be, 14, k);       // termina más bajo: antes el brazo pasaba pegado a la cámara
    if (!ARM.released && ARM.th >= 92) {
      ARM.released = true;
      // la mano lo suelta y desaparece de ella: el que vuela es el de la cancha, igual que cuando lanza otro (se ve uno solo)
      if (ARM.tejo) { ARM.slot.remove(ARM.tejo); ARM.tejo = null; ARM.key = ''; }
      const cb = ARM.cb; ARM.cb = null; if (cb) cb();
    }
    if (u >= 1) { ARM.state = 'follow'; ARM.t = 0; }
  } else if (ARM.state === 'follow') {   // remate corto y se va
    ARM.t += dt; ARM.th += (106 - ARM.th) * k * .3; ARM.be += (18 - ARM.be) * k * .3;
    if (ARM.t > .12) { ARM.state = 'drop'; ARM.t = 0; }
  } else if (ARM.state === 'drop') {   // sale por la derecha y abajo, sin bajar la mano abierta por el medio de la pantalla
    ARM.t += dt;
  }
  const oe = ARM.state === 'drop' ? Math.min(1, ARM.t / .12) : 0;
  if (ARM.state === 'drop' && armVisibleTurn()) ARM.state = 'ready';   // vuelve solo cuando le toca apuntar otra vez (antes volvía de una y la mano bajaba abierta por el medio)
  const curlT = (ARM.state === 'ready' || (ARM.state === 'swing' && !ARM.released)) ? 1 : ARM.state === 'drop' ? .5 : .12;
  ARM.curl += (curlT - ARM.curl) * (1 - Math.exp(-(curlT < ARM.curl || ARM.state === 'drop' ? 18 : 6) * dt));
  armFingers(ARM.curl);
  armPose(ARM.th, ARM.be);
  // acomodar el brazo a la pantalla (en vertical va más al centro) y subirlo/bajarlo al aparecer
  const a = cam.aspect, kx = clamp(a / 1.25, .48, 1);
  ARM.root.position.set(-.09 * (1 - kx) + .5 * oe, -.32 * (1 - ARM.vis) * (1 - oe * .7) - .1 * oe, 0);
  ARM.root.scale.setScalar(a < 1 ? .9 : 1);
}
function renderArm(w, h) {
  if (!ARM.root || !ARM.root.visible || !(w > 10 && h > 10)) return;
  ARM.cam.aspect = w / h; ARM.cam.updateProjectionMatrix();
  renderer.clearDepth(); renderer.render(ARM.scene, ARM.cam);
}

/* La cámara de tu tiro es la misma de cuando lanza otro (la sigue updateCamera): ya no hay cámara aparte en primera persona. */

function armFingers(c) {
  if (ARM.model) { poseModel(c); return; }
  (ARM.fingers || []).forEach(([a, b, d], i) => { a.rotation.x = .25 * c + .05; b.rotation.x = 1.22 * c + .08; d.rotation.x = .62 * c + .05; });
  if (ARM.thumbSegs) {
    // puntos en coordenadas del tejo (eje Y, cara de arriba en y = .015): nace en la palma por fuera
    // del borde (del lado de uno), pasa el filo y queda acostado sobre la cara, a lo largo del borde derecho
    const CL = [[.058, .0, .046], [.045, .0262, .03], [.031, .0278, .006], [.026, .0256, -.018]];
    const OP = [[.058, .0, .046], [.048, .027, .032], [.042, .05, .012], [.046, .068, -.006]];
    ARM.slot.updateMatrix();
    const P = CL.map((p, i) => V(lerp(OP[i][0], p[0], c), lerp(OP[i][1], p[1], c), lerp(OP[i][2], p[2], c)).applyMatrix4(ARM.slot.matrix));
    ARM.thumbSegs.forEach((m, i) => armSeg(m, P[i], P[i + 1]));
    ARM.thumbJoints.forEach((m, i) => m.position.copy(P[i]));
    const td = P[3].clone().sub(P[2]).normalize(); ARM.thumbJoints[3].quaternion.setFromUnitVectors(V(0, 0, 1), td); ARM.thumbJoints[3].position.addScaledVector(td, .003);
  }

}

/* ---------- Mano con modelo 3D (generic-hand de WebXR Input Profiles, licencia MIT) ----------
   Si el modelo carga, reemplaza la mano hecha con piezas; los dedos se doblan moviendo sus huesos. */
function loadHandModel() {
  if (!THREE.GLTFLoader || typeof HAND_GLB !== 'string') return;
  try {
    const bin = Uint8Array.from(atob(HAND_GLB), ch => ch.charCodeAt(0)).buffer;
    new THREE.GLTFLoader().parse(bin, '', gltf => { try { setupHandModel(gltf.scene); } catch (e) { } }, () => { });
  } catch (e) { }
}
function setupHandModel(root) {
  let mesh = null; const bones = {};
  root.traverse(o => { if (o.isSkinnedMesh) mesh = o; if (o.isBone) bones[o.name] = o; });
  if (!mesh || !bones['wrist']) return;
  const sk = ARM.mats.skin;
  mesh.material = new THREE.MeshStandardMaterial({ color: sk.color.clone(), roughness: .55, metalness: 0, emissive: sk.emissive.clone(), emissiveIntensity: sk.emissiveIntensity, skinning: true });
  mesh.frustumCulled = false;
  const holder = new THREE.Group();
  // modelo: dedos hacia -Y, palma hacia -X, pulgar hacia -Z  →  mano del juego: dedos -Z, palma +Y, pulgar +X
  const M = new THREE.Matrix4().makeBasis(V(0, -1, 0), V(0, 0, 1), V(-1, 0, 0));
  holder.quaternion.setFromRotationMatrix(M);
  const c = V(-.003, -.005, .006), t = V(0, .012, -.01);
  holder.position.copy(t).sub(c.clone().applyMatrix4(M));
  const wristC = V(.0395, .07, .0102).sub(c).applyMatrix4(M).add(t);   // centro de la muñeca del modelo
  const off = V(-wristC.x, -wristC.y, 0);
  holder.position.add(off); ARM.slot.position.add(off);
  holder.add(root); ARM.hand.add(holder);
  const rest = {}; for (const k in bones) rest[k] = { p: bones[k].position.clone(), q: bones[k].quaternion.clone() };
  ARM.model = { root, mesh, bones, rest, holder };
  (ARM.procParts || []).forEach(m => m.visible = false);
  armFingers(ARM.curl);
}
/* Dobla una cadena de articulaciones (jerarquía plana): cada doblez gira el resto del dedo */
function bendChain(J, angles, start) {
  const { bones, rest } = ARM.model;
  let C = new THREE.Quaternion(), N = rest[J[start]].p.clone();
  for (let k = start; k < J.length; k++) {
    const a = angles[k - start];
    if (a) {
      const ax = Array.isArray(a) ? a : [a, 0, 0];
      const qk = rest[J[k]].q.clone().premultiply(C);
      [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((e, i) => { if (!ax[i]) return;
        const axis = V(...e).applyQuaternion(qk).normalize();
        C = new THREE.Quaternion().setFromAxisAngle(axis, -ax[i]).multiply(C); });
    }
    bones[J[k]].position.copy(N);
    bones[J[k]].quaternion.copy(rest[J[k]].q).premultiply(C);
    if (k + 1 < J.length) N = N.clone().add(rest[J[k + 1]].p.clone().sub(rest[J[k]].p).applyQuaternion(C));
  }
}
// Rana, como en la foto del agarre: antebrazo parado, mano de medio lado (se ve el lado del pulgar) y la argolla en la C
const ARG_ARM = [45, 95];   // hombro y codo con la argolla en la mano
const ARG_HAND = { roll: 1.9, yaw: 0, pitch: 0 };   // cuánto se voltea la mano (desde la muñeca)
// dónde queda la argolla (coordenadas de la mano: palma +Y, dedos -Z, pulgar +X): entre la yema del índice y la del pulgar, de cara al jugador
const ARG_GRIP = { pos: [.0314, .0784, -.0427], n: [.927, -.333, -.175], spin: .4, s: 1.1 };
const HAND_POSE = {
  closed: { index: [.587, .701, .738], middle: [.647, .571, 1.037], ring: [.475, .818, .459], pinky: [.695, -.202, 1.276], thumb: [[-.719, -.86, -.578], [.664, .243, .16], [.944, -.076, -.134]] },
  open: { index: [.02, .1, .05], middle: [.02, .1, .05], ring: [.03, .12, .06], pinky: [.05, .14, .08], thumb: [[0, 0, 0], [0, 0, 0], [0, 0, 0]] },
  // la argolla la sostienen el pulgar y el índice (en C); corazón, anular y meñique van recogidos
  argolla: { index: [.45, 1, .8], middle: [1.25, 1.55, 1], ring: [1.35, 1.55, 1], pinky: [1.4, 1.5, 1], thumb: [[.1, -.7, 0], [.3, 0, 0], [.4, 0, 0]] }
};
function poseModel(c) {
  const mix = (a, b) => Array.isArray(a) ? a.map((v, i) => mix(v, b[i])) : lerp(b, a, c);
  const G = isRana() ? HAND_POSE.argolla : HAND_POSE.closed;   // la argolla se agarra distinto al tejo
  ['index', 'middle', 'ring', 'pinky'].forEach(f => {
    const J = ['metacarpal', 'phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip'].map(s => `${f}-finger-${s}`);
    bendChain(J, mix(G[f], HAND_POSE.open[f]), 1);
  });
  bendChain(['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip'], mix(G.thumb, HAND_POSE.open.thumb), 0);
}

/* ---------- Manilla tricolor en la muñeca (tapa la unión de la mano con el antebrazo) ---------- */
function manillaTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#fcd116'; g.fillRect(0, 0, 512, 32);          // amarillo: la mitad
  g.fillStyle = '#003893'; g.fillRect(0, 32, 512, 16);
  g.fillStyle = '#ce1126'; g.fillRect(0, 48, 512, 16);
  // tejido en espiga
  for (let x = -64; x < 576; x += 8) {
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 8, 16); g.lineTo(x, 32); g.lineTo(x + 8, 48); g.lineTo(x, 64); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x + 3, 0); g.lineTo(x + 11, 16); g.lineTo(x + 3, 32); g.lineTo(x + 11, 48); g.lineTo(x + 3, 64); g.stroke();
  }
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, 512, 2); g.fillRect(0, 62, 512, 2);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1); t.anisotropy = 4;
  return t;
}
function buildBand(hand) {
  const band = ARM.band = new THREE.Group();
  const RX = .0294, RY = .0224, W = .02;                       // un poco más grande que la muñeca
  const cloth = new THREE.MeshStandardMaterial({ map: manillaTex(), roughness: .9, side: THREE.DoubleSide });
  const tube = new THREE.CylinderGeometry(1, 1, W, 48, 1, true); tube.rotateX(Math.PI / 2); tube.scale(RX, RY, 1);
  band.add(new THREE.Mesh(tube, cloth));
  // bordes redondeados del tejido
  [-W / 2, W / 2].forEach(z => {
    const r = new THREE.TorusGeometry(1, .0022 / RX, 8, 48); r.scale(RX, RY, RX);
    const m = new THREE.Mesh(r, new THREE.MeshStandardMaterial({ color: z < 0 ? '#c9a40f' : '#9e0d1d', roughness: .9 })); m.position.z = z; band.add(m);
  });
  // medalla con el grabado del jugador, del lado de la palma (el que se ve al lanzar)
  const mg = new THREE.CylinderGeometry(.0095, .0095, .003, 28);
  ARM.medal = new THREE.Mesh(mg, [new THREE.MeshStandardMaterial({ color: '#8b8f93', metalness: .85, roughness: .35 }), tejoTopMaterial(COLORS[0], 'sol', ''), new THREE.MeshStandardMaterial({ color: '#8b8f93', metalness: .85, roughness: .35 })]);
  ARM.medal.position.set(0, RY + .0025, 0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.0028, .0008, 6, 16), new THREE.MeshStandardMaterial({ color: '#b9bcbf', metalness: .9, roughness: .3 }));
  ring.position.set(0, RY + .001, .012); ring.rotation.y = Math.PI / 2;
  band.add(ARM.medal, ring);
  band.position.set(0, 0, .07);
  hand.add(band);
}

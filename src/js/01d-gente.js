
/* ================= Gente mirando la partida =================
   Personajes sencillos de pie junto a las paredes, con una cerveza en la mano: se mecen, le dan un sorbo
   de vez en cuando, siguen el tejo con la cabeza y levantan el brazo cuando alguien hace puntos.
   Es decoración: no choca con el tejo. */

let CROWD = [];

function vueltiaoTex() {   // ala del sombrero vueltiao: anillos negros y crema
  const S = 128, [c, g] = cnv(S, S);
  for (let r = 64; r > 0; r -= 4) { g.fillStyle = (r / 4) % 2 ? '#efe4c8' : '#1d1a17'; g.beginPath(); g.arc(64, 64, r, 0, 7); g.fill(); }
  g.globalAlpha = .25; for (let a = 0; a < 64; a++) { g.strokeStyle = '#000'; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(a / 64 * 6.283) * 64, 64 + Math.sin(a / 64 * 6.283) * 64); g.stroke(); }
  g.globalAlpha = 1; return tex(c);
}
function ruanaTex(base, line) {   // ruana de lana con rayas
  const [c, g] = cnv(64, 64);
  g.fillStyle = base; g.fillRect(0, 0, 64, 64);
  g.fillStyle = line; [6, 10, 52, 56].forEach(x => g.fillRect(x, 0, 2, 64));
  g.globalAlpha = .15; for (let i = 0; i < 500; i++) { g.fillStyle = Math.random() < .5 ? '#000' : '#fff'; g.fillRect(rand(0, 64), rand(0, 64), 1, 1); }
  g.globalAlpha = 1; return tex(c);
}

// Un brazo: hombro (gira) → brazo → codo (gira) → antebrazo → mano
function makeArm(mat, skin, side) {
  const sh = new THREE.Group(), el = new THREE.Group();
  const up = new THREE.Mesh(new THREE.CylinderGeometry(.055, .048, .3, 8), mat); up.position.y = -.15; sh.add(up);
  el.position.y = -.3; sh.add(el);
  const fo = new THREE.Mesh(new THREE.CylinderGeometry(.045, .038, .27, 8), skin); fo.position.y = -.135; el.add(fo);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(.045, 8, 6), skin); hand.position.y = -.29; hand.scale.set(.8, 1, .9); el.add(hand);
  sh.position.set(side * .235, 1.48, 0);
  return { sh, el, hand };
}

function makePerson(o) {
  const g = new THREE.Group(), M = c => std({ color: c, roughness: .85 });
  const skin = M(o.skin), shirt = M(o.shirt), pants = M(o.pants), shoe = M('#241d18'), hairM = M(o.hair || '#1c1510');
  const cyl = (rt, rb, h, mat, seg = 10) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  [-1, 1].forEach(s => {   // piernas y zapatos
    const leg = cyl(.078, .066, .84, pants); leg.position.set(s * .095, .48, 0); g.add(leg);
    const sh = new THREE.Mesh(new THREE.BoxGeometry(.1, .07, .24), shoe); sh.position.set(s * .095, .035, .05); g.add(sh);
  });
  const hip = cyl(.175, .165, .16, pants, 14); hip.position.y = .93; hip.scale.z = .75; g.add(hip);
  const torso = cyl(.225, .19, .56, shirt, 14); torso.position.y = 1.28; torso.scale.z = .72; g.add(torso);
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(.215, 14, 8, 0, 6.29, 0, 1.4), shirt); shoulders.scale.set(1.05, .45, .7); shoulders.position.y = 1.5; g.add(shoulders);
  if (o.ruana) {   // ruana sobre los hombros
    const ru = new THREE.Mesh(new THREE.BoxGeometry(.66, .5, .36), std({ map: ruanaTex(o.ruana[0], o.ruana[1]), roughness: 1 }));
    ru.position.y = 1.3; g.add(ru);
    const top = new THREE.Mesh(new THREE.SphereGeometry(.33, 14, 6, 0, 6.29, 0, 1.2), ru.material); top.scale.set(1, .4, .55); top.position.y = 1.52; g.add(top);
  }
  const neck = cyl(.05, .055, .09, skin); neck.position.y = 1.6; g.add(neck);
  const head = new THREE.Group(); head.position.y = 1.64; g.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(.105, 16, 12), skin); skull.scale.set(.9, 1.08, 1); skull.position.y = .1; head.add(skull);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.018, .045, 6), skin); nose.rotation.x = Math.PI / 2; nose.position.set(0, .09, .105); head.add(nose);
  const eyeM = M('#1a1410');
  [-1, 1].forEach(s => { const e = new THREE.Mesh(new THREE.SphereGeometry(.012, 6, 5), eyeM); e.position.set(s * .036, .12, .092); head.add(e);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(.03, .006, .01), hairM); brow.position.set(s * .036, .142, .095); head.add(brow); });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(.036, .006, .01), M('#7a3b2e')); mouth.position.set(0, .045, .1); head.add(mouth);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.11, 16, 8, 0, 6.29, 0, 1.25), hairM); hair.position.set(0, .12, -.012); hair.scale.set(.93, 1.05, 1.02); head.add(hair);
  if (o.longHair) { const back = new THREE.Mesh(new THREE.SphereGeometry(.11, 14, 10), hairM); back.scale.set(1, 1.55, .62); back.position.set(0, .0, -.055); head.add(back); }   // pelo largo, cayendo a la espalda
  if (o.mustache) { const mu = new THREE.Mesh(new THREE.BoxGeometry(.07, .014, .02), hairM); mu.position.set(0, .055, .1); head.add(mu); }
  if (o.hat === 'vueltiao') {
    const t = vueltiaoTex(), mat = std({ map: t, roughness: .9, side: THREE.DoubleSide });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, .012, 28), mat); brim.position.y = .17; head.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(.095, .115, .13, 20), mat); crown.position.y = .24; head.add(crown);
  } else if (o.hat) {   // gorra
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.113, 16, 8, 0, 6.29, 0, 1.45), M(o.hat)); cap.position.y = .13; cap.scale.set(.95, .9, 1.03); head.add(cap);
    const visor = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .01, 16, 1, false, -Math.PI / 2, Math.PI), M(o.hat)); visor.position.set(0, .14, .07); visor.rotation.x = .12; head.add(visor);
  }
  const armR = makeArm(o.ruana ? std({ map: ruanaTex(o.ruana[0], o.ruana[1]), roughness: 1 }) : shirt, skin, -1);
  const armL = makeArm(o.ruana ? armR.sh.children[0].material : shirt, skin, 1);
  g.add(armR.sh, armL.sh);
  const beer = makeBottle(false); beer.position.set(0, -.36, .02); beer.rotation.x = -.15; armR.el.add(beer);   // la cerveza en la mano derecha
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return { g, head, armR, armL };
}

const CROWD_PEOPLE = [   // [x, z desde la cancha, ropa]
  [-2.72, 2.3, { skin: '#c68a5e', shirt: '#f2efe8', pants: '#33415e', hat: 'vueltiao', mustache: true }],
  [-2.95, 5.1, { skin: '#9a6440', shirt: '#6e7a4c', pants: '#3a3128', ruana: ['#7d6a55', '#3e3328'], mustache: true }],
  [2.7, 2.7, { skin: '#d9a47c', shirt: '#f3c22f', pants: '#2c3a5a', hat: '#b8232a' }],
  [3.0, 4.3, { skin: '#b97b52', shirt: '#b8323a', pants: '#2f3d63', longHair: true, hair: '#2a1b12' }],
  [2.8, 6.1, { skin: '#8a5636', shirt: '#2f6b55', pants: '#7a6a52', hat: '#24324f' }]];

function buildCrowd() {
  CROWD = [];
  CROWD_PEOPLE.forEach(([x, dz, o], i) => {
    const p = makePerson(o), z = -W.D + dz;
    p.g.position.set(x, 0, z);
    p.face = Math.atan2(-x, -1.1);   // de cara al pasillo, un poco hacia la cancha: así se les ve desde donde se lanza
    p.g.rotation.y = p.face; hall.add(p.g);
    p.ph = i * 1.7; p.sip = 3 + i * 2.3; p.sipT = -1; p.cheer = -9;
    CROWD.push(p);
  });
}
function crowdCheer() { CROWD.forEach((p, i) => { p.cheer = -i * .12; }); }   // celebran uno tras otro

const _look = new THREE.Vector3();
function updateCrowd(dt) {
  if (!CROWD.length) return;
  const t = performance.now() / 1000;
  CROWD.forEach(p => {
    // se mecen un poquito
    p.g.rotation.z = Math.sin(t * .9 + p.ph) * .012; p.g.rotation.y = p.face + Math.sin(t * .4 + p.ph) * .05;
    // la cabeza sigue el tejo si va volando; si no, mira la cancha
    _look.copy(flight && flight.mesh ? flight.mesh.position : W.C);
    const dx = _look.x - p.g.position.x, dz = _look.z - p.g.position.z;
    const want = clamp(Math.atan2(dx, dz) - p.g.rotation.y, -.9, .9);
    p.head.rotation.y += (want - p.head.rotation.y) * Math.min(1, dt * 4);
    // sorbo de cerveza cada tanto
    let shR = -.35, elR = -1.45, headX = 0;
    if (dt) { p.sip -= dt; if (p.sip <= 0 && p.sipT < 0) { p.sipT = 0; p.sip = rand(7, 14); } }
    if (p.sipT >= 0) {
      p.sipT += dt; const k = Math.sin(clamp(p.sipT / 1.8, 0, 1) * Math.PI);
      shR = -.35 - k * .75; elR = -1.45 - k * .75; headX = -k * .25;
      if (p.sipT > 1.8) p.sipT = -1;
    }
    // celebración: brazo izquierdo arriba y un saltico
    let shL = .05, elL = -.15, hop = 0;
    if (p.cheer > -5) {
      p.cheer += dt; const k = p.cheer > 0 ? Math.sin(clamp(p.cheer / 1.6, 0, 1) * Math.PI) : 0;
      shL = .05 - k * 2.6; elL = -.15 - k * .4; hop = Math.abs(Math.sin(p.cheer * 9)) * .05 * k;
      if (p.cheer > 1.6) p.cheer = -9;
    }
    p.armR.sh.rotation.x = shR; p.armR.el.rotation.x = elR; p.armR.sh.rotation.z = -.12;
    p.armL.sh.rotation.x = shL; p.armL.el.rotation.x = elL; p.armL.sh.rotation.z = .1;
    p.head.rotation.x = headX; p.g.position.y = hop;
  });
}

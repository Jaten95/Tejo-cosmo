
/* ================= Estado ================= */
const DIFF = [{ n: 'Fácil', s: .26 }, { n: 'Normal', s: .14 }, { n: 'Difícil', s: .08 }, { n: 'Maestro', s: .045 }];
const settings = { mode: 'cpu', count: 2, names: ['Javi', 'Pacho', 'Mafe', 'Leo'], designs: ['sol', 'condor', 'colibri', 'cafe'], diff: 1, dist: 18.5, goal: 27, aimHelp: true, muted: false };
/* Cada jugador del mismo celular con un diseño distinto */
function fixLocalDesigns() {
  if (!Array.isArray(settings.designs)) settings.designs = [];
  const used = [];
  for (let i = 0; i < 4; i++) { let d = settings.designs[i]; if (!DESIGN_IDS.includes(d) || used.includes(d)) d = freeDesign(['sol', 'condor', 'colibri', 'cafe'], used); settings.designs[i] = d; used.push(d); }
}
const RETO_THROWS = 10;
let game = null;
let phase = 'boot';          // boot | menu | aim | cpu | flight | result | roundEnd | over
let paused = false;
let flight = null;           // lanzamiento en curso
let drag = null;             // arrastre del jugador
let cpuAim = null;
let dvdP = 1;                // metros de pendiente por unidad de fuerza
let lastP = {};              // última fuerza por jugador
let manoRing = null;
const timers = [];
function later(sec, fn) { timers.push({ t: sec, fn }); }
function tickTimers(dt) { for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } } }

function computeDvdP() {
  const a = predict({ L: 0, P: AIM.P0 - .03 }), b = predict({ L: 0, P: AIM.P0 + .03 });
  dvdP = (a && b) ? Math.max(.3, (toUV(b.p).v - toUV(a.p).v) / .06) : 1.4;
}

function newPlayer(name, i, cpu, design) { return { name, color: COLORS[i], design: design || null, score: 0, cpu: !!cpu, st: { mechas: 0, emb: 0, mon: 0, manos: 0, nulos: 0, tiros: 0 } }; }

function startGame() {
  timers.length = 0; flight && flight.mesh && scene.remove(flight.mesh); flight = null; drag = null; cpuAim = null;
  if (Math.abs(W.D - settings.dist) > .01 || !hall) { setDistance(settings.dist); buildHall(); }
  computeDvdP();
  let players;
  fixLocalDesigns();
  const D = settings.designs;
  if (settings.mode === 'cpu') players = [newPlayer(settings.names[0] || 'Tú', 0, false, D[0]), newPlayer('Don Chepe', 1, true, freeDesign(['sombrero', 'condor', 'sol'], [D[0]]))];
  else if (settings.mode === 'local') players = settings.names.slice(0, settings.count).map((n, i) => newPlayer(n || `Jugador ${i + 1}`, i, false, D[i]));
  else players = [newPlayer(settings.names[0] || 'Tú', 0, false, D[0])];
  game = { players, round: 0, order: [], idx: 0, tejos: [], scored: false, goal: settings.goal, mode: settings.mode, thrown: 0, over: false };
  lastP = {};
  clearFeed();
  showScreen(null); setHud(true);
  startRound();
}

function clearCancha() {
  game && game.tejos.forEach(t => scene.remove(t.mesh));
  if (game) game.tejos = [];
  clearDecals();
  if (manoRing) { cancha.remove(manoRing); manoRing = null; }
  resetMechas(false);
}

function startRound() {
  game.round++; game.scored = false; clearCancha();
  const n = game.players.length, k = (game.round - 1) % n;
  game.order = game.players.map((_, i) => (i + k) % n); game.idx = 0;
  nextThrow();
}

function current() { return game.players[game.order[game.idx]]; }

function nextThrow() {
  const p = current();
  renderBoard(); renderTurn();
  reticle.visible = false; setGauge(0, lastP[p.name]);
  if (online()) return netTurn(p);
  if (p.cpu) {
    phase = 'cpu'; hint('Don Chepe está midiendo…', true);
    planCpu(p);
  } else {
    phase = 'aim';
    hint(game.thrown < 2 ? 'Arrastra hacia abajo para cargar · a los lados para apuntar · suelta' : 'Arrastra y suelta para lanzar', true);
    if (settings.mode === 'local' && game.players.length > 1) toast(`Turno de ${p.name}`);
  }
}

/* ---------- Don Chepe ---------- */
function aimForUV(tu, tv) {
  let lo = 0, hi = 1, L = tu;
  for (let k = 0; k < 2; k++) {
    lo = 0; hi = 1;
    for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2, pr = predict({ L, P: m }); const v = pr ? toUV(pr.p).v : -9; if (v < tv) lo = m; else hi = m; }
    const pr = predict({ L, P: (lo + hi) / 2 }); if (pr) L += tu - toUV(pr.p).u;
  }
  return { L, P: (lo + hi) / 2 };
}
function planCpu(p) {
  const d = DIFF[settings.diff];
  let tu = 0, tv = 0;
  if (settings.diff >= 2 && Math.random() < (settings.diff === 3 ? .7 : .35)) { const a = MECHA_ANG[Math.floor(Math.random() * 4)]; tu = Math.cos(a) * .035; tv = Math.sin(a) * .035; }
  const ideal = aimForUV(tu, tv);
  const sig = d.s * Math.pow(W.D / 18.5, .7);
  const fin = { L: ideal.L + gauss() * sig, P: clamp(ideal.P + gauss() * sig / dvdP, .02, 1) };
  cpuAim = { from: { L: rand(-.5, .5), P: rand(.2, .45) }, to: fin, t: 0, dur: rand(1.1, 1.6) };
}
function updateCpu(dt) {
  if (!cpuAim) return;
  cpuAim.t += dt; const k = ease(clamp(cpuAim.t / cpuAim.dur, 0, 1));
  const wob = Math.sin(cpuAim.t * 5) * .015 * (1 - k);
  const aim = { L: lerp(cpuAim.from.L, cpuAim.to.L, k) + wob, P: lerp(cpuAim.from.P, cpuAim.to.P, k) };
  setGauge(aim.P, lastP[current().name]); showReticle(aim);
  if (cpuAim.t >= cpuAim.dur + .25) { const a = cpuAim.to; cpuAim = null; launch(a); }
}

/* ---------- Puntería del jugador ---------- */
function wobble(holdT, t) {
  const amp = .016 + clamp(holdT - 1.6, 0, 3) * .05;
  return { x: amp * (Math.sin(2.1 * t + 1.3) * .7 + Math.sin(3.7 * t) * .3), y: amp * (Math.sin(1.7 * t + .4) * .7 + Math.sin(4.3 * t + 2) * .3), amp };
}
function currentAim(now) {
  if (!drag) return null;
  const w = wobble((now - drag.t0) / 1000, now / 1000);
  return { L: drag.L + w.x, P: clamp(drag.P + w.y / dvdP, 0, 1), amp: w.amp };
}
function showReticle(aim) {
  if (!aimHelpNow()) { reticle.visible = false; return; }
  const pr = predict(aim);
  if (!pr) { reticle.visible = false; return; }
  reticle.visible = true;
  reticle.position.copy(pr.p).addScaledVector(pr.n, .006);
  reticle.quaternion.setFromUnitVectors(V(0, 0, 1), pr.n);
  reticleCore.color.set(pr.kind === 'clay' ? '#f3c22f' : '#d8392d');
  const s = 1 + (drag ? clamp(((performance.now() - drag.t0) / 1000 - 1.6) * .25, 0, .8) : 0);
  reticle.scale.setScalar(s);
  reticle.userData.uv = pr.kind === 'clay' ? toUV(pr.p) : null;
}

/* ---------- Lanzar ---------- */
function finalAim(aim) { return { L: aim.L + gauss() * .012, P: aim.P + gauss() * .012 / dvdP }; }
function launch(a, opts) {
  const p = current();
  lastP[p.name] = a.P;
  const v0 = aimToVel(a);
  const sim = simulate(V(REL.x, REL.y, REL.z), v0, false);
  const others = game.tejos.map((t, i) => ({ i, u: t.u, v: t.v, valid: t.valid })).filter(o => o.valid);
  const res = evaluate(sim, others);
  const mesh = makeTejo(p.color, p.design, p.name); mesh.position.copy(sim.path[0].p); scene.add(mesh);
  flight = { timeout: !!(opts && opts.timeout), sim, res, mesh, t: 0, owner: game.order[game.idx], ev: 0, done: false, impactAt: sim.first === 'clay' ? sim.firstT : sim.duration, spin: rand(12, 18) * (Math.random() < .5 ? -1 : 1), tilt: V(rand(-.25, .25), 0, rand(-.25, .25)) };
  reticle.visible = false; phase = 'flight'; hint('', false); setGauge(a.P, lastP[p.name]);
  game.thrown++;
  A.whoosh(); buzz(15);
}

function samplePath(path, t) {
  let lo = 0, hi = path.length - 1;
  if (t >= path[hi].t) return path[hi].p.clone();
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (path[m].t <= t) lo = m; else hi = m; }
  const a = path[lo], b = path[hi]; return a.p.clone().lerp(b.p, (t - a.t) / Math.max(1e-6, b.t - a.t));
}

function updateFlight(dt) {
  const f = flight; if (!f || f.done) return;
  const remain = f.impactAt - f.t;
  const slow = (f.res.valid && remain < .32 && remain > -.05 && !reduceMotion) ? .42 : 1;
  f.t += dt * slow;
  const sim = f.sim;
  while (f.ev < sim.events.length && sim.events[f.ev].t <= f.t) { impactEvent(sim.events[f.ev], f); f.ev++; }
  if (f.landed) return;
  const p = samplePath(sim.path, Math.min(f.t, sim.duration));
  f.mesh.position.copy(p);
  const bounced = f.ev > 0;
  f.mesh.rotation.set(f.tilt.x + (bounced ? f.t * 6 : 0), f.t * f.spin, f.tilt.z + (bounced ? f.t * 4 : 0));
  if (f.t >= sim.duration) {
    if (!sim.clay) { f.mesh.position.copy(sim.end); f.mesh.rotation.set(0, rand(0, 6), 0); }
    finishFlight();
  }
}

function impactEvent(e, f) {
  const strong = clamp(e.speed / 12, .3, 1);
  if (e.kind === 'clay') {
    const r = f.res, u = r.u, v = r.v;
    const pose = embedPose(u, v, f.sim.vEnd, r.emb);
    f.mesh.quaternion.copy(pose.q); f.landed = true;
    A.thud(strong); buzz(30);
    dirt(fromUV(u, v, .02), W.n, r.valid ? 30 : 16);
    decal(u, v, T.crater, r.emb ? .1 : .14);
    if (r.hits.length) {
      // cae donde apuntó, choca y se corre; los golpeados se deslizan en la greda
      f.mesh.position.copy(fromUV(r.landU, r.landV, TT * .12));
      slideTo(f.mesh, pose.pos, .16);
      r.moved.forEach(m => { const t = game.tejos[m.i]; if (!t) return;
        const to = t.mesh.position.clone().addScaledVector(W.a, m.u - t.u).addScaledVector(W.s, m.v - t.v);
        slideTo(t.mesh, to, .24); decal(m.u, m.v, T.crater, .12); });
      const c = fromUV(r.contact.u, r.contact.v, .025);
      burst(c, W.n, { count: 26, colors: ['#ffffff', '#ffe9b0', '#ffd27a'], speed: [.8, 2.4], grav: 4, life: .35, size: .022 });
      A.hit(); buzz([20, 20, 40]);
    } else f.mesh.position.copy(pose.pos);
    if (f.res.valid && (f.res.ring || f.res.emb)) A.clank();
    if (f.res.valid) f.res.mechas.forEach((m, i) => later(i * .06, () => { explodeMecha(m); A.boom(f.res.kind === 'monona'); buzz([40, 30, 80]); }));
    if (f.res.mechas && f.res.mechas.length) flashScreen();
    shake = Math.max(shake, reduceMotion ? 0 : .012);
    finishFlight();
  } else if (e.kind === 'floor') { A.floor(); dirt(e.p, V(0, 1, 0), 10); }
  else { A.wood(); shake = Math.max(shake, reduceMotion ? 0 : .006); }
}

function nuloWhy(sim) {
  const z = sim.firstP ? sim.firstP.z : 0;
  if (sim.first === 'frame') return 'Pegó en el marco';
  if (sim.first === 'board') return z < -W.D - .3 ? 'Se fue largo al tablero' : 'Pegó en las tablas';
  if (sim.first === 'wall') return 'Se fue a la pared';
  if (sim.first === 'floor') return z > -W.D + .4 ? 'Se quedó corto' : 'Se fue por un lado';
  return 'Nulo';
}

function finishFlight() {
  const f = flight; if (f.done) return; f.done = true;
  const p = game.players[f.owner], r = f.res;
  (r.moved || []).forEach(m => { const t = game.tejos[m.i]; if (t) { t.u = m.u; t.v = m.v; t.d = Math.hypot(m.u, m.v); } });
  game.tejos.push({ owner: f.owner, mesh: f.mesh, valid: r.valid, d: r.valid ? r.d : Infinity, u: r.u, v: r.v });
  const hitNames = (r.hits || []).map(i => game.tejos[i] && game.tejos[i].owner).filter(o => o !== undefined)
    .map(o => o === f.owner ? 'a su propio tejo' : `al tejo de ${game.players[o].name}`).filter((x, k, a) => a.indexOf(x) === k);
  const hitText = hitNames.length ? `Le pegó ${hitNames.join(' y ')}` : '';
  p.st.tiros++;
  phase = 'result'; resultAt = performance.now();
  const cm = r.valid ? Math.max(0, Math.round((r.d - RT) * 100)) : 0;
  const delay = r.kind === 'monona' ? 2.6 : r.pts ? 2.0 : 1.5;
  later(r.valid ? .12 : .35, () => {
    if (r.pts) {
      p.score += r.pts; game.scored = true;
      if (r.kind === 'mecha') p.st.mechas++; else if (r.kind === 'embocinada') p.st.emb++; else p.st.mon++;
      const label = { mecha: '¡MECHA!', embocinada: '¡EMBOCINADA!', monona: '¡MOÑONA!' }[r.kind];
      announce(label, `${p.name.toUpperCase()} +${r.pts}`, r.kind === 'monona');
      if (r.kind !== 'mecha') A.cheer();
      bumpChip(f.owner); feed(p, `${label.replace(/[¡!]/g, '')} +${r.pts}`);
    } else if (r.valid) {
      toast((hitText ? `¡${hitText}! ` : '') + (cm <= 1 ? 'Quedó pegadito al bocín' : `Quedó a ${cm} cm del bocín`)); feed(p, `Greda · ${cm} cm`);
    } else {
      const why = f.timeout ? 'Se le acabó el tiempo' : nuloWhy(f.sim);
      p.st.nulos++; announce('NULO', why.toUpperCase(), false, true); A.aww(); feed(p, `Nulo · ${why.toLowerCase()}`);
    }
    if (hitText) feed(p, hitText);
    renderBoard();
  });
  flight = null;
  later(delay, advance);
}

function advance() {
  if (phase === 'over') return;
  const leader = game.players.find(p => p.score >= game.goal);
  if (game.mode !== 'reto' && leader) return gameOver(leader);
  if (game.mode === 'reto') {
    if (game.thrown >= RETO_THROWS) return gameOver(game.players[0]);
    return startRound();
  }
  game.idx++;
  if (game.idx < game.order.length) return nextThrow();
  endRound();
}

function endRound() {
  phase = 'roundEnd'; resultAt = performance.now();
  if (game.scored) { toast('Hubo puntos: esta ronda no hay mano'); later(1.3, startRound); return; }
  const valid = game.tejos.filter(t => t.valid).sort((a, b) => a.d - b.d);
  if (!valid.length) { toast('Nadie cayó en la greda: sin mano'); later(1.4, startRound); return; }
  const best = valid[0], p = game.players[best.owner];
  p.score += 1; p.st.manos++;
  manoRing = new THREE.Mesh(new THREE.RingGeometry(RT * 1.25, RT * 1.6, 40), new THREE.MeshBasicMaterial({ color: p.color, transparent: true, depthWrite: false }));
  manoRing.position.set(best.u, best.v, .006); manoRing.renderOrder = 6; cancha.add(manoRing);
  toast(`Mano para ${p.name} +1`); feed(p, 'Mano +1'); bumpChip(best.owner); renderBoard(); A.tick();
  closeup = { u: best.u, v: best.v };
  later(1.9, () => { closeup = null; const leader = game.players.find(q => q.score >= game.goal); if (leader) gameOver(leader); else startRound(); });
}

function gameOver(winner) {
  phase = 'over'; game.over = true; reticle.visible = false; hint('', false);
  if (online()) netGameOver();
  later(.9, () => { setHud(false); renderOver(winner); showScreen('over'); });
}

/* ================= Cámaras ================= */
const camCur = { pos: V(0, 2, 4), look: V(0, 1, -10), fov: 40 };
let closeup = null, orbit = 0;
function aimPose() {
  const dist = W.D + 2.1, span = Math.max(2.7, 2.0 / cam.aspect);
  const t = performance.now() / 1000;
  return { pos: V(Math.sin(t * .5) * .02, 1.78 + Math.sin(t * .8) * .01, 2.1), look: V(0, CY - .1, -W.D), fov: 2 * Math.atan(span / 2 / dist) * 180 / Math.PI };
}
function closePose(u = 0, v = 0) {
  const c = fromUV(u * .6, v * .6);
  const portrait = cam.aspect < 1;
  return { pos: c.clone().addScaledVector(W.n, portrait ? 1.55 : 1.2).add(V(.18, .12, 0)), look: c, fov: portrait ? 44 : 36 };
}
function updateCamera(dt) {
  let tgt, k = 5;
  if (phase === 'menu' || phase === 'boot' || phase === 'over') {
    orbit += dt * .12;
    const r = 3.4, c = W.C;
    tgt = { pos: V(Math.sin(orbit) * r * .8, 1.5 + Math.sin(orbit * .7) * .3, c.z + Math.cos(orbit) * r * .6 + 2.2), look: c.clone().add(V(0, .1, 0)), fov: 42 }; k = 2;
  } else if (phase === 'flight' && flight) {
    const f = flight, p = f.mesh.position, remain = f.impactAt - f.t;
    const chase = { pos: p.clone().add(V(.15, .38, 1.35)), look: p.clone().lerp(W.C, .45), fov: 48 };
    if (f.res.valid && remain < .55) { tgt = closePose(f.res.u, f.res.v); k = 7; }
    else if (f.t < .12) { tgt = aimPose(); k = 6; }
    else { tgt = chase; k = 9; }
    if (!f.res.valid && f.ev > 0) { tgt = { pos: p.clone().add(V(.6, .9, 2.2)), look: p.clone(), fov: 46 }; k = 4; }
  } else if (phase === 'result' || phase === 'roundEnd') {
    const last = game && game.tejos[game.tejos.length - 1];
    if (closeup) tgt = closePose(closeup.u, closeup.v);
    else if (last && last.valid) tgt = closePose(last.u, last.v);
    else if (last) tgt = { pos: last.mesh.position.clone().add(V(.7, 1.0, 2.3)), look: last.mesh.position.clone(), fov: 46 };
    else tgt = aimPose();
    k = 3;
  } else tgt = aimPose();
  const a = 1 - Math.exp(-k * dt);
  camCur.pos.lerp(tgt.pos, a); camCur.look.lerp(tgt.look, a); camCur.fov = lerp(camCur.fov, tgt.fov, a);
  cam.position.copy(camCur.pos);
  if (shake > 0) { cam.position.add(V(gauss() * shake, gauss() * shake, 0)); shake = Math.max(0, shake - dt * .08); }
  cam.fov = camCur.fov; cam.updateProjectionMatrix(); cam.lookAt(camCur.look);
  // lupa: sigue la mira dentro de la greda
  const ru = reticle.visible && reticle.userData.uv ? reticle.userData.uv : { u: 0, v: 0 };
  const lu = clamp(ru.u, -.25, .25), lv = clamp(ru.v, -.3, .3);
  lupaCur.u = lerp(lupaCur.u, lu, 1 - Math.exp(-4 * dt)); lupaCur.v = lerp(lupaCur.v, lv, 1 - Math.exp(-4 * dt));
  const lc = fromUV(lupaCur.u, lupaCur.v);
  lupaCam.position.copy(lc).addScaledVector(W.n, 1.15); lupaCam.up.copy(W.s); lupaCam.lookAt(lc);
}
const lupaCur = { u: 0, v: 0 };

/* ================= Bucle ================= */
let lastT = performance.now();
function updateGame(dt, now) {
  if (phase === 'aim' && drag) {
    const aim = currentAim(now); drag.aim = aim;
    setGauge(drag.P, lastP[current().name]); showReticle(aim);
    if (aim.amp > .06 && !drag.warned) { drag.warned = true; hint('¡Te tiembla el pulso! Suelta ya', true); }
    if (online()) netAim(aim, now);
  }
  if (phase === 'wait') netWatch();
  if (phase === 'cpu') updateCpu(dt);
  if (phase === 'flight') updateFlight(dt);
  mechaMeshes.forEach(m => { if (m.userData.grow !== undefined) { m.userData.grow += dt * 3; const s = ease(clamp(m.userData.grow, 0, 1)); m.scale.setScalar(Math.max(.01, s)); if (m.userData.grow >= 1) delete m.userData.grow; } });
  if (manoRing) { const s = 1 + Math.sin(now / 160) * .12; manoRing.scale.set(s, s, 1); }
  if (reticle.visible) reticle.rotation.z += dt * .8;
}
function lupaOn() { return aimHelpNow() && !document.getElementById('hud').hidden && (phase === 'aim' || phase === 'cpu' || phase === 'wait' || (phase === 'flight' && flight && flight.t < flight.impactAt - .55)); }
function render() {
  const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
  renderer.setScissorTest(false); renderer.setViewport(0, 0, w, h); renderer.clear(); renderer.render(scene, cam); renderArm(w, h);
  const el = document.getElementById('lupa'); const show = lupaOn();
  el.style.visibility = show ? 'visible' : 'hidden';
  if (show) {
    const r = el.getBoundingClientRect(), b = 3;
    const x = r.left + b, y = h - (r.bottom - b), s = r.width - b * 2;
    renderer.setScissorTest(true); renderer.setScissor(x, y, s, s); renderer.setViewport(x, y, s, s);
    lupaCam.aspect = 1; lupaCam.updateProjectionMatrix();
    renderer.clear(); renderer.render(scene, lupaCam); renderer.setScissorTest(false);
  }
}
function frame(now) {
  const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
  if (!paused) { tickTimers(dt); updateGame(dt, now); updateFx(dt); }
  updateArm(paused ? 0 : dt, now);
  updateCamera(paused ? 0 : dt);
  render();
  requestAnimationFrame(frame);
}

/* Desliza un tejo hasta su nuevo lugar en la greda (solo se ve; la posición ya quedó calculada) */
function slideTo(mesh, to, dur) {
  const from = mesh.position.clone(); let t = 0;
  if (reduceMotion) { mesh.position.copy(to); return; }
  addFx({ update(dt) { t += dt; const k = Math.min(1, t / dur), e = 1 - Math.pow(1 - k, 3); mesh.position.lerpVectors(from, to, e); return k < 1; } });
}


/* ================= Interfaz ================= */
const $ = id => document.getElementById(id);
const fmtD = d => d.toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' m';
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
};
function saveSettings() { store.set('tejo.settings.v1', settings); }
function loadSettings() { const s = store.get('tejo.settings.v1', null); if (s) Object.assign(settings, s); }
function records() { return store.get('tejo.record.v1', {}); }

function showScreen(id) { document.querySelectorAll('.screen').forEach(s => s.hidden = s.id !== id); }
function setHud(on) { $('hud').hidden = !on; keepAwake(on); $('btnRx').hidden = !(on && online()); if (!on || !online()) closeRxTray(); }
function hint(text, on) { const h = $('hint'); if (text) h.textContent = text; h.classList.toggle('off', !on); }
let toastTimer;
function toast(text) { const t = $('toast'); t.textContent = text; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1900); }
function announce(title, pts, big, nulo) {
  const a = $('announce'); $('annT').textContent = title; $('annP').textContent = pts;
  a.classList.remove('show', 'big'); void a.offsetWidth;
  a.classList.toggle('big', !!big); a.classList.add('show');
  $('annT').style.textShadow = nulo ? '3px 3px 0 #4c3a29, 6px 6px 0 #120d08' : '';
}
function flashScreen() { if (reduceMotion) return; const f = $('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
function clearFeed() { $('feed').innerHTML = ''; }
function feed(p, text) {
  const el = document.createElement('div'); el.style.setProperty('--c', p.color); el.textContent = `${p.name} · ${text}`;
  const f = $('feed'); f.appendChild(el); while (f.children.length > 3) f.removeChild(f.firstChild);
}
function bumpChip(i) { if (game && game.teams && game.players[i]) i = game.players[i].team; const c = $('board').children[i]; if (!c) return; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
function setGauge(P, last) {
  $('gaugeFill').style.height = (clamp(P, 0, 1) * 100) + '%';
  const l = $('gaugeLast'); if (last === undefined) l.style.display = 'none'; else { l.style.display = 'block'; l.style.bottom = (last * 100) + '%'; }
}
function renderBoard() {
  if (!game) return;
  const cur = (phase === 'over' || !game.order.length) ? -1 : game.order[game.idx];
  const b = $('board'); b.innerHTML = '';
  if (game.teams) { renderTeamBoard(b, cur); return; }
  b.classList.toggle('many', game.players.length > 4);
  game.players.forEach((p, i) => {
    const away = online() && NET.sala && p.pid !== NET.pid && !presentPids(NET.sala.peers()).has(p.pid);
    const c = document.createElement('div'); c.className = 'chip' + (i === cur ? ' on' : '') + (away ? ' off' : ''); c.style.setProperty('--c', p.color);
    const goal = game.mode === 'reto' ? null : game.goal;
    c.innerHTML = `<div class="nm"></div><div class="sc">${p.score}<small>${goal ? '/ ' + goal : 'pts'}</small></div>` + (goal ? `<div class="bar"><i style="width:${Math.min(100, p.score / goal * 100)}%"></i></div>` : '');
    const nm = c.querySelector('.nm'); const ic = document.createElement('img'); ic.className = 'ic'; ic.alt = ''; ic.src = designIcon(p.design, p.color, p.name);
    nm.append(ic, document.createTextNode(p.name + (p.cpu ? ' · ' + DIFF[settings.diff].n.toLowerCase() : '') + (online() && p.pid === NET.pid ? ' · tú' : '') + (away ? ' · sin señal' : '')));
    b.appendChild(c);
  });
  if (game.mode === 'reto') {
    const r = records()[settings.dist];
    const c = document.createElement('div'); c.className = 'chip'; c.style.setProperty('--c', '#f5eddd');
    c.innerHTML = `<div class="nm">Récord · ${fmtD(settings.dist)}</div><div class="sc">${r ?? '—'}<small>pts</small></div>`; b.appendChild(c);
  }
  boardHeight();
}
/* Marcador por equipos: puntos sumados y los grabados de sus jugadores (el que lanza, resaltado) */
function renderTeamBoard(b, cur) {
  b.classList.remove('many');
  const curTeam = cur >= 0 ? game.players[cur].team : -1;
  game.teams.forEach((t, ti) => {
    const s = teamScore(t);
    const c = document.createElement('div'); c.className = 'chip' + (ti === curTeam ? ' on' : ''); c.style.setProperty('--c', t.color);
    c.innerHTML = `<div class="nm"></div><div class="sc">${s}<small>/ ${game.goal}</small></div><div class="mb"></div><div class="bar"><i style="width:${Math.min(100, s / game.goal * 100)}%"></i></div>`;
    c.querySelector('.nm').textContent = 'Equipo ' + t.name + (online() && t.members.some(i => game.players[i].pid === NET.pid) ? ' · tú' : '');
    const mb = c.querySelector('.mb');
    t.members.forEach(i => { const p = game.players[i]; const im = document.createElement('img'); im.alt = p.name; im.title = p.name; im.src = designIcon(p.design, p.color, p.name); if (i === cur) im.className = 'on'; mb.appendChild(im); });
    b.appendChild(c);
  });
  boardHeight();
}
function boardHeight() { try { document.documentElement.style.setProperty('--bh', $('board').offsetHeight + 'px'); } catch (e) { } }
function renderTurn() {
  const p = current();
  $('turnWho').textContent = game.mode === 'reto' ? `Tejo ${game.thrown + 1} de ${RETO_THROWS}` : (p.cpu ? 'Lanza Don Chepe' : (online() && p.pid === NET.pid) ? 'Te toca' : `Lanza ${p.name}`);
  $('turnWho').style.color = p.color === COLORS[3] ? 'var(--yellow)' : '';
  const tm = teamOf(p);
  $('turnMeta').textContent = game.mode === 'reto' ? `${fmtD(W.D)} · mecha 3 · embocinada 6 · moñona 9` : `${tm ? 'Equipo ' + tm.name + ' · ' : ''}${online() ? 'Sala ' + NET.code + ' · ' : ''}Ronda ${game.round} · ${fmtD(W.D)} · partida a ${game.goal}`;
}
function renderOver(winner) {
  const tbl = $('overStats');
  const ts = p => teamOf(p) ? teamScore(teamOf(p)) : 0;
  const rows = [...game.players].map((p, i) => ({ p, i })).sort((a, b) => (ts(b.p) - ts(a.p)) || (b.p.score - a.p.score));
  const won = p => game.mode !== 'reto' && (winner.team ? p.team === winner.idx : p === winner);
  tbl.innerHTML = `<tr><th>Jugador</th><th>Pts</th><th>Mecha</th><th>Emboc.</th><th>Moñona</th><th>Mano</th><th>Nulo</th></tr>` +
    rows.map(({ p }) => `<tr class="${won(p) ? 'win' : ''}" style="--c:${p.color}"><td></td><td>${p.score}</td><td>${p.st.mechas}</td><td>${p.st.emb}</td><td>${p.st.mon}</td><td>${p.st.manos}</td><td>${p.st.nulos}</td></tr>`).join('');
  [...tbl.querySelectorAll('tr')].slice(1).forEach((tr, k) => tr.firstChild.textContent = rows[k].p.name);
  if (game.mode === 'reto') {
    const recs = records(), prev = recs[settings.dist], sc = winner.score;
    const isNew = prev === undefined || sc > prev; if (isNew) { recs[settings.dist] = sc; store.set('tejo.record.v1', recs); }
    $('overEyebrow').textContent = `Reto de ${RETO_THROWS} tejos · ${fmtD(settings.dist)}`;
    $('overWinner').textContent = `${sc} puntos`;
    $('overLine').textContent = isNew ? (prev === undefined ? 'Primer récord a esta distancia.' : `¡Nuevo récord! El anterior era ${prev}.`) : `Tu récord a esta distancia es ${prev}.`;
    $('btnAgain').textContent = 'Otra vez';
  } else if (winner.team) {
    const t = game.teams[winner.idx], names = t.members.map(i => game.players[i].name);
    const others = game.teams.filter((x, i) => i !== winner.idx).map(teamScore);
    $('overEyebrow').textContent = `Partida a ${game.goal} por equipos · ${fmtD(settings.dist)}`;
    $('overWinner').textContent = `Ganó el equipo ${t.name}`;
    $('overLine').textContent = `${names.slice(0, -1).join(', ')}${names.length > 1 ? ' y ' : ''}${names[names.length - 1]}: ${winner.score} a ${others.join(' a ')} en ${game.round} ${game.round === 1 ? 'ronda' : 'rondas'}.`;
    $('btnAgain').textContent = 'Revancha';
  } else {
    const others = rows.filter(r => r.p !== winner).map(r => r.p.score);
    $('overEyebrow').textContent = `Partida a ${game.goal} · ${fmtD(settings.dist)}`;
    $('overWinner').textContent = `Ganó ${winner.name}`;
    $('overLine').textContent = winner.cpu ? `Don Chepe te ganó ${winner.score} a ${others[0]} en ${game.round} rondas.` :
      `${winner.score} a ${others.join(' a ')} en ${game.round} ${game.round === 1 ? 'ronda' : 'rondas'}.` + (game.mode === 'cpu' ? ' Don Chepe pide la revancha.' : '');
    $('btnAgain').textContent = 'Revancha';
  }
  const on = online();
  $('btnAgain').disabled = on && !amHost();
  if (on && !amHost()) $('btnAgain').textContent = 'Esperando revancha';
  $('btnOverMenu').textContent = on ? 'Salir de la sala' : 'Menú';
}

/* ---------- Menú ---------- */
function setSeg(id, val) { $(id).querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(val)))); }
function renderMenu() {
  fixLocalDesigns();
  setSeg('segMode', settings.mode); setSeg('segCount', settings.count); setSeg('segDiff', settings.diff); setSeg('segDist', settings.dist); setSeg('segGoal', settings.goal);
  $('swAim').setAttribute('aria-checked', String(settings.aimHelp));
  $('grpDiff').hidden = settings.mode !== 'cpu';
  $('grpGoal').hidden = settings.mode === 'reto';
  $('segCount').hidden = settings.mode !== 'local';
  const allowed = teamsAllowed(settings.count);
  $('grpTeams').hidden = settings.mode !== 'local' || allowed.length < 2;
  if (!allowed.includes(settings.teams)) settings.teams = 0;
  setSeg('segTeams', settings.teams);
  $('segTeams').querySelector('[data-v="3"]').hidden = !allowed.includes(3);
  $('grpOnline').hidden = settings.mode !== 'online';
  $('btnPlay').textContent = settings.mode === 'online' ? 'Crear sala' : 'A jugar';
  $('btnPlay').disabled = settings.mode === 'online' && !NET.room;
  renderMenuOnline();
  $('lblNames').textContent = settings.mode === 'local' ? 'Jugadores' : 'Tu nombre';
  const n = settings.mode === 'local' ? settings.count : 1, box = $('names'); box.innerHTML = '';
  box.style.gridTemplateColumns = n === 1 ? '1fr' : '1fr 1fr';
  for (let i = 0; i < n; i++) {
    const l = document.createElement('label'); l.style.setProperty('--c', COLORS[i]);
    const inp = document.createElement('input'); inp.id = 'name' + i; inp.maxLength = 14; inp.value = settings.names[i] || ''; inp.placeholder = `Jugador ${i + 1}`; inp.autocomplete = 'off';
    inp.setAttribute('aria-label', `Nombre del jugador ${i + 1}`);
    inp.addEventListener('input', () => { settings.names[i] = inp.value.trim(); saveSettings(); const im = l.querySelector('img'); if (settings.designs[i] === 'ini') im.src = designIcon('ini', COLORS[i], settings.names[i]); });
    const dz = document.createElement('button'); dz.type = 'button'; dz.className = 'dz'; dz.id = 'dz' + i;
    dz.setAttribute('aria-label', `Grabado del jugador ${i + 1}: ${designName(settings.designs[i])}`);
    const im = document.createElement('img'); im.alt = ''; im.src = designIcon(settings.designs[i], COLORS[i], settings.names[i]); dz.appendChild(im);
    dz.addEventListener('click', e => {
      e.preventDefault();
      const taken = settings.mode === 'local' ? settings.designs.filter((d, k) => k !== i && k < settings.count) : (settings.mode === 'cpu' ? ['sombrero'] : []);
      openPicker({ title: settings.mode === 'local' ? `Grabado de ${settings.names[i] || 'Jugador ' + (i + 1)}` : 'Escoge tu grabado', current: settings.designs[i], taken, color: COLORS[i], name: settings.names[i],
        onPick: id => { settings.designs[i] = id; saveSettings(); renderMenu(); } });
    });
    l.append(dz, inp); box.appendChild(l);
  }
  const r = records()[settings.dist];
  $('recordLine').textContent = r !== undefined ? `Tu récord en el reto a ${fmtD(settings.dist)}: ${r} puntos` : '';
}
function showMenu() {
  if (NET.sala) netLeave();
  phase = 'menu'; paused = false; timers.length = 0; drag = null; cpuAim = null;
  if (flight) { scene.remove(flight.mesh); flight = null; }
  if (game) clearCancha(); game = null; reticle.visible = false;
  setHud(false); renderMenu(); showScreen('menu');
}
function bindSeg(id, key, conv) {
  $(id).addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    settings[key] = conv(b.dataset.v); saveSettings(); renderMenu(); A.init(); A.tick();
    if (key === 'dist' && phase === 'menu') { setDistance(settings.dist); buildHall(); computeDvdP(); }
  });
}

/* ---------- Pausa ---------- */
function pause() {
  if (!game || paused || phase === 'over' || phase === 'menu') return;
  if (online()) { $('pauseInfo').textContent = `Sala ${NET.code} · la partida sigue mientras ves este menú. Si no ves los tiros de los demás, toca Reconectar.`; $('btnRestart').hidden = true; $('btnReconnect').hidden = false; $('btnMenu').textContent = 'Salir de la sala'; showScreen('pause'); return; }
  $('btnRestart').hidden = false; $('btnReconnect').hidden = true; $('btnMenu').textContent = 'Menú';
  paused = true; drag = null; if (phase === 'aim') { setGauge(0, lastP[current().name]); reticle.visible = false; }
  $('pauseInfo').textContent = game.mode === 'reto' ? `Reto · tejo ${Math.min(game.thrown + 1, RETO_THROWS)} de ${RETO_THROWS} · ${fmtD(W.D)}` : `Ronda ${game.round} · partida a ${game.goal} · ${fmtD(W.D)}`;
  showScreen('pause');
}
function resume() { paused = false; showScreen(null); }
function updateSoundBtn() { $('btnSound').classList.toggle('muted', settings.muted); $('btnSound').setAttribute('aria-label', settings.muted ? 'Activar sonido' : 'Silenciar'); }

/* ---------- Entrada ---------- */
let resultAt = 0;
/* Tocar la pantalla adelanta la espera entre tiros (y salta la repetición) */
function skipWait() { if (replay) { endReplay(); return; } timers.forEach(t => t.t = Math.min(t.t, .05)); }
function bindInput() {
  const cv = renderer.domElement;
  cv.addEventListener('pointerdown', e => {
    A.init();
    if (paused || !game) return;
    if (phase === 'result' || phase === 'roundEnd') { if (performance.now() - resultAt > 700) skipWait(); return; }
    if (phase !== 'aim' || drag || armBusy()) return;
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), L: 0, P: 0 };
    try { cv.setPointerCapture(e.pointerId); } catch (er) { }
    hint('Suelta para lanzar · arrastra arriba del todo para cancelar', true);
  });
  cv.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    drag.L = clamp(dx / (innerWidth * .5) * AIM.L, -AIM.L, AIM.L);
    drag.P = clamp(dy / (innerHeight * .42), 0, 1);
  });
  const up = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const aim = currentAim(performance.now()); const P = drag.P; drag = null;
    if (phase !== 'aim') return;
    if (P < .06) { if (online()) netAim(null); reticle.visible = false; setGauge(0, lastP[current().name]); hint('Arrastra más hacia abajo para darle fuerza', true); return; }
    const fa = finalAim(aim);
    armRelease(() => { if (phase !== 'aim') return; if (online()) netThrow(fa); else launch(fa); });
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', e => { if (drag && e.pointerId === drag.id) { drag = null; reticle.visible = false; } });
  window.addEventListener('keydown', e => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (e.key === 'Escape') { $('pause').hidden ? pause() : resume(); return; }
    if (paused || !game) return;
    if ((phase === 'result' || phase === 'roundEnd') && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); if (performance.now() - resultAt > 700) skipWait(); return; }
    if (phase !== 'aim') return;
    const keys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    if (keys[e.key]) {
      e.preventDefault(); A.init();
      if (!drag) drag = { id: 'kb', L: 0, P: lastP[current().name] ?? .4, t0: performance.now() };
      const f = e.shiftKey ? .25 : 1;
      drag.L = clamp(drag.L + keys[e.key][0] * .02 * f, -AIM.L, AIM.L);
      drag.P = clamp(drag.P + keys[e.key][1] * .01 * f, 0, 1);
      drag.t0 = performance.now();
      hint('Flechas para apuntar · Shift afina · Espacio lanza', true);
    } else if ((e.key === ' ' || e.key === 'Enter') && drag && drag.id === 'kb') {
      e.preventDefault(); const aim = currentAim(performance.now()); drag = null; if (aim.P >= .06) { const fa = finalAim(aim); armRelease(() => { if (phase !== 'aim') return; if (online()) netThrow(fa); else launch(fa); }); }
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && !online()) pause(); });
}

function bindUI() {
  bindSeg('segMode', 'mode', v => v); bindSeg('segCount', 'count', Number); bindSeg('segDiff', 'diff', Number);
  bindSeg('segDist', 'dist', Number); bindSeg('segGoal', 'goal', Number); bindSeg('segTeams', 'teams', Number);
  $('swAim').addEventListener('click', () => { settings.aimHelp = !settings.aimHelp; saveSettings(); renderMenu(); });
  $('btnPlay').addEventListener('click', () => { A.init(); A.tick(); if (settings.mode === 'online') netCreate(); else startGame(); });
  $('btnRules').addEventListener('click', () => showScreen('rules'));
  $('btnRulesBack').addEventListener('click', () => { showScreen('menu'); });
  $('btnPause').addEventListener('click', pause);
  $('btnResume').addEventListener('click', resume);
  $('btnReconnect').addEventListener('click', () => { resume(); toast('Reconectando a la sala…'); netRejoin(); });
  $('btnRestart').addEventListener('click', () => { paused = false; clearCancha(); startGame(); });
  $('btnMenu').addEventListener('click', showMenu);
  $('btnAgain').addEventListener('click', () => { if (online()) return netRematch(); clearCancha(); startGame(); });
  $('btnOverMenu').addEventListener('click', showMenu);
  $('pickClose').addEventListener('click', closePicker);
  $('picker').addEventListener('click', e => { if (e.target === $('picker')) closePicker(); });
  $('btnSound').addEventListener('click', () => { A.init(); settings.muted = !settings.muted; A.setMuted(settings.muted); saveSettings(); updateSoundBtn(); });
  bindInput(); netBindUI();
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
}

/* ================= Recarga en caliente ================= */
function snapshot() {
  const base = { settings: { ...settings } };
  if (!game || game.over || phase === 'menu' || online()) return base;
  return {
    ...base, lastP, pending: phase === 'result' || phase === 'roundEnd',
    game: {
      players: game.players, teamsN: game.teams ? game.teams.length : 0, round: game.round, order: game.order, idx: game.idx, goal: game.goal, mode: game.mode, thrown: game.thrown, scored: game.scored,
      mk: mechaMeshes.map(m => m.userData.alive ? 1 : 0),
      tejos: game.tejos.map(t => ({ owner: t.owner, valid: t.valid, d: isFinite(t.d) ? t.d : null, u: t.u, v: t.v, p: t.mesh.position.toArray(), q: t.mesh.quaternion.toArray() }))
    }
  };
}
function restore(data) {
  if (!data || !data.game) return false;
  try {
    const g = data.game;
    game = { ...g, tejos: [], over: false };
    game.teams = applyTeams(game.players, g.teamsN || 0);
    g.tejos.forEach(t => {
      const pl = game.players[t.owner]; const m = makeTejo(pl.color, pl.design, pl.name); m.position.fromArray(t.p); m.quaternion.fromArray(t.q); scene.add(m);
      game.tejos.push({ ...t, d: t.d == null ? Infinity : t.d, mesh: m });
      if (t.valid) decal(t.u, t.v, T.crater, .14);
    });
    applyMechas(g.mk);
    lastP = data.lastP || {};
    showScreen(null); setHud(true); clearFeed();
    if (data.pending) { phase = 'result'; advance(); } else nextThrow();
    return true;
  } catch (e) { game = null; return false; }
}

/* ================= Arranque ================= */
async function boot(data) {
  const ld = $('loading');
  if (!window.THREE) { ld.textContent = 'No se pudo cargar el motor 3D. Revisa la conexión y vuelve a abrir la página.'; return; }
  loadSettings();
  if (data && data.settings) Object.assign(settings, data.settings);
  try { await Promise.race([document.fonts.load('64px "Alfa Slab One"'), new Promise(r => setTimeout(r, 1800))]); } catch (e) { }
  buildRenderer(); buildTextures(); buildArm();
  setDistance(settings.dist); buildHall(); computeDvdP();
  resize(); addEventListener('resize', resize);
  A.muted = settings.muted; updateSoundBtn(); netInit(); bindUI();
  ld.remove();
  if (!restore(data)) showMenu();
  requestAnimationFrame(t => { lastT = t; requestAnimationFrame(frame); });
}
(function () {
  const hot = window.claude && window.claude.hot;
  try { hot && hot.snapshot && hot.snapshot(snapshot); } catch (e) { }
  const go = d => boot(d || {});
  if (hot && hot.ready) hot.ready(go); else go(hot && hot.data || {});
})();

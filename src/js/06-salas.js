
/* ================= Salas en línea =================
   Todo viaja por "presence" de una sala con nombre (tejo-<código>):
   - cada jugador publica {pid, name}; mientras apunta, {aim}; al soltar, {t}
   - el anfitrión publica {g}: asientos, configuración, último tiro aceptado y una foto del estado
   - cada teléfono corre el mismo motor con los mismos tiros, así todos ven lo mismo */
const NET = { room: null, ready: false, sala: null, code: null, pid: null, g: null, lastG: null, myG: null, lostAt: 0, pending: {}, lastAimSent: 0, absent: {}, joinedAt: 0, creator: false, unsub: null };
const r4 = x => Math.round(x * 1e4) / 1e4, r5 = x => Math.round(x * 1e5) / 1e5;
const rid = () => Math.random().toString(36).slice(2, 8);
function online() { return !!(game && game.mode === 'online'); }
function amHost() { return !!(NET.g && NET.g.host === NET.pid); }
function aimHelpNow() { return online() ? !!game.aimHelp : settings.aimHelp; }
// En las salas manda la configuración del anfitrión: mira, lupa, barra de fuerza y zoom
function lupaNow() { return online() ? !!game.aimHelp && game.lupa !== false : settings.aimHelp && settings.lupa; }
function powerNow() { return online() ? game.power !== false : settings.power; }
function zoomNow() { return online() ? clamp(+game.zoom || 0, 0, 1) : settings.zoom || 0; }
function hostRules() { return { aimHelp: settings.aimHelp, lupa: !!(settings.aimHelp && settings.lupa), power: !!settings.power, zoom: settings.zoom || 0 }; }
const RULE_KEYS = ['aimHelp', 'lupa', 'power', 'zoom'];
function pickRules(o) { const r = {}; RULE_KEYS.forEach(k => { if (o[k] !== undefined) r[k] = o[k]; }); return r; }
function myName() { return (settings.names[0] || 'Jugador').slice(0, 14); }

function netInit() {
  try { NET.pid = sessionStorage.getItem('tejo.pid'); } catch (e) { }
  if (!NET.pid) { NET.pid = rid() + rid(); try { sessionStorage.setItem('tejo.pid', NET.pid); } catch (e) { } }
  const c = window.claude;
  if (c && typeof c.use === 'function') {
    NET.via = 'claude';
    c.use('room').then(r => { NET.room = r; NET.ready = true; renderMenu(); }).catch(() => { NET.ready = true; renderMenu(); });
  } else {
    NET.via = 'supabase';
    supaRoom().then(r => { NET.room = r; NET.ready = true; renderMenu(); }).catch(() => { NET.ready = true; renderMenu(); });
  }
  setInterval(netTick, 1000);
}

/* ---------- Salas fuera de Claude: Supabase Realtime ----------
   Misma forma que la sala de Claude (presence / peers / onPeers / leave).
   La mira en vivo viaja por broadcast; el resto por presence. */
const SUPA = {
  url: 'https://iqttymzbjjftjxdzgagn.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxdHR5bXpiampmdGp4ZHpnYWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1MDQ0OTksImV4cCI6MjExMDA4MDQ5OX0._HKDTC7-nM8MLmXUSqugFsMyEXYKY9v9xwTsRv2nrzk',
  lib: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.js'
};
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
/* Límites del plan gratis de Supabase: 5 llamadas de presence por cliente cada 30 s y
   100 mensajes por segundo en todo el proyecto (si se pasa, desconecta a todos).
   Por eso presence solo dice quién está (una vez al entrar) y el estado del juego viaja
   por broadcast: cada uno manda su estado completo cuando cambia, y lo reenvía cuando
   alguien entra para que el recién llegado se ponga al día. */
async function supaRoom() {
  if (!window.supabase) await loadScript(SUPA.lib);
  const client = window.supabase.createClient(SUPA.url, SUPA.key, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 20 } } });
  return {
    join(name) {
      return new Promise((resolve, reject) => {
        const key = NET.pid + '.' + rid();
        const ch = client.channel(name, { config: { presence: { key }, broadcast: { self: false } } });
        const handlers = new Set(), remote = {}, aims = {};
        let my = {}, peers = [], joined = false, closed = false, tracked = false, resendT = 0, lastFull = 0, notifyQ = false, sendQ = false, lastBody = '';
        const ident = () => ({ pid: my.pid, name: my.name });
        const rebuild = () => {
          const st = ch.presenceState(), out = [];
          for (const k in st) {
            if (k === key) continue;
            const metas = st[k] || [], m = metas[metas.length - 1] || {};
            const pres = Object.assign({ pid: m.pid, name: m.name }, remote[k] || {});
            if (aims[k]) pres.aim = aims[k];
            out.push({ peer: k, isMe: false, presence: pres });
          }
          out.push({ peer: key, isMe: true, presence: Object.assign({}, my) });
          peers = out;
          if (!notifyQ) { notifyQ = true; setTimeout(() => { notifyQ = false; if (!closed) handlers.forEach(h => { try { h({ peers }); } catch (e) { } }); }, 16); }
        };
        // el estado completo sale como mucho cada 300 ms y solo si cambió
        const doSend = (force) => {
          if (closed) return;
          const body = JSON.stringify(my);
          if (!force && body === lastBody) return;
          lastBody = body; lastFull = performance.now();
          ch.send({ type: 'broadcast', event: 'st', payload: { k: key, d: my } }).catch(() => { });
        };
        const sendFull = (force) => {
          if (closed || !joined) return;
          if (!sendQ && performance.now() - lastFull >= 150) return doSend(force);
          if (sendQ) return; sendQ = true;
          setTimeout(() => { sendQ = false; doSend(force); }, 150);
        };
        const sendFullSoon = () => { clearTimeout(resendT); resendT = setTimeout(() => sendFull(true), 250 + Math.random() * 400); };
        const doTrack = () => { if (!closed && my.pid) { tracked = true; ch.track(ident()).catch(() => { }); } };
        ch.on('presence', { event: 'sync' }, rebuild);
        ch.on('presence', { event: 'join' }, ({ key: k }) => { if (k !== key) sendFullSoon(); });
        ch.on('presence', { event: 'leave' }, ({ key: k }) => { const st = ch.presenceState(); if (!st[k]) { delete remote[k]; delete aims[k]; } });
        ch.on('broadcast', { event: 'st' }, msg => {
          const p = msg && msg.payload; if (!p || typeof p.k !== 'string' || !p.d || typeof p.d !== 'object') return;
          remote[p.k] = p.d; rebuild();
        });
        ch.on('broadcast', { event: 'aim' }, msg => {
          const p = msg && msg.payload; if (!p || typeof p.k !== 'string') return;
          if (p.aim) aims[p.k] = p.aim; else delete aims[p.k];
          rebuild();
        });
        const sala = {
          async presence(patch) {
            const p = Object.assign({}, patch);
            if ('aim' in p) {
              const a = p.aim; delete p.aim;
              ch.send({ type: 'broadcast', event: 'aim', payload: { k: key, aim: a || null } }).catch(() => { });
              if (!Object.keys(p).length) return;
            }
            const before = JSON.stringify(ident());
            for (const k in p) { if (p[k] === null) delete my[k]; else my[k] = p[k]; }
            rebuild();
            if (!tracked || JSON.stringify(ident()) !== before) doTrack();
            sendFull();
          },
          peers: () => peers,
          connected: () => { try { return client.realtime.isConnected(); } catch (e) { return true; } },
          onPeers(h) { handlers.add(h); setTimeout(() => h({ peers }), 0); return () => handlers.delete(h); },
          async leave() { closed = true; handlers.clear(); clearTimeout(resendT); clearInterval(keep); try { await ch.untrack(); } catch (e) { } try { await client.removeChannel(ch); } catch (e) { } }
        };
        // red de seguridad: reenviar el estado cada 20 s por si alguien se perdió un mensaje
        const keep = setInterval(() => { if (performance.now() - lastFull > 20000) sendFull(true); }, 5000);
        const timer = setTimeout(() => { if (!joined) { joined = true; clearInterval(keep); reject({ code: 'upstream_error' }); } }, 12000);
        ch.subscribe(status => {
          if (closed) return;
          if (status === 'SUBSCRIBED') {
            if (!joined) { joined = true; clearTimeout(timer); resolve(sala); }
            else { doTrack(); sendFullSoon(); } // volvió la conexión: anunciarse y mandar el estado
          } else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !joined) {
            joined = true; clearTimeout(timer); clearInterval(keep); reject({ code: 'upstream_error' });
          }
        });
      });
    }
  };
}
function renderMenuOnline() {
  const msg = $('onlineMsg');
  if (!NET.ready) msg.textContent = 'Conectando…';
  else if (!NET.room) msg.textContent = NET.via === 'supabase' ? 'No se pudo conectar con el servidor de salas. Revisa tu internet y recarga la página.' : 'Las salas funcionan cuando abres el juego dentro de Claude con tu sesión iniciada. Tus amigos también necesitan acceso a esta página.';
  else msg.textContent = 'Crea una sala y pásale el código a tus amigos, o escribe el código que te mandaron.';
  $('btnJoin').disabled = !NET.room; $('codeIn').disabled = !NET.room;
}

/* Versiones: para jugar en una sala todos deben tener la misma MAYOR.MENOR (las reglas y la física iguales).
   Con distinto PARCHE sí se puede: los parches no cambian cómo se juega (ver README, «Versiones»). */
// Qué se juega en la sala: tejo (con su distancia) o rana; la meta es la de ese juego
function roomGame() { return settings.game === 'rana' ? { kind: 'rana', dist: settings.dist, goal: settings.ranaGoal } : { kind: 'tejo', dist: settings.dist, goal: settings.goal }; }
function sameGameVersion(v) { const mm = s => String(s || '').split('.').slice(0, 2).join('.'); return !!v && mm(v) === mm(GAME_VERSION); }
function presentPids(peers) { const m = new Map(); peers.forEach(p => { const pr = p.presence || {}; if (typeof pr.pid === 'string') m.set(pr.pid, pr); }); return m; }
function publishG(g) {
  NET.g = g; NET.lastG = g; NET.myG = g;
  if (NET.sala) NET.sala.presence({ g }).catch(() => { });
}

async function netEnter(code, create) {
  if (!NET.room) return;
  if (!(settings.names[0] || '').trim()) { $('onlineMsg').textContent = 'Escribe tu nombre para entrar a una sala: así te ven los demás.'; const i = $('name0'); if (i) i.focus(); return; }
  A.init();
  const msg = $('onlineMsg'); msg.textContent = create ? 'Abriendo la sala…' : 'Entrando a la sala…';
  try {
    if (NET.sala) await netLeave();
    const sala = await NET.room.join('tejo-' + code);
    Object.assign(NET, { sala, code, g: null, lastG: null, myG: null, pending: {}, lostAt: 0, absent: {}, creator: create, watching: false, joinedAt: performance.now() });
    NET.unsub = sala.onPeers(netSync, netError);
    fixLocalDesigns();
    const me = { v: 1, pid: NET.pid, name: myName(), design: settings.designs[0], gv: GAME_VERSION };
    if (create) me.g = { code, ver: 1, host: NET.pid, gv: GAME_VERSION, phase: 'lobby', seats: [{ pid: NET.pid, name: myName() }], ...roomGame(), ...hostRules() };
    if (me.g) { NET.g = NET.lastG = NET.myG = me.g; }
    await sala.presence(me);
    showSala(); netSync();
  } catch (e) {
    msg.textContent = e && e.code === 'limit_reached' ? 'No se pudo abrir la sala ahora. Intenta en un momento.' : 'No se pudo entrar a la sala. Revisa tu conexión e intenta otra vez.';
  }
}
async function netLeave() {
  const s = NET.sala, un = NET.unsub;
  Object.assign(NET, { sala: null, unsub: null, code: null, g: null, lastG: null, myG: null, pending: {}, watching: false });
  try { un && un(); } catch (e) { }
  if (s) { try { await s.leave(); } catch (e) { } }
}
function netError(e) {
  const code = NET.code;
  if (e && ['upstream_error', 'limit_reached'].includes(e.code) && code) { setTimeout(() => { if (NET.code === code) netRejoin(); }, 1500); return; }
  showMenu(); $('onlineMsg').textContent = 'Se cerró la conexión con la sala.';
}
/* Reconectar a la misma sala sin tocar la partida: se vuelve a anunciar con su último tiro
   (y con la sala, si es el anfitrión); applyG pone al día lo que se haya perdido. */
async function netRejoin() {
  if (!NET.code || !NET.room || NET.rejoining) return;
  NET.rejoining = true;
  const code = NET.code, old = NET.sala, un = NET.unsub, keepG = NET.myG;
  try {
    try { un && un(); } catch (e) { }
    try { old && await old.leave(); } catch (e) { }
    const sala = await NET.room.join('tejo-' + code);
    if (NET.code !== code) { try { await sala.leave(); } catch (e) { } return; }
    NET.sala = sala; NET.unsub = sala.onPeers(netSync, netError); NET.joinedAt = performance.now();
    const me = { v: 1, pid: NET.pid, name: myName(), design: settings.designs[0], gv: GAME_VERSION };
    if (NET.lastT) me.t = NET.lastT;
    if (keepG && NET.lastG && NET.lastG.host === NET.pid) { me.g = NET.lastG; NET.myG = NET.g = me.g; }
    await sala.presence(me);
    netSync();
  } catch (e) { } finally { NET.rejoining = false; }
}
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = performance.now(); return; }
  if (!$('hud').hidden) keepAwake(true);
  if (NET.sala && performance.now() - hiddenAt > 2000) netRejoin();
});
function netCreate() { netEnter(String(1000 + Math.floor(Math.random() * 9000)), true); }
function netJoinClick() {
  const code = $('codeIn').value.replace(/\D/g, '');
  if (code.length !== 4) { $('onlineMsg').textContent = 'El código de la sala tiene 4 números.'; return; }
  netEnter(code, false);
}

/* ---------- sincronización ---------- */
function netSync() {
  if (!NET.sala) return;
  const peers = NET.sala.peers();
  let best = null;
  for (const p of peers) {
    const g = p.presence && p.presence.g;
    if (g && typeof g === 'object' && g.code === NET.code && typeof g.ver === 'number' && typeof g.host === 'string')
      if (!best || g.ver > best.ver || (g.ver === best.ver && g.host < best.host)) best = g;
  }
  if (best && best.host !== NET.pid && !sameGameVersion(best.gv)) { versionMismatch(best.gv); return; }
  if (best) { NET.g = best; NET.lastG = best; NET.lostAt = 0; }
  else { NET.g = null; if (NET.lastG && !NET.lostAt) NET.lostAt = performance.now(); }
  if (NET.myG && best && best.host !== NET.pid) { NET.myG = null; NET.sala.presence({ g: null }).catch(() => { }); }
  if (NET.g && amHost()) hostDuties(peers);
  applyG();
  checkReactions(peers);
  if (online()) { const key = [...presentPids(peers).keys()].sort().join(','); if (key !== NET.hereKey) { NET.hereKey = key; renderBoard(); } }
  if (!$('sala').hidden) renderSala();
}
// La sala es de otra versión: se sale y se explica quién tiene que actualizar
function versionMismatch(hv) {
  const mine = GAME_VERSION; netLeave(); showMenu();
  $('onlineMsg').textContent = !hv ? `Esta sala es de una versión anterior del juego y tú tienes la v${mine}. Para jugar juntos, quien creó la sala debe cerrar el juego y volver a abrirlo.`
    : versionNewer(hv, mine) ? `La sala es de la v${hv} y tú tienes la v${mine}. Actualiza tu juego (ciérralo y vuelve a abrirlo) para entrar.`
    : `La sala es de la v${hv} y tú tienes la v${mine}. Para jugar juntos, quien creó la sala debe cerrar el juego y volver a abrirlo.`;
}
function hostDuties(peers) {
  const g = NET.g, here = presentPids(peers);
  here.forEach((pr, pid) => { if (pid !== NET.pid && !sameGameVersion(pr.gv)) here.delete(pid); });   // con otra versión no se sienta a jugar
  if (g.phase === 'lobby') {
    let seats = g.seats.filter(s => here.has(s.pid)).map(s => ({ pid: s.pid, name: String(here.get(s.pid).name || s.name).slice(0, 14) }));
    here.forEach((pr, pid) => { if (seats.length < MAX_PLAYERS && !seats.some(s => s.pid === pid) && pr.name) seats.push({ pid, name: String(pr.name).slice(0, 14) }); });
    const used = [];
    seats = seats.map(s => { const want = here.get(s.pid) && here.get(s.pid).design; const d = DESIGN_IDS.includes(want) && !used.includes(want) ? want : null; if (d) used.push(d); return { ...s, design: d }; });
    if (JSON.stringify(seats) !== JSON.stringify(g.seats)) publishG({ ...g, seats, ver: g.ver + 1 });
  } else if (online() && game.gid === g.gid) hostCheckThrow(here);
}
function hostCheckThrow(here) {
  if (!online() || game.over || !(phase === 'aim' || phase === 'wait')) return;
  const p = current(); if (p.pid === NET.pid) return;
  const t = here.get(p.pid) && here.get(p.pid).t;
  if (t && t.n === game.thrown && t.gid === game.gid && isFinite(t.L) && isFinite(t.P))
    acceptThrow({ n: t.n, L: clamp(+t.L, -AIM.L, AIM.L), P: clamp(+t.P, 0, 1), pid: p.pid, skip: t.skip ? 1 : 0 });
}
function acceptThrow(t) {
  const g = NET.g; if (!g) return;
  publishG({ ...g, last: { ...t, gid: game.gid }, ver: g.ver + 1 });
  NET.pending[t.n] = t; tryConsume();
}
function applyG() {
  const g = NET.g; if (!g || g.phase === 'lobby') return;
  if (!g.setup || !g.gid) return;
  if (!online() || game.gid !== g.gid) {
    const inGame = g.setup.players.some(s => s.pid === NET.pid);
    if (!inGame && !NET.watching) { if ($('sala').hidden) showSala(); else renderSala(); return; }
    startOnlineGame(g); return;
  }
  if (g.last && g.last.gid === game.gid && g.last.n >= game.thrown && !NET.pending[g.last.n]) NET.pending[g.last.n] = g.last;
  if (NET.sala) {
    const here = presentPids(NET.sala.peers());
    game.players.forEach(p => {
      const pr = here.get(p.pid), t = pr && pr.t;
      if (t && t.gid === game.gid && typeof t.n === 'number' && t.n >= game.thrown && !NET.pending[t.n] && isFinite(t.L) && isFinite(t.P))
        NET.pending[t.n] = { n: t.n, L: clamp(+t.L, -AIM.L, AIM.L), P: clamp(+t.P, 0, 1), pid: p.pid, skip: t.skip ? 1 : 0 };
    });
  }
  tryConsume();
  if ((phase === 'aim' || phase === 'wait') && !drag && !NET.pending[game.thrown]) {
    const s = aheadSnap();
    if (s) { restoreSnap(s); return; }
  }
  if (g.phase === 'over' && !game.over && (phase === 'aim' || phase === 'wait') && !aheadSnap()) {
    gameOver([...game.players].sort((a, b) => b.score - a.score)[0]);
  }
}
/* La foto de la partida más avanzada que publique cualquier jugador. Como todos corren
   el mismo motor con los mismos tiros, la más avanzada es la correcta: solo se adelanta, nunca se retrocede. */
function aheadSnap() {
  if (!NET.sala || !online()) return null;
  let best = null;
  for (const peer of NET.sala.peers()) {
    const s = peer.presence && peer.presence.s;
    if (s && s.gid === game.gid && typeof s.seq === 'number' && s.seq > game.thrown && Array.isArray(s.sc) && Array.isArray(s.order) && (!best || s.seq > best.seq)) best = s;
  }
  return best;
}
function tryConsume() {
  if (!online() || game.over || !(phase === 'aim' || phase === 'wait')) return;
  const t = NET.pending[game.thrown]; if (!t) return;
  delete NET.pending[game.thrown];
  if (current().pid !== t.pid) return;
  drag = null;
  if (t.skip) toast(current().pid === NET.pid ? 'Se te acabó el tiempo: nulo' : `${current().name} no lanzó a tiempo: nulo`);
  launch({ L: t.L, P: t.P }, { timeout: !!t.skip });
}

/* ---------- partida ---------- */
function buildOnlineGame(g) {
  const st = g.setup;
  timers.length = 0; if (flight && flight.mesh) scene.remove(flight.mesh); flight = null; drag = null; cpuAim = null;
  if (game) clearCancha();
  if (Math.abs(W.D - st.dist) > .01) { setDistance(st.dist); buildHall(); }
  computeDvdP();
  const nT = [2, 3].includes(st.teams) ? st.teams : 0;
  const players = st.players.slice(0, MAX_PLAYERS).map((s, i) => { const p = newPlayer(String(s.name).slice(0, 14), i, false, DESIGN_IDS.includes(s.design) ? s.design : null); p.pid = s.pid; if (nT && Number.isInteger(s.team) && s.team >= 0 && s.team < nT) p.team = s.team; return p; });
  game = { players, round: 0, order: [], idx: 0, tejos: [], scored: false, goal: clampGoal(st.goal), mode: 'online', gid: g.gid, ...pickRules(st), aimHelp: !!st.aimHelp, thrown: 0, over: false };
  game.teams = applyTeams(players, nT);
  if (st.kind === 'rana') { ranaPrepare(); game.goal = clampRanaGoal(st.goal); computeDvdP(); }
  NET.pending = {}; lastP = {}; clearFeed(); paused = false;
  showScreen(null); setHud(true);
}
function startOnlineGame(g) {
  buildOnlineGame(g);
  const s = aheadSnap();
  if (s) restoreSnap(s); else startRound();
}
/* Deja las mechas como estaban en la foto: las reventadas siguen reventadas, con su quemón */
function applyMechas(mk) {
  if (!Array.isArray(mk)) return;
  mechaMeshes.forEach((m, i) => { if (mk[i] === 0) { m.userData.alive = false; m.visible = false; decal(m.userData.u, m.userData.v, T.scorch, .16, .002); } });
}
function makeSnap() {
  return {
    gid: game.gid, seq: game.thrown, round: game.round, idx: game.idx, order: game.order, scored: game.scored ? 1 : 0,
    sc: game.players.map(p => [p.score, p.st.mechas, p.st.emb, p.st.mon, p.st.manos, p.st.nulos, p.st.tiros]),
    mk: mechaMeshes.map(m => m.userData.alive ? 1 : 0),
    tj: game.tejos.map(t => [t.owner, t.valid ? 1 : 0, r4(t.u || 0), r4(t.v || 0), isFinite(t.d) ? r4(t.d) : -1, ...t.mesh.position.toArray().map(r4), ...t.mesh.quaternion.toArray().map(r4), t.pts || 0]),
    ...(isRana() ? { ra: [game.arg, game.turnPts], rg: game.rings.map(r => [r.owner, r.slot, r.pts, ...r.mesh.position.toArray().map(r4)]) } : {})   // rana: argolla de la tanda y las que ya cayeron
  };
}
function restoreSnap(s) {
  if (!online() || game.gid !== s.gid) { if (!NET.g || NET.g.gid !== s.gid || !NET.g.setup) return; buildOnlineGame(NET.g); }
  timers.length = 0; if (flight && flight.mesh) scene.remove(flight.mesh); flight = null; drag = null;
  clearCancha();
  Object.assign(game, { round: s.round, idx: s.idx, order: s.order.slice(), scored: !!s.scored, thrown: s.seq, over: false });
  game.players.forEach((p, i) => { const a = s.sc[i] || []; p.score = a[0] | 0; p.st = { mechas: a[1] | 0, emb: a[2] | 0, mon: a[3] | 0, manos: a[4] | 0, nulos: a[5] | 0, tiros: a[6] | 0 }; });
  applyMechas(s.mk);
  (s.tj || []).forEach(a => {
    const [owner, valid, u, v, d, px, py, pz, qx, qy, qz, qw] = a;
    if (!game.players[owner]) return;
    const pl = game.players[owner]; const m = makeTejo(pl.color, pl.design, pl.name); m.position.set(px, py, pz); m.quaternion.set(qx, qy, qz, qw).normalize(); scene.add(m);
    game.tejos.push({ owner, valid: !!valid, u, v, d: d < 0 ? Infinity : d, mesh: m, pts: a[12] | 0 });
    if (valid) decal(u, v, T.crater, .14);
  });
  if (isRana()) {
    const ra = Array.isArray(s.ra) ? s.ra : [0, 0]; game.arg = clamp(ra[0] | 0, 0, RANA.PER_TURN - 1); game.turnPts = ra[1] | 0;
    (s.rg || []).forEach(([owner, slot, pts, x, y, z]) => {
      const m = makeArgolla(); scene.add(m); const n = game.rings.filter(r => r.slot === slot).length;
      if (slot >= 0 && RANA_SLOTS[slot]) ranaPlaceRing(m, slot, n); else { m.position.set(x, y, z); m.rotation.set(Math.PI / 2, 0, 0); }
      game.rings.push({ owner, mesh: m, slot, pts: pts | 0 });
    });
  }
  for (const n in NET.pending) if (+n < game.thrown) delete NET.pending[n];
  showScreen(null); setHud(true); renderBoard();
  const winner = game.players.find(p => p.score >= game.goal);
  if (winner) { gameOver(winner); return; }
  nextThrow();
}
const TURN_LIMIT = 20000;        // segundos para lanzar antes del nulo
function netTurn(p) {
  const mine = p.pid === NET.pid;
  phase = mine ? 'aim' : 'wait';
  NET.turnAt = performance.now(); NET.turnN = game.thrown;
  if (mine) { helpHint('Te toca: arrastra hacia abajo y suelta'); toast('Te toca'); buzz(25); }
  else hint(`Esperando el tiro de ${p.name}…`, true);
  if (NET.sala) { NET.sala.presence({ s: makeSnap() }).catch(() => { }); if (amHost()) hostCheckThrow(presentPids(NET.sala.peers())); }
  tryConsume();
}
function netThrow(a) {
  if (phase !== 'aim' || current().pid !== NET.pid) return;
  const t = { n: game.thrown, L: r5(a.L), P: r5(a.P), gid: game.gid, pid: NET.pid };
  NET.lastT = t;
  launch({ L: t.L, P: t.P });
  if (NET.sala) {
    NET.sala.presence({ t, aim: null }).catch(() => { });
    if (amHost()) publishG({ ...NET.g, last: t, ver: NET.g.ver + 1 });
  }
}
function netAim(aim, now) {
  if (!NET.sala) return;
  if (aim === null) { NET.sala.presence({ aim: null }).catch(() => { }); return; }
  if (now - NET.lastAimSent < (NET.via === 'supabase' ? 220 : 80)) return; NET.lastAimSent = now;
  NET.sala.presence({ aim: { L: r4(aim.L), P: r4(aim.P), n: game.thrown } }).catch(() => { });
}
function netWatch() {
  if (!NET.sala || !game) return;
  const p = current(); let a = null;
  for (const peer of NET.sala.peers()) { const pr = peer.presence || {}; if (pr.pid === p.pid && pr.aim && pr.aim.n === game.thrown) { a = pr.aim; break; } }
  if (a && isFinite(a.L) && isFinite(a.P)) {
    const tgt = { L: clamp(+a.L, -AIM.L, AIM.L), P: clamp(+a.P, 0, 1) }, w = NET.watch;
    if (!w || w.n !== game.thrown) NET.watch = { n: game.thrown, L: tgt.L, P: tgt.P };
    else { w.L += (tgt.L - w.L) * .2; w.P += (tgt.P - w.P) * .2; }
    showReticle(NET.watch); setGauge(NET.watch.P);
  } else { reticle.visible = false; setGauge(0); }
}
function netGameOver() { if (NET.sala && amHost()) publishG({ ...NET.g, phase: 'over', ver: NET.g.ver + 1 }); }
function netRematch() {
  if (!amHost() || !NET.g || !NET.g.setup) return;
  const g = NET.g, here = presentPids(NET.sala.peers());
  let players = g.setup.players.filter(s => here.has(s.pid));
  here.forEach((pr, pid) => { if (players.length < MAX_PLAYERS && !players.some(s => s.pid === pid) && pr.name) players.push({ pid, name: String(pr.name).slice(0, 14) }); });
  if (players.length > 1) players = [...players.slice(1), players[0]]; // empieza otro
  players = withDesigns(players.map(s => ({ ...s, design: here.get(s.pid) && DESIGN_IDS.includes(here.get(s.pid).design) ? here.get(s.pid).design : s.design })));
  const nT = teamsAllowed(players.length).includes(g.teams || 0) ? (g.teams || 0) : 0;   // equipos nuevos al azar en cada revancha
  players = nT ? makeTeams(players, nT).map(x => ({ ...x.item, team: x.team })) : players.map(s => { const c = { ...s }; delete c.team; return c; });
  publishG({ ...g, phase: 'play', gid: rid(), setup: { ...g.setup, players, teams: nT }, snap: null, last: null, ver: g.ver + 1 });
  applyG();
}
function withDesigns(list) {
  const used = [];
  return list.map(s => { let d = DESIGN_IDS.includes(s.design) && !used.includes(s.design) ? s.design : null; if (!d) d = freeDesign([], used); used.push(d); return { ...s, design: d }; });
}
function netStart() {
  if (!amHost()) return;
  const g = NET.g, here = presentPids(NET.sala.peers());
  let players = withDesigns(g.seats.filter(s => here.has(s.pid))); if (players.length < 2) return;
  const nT = teamsAllowed(players.length).includes(g.teams || 0) ? (g.teams || 0) : 0;
  if (nT) players = makeTeams(players, nT).map(x => ({ ...x.item, team: x.team }));
  A.init(); A.tick();
  publishG({ ...g, phase: 'play', gid: rid(), setup: { players, dist: g.dist, goal: g.goal, kind: g.kind === 'rana' ? 'rana' : 'tejo', ...pickRules(g), teams: nT }, snap: null, last: null, ver: g.ver + 1 });
  applyG();
}

/* ---------- cada segundo: anfitrión ausente, jugador ausente ---------- */
function netTick() {
  if (!NET.sala) return;
  const now = performance.now(), peers = NET.sala.peers(), here = presentPids(peers);
  if (NET.sala.connected && !NET.sala.connected()) {
    NET.discSince = NET.discSince || now;
    if (now - NET.discSince > 4000) { NET.discSince = 0; netRejoin(); }
  } else NET.discSince = 0;
  if (online()) applyG();
  if (!NET.g && !NET.lastG && now - NET.joinedAt > 3000 && [...here.keys()].sort()[0] === NET.pid) {
    publishG({ code: NET.code, ver: 1, host: NET.pid, gv: GAME_VERSION, phase: 'lobby', seats: [{ pid: NET.pid, name: myName() }], ...roomGame(), ...hostRules() });
    netSync();
  }
  if (!NET.g && NET.lastG && NET.lostAt && now - NET.lostAt > 2500) {
    const lg = NET.lastG;
    const order = (lg.phase === 'lobby' || !lg.setup ? lg.seats : lg.setup.players).map(s => s.pid);
    const next = order.find(pid => here.has(pid)) || [...here.keys()].sort()[0];
    if (next === NET.pid) {
      const g = { ...lg, host: NET.pid, ver: lg.ver + 1 };
      if (lg.phase === 'lobby') g.seats = lg.seats.filter(s => here.has(s.pid));
      publishG(g); NET.lostAt = 0; toast('Ahora eres el anfitrión de la sala');
      netSync();
    }
  }
  if (online() && !game.over && (phase === 'aim' || phase === 'wait') && NET.turnN === game.thrown) {
    const p = current(), away = p.pid !== NET.pid && !here.has(p.pid);
    const left = Math.ceil((TURN_LIMIT - (now - NET.turnAt)) / 1000);
    setClock(left);
    if (phase === 'wait') hint(away ? `${p.name} perdió la señal: si no vuelve, su tiro es nulo` : `Esperando el tiro de ${p.name}…`, true);
    if (phase === 'aim' && p.pid === NET.pid && left <= 5 && left > 0) { hint(`¡Lanza ya! Quedan ${left} s`, true); if (left <= 3) buzz(15); }
    // mi turno: al llegar a 0 mi propio celular hace el nulo
    if (phase === 'aim' && p.pid === NET.pid && left <= 0) timeoutNulo();
    // el anfitrión lo hace por el que no está (o tiene el celular dormido)
    else if (amHost() && p.pid !== NET.pid) {
      const grace = away ? 0 : 10000;
      if (now - NET.turnAt > TURN_LIMIT + grace) acceptThrow({ n: game.thrown, L: 0, P: 0, pid: p.pid, skip: 1 });
      else if (!away) hostCheckThrow(here);
    }
  } else setClock(null);
  if (!$('sala').hidden) renderSala();
}
function setClock(left) {
  const c = $('clock');
  if (left === null || left === undefined) { c.hidden = true; return; }
  c.hidden = false; c.textContent = `${Math.max(0, left)} s`; c.classList.toggle('low', left <= 5);
}
function timeoutNulo() {
  if (phase !== 'aim' || current().pid !== NET.pid) return;
  drag = null; reticle.visible = false; setClock(null);
  const t = { n: game.thrown, L: 0, P: 0, gid: game.gid, pid: NET.pid, skip: 1 };
  NET.lastT = t;
  NET.pending[t.n] = t; tryConsume();
  if (NET.sala) {
    NET.sala.presence({ t, aim: null }).catch(() => { });
    if (amHost()) publishG({ ...NET.g, last: t, ver: NET.g.ver + 1 });
  }
}
function netSkip() {
  if (!amHost() || !online() || game.over || !(phase === 'aim' || phase === 'wait')) return;
  const p = current(); if (p.pid === NET.pid) return;
  $('btnSkip').hidden = true;
  acceptThrow({ n: game.thrown, L: 0, P: 0, pid: p.pid, skip: 1 });
}
/* Mantener la pantalla encendida mientras se juega: si el celular se bloquea, se cae la conexión */
let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && !wakeLock && navigator.wakeLock && !document.hidden) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
    else if (!on && wakeLock) { const w = wakeLock; wakeLock = null; await w.release(); }
  } catch (e) { wakeLock = null; }
}

/* ---------- pantalla de la sala ---------- */
function showSala() {
  if (game) { clearCancha(); game = null; }
  timers.length = 0; phase = 'menu'; reticle.visible = false;
  setHud(false); showScreen('sala'); renderSala();
}
function renderSala() {
  $('salaCode').textContent = NET.code || '—';
  const g = NET.g || NET.lastG, here = NET.sala ? presentPids(NET.sala.peers()) : new Map();
  const list = $('salaList'); list.innerHTML = '';
  const seats = g ? (g.phase === 'lobby' || !g.setup ? g.seats : g.setup.players) : [];
  const add = (name, color, tags, off, design) => {
    const li = document.createElement('li'); li.style.setProperty('--c', color); if (off) li.className = 'off';
    const ic = document.createElement('img'); ic.className = 'ic'; ic.alt = ''; ic.src = designIcon(design, color, name); li.appendChild(ic);
    const b = document.createElement('b'); b.textContent = name; li.appendChild(b);
    const s = document.createElement('span'); s.textContent = tags; li.appendChild(s); list.appendChild(li);
  };
  seats.forEach((s, i) => add(s.name, g && g.setup && g.phase !== 'lobby' && Number.isInteger(s.team) ? TEAM_COLORS[s.team] : COLORS[i], [s.pid === NET.pid ? 'tú' : '', g && g.host === s.pid ? 'anfitrión' : '', here.has(s.pid) ? '' : 'fuera'].filter(Boolean).join(' · '), !here.has(s.pid), s.design));
  here.forEach((pr, pid) => { if (!seats.some(s => s.pid === pid)) add(String(pr.name || 'Alguien').slice(0, 14), '#8e7d66', (pid === NET.pid ? 'tú · ' : '') + (pid === NET.pid || sameGameVersion(pr.gv) ? 'mirando' : 'tiene otra versión: debe actualizar'), false, pr.design); });
  renderMyDesign(g, seats);
  const info = $('salaInfo'), host = amHost();
  if (!g) info.textContent = NET.creator ? 'Abriendo la sala…' : 'Buscando la sala…';
  const started = !!(g && g.phase !== 'lobby' && g.setup);
  const inGame = started && g.setup.players.some(s => s.pid === NET.pid);
  const full = !!(g && g.phase === 'lobby' && !seats.some(s => s.pid === NET.pid) && seats.length >= MAX_PLAYERS);
  $('btnWatch').hidden = !(started && !inGame);
  if (!g) { }
  else if (started && !inGame) info.textContent = `La partida de la sala ${NET.code} ya empezó, así que no puedes entrar a jugar. Si hay cupo, entras en la revancha cuando el anfitrión la inicie. Mientras tanto puedes mirarla.`;
  else if (started) info.textContent = 'La partida ya empezó.';
  else if (full) info.textContent = `La sala está llena: ya hay ${MAX_PLAYERS} jugadores. Si alguien sale, entras de una; si no, crea otra sala.`;
  else if (host) info.textContent = seats.length < 2 ? 'Pásale el código a tus amigos. Cuando entren, aparecen aquí.' : 'Están listos. Empieza cuando quieras.';
  else info.textContent = 'Esperando a que el anfitrión empiece la partida.';
  $('salaRules').textContent = g ? `${g.kind === 'rana' ? 'Rana · partida a ' + fmtGoal(g.goal) : fmtD(g.dist) + ' · partida a ' + g.goal} · mira ${g.aimHelp ? 'sí' : 'no'} · lupa ${g.aimHelp && g.lupa !== false ? 'sí' : 'no'} · barra de fuerza ${g.power !== false ? 'sí' : 'no'} · cámara ${!(+g.zoom) ? 'cerca' : +g.zoom >= 1 ? 'lejos' : 'media'} · hasta ${MAX_PLAYERS} jugadores` : '';
  // forma de juego: la escoge el anfitrión; los equipos se arman al azar al empezar
  const lobby = !!(g && g.phase === 'lobby'), nHere = seats.filter(s => here.has(s.pid)).length, allowed = teamsAllowed(nHere), want = (g && g.teams) || 0;
  $('salaTeams').hidden = !lobby;
  if (lobby) {
    setSeg('segSalaTeams', want);
    $('segSalaTeams').querySelectorAll('button').forEach(b => { b.disabled = !host; b.hidden = b.dataset.v === '3' && nHere < 6 && want !== 3; });
    $('salaTeamsNote').textContent = want && !allowed.includes(want) ? `Para ${want} equipos se necesitan al menos ${want === 3 ? 6 : 4} jugadores; si no completan, se juega individual.`
      : want ? 'Los equipos se arman al azar al empezar, y se revuelven en cada revancha.' : host ? 'Con 4 o más jugadores pueden jugar por equipos.' : '';
  }
  $('btnStart').hidden = !host || !g || g.phase !== 'lobby';
  $('btnStart').disabled = seats.filter(s => here.has(s.pid)).length < 2;
}
async function netRefresh() {
  if (!NET.code || NET.refreshing) return;
  NET.refreshing = true; $('btnRefresh').disabled = true; $('salaInfo').textContent = 'Actualizando la sala…';
  const code = NET.code, keep = amHost() ? NET.g : null;
  try {
    await netEnter(code, false);
    if (keep && NET.sala) { publishG({ ...keep, ver: keep.ver + 1 }); netSync(); }
  } finally { NET.refreshing = false; $('btnRefresh').disabled = false; if (!$('sala').hidden) renderSala(); }
}
/* Mi grabado en la sala: lo que pedí y si me lo dieron */
function renderMyDesign(g, seats) {
  const i = Math.max(0, seats.findIndex(s => s.pid === NET.pid)), mine = seats.find(s => s.pid === NET.pid);
  const want = settings.designs[0], got = mine ? mine.design : want;
  $('myDzImg').src = designIcon(got || want, COLORS[i] || COLORS[0], myName());
  $('myDzName').textContent = mine && !mine.design ? `${designName(want)} está ocupado: escoge otro` : designName(got || want);
  $('myDz').disabled = !!(g && g.phase !== 'lobby');
}
function netPickDesign() {
  const g = NET.g || NET.lastG; const seats = g ? (g.seats || []) : [];
  const i = Math.max(0, seats.findIndex(s => s.pid === NET.pid));
  const taken = seats.filter(s => s.pid !== NET.pid && s.design).map(s => s.design);
  openPicker({ title: 'Escoge tu grabado', current: settings.designs[0], taken, color: COLORS[i] || COLORS[0], name: myName(),
    onPick: id => { settings.designs[0] = id; fixLocalDesigns(); saveSettings(); if (NET.sala) NET.sala.presence({ design: id }).catch(() => { }); renderSala(); } });
}
/* ---------- Reacciones: salen en la pantalla de todos los de la sala ---------- */
const REACTIONS = [['😮', '¡Uy!'], ['🔥', '¡Qué tiro!'], ['🍺', '¡Salud!'], ['👏', '¡Bien!'], ['😂', 'Jajaja'], ['🙏', '¡Ayuda, Virgen!']];
const RX_GAP = 1500;   // una reacción cada 1,5 s por jugador, para no saturar la sala
function sendReaction(k) {
  if (!NET.sala || !REACTIONS[k]) return;
  const now = performance.now(); if (now - (NET.rxLast || 0) < RX_GAP) return;
  NET.rxLast = now; NET.rxN = (NET.rxN || 0) + 1;
  NET.sala.presence({ rx: { k, n: NET.rxN } }).catch(() => { });
  showReaction(myName(), k, myColor());
  closeRxTray();
}
function myColor() { const p = online() && game.players.find(q => q.pid === NET.pid); return p ? p.color : COLORS[0]; }
function checkReactions(peers) {
  NET.rxSeen = NET.rxSeen || {};
  for (const peer of peers) {
    const pr = peer.presence || {}, pid = pr.pid; if (typeof pid !== 'string' || pid === NET.pid) continue;
    const rx = pr.rx, n = rx && Number.isInteger(rx.n) ? rx.n : 0, seen = NET.rxSeen[pid];
    if (seen === undefined) { NET.rxSeen[pid] = n; continue; }         // al llegar a la sala no se muestran reacciones viejas
    if (n > seen && REACTIONS[rx.k]) {
      NET.rxSeen[pid] = n;
      const p = online() && game.players.find(q => q.pid === pid);
      showReaction(String(pr.name || 'Alguien').slice(0, 14), rx.k, p ? p.color : '#8e7d66');
    }
  }
}
function showReaction(name, k, color) {
  const [emo, txt] = REACTIONS[k], layer = $('rxLayer');
  const el = document.createElement('div'); el.className = 'rx'; el.style.setProperty('--c', color);
  const b = document.createElement('b'); b.textContent = emo;
  const s = document.createElement('span'); const em = document.createElement('em'); em.textContent = txt; s.append(name, em);
  el.append(b, s); layer.appendChild(el);
  while (layer.children.length > 5) layer.removeChild(layer.firstChild);
  setTimeout(() => el.remove(), 3300);
  A.tone(660, .08, { type: 'triangle', gain: .12 }); A.tone(990, .1, { type: 'triangle', gain: .1, delay: .06 });
}
function openRxTray() {
  const t = $('rxTray'); t.innerHTML = '';
  REACTIONS.forEach(([emo, txt], k) => { const b = document.createElement('button'); b.type = 'button';
    const e = document.createElement('b'); e.textContent = emo; const s = document.createElement('span'); s.textContent = txt; b.append(e, s);
    b.addEventListener('click', ev => { ev.stopPropagation(); sendReaction(k); }); t.appendChild(b); });
  t.hidden = false; $('btnRx').setAttribute('aria-expanded', 'true');
}
function closeRxTray() { $('rxTray').hidden = true; $('btnRx').setAttribute('aria-expanded', 'false'); }
function netBindUI() {
  $('btnRx').addEventListener('click', e => { e.stopPropagation(); $('rxTray').hidden ? openRxTray() : closeRxTray(); });
  document.addEventListener('pointerdown', e => { if (!$('rxTray').hidden && !e.target.closest('#rxTray, #btnRx')) closeRxTray(); });
  $('myDz').addEventListener('click', netPickDesign);
  $('btnJoin').addEventListener('click', netJoinClick);
  $('codeIn').addEventListener('keydown', e => { if (e.key === 'Enter') netJoinClick(); });
  $('btnStart').addEventListener('click', netStart);
  $('btnLeave').addEventListener('click', () => showMenu());
  $('segSalaTeams').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !amHost() || !NET.g || NET.g.phase !== 'lobby') return;
    publishG({ ...NET.g, teams: Number(b.dataset.v), ver: NET.g.ver + 1 }); A.tick(); renderSala();
  });
  $('btnRefresh').addEventListener('click', netRefresh);
  $('btnSkip').addEventListener('click', netSkip);
  $('btnWatch').addEventListener('click', () => { NET.watching = true; applyG(); });
  $('btnCopy').addEventListener('click', () => {
    const txt = `Juguemos tejo en el Club El Cosmo. Sala ${NET.code}`;
    try { navigator.clipboard.writeText(txt).then(() => toast('Código copiado'), () => toast(`El código es ${NET.code}`)); } catch (e) { toast(`El código es ${NET.code}`); }
  });
}

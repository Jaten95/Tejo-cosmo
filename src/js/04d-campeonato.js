
/* ================= Campeonato =================
   Los tres juegos (tejo, rana y bolo) en orden al azar, uno detrás del otro, con los mismos jugadores (y los
   mismos equipos). En cada juego el 1º se lleva 3 puntos de campeonato, el 2º 2 y el 3º 1; empatados en puntos,
   el mismo puesto. Gana el campeonato el que más sume; si empatan, el que más se acercó a las metas
   (lo que hizo sobre la meta de cada juego, sumado). Con equipos compiten los equipos.
   Partidas cortas (tejo a 15, rana a 500, bolo a 10) o largas (27, 1.000 y 15). Cada juego lo empieza otro.
   Fuera de las salas el campeonato vive en `champ`; en las salas va en la configuración que publica el
   anfitrión (setup.champ), así todos ven el mismo orden y la misma tabla. */
const CHAMP_GAMES = ['tejo', 'rana', 'bolo'];
const CHAMP_GOALS = { corta: { tejo: 15, rana: 500, bolo: 10 }, larga: { tejo: 27, rana: 1000, bolo: 15 } };
const CHAMP_MEDAL = [3, 2, 1];
const GAME_NAME = { tejo: 'Tejo', rana: 'Rana', bolo: 'Bolo' };
let champ = null;

function champLen() { return settings.champLen === 'larga' ? 'larga' : 'corta'; }
function champGoal(kind, len) { return (CHAMP_GOALS[len] || CHAMP_GOALS.corta)[kind]; }
function shuffled(a) { const s = a.slice(); for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; } return s; }
function newChamp(len) { return { order: shuffled(CHAMP_GAMES), k: 0, len: len === 'larga' ? 'larga' : 'corta', hist: [] }; }
// que un campeonato que llega de la sala tenga la forma esperada
function validChamp(c) {
  return !!(c && Array.isArray(c.order) && c.order.length === 3 && c.order.every(k => CHAMP_GAMES.includes(k)) && Number.isInteger(c.k) && c.k >= 0 && c.k < 3
    && Array.isArray(c.hist) && c.hist.length <= 3 && c.hist.every(h => h && CHAMP_GAMES.includes(h.kind) && Array.isArray(h.sc) && +h.goal > 0));
}

/* ---------- fuera de las salas ---------- */
function startChamp() { champ = newChamp(champLen()); startChampGame(); }
function startChampGame() { if (game) clearCancha(); startGame(champ.order[champ.k], champ); }
function champNext() {   // el botón del final de cada juego: el siguiente, u otro campeonato si ya se jugaron los tres
  if (!champ || champ.hist.length >= 3) return startChamp();
  champ.k = champ.hist.length; startChampGame();
}
function champRecord() { if (champ && game && game.champ === champ && champ.hist.length === champ.k) champ.hist.push(champEntry()); }

/* ---------- lo de todos ---------- */
// quiénes compiten: los equipos si hay, si no los jugadores (siempre en el mismo orden en los tres juegos)
function champUnits() {
  return game.teams ? game.teams.map(t => ({ name: 'Equipo ' + t.name, color: t.color, score: teamScore(t) }))
    : game.players.map(p => ({ name: p.name, color: p.color, score: p.score }));
}
function champEntry() { return { kind: game.kind || 'tejo', goal: game.goal, sc: champUnits().map(u => u.score) }; }
function champMedals(sc) { return sc.map(s => CHAMP_MEDAL[sc.filter(x => x > s).length] || 0); }
// la tabla: puntos de campeonato por juego, total y qué tanto se acercó a las metas (para desempatar)
function champTable(c, hist) {
  const rows = champUnits().map((u, i) => ({ ...u, i, per: {}, pts: 0, prog: 0 }));
  hist.forEach(h => { const m = champMedals(h.sc); rows.forEach((r, i) => { r.per[h.kind] = m[i] || 0; r.pts += m[i] || 0; r.prog += Math.min(1, (+h.sc[i] || 0) / h.goal); }); });
  return rows.sort((a, b) => b.pts - a.pts || b.prog - a.prog || a.i - b.i);
}
function champHist() { const c = game.champ; return c.hist.length > c.k ? c.hist.slice(0, c.k + 1) : c.hist.concat([champEntry()]); }   // con el juego que acaba de terminar
function champPrefix() { return game && game.champ ? `Campeonato ${game.champ.k + 1}/3 · ` : ''; }
function champAnnounce() { const c = game.champ, k = game.kind || 'tejo'; announce(GAME_NAME[k].toUpperCase(), `Campeonato · juego ${c.k + 1} de 3 · a ${fmtGoal(game.goal)}`, false); }

/* La pantalla del final de cada juego, dentro del campeonato */
function renderChampOver(winner) {
  const c = game.champ, hist = champHist(), last = hist.length >= 3, rows = champTable(c, hist), kind = game.kind || 'tejo';
  const wName = winner.team ? 'el equipo ' + game.teams[winner.idx].name : winner.name;
  const tbl = $('champStats');
  tbl.innerHTML = `<tr><th>Campeonato</th>${c.order.map((k, j) => `<th class="${j === c.k ? 'now' : ''}">${GAME_NAME[k]}</th>`).join('')}<th>Total</th></tr>` +
    rows.map(r => `<tr class="${last && r === rows[0] ? 'win' : ''}" style="--c:${r.color}"><td></td>${c.order.map(k => k in r.per ? `<td class="m${r.per[k]}">${r.per[k]}</td>` : '<td class="dim">—</td>').join('')}<td class="tot">${r.pts}</td></tr>`).join('');
  [...tbl.querySelectorAll('tr')].slice(1).forEach((tr, k) => tr.firstChild.textContent = rows[k].name);
  $('champWrap').hidden = false;
  const tie = rows.length > 1 && rows[0].pts === rows[1].pts && Math.abs(rows[0].prog - rows[1].prog) < 1e-9;
  if (last) {
    $('overEyebrow').textContent = `Campeonato · partidas ${c.len === 'larga' ? 'largas' : 'cortas'}`;
    $('overWinner').textContent = tie ? '¡Empate en el campeonato!' : `¡${rows[0].name.startsWith('Equipo') ? 'Campeones' : 'Campeón'}: ${rows[0].name}!`;
    const close = rows.length > 1 && rows[0].pts === rows[1].pts && !tie;
    $('overLine').textContent = `${rows[0].pts} puntos de campeonato en tejo, rana y bolo.` + (close ? ` Empataron en puntos con ${rows[1].name}: lo desempató que se acercó más a las metas.` : '');
    $('btnAgain').textContent = 'Otro campeonato';
  } else {
    const next = c.order[hist.length];
    $('overEyebrow').textContent = `Campeonato · juego ${c.k + 1} de 3 · ${GAME_NAME[kind]} a ${fmtGoal(game.goal)}`;
    $('overWinner').textContent = `Ganó ${wName}`;
    $('overLine').textContent = `Van: ${rows.map(r => `${r.name} ${r.pts}`).join(' · ')}. Sigue ${GAME_NAME[next].toLowerCase()}.`;
    $('btnAgain').textContent = `Sigue: ${GAME_NAME[next]}`;
  }
  if (online() && !amHost()) $('btnAgain').textContent = last ? 'Esperando otro campeonato' : 'Esperando el siguiente juego';
}

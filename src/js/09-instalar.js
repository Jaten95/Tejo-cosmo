
/* ================= Instalar en el celular y avisar de versiones nuevas =================
   Solo en GitHub Pages (en Claude no aplica). Android/Chrome: el botón abre el aviso de instalar del navegador.
   iPhone/Safari: el botón muestra cómo agregarlo a la pantalla de inicio. */
const INSTALL = { prompt: null };
function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
function isIOS() { return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function canOfferInstall() { return !window.claude && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && !standalone(); }
function renderInstall() {
  const b = document.getElementById('btnInstall'); if (!b) return;
  b.hidden = !(canOfferInstall() && (INSTALL.prompt || isIOS()));
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); INSTALL.prompt = e; renderInstall(); });
window.addEventListener('appinstalled', () => { INSTALL.prompt = null; renderInstall(); toast('Listo: el Tejo quedó en tu pantalla de inicio'); });
document.addEventListener('click', async e => {
  if (!e.target.closest) return;
  if (e.target.closest('#btnInstallBack')) { showScreen('menu'); return; }
  if (!e.target.closest('#btnInstall')) return;
  if (INSTALL.prompt) { const p = INSTALL.prompt; INSTALL.prompt = null; try { await p.prompt(); await p.userChoice; } catch (er) { } renderInstall(); }
  else showScreen('installHelp');
});

/* ---------- Versión nueva ----------
   Instalado, el celular puede dejar la app abierta en segundo plano con la versión vieja.
   Al abrirla o volver a ella se consulta version.json; si hay otra versión, sale un aviso para actualizar. */
function versionNewer(a, b) { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; }
let updChecking = false, updLast = 0;
async function checkUpdate() {
  if (window.claude || !('serviceWorker' in navigator) || updChecking || Date.now() - updLast < 30000) return;
  updChecking = true; updLast = Date.now();
  try {
    const reg = await navigator.serviceWorker.getRegistration(); if (reg) reg.update().catch(() => { });
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    const v = r.ok ? (await r.json()).version : null;
    if (v && versionNewer(v, GAME_VERSION)) showUpdate(v);
  } catch (e) { } finally { updChecking = false; }
}
function showUpdate(v) {
  const el = document.getElementById('updBar'); if (!el) return;
  document.getElementById('updText').textContent = `Hay una versión nueva: v${v}`;
  el.hidden = false;
}
document.addEventListener('click', e => {
  if (!e.target.closest || !e.target.closest('#updBtn')) return;
  const go = () => location.reload();
  navigator.serviceWorker && navigator.serviceWorker.getRegistration ? navigator.serviceWorker.getRegistration().then(r => r ? r.update().then(go, go) : go(), go) : go();
});
if (!window.claude) {
  addEventListener('load', () => setTimeout(checkUpdate, 2500));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdate(); });
  setInterval(() => { if (!document.hidden) checkUpdate(); }, 5 * 60 * 1000);
}

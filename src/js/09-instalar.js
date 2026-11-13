
/* ================= Instalar en el celular =================
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

// Avvio dell'app: archivio, navigazione, service worker.
import { avvia } from './core/store.js';
import { chiediPersistenza } from './core/db.js';
import { h, svuota } from './core/dom.js';

const VOCI = [
  ['home', 'Home', '🏠'], ['timer', 'Timer', '⏱️'], ['forza', 'Forza', '💪'],
  ['peso', 'Peso', '⚖️'], ['cibo', 'Cibo', '🍽️'], ['altro', 'Altro', '☰'],
];
// Le viste si caricano solo quando servono.
const VISTE = {
  home: () => import('./viste/home.js'),
  timer: () => import('./viste/timer.js'),
  forza: () => import('./viste/forza.js'),
  peso: () => import('./viste/peso.js'),
  cibo: () => import('./viste/cibo.js'),
  attivita: () => import('./viste/attivita.js'),
  riepilogo: () => import('./viste/riepilogo.js'),
  impostazioni: () => import('./viste/impostazioni.js'),
  altro: () => import('./viste/altro.js'),
};
const SOTTO_ALTRO = ['attivita', 'riepilogo', 'impostazioni'];

function costruisciNav(corrente) {
  const nav = svuota(document.getElementById('nav'));
  const attiva = SOTTO_ALTRO.includes(corrente) ? 'altro' : corrente;
  for (const [id, nome, icona] of VOCI) {
    nav.append(h('a', { href: `#/${id}`, class: id === attiva ? 'attiva' : '', 'aria-current': id === attiva ? 'page' : null },
      h('span', null, icona), nome));
  }
}

async function mostra() {
  let nome = location.hash.replace(/^#\/?/, '').split('?')[0] || 'home';
  if (!VISTE[nome]) nome = 'home';
  costruisciNav(nome);
  const contenitore = svuota(document.getElementById('vista'));
  try {
    const modulo = await VISTE[nome]();
    await modulo.render(contenitore);
  } catch (e) {
    console.error(e);
    contenitore.append(h('div', { class: 'avviso' }, 'Impossibile mostrare questa pagina: ' + e.message));
  }
  window.scrollTo(0, 0);
}

async function main() {
  await avvia();
  chiediPersistenza();
  window.addEventListener('hashchange', mostra);
  await mostra();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* senza offline l'app funziona comunque */ });
  }
}
main();

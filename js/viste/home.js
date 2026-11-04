// Cruscotto: cosa tocca oggi, ultimo peso e tendenza, passi e allenamenti della settimana.
import { h } from '../core/dom.js';
import { leggi, impostazioni, tutto } from '../core/store.js';
import { ESERCIZI_INIZIALI } from '../logica/impostazioni.js';
import { cosaTocca, ultimaSessione, suggerisciProgressione } from '../logica/forza.js';
import { proponiLivello, nomeLivello, LIVELLI } from '../logica/livelli.js';
import { riepilogoSettimana } from '../logica/riepilogo.js';
import { oggiISO, inizioSettimana, dataLunga, fmt, NOMI_GIORNI, giornoSettimana } from '../core/util.js';

export async function render(el) {
  const imp = impostazioni();
  const oggi = oggiISO();
  const dati = tutto();
  const r = riepilogoSettimana(dati, imp, inizioSettimana(oggi));
  const esercizi = leggi('esercizi', ESERCIZI_INIZIALI);
  const tocca = cosaTocca(oggi, imp.calendario);

  // cosa tocca oggi
  let carta;
  if (tocca === 'intervalli') {
    const prop = proponiLivello(leggi('intervalli', []), imp.livelloCorrente, imp.avanzamento);
    const l = LIVELLI[imp.livelloCorrente - 1];
    carta = [h('div', { class: 'numero' }, `Intervalli · ${nomeLivello(imp.livelloCorrente)}`), h('p', null, l.descr),
      prop.azione !== 'resta' && h('p', { class: 'muto' }, `Suggerimento: ${prop.azione === 'sali' ? 'sali' : 'scendi'} al ${nomeLivello(prop.livello)} (${prop.motivo})`),
      h('a', { class: 'bottone primario', href: '#/timer', style: 'display:block;text-align:center;text-decoration:none;line-height:30px' }, '▶ Vai al timer')];
  } else if (tocca === 'riposo') {
    carta = [h('div', { class: 'numero' }, 'Riposo 😌'), h('p', { class: 'muto' }, 'Oggi niente allenamento in programma.')];
  } else {
    const ex = esercizi.find((e) => e.id === tocca);
    const ult = ex ? ultimaSessione(dati.forza || [], ex.id, ex.varianti[0] || '') : null;
    const sug = suggerisciProgressione(ult, imp.forza);
    carta = [h('div', { class: 'numero' }, ex ? ex.nome : tocca), sug && h('p', { class: 'muto' }, sug.motivo),
      h('a', { class: 'bottone primario', href: '#/forza', style: 'display:block;text-align:center;text-decoration:none;line-height:30px' }, '💪 Registra la sessione')];
  }

  const tendenza = r.peso.variazione;
  const ultimoPeso = [...(dati.peso || [])].filter((x) => x.peso != null).sort((a, b) => b.data.localeCompare(a.data))[0];

  el.append(h('h1', null, 'Salute'),
    h('p', { class: 'muto' }, `${NOMI_GIORNI[giornoSettimana(oggi)]}, ${dataLunga(oggi)}`),
    !imp.avvisoAccettato && h('div', { class: 'avviso' }, 'Prima di usare il timer leggi l\'avviso nella pagina Timer.'),
    h('div', { class: 'carta evidenza' }, h('div', { class: 'etichetta' }, 'Oggi tocca'), carta),
    h('div', { class: 'griglia2' },
      h('div', { class: 'carta' }, h('div', { class: 'etichetta' }, 'Ultimo peso'),
        h('div', { class: 'numero' }, ultimoPeso ? fmt(ultimoPeso.peso, 1) : '–', h('small', null, ' kg')),
        tendenza != null && h('div', { class: tendenza > 0 ? 'su' : 'giu' }, `${tendenza > 0 ? '▲' : '▼'} ${fmt(Math.abs(tendenza), 1)} kg (media 7 gg)`),
        tendenza == null && h('a', { class: 'muto', href: '#/peso' }, 'Registra il peso')),
      h('div', { class: 'carta' }, h('div', { class: 'etichetta' }, 'Passi della settimana'),
        h('div', { class: 'numero' }, r.attivita.passiTotali != null ? fmt(r.attivita.passiTotali, 0) : '–'),
        r.attivita.passiMedia != null && h('div', { class: 'muto' }, `media ${fmt(r.attivita.passiMedia, 0)} al giorno`))),
    h('div', { class: 'carta' }, h('div', { class: 'etichetta' }, 'Allenamenti questa settimana'),
      h('div', { class: 'numero' }, String(r.allenamenti.totale)),
      h('div', { class: 'muto' }, `${r.allenamenti.intervalli.length} intervalli · ${new Set(r.allenamenti.forza.map((f) => f.data)).size} di forza · ${r.allenamenti.altri.length} da Mi Fitness`)),
    h('a', { class: 'bottone', href: '#/riepilogo', style: 'display:block;text-align:center;text-decoration:none;line-height:30px' }, '🧾 Riepilogo settimanale'));
}

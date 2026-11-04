// Riepilogo settimanale stampabile (anche come PDF dal browser: "Stampa" -> "Salva come PDF").
import { h, svuota } from '../core/dom.js';
import { impostazioni, tutto } from '../core/store.js';
import { riepilogoSettimana } from '../logica/riepilogo.js';
import { nomeAttivita } from '../logica/timer.js';
import { nomeLivello } from '../logica/livelli.js';
import { AVVISO, ESERCIZI_INIZIALI } from '../logica/impostazioni.js';
import { oggiISO, inizioSettimana, aggiungiGiorni, dataBreve, fmt, fmtDurataMin } from '../core/util.js';

export async function render(el) {
  const imp = impostazioni();
  const dati = tutto();
  const esercizi = dati.esercizi || ESERCIZI_INIZIALI;
  let lunedi = inizioSettimana(oggiISO());
  const corpo = h('div');
  const riga = (a, b) => h('div', { class: 'riga' }, h('span', null, a), h('strong', null, b));

  function disegna() {
    svuota(corpo);
    const r = riepilogoSettimana(dati, imp, lunedi);
    const n = r.nutrizione, s = n.regolari;
    corpo.append(
      h('div', { class: 'carta' }, h('h2', null, 'Allenamenti'),
        riga('Totale', `${r.allenamenti.totale}`),
        r.allenamenti.intervalli.map((x) => riga(`${dataBreve(x.data)} · ${x.livello ? nomeLivello(x.livello) : (x.nome || 'Personalizzata')} · ${nomeAttivita(x.attivita)}`,
          `RPE ${x.rpe ?? '–'} ${x.completa ? '✅' : '⚠️'}`)),
        r.allenamenti.forza.map((x) => riga(`${dataBreve(x.data)} · ${esercizi.find((e) => e.id === x.esercizioId)?.nome || x.esercizioId}${x.variante ? ` (${x.variante})` : ''}`,
          `${x.serie}×${x.ripetizioni} · ${fmt(x.carico, 1)} kg`)),
        r.allenamenti.altri.map((x) => riga(`${dataBreve(x.data)} · ${x.tipo || 'Allenamento'} (Mi Fitness)`, x.durataMin != null ? `${fmt(x.durataMin, 0)} min` : '')),
        !r.allenamenti.totale && h('div', { class: 'vuoto' }, 'Nessun allenamento registrato.')),
      h('div', { class: 'carta' }, h('h2', null, 'Peso'),
        riga('Media 7 giorni a fine settimana', r.peso.media != null ? `${fmt(r.peso.media, 1)} kg` : '–'),
        riga('Variazione rispetto alla settimana prima', r.peso.variazione != null ? `${r.peso.variazione > 0 ? '+' : ''}${fmt(r.peso.variazione, 1)} kg` : '–'),
        r.peso.vita != null && riga('Vita', `${fmt(r.peso.vita, 1)} cm`)),
      h('div', { class: 'carta' }, h('h2', null, 'Nutrizione'),
        s.n ? [
          riga(`Giorni registrati`, `${s.n}`),
          riga('Calorie medie', `${fmt(s.medie.kcal, 0)} kcal (obiettivo ${fmt(imp.nutrizione.kcal)})`),
          s.perc && riga('Macro P / G / C', `${fmt(s.perc.p, 0)}% / ${fmt(s.perc.g, 0)}% / ${fmt(s.perc.c, 0)}%`),
          riga('Proteine · fibre', `${fmt(s.medie.proteine, 0)} g · ${fmt(s.medie.fibre, 0)} g`),
          riga('Giorni dentro / fuori obiettivo', `${s.dentro} / ${s.fuori}`),
          s.micro.filter((m) => m.giorniSotto > 0).slice(0, 3).length > 0 && riga('Micronutrienti più scarsi', s.micro.filter((m) => m.giorniSotto > 0).slice(0, 3).map((m) => m.nome).join(', ')),
          n.ricarica?.n ? riga('Giorno di ricarica', `${fmt(n.ricarica.medie.kcal, 0)} kcal`) : null,
        ] : h('div', { class: 'vuoto' }, 'Nessun dato di nutrizione.')),
      h('div', { class: 'carta' }, h('h2', null, 'Attività'),
        riga('Passi totali', r.attivita.passiTotali != null ? fmt(r.attivita.passiTotali, 0) : '–'),
        riga('Media passi al giorno', r.attivita.passiMedia != null ? fmt(r.attivita.passiMedia, 0) : '–'),
        riga('Frequenza a riposo (media)', r.attivita.fcRiposo != null ? `${fmt(r.attivita.fcRiposo, 0)} bpm` : '–'),
        riga('Sonno medio', fmtDurataMin(r.attivita.sonnoMedioMin))));
  }
  const titolo = h('h1');
  const aggiornaTitolo = () => { titolo.textContent = `Settimana ${dataBreve(lunedi)} – ${dataBreve(aggiungiGiorni(lunedi, 6))}`; };

  el.append(titolo,
    h('div', { class: 'riga no-stampa', style: 'border:0' },
      h('button', { onclick: () => { lunedi = aggiungiGiorni(lunedi, -7); aggiornaTitolo(); disegna(); } }, '◀ Prima'),
      h('button', { onclick: () => { lunedi = aggiungiGiorni(lunedi, 7); aggiornaTitolo(); disegna(); } }, 'Dopo ▶')),
    corpo,
    h('button', { class: 'primario grande no-stampa', onclick: () => window.print() }, '🖨 Stampa / salva come PDF'),
    h('p', { class: 'muto' }, AVVISO));
  aggiornaTitolo();
  disegna();
}

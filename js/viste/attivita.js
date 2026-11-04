// Attività da Mi Fitness (Xiaomi): importazione con mappatura colonne e grafici.
import { h, svuota, toast, leggiFile, modale } from '../core/dom.js';
import { leggi, scrivi, impostazioni, salvaImpostazioni } from '../core/store.js';
import { leggiTabella } from '../core/csv.js';
import {
  TIPI_FITNESS, indovinaMappatura, applicaMappatura, errorMappatura, mappaturaCompatibile, totaliMensili,
} from '../logica/fitness.js';
import { sostituisciPerData } from '../logica/nutrizione.js';
import { graficoBarre, graficoLinee } from '../core/charts.js';
import { aggiungiGiorni, giornoMese, nomeMese, fmt } from '../core/util.js';

export async function render(el) {
  const passi = leggi('fit_passi', {});
  const fc = leggi('fit_fc', {});
  const sonno = leggi('fit_sonno', {});

  el.append(h('h1', null, 'Attività (Mi Fitness)'),
    h('div', { class: 'carta' }, h('h2', null, 'Importa un file CSV'),
      h('p', { class: 'muto' }, 'Scegli che tipo di dati contiene il file, poi indica quali colonne sono data, passi, ecc. La scelta viene ricordata per le prossime volte.'),
      h('div', { class: 'gruppo' }, Object.entries(TIPI_FITNESS).map(([id, t]) => {
        const input = h('input', { type: 'file', accept: '.csv,text/csv', style: 'display:none', onchange: async (e) => {
          const f = e.target.files[0]; e.target.value = '';
          if (f) mappa(id, leggiTabella(await leggiFile(f)), f.name, () => { svuota(el); render(el); });
        } });
        return h('span', null, h('button', { onclick: () => input.click() }, t.nome), input);
      }))));

  // ---- grafici
  const fine = [...Object.keys(passi), ...Object.keys(fc), ...Object.keys(sonno)].sort().pop();
  if (!fine) { el.append(h('div', { class: 'vuoto' }, 'Nessun dato importato. Nella cartella "esempi" ci sono file di prova.')); return; }
  const giorni = Array.from({ length: 30 }, (_, i) => aggiungiGiorni(fine, i - 29));

  const mesi = totaliMensili(passi);
  const mediaSett = (() => { const v = giorni.slice(-7).map((d) => passi[d]).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; })();
  el.append(h('div', { class: 'carta' }, h('h2', null, 'Passi al giorno (ultimi 30 giorni)'),
    h('p', { class: 'muto' }, `Media ultimi 7 giorni: ${fmt(mediaSett, 0)} passi`),
    graficoBarre({ barre: giorni.map((d) => ({ x: d, y: passi[d] ?? null })), etichettaX: giornoMese, formatoY: (v) => fmt(v, 0), descrizione: 'Passi giornalieri' }),
    h('h3', null, 'Totale mensile'),
    mesi.length ? [...mesi].reverse().map((m) => h('div', { class: 'riga' }, h('span', null, nomeMese(`${m.mese}-01`)),
      h('strong', null, `${fmt(m.totale, 0)} passi`), h('span', { class: 'muto' }, `${m.giorni} gg · media ${fmt(m.media, 0)}`))) : h('div', { class: 'vuoto' }, 'Nessun dato sui passi.')));

  el.append(h('div', { class: 'carta' }, h('h2', null, 'Frequenza cardiaca a riposo (bpm)'),
    graficoLinee({ serie: [{ nome: 'A riposo', colore: 2, punti: Object.entries(fc).sort().slice(-60).map(([d, v]) => ({ x: d, y: v.riposo })) }], formatoY: (v) => fmt(v, 0), vuoto: 'Nessun dato sulla frequenza cardiaca.' })));

  el.append(h('div', { class: 'carta' }, h('h2', null, 'Ore di sonno'),
    graficoBarre({ barre: giorni.map((d) => ({ x: d, y: sonno[d] != null ? sonno[d] / 60 : null, colore: 3 })), etichettaX: giornoMese, formatoY: (v) => fmt(v, 0), orizzontali: [{ y: 7, etichetta: '7 h' }], descrizione: 'Ore di sonno per notte', vuoto: 'Nessun dato sul sonno.' })));

  const allen = leggi('fit_allenamenti', []);
  if (allen.length) {
    el.append(h('div', { class: 'carta' }, h('h2', null, 'Ultimi allenamenti'),
      [...allen].reverse().slice(0, 8).map((a) => h('div', { class: 'riga' },
        h('div', null, h('strong', null, `${a.data}${a.ora ? ' ' + a.ora : ''}`), h('div', { class: 'muto' }, a.tipo || 'Allenamento')),
        h('span', null, `${a.durataMin != null ? fmt(a.durataMin, 0) + ' min' : ''}${a.kcal != null ? ' · ' + fmt(a.kcal, 0) + ' kcal' : ''}`)))));
  }
}

// ---------------------------------------------------------------- schermata di mappatura colonne
function mappa(tipo, tabella, nomeFile, finito) {
  const def = TIPI_FITNESS[tipo];
  if (!tabella.intestazioni.length) { toast('Il file è vuoto o non è un CSV'); return; }
  const imp = impostazioni();
  const salvata = imp.mappature[tipo];
  const mappatura = mappaturaCompatibile(salvata, tabella.intestazioni)
    ? { colonne: { ...salvata.colonne }, unita: salvata.unita || 'minuti' }
    : indovinaMappatura(tipo, tabella.intestazioni, tabella.righe);
  const ricordata = mappaturaCompatibile(salvata, tabella.intestazioni);
  const errore = h('p', { class: 'su' });

  const selezioni = def.ruoli.map(([id, etichetta, obbl]) => h('div', null,
    h('label', null, etichetta + (obbl ? ' *' : '')),
    h('select', { value: mappatura.colonne[id] || '', onchange: (e) => { if (e.target.value) mappatura.colonne[id] = e.target.value; else delete mappatura.colonne[id]; } },
      h('option', { value: '' }, '— nessuna —'), tabella.intestazioni.map((c) => h('option', { value: c }, c)))));

  const anteprima = h('div', { style: 'overflow-x:auto' }, h('table', { style: 'font-size:.75rem;border-collapse:collapse' },
    h('tr', null, tabella.intestazioni.map((c) => h('th', { style: 'text-align:left;padding:2px 8px;border-bottom:1px solid var(--bordo)' }, c))),
    tabella.righe.slice(0, 3).map((r) => h('tr', null, tabella.intestazioni.map((c) => h('td', { style: 'padding:2px 8px' }, r[c]))))));

  const m = modale(
    h('h2', null, `Mappa le colonne – ${def.nome}`),
    h('p', { class: 'muto' }, `${nomeFile} · ${tabella.righe.length} righe. ${ricordata ? 'Ho riutilizzato la mappatura salvata.' : 'Ho provato a indovinare le colonne: controlla.'}`),
    def.nota && h('p', { class: 'muto' }, def.nota),
    anteprima, selezioni,
    def.unita && [h('label', null, 'Unità della durata'),
      h('select', { value: mappatura.unita, onchange: (e) => { mappatura.unita = e.target.value; } },
        ['minuti', 'secondi', 'ore'].map((u) => h('option', { value: u }, u)))],
    errore, h('div', { style: 'height:10px' }),
    h('button', { class: 'primario grande', onclick: () => {
      const err = errorMappatura(tipo, mappatura.colonne);
      if (err) { errore.textContent = err; return; }
      const r = applicaMappatura(tipo, tabella.righe, mappatura);
      let n = 0;
      if (tipo === 'passi') { scrivi('fit_passi', { ...leggi('fit_passi', {}), ...r.passi }); n = Object.keys(r.passi).length; }
      else if (tipo === 'frequenza') { scrivi('fit_fc', { ...leggi('fit_fc', {}), ...r.fc }); n = Object.keys(r.fc).length; }
      else if (tipo === 'sonno') { scrivi('fit_sonno', { ...leggi('fit_sonno', {}), ...r.sonno }); n = Object.keys(r.sonno).length; }
      else { scrivi('fit_allenamenti', sostituisciPerData(leggi('fit_allenamenti', []), r.allenamenti)); n = r.allenamenti.length; }
      if (!n) { errore.textContent = 'Nessuna riga valida: controlla le colonne scelte (soprattutto la data).'; return; }
      const s = impostazioni(); s.mappature[tipo] = { colonne: { ...mappatura.colonne }, unita: mappatura.unita }; salvaImpostazioni(s);
      m.chiudi(); toast(`Importati ${n} elementi${r.scartate ? ` (${r.scartate} righe scartate)` : ''}`); finito();
    } }, 'Importa'),
    h('div', { style: 'height:8px' }), h('button', { onclick: () => m.chiudi() }, 'Annulla'));
}

// Peso e misure: inserimento rapido, grafico con media mobile, ritmo e proiezione.
import { h, toast, contatore } from '../core/dom.js';
import { leggi, scrivi, impostazioni } from '../core/store.js';
import { mediaMobile, ritmoSettimanale, proiezione, serieCampo } from '../logica/peso.js';
import { graficoLinee } from '../core/charts.js';
import { oggiISO, fmt, dataBreve, dataLunga } from '../core/util.js';

export async function render(el) {
  const imp = impostazioni();
  const registro = [...leggi('peso', [])].sort((a, b) => a.data.localeCompare(b.data));
  const pesi = serieCampo(registro, 'peso');
  const vite = serieCampo(registro, 'vita');
  const ultimoPeso = pesi[pesi.length - 1];
  const mm = mediaMobile(pesi, 7);
  const ultimaMedia = mm[mm.length - 1];

  // inserimento rapido
  const data = h('input', { type: 'date', value: oggiISO(), max: oggiISO() });
  const inizialePeso = ultimoPeso ? ultimoPeso.valore : 70;
  const inizialeVita = vite.length ? vite[vite.length - 1].valore : 80;
  const cPeso = contatore({ valore: inizialePeso, passo: 0.1, min: 20, max: 400, decimali: 1 });
  const cVita = contatore({ valore: inizialeVita, passo: 0.5, min: 30, max: 250, decimali: 1 });
  const usaPeso = h('input', { type: 'checkbox', checked: true });
  const usaVita = h('input', { type: 'checkbox', checked: false });

  const salva = () => {
    const d = data.value || oggiISO();
    const voce = { data: d };
    if (usaPeso.checked) voce.peso = parseFloat(cPeso.campo.value);
    if (usaVita.checked) voce.vita = parseFloat(cVita.campo.value);
    if (voce.peso == null && voce.vita == null) { toast('Seleziona almeno peso o vita'); return; }
    const reg = leggi('peso', []);
    const esistente = reg.find((r) => r.data === d);
    // lo stesso giorno si aggiorna la voce esistente (senza perdere l'altro campo)
    scrivi('peso', esistente ? reg.map((r) => (r.data === d ? { ...r, ...voce } : r)) : [...reg, voce]);
    toast('Salvato'); location.reload();
  };

  el.append(h('h1', null, 'Peso e misure'),
    h('div', { class: 'carta' }, h('h2', null, 'Nuova misura'),
      h('label', null, 'Data'), data,
      h('label', { class: 'spunta' }, usaPeso, 'Peso (kg)'), cPeso,
      h('label', { class: 'spunta' }, usaVita, 'Circonferenza vita (cm)'), cVita,
      h('div', { style: 'height:12px' }),
      h('button', { class: 'primario grande', onclick: salva }, 'Salva')));

  // riepilogo numerico
  const ritmo = ritmoSettimanale(pesi, 28);
  const base = ultimaMedia ? ultimaMedia.media : null;
  const proReale = proiezione({ attuale: base, dataAttuale: ultimaMedia?.data, obiettivo: imp.pesoObiettivo, ritmo });
  const proObiettivo = proiezione({ attuale: base, dataAttuale: ultimaMedia?.data, obiettivo: imp.pesoObiettivo, ritmo: imp.ritmoObiettivo });
  const testoProiezione = (p) => !p ? 'non calcolabile' : p.raggiunto ? 'obiettivo raggiunto 🎉' : `${dataLunga(p.data)} (tra ${Math.round(p.settimane)} settimane)`;

  el.append(h('div', { class: 'carta' }, h('h2', null, 'Andamento'),
    h('div', { class: 'griglia2' },
      h('div', null, h('div', { class: 'etichetta' }, 'Ultimo peso'), h('div', { class: 'numero' }, ultimoPeso ? fmt(ultimoPeso.valore, 1) : '–', h('small', null, ' kg')),
        ultimoPeso && h('div', { class: 'muto' }, dataBreve(ultimoPeso.data))),
      h('div', null, h('div', { class: 'etichetta' }, 'Media 7 giorni'), h('div', { class: 'numero' }, base != null ? fmt(base, 1) : '–', h('small', null, ' kg')))),
    h('div', { class: 'riga' }, h('span', null, 'Ritmo reale (ultime 4 settimane)'), h('strong', null, ritmo != null ? `${fmt(ritmo, 2)} kg/sett.` : 'servono più dati')),
    h('div', { class: 'riga' }, h('span', null, 'Ritmo obiettivo'), h('strong', null, `${fmt(imp.ritmoObiettivo, 2)} kg/sett.`)),
    h('div', { class: 'riga' }, h('span', null, 'Peso obiettivo'), h('strong', null, imp.pesoObiettivo != null ? `${fmt(imp.pesoObiettivo, 1)} kg` : 'impostalo nelle Impostazioni')),
    imp.pesoObiettivo != null && [
      h('div', { class: 'riga' }, h('span', null, 'Arrivo al ritmo reale'), h('strong', null, testoProiezione(proReale))),
      h('div', { class: 'riga' }, h('span', null, 'Arrivo al ritmo obiettivo'), h('strong', null, testoProiezione(proObiettivo))),
    ]));

  el.append(h('div', { class: 'carta' }, h('h2', null, 'Peso (kg)'),
    graficoLinee({
      serie: [
        { nome: 'Misure', colore: 3, punti: pesi.map((p) => ({ x: p.data, y: p.valore })), linea: false, raggio: 2.6 },
        { nome: 'Media 7 giorni', colore: 1, punti: mm.map((p) => ({ x: p.data, y: p.media })), marker: false },
      ],
      orizzontali: imp.pesoObiettivo != null ? [{ y: imp.pesoObiettivo, etichetta: 'obiettivo' }] : [],
      formatoY: (v) => fmt(v, 1), descrizione: 'Peso e media mobile a 7 giorni', vuoto: 'Inserisci il primo peso per vedere il grafico.',
    })));

  if (vite.length) {
    const mv = mediaMobile(vite, 7);
    el.append(h('div', { class: 'carta' }, h('h2', null, 'Vita (cm)'),
      graficoLinee({ serie: [
        { nome: 'Misure', colore: 3, punti: vite.map((p) => ({ x: p.data, y: p.valore })), linea: false, raggio: 2.6 },
        { nome: 'Media 7 giorni', colore: 1, punti: mv.map((p) => ({ x: p.data, y: p.media })), marker: false },
      ], formatoY: (v) => fmt(v, 0) })));
  }

  const recenti = [...registro].reverse().slice(0, 15);
  el.append(h('div', { class: 'carta' }, h('h2', null, 'Ultime misure'),
    recenti.length ? recenti.map((r) => h('div', { class: 'riga' },
      h('div', null, h('strong', null, dataBreve(r.data)), h('div', { class: 'muto' },
        [r.peso != null ? `${fmt(r.peso, 1)} kg` : null, r.vita != null ? `vita ${fmt(r.vita, 1)} cm` : null].filter(Boolean).join(' · '))),
      h('button', { class: 'piccolo pericolo', 'aria-label': 'Elimina', onclick: () => {
        if (!confirm('Eliminare questa misura?')) return;
        scrivi('peso', leggi('peso', []).filter((x) => x.data !== r.data)); location.reload();
      } }, '🗑')))
      : h('div', { class: 'vuoto' }, 'Nessuna misura.')));
}

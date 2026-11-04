// Timer a intervalli: impostazione, esecuzione a schermo intero, diario e grafico dei livelli.
import { h, svuota, toast, modale, contatore } from '../core/dom.js';
import { leggi, scrivi, impostazioni, salvaImpostazioni } from '../core/store.js';
import { AVVISO } from '../logica/impostazioni.js';
import { LIVELLI, parametriLivello, livelloDaParametri, proponiLivello, nomeLivello } from '../logica/livelli.js';
import {
  ATTIVITA, nomeAttivita, ETICHETTE_FASE, costruisciSequenza, durataTotale, statoAlTempo,
  ripetizioniCompletate, ripetizioniTotali, annuncioFase,
} from '../logica/timer.js';
import { sbloccaAudio, bip, vibra, parla, zittisci, tieniSchermoAcceso, rilasciaSchermo } from '../core/segnali.js';
import { graficoLinee } from '../core/charts.js';
import { oggiISO, fmtMmSs, fmtDurataMin, dataBreve, uid } from '../core/util.js';

let inCorso = false; // c'è una sessione a schermo intero?

// Parametri modificabili: [chiave, etichetta, secondi per unità, opzioni contatore]
const CAMPI = [
  ['riscaldamento', 'Riscaldamento (min)', 60, { passo: 1, min: 0, max: 30 }],
  ['lavoro', 'Lavoro (sec)', 1, { passo: 5, min: 5, max: 900 }],
  ['recupero', 'Recupero (sec)', 1, { passo: 5, min: 0, max: 900 }],
  ['ripetizioni', 'Ripetizioni', 1, { passo: 1, min: 1, max: 50 }],
  ['serie', 'Serie', 1, { passo: 1, min: 1, max: 10 }],
  ['pausaSerie', 'Pausa tra le serie (sec)', 1, { passo: 15, min: 0, max: 900 }],
  ['defaticamento', 'Defaticamento (min)', 60, { passo: 1, min: 0, max: 30 }],
];

export async function render(el) {
  const imp = impostazioni();
  if (!imp.avvisoAccettato) {
    el.append(h('h1', null, 'Timer intervalli'),
      h('div', { class: 'avviso' }, h('strong', null, 'Prima di iniziare'), h('p', null, AVVISO)),
      h('button', { class: 'primario grande', onclick: () => {
        const s = impostazioni(); s.avvisoAccettato = true; salvaImpostazioni(s); svuota(el); render(el);
      } }, 'Ho capito, continua'));
    return;
  }

  // stato della schermata (non viene salvato finché non parte la sessione)
  const st = { params: parametriLivello(imp.livelloCorrente), attivita: imp.attivitaPredefinita, presetId: null };
  const ridisegna = () => { svuota(el); disegna(); };

  function disegna() {
    const sessioni = leggi('intervalli', []);
    const livelloSel = livelloDaParametri(st.params);
    const prop = proponiLivello(sessioni, imp.livelloCorrente, imp.avanzamento);
    const presets = leggi('preset', []);
    const preset = presets.find((p) => p.id === st.presetId);

    el.append(h('h1', null, 'Timer intervalli'));

    // proposta di livello (solo un suggerimento)
    el.append(h('div', { class: `carta ${prop.azione === 'resta' ? '' : 'evidenza'}` },
      prop.azione === 'resta'
        ? h('p', null, h('strong', null, `Livello attuale: ${imp.livelloCorrente}. `), prop.motivo)
        : [h('p', null, h('strong', null, `Suggerimento: ${prop.azione === 'sali' ? 'sali' : 'scendi'} al ${nomeLivello(prop.livello)}`)),
          h('p', { class: 'muto' }, prop.motivo + ' È solo un consiglio: scegli tu.'),
          h('button', { class: 'primario', onclick: () => { cambiaLivello(prop.livello); } }, `Passa al ${nomeLivello(prop.livello)}`)]));

    // livelli
    el.append(h('div', { class: 'carta' }, h('h2', null, 'Livello'),
      h('div', { class: 'griglia3' }, LIVELLI.map((l) => h('button', {
        class: l.n === livelloSel ? 'sel' : '', onclick: () => cambiaLivello(l.n),
      }, `${l.n}`))),
      livelloSel
        ? [h('p', null, h('strong', null, nomeLivello(livelloSel) + ': '), LIVELLI[livelloSel - 1].descr, ` (RPE ${LIVELLI[livelloSel - 1].rpe})`),
          h('p', { class: 'muto' }, LIVELLI[livelloSel - 1].nota)]
        : h('p', null, h('strong', null, preset ? `Preset: ${preset.nome}` : 'Sessione personalizzata'),
          h('span', { class: 'muto' }, ' – non conta per l\'avanzamento dei livelli.'))));

    // attività
    el.append(h('div', { class: 'carta' }, h('h2', null, 'Attività'),
      h('div', { class: 'gruppo' }, ATTIVITA.map(([id, nome]) => h('button', {
        class: st.attivita === id ? 'sel' : '', onclick: () => { st.attivita = id; const s = impostazioni(); s.attivitaPredefinita = id; salvaImpostazioni(s); ridisegna(); },
      }, nome)))));

    // parametri
    const riepilogo = h('p', { class: 'muto' });
    const aggiornaRiepilogo = () => {
      const seq = costruisciSequenza(st.params);
      riepilogo.textContent = `Durata totale: ${fmtDurataMin(durataTotale(seq) / 60)} · ${ripetizioniTotali(seq)} ripetizioni di lavoro`;
    };
    el.append(h('div', { class: 'carta' }, h('h2', null, 'Parametri'),
      h('div', { class: 'campi' }, CAMPI.map(([k, et, fattore, o]) => h('div', null, h('label', null, et),
        contatore({ valore: st.params[k] / fattore, ...o, onCambia: (v) => { if (Number.isFinite(v)) { st.params[k] = Math.round(v * fattore); aggiornaRiepilogo(); } } })))),
      riepilogo));
    aggiornaRiepilogo();

    // preset
    el.append(h('div', { class: 'carta' }, h('h2', null, 'Preset personali'),
      h('select', { value: st.presetId || '', onchange: (e) => {
        const p = presets.find((x) => x.id === e.target.value);
        st.presetId = p ? p.id : null;
        if (p) st.params = { ...p.params };
        ridisegna();
      } }, h('option', { value: '' }, presets.length ? '— nessun preset —' : '— nessun preset salvato —'), presets.map((p) => h('option', { value: p.id }, p.nome))),
      h('div', { class: 'gruppo' },
        h('button', { onclick: () => {
          const nome = prompt('Nome del preset:');
          if (!nome || !nome.trim()) return;
          const nuovo = { id: uid(), nome: nome.trim(), params: { ...st.params } };
          scrivi('preset', [...presets, nuovo]); st.presetId = nuovo.id; toast('Preset salvato'); ridisegna();
        } }, 'Salva come nuovo'),
        preset && h('button', { onclick: () => {
          scrivi('preset', presets.map((p) => (p.id === preset.id ? { ...p, params: { ...st.params } } : p))); toast('Preset aggiornato');
        } }, 'Aggiorna'),
        preset && h('button', { class: 'pericolo', onclick: () => {
          if (!confirm(`Eliminare il preset "${preset.nome}"?`)) return;
          scrivi('preset', presets.filter((p) => p.id !== preset.id)); st.presetId = null; ridisegna();
        } }, 'Elimina'))));

    el.append(h('button', { class: 'primario grande', onclick: () => partenza(st, preset, ridisegna) }, '▶ Avvia'));

    el.append(diario(sessioni, ridisegna));
  }

  function cambiaLivello(n) {
    const s = impostazioni(); s.livelloCorrente = n; salvaImpostazioni(s); imp.livelloCorrente = n;
    st.params = parametriLivello(n); st.presetId = null;
    ridisegna();
  }

  disegna();
}

// ---------------------------------------------------------------- diario e grafico
function diario(sessioni, ridisegna) {
  const ordinate = [...sessioni].sort((a, b) => `${b.data} ${b.ora}`.localeCompare(`${a.data} ${a.ora}`));
  const sorted = [...ordinate].reverse();
  return h('div', null,
    h('div', { class: 'carta' }, h('h2', null, 'Progressi'),
      graficoLinee({
        serie: [
          { nome: 'Livello', colore: 1, punti: sorted.filter((s) => s.livello).map((s) => ({ x: s.data, y: s.livello })) },
          { nome: 'Fatica (RPE)', colore: 2, punti: sorted.filter((s) => s.rpe).map((s) => ({ x: s.data, y: s.rpe })), tratteggio: true },
        ],
        yMin: 0, yMax: 10, descrizione: 'Livelli e fatica percepita nel tempo', vuoto: 'Completa una sessione per vedere i progressi.',
      })),
    h('div', { class: 'carta' }, h('h2', null, 'Diario sessioni'),
      ordinate.length ? ordinate.slice(0, 20).map((s) => h('div', { class: 'riga' },
        h('div', null,
          h('strong', null, `${dataBreve(s.data)} · ${s.livello ? nomeLivello(s.livello) : (s.nome || 'Personalizzata')}`),
          h('div', { class: 'muto' }, `${nomeAttivita(s.attivita)} · RPE ${s.rpe ?? '–'} · ${s.completa ? '✅ completa' : '⚠️ incompleta'} · ${fmtDurataMin((s.durataSec || 0) / 60)}`),
          s.note && h('div', { class: 'muto' }, `“${s.note}”`)),
        h('button', { class: 'piccolo pericolo', 'aria-label': 'Elimina sessione', onclick: () => {
          if (!confirm('Eliminare questa sessione dal diario?')) return;
          scrivi('intervalli', leggi('intervalli', []).filter((x) => x.id !== s.id)); ridisegna();
        } }, '🗑')))
        : h('div', { class: 'vuoto' }, 'Nessuna sessione registrata.')));
}

// ---------------------------------------------------------------- esecuzione
function partenza(st, preset, alTermine) {
  const seq = costruisciSequenza(st.params);
  if (!seq.length) { toast('Imposta almeno una fase.'); return; }
  const livello = livelloDaParametri(st.params);
  eseguiSessione({
    seq, params: { ...st.params }, livello, attivita: st.attivita,
    nome: livello ? nomeLivello(livello) : (preset ? preset.nome : 'Personalizzata'),
    alTermine,
  });
}

function eseguiSessione({ seq, params, livello, attivita, nome, alTermine }) {
  if (inCorso) return;
  inCorso = true;
  const imp = impostazioni();
  sbloccaAudio();
  tieniSchermoAcceso();
  const totale = durataTotale(seq);

  const eFase = h('div', { class: 't-fase' });
  const eTempo = h('div', { class: 't-tempo' });
  const eInfo = h('div', { class: 't-info' });
  const eProssimo = h('div', { class: 't-prossimo' });
  const eBarra = h('i');
  const eTotale = h('div', { class: 't-prossimo' });
  const bPausa = h('button', { onclick: () => alternaPausa() }, '⏸ Pausa');
  const bTermina = h('button', { onclick: () => {
    if (confirm('Terminare qui? La sessione verrà registrata come incompleta.')) concludi(false);
  } }, '⏹ Termina qui');
  const sopra = h('div', { id: 'timer-sopra', class: 'fase-riposo' },
    h('div', null, eFase, eInfo),
    h('div', null, eTempo, eProssimo),
    h('div', null, h('div', { class: 't-barra' }, eBarra), eTotale, h('div', { class: 't-bottoni' }, bPausa, bTermina)));
  document.body.append(sopra);

  let trascorso = 0, ultimo = performance.now(), inPausa = false, indicePrec = -1, ceilPrec = null, chiuso = false;

  function alternaPausa() {
    inPausa = !inPausa;
    ultimo = performance.now();
    sopra.classList.toggle('in-pausa', inPausa);
    bPausa.textContent = inPausa ? '▶ Riprendi' : '⏸ Pausa';
    if (inPausa) zittisci();
  }

  function cambioFase(stato) {
    const f = stato.fase;
    const lavoro = f.tipo === 'lavoro';
    if (imp.suono) bip(lavoro ? 1200 : 700, 350, 0.4);
    if (imp.vibrazione) vibra(lavoro ? [300, 100, 300] : [250]);
    if (imp.voce) parla(annuncioFase(f));
  }

  function tick() {
    if (chiuso) return;
    const ora = performance.now();
    if (!inPausa) trascorso += (ora - ultimo) / 1000;
    ultimo = ora;
    const stato = statoAlTempo(seq, trascorso);
    if (stato.finito) { concludi(true); return; }
    const f = stato.fase;
    let cambiata = false;
    if (stato.indice !== indicePrec) { indicePrec = stato.indice; ceilPrec = null; cambiata = true; cambioFase(stato); }
    const c = Math.ceil(stato.restante - 1e-6);
    if (c !== ceilPrec) {
      ceilPrec = c;
      // conto alla rovescia sugli ultimi 3 secondi
      if (!cambiata && c >= 1 && c <= 3) {
        if (imp.suono) bip(c === 1 ? 900 : 650, 120, 0.35);
        if (imp.vibrazione) vibra(60);
      }
    }
    sopra.className = `${f.tipo === 'lavoro' ? 'fase-lavoro' : f.tipo === 'recupero' ? 'fase-recupero' : 'fase-riposo'}${inPausa ? ' in-pausa' : ''}`;
    sopra.id = 'timer-sopra';
    eFase.textContent = inPausa ? 'In pausa' : ETICHETTE_FASE[f.tipo];
    eTempo.textContent = fmtMmSs(stato.restante);
    eTempo.classList.toggle('ultimi', stato.restante <= 3.5 && !inPausa);
    eInfo.textContent = f.rip
      ? `${nome} - rip. ${f.rip}/${f.ripTot}${f.serieTot > 1 ? ` · serie ${f.serie}/${f.serieTot}` : ''}`
      : (f.tipo === 'pausa' ? `${nome} · serie ${f.serie}/${f.serieTot} finita` : nome);
    const prossima = seq[stato.indice + 1];
    eProssimo.textContent = prossima ? `Poi: ${ETICHETTE_FASE[prossima.tipo]} ${fmtMmSs(prossima.durata)}` : 'Ultima fase';
    eBarra.style.width = `${Math.min(100, (trascorso / totale) * 100)}%`;
    eTotale.textContent = `Mancano ${fmtMmSs(totale - trascorso)} alla fine`;
  }

  const timerId = setInterval(tick, 200);
  tick();

  function concludi(completa) {
    if (chiuso) return;
    chiuso = true;
    clearInterval(timerId);
    rilasciaSchermo();
    zittisci();
    sopra.remove();
    inCorso = false;
    const durataSec = Math.round(completa ? totale : trascorso);
    if (completa) {
      if (imp.suono) { bip(900, 200); setTimeout(() => bip(1200, 200), 250); setTimeout(() => bip(1500, 400), 500); }
      if (imp.vibrazione) vibra([400, 150, 400, 150, 600]);
      if (imp.voce) parla('Sessione completata. Ottimo lavoro.');
    }
    chiediEsito({
      completa, durataSec, ripCompletate: completa ? ripetizioniTotali(seq) : ripetizioniCompletate(seq, trascorso),
      ripTot: ripetizioniTotali(seq), livello, attivita, nome, params,
    }, alTermine);
  }
}

// ---------------------------------------------------------------- fine sessione
function chiediEsito(dati, alTermine) {
  let rpe = null;
  const bottoniRpe = [];
  const griglia = h('div', { class: 'rpe-griglia' }, Array.from({ length: 10 }, (_, i) => {
    const b = h('button', { onclick: () => { rpe = i + 1; bottoniRpe.forEach((x, j) => x.classList.toggle('sel', j === i)); } }, String(i + 1));
    bottoniRpe.push(b);
    return b;
  }));
  const note = h('textarea', { placeholder: 'Come è andata? (facoltativo)' });
  const m = modale(
    h('h2', null, dati.completa ? '🎉 Sessione completata' : 'Sessione interrotta'),
    h('p', { class: 'muto' }, `${dati.nome} · ${nomeAttivita(dati.attivita)} · ${fmtDurataMin(dati.durataSec / 60)} · ${dati.ripCompletate}/${dati.ripTot} ripetizioni di lavoro · ${dati.completa ? 'completa' : 'incompleta'}`),
    h('label', null, 'Fatica media dei tratti di lavoro (1 = leggera, 10 = massima)'),
    griglia, h('label', null, 'Note'), note,
    h('div', { style: 'height:12px' }),
    h('button', { class: 'primario grande', onclick: () => {
      if (rpe == null) { toast('Scegli la fatica percepita (1-10)'); return; }
      const adesso = new Date();
      scrivi('intervalli', [...leggi('intervalli', []), {
        id: uid(), data: oggiISO(), ora: `${String(adesso.getHours()).padStart(2, '0')}:${String(adesso.getMinutes()).padStart(2, '0')}`,
        livello: dati.livello, nome: dati.nome, attivita: dati.attivita, completa: dati.completa, rpe,
        note: note.value.trim(), durataSec: dati.durataSec, ripCompletate: dati.ripCompletate, ripTot: dati.ripTot, parametri: dati.params,
      }]);
      m.chiudi(); toast('Sessione salvata'); alTermine();
    } }, 'Salva nel diario'),
    h('div', { style: 'height:8px' }),
    h('button', { class: 'pericolo', onclick: () => { if (confirm('Scartare la sessione senza salvarla?')) { m.chiudi(); alTermine(); } } }, 'Non salvare'));
}

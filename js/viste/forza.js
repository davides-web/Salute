// Registro forza: cosa tocca oggi, registrazione con suggerimento di progressione, storico.
import { h, svuota, toast, contatore } from '../core/dom.js';
import { leggi, scrivi, impostazioni } from '../core/store.js';
import { ESERCIZI_INIZIALI } from '../logica/impostazioni.js';
import { cosaTocca, ultimaSessione, suggerisciProgressione, idEsercizio } from '../logica/forza.js';
import { graficoLinee } from '../core/charts.js';
import { NOMI_GIORNI, oggiISO, giornoSettimana, dataBreve, fmt, uid } from '../core/util.js';

export async function render(el) {
  const imp = impostazioni();
  const esercizi = leggi('esercizi', ESERCIZI_INIZIALI);
  const storico = leggi('forza', []);
  const oggi = oggiISO();
  const tocca = cosaTocca(oggi, imp.calendario);
  const nomeVoce = (id) => id === 'riposo' ? 'Riposo' : id === 'intervalli' ? 'Intervalli (timer)' : (esercizi.find((e) => e.id === id)?.nome || id);

  // stato del modulo di inserimento
  const iniziale = esercizi.find((e) => e.id === tocca) || esercizi[0];
  const st = { esercizioId: iniziale?.id, variante: '', serie: 3, ripetizioni: 8, carico: 0, note: '' };
  const ridisegna = () => { svuota(el); disegna(); };

  function applicaSuggerimento() {
    const ex = esercizi.find((e) => e.id === st.esercizioId);
    st.variante = ex && ex.varianti.includes(st.variante) ? st.variante : (ex?.varianti[0] || '');
    const sug = suggerisciProgressione(ultimaSessione(storico, st.esercizioId, st.variante), imp.forza);
    if (sug) { st.serie = sug.serie; st.ripetizioni = sug.ripetizioni; st.carico = sug.carico; }
    return sug;
  }

  function disegna() {
    const ex = esercizi.find((e) => e.id === st.esercizioId);
    const sug = suggerisciProgressione(ultimaSessione(storico, st.esercizioId, st.variante), imp.forza);

    el.append(h('h1', null, 'Forza'));
    el.append(h('div', { class: 'carta evidenza' }, h('div', { class: 'etichetta' }, 'Oggi tocca'),
      h('div', { class: 'numero' }, nomeVoce(tocca)),
      tocca === 'intervalli' && h('p', null, h('a', { href: '#/timer' }, 'Vai al timer →'))));

    // settimana
    el.append(h('div', { class: 'carta' }, h('h2', null, 'Settimana'),
      NOMI_GIORNI.map((n, i) => h('div', { class: 'riga', style: i === giornoSettimana(oggi) ? 'font-weight:700' : '' },
        h('span', null, (i === giornoSettimana(oggi) ? '▶ ' : '') + n), h('span', null, nomeVoce(imp.calendario[i])))),
      h('p', { class: 'muto' }, h('a', { href: '#/impostazioni' }, 'Cambia il calendario nelle Impostazioni'))));

    // registrazione
    el.append(h('div', { class: 'carta' }, h('h2', null, 'Registra'),
      h('label', null, 'Esercizio'),
      h('select', { value: st.esercizioId, onchange: (e) => { st.esercizioId = e.target.value; st.variante = ''; applicaSuggerimento(); ridisegna(); } },
        esercizi.map((x) => h('option', { value: x.id }, x.nome))),
      ex && ex.varianti.length > 0 && [h('label', null, 'Variante'),
        h('div', { class: 'gruppo' }, ex.varianti.map((v) => h('button', { class: st.variante === v ? 'sel' : '',
          onclick: () => { st.variante = v; applicaSuggerimento(); ridisegna(); } }, v)))],
      sug && h('div', { class: 'avviso ok' }, h('strong', null, 'Suggerimento: '), sug.motivo),
      !sug && h('p', { class: 'muto' }, 'Nessuna sessione precedente di questo esercizio: parti da valori che controlli bene.'),
      h('label', null, 'Serie'), contatore({ valore: st.serie, min: 1, max: 20, onCambia: (v) => { st.serie = v; } }),
      h('label', null, 'Ripetizioni (per le isometriche: secondi di tenuta)'), contatore({ valore: st.ripetizioni, min: 1, max: 200, onCambia: (v) => { st.ripetizioni = v; } }),
      h('label', null, 'Carico (kg, 0 = corpo libero)'), contatore({ valore: st.carico, min: 0, max: 500, passo: 0.5, decimali: 1, onCambia: (v) => { st.carico = v; } }),
      h('label', null, 'Note'), h('input', { type: 'text', placeholder: 'facoltative', onchange: (e) => { st.note = e.target.value; } }),
      h('div', { style: 'height:12px' }),
      h('button', { class: 'primario grande', onclick: () => {
        if (!(st.serie > 0 && st.ripetizioni > 0)) { toast('Controlla serie e ripetizioni'); return; }
        const adesso = new Date();
        scrivi('forza', [...storico, {
          id: uid(), data: oggi, ora: `${String(adesso.getHours()).padStart(2, '0')}:${String(adesso.getMinutes()).padStart(2, '0')}`,
          esercizioId: st.esercizioId, variante: st.variante, serie: st.serie, ripetizioni: st.ripetizioni, carico: st.carico || 0, note: st.note,
        }]);
        toast('Registrato'); location.reload();
      } }, 'Salva sessione')));

    // grafico del carico e delle ripetizioni per l'esercizio scelto
    const dellEs = storico.filter((x) => x.esercizioId === st.esercizioId && (x.variante || '') === (st.variante || ''))
      .sort((a, b) => a.data.localeCompare(b.data));
    el.append(h('div', { class: 'carta' }, h('h2', null, `Andamento – ${ex?.nome || ''}${st.variante ? ` (${st.variante})` : ''}`),
      graficoLinee({ serie: [
        { nome: 'Ripetizioni', colore: 1, punti: dellEs.map((x) => ({ x: x.data, y: x.ripetizioni })) },
        { nome: 'Carico (kg)', colore: 2, punti: dellEs.map((x) => ({ x: x.data, y: x.carico })) },
      ], yMin: 0, vuoto: 'Registra qualche sessione per vedere l\'andamento.' })));

    // storico
    const recenti = [...storico].sort((a, b) => `${b.data} ${b.ora}`.localeCompare(`${a.data} ${a.ora}`)).slice(0, 15);
    el.append(h('div', { class: 'carta' }, h('h2', null, 'Storico'),
      recenti.length ? recenti.map((x) => h('div', { class: 'riga' },
        h('div', null, h('strong', null, `${dataBreve(x.data)} · ${esercizi.find((e) => e.id === x.esercizioId)?.nome || x.esercizioId}${x.variante ? ` (${x.variante})` : ''}`),
          h('div', { class: 'muto' }, `${x.serie} × ${x.ripetizioni} · ${fmt(x.carico, 1)} kg${x.note ? ` · ${x.note}` : ''}`)),
        h('button', { class: 'piccolo pericolo', 'aria-label': 'Elimina', onclick: () => {
          if (!confirm('Eliminare questa registrazione?')) return;
          scrivi('forza', leggi('forza', []).filter((y) => y.id !== x.id)); location.reload();
        } }, '🗑')))
        : h('div', { class: 'vuoto' }, 'Nessuna registrazione.')));

    // nuovo esercizio
    const nome = h('input', { type: 'text', placeholder: 'es. Panca con manubri' });
    const varianti = h('input', { type: 'text', placeholder: 'varianti separate da virgola (facoltative)' });
    el.append(h('div', { class: 'carta' }, h('h2', null, 'Aggiungi esercizio'), nome, h('div', { style: 'height:8px' }), varianti,
      h('div', { style: 'height:8px' }),
      h('button', { onclick: () => {
        const n = nome.value.trim();
        if (!n) { toast('Scrivi il nome'); return; }
        const nuovo = { id: idEsercizio(n, esercizi), nome: n, varianti: varianti.value.split(',').map((x) => x.trim()).filter(Boolean) };
        scrivi('esercizi', [...esercizi, nuovo]); toast('Esercizio aggiunto'); location.reload();
      } }, 'Aggiungi')));
  }

  applicaSuggerimento();
  disegna();
}

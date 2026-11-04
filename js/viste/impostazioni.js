// Impostazioni: obiettivi, preferenze, avviso, backup e ripristino.
import { h, toast, scaricaFile, leggiFile } from '../core/dom.js';
import { impostazioni, salvaImpostazioni, leggi, tutto, sostituisciTutto, eliminaTutto } from '../core/store.js';
import { AVVISO, ESERCIZI_INIZIALI } from '../logica/impostazioni.js';
import { creaBackup, leggiBackup, nomeFileBackup } from '../logica/backup.js';
import { NOMI_GIORNI, oggiISO, parseNumero } from '../core/util.js';

export async function render(el) {
  const s = impostazioni();
  const salva = () => { salvaImpostazioni(s); toast('Salvato'); };

  // campo numerico che scrive in s tramite una funzione
  const num = (etichetta, valore, imposta, extra = {}) => h('div', null,
    h('label', null, etichetta),
    h('input', {
      type: 'number', inputmode: 'decimal', step: extra.passo ?? 1, min: extra.min, value: valore ?? '',
      onchange: (e) => { imposta(e.target.value === '' ? null : parseNumero(e.target.value)); salva(); },
    }));
  const spunta = (etichetta, valore, imposta) => h('label', { class: 'spunta' },
    h('input', { type: 'checkbox', checked: valore, onchange: (e) => { imposta(e.target.checked); salva(); } }), etichetta);
  const scelta = (etichetta, valore, opzioni, imposta) => h('div', null,
    h('label', null, etichetta),
    h('select', { value: String(valore ?? ''), onchange: (e) => { imposta(e.target.value); salva(); } },
      opzioni.map(([v, t]) => h('option', { value: String(v) }, t))));

  const esercizi = leggi('esercizi', ESERCIZI_INIZIALI);
  const opzioniGiorno = [['riposo', 'Riposo'], ['intervalli', 'Intervalli (timer)'], ...esercizi.map((x) => [x.id, x.nome])];

  const sommaMacro = () => s.nutrizione.p + s.nutrizione.g + s.nutrizione.c;
  const avvisoMacro = h('p', { class: 'muto' });
  const aggiornaAvvisoMacro = () => { avvisoMacro.textContent = sommaMacro() === 100 ? '' : `Attenzione: la somma P+G+C è ${sommaMacro()}%, dovrebbe essere 100%.`; };
  aggiornaAvvisoMacro();

  const stato = h('p', { class: 'muto' });
  const fileInput = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none', onchange: async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const r = leggiBackup(await leggiFile(f));
    if (!r.ok) { stato.textContent = r.errore; return; }
    if (!confirm('Il ripristino SOSTITUISCE tutti i dati attuali con quelli del backup. Continuare?')) return;
    await sostituisciTutto(r.dati);
    toast('Backup ripristinato');
    location.hash = '#/home';
    location.reload();
  } });

  el.append(
    h('h1', null, 'Impostazioni'),
    h('div', { class: 'avviso' }, AVVISO),

    h('div', { class: 'carta' }, h('h2', null, 'Peso'),
      num('Peso obiettivo (kg)', s.pesoObiettivo, (v) => { s.pesoObiettivo = v; }, { passo: 0.1 }),
      num('Ritmo settimanale desiderato (kg/settimana, negativo = dimagrire)', s.ritmoObiettivo, (v) => { s.ritmoObiettivo = v ?? -0.5; }, { passo: 0.1 })),

    h('div', { class: 'carta' }, h('h2', null, 'Nutrizione'),
      num('Calorie obiettivo (kcal)', s.nutrizione.kcal, (v) => { s.nutrizione.kcal = v ?? 2000; }),
      h('div', { class: 'griglia3' },
        num('Proteine %', s.nutrizione.p, (v) => { s.nutrizione.p = v ?? 0; aggiornaAvvisoMacro(); }),
        num('Grassi %', s.nutrizione.g, (v) => { s.nutrizione.g = v ?? 0; aggiornaAvvisoMacro(); }),
        num('Carboidrati %', s.nutrizione.c, (v) => { s.nutrizione.c = v ?? 0; aggiornaAvvisoMacro(); })),
      avvisoMacro,
      num('Tolleranza sulle calorie (±%) per "giorno dentro obiettivo"', s.nutrizione.tolleranza, (v) => { s.nutrizione.tolleranza = v ?? 10; }),
      num('Un micronutriente è "scarso" se sotto questa % del fabbisogno', s.nutrizione.sogliaMicro, (v) => { s.nutrizione.sogliaMicro = v ?? 100; }),
      scelta('Giorno di ricarica settimanale', s.nutrizione.giornoRicarica ?? '', [['', 'Nessuno'], ...NOMI_GIORNI.map((n, i) => [i, n])],
        (v) => { s.nutrizione.giornoRicarica = v === '' ? null : Number(v); }),
      scelta('Giorno di ricarica nei report', s.nutrizione.modoRicarica, [['separato', 'Mostrato a parte'], ['escludi', 'Escluso dalle medie']],
        (v) => { s.nutrizione.modoRicarica = v; })),

    h('div', { class: 'carta' }, h('h2', null, 'Intervalli'),
      num('Sessioni complete necessarie per proporre di salire di livello', s.avanzamento.sessioniPerSalire, (v) => { s.avanzamento.sessioniPerSalire = v ?? 3; }, { min: 1 }),
      num('Si propone di scendere se l\'RPE dichiarato supera', s.avanzamento.rpeMaxScendere, (v) => { s.avanzamento.rpeMaxScendere = v ?? 9; }, { min: 1 }),
      spunta('Segnale acustico', s.suono, (v) => { s.suono = v; }),
      spunta('Vibrazione', s.vibrazione, (v) => { s.vibrazione = v; }),
      spunta('Annuncio vocale in italiano', s.voce, (v) => { s.voce = v; })),

    h('div', { class: 'carta' }, h('h2', null, 'Forza'),
      num('Tetto di ripetizioni prima di aumentare il carico', s.forza.tetto, (v) => { s.forza.tetto = v ?? 12; }, { min: 1 }),
      num('Ripetizioni di ripartenza dopo l\'aumento del carico', s.forza.ripPartenza, (v) => { s.forza.ripPartenza = v ?? 8; }, { min: 1 }),
      num('Aumento di carico (kg)', s.forza.incrementoCarico, (v) => { s.forza.incrementoCarico = v ?? 2; }, { passo: 0.5 }),
      h('h3', null, 'Calendario settimanale'),
      NOMI_GIORNI.map((nome, i) => scelta(nome, s.calendario[i], opzioniGiorno, (v) => { s.calendario[i] = v; }))),

    h('div', { class: 'carta' }, h('h2', null, 'Backup dei dati'),
      h('p', { class: 'muto' }, 'I dati sono solo su questo telefono. Fai un backup ogni tanto: se cancelli i dati del browser li perdi.'),
      h('button', { class: 'primario grande', onclick: () => {
        scaricaFile(nomeFileBackup(oggiISO()), JSON.stringify(creaBackup(tutto()), null, 1));
        toast('Backup scaricato');
      } }, '⬇️ Esporta backup (JSON)'),
      h('div', { style: 'height:10px' }),
      h('button', { class: 'grande', onclick: () => fileInput.click() }, '⬆️ Ripristina da backup'),
      fileInput, stato,
      h('div', { style: 'height:10px' }),
      h('button', { class: 'pericolo', onclick: async () => {
        if (!confirm('Eliminare TUTTI i dati dell\'app da questo dispositivo? L\'operazione non si può annullare.')) return;
        if (!confirm('Sei sicuro? Fai prima un backup se vuoi poterli recuperare.')) return;
        await eliminaTutto();
        location.hash = '#/home';
        location.reload();
      } }, 'Elimina tutti i dati')),
    h('p', { class: 'muto centro' }, 'Nessun dato lascia il dispositivo. L\'app non usa server né servizi esterni.'),
  );
}

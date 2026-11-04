// Sequenza del timer a intervalli. Tutto in SECONDI. Funzioni pure, provate con i test.

export const ATTIVITA = [
  ['camminata', 'Camminata'],
  ['salita', 'Camminata in salita / tapis roulant'],
  ['cyclette', 'Cyclette'],
  ['ellittica', 'Ellittica'],
  ['corsa', 'Corsa'],
];
export const nomeAttivita = (id) => (ATTIVITA.find((a) => a[0] === id) || [id, id || '–'])[1];

export const ETICHETTE_FASE = {
  riscaldamento: 'Riscaldamento', lavoro: 'Lavoro', recupero: 'Recupero', pausa: 'Pausa serie', defaticamento: 'Defaticamento',
};

/**
 * Costruisce l'elenco delle fasi:
 * riscaldamento, poi per ogni serie (lavoro, recupero, lavoro, ...), pausa tra le serie, defaticamento.
 * Dopo l'ultima ripetizione di una serie non c'è recupero: segue la pausa o il defaticamento.
 * Le fasi di durata 0 vengono saltate.
 */
export function costruisciSequenza(p) {
  const seq = [];
  const aggiungi = (tipo, durata, extra = {}) => {
    if (durata > 0) seq.push({ tipo, durata, ...extra });
  };
  const rip = Math.max(1, Math.floor(p.ripetizioni || 1));
  const serie = Math.max(1, Math.floor(p.serie || 1));
  aggiungi('riscaldamento', p.riscaldamento);
  for (let s = 1; s <= serie; s++) {
    for (let r = 1; r <= rip; r++) {
      const info = { serie: s, serieTot: serie, rip: r, ripTot: rip };
      aggiungi('lavoro', p.lavoro, info);
      if (r < rip) aggiungi('recupero', p.recupero, info);
    }
    if (s < serie) aggiungi('pausa', p.pausaSerie, { serie: s, serieTot: serie });
  }
  aggiungi('defaticamento', p.defaticamento);
  return seq;
}

export const durataTotale = (seq) => seq.reduce((t, f) => t + f.durata, 0);

/**
 * Dove siamo dopo `trascorso` secondi?
 * Restituisce { finito, indice, fase, restante (s), trascorsoFase (s) }.
 */
export function statoAlTempo(seq, trascorso) {
  let inizio = 0;
  for (let i = 0; i < seq.length; i++) {
    const fine = inizio + seq[i].durata;
    if (trascorso < fine) {
      return { finito: false, indice: i, fase: seq[i], restante: fine - trascorso, trascorsoFase: trascorso - inizio };
    }
    inizio = fine;
  }
  return { finito: true, indice: seq.length, fase: null, restante: 0, trascorsoFase: 0 };
}

/** Quante ripetizioni di lavoro sono state terminate dopo `trascorso` secondi. */
export function ripetizioniCompletate(seq, trascorso) {
  let t = 0, n = 0;
  for (const f of seq) {
    t += f.durata;
    if (f.tipo === 'lavoro' && trascorso >= t) n++;
  }
  return n;
}
export const ripetizioniTotali = (seq) => seq.filter((f) => f.tipo === 'lavoro').length;

/** Testo da leggere ad alta voce al cambio di fase. */
export function annuncioFase(f) {
  switch (f.tipo) {
    case 'lavoro':
      return `Lavoro. Ripetizione ${f.rip} di ${f.ripTot}` + (f.serieTot > 1 ? `, serie ${f.serie} di ${f.serieTot}` : '');
    case 'recupero': return 'Recupero';
    case 'pausa': return 'Pausa tra le serie';
    case 'riscaldamento': return 'Riscaldamento';
    case 'defaticamento': return 'Defaticamento';
    default: return '';
  }
}

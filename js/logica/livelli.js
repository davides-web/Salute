// Percorso a livelli e regola di avanzamento.
// Tutte le durate sono in SECONDI. RPE = fatica percepita da 1 a 10.

export const LIVELLI = [
  { n: 1, lavoro: 60, recupero: 120, ripetizioni: 6, rpe: '5-6', rpePrevisto: 6, riscaldamento: 300,
    descr: '1\' passo svelto / 2\' passo normale', nota: 'Passo svelto = RPE 5-6.' },
  { n: 2, lavoro: 60, recupero: 60, ripetizioni: 8, rpe: '5-6', rpePrevisto: 6, riscaldamento: 300,
    descr: '1\' passo svelto / 1\' passo normale', nota: 'Passo svelto = RPE 5-6.' },
  { n: 3, lavoro: 30, recupero: 60, ripetizioni: 8, rpe: '7', rpePrevisto: 7, riscaldamento: 480,
    descr: '30" intenso / 60" facile', nota: 'Meglio in salita, in cyclette o all\'ellittica. Intenso = RPE 7.' },
  { n: 4, lavoro: 30, recupero: 45, ripetizioni: 10, rpe: '7', rpePrevisto: 7, riscaldamento: 480,
    descr: '30" intenso / 45" facile', nota: 'Intenso = RPE 7.' },
  { n: 5, lavoro: 30, recupero: 30, ripetizioni: 6, ripetizioniMax: 8, rpe: '7', rpePrevisto: 7, riscaldamento: 480,
    descr: '30" / 30", 6-8 ripetizioni a intensità moderata', nota: 'Parti da 6 ripetizioni e arriva a 8. Intensità moderata = RPE 7.' },
  { n: 6, lavoro: 30, recupero: 30, ripetizioni: 10, ripetizioniMax: 12, rpe: '8-9', rpePrevisto: 9, riscaldamento: 480,
    descr: 'Billat 30/30, 10-12 ripetizioni a intensità alta', nota: 'Parti da 10 ripetizioni e arriva a 12. Intensità alta = RPE 8-9.' },
];
export const NUMERO_LIVELLI = LIVELLI.length;
export const DEFATICAMENTO = 300;

export const nomeLivello = (n) => `Livello ${n}`;

/** Parametri del timer corrispondenti a un livello. */
export function parametriLivello(n) {
  const l = LIVELLI[n - 1];
  return {
    riscaldamento: l.riscaldamento, lavoro: l.lavoro, recupero: l.recupero, ripetizioni: l.ripetizioni,
    serie: 1, pausaSerie: 0, defaticamento: DEFATICAMENTO,
  };
}

/** Se i parametri coincidono con un livello restituisce il numero, altrimenti null. */
export function livelloDaParametri(p) {
  const chiavi = ['riscaldamento', 'lavoro', 'recupero', 'ripetizioni', 'serie', 'pausaSerie', 'defaticamento'];
  for (const l of LIVELLI) {
    const base = parametriLivello(l.n);
    const uguali = (q) => chiavi.every((k) => base[k] === q[k]);
    if (uguali(p)) return l.n;
    // le ripetizioni dei livelli 5 e 6 possono stare nell'intervallo indicato
    if (l.ripetizioniMax && p.ripetizioni >= l.ripetizioni && p.ripetizioni <= l.ripetizioniMax
      && chiavi.filter((k) => k !== 'ripetizioni').every((k) => base[k] === p[k])) return l.n;
  }
  return null;
}

const chiaveOrdine = (s) => `${s.data || ''} ${s.ora || ''}`;

/**
 * Regola di avanzamento (solo un SUGGERIMENTO).
 *  - SCENDERE se l'ultima sessione fatta a questo livello non è stata completata
 *    oppure l'RPE dichiarato supera `rpeMaxScendere` (predefinito 9).
 *  - SALIRE dopo `sessioniPerSalire` (predefinito 3) sessioni consecutive a questo livello,
 *    tutte complete e con fatica media dei tratti di lavoro <= RPE previsto dal livello.
 * `sessioni`: [{ data, ora, livello, completa, rpe }]; le sessioni senza livello si ignorano.
 */
export function proponiLivello(sessioni, livelloAttuale, cfg = {}) {
  const N = cfg.sessioniPerSalire ?? 3;
  const rpeMax = cfg.rpeMaxScendere ?? 9;
  const valide = sessioni.filter((s) => Number.isInteger(s.livello))
    .sort((a, b) => chiaveOrdine(a).localeCompare(chiaveOrdine(b)));
  const resta = (motivo) => ({ azione: 'resta', livello: livelloAttuale, motivo });
  const ultima = valide[valide.length - 1];
  if (!ultima) return resta('Nessuna sessione registrata: parti dal livello scelto.');

  if (ultima.livello === livelloAttuale && (!ultima.completa || (ultima.rpe ?? 0) > rpeMax)) {
    const motivo = !ultima.completa
      ? 'L\'ultima sessione non è stata completata.'
      : `L'ultima sessione è stata durissima (RPE ${ultima.rpe}).`;
    if (livelloAttuale > 1) return { azione: 'scendi', livello: livelloAttuale - 1, motivo };
    return resta(motivo + ' Sei già al livello più basso: ripetilo con calma.');
  }

  // sessioni consecutive più recenti fatte a questo livello
  const serie = [];
  for (let i = valide.length - 1; i >= 0 && valide[i].livello === livelloAttuale; i--) serie.unshift(valide[i]);
  if (serie.length < N) {
    return resta(`Servono ${N} sessioni complete di fila a questo livello (finora ${serie.length}).`);
  }
  const previsto = LIVELLI[livelloAttuale - 1].rpePrevisto;
  const ultime = serie.slice(-N);
  const tutteBuone = ultime.every((s) => s.completa && s.rpe != null && s.rpe <= previsto);
  if (!tutteBuone) return resta(`Per salire servono ${N} sessioni complete con fatica media non oltre RPE ${previsto}.`);
  if (livelloAttuale >= NUMERO_LIVELLI) return resta('Hai raggiunto l\'ultimo livello: mantienilo.');
  return { azione: 'sali', livello: livelloAttuale + 1, motivo: `${N} sessioni complete con fatica non oltre RPE ${previsto}.` };
}

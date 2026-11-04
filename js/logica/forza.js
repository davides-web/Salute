// Registro forza: progressione semplice e calendario settimanale. Funzioni pure.
import { giornoSettimana } from '../core/util.js';

/**
 * Cosa tocca in una certa data secondo il calendario (7 voci, lunedì = 0).
 * Valori: 'riposo', 'intervalli' oppure l'id di un esercizio.
 */
export function cosaTocca(dataISO, calendario) {
  return calendario[giornoSettimana(dataISO)] || 'riposo';
}

/** Ultima registrazione dello stesso esercizio e variante (storico in ordine qualsiasi). */
export function ultimaSessione(storico, esercizioId, variante = '') {
  const v = storico
    .filter((x) => x.esercizioId === esercizioId && (x.variante || '') === (variante || ''))
    .sort((a, b) => `${a.data} ${a.ora || ''}`.localeCompare(`${b.data} ${b.ora || ''}`));
  return v[v.length - 1] || null;
}

/**
 * Suggerimento di progressione:
 *  - se le ripetizioni sono sotto il tetto: stesso carico, +1 ripetizione;
 *  - se hanno raggiunto il tetto: carico + incremento e si riparte da `ripPartenza`.
 * cfg: { tetto: 12, ripPartenza: 8, incrementoCarico: 2 }
 * Restituisce null se non c'è uno storico.
 */
export function suggerisciProgressione(ultima, cfg) {
  if (!ultima) return null;
  const tetto = cfg.tetto ?? 12;
  const base = { serie: ultima.serie };
  if (ultima.ripetizioni >= tetto) {
    const carico = Math.round((ultima.carico + (cfg.incrementoCarico ?? 2)) * 100) / 100;
    return { ...base, carico, ripetizioni: cfg.ripPartenza ?? 8,
      motivo: `Hai raggiunto ${tetto} ripetizioni: aumenta il carico a ${carico} kg e riparti da ${cfg.ripPartenza ?? 8}.` };
  }
  return { ...base, carico: ultima.carico, ripetizioni: ultima.ripetizioni + 1,
    motivo: `Stesso carico (${ultima.carico} kg), prova ${ultima.ripetizioni + 1} ripetizioni (tetto ${tetto}).` };
}

/** Id leggibile ricavato dal nome ("Panca piana" -> "panca-piana"), unico rispetto agli esistenti. */
export function idEsercizio(nome, esistenti) {
  const base = nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'esercizio';
  let id = base, n = 2;
  while (esistenti.some((e) => e.id === id)) id = `${base}-${n++}`;
  return id;
}

// Mi Fitness (Xiaomi): mappatura delle colonne e aggregazione dei dati. Funzioni pure.
// Il formato dell'archivio Xiaomi non è documentato: l'utente indica quale colonna è quale.
import { normalizzaData, parseNumero, estraiOra, percentile, media, somma } from '../core/util.js';

/** Per ogni tipo di file: ruoli = [id, etichetta, obbligatorio]. */
export const TIPI_FITNESS = {
  passi: { nome: 'Passi', ruoli: [['data', 'Data', true], ['passi', 'Passi', true]], unita: false },
  frequenza: {
    nome: 'Frequenza cardiaca',
    ruoli: [['data', 'Data (e ora)', true], ['bpm', 'Battiti al minuto (campioni)', false], ['fcRiposo', 'Frequenza a riposo (già giornaliera)', false]],
    unita: false, nota: 'Serve almeno una tra "battiti" e "a riposo". Dai campioni si ricava la frequenza a riposo del giorno (10° percentile).',
  },
  sonno: {
    nome: 'Sonno',
    ruoli: [['data', 'Data', true], ['durata', 'Durata del sonno', false], ['inizio', 'Ora di inizio', false], ['fine', 'Ora di fine', false]],
    unita: true, nota: 'Serve la durata, oppure inizio e fine.',
  },
  allenamenti: {
    nome: 'Allenamenti',
    ruoli: [['data', 'Data', true], ['tipo', 'Tipo di attività', false], ['durata', 'Durata', false], ['calorie', 'Calorie', false], ['distanza', 'Distanza (m)', false], ['fcMedia', 'Frequenza media', false]],
    unita: true,
  },
};

/** Controlla una mappatura: restituisce un messaggio d'errore oppure null. */
export function errorMappatura(tipo, colonne) {
  const t = TIPI_FITNESS[tipo];
  for (const [id, et, obbl] of t.ruoli) if (obbl && !colonne[id]) return `Indica la colonna "${et}".`;
  if (tipo === 'frequenza' && !colonne.bpm && !colonne.fcRiposo) return 'Indica la colonna dei battiti oppure quella della frequenza a riposo.';
  if (tipo === 'sonno' && !colonne.durata && !(colonne.inizio && colonne.fine)) return 'Indica la durata del sonno, oppure inizio e fine.';
  return null;
}

// espressioni per indovinare i ruoli (in ordine di preferenza)
const SINONIMI = {
  data: [/^date$|^data$|^day$|^giorno$/, /date|data|giorno|day/, /^time$|timestamp|datetime|start|^ora$/],
  passi: [/^steps?$|^passi$/, /step|passi/],
  fcRiposo: [/rest|riposo/],
  bpm: [/heart.?rate|^hr$|^bpm$|bpm|frequenz|battit|^rate$/],
  fcMedia: [/avg.*(heart|hr)|heart.*avg|media.*(fc|freq)|avg.?hr/],
  durata: [/dur/, /total|totale/, /sleep.*(min|hour|time)|minut|hours|ore/],
  inizio: [/start|begin|bed|inizio|fall/],
  fine: [/(^|[_\s-])(end|wake|stop|fine|sveglia)/],
  tipo: [/type|tipo|sport|activity|attivit/],
  calorie: [/kcal|calor/],
  distanza: [/dist/],
};

/** Prova a indovinare la mappatura dai nomi delle colonne. Restituisce { colonne, unita }. */
export function indovinaMappatura(tipo, intestazioni, righe = []) {
  const colonne = {};
  const usate = new Set();
  const ordine = TIPI_FITNESS[tipo].ruoli.map((r) => r[0]);
  // prima i ruoli più "specifici": così "heart rate a riposo" non finisce nei battiti
  const priorita = ['data', 'fcRiposo', 'fcMedia', ...ordine.filter((x) => !['data', 'fcRiposo', 'fcMedia'].includes(x))];
  for (const ruolo of priorita) {
    if (!ordine.includes(ruolo)) continue;
    for (const re of SINONIMI[ruolo] || []) {
      const col = intestazioni.find((h) => !usate.has(h) && re.test(h.toLowerCase().trim())
        && !(ruolo === 'bpm' && /rest|riposo|avg|media/.test(h.toLowerCase())));
      if (col) { colonne[ruolo] = col; usate.add(col); break; }
    }
  }
  let unita = 'minuti';
  const colD = colonne.durata;
  if (colD) {
    const h = colD.toLowerCase();
    if (/\(s\)|sec/.test(h)) unita = 'secondi';
    else if (/\(h\)|\bhour|\bore\b|hours/.test(h)) unita = 'ore';
    else if (/min/.test(h)) unita = 'minuti';
    else {
      const v = righe.map((r) => parseNumero(r[colD])).filter((x) => x != null);
      const m = percentile(v, 0.5);
      unita = m == null ? 'minuti' : m <= 24 ? 'ore' : m > 1500 ? 'secondi' : 'minuti';
    }
  }
  return { colonne, unita };
}

/** Una mappatura salvata è utilizzabile con questo file se tutte le sue colonne esistono. */
export function mappaturaCompatibile(salvata, intestazioni) {
  if (!salvata || !salvata.colonne) return false;
  return Object.values(salvata.colonne).every((c) => intestazioni.includes(c)) && Object.keys(salvata.colonne).length > 0;
}

const aMinuti = (v, unita) => (v == null ? null : unita === 'ore' ? v * 60 : unita === 'secondi' ? v / 60 : v);

/** Testo data/ora (anche timestamp) -> millisecondi, oppure null. */
export function dataOraMs(v) {
  const s = String(v ?? '').trim();
  if (!s) return null;
  if (/^\d{9,13}$/.test(s)) return s.length <= 10 ? Number(s) * 1000 : Number(s);
  const t = Date.parse(s.replace(' ', 'T'));
  return Number.isFinite(t) ? t : null;
}

/**
 * Applica la mappatura a un file letto con leggiTabella.
 * Restituisce { tipo, scartate, ... }:
 *  passi: { passi: {data: n} } · frequenza: { fc: {data: {riposo, media}} }
 *  sonno: { sonno: {data: minuti} } · allenamenti: { allenamenti: [...] }
 */
export function applicaMappatura(tipo, righe, mappa) {
  const c = mappa.colonne;
  const unita = mappa.unita || 'minuti';
  let scartate = 0;
  const num = (r, col) => (col ? parseNumero(r[col]) : null);

  if (tipo === 'passi') {
    const passi = {};
    for (const r of righe) {
      const d = normalizzaData(r[c.data]), n = num(r, c.passi);
      if (!d || n == null || n < 0) { scartate++; continue; }
      passi[d] = (passi[d] || 0) + n; // più righe nello stesso giorno (es. orarie) si sommano
    }
    return { tipo, passi, scartate };
  }

  if (tipo === 'frequenza') {
    const camp = {}, riposoDiretto = {};
    for (const r of righe) {
      const d = normalizzaData(r[c.data]);
      if (!d) { scartate++; continue; }
      const b = num(r, c.bpm), rip = num(r, c.fcRiposo);
      if (b != null && b >= 30 && b <= 230) (camp[d] ||= []).push(b);
      else if (rip != null && rip >= 30 && rip <= 130) (riposoDiretto[d] ||= []).push(rip);
      else scartate++;
    }
    const fc = {};
    for (const d of new Set([...Object.keys(camp), ...Object.keys(riposoDiretto)])) {
      const riposo = riposoDiretto[d] ? media(riposoDiretto[d]) : percentile(camp[d], 0.1);
      fc[d] = { riposo: Math.round(riposo * 10) / 10, media: camp[d] ? Math.round(media(camp[d]) * 10) / 10 : null };
    }
    return { tipo, fc, scartate };
  }

  if (tipo === 'sonno') {
    const sonno = {};
    for (const r of righe) {
      const d = normalizzaData(r[c.data]);
      let min = aMinuti(num(r, c.durata), unita);
      if (min == null && c.inizio && c.fine) {
        const a = dataOraMs(r[c.inizio]), b = dataOraMs(r[c.fine]);
        if (a != null && b != null && b > a) min = (b - a) / 60000;
      }
      if (!d || min == null || min <= 0 || min > 1440) { scartate++; continue; }
      sonno[d] = (sonno[d] || 0) + Math.round(min);
    }
    return { tipo, sonno, scartate };
  }

  const allenamenti = [];
  for (const r of righe) {
    const d = normalizzaData(r[c.data]);
    if (!d) { scartate++; continue; }
    const dur = aMinuti(num(r, c.durata), unita);
    allenamenti.push({
      data: d, ora: estraiOra(r[c.data]), tipo: c.tipo ? r[c.tipo] : '', durataMin: dur == null ? null : Math.round(dur * 10) / 10,
      kcal: num(r, c.calorie), distanza: num(r, c.distanza), fcMedia: num(r, c.fcMedia),
    });
  }
  return { tipo, allenamenti, scartate };
}

/** Passi per mese: [{ mese:'AAAA-MM', totale, giorni, media }] in ordine di data. */
export function totaliMensili(passi) {
  const per = {};
  for (const [d, n] of Object.entries(passi)) (per[d.slice(0, 7)] ||= []).push(n);
  return Object.keys(per).sort().map((mese) => ({ mese, totale: somma(per[mese]), giorni: per[mese].length, media: media(per[mese]) }));
}

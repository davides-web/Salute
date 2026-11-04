// Funzioni di utilità: date (sempre come testo "AAAA-MM-GG"), numeri, formati.
// Nessuna dipendenza dal browser: si possono provare anche con Node.

export const NOMI_GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
export const NOMI_GIORNI_BREVI = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
const NOMI_MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

const due = (n) => String(n).padStart(2, '0');

/** Data JavaScript -> "AAAA-MM-GG" (ora locale). */
export function formatISO(d) {
  return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
}
export const oggiISO = () => formatISO(new Date());

/** "AAAA-MM-GG" -> Date a mezzogiorno locale (evita problemi di ora legale). */
export function daISO(iso) {
  const [a, m, g] = iso.split('-').map(Number);
  return new Date(a, m - 1, g, 12);
}
export function aggiungiGiorni(iso, n) {
  const d = daISO(iso);
  d.setDate(d.getDate() + n);
  return formatISO(d);
}
/** Giorni da a a b (b - a). */
export function differenzaGiorni(a, b) {
  const [ya, ma, ga] = a.split('-').map(Number);
  const [yb, mb, gb] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, gb) - Date.UTC(ya, ma - 1, ga)) / 86400000);
}
/** 0 = lunedì ... 6 = domenica. */
export function giornoSettimana(iso) {
  return (daISO(iso).getDay() + 6) % 7;
}
export const inizioSettimana = (iso) => aggiungiGiorni(iso, -giornoSettimana(iso));
export const inizioMese = (iso) => iso.slice(0, 8) + '01';
export function fineMese(iso) {
  const d = daISO(inizioMese(iso));
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return formatISO(d);
}
export function aggiungiMesi(iso, n) {
  const d = daISO(inizioMese(iso));
  d.setMonth(d.getMonth() + n);
  return formatISO(d);
}
export function nomeMese(iso) {
  const d = daISO(iso);
  return `${NOMI_MESI[d.getMonth()]} ${d.getFullYear()}`;
}
/** "ven 4 nov" */
export function dataBreve(iso) {
  const d = daISO(iso);
  return `${NOMI_GIORNI_BREVI[giornoSettimana(iso)]} ${d.getDate()} ${NOMI_MESI[d.getMonth()].slice(0, 3)}`;
}
/** "4/11" per le etichette dei grafici. */
export function giornoMese(iso) {
  const d = daISO(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
/** "4 novembre 2026" */
export function dataLunga(iso) {
  const d = daISO(iso);
  return `${d.getDate()} ${NOMI_MESI[d.getMonth()]} ${d.getFullYear()}`;
}

/** Legge un numero accettando virgola decimale e separatori delle migliaia. */
export function parseNumero(v) {
  if (v == null) return null;
  let s = String(v).trim().replace(/\s/g, '');
  if (s === '' || s === '-') return null;
  if (s.includes(',') && s.includes('.')) {
    // l'ultimo separatore è quello decimale
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Riconosce molte forme di data e restituisce "AAAA-MM-GG" (o null). */
export function normalizzaData(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const valida = (a, m, g) => {
    a = +a; m = +m; g = +g;
    if (m < 1 || m > 12 || g < 1 || g > 31 || a < 1970 || a > 2100) return null;
    return `${a}-${due(m)}-${due(g)}`;
  };
  let m = s.match(/^(\d{4})(\d{2})(\d{2})$/); // 20250105
  if (m) return valida(m[1], m[2], m[3]);
  if (/^\d{9,13}$/.test(s)) { // secondi o millisecondi dal 1970
    const n = Number(s);
    return formatISO(new Date(s.length <= 10 ? n * 1000 : n));
  }
  m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/); // 2025-01-05
  if (m) return valida(m[1], m[2], m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/); // 05/01/2025 (giorno/mese) o 01/25/2025 (mese/giorno)
  if (m) {
    const a = +m[1], b = +m[2];
    if (b > 12 && a <= 12) return valida(m[3], a, b);
    return valida(m[3], b, a);
  }
  return null;
}

/** Ora "HH:MM" da testo tipo "2025-01-05 07:31:00" o da un timestamp. */
export function estraiOra(v) {
  const s = String(v ?? '').trim();
  const m = s.match(/[ T](\d{1,2}):(\d{2})/);
  if (m) return `${due(m[1])}:${m[2]}`;
  if (/^\d{9,13}$/.test(s)) {
    const d = new Date(s.length <= 10 ? Number(s) * 1000 : Number(s));
    return `${due(d.getHours())}:${due(d.getMinutes())}`;
  }
  return null;
}

export const somma = (a) => a.reduce((t, x) => t + x, 0);
export const media = (a) => (a.length ? somma(a) / a.length : null);
export function arrotonda(n, dec = 0) {
  if (n == null || !Number.isFinite(n)) return null;
  const f = 10 ** dec;
  return Math.round(n * f) / f;
}
/** Numero all'italiana ("1.234,5"); "–" se manca. */
export function fmt(n, dec = 0) {
  if (n == null || !Number.isFinite(n)) return '–';
  return n.toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
/** Minuti -> "7 h 30 min". */
export function fmtDurataMin(min) {
  if (min == null) return '–';
  const m = Math.round(min);
  return m >= 60 ? `${Math.floor(m / 60)} h ${due(m % 60)} min` : `${m} min`;
}
/** Secondi -> "m:ss". */
export function fmtMmSs(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${due(s % 60)}`;
}
export function percentile(valori, p) {
  if (!valori.length) return null;
  const v = [...valori].sort((a, b) => a - b);
  const pos = (v.length - 1) * p;
  const i = Math.floor(pos);
  return i + 1 < v.length ? v[i] + (v[i + 1] - v[i]) * (pos - i) : v[i];
}
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

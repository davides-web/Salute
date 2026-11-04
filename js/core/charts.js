// Grafici SVG fatti in casa (nessuna libreria). I colori vengono dal CSS, quindi seguono il tema.
import { differenzaGiorni, giornoMese } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
const L = 360, MS = 40, MD = 10, MA = 10, MB = 24; // larghezza e margini (sinistro, destro, alto, basso)

function s(tag, attrs, ...figli) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null) el.setAttribute(k, v);
  for (const f of figli) if (f != null) el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  return el;
}

function passoBello(intervallo, n) {
  const grezzo = intervallo / n;
  const mag = 10 ** Math.floor(Math.log10(grezzo));
  const f = grezzo / mag;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
}

/** Valori "tondi" per l'asse verticale che coprono [min, max]. */
export function tacche(min, max, n = 4) {
  if (min === max) { min -= 1; max += 1; }
  const passo = passoBello(max - min, n);
  const a = Math.floor(min / passo + 1e-9) * passo;
  const b = Math.ceil(max / passo - 1e-9) * passo;
  const out = [];
  for (let v = a; v <= b + passo / 2; v += passo) out.push(Number(v.toFixed(10)));
  return out;
}

const nessunDato = (t = 'Ancora nessun dato da mostrare.') => {
  const d = document.createElement('div');
  d.className = 'vuoto';
  d.textContent = t;
  return d;
};

function legenda(serie) {
  const d = document.createElement('div');
  d.className = 'legenda';
  for (const sr of serie) {
    if (!sr.nome) continue;
    const i = document.createElement('i');
    i.style.background = `var(--serie${(sr.colore || 1)})`;
    const span = document.createElement('span');
    span.append(i, sr.nome);
    d.append(span);
  }
  return d;
}

function asseY(svg, ticks, y, formato, larghezzaPiena) {
  for (const t of ticks) {
    svg.append(s('line', { class: 'asse', x1: MS, x2: L - MD, y1: y(t), y2: y(t) }));
    svg.append(s('text', { x: MS - 5, y: y(t) + 4, 'text-anchor': 'end' }, formato ? formato(t) : t));
  }
}

/**
 * Grafico a linee con asse X di date.
 * opzioni: { serie:[{nome, colore:1|2|3, punti:[{x:'AAAA-MM-GG', y}], linea=true, punti_=true, tratteggio}],
 *            altezza, yMin, yMax, formatoY, orizzontali:[{y, etichetta}], intero:boolean }
 */
export function graficoLinee(op) {
  const tutti = op.serie.flatMap((sr) => sr.punti).filter((p) => p.y != null);
  const wrap = document.createElement('div');
  if (!tutti.length) { wrap.append(nessunDato(op.vuoto)); return wrap; }
  const H = op.altezza || 200;
  const giorni = tutti.map((p) => differenzaGiorni('2000-01-01', p.x));
  let x0 = Math.min(...giorni), x1 = Math.max(...giorni);
  if (x0 === x1) { x0 -= 3; x1 += 3; }
  const ys = tutti.map((p) => p.y).concat((op.orizzontali || []).map((o) => o.y));
  const tk = tacche(op.yMin ?? Math.min(...ys), op.yMax ?? Math.max(...ys), 4);
  const y0 = op.yMin ?? tk[0], y1 = op.yMax ?? tk[tk.length - 1];
  const X = (g) => MS + ((g - x0) / (x1 - x0)) * (L - MS - MD);
  const Y = (v) => H - MB - ((v - y0) / (y1 - y0 || 1)) * (H - MB - MA);
  const svg = s('svg', { class: 'grafico', viewBox: `0 0 ${L} ${H}`, role: 'img', 'aria-label': op.descrizione || 'Grafico' });
  asseY(svg, tk.filter((t) => t >= y0 - 1e-9 && t <= y1 + 1e-9), Y, op.formatoY);
  // etichette X: fino a 4 date distribuite
  const nEt = Math.min(4, x1 - x0 + 1);
  for (let i = 0; i < nEt; i++) {
    const g = x0 + ((x1 - x0) * i) / Math.max(1, nEt - 1);
    const d = new Date(Date.UTC(2000, 0, 1) + Math.round(g) * 86400000);
    svg.append(s('text', { x: X(g), y: H - 6, 'text-anchor': i === 0 ? 'start' : i === nEt - 1 ? 'end' : 'middle' },
      giornoMese(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`)));
  }
  for (const o of op.orizzontali || []) {
    svg.append(s('line', { class: 'obiettivo', x1: MS, x2: L - MD, y1: Y(o.y), y2: Y(o.y) }));
    if (o.etichetta) svg.append(s('text', { x: L - MD, y: Y(o.y) - 4, 'text-anchor': 'end' }, o.etichetta));
  }
  for (const sr of op.serie) {
    const pts = sr.punti.filter((p) => p.y != null).map((p) => [X(differenzaGiorni('2000-01-01', p.x)), Y(p.y)]);
    const cl = `s${sr.colore || 1}`;
    if (sr.linea !== false && pts.length > 1) {
      svg.append(s('polyline', { class: `linea ${cl}`, points: pts.map((p) => p.join(',')).join(' '), 'stroke-dasharray': sr.tratteggio ? '6 4' : null }));
    }
    if (sr.marker !== false) for (const [px, py] of pts) svg.append(s('circle', { class: `punto ${cl}`, cx: px, cy: py, r: sr.raggio || 3.2 }));
  }
  wrap.append(svg, legenda(op.serie));
  return wrap;
}

/**
 * Grafico a barre. opzioni: { barre:[{x:etichetta, y, colore?}], altezza, formatoY, orizzontali:[{y, etichetta}],
 *                             etichettaX:(x)=>testo, colore:1|2|3 }
 */
export function graficoBarre(op) {
  const wrap = document.createElement('div');
  const barre = op.barre;
  if (!barre.length || barre.every((b) => b.y == null)) { wrap.append(nessunDato(op.vuoto)); return wrap; }
  const H = op.altezza || 180;
  const massimo = Math.max(...barre.map((b) => b.y || 0), ...(op.orizzontali || []).map((o) => o.y), 1);
  const tk = tacche(0, massimo, 4);
  const y1 = tk[tk.length - 1];
  const Y = (v) => H - MB - (v / y1) * (H - MB - MA);
  const svg = s('svg', { class: 'grafico', viewBox: `0 0 ${L} ${H}`, role: 'img', 'aria-label': op.descrizione || 'Grafico a barre' });
  asseY(svg, tk, Y, op.formatoY);
  const n = barre.length;
  const larghezzaSlot = (L - MS - MD) / n;
  const lb = Math.max(2, larghezzaSlot * 0.72);
  const ogni = Math.max(1, Math.ceil(n / 7));
  barre.forEach((b, i) => {
    const cx = MS + larghezzaSlot * (i + 0.5);
    if (b.y != null) {
      const alto = Math.max(0, Y(0) - Y(b.y));
      svg.append(s('rect', { class: `barra-s s${b.colore || op.colore || 1}`, x: cx - lb / 2, y: Y(b.y), width: lb, height: alto, rx: 2 }));
    }
    if (i % ogni === 0 || i === n - 1 && n <= 7) {
      svg.append(s('text', { x: cx, y: H - 6, 'text-anchor': 'middle' }, op.etichettaX ? op.etichettaX(b.x) : b.x));
    }
  });
  for (const o of op.orizzontali || []) {
    svg.append(s('line', { class: 'obiettivo', x1: MS, x2: L - MD, y1: Y(o.y), y2: Y(o.y) }));
    if (o.etichetta) svg.append(s('text', { x: L - MD, y: Y(o.y) - 4, 'text-anchor': 'end' }, o.etichetta));
  }
  wrap.append(svg);
  if (op.legenda) wrap.append(legenda(op.legenda));
  return wrap;
}

export { giornoMese };

// Piccoli aiuti per costruire l'interfaccia senza librerie.
// Il testo viene sempre inserito come testo (mai come HTML): niente iniezioni.

/** h('div', {class:'x', onclick: fn}, 'testo', altroNodo) */
export function h(tag, attrs, ...figli) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false || k === 'value') continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'checked' || k === 'disabled' || k === 'selected') el[k] = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  aggiungi(el, figli);
  if (attrs && 'value' in attrs && attrs.value != null) el.value = attrs.value; // dopo le <option>
  return el;
}

export function aggiungi(el, figli) {
  for (const f of figli.flat(Infinity)) {
    if (f == null || f === false) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return el;
}

export function svuota(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export function toast(testo) {
  const t = h('div', { class: 'toast', role: 'status' }, testo);
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}

/** Finestra modale dal basso. Restituisce { chiudi }. */
export function modale(...contenuto) {
  const velo = h('div', { class: 'velo' });
  const box = h('div', { class: 'modale', role: 'dialog' }, ...contenuto);
  velo.append(box);
  document.body.append(velo);
  return { chiudi: () => velo.remove(), box };
}

/** Campo numerico con pulsanti − e + (comodo con le mani sudate). */
export function contatore({ valore, passo = 1, min = 0, max = 9999, decimali = 0, onCambia }) {
  const campo = h('input', { type: 'number', inputmode: decimali ? 'decimal' : 'numeric', step: passo, min, max, value: valore });
  const cambia = (d) => {
    const v = Math.min(max, Math.max(min, (parseFloat(campo.value) || 0) + d));
    campo.value = Number(v.toFixed(decimali));
    onCambia?.(parseFloat(campo.value));
  };
  campo.addEventListener('change', () => onCambia?.(parseFloat(campo.value)));
  const el = h('div', { class: 'contatore' },
    h('button', { type: 'button', 'aria-label': 'Diminuisci', onclick: () => cambia(-passo) }, '−'),
    campo,
    h('button', { type: 'button', 'aria-label': 'Aumenta', onclick: () => cambia(passo) }, '+'));
  el.campo = campo;
  return el;
}

/** Scarica un file di testo (usato per il backup). */
export function scaricaFile(nome, testo, tipo = 'application/json') {
  const url = URL.createObjectURL(new Blob([testo], { type: tipo }));
  const a = h('a', { href: url, download: nome });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export const leggiFile = (file) => new Promise((ok, no) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result));
  r.onerror = () => no(r.error);
  r.readAsText(file);
});

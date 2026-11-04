// Lettore CSV semplice ma tollerante: virgolette, BOM, separatore , ; o tab,
// righe vuote, colonne in più o in ordine diverso.

/** Indovina il separatore guardando la prima riga. */
export function rilevaSeparatore(testo) {
  const prima = testo.split(/\r?\n/).find((r) => r.trim() !== '') || '';
  const conteggi = { ',': 0, ';': 0, '\t': 0 };
  let dentro = false;
  for (const c of prima) {
    if (c === '"') dentro = !dentro;
    else if (!dentro && c in conteggi) conteggi[c]++;
  }
  return Object.entries(conteggi).sort((a, b) => b[1] - a[1])[0][0];
}

/** Testo CSV -> array di righe (ognuna è un array di celle). */
export function parseCSV(testo, sep) {
  testo = String(testo).replace(/^﻿/, '');
  sep = sep || rilevaSeparatore(testo);
  const righe = [];
  let riga = [], campo = '', dentro = false;
  for (let i = 0; i < testo.length; i++) {
    const c = testo[i];
    if (dentro) {
      if (c === '"') {
        if (testo[i + 1] === '"') { campo += '"'; i++; } else dentro = false;
      } else campo += c;
    } else if (c === '"' && campo === '') dentro = true;
    else if (c === sep) { riga.push(campo); campo = ''; }
    else if (c === '\n') { riga.push(campo); righe.push(riga); riga = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo !== '' || riga.length) { riga.push(campo); righe.push(riga); }
  return righe.filter((r) => r.some((c) => c.trim() !== ''));
}

/**
 * Legge un CSV con intestazione.
 * Restituisce { intestazioni: [...], righe: [{colonna: valore}, ...] }.
 */
export function leggiTabella(testo) {
  const celle = parseCSV(testo);
  if (!celle.length) return { intestazioni: [], righe: [] };
  const intestazioni = celle[0].map((h) => h.trim());
  const righe = celle.slice(1).map((r) => {
    const o = {};
    intestazioni.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });
    return o;
  });
  return { intestazioni, righe };
}

// Archivio in memoria con salvataggio automatico su IndexedDB.
// Le viste leggono in modo sincrono (leggi) e scrivono con scrivi().
import { leggiTutto, scriviChiave, cancellaTutto } from './db.js';
import { conPredefinite } from '../logica/impostazioni.js';

let cache = {};

export async function avvia() {
  cache = await leggiTutto();
}

/** Valore salvato (oppure il predefinito, che può essere una funzione). */
export function leggi(chiave, predefinito) {
  if (chiave in cache) return cache[chiave];
  return typeof predefinito === 'function' ? predefinito() : predefinito;
}

export function scrivi(chiave, valore) {
  cache[chiave] = valore;
  return scriviChiave(chiave, valore);
}

export const tutto = () => JSON.parse(JSON.stringify(cache));

/** Sostituisce tutti i dati (ripristino da backup). */
export async function sostituisciTutto(dati) {
  await cancellaTutto();
  cache = {};
  for (const [k, v] of Object.entries(dati)) await scrivi(k, v);
}

export async function eliminaTutto() {
  await cancellaTutto();
  cache = {};
}

/** Impostazioni complete (i valori mancanti vengono completati con i predefiniti). */
export const impostazioni = () => conPredefinite(cache.impostazioni);
export const salvaImpostazioni = (s) => scrivi('impostazioni', s);

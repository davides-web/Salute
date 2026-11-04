// Archivio locale: IndexedDB (chiave -> valore). Se non è disponibile si usa localStorage.
// Tutti i dati restano nel dispositivo: non viene inviato nulla a nessun server.

const NOME_DB = 'salute-db';
const NEGOZIO = 'kv';
const PREFISSO = 'salute:';

let dbPromessa = null;

function apri() {
  if (!dbPromessa) {
    dbPromessa = new Promise((ok, no) => {
      if (typeof indexedDB === 'undefined') return no(new Error('IndexedDB assente'));
      const r = indexedDB.open(NOME_DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(NEGOZIO);
      r.onsuccess = () => ok(r.result);
      r.onerror = () => no(r.error);
    });
  }
  return dbPromessa;
}

const richiesta = (r) => new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });

/** Legge tutte le chiavi in un oggetto. */
export async function leggiTutto() {
  try {
    const db = await apri();
    const tx = db.transaction(NEGOZIO, 'readonly');
    const st = tx.objectStore(NEGOZIO);
    const [chiavi, valori] = await Promise.all([richiesta(st.getAllKeys()), richiesta(st.getAll())]);
    const out = {};
    chiavi.forEach((k, i) => { out[k] = valori[i]; });
    return out;
  } catch {
    const out = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith(PREFISSO)) out[k.slice(PREFISSO.length)] = JSON.parse(localStorage.getItem(k));
      }
    } catch { /* archivio non disponibile: si parte vuoti */ }
    return out;
  }
}

export async function scriviChiave(chiave, valore) {
  try {
    const db = await apri();
    const tx = db.transaction(NEGOZIO, 'readwrite');
    tx.objectStore(NEGOZIO).put(valore, chiave);
    await new Promise((ok, no) => { tx.oncomplete = ok; tx.onerror = () => no(tx.error); });
  } catch {
    try { localStorage.setItem(PREFISSO + chiave, JSON.stringify(valore)); } catch { /* pieno o bloccato */ }
  }
}

export async function cancellaTutto() {
  try {
    const db = await apri();
    const tx = db.transaction(NEGOZIO, 'readwrite');
    tx.objectStore(NEGOZIO).clear();
    await new Promise((ok, no) => { tx.oncomplete = ok; tx.onerror = () => no(tx.error); });
  } catch { /* si prosegue con localStorage */ }
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFISSO)).forEach((k) => localStorage.removeItem(k));
  } catch { /* ignorato */ }
}

/** Chiede al browser di non cancellare i dati in caso di poco spazio. */
export async function chiediPersistenza() {
  try { return await navigator.storage?.persist?.(); } catch { return false; }
}

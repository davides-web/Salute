// Backup JSON: creazione e verifica. Il file contiene SOLO i dati salvati nel dispositivo.
import { CHIAVI_DATI } from './impostazioni.js';

export const VERSIONE_BACKUP = 1;
export const ID_APP = 'salute-pwa';

/** Costruisce l'oggetto da salvare nel file. Si tengono solo le chiavi note. */
export function creaBackup(dati, adesso = new Date()) {
  const puliti = {};
  for (const k of CHIAVI_DATI) if (dati[k] !== undefined) puliti[k] = dati[k];
  return { app: ID_APP, versione: VERSIONE_BACKUP, creatoIl: adesso.toISOString(), dati: puliti };
}

/** Controlla un backup letto da file. Restituisce { ok, errore?, dati? }. */
export function validaBackup(oggetto) {
  if (!oggetto || typeof oggetto !== 'object') return { ok: false, errore: 'Il file non contiene un backup valido.' };
  if (oggetto.app !== ID_APP) return { ok: false, errore: 'Questo file non è un backup di questa app.' };
  if (typeof oggetto.versione !== 'number' || oggetto.versione > VERSIONE_BACKUP) {
    return { ok: false, errore: 'Il backup è stato creato da una versione più recente dell\'app.' };
  }
  if (!oggetto.dati || typeof oggetto.dati !== 'object' || Array.isArray(oggetto.dati)) {
    return { ok: false, errore: 'Nel backup mancano i dati.' };
  }
  const dati = {};
  for (const k of CHIAVI_DATI) if (oggetto.dati[k] !== undefined) dati[k] = oggetto.dati[k];
  return { ok: true, dati };
}

/** Testo -> backup validato. */
export function leggiBackup(testo) {
  let oggetto;
  try { oggetto = JSON.parse(testo); } catch { return { ok: false, errore: 'Il file non è un JSON leggibile.' }; }
  return validaBackup(oggetto);
}

export function nomeFileBackup(dataISO) {
  return `salute-backup-${dataISO}.json`;
}

// Riepilogo di una settimana (lunedì-domenica) che unisce allenamenti, peso, nutrizione e attività.
import { aggiungiGiorni, media, somma } from '../core/util.js';
import { mediaMobile, serieCampo } from './peso.js';
import { reportPeriodo } from './nutrizione.js';

/**
 * dati: { intervalli, forza, fit_allenamenti, peso, nutr_giorni, fit_passi, fit_fc, fit_sonno } (come nell'archivio)
 * imp: impostazioni complete. lunedi: "AAAA-MM-GG".
 */
export function riepilogoSettimana(dati, imp, lunedi) {
  const da = lunedi, a = aggiungiGiorni(lunedi, 6);
  const dentro = (d) => d >= da && d <= a;
  const giorniSett = Array.from({ length: 7 }, (_, i) => aggiungiGiorni(da, i));

  const intervalli = (dati.intervalli || []).filter((s) => dentro(s.data));
  const forza = (dati.forza || []).filter((s) => dentro(s.data));
  const altri = (dati.fit_allenamenti || []).filter((s) => dentro(s.data));

  // peso: media mobile a 7 giorni a fine settimana, confrontata con quella di 7 giorni prima
  const pesi = serieCampo(dati.peso || [], 'peso');
  const mm = mediaMobile(pesi.filter((p) => p.data <= a), 7);
  const fineSett = [...mm].reverse().find((p) => dentro(p.data));
  const prima = [...mm].reverse().find((p) => p.data < da);
  const vite = serieCampo(dati.peso || [], 'vita').filter((p) => dentro(p.data));

  const passiGiorni = giorniSett.map((d) => (dati.fit_passi || {})[d]).filter((x) => x != null);
  const fcGiorni = giorniSett.map((d) => (dati.fit_fc || {})[d]?.riposo).filter((x) => x != null);
  const sonnoGiorni = giorniSett.map((d) => (dati.fit_sonno || {})[d]).filter((x) => x != null);

  return {
    da, a,
    allenamenti: {
      intervalli, forza, altri,
      totale: intervalli.length + new Set(forza.map((f) => f.data)).size + altri.length,
      intervalliCompleti: intervalli.filter((s) => s.completa).length,
    },
    peso: {
      media: fineSett ? fineSett.media : null,
      variazione: fineSett && prima ? fineSett.media - prima.media : null,
      misure: pesi.filter((p) => dentro(p.data)).length,
      vita: vite.length ? vite[vite.length - 1].valore : null,
    },
    nutrizione: reportPeriodo(Object.values(dati.nutr_giorni || {}), imp.nutrizione, da, a),
    attivita: {
      passiTotali: passiGiorni.length ? somma(passiGiorni) : null,
      passiMedia: media(passiGiorni),
      giorniConPassi: passiGiorni.length,
      fcRiposo: media(fcGiorni),
      sonnoMedioMin: media(sonnoGiorni),
    },
  };
}

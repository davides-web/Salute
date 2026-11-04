// Peso: media mobile, ritmo settimanale reale e proiezione. Funzioni pure.
import { aggiungiGiorni, differenzaGiorni } from '../core/util.js';

const perData = (punti) => [...punti].sort((a, b) => a.data.localeCompare(b.data));

/**
 * Media mobile "a giorni": per ogni misura, media di tutte le misure degli ultimi `finestra` giorni
 * (compreso quello stesso giorno). punti: [{ data, valore }] -> [{ data, valore, media }].
 */
export function mediaMobile(punti, finestra = 7) {
  const p = perData(punti);
  return p.map((x) => {
    const da = aggiungiGiorni(x.data, -(finestra - 1));
    const dentro = p.filter((y) => y.data >= da && y.data <= x.data);
    return { data: x.data, valore: x.valore, media: dentro.reduce((t, y) => t + y.valore, 0) / dentro.length };
  });
}

/**
 * Ritmo reale in kg/settimana: pendenza della retta (minimi quadrati) sulle misure degli ultimi
 * `giorni` giorni (da quella più recente). Serve almeno 2 misure distanti 6+ giorni; altrimenti null.
 */
export function ritmoSettimanale(punti, giorni = 28) {
  const p = perData(punti);
  if (p.length < 2) return null;
  const fine = p[p.length - 1].data;
  const da = aggiungiGiorni(fine, -giorni);
  const v = p.filter((x) => x.data >= da);
  if (v.length < 2) return null;
  const xs = v.map((x) => differenzaGiorni(v[0].data, x.data));
  if (xs[xs.length - 1] < 6) return null;
  const n = v.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = v.reduce((a, b) => a + b.valore, 0) / n;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (v[i].valore - my); den += (x - mx) ** 2; });
  return den === 0 ? null : (num / den) * 7;
}

/**
 * Quando si arriva al peso obiettivo se si continua al ritmo dato?
 * Restituisce { raggiunto:true } se già raggiunto, null se il ritmo porta nella direzione opposta
 * (o è nullo), altrimenti { settimane, giorni, data }.
 */
export function proiezione({ attuale, dataAttuale, obiettivo, ritmo }) {
  if (attuale == null || obiettivo == null || ritmo == null) return null;
  const differenza = obiettivo - attuale;
  if (Math.abs(differenza) < 0.05) return { raggiunto: true };
  if (ritmo === 0 || Math.sign(differenza) !== Math.sign(ritmo)) return null;
  const settimane = differenza / ritmo;
  const giorni = Math.ceil(settimane * 7);
  return { settimane, giorni, data: aggiungiGiorni(dataAttuale, giorni) };
}

/** Punti validi per un campo ("peso" o "vita") dal registro. */
export function serieCampo(registro, campo) {
  return registro.filter((r) => r[campo] != null && Number.isFinite(r[campo])).map((r) => ({ data: r.data, valore: r[campo] }));
}

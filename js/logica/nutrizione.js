// Analisi nutrizione: lettura dei CSV di Cronometer e report settimanale/mensile. Funzioni pure.
// Il lettore è tollerante: colonne in più, in ordine diverso, maiuscole/minuscole, separatori diversi.
import { leggiTabella } from '../core/csv.js';
import { normalizzaData, parseNumero, giornoSettimana, estraiOra } from '../core/util.js';

const norm = (h) => String(h).toLowerCase().replace(/\s+/g, ' ').trim();
const unitaDi = (h) => { const m = String(h).match(/\(([^()]*)\)\s*$/); return m ? m[1].toLowerCase().replace('μ', 'µ') : ''; };

/** Micronutrienti con fabbisogno giornaliero indicativo di un adulto (valori di riferimento approssimati). */
export const MICRO = [
  { chiave: 'b1', nome: 'Vitamina B1', unita: 'mg', rda: 1.1, re: /^b1\b/ },
  { chiave: 'b2', nome: 'Vitamina B2', unita: 'mg', rda: 1.4, re: /^b2\b/ },
  { chiave: 'b3', nome: 'Vitamina B3', unita: 'mg', rda: 16, re: /^b3\b/ },
  { chiave: 'b5', nome: 'Vitamina B5', unita: 'mg', rda: 6, re: /^b5\b/ },
  { chiave: 'b6', nome: 'Vitamina B6', unita: 'mg', rda: 1.4, re: /^b6\b/ },
  { chiave: 'b12', nome: 'Vitamina B12', unita: 'µg', rda: 2.5, re: /^b12\b/ },
  { chiave: 'folato', nome: 'Folati', unita: 'µg', rda: 200, re: /^folate/ },
  { chiave: 'vitA', nome: 'Vitamina A', unita: 'µg', rda: 800, re: /^vitamin a\b/ },
  { chiave: 'vitC', nome: 'Vitamina C', unita: 'mg', rda: 80, re: /^vitamin c\b/ },
  { chiave: 'vitD', nome: 'Vitamina D', unita: 'UI', rda: 600, re: /^vitamin d\b/ },
  { chiave: 'vitE', nome: 'Vitamina E', unita: 'mg', rda: 12, re: /^vitamin e\b/ },
  { chiave: 'vitK', nome: 'Vitamina K', unita: 'µg', rda: 75, re: /^vitamin k\b/ },
  { chiave: 'calcio', nome: 'Calcio', unita: 'mg', rda: 1000, re: /^calcium/ },
  { chiave: 'rame', nome: 'Rame', unita: 'mg', rda: 1, re: /^copper/ },
  { chiave: 'ferro', nome: 'Ferro', unita: 'mg', rda: 14, re: /^iron/ },
  { chiave: 'magnesio', nome: 'Magnesio', unita: 'mg', rda: 375, re: /^magnesium/ },
  { chiave: 'manganese', nome: 'Manganese', unita: 'mg', rda: 2, re: /^manganese/ },
  { chiave: 'fosforo', nome: 'Fosforo', unita: 'mg', rda: 700, re: /^phosphorus/ },
  { chiave: 'potassio', nome: 'Potassio', unita: 'mg', rda: 3500, re: /^potassium/ },
  { chiave: 'selenio', nome: 'Selenio', unita: 'µg', rda: 55, re: /^selenium/ },
  { chiave: 'zinco', nome: 'Zinco', unita: 'mg', rda: 10, re: /^zinc/ },
];

const trova = (intest, re) => intest.find((h) => re.test(norm(h)));
const trovaEsatta = (intest, nomi) => intest.find((h) => nomi.includes(norm(h)));

const RE_MACRO = {
  kcal: /^(energy|calories)( \(kcal\))?$/,
  proteine: /^protein/,
  grassi: /^(total )?fat( \(g\))?$/,
  carboidrati: /^(carbs|carbohydrates?)( \(g\))?$/,
  fibre: /^fib(er|re)/,
  sodio: /^sodium/,
  potassio: /^potassium/,
};

/** Che tipo di export di Cronometer è? 'giornaliero' | 'porzioni' | 'biometria' | 'esercizi' | null */
export function rilevaTipoCronometer(intestazioni) {
  const n = intestazioni.map(norm);
  const ha = (x) => n.includes(x);
  if (ha('food name')) return 'porzioni';
  if (ha('metric') && ha('amount')) return 'biometria';
  if (ha('exercise') && (ha('minutes') || ha('calories burned'))) return 'esercizi';
  if ((ha('date') || ha('day')) && intestazioni.some((h) => RE_MACRO.kcal.test(norm(h)))) return 'giornaliero';
  return null;
}

const colData = (intest) => trovaEsatta(intest, ['date', 'day', 'data']);

/** Daily Nutrition / dailysummary.csv -> { giorni: [...], scartate } */
export function parseGiornaliero(tabella) {
  const { intestazioni, righe } = tabella;
  const cData = colData(intestazioni);
  const cMacro = {};
  for (const [k, re] of Object.entries(RE_MACRO)) cMacro[k] = trova(intestazioni, re);
  const cMicro = MICRO.map((m) => ({ m, col: trova(intestazioni, m.re) })).filter((x) => x.col);
  const cCompleto = trovaEsatta(intestazioni, ['completed']);
  const per = {};
  let scartate = 0;
  for (const r of righe) {
    const data = cData ? normalizzaData(r[cData]) : null;
    const kcal = cMacro.kcal ? parseNumero(r[cMacro.kcal]) : null;
    if (!data || kcal == null) { scartate++; continue; }
    const g = { data, kcal, micro: {} };
    for (const k of ['proteine', 'grassi', 'carboidrati', 'fibre', 'sodio', 'potassio']) g[k] = cMacro[k] ? parseNumero(r[cMacro[k]]) : null;
    for (const { m, col } of cMicro) {
      let v = parseNumero(r[col]);
      if (v == null) continue;
      const u = unitaDi(col);
      if (m.chiave === 'vitD' && (u === 'µg' || u === 'ug' || u === 'mcg')) v *= 40; // µg -> UI
      g.micro[m.chiave] = v;
    }
    if (cCompleto) g.completo = /^(true|1|yes|si|sì)$/i.test(r[cCompleto]);
    per[data] = g; // se una data compare due volte vale l'ultima riga
  }
  return { giorni: Object.values(per).sort((a, b) => a.data.localeCompare(b.data)), scartate };
}

/** Servings.csv -> { porzioni: [{data, ora, gruppo, alimento, kcal, proteine, grassi, carboidrati}], scartate } */
export function parsePorzioni(tabella) {
  const { intestazioni, righe } = tabella;
  const cData = colData(intestazioni);
  const cNome = trovaEsatta(intestazioni, ['food name']);
  const cGruppo = trovaEsatta(intestazioni, ['group']);
  const cOra = trovaEsatta(intestazioni, ['time']);
  const c = (re) => trova(intestazioni, re);
  const cols = { kcal: c(RE_MACRO.kcal), proteine: c(RE_MACRO.proteine), grassi: c(RE_MACRO.grassi), carboidrati: c(RE_MACRO.carboidrati) };
  const porzioni = [];
  let scartate = 0;
  for (const r of righe) {
    const data = cData ? normalizzaData(r[cData]) : null;
    if (!data || !cNome || !r[cNome]) { scartate++; continue; }
    porzioni.push({
      data, ora: cOra ? estraiOra(`x ${r[cOra]}`) || r[cOra] : null, gruppo: cGruppo ? r[cGruppo] : '', alimento: r[cNome],
      kcal: cols.kcal ? parseNumero(r[cols.kcal]) : null, proteine: cols.proteine ? parseNumero(r[cols.proteine]) : null,
      grassi: cols.grassi ? parseNumero(r[cols.grassi]) : null, carboidrati: cols.carboidrati ? parseNumero(r[cols.carboidrati]) : null,
    });
  }
  return { porzioni, scartate };
}

/** Biometrics.csv -> peso (kg) e vita (cm); le altre misure vengono ignorate. */
export function parseBiometria(tabella) {
  const { intestazioni, righe } = tabella;
  const cData = colData(intestazioni);
  const cMetrica = trovaEsatta(intestazioni, ['metric']);
  const cUnita = trovaEsatta(intestazioni, ['unit']);
  const cValore = trovaEsatta(intestazioni, ['amount']);
  const peso = {}, vita = {};
  let ignorate = 0;
  for (const r of righe) {
    const data = cData ? normalizzaData(r[cData]) : null;
    const v = cValore ? parseNumero(r[cValore]) : null;
    const metrica = cMetrica ? norm(r[cMetrica]) : '';
    const u = cUnita ? norm(r[cUnita]) : '';
    if (!data || v == null) { ignorate++; continue; }
    if (/^weight|^peso/.test(metrica)) peso[data] = Math.round((/lb/.test(u) ? v * 0.45359237 : v) * 10) / 10;
    else if (/waist|vita/.test(metrica)) vita[data] = Math.round((/^in/.test(u) ? v * 2.54 : v) * 10) / 10;
    else ignorate++;
  }
  return { peso, vita, ignorate };
}

/** Exercises.csv -> [{data, nome, minuti, kcal}] */
export function parseEsercizi(tabella) {
  const { intestazioni, righe } = tabella;
  const cData = colData(intestazioni);
  const cNome = trovaEsatta(intestazioni, ['exercise']);
  const cMin = trovaEsatta(intestazioni, ['minutes']);
  const cKcal = trovaEsatta(intestazioni, ['calories burned']);
  const esercizi = [];
  let scartate = 0;
  for (const r of righe) {
    const data = cData ? normalizzaData(r[cData]) : null;
    if (!data || !cNome) { scartate++; continue; }
    esercizi.push({ data, nome: r[cNome], minuti: cMin ? parseNumero(r[cMin]) : null, kcal: cKcal ? parseNumero(r[cKcal]) : null });
  }
  return { esercizi, scartate };
}

/** Legge un file di Cronometer (testo) e dice di che tipo è. */
export function importaCronometer(testo) {
  const tabella = leggiTabella(testo);
  const tipo = rilevaTipoCronometer(tabella.intestazioni);
  if (!tipo) return { tipo: null };
  if (tipo === 'giornaliero') return { tipo, ...parseGiornaliero(tabella) };
  if (tipo === 'porzioni') return { tipo, ...parsePorzioni(tabella) };
  if (tipo === 'biometria') return { tipo, ...parseBiometria(tabella) };
  return { tipo, ...parseEsercizi(tabella) };
}

/** Sostituisce, nell'elenco `vecchi`, tutte le voci delle date presenti in `nuovi` (evita doppioni se si reimporta). */
export function sostituisciPerData(vecchi, nuovi) {
  const date = new Set(nuovi.map((x) => x.data));
  return [...vecchi.filter((x) => !date.has(x.data)), ...nuovi].sort((a, b) => a.data.localeCompare(b.data));
}

/** Aggiunge al registro peso le misure di Cronometer SOLO dove manca il dato (non sovrascrive quelli inseriti a mano). */
export function unisciRegistroPeso(registro, pesi, vite) {
  const out = registro.map((r) => ({ ...r }));
  const per = (d) => { let r = out.find((x) => x.data === d); if (!r) { r = { data: d }; out.push(r); } return r; };
  for (const [d, v] of Object.entries(pesi)) { const r = per(d); if (r.peso == null) r.peso = v; }
  for (const [d, v] of Object.entries(vite)) { const r = per(d); if (r.vita == null) r.vita = v; }
  return out.sort((a, b) => a.data.localeCompare(b.data));
}

// ------------------------------------------------------------------ calcoli del report

/** Ripartizione percentuale delle calorie tra proteine (4 kcal/g), grassi (9) e carboidrati (4). */
export function percentualiMacro({ proteine, grassi, carboidrati }) {
  const kp = (proteine || 0) * 4, kg = (grassi || 0) * 9, kc = (carboidrati || 0) * 4;
  const tot = kp + kg + kc;
  if (tot <= 0) return null;
  return { p: (kp / tot) * 100, g: (kg / tot) * 100, c: (kc / tot) * 100 };
}

const mediaDefinita = (valori) => { const v = valori.filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };

/** Un giorno è "dentro obiettivo" se le calorie sono entro ±tolleranza% dall'obiettivo. */
export function dentroObiettivo(giorno, cfg) {
  return Math.abs(giorno.kcal - cfg.kcal) <= (cfg.kcal * (cfg.tolleranza ?? 10)) / 100;
}

function sezione(giorni, cfg) {
  const n = giorni.length;
  if (!n) return { n: 0 };
  const medie = {};
  for (const k of ['kcal', 'proteine', 'grassi', 'carboidrati', 'fibre', 'sodio', 'potassio']) medie[k] = mediaDefinita(giorni.map((g) => g[k]));
  const dentro = giorni.filter((g) => dentroObiettivo(g, cfg)).length;
  const protG = (cfg.kcal * cfg.p) / 100 / 4;
  const proteineOk = giorni.filter((g) => (g.proteine || 0) >= protG * 0.9).length;
  const soglia = cfg.sogliaMicro ?? 100;
  const micro = [];
  for (const m of MICRO) {
    const val = giorni.map((g) => g.micro?.[m.chiave]).filter((v) => v != null);
    if (!val.length) continue;
    const sotto = val.filter((v) => (v / m.rda) * 100 < soglia).length;
    micro.push({ chiave: m.chiave, nome: m.nome, unita: m.unita, rda: m.rda, media: mediaDefinita(val),
      percMedia: (mediaDefinita(val) / m.rda) * 100, giorniSotto: sotto, giorniTot: val.length, quota: sotto / val.length });
  }
  micro.sort((a, b) => b.quota - a.quota || a.percMedia - b.percMedia);
  return { n, medie, perc: percentualiMacro(medie), dentro, fuori: n - dentro, proteineOk, micro, obiettivoProteineG: protG };
}

/**
 * Report su un periodo [da, a] (date "AAAA-MM-GG", estremi inclusi).
 * Il giorno di ricarica (se impostato) è mostrato a parte oppure escluso, secondo cfg.modoRicarica.
 */
export function reportPeriodo(giorniTutti, cfg, da, a) {
  const nel = giorniTutti.filter((g) => g.data >= da && g.data <= a && g.kcal > 0);
  const eRicarica = (g) => cfg.giornoRicarica != null && giornoSettimana(g.data) === cfg.giornoRicarica;
  const regolari = nel.filter((g) => !eRicarica(g));
  const ricarica = nel.filter(eRicarica);
  return {
    da, a, giorniConDati: nel.length,
    regolari: sezione(regolari, cfg),
    ricarica: cfg.modoRicarica === 'separato' && cfg.giornoRicarica != null ? sezione(ricarica, cfg) : null,
    ricaricaEsclusa: cfg.modoRicarica === 'escludi' ? ricarica.length : 0,
    giorni: nel,
  };
}

// Genera i file CSV di esempio (SINTETICI, inventati) nella cartella esempi/.
// Uso: node strumenti/genera-esempi.mjs
import fs from 'node:fs';

// generatore pseudo-casuale con seme fisso: i file escono sempre uguali
function rng(seme) {
  let a = seme;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = rng(12345);
const tra = (a, b) => a + (b - a) * r();
const d1 = (x) => (Math.round(x * 10) / 10).toString();
const d0 = (x) => Math.round(x).toString();
const due = (n) => String(n).padStart(2, '0');
const giorno = (i) => { const d = new Date(Date.UTC(2026, 8, 14 + i)); return `${d.getUTCFullYear()}-${due(d.getUTCMonth() + 1)}-${due(d.getUTCDate())}`; };
const N = 49; // sette settimane: 14 settembre - 1 novembre 2026
const cella = (c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c);
const csv = (righe) => righe.map((x) => x.map(cella).join(',')).join('\n') + '\n';
fs.mkdirSync('esempi', { recursive: true });

// ---------------------------------------------------------------- Cronometer
// micro: [intestazione, fabbisogno di riferimento, media % del fabbisogno]
const MICRO = [
  ['B1 (Thiamine) (mg)', 1.1, 1.3], ['B2 (Riboflavin) (mg)', 1.4, 1.4], ['B3 (Niacin) (mg)', 16, 1.5],
  ['B5 (Pantothenic Acid) (mg)', 6, 0.9], ['B6 (Pyridoxine) (mg)', 1.4, 1.4], ['B12 (Cobalamin) (µg)', 2.5, 2.2],
  ['Folate (µg)', 200, 1.3], ['Vitamin A (µg)', 800, 1.1], ['Vitamin C (mg)', 80, 1.4], ['Vitamin D (IU)', 600, 0.35],
  ['Vitamin E (mg)', 12, 0.7], ['Vitamin K (µg)', 75, 1.6], ['Calcium (mg)', 1000, 0.75], ['Copper (mg)', 1, 1.2],
  ['Iron (mg)', 14, 0.85], ['Magnesium (mg)', 375, 0.8], ['Manganese (mg)', 2, 1.3], ['Phosphorus (mg)', 700, 1.5],
  ['Potassium (mg)', 3500, 0.78], ['Selenium (µg)', 55, 1.5], ['Sodium (mg)', null, null], ['Zinc (mg)', 10, 0.95],
];
const intestDaily = ['Date', 'Energy (kcal)', 'Alcohol (g)', 'Caffeine (mg)', 'Water (g)',
  ...MICRO.map((m) => m[0]).filter((h) => !h.startsWith('Potassium') && !h.startsWith('Sodium') && !h.startsWith('Zinc') && !h.startsWith('Selenium')),
  'Potassium (mg)', 'Selenium (µg)', 'Sodium (mg)', 'Zinc (mg)',
  'Carbs (g)', 'Fiber (g)', 'Starch (g)', 'Sugars (g)', 'Net Carbs (g)', 'Fat (g)', 'Cholesterol (mg)',
  'Monounsaturated (g)', 'Polyunsaturated (g)', 'Saturated (g)', 'Trans-Fats (g)', 'Omega-3 (g)', 'Omega-6 (g)', 'Protein (g)', 'Completed'];

const daily = [intestDaily];
const kcalGiorno = [];
for (let i = 0; i < N; i++) {
  const data = giorno(i);
  const dow = (new Date(Date.UTC(2026, 8, 14 + i)).getUTCDay() + 6) % 7; // 0 = lunedì
  const kcal = dow === 5 ? tra(2500, 2900) : tra(1750, 2150); // sabato = giorno di ricarica
  kcalGiorno.push(kcal);
  const prot = (kcal * tra(0.26, 0.32)) / 4, grassi = (kcal * tra(0.27, 0.33)) / 9;
  const carbo = (kcal - prot * 4 - grassi * 9) / 4, fibre = tra(18, 34);
  const riga = { Date: data, 'Energy (kcal)': d0(kcal), 'Alcohol (g)': d1(dow === 5 ? tra(0, 20) : 0), 'Caffeine (mg)': d0(tra(60, 280)), 'Water (g)': d0(tra(1500, 2800)),
    'Carbs (g)': d1(carbo), 'Fiber (g)': d1(fibre), 'Starch (g)': d1(carbo * 0.4), 'Sugars (g)': d1(carbo * 0.25), 'Net Carbs (g)': d1(carbo - fibre),
    'Fat (g)': d1(grassi), 'Cholesterol (mg)': d0(tra(180, 420)), 'Monounsaturated (g)': d1(grassi * 0.42), 'Polyunsaturated (g)': d1(grassi * 0.2),
    'Saturated (g)': d1(grassi * 0.3), 'Trans-Fats (g)': d1(tra(0, 0.8)), 'Omega-3 (g)': d1(tra(0.5, 2.5)), 'Omega-6 (g)': d1(tra(6, 14)),
    'Protein (g)': d1(prot), Completed: i === N - 1 ? 'false' : 'true' };
  for (const [h, rda, perc] of MICRO) {
    riga[h] = h.startsWith('Sodium') ? d0(tra(1800, 3400)) : d1(rda * perc * tra(0.6, 1.4));
  }
  daily.push(intestDaily.map((h) => riga[h] ?? ''));
}
fs.writeFileSync('esempi/cronometer_dailysummary.csv', csv(daily));

// Servings: alimenti inventati divisi per pasto
const PASTI = [
  ['Breakfast', '07:30', 0.22, ['Yogurt greco naturale', 'Avena', 'Banana']],
  ['Lunch', '13:00', 0.33, ['Pasta integrale', 'Petto di pollo', 'Insalata mista', 'Olio extravergine']],
  ['Snacks', '16:30', 0.1, ['Mandorle', 'Mela']],
  ['Dinner', '20:00', 0.35, ['Salmone al forno', 'Patate', 'Verdure grigliate']],
];
const serv = [['Day', 'Time', 'Group', 'Food Name', 'Amount', 'Unit', 'Category', 'Energy (kcal)', 'Protein (g)', 'Fat (g)', 'Carbs (g)', 'Fiber (g)', 'Sodium (mg)', 'Potassium (mg)']];
for (let i = 0; i < N; i++) {
  for (const [gruppo, ora, quota, cibi] of PASTI) {
    for (const cibo of cibi) {
      const k = (kcalGiorno[i] * quota) / cibi.length;
      serv.push([giorno(i), ora, gruppo, cibo, d0(tra(50, 250)), 'g', 'Alimenti', d0(k), d1((k * 0.28) / 4), d1((k * 0.3) / 9), d1((k * 0.42) / 4), d1(tra(0.5, 6)), d0(tra(5, 500)), d0(tra(50, 600))]);
    }
  }
}
fs.writeFileSync('esempi/cronometer_servings.csv', csv(serv));

// Biometrics: peso ogni 3 giorni (in lenta discesa), vita ogni settimana, una misura che verrà ignorata
const bio = [['Day', 'Time', 'Metric', 'Unit', 'Amount']];
for (let i = 0; i < N; i++) {
  if (i % 3 === 0) bio.push([giorno(i), '07:10', 'Weight', 'kg', d1(84.5 - i * 0.06 + tra(-0.4, 0.4))]);
  if (i % 7 === 0) bio.push([giorno(i), '07:12', 'Waist Circumference', 'cm', d1(94 - i * 0.05 + tra(-0.3, 0.3))]);
  if (i % 10 === 0) bio.push([giorno(i), '07:15', 'Heart Rate', 'bpm', d0(tra(55, 66))]);
}
fs.writeFileSync('esempi/cronometer_biometrics.csv', csv(bio));

// Exercises
const ese = [['Day', 'Time', 'Exercise', 'Minutes', 'Calories Burned']];
for (let i = 0; i < N; i++) {
  if (i % 7 === 1 || i % 7 === 3) ese.push([giorno(i), '18:30', 'Walking, 4.0 mph', d0(tra(30, 45)), d0(tra(180, 260))]);
  if (i % 7 === 4) ese.push([giorno(i), '19:00', 'Strength training', d0(tra(30, 40)), d0(tra(150, 220))]);
}
fs.writeFileSync('esempi/cronometer_exercises.csv', csv(ese));

// ---------------------------------------------------------------- Mi Fitness (Xiaomi)
// Formati PLAUSIBILI ma inventati: l'export reale può avere altre colonne (per questo c'è la mappatura).
const passi = [['Date', 'Steps', 'Distance (m)', 'Calories (kcal)']];
for (let i = 0; i < N; i++) {
  const p = Math.round(tra(3500, 12500));
  passi.push([giorno(i), p, Math.round(p * 0.74), Math.round(p * 0.045)]);
}
fs.writeFileSync('esempi/mifitness_passi.csv', csv(passi));

// frequenza cardiaca: un campione ogni 30 minuti, con ora (timestamp "AAAA-MM-GG hh:mm:ss")
const fc = [['time', 'heart_rate']];
for (let i = 0; i < N; i++) {
  const base = tra(54, 64);
  for (let m = 0; m < 24 * 60; m += 30) {
    const ora = m / 60;
    const bpm = ora < 6.5 ? base + tra(-2, 4) : base + 14 + tra(0, 30) * (ora > 17 && ora < 19 ? 2 : 1);
    fc.push([`${giorno(i)} ${due(Math.floor(ora))}:${due(m % 60)}:00`, Math.round(bpm)]);
  }
}
fs.writeFileSync('esempi/mifitness_frequenza_cardiaca.csv', csv(fc));

// sonno: durata in minuti
const sonno = [['date', 'sleep_duration_min', 'deep_sleep_min', 'light_sleep_min', 'awake_min']];
for (let i = 0; i < N; i++) {
  const tot = Math.round(tra(360, 510));
  sonno.push([giorno(i), tot, Math.round(tot * tra(0.15, 0.25)), Math.round(tot * tra(0.5, 0.6)), Math.round(tra(5, 40))]);
}
fs.writeFileSync('esempi/mifitness_sonno.csv', csv(sonno));

// allenamenti: durata in secondi
const all = [['Start time', 'Type', 'Duration (s)', 'Distance (m)', 'Calories (kcal)', 'Avg heart rate']];
const tipi = ['Walking', 'Cycling', 'Elliptical', 'Running'];
for (let i = 0; i < N; i++) {
  if (i % 7 === 1 || i % 7 === 3 || i % 7 === 5) {
    const dur = Math.round(tra(1500, 3000));
    all.push([`${giorno(i)} 18:30:00`, tipi[(i + (i >> 2)) % tipi.length], dur, Math.round(dur * tra(1.1, 2.4)), Math.round(dur * 0.1), Math.round(tra(110, 150))]);
  }
}
fs.writeFileSync('esempi/mifitness_allenamenti.csv', csv(all));
console.log('File di esempio generati in esempi/');

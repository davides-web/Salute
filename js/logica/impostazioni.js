// Impostazioni predefinite e chiavi dell'archivio.

export const AVVISO = 'Strumento personale di registrazione, non fornisce consigli medici. Prima di iniziare allenamenti ad alta intensità consulta il medico.';

/** Tutte le chiavi che l'app salva (e che finiscono nel backup). */
export const CHIAVI_DATI = [
  'impostazioni',
  'intervalli',      // diario delle sessioni a intervalli
  'preset',          // preset del timer salvati dall'utente
  'forza',           // diario della forza
  'esercizi',        // elenco esercizi
  'peso',            // peso e vita, uno per data
  'nutr_giorni',     // Cronometer: riepilogo giornaliero { data: {...} }
  'nutr_porzioni',   // Cronometer: alimenti registrati
  'nutr_esercizi',   // Cronometer: esercizi registrati
  'fit_passi',       // Mi Fitness: { data: passi }
  'fit_fc',          // Mi Fitness: { data: {riposo, media} }
  'fit_sonno',       // Mi Fitness: { data: minuti }
  'fit_allenamenti', // Mi Fitness: allenamenti
];

export const PREDEFINITE = {
  pesoObiettivo: null,        // kg
  ritmoObiettivo: -0.5,       // kg a settimana (negativo = dimagrire)
  nutrizione: {
    kcal: 2000, p: 30, g: 30, c: 40, // obiettivi: calorie e ripartizione % dei macro
    tolleranza: 10,                  // % di scarto accettato sulle calorie per dire "dentro obiettivo"
    giornoRicarica: null,            // null oppure 0 (lunedì) ... 6 (domenica)
    modoRicarica: 'separato',        // 'separato' = mostrato a parte; 'escludi' = ignorato
    sogliaMicro: 100,                // % del fabbisogno sotto la quale un micronutriente è "carente" quel giorno
  },
  avanzamento: { sessioniPerSalire: 3, rpeMaxScendere: 9 },
  forza: { tetto: 12, ripPartenza: 8, incrementoCarico: 2 },
  // Lunedì ... Domenica: 'intervalli', 'riposo' oppure l'id di un esercizio
  calendario: ['intervalli', 'thruster', 'riposo', 'intervalli', 'trazioni', 'riposo', 'riposo'],
  suono: true, vibrazione: true, voce: true,
  avvisoAccettato: false,
  livelloCorrente: 1,
  attivitaPredefinita: 'camminata',
  mappature: {},              // Mi Fitness: mappatura colonne ricordata per tipo di file
};

const semplice = (x) => x && typeof x === 'object' && !Array.isArray(x);

/** Unisce `extra` sopra `base` (gli oggetti si fondono, gli array si sostituiscono). */
export function unisci(base, extra) {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra || {})) {
    out[k] = semplice(v) && semplice(base[k]) ? unisci(base[k], v) : v;
  }
  return out;
}

export function conPredefinite(salvate) {
  return unisci(JSON.parse(JSON.stringify(PREDEFINITE)), salvate || {});
}

/** Esercizi presenti al primo avvio (l'utente può aggiungerne altri). */
export const ESERCIZI_INIZIALI = [
  { id: 'thruster', nome: 'Thruster con manubri', varianti: [] },
  { id: 'trazioni', nome: 'Trazioni', varianti: ['Libere', 'Assistite con elastico', 'Negative', 'Isometriche'] },
];

// Segnali del timer: suono, vibrazione, voce e schermo sempre acceso.
// Ogni funzione fallisce in silenzio se il dispositivo non la supporta.

let ctx = null;

/** Da chiamare dentro un tocco dell'utente: sblocca l'audio (obbligatorio su Android/iOS). */
export function sbloccaAudio() {
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* nessun audio */ }
  try { window.speechSynthesis?.getVoices(); } catch { /* nessuna voce */ }
}

/** Bip di frequenza `freq` Hz e durata `ms` millisecondi. */
export function bip(freq = 880, ms = 150, volume = 0.35) {
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + ms / 1000 + 0.05);
  } catch { /* ignorato */ }
}

export function vibra(schema) {
  try { navigator.vibrate?.(schema); } catch { /* ignorato */ }
}

/** Legge un testo in italiano; interrompe quello precedente. */
export function parla(testo) {
  try {
    const sy = window.speechSynthesis;
    if (!sy || !testo) return;
    sy.cancel();
    const u = new SpeechSynthesisUtterance(testo);
    u.lang = 'it-IT';
    u.rate = 1.05;
    sy.speak(u);
  } catch { /* ignorato */ }
}

export function zittisci() {
  try { window.speechSynthesis?.cancel(); } catch { /* ignorato */ }
}

// --- Wake Lock: schermo sempre acceso ---
let blocco = null;
let voluto = false;

async function richiedi() {
  try {
    if (voluto && 'wakeLock' in navigator && !blocco) {
      blocco = await navigator.wakeLock.request('screen');
      blocco.addEventListener('release', () => { blocco = null; });
    }
  } catch { blocco = null; }
}
// Il sistema rilascia il blocco quando la pagina va in secondo piano: lo richiediamo al ritorno.
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') richiedi(); });

export function tieniSchermoAcceso() { voluto = true; return richiedi(); }
export function rilasciaSchermo() {
  voluto = false;
  try { blocco?.release(); } catch { /* ignorato */ }
  blocco = null;
}

// Menu "Altro": rimanda alle pagine meno frequenti.
import { h } from '../core/dom.js';

export async function render(el) {
  const voce = (href, titolo, descr) => h('a', { class: 'carta', href, style: 'display:block;text-decoration:none;color:inherit' },
    h('h2', null, titolo), h('p', { class: 'muto' }, descr));
  el.append(
    h('h1', null, 'Altro'),
    voce('#/attivita', '👟 Attività (Mi Fitness)', 'Passi, frequenza cardiaca e sonno dai file Xiaomi.'),
    voce('#/riepilogo', '🧾 Riepilogo settimanale', 'Da stampare o salvare come PDF.'),
    voce('#/impostazioni', '⚙️ Impostazioni e backup', 'Obiettivi, preferenze, esporta e ripristina i dati.'),
  );
}

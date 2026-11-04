import test from 'node:test';
import assert from 'node:assert/strict';
import { riepilogoSettimana } from '../js/logica/riepilogo.js';
import { conPredefinite } from '../js/logica/impostazioni.js';

test('riepilogo settimanale: unisce allenamenti, peso, nutrizione e attività', () => {
  const imp = conPredefinite({});
  const dati = {
    intervalli: [{ data: '2026-11-03', completa: true }, { data: '2026-11-05', completa: false }, { data: '2026-10-30', completa: true }],
    forza: [{ data: '2026-11-04' }, { data: '2026-11-04' }],
    fit_allenamenti: [{ data: '2026-11-06' }],
    peso: [{ data: '2026-10-28', peso: 84 }, { data: '2026-11-03', peso: 83 }, { data: '2026-11-04', vita: 90 }],
    nutr_giorni: { '2026-11-02': { data: '2026-11-02', kcal: 2000, proteine: 150, grassi: 67, carboidrati: 200, micro: {} } },
    fit_passi: { '2026-11-02': 8000, '2026-11-03': 10000, '2026-10-30': 99999 },
    fit_fc: { '2026-11-02': { riposo: 60 } }, fit_sonno: { '2026-11-02': 420 },
  };
  const r = riepilogoSettimana(dati, imp, '2026-11-02');
  assert.equal(r.a, '2026-11-08');
  assert.equal(r.allenamenti.intervalli.length, 2);
  assert.equal(r.allenamenti.totale, 2 + 1 + 1); // la forza conta i giorni, non le serie
  assert.equal(r.peso.media, 83.5);
  assert.ok(r.peso.variazione < 0);
  assert.equal(r.peso.vita, 90);
  assert.equal(r.nutrizione.regolari.n, 1);
  assert.equal(r.attivita.passiTotali, 18000);
  assert.equal(r.attivita.fcRiposo, 60);
});

test('riepilogo settimanale: settimana vuota senza errori', () => {
  const r = riepilogoSettimana({}, conPredefinite({}), '2026-11-02');
  assert.equal(r.allenamenti.totale, 0);
  assert.equal(r.peso.media, null);
  assert.equal(r.attivita.passiTotali, null);
});

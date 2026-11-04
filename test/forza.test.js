import test from 'node:test';
import assert from 'node:assert/strict';
import { cosaTocca, ultimaSessione, suggerisciProgressione, idEsercizio } from '../js/logica/forza.js';

const cfg = { tetto: 12, ripPartenza: 8, incrementoCarico: 2 };

test('progressione: +1 ripetizione sotto il tetto', () => {
  const r = suggerisciProgressione({ serie: 3, ripetizioni: 9, carico: 10 }, cfg);
  assert.deepEqual([r.serie, r.ripetizioni, r.carico], [3, 10, 10]);
});

test('progressione: al tetto sale il carico e si riparte dal basso', () => {
  const r = suggerisciProgressione({ serie: 3, ripetizioni: 12, carico: 10 }, cfg);
  assert.deepEqual([r.ripetizioni, r.carico], [8, 12]);
  const r2 = suggerisciProgressione({ serie: 3, ripetizioni: 10, carico: 7.5 }, { tetto: 10, ripPartenza: 6, incrementoCarico: 0.5 });
  assert.deepEqual([r2.ripetizioni, r2.carico], [6, 8]);
});

test('progressione: nessuno storico', () => {
  assert.equal(suggerisciProgressione(null, cfg), null);
});

test('ultima sessione separata per variante', () => {
  const st = [
    { data: '2026-10-01', esercizioId: 'trazioni', variante: 'Negative', ripetizioni: 5, carico: 0, serie: 3 },
    { data: '2026-10-05', esercizioId: 'trazioni', variante: 'Assistite con elastico', ripetizioni: 8, carico: 0, serie: 3 },
    { data: '2026-10-08', esercizioId: 'trazioni', variante: 'Negative', ripetizioni: 6, carico: 0, serie: 3 },
  ];
  assert.equal(ultimaSessione(st, 'trazioni', 'Negative').ripetizioni, 6);
  assert.equal(ultimaSessione(st, 'trazioni', 'Libere'), null);
});

test('calendario: cosa tocca oggi', () => {
  const cal = ['intervalli', 'thruster', 'riposo', 'intervalli', 'trazioni', 'riposo', 'riposo'];
  assert.equal(cosaTocca('2026-11-02', cal), 'intervalli'); // lunedì
  assert.equal(cosaTocca('2026-11-03', cal), 'thruster');
  assert.equal(cosaTocca('2026-11-06', cal), 'trazioni');
  assert.equal(cosaTocca('2026-11-08', cal), 'riposo'); // domenica
});

test('id esercizio unico', () => {
  assert.equal(idEsercizio('Panca piana', []), 'panca-piana');
  assert.equal(idEsercizio('Panca piana', [{ id: 'panca-piana' }]), 'panca-piana-2');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, leggiTabella } from '../js/core/csv.js';
import { normalizzaData, parseNumero, aggiungiGiorni, differenzaGiorni, giornoSettimana, inizioSettimana, fineMese } from '../js/core/util.js';
import { creaBackup, validaBackup, leggiBackup } from '../js/logica/backup.js';
import { conPredefinite } from '../js/logica/impostazioni.js';

test('CSV: virgolette, BOM, righe vuote, separatore ;', () => {
  const r = parseCSV('﻿a;b;c\r\n"x;1";"di ""citazione""";3\r\n\r\n');
  assert.deepEqual(r, [['a', 'b', 'c'], ['x;1', 'di "citazione"', '3']]);
});

test('CSV: tabella tollerante a colonne mancanti', () => {
  const t = leggiTabella('Date,Energy (kcal)\n2025-01-01,2000\n2025-01-02\n');
  assert.equal(t.righe[1]['Energy (kcal)'], '');
  assert.deepEqual(t.intestazioni, ['Date', 'Energy (kcal)']);
});

test('numeri e date', () => {
  assert.equal(parseNumero('1,5'), 1.5);
  assert.equal(parseNumero('1.234,5'), 1234.5);
  assert.equal(parseNumero('1,234.5'), 1234.5);
  assert.equal(parseNumero(''), null);
  assert.equal(normalizzaData('2025-01-05 07:30:00'), '2025-01-05');
  assert.equal(normalizzaData('25/01/2025'), '2025-01-25');
  assert.equal(normalizzaData('01/25/2025'), '2025-01-25');
  assert.equal(normalizzaData('20250105'), '2025-01-05');
  assert.equal(normalizzaData('boh'), null);
  assert.equal(aggiungiGiorni('2025-02-28', 1), '2025-03-01');
  assert.equal(differenzaGiorni('2025-01-01', '2025-03-01'), 59);
  assert.equal(giornoSettimana('2026-11-04'), 2); // mercoledì
  assert.equal(inizioSettimana('2026-11-04'), '2026-11-02');
  assert.equal(fineMese('2024-02-10'), '2024-02-29');
});

test('backup: creazione, validazione, round trip', () => {
  const b = creaBackup({ peso: [{ data: '2025-01-01', peso: 80 }], estranea: 1 }, new Date('2025-01-02T10:00:00Z'));
  assert.equal(b.dati.estranea, undefined);
  const r = leggiBackup(JSON.stringify(b));
  assert.ok(r.ok);
  assert.deepEqual(r.dati.peso, [{ data: '2025-01-01', peso: 80 }]);
});

test('backup: file non validi', () => {
  assert.equal(leggiBackup('non json').ok, false);
  assert.equal(validaBackup({ app: 'altro', versione: 1, dati: {} }).ok, false);
  assert.equal(validaBackup({ app: 'salute-pwa', versione: 99, dati: {} }).ok, false);
  assert.equal(validaBackup({ app: 'salute-pwa', versione: 1 }).ok, false);
});

test('impostazioni: i predefiniti completano i valori mancanti', () => {
  const s = conPredefinite({ nutrizione: { kcal: 1800 }, calendario: ['riposo'] });
  assert.equal(s.nutrizione.kcal, 1800);
  assert.equal(s.nutrizione.p, 30);
  assert.deepEqual(s.calendario, ['riposo']);
});

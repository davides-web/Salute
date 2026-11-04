import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { leggiTabella } from '../js/core/csv.js';
import { TIPI_FITNESS, indovinaMappatura, applicaMappatura, errorMappatura, mappaturaCompatibile, totaliMensili } from '../js/logica/fitness.js';

const tab = (n) => leggiTabella(fs.readFileSync(new URL(`../esempi/${n}`, import.meta.url), 'utf8'));

test('mappatura indovinata sui file di esempio', () => {
  let t = tab('mifitness_passi.csv');
  assert.deepEqual(indovinaMappatura('passi', t.intestazioni, t.righe).colonne, { data: 'Date', passi: 'Steps' });
  t = tab('mifitness_frequenza_cardiaca.csv');
  assert.deepEqual(indovinaMappatura('frequenza', t.intestazioni).colonne, { data: 'time', bpm: 'heart_rate' });
  t = tab('mifitness_sonno.csv');
  const s = indovinaMappatura('sonno', t.intestazioni, t.righe);
  assert.equal(s.colonne.durata, 'sleep_duration_min'); assert.equal(s.unita, 'minuti');
  t = tab('mifitness_allenamenti.csv');
  const a = indovinaMappatura('allenamenti', t.intestazioni, t.righe);
  assert.equal(a.colonne.data, 'Start time'); assert.equal(a.colonne.durata, 'Duration (s)'); assert.equal(a.unita, 'secondi');
  assert.equal(a.colonne.tipo, 'Type'); assert.equal(a.colonne.fcMedia, 'Avg heart rate');
});

test('passi: somma per giorno e righe scartate', () => {
  const righe = [{ d: '2026-10-01', p: '1000' }, { d: '2026-10-01', p: '500' }, { d: 'boh', p: '9' }, { d: '2026-10-02', p: '' }];
  const r = applicaMappatura('passi', righe, { colonne: { data: 'd', passi: 'p' } });
  assert.deepEqual(r.passi, { '2026-10-01': 1500 });
  assert.equal(r.scartate, 2);
});

test('frequenza: riposo = 10° percentile dei campioni del giorno', () => {
  const t = tab('mifitness_frequenza_cardiaca.csv');
  const r = applicaMappatura('frequenza', t.righe, { colonne: { data: 'time', bpm: 'heart_rate' } });
  const g = r.fc['2026-09-14'];
  assert.ok(g.riposo >= 50 && g.riposo <= 68 && g.media > g.riposo);
  const d = applicaMappatura('frequenza', [{ d: '2026-10-01', r: '58' }], { colonne: { data: 'd', fcRiposo: 'r' } });
  assert.equal(d.fc['2026-10-01'].riposo, 58);
});

test('sonno: unità diverse e calcolo da inizio/fine', () => {
  const ore = applicaMappatura('sonno', [{ d: '2026-10-01', h: '7,5' }], { colonne: { data: 'd', durata: 'h' }, unita: 'ore' });
  assert.equal(ore.sonno['2026-10-01'], 450);
  const sec = applicaMappatura('sonno', [{ d: '2026-10-01', s: '27000' }], { colonne: { data: 'd', durata: 's' }, unita: 'secondi' });
  assert.equal(sec.sonno['2026-10-01'], 450);
  const ie = applicaMappatura('sonno', [{ d: '2026-10-02', a: '2026-10-01 23:00:00', b: '2026-10-02 06:30:00' }], { colonne: { data: 'd', inizio: 'a', fine: 'b' } });
  assert.equal(ie.sonno['2026-10-02'], 450);
});

test('allenamenti dal file di esempio', () => {
  const t = tab('mifitness_allenamenti.csv');
  const m = indovinaMappatura('allenamenti', t.intestazioni, t.righe);
  const r = applicaMappatura('allenamenti', t.righe, m);
  assert.ok(r.allenamenti.length > 10);
  assert.ok(r.allenamenti[0].durataMin > 20 && r.allenamenti[0].durataMin < 60);
  assert.equal(r.allenamenti[0].ora, '18:30');
});

test('validità della mappatura e compatibilità con mappature salvate', () => {
  assert.ok(errorMappatura('passi', { data: 'a' }));
  assert.equal(errorMappatura('passi', { data: 'a', passi: 'b' }), null);
  assert.ok(errorMappatura('frequenza', { data: 'a' }));
  assert.ok(errorMappatura('sonno', { data: 'a' }));
  assert.equal(errorMappatura('sonno', { data: 'a', inizio: 'b', fine: 'c' }), null);
  assert.equal(mappaturaCompatibile({ colonne: { data: 'Date' } }, ['Date', 'Steps']), true);
  assert.equal(mappaturaCompatibile({ colonne: { data: 'Giorno' } }, ['Date', 'Steps']), false);
  assert.equal(mappaturaCompatibile(null, ['Date']), false);
  assert.equal(Object.keys(TIPI_FITNESS).length, 4);
});

test('totali mensili dei passi', () => {
  const m = totaliMensili({ '2026-09-30': 100, '2026-10-01': 200, '2026-10-02': 300 });
  assert.deepEqual(m.map((x) => [x.mese, x.totale, x.giorni]), [['2026-09', 100, 1], ['2026-10', 500, 2]]);
});

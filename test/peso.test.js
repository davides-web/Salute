import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaMobile, ritmoSettimanale, proiezione } from '../js/logica/peso.js';

const vicino = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≉ ${b}`);

test('media mobile a 7 giorni (finestra per data)', () => {
  const punti = [
    { data: '2026-10-01', valore: 80 },
    { data: '2026-10-02', valore: 82 },
    { data: '2026-10-03', valore: 81 },
    { data: '2026-10-10', valore: 78 }, // le misure precedenti escono dalla finestra
  ];
  const m = mediaMobile(punti, 7);
  vicino(m[0].media, 80);
  vicino(m[1].media, 81);
  vicino(m[2].media, 81);
  vicino(m[3].media, 78);
});

test('media mobile: ordina i punti e gestisce lista vuota', () => {
  assert.deepEqual(mediaMobile([]), []);
  const m = mediaMobile([{ data: '2026-10-02', valore: 2 }, { data: '2026-10-01', valore: 4 }]);
  assert.equal(m[0].data, '2026-10-01');
  vicino(m[1].media, 3);
});

test('ritmo settimanale: retta perfetta -0,5 kg/settimana', () => {
  const punti = [];
  for (let i = 0; i <= 21; i += 3) {
    const d = new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10);
    punti.push({ data: d, valore: 90 - (0.5 / 7) * i });
  }
  vicino(ritmoSettimanale(punti), -0.5, 1e-9);
});

test('ritmo settimanale: dati insufficienti', () => {
  assert.equal(ritmoSettimanale([{ data: '2026-10-01', valore: 80 }]), null);
  assert.equal(ritmoSettimanale([{ data: '2026-10-01', valore: 80 }, { data: '2026-10-04', valore: 79 }]), null);
});

test('proiezione: data di arrivo', () => {
  const p = proiezione({ attuale: 85, dataAttuale: '2026-11-01', obiettivo: 80, ritmo: -0.5 });
  vicino(p.settimane, 10);
  assert.equal(p.giorni, 70);
  assert.equal(p.data, '2027-01-10');
});

test('proiezione: casi particolari', () => {
  assert.equal(proiezione({ attuale: 85, dataAttuale: '2026-11-01', obiettivo: 80, ritmo: 0.3 }), null); // sale invece di scendere
  assert.equal(proiezione({ attuale: 85, dataAttuale: '2026-11-01', obiettivo: 80, ritmo: 0 }), null);
  assert.deepEqual(proiezione({ attuale: 80.02, dataAttuale: '2026-11-01', obiettivo: 80, ritmo: -0.5 }), { raggiunto: true });
  assert.equal(proiezione({ attuale: 85, dataAttuale: '2026-11-01', obiettivo: null, ritmo: -0.5 }), null);
  const su = proiezione({ attuale: 70, dataAttuale: '2026-11-01', obiettivo: 72, ritmo: 0.25 });
  assert.equal(su.giorni, 56);
});

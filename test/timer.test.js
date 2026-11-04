import test from 'node:test';
import assert from 'node:assert/strict';
import { costruisciSequenza, durataTotale, statoAlTempo, ripetizioniCompletate, ripetizioniTotali, annuncioFase } from '../js/logica/timer.js';
import { LIVELLI, parametriLivello, livelloDaParametri, proponiLivello } from '../js/logica/livelli.js';

const P = { riscaldamento: 300, lavoro: 30, recupero: 60, ripetizioni: 3, serie: 2, pausaSerie: 90, defaticamento: 300 };

test('sequenza: ordine delle fasi con più serie', () => {
  const seq = costruisciSequenza(P);
  assert.deepEqual(seq.map((f) => f.tipo), [
    'riscaldamento',
    'lavoro', 'recupero', 'lavoro', 'recupero', 'lavoro', 'pausa',
    'lavoro', 'recupero', 'lavoro', 'recupero', 'lavoro',
    'defaticamento',
  ]);
  assert.equal(ripetizioniTotali(seq), 6);
  assert.equal(durataTotale(seq), 300 + 6 * 30 + 4 * 60 + 90 + 300);
  assert.deepEqual([seq[1].rip, seq[1].ripTot, seq[1].serie], [1, 3, 1]);
});

test('sequenza: fasi a durata zero saltate, una sola serie senza pausa', () => {
  const seq = costruisciSequenza({ ...P, riscaldamento: 0, defaticamento: 0, serie: 1, pausaSerie: 0, ripetizioni: 2 });
  assert.deepEqual(seq.map((f) => f.tipo), ['lavoro', 'recupero', 'lavoro']);
});

test('livello 3: 8 ripetizioni 30"/60"', () => {
  const seq = costruisciSequenza(parametriLivello(3));
  assert.equal(ripetizioniTotali(seq), 8);
  assert.equal(durataTotale(seq), 480 + 8 * 30 + 7 * 60 + 300);
});

test('stato al tempo: confini tra fasi, fine e ripetizioni completate', () => {
  const seq = costruisciSequenza(P);
  let s = statoAlTempo(seq, 0);
  assert.equal(s.fase.tipo, 'riscaldamento'); assert.equal(s.restante, 300);
  s = statoAlTempo(seq, 299.5);
  assert.equal(s.indice, 0); assert.ok(Math.abs(s.restante - 0.5) < 1e-9);
  s = statoAlTempo(seq, 300);
  assert.equal(s.fase.tipo, 'lavoro'); assert.equal(s.trascorsoFase, 0);
  s = statoAlTempo(seq, 335);
  assert.equal(s.fase.tipo, 'recupero'); assert.equal(s.restante, 55);
  assert.equal(statoAlTempo(seq, durataTotale(seq)).finito, true);
  assert.equal(ripetizioniCompletate(seq, 329), 0);
  assert.equal(ripetizioniCompletate(seq, 330), 1);
  assert.equal(ripetizioniCompletate(seq, 10000), 6);
});

test('annunci vocali', () => {
  const seq = costruisciSequenza(P);
  assert.equal(annuncioFase(seq[1]), 'Lavoro. Ripetizione 1 di 3, serie 1 di 2');
  assert.equal(annuncioFase(seq[0]), 'Riscaldamento');
});

test('livelli: parametri precaricati come da specifica', () => {
  assert.equal(LIVELLI.length, 6);
  const l1 = parametriLivello(1);
  assert.deepEqual([l1.lavoro, l1.recupero, l1.ripetizioni], [60, 120, 6]);
  const l4 = parametriLivello(4);
  assert.deepEqual([l4.lavoro, l4.recupero, l4.ripetizioni], [30, 45, 10]);
  for (const l of LIVELLI) {
    const p = parametriLivello(l.n);
    assert.ok(p.riscaldamento >= 300 && p.riscaldamento <= 600, 'riscaldamento 5-10 minuti');
    assert.equal(p.defaticamento, 300);
    assert.equal(livelloDaParametri(p), l.n);
  }
  assert.equal(livelloDaParametri({ ...parametriLivello(5), ripetizioni: 8 }), 5);
  assert.equal(livelloDaParametri({ ...parametriLivello(2), lavoro: 45 }), null);
});

// --- regola di avanzamento ---
const s = (livello, completa, rpe, giorno) => ({ livello, completa, rpe, data: `2026-10-${String(giorno).padStart(2, '0')}` });
const cfg = { sessioniPerSalire: 3, rpeMaxScendere: 9 };

test('avanzamento: sale dopo 3 sessioni complete con RPE entro il previsto', () => {
  const r = proponiLivello([s(2, true, 6, 1), s(2, true, 5, 3), s(2, true, 6, 5)], 2, cfg);
  assert.equal(r.azione, 'sali'); assert.equal(r.livello, 3);
});

test('avanzamento: non sale con solo 2 sessioni o se una supera l\'RPE previsto', () => {
  assert.equal(proponiLivello([s(2, true, 6, 1), s(2, true, 6, 3)], 2, cfg).azione, 'resta');
  assert.equal(proponiLivello([s(2, true, 6, 1), s(2, true, 8, 3), s(2, true, 6, 5)], 2, cfg).azione, 'resta');
});

test('avanzamento: conta solo le sessioni consecutive al livello attuale', () => {
  const r = proponiLivello([s(1, true, 5, 1), s(1, true, 5, 2), s(2, true, 6, 3), s(2, true, 6, 4)], 2, cfg);
  assert.equal(r.azione, 'resta');
});

test('avanzamento: scende se l\'ultima non è completa o RPE > 9', () => {
  let r = proponiLivello([s(3, true, 7, 1), s(3, false, 8, 3)], 3, cfg);
  assert.equal(r.azione, 'scendi'); assert.equal(r.livello, 2);
  r = proponiLivello([s(3, true, 10, 3)], 3, cfg);
  assert.equal(r.azione, 'scendi');
  r = proponiLivello([s(3, true, 9, 3)], 3, cfg); // 9 non supera 9
  assert.notEqual(r.azione, 'scendi');
});

test('avanzamento: limiti (livello 1 non scende, livello 6 non sale) e parametri configurabili', () => {
  assert.equal(proponiLivello([s(1, false, 5, 1)], 1, cfg).azione, 'resta');
  assert.equal(proponiLivello([s(6, true, 8, 1), s(6, true, 9, 2), s(6, true, 8, 3)], 6, cfg).azione, 'resta');
  const r = proponiLivello([s(1, true, 5, 1), s(1, true, 5, 2)], 1, { sessioniPerSalire: 2, rpeMaxScendere: 9 });
  assert.equal(r.azione, 'sali');
  assert.equal(proponiLivello([], 4, cfg).azione, 'resta');
});

test('avanzamento: le sessioni personalizzate (senza livello) sono ignorate', () => {
  const sess = [s(2, true, 6, 1), s(2, true, 6, 2), { livello: null, completa: false, rpe: 10, data: '2026-10-03' }, s(2, true, 6, 4)];
  assert.equal(proponiLivello(sess, 2, cfg).azione, 'sali');
});

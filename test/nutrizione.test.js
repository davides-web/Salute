import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { importaCronometer, rilevaTipoCronometer, percentualiMacro, reportPeriodo, dentroObiettivo, sostituisciPerData, unisciRegistroPeso } from '../js/logica/nutrizione.js';
import { leggiTabella } from '../js/core/csv.js';

const vicino = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≉ ${b}`);
const esempio = (nome) => fs.readFileSync(new URL(`../esempi/${nome}`, import.meta.url), 'utf8');

test('Cronometer: riconosce i quattro tipi di export dai file di esempio', () => {
  const tipo = (n) => rilevaTipoCronometer(leggiTabella(esempio(n)).intestazioni);
  assert.equal(tipo('cronometer_dailysummary.csv'), 'giornaliero');
  assert.equal(tipo('cronometer_servings.csv'), 'porzioni');
  assert.equal(tipo('cronometer_biometrics.csv'), 'biometria');
  assert.equal(tipo('cronometer_exercises.csv'), 'esercizi');
  assert.equal(rilevaTipoCronometer(['a', 'b']), null);
});

test('Cronometer: riepilogo giornaliero dal file di esempio', () => {
  const r = importaCronometer(esempio('cronometer_dailysummary.csv'));
  assert.equal(r.tipo, 'giornaliero');
  assert.equal(r.giorni.length, 49);
  const g = r.giorni[0];
  assert.equal(g.data, '2026-09-14');
  assert.ok(g.kcal > 1000 && g.proteine > 50 && g.carboidrati > 50 && g.sodio > 1000 && g.potassio > 500);
  assert.ok(g.micro.vitC > 0 && g.micro.vitD > 0);
});

test('Cronometer: colonne in più, ordine diverso, maiuscole, virgola decimale', () => {
  const testo = 'Colonna strana,PROTEIN (g),fat (g),Date,Carbs (g),Energy (kcal),Fiber (g),Vitamin D (µg),Sodium (mg)\n' +
    'x,"150,5",60,2026-10-01,200,"2000",30,10,2000\n' +
    'x,100,50,2026-10-02,150,1500,20,,1500\n' +
    'x,100,50,data-sbagliata,150,1500,20,,1500\n';
  const r = importaCronometer(testo);
  assert.equal(r.giorni.length, 2);
  assert.equal(r.scartate, 1);
  assert.equal(r.giorni[0].proteine, 150.5);
  assert.equal(r.giorni[0].micro.vitD, 400); // 10 µg -> 400 UI
  assert.equal(r.giorni[1].micro.vitD, undefined);
});

test('Cronometer: separatore punto e virgola e intestazione con BOM', () => {
  const r = importaCronometer('﻿Day;Energy (kcal);Protein (g)\n2026-10-01;1900;120\n');
  assert.equal(r.giorni[0].kcal, 1900);
});

test('Cronometer: porzioni, biometria (con lb e pollici) ed esercizi', () => {
  const p = importaCronometer(esempio('cronometer_servings.csv'));
  assert.equal(p.tipo, 'porzioni'); assert.ok(p.porzioni.length > 400);
  assert.equal(p.porzioni[0].gruppo, 'Breakfast');
  const b = importaCronometer(esempio('cronometer_biometrics.csv'));
  assert.ok(Object.keys(b.peso).length > 10 && Object.keys(b.vita).length > 5 && b.ignorate > 0);
  const b2 = importaCronometer('Day,Time,Metric,Unit,Amount\n2026-10-01,08:00,Weight,lbs,180\n2026-10-01,08:00,Waist,in,36\n');
  vicino(b2.peso['2026-10-01'], 81.6); vicino(b2.vita['2026-10-01'], 91.4);
  const e = importaCronometer(esempio('cronometer_exercises.csv'));
  assert.equal(e.tipo, 'esercizi'); assert.ok(e.esercizi[0].minuti > 0);
});

test('percentuali dei macro', () => {
  // 150 g proteine (600 kcal), 67 g grassi (603 kcal), 200 g carboidrati (800 kcal)
  const p = percentualiMacro({ proteine: 150, grassi: 67, carboidrati: 200 });
  vicino(p.p + p.g + p.c, 100);
  vicino(p.p, (600 / 2003) * 100); vicino(p.g, (603 / 2003) * 100); vicino(p.c, (800 / 2003) * 100);
  assert.equal(percentualiMacro({ proteine: 0, grassi: 0, carboidrati: 0 }), null);
});

const cfg = { kcal: 2000, p: 30, g: 30, c: 40, tolleranza: 10, giornoRicarica: null, modoRicarica: 'separato', sogliaMicro: 100 };
const giorno = (data, kcal, extra = {}) => ({ data, kcal, proteine: 150, grassi: 66, carboidrati: 200, fibre: 25, sodio: 2000, potassio: 3000, micro: {}, ...extra });

test('dentro/fuori obiettivo con tolleranza', () => {
  assert.equal(dentroObiettivo({ kcal: 2190 }, cfg), true);
  assert.equal(dentroObiettivo({ kcal: 2250 }, cfg), false);
  assert.equal(dentroObiettivo({ kcal: 1790 }, cfg), false);
});

test('report: medie, giorni dentro/fuori e micronutrienti più spesso scarsi', () => {
  const giorni = [
    giorno('2026-10-05', 2000, { micro: { vitC: 100, calcio: 500 } }),
    giorno('2026-10-06', 1500, { micro: { vitC: 60, calcio: 1200 } }),
    giorno('2026-10-07', 2100, { micro: { vitC: 90, calcio: 400 } }),
  ];
  const r = reportPeriodo(giorni, cfg, '2026-10-05', '2026-10-11');
  const s = r.regolari;
  assert.equal(s.n, 3);
  vicino(s.medie.kcal, 1866.6666667, 1e-4);
  assert.equal(s.dentro, 2); assert.equal(s.fuori, 1);
  assert.equal(s.micro[0].chiave, 'calcio'); // 2 giorni su 3 sotto il fabbisogno
  assert.equal(s.micro[0].giorniSotto, 2);
  assert.equal(r.ricarica, null);
});

test('report: giorno di ricarica a parte o escluso, periodo rispettato', () => {
  const giorni = [giorno('2026-10-05', 2000), giorno('2026-10-06', 2000), giorno('2026-10-10', 3000), giorno('2026-10-20', 1000)]; // 10 ott = sabato
  const sep = reportPeriodo(giorni, { ...cfg, giornoRicarica: 5 }, '2026-10-01', '2026-10-12');
  assert.equal(sep.regolari.n, 2); assert.equal(sep.ricarica.n, 1); assert.equal(sep.ricarica.medie.kcal, 3000);
  const esc = reportPeriodo(giorni, { ...cfg, giornoRicarica: 5, modoRicarica: 'escludi' }, '2026-10-01', '2026-10-12');
  assert.equal(esc.ricarica, null); assert.equal(esc.ricaricaEsclusa, 1); assert.equal(esc.regolari.n, 2);
});

test('unione dei dati importati', () => {
  const v = sostituisciPerData([{ data: '2026-10-01', x: 1 }, { data: '2026-10-02', x: 2 }], [{ data: '2026-10-02', x: 9 }]);
  assert.deepEqual(v.map((o) => o.x), [1, 9]);
  const reg = unisciRegistroPeso([{ data: '2026-10-01', peso: 80 }], { '2026-10-01': 99, '2026-10-02': 79 }, { '2026-10-01': 90 });
  assert.deepEqual(reg, [{ data: '2026-10-01', peso: 80, vita: 90 }, { data: '2026-10-02', peso: 79 }]);
});

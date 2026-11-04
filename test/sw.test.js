import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Se manca un file nell'elenco del service worker, l'app non funziona offline.
test('il service worker elenca tutti i file dell\'app', () => {
  const sw = fs.readFileSync('sw.js', 'utf8');
  const blocco = sw.match(/const FILE = \[([\s\S]*?)\];/)[1];
  const elenco = [...blocco.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const tutti = [];
  const visita = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); f.isDirectory() ? visita(p) : tutti.push(p); } };
  ['js', 'css', 'icone'].forEach(visita);
  const mancanti = tutti.filter((f) => !elenco.includes(f.split(path.sep).join('/')));
  assert.deepEqual(mancanti, []);
  for (const f of elenco.filter((x) => x.includes('.'))) assert.ok(fs.existsSync(f), `file inesistente: ${f}`);
});

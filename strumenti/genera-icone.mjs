// Genera le icone PNG dell'app (senza librerie esterne).
// Uso: node strumenti/genera-icone.mjs
import fs from 'node:fs';
import zlib from 'node:zlib';

// --- scrittura PNG minimale -------------------------------------------------
const TAB = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TAB[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(tipo, dati) {
  const len = Buffer.alloc(4); len.writeUInt32BE(dati.length);
  const corpo = Buffer.concat([Buffer.from(tipo), dati]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([len, corpo, crc]);
}
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 bit, RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- disegno: sfondo verde-acqua + linea "battito" bianca ---------------------
const SFONDO = [15, 118, 110];
const PUNTI = [[0.14, 0.52], [0.34, 0.52], [0.42, 0.30], [0.54, 0.74], [0.62, 0.44], [0.68, 0.52], [0.86, 0.52]];

function distSegmento(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}
const liscia = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

function disegna(size, maschera) {
  const px = Buffer.alloc(size * size * 4);
  const scala = maschera ? 0.7 : 1; // l'icona "maskable" tiene il disegno nella zona sicura
  const punti = PUNTI.map(([x, y]) => [(0.5 + (x - 0.5) * scala) * size, (0.5 + (y - 0.5) * scala) * size]);
  const spessore = size * 0.045 * scala;
  const raggioAngoli = size * 0.22;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    // forma: quadrato arrotondato (intero per la versione maskable)
    let alfa = 1;
    if (!maschera) {
      const cx = Math.max(Math.abs(x + 0.5 - size / 2) - (size / 2 - raggioAngoli), 0);
      const cy = Math.max(Math.abs(y + 0.5 - size / 2) - (size / 2 - raggioAngoli), 0);
      alfa = 1 - liscia(raggioAngoli - 1, raggioAngoli + 1, Math.hypot(cx, cy));
    }
    let d = Infinity;
    for (let i = 0; i < punti.length - 1; i++) d = Math.min(d, distSegmento(x + 0.5, y + 0.5, punti[i], punti[i + 1]));
    const linea = 1 - liscia(spessore - 1, spessore + 1, d);
    const o = (y * size + x) * 4;
    for (let k = 0; k < 3; k++) px[o + k] = Math.round(SFONDO[k] * (1 - linea) + 255 * linea);
    px[o + 3] = Math.round(255 * alfa);
  }
  return png(size, size, px);
}

fs.mkdirSync('icone', { recursive: true });
fs.writeFileSync('icone/icon-192.png', disegna(192, false));
fs.writeFileSync('icone/icon-512.png', disegna(512, false));
fs.writeFileSync('icone/icon-maskable-512.png', disegna(512, true));
const pts = PUNTI.map(([x, y]) => `${Math.round(x * 512)},${Math.round(y * 512)}`).join(' ');
fs.writeFileSync('icone/icon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#0f766e"/>` +
  `<polyline points="${pts}" fill="none" stroke="#fff" stroke-width="23" stroke-linecap="round" stroke-linejoin="round"/></svg>\n`);
console.log('Icone generate in icone/');

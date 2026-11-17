#!/usr/bin/env node
/** Детализация пиксельных различий в полосе mobile-эталона (T18.17 дифф-ревью):
 *  usage: node .zcode/t1817-pixdetail.mjs <old.png> <new.png> <y0> <y1> */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

function decodePNG(path) {
  const buf = readFileSync(path);
  let off = 8;
  let w = 0, h = 0, colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  const bpp = colorType === 6 ? 4 : 3;
  const stride = w * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(h * stride);
  const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= bpp ? px[dst + x - bpp] : 0;
      const up = y > 0 ? px[dst - stride + x] : 0;
      const ul = y > 0 && x >= bpp ? px[dst - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += left;
      else if (f === 2) v += up;
      else if (f === 3) v += (left + up) >> 1;
      else if (f === 4) v += paeth(left, up, ul);
      px[dst + x] = v & 0xff;
    }
  }
  return { w, h, bpp, px };
}

const [aPath, bPath, y0, y1] = process.argv.slice(2);
const a = decodePNG(aPath);
const b = decodePNG(bPath);
let count = 0;
let hard = 0;
const samples = [];
for (let y = Number(y0); y <= Number(y1); y++) {
  for (let x = 0; x < a.w; x++) {
    const i = (y * a.w + x) * a.bpp;
    const d = [0, 1, 2].map((c) => Math.abs(a.px[i + c] - b.px[i + c]));
    const m = Math.max(...d);
    if (m > 0) {
      count++;
      if (m > 8) hard++;
      if (samples.length < 12 && m > 8) {
        samples.push({
          x, y, m,
          old: [a.px[i], a.px[i + 1], a.px[i + 2]],
          new: [b.px[i], b.px[i + 1], b.px[i + 2]],
        });
      }
    }
  }
}
console.log(JSON.stringify({ band: [y0, y1], diffPixels: count, diffPixelsOver8: hard, samples }, null, 1));

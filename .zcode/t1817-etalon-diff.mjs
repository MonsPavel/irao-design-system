#!/usr/bin/env node
/**
 * acceptor T18.17: ревью пересъёма fullPage-эталонов pattern-landing-section
 * (протокол ADR-0004/T18.2 — «старая база vs новая до старой высоты»):
 * верх новой страницы до первой строки различий обязан быть попиксельно
 * идентичен старому эталону (секции adv-grid/evt-feature/tm вставлены В
 * КОНЕЦ стенда, после lsp-holding — верх до вставки не меняется), прирост =
 * высота трёх секций + сдвиг хвоста. Первая строка различий = начало вставки.
 * Для контроля «вставка цельная» — считаем diff-ряды в диапазоне вставки
 * (гэп между рядами = существующие секции не тронуты).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const ROOT = 'D:/repositories/irao-design-system';
const DIR = 'tests/visual/__screenshots__/pattern-landing-section.spec.js';
const TMP = join(ROOT, '.zcode', 'tmp-t1817');

mkdirSync(TMP, { recursive: true });

const NAMES = [
  'pattern-landing-section--desktop',
  'pattern-landing-section--mobile',
  'pattern-landing-section--tablet',
];

for (const name of NAMES) {
  const old = execFileSync('git', ['-C', ROOT, 'show', `HEAD~1:${DIR}/${name}.png`], {
    maxBuffer: 64 * 1024 * 1024,
  });
  writeFileSync(join(TMP, `${name}--old.png`), old);
}

const browser = await chromium.launch();
const page = await browser.newPage();

for (const name of NAMES) {
  const oldPng = readFileSync(join(TMP, `${name}--old.png`)).toString('base64');
  const newPng = readFileSync(join(ROOT, DIR, `${name}.png`)).toString('base64');
  const result = await page.evaluate(
    async ({ oldB64, newB64 }) => {
      const load = (b64) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = `data:image/png;base64,${b64}`;
        });
      const oldImg = await load(oldB64);
      const newImg = await load(newB64);
      const h = oldImg.height;
      const w = oldImg.width;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(oldImg, 0, 0);
      const a = ctx.getImageData(0, 0, w, h).data;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(newImg, 0, 0);
      const b = ctx.getImageData(0, 0, w, h).data;
      let diff = 0;
      let firstDiffRow = -1;
      let lastDiffRowOld = -1;
      const rows = new Set();
      for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) {
          const pixel = Math.floor(i / 4);
          const row = Math.floor(pixel / w);
          if (firstDiffRow === -1 || row < firstDiffRow) firstDiffRow = row;
          if (row > lastDiffRowOld) lastDiffRowOld = row;
          rows.add(row);
          diff += 1;
        }
      }
      const sorted = [...rows].sort((x, y) => x - y);
      const bands = [];
      let start = null, prev = null;
      for (const r of sorted) {
        if (start === null) { start = r; prev = r; continue; }
        if (r - prev > 8) { bands.push([start, prev]); start = r; }
        prev = r;
      }
      if (start !== null) bands.push([start, prev]);
      return {
        old: `${oldImg.width}x${oldImg.height}`,
        new: `${newImg.width}x${newImg.height}`,
        diff,
        firstDiffRow,
        lastDiffRowOld,
        diffRows: rows.size,
        bands,
      };
    },
    { oldB64: oldPng, newB64: newPng },
  );
  console.log(
    `${name}: old ${result.old} → new ${result.new}, diffPixels(до старой высоты) = ${result.diff}, ` +
      `первая строка различий = ${result.firstDiffRow}, последняя = ${result.lastDiffRowOld}, ` +
      `различающихся рядов = ${result.diffRows}`,
  );
  console.log('  полосы различий:', JSON.stringify(result.bands));
}

await browser.close();

#!/usr/bin/env node
/**
 * pilot/career-portal/probe-vac-rows.mjs — приёмочная проба T16.5 (строки
 * списка и сайдбар vacancies по канону lpp-row) — закрывающее доказательство
 * REPORT §8.2 №6, инструментарий пилота (ревью T16.5: скрипт пробы обязан
 * быть закоммичен, а data-* пробы — читаться с САМОЙ строки).
 *
 * Методика — compare.mjs (оригинал — GitHub Pages, клон — локальный serve
 * 8080, viewport 1440×900); страница одна — vacancies.html (единственная со
 * строками/сайдбаром). Пары: row-title (+якорь, тег), row-item
 * (паддинг/bg/радиус), pill (рамка/высота) + pill-icon (кружок),
 * reset-control, side-promo, promo-btn; data-* ПЕРВОЙ строки — паритет
 * build.py:72–79 (селекторы строки — те же пер-сторонние, что у пары
 * row-item: '.vac-row' / '.cp-vac-row'; подстрочный [class*="vac-row"]
 * матчит контейнер .vac-rows раньше строк и даёт 10×null — холостая
 * сверка, замечание ревью T16.5); hover строки — перекраска ссылки в
 * primary (pages.css:178).
 *
 * Запуск: node pilot/career-portal/probe-vac-rows.mjs [out.json]
 * (по умолчанию compare-output/probe-vac-rows.json — артефакты вне git).
 * Отсутствие строки/ссылки на любой стороне — ошибка пробы (exit 1):
 * нулевые значения не проходят за MATCH.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PILOT_DIR = dirname(fileURLToPath(import.meta.url));
const ORIGINAL = 'https://monspavel.github.io/career-portal';
const PILOT = 'http://127.0.0.1:8080/pilot/career-portal/dist';
const VIEWPORT = { width: 1440, height: 900 };
const OUT = process.argv[2] || join(PILOT_DIR, 'compare-output', 'probe-vac-rows.json');

const PROPS = [
  'font-size',
  'font-weight',
  'line-height',
  'color',
  'background-color',
  'border-radius',
  'border-color',
  'padding',
  'height',
  'text-decoration-line',
];

/** [имя, селектор оригинала, селектор клона] */
const PAIRS = [
  ['row-title', '.vac-row__title', '.cp-vac-row .ui-h6'],
  ['row-title-anchor', '.vac-row__title a', '.cp-vac-row__title a'],
  ['row-item', '.vac-row', '.cp-vac-row'],
  ['pill', '.vac-row .pill-btn', '.cp-vac-row .ui-button--pill'],
  ['pill-icon', '.vac-row .pill-btn__icon', '.cp-vac-row .ui-button__icon'],
  ['reset-control', '.vac-side__reset', '.cp-vac-side .ui-button--text'],
  ['side-promo', '.vac-side__promo', '.cp-vac-side__promo'],
  ['promo-btn', '.vac-side__promo .btn--primary', '.cp-vac-side__promo .ui-button--primary'],
];

/** data-* первой строки — селектор строки пер-сторонний (см. шапку). */
const ROW_SELECTOR = { original: '.vac-row', pilot: '.cp-vac-row' };
const TITLE_ANCHOR = { original: '.vac-row__title a', pilot: '.cp-vac-row__title a' };

const DATA_ATTRS = [
  'data-region',
  'data-city',
  'data-spec',
  'data-segment',
  'data-company',
  'data-exp',
  'data-position',
  'data-accessible',
  'data-salary',
  'data-date',
];

const browser = await chromium.launch();

async function readPair(page, selector) {
  return page.evaluate(
    ({ selector, props }) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const computed = getComputedStyle(el);
      const out = { tag: el.tagName.toLowerCase() };
      for (const prop of props) out[prop] = computed.getPropertyValue(prop);
      out.height = Math.round(el.getBoundingClientRect().height);
      return out;
    },
    { selector, props: PROPS },
  );
}

const result = {
  generatedAt: new Date().toISOString(),
  viewport: VIEWPORT,
  page: 'vacancies.html',
};
const problems = [];

for (const side of ['original', 'pilot']) {
  const base = side === 'original' ? ORIGINAL : PILOT;
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  await page.goto(`${base}/vacancies.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(400);

  result[side] = {};
  for (const [name, origSel, pilotSel] of PAIRS) {
    result[side][name] = await readPair(page, side === 'original' ? origSel : pilotSel);
    if (!result[side][name]) problems.push(`${side}: ${name} — элемент не найден`);
  }

  // data-* первой строки — паритет; нет строки — ошибка пробы (ревью T16.5:
  // null-списки не проходят за MATCH)
  result[side].rowData = await page.evaluate(
    ({ selector, attrs }) => {
      const row = document.querySelector(selector);
      if (!row) return null;
      return attrs.map((attr) => [attr, row.getAttribute(attr)]);
    },
    { selector: ROW_SELECTOR[side], attrs: DATA_ATTRS },
  );
  if (!result[side].rowData) problems.push(`${side}: row is missing (${ROW_SELECTOR[side]})`);

  // hover строки → цвет ссылки заголовка (pages.css:178): до и под hover
  result[side].hoverRow = {};
  const anchorSel = TITLE_ANCHOR[side];
  result[side].hoverRow.colorBefore = await page.evaluate((selector) => {
    const anchor = document.querySelector(selector);
    return anchor ? getComputedStyle(anchor).color : null;
  }, anchorSel);
  await page.hover(ROW_SELECTOR[side]);
  await page.waitForTimeout(150);
  result[side].hoverRow.colorHover = await page.evaluate((selector) => {
    const anchor = document.querySelector(selector);
    return anchor ? getComputedStyle(anchor).color : null;
  }, anchorSel);
  if (!result[side].hoverRow.colorHover) problems.push(`${side}: row is missing (${anchorSel})`);

  await context.close();
}
await browser.close();

if (problems.length > 0) {
  writeFileSync(OUT, JSON.stringify({ ...result, problems }, null, 2));
  console.error(
    `Проба НЕ clean — ${problems.length} проблем:\n` + problems.map((p) => `  ${p}`).join('\n'),
  );
  process.exit(1);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log(`Проба записана: ${OUT}`);
for (const [name, origSel, pilotSel] of PAIRS) {
  const o = result.original[name];
  const p = result.pilot[name];
  const diffs = Object.keys(o).filter((k) => o[k] !== p[k] && k !== 'height');
  console.log(
    `${name}: ${diffs.length ? `DIFF ${diffs.join(',')}` : 'MATCH'} (${origSel} vs ${pilotSel})`,
  );
}
const dataParity = JSON.stringify(result.original.rowData) === JSON.stringify(result.pilot.rowData);
const nonNull = result.original.rowData.every(([, value]) => value !== null);
console.log(
  `rowData data-* паритет: ${dataParity && nonNull ? 'MATCH (значения непустые)' : 'DIFF или пустые значения'}`,
);
console.log(`rowData: ${JSON.stringify(result.original.rowData)}`);
const h = result.original.hoverRow;
const hp = result.pilot.hoverRow;
console.log(
  `hover: orig ${h.colorBefore} -> ${h.colorHover}; clone ${hp.colorBefore} -> ${hp.colorHover}`,
);

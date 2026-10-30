#!/usr/bin/env node
/**
 * pilot/career-portal/probe-filter-pill.mjs — приёмочная проба T17.12
 * (пилюля select-фильтра и find-bar) — инструментарий пилота (прецедент
 * probe-vac-rows.mjs, ревью T16.5: скрипт пробы обязан быть закоммичен).
 *
 * Методика — compare.mjs (оригинал — GitHub Pages, клон — локальный serve
 * 8080, viewport 1440×900). Пары пилюль по четырём контекстам:
 *  - catalog-pill (education-catalog.html): .vac-filters
 *    .vacancy-search__select-wrap (vacancy-search.css:41, flex 0 0 260px)
 *    vs .lpp-filters .ui-select--pill (канон слоя, 260px) — AC «260px —
 *    канон list-page, pin probe»;
 *  - hero-pill (index.html): .vacancy-search__panel
 *    .vacancy-search__select-wrap (база 260px оригинала) vs
 *    .cp-vacancy-search__fields .ui-select--pill (лента фильтров панели —
 *    принятое ДС 12rem; расхождение ширины с оригиналом — осознанное,
 *    «принято ДС» T15.x) — AC «12rem — канон list-page, pin probe»;
 *  - side-pill (vacancies.html): .vac-side__dd vs .lpp-side__group
 *    .ui-select--pill — вертикальная пилюля сайдбара, ширина колонки;
 *  - find-bar (vacancies.html): .vac-find vs .lpp-find (gap/ритм — метрики
 *    принятого findBar T15.5) + find-input (высота/радиус поля).
 * Геометрия listbox открытым списком — tests/e2e/ui-select.spec.js (стенд).
 *
 * Запуск: node pilot/career-portal/probe-filter-pill.mjs [out.json]
 * (по умолчанию compare-output/probe-filter-pill.json — артефакты вне git).
 * Отсутствие элемента на любой стороне — ошибка пробы (exit 1): нулевые
 * значения не проходят за MATCH.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PILOT_DIR = dirname(fileURLToPath(import.meta.url));
const ORIGINAL = 'https://monspavel.github.io/career-portal';
/** Клон может подниматься на другом порту/из worktree-бейзлайна (A/B против
 *  main) — переопределяется окружением. */
const PILOT = process.env.PILOT_BASE || 'http://127.0.0.1:8080/pilot/career-portal/dist';
const VIEWPORT = { width: 1440, height: 900 };
const OUT = process.argv[2] || join(PILOT_DIR, 'compare-output', 'probe-filter-pill.json');

const PROPS = [
  'background-color',
  'border-radius',
  'border-color',
  'flex-basis',
  'padding',
  'font-size',
  'color',
];

/** [имя, страница, селектор оригинала, селектор пилота] — первое вхождение. */
const PAIRS = [
  [
    'catalog-pill',
    'education-catalog.html',
    '.vac-filters .vacancy-search__select-wrap',
    '.lpp-filters .ui-select--pill',
  ],
  [
    'hero-pill',
    'index.html',
    '.vacancy-search__panel .vacancy-search__select-wrap',
    '.cp-vacancy-search__fields .ui-select--pill',
  ],
  ['side-pill', 'vacancies.html', '.vac-side__dd', '.lpp-side__group .ui-select--pill'],
  ['find-bar', 'vacancies.html', '.vac-find', '.lpp-find'],
  ['find-input', 'vacancies.html', '.vac-find__input', '.lpp-find .ui-field__input'],
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
      const rect = el.getBoundingClientRect();
      out.width = Math.round(rect.width);
      out.height = Math.round(rect.height);
      return out;
    },
    { selector, props: PROPS },
  );
}

/** gap/margin flex-строки find-bar — computed gap читается с контейнера. */
async function readFlexGap(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? getComputedStyle(el).gap : null;
  }, selector);
}

const result = {
  generatedAt: new Date().toISOString(),
  viewport: VIEWPORT,
  pages: [...new Set(PAIRS.map(([, page]) => page))],
};
const problems = [];

for (const side of ['original', 'pilot']) {
  const base = side === 'original' ? ORIGINAL : PILOT;
  result[side] = {};
  for (const [name, pageName, origSel, pilotSel] of PAIRS) {
    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();
    await page.goto(`${base}/${pageName}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(400);
    const selector = side === 'original' ? origSel : pilotSel;
    result[side][name] = await readPair(page, selector);
    if (name === 'find-bar' && result[side][name]) {
      result[side][name].gap = await readFlexGap(page, selector);
    }
    if (!result[side][name]) problems.push(`${side}: ${name} — элемент не найден (${selector})`);
    else if (result[side][name].height <= 1 || result[side][name].width <= 1) {
      problems.push(`${side}: ${name} — вырожденный бокс (${selector})`);
    }
    await context.close();
  }
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
for (const [name, pageName, origSel, pilotSel] of PAIRS) {
  const o = result.original[name];
  const p = result.pilot[name];
  const diffs = Object.keys(o).filter((k) => o[k] !== p[k] && k !== 'tag');
  console.log(
    `${name} (${pageName}): ${diffs.length ? `DIFF ${diffs.join(',')}` : 'MATCH'} (${origSel} vs ${pilotSel})`,
  );
  console.log(
    `  width: orig ${o.width}px / pilot ${p.width}px; height: orig ${o.height}px / pilot ${p.height}px`,
  );
}

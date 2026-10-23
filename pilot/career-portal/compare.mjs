#!/usr/bin/env node
/**
 * pilot/career-portal/compare.mjs — сравнение оригинала career-portal
 * (GitHub Pages) и пилотного клона на irao-ui (локальный serve).
 *
 * Продукт прогона (pilot/career-portal/compare-output/):
 *  - original/<страница>.png и pilot/<страница>.png — полностраничные
 *    скриншоты 1440px для просмотра владельцем;
 *  - compare.json — машинные метрики:
 *      docHeight — высота документа (грубая мера вертикального ритма);
 *      blocks    — высота/ширина одноимённых блоков (hero, production, …);
 *      probes    — computed-стили пар «класс оригинала → ui-компонент»
 *                  (кнопка, тег, поле, карточка, крошки, FAQ, …) и
 *                  shell-проб EPIC-16 (фон страницы, шапка, dropdown,
 *                  футер, строки, сайдбар) — короткие поля, не весь
 *                  computed-стиль; нет сущности на странице — null.
 *  - viewer.html — пары скриншотов + таблица всех проб (новые и прежние).
 *
 * Запуск: node showcase/serve.mjs & node pilot/career-portal/compare.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PILOT_DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(PILOT_DIR, 'compare-output');
const ORIGINAL_BASE = 'https://monspavel.github.io/career-portal';
const PILOT_BASE = 'http://127.0.0.1:8080/pilot/career-portal/dist';
const VIEWPORT = { width: 1440, height: 900 };

const PAGES = [
  'index.html',
  'vacancies.html',
  'vacancy.html',
  'vacancy-apply.html',
  'internships.html',
  'practices.html',
  'education.html',
  'education-catalog.html',
  'events.html',
  'event.html',
  'media.html',
  'article.html',
  'career-track.html',
  'company.html',
  'companies.html',
  '404.html',
];

/** Пары «селектор оригинала → селектор пилота» для проб компонентов.
 *  Берём ПЕРВОЕ вхождение на каждой из пары страниц с одинаковым именем. */
const COMPONENT_PROBES = [
  ['button-primary', '.btn--primary', '.ui-button--primary'],
  ['button-accent', '.btn--accent', '.ui-button--accent'],
  ['button-outline', '.btn--outline', '.ui-button--outline'],
  ['pill-btn', '.pill-btn', '.cp-vac-row .ui-button'],
  ['tag-blue', '.tag--blue', '.ui-tag--blue'],
  ['tag-orange', '.tag--orange', '.ui-tag--orange'],
  ['card', '.card', '.ui-card'],
  ['field-input', '.field__input', '.ui-field__input'],
  ['field-label', '.field__label', '.ui-field__label'],
  ['checkbox', '.checkbox', '.ui-checkbox'],
  ['radio', '.radio', '.ui-radio'],
  ['breadcrumbs', '.breadcrumbs', '.ui-breadcrumbs'],
  ['faq-q', '.faq__q', '.ui-accordion__q'],
  ['faq-item', '.faq__item', '.ui-accordion__item'],
  ['pagination-page', '.pagination__page', '.ui-pagination__page'],
  ['tabs-pill', '.tabs-pill__tab', '.ui-tabs__tab'],
  ['chip', '.chip', '.ui-chip__pill'],
  ['modal-dialog', '.modal__dialog', '.ui-modal'],
  ['section-title', '.section__title', '.ui-h2'],
  ['page-title', '.page-title', '.ui-page-title'],
];

/** Shell-пробы (T16.8, EPIC-16): зоны, не покрытые раундами 1–2 — фон
 *  страницы, шапка, dropdown, футер, строки, сайдбар. Та же конвенция
 *  пар «селектор оригинала → селектор пилота», первое вхождение; поля —
 *  короткая карта «алиас → css-свойство» (не весь computed-стиль).
 *  Нет сущности на странице — null на соответствующей стороне (проба
 *  не падает). footer-link дополнительно снимает bg/высоту футера —
 *  сущность `footer` из спеки живёт в этой же пробе (8 новых проб).
 *  Спека называла пункт dropdown «Рабочие направления» — такого пункта
 *  нет ни в оригинале, ни в пилоте; берём первый пункт dropdown
 *  («Стажировки и практики», одинаковый текст на обеих сторонах). */
const SHELL_PROBES = [
  // фон <body> — ловит возврат blue-50 (REPORT §8.2 №1); без текстового
  // среза (text у body — весь текст страницы, шум)
  {
    name: 'body-bg',
    original: 'body',
    pilot: 'body',
    fields: { bg: 'background-color' },
    text: false,
  },
  // первый пункт меню шапки (REPORT §8.2 №4): высота строки — rect
  {
    name: 'header-link',
    original: '.header__menu--left .header__link',
    pilot: '.cp-header__menu--left .ui-link--nav',
    fields: { fs: 'font-size', fw: 'font-weight', tdl: 'text-decoration-line', color: 'color' },
    rect: true,
  },
  // пункт dropdown шапки (REPORT §8.2 №4): скрыт (display:none) —
  // computed-стили читаются, rect не берём
  {
    name: 'dropdown-item',
    original: '.header__dropdown-link',
    pilot: '.ui-dropdown__item',
    fields: { fs: 'font-size', lh: 'line-height', padding: 'padding', tdl: 'text-decoration-line' },
  },
  // первая ссылка футера (REPORT §8.2 №5) + bg/высота самого футера
  {
    name: 'footer-link',
    original: '.footer__link',
    pilot: '.cp-footer__link',
    fields: { fs: 'font-size', fw: 'font-weight', tdl: 'text-decoration-line', color: 'color' },
    extra: {
      original: '.footer',
      pilot: '.cp-footer',
      fields: { footerBg: 'background-color' },
      rectName: 'footerHeight',
    },
  },
  // заголовок первой строки списка (REPORT §8.2 №6): тег + типографика
  {
    name: 'row-title',
    original: '.vac-row__title',
    pilot: '.cp-vac-row .ui-h4',
    fields: { fs: 'font-size', fw: 'font-weight', tdl: 'text-decoration-line', color: 'color' },
    tag: true,
  },
  // сам ряд: паддинг, фон, радиус (страницы со строками — null-сима)
  {
    name: 'row-item',
    original: '.vac-row',
    pilot: '.cp-vac-row',
    fields: { padding: 'padding', bg: 'background-color', radius: 'border-radius' },
  },
  // кружок стрелки CTA строки — ловит accent vs primary (REPORT §8.2 №6)
  {
    name: 'pill-icon',
    original: '.pill-btn__icon',
    pilot: '.cp-vac-row .ui-button__icon',
    fields: { bg: 'background-color' },
  },
  // «Сбросить» сайдбара (REPORT §8.2 №6/№8)
  {
    name: 'reset-control',
    original: '.vac-side__reset',
    pilot: '.cp-vac-side .ui-button',
    fields: { fs: 'font-size', fw: 'font-weight', tdl: 'text-decoration-line', color: 'color' },
    tag: true,
    rect: true,
  },
];

/** Пары блоков главной (высота секций). */
const BLOCK_PROBES = {
  'index.html': [
    ['hero', '.hero', '.cp-hero'],
    ['production', '.production', '.cp-production'],
    ['directions', '.directions', '#directions'],
    ['holding', '.holding', '.cp-holding'],
    ['employers', '.employers', '.cp-employers__grid'],
    ['why-us', '.why-us', '.cp-why-us'],
    ['vacancy-search', '.vacancy-search', '#vacancies'],
    ['students', '.students--illustrated', '#students'],
    ['video-block', '.video-block', '.cp-video__player'],
    ['media', '.media', '#media'],
    ['team', '.team', '.cp-team__photo'],
    ['cta-mail', '.cta-mail', '.cp-cta-mail__card'],
    ['footer', '.footer', '.cp-footer'],
  ],
};

const STYLES = [
  'font-size',
  'font-weight',
  'line-height',
  'color',
  'background-color',
  'border-radius',
  'border-width',
  'border-color',
  'padding',
  'height',
];

async function lazyWarmup(page) {
  // loading="lazy" ниже фолда не грузится при fullPage-скриншоте Playwright:
  // прокручиваем страницу до низа шагами, ждём догрузки, возвращаемся наверх.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    window.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 250));
  });
  await page.evaluate(() =>
    Promise.all(
      Array.from(document.images)
        .filter((img) => img.loading === 'lazy' && !img.complete)
        // картинки в закрытых <dialog> не грузятся никогда — ждём с таймаутом
        .map(
          (img) =>
            new Promise((resolve) => {
              const done = () => resolve();
              img.addEventListener('load', done, { once: true });
              img.addEventListener('error', done, { once: true });
              setTimeout(done, 4000);
            }),
        ),
    ),
  );
  await page.waitForTimeout(250);
}

async function metricsFor(page) {
  return page.evaluate(() => ({ docHeight: document.documentElement.scrollHeight }));
}

async function probe(page, selector) {
  return page.evaluate(
    ({ selector, styles }) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const computed = getComputedStyle(el);
      const picked = {};
      for (const style of styles) picked[style] = computed.getPropertyValue(style);
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        styles: picked,
        text: (el.textContent || '').trim().slice(0, 60),
      };
    },
    { selector, styles: STYLES },
  );
}

/** Shell-проба: короткие поля computed-стиля + опциональные тег/высота
 *  (и «хвост» extra — второй элемент той же сущности, напр. футер целиком:
 *  его поля footerBg/footerHeight попадают в объект рядом с полями ссылки).
 *  Нет элемента(ов) на стороне — null по отсутствующим полям; если нет
 *  ничего — проба возвращает null (сторона честно пуста, конвейер не падает). */
async function shellProbe(page, spec, side) {
  const read = (selector, fields, { tag = false, rectName = null, withText = true } = {}) =>
    page.evaluate(
      ({ selector, fields, tag, rectName, withText }) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const computed = getComputedStyle(el);
        const out = {};
        for (const [alias, prop] of Object.entries(fields)) {
          out[alias] = computed.getPropertyValue(prop);
        }
        if (tag) out.tag = el.tagName.toLowerCase();
        if (rectName) out[rectName] = Math.round(el.getBoundingClientRect().height);
        if (withText) out.text = (el.textContent || '').trim().slice(0, 60);
        return out;
      },
      { selector, fields, tag, rectName, withText },
    );

  const main = await read(spec[side], spec.fields, {
    tag: spec.tag,
    rectName: spec.rect ? 'height' : null,
    withText: spec.text !== false,
  });
  const extra = spec.extra
    ? await read(spec.extra[side], spec.extra.fields, {
        rectName: spec.extra.rectName,
        withText: false,
      })
    : null;
  if (!main && !extra) return null;
  return { ...(main || {}), ...(extra || {}) };
}

const browser = await chromium.launch();
mkdirSync(join(OUT, 'original'), { recursive: true });
mkdirSync(join(OUT, 'pilot'), { recursive: true });

const report = { generatedAt: new Date().toISOString(), viewport: VIEWPORT, pages: {} };

for (const pageName of PAGES) {
  const blocks = BLOCK_PROBES[pageName] || [];
  const originalContext = await browser.newContext({ viewport: VIEWPORT });
  const originalPage = await originalContext.newPage();
  await originalPage.goto(`${ORIGINAL_BASE}/${pageName}`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await originalPage.waitForTimeout(400);
  await lazyWarmup(originalPage);
  const originalResult = { ...(await metricsFor(originalPage)), blocks: {} };
  for (const [name, selector] of blocks) {
    originalResult.blocks[name] = await originalPage.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { width: Math.round(rect.width), height: Math.round(rect.height) };
    }, selector);
  }
  const originalProbes = {};
  for (const [name, selector] of COMPONENT_PROBES) {
    originalProbes[name] = await probe(originalPage, selector);
  }
  const originalShellProbes = {};
  for (const spec of SHELL_PROBES) {
    originalShellProbes[spec.name] = await shellProbe(originalPage, spec, 'original');
  }
  await originalPage.screenshot({
    path: join(OUT, 'original', pageName.replace('.html', '.png')),
    fullPage: true,
  });
  await originalContext.close();

  const pilotContext = await browser.newContext({ viewport: VIEWPORT });
  const pilotPage = await pilotContext.newPage();
  const pilotErrors = [];
  pilotPage.on('console', (message) => {
    if (message.type() === 'error') pilotErrors.push(message.text());
  });
  pilotPage.on('pageerror', (error) => pilotErrors.push(String(error)));
  await pilotPage.goto(`${PILOT_BASE}/${pageName}`, { waitUntil: 'networkidle', timeout: 60000 });
  await pilotPage.waitForTimeout(400);
  await lazyWarmup(pilotPage);
  const pilotResult = { ...(await metricsFor(pilotPage)), blocks: {} };
  for (const [name, , pilotSelector] of blocks) {
    pilotResult.blocks[name] = await pilotPage.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { width: Math.round(rect.width), height: Math.round(rect.height) };
    }, pilotSelector);
  }
  const pilotProbes = {};
  for (const [name, , pilotSelector] of COMPONENT_PROBES) {
    pilotProbes[name] = await probe(pilotPage, pilotSelector);
  }
  const pilotShellProbes = {};
  for (const spec of SHELL_PROBES) {
    pilotShellProbes[spec.name] = await shellProbe(pilotPage, spec, 'pilot');
  }
  await pilotPage.screenshot({
    path: join(OUT, 'pilot', pageName.replace('.html', '.png')),
    fullPage: true,
  });
  await pilotContext.close();

  report.pages[pageName] = {
    docHeight: { original: originalResult.docHeight, pilot: pilotResult.docHeight },
    blocks: Object.fromEntries(
      Object.entries(originalResult.blocks).map(([name, box]) => [
        name,
        { original: box, pilot: pilotResult.blocks[name] ?? null },
      ]),
    ),
    probes: Object.fromEntries(
      COMPONENT_PROBES.map(([name]) => [
        name,
        { original: originalProbes[name], pilot: pilotProbes[name] },
      ]).concat(
        SHELL_PROBES.map(({ name }) => [
          name,
          { original: originalShellProbes[name], pilot: pilotShellProbes[name] },
        ]),
      ),
    ),
    pilotConsoleErrors: pilotErrors,
  };
  console.log(
    `${pageName}: doc ${originalResult.docHeight} → ${pilotResult.docHeight}` +
      (pilotErrors.length ? `; ERRORS: ${pilotErrors.join(' | ')}` : ''),
  );
}

await browser.close();
writeFileSync(join(OUT, 'compare.json'), JSON.stringify(report, null, 2));
console.log(`\nМетрики: ${join(OUT, 'compare.json')}`);

/** viewer.html — пары скриншотов + таблица ВСЕХ проб страницы (прежние
 *  компонентные и новые shell): у расходящихся значений красная метка. */
const esc = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Токены пробы для показа: «алиас=значение» (текст в json, не в таблице). */
function probeTokens(value) {
  if (!value) return null;
  const tokens = {};
  if (typeof value.width === 'number') tokens['wh'] = `${value.width}×${value.height}`;
  if (value.styles) for (const [key, val] of Object.entries(value.styles)) tokens[key] = val;
  for (const [key, val] of Object.entries(value)) {
    if (key === 'text' || key === 'styles' || key === 'width') continue;
    // у компонентных проб высота уже показана в 'wh'; у rect-проб shell
    // (width не снимается, height пишется самим shellProbe) — показываем
    if (key === 'height' && typeof value.width === 'number') continue;
    tokens[key] = val;
  }
  return tokens;
}

function probeRow(name, pair) {
  const original = probeTokens(pair.original);
  const pilot = probeTokens(pair.pilot);
  const keys = [...new Set([...Object.keys(original || {}), ...Object.keys(pilot || {})])];
  const cell = (tokens) => {
    if (!tokens) return '<i style="color:#888">null (нет на странице)</i>';
    return keys
      .map((key) => {
        const mismatch = original && pilot && original[key] !== pilot[key];
        const val = tokens[key] ?? '—';
        return `${key}=<${mismatch ? 'b style="color:#b33"' : 'span'}>${esc(val)}</${mismatch ? 'b' : 'span'}>`;
      })
      .join(', ');
  };
  const text = pair.original?.text || pair.pilot?.text || '';
  return (
    `<tr><td style="padding:4px 10px;white-space:nowrap">${esc(name)}` +
    (text ? `<br><small style="color:#888">«${esc(text.slice(0, 30))}»</small>` : '') +
    `</td><td style="padding:4px 10px">${cell(original)}</td><td style="padding:4px 10px">${cell(pilot)}</td></tr>`
  );
}

const viewerSections = PAGES.map((pageName) => {
  const data = report.pages[pageName];
  const png = pageName.replace('.html', '.png');
  const rows = Object.entries(data.probes)
    .map(([name, pair]) => probeRow(name, pair))
    .join('');
  return (
    `<section style="margin:24px 0"><h2 style="font:600 20px/1.3 system-ui">${esc(pageName)} ` +
    `<small style="color:#666;font-weight:400">— высота документа: оригинал ${data.docHeight.original}px / пилот ${data.docHeight.pilot}px</small></h2>` +
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">` +
    `<figure style="margin:0"><figcaption style="font:12px system-ui;color:#666">оригинал (GitHub Pages)</figcaption>` +
    `<img style="width:100%;display:block;border:1px solid #ccc" src="original/${esc(png)}"></figure>` +
    `<figure style="margin:0"><figcaption style="font:12px system-ui;color:#666">пилот на irao-ui</figcaption>` +
    `<img style="width:100%;display:block;border:1px solid #ccc" src="pilot/${esc(png)}"></figure></div>` +
    `<details style="margin-top:8px"><summary style="cursor:pointer;font:13px system-ui;color:#444">пробы (${Object.keys(data.probes).length})</summary>` +
    `<table style="border-collapse:collapse;font:12px/1.5 ui-monospace,monospace;min-width:900px">` +
    `<thead><tr><th style="text-align:left;padding:4px 10px">probe</th><th style="text-align:left;padding:4px 10px">оригинал</th><th style="text-align:left;padding:4px 10px">пилот</th></tr></thead>` +
    `<tbody>${rows}</tbody></table></details></section>`
  );
}).join('\n');

const viewer =
  `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>career-portal: оригинал vs пилот irao-ui</title></head>` +
  `<body style="max-width:1720px;margin:0 auto;padding:24px;font-family:system-ui">` +
  `<h1 style="font:600 28px/1.3 system-ui">career-portal: оригинал vs пилот на irao-ui</h1>` +
  `<p style="color:#555">Скриншоты 1440px, полная страница; пробы — computed-значения из compare.json ` +
  `(сгенерировано ${esc(report.generatedAt)}, воспроизведение — README пилота). Расхождения значений — красным.</p>` +
  viewerSections +
  `</body></html>`;
writeFileSync(join(OUT, 'viewer.html'), viewer);
console.log(`Просмотр: ${join(OUT, 'viewer.html')}`);

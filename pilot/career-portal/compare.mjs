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
 *                  (кнопка, тег, поле, карточка, крошки, FAQ, …).
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
  'events.html',
  'media.html',
  'career-track.html',
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
      ]),
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

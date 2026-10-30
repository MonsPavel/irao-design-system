#!/usr/bin/env node
/**
 * pilot/career-portal/probe-header-footer.mjs — приёмочная проба T17.13
 * (каркасы шапки/подвала в паттерн-слое) — инструментарий пилота
 * (прецедент probe-filter-pill.mjs: скрипт пробы обязан быть закоммичен).
 *
 * Методика — compare.mjs (оригинал — GitHub Pages, клон — локальный serve
 * 8080, PILOT_BASE переопределяется для A/B). Проверки (Testing requirements
 * T17.13: visual + axe):
 *  1. Банды шапки/подвала: скрин-пары и геометрия (.header/.footer vs
 *     .hsp/.ftp) на index/vacancies/404 × 1440/768/375. Высота футера —
 *     строгое равенство (AC «футер h 227»); высота шапки — записывается
 *     (паддинги 16/8 каркаса = калибровка T16.3, спека T17.13 «паддинги
 *     16/8»; расхождение с десктопными 24/12 оригинала — прежнее состояние
 *     пилота, в допуске приёмки T16.3).
 *  2. Соц-кнопки подвала — «по оригиналу» (остаток §8.3): пара computed
 *     покоя (36px, r12, blue-50/текст) и hover (primary/on-dark).
 *  3. Слот VI и адрес: font-family кнопки VI и font-style address —
 *     нормализация слоем (пара с оригиналом).
 *  4. axe (Testing requirements): лендмарки banner/contentinfo — по одному,
 *     имена меню — непустые и уникальные; на трёх страницах пилота и на
 *     мини-стенде каркасов.
 *  5. Мини-стенд hsp/ftp (разметка канона + слой из dist/ds) — снимки
 *     1440/768/375 (артефакты для просмотра).
 *
 * Запуск: node showcase/serve.mjs & node pilot/career-portal/probe-header-footer.mjs [out.json]
 * (по умолчанию compare-output/probe-header-footer.json — артефакты вне git).
 * Отсутствие элемента/лендмарки — ошибка пробы (exit 1).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PILOT_DIR = dirname(fileURLToPath(import.meta.url));
const ORIGINAL = 'https://monspavel.github.io/career-portal';
/** Клон может подниматься на другом порту/из worktree-бейзлайна (A/B). */
const PILOT = process.env.PILOT_BASE || 'http://127.0.0.1:8080/pilot/career-portal/dist';
const SHOTS = process.env.PILOT_SHOTS || join(PILOT_DIR, 'compare-output', 'hsp-ftp');
const OUT = process.argv[2] || join(PILOT_DIR, 'compare-output', 'probe-header-footer.json');

const PAGES = ['index.html', 'vacancies.html', '404.html'];
const VIEWPORTS = {
  w1440: { width: 1440, height: 900 },
  w768: { width: 768, height: 1024 },
  w375: { width: 375, height: 812 },
};
/** Полоса шапки/подвала для скрин-пар: сам элемент + воздух вокруг. */
const BAND_PAD = 24;

/** Селекторы пары «оригинал → пилот» для банд и computed-проб. */
const PAIRS = {
  headerBand: { original: '.header', pilot: '.hsp' },
  footerBand: { original: '.footer', pilot: '.ftp' },
  social: { original: '.footer__social', pilot: '.ftp__social' },
  vi: { original: '.header__link--vi', pilot: '.hsp__action' },
  address: { original: '.footer__contact', pilot: 'address.ftp__contact' },
};

const result = {
  generatedAt: new Date().toISOString(),
  pages: PAGES,
  viewports: Object.keys(VIEWPORTS),
};
const problems = [];

const browser = await chromium.launch();

async function open(base, pageName, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(`${base}/${pageName}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(400);
  return { context, page };
}

/** Геометрия элемента (банды) в координатах страницы. */
async function rectOf(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top + window.scrollY),
      height: Math.round(r.height),
      width: Math.round(r.width),
    };
  }, selector);
}

async function computedOf(page, selector, props) {
  return page.evaluate(
    ({ sel, props }) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const out = {};
      for (const p of props) out[p] = cs.getPropertyValue(p);
      out.width = Math.round(r.width);
      out.height = Math.round(r.height);
      return out;
    },
    { sel: selector, props },
  );
}

/* ── 1–3: банды и computed-пары на трёх страницах × трёх вьюпортах ── */

result.bands = {};
result.pairs = {};

for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
  result.bands[vpName] = {};
  for (const pageName of PAGES) {
    const bands = {};
    for (const side of ['original', 'pilot']) {
      const base = side === 'original' ? ORIGINAL : PILOT;
      const { context, page } = await open(base, pageName, viewport);
      const headerRect = await rectOf(page, PAIRS.headerBand[side]);
      const footerRect = await rectOf(page, PAIRS.footerBand[side]);
      if (!headerRect || !footerRect) {
        problems.push(`${side} ${pageName}@${vpName}: банды не найдены`);
      } else {
        // Скрин-пары полос: шапка (сверху страницы) и подвал (бокс + воздух).
        // Клипы — в координатах ПОЛНОЙ страницы (fullPage: true — подвал за
        // пределами вьюпорта).
        mkdirSync(SHOTS, { recursive: true });
        const tag = `${pageName.replace('.html', '')}-${vpName}`;
        await page.screenshot({
          path: join(SHOTS, `${tag}-header-${side}.png`),
          fullPage: true,
          clip: {
            x: 0,
            y: Math.max(0, headerRect.top - BAND_PAD),
            width: viewport.width,
            height: Math.min(headerRect.height + 2 * BAND_PAD, viewport.height),
          },
        });
        const footBottom = footerRect.top + footerRect.height;
        await page.screenshot({
          path: join(SHOTS, `${tag}-footer-${side}.png`),
          fullPage: true,
          clip: {
            x: 0,
            y: Math.max(0, footerRect.top - BAND_PAD),
            width: viewport.width,
            height: Math.min(footerRect.height + 2 * BAND_PAD, footBottom + BAND_PAD),
          },
        });
      }
      bands[side] = { header: headerRect, footer: footerRect };
      await context.close();
    }
    result.bands[vpName][pageName] = bands;
    // Строгое равенство высоты футера — на десктопе (AC «футер h 227»);
    // на 768/375 высоты ЗАПИСЫВАЮТСЯ без допуска: мобильный подвал оригинала
    // несёт реструктуризацию ≤767 (1 колонка, борды, 44px соц-кнопки), которой
    // пилот не нёс и до T17.13 (канон каркаса — 2 колонки → перенос) —
    // расхождение прежнего состояния, зона отчёта, не этой задачи.
    if (vpName === 'w1440' && bands.original?.footer && bands.pilot?.footer) {
      const oh = bands.original.footer.height;
      const ph = bands.pilot.footer.height;
      if (Math.abs(oh - ph) > 2) {
        problems.push(
          `${pageName}@${vpName}: высота футера ${ph} ≠ оригинала ${oh} (AC футер h 227)`,
        );
      }
    }
    console.log(
      `${pageName}@${vpName}: header h ${bands.original?.header?.height}→${bands.pilot?.header?.height}; footer h ${bands.original?.footer?.height}→${bands.pilot?.footer?.height}`,
    );
  }
}

/* computed-пары (один вьюпорт 1440 — desktop-канон): соц-кнопки (покой +
   hover), слот VI (шрифт), address (font-style). */
{
  const viewport = VIEWPORTS.w1440;
  const read = async (side, pageName, kind, hover) => {
    const base = side === 'original' ? ORIGINAL : PILOT;
    const { context, page } = await open(base, pageName, viewport);
    let out;
    if (kind === 'social') {
      if (hover) await page.hover(PAIRS.social[side]);
      out = await computedOf(page, PAIRS.social[side], [
        'background-color',
        'color',
        'border-radius',
      ]);
    } else if (kind === 'vi') {
      out = await computedOf(page, PAIRS.vi[side], [
        'font-family',
        'font-size',
        'line-height',
        'color',
      ]);
    } else {
      // Адрес: у оригинала контейнер .footer__contact НЕ несёт размера
      // (наследует body 20px), текстовые размеры на спанах (footer.css:62-74);
      // каркас ftp__contact несёт 14/500/1.35 на контейнере — рендер текста
      // равный. Пара — по ЗНАЧЕНИЮ адреса и подписи (типографика), не по
      // контейнеру/ширине (flex оригинала vs grid каркаса) и не по color
      // подписи: muted #808080 → gray-700 — задокументированная AA-замена
      // T2.3 («принято ДС», прецедент крошек — состояние до T17.13).
      const value =
        side === 'original'
          ? await computedOf(page, '.footer__contact-value', ['font-size', 'font-weight'])
          : await computedOf(page, 'address.ftp__contact span:not([class])', [
              'font-size',
              'font-weight',
            ]);
      const label =
        side === 'original'
          ? await computedOf(page, '.footer__contact-label', ['font-size', 'color'])
          : await computedOf(page, '.ftp__contact-label', ['font-size', 'color']);
      const box = await computedOf(page, PAIRS.address[side], ['font-style']);
      // Ширины спанов — это ширина колонки (flex оригинала vs grid каркаса),
      // не текст; типографика сравнивается без геометрии.
      for (const rec of [value, label]) {
        delete rec.width;
        delete rec.height;
      }
      out = { fontStyle: box['font-style'], value, labelColor: label.color, label };
    }
    await context.close();
    return out;
  };

  for (const [key, kind, pageName, hover] of [
    ['social-rest', 'social', 'index.html', false],
    ['social-hover', 'social', 'index.html', true],
    ['vi-font', 'vi', 'index.html', false],
    ['address-style', 'address', 'vacancies.html', false],
  ]) {
    const original = await read('original', pageName, kind, hover);
    const pilot = await read('pilot', pageName, kind, hover);
    result.pairs[key] = { original, pilot };
    if (!original || !pilot) {
      problems.push(`${key}: элемент не найден (${PAIRS[kind][side]})`);
      continue;
    }
    const diffs = Object.keys(original).filter((k) => original[k] !== pilot[k]);
    console.log(`${key}: ${diffs.length ? `DIFF ${diffs.join(',')}` : 'MATCH'}`);
    for (const k of diffs) {
      console.log(`  ${k}: orig «${original[k]}» / pilot «${pilot[k]}»`);
    }
    // width — зависит от контента/шрифта страницы; для VI-слота смотрим
    // семейство (нормализация слоем), для address — только font-style.
    if (key === 'social-rest' || key === 'social-hover') {
      if (diffs.length > 0)
        problems.push(`${key}: расхождение ${diffs.join(',')} (пара с оригиналом)`);
    }
    if (key === 'vi-font' && !pilot['font-family'].includes('Golos')) {
      problems.push(`vi-font: шрифт слота без Golos (${pilot['font-family']})`);
    }
    // address: курсив UA-дефолта гасится слоем — у пилота normal; типографика
    // значения — пара с оригиналом; color подписи записывается (AA-замена
    // T2.3 — не регрессия).
    if (key === 'address-style') {
      if (pilot.fontStyle !== 'normal') {
        problems.push(`address-style: курсив address не погашен (${pilot.fontStyle})`);
      }
      const diffs = Object.keys(original.value).filter((k) => original.value[k] !== pilot.value[k]);
      console.log(
        `  label color: orig «${original.labelColor}» / pilot «${pilot.labelColor}» (AA-замена T2.3 — записано)`,
      );
      if (diffs.length > 0) {
        problems.push(
          `address-style.value: расхождение ${diffs.join(',')} (orig «${diffs.map((k) => original.value[k]).join('/')}» / pilot «${diffs.map((k) => pilot.value[k]).join('/')}»)`,
        );
      }
    }
  }
}

/* ── 4: axe — лендмарки и имена меню (пилот + мини-стенд каркасов) ── */

result.axe = {};
const axeRules = [
  'landmark-no-duplicate-banner',
  'landmark-no-duplicate-contentinfo',
  'landmark-one-banner',
  'landmark-roles',
];

async function axeCheck(page, label) {
  // Полный скан с фильтром по id: набор имён landmark-правил меняется между
  // версиями axe-core (landmark-one-banner/-unique-name есть не везде) —
  // фильтр по префиксу устойчив; имена меню дополнительно пинит DOM-проверка.
  const scan = await new AxeBuilder({ page }).analyze();
  const violations = scan.violations
    .filter((v) => v.id.startsWith('landmark'))
    .map((v) => `${v.id}×${v.nodes.length}`);
  result.axe[label] = violations;
  if (violations.length > 0) problems.push(`axe ${label}: ${violations.join('; ')}`);
  // Имена меню: каждая навигация с непустым aria-label, имена уникальны.
  const names = await page.evaluate(() =>
    [...document.querySelectorAll('nav[aria-label]')].map((n) => n.getAttribute('aria-label')),
  );
  const unnamed = names.filter((n) => !n || n.trim().length === 0);
  if (unnamed.length > 0) problems.push(`axe ${label}: навигации без имени — ${unnamed.length}`);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length > 0)
    problems.push(`axe ${label}: дубли имён навигаций — ${[...new Set(dupes)].join(', ')}`);
  result.axe[`${label}-nav-names`] = names;
}

for (const pageName of PAGES) {
  const { context, page } = await open(PILOT, pageName, VIEWPORTS.w1440);
  await axeCheck(page, pageName);
  const banner = await page.locator('body > header').count();
  const contentinfo = await page.getByRole('contentinfo').count();
  if (banner !== 1) problems.push(`${pageName}: banner-лендмарк уровня body — ${banner}`);
  if (contentinfo !== 1) problems.push(`${pageName}: contentinfo-лендмарк — ${contentinfo}`);
  await context.close();
}

/* ── 5: мини-стенд hsp/ftp (разметка канона + слой) — снимки 3 вьюпортах ── */

const standHtml = (base) => `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>мини-стенд hsp/ftp (T17.13)</title>
<link rel="stylesheet" href="${base}/ds/ui-core.min.css">
<link rel="stylesheet" href="${base}/ds/ui-patterns.css">
</head><body id="top">
<header class="hsp">
  <div class="ui-container hsp__inner">
    <nav class="hsp__menu hsp__menu--left" aria-label="Основное меню">
      <a class="ui-link ui-link--nav" href="#">Вакансии</a>
      <div class="ui-dropdown" data-ui-dropdown>
        <button class="ui-dropdown__trigger" type="button">Школьникам и студентам
          <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </button>
        <nav class="ui-dropdown__menu" aria-label="Школьникам и студентам"><ul class="ui-dropdown__list">
          <li><a class="ui-dropdown__item" href="#">Стажировки и практики</a></li>
        </ul></nav>
      </div>
      <a class="ui-link ui-link--nav" href="#">Медиа</a>
    </nav>
    <a class="hsp__logo" href="#" aria-label="Интер РАО — на главную"><span>Интер РАО</span></a>
    <nav class="hsp__menu hsp__menu--right" aria-label="Дополнительное меню">
      <button class="hsp__action" type="button" data-ui-vi-toggle aria-pressed="false">
        <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" stroke="currentColor" stroke-width="2"></path><circle cx="12" cy="12" r="3.4" stroke="currentColor" stroke-width="2"></circle></svg>
        <span>Версия для слабовидящих</span>
      </button>
      <a class="ui-link ui-link--nav" href="#">Контакты</a>
    </nav>
  </div>
</header>
<main style="min-height:60vh;padding:48px 0"><div class="ui-container"><h1 class="ui-page-title">Мини-стенд каркасов</h1><p class="ui-body">Канон hsp (static) и ftp: светлая база + приглушённый тон. Overlay-режим — на главной пилота.</p></div></main>
<footer class="ftp">
  <div class="ui-container ftp__inner">
    <a class="ftp__logo" href="#" aria-label="Интер РАО — на главную"><span>Интер РАО</span></a>
    <nav aria-label="Меню подвала">
      <ul class="ftp__links">
        <li><a class="ui-link ui-link--nav" href="#">Вакансии</a></li>
        <li><a class="ui-link ui-link--nav" href="#">Школьникам и студентам</a></li>
        <li><a class="ui-link ui-link--nav" href="#">Правила обработки персональных данных</a></li>
      </ul>
    </nav>
    <div class="ftp__contacts">
      <address class="ftp__contact">
        <span class="ftp__contact-label ui-text--muted">Адрес</span>
        <span>ул. Большая Пироговская, д. 27, г. Москва</span>
      </address>
      <div class="ftp__contact-group">
        <div class="ftp__contact">
          <span class="ftp__contact-label ui-text--muted">Телефон</span>
          <a class="ui-link ui-link--nav" href="tel:+74956648840">+7 495 664-88-40</a>
        </div>
        <div class="ftp__contact">
          <span class="ftp__contact-label ui-text--muted">E-mail</span>
          <a class="ui-link ui-link--nav" href="mailto:career@interrao.ru">career@interrao.ru</a>
        </div>
      </div>
    </div>
    <div class="ftp__right">
      <ul class="ftp__socials">
        <li><a class="ui-button ui-button--round ftp__social" href="#" aria-label="ВКонтакте"><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12.7 17.4c-4.9 0-7.7-3.4-7.8-9h2.5c.1 4.2 1.9 5.9 3.4 6.3V8.4h2.3v3.6c1.4-.2 2.9-1.8 3.4-3.6h2.3c-.4 2.2-2 3.9-3.1 4.5 1.1.6 2.9 2 3.6 4.5h-2.6c-.5-1.7-1.9-3-3.7-3.2v3.2h-.3z"></path></svg></a></li>
        <li><a class="ui-button ui-button--round ftp__social" href="#" aria-label="Одноклассники"><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.8a3.4 3.4 0 100 6.8 3.4 3.4 0 000-6.8zM6.4 7.2a5.6 5.6 0 1111.2 0 5.6 5.6 0 01-11.2 0zm1.2 7.3c1.3.5 2.8.8 4.4.8 1.6 0 3-.3 4.4-.8l.8 1.8c-1 .4-2 .7-3.2.8l2.9 4.2-1.8 1.2-3.1-4.5-3.1 4.5-1.8-1.2 2.9-4.2c-1.2-.1-2.2-.4-3.2-.8l.8-1.8z"></path></svg></a></li>
      </ul>
      <p class="ui-small ui-text--muted">© 1998–2026, ПАО «Интер РАО»</p>
      <a class="ui-link ftp__top" href="#top">Наверх</a>
    </div>
  </div>
</footer>
<div class="ftp ftp--muted">
  <div class="ui-container ftp__inner">
    <a class="ftp__logo" href="#" aria-label="Интер РАО — на главную"><span>Интер РАО</span></a>
    <nav aria-label="Меню подвала — приглушённый тон">
      <ul class="ftp__links">
        <li><a class="ui-link ui-link--nav" href="#">Вакансии</a></li>
        <li><a class="ui-link ui-link--nav" href="#">Медиа</a></li>
      </ul>
    </nav>
    <div class="ftp__contacts">
      <address class="ftp__contact">
        <span class="ftp__contact-label ui-text--muted">Адрес</span>
        <span>ул. Большая Пироговская, д. 27, г. Москва</span>
      </address>
    </div>
    <div class="ftp__right">
      <ul class="ftp__socials">
        <li><a class="ui-button ui-button--round ftp__social" href="#" aria-label="ВКонтакте"><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12.7 17.4c-4.9 0-7.7-3.4-7.8-9h2.5c.1 4.2 1.9 5.9 3.4 6.3V8.4h2.3v3.6c1.4-.2 2.9-1.8 3.4-3.6h2.3c-.4 2.2-2 3.9-3.1 4.5 1.1.6 2.9 2 3.6 4.5h-2.6c-.5-1.7-1.9-3-3.7-3.2v3.2h-.3z"></path></svg></a></li>
      </ul>
      <p class="ui-small ui-text--muted">© 1998–2026, ПАО «Интер РАО»</p>
      <a class="ui-link ftp__top" href="#top">Наверх</a>
    </div>
  </div>
</div>
</body></html>`;

{
  mkdirSync(SHOTS, { recursive: true });
  const context = await browser.newContext({ viewport: VIEWPORTS.w1440 });
  const page = await context.newPage();
  // Мини-стенд живёт по http (data: URL не несёт относительный путь к css
  // надёжно на Windows-файлах) — Serve уже поднимает dist на 8080.
  const standPath = join(PILOT_DIR, 'compare-output', 'hsp-ftp-stand.html');
  mkdirSync(dirname(standPath), { recursive: true });
  writeFileSync(standPath, standHtml('http://127.0.0.1:8080/pilot/career-portal/dist'));
  await page.goto(`http://127.0.0.1:8080/pilot/career-portal/compare-output/hsp-ftp-stand.html`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  await page.waitForTimeout(400);
  await axeCheck(page, 'hsp-ftp-stand');
  const banner = await page.locator('body > header').count();
  const contentinfo = await page.locator('body > footer').count();
  if (banner !== 1) problems.push('мини-стенд: banner — ' + banner);
  if (contentinfo !== 1) problems.push('мини-стенд: contentinfo — ' + contentinfo);
  for (const [vpName, viewport] of Object.entries(VIEWPORTS)) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(SHOTS, `stand-${vpName}.png`), fullPage: true });
  }
  await context.close();
  console.log('мини-стенд hsp/ftp: снимки записаны');
}

await browser.close();

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ ...result, problems }, null, 2));

if (problems.length > 0) {
  console.error(
    `Проба НЕ clean — ${problems.length} проблем:\n` + problems.map((p) => `  ${p}`).join('\n'),
  );
  process.exit(1);
}
console.log(`Проба clean, записана: ${OUT}; скрин-пары: ${SHOTS}`);

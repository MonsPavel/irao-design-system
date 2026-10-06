/**
 * e2e шрифтов и фолбэка (T3.1 — AC + Testing requirements).
 *
 *  1. Сетевой прогон: все 6 woff2 Golos отдаются со статусом 200 из
 *     dist/fonts/ (шрифты рядом с css — относительные url() @font-face);
 *     document.fonts.check — true (сэмпл по умолчанию — latin, плюс cyr/lat
 *     по каждому весу 400/500/600). Страница сама запрашивает только нужные
 *     грани, поэтому все 6 довыгружаются document.fonts.load();
 *  2. каркас showcase: preload обоих приоритетных шрифтов (golos-400-cyr,
 *     golos-500-cyr — 90% русской страницы, паттерн career-portal) стоит
 *     в <head> ДО CSS-каскада; атрибуты as/type/crossorigin — как требует
 *     спецификация preload (шрифты грузятся в CORS-режиме);
 *  3. фолбэк: запросы woff2 заблокированы (route.abort) — текст рендерится
 *     Arial (метрики стека «Golos Text, Arial» = метрикам чистого Arial),
 *     страница читаема, без горизонтального скролла — «нет невидимого
 *     текста». В сетевом прогоне та же методика измерения доказывает, что
 *     она различает Golos и Arial (иначе фолбэк-тест ничего бы не доказал).
 *
 * Лицензия: OFL-LICENSE.txt — 200 в dist/fonts/ (AC T3.1).
 */
import { expect } from '@playwright/test';

import { openStand, test as standTest } from '../helpers/harness.js';

const FONTS = [
  'golos-400-cyr.woff2',
  'golos-400-lat.woff2',
  'golos-500-cyr.woff2',
  'golos-500-lat.woff2',
  'golos-600-cyr.woff2',
  'golos-600-lat.woff2',
];

const FONT_URL = /\/dist\/fonts\/golos-\d{3}-(cyr|lat)\.woff2$/;

/**
 * Метрики одной и той же строки в «Golos Text, Arial» и в чистом Arial:
 * совпадают — рендер идёт фолбэком (Golos недоступен), различаются — Golos
 * применился. Canvas-замер не зависит от DOM страницы.
 */
const measureFallback = async (page) =>
  page.evaluate(() => {
    const ctx = document.createElement('canvas').getContext('2d');
    const width = (font) => {
      ctx.font = font;
      return ctx.measureText('Текст Test 123').width;
    };
    const stack = width('16px "Golos Text", Arial');
    const arial = width('16px Arial');
    return { stack, arial, differs: Math.abs(stack - arial) > 0.01 };
  });

standTest.describe('шрифты Golos и reset (T3.1)', () => {
  standTest(
    'все 6 woff2 → 200; document.fonts.check — true для cyr/lat и 400/500/600',
    async ({ page }) => {
      const statuses = new Map();
      page.on('response', (response) => {
        const url = new URL(response.url());
        if (FONT_URL.test(url.pathname)) {
          statuses.set(url.pathname.split('/').pop(), response.status());
        }
      });

      await openStand(page, 'tokens');

      const checks = await page.evaluate(async () => {
        const sample = 'АБВ Golos Text';
        await Promise.all([
          document.fonts.load('400 16px "Golos Text"', sample),
          document.fonts.load('500 16px "Golos Text"', sample),
          document.fonts.load('600 16px "Golos Text"', sample),
        ]);
        await document.fonts.ready;
        const check = (weight, text = '') => document.fonts.check(`${weight} 16px "Golos Text"`, text);
        return {
          // AC: document.fonts.check('16px "Golos Text"') — сэмпл по умолчанию (latin)
          defaultLatin: document.fonts.check('16px "Golos Text"'),
          cyr: { w400: check('400', 'АБВ'), w500: check('500', 'АБВ'), w600: check('600', 'АБВ') },
          lat: { w400: check('400', 'Golos'), w500: check('500', 'Golos'), w600: check('600', 'Golos') },
        };
      });

      for (const name of FONTS) {
        expect(statuses.get(name), `${name} — запрошен и отдан`).toBe(200);
      }
      expect(checks.defaultLatin, 'AC: document.fonts.check(16px "Golos Text")').toBe(true);
      for (const group of [checks.cyr, checks.lat]) {
        expect(group.w400).toBe(true);
        expect(group.w500).toBe(true);
        expect(group.w600).toBe(true);
      }

      // Методика фолбэк-теста осмысленна: Golos реально отличим от Arial.
      const metrics = await measureFallback(page);
      expect(metrics.differs, 'замер различает Golos и Arial').toBe(true);

      // AC: лицензия OFL едет в dist/fonts/ рядом с css.
      const license = await page.request.get('/dist/fonts/OFL-LICENSE.txt');
      expect(license.status()).toBe(200);
      expect(await license.text()).toContain('SIL OPEN FONT LICENSE Version 1.1');
    },
  );

  standTest('каркас showcase: preload golos-400-cyr и golos-500-cyr — до CSS-каскада', async ({
    stand,
  }) => {
    const page = await stand('tokens');

    const headLinks = await page.evaluate(() =>
      [...document.head.children].map((el) => ({
        rel: el.getAttribute('rel'),
        href: el.getAttribute('href'),
        as: el.getAttribute('as'),
        type: el.getAttribute('type'),
        crossorigin: el.hasAttribute('crossorigin'),
      })),
    );

    const fontPreloads = headLinks.filter((l) => l.rel === 'preload' && l.as === 'font');
    expect(fontPreloads.map((l) => l.href.split('/').pop()).sort()).toEqual([
      'golos-400-cyr.woff2',
      'golos-500-cyr.woff2',
    ]);
    for (const preload of fontPreloads) {
      expect(preload.type).toBe('font/woff2');
      expect(
        preload.crossorigin,
        'шрифты грузятся в CORS-режиме — без crossorigin preload не матчится с загрузкой',
      ).toBe(true);
    }

    const firstStylesheet = headLinks.findIndex((l) => l.rel === 'stylesheet');
    const lastFontPreload = headLinks.findIndex((l) => l.rel === 'preload' && l.as === 'font');
    expect(
      lastFontPreload,
      'preload стоит раньше подключения CSS (до каскада, паттерн career-portal)',
    ).toBeLessThan(firstStylesheet);
  });

  standTest('фолбэк: woff2 заблокированы — текст рендерится Arial, страница читаема', async ({
    page,
  }) => {
    let fontRequestsFailed = 0;
    page.on('requestfailed', (request) => {
      if (FONT_URL.test(new URL(request.url()).pathname)) fontRequestsFailed += 1;
    });
    await page.route(FONT_URL, (route) => route.abort());

    await openStand(page, 'tokens');

    const state = await page.evaluate(async () => {
      await document.fonts.ready;
      return {
        golosLoaded: document.fonts.check('16px "Golos Text"'),
        hScroll:
          document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    const metrics = await measureFallback(page);

    expect(
      fontRequestsFailed,
      'блокировка активна: запросы woff2 были и все провалились',
    ).toBeGreaterThanOrEqual(2);
    expect(state.golosLoaded, 'Golos не загрузился').toBe(false);
    expect(metrics.stack, 'текст измерим — не «невидимый»').toBeGreaterThan(0);
    expect(
      metrics.differs,
      'метрики стека = метрикам Arial — рендер идёт фолбэком',
    ).toBe(false);
    expect(state.hScroll, 'макет не сломан: нет горизонтального скролла').toBe(false);
    await expect(page.locator('main h1').first()).toBeVisible();
  });
});

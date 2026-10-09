/**
 * e2e типографики (T3.3 — AC + Testing requirements).
 *
 * Поверхность — стенд typography (/showcase/dist/stands/typography.html,
 * генерируется showcase/build.mjs из showcase/pages/typography/index.html).
 *
 * Проверяется:
 *  1. AC: каждый класс роли имеет computed font-size из соответствующего
 *     токена — на всех вьюпортах шкалы (375/768/1280/1440; xl — T3.4), то есть через
 *     всю mobile-first media-лестницу слоя 2 (T2.2);
 *  2. класс роли задаёт fs/lh/fw/letter-spacing целиком (Implementation
 *     requirements T3.3 п.1): computed тройки равны токенам, letter-spacing
 *     заголовков −0.02em (перенос макета career-portal), текстовых ролей —
 *     normal;
 *  3. body-дефолты страницы (font/color/bg) и ui-text--muted — из токенов;
 *  4. ui-list: маркеры disc/decimal, отступы из шкалы spacing; ui-address
 *     без браузерного курсива;
 *  5. иерархия заголовков зелёная на ВСЕХ страницах showcase
 *     (Implementation requirements T3.3 п.2): один h1 на странице, уровни
 *     без пропусков (перенос идеи test_internship_headings.py career-portal);
 *  6. 32px-сценарий (совместно с T3.6): типографика масштабируется
 *     пропорционально rem-токенам, длинные RU-слова не рвут макет —
 *     горизонтального скролла нет;
 *  7. axe чист на стенде; эталоны 375/768/1280/1440 — только из контейнера
 *     (ADR-0004).
 */
import { expect } from '@playwright/test';

import { a11y, openIndex, shot, test, VIEWPORTS } from '../helpers/harness.js';

/**
 * Роль → суффикс тройки токенов (tokens/semantic.css, T2.2) и letter-spacing
 * в em (0 — normal). Источник истины — base/typography.css; здесь проверяется
 * ФАКТ в браузере, пины формы решения — tests/unit/typography.test.js.
 */
const ROLES = [
  ['ui-h1', 'h1', -0.02],
  ['ui-h2', 'h2', -0.02],
  ['ui-h3', 'h3', -0.02],
  ['ui-h4', 'h4', -0.02],
  ['ui-h5', 'h5', -0.02],
  ['ui-h6', 'h6', -0.02],
  ['ui-lead', 'lead', 0],
  ['ui-body', 'body', 0],
  ['ui-small', 'small', 0],
  ['ui-caption', 'caption', 0],
  ['ui-micro', 'micro', 0],
];

/** computed состояния роли: размер/тройка/letter-spacing (px-числа). */
const roleState = (page, cls) =>
  page.evaluate((selector) => {
    const el = document.querySelector(`.${selector}`);
    if (!el) return null;
    const s = getComputedStyle(el);
    const lineHeight = s.lineHeight;
    return {
      fontSize: parseFloat(s.fontSize),
      fontWeight: parseFloat(s.fontWeight),
      lineHeightPx: lineHeight.endsWith('px') ? parseFloat(lineHeight) : null,
      lineHeightUnitless: lineHeight.endsWith('px') ? null : parseFloat(lineHeight),
      letterSpacing: s.letterSpacing === 'normal' ? 0 : parseFloat(s.letterSpacing),
    };
  }, cls);

/** Значение rem-токена слоя 2 (как записано в :root, например 2.125). */
const tokenRem = (page, name) =>
  page.evaluate(
    (token) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(token)),
    name,
  );

/** База rem на html (16 по умолчанию, 32 — в сценарии масштабирования). */
const rootFontSize = (page) =>
  page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));

test.describe('типографика (T3.3)', () => {
  test('AC: каждый класс роли — computed font-size из токена на 375/768/1280/1440', async ({
    stand,
  }) => {
    const page = await stand('typography');

    for (const [name, size] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(size);
      const root = await rootFontSize(page);

      for (const [cls, role] of ROLES) {
        const state = await roleState(page, cls);
        expect(state, `${name}: образец роли ${cls} есть на стенде`).not.toBeNull();

        const expected = (await tokenRem(page, `--ui-fs-${role}`)) * root;
        expect(state.fontSize, `${name} ${cls}: font-size = --ui-fs-${role}`).toBeCloseTo(
          expected,
          6,
        );
      }
    }
  });

  test('класс роли задаёт fs/lh/fw/letter-spacing целиком (Implementation requirements п.1)', async ({
    stand,
  }) => {
    const page = await stand('typography');
    const root = await rootFontSize(page);

    for (const [cls, role, ls] of ROLES) {
      const state = await roleState(page, cls);

      const fw = await tokenRem(page, `--ui-fw-${role}`);
      expect(state.fontWeight, `${cls}: font-weight = --ui-fw-${role}`).toBeCloseTo(fw, 6);

      const lh = await tokenRem(page, `--ui-lh-${role}`);
      if (state.lineHeightPx !== null) {
        expect(state.lineHeightPx, `${cls}: line-height = --ui-lh-${role} × font-size`).toBeCloseTo(
          lh * state.fontSize,
          6,
        );
      } else {
        expect(state.lineHeightUnitless, `${cls}: line-height = --ui-lh-${role}`).toBeCloseTo(
          lh,
          6,
        );
      }

      expect(state.letterSpacing, `${cls}: letter-spacing ${ls}em`).toBeCloseTo(
        ls * state.fontSize,
        1,
      );
    }

    // Базовый размер ролей — rem (масштабируется с базой, тр. №19 ТЗ): ни одна
    // роль не должна быть в px-значении токена. Косвенный пин: при 16px базе
    // дробные rem-значения дают нецелые px (13/0.8125rem и т.п.) — проверка
    // пропорциональности делается явно в 32px-сценарии ниже.
    expect(root, 'база html — 16px (дефолт полигона)').toBe(16);
  });

  test('body-дефолты и ui-text--muted — из токенов слоя 2', async ({ stand }) => {
    const page = await stand('typography');
    const root = await rootFontSize(page);

    const body = await page.evaluate(() => {
      const s = getComputedStyle(document.body);
      return {
        fontFamily: s.fontFamily,
        fontSize: parseFloat(s.fontSize),
        fontWeight: parseFloat(s.fontWeight),
        color: s.color,
        backgroundColor: s.backgroundColor,
      };
    });
    expect(body.fontFamily, 'шрифт — стек --ui-font-family (Golos Text + фолбэк)').toContain(
      'Golos Text',
    );
    expect(body.fontSize, 'body = --ui-fs-body').toBeCloseTo(
      (await tokenRem(page, '--ui-fs-body')) * root,
      6,
    );
    expect(body.fontWeight, 'body = --ui-fw-body').toBeCloseTo(
      await tokenRem(page, '--ui-fw-body'),
      6,
    );
    expect(body.color, 'цвет текста — --ui-color-text (black #1f1f1f)').toBe('rgb(31, 31, 31)');
    expect(body.backgroundColor, 'фон страницы — --ui-color-surface (white)').toBe(
      'rgb(255, 255, 255)',
    );

    const muted = await page.evaluate(
      () => getComputedStyle(document.querySelector('.ui-text--muted')).color,
    );
    expect(muted, 'muted — --ui-color-text-muted (gray-700 #616161, AA-замена T2.3)').toBe(
      'rgb(97, 97, 97)',
    );
  });

  test('ui-list — маркеры disc/decimal и отступы из шкалы spacing; ui-address без курсива', async ({
    stand,
  }) => {
    const page = await stand('typography');

    const list = await page.evaluate(() => {
      const ul = document.querySelector('ul.ui-list');
      const ol = document.querySelector('ol.ui-list');
      return {
        ulType: getComputedStyle(ul).listStyleType,
        olType: getComputedStyle(ol).listStyleType,
        paddingLeft: parseFloat(getComputedStyle(ul).paddingLeft),
        itemGap: ul.querySelector('li + li')
          ? parseFloat(getComputedStyle(ul.querySelector('li + li')).marginTop)
          : null,
        addressStyle: getComputedStyle(document.querySelector('address.ui-address')).fontStyle,
      };
    });

    expect(list.ulType, 'маркер ul — disc').toBe('disc');
    expect(list.olType, 'маркер ol — decimal').toBe('decimal');
    expect(list.paddingLeft, 'отступ списка = --ui-space-5').toBeCloseTo(
      (await tokenRem(page, '--ui-space-5')) * (await rootFontSize(page)),
      6,
    );
    expect(list.itemGap, 'ритм пунктов = --ui-space-2').toBeCloseTo(
      (await tokenRem(page, '--ui-space-2')) * (await rootFontSize(page)),
      6,
    );
    expect(list.addressStyle, 'address без браузерного курсива').toBe('normal');
  });

  test('иерархия заголовков зелёная на всех страницах showcase', async ({ page }) => {
    await openIndex(page);

    const links = await page.evaluate(() =>
      [...new Set(Array.from(document.querySelectorAll('a[href]'), (a) => a.getAttribute('href')))]
        // href-атрибуты индекса относительные («stands/x.html»), а сервер
        // отдаёт индекс на «/» rewrite'ом — резолвим против канонического
        // адреса документа полигона; /showcase/dist/ — и есть полигон
        // (ссылка-«домой» каркаса на индексе уходит выше корня и отфильтрована).
        .filter((href) => href && !href.startsWith('#'))
        .map((href) => new URL(href, `${window.location.origin}/showcase/dist/index.html`).href)
        .filter((href) => href.startsWith(`${window.location.origin}/showcase/dist/`)),
    );
    expect(
      links.length,
      'полигон не пуст: стенды + standalone собираются в индекс',
    ).toBeGreaterThanOrEqual(4);

    for (const url of ['/', ...links]) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      // Иерархия — правило об ОТРЕНДЕРЕННОМ документе (его же проверяет axe
      // heading-order): скрытые заголовки не входят в outline страницы.
      // С T7.6 это не теория: на стенде patterns/header заголовок диалога
      // поиска (h2 в preMain) при загрузке скрыт — модуль ui-modal (T7.2)
      // снял open, UA-правило dialog:not([open]) даёт display:none.
      const levels = await page.evaluate(() =>
        Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'), (h) =>
          h.getClientRects().length > 0 ? Number(h.tagName[1]) : 0,
        ).filter((level) => level > 0),
      );
      const label = `${url} [${levels.join(', ')}]`;

      expect(
        levels.filter((level) => level === 1),
        `${label} — ровно один h1 на странице`,
      ).toHaveLength(1);
      expect(levels[0], `${label} — страница начинается с h1`).toBe(1);
      for (let i = 1; i < levels.length; i += 1) {
        expect(levels[i], `${label} — без пропусков уровней (шаг ${i})`).toBeLessThanOrEqual(
          levels[i - 1] + 1,
        );
      }
    }
  });

  test('32px-сценарий: типографика масштабируется, длинные слова не рвут макет', async ({
    stand,
  }) => {
    const page = await stand('typography');

    // Требование №19 ТЗ: увеличение шрифта не ломает вёрстку. 32px-база —
    // стресс-режим T3.6; здесь — типографическая половина: rem-роли растут
    // пропорционально, переносы держат макет.
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '32px';
    });

    for (const [cls, role] of ROLES) {
      const state = await roleState(page, cls);
      const expected = (await tokenRem(page, `--ui-fs-${role}`)) * 32;
      expect(state.fontSize, `${cls}: rem-токен × 32px (факт ${state.fontSize})`).toBeCloseTo(
        expected,
        6,
      );
    }

    const overflow = await page.evaluate(() => ({
      html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
    }));
    expect(overflow.html, 'нет горизонтального скролла на html').toBeLessThanOrEqual(0);
    expect(overflow.body, 'нет горизонтального скролла на body').toBeLessThanOrEqual(0);
  });

  test('axe чист на стенде typography', async ({ stand }) => {
    const page = await stand('typography');
    const results = await a11y(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test('эталоны стенда 375/768/1280/1440 (только из контейнера, ADR-0004)', async ({ stand }) => {
    const page = await stand('typography');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'typography', viewport });
    }
  });
});

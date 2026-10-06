/**
 * e2e layout-примитивов (T3.4 — AC + Testing requirements).
 *
 * Поверхность — стенд layout (/showcase/dist/stands/layout.html,
 * генерируется showcase/build.mjs из showcase/pages/layout/index.html).
 *
 * Проверяется:
 *  1. AC: нет горизонтального скролла на 320/375/768/1024/1440
 *     (scrollWidth === clientWidth; перенос проверки из design-qa
 *     career-portal в автотест — Technical considerations T3.4);
 *  2. AC: computed grid-template-columns соответствуют модификаторам
 *     по вьюпортам (Implementation requirements T3.4 п.2, лестница спеки):
 *     все сетки 1 колонка на mobile → 2 на md; --3 → 3 на lg;
 *     --4 → 3 на xl → 4 на 2xl (поведение career-portal: 4→3 на xl);
 *  3. контейнер: max-width и паддинги — из токенов
 *     (--ui-container-max, --ui-container-pad{,-md,-lg}: 16 → 24 → 32),
 *     центрирование, вертикальный паддинг нулевой;
 *  4. секция: вертикальный ритм из spacing-токенов (32 → 48 на lg);
 *     --muted — фон surface-muted + радиус big (--ui-radius-lg);
 *  5. сетки: gap из шкалы spacing (24; рост 32 на lg; --4 плотнее — 24,
 *     перенос career-portal .cards-grid--4);
 *  6. axe чист на стенде; эталоны на 4 вьюпортах шкалы харнесса
 *     (375/768/1280/1440 — xl различает ступени 3/4 сетки --4; ADR-0004).
 */
import { expect } from '@playwright/test';

import { a11y, shot, test, VIEWPORTS } from '../helpers/harness.js';

/**
 * Лестница колонок (Implementation requirements T3.4 п.2): вьюпорт →
 * колонки модификаторов --2/--3/--4. База (без media) — 1 колонка
 * (mobile-first, одноколоночный мобильный = порядок DOM).
 */
const GRID_COLUMNS = Object.freeze({
  320: Object.freeze({ 2: 1, 3: 1, 4: 1 }),
  375: Object.freeze({ 2: 1, 3: 1, 4: 1 }),
  768: Object.freeze({ 2: 2, 3: 2, 4: 2 }),
  1024: Object.freeze({ 2: 2, 3: 3, 4: 2 }),
  1280: Object.freeze({ 2: 2, 3: 3, 4: 3 }),
  1440: Object.freeze({ 2: 2, 3: 3, 4: 4 }),
});

/** Ширины overflow-проверки (AC: 320/375/768/1024/1440). */
const OVERFLOW_WIDTHS = Object.freeze([320, 375, 768, 1024, 1440]);

/** px-значение rem-токена слоя 2 при текущей базе html. */
const tokenPx = (page, name) =>
  page.evaluate(
    (token) =>
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue(token)) *
      parseFloat(getComputedStyle(document.documentElement).fontSize),
    name,
  );

/** Число колонок сетки по computed grid-template-columns (resolve в px). */
const columnCount = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    return getComputedStyle(el).gridTemplateColumns.split(' ').length;
  }, selector);

/** gap сетки (px-числа). */
const gridGaps = (page, selector) =>
  page.evaluate((sel) => {
    const s = getComputedStyle(document.querySelector(sel));
    return { row: parseFloat(s.rowGap), column: parseFloat(s.columnGap) };
  }, selector);

/** Состояние первого контейнера на стенде. База ширины — body.clientWidth:
 * вертикальный скроллбар (15px в chromium) входит в clientWidth html
 * (scrollbar-gutter: stable, T3.1), а контейнер растягивается по body. */
const containerState = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('.ui-container');
    const s = getComputedStyle(el);
    return {
      maxWidth: parseFloat(s.maxWidth),
      paddingLeft: parseFloat(s.paddingLeft),
      paddingRight: parseFloat(s.paddingRight),
      paddingTop: parseFloat(s.paddingTop),
      paddingBottom: parseFloat(s.paddingBottom),
      offsetWidth: el.offsetWidth,
      offsetLeft: el.offsetLeft,
      bodyClientWidth: document.body.clientWidth,
    };
  });

test.describe('layout-примитивы (T3.4)', () => {
  test('AC: нет горизонтального скролла на 320/375/768/1024/1440', async ({ stand }) => {
    const page = await stand('layout');

    for (const width of OVERFLOW_WIDTHS) {
      await page.setViewportSize({ width, height: 900 });

      const overflow = await page.evaluate(() => ({
        html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        body: document.body.scrollWidth - document.body.clientWidth,
      }));
      expect(
        overflow.html,
        `${width}: html без горизонтального скролла (scrollWidth === clientWidth)`,
      ).toBeLessThanOrEqual(0);
      expect(
        overflow.body,
        `${width}: body без горизонтального скролла (scrollWidth === clientWidth)`,
      ).toBeLessThanOrEqual(0);
    }
  });

  test('AC: computed grid-template-columns соответствуют модификаторам по вьюпортам', async ({
    stand,
  }) => {
    const page = await stand('layout');

    for (const [width, expected] of Object.entries(GRID_COLUMNS)) {
      await page.setViewportSize({ width: Number(width), height: 900 });

      for (const [modifier, columns] of Object.entries(expected)) {
        const count = await columnCount(page, `.ui-grid--${modifier}`);
        expect(
          count,
          `${width}: ui-grid--${modifier} — ${columns} колонк(и/а) (лестница T3.4 п.2)`,
        ).toBe(columns);
      }
    }
  });

  test('контейнер: max-width/паддинги из токенов, рост 16 → 24 (md) → 32 (lg), центрирование', async ({
    stand,
  }) => {
    const page = await stand('layout');

    const padTokenByWidth = (width) => {
      if (width < 768) return '--ui-container-pad';
      if (width < 1024) return '--ui-container-pad-md';
      return '--ui-container-pad-lg';
    };

    for (const width of OVERFLOW_WIDTHS) {
      await page.setViewportSize({ width, height: 900 });

      const state = await containerState(page);
      const pad = await tokenPx(page, padTokenByWidth(width));
      const max = await tokenPx(page, '--ui-container-max');

      expect(state.maxWidth, `${width}: max-width = --ui-container-max (${max}px)`).toBeCloseTo(
        max,
        6,
      );
      expect(state.paddingLeft, `${width}: padding-left = ${padTokenByWidth(width)}`).toBeCloseTo(
        pad,
        6,
      );
      expect(state.paddingRight, `${width}: padding-right = pad`).toBeCloseTo(pad, 6);
      expect(state.paddingTop, `${width}: вертикальный паддинг контейнера нулевой`).toBe(0);
      expect(state.paddingBottom, `${width}: вертикальный паддинг контейнера нулевой`).toBe(0);
      expect(
        state.offsetWidth,
        `${width}: ширина контейнера = min(max-width, ширина body)`,
      ).toBeCloseTo(Math.min(max, state.bodyClientWidth), 6);
      expect(state.offsetLeft, `${width}: контейнер центрирован (margin: 0 auto)`).toBeCloseTo(
        (state.bodyClientWidth - state.offsetWidth) / 2,
        0,
      );
    }
  });

  test('секция: вертикальный ритм из spacing-токенов; --muted — фон surface-muted + радиус big', async ({
    stand,
  }) => {
    const page = await stand('layout');

    await page.setViewportSize({ width: 375, height: 667 });
    let state = await page.evaluate(() => {
      const s = getComputedStyle(document.querySelector('section.ui-section'));
      const muted = getComputedStyle(document.querySelector('.ui-section--muted'));
      return {
        paddingTop: parseFloat(s.paddingTop),
        paddingBottom: parseFloat(s.paddingBottom),
        mutedBg: muted.backgroundColor,
        mutedRadius: parseFloat(muted.borderRadius),
      };
    });

    expect(
      state.paddingTop,
      '375: ритм секции = --ui-space-6 (mobile-first база; career-portal 40px не на шкале §3.2)',
    ).toBeCloseTo(await tokenPx(page, '--ui-space-6'), 6);
    expect(state.paddingBottom, '375: ритм секции = --ui-space-6').toBeCloseTo(
      await tokenPx(page, '--ui-space-6'),
      6,
    );
    expect(
      state.mutedBg,
      '--muted: фон = --ui-color-surface-muted (blue-50 #f1f5fe, примитив T2.1)',
    ).toBe('rgb(241, 245, 254)');
    expect(state.mutedRadius, '--muted: радиус = --ui-radius-lg (big, 24px)').toBeCloseTo(
      await tokenPx(page, '--ui-radius-lg'),
      6,
    );

    await page.setViewportSize({ width: 1440, height: 900 });
    state = await page.evaluate(() => {
      const s = getComputedStyle(document.querySelector('section.ui-section'));
      return {
        paddingTop: parseFloat(s.paddingTop),
        paddingBottom: parseFloat(s.paddingBottom),
      };
    });
    expect(state.paddingTop, '1440: ритм секции вырос до --ui-space-7 (lg)').toBeCloseTo(
      await tokenPx(page, '--ui-space-7'),
      6,
    );
    expect(state.paddingBottom, '1440: ритм секции вырос до --ui-space-7 (lg)').toBeCloseTo(
      await tokenPx(page, '--ui-space-7'),
      6,
    );
  });

  test('сетки: gap из шкалы spacing (24 → 32 на lg); --4 плотнее — 24 на всех ширинах', async ({
    stand,
  }) => {
    const page = await stand('layout');

    await page.setViewportSize({ width: 375, height: 667 });
    for (const modifier of [2, 3, 4]) {
      const gap = await gridGaps(page, `.ui-grid--${modifier}`);
      const space5 = await tokenPx(page, '--ui-space-5');
      expect(gap.column, `${modifier}: gap на mobile = --ui-space-5 (24)`).toBeCloseTo(space5, 6);
      expect(gap.row, `${modifier}: row-gap на mobile = --ui-space-5 (24)`).toBeCloseTo(space5, 6);
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    const space6 = await tokenPx(page, '--ui-space-6');
    const space5 = await tokenPx(page, '--ui-space-5');
    for (const modifier of [2, 3]) {
      const gap = await gridGaps(page, `.ui-grid--${modifier}`);
      expect(
        gap.column,
        `${modifier}: gap на lg+ = --ui-space-6 (ближайшая ступень шкалы к 36 career-portal)`,
      ).toBeCloseTo(space6, 6);
    }
    const gap4 = await gridGaps(page, '.ui-grid--4');
    expect(
      gap4.column,
      '--4: gap остаётся --ui-space-5 (24) на lg+ (перенос .cards-grid--4)',
    ).toBeCloseTo(space5, 6);
  });

  test('axe чист на стенде layout', async ({ stand }) => {
    const page = await stand('layout');
    const results = await a11y(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test('эталоны на 4 вьюпортах шкалы (только из контейнера, ADR-0004)', async ({ stand }) => {
    const page = await stand('layout');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'layout', viewport });
    }
  });
});

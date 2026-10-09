/**
 * e2e VI-модуля (ГОСТ Р 52872, задача T9.1; Testing requirements — tests first).
 *
 * Поверхность — стенд `ui-vi` (панель + все режимы × все темы) и стенды
 * компонентов EPIC-4/5 (матрица «тема × стенд»: перекраска `!important`
 * накрывает реальную вёрстку системы, AC T9.1).
 *
 * Сценарии AC:
 *  - включение → классы на body + панель + aria-pressed; padding-top по
 *    фактической высоте панели;
 *  - переключение темы/размера меняет computed (пары тем — гарантированные
 *    ГОСТ-значения; размер — zoom через фиксированную 100px-пробу стенда);
 *  - localStorage ПЕРЕЖИВАЕТ reload — под ключом `irao-ui-vi` (breaking
 *    T9.1), старого ключа career-portal нет;
 *  - выключение полностью снимает классы режимов (AC), отступ и панель;
 *  - escape-путь — кнопка «Обычная версия сайта» с клавиатуры;
 *  - каждая тема на всех стендах EPIC-4/5 — ключевая пара цветов совпадает
 *    с ожиданием темы. Матрица водит состояние через window.IraoUI.vi (API
 *    сайтов): интерактивный путь панели покрыт на стенде ui-vi, здесь
 *    проверяется именно покрытие перекраской каждой страницы полигона —
 *    одна загрузка стенда, пять тем без перезагрузок.
 *
 * axe — в обоих состояниях стенда ui-vi (обычный и VI-режим): сам модуль
 * доступен (сегментные кнопки aria-pressed, панель fixed, escape-путь).
 */
import { expect } from '@playwright/test';

import { a11y, test } from '../helpers/harness.js';

/** Темы ГОСТ Р 52872 (career-portal vi.css, «как есть»). */
const THEMES = ['baw', 'wb', 'bb', 'beige', 'green'];

/**
 * Ключевая пара цветов каждой темы — ожидаемые computed-значения.
 * baw — базовая: перекраски нет (дизайн уже «тёмное на светлом»), пара —
 * дефолтные токены системы (surface/text = #FFFFFF/#1F1F1F); h1 остаётся
 * прозрачным (пин отсутствия repaint). wb — инверсия корня (фильтр на html),
 * фон body — чёрный. bb/beige/green — явная перекраска всех элементов.
 */
const THEME_EXPECTATIONS = {
  baw: { bodyBg: 'rgb(255, 255, 255)', h1Bg: 'rgba(0, 0, 0, 0)', h1Color: 'rgb(31, 31, 31)' },
  wb: { bodyBg: 'rgb(0, 0, 0)', htmlFilter: 'invert(1) grayscale(1)' },
  bb: {
    bodyBg: 'rgb(157, 209, 255)',
    h1Bg: 'rgb(157, 209, 255)',
    h1Color: 'rgb(6, 52, 98)',
  },
  beige: {
    bodyBg: 'rgb(245, 231, 206)',
    h1Bg: 'rgb(245, 231, 206)',
    h1Color: 'rgb(74, 55, 40)',
  },
  green: {
    bodyBg: 'rgb(59, 39, 22)',
    h1Bg: 'rgb(59, 39, 22)',
    h1Color: 'rgb(77, 255, 0)',
  },
};

/** Стенды EPIC-4/5 (компоненты контента и форм) — поверхность матрицы. */
const EPIC_4_5_STANDS = [
  'ui-link',
  'ui-button',
  'ui-tag',
  'ui-badge',
  'ui-card',
  'ui-alert',
  'ui-image',
  'ui-figure',
  'ui-breadcrumbs',
  'ui-empty',
  'ui-error',
  'ui-field',
  'ui-checkbox',
  'ui-radio',
  'ui-radio-group',
  'ui-file',
  'ui-form',
];

/** Computed-значение свойства элемента. */
const computedOf = (locator, prop) =>
  locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop);

/** Войти в VI-режим через публичный API (IraoUI.vi — API сайтов). */
async function enterVi(page) {
  await page.evaluate(() => window.IraoUI.vi.set('on', true));
}

/** Классы режимов VI на body (все семейства, включая голый `vi`). */
const viClassesOf = (page) =>
  page.evaluate(() =>
    [...document.body.classList].filter((c) => c === 'vi' || c.startsWith('vi-')),
  );

test.describe('ui-vi — включение/выключение (AC T9.1)', () => {
  test('включение → классы на body + панель + aria-pressed + padding-top по высоте панели', async ({
    stand,
  }) => {
    const page = await stand('ui-vi');
    const panel = page.locator('[data-ui-vi-panel]');
    const entry = page.getByRole('button', { name: 'Версия для слабовидящих' });

    await expect(panel).toBeHidden();
    await expect(entry).toHaveAttribute('aria-pressed', 'false');

    await entry.click();

    expect(await viClassesOf(page)).toEqual(
      expect.arrayContaining(['vi', 'vi-size--md', 'vi-theme--baw']),
    );
    await expect(panel).toBeVisible();
    await expect(entry).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Средний шрифт' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: 'Чёрным по белому' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // padding-top = фактическая высота фиксированной панели (Implementation
    // requirements T9.1 п.1); панель реально отрисована (высота > 0).
    const { pad, height } = await page.evaluate(() => ({
      pad: document.body.style.paddingTop,
      height: document.querySelector('[data-ui-vi-panel]').offsetHeight,
    }));
    expect(height).toBeGreaterThan(0);
    expect(pad).toBe(`${height}px`);
  });

  test('localStorage переживает reload — ключ irao-ui-vi, старого ключа career-portal нет', async ({
    stand,
  }) => {
    const page = await stand('ui-vi');
    await page.getByRole('button', { name: 'Версия для слабовидящих' }).click();
    await page.getByRole('button', { name: 'Синим по голубому' }).click();
    await expect(page.locator('body')).toHaveClass(/vi-theme--bb/);

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Режим и тема восстановлены без кликов.
    expect(await viClassesOf(page)).toEqual(
      expect.arrayContaining(['vi', 'vi-theme--bb', 'vi-size--md']),
    );
    await expect(page.locator('[data-ui-vi-panel]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Синим по голубому' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const storage = await page.evaluate(() => ({
      vi: window.localStorage.getItem('irao-ui-vi'),
      legacy: window.localStorage.getItem('vi-settings'),
      keys: Object.keys(window.localStorage),
    }));
    expect(storage.legacy).toBeNull();
    expect(storage.keys).toContain('irao-ui-vi');
    expect(JSON.parse(storage.vi)).toMatchObject({ on: true, theme: 'bb' });
  });

  test('выключение полностью снимает классы режимов, отступ и панель', async ({ stand }) => {
    const page = await stand('ui-vi');
    await page.getByRole('button', { name: 'Версия для слабовидящих' }).click();
    await page.getByRole('button', { name: 'Бежевым по коричневому' }).click();
    await page.getByRole('button', { name: 'выкл' }).click();
    await page.getByRole('button', { name: 'широкий' }).click();
    expect((await viClassesOf(page)).length).toBeGreaterThan(3);

    await page.getByRole('button', { name: 'Обычная версия сайта' }).click();

    expect(await viClassesOf(page)).toEqual([]);
    expect(await page.evaluate(() => document.body.style.paddingTop)).toBe('');
    await expect(page.locator('[data-ui-vi-panel]')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Версия для слабовидящих' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    // Состояние «выкл» сохранено: после перезагрузки режим не возвращается.
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(await viClassesOf(page)).toEqual([]);
  });

  test('escape-путь: выход с клавиатуры (Shift+Tab до «Обычная версия сайта», Enter)', async ({
    stand,
  }) => {
    const page = await stand('ui-vi');
    await page.getByRole('button', { name: 'Версия для слабовидящих' }).click();

    // Клик не уводит фокус: предыдущий фокусируемый элемент панели — её
    // последняя кнопка «Обычная версия сайта» (панель — первый блок стенда).
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Обычная версия сайта' })).toBeFocused();

    await page.keyboard.press('Enter');
    expect(await viClassesOf(page)).toEqual([]);
    await expect(page.locator('[data-ui-vi-panel]')).toBeHidden();
  });
});

test.describe('ui-vi — режимы меняют computed (AC T9.1)', () => {
  test('переключение темы меняет computed-цвета (ключевая пара ГОСТ)', async ({ stand }) => {
    const page = await stand('ui-vi');
    const h1 = page.locator('main h1');
    await enterVi(page);

    for (const theme of THEMES) {
      await page.evaluate((t) => window.IraoUI.vi.set('theme', t), theme);
      await expect(page.locator('body')).toHaveClass(new RegExp(`vi-theme--${theme}`));

      const expected = THEME_EXPECTATIONS[theme];
      expect(await computedOf(page.locator('body'), 'background-color')).toBe(expected.bodyBg);
      if (expected.h1Bg) {
        expect(await computedOf(h1, 'background-color')).toBe(expected.h1Bg);
      }
      if (expected.h1Color) {
        expect(await computedOf(h1, 'color')).toBe(expected.h1Color);
      }
      if (expected.htmlFilter) {
        expect(await computedOf(page.locator('html'), 'filter')).toBe(expected.htmlFilter);
      }
    }
  });

  test('переключение размера меняет отрисовку: 100px-проба стенда масштабируется zoom', async ({
    stand,
  }) => {
    const page = await stand('ui-vi');
    const probe = page.locator('[data-uvid-zoom]');
    await enterVi(page);

    const widthAt = () => probe.evaluate((el) => el.getBoundingClientRect().width);

    // md (по умолчанию) — zoom 1.2 → 120px; sm — 1 → 100px; lg — 1.45 → 145px.
    expect(await widthAt()).toBeCloseTo(120, 0);
    await page.getByRole('button', { name: 'Мелкий шрифт' }).click();
    expect(await widthAt()).toBeCloseTo(100, 0);
    await page.getByRole('button', { name: 'Крупный шрифт' }).click();
    expect(await widthAt()).toBeCloseTo(145, 0);
  });

  test('картинки: «выкл» прячет изображение и слой __photo, «чёрно-белые» — grayscale', async ({
    stand,
  }) => {
    const page = await stand('ui-vi');
    const img = page.locator('[data-uvid-photo] img');
    const photoLayer = page.locator('[data-uvid-photo-layer]');
    await enterVi(page);

    await page.getByRole('button', { name: 'чёрно-белые' }).click();
    await expect(img).toBeVisible();
    expect(await computedOf(img, 'filter')).toBe('grayscale(1)');

    await page.getByRole('button', { name: 'выкл' }).click();
    await expect(img).toBeHidden();
    await expect(photoLayer).toBeHidden();
  });
});

test.describe('ui-vi — axe (сам модуль доступен)', () => {
  test('axe чист в обоих состояниях: обычный и VI-режим с раскрытой панелью', async ({ stand }) => {
    const page = await stand('ui-vi');
    expect((await a11y(page).analyze()).violations).toEqual([]);

    await enterVi(page);
    expect((await a11y(page).analyze()).violations).toEqual([]);
  });
});

test.describe('ui-vi — матрица «тема × стенды EPIC-4/5» (AC T9.1)', () => {
  for (const standName of EPIC_4_5_STANDS) {
    test(`${standName}: ключевая пара цветов каждой темы совпадает с ожиданием`, async ({
      stand,
    }) => {
      const page = await stand(standName);
      const h1 = page.locator('main h1');
      await enterVi(page);

      for (const theme of THEMES) {
        await page.evaluate((t) => window.IraoUI.vi.set('theme', t), theme);
        await expect(page.locator('body')).toHaveClass(new RegExp(`vi-theme--${theme}`));

        const expected = THEME_EXPECTATIONS[theme];
        expect(await computedOf(page.locator('body'), 'background-color')).toBe(expected.bodyBg);
        if (expected.h1Bg) {
          expect(await computedOf(h1, 'background-color')).toBe(expected.h1Bg);
        }
        if (expected.h1Color) {
          expect(await computedOf(h1, 'color')).toBe(expected.h1Color);
        }
        if (expected.htmlFilter) {
          expect(await computedOf(page.locator('html'), 'filter')).toBe(expected.htmlFilter);
        }
      }
    });
  }
});

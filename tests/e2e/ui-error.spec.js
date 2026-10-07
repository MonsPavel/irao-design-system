/**
 * e2e ui-error (T4.8; Testing requirements).
 *
 * Поверхности — два стенда:
 *  - showcase/pages/ui-error — inline-вариант (ошибка загрузки в секции);
 *  - showcase/pages/error-404 — полностраничный вариант (404), где h1 несёт
 *    сам паттерн (правило спеки T4.8 п.2, html-validate-сквозная проверка
 *    irao/one-h1 по исходникам).
 *
 * Проверяется:
 *  1. структура (AC): заголовок (inline — h2, 404 — h1 ровно один), пояснение
 *     текстом (состояние объясняется текстом, не только иллюстрацией),
 *     декоративная иллюстрация (aria-hidden), действия обязательны;
 *  2. действия доступны с клавиатуры (AC): Tab до кнопки «Повторить» /
 *     «На главную», фокус-обводка — глобальная политика ADR-0001;
 *  3. nav-минимум (Technical considerations): крошек в полностраничном
 *     состоянии нет — только действия;
 *  4. axe чист на обоих стендах — известных исключений нет;
 *  5. эталоны 375/768/1280/1440 обоих стендов — только из контейнера (ADR-0004).
 */
import { expect } from '@playwright/test';

import { a11y, shot, test as standTest, VIEWPORTS } from '../helpers/harness.js';

/** Клавиатурный обход до элемента (фокус с клавиатуры — :focus-visible, ADR-0001). */
async function tabTo(page, locator) {
  for (let step = 0; step < 30; step += 1) {
    if (await locator.evaluate((el) => el.matches(':focus-visible'))) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('фокус не дошёл до элемента за 30 Tab');
}

standTest.describe('ui-error: inline-вариант (ошибка загрузки в секции)', () => {
  standTest('структура: заголовок-роль, пояснение текстом, retry-действие', async ({ stand }) => {
    const page = await stand('ui-error');

    const inline = page.locator('.ui-error:not(.ui-error--page)').first();
    await expect(inline).toBeVisible();

    // Заголовок inline-варианта — h2 (страница стенда уже имеет h1 каркаса).
    await expect(inline.locator('.ui-error__title')).toHaveJSProperty('tagName', 'H2');

    // Состояние объясняется текстом (Accessibility requirements).
    const text = inline.locator('.ui-error__text');
    expect(await text.textContent().then((value) => value.trim().length)).toBeGreaterThan(10);

    // Иллюстрация декоративна.
    await expect(inline.locator('.ui-error__media')).toHaveAttribute('aria-hidden', 'true');

    // Действия обязательны (Implementation requirements п.3): повторить.
    await expect(inline.getByRole('button', { name: 'Повторить' })).toBeVisible();
  });

  standTest(
    'CTA с клавиатуры (AC): Tab до «Повторить», фокус-обводка ADR-0001',
    async ({ stand }) => {
      const page = await stand('ui-error');

      const retry = page.getByRole('button', { name: 'Повторить' }).first();
      await tabTo(page, retry);
      await expect(retry, 'retry-кнопка — фокус с клавиатуры').toBeFocused();
    },
  );

  standTest('axe: стенд чист — известных исключений нет (AC)', async ({ stand }) => {
    const page = await stand('ui-error');
    const results = await a11y(page).analyze();
    expect(
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`),
      'axe: violations = []',
    ).toEqual([]);
  });

  standTest(
    'эталоны ui-error 375/768/1280/1440 — только из контейнера (ADR-0004)',
    async ({ stand }) => {
      const page = await stand('ui-error');
      for (const viewport of Object.keys(VIEWPORTS)) {
        await shot(page, { name: 'ui-error', viewport });
      }
    },
  );
});

standTest.describe('ui-error: полностраничный вариант (404)', () => {
  standTest(
    'структура: h1 несёт сам паттерн (ровно один), пояснение, действия',
    async ({ stand }) => {
      const page = await stand('error-404');

      // 404 — h1 (правило спеки T4.8 п.2); каркас спец-стенда служебного h1
      // не добавляет — заголовок страницы принадлежит состоянию.
      const headings = page.locator('h1');
      await expect(headings, 'на странице ровно один h1').toHaveCount(1);
      await expect(headings.first()).toHaveJSProperty('className', 'ui-error__title ui-h3');

      const fullpage = page.locator('.ui-error--page');
      await expect(fullpage).toBeVisible();
      const text = fullpage.locator('.ui-error__text');
      expect(await text.textContent().then((value) => value.trim().length)).toBeGreaterThan(10);
      await expect(
        fullpage.locator('.ui-error__actions a, .ui-error__actions button').first(),
      ).toBeVisible();
    },
  );

  standTest(
    'nav-минимум (Technical considerations): крошек нет — только действия; Tab до «На главную»',
    async ({ stand }) => {
      const page = await stand('error-404');

      expect(
        await page.locator('main nav').count(),
        'в полностраничном состоянии крошек/навигации нет (nav-минимум)',
      ).toBe(0);

      const home = page.locator('.ui-error__actions a, .ui-error__actions button').first();
      await tabTo(page, home);
      await expect(home, 'действие «На главную» — фокус с клавиатуры').toBeFocused();
    },
  );

  standTest('axe: стенд 404 чист — известных исключений нет (AC)', async ({ stand }) => {
    const page = await stand('error-404');
    const results = await a11y(page).analyze();
    expect(
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`),
      'axe: violations = []',
    ).toEqual([]);
  });

  standTest(
    'эталоны error-404 375/768/1280/1440 — только из контейнера (ADR-0004)',
    async ({ stand }) => {
      const page = await stand('error-404');
      for (const viewport of Object.keys(VIEWPORTS)) {
        await shot(page, { name: 'error-404', viewport });
      }
    },
  );
});

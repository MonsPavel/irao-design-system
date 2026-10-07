/**
 * e2e ui-empty (T4.8; Testing requirements).
 *
 * Поверхность — стенд showcase/pages/ui-empty (пустое состояние списка).
 * Проверяется:
 *  1. структура (AC): состояние объясняется текстом — заголовок-роль (h2 —
 *     правило спеки: страница уже имеет h1), пояснение, декоративная
 *     иллюстрация вне a11y-дерева (aria-hidden), CTA обязательны;
 *  2. CTA доступны с клавиатуры (AC): Tab до действия, фокус-обводка —
 *     глобальная политика ADR-0001;
 *  3. пустое состояние появляется в потоке (Technical considerations):
 *     не ловит фокус программно — без tabindex, activeElement не внутри;
 *  4. axe чист — известных исключений нет;
 *  5. эталоны 375/768/1280/1440 — только из контейнера/CI (ADR-0004).
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

standTest.describe('ui-empty: структура и доступность (T4.8)', () => {
  standTest(
    'структура (AC): заголовок-роль h2, пояснение текстом, декоративная иллюстрация вне a11y-дерева',
    async ({ stand }) => {
      const page = await stand('ui-empty');

      const empty = page.locator('.ui-empty').first();
      await expect(empty).toBeVisible();

      // Заголовок состояния — заголовок уровня h2 (правило спеки T4.8 п.2:
      // страница уже имеет h1 — каркас стенда).
      const title = empty.locator('.ui-empty__title');
      await expect(title).toHaveJSProperty('tagName', 'H2');
      await expect(empty.getByRole('heading')).toBeVisible();

      // Иллюстрация декоративна: aria-hidden, вне a11y-дерева (axe молчит —
      // отдельный тест), смысл дублирует текст.
      const media = empty.locator('.ui-empty__media');
      await expect(media).toHaveAttribute('aria-hidden', 'true');

      // Пояснение — текст (Accessibility requirements: состояние объясняется
      // текстом, не только иллюстрацией).
      const text = empty.locator('.ui-empty__text');
      expect(await text.textContent().then((value) => value.trim().length)).toBeGreaterThan(10);

      // CTA обязательны (Implementation requirements п.3).
      await expect(
        empty.locator('.ui-empty__actions a, .ui-empty__actions button').first(),
      ).toBeVisible();
    },
  );

  standTest(
    'CTA доступны с клавиатуры (AC): Tab до действия, фокус-обводка ADR-0001',
    async ({ stand }) => {
      const page = await stand('ui-empty');

      const action = page.locator('.ui-empty__actions a, .ui-empty__actions button').first();
      await tabTo(page, action);
      await expect(action, 'первое действие — фокус с клавиатуры').toBeFocused();
      expect(
        await action.evaluate((el) => el.matches(':focus-visible')),
        'фокус с клавиатуры — :focus-visible (глобальная политика)',
      ).toBe(true);
    },
  );

  standTest(
    'появляется в потоке (Technical considerations): без tabindex, фокус не ловит программно',
    async ({ stand }) => {
      const page = await stand('ui-empty');

      expect(
        await page.locator('.ui-empty [tabindex]').count(),
        'внутри пустого состояния нет tabindex',
      ).toBe(0);

      const activeTag = await page.evaluate(() => document.activeElement.tagName);
      expect(activeTag, 'на загрузке фокус не внутри состояния (появляется в потоке)').not.toBe(
        'DIV',
      );
    },
  );

  standTest('axe: стенд чист — известных исключений нет (AC)', async ({ stand }) => {
    const page = await stand('ui-empty');
    const results = await a11y(page).analyze();
    expect(
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`),
      'axe: violations = []',
    ).toEqual([]);
  });

  standTest(
    'эталоны ui-empty 375/768/1280/1440 — только из контейнера (ADR-0004)',
    async ({ stand }) => {
      const page = await stand('ui-empty');
      for (const viewport of Object.keys(VIEWPORTS)) {
        await shot(page, { name: 'ui-empty', viewport });
      }
    },
  );
});

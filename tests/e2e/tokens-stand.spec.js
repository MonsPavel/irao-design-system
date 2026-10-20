/**
 * e2e стенда «Токены» — эталонная поверхность тинтов primary (T14.7).
 *
 * До T14.7 стенд tokens (генератор showcase/tokens-stand.mjs) не имел
 * собственного скриншот-эталона: его полнота pinится юнит-тестом
 * tests/unit/tokens-stand.test.js (узлы = токены файлов), поведение —
 * derived-states/fonts-спеками. Секция тинтов (T14.7) — первое визуальное
 * изменение стенда с собственным эталоном: «эталон стенда tokens в контейнере
 * при визуальных изменениях (ADR-0004)» — спек-носитель этот эталон заводит.
 *
 * Проверяется:
 *  1. AC T14.7 «стенд рендерит секцию тинтов»: заголовок секции, узел каждого
 *     тинта, computed фон снейта — полупрозрачный производный primary
 *     (альфа = проценту суффикса);
 *  2. тинт следует за темой автоматически (зачем color-mix вместо
 *     примитива-альфы): ?theme=test перекрашивает primary blue-800 →
 *     purple-900 #511d59 — снейт a20 едет следом без правки классов;
 *  3. axe чист на стенде (конвенция спек стендов; сквозной обход —
 *     tests/a11y/stands-sweep.spec.js);
 *  4. эталоны стенда 375/768/1280/1440 — только из контейнера (ADR-0004).
 */
import { expect } from '@playwright/test';

import { a11y, shot, test, VIEWPORTS } from '../helpers/harness.js';

/** Снейт тинта на стенде: карточка data-token → цветной образец (step — «a20»). */
const tintSwatch = (page, step) =>
  page.locator(`[data-token="--ui-color-primary-${step}"] .ts-swatch`);

/**
 * Каналы и альфа вычисленного цвета. Браузер сериализует color-mix-результат
 * по-разному (chromium: color(srgb R G B / A) с плавающими 0–1; rgba() —
 * после обычных var()) — приводим обе формы к числам 0–255 + альфа 0–1.
 */
function colorOf(computed) {
  const rgba = computed.match(/^rgba?\(([^)]+)\)$/);
  if (rgba) {
    const parts = rgba[1].split(',').map(Number);
    return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
  }
  const srgb = computed.match(/^color\(\s*srgb\s+([^)]+)\)$/);
  if (srgb) {
    const parts = srgb[1]
      .trim()
      .split(/[\s/]+/)
      .map(Number);
    return { r: parts[0] * 255, g: parts[1] * 255, b: parts[2] * 255, a: parts[3] };
  }
  throw new Error(`неожиданная сериализация вычисленного цвета: ${computed}`);
}

/** Полупрозрачность снейта: альфа вычисленного фона = проценту тинта. */
const EXPECTED_ALPHA = { a10: 0.1, a20: 0.2, a26: 0.26, a55: 0.55, a94: 0.94 };

test.describe('стенд «Токены» — тинты primary (T14.7)', () => {
  test('AC: секция тинтов рендерится, снейты — полупрозрачные производные primary', async ({
    stand,
  }) => {
    const page = await stand('tokens');

    // Секция на стенде (генератор — из tokens/semantic.css, не вручную).
    await expect(page.getByRole('heading', { name: 'Цвета-смыслы: тинты primary' })).toBeVisible();
    for (const step of Object.keys(EXPECTED_ALPHA)) {
      await expect(page.locator(`[data-token="--ui-color-primary-${step}"]`)).toBeVisible();
    }

    // Computed фон снейта: цвет primary (blue-800 #002856) с альфой ступени.
    for (const [step, alpha] of Object.entries(EXPECTED_ALPHA)) {
      const color = colorOf(
        await tintSwatch(page, step).evaluate((el) => getComputedStyle(el).backgroundColor),
      );
      expect(color.r, `a${step.slice(1)}: r primary нулевой`).toBe(0);
      expect(Math.abs(color.g - 40), `a${step.slice(1)}: g`).toBeLessThanOrEqual(1.25);
      expect(Math.abs(color.b - 86), `a${step.slice(1)}: b`).toBeLessThanOrEqual(1.25);
      expect(Math.abs(color.a - alpha), `a${step.slice(1)}: альфа ступени`).toBeLessThanOrEqual(
        0.01,
      );
    }
  });

  test('тинт следует за темой автоматически (color-mix от primary, не примитив-альфа)', async ({
    stand,
  }) => {
    const page = await stand('tokens');
    const swatch = tintSwatch(page, 'a20');

    const beforeSerialized = await swatch.evaluate((el) => getComputedStyle(el).backgroundColor);
    const before = colorOf(beforeSerialized);
    expect(Math.abs(before.a - 0.2)).toBeLessThanOrEqual(0.01);

    // Механизм тем T2.4: select каркаса без перезагрузки; primary → purple-900
    // #511d59 (пин тем). Тинт пересчитывается браузером из themed primary.
    await page.selectOption('#ui-showcase-theme', 'test');
    await expect(page.locator('html')).toHaveAttribute('data-ui-theme', 'test');
    await expect
      .poll(() => swatch.evaluate((el) => getComputedStyle(el).backgroundColor))
      .not.toBe(beforeSerialized);

    const after = colorOf(await swatch.evaluate((el) => getComputedStyle(el).backgroundColor));
    // color(srgb …) сериализуется плавающими — каналы с допуском 8-битного
    // округления (как в derived-states.spec.js).
    expect(Math.abs(after.r - 81), 'r themed primary (#511d59)').toBeLessThanOrEqual(1.25);
    expect(Math.abs(after.g - 29), 'g').toBeLessThanOrEqual(1.25);
    expect(Math.abs(after.b - 89), 'b').toBeLessThanOrEqual(1.25);
    expect(Math.abs(after.a - 0.2), 'альфа ступени не изменилась').toBeLessThanOrEqual(0.01);
  });

  test('axe чист на стенде tokens', async ({ stand }) => {
    const page = await stand('tokens');
    const results = await a11y(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test('эталоны стенда 375/768/1280/1440 (только из контейнера, ADR-0004)', async ({ stand }) => {
    const page = await stand('tokens');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'tokens-stand', viewport });
    }
  });
});

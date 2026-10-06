/**
 * e2e производных цветов состояний (T2.6, ADR-0010).
 *
 * Тесты first (Testing requirements T2.6: «e2e computed-style hover-состояния
 * до/после смены темы»). Поверхность — демо-секция «Производные состояния»
 * стенда «Токены» (генерируется showcase/tokens-stand.mjs): до появления
 * ui-button (T4.2 — эталонный потребитель, его собственные e2e добавит T4.2)
 * сценарий исполняется на демо-чипах, читающих слой 2 через var()/color-mix.
 *
 * Проверяется:
 *  1. hover кнопочных цветов — значения одобренного дизайна из токенов-пар
 *     (--ui-color-primary-hover = blue-700 #164b89, --ui-color-accent-hover =
 *     orange-400 #f37131, career-portal components.css:80/83); color-mix
 *     значение пар не заменяет (Scope T2.6: «одобренный визуал не
 *     пересчитывается»);
 *  2. active — color-mix по конвенции ADR-0010 (88% базовый + black);
 *  3. смена темы (механизм T2.4, select каркаса без перезагрузки) меняет
 *     color-mix-производную hover автоматически — браузер пересчитывает mix
 *     из themed-токена; пара одобренного дизайна за primary автоматически
 *     НЕ следует — переопределяется темой явно (граница ADR-0010).
 */
import { expect } from '@playwright/test';

import { test as standTest } from '../helpers/harness.js';

/** Вычисленный фон элемента (цвет hover-состояния читается на живом :hover). */
const bg = (locator) => locator.evaluate((el) => getComputedStyle(el).backgroundColor);

/**
 * Каналы вычисленного цвета в 0–255. Браузер сериализует результат color-mix
 * по-разному (chromium: color(srgb 0 0.138 0.297) с плавающими 0–1; rgb() —
 * после обычных var()) — приводим обе формы к числам.
 */
function channelsOf(computed) {
  const rgb = computed.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) return rgb[1].split(',').map(Number);
  const srgb = computed.match(/^color\(\s*srgb\s+([^)]+)\)$/);
  if (srgb)
    return srgb[1]
      .trim()
      .split(/\s+/)
      .map((c) => Number(c) * 255);
  throw new Error(`неожиданная сериализация вычисленного цвета: ${computed}`);
}

/** Демо-чип: цветной span внутри карточки (data-ui-demo — на li-карточке). */
const demo = (page, name) => page.locator(`[data-ui-demo="${name}"] .ts-state-demo`);

standTest.describe('производные состояния (T2.6, ADR-0010)', () => {
  standTest(
    'hover — значения одобренного дизайна из токенов-пар; active — color-mix (88% + black)',
    async ({ stand }) => {
      const page = await stand('tokens');

      const pairPrimary = demo(page, 'hover-pair-primary');
      const pairAccent = demo(page, 'hover-pair-accent');
      const activeDerived = demo(page, 'active-derived-primary');

      // hover primary: одобренный blue-700 #164b89 (career-portal
      // components.css:80); база — primary blue-800 #002856.
      await pairPrimary.hover();
      expect(await bg(pairPrimary)).toBe('rgb(22, 75, 137)');
      await page.mouse.move(0, 0);
      expect(await bg(pairPrimary)).toBe('rgb(0, 40, 86)');

      // hover accent: одобренный accent-light #f37131 (career-portal
      // components.css:83); база — accent orange-500 #f26722.
      await pairAccent.hover();
      expect(await bg(pairAccent)).toBe('rgb(243, 113, 49)');
      await page.mouse.move(0, 0);
      expect(await bg(pairAccent)).toBe('rgb(242, 103, 34)');

      // active: color-mix(in srgb, var(--ui-color-primary) 88%, black) —
      // конвенция ADR-0010: 0.88 × rgb(0, 40, 86) ≈ rgb(0, 35.2, 75.7).
      // Допуск ±1.25 — округление 8-битного результата color-mix браузером.
      await activeDerived.hover();
      await page.mouse.down();
      const activeChannels = channelsOf(await bg(activeDerived));
      await page.mouse.up();
      expect(activeChannels[0], 'r: у primary нулевой, mix с black его не меняет').toBe(0);
      expect(
        Math.abs(activeChannels[1] - 35.2),
        `g: 88% от 40 (факт ${activeChannels[1]})`,
      ).toBeLessThanOrEqual(1.25);
      expect(
        Math.abs(activeChannels[2] - 75.68),
        `b: 88% от 86 (факт ${activeChannels[2]})`,
      ).toBeLessThanOrEqual(1.25);
    },
  );

  standTest(
    'смена темы меняет color-mix-hover автоматически; пара одобренного дизайна — только явно',
    async ({ stand }) => {
      const page = await stand('tokens');

      const pairPrimary = demo(page, 'hover-pair-primary');
      const derivedLight = demo(page, 'hover-derived-light');

      // Дефолтная тема: hover-производная light-варианта — color-mix из
      // surface-muted (дизайном не задана — стандарт ADR-0010).
      await derivedLight.hover();
      const hoverDefault = await bg(derivedLight);
      await page.mouse.move(0, 0);
      const baseDefault = await bg(derivedLight);
      expect(hoverDefault, 'hover меняет цвет ещё до смены темы').not.toBe(baseDefault);

      // Переключение темы — механизм T2.4: select каркаса выставляет
      // data-ui-theme="test" на <html> и подключает dist/themes/theme-test.css
      // без перезагрузки страницы.
      await page.selectOption('#ui-showcase-theme', 'test');
      await expect(page.locator('html')).toHaveAttribute('data-ui-theme', 'test');

      // color-mix пересчитывается браузером из themed-токена — hover меняется сам.
      await derivedLight.hover();
      await expect.poll(() => bg(derivedLight), { timeout: 5000 }).not.toBe(hoverDefault);
      const hoverThemed = await bg(derivedLight);
      await page.mouse.move(0, 0);
      await expect.poll(() => bg(derivedLight), { timeout: 5000 }).not.toBe(baseDefault);
      const baseThemed = await bg(derivedLight);
      expect(hoverThemed, 'themed hover ≠ themed base — hover применён и в теме').not.toBe(
        baseThemed,
      );

      // Пара одобренного дизайна: primary едет за темой (blue-800 → purple-900
      // #511d59), а --ui-color-primary-hover тема не переопределяла — hover
      // остаётся одобренным blue-700: пара — явный токен, автоматически из
      // primary не выводится (граница «пары vs color-mix», ADR-0010).
      await page.mouse.move(0, 0);
      await expect.poll(() => bg(pairPrimary), { timeout: 5000 }).toBe('rgb(81, 29, 89)');
      await pairPrimary.hover();
      expect(await bg(pairPrimary), 'пара hover не пересчитывается из primary').toBe(
        'rgb(22, 75, 137)',
      );
    },
  );
});

/**
 * e2e ui-link (T4.1 — Testing requirements + AC).
 *
 * Поверхность — стенд showcase/pages/ui-link (showcase/dist/stands/ui-link.html).
 * Проверяется:
 *  1. default: подчёркивание из токенов (text-decoration-thickness/offset —
 *     em от размера роли:Technical considerations T4.1), цвет primary,
 *     контраст ≥ 4.5:1 (сквозной с T2.3 — либ tests/contrast/lib.mjs);
 *  2. hover (правила под @media (hover: hover)): color-mix 88% + black
 *     (конвенция ADR-0010), подчёркивание остаётся (различимость), контраст
 *     сохраняется; active — тот же color-mix;
 *  3. --on-dark: пара text-on-dark/surface-dark, hover/active — color-mix
 *     над text-on-dark;
 *  4. --button: пара primary/text-on-dark одобренного дизайна, hover —
 *     пара var(--ui-color-primary-hover) (career-portal .btn--primary:hover,
 *     ADR-0010), active — color-mix; подпись ≥ 4.5:1;
 *  5. focus-visible виден (AC): outline focus-тройки ADR-0001
 *     (глобальная гарантия base/focus.css); для on-dark — известный разрыв
 *     контраста focus-цвета primary на тёмной секции, замена зафиксирована
 *     за T9.2 (pairs.config.mjs) — проверяется только факт механизма;
 *  6. внешние ссылки стенда — target="_blank" только с rel~noopener;
 *     icon-only — с aria-label (страховка DOM-уровня, гейты — html-validate);
 *  7. axe чист на стенде; эталоны 375/768/1280/1440 — только из
 *     контейнера/CI (ADR-0004).
 *
 * :visited e2e не проверяется — браузеры скрывают visited-историю (свойства
 * ограничены, computed не выдаёт факт посещения); правило пинится юнитом
 * (только color) и докой README.
 */
import { expect } from '@playwright/test';

import { contrastRatio } from '../contrast/lib.mjs';
import { a11y, shot, test as standTest, VIEWPORTS } from '../helpers/harness.js';

/** Идентификаторы ссылок стенда (showcase/pages/ui-link/index.html). */
const LINK = {
  default: 'ui-link-default',
  external: 'ui-link-external',
  file: 'ui-link-file',
  onDark: 'ui-link-on-dark',
  onDarkIconOnly: 'ui-link-on-dark-icon',
  button: 'ui-link-button',
};

/** Вычисленное состояние ссылки + фон подложки (data-ui-link-bg или body). */
const stateOf = (page, id) =>
  page.locator(`#${id}`).evaluate((el) => {
    const style = getComputedStyle(el);
    const scope = el.closest('[data-ui-link-bg]');
    return {
      color: style.color,
      backgroundColor: style.backgroundColor,
      backdrop: getComputedStyle(scope ?? document.body).backgroundColor,
      fontSize: style.fontSize,
      decorationLine: style.textDecorationLine,
      decorationThickness: style.textDecorationThickness,
      underlineOffset: style.textUnderlineOffset,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      focusVisible: el.matches(':focus-visible'),
    };
  });

/**
 * Каналы вычисленного цвета в 0–255 (обе сериализации chromium: rgb() после
 * var() и color(srgb …) после color-mix — паттерн derived-states.spec.js).
 */
function colorOf(computed) {
  const rgb = computed.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const [r, g, b, a = 1] = rgb[1].split(',').map(Number);
    return { r, g, b, a };
  }
  const srgb = computed.match(/^color\(\s*srgb\s+([^)]+)\)$/);
  if (srgb) {
    const [r, g, b, a = 1] = srgb[1].trim().split(/\s+/).map(Number);
    return { r: r * 255, g: g * 255, b: b * 255, a };
  }
  throw new Error(`неожиданная сериализация вычисленного цвета: ${computed}`);
}

/** Эффективный фон: собственный непрозрачный (кнопочный вариант) иначе подложка. */
function backdropOf(state) {
  const self = colorOf(state.backgroundColor);
  if (self.a === 1) return self;
  return colorOf(state.backdrop);
}

/** Контраст computed-цвета ссылки с её фоном — порог AA обычного текста 4.5. */
function assertContrastAA(state, label) {
  const ratio = contrastRatio(colorOf(state.color), backdropOf(state));
  expect(
    ratio,
    `${label}: контраст ${ratio.toFixed(2)}:1 ≥ 4.5 (сквозной с T2.3)`,
  ).toBeGreaterThanOrEqual(4.5);
}

/** Допуск округления 8-битного результата color-mix браузером (ADR-0010). */
const MIX_TOLERANCE = 1.25;

/** Ближайшие каналы color-mix(in srgb, var(--token) 88%, black) по базовому. */
const mix88 = ([r, g, b]) => [r * 0.88, g * 0.88, b * 0.88];

async function expectChannels(state, [r, g, b], label) {
  const channels = colorOf(state.color);
  for (const [index, expected] of [r, g, b].entries()) {
    const actual = [channels.r, channels.g, channels.b][index];
    expect(
      Math.abs(actual - expected),
      `${label}: канал ${'rgb'[index]} = ${actual}, ожидалось ${expected} (±${MIX_TOLERANCE})`,
    ).toBeLessThanOrEqual(MIX_TOLERANCE);
  }
}

/** Клавиатурный обход до ссылки (фокус с клавиатуры — :focus-visible, ADR-0001). */
async function tabTo(page, locator) {
  for (let step = 0; step < 25; step += 1) {
    if (await locator.evaluate((el) => el.matches(':focus-visible'))) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('фокус не дошёл до ссылки за 25 Tab');
}

/** DOM-страховка гейтов html-validate на стенде: blank→noopener, icon-only→имя. */
const standGuards = (page) =>
  page.evaluate(() => {
    const nameOf = (link) =>
      link.getAttribute('aria-label') || (link.textContent || '').replace(/\s+/g, ' ').trim();
    const problems = [];
    for (const link of document.querySelectorAll('main a')) {
      if (link.getAttribute('target') === '_blank') {
        const rel = (link.getAttribute('rel') || '').split(/\s+/);
        if (!rel.includes('noopener')) problems.push(`без noopener: ${nameOf(link)}`);
      }
      if (!nameOf(link)) problems.push('ссылка без доступного имени (icon-only)');
    }
    return problems;
  });

standTest.describe('ui-link (T4.1)', () => {
  standTest(
    'default: подчёркивание из токенов (em от роли), цвет primary, контраст ≥ 4.5',
    async ({ stand }) => {
      const page = await stand('ui-link');

      for (const id of [LINK.default, LINK.external, LINK.file]) {
        const state = await stateOf(page, id);
        expect(state.color, `${id}: цвет — --ui-color-primary (#002856)`).toBe('rgb(0, 40, 86)');
        expect(state.decorationLine, `${id}: различим без цвета (WCAG 1.4.1)`).toContain(
          'underline',
        );

        // Технические considerations: thickness/offset — из токенов, em от роли:
        // 0.0625em и 0.1875em от computed font-size (масштабируются при 32px базе).
        const fontSize = Number.parseFloat(state.fontSize);
        expect(
          Math.abs(Number.parseFloat(state.decorationThickness) - fontSize * 0.0625),
          `${id}: толщина = 0.0625em роли`,
        ).toBeLessThanOrEqual(0.6);
        expect(
          Math.abs(Number.parseFloat(state.underlineOffset) - fontSize * 0.1875),
          `${id}: отступ = 0.1875em роли`,
        ).toBeLessThanOrEqual(0.6);

        assertContrastAA(state, id);
      }
    },
  );

  standTest(
    'hover: color-mix 88% + black, подчёркивание остаётся, контраст сохраняется',
    async ({ stand }) => {
      const page = await stand('ui-link');
      const link = page.locator(`#${LINK.default}`);

      await link.hover();
      const state = await stateOf(page, LINK.default);
      await expectChannels(state, mix88([0, 40, 86]), 'hover default');
      expect(state.decorationLine, 'подчёркивание на hover остаётся').toContain('underline');
      assertContrastAA(state, 'hover default');
    },
  );

  standTest(
    'active: тот же color-mix 88% + black (одобренным дизайном active не задан)',
    async ({ stand }) => {
      const page = await stand('ui-link');
      const link = page.locator(`#${LINK.default}`);

      await link.hover();
      await page.mouse.down();
      const state = await stateOf(page, LINK.default);
      await expectChannels(state, mix88([0, 40, 86]), 'active default');
      assertContrastAA(state, 'active default');
      await page.mouse.up();
    },
  );

  standTest(
    'on-dark: пара text-on-dark/surface-dark, hover/active — color-mix, контраст ≥ 4.5',
    async ({ stand }) => {
      const page = await stand('ui-link');

      const rest = await stateOf(page, LINK.onDark);
      expect(rest.color, 'on-dark: цвет — --ui-color-text-on-dark').toBe('rgb(255, 255, 255)');
      expect(rest.backdrop, 'подложка — --ui-color-surface-dark').toBe('rgb(0, 40, 86)');
      assertContrastAA(rest, 'on-dark rest');

      await page.locator(`#${LINK.onDark}`).hover();
      const hover = await stateOf(page, LINK.onDark);
      await expectChannels(hover, mix88([255, 255, 255]), 'hover on-dark');
      assertContrastAA(hover, 'hover on-dark');

      await page.mouse.down();
      const active = await stateOf(page, LINK.onDark);
      await expectChannels(active, mix88([255, 255, 255]), 'active on-dark');
      assertContrastAA(active, 'active on-dark');
      await page.mouse.up();
    },
  );

  standTest(
    'button: пара одобренного дизайна, hover — пара primary-hover, active — color-mix',
    async ({ stand }) => {
      const page = await stand('ui-link');

      const rest = await stateOf(page, LINK.button);
      expect(rest.backgroundColor, 'фон — --ui-color-primary').toBe('rgb(0, 40, 86)');
      expect(rest.color, 'подпись — --ui-color-text-on-dark').toBe('rgb(255, 255, 255)');
      expect(rest.decorationLine, 'кнопочный вид без подчёркивания').toBe('none');
      assertContrastAA(rest, 'button rest');

      await page.locator(`#${LINK.button}`).hover();
      const hover = await stateOf(page, LINK.button);
      expect(
        hover.backgroundColor,
        'hover — пара одобренного дизайна blue-700 (ADR-0010), не color-mix',
      ).toBe('rgb(22, 75, 137)');
      assertContrastAA(hover, 'hover button');

      await page.mouse.down();
      const active = await stateOf(page, LINK.button);
      const channels = colorOf(active.backgroundColor);
      const mix = mix88([0, 40, 86]);
      expect(Math.abs(channels.g - mix[1]), 'active bg g: 88% от 40').toBeLessThanOrEqual(
        MIX_TOLERANCE,
      );
      expect(Math.abs(channels.b - mix[2]), 'active bg b: 88% от 86').toBeLessThanOrEqual(
        MIX_TOLERANCE,
      );
      assertContrastAA(active, 'active button');
      await page.mouse.up();
    },
  );

  standTest.describe('focus-visible виден (AC; ADR-0001)', () => {
    standTest.skip(
      ({ browser }) => browser.browserType().name() === 'webkit',
      'WebKit/Safari по умолчанию не даёт Tab на ссылки (Option+Tab) — поведение браузера; см. tests/e2e/skip-link.spec.js',
    );

    standTest(
      'outline focus-тройки на светлом; механизм присутствует на тёмной (разрыв цвета — T9.2)',
      async ({ stand }) => {
        const page = await stand('ui-link');

        // Default (светлая секция): outline из focus-тройки — видимый.
        await tabTo(page, page.locator(`#${LINK.default}`));
        const state = await stateOf(page, LINK.default);
        expect(state.focusVisible, 'фокус пришёл с клавиатуры').toBe(true);
        expect(state.outlineStyle, 'outline рисует глобальная политика ADR-0001').toBe('solid');
        expect(state.outlineWidth, 'ширина — --ui-focus-width (3px)').toBe('3px');
        expect(state.outlineColor, 'цвет — --ui-focus-color (primary)').toBe('rgb(0, 40, 86)');

        // Button: тот же механизм (тёмная заливка, outline по offset виден вокруг).
        await page.locator(`#${LINK.button}`).focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        const button = await stateOf(page, LINK.button);
        expect(button.focusVisible, 'клавиатурный фокус на кнопочной ссылке').toBe(true);
        expect(button.outlineStyle).toBe('solid');

        // On-dark: outline primary на surface-dark контраста не имеет — известный
        // разрыв, замена производных на тёмном зафиксирована за T9.2
        // (tests/contrast/pairs.config.mjs). Здесь пинится только факт механизма.
        await page.locator(`#${LINK.onDark}`).focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        const onDark = await stateOf(page, LINK.onDark);
        expect(onDark.focusVisible).toBe(true);
        expect(onDark.outlineStyle, 'механизм фокуса применён и на тёмной секции').toBe('solid');
      },
    );
  });

  standTest(
    'внешние ссылки стенда — blank только с noopener; icon-only — с именем',
    async ({ stand }) => {
      const page = await stand('ui-link');
      expect(await standGuards(page), 'DOM-страховка html-validate-гейтов').toEqual([]);
    },
  );

  standTest('axe чист на стенде', async ({ stand }) => {
    const page = await stand('ui-link');
    const results = await a11y(page).analyze();
    expect(results.violations).toEqual([]);
  });

  standTest('эталоны 375/768/1280/1440 — только из контейнера (ADR-0004)', async ({ stand }) => {
    const page = await stand('ui-link');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-link', viewport });
    }
  });
});

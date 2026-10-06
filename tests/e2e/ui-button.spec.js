/**
 * e2e ui-button (T4.2 — эталонный компонент; Testing requirements + AC).
 *
 * Поверхность — стенд-матрица showcase/pages/ui-button
 * (showcase/dist/stands/ui-button.html). Проверяется:
 *  1. матрица варианты × размеры × состояния: computed-стили каждого варианта
 *     из токенов (высота md 52px / sm 32px — min-height, Technical
 *     considerations T4.2; радиус pill; тройка small);
 *  2. hover (правила под @media (hover: hover)): primary/accent — пары
 *     одобренного дизайна (--ui-color-primary-hover = blue-700,
 *     --ui-color-accent-hover = accent-light); outline/light — значения
 *     одобренного дизайна; ghost — одобренная hover-поверхность blue-100;
 *  3. active — color-mix 88% + black (конвенция ADR-0010, T2.6);
 *  4. клавиатурный прогон (AC): Tab доходит, focus-visible рисует глобальная
 *     политика ADR-0001 (outline focus-тройки), Enter и Space дают click;
 *  5. disabled: не фокусируется и не кликается нативно (AC);
 *  6. loading: aria-busy="true", спиннер aria-hidden, accessible name
 *     неизменен, повторные клики мышью игнорируются (pointer-events, AC);
 *     клавиатурные/программные активации — контракт управляющего модуля
 *     формы (T5.5), граница зафиксирована в README;
 *  7. контраст (сквозной с T2.3, либа tests/contrast/lib.mjs): все
 *     интерактивные варианты ≥ 4.5:1, КРОМЕ accent — белая подпись на
 *     orange-500 = 3.12:1 (hover accent-light = 2.91:1): значение одобренного
 *     дизайна, замена — design-decision владельца (исключение зафиксировано
 *     в tests/contrast/pairs.config.mjs с T2.6); факты запинены порогом ≥ 3:1
 *     (некстовый уровень, чек-лист T9.2) и значением-пином;
 *  8. axe: нарушения вне известных исключений (accent; disabled — декоративный
 *     по AC; скрытый лейбл loading) = [];
 *  9. сценарий T2.6 «кнопочная часть» (tests/e2e/README.md): смена темы
 *     (?theme=test) перекрашивает primary и color-mix-active автоматически,
 *     пара одобренного дизайна НЕ пересчитывается из primary;
 * 10. эталоны 375/768/1280/1440 — только из контейнера/CI (ADR-0004).
 */
import { expect } from '@playwright/test';

import { contrastRatio } from '../contrast/lib.mjs';
import { a11y, shot, test as standTest, VIEWPORTS } from '../helpers/harness.js';

/** Идентификаторы кнопок стенда (showcase/pages/ui-button/index.html). */
const BTN = {
  ghost: 'ui-button-ghost',
  primary: 'ui-button-primary',
  accent: 'ui-button-accent',
  outline: 'ui-button-outline',
  light: 'ui-button-light',
  primarySm: 'ui-button-primary-sm',
  primaryDisabled: 'ui-button-primary-disabled',
  accentDisabled: 'ui-button-accent-disabled',
  primaryLoading: 'ui-button-primary-loading',
  primaryIcon: 'ui-button-primary-icon',
};

/**
 * Осознанные исключения axe на стенде: id правила + подстрока цели узла.
 * Каждое — с обоснованием (конвенция tests/README.md; расширять только сюда).
 */
const KNOWN_AXE_EXCEPTIONS = Object.freeze([
  {
    id: 'color-contrast',
    match: /ui-button-accent/,
    reason:
      'белая подпись на accent — одобренный дизайн 3.12:1 (2.91:1 на hover): ' +
      'изменение — design-decision владельца; исключение токен-уровня — ' +
      'tests/contrast/pairs.config.mjs (T2.6/ADR-0010), ревизия — T9.2',
  },
  {
    id: 'color-contrast',
    match: /-disabled/,
    reason:
      'контраст disabled — декоративный (AC T4.2): WCAG 1.4.3 исключает ' +
      'неактивные компоненты; визуал — затемнение --ui-opacity-disabled',
  },
  {
    id: 'color-contrast',
    match: /-loading/,
    reason:
      'лейбл в is-loading визуально скрыт (clip-path, accessible name ' +
      'сохраняется — Implementation requirements T4.2 п.3): axe видит бокс ' +
      'текста без краски; спиннер aria-hidden',
  },
]);

/** Вычисленное состояние кнопки + контекст (data-ui-button-bg или body). */
const stateOf = (page, id) =>
  page.locator(`#${id}`).evaluate((el) => {
    const style = getComputedStyle(el);
    const scope = el.closest('[data-ui-button-bg]');
    return {
      color: style.color,
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      backdrop: getComputedStyle(scope ?? document.body).backgroundColor,
      minHeight: style.minHeight,
      borderRadius: style.borderRadius,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontFamily: style.fontFamily,
      opacity: style.opacity,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      pointerEvents: style.pointerEvents,
      focusVisible: el.matches(':focus-visible'),
    };
  });

/** Вычисленный фон (для expect.poll при смене темы). */
const bgOf = (page, id) =>
  page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).backgroundColor);

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

/** Допуск округления 8-битного результата color-mix браузером (ADR-0010). */
const MIX_TOLERANCE = 1.25;

/** Ближайшие каналы color-mix(in srgb, var(--token) 88%, black) по базовому. */
const mix88 = ([r, g, b]) => [r * 0.88, g * 0.88, b * 0.88];

async function expectBackgroundChannels(state, [r, g, b], label) {
  const channels = colorOf(state.backgroundColor);
  for (const [index, expected] of [r, g, b].entries()) {
    const actual = [channels.r, channels.g, channels.b][index];
    expect(
      Math.abs(actual - expected),
      `${label}: канал ${'rgb'[index]} = ${actual}, ожидалось ${expected} (±${MIX_TOLERANCE})`,
    ).toBeLessThanOrEqual(MIX_TOLERANCE);
  }
}

/** Доступное имя кнопки (aria-label или текст; скрытый лейбл остаётся в DOM). */
const nameOf = (page, id) =>
  page
    .locator(`#${id}`)
    .evaluate((el) => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim());

/** Счётчики click на всех кнопках стенда (окно ожидает e2e-проверок). */
async function armClickCounters(page) {
  await page.evaluate(() => {
    window.__buttonClicks = {};
    for (const button of document.querySelectorAll('main button.ui-button')) {
      window.__buttonClicks[button.id] = 0;
      button.addEventListener('click', () => {
        window.__buttonClicks[button.id] += 1;
      });
    }
  });
}

const clicksOf = (page, id) =>
  page.evaluate((btnId) => window.__buttonClicks[btnId] ?? -1, id);

/** Клавиатурный обход до кнопки (фокус с клавиатуры — :focus-visible, ADR-0001). */
async function tabTo(page, locator) {
  for (let step = 0; step < 30; step += 1) {
    if (await locator.evaluate((el) => el.matches(':focus-visible'))) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('фокус не дошёл до кнопки за 30 Tab');
}

/** Физический клик мышью по центру кнопки (без actionability-проверок Playwright:
 *  для disabled/loading важен именно нативный исход, а не ожидание харнесса). */
async function rawClick(page, id) {
  const box = await page.locator(`#${id}`).boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/** DOM-страховка гейта html-validate (no-implicit-button-type): у каждой
 *  кнопки стенда явный type; иконки декоративные. */
const standGuards = (page) =>
  page.evaluate(() => {
    const problems = [];
    for (const button of document.querySelectorAll('main button')) {
      const type = button.getAttribute('type');
      if (!type || !['button', 'submit'].includes(type)) {
        problems.push(`кнопка без явного button|submit: ${button.id || button.textContent}`);
      }
    }
    for (const icon of document.querySelectorAll('main .ui-button__icon')) {
      if (icon.getAttribute('aria-hidden') !== 'true') problems.push('иконка без aria-hidden');
    }
    for (const spinner of document.querySelectorAll('main .ui-button__spinner')) {
      if (spinner.getAttribute('aria-hidden') !== 'true') problems.push('спиннер без aria-hidden');
    }
    return problems;
  });

standTest.describe('ui-button (T4.2)', () => {
  standTest(
    'матрица: варианты × размеры — computed-стили из токенов (высоты, pill, тройка small)',
    async ({ stand }) => {
      const page = await stand('ui-button');

      const expected = {
        [BTN.ghost]: { bg: 'rgba(0, 0, 0, 0)', color: 'rgb(31, 31, 31)' },
        [BTN.primary]: { bg: 'rgb(0, 40, 86)', color: 'rgb(255, 255, 255)' },
        [BTN.accent]: { bg: 'rgb(242, 103, 34)', color: 'rgb(255, 255, 255)' },
        [BTN.outline]: {
          bg: 'rgba(0, 0, 0, 0)',
          color: 'rgb(0, 40, 86)',
          borderColor: 'rgb(0, 40, 86)',
        },
        [BTN.light]: { bg: 'rgb(241, 245, 254)', color: 'rgb(0, 40, 86)' },
      };
      for (const [id, want] of Object.entries(expected)) {
        const state = await stateOf(page, id);
        expect(state.backgroundColor, `${id}: фон`).toBe(want.bg);
        expect(state.color, `${id}: подпись`).toBe(want.color);
        if (want.borderColor) expect(state.borderColor, `${id}: рамка`).toBe(want.borderColor);
        expect(state.minHeight, `${id}: md — --ui-button-height (52px, min-height)`).toBe('52px');
        expect(state.borderRadius, `${id}: радиус pill`).toBe('100px');
        expect(state.fontSize, `${id}: fs-small`).toBe('14px');
        expect(state.fontWeight, `${id}: fw-small`).toBe('500');
        expect(state.fontFamily, `${id}: кнопка не остаётся на UA-шрифте`).toContain(
          'Golos Text',
        );
      }

      const sm = await stateOf(page, BTN.primarySm);
      expect(sm.minHeight, 'sm — --ui-button-height-sm (32px)').toBe('32px');

      const disabled = await stateOf(page, BTN.primaryDisabled);
      expect(disabled.opacity, 'disabled — затемнение --ui-opacity-disabled').toBe('0.3');
    },
  );

  standTest(
    'hover: пары одобренного дизайна (primary/accent), значения макета (outline/light), поверхность blue-100 (ghost)',
    async ({ stand }) => {
      const page = await stand('ui-button');

      await page.locator(`#${BTN.primary}`).hover();
      expect(
        (await stateOf(page, BTN.primary)).backgroundColor,
        'hover primary — пара --ui-color-primary-hover (blue-700), не color-mix',
      ).toBe('rgb(22, 75, 137)');

      await page.locator(`#${BTN.accent}`).hover();
      expect(
        (await stateOf(page, BTN.accent)).backgroundColor,
        'hover accent — пара --ui-color-accent-hover (accent-light)',
      ).toBe('rgb(243, 113, 49)');

      await page.locator(`#${BTN.outline}`).hover();
      const outline = await stateOf(page, BTN.outline);
      expect(outline.backgroundColor, 'hover outline — заливка primary (components.css:90)').toBe(
        'rgb(0, 40, 86)',
      );
      expect(outline.color, 'hover outline — подпись белая').toBe('rgb(255, 255, 255)');
      expect(outline.borderColor, 'рамка остаётся primary').toBe('rgb(0, 40, 86)');

      await page.locator(`#${BTN.light}`).hover();
      const light = await stateOf(page, BTN.light);
      expect(
        light.backgroundColor,
        'hover light — --ui-color-surface-hover (blue-100, components.css:93)',
      ).toBe('rgb(232, 238, 254)');
      expect(light.color, 'подпись light — primary').toBe('rgb(0, 40, 86)');

      await page.locator(`#${BTN.ghost}`).hover();
      const ghost = await stateOf(page, BTN.ghost);
      expect(ghost.backgroundColor, 'hover ghost — одобренная hover-поверхность').toBe(
        'rgb(232, 238, 254)',
      );
    },
  );

  standTest('active: color-mix 88% + black над токеном варианта (ADR-0010)', async ({ stand }) => {
    const page = await stand('ui-button');

    await page.locator(`#${BTN.primary}`).hover();
    await page.mouse.down();
    await expectBackgroundChannels(
      await stateOf(page, BTN.primary),
      mix88([0, 40, 86]),
      'active primary',
    );
    await page.mouse.up();

    await page.locator(`#${BTN.accent}`).hover();
    await page.mouse.down();
    await expectBackgroundChannels(
      await stateOf(page, BTN.accent),
      mix88([242, 103, 34]),
      'active accent',
    );
    await page.mouse.up();

    await page.locator(`#${BTN.outline}`).hover();
    await page.mouse.down();
    await expectBackgroundChannels(
      await stateOf(page, BTN.outline),
      mix88([0, 40, 86]),
      'active outline',
    );
    await page.mouse.up();
  });

  standTest.describe('клавиатурный прогон (AC: Tab/Enter/Space; фокус — ADR-0001)', () => {
    standTest('Tab: focus-visible рисует политика base/focus.css; Enter и Space активируют', async ({
      stand,
    }) => {
      const page = await stand('ui-button');
      await armClickCounters(page);

      const primary = page.locator(`#${BTN.primary}`);
      await tabTo(page, primary);
      const state = await stateOf(page, BTN.primary);
      expect(state.focusVisible, 'фокус пришёл с клавиатуры').toBe(true);
      expect(state.outlineStyle, 'outline рисует глобальная политика ADR-0001').toBe('solid');
      expect(state.outlineWidth, 'ширина — --ui-focus-width (3px)').toBe('3px');
      expect(state.outlineColor, 'цвет — --ui-focus-color (primary)').toBe('rgb(0, 40, 86)');

      await page.keyboard.press('Enter');
      expect(await clicksOf(page, BTN.primary), 'Enter даёт click').toBe(1);
      await page.keyboard.press('Space');
      expect(await clicksOf(page, BTN.primary), 'Space даёт click').toBe(1);
    });

    standTest('disabled: не фокусируется и не кликается нативно (AC)', async ({ stand }) => {
      const page = await stand('ui-button');
      await armClickCounters(page);

      const disabled = page.locator(`#${BTN.primaryDisabled}`);
      await expect(disabled).toBeDisabled();

      // Клавиатура: последовательный Tab ни разу не оставляет фокус на disabled.
      for (let step = 0; step < 40; step += 1) {
        await page.keyboard.press('Tab');
        const onDisabled = await disabled.evaluate((el) => document.activeElement === el);
        expect(onDisabled, 'Tab не фокусирует disabled').toBe(false);
        if (await page.evaluate(() => document.activeElement === document.body)) break;
      }

      // Мышь: физический клик по центру — событие click не возникает.
      await rawClick(page, BTN.primaryDisabled);
      expect(await clicksOf(page, BTN.primaryDisabled), 'клик по disabled игнорируется нативно').toBe(
        0,
      );
    });
  });

  standTest(
    'loading: aria-busy, спиннер aria-hidden, accessible name неизменен, повторные клики мышью игнорируются (AC)',
    async ({ stand }) => {
      const page = await stand('ui-button');
      await armClickCounters(page);

      const loading = page.locator(`#${BTN.primaryLoading}`);
      await expect(loading).toHaveAttribute('aria-busy', 'true');
      await expect(loading.locator('.ui-button__spinner')).toHaveAttribute('aria-hidden', 'true');

      // Лейбл заменён спиннером визуально, но имя в accessibility tree неизменно.
      expect(await nameOf(page, BTN.primaryLoading)).toBe(await nameOf(page, BTN.primary));

      // Стилевая сторона контракта: лейбл скрыт без display:none, спиннер виден.
      const loadingState = await page.locator(`#${BTN.primaryLoading}`).evaluate((el) => {
        const label = el.querySelector('.ui-button__label');
        const spinner = el.querySelector('.ui-button__spinner');
        return {
          labelDisplay: getComputedStyle(label).display,
          labelClip: getComputedStyle(label).clipPath,
          spinnerDisplay: getComputedStyle(spinner).display,
          buttonPointerEvents: getComputedStyle(el).pointerEvents,
        };
      });
      expect(loadingState.labelDisplay, 'display:none убрал бы имя').not.toBe('none');
      expect(loadingState.labelClip, 'лейбл скрыт clip-path').toContain('inset');
      expect(loadingState.spinnerDisplay, 'спиннер показан').toBe('block');
      expect(loadingState.buttonPointerEvents, 'клики мышью выключены').toBe('none');

      await rawClick(page, BTN.primaryLoading);
      expect(await clicksOf(page, BTN.primaryLoading), 'повторный клик игнорируется').toBe(0);

      // Граница контракта: клавиатурная активация остаётся нативной — её
      // перехватывает управляющий модуль формы по aria-busy (T5.5, README).
      await tabTo(page, loading);
      await page.keyboard.press('Enter');
      expect(
        await clicksOf(page, BTN.primaryLoading),
        'нативный button: CSS не отменяет Enter — контракт T5.5',
      ).toBe(1);
    },
  );

  standTest(
    'контраст (сквозной с T2.3): интерактивные варианты ≥ 4.5; accent — запиненный разрыв одобренного дизайна',
    async ({ stand }) => {
      const page = await stand('ui-button');

      const assertAA = async (id, label) => {
        const state = await stateOf(page, id);
        const ratio = contrastRatio(colorOf(state.color), colorOf(state.backgroundColor));
        expect(ratio, `${label}: ${ratio.toFixed(2)}:1 ≥ 4.5`).toBeGreaterThanOrEqual(4.5);
      };
      for (const id of [BTN.ghost, BTN.primary, BTN.outline, BTN.light]) {
        await assertAA(id, `default ${id}`);
      }

      // hover: пары/значения одобренного дизайна — все ≥ 4.5 (blue-700 8.74:1).
      await page.locator(`#${BTN.primary}`).hover();
      await assertAA(BTN.primary, 'hover primary');
      await page.locator(`#${BTN.outline}`).hover();
      await assertAA(BTN.outline, 'hover outline');
      await page.locator(`#${BTN.light}`).hover();
      await assertAA(BTN.light, 'hover light');
      await page.locator(`#${BTN.ghost}`).hover();
      await assertAA(BTN.ghost, 'hover ghost');

      // accent — известный разрыв одобренного дизайна (пары кнопок не гейтятся
      // в tests/contrast/pairs.config.mjs с T2.6; значение не меняется без
      // design-decision владельца). Пин факта + некстовый пол ≥ 3 (T9.2).
      const accentState = await stateOf(page, BTN.accent);
      const accentRatio = contrastRatio(
        colorOf(accentState.color),
        colorOf(accentState.backgroundColor),
      );
      expect(accentRatio, 'пин одобренного значения 3.12:1 (белая подпись на orange-500)').toBeCloseTo(
        3.12,
        1,
      );
      expect(accentRatio, 'пол некстового уровня (чек-лист T9.2)').toBeGreaterThanOrEqual(3);
    },
  );

  standTest('DOM-страховка гейтов: у всех кнопок type, иконки и спиннеры aria-hidden', async ({
    stand,
  }) => {
    const page = await stand('ui-button');
    expect(await standGuards(page), 'страховка html-validate-гейта типа').toEqual([]);
  });

  standTest('axe: нарушения вне известных исключений отсутствуют (AC)', async ({ stand }) => {
    const page = await stand('ui-button');
    const results = await a11y(page).analyze();

    const unexpected = [];
    for (const violation of results.violations) {
      for (const node of violation.nodes) {
        const target = node.target.join(' ');
        const known = KNOWN_AXE_EXCEPTIONS.find(
          (exception) => exception.id === violation.id && exception.match.test(target),
        );
        if (!known) unexpected.push(`${violation.id} → ${target}`);
      }
    }
    expect(unexpected, 'axe: нарушения вне известных исключений').toEqual([]);
  });

  standTest.describe('сценарий T2.6, кнопочная часть (tests/e2e/README.md)', () => {
    standTest(
      'смена темы перекрашивает primary и color-mix-active; пара одобренного дизайна не пересчитывается',
      async ({ stand }) => {
        const page = await stand('ui-button');

        // Дефолтная тема: актив — 88% от blue-800 (проверено выше; здесь база).
        expect(await bgOf(page, BTN.primary)).toBe('rgb(0, 40, 86)');

        // Механизм T2.4: select каркаса ставит data-ui-theme и подключает тему.
        await page.selectOption('#ui-showcase-theme', 'test');
        await expect(page.locator('html')).toHaveAttribute('data-ui-theme', 'test');

        // primary едет за темой: blue-800 → purple-900 #511d59.
        await expect.poll(() => bgOf(page, BTN.primary), { timeout: 5000 }).toBe('rgb(81, 29, 89)');

        // color-mix-active пересчитывается браузером из themed-токена:
        // 88% × rgb(81, 29, 89) ≈ rgb(71.28, 25.52, 78.32).
        await page.locator(`#${BTN.primary}`).hover();
        await page.mouse.down();
        await expectBackgroundChannels(
          await stateOf(page, BTN.primary),
          mix88([81, 29, 89]),
          'themed active primary',
        );
        await page.mouse.up();

        // Пара одобренного дизайна за primary НЕ следует (граница ADR-0010):
        // hover остаётся blue-700 #164b89.
        await expect.poll(() => bgOf(page, BTN.primary), { timeout: 5000 }).toBe('rgb(81, 29, 89)');
        await page.locator(`#${BTN.primary}`).hover();
        expect(
          await bgOf(page, BTN.primary),
          'пара hover не пересчитывается из themed primary',
        ).toBe('rgb(22, 75, 137)');

        // light-hover: bg — пара (тема не переопределяла — blue-100), подпись —
        // primary (едет за темой).
        await page.locator(`#${BTN.light}`).hover();
        const light = await stateOf(page, BTN.light);
        expect(light.backgroundColor, 'пара light-hover — blue-100 без пересчёта').toBe(
          'rgb(232, 238, 254)',
        );
        expect(light.color, 'подпись light — primary едет за темой').toBe('rgb(81, 29, 89)');
      },
    );
  });

  standTest('эталоны 375/768/1280/1440 — только из контейнера (ADR-0004)', async ({ stand }) => {
    const page = await stand('ui-button');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-button', viewport });
    }
  });
});

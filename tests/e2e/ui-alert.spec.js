/**
 * e2e ui-alert (T4.5; Testing requirements).
 *
 * Поверхность — стенд-матрица showcase/pages/ui-alert
 * (showcase/dist/stands/ui-alert.html; AC «стенд 4×2»). Проверяется:
 *  1. e2e появления (role в DOM): info/success → role="status" (вежливое
 *     объявление), warning/error → role="alert" (немедленное) — и в статичных,
 *     и в закрываемых примерах; роль выставлена в HTML-паттерне, не JS
 *     (Technical considerations T4.5);
 *  2. матрица вариантов: computed-пары цветов из токенов (bg+цвет из
 *     семантических пар), геометрия (радиус --ui-radius-md, паддинг
 *     --ui-space-4, gap --ui-space-3);
 *  3. иконка варианта: svg aria-hidden 24px, красится currentColor (смысл
 *     дублируется текстом — WCAG 1.4.1);
 *  4. закрываемый вариант: кнопка с доступным именем «Закрыть», клавиатурный
 *     фокус виден (глобальная политика ADR-0001);
 *  5. закрытие Tab→Enter (AC): фокус клавиатурой на __close, Enter удаляет
 *     алерт из DOM — соседние алерты остаются;
 *  6. контраст (сквозной с T2.3, либа tests/contrast/lib.mjs): текст варианта
 *     на своём bg ≥ 4.5:1 (включая warning-пару T4.5 и нейтральную базу);
 *  7. axe: стенд чист — известных исключений нет;
 *  8. эталоны 375/768/1280/1440 — только из контейнера/CI (ADR-0004).
 */
import { expect } from '@playwright/test';

import { contrastRatio } from '../contrast/lib.mjs';
import { a11y, shot, test as standTest, VIEWPORTS } from '../helpers/harness.js';

/** Идентификаторы стенда (showcase/pages/ui-alert/index.html). */
const ALERT = {
  base: 'ui-alert-base',
  info: 'ui-alert-info',
  success: 'ui-alert-success',
  warning: 'ui-alert-warning',
  error: 'ui-alert-error',
  infoClose: 'ui-alert-info-close',
  successClose: 'ui-alert-success-close',
  warningClose: 'ui-alert-warning-close',
  errorClose: 'ui-alert-error-close',
};

/** Ожидаемые computed-пары вариантов (значения семантических пар слоя 2). */
const EXPECTED = {
  [ALERT.base]: { bg: 'rgb(241, 245, 254)', color: 'rgb(31, 31, 31)' },
  [ALERT.info]: { bg: 'rgb(241, 245, 254)', color: 'rgb(22, 75, 137)' },
  [ALERT.success]: { bg: 'rgb(221, 243, 225)', color: 'rgb(30, 122, 52)' },
  [ALERT.warning]: { bg: 'rgb(255, 227, 211)', color: 'rgb(169, 71, 16)' },
  [ALERT.error]: { bg: 'rgb(255, 246, 244)', color: 'rgb(201, 58, 38)' },
};

/** Роль по критичности: info/success — status, warning/error — alert. */
const ROLE_OF = {
  [ALERT.info]: 'status',
  [ALERT.success]: 'status',
  [ALERT.warning]: 'alert',
  [ALERT.error]: 'alert',
  [ALERT.infoClose]: 'status',
  [ALERT.successClose]: 'status',
  [ALERT.warningClose]: 'alert',
  [ALERT.errorClose]: 'alert',
};

/** Вычисленное состояние корня алерта. */
const stateOf = (page, id) =>
  page.locator(`#${id}`).evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      display: style.display,
      gap: style.gap,
      alignItems: style.alignItems,
      padding: style.padding,
      borderRadius: style.borderRadius,
      backgroundColor: style.backgroundColor,
      color: style.color,
    };
  });

/** Цели Tab-обхода (паттерн ui-card.spec.js). */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** Состояние фокуса активного элемента (глобальная политика ADR-0001). */
const focusState = (page) =>
  page.evaluate(() => {
    const own = getComputedStyle(document.activeElement);
    return {
      id: document.activeElement.id || null,
      tag: document.activeElement.tagName.toLowerCase(),
      focusVisible: document.activeElement.matches(':focus-visible'),
      outlineWidth: own.outlineWidth,
      outlineStyle: own.outlineStyle,
    };
  });

/** Клавиатурный обход до элемента с id (паттерн фокус-тестов ui-card). */
async function focusByKeyboard(page, targetId) {
  const steps = await page.evaluate(
    ([selector, id]) => [...document.querySelectorAll(selector)].indexOf(document.getElementById(id)),
    [FOCUSABLE_SELECTOR, targetId],
  );
  expect(steps, `${targetId} — фокусируемая цель в Tab-порядке`).toBeGreaterThan(-1);
  for (let step = 0; step <= steps; step += 1) {
    await page.keyboard.press('Tab');
  }
}

standTest.describe('ui-alert (T4.5)', () => {
  standTest(
    'e2e появления: роли в DOM — info/success → status, warning/error → alert (статичные и закрываемые)',
    async ({ stand }) => {
      const page = await stand('ui-alert');

      for (const [id, role] of Object.entries(ROLE_OF)) {
        const alert = page.locator(`#${id}`);
        await expect(alert, `${id}: роль по критичности`).toHaveAttribute('role', role);
      }
    },
  );

  standTest(
    'матрица вариантов: computed-пары цветов из токенов + геометрия Technical considerations',
    async ({ stand }) => {
      const page = await stand('ui-alert');

      for (const [id, want] of Object.entries(EXPECTED)) {
        const state = await stateOf(page, id);
        expect(state.backgroundColor, `${id}: фон`).toBe(want.bg);
        expect(state.color, `${id}: цвет текста/иконки`).toBe(want.color);
      }

      // Геометрия едина для всех вариантов (Technical considerations T4.5).
      for (const id of Object.keys(EXPECTED)) {
        const state = await stateOf(page, id);
        expect(state.display, `${id}: корень — флекс иконка+тело`).toBe('flex');
        expect(state.gap, `${id}: gap — --ui-space-3 (12px)`).toBe('12px');
        expect(state.padding, `${id}: паддинг — --ui-space-4 (16px)`).toBe('16px');
        expect(state.borderRadius, `${id}: радиус — --ui-radius-md (16px)`).toBe('16px');
      }
    },
  );

  standTest('иконка варианта: svg aria-hidden 24px на currentColor (WCAG 1.4.1)', async ({ stand }) => {
    const page = await stand('ui-alert');

    for (const id of Object.keys(EXPECTED)) {
      const icon = page.locator(`#${id} .ui-alert__icon`);
      await expect(icon, `${id}: иконка декоративная — смысл в тексте`).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      const box = await icon.boundingBox();
      expect(
        Math.abs(box.width - 24),
        `${id}: иконка 24px (--ui-space-5, факт ${box.width})`,
      ).toBeLessThanOrEqual(0.5);
      const colors = await page.locator(`#${id}`).evaluate((el) => {
        const svg = el.querySelector('.ui-alert__icon');
        return { stroke: getComputedStyle(svg).stroke, color: getComputedStyle(el).color };
      });
      expect(colors.stroke, `${id}: svg красится currentColor варианта`).toBe(colors.color);
    }
  });

  standTest(
    'закрываемый вариант: имя кнопки «Закрыть», клавиатурный фокус виден (ADR-0001)',
    async ({ stand }) => {
      const page = await stand('ui-alert');

      const close = page.locator(`#${ALERT.infoClose} .ui-alert__close`);
      await expect(close).toHaveAccessibleName('Закрыть');

      await focusByKeyboard(page, `${ALERT.infoClose}`);
      const state = await focusState(page);
      expect(state.id, 'фокус на кнопке закрытия').toBe(ALERT.infoClose);
      expect(state.focusVisible, 'клавиатурный фокус — :focus-visible').toBe(true);
      expect(
        Number.parseFloat(state.outlineWidth),
        `обводка глобальной политики ≥ 3px (факт ${state.outlineWidth})`,
      ).toBeGreaterThanOrEqual(3);
      expect(state.outlineStyle, 'обводка solid').toBe('solid');
    },
  );

  standTest(
    'закрытие Tab→Enter (AC): Enter на __close удаляет алерт, соседи остаются',
    async ({ stand }) => {
      const page = await stand('ui-alert');

      const alert = page.locator(`#${ALERT.warningClose}`);
      await expect(alert).toHaveAttribute('role', 'alert');

      await focusByKeyboard(page, ALERT.warningClose);
      const state = await focusState(page);
      expect(state.id, 'фокус клавиатурой на кнопке закрытия').toBe(ALERT.warningClose);

      await page.keyboard.press('Enter');
      await expect(alert, 'алерт удалён из DOM (правило закрытия — README)').toHaveCount(0);

      // Закрытие по явному действию не задевает соседей.
      for (const id of [ALERT.infoClose, ALERT.successClose, ALERT.errorClose]) {
        await expect(page.locator(`#${id}`)).toHaveCount(1);
      }
    },
  );

  standTest(
    'контраст (сквозной с T2.3): текст варианта на своём фоне ≥ 4.5:1 — включая warning и базу',
    async ({ stand }) => {
      const page = await stand('ui-alert');

      for (const [id, want] of Object.entries(EXPECTED)) {
        const ratio = contrastRatio(want.color, want.bg);
        expect(ratio, `${id}: ${ratio.toFixed(2)}:1 ≥ 4.5`).toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  standTest('axe: нарушения отсутствуют — известных исключений нет (AC)', async ({ stand }) => {
    const page = await stand('ui-alert');
    const results = await a11y(page).analyze();
    expect(
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`),
      'axe: violations = []',
    ).toEqual([]);
  });

  standTest('эталоны 375/768/1280/1440 — только из контейнера (ADR-0004)', async ({ stand }) => {
    const page = await stand('ui-alert');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-alert', viewport });
    }
  });
});

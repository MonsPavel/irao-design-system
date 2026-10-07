/**
 * e2e ui-tag / ui-badge (T4.3; Testing requirements).
 *
 * Поверхность — стенд-матрица showcase/pages/ui-tag
 * (showcase/dist/stands/ui-tag.html; badge-секция там же — AC «стенд всех
 * вариантов tag + badge»; канонический паттерн ui-badge живёт отдельным
 * базовым стендом ui-badge.html). Проверяется:
 *  1. матрица вариантов: computed-пары цветов каждого варианта из токенов
 *     (Testing requirements: «e2e пары computed цветов на вариант»), геометрия
 *     одобренного .tag (min-height 28px, радиус pill, fs 12px, fw 500,
 *     letter-spacing 0.02em) и фактическая высота boundingBox ≈ 28
 *     (прецедент ревью T4.2: min-height активируется, только если контент
 *     меньше токена);
 *  2. точка-маркер __icon: 8×8 круг, красится currentColor варианта,
 *     aria-hidden в разметке;
 *  3. ui-badge: круг 24×24 для одной цифры, pill для «99+» (ширина больше
 *     высоты, контент не обрезан), правило при 0 — атрибут hidden (глобальная
 *     гарантия base/reset.css), доступное имя ссылки без задвоения
 *     (Implementation requirements п.2);
 *  4. контраст (сквозной с T2.3, либа tests/contrast/lib.mjs): все варианты
 *     тегов и бейдж ≥ 4.5:1 (текст 12px — обычный текст, порог text);
 *  5. axe: стенд чист — известных исключений нет (все пары проходят гейт T2.3);
 *  6. эталоны 375/768/1280/1440 — только из контейнера/CI (ADR-0004).
 */
import { expect } from '@playwright/test';

import { contrastRatio } from '../contrast/lib.mjs';
import { a11y, shot, test as standTest, VIEWPORTS } from '../helpers/harness.js';

/** Идентификаторы тегов стенда (showcase/pages/ui-tag/index.html). */
const TAG = {
  base: 'ui-tag-default',
  blue: 'ui-tag-blue',
  orange: 'ui-tag-orange',
  green: 'ui-tag-green',
  gray: 'ui-tag-gray',
  navy: 'ui-tag-navy',
  blueIcon: 'ui-tag-blue-icon',
};

/** Идентификаторы бейджей стенда. */
const BADGE = {
  digit: 'ui-badge-digit',
  overflow: 'ui-badge-overflow',
  zeroHidden: 'ui-badge-zero-hidden',
  linkDuplicated: 'ui-badge-link-duplicated',
  linkNamed: 'ui-badge-link-named',
};

/** Вычисленное состояние тега/бейджа. */
const stateOf = (page, id) =>
  page.locator(`#${id}`).evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      color: style.color,
      backgroundColor: style.backgroundColor,
      minHeight: style.minHeight,
      minWidth: style.minWidth,
      borderRadius: style.borderRadius,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      letterSpacing: style.letterSpacing,
      display: style.display,
    };
  });

/** Фактический бокс (проверка, что min-height/min-width активируются). */
const boxOf = (page, id) => page.locator(`#${id}`).boundingBox();

standTest.describe('ui-tag (T4.3)', () => {
  standTest(
    'матрица: computed-пары цветов вариантов из токенов + геометрия одобренного .tag',
    async ({ stand }) => {
      const page = await stand('ui-tag');

      const expected = {
        [TAG.base]: { bg: 'rgba(0, 0, 0, 0)', color: 'rgb(31, 31, 31)' },
        [TAG.blue]: { bg: 'rgb(232, 238, 254)', color: 'rgb(0, 40, 86)' },
        [TAG.orange]: { bg: 'rgb(255, 227, 211)', color: 'rgb(169, 71, 16)' },
        [TAG.green]: { bg: 'rgb(221, 243, 225)', color: 'rgb(30, 122, 52)' },
        [TAG.gray]: { bg: 'rgb(240, 241, 243)', color: 'rgb(97, 97, 97)' },
        [TAG.navy]: { bg: 'rgb(0, 40, 86)', color: 'rgb(255, 255, 255)' },
      };
      for (const [id, want] of Object.entries(expected)) {
        const state = await stateOf(page, id);
        expect(state.backgroundColor, `${id}: фон`).toBe(want.bg);
        expect(state.color, `${id}: подпись`).toBe(want.color);
      }

      // Геометрия едина для всех вариантов (одобренный .tag, components.css:96–105).
      for (const id of Object.keys(expected)) {
        const state = await stateOf(page, id);
        expect(state.minHeight, `${id}: min-height — --ui-tag-height (28px)`).toBe('28px');
        expect(state.borderRadius, `${id}: радиус pill`).toBe('100px');
        expect(state.fontSize, `${id}: fs-micro (12px)`).toBe('12px');
        expect(state.fontWeight, `${id}: fw-caption (--fw-caption одобренного .tag)`).toBe('500');
        const spacing = Number.parseFloat(state.letterSpacing);
        expect(
          Math.abs(spacing - 0.24),
          `${id}: letter-spacing 0.02em × 12px = 0.24px (факт ${state.letterSpacing})`,
        ).toBeLessThanOrEqual(0.01);
        // Фактическая высота: контент (line-box 12×1.35 ≈ 16.2 + паддинг 4×2 =
        // 24.2px) меньше токена 28 — min-height активируется (прецедент
        // ревью T4.2: иначе модификатор no-op).
        const box = await boxOf(page, id);
        expect(
          Math.abs(box.height - 28),
          `${id}: фактическая высота = --ui-tag-height (факт ${box.height})`,
        ).toBeLessThanOrEqual(0.5);
      }
    },
  );

  standTest('точка-маркер __icon: круг 8×8 на currentColor варианта, aria-hidden', async ({
    stand,
  }) => {
    const page = await stand('ui-tag');

    const icon = page.locator(`#${TAG.blueIcon} .ui-tag__icon`);
    await expect(icon).toHaveAttribute('aria-hidden', 'true');

    const colors = await page.locator(`#${TAG.blueIcon}`).evaluate((el) => {
      const dot = el.querySelector('.ui-tag__icon');
      return {
        dotBackground: getComputedStyle(dot).backgroundColor,
        tagColor: getComputedStyle(el).color,
        dotRadius: getComputedStyle(dot).borderRadius,
      };
    });
    expect(
      colors.dotBackground,
      'точка красится currentColor — цветом подписи варианта',
    ).toBe(colors.tagColor);
    expect(colors.dotRadius, 'круг (pill в квадратном боксе, паттерн спиннера ui-button)').toBe(
      '100px',
    );

    const box = await icon.boundingBox();
    expect(Math.abs(box.width - 8), `точка 8px (--ui-space-2, факт ${box.width})`).toBeLessThanOrEqual(
      0.5,
    );
    expect(Math.abs(box.height - 8), `точка 8px по вертикали (факт ${box.height})`).toBeLessThanOrEqual(
      0.5,
    );
  });

  standTest.describe('ui-badge (T4.3)', () => {
    standTest('круг для цифры и pill для «99+»: геометрия и пара primary/text-on-dark', async ({
      stand,
    }) => {
      const page = await stand('ui-tag');

      const state = await stateOf(page, BADGE.digit);
      expect(state.backgroundColor, 'фон — primary').toBe('rgb(0, 40, 86)');
      expect(state.color, 'цифра — text-on-dark').toBe('rgb(255, 255, 255)');
      expect(state.borderRadius, 'радиус pill').toBe('100px');
      expect(state.fontSize, 'fs-micro (12px)').toBe('12px');
      expect(state.fontWeight, 'fw-caption').toBe('500');

      // Одна цифра — круг: min-width и min-height токена активируются.
      const digitBox = await boxOf(page, BADGE.digit);
      expect(
        Math.abs(digitBox.height - 24),
        `высота круга = --ui-badge-size (факт ${digitBox.height})`,
      ).toBeLessThanOrEqual(0.5);
      expect(
        Math.abs(digitBox.width - 24),
        `ширина круга = --ui-badge-size (факт ${digitBox.width})`,
      ).toBeLessThanOrEqual(0.5);

      // «99+» — pill: ширина растёт с контентом, высота неизменна, контент
      // не обрезан (переполнение читается).
      const overflowBox = await boxOf(page, BADGE.overflow);
      expect(overflowBox.height, 'высота «99+» — та же').toBeCloseTo(digitBox.height, 0);
      expect(
        overflowBox.width,
        '«99+» шире круга (pill, контент не влезает в 24px)',
      ).toBeGreaterThan(overflowBox.height);
      await expect(page.locator(`#${BADGE.overflow}`)).toHaveText('99+');
    });

    standTest('правило при 0: атрибут hidden скрывает бейдж (глобальная гарантия base/reset)', async ({
      stand,
    }) => {
      const page = await stand('ui-tag');

      const badge = page.locator(`#${BADGE.zeroHidden}`);
      await expect(badge).toHaveAttribute('hidden');
      await expect(badge).toBeHidden();
      expect(await stateOf(page, BADGE.zeroHidden)).toMatchObject({ display: 'none' });
    });

    standTest(
      'правило дублирования: aria-hidden бейдж не задваивает имя ссылки; иначе значение в имени (Implementation requirements п.2)',
      async ({ stand }) => {
        const page = await stand('ui-tag');

        const duplicated = page.locator(`#${BADGE.linkDuplicated}`);
        await expect(duplicated.locator('.ui-badge')).toHaveAttribute('aria-hidden', 'true');
        await expect(duplicated).toHaveAccessibleName('Уведомления');

        const named = page.locator(`#${BADGE.linkNamed}`);
        await expect(named.locator('.ui-badge')).not.toHaveAttribute('aria-hidden');
        await expect(named).toHaveAccessibleName('Уведомления: 3');
      },
    );
  });

  standTest(
    'контраст (сквозной с T2.3): все варианты тегов и бейдж ≥ 4.5:1 (текст 12px — обычный текст)',
    async ({ stand }) => {
      const page = await stand('ui-tag');

      /** Контраст computed-пары «подпись/фон» (фоны тегов непрозрачны). */
      const assertAA = async (id, label) => {
        const state = await stateOf(page, id);
        const bg = state.backgroundColor.match(/^rgba?\(([^)]+)\)$/);
        expect(bg, `${id}: фон непрозрачен`).toBeTruthy();
        const [, , , a = 1] = bg[1].split(',').map(Number);
        expect(a, `${id}: без альфы`).toBe(1);
        const ratio = contrastRatio(state.color, state.backgroundColor);
        expect(ratio, `${label}: ${ratio.toFixed(2)}:1 ≥ 4.5`).toBeGreaterThanOrEqual(4.5);
      };
      for (const id of Object.values(TAG)) {
        if (id === TAG.blueIcon) continue; // иконка проверяется в тесте слота
        await assertAA(id, id);
      }
      await assertAA(BADGE.digit, BADGE.digit);
      await assertAA(BADGE.overflow, BADGE.overflow);
    },
  );

  standTest('axe: нарушения отсутствуют — известных исключений у компонента нет (AC)', async ({
    stand,
  }) => {
    const page = await stand('ui-tag');
    const results = await a11y(page).analyze();
    expect(
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`),
      'axe: violations = []',
    ).toEqual([]);
  });

  standTest('эталоны 375/768/1280/1440 — только из контейнера (ADR-0004)', async ({ stand }) => {
    const page = await stand('ui-tag');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-tag', viewport });
    }
  });
});

/**
 * e2e ui-stat (T17.4; Testing requirements).
 *
 * Поверхность — стенд-матрица showcase/pages/ui-stat
 * (showcase/dist/stands/ui-stat.html). Проверяется:
 *  1. матрица поверхностей: computed-пары цветов вариантов из токенов
 *     (primary — дефолт хука --ui-stat-surface, glass-dark + рамка
 *     on-dark-muted на фото-подложке, surface-blue-deep) и геометрия
 *     «как есть» (паддинги 16/24·20/24·24/20, шаги 8/0/12, радиус md);
 *  2. типографика значения — ролью, не компонентом (Implementation
 *     requirements п.2): __value не задаёт fs/fw/lh (размер несёт ui-h2),
 *     но перекрашивает роль в text-on-dark (роль красит в --ui-color-heading,
 *     на тёмной плашке нечитаемо);
 *  3. подпись/сноска: on-dark-muted (канон Context), у --glass/--deep —
 *     text-on-dark оригинала; сноска — fs-micro;
 *  4. токен-хук --ui-stat-surface: демо-инстанс перекрашен primary-deep
 *     без fork'а (Notes);
 *  5. контраст: on-dark-пары непрозрачных вариантов ≥ 4.5:1 (сквозной с
 *     T2.3, либа tests/contrast/lib.mjs); стекло --glass — альфа-поверхность
 *     поверх фото-подложки: пару гейтит axe (считает эффективный фон с альфой);
 *  6. axe: стенд чист (включая контраст стекла и семантику ul/li);
 *  7. эталоны 375/768/1280/1440 — только из контейнера/CI (ADR-0004).
 */
import { expect } from '@playwright/test';

import { contrastRatio } from '../contrast/lib.mjs';
import { a11y, shot, test as standTest, VIEWPORTS } from '../helpers/harness.js';

/** Идентификаторы стенда (showcase/pages/ui-stat/index.html). */
const STAT = {
  base: 'ui-stat-default',
  glass: 'ui-stat-glass',
  filled: 'ui-stat-filled',
  deep: 'ui-stat-deep',
  surfaceHook: 'ui-stat-surface-hook',
};

/** Computed-карта инстанса: поверхность + типографика элементов. */
const stateOf = (page, id) =>
  page.locator(`#${id}`).evaluate((el) => {
    const style = getComputedStyle(el);
    const value = el.querySelector('.ui-stat__value');
    const label = el.querySelector('.ui-stat__label');
    const note = el.querySelector('.ui-stat__note');
    return {
      bg: style.backgroundColor,
      borderColor: style.borderColor,
      borderWidth: style.borderWidth,
      padding: style.padding,
      gap: style.gap,
      radius: style.borderRadius,
      value: value
        ? {
            fs: getComputedStyle(value).fontSize,
            fw: getComputedStyle(value).fontWeight,
            lh: getComputedStyle(value).lineHeight,
            color: getComputedStyle(value).color,
            ownFs: value.style.fontSize,
          }
        : null,
      label: label
        ? { fs: getComputedStyle(label).fontSize, color: getComputedStyle(label).color }
        : null,
      note: note
        ? { fs: getComputedStyle(note).fontSize, color: getComputedStyle(note).color }
        : null,
    };
  });

standTest.describe('ui-stat (T17.4)', () => {
  standTest(
    'матрица поверхностей: computed-пары и геометрия «как есть» (оригинал pages.css:806/815, holding.css)',
    async ({ stand }) => {
      const page = await stand('ui-stat');

      // База: primary — дефолт хука --ui-stat-surface (Notes), 16/24, шаг 8.
      const base = await stateOf(page, STAT.base);
      expect(base.bg, 'база: фон — primary (дефолт хука)').toBe('rgb(0, 40, 86)');
      expect(base.padding, 'база: паддинг 16/24 (канон holding)').toBe('16px 24px');
      expect(base.gap, 'база: шаг 8 (--ui-space-2)').toBe('8px');
      expect(base.radius, 'радиус md (= --radius-card оригинала)').toBe('16px');

      // --filled: primary + геометрия оригинала .company-stats__item (20/24, шаг 0).
      const filled = await stateOf(page, STAT.filled);
      expect(filled.bg, '--filled: фон — primary').toBe('rgb(0, 40, 86)');
      expect(filled.padding, '--filled: плашка 20/24 «как есть» (pages.css:806)').toBe('20px 24px');
      expect(filled.gap, '--filled: шаг значений оригинала — 0').toBe('0px');

      // --deep: surface-blue-deep (маппинг --color-blue-700), 24/20, шаг 12.
      const deep = await stateOf(page, STAT.deep);
      expect(deep.bg, '--deep: фон — blue-deep #164B89').toBe('rgb(22, 75, 137)');
      expect(deep.padding, '--deep: плашка 24/20 «как есть» (pages.css:815)').toBe('24px 20px');
      expect(deep.gap, '--deep: шаг 12 (--ui-space-3)').toBe('12px');

      // --glass: стекло glass-dark (альфа 0.1) + рамка on-dark-muted, 16, шаг 8.
      const glass = await stateOf(page, STAT.glass);
      expect(glass.bg, '--glass: фон — стекло white-10').toBe('rgba(255, 255, 255, 0.1)');
      expect(glass.borderColor, '--glass: рамка on-dark-muted (slate-400)').toBe(
        'rgb(143, 156, 191)',
      );
      expect(glass.borderWidth, '--glass: рамка --ui-border-width').toBe('1px');
      expect(glass.padding, '--glass: паддинг 16 «как есть» (пилот holding)').toBe('16px');
      expect(glass.gap, '--glass: шаг 8').toBe('8px');

      // Токен-хук: демо-инстанс перекрашен primary-deep без fork'а (Notes).
      const hook = await stateOf(page, STAT.surfaceHook);
      expect(hook.bg, 'хук --ui-stat-surface: база перекрашена primary-deep #152A4F').toBe(
        'rgb(21, 42, 79)',
      );
    },
  );

  standTest(
    'типографика значения — ролью (Implementation requirements п.2): __value перекрашивает, не переобъявляет',
    async ({ stand }) => {
      const page = await stand('ui-stat');

      // Значение несёт ui-h2: 60px/400 на desktop — размер тройка роли,
      // компонент fs/fw/lh не задаёт (inline-стилей нет, правило — только цвет).
      const filled = await stateOf(page, STAT.filled);
      expect(filled.value.fs, 'размер — от роли ui-h2 (xl 60px)').toBe('60px');
      expect(filled.value.fw, 'начертание — от роли (fw-h2 400)').toBe('400');
      expect(filled.value.lh, 'интерлиньяж — от роли (lh-h2 1.1)').toBe('66px');
      expect(filled.value.ownFs, 'компонент не диктует размер inline').toBe('');
      // Перекраска роли: ui-h2 красит в --ui-color-heading (primary #002856) —
      // на primary-плашке нечитаемо; __value держит text-on-dark.
      expect(filled.value.color, 'значение — text-on-dark (override роли)').toBe(
        'rgb(255, 255, 255)',
      );

      // --deep: значение — роль ui-h4 (преимущества), 28/500/1.25.
      const deep = await stateOf(page, STAT.deep);
      expect(deep.value.fs, '--deep: размер — от роли ui-h4').toBe('28px');
      expect(deep.value.fw, '--deep: fw-h4 500').toBe('500');
      expect(deep.value.color, '--deep: значение — text-on-dark').toBe('rgb(255, 255, 255)');
    },
  );

  standTest(
    'подпись/сноска: on-dark-muted по канону, --glass/--deep — text-on-dark оригинала; сноска fs-micro',
    async ({ stand }) => {
      const page = await stand('ui-stat');

      const base = await stateOf(page, STAT.base);
      expect(base.label.color, 'подпись базы — on-dark-muted (канон Context)').toBe(
        'rgb(143, 156, 191)',
      );
      const filled = await stateOf(page, STAT.filled);
      expect(
        filled.label.color,
        'подпись --filled — on-dark-muted (white-75% → AA-замена T2.3)',
      ).toBe('rgb(143, 156, 191)');
      expect(filled.label.fs, 'подпись — роль small в разметке (14px)').toBe('14px');

      const glass = await stateOf(page, STAT.glass);
      expect(glass.label.color, 'подпись --glass — text-on-dark (оригинал holding desc)').toBe(
        'rgb(255, 255, 255)',
      );
      // Сноска: fs-micro + on-dark-muted — прозрачность 0.72 maps на токен (Context).
      expect(glass.note.fs, 'сноска — fs-micro (12px)').toBe('12px');
      expect(glass.note.color, 'сноска — on-dark-muted (maps 0.72)').toBe('rgb(143, 156, 191)');

      const deep = await stateOf(page, STAT.deep);
      expect(deep.label.color, 'подпись --deep — text-on-dark (оригинал adv text)').toBe(
        'rgb(255, 255, 255)',
      );
    },
  );

  standTest(
    'контраст on-dark-пар непрозрачных вариантов ≥ 4.5:1 (сквозной с T2.3; стекло гейтит axe ниже)',
    async ({ stand }) => {
      const page = await stand('ui-stat');
      const assertAA = async (id, color, label) => {
        const state = await stateOf(page, id);
        const ratio = contrastRatio(color, state.bg);
        expect(ratio, `${label}: ${ratio.toFixed(2)}:1 ≥ 4.5`).toBeGreaterThanOrEqual(4.5);
      };
      await assertAA(STAT.base, 'rgb(255, 255, 255)', 'база: значение на primary');
      await assertAA(STAT.filled, 'rgb(255, 255, 255)', '--filled: значение на primary');
      await assertAA(
        STAT.filled,
        'rgb(143, 156, 191)',
        '--filled: подпись on-dark-muted на primary',
      );
      await assertAA(STAT.deep, 'rgb(255, 255, 255)', '--deep: значение на blue-deep');
      await assertAA(STAT.deep, 'rgb(255, 255, 255)', '--deep: подпись on-dark на blue-deep');
      await assertAA(STAT.surfaceHook, 'rgb(255, 255, 255)', 'хук: значение на primary-deep');
    },
  );

  standTest(
    'семантика: статы — ul/li, значение — span/h3 в пункте (Implementation requirements п.1)',
    async ({ stand }) => {
      const page = await stand('ui-stat');
      const glass = page.locator(`#${STAT.glass}`);
      await expect(glass).toHaveRole('listitem');
      await expect(glass.locator('..')).toHaveRole('list');
      // Заголовок преимущества — h3 (структура страницы сохраняется).
      await expect(page.locator(`#${STAT.deep} .ui-stat__value`)).toHaveRole('heading', {
        level: 3,
      });
    },
  );

  standTest(
    'axe: стенд чист — контраст стекла (эффективный фон) и семантика (AC)',
    async ({ stand }) => {
      const page = await stand('ui-stat');
      const results = await a11y(page).analyze();
      expect(
        results.violations.map(
          (violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`,
        ),
        'axe: violations = []',
      ).toEqual([]);
    },
  );

  standTest('эталоны 375/768/1280/1440 — только из контейнера (ADR-0004)', async ({ stand }) => {
    const page = await stand('ui-stat');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-stat', viewport });
    }
  });
});

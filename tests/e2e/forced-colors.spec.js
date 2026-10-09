/**
 * e2e forced-colors (Windows High Contrast, задача T9.2).
 *
 * Тесты first (Testing requirements T9.2: «forced-colors e2e пишется до
 * правок»). Поверхность — стенды ui-button / ui-field / ui-select / ui-card
 * (Scope T9.2: «кнопки/поля/карточки не теряют границы — system colors /
 * явные border»). Эмуляция — page.emulateMedia({ forcedColors: 'active' })
 * (Technical considerations T9.2); ручная сверка на Windows — протокол
 * a11y-спринта (дока отчёта T9.2).
 *
 * Почему важно: css-color-adjust в forced-colors подменяет авторские цвета
 * системными, НО полностью прозрачные значения сохраняет как есть
 * (transparent остаётся transparent). Кнопка/поле с рамкой
 * «2px solid transparent» теряет границу контура: остаётся заливка (тоже
 * подменённая) или вообще только текст — контрол перестаёт читаться как
 * контрол (гарантия v1.0, AC T9.2 «границы контролов видимы»).
 *
 * Критерий видимой границы: border-style ≠ none, border-width ≥ 1px и цвет
 * непрозрачный. В forced-colors computed-цвет может прийти и системным
 * ключевым словом (CanvasText/ButtonBorder — не парсится как rgba), и
 * разрешённым rgb() — непрозрачность проверяется по обеим формам.
 *
 * Вне проверки (осознанно): disabled-состояния — неактивные компоненты
 * исключены из контраст-требований (WCAG 1.4.3); триггер ui-dropdown —
 * «ненавязчивая кнопка-основа» без границы по контракту компонента (стиль
 * аффорданса — сайт, README); модалка/паттерны — панели на затемнении
 * сцены, не «кнопки/поля/карточки» Scope.
 */
import { expect } from '@playwright/test';

import { test as standTest } from '../helpers/harness.js';

/** Верхняя граница элемента: ширина (px), стиль и цвет computed. */
const borderOf = (locator) =>
  locator.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      width: Number.parseFloat(s.borderTopWidth),
      style: s.borderTopStyle,
      color: s.borderTopColor,
    };
  });

/** Цвет непрозрачен: не transparent и (если rgba —) альфа > 0. */
function isOpaque(color) {
  if (color.toLowerCase() === 'transparent') return false;
  const rgba = color.match(/^rgba?\(([^)]+)\)$/);
  if (!rgba) return true; // системное ключевое слово (CanvasText…) — непрозрачно
  const parts = rgba[1].split('/').pop().trim();
  if (!/^[0-9.]+$/.test(parts)) return true; // 'rgb(0, 0, 0)' — альфа опущена
  return Number(parts) > 0;
}

/** Граница контрала видима (AC T9.2): solid/двойная, ≥ 1px, непрозрачная. */
async function expectVisibleBorder(locator, label) {
  const border = await borderOf(locator);
  expect(border.style, `${label}: border-style (граница не снята)`).not.toBe('none');
  expect(
    border.width,
    `${label}: border-width ≥ 1px (факт ${border.width}px)`,
  ).toBeGreaterThanOrEqual(1);
  expect(isOpaque(border.color), `${label}: border-color непрозрачен (${border.color})`).toBe(true);
}

standTest.describe('forced-colors: active — границы контролов (T9.2)', () => {
  standTest('ui-button: граница каждого варианта видима', async ({ stand }) => {
    const page = await stand('ui-button');
    await page.emulateMedia({ forcedColors: 'active' });

    await expectVisibleBorder(page.locator('#ui-button-ghost'), 'ui-button (ghost)');
    await expectVisibleBorder(page.locator('#ui-button-primary'), 'ui-button--primary');
    await expectVisibleBorder(page.locator('#ui-button-accent'), 'ui-button--accent');
    await expectVisibleBorder(page.locator('#ui-button-outline'), 'ui-button--outline');
    await expectVisibleBorder(page.locator('#ui-button-light'), 'ui-button--light');
    await expectVisibleBorder(page.locator('#ui-button-primary-sm'), 'ui-button--primary--sm');
  });

  standTest('ui-field: граница input/textarea/select и поля ошибки видима', async ({ stand }) => {
    const page = await stand('ui-field');
    await page.emulateMedia({ forcedColors: 'active' });

    await expectVisibleBorder(page.locator('#uif-name'), 'ui-field__input text');
    await expectVisibleBorder(page.locator('#uif-about'), 'ui-field__textarea');
    await expectVisibleBorder(page.locator('#uif-city-select'), 'ui-field__select');
    await expectVisibleBorder(page.locator('#uif-login-err'), 'ui-field__input в --error');
  });

  standTest('ui-select: граница триггера и раскрытого списка видима', async ({ stand }) => {
    const page = await stand('ui-select');
    await page.emulateMedia({ forcedColors: 'active' });

    const trigger = page.locator('.ui-select__trigger').first();
    await expectVisibleBorder(trigger, 'ui-select__trigger');

    await trigger.click();
    const list = page.locator('.ui-select__list').first();
    await expect(list).toBeVisible();
    await expectVisibleBorder(list, 'ui-select__list');
  });

  standTest('ui-card: граница карточек (база/--filled/--hover) видима', async ({ stand }) => {
    const page = await stand('ui-card');
    await page.emulateMedia({ forcedColors: 'active' });

    await expectVisibleBorder(page.locator('#ui-card-default'), 'ui-card');
    await expectVisibleBorder(page.locator('#ui-card-filled'), 'ui-card--filled');
    await expectVisibleBorder(page.locator('#ui-card-hover'), 'ui-card--hover');
  });
});

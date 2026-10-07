/**
 * e2e T5.2 — нативный select, checkbox, radio (Testing requirements + AC).
 *
 * Поверхность — стенд showcase/pages/ui-field (секции select/checkbox/radio
 * T5.2; визуальные эталоны стенда снимает ui-field.spec.js — единый набор
 * эталонов на страницу). Проверяется:
 *  1. select: computed-стили коробки полей + appearance: none c фоновой
 *     стрелкой (Technical considerations — аффорданс не теряется);
 *  2. select управляется клавиатурой нативно, без JS и ARIA-костылей
 *     (AC: Alt+↓/Enter — базовая нативность); клик по label → фокус;
 *  3. select в состоянии error: рамка/фон ошибки + связность aria-describedby;
 *  4. checkbox: Space переключает нативно; клик по тексту label — тоже
 *     (AC); accent-color из primary (Scope);
 *  5. checkbox согласия: ссылка внутри label кликабельна и НЕ переключает
 *     чекбокс (Implementation requirements п.3 — label не перехватывает
 *     клики по a);
 *  6. radio: стрелки ↑↓←→ ходят по группе нативно (AC), группа —
 *     fieldset/legend, без tabindex;
 *  7. ошибка радио-группы: aria-describedby на fieldset ведёт на видимые
 *     hint/error, текст ошибки с role="alert" (Accessibility requirements);
 *  8. контраст (сквозной с T2.3): текст ошибки группы ≥ 4.5;
 *  9. axe: стенд чист (AC: label-связности зелёные).
 */
import { expect } from '@playwright/test';

import { a11y, test as standTest } from '../helpers/harness.js';
import { contrastRatio } from '../contrast/lib.mjs';

/** Идентификаторы/имена секции T5.2 на стенде (showcase/pages/ui-field). */
const SEL = {
  city: 'uif-city-select', // select, required
  source: 'uif-source-select', // select с hint
  cityErr: 'uif-city-select-err', // error-состояние
  cityDisabled: 'uif-city-select-disabled',
};
const CHK = {
  consent: 'uif-consent', // согласие с вложенной ссылкой (error-паттерн)
  empFull: 'uif-emp-full',
  empPart: 'uif-emp-part', // checked по умолчанию
  empIntern: 'uif-emp-int', // disabled
};
const RAD = {
  groupName: 'uif-format', // обычная группа: full/part/shift
  errName: 'uif-exp', // группа с ошибкой: yes/no
};

/** Цвета токенов дефолтной темы (примитивы, для computed-пинов). */
const COLORS = Object.freeze({
  surfaceMuted: 'rgb(241, 245, 254)', // --ui-blue-50
  surface: 'rgb(255, 255, 255)', // --ui-white
  primary: 'rgb(0, 40, 86)', // --ui-blue-800
  error: 'rgb(201, 58, 38)', // --ui-red-700
  errorBg: 'rgb(255, 246, 244)', // --ui-red-50
  text: 'rgb(31, 31, 31)', // --ui-black
});

/** Вычисленные стили контрола (пины состояний — конечные значения). */
const stateOf = (page, id) =>
  page.locator(`#${id}`).evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      minHeight: style.minHeight,
      borderRadius: style.borderRadius,
      appearance: style.appearance,
      backgroundImage: style.backgroundImage,
      backgroundPosition: style.backgroundPosition,
      paddingRight: style.paddingRight,
      accentColor: style.accentColor,
      color: style.color,
    };
  });

/** Каналы цвета в 0–255 (сериализация chromium — паттерн ui-field.spec). */
function colorOf(computed) {
  const rgb = computed.match(/^rgba?\(([^)]+)\)$/);
  if (!rgb) throw new Error(`неожиданная сериализация цвета: ${computed}`);
  const [r, g, b, a = 1] = rgb[1].split(',').map(Number);
  return { r, g, b, a };
}

/** Клавиатурный обход до элемента (фокус с клавиатуры — :focus-visible). */
async function tabTo(page, locator) {
  for (let step = 0; step < 80; step += 1) {
    if (await locator.evaluate((el) => el.matches(':focus-visible'))) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('фокус не дошёл до элемента за 80 Tab');
}

standTest.describe('ui-forms: select (T5.2)', () => {
  standTest(
    'computed-стили: коробка полей та же, appearance none со стрелкой-аффордансом',
    async ({ stand }) => {
      const page = await stand('ui-field');

      const select = await stateOf(page, SEL.city);
      expect(select.backgroundColor, 'фон поля — surface-muted').toBe(COLORS.surfaceMuted);
      expect(select.borderColor, 'рамка прозрачная (толщина зарезервирована)').toBe(
        'rgba(0, 0, 0, 0)',
      );
      expect(select.minHeight, 'min-height 52px — коробка .field__select').toBe('52px');
      expect(select.borderRadius, 'радиус sm').toBe('8px');
      expect(select.appearance, 'appearance: none — стрелку рисуем сами').toBe('none');
      expect(
        select.backgroundImage,
        'стрелка — фоновая svg (appearance none без индикатора запрещён)',
      ).toContain('data:image/svg+xml');
      expect(select.backgroundPosition, 'стрелка справа по центру').toContain('right');
      expect(
        select.paddingRight,
        'правый паддинг освобождает место под стрелку (32px = --ui-space-6)',
      ).toBe('32px');
    },
  );

  standTest(
    'нативность: без JS и ARIA-костылей; Alt+↓/Enter — базовая нативность, ↓ на закрытом select меняет значение',
    async ({ stand }) => {
      const page = await stand('ui-field');

      const select = page.locator(`#${SEL.city}`);
      await expect(select, 'нативный <select>').toHaveJSProperty('tagName', 'SELECT');
      for (const attr of ['role', 'aria-haspopup', 'tabindex', 'aria-expanded']) {
        expect(
          await select.getAttribute(attr),
          `нативность — без ${attr} (принцип ТЗ №16/17)`,
        ).toBeNull();
      }

      // Клик по label → фокус в select (связность for↔id).
      await page.locator(`label[for="${SEL.city}"]`).click();
      await expect(select).toBeFocused();

      // Alt+↓ открывает нативный список, ↓ двигает выделение, Enter выбирает:
      // независимо от того, открыл ли headless-браузер список, итог —
      // выбранное значение сместилось на второй пункт БЕЗ какого-либо JS.
      await page.keyboard.press('Alt+ArrowDown');
      await expect(select, 'фокус остаётся на select').toBeFocused();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      expect(await select.inputValue(), 'значение изменилось клавиатурой нативно').toBe('msk');
      await expect(select).toBeFocused();
    },
  );

  standTest(
    'error/disabled: рамка error + фон error-bg; ошибка связана aria-describedby (hint+error, role="alert"); disabled не фокусируется',
    async ({ stand }) => {
      const page = await stand('ui-field');

      const state = await stateOf(page, SEL.cityErr);
      expect(state.backgroundColor, 'фон error — error-bg').toBe(COLORS.errorBg);
      expect(state.borderColor, 'рамка error').toBe(COLORS.error);

      const select = page.locator(`#${SEL.cityErr}`);
      await expect(select).toHaveAttribute('aria-invalid', 'true');
      const ids = ((await select.getAttribute('aria-describedby')) ?? '')
        .split(/\s+/)
        .filter(Boolean);
      expect(ids.length, 'hint и error в describedby').toBe(2);
      for (const id of ids) {
        await expect(page.locator(`#${id}`), `цель ${id} видима`).toBeVisible();
        expect((await page.locator(`#${id}`).textContent()).trim().length).toBeGreaterThan(4);
      }
      await expect(page.locator(`#${ids[1]}`)).toHaveAttribute('role', 'alert');

      const disabled = page.locator(`#${SEL.cityDisabled}`);
      await expect(disabled).toBeDisabled();
      for (let step = 0; step < 60; step += 1) {
        await page.keyboard.press('Tab');
        expect(
          await disabled.evaluate((el) => document.activeElement === el),
          'Tab не фокусирует disabled select',
        ).toBe(false);
        if (await page.evaluate(() => document.activeElement === document.body)) break;
      }
    },
  );
});

standTest.describe('ui-forms: checkbox (T5.2)', () => {
  standTest(
    'Space переключает нативно (AC); клик по тексту label — тоже; accent-color из primary',
    async ({ stand }) => {
      const page = await stand('ui-field');

      const part = page.locator(`#${CHK.empPart}`);
      await part.focus();
      expect(await part.isChecked(), 'исходно включён').toBe(true);
      await page.keyboard.press('Space');
      expect(await part.isChecked(), 'Space выключил чекбокс нативно').toBe(false);
      await page.keyboard.press('Space');
      expect(await part.isChecked(), 'Space включил обратно').toBe(true);

      // accent-color — токен primary (Scope): computed-пин на обоих инпутах.
      for (const id of [CHK.empFull, CHK.empPart]) {
        const state = await stateOf(page, id);
        expect(state.accentColor, `${id}: accent-color — primary`).toBe(COLORS.primary);
      }

      // Клик по ТЕКСТУ label (не по инпуту) переключает — label-обёртка нативна.
      await page.locator(`label:has(#${CHK.empFull})`).click();
      expect(await page.locator(`#${CHK.empFull}`).isChecked(), 'клик по тексту включил').toBe(
        true,
      );

      // Disabled чекбокс недоступен нативно.
      await expect(page.locator(`#${CHK.empIntern}`)).toBeDisabled();
    },
  );

  standTest(
    'согласие с вложенной ссылкой: клик по ссылке НЕ переключает чекбокс и работает как ссылка (Implementation requirements п.3)',
    async ({ stand }) => {
      const page = await stand('ui-field');

      const consent = page.locator(`#${CHK.consent}`);
      await expect(consent, 'исходно выключен (требуется явное согласие)').not.toBeChecked();

      const link = page.locator(`label:has(#${CHK.consent}) a`).first();
      await link.click();
      await expect(link, 'клик дошёл до ссылки (а не до label→инпут)').toBeFocused();
      await expect(
        consent,
        'label не перехватил клик по a — чекбокс не переключился',
      ).not.toBeChecked();
      expect(page.url(), 'ссылка отработала (навигация по хэшу)').toContain('#uif-doc');

      // Чекбокс жив: переключение своим инпутом по-прежнему работает.
      await consent.check();
      await expect(consent).toBeChecked();
    },
  );

  standTest(
    'ошибка согласия: визуал и aria в одном паттерне обвязки (--error + describedby)',
    async ({ stand }) => {
      const page = await stand('ui-field');

      const consent = page.locator(`#${CHK.consent}`);
      await expect(consent).toHaveAttribute('aria-invalid', 'true');
      const errorId = (await consent.getAttribute('aria-describedby')) ?? '';
      const errorText = page.locator(`#${errorId}`);
      await expect(errorText, 'текст ошибки виден').toBeVisible();
      await expect(errorText).toHaveAttribute('role', 'alert');
      await expect(errorText).toContainText('соглас');
    },
  );
});

standTest.describe('ui-forms: radio (T5.2)', () => {
  standTest(
    'стрелки ↑↓←→ ходят по группе нативно (AC); группа — fieldset/legend; без tabindex',
    async ({ stand }) => {
      const page = await stand('ui-field');

      const group = page.locator('fieldset:has(input[name="uif-format"])');
      await expect(group.locator('legend'), 'у группы есть legend').toContainText('Формат работы');

      const radios = group.locator(`input[name="${RAD.groupName}"]`);
      expect(await radios.count(), 'группа из трёх вариантов').toBe(3);
      for (let i = 0; i < 3; i += 1) {
        expect(
          await radios.nth(i).getAttribute('tabindex'),
          'нативный roving — без tabindex',
        ).toBeNull();
      }

      await radios.nth(0).click(); // выбор первого — фокус и checked нативно
      await expect(radios.nth(0)).toBeChecked();
      await expect(radios.nth(0)).toBeFocused();

      await page.keyboard.press('ArrowRight');
      await expect(radios.nth(1), '→ выбрал следующий').toBeChecked();
      await expect(radios.nth(1)).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(radios.nth(2), '↓ выбрал следующий').toBeChecked();
      await expect(radios.nth(2)).toBeFocused();
      await page.keyboard.press('ArrowLeft');
      await expect(radios.nth(1), '← вернулся назад').toBeChecked();
      await expect(radios.nth(1)).toBeFocused();
      await page.keyboard.press('ArrowUp');
      await expect(radios.nth(0), '↑ вернулся к первому').toBeChecked();
      await expect(radios.nth(0)).toBeFocused();
    },
  );

  standTest(
    'ошибка группы: aria-describedby на fieldset → видимые hint+error; role="alert"; required нативный; accent-color primary',
    async ({ stand }) => {
      const page = await stand('ui-field');

      const group = page.locator('fieldset:has(input[name="uif-exp"])');
      const describedby = (await group.getAttribute('aria-describedby')) ?? '';
      const ids = describedby.split(/\s+/).filter(Boolean);
      expect(ids.length, 'hint и error в описании группы').toBe(2);
      for (const id of ids) {
        await expect(page.locator(`#${id}`), `цель ${id} видима`).toBeVisible();
      }
      await expect(page.locator(`#${ids[1]}`)).toHaveAttribute('role', 'alert');

      const yes = page.locator(`input[name="${RAD.errName}"][value="yes"]`);
      await expect(yes).toHaveJSProperty('required', true);
      const state = await stateOf(page, `input[name="${RAD.errName}"][value="yes"]`);
      expect(state.accentColor, 'accent-color радио — primary').toBe(COLORS.primary);
    },
  );

  standTest(
    'контраст (сквозной с T2.3): текст ошибки группы и текст ярлыков ≥ 4.5 на белом',
    async ({ stand }) => {
      const page = await stand('ui-field');

      const errorState = await page.locator('#uif-exp-error').evaluate((el) => {
        const style = getComputedStyle(el);
        return { color: style.color, backgroundColor: style.backgroundColor };
      });
      const ratio = contrastRatio(colorOf(errorState.color), colorOf(COLORS.surface));
      expect(ratio, `ошибка на белом: ${ratio.toFixed(2)}:1 ≥ 4.5`).toBeGreaterThanOrEqual(4.5);

      const labelColor = await page
        .locator('fieldset:has(input[name="uif-format"]) label.ui-radio')
        .first()
        .evaluate((el) => getComputedStyle(el).color);
      const labelRatio = contrastRatio(colorOf(labelColor), colorOf(COLORS.surface));
      expect(
        labelRatio,
        `текст ярлыка на белом: ${labelRatio.toFixed(2)}:1 ≥ 4.5`,
      ).toBeGreaterThanOrEqual(4.5);
    },
  );
});

standTest.describe('ui-forms: axe (T5.2)', () => {
  standTest(
    'axe: стенд чист — label-связности зелёные, известных исключений нет (AC)',
    async ({ stand }) => {
      const page = await stand('ui-field');
      const results = await a11y(page).analyze();
      expect(
        results.violations.map(
          (violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`,
        ),
        'axe: violations = []',
      ).toEqual([]);
    },
  );
});

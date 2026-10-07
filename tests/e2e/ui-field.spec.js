/**
 * e2e ui-field (T5.1; Testing requirements + AC).
 *
 * Поверхность — стенд showcase/pages/ui-field (типы input × textarea ×
 * состояния). Проверяется:
 *  1. матрица: computed-стили контролов из токенов (фон surface-muted,
 *     прозрачная рамка, min-height 52px — НЕ height, радиус sm, тройка small;
 *     textarea — свой min-height 120px и resize: vertical);
 *  2. клик по label → фокус в поле (AC, связность for↔id);
 *  3. фокус с клавиатуры: фирменный паттерн поля (bg → surface, рамка →
 *     primary — career-portal .field__input:focus) ПЛЮС глобальный outline
 *     политики ADR-0001 — дополняет, не заменяет (Technical considerations);
 *  4. ошибка связана aria: aria-invalid="true", aria-describedby ведёт на
 *     видимый текст ошибки с role="alert" (AC); hint в том же списке
 *     describedby;
 *  5. required-маркер не только цветом: нативный required + звёздочка
 *     aria-hidden + текст «обязательное поле» в a11y-дереве;
 *  6. disabled — не фокусируется нативно; readonly — фокусируется, значение
 *     не редактируется (нативно, без JS);
 *  7. placeholder ≠ label на каждом поле стенда с placeholder (правило доки);
 *  8. 32px-сценарий (AC, T3.6): min-height растёт вместе с rem-базой, значение
 *     не обрезается (scrollHeight/scrollWidth ≤ client*);
 *  9. контраст (сквозной с T2.3): текст ошибки на белом ≥ 4.5, hint и
 *     placeholder (muted) ≥ 4.5, значение поля на error-bg ≥ 4.5;
 * 10. axe: стенд чист — известных исключений нет (AC: label-rule без нарушений);
 * 11. эталоны 375/768/1280/1440 — только из контейнера/CI (ADR-0004).
 *
 * Гейт масштабирования T3.6 (data-ui-check-layout/CHECK_STANDS) сознательно
 * не расширяется: 32px-сценарий AC T5.1 живёт здесь локально (сцена «поле»),
 * подключение стенда к релизному гейту — решение формы целиком (T5.4/T5.6).
 */
import { expect } from '@playwright/test';

import { contrastRatio } from '../contrast/lib.mjs';
import { a11y, shot, test as standTest, VIEWPORTS } from '../helpers/harness.js';

/** Идентификаторы полей стенда (showcase/pages/ui-field/index.html). */
const FLD = {
  name: 'uif-name', // text, required
  email: 'uif-email', // email, placeholder + hint
  about: 'uif-about', // textarea
  loginErr: 'uif-login-err', // error-состояние: hint + error в describedby
  cityDisabled: 'uif-city-disabled',
  cityReadonly: 'uif-city-readonly',
};

/** Цвета токенов дефолтной темы (примитивы, для computed-пинов). */
const COLORS = Object.freeze({
  surfaceMuted: 'rgb(241, 245, 254)', // --ui-blue-50
  surface: 'rgb(255, 255, 255)', // --ui-white
  primary: 'rgb(0, 40, 86)', // --ui-blue-800
  error: 'rgb(201, 58, 38)', // --ui-red-700
  errorBg: 'rgb(255, 246, 244)', // --ui-red-50
  muted: 'rgb(97, 97, 97)', // --ui-gray-700
  text: 'rgb(31, 31, 31)', // --ui-black
});

/** Клавиатурный обход до элемента (фокус с клавиатуры — :focus-visible, ADR-0001). */
async function tabTo(page, locator) {
  for (let step = 0; step < 60; step += 1) {
    if (await locator.evaluate((el) => el.matches(':focus-visible'))) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('фокус не дошёл до элемента за 60 Tab');
}

/** Вычисленные стили контрола (пины состояний — конечные значения). */
const stateOf = (page, id) =>
  page.locator(`#${id}`).evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      minHeight: style.minHeight,
      height: style.height,
      borderRadius: style.borderRadius,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontFamily: style.fontFamily,
      color: style.color,
      resize: style.resize,
      opacity: style.opacity,
      cursor: style.cursor,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      focusVisible: el.matches(':focus-visible'),
    };
  });

/** Цвет псевдоэлемента placeholder. */
const placeholderColorOf = (page, id) =>
  page
    .locator(`#${id}`)
    .evaluate((el) => getComputedStyle(el, '::placeholder').getPropertyValue('color'));

/** Каналы цвета в 0–255 (сериализация chromium rgb() — паттерн ui-button.spec). */
function colorOf(computed) {
  const rgb = computed.match(/^rgba?\(([^)]+)\)$/);
  if (!rgb) throw new Error(`неожиданная сериализация цвета: ${computed}`);
  const [r, g, b, a = 1] = rgb[1].split(',').map(Number);
  return { r, g, b, a };
}

/** Эффективный фон: собственный непрозрачный, иначе подложка страницы (белая). */
const backdropOf = (state) =>
  colorOf(state.backgroundColor).a === 1
    ? colorOf(state.backgroundColor)
    : colorOf('rgb(255, 255, 255)');

standTest.describe('ui-field: матрица и состояния (T5.1)', () => {
  standTest(
    'матрица: computed-стили контролов из токенов — min-height (не height), surface-muted, прозрачная рамка, sm-радиус, тройка small',
    async ({ stand }) => {
      const page = await stand('ui-field');

      const input = await stateOf(page, FLD.name);
      expect(input.backgroundColor, 'фон поля — surface-muted (blue-50 одобренного)').toBe(
        COLORS.surfaceMuted,
      );
      expect(input.borderColor, 'рамка прозрачная (толщина зарезервирована)').toBe('rgba(0, 0, 0, 0)');
      expect(input.minHeight, 'min-height — --ui-field-height (52px одобренного, rem)').toBe('52px');
      expect(input.borderRadius, 'радиус --ui-radius-sm (8px = radius-small career-portal)').toBe('8px');
      expect(input.fontSize, 'fs-small (14px, как label career-portal)').toBe('14px');
      expect(input.fontFamily, 'поле не остаётся на UA-шрифте').toContain('Golos Text');
      expect(input.opacity, 'default без затемнения').toBe('1');

      // Фактическая высота = min-height (контент однострочного поля меньше).
      const box = await page.locator(`#${FLD.name}`).boundingBox();
      expect(Math.abs(box.height - 52), `высота поля = 52px (факт ${box.height})`).toBeLessThanOrEqual(0.5);

      const textarea = await stateOf(page, FLD.about);
      expect(textarea.minHeight, 'textarea — свой min-height (--ui-field-textarea-min-height, 120px)').toBe('120px');
      expect(textarea.resize, 'resize: vertical (Scope T5.1)').toBe('vertical');
      const textareaBox = await page.locator(`#${FLD.about}`).boundingBox();
      expect(
        textareaBox.height,
        'textarea без фикс. высоты: растёт по контенту (≥ 120px)',
      ).toBeGreaterThanOrEqual(120);
    },
  );

  standTest('клик по label → фокус в поле (AC: связность for↔id)', async ({ stand }) => {
    const page = await stand('ui-field');

    await page.locator(`label[for="${FLD.email}"]`).click();
    await expect(page.locator(`#${FLD.email}`), 'нативная связка label→input').toBeFocused();
  });

  standTest(
    'фокус с клавиатуры: фирменный bg-swap + рамка primary (паттерн career-portal) ПЛЮС глобальный outline ADR-0001',
    async ({ stand }) => {
      const page = await stand('ui-field');

      const input = page.locator(`#${FLD.name}`);
      await tabTo(page, input);
      // Переход bg/border анимирован (--ui-transition): ждём устоявшийся кадр.
      await expect(async () => {
        const settled = await stateOf(page, FLD.name);
        expect(settled.focusVisible, 'фокус пришёл с клавиатуры').toBe(true);
        expect(settled.backgroundColor, 'фон → surface (белый)').toBe(COLORS.surface);
      }).toPass({ timeout: 5000 });
      const state = await stateOf(page, FLD.name);
      expect(state.focusVisible, 'фокус пришёл с клавиатуры').toBe(true);
      expect(state.backgroundColor, 'фон → surface (белый) — фирменный паттерн поля').toBe(
        COLORS.surface,
      );
      expect(state.borderColor, 'рамка → primary — фирменный паттерн поля').toBe(COLORS.primary);
      expect(state.outlineStyle, 'outline НЕ заменён — глобальная политика ADR-0001').toBe('solid');
      expect(state.outlineWidth, 'ширина outline — --ui-focus-width (3px)').toBe('3px');
      expect(state.outlineColor, 'цвет outline — --ui-focus-color (primary)').toBe(COLORS.primary);
    },
  );

  standTest(
    'ошибка связана aria (AC): aria-invalid, describedby ведёт на видимый текст role="alert"; hint в том же списке',
    async ({ stand }) => {
      const page = await stand('ui-field');

      const input = page.locator(`#${FLD.loginErr}`);
      await expect(input).toHaveAttribute('aria-invalid', 'true');

      const describedby = await input.getAttribute('aria-describedby');
      const ids = (describedby ?? '').split(/\s+/).filter(Boolean);
      expect(ids.length, 'aria-describedby перечисляет hint и error').toBe(2);

      for (const id of ids) {
        const target = page.locator(`#${id}`);
        await expect(target, `цель ${id} существует в DOM`).toHaveCount(1);
        await expect(target, `цель ${id} видима`).toBeVisible();
        expect(
          (await target.textContent()).trim().length,
          `цель ${id} несёт текст`,
        ).toBeGreaterThan(5);
      }

      const errorText = page.locator(`#${ids[1]}`);
      await expect(errorText).toHaveAttribute('role', 'alert');
      await expect(errorText, 'текст ошибки виден (объявляется скринридером)').toContainText(
        /./,
      );
    },
  );

  standTest(
    'required-маркер не только цветом: нативный required, звёздочка aria-hidden, текст «обязательное поле» в a11y-дереве',
    async ({ stand }) => {
      const page = await stand('ui-field');

      const input = page.locator(`#${FLD.name}`);
      await expect(input).toHaveJSProperty('required', true);

      const req = page.locator(`label[for="${FLD.name}"] .ui-field__req`);
      await expect(req.locator('[aria-hidden="true"]')).toHaveText('*');

      const srText = req.locator('.ui-field__req-text');
      await expect(srText).toHaveText('обязательное поле');
      // Текст доступен скринридеру: скрыт клипом, не display:none.
      const hidden = await srText.evaluate((el) => {
        const style = getComputedStyle(el);
        return { display: style.display, clipPath: style.clipPath };
      });
      expect(hidden.display, 'display:none убрал бы текст из a11y-дерева').not.toBe('none');
      expect(hidden.clipPath, 'визуально скрыт clip-path').toContain('inset');
    },
  );

  standTest('disabled: не фокусируется (Tab обход); readonly: фокусируется, но значение не редактируется', async ({
    stand,
  }) => {
    const page = await stand('ui-field');

    const disabled = page.locator(`#${FLD.cityDisabled}`);
    await expect(disabled).toBeDisabled();
    await expect(disabled).toHaveJSProperty('readOnly', false);
    // Клавиатурный обход: последовательный Tab ни разу не оставляет фокус на disabled.
    for (let step = 0; step < 40; step += 1) {
      await page.keyboard.press('Tab');
      const onDisabled = await disabled.evaluate((el) => document.activeElement === el);
      expect(onDisabled, 'Tab не фокусирует disabled').toBe(false);
      if (await page.evaluate(() => document.activeElement === document.body)) break;
    }

    const readonly = page.locator(`#${FLD.cityReadonly}`);
    await expect(readonly).toHaveJSProperty('readOnly', true);
    const before = await readonly.inputValue();
    await readonly.click();
    await expect(readonly, 'readonly фокусируется (значение выделяется, копируется)').toBeFocused();
    await page.keyboard.type('Новосибирск');
    expect(await readonly.inputValue(), 'нативный readonly: клавиатура не меняет значение').toBe(
      before,
    );
  });

  standTest(
    'placeholder ≠ label на каждом поле с placeholder (правило доки); autocomplete не отключён (WCAG 1.3.5)',
    async ({ stand }) => {
      const page = await stand('ui-field');

      const problems = await page.evaluate(() => {
        const issues = [];
        for (const input of document.querySelectorAll('main .ui-field__input, main .ui-field__textarea')) {
          const id = input.id;
          const label = (input.labels?.[0]?.textContent ?? '').replace(/\s+/g, ' ').trim();
          const placeholder = input.getAttribute('placeholder');
          if (!label) issues.push(`${id}: нет label`);
          if (placeholder && placeholder.trim() === label) {
            issues.push(`${id}: placeholder дублирует label («${placeholder}»)`);
          }
          const autocomplete = input.getAttribute('autocomplete');
          if (autocomplete === 'off') issues.push(`${id}: autocomplete="off" — политика WCAG 1.3.5`);
        }
        return issues;
      });
      expect(problems, 'политика доки исполнена на стенде').toEqual([]);
    },
  );

  standTest('32px-сценарий (AC, T3.6): min-height растёт с rem-базой, значение не обрезается', async ({
    stand,
  }) => {
    const page = await stand('ui-field');

    const input = page.locator(`#${FLD.name}`);
    await input.fill('Иванов Иван Иванович — длинное значение для проверки');
    const before = await stateOf(page, FLD.name);
    expect(before.minHeight, 'база 16px: min-height 52px').toBe('52px');

    await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });
    await expect
      .poll(() => page.locator(`#${FLD.name}`).evaluate((el) => getComputedStyle(el).fontSize))
      .toBe('28px');

    const after = await stateOf(page, FLD.name);
    expect(after.minHeight, 'min-height в rem: 3.25rem × 32px = 104px').toBe('104px');

    const metrics = await page.locator(`#${FLD.name}`).evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      height: el.getBoundingClientRect().height,
    }));
    expect(metrics.height, 'поле выросло вместе с базой (не зафиксировано height: 52px)').toBeGreaterThan(80);
    expect(
      metrics.scrollHeight,
      'значение не обрезается по вертикали (Implementation requirements п.1)',
    ).toBeLessThanOrEqual(metrics.clientHeight);
    expect(metrics.scrollWidth, 'значение не обрезается по горизонтали').toBeLessThanOrEqual(
      metrics.clientWidth,
    );
  });

  standTest(
    'контраст (сквозной с T2.3): ошибка/hint/placeholder/значение на error-bg ≥ 4.5',
    async ({ stand }) => {
      const page = await stand('ui-field');

      // Текст ошибки на белом (текст прозрачен — фон берём с подложки страницы).
      const errorState = await page
        .locator(`#${FLD.loginErr}-error`)
        .evaluate((el) => {
          const style = getComputedStyle(el);
          return { color: style.color, backgroundColor: style.backgroundColor };
        });
      const errorRatio = contrastRatio(
        colorOf(errorState.color),
        backdropOf({ backgroundColor: errorState.backgroundColor }),
      );
      expect(errorRatio, `ошибка на белом: ${errorRatio.toFixed(2)}:1 ≥ 4.5`).toBeGreaterThanOrEqual(4.5);

      const hintText = await page
        .locator(`#${FLD.email}-hint`)
        .evaluate((el) => getComputedStyle(el).color);
      const hintRatio = contrastRatio(colorOf(hintText), colorOf(COLORS.surface));
      expect(hintRatio, `hint на белом: ${hintRatio.toFixed(2)}:1 ≥ 4.5`).toBeGreaterThanOrEqual(4.5);

      const placeholder = await placeholderColorOf(page, FLD.email);
      const placeholderRatio = contrastRatio(colorOf(placeholder), colorOf(COLORS.surfaceMuted));
      expect(
        placeholderRatio,
        `placeholder на surface-muted: ${placeholderRatio.toFixed(2)}:1 ≥ 4.5`,
      ).toBeGreaterThanOrEqual(4.5);

      const errField = await stateOf(page, FLD.loginErr);
      expect(errField.backgroundColor, 'фон error-поля — error-bg').toBe(COLORS.errorBg);
      expect(errField.borderColor, 'рамка error-поля — error').toBe(COLORS.error);
      const valueRatio = contrastRatio(colorOf(errField.color), colorOf(COLORS.errorBg));
      expect(valueRatio, `значение на error-bg: ${valueRatio.toFixed(2)}:1 ≥ 4.5`).toBeGreaterThanOrEqual(4.5);
    },
  );

  standTest('axe: стенд чист — известных исключений нет (AC: label-rule без нарушений)', async ({
    stand,
  }) => {
    const page = await stand('ui-field');
    const results = await a11y(page).analyze();
    expect(
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`),
      'axe: violations = []',
    ).toEqual([]);
  });

  standTest('эталоны ui-field 375/768/1280/1440 — только из контейнера (ADR-0004)', async ({
    stand,
  }) => {
    const page = await stand('ui-field');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-field', viewport });
    }
  });
});

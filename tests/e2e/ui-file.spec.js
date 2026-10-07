/**
 * e2e ui-file (T5.3; Testing requirements + AC).
 *
 * Поверхность — стенд showcase/pages/ui-file (пусто / выбран-демо / ошибка /
 * disabled). Проверяется:
 *  1. матрица: computed-стили коробки одобренного .field__file (bg
 *     surface-muted, radius sm, 52px min-height), кнопки .btn--light
 *     (primary, pill), hint micro/muted, reset sm;
 *  2. sr-only-инвариант: input скрыт КЛИПОМ (1px, absolute, clip-path) —
 *     НЕ display:none/visibility:hidden (класс D аудита career-portal);
 *  3. Tab достигает инпута; фокус видим: обводку рисует кнопка-лейбл через
 *     :has (тройка токенов ADR-0001) — Technical considerations T5.3;
 *  4. клик по кнопке-лейблу: activeElement = input (нативная label-активация,
 *     Implementation requirements п.1); отмена диалога (Escape-сценарий п.2)
 *     состояние не ломает; повторный выбор работает;
 *  5. выбор файла (setInputFiles): имя + размер в ui-file__value
 *     (role="status" — озвучивание, Implementation requirements п.3);
 *     повторный выбор обновляет значение; кнопка сброса появляется;
 *  6. сброс: значение «Файл не выбран», files очищен, фокус возвращён на
 *     инпут (кнопка исчезает — фокус не теряется в body);
 *  7. disabled: Tab не фокусирует, коробка приглушена токеном, chooser не
 *     открывается;
 *  8. ошибка связана aria (aria-invalid, describedby → hint + error role="alert");
 *  9. axe: стенд чист — известных исключений нет (AC);
 * 10. эталоны 375/768/1280/1440 — только из контейнера/CI (ADR-0004).
 */
import { expect } from '@playwright/test';

import { a11y, shot, test as standTest, VIEWPORTS } from '../helpers/harness.js';

/** Идентификаторы стендовых инстансов (showcase/pages/ui-file/index.html). */
const IDS = {
  file: 'uifl-file', // живой инстанс «пусто»
  box: 'uifl-file-box',
  fileErr: 'uifl-file-err', // живой инстанс «ошибка»
  boxDemo: 'uifl-demo-box', // демо «выбран» (статичная разметка, без JS-хука)
  fileDisabled: 'uifl-file-disabled', // живой инстанс «disabled»
  boxDisabled: 'uifl-disabled-box',
};

/** Цвета токенов дефолтной темы (примитивы, для computed-пинов). */
const COLORS = Object.freeze({
  surfaceMuted: 'rgb(241, 245, 254)', // --ui-blue-50
  primary: 'rgb(0, 40, 86)', // --ui-blue-800
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

/** Вычисленные стили узла по селектору. */
const styleOf = (page, selector, rootSelector = null) =>
  page.locator(rootSelector ?? 'body').evaluate(
    (root, [sel]) => {
      const el = root.querySelector(sel);
      const style = getComputedStyle(el);
      return {
        display: style.display,
        position: style.position,
        opacity: style.opacity,
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        minHeight: style.minHeight,
        gap: style.gap,
        padding: style.padding,
        width: style.width,
        height: style.height,
        overflow: style.overflow,
        clipPath: style.clipPath,
        color: style.color,
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        cursor: style.cursor,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineColor: style.outlineColor,
      };
    },
    [selector],
  );

standTest.describe('ui-file: доступный файловый инпут (T5.3)', () => {
  standTest(
    'матрица: computed-стили — коробка .field__file (surface-muted, sm, 52px), кнопка .btn--light (primary, pill), hint micro/muted, reset sm',
    async ({ stand }) => {
      const page = await stand('ui-file');

      const box = await styleOf(page, `#${IDS.box}`);
      expect(box.display, 'флекс-коробка career-portal').toBe('flex');
      expect(box.backgroundColor, 'фон surface-blue-50 одобренного .field__file').toBe(
        COLORS.surfaceMuted,
      );
      expect(box.borderRadius, 'радиус --ui-radius-sm').toBe('8px');
      expect(box.minHeight, '52px одобренного — min-height (не height)').toBe('52px');
      expect(box.gap, 'gap 12px одобренного').toBe('12px');
      expect(box.padding, 'padding 4px 16px одобренного').toBe('4px 16px');

      const button = await styleOf(page, `#${IDS.box} .ui-file__button`);
      expect(button.color, 'подпись primary одобренного .btn--light').toBe(COLORS.primary);
      expect(button.fontSize, 'тройка small (14px)').toBe('14px');
      expect(button.fontFamily, 'кнопка не остаётся на UA-шрифте').toContain('Golos Text');
      expect(button.borderRadius, 'pill одобренного .btn').toBe('100px');
      expect(button.minHeight, 'кнопка внутри 52px-коробки (52 − 2×4 паддинг)').toBe('44px');
      expect(button.cursor, 'аффорданс кнопки').toBe('pointer');

      const value = await styleOf(page, `#${IDS.box} .ui-file__value`);
      expect(value.color, 'значение — цвет текста').toBe(COLORS.text);
      expect(value.fontSize, 'тройка small').toBe('14px');

      const hint = await styleOf(page, `#${IDS.box} .ui-file__hint`);
      expect(hint.color, 'подсказка muted').toBe(COLORS.muted);
      expect(hint.fontSize, 'fs-micro (12px)').toBe('12px');

      const reset = page.locator(`#${IDS.box} .ui-file__reset`);
      await expect(reset, 'до выбора кнопка сброса скрыта').toBeHidden();
      expect(await styleOf(page, `#${IDS.box} .ui-file__reset`).then((s) => s.minHeight)).toBe(
        '32px',
      );
    },
  );

  standTest(
    'sr-only-инвариант (класс D аудита): input скрыт клипом — НЕ display:none/visibility:hidden/opacity',
    async ({ stand }) => {
      const page = await stand('ui-file');

      const input = await styleOf(page, `#${IDS.file}`);
      expect(input.display, 'display:none убрал бы контрол из клавиатуры').not.toBe('none');
      expect(input.position, 'вне потока (не ломает коробку)').toBe('absolute');
      expect(input.width, 'классический sr-only: бокс 1px').toBe('1px');
      expect(input.height).toBe('1px');
      expect(
        input.overflow,
        'переполнение гасится (UA нормализует hidden → clip на инпутах — обе формы безразличны для клипа)',
      ).toMatch(/^(hidden|clip)$/);
      expect(input.clipPath, 'клип — контрол остаётся в tab-порядке и a11y-дереве').toContain(
        'inset(50%)',
      );

      // Инпут реально фокусируем: программный фокус доходит (Tab-сценарий ниже).
      await page.locator(`#${IDS.file}`).focus();
      await expect(page.locator(`#${IDS.file}`)).toBeFocused();
    },
  );

  standTest(
    'Tab достигает инпута; фокус видим: обводку рисует кнопка-лейбл через :has (тройка ADR-0001)',
    async ({ stand }) => {
      const page = await stand('ui-file');

      const input = page.locator(`#${IDS.file}`);
      await tabTo(page, input);
      await expect(input, 'нативный инпут в tab-порядке').toBeFocused();

      const focus = await input.evaluate((el) => {
        const button = getComputedStyle(el.closest('label.ui-file__button'));
        return {
          inputFocusVisible: el.matches(':focus-visible'),
          outlineStyle: button.outlineStyle,
          outlineWidth: button.outlineWidth,
          outlineColor: button.outlineColor,
        };
      });
      expect(focus.inputFocusVisible, 'фокус пришёл с клавиатуры').toBe(true);
      expect(focus.outlineStyle, 'видимый фокус НЕ погашен (ADR-0001)').toBe('solid');
      expect(focus.outlineWidth, 'ширина --ui-focus-width (3px)').toBe('3px');
      expect(focus.outlineColor, 'цвет --ui-focus-color (primary)').toBe(COLORS.primary);
    },
  );

  standTest(
    'клик по кнопке-лейблу: activeElement = input; отмена диалога (Escape-сценарий) состояние не ломает — повторный выбор работает',
    async ({ stand }) => {
      const page = await stand('ui-file');

      const value = page.locator(`#${IDS.box} .ui-file__value`);
      await expect(value).toHaveText('Файл не выбран');

      let choosers = 0;
      const countChoosers = (chooser) => {
        choosers += 1; // файл сознательно НЕ выбираем — имитация отмены/Escape
        void chooser;
      };
      page.on('filechooser', countChoosers);

      await page.locator(`#${IDS.box} .ui-file__button-text`).click();
      await expect(
        page.locator(`#${IDS.file}`),
        'activeElement = input (нативная активация label)',
      ).toBeFocused();
      expect(choosers, 'диалог выбора открылся').toBe(1);
      await expect(value, 'отмена диалога: состояние не изменилось').toHaveText('Файл не выбран');

      // Повторный выбор после отмены работает (Implementation requirements п.2).
      page.removeAllListeners('filechooser');
      await page.locator(`#${IDS.file}`).setInputFiles({
        name: 'resume.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.alloc(250880, 1), // ровно 245 КБ
      });
      await expect(value, 'после отмены выбор выполняется').toHaveText(
        'Выбран файл: resume.pdf, 245 КБ',
      );
    },
  );

  standTest(
    'выбор файла (setInputFiles): имя + размер в __value (role="status" — озвучивание); повторный выбор обновляет; кнопка сброса появляется',
    async ({ stand }) => {
      const page = await stand('ui-file');

      const value = page.locator(`#${IDS.box} .ui-file__value`);
      const reset = page.locator(`#${IDS.box} .ui-file__reset`);
      await expect(value).toHaveAttribute('role', 'status', 'контейнер значения — живая область');

      await page.locator(`#${IDS.file}`).setInputFiles({
        name: 'resume.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.alloc(250880, 1),
      });
      await expect(value, 'имя и размер файла в DOM (объявляется скринридером)').toHaveText(
        'Выбран файл: resume.pdf, 245 КБ',
      );
      await expect(reset, 'кнопка сброса появилась').toBeVisible();

      // Повторный выбор: value обновляется (Implementation requirements п.2).
      await page.locator(`#${IDS.file}`).setInputFiles({
        name: 'motivation.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: Buffer.alloc(1536, 2),
      });
      await expect(value, 'повторный выбор обновляет значение').toHaveText(
        'Выбран файл: motivation.docx, 1,5 КБ',
      );
    },
  );

  standTest(
    'сброс: значение «Файл не выбран», files очищен, фокус возвращён на инпут (кнопка исчезает — фокус не теряется)',
    async ({ stand }) => {
      const page = await stand('ui-file');

      await page.locator(`#${IDS.file}`).setInputFiles({
        name: 'resume.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.alloc(250880, 1),
      });
      const reset = page.locator(`#${IDS.box} .ui-file__reset`);
      await expect(reset).toBeVisible();

      await reset.click();
      await expect(page.locator(`#${IDS.box} .ui-file__value`)).toHaveText('Файл не выбран');
      await expect(reset, 'кнопка сброса скрыта снова').toBeHidden();
      expect(
        await page.locator(`#${IDS.file}`).evaluate((el) => el.files.length),
        'нативная очистка value',
      ).toBe(0);
      await expect(
        page.locator(`#${IDS.file}`),
        'фокус перенесён на контрол, а не потерян в body',
      ).toBeFocused();
    },
  );

  standTest(
    'disabled: Tab не фокусирует; кнопка-лейбл приглушена токеном (значение/подсказка полноконтрастны); диалог не открывается',
    async ({ stand }) => {
      const page = await stand('ui-file');

      const input = page.locator(`#${IDS.fileDisabled}`);
      await expect(input).toBeDisabled();
      expect(
        await styleOf(page, `#${IDS.boxDisabled} .ui-file__button`).then((s) => s.opacity),
        'видимый аффорданс гаснет (--ui-opacity-disabled, аналог затемнения инпута ui-field)',
      ).toBe('0.3');
      expect(
        await styleOf(page, `#${IDS.boxDisabled} .ui-file__button`).then((s) => s.cursor),
        'курсор кнопки default',
      ).toBe('default');
      expect(
        await styleOf(page, `#${IDS.boxDisabled} .ui-file__value`).then((s) => s.opacity),
        'информационный текст не затемняется (axe color-contrast учитывает opacity предка)',
      ).toBe('1');

      let choosers = 0;
      page.on('filechooser', () => {
        choosers += 1;
      });
      // force: Playwright считает click-цель «not enabled» (label disabled-инпута) —
      // реальный клик всё равно диспатчится, браузер игнорирует активацию disabled.
      await page.locator(`#${IDS.boxDisabled} .ui-file__button-text`).click({ force: true });
      await page.waitForTimeout(300);
      expect(choosers, 'disabled не открывает диалог').toBe(0);

      // Клавиатурный обход: последовательный Tab ни разу не оставляет фокус на disabled.
      for (let step = 0; step < 40; step += 1) {
        await page.keyboard.press('Tab');
        const onDisabled = await input.evaluate((el) => document.activeElement === el);
        expect(onDisabled, 'Tab не фокусирует disabled').toBe(false);
        if (await page.evaluate(() => document.activeElement === document.body)) break;
      }
    },
  );

  standTest(
    'ошибка связана aria (AC): aria-invalid, describedby ведёт на hint и error role="alert"',
    async ({ stand }) => {
      const page = await stand('ui-file');

      const input = page.locator(`#${IDS.fileErr}`);
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
      await expect(errorText, 'текст ошибки виден (объявляется скринридером)').toContainText(/./);
    },
  );

  standTest(
    'демо «выбран»: значение и кнопка сброса в разметке стенда; axe чист на всём стенде (AC)',
    async ({ stand }) => {
      const page = await stand('ui-file');

      const demo = page.locator(`#${IDS.boxDemo}`);
      await expect(demo.locator('.ui-file__value')).toHaveText(
        'Выбран файл: resume-Ivanov.pdf, 245 КБ',
      );
      await expect(
        demo.locator('.ui-file__reset'),
        'в состоянии «выбран» сброс доступен',
      ).toBeVisible();

      const results = await a11y(page).analyze();
      expect(
        results.violations.map(
          (violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`,
        ),
        'axe: violations = []',
      ).toEqual([]);
    },
  );

  standTest(
    'эталоны ui-file 375/768/1280/1440 (пусто/выбран/ошибка на одной странице) — только из контейнера (ADR-0004)',
    async ({ stand }) => {
      const page = await stand('ui-file');
      for (const viewport of Object.keys(VIEWPORTS)) {
        await shot(page, { name: 'ui-file', viewport });
      }
    },
  );
});

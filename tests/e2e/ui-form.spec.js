/**
 * e2e ui-form (T5.4; Testing requirements + AC).
 *
 * Поверхность — стенд showcase/pages/ui-form: живая форма целиком (раскладка
 * grid + aside + footnote + демо-переключатели состояний), сводная ошибка и
 * success как «серверный рендер» (статика, вариант Bitrix). Проверяется:
 *  1. раскладка адаптивна (AC: computed grid-template-columns): ui-form__grid
 *     1 колонка на mobile → 2 от md; ui-form__layout — стек → 2 колонки
 *     (aside 400px одобренного) от lg; aside — sticky только на десктопе;
 *     ui-field--wide растягивается на все колонки grid'а;
 *  2. сводная ошибка (серверный рендер): role="alert", заголовок + список
 *     ссылок; ссылки ведут на реальные id полей той же формы; фокус
 *     programm (tabindex="-1") и по ссылке переходит на поле;
 *  3. сводная ошибка появляется после сабмита (демо-паттерн T5.5): показ —
 *     role="alert" в DOM, фокус немедленно на summary;
 *  4. success: фокус на заголовке (tabindex="-1") — статика и демо-свап
 *     career-portal (body скрывается, success показывается, фокус — заголовок);
 *  5. легенда обязательных полей: текстом, не только цветом (маркер
 *     декоративен aria-hidden, смысл несёт видимый текст footnote);
 *  6. axe: стенд чист — известных исключений нет (AC);
 *  7. эталоны 375/768/1280/1440 — только из контейнера/CI (ADR-0004).
 */
import { expect } from '@playwright/test';

import { a11y, shot, test as standTest, VIEWPORTS } from '../helpers/harness.js';

/** Идентификаторы стенда (showcase/pages/ui-form/index.html). */
const IDS = {
  liveForm: 'uifo-form', // живая форма (демо-переключатели состояний)
  summary: 'uifo-summary', // сводная ошибка живой формы (скрыта до сабмита)
  layout: 'uifo-layout', // двухколоночный лейаут main+aside
  main: 'uifo-main', // основная колонка (data-ui-form-body — свап демо)
  grid: 'uifo-grid', // сетка полей 1 → 2 от md
  wide: 'uifo-cover', // поле ui-field--wide в grid
  aside: 'uifo-aside', // боковая колонка
  footnote: 'uifo-footnote', // легенда обязательных полей
  demoSummary: 'uifo-demo-summary', // кнопка-демо «показать сводную ошибку»
  demoSuccess: 'uifo-demo-success', // кнопка-демо «имитация успешной отправки»
  success: 'uifo-success', // success живой формы (скрыт до успеха)
  successTitle: 'uifo-success-title', // заголовок успеха (tabindex="-1")
  summarySrv: 'uifo-summary-srv', // сводная ошибка «серверного рендера»
  emailSrv: 'uifo-email-srv', // поле ошибки серверного рендера (цель ссылки)
  successSrv: 'uifo-success-srv', // success «серверного рендера» (статика)
  successSrvTitle: 'uifo-success-title-srv',
};

/** Цвета токенов дефолтной темы (примитивы, для computed-пинов). */
const COLORS = Object.freeze({
  surfaceMuted: 'rgb(241, 245, 254)', // --ui-blue-50
  successBg: 'rgb(221, 243, 225)', // --ui-green-50
  errorBg: 'rgb(255, 246, 244)', // --ui-red-50
  error: 'rgb(201, 58, 38)', // --ui-red-700
  success: 'rgb(30, 122, 52)', // --ui-green-700
  accent: 'rgb(242, 103, 34)', // --ui-orange-500
});

/** Число треков computed grid-template-columns (разрешённые px-значения). */
const trackCount = (page, selector) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);

/** Вычисленные стили узла по id. */
const styleOf = (page, id) =>
  page.locator(`#${id}`).evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      display: style.display,
      position: style.position,
      top: style.top,
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
      gap: style.gap,
      padding: style.padding,
      color: style.color,
      gridColumn: style.gridColumn,
    };
  });

standTest.describe('ui-form: адаптивная раскладка (T5.4)', () => {
  standTest(
    'grid полей: 1 колонка на mobile → 2 от md; minmax(0,1fr) защищает от распирания длинным словом',
    async ({ stand }) => {
      const page = await stand('ui-form');

      await page.setViewportSize({ width: 375, height: 667 });
      expect(await trackCount(page, `#${IDS.grid}`), '375: одна колонка').toBe(1);

      await page.setViewportSize({ width: 767, height: 1024 });
      expect(await trackCount(page, `#${IDS.grid}`), '767: ещё одна колонка (mobile-first)').toBe(
        1,
      );

      await page.setViewportSize({ width: 768, height: 1024 });
      expect(await trackCount(page, `#${IDS.grid}`), '768 (md): две колонки').toBe(2);

      await page.setViewportSize({ width: 1440, height: 900 });
      expect(await trackCount(page, `#${IDS.grid}`), '1440: две колонки').toBe(2);

      // Длинное слово не распирает колонку (Technical considerations T3.4):
      // minmax(0, 1fr) — гасит min-content трека.
      const template = await page
        .locator(`#${IDS.grid}`)
        .evaluate((el) => getComputedStyle(el).gridTemplateColumns);
      expect(template, 'треки minmax(0, 1fr) — без min-content-распирания').toMatch(
        /^[\d.]+px [\d.]+px$/,
      );
    },
  );

  standTest(
    'layout формы: стек на мобиле → 2 колонки (aside 400px одобренного) от lg; aside sticky только на десктопе',
    async ({ stand }) => {
      const page = await stand('ui-form');

      await page.setViewportSize({ width: 375, height: 667 });
      expect(await trackCount(page, `#${IDS.layout}`), '375: aside в стеке под полями').toBe(1);
      expect((await styleOf(page, IDS.aside)).position, '375: aside не sticky').toBe('static');

      await page.setViewportSize({ width: 1023, height: 900 });
      expect(await trackCount(page, `#${IDS.layout}`), '1023: ещё стек (mobile-first)').toBe(1);

      await page.setViewportSize({ width: 1024, height: 900 });
      expect(await trackCount(page, `#${IDS.layout}`), '1024 (lg): main + aside').toBe(2);
      const aside = await styleOf(page, IDS.aside);
      expect(aside.position, 'lg: aside прилипает (одобренный .form-aside)').toBe('sticky');
      expect(aside.top, 'отступ прилипания — 24px (--ui-space-5)').toBe('24px');

      await page.setViewportSize({ width: 1440, height: 900 });
      const template = await page
        .locator(`#${IDS.layout}`)
        .evaluate((el) => getComputedStyle(el).gridTemplateColumns);
      const tracks = template.trim().split(/\s+/);
      expect(tracks, '1440: две колонки').toHaveLength(2);
      expect(tracks[1], 'вторая колонка — 400px одобренного .form-page').toBe('400px');
    },
  );

  standTest(
    'ui-field--wide растягивается на все колонки ui-form__grid; форма — колонка блоков с шагом 24px',
    async ({ stand }) => {
      const page = await stand('ui-form');

      // ui-field--wide живёт на обвязке поля (div.ui-field), не на контроле.
      const wideColumn = await page
        .locator(`#${IDS.wide}`)
        .evaluate((el) => getComputedStyle(el.closest('.ui-field--wide')).gridColumn);
      expect(wideColumn, 'wide-поле: grid-column 1 / -1 (модификатор ui-field, T5.1)').toBe(
        '1 / -1',
      );

      const form = await styleOf(page, IDS.liveForm);
      expect(form.display, 'контейнер формы — флекс-колонка').toBe('flex');
      expect(form.gap, 'шаг блоков формы — 24px одобренного .form-card').toBe('24px');
    },
  );
});

standTest.describe('ui-form: сводная ошибка (T5.4)', () => {
  standTest(
    'серверный рендер: role="alert", заголовок + список ссылок на id полей; фокус programm и по ссылке',
    async ({ stand }) => {
      const page = await stand('ui-form');

      const summary = page.locator(`#${IDS.summarySrv}`);
      await expect(summary, 'сервер отрендерил сводную ошибку видимой').toBeVisible();
      await expect(summary).toHaveAttribute('role', 'alert');
      await expect(
        summary,
        'tabindex="-1": модуль/inline-сниппет (T5.5/T5.6) может перевести фокус',
      ).toHaveAttribute('tabindex', '-1');

      const title = summary.locator('.ui-form__summary-title');
      await expect(title, 'у summary есть заголовок').toBeVisible();

      const links = summary.locator('.ui-form__summary-list a');
      const count = await links.count();
      expect(count, 'ошибки перечислены ссылками').toBeGreaterThan(1);
      for (let i = 0; i < count; i += 1) {
        const href = await links.nth(i).getAttribute('href');
        expect(href, `ссылка ${i} — на id поля (Implementation requirements п.2)`).toMatch(
          /^#[a-z][a-z0-9-]*$/,
        );
        const target = page.locator(href);
        await expect(target, `цель ${href} существует на странице`).toHaveCount(1);
        const focusable = await target.evaluate((el) => {
          const tag = el.tagName.toLowerCase();
          return (
            ['input', 'select', 'textarea', 'button', 'a'].includes(tag) ||
            el.hasAttribute('tabindex')
          );
        });
        expect(focusable, `цель ${href} фокусируема — переход фокуса реален`).toBe(true);
      }

      // Фокус переводится на summary (паттерн «при показе — фокус на него»).
      await summary.focus();
      await expect(summary, 'фокус programm принят (tabindex="-1")').toBeFocused();

      // Ссылка summary — реальный переход фокуса на поле (Implementation
      // requirements п.2): фокус-скрипт T5.5 доопределит поведение браузеров,
      // не переносящих фокус по хэшу; chromium переносит нативно.
      await links.nth(1).click();
      await expect(
        page.locator(`#${IDS.emailSrv}`),
        'клик по ссылке summary фокусирует поле',
      ).toBeFocused();
    },
  );

  standTest(
    'появление после сабмита (демо-паттерн T5.5): summary показывается с role="alert" и фокусом',
    async ({ stand }) => {
      const page = await stand('ui-form');

      const summary = page.locator(`#${IDS.summary}`);
      await expect(summary, 'до сабмита сводной ошибки нет').toBeHidden();

      await page.locator(`#${IDS.demoSummary}`).click();

      await expect(summary, 'после сабмита summary показан').toBeVisible();
      await expect(summary).toHaveAttribute('role', 'alert');
      await expect(
        summary,
        'фокус немедленно на summary (правило фокуса T5.4 — паттерн для T5.5/T5.6)',
      ).toBeFocused();
      expect(await styleOf(page, IDS.summary).then((s) => s.backgroundColor)).toBe(
        COLORS.errorBg,
      );
    },
  );
});

standTest.describe('ui-form: success (T5.4)', () => {
  standTest(
    'серверный рендер (вариант Bitrix, без JS): заголовок с tabindex="-1" принимает фокус; блок на success-bg',
    async ({ stand }) => {
      const page = await stand('ui-form');

      const success = page.locator(`#${IDS.successSrv}`);
      await expect(success, 'сервер отрендерил success видимой').toBeVisible();
      expect(
        (await styleOf(page, IDS.successSrv)).backgroundColor,
        'фон success-bg одобренного .form-success',
      ).toBe(COLORS.successBg);

      const title = page.locator(`#${IDS.successSrvTitle}`);
      await expect(title).toHaveAttribute('tabindex', '-1');
      await title.focus();
      await expect(
        title,
        'фокус переводится на заголовок (правило фокуса T4.5 — работает без JS)',
      ).toBeFocused();
    },
  );

  standTest(
    'демо-свап career-portal: body скрывается, success показывается, фокус — на success-заголовок',
    async ({ stand }) => {
      const page = await stand('ui-form');

      const success = page.locator(`#${IDS.success}`);
      const main = page.locator(`#${IDS.main}`);
      await expect(success, 'до успеха success скрыт').toBeHidden();
      await expect(main, 'форма на месте').toBeVisible();

      await page.locator(`#${IDS.demoSuccess}`).click();

      await expect(main, 'body формы скрыт (свап career-portal)').toBeHidden();
      await expect(success, 'success показан').toBeVisible();
      await expect(
        page.locator(`#${IDS.successTitle}`),
        'фокус на success-заголовке (tabindex="-1") — пользователь не потерян',
      ).toBeFocused();
    },
  );
});

standTest.describe('ui-form: легенда и axe (T5.4)', () => {
  standTest(
    'легенда обязательных полей: маркер декоративен (aria-hidden), смысл несёт видимый текст — не только цветом (WCAG 1.4.1)',
    async ({ stand }) => {
      const page = await stand('ui-form');

      const footnote = page.locator(`#${IDS.footnote}`);
      await expect(footnote, 'footnote виден в живой форме').toBeVisible();
      await expect(footnote).toContainText('обязательные поля');

      const marker = footnote.locator('.ui-form__req');
      await expect(marker, 'маркер — звёздочка, как в ui-field__req').toHaveText('*');
      await expect(marker, 'звёздочка декоративна — смысл дублирует текст').toHaveAttribute(
        'aria-hidden',
        'true',
      );
      const markerColor = await footnote
        .locator('.ui-form__req')
        .evaluate((el) => getComputedStyle(el).color);
      expect(
        markerColor,
        'цвет маркера — акцент одобренного .req (та же пара, что ui-field__req)',
      ).toBe(COLORS.accent);
    },
  );

  standTest(
    'axe: стенд чист — summary/success/раскладка без нарушений, известных исключений нет (AC)',
    async ({ stand }) => {
      const page = await stand('ui-form');
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
    'эталоны ui-form 375/768/1280/1440 (форма целиком + серверные состояния на одной странице) — только из контейнера (ADR-0004)',
    async ({ stand }) => {
      const page = await stand('ui-form');
      for (const viewport of Object.keys(VIEWPORTS)) {
        await shot(page, { name: 'ui-form', viewport });
      }
    },
  );
});

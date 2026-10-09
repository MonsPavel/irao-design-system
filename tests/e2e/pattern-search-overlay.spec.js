/**
 * e2e паттерна «Search overlay» (T7.6; Testing requirements + AC) — стенд
 * patterns/search-overlay (stands/patterns/search-overlay.html),
 * полноэкранный поиск на ui-modal--full (T7.2).
 *
 * Полный диалог-чек (Implementation requirements п.2 — «как T7.2»):
 *  1. деградация без JS: в РАЗМЕТКЕ диалог открыт (open, К9 ADR-0011) —
 *     контент доступен инлайн; под JS модуль снял open; форма — нативный
 *     GET (сабмит ведёт на /search/?q=… — переход без JS);
 *  2. открытие: клик и Enter по триггеру-ссылке; фокус В ПОЛЕ поиска
 *     (AC; сниппет паттерна переносит его с закрывающей кнопки по
 *     irao-ui:modal-open);
 *  3. trap: Tab/Shift+Tab не достигают фоновых элементов (нюанс К1
 *     ADR-0011: транзит через body допустим);
 *  4. Escape закрывает (AC), фокус возвращается на триггер (AC);
 *  5. aria-modal/роль — нативные свойства showModal (AC; проверяется
 *     :modal-состоянием + axe);
 *  6. повторные циклы — без остаточного is-closing/padding (регресс
 *     design-qa career-portal);
 *  7. axe чист закрытым и с открытым оверлеем (AC);
 *  8. эталоны: закрыто на 4 вьюпортах, открыто — desktop (ADR-0004).
 */
import { expect } from '@playwright/test';

import { a11y, shot, test, VIEWPORTS } from '../helpers/harness.js';

/** Селекторы стенда. */
const SEL = {
  trigger: 'a[data-ui-modal-target="sop-dialog"]',
  dialog: '#sop-dialog',
  query: '#sop-query',
  submit: '#sop-dialog button[type="submit"]',
  header: '.ui-showcase-header',
};

/** Открытый диалог: атрибут open + видим (showModal). */
async function expectOpen(page) {
  await expect(page.locator(SEL.dialog), 'диалог открыт').toBeVisible();
  expect(
    await page.locator(SEL.dialog).evaluate((el) => el.hasAttribute('open')),
    'атрибут open стоит',
  ).toBe(true);
}

/** Закрытый диалог: скрыт, без open, без остаточного is-closing (ADR-0011). */
async function expectCleanClosed(page) {
  await expect(page.locator(SEL.dialog), 'диалог скрыт').toBeHidden();
  const state = await page.locator(SEL.dialog).evaluate((el) => ({
    open: el.hasAttribute('open'),
    closing: el.classList.contains('is-closing'),
  }));
  expect(state.open, 'атрибута open нет').toBe(false);
  expect(state.closing, 'остаточного is-closing нет (регресс career-portal)').toBe(false);
}

test.describe('patterns/search-overlay: деградация без JS (Implementation requirements)', () => {
  test('в разметке диалог открыт (open) — контент доступен инлайн; под JS модуль снял open', async ({
    stand,
  }) => {
    const page = await stand('patterns/search-overlay');

    // Источник разметки (генерат полигона): диалог статично открыт.
    const source = await page.request
      .get('/showcase/dist/stands/patterns/search-overlay.html')
      .then((r) => r.text());
    const dialogTag = source.match(/<dialog[^>]*>/) ?? [''];
    expect(dialogTag[0], 'в разметке диалога есть open (деградация)').toMatch(/\bopen\b/);
    expect(dialogTag[0], 'в разметке диалога есть data-ui-modal').toContain('data-ui-modal');
    expect(dialogTag[0], 'полноэкранный поиск — модификатор --full').toContain('ui-modal--full');

    // Под JS модуль снял open — диалог скрыт, триггер управляет.
    await expectCleanClosed(page);
  });

  test('без JS: содержимое диалога доступно инлайн, форма — нативный GET-переход', async ({
    stand,
  }) => {
    const page = await stand('patterns/search-overlay'); // URL стенда; JS не нужен
    const standUrl = page.url();
    const context = await page.context().browser().newContext({ javaScriptEnabled: false });
    const noJsPage = await context.newPage();
    try {
      await noJsPage.goto(standUrl, { waitUntil: 'networkidle' });
      await expect(
        noJsPage.locator(`${SEL.dialog} .ui-modal__title`),
        'заголовок диалога виден без JS',
      ).toBeVisible();
      await expect(noJsPage.locator(SEL.query), 'поле поиска доступно без JS').toBeVisible();

      // Форма отправляется нативно: GET-переход на страницу результатов
      // (Implementation requirements: «без JS работает как переход»).
      await noJsPage.fill(SEL.query, 'стажировка');
      await noJsPage.locator(SEL.submit).click();
      await noJsPage.waitForURL(/\?/, { timeout: 5000 });
      expect(new URL(noJsPage.url()).searchParams.get('q'), 'запрос ушёл GET-параметром q').toBe(
        'стажировка',
      );
      expect(
        new URL(noJsPage.url()).pathname,
        'action ведёт на страницу результатов /search/',
      ).toBe('/search/');
    } finally {
      await context.close();
    }
  });
});

test.describe('patterns/search-overlay: открытие и фокус в поле (AC)', () => {
  test('клик по триггеру открывает, фокус В ПОЛЕ поиска (не на __close)', async ({ stand }) => {
    const page = await stand('patterns/search-overlay');
    await page.locator(SEL.trigger).click();
    await expectOpen(page);
    await expect(
      page.locator(SEL.query),
      'сниппет паттерна перенёс фокус в поле (irao-ui:modal-open)',
    ).toBeFocused();
  });

  test('Enter на сфокусированном триггере открывает (клавиатурный паритет)', async ({ stand }) => {
    const page = await stand('patterns/search-overlay');
    await page.locator(SEL.trigger).focus();
    await page.keyboard.press('Enter');
    await expectOpen(page);
    await expect(page.locator(SEL.query)).toBeFocused();
  });

  test('aria-labelledby диалога ведёт на заголовок (контракт ui-modal)', async ({ stand }) => {
    const page = await stand('patterns/search-overlay');
    const labelledby = await page.locator(SEL.dialog).getAttribute('aria-labelledby');
    expect(labelledby, 'aria-labelledby указан').toBeTruthy();
    await expect(page.locator(`#${labelledby}`)).toHaveClass(/ui-modal__title/);
  });
});

test.describe('patterns/search-overlay: trap (AC; нюанс К1 ADR-0011)', () => {
  test('Tab/Shift+Tab не достигают фоновых элементов (транзит через body допустим)', async ({
    stand,
  }) => {
    const page = await stand('patterns/search-overlay');
    await page.locator(SEL.trigger).click();
    await expectOpen(page);

    const probe = () =>
      page.evaluate(() => {
        const el = document.activeElement;
        return {
          inside: !!el.closest('#sop-dialog'),
          isBody: el === document.body,
          cls: `${el.tagName}.${el.className}`,
        };
      });

    const forbidden = ['A.ui-link', 'A.ui-skip-link', 'A.ui-showcase-header__home'];
    for (const direction of ['Tab', 'Shift+Tab']) {
      for (let step = 0; step < 24; step += 1) {
        await page.keyboard.press(direction);
        const { inside, isBody, cls } = await probe();
        // К1 ADR-0011: на границе диалога фокус на один шаг уходит на body —
        // следующий Tab возвращает; фоновые элементы недостижимы.
        expect(inside || isBody, `${direction} шаг ${step}: фокус — ${cls}`).toBe(true);
        for (const selector of forbidden) {
          expect(cls, `фоновый ${selector} недостижим (${direction}, шаг ${step})`).not.toContain(
            selector,
          );
        }
      }
    }
  });
});

test.describe('patterns/search-overlay: Escape, restore, aria-modal (AC)', () => {
  test('Escape закрывает анимированно, фокус возвращается на триггер', async ({ stand }) => {
    const page = await stand('patterns/search-overlay');
    await page.locator(SEL.trigger).click();
    await expectOpen(page);

    await page.keyboard.press('Escape');
    await expectCleanClosed(page);
    await expect(page.locator(SEL.trigger), 'фокус на триггере (AC)').toBeFocused();
  });

  test('открытый оверлей — модальный диалог платформы (:modal; aria-modal/роль — нативные)', async ({
    stand,
  }) => {
    const page = await stand('patterns/search-overlay');
    await page.locator(SEL.trigger).click();
    await expectOpen(page);

    // showModal() даёт роль dialog и модальность нативно: :modal-состояние
    // истинно только у диалога верхнего слоя (AC: aria-modal).
    const modal = await page.locator(SEL.dialog).evaluate((el) => el.matches(':modal'));
    expect(modal, 'диалог в :modal-состоянии (top-layer, showModal)').toBe(true);
    expect(
      await page.locator(SEL.dialog).evaluate((el) => el.tagName),
      'основа диалога — нативный <dialog>',
    ).toBe('DIALOG');

    await page.keyboard.press('Escape');
    await expectCleanClosed(page);
  });

  test('клик по __close закрывает, фокус на триггере; три цикла — без остаточных эффектов', async ({
    stand,
  }) => {
    const page = await stand('patterns/search-overlay');
    const initial = await page.evaluate(() => ({
      bodyPadding: document.body.style.paddingRight,
      rootOverflow: document.documentElement.style.overflow,
    }));

    for (let cycle = 1; cycle <= 3; cycle += 1) {
      await page.locator(SEL.trigger).click();
      await expectOpen(page);
      await expect(page.locator(SEL.query), `цикл ${cycle}: фокус в поле`).toBeFocused();
      await page.keyboard.press('Escape');
      await expectCleanClosed(page);
      await expect(page.locator(SEL.trigger), `цикл ${cycle}: restore`).toBeFocused();

      const after = await page.evaluate(() => ({
        bodyPadding: document.body.style.paddingRight,
        rootOverflow: document.documentElement.style.overflow,
      }));
      expect(after.bodyPadding, `цикл ${cycle}: body-padding как до цикла`).toBe(
        initial.bodyPadding,
      );
      expect(after.rootOverflow, `цикл ${cycle}: overflow корня как до цикла`).toBe(
        initial.rootOverflow,
      );
    }
  });

  test('скролл-лок: страница лочится, ширина шапки не меняется (пара К10 ADR-0011)', async ({
    stand,
  }) => {
    const page = await stand('patterns/search-overlay');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

    await page.locator(SEL.trigger).click();
    await expectOpen(page);

    const during = await page.evaluate(() => ({
      headerWidth: document.querySelector('.ui-showcase-header').getBoundingClientRect().width,
      rootOverflow: document.documentElement.style.overflow,
    }));
    expect(during.rootOverflow, 'overflow hidden на корне').toBe('hidden');
    expect(await page.evaluate(() => window.scrollY), 'позиция прокрутки погашена локом').toBe(0);

    await page.keyboard.press('Escape');
    await expectCleanClosed(page);
    const after = await page.evaluate(() => ({
      headerWidth: document.querySelector('.ui-showcase-header').getBoundingClientRect().width,
      rootOverflow: document.documentElement.style.overflow,
    }));
    expect(after.rootOverflow, 'overflow восстановлен').toBe('');
    expect(after.headerWidth, 'ширина шапки не изменилась').toBe(during.headerWidth);
  });
});

test.describe('patterns/search-overlay: с JS форма тоже работает (GET через оверлей)', () => {
  test('сабмит формы в оверлее — GET-переход с параметром q', async ({ stand }) => {
    const page = await stand('patterns/search-overlay');
    await page.locator(SEL.trigger).click();
    await expectOpen(page);

    await page.fill(SEL.query, 'вакансии');
    await page.locator(SEL.submit).click();
    await page.waitForURL(/\?/, { timeout: 5000 });
    expect(new URL(page.url()).searchParams.get('q'), 'GET-параметр q').toBe('вакансии');
  });
});

test.describe('patterns/search-overlay: a11y страницы (AC)', () => {
  test('axe чист закрытым и с открытым оверлеем (AC)', async ({ stand }) => {
    const page = await stand('patterns/search-overlay');
    // Анализ финальных состояний, не кадров анимации (opacity даёт axe
    // color-contrast).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const violationsOf = (results) =>
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`);

    expect(violationsOf(await a11y(page).analyze()), 'axe: violations = [] (закрыто)').toEqual([]);

    await page.locator(SEL.trigger).click();
    await expectOpen(page);
    expect(violationsOf(await a11y(page).analyze()), 'axe: violations = [] (открыто)').toEqual([]);
  });
});

test.describe('patterns/search-overlay: эталоны (AC; ADR-0004 — только контейнер/CI)', () => {
  test('закрыто — 4 вьюпорта; открыто — desktop', async ({ stand }) => {
    const page = await stand('patterns/search-overlay');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'search-overlay-closed', viewport });
    }

    await page.locator(SEL.trigger).click();
    await expectOpen(page);
    await shot(page, { name: 'search-overlay-open', viewport: 'desktop' });
  });
});

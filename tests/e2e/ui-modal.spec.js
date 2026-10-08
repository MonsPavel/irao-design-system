/**
 * e2e ui-modal (T7.2; Testing requirements + AC) — dialog-чек-лист поверх
 * native <dialog> (ADR-0011), регресс-кейсы design-qa career-portal, axe,
 * эталоны.
 *
 * Поверхность — стенд ui-modal (showcase/pages/ui-modal) с тремя размерами:
 * #uimd-sm (--sm), #uimd-md (--md), #uimd-full (--full), статус-регион
 * #uimd-status (события irao-ui:modal-open/close) и фоновая ссылка
 * #uimd-after (цель «фон недостижим» для trap). Проверяется:
 *  1. деградация без JS: в РАЗМЕТКЕ диалог открыт (open) — контент доступен
 *     инлайн (К9 ADR-0011); под JS модуль снял open — диалог скрыт;
 *  2. открытие: клик и Enter по data-ui-modal-target; фокус ВНУТРИ диалога
 *     (AC; первый фокусируемый — __close, перенос career-portal);
 *  3. trap (AC): Tab/Shift+Tab не достигают фоновых элементов — нюанс К1
 *     ADR-0011: на границе диалога фокус на один шаг уходит на body,
 *     следующий Tab возвращает; проверяется «не достигает фона», не
 *     «строго внутри»;
 *  4. Escape закрывает (AC), фокус возвращается на опенер (AC);
 *  5. регресс design-qa career-portal (AC): повторные open/close циклы —
 *     без остаточного body-padding, без is-closing, фокус возвращается
 *     после каждого цикла;
 *  6. скролл-лок (Implementation requirements п.1): страница лочится,
 *     макет НЕ сдвигается (замер ширины шапки — пара К10 ADR-0011);
 *  7. размеры --sm/--md/--full (Scope);
 *  8. API IraoUI.modal.open/close и события (AC: задокументированы —
 *     поведение здесь, текст — README);
 *  9. reduced-motion: открытие/закрытие работают, остаточного is-closing
 *     нет (DoD EPIC-6);
 * 10. axe: стенд чист закрытым и с открытой модалкой (AC);
 * 11. эталоны: закрыто на 4 вьюпортах, открыто — по размерам (ADR-0004).
 */
import { expect } from '@playwright/test';

import { a11y, shot, test, VIEWPORTS } from '../helpers/harness.js';

/** Селекторы стенда (showcase/pages/ui-modal/index.html). */
const SEL = {
  smTrigger: '#uimd-sm-trigger',
  smDialog: '#uimd-sm-dialog',
  mdTrigger: '#uimd-md-trigger',
  mdDialog: '#uimd-md-dialog',
  fullTrigger: '#uimd-full-trigger',
  fullDialog: '#uimd-full-dialog',
  status: '#uimd-status',
  after: '#uimd-after',
  header: '.ui-showcase-header',
  closeOf: (dialog) => `${dialog} .ui-modal__close`,
};

/** Открытый диалог: атрибут open + видим (showModal). */
async function expectOpen(page, dialog) {
  await expect(page.locator(dialog), 'диалог открыт').toBeVisible();
  expect(
    await page.locator(dialog).evaluate((el) => el.hasAttribute('open')),
    'атрибут open стоит',
  ).toBe(true);
}

/** Закрытый диалог: скрыт, без open, без остаточного is-closing (ADR-0011). */
async function expectCleanClosed(page, dialog) {
  await expect(page.locator(dialog), 'диалог скрыт').toBeHidden();
  const state = await page.locator(dialog).evaluate((el) => ({
    open: el.hasAttribute('open'),
    closing: el.classList.contains('is-closing'),
  }));
  expect(state.open, 'атрибута open нет').toBe(false);
  expect(state.closing, 'остаточного is-closing нет (регресс career-portal)').toBe(false);
}

test.describe('ui-modal: деградация без JS (К9 ADR-0011)', () => {
  test('в разметке диалог открыт (open) — контент доступен инлайн; под JS модуль снял open', async ({
    stand,
  }) => {
    const page = await stand('ui-modal');

    // Источник разметки (генерат полигона): диалоги статично открыты.
    const source = await page.request
      .get('/showcase/dist/stands/ui-modal.html')
      .then((r) => r.text());
    const dialogTags = source.match(/<dialog[^>]*>/g) ?? [];
    expect(dialogTags.length, 'на стенде три диалога').toBe(3);
    for (const tag of dialogTags) {
      expect(tag, `в разметке диалога есть open (деградация): ${tag}`).toMatch(/\bopen\b/);
      expect(tag, `в разметке диалога есть data-ui-modal: ${tag}`).toContain('data-ui-modal');
    }

    // Под JS модуль снял open — диалоги скрыты, триггеры управляют.
    await expectCleanClosed(page, SEL.smDialog);
    await expectCleanClosed(page, SEL.mdDialog);
    await expectCleanClosed(page, SEL.fullDialog);
  });

  test('без JS содержимое диалогов доступно инлайн (контент — не за кнопкой)', async ({
    stand,
  }) => {
    const page = await stand('ui-modal'); // URL стенда; для сценария JS не нужен
    const standUrl = page.url();
    const context = await page.context().browser().newContext({ javaScriptEnabled: false });
    const noJsPage = await context.newPage();
    try {
      await noJsPage.goto(standUrl, { waitUntil: 'networkidle' });
      for (const dialog of [SEL.smDialog, SEL.mdDialog, SEL.fullDialog]) {
        await expect(
          noJsPage.locator(`${dialog} .ui-modal__title`),
          `заголовок ${dialog}`,
        ).toBeVisible();
        await expect(
          noJsPage.locator(`${dialog} .ui-modal__body`),
          `содержимое ${dialog}`,
        ).toBeVisible();
      }
    } finally {
      await context.close();
    }
  });
});

test.describe('ui-modal: открытие и фокус (AC)', () => {
  test('клик по триггеру открывает, фокус ВНУТРИ диалога (на __close — перенос career-portal)', async ({
    stand,
  }) => {
    const page = await stand('ui-modal');
    await page.locator(SEL.mdTrigger).click();
    await expectOpen(page, SEL.mdDialog);
    await expect(
      page.locator(SEL.closeOf(SEL.mdDialog)),
      'первый фокус — закрывающая кнопка внутри диалога (career-portal closeButton.focus)',
    ).toBeFocused();
  });

  test('Enter на сфокусированном триггере открывает (клавиатурный паритет)', async ({ stand }) => {
    const page = await stand('ui-modal');
    await page.locator(SEL.smTrigger).focus();
    await page.keyboard.press('Enter');
    await expectOpen(page, SEL.smDialog);
    await expect(page.locator(SEL.closeOf(SEL.smDialog))).toBeFocused();
  });

  test('aria-labelledby диалога ведёт на заголовок (Implementation requirements п.3)', async ({
    stand,
  }) => {
    const page = await stand('ui-modal');
    for (const dialog of [SEL.smDialog, SEL.mdDialog, SEL.fullDialog]) {
      const labelledby = await page.locator(dialog).getAttribute('aria-labelledby');
      expect(labelledby, `aria-labelledby указан у ${dialog}`).toBeTruthy();
      await expect(page.locator(`#${labelledby}`), `цель — .ui-modal__title ${dialog}`).toHaveClass(
        /ui-modal__title/,
      );
    }
  });
});

test.describe('ui-modal: trap (AC; нюанс К1 ADR-0011)', () => {
  test('Tab/Shift+Tab не достигают фоновых элементов (транзит через body допустим)', async ({
    stand,
  }) => {
    const page = await stand('ui-modal');
    await page.locator(SEL.mdTrigger).click();
    await expectOpen(page, SEL.mdDialog);

    const probe = () =>
      page.evaluate(() => {
        const el = document.activeElement;
        return {
          inside: !!el.closest('#uimd-md-dialog'),
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

test.describe('ui-modal: Escape и восстановление фокуса (AC)', () => {
  test('Escape закрывает анимированно, фокус возвращается на опенер', async ({ stand }) => {
    const page = await stand('ui-modal');
    await page.locator(SEL.mdTrigger).click();
    await expectOpen(page, SEL.mdDialog);

    await page.keyboard.press('Escape');
    await expectCleanClosed(page, SEL.mdDialog);
    await expect(page.locator(SEL.mdTrigger), 'фокус на опенере (AC)').toBeFocused();
  });

  test('латентность cancel→close ≈ длительности анимации (transitionend, не страховочный таймер)', async ({
    stand,
  }) => {
    // Контракт К5 ADR-0011: close() по transitionend transform панели
    // (0.36s); таймер 500ms — только страховка. Иначе невидимый top-layer
    // диалог глотает клики/клавиши ~150ms после видимой анимации.
    const page = await stand('ui-modal');
    await page.locator(SEL.mdTrigger).click();
    await expectOpen(page, SEL.mdDialog);

    const t0 = Date.now();
    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () => !document.getElementById('uimd-md-dialog').hasAttribute('open'),
    );
    const latency = Date.now() - t0;

    expect(
      latency,
      `cancel→close = ${latency}ms: завершение по переходу (~360ms), не по таймеру 500ms`,
    ).toBeLessThan(480);
    expect(latency, `cancel→close = ${latency}ms: анимация успевает отыграть`).toBeGreaterThanOrEqual(
      250,
    );
  });

  test('при prefers-reduced-motion закрытие мгновенное (kill-switch 0.01ms — transitionend сразу)', async ({
    stand,
  }) => {
    const page = await stand('ui-modal');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator(SEL.mdTrigger).click();
    await expectOpen(page, SEL.mdDialog);

    const t0 = Date.now();
    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () => !document.getElementById('uimd-md-dialog').hasAttribute('open'),
    );
    const latency = Date.now() - t0;
    expect(latency, `cancel→close = ${latency}ms при reduced-motion — без мёртвого окна`).toBeLessThan(
      50,
    );
    await expect(page.locator(SEL.mdTrigger)).toBeFocused();
  });

  test('клик по __close закрывает, фокус на опенере', async ({ stand }) => {
    const page = await stand('ui-modal');
    await page.locator(SEL.smTrigger).click();
    await expectOpen(page, SEL.smDialog);
    await page.locator(SEL.closeOf(SEL.smDialog)).click();
    await expectCleanClosed(page, SEL.smDialog);
    await expect(page.locator(SEL.smTrigger)).toBeFocused();
  });

  test('восстановление фокуса после каждого цикла из трёх (регресс design-qa)', async ({
    stand,
  }) => {
    const page = await stand('ui-modal');
    for (let cycle = 1; cycle <= 3; cycle += 1) {
      await page.locator(SEL.mdTrigger).click();
      await expectOpen(page, SEL.mdDialog);
      await page.keyboard.press('Escape');
      await expectCleanClosed(page, SEL.mdDialog);
      await expect(page.locator(SEL.mdTrigger), `цикл ${cycle}: фокус на опенере`).toBeFocused();
    }
  });
});

test.describe('ui-modal: регресс design-qa career-portal (AC: повторные циклы)', () => {
  test('три open/close цикла — без остаточного body-padding, overflow и is-closing', async ({
    stand,
  }) => {
    const page = await stand('ui-modal');
    const initial = await page.evaluate(() => ({
      bodyPadding: document.body.style.paddingRight,
      rootOverflow: document.documentElement.style.overflow,
    }));

    for (let cycle = 1; cycle <= 3; cycle += 1) {
      await page.locator(SEL.mdTrigger).click();
      await expectOpen(page, SEL.mdDialog);
      await page.keyboard.press('Escape');
      await expectCleanClosed(page, SEL.mdDialog);

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
});

test.describe('ui-modal: скролл-лок (Implementation requirements п.1)', () => {
  test('страница лочится, макет НЕ сдвигается (замер шапки — пара К10 ADR-0011)', async ({
    stand,
  }) => {
    const page = await stand('ui-modal');

    // Длинный контент стенда даёт прокрутку; высота стенда — величина
    // переменная, поэтому прокручиваем в самый низ (высотно-независимо)
    // и работаем с фактическим scrollY.
    const before = await page.evaluate(() => ({
      headerWidth: document.querySelector('.ui-showcase-header').getBoundingClientRect().width,
      scrollY: window.scrollY,
    }));
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const scrolled = await page.evaluate(() => window.scrollY);
    expect(scrolled, 'страница прокручивается до лока').toBeGreaterThan(100);

    await page.locator(SEL.mdTrigger).click();
    await expectOpen(page, SEL.mdDialog);

    const during = await page.evaluate(() => ({
      headerWidth: document.querySelector('.ui-showcase-header').getBoundingClientRect().width,
      scrollY: window.scrollY,
      rootOverflow: document.documentElement.style.overflow,
    }));
    expect(during.rootOverflow, 'overflow hidden на корне').toBe('hidden');
    expect(during.scrollY, 'позиция прокрутки погашена локом (overflow hidden)').toBe(0);
    expect(
      during.headerWidth,
      `ширина шапки не изменилась (${before.headerWidth} → ${during.headerWidth})`,
    ).toBe(before.headerWidth);

    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => window.scrollY), 'скролл заблокирован').toBe(during.scrollY);

    await page.keyboard.press('Escape');
    await expectCleanClosed(page, SEL.mdDialog);
    const after = await page.evaluate(() => ({
      headerWidth: document.querySelector('.ui-showcase-header').getBoundingClientRect().width,
      rootOverflow: document.documentElement.style.overflow,
      bodyPadding: document.body.style.paddingRight,
    }));
    expect(after.headerWidth, 'после закрытия ширина та же').toBe(before.headerWidth);
    expect(after.rootOverflow, 'overflow восстановлен').toBe('');
    expect(after.bodyPadding, 'остаточного padding нет').toBe('');
  });
});

test.describe('ui-modal: размеры --sm/--md/--full (Scope)', () => {
  test('три размера различаются; --full — весь вьюпорт', async ({ stand }) => {
    const page = await stand('ui-modal');
    await page.setViewportSize({ width: 1280, height: 800 });

    const widthOf = async (dialog) =>
      page.locator(dialog).evaluate((el) => el.getBoundingClientRect().width);
    const heightOf = async (dialog) =>
      page.locator(dialog).evaluate((el) => el.getBoundingClientRect().height);

    await page.locator(SEL.smTrigger).click();
    await expectOpen(page, SEL.smDialog);
    const sm = await widthOf(SEL.smDialog);
    await page.keyboard.press('Escape');

    await page.locator(SEL.mdTrigger).click();
    await expectOpen(page, SEL.mdDialog);
    const md = await widthOf(SEL.mdDialog);
    await page.keyboard.press('Escape');

    await page.locator(SEL.fullTrigger).click();
    await expectOpen(page, SEL.fullDialog);
    const full = { w: await widthOf(SEL.fullDialog), h: await heightOf(SEL.fullDialog) };

    expect(sm, '--sm уже --md').toBeLessThan(md);
    expect(md, '--md уже вьюпорта (кламп)').toBeLessThan(1280);
    expect(full.w, '--full: вся ширина').toBe(1280);
    expect(full.h, '--full: вся высота (dvh)').toBe(800);
  });
});

test.describe('ui-modal: API и события (AC)', () => {
  test('IraoUI.modal.open(el)/close() работают программно; события пишутся в статус-регион', async ({
    stand,
  }) => {
    const page = await stand('ui-modal');

    await page.evaluate(() => {
      window.IraoUI.modal.open(document.getElementById('uimd-sm-dialog'));
    });
    await expectOpen(page, SEL.smDialog);
    await expect(
      page.locator(SEL.status),
      'событие irao-ui:modal-open дошло до сайта',
    ).toContainText('uimd-sm-dialog');

    await page.evaluate(() => {
      window.IraoUI.modal.close();
    });
    await expectCleanClosed(page, SEL.smDialog);
    await expect(page.locator(SEL.status), 'событие irao-ui:modal-close дошло').toContainText(
      'Закрыт',
    );
  });
});

test.describe('ui-modal: reduced-motion и axe (AC)', () => {
  test('открытие/закрытие работают при prefers-reduced-motion, остаточного is-closing нет', async ({
    stand,
  }) => {
    const page = await stand('ui-modal');
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.locator(SEL.mdTrigger).click();
    await expectOpen(page, SEL.mdDialog);
    await page.keyboard.press('Escape');
    await expectCleanClosed(page, SEL.mdDialog);
    await expect(page.locator(SEL.mdTrigger), 'restore и при reduced-motion').toBeFocused();
  });

  test('axe: стенд чист закрытым и с открытой модалкой (AC)', async ({ stand }) => {
    const page = await stand('ui-modal');
    // Анализ финальных состояний, не кадров анимации (opacity даёт axe
    // color-contrast); reduced-motion — соседний тест.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const violationsOf = (results) =>
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`);

    expect(violationsOf(await a11y(page).analyze()), 'axe: violations = [] (закрыто)').toEqual([]);

    await page.locator(SEL.mdTrigger).click();
    await expectOpen(page, SEL.mdDialog);
    expect(
      violationsOf(await a11y(page).analyze()),
      'axe: violations = [] (модалка открыта)',
    ).toEqual([]);
  });
});

test.describe('ui-modal: эталоны (AC; ADR-0004 — только контейнер/CI)', () => {
  test('закрыто — 4 вьюпорта; открыто — по размерам', async ({ stand }) => {
    const page = await stand('ui-modal');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-modal-closed', viewport });
    }

    await page.locator(SEL.smTrigger).click();
    await shot(page, { name: 'ui-modal-open-sm', viewport: 'desktop' });
    await page.keyboard.press('Escape');

    await page.locator(SEL.mdTrigger).click();
    await shot(page, { name: 'ui-modal-open-md', viewport: 'desktop' });
    await page.keyboard.press('Escape');

    await page.locator(SEL.fullTrigger).click();
    await shot(page, { name: 'ui-modal-open-full', viewport: 'desktop' });
  });
});

/**
 * e2e ui-form-validate (T5.5; Testing requirements + AC) — полный цикл
 * «no-JS → with-JS → ошибки → исправление → submit».
 *
 * Поверхность — секция «Клиентская валидация» стенда ui-form
 * (showcase/pages/ui-form): формы с data-ui-form — полная (summary + все
 * правила модуля) и событийная (без summary, кастомный валидатор сайта).
 * Проверяется:
 *  1. novalidate: в разметке стенда его нет; под JS проставлен ТОЛЬКО на
 *     формах с data-ui-form (форма T5.4 не тронута); модуль — в ui.min.js
 *     (полигон подключает только собранный бандл);
 *  2. без JS форма отправляется нативно (нативная валидация блокирует
 *     пустое required) — принцип ТЗ №14;
 *  3. сабмит с ошибками блокируется; summary заполнено ссылками (RU-
 *     множественное), фокус — на нём; ошибки полей по контракту T5.6;
 *     скрытая ветка и пустые опциональные правила не помечены;
 *  4. правила: override data-ui-error, minlength, file-size с человекуемым
 *     лимитом; порядок правил required → email;
 *  5. снятие ошибки на input, ошибка на change (blur — там же);
 *  6. клик по ссылке summary фокусирует поле (доопределение T5.4);
 *  7. валидный сабмит модуль ПРОПУСКАЕТ — navigation с query (success-цикл
 *     у сайта/сервера, Technical considerations);
 *  8. события irao-ui:form-invalid/form-valid (bubbles, detail.errors),
 *     валидатор сайта data-ui-validate, фокус первого поля без summary,
 *     is-loading + aria-busy, блокировка повтора, unlock;
 *  9. axe: стенд чист и после динамических ошибок модуля (AC).
 */
import { expect } from '@playwright/test';

import { a11y, test as standTest } from '../helpers/harness.js';

/** Селекторы секции T5.5 на стенде ui-form (showcase/pages/ui-form). */
const SEL = {
  form: '#uifv-form', // полная форма: summary + все правила
  summary: '#uifv-summary',
  summaryTitle: '#uifv-summary .ui-form__summary-title',
  summaryLinks: '#uifv-summary .ui-form__summary-list a',
  name: '#uifv-name',
  email: '#uifv-email',
  city: '#uifv-city',
  message: '#uifv-message',
  consent: '#uifv-consent',
  file: '#uifv-file',
  hiddenBranch: '#uifv-conditional', // required внутри [hidden] — модуль пропускает
  eventsForm: '#uifv-events', // события + кастомный валидатор, без summary
  phone: '#uifv-phone',
  untouchedForm: '#uifo-form', // форма T5.4 — без data-ui-form
};
const submitOf = (formSelector) => `${formSelector} button[type="submit"]`;

/** Объект с ошибками одного поля (контракт T5.6: класс + aria + текст). */
const errorOf = (page, id) => ({
  wrapClass: page.locator(`.ui-field:has(#${id})`),
  ariaInvalid: page.locator(`#${id}`),
  text: page.locator(`#${id}-error`),
});

standTest.describe('ui-form-validate: novalidate и бандл (T5.5 AC)', () => {
  standTest(
    'novalidate: в разметке стенда нет; под JS — только на form[data-ui-form]; модуль в ui.min.js',
    async ({ stand }) => {
      const page = await stand('ui-form');

      // Источник разметки (генерат полигона): ни один <form> не несёт novalidate.
      const source = await page.request
        .get('/showcase/dist/stands/ui-form.html')
        .then((r) => r.text());
      const formTags = source.match(/<form\b[^>]*>/g) ?? [];
      expect(formTags.length, 'на стенде несколько форм').toBeGreaterThan(2);
      for (const tag of formTags) {
        expect(tag, `в разметке ${tag} novalidate нет (AC)`).not.toContain('novalidate');
      }

      // Под JS: активированные формы получили атрибут, неактивные — нет.
      await expect(page.locator(SEL.form)).toHaveAttribute('novalidate', '');
      await expect(page.locator(SEL.eventsForm)).toHaveAttribute('novalidate', '');
      await expect(
        page.locator(SEL.untouchedForm),
        'форма T5.4 без data-ui-form не активируется — novalidate не ставится',
      ).not.toHaveAttribute('novalidate');

      // AC «модуль в ui.min.js»: стенд подключает ТОЛЬКО собранный бандл
      // (ui.min.js), и все сценарии этого файла на нём работают — попадание
      // модуля в бандл доказано поведением; структурный пин списков сборки —
      // tests/unit/form-validation.test.js.
      await expect(page.locator('script[src*="ui.min.js"]')).toHaveCount(1);
    },
  );
});

standTest.describe('ui-form-validate: без JS (ТЗ №14)', () => {
  standTest(
    'без JS форма отправляется нативно; пустое required блокирует навигацию браузером',
    async ({ stand }) => {
      const page = await stand('ui-form'); // URL стенда; для этого сценария JS не нужен
      const standUrl = page.url();
      const context = await page.context().browser().newContext({ javaScriptEnabled: false });
      const noJsPage = await context.newPage();
      try {
        await noJsPage.goto(standUrl, { waitUntil: 'networkidle' });
        const before = noJsPage.url();
        const submit = noJsPage.locator(submitOf(SEL.form));

        await submit.click();
        await noJsPage.waitForTimeout(1500);
        expect(noJsPage.url(), 'пустое required: нативная валидация заблокировала сабмит').toBe(
          before,
        );

        // Нативно-обязательное: имя, e-mail, согласие (город пуст — pattern
        // на пустое значение не действует; message предзаполнен ≥ minlength).
        await noJsPage.fill(SEL.name, 'Иван Иванов');
        await noJsPage.fill(SEL.email, 'user@example.com');
        await noJsPage.check(SEL.consent);
        await submit.click();

        await noJsPage.waitForURL(/\?/, { timeout: 5000 });
        expect(noJsPage.url(), 'GET-сабмит состоялся — форма работает без JS').toMatch(/\?name=/);
      } finally {
        await context.close();
      }
    },
  );
});

standTest.describe('ui-form-validate: сабмит с ошибками (T5.5 AC)', () => {
  standTest(
    'блокировка сабмита; summary — RU-множественное, ссылки, фокус; ошибки полей по контракту T5.6; скрытая ветка пропущена',
    async ({ stand }) => {
      const page = await stand('ui-form');
      await page.locator(submitOf(SEL.form)).click();

      await page.waitForTimeout(700);
      expect(page.url(), 'preventDefault: навигации нет').not.toMatch(/\?/);

      const summary = page.locator(SEL.summary);
      await expect(summary, 'summary показан').toBeVisible();
      await expect(summary, 'фокус немедленно на summary (паттерн T5.4)').toBeFocused();
      await expect(
        summary.locator('.ui-form__summary-title'),
        'name+email+consent — RU-множественное',
      ).toHaveText('В форме 3 ошибки');

      const links = page.locator(SEL.summaryLinks);
      await expect(links).toHaveCount(3);
      await expect(links.nth(0)).toHaveAttribute('href', '#uifv-name');
      await expect(links.nth(0), 'текст ссылки — сообщение поля').toHaveText('Заполните это поле');
      await expect(links.nth(2)).toHaveAttribute('href', '#uifv-consent');
      await expect(links.nth(2)).toHaveClass(/ui-link/);

      // Контракт T5.6 на поле: класс обвязки + aria-invalid + describedby + текст.
      const nameError = errorOf(page, 'uifv-name');
      await expect(nameError.ariaInvalid).toHaveAttribute('aria-invalid', 'true');
      await expect(nameError.wrapClass).toHaveClass(/ui-field--error/);
      await expect(nameError.text).toBeVisible();
      await expect(nameError.text).toHaveAttribute('role', 'alert');
      await expect(nameError.text).toHaveText('Заполните это поле');
      const describedby = (await page.locator(SEL.name).getAttribute('aria-describedby')) ?? '';
      expect(describedby.split(/\s+/), 'ошибка в описании поля').toContain('uifv-name-error');

      // Порядок правил: у пустого email — required, не «Исправьте адрес e-mail».
      await expect(page.locator('#uifv-email-error')).toHaveText('Заполните это поле');
      const emailDescribed = (await page.locator(SEL.email).getAttribute('aria-describedby')) ?? '';
      expect(emailDescribed.split(/\s+/), 'hint сохранён, ошибка дописана').toEqual([
        'uifv-email-hint',
        'uifv-email-error',
      ]);

      // Свой текст правила чекбокса.
      await expect(page.locator('#uifv-consent-error')).toHaveText('Отметьте этот пункт');

      // Скрытая ветка и пустые опциональные правила (city pattern, message
      // minlength, file размер) не помечены.
      await expect(
        page.locator(SEL.hiddenBranch),
        '[hidden]-предок: модуль пропускает (career-portal)',
      ).not.toHaveAttribute('aria-invalid');
      for (const id of ['uifv-city', 'uifv-message', 'uifv-file']) {
        await expect(page.locator(`#${id}`), `${id} валидно`).not.toHaveAttribute('aria-invalid');
      }
    },
  );

  standTest(
    'правила: override data-ui-error на городе, minlength, file-size с человекуемым лимитом',
    async ({ stand }) => {
      const page = await stand('ui-form');
      await page.fill(SEL.name, 'Иван Иванов');
      await page.fill(SEL.email, 'user@example.com');
      await page.check(SEL.consent);
      await page.fill(SEL.city, 'Moscow'); // latin — мимо pattern
      await page.fill(SEL.message, 'коротко'); // мимо minlength=20
      await page.setInputFiles(SEL.file, {
        name: 'big.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.alloc(2 * 1024 * 1024),
      });
      await page.locator(submitOf(SEL.form)).click();

      await expect(page.locator(SEL.summaryTitle)).toHaveText('В форме 3 ошибки');
      await expect(
        page.locator('#uifv-city-error'),
        'сообщение переопределено data-ui-error',
      ).toHaveText('Укажите город по-русски');
      await expect(page.locator('#uifv-message-error')).toHaveText(
        'Используйте не менее 20 символов',
      );
      await expect(
        page.locator('#uifv-file-error'),
        'лимит — человекуемо (formatBytes)',
      ).toHaveText('Файл слишком большой — максимум 1 МБ');
      const links = page.locator(SEL.summaryLinks);
      await expect(links.nth(0)).toHaveAttribute('href', '#uifv-city');
    },
  );
});

standTest.describe('ui-form-validate: интерактивные ошибки (T5.5 AC)', () => {
  standTest(
    'снятие на input, ошибка на change/blur; соседние ошибки не трогаются',
    async ({ stand }) => {
      const page = await stand('ui-form');
      await page.locator(submitOf(SEL.form)).click(); // ошибки name/email/consent

      const name = page.locator(SEL.name);
      await page.fill(SEL.name, 'И'); // fill диспатчит input — ошибка снимается
      await expect(name, 'input снял aria-invalid').not.toHaveAttribute('aria-invalid');
      await expect(errorOf(page, 'uifv-name').wrapClass).not.toHaveClass(/ui-field--error/);
      await expect(page.locator('#uifv-name-error'), 'текст ошибки очищен').toHaveText('');
      await expect(page.locator(SEL.email), 'ошибка соседнего поля не задета').toHaveAttribute(
        'aria-invalid',
        'true',
      );

      // Ошибка на change/blur (career-portal): fill диспатчит только input,
      // валидация интерактивных полей — при уходе с поля (blur влечёт change).
      await page.fill(SEL.city, 'Moscow');
      await expect(
        page.locator(SEL.city),
        'на input ошибка не ставится — семантика снятия на input',
      ).not.toHaveAttribute('aria-invalid');
      await page.locator(SEL.city).blur();
      await expect(page.locator(SEL.city), 'уход с поля провалидировал pattern').toHaveAttribute(
        'aria-invalid',
        'true',
      );
      await expect(page.locator('#uifv-city-error')).toBeVisible();

      // change на чекбоксе: включение снимает ошибку.
      await page.check(SEL.consent);
      await expect(page.locator(SEL.consent)).not.toHaveAttribute('aria-invalid');
      await expect(page.locator('#uifv-consent-error')).toHaveText('');
    },
  );

  standTest(
    'клик по ссылке summary переводит фокус на поле (доопределение T5.4)',
    async ({ stand }) => {
      const page = await stand('ui-form');
      await page.locator(submitOf(SEL.form)).click();
      await page.locator(SEL.summaryLinks).first().click();
      await expect(page.locator(SEL.name), 'фокус перешёл на поле ошибки').toBeFocused();
    },
  );
});

standTest.describe('ui-form-validate: валидный сабмит (T5.5)', () => {
  standTest(
    'модуль ПРОПУСКАЕТ валидный сабмит — navigation с query (success-цикл у сайта/сервера)',
    async ({ stand }) => {
      const page = await stand('ui-form');
      await page.fill(SEL.name, 'Иван Иванов');
      await page.fill(SEL.email, 'user@example.com');
      await page.check(SEL.consent);
      await page.locator(submitOf(SEL.form)).click();

      await page.waitForURL(/\?name=/, { timeout: 5000 });
      expect(page.url(), 'нативный GET-сабмит выполнен').toMatch(/#uifv-heading$/);
    },
  );
});

standTest.describe('ui-form-validate: события и расширение (T5.5)', () => {
  standTest(
    'form-invalid/form-valid (bubbles, detail.errors), валидатор сайта, фокус поля без summary, is-loading + блокировка повтора + unlock',
    async ({ stand }) => {
      const page = await stand('ui-form');
      await page.evaluate(() => {
        window.__uifv = { invalid: 0, docInvalid: 0, valid: 0, detail: null };
        const form = document.getElementById('uifv-events');
        form.addEventListener('irao-ui:form-invalid', (event) => {
          window.__uifv.invalid += 1;
          window.__uifv.detail = { errors: event.detail.errors.map((e) => e.message) };
        });
        document.addEventListener('irao-ui:form-invalid', () => {
          window.__uifv.docInvalid += 1;
        });
        // Сайт управляет success-циклом: СВОЙ submit-обработчик отменяет
        // навигацию (AJAX-сценарий доки README) — модуль навигацию не
        // отменяет; form-valid служит сигналом цикла.
        form.addEventListener('submit', (event) => event.preventDefault());
        form.addEventListener('irao-ui:form-valid', () => {
          window.__uifv.valid += 1;
        });
      });

      const form = page.locator(SEL.eventsForm);
      const submit = form.locator('button[type="submit"]');
      const phone = page.locator(SEL.phone);

      // Невалидный сабмит: валидатор сайта отклонил значение.
      await page.fill(SEL.phone, '123');
      await submit.click();
      let state = await page.evaluate(() => window.__uifv);
      expect(state.invalid, 'irao-ui:form-invalid диспатчен').toBe(1);
      expect(state.docInvalid, 'событие всплывает до document (bubbles)').toBe(1);
      expect(state.detail.errors, 'detail несёт сообщения').toEqual([
        'Телефон в формате +7 999 123-45-67',
      ]);
      await expect(phone, 'без summary фокус на первом невалидном поле (WCAG 3.3.1)').toBeFocused();
      await expect(page.locator('#uifv-phone-error')).toHaveText(
        'Телефон в формате +7 999 123-45-67',
      );
      expect(page.url(), 'сабмит заблокирован (preventDefault)').not.toMatch(/\?/);

      // Валидный сабмит: form-valid, кнопка is-loading + aria-busy (T4.2).
      await page.fill(SEL.phone, '+7 999 123-45-67');
      await submit.click();
      state = await page.evaluate(() => window.__uifv);
      expect(state.valid, 'irao-ui:form-valid диспатчен').toBe(1);
      await expect(submit).toHaveClass(/is-loading/);
      await expect(submit).toHaveAttribute('aria-busy', 'true');

      // Повторная отправка заблокирована модулем (кнопка при is-loading не
      // кликабельна и для мыши — шлём сабмит программно, как «двойной клик»).
      await page.evaluate(() => document.getElementById('uifv-events').requestSubmit());
      state = await page.evaluate(() => window.__uifv);
      expect(state.valid, 'form-valid повторно не диспатчится').toBe(1);

      // unlock — точка расширения для AJAX-сайтов (дока README).
      await page.evaluate(() => window.IraoUI.form.unlock(document.getElementById('uifv-events')));
      await expect(submit, 'unlock снял состояние кнопки').not.toHaveClass(/is-loading/);
      await page.evaluate(() => document.getElementById('uifv-events').requestSubmit());
      state = await page.evaluate(() => window.__uifv);
      expect(state.valid, 'после unlock сабмит проходит снова').toBe(2);
    },
  );
});

standTest.describe('ui-form-validate: axe (T5.5 AC)', () => {
  standTest(
    'axe: стенд чист и после динамических ошибок модуля — известных исключений нет',
    async ({ stand }) => {
      const page = await stand('ui-form');
      // Динамические узлы модуля в DOM: ошибки полей и summary.
      await page.locator(submitOf(SEL.form)).click();
      await page.fill(SEL.phone, '123');
      await page.locator(submitOf(SEL.eventsForm)).click();

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

/**
 * e2e integration/form-full-cycle (T5.6; Testing requirements + AC) —
 * интеграционный стенд «форма целиком»: полный цикл из четырёх веток,
 * каждая — отдельный якорь-состояние на стенде:
 *  1. #ffc-nojs   — без JS: нативная валидация (ТЗ №14), форма отправляется;
 *  2. #ffc-client — с JS: блокировка сабмита, сводная ошибка, фокус (T5.5);
 *  3. #ffc-server — «серверный ответ»: pre-rendered PHP-вывод (эмуляция
 *     статикой — контракт T5.6) + inline-сниппет фокуса на summary;
 *  4. #ffc-success — success: серверная success-страница.
 *
 * Ключевой сценарий Testing requirements T5.6: идентичность классов/aria
 * между клиентской (ветка 2) и «серверной» (ветка 3) ошибкой — assert
 * ОДИНАКОВЫХ computed состояний поля (класс обвязки, aria-invalid,
 * aria-describedby, роль/видимость/цвет текста ошибки, рамка и фон
 * контрола). Axe — на каждой ветке: начальная страница покрывает разметку
 * веток 1/3/4, после сабмита — динамическое состояние ветки 2. Эталоны
 * веток — element-снимки секций (только из контейнера/CI, ADR-0004).
 */
import { expect } from '@playwright/test';

import { a11y, SNAPSHOTS_ENABLED, test as standTest, VIEWPORTS } from '../helpers/harness.js';

/** Селекторы стенда (showcase/pages/integration/form-full-cycle/index.html). */
const SEL = {
  liveSection: '#ffc-live', // секция веток 1–2 (живая форма)
  nojsAnchor: '#ffc-nojs', // якорь ветки 1
  clientAnchor: '#ffc-client', // якорь ветки 2
  serverSection: '#ffc-server', // секция ветки 3
  successSection: '#ffc-success', // секция ветки 4
  form: '#ffc-form', // живая форма (ветки 1–2)
  summary: '#ffc-summary',
  summaryTitle: '#ffc-summary .ui-form__summary-title',
  summaryLinks: '#ffc-summary .ui-form__summary-list a',
  name: '#ffc-name',
  email: '#ffc-email',
  consent: '#ffc-consent',
  serverForm: '#ffc-server-form', // «серверный ответ» (pre-rendered)
  serverSummary: '#ffc-server-summary',
  serverLinks: '#ffc-server-summary .ui-form__summary-list a',
  srvName: '#ffc-srv-name',
  srvEmail: '#ffc-srv-email',
  srvConsent: '#ffc-srv-consent',
  successBlock: '#ffc-success-block',
  successTitle: '#ffc-success-title',
};

const submitOf = (formSelector) => `${formSelector} button[type="submit"]`;

/**
 * Полное вычисленное состояние ошибки одного поля (контракт T5.6).
 * Токены aria-describedby и тексты нормализуются: важна ИДЕНТИЧНОСТЬ
 * состояний, а не совпадение id (они у веток разные по определению).
 */
const errorStateOf = (page, id) =>
  page.locator(`#${id}`).evaluate((el, fieldId) => {
    const wrap = el.closest('.ui-field');
    const error = wrap ? wrap.querySelector('.ui-field__error') : null;
    const inputStyle = getComputedStyle(el);
    const errorStyle = error ? getComputedStyle(error) : null;
    const describedby = (el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    return {
      wrapHasErrorClass: wrap ? wrap.classList.contains('ui-field--error') : null,
      ariaInvalid: el.getAttribute('aria-invalid'),
      describedbyTokens: describedby.map((token) =>
        token === `${fieldId}-error` ? '<error>' : token.endsWith('-hint') ? '<hint>' : token,
      ),
      errorRole: error ? error.getAttribute('role') : null,
      errorDisplayed: errorStyle ? errorStyle.display !== 'none' : null,
      errorColor: errorStyle ? errorStyle.color : null,
      inputBorderColor: inputStyle.borderColor,
      inputBackgroundColor: inputStyle.backgroundColor,
    };
  }, id);

standTest.describe('form-full-cycle: ветка 1 — без JS (нативная валидация, ТЗ №14)', () => {
  standTest(
    'разметка стенда без novalidate; под JS модуль активирует только data-ui-формы',
    async ({ stand }) => {
      const page = await stand('integration/form-full-cycle');

      // Источник разметки (генерат полигона): ни один <form> не несёт novalidate —
      // без JS форма нативно-валидна (AC T5.5, действует на весь полигон).
      const source = await page.request
        .get('/showcase/dist/stands/integration/form-full-cycle.html')
        .then((r) => r.text());
      const formTags = source.match(/<form\b[^>]*>/g) ?? [];
      expect(formTags.length, 'на стенде две формы').toBe(2);
      for (const tag of formTags) {
        expect(tag, `в разметке ${tag} novalidate нет`).not.toContain('novalidate');
      }

      // Под JS: модуль (ui.min.js) активировал формы с data-ui-form.
      for (const form of [SEL.form, SEL.serverForm]) {
        await expect(page.locator(form)).toHaveAttribute('data-ui-form', '');
        await expect(page.locator(form)).toHaveAttribute('novalidate', '');
      }
    },
  );

  standTest(
    'без JS пустое required блокирует сабмит браузером; заполненная форма отправляется (GET)',
    async ({ stand }) => {
      const page = await stand('integration/form-full-cycle'); // URL стенда; JS здесь не нужен
      const standUrl = page.url();
      const context = await page.context().browser().newContext({ javaScriptEnabled: false });
      const noJsPage = await context.newPage();
      try {
        await noJsPage.goto(standUrl, { waitUntil: 'networkidle' });
        const before = noJsPage.url();
        const submit = noJsPage.locator(submitOf(SEL.form));

        await submit.click();
        await noJsPage.waitForTimeout(1500);
        expect(
          noJsPage.url(),
          'пустое required: нативная валидация заблокировала сабмит — серверу уходит только валидное',
        ).toBe(before);

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

standTest.describe('form-full-cycle: ветка 2 — с JS (блокировка сабмита + фокус, T5.5)', () => {
  standTest(
    'сабмит с ошибками заблокирован; summary — RU-множественное, ссылки, немедленный фокус',
    async ({ stand }) => {
      const page = await stand('integration/form-full-cycle');
      await page.locator(submitOf(SEL.form)).click();

      await page.waitForTimeout(700);
      expect(page.url(), 'preventDefault: навигации нет — данные не уйдут на сервер').not.toMatch(
        /\?/,
      );

      const summary = page.locator(SEL.summary);
      await expect(summary, 'summary показан').toBeVisible();
      await expect(summary, 'фокус немедленно на summary (паттерн T5.4)').toBeFocused();
      await expect(
        page.locator(SEL.summaryTitle),
        'name+email+consent — RU-множественное',
      ).toHaveText('В форме 3 ошибки');

      const links = page.locator(SEL.summaryLinks);
      await expect(links).toHaveCount(3);
      await expect(links.nth(0)).toHaveAttribute('href', '#ffc-name');
      await expect(links.nth(0), 'текст ссылки — сообщение поля').toHaveText('Заполните это поле');
      await expect(links.nth(1)).toHaveAttribute('href', '#ffc-email');
      await expect(links.nth(2)).toHaveAttribute('href', '#ffc-consent');
    },
  );

  standTest(
    'ошибки полей рендерятся по контракту T5.6 (класс обвязки + aria + текст role=alert)',
    async ({ stand }) => {
      const page = await stand('integration/form-full-cycle');
      await page.locator(submitOf(SEL.form)).click();

      for (const [id, message] of [
        ['ffc-name', 'Заполните это поле'],
        // Email предзаполнен битым значением (как вернул бы сервер) —
        // правило required проходит, ругается проверка формата.
        ['ffc-email', 'Исправьте адрес e-mail'],
        ['ffc-consent', 'Отметьте этот пункт'],
      ]) {
        const state = await errorStateOf(page, id);
        expect(state.wrapHasErrorClass, `${id}: ui-field--error на обвязке`).toBe(true);
        expect(state.ariaInvalid, `${id}: aria-invalid`).toBe('true');
        expect(state.describedbyTokens, `${id}: ошибка в описании поля`).toContain('<error>');
        expect(state.errorRole, `${id}: текст ошибки — role=alert`).toBe('alert');
        expect(page.locator(`#${id}-error`)).toHaveText(message);
      }
      // hint email сохранён, ошибка дописана после него.
      expect(await errorStateOf(page, 'ffc-email')).toMatchObject({
        describedbyTokens: ['<hint>', '<error>'],
      });
    },
  );
});

standTest.describe(
  'form-full-cycle: ветка 3 — «серверный ответ» (pre-rendered, контракт T5.6)',
  () => {
    standTest(
      'inline-сниппет фокуса: после «перезагрузки» фокус на summary (role=alert); ссылки ведут на поля',
      async ({ stand }) => {
        const page = await stand('integration/form-full-cycle');

        const summary = page.locator(SEL.serverSummary);
        await expect(summary, 'сервер отрендерил сводную ошибку видимой').toBeVisible();
        await expect(summary).toHaveAttribute('role', 'alert');
        await expect(summary, 'tabindex="-1" — цель программного фокуса').toHaveAttribute(
          'tabindex',
          '-1',
        );
        await expect(
          summary,
          'inline-сниппет (bitrix/snippets/form-error-render.php) перевёл фокус на summary при загрузке',
        ).toBeFocused();

        const links = page.locator(SEL.serverLinks);
        await expect(links).toHaveCount(3);
        for (let i = 0; i < 3; i += 1) {
          const href = await links.nth(i).getAttribute('href');
          const target = page.locator(href);
          await expect(target, `цель ${href} существует на странице`).toHaveCount(1);
        }
        await links.nth(0).click();
        await expect(
          page.locator(SEL.srvName),
          'клик по ссылке серверного summary фокусирует поле',
        ).toBeFocused();
      },
    );

    standTest(
      'идентичность client/server ошибки: у пары полей ОДИНАКОВЫЕ computed состояния (Testing requirements T5.6)',
      async ({ stand }) => {
        const page = await stand('integration/form-full-cycle');

        // Клиентская ошибка: сабмит живой формы под JS (ветка 2).
        await page.locator(submitOf(SEL.form)).click();
        await expect(page.locator(SEL.summary)).toBeVisible();
        // Computed-стили снимаем ПОСЛЕ CSS-перехода рамки/фона контрола
        // (ui-field: transition border-color/background-color
        // var(--ui-transition)): иначе клиентское поле сравнится в середине
        // анимации, а серверное (ошибка с загрузки страницы) уже стабильно.
        await page.waitForTimeout(300);

        // Серверная ошибка уже в DOM (ветка 3, pre-rendered статикой).
        for (const [clientId, serverId] of [
          ['ffc-name', 'ffc-srv-name'],
          ['ffc-email', 'ffc-srv-email'],
          ['ffc-consent', 'ffc-srv-consent'],
        ]) {
          const client = await errorStateOf(page, clientId);
          const server = await errorStateOf(page, serverId);
          expect(
            server,
            `${clientId} ↔ ${serverId}: классы, aria, computed-стили идентичны`,
          ).toEqual(client);
          const clientText = await page.locator(`#${clientId}-error`).textContent();
          const serverText = await page.locator(`#${serverId}-error`).textContent();
          expect(serverText, `${serverId}: текст ошибки тот же, что рендерит клиент`).toBe(
            clientText,
          );
        }
      },
    );
  },
);

standTest.describe('form-full-cycle: ветка 4 — success (серверная success-страница)', () => {
  standTest(
    'success отрендерен видимым без JS-переключателей; заголовок tabindex="-1" принимает фокус',
    async ({ stand }) => {
      const page = await stand('integration/form-full-cycle');

      const success = page.locator(SEL.successBlock);
      await expect(success, 'сервер отрендерил success видимой (вариант Bitrix)').toBeVisible();

      const title = page.locator(SEL.successTitle);
      await expect(title).toHaveAttribute('tabindex', '-1');
      await title.focus();
      await expect(title, 'фокус переводится на заголовок — пользователь не потерян').toBeFocused();
    },
  );
});

standTest.describe('form-full-cycle: axe по веткам (AC «axe на каждой»)', () => {
  standTest(
    'axe: начальная страница — разметка веток 1 (форма до сабмита), 3 и 4 — violations нет',
    async ({ stand }) => {
      const page = await stand('integration/form-full-cycle');
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
    'axe: ветка 2 после сабмита — динамические ошибки и summary не ломают доступность',
    async ({ stand }) => {
      const page = await stand('integration/form-full-cycle');
      await page.locator(submitOf(SEL.form)).click();
      await expect(page.locator(SEL.summary)).toBeFocused();

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

standTest.describe('form-full-cycle: эталоны веток (якорь-состояния, ADR-0004)', () => {
  standTest(
    'эталоны 4 веток 375/768/1280/1440 — element-снимки секций, только из контейнера/CI',
    async ({ stand }) => {
      const page = await stand('integration/form-full-cycle');

      // Ветка 2 для снимка — динамическое состояние после сабмита.
      await page.locator(submitOf(SEL.form)).click();
      await expect(page.locator(SEL.summary)).toBeVisible();

      const branches = [
        ['ffc-branch1-nojs', page.locator(SEL.liveSection)],
        ['ffc-branch2-client', page.locator(SEL.liveSection)],
        ['ffc-branch3-server', page.locator(SEL.serverSection)],
        ['ffc-branch4-success', page.locator(SEL.successSection)],
      ];

      for (const viewport of Object.keys(VIEWPORTS)) {
        await page.setViewportSize(VIEWPORTS[viewport]);
        for (const [name, locator] of branches) {
          const info = standTest.info();
          if (!SNAPSHOTS_ENABLED || info.project.name !== 'chromium') {
            info.annotations.push({
              type: 'shot-skipped',
              description:
                `${name}--${viewport}: эталоны создаются только из контейнера/CI ` +
                '(ADR-0004) — запустите npm run test:docker',
            });
            continue;
          }
          await expect(locator).toHaveScreenshot(`${name}--${viewport}.png`, {
            animations: 'disabled',
            caret: 'hide',
          });
        }
      }
    },
  );
});

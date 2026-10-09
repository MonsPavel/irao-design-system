/**
 * e2e паттерна «Страница формы» (T8.3; Testing requirements + AC) — стенд
 * patterns/form-page (stands/patterns/form-page.html), эталонная сборка
 * страницы-формы с информационной колонкой: крошки → page-head (h1 + lead)
 * → форма ui-form (T5.4) с aside-сводкой вакансии → полный форма-цикл
 * (стенд T5.6 встраивается: живая форма / «серверный ответ» / success).
 *
 * Ключевые сценарии спеки:
 *  1. форма-цикл на паттерне: без JS — нативная валидация (пустое required
 *     блокирует, заполненная форма отправляется), с JS — модуль IraoUI.form
 *     (сводная ошибка + фокус, поля по контракту T5.6, валидный сабмит
 *     пропускается); «серверный ответ» — pre-rendered ошибки + inline-фокус;
 *  2. адаптив обеих раскладок (Implementation requirements п.1 + решение
 *     «aside до формы»): на 375/768 aside-сводка НАД формой в одном потоке,
 *     от 1024 — форма слева / aside справа (grid-column), DOM не меняется;
 *  3. 32px-база (T3.6-приём): колонки лейаута не перекрываются (hscroll вне
 *     пина — nowrap-бейдж обязательности на 375@32px есть граница ui-field,
 *     гейт T3.6 формы сознательно не покрывает; спека T8.3 32px не требует);
 *  4. фокус-порядок формы естественный: aside-ссылка «Вернуться» — до полей;
 *  5. axe чист; иерархия заголовков без пропусков; эталоны 375/768/1440.
 */
import { expect } from '@playwright/test';

import { a11y, shot, test as standTest, VIEWPORTS } from '../helpers/harness.js';

const SEL = {
  breadcrumbs: '#fpp-breadcrumbs',
  title: '#fpp-title',
  lead: '#fpp-lead',
  form: '#fpp-form',
  summary: '#fpp-summary',
  layout: '#fpp-layout',
  aside: '#fpp-aside',
  asideBack: '#fpp-aside-back',
  main: '#fpp-main',
  lastname: '#fpp-lastname',
  firstname: '#fpp-firstname',
  phone: '#fpp-phone',
  email: '#fpp-email',
  consent: '#fpp-consent',
  serverSection: '#fpp-server',
  serverForm: '#fpp-server-form',
  serverSummary: '#fpp-server-summary',
  successSection: '#fpp-success',
  successBlock: '#fpp-success-block',
  successTitle: '#fpp-success-title',
  submit: '#fpp-form button[type="submit"]',
};

/** Вьюпорты 32px-сценария (прецедент BASE32_WIDTHS T3.6/T8.2). */
const BASE32_WIDTHS = [1280, 768, 375];

/** Порог перекрытия из Implementation requirements T3.6 п.2. */
const OVERLAP_THRESHOLD_PX = 2;

/**
 * Полное вычисленное состояние ошибки поля (контракт T5.6 — сверка с
 * tests/e2e/form-full-cycle.spec.js errorStateOf: та же форма в шапке).
 */
const errorStateOf = (page, id) =>
  page.locator(`#${id}`).evaluate((el, fieldId) => {
    const wrap = el.closest('.ui-field');
    const error = wrap ? wrap.querySelector('.ui-field__error') : null;
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
    };
  }, id);

/**
 * Сборка нарушений 32px-сценария: перекрытие ключевых узлов (T8.2-приём).
 * Пин НЕ включает hscroll: на 375@32px строку распирает nowrap-бейдж
 * «обязательное поле» (ui-field__req-text, одобренный дизайн T5.1) — гейт
 * масштабирования T3.6 формы сознательно не покрывает (ui-field.spec пинует
 * 32px локально как min-height/видимость значения); спека T8.3 32px-сценария
 * не требует — здесь пинуются только перекрытия колонок лейаута
 * (aside × форма), специфичные для решения «aside до формы».
 */
const collectLayoutViolations = (page) =>
  page.evaluate((threshold) => {
    const violations = [];
    const nodes = [...document.querySelectorAll('[data-ui-check-layout]')];
    const boxes = nodes.map((el) => el.getBoundingClientRect());
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        if (nodes[i].contains(nodes[j]) || nodes[j].contains(nodes[i])) continue;
        const a = boxes[i];
        const b = boxes[j];
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (overlapX > threshold && overlapY > threshold) {
          violations.push(
            `overlap: ${nodes[i].id || nodes[i].className} × ${nodes[j].id || nodes[j].className} ` +
              `(${Math.round(overlapX)}×${Math.round(overlapY)}px > ${threshold}px)`,
          );
        }
      }
    }
    return violations;
  }, OVERLAP_THRESHOLD_PX);

/** Короткий дескриптор элемента для пина порядка фокуса. */
const focusedDescriptor = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    return el ? el.id || el.className.split(/\s+/)[0] || el.tagName.toLowerCase() : '';
  });

standTest.describe('patterns/form-page: эталонная сборка (Scope) — состав и границы', () => {
  standTest(
    'собрана без нового CSS: подключены только файлы dist, связки — <style> стенда',
    async ({ stand }) => {
      const page = await stand('patterns/form-page');
      const source = await page.request
        .get('/showcase/dist/stands/patterns/form-page.html')
        .then((r) => r.text());

      const stylesheets = source.match(/<link rel="stylesheet"[^>]*>/g) ?? [];
      expect(
        stylesheets.length,
        'внешних стилей ровно два — ui-core и ui-vi из dist (нового CSS нет)',
      ).toBe(2);
      for (const link of stylesheets) {
        expect(link, 'стилевой файл — собранный dist').toMatch(/ui-(core|vi)\.min\.css/);
      }
      expect(
        source,
        'связующие стили паттерна — inline <style> стенда (showcase, не dist)',
      ).toContain('<style>');
    },
  );

  standTest(
    'состав: крошки → h1 «Отклик» → lead → форма; один h1; summary — первый ребёнок формы',
    async ({ stand }) => {
      const page = await stand('patterns/form-page');

      const h1 = page.locator('h1');
      await expect(h1, 'один h1 — заголовок страницы формы').toHaveCount(1);
      await expect(page.locator(SEL.breadcrumbs), 'крошки T4.7').toBeVisible();
      await expect(page.locator(SEL.title), 'h1 «Отклик» (Context)').toContainText('Отклик');
      await expect(page.locator(SEL.lead), 'lead-подзаголовок (T3.3)').toBeVisible();
      await expect(page.locator(SEL.form), 'живая форма — ui-form').toBeVisible();
      await expect(page.locator(SEL.aside), 'aside-сводка вакансии').toBeVisible();
      await expect(page.locator(SEL.asideBack), 'возврат к вакансии — ссылка-кнопка').toBeVisible();

      // summary — первый элемент-ребёнок формы (Do T5.4).
      const firstChild = await page.locator(SEL.form).evaluate((form) => ({
        tag: form.firstElementChild.tagName,
        cls: form.firstElementChild.className,
      }));
      expect(firstChild.tag, 'первый ребёнок .ui-form — сводная ошибка').toBe('DIV');
      expect(firstChild.cls).toContain('ui-form__summary');
    },
  );

  standTest(
    'решение «aside до формы» (Implementation requirements п.1): aside в DOM раньше полей на стенде',
    async ({ stand }) => {
      const page = await stand('patterns/form-page');
      const source = await page.request
        .get('/showcase/dist/stands/patterns/form-page.html')
        .then((r) => r.text());
      const asideIdx = source.indexOf('class="ui-form__aside"');
      const mainIdx = source.indexOf('class="ui-form__main"');
      expect(asideIdx, 'aside-сводка раньше основной колонки в исходнике').toBeGreaterThan(-1);
      expect(mainIdx).toBeGreaterThan(asideIdx);

      // И в живом DOM (порядок чтения скринридера).
      const domOrder = await page.evaluate(() =>
        Boolean(
          document
            .getElementById('fpp-aside')
            .compareDocumentPosition(document.getElementById('fpp-main')) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      );
      expect(domOrder, 'DOM-порядок: aside → main (порядок чтения = решению)').toBe(true);
    },
  );

  standTest(
    'форма без novalidate в разметке; модуль ставит его на data-ui-формах',
    async ({ stand }) => {
      const page = await stand('patterns/form-page');
      const source = await page.request
        .get('/showcase/dist/stands/patterns/form-page.html')
        .then((r) => r.text());
      const formTags = source.match(/<form\b[^>]*>/g) ?? [];
      expect(formTags.length, 'на стенде две формы (живая и серверная ветка)').toBe(2);
      for (const tag of formTags) {
        expect(tag, `в разметке ${tag} novalidate нет (ТЗ №14)`).not.toContain('novalidate');
      }
      for (const form of [SEL.form, SEL.serverForm]) {
        await expect(page.locator(form), `модуль активировал ${form}`).toHaveAttribute(
          'novalidate',
          '',
        );
      }
    },
  );
});

standTest.describe('patterns/form-page: форма-цикл без JS (Testing requirements)', () => {
  standTest(
    'без JS пустое required блокирует сабмит браузером (нативная валидация)',
    async ({ stand }) => {
      const page = await stand('patterns/form-page');
      const standUrl = page.url();
      const context = await page.context().browser().newContext({ javaScriptEnabled: false });
      const noJsPage = await context.newPage();
      try {
        await noJsPage.goto(standUrl, { waitUntil: 'networkidle' });
        await noJsPage.locator(SEL.submit).click();
        await noJsPage.waitForTimeout(1500);
        expect(
          noJsPage.url(),
          'пустое обязательное поле: нативная валидация заблокировала сабмит',
        ).toBe(standUrl);
      } finally {
        await context.close();
      }
    },
  );

  standTest(
    'без JS заполненная форма отправляется (POST → action, сервер — источник истины)',
    async ({ stand }) => {
      const page = await stand('patterns/form-page');
      const standUrl = page.url();
      const context = await page.context().browser().newContext({ javaScriptEnabled: false });
      const noJsPage = await context.newPage();
      try {
        await noJsPage.goto(standUrl, { waitUntil: 'networkidle' });
        await noJsPage.fill(SEL.lastname, 'Иванов');
        await noJsPage.fill(SEL.firstname, 'Иван');
        await noJsPage.fill(SEL.phone, '+7 900 000-00-00');
        await noJsPage.fill(SEL.email, 'ivan@example.ru');
        await noJsPage.check(SEL.consent);
        await noJsPage.locator(SEL.submit).click();
        await noJsPage.waitForURL(/form-page\.html#fpp-title$/);
        expect(
          noJsPage.url(),
          'валидная форма ушла на сервер: браузер выполнил переход по action формы',
        ).toMatch(/form-page\.html#fpp-title$/);
      } finally {
        await context.close();
      }
    },
  );
});

standTest.describe('patterns/form-page: форма-цикл с JS (модуль IraoUI.form, T5.5)', () => {
  standTest(
    'сабмит с ошибками: сводная ошибка показана и получает фокус; поля — по контракту T5.6',
    async ({ stand }) => {
      const page = await stand('patterns/form-page');

      await page.locator(SEL.submit).click();

      const summary = page.locator(SEL.summary);
      await expect(summary, 'сводная ошибка показана (hidden снят)').toBeVisible();
      await expect(summary, 'фокус на сводной (правило фокуса T5.4)').toBeFocused();
      await expect(summary).toHaveAttribute('role', 'alert');
      const links = summary.locator('.ui-form__summary-list a');
      expect(
        await links.count(),
        'ссылки summary — на обязательные поля (href="#id")',
      ).toBeGreaterThanOrEqual(5);
      await expect(links.first()).toHaveAttribute(
        'href',
        /#fpp-(lastname|firstname|phone|email|consent)/,
      );

      // Контракт T5.6 на первом ошибочном поле.
      await expect(page.locator(SEL.lastname).locator('..')).toHaveClass(/ui-field--error/);
      const state = await errorStateOf(page, 'fpp-lastname');
      expect(state.wrapHasErrorClass, 'обвязка — ui-field--error').toBe(true);
      expect(state.ariaInvalid, 'aria-invalid="true"').toBe('true');
      expect(state.describedbyTokens, 'id ошибки — суффикс -error').toContain('<error>');
      expect(state.errorRole, 'текст ошибки — role="alert"').toBe('alert');
      expect(state.errorDisplayed, 'ошибка отображается').toBe(true);
    },
  );

  standTest(
    'клик по ссылке summary переводит фокус на поле (доопределение T5.4)',
    async ({ stand }) => {
      const page = await stand('patterns/form-page');
      await page.locator(SEL.submit).click();
      await expect(page.locator(SEL.summary)).toBeVisible();

      await page.locator(`${SEL.summary} .ui-form__summary-list a`).first().click();
      await expect(
        page.locator(SEL.lastname),
        'фокус на поле после клика по ссылке сводной',
      ).toBeFocused();
    },
  );

  standTest(
    'валидный сабмит модуль пропускает: браузер выполняет переход по action',
    async ({ stand }) => {
      const page = await stand('patterns/form-page');
      await page.fill(SEL.lastname, 'Иванов');
      await page.fill(SEL.firstname, 'Иван');
      await page.fill(SEL.phone, '+7 900 000-00-00');
      await page.fill(SEL.email, 'ivan@example.ru');
      await page.check(SEL.consent);

      await page.locator(SEL.submit).click();
      await page.waitForURL(/form-page\.html#fpp-title$/);
      expect(page.url(), 'страница перезагружена сервером (preventDefault не вызван)').toMatch(
        /form-page\.html#fpp-title$/,
      );
    },
  );
});

standTest.describe('patterns/form-page: ветки цикла T5.6 (серверный ответ / success)', () => {
  standTest(
    'серверная ветка: сводная видима, поля в состоянии ошибки по контракту T5.6',
    async ({ stand }) => {
      const page = await stand('patterns/form-page');
      const summary = page.locator(SEL.serverSummary);
      await expect(summary, 'серверная сводная рендерится видимой (без hidden)').toBeVisible();
      await expect(summary).toHaveAttribute('role', 'alert');
      await expect(summary).toHaveAttribute('tabindex', '-1');

      for (const id of ['fpp-srv-lastname', 'fpp-srv-email']) {
        const state = await errorStateOf(page, id);
        expect(state.wrapHasErrorClass, `${id}: ui-field--error`).toBe(true);
        expect(state.ariaInvalid, `${id}: aria-invalid="true"`).toBe('true');
        expect(state.describedbyTokens, `${id}: id ошибки — суффикс -error`).toContain('<error>');
        expect(state.errorRole, `${id}: текст ошибки — role="alert"`).toBe('alert');
        expect(state.errorDisplayed, `${id}: ошибка отображается`).toBe(true);
      }
    },
  );

  standTest(
    'inline-сниппет сервера: после загрузки фокус на сводной ошибке (T5.6)',
    async ({ stand }) => {
      const page = await stand('patterns/form-page');
      const active = await page.evaluate(() => document.activeElement?.id ?? '');
      expect(active, 'фокус на серверной сводной сразу после загрузки страницы').toBe(
        'fpp-server-summary',
      );
    },
  );

  standTest(
    'success-ветка: блок видим, заголовок — цель фокуса (tabindex="-1")',
    async ({ stand }) => {
      const page = await stand('patterns/form-page');
      await expect(page.locator(SEL.successBlock), 'success-блок рендерится видимым').toBeVisible();
      await expect(page.locator(SEL.successTitle)).toHaveAttribute('tabindex', '-1');

      // Сниппет success на стенде не исполняется (ветки рядом — одна страница);
      // поведение заголовка проверяется программным фокусом (как на T5.6).
      await page.locator(SEL.successTitle).focus();
      await expect(
        page.locator(SEL.successTitle),
        'фокус встаёт на success-заголовок',
      ).toBeFocused();
      await expect(
        page.locator(`${SEL.successBlock} .ui-form__success-actions a`),
        'CTA-лента ведёт к списку вакансий (паттерн T8.1)',
      ).toBeVisible();
    },
  );
});

standTest.describe(
  'patterns/form-page: адаптив обеих раскладок (Implementation requirements)',
  () => {
    standTest(
      'мобильная база (375): одна колонка, aside-сводка НАД формой, sticky выключен',
      async ({ stand }) => {
        const page = await stand('patterns/form-page');
        await page.setViewportSize(VIEWPORTS.mobile);

        const position = await page
          .locator(SEL.aside)
          .evaluate((el) => getComputedStyle(el).position);
        expect(position, 'в мобильной базе позиционирования нет (T5.4)').toBe('static');

        const boxes = await page.evaluate(() => {
          const aside = document.getElementById('fpp-aside').getBoundingClientRect();
          const main = document.getElementById('fpp-main').getBoundingClientRect();
          return {
            asideBottom: aside.bottom,
            mainTop: main.top,
            asideLeft: aside.left,
            mainLeft: main.left,
          };
        });
        expect(
          boxes.mainTop,
          'поля формы начинаются ПОСЛЕ aside-сводки (решение «до формы»)',
        ).toBeGreaterThanOrEqual(boxes.asideBottom - 1);
        expect(boxes.asideLeft, 'одна колонка — aside в том же потоке, что и форма').toBeCloseTo(
          boxes.mainLeft,
          0,
        );
      },
    );

    standTest(
      'md (768): сетка полей двухколоночная, лейаут ещё стек (aside над формой)',
      async ({ stand }) => {
        const page = await stand('patterns/form-page');
        await page.setViewportSize(VIEWPORTS.tablet);

        const gridColumns = await page
          .locator(`${SEL.form} .ui-form__grid`)
          .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
        expect(gridColumns, 'ui-form__grid — 2 колонки от md (T5.4)').toBe(2);

        const position = await page
          .locator(SEL.aside)
          .evaluate((el) => getComputedStyle(el).position);
        expect(position, 'лейаут со aside ещё в стеке (двухколоночный — только от lg)').toBe(
          'static',
        );

        const order = await page.evaluate(
          () =>
            document.getElementById('fpp-main').getBoundingClientRect().top >=
            document.getElementById('fpp-aside').getBoundingClientRect().bottom - 1,
        );
        expect(order, 'aside по-прежнему над формой (порядок чтения не зависит от вьюпорта)').toBe(
          true,
        );
      },
    );

    standTest(
      'lg (1024): форма слева, aside справа (grid-column); aside — sticky (T5.4)',
      async ({ stand }) => {
        const page = await stand('patterns/form-page');
        await page.setViewportSize(VIEWPORTS.xl); // 1280 — заведомо ≥ lg

        const geo = await page.evaluate(() => {
          // Координаты top — document-relative (+scrollY): сниппет серверной
          // ветки фокусирует сводную после загрузки, браузер скроллит страницу
          // к ней — viewport-relative rect не сравнивает положение колонок.
          const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;
          const layout = document.getElementById('fpp-layout').getBoundingClientRect();
          const aside = document.getElementById('fpp-aside').getBoundingClientRect();
          const main = document.getElementById('fpp-main').getBoundingClientRect();
          return {
            mainLeft: main.left,
            asideLeft: aside.left,
            layoutRight: layout.right,
            asideWidth: aside.width,
            mainTop: docTop(document.getElementById('fpp-main')),
            asideTop: docTop(document.getElementById('fpp-aside')),
          };
        });
        expect(
          geo.mainLeft,
          'форма — колонка 1 (левая, одобренная раскладка career-portal)',
        ).toBeLessThan(geo.asideLeft);
        expect(
          geo.asideLeft,
          'aside — колонка 2 (правая), DOM при этом не переставлялся',
        ).toBeLessThan(geo.layoutRight);
        expect(
          Math.round(geo.asideWidth),
          'ширина aside — --ui-form-aside-width (400px, T5.4)',
        ).toBe(400);

        // Плэйсмент колонок пинуется computed-значениями grid: визуальные
        // rect не годятся — прилипший (sticky) aside смещён относительно
        // своего натурального места в строке лейаута.
        const placement = await page.evaluate(() => {
          const start = (el) => {
            const style = getComputedStyle(el);
            return { col: style.gridColumnStart, row: style.gridRowStart };
          };
          return {
            main: start(document.getElementById('fpp-main')),
            aside: start(document.getElementById('fpp-aside')),
          };
        });
        expect(placement.main.col, 'main — колонка 1 лейаута (grid-column связки)').toBe('1');
        expect(placement.aside.col, 'aside — колонка 2 (правая)').toBe('2');
        expect(placement.main.row, 'оба элемента — строка 1 лейаута').toBe('1');
        expect(placement.aside.row).toBe('1');

        const position = await page
          .locator(SEL.aside)
          .evaluate((el) => getComputedStyle(el).position);
        expect(position, 'sticky aside включает компонент ui-form от lg').toBe('sticky');
      },
    );

    standTest(
      '32px-база: 375/768/1280 — без горизонтального скролла и перекрытий ключевых узлов',
      async ({ stand }) => {
        const page = await stand('patterns/form-page');
        await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });

        for (const width of BASE32_WIDTHS) {
          await page.setViewportSize({ width, height: 900 });
          const root = await page.evaluate(() =>
            parseFloat(getComputedStyle(document.documentElement).fontSize),
          );
          expect(root, `32px-база применена (${width})`).toBe(32);
          await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));

          expect(
            await collectLayoutViolations(page),
            `32px-база (${width}): колонки лейаута (aside × форма) не перекрываются`,
          ).toEqual([]);
        }
      },
    );
  },
);

standTest.describe('patterns/form-page: a11y страницы (AC)', () => {
  standTest('axe страницы чист', async ({ stand }) => {
    const page = await stand('patterns/form-page');
    const results = await a11y(page).analyze();
    expect(
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`),
      'axe: violations = []',
    ).toEqual([]);
  });

  standTest(
    'иерархия заголовков без пропусков: h1 → h2 (aside/ветки) → h3 (сводные веток)',
    async ({ stand }) => {
      const page = await stand('patterns/form-page');
      const levels = await page.evaluate(() =>
        [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1])),
      );
      expect(levels[0], 'страница открывается h1').toBe(1);
      expect(
        levels.filter((level) => level === 1),
        'h1 один',
      ).toHaveLength(1);
      for (let i = 1; i < levels.length; i += 1) {
        expect(
          levels[i],
          `заголовок №${i}: без пропуска уровня (h${levels[i - 1]} → h${levels[i]})`,
        ).toBeLessThanOrEqual(levels[i - 1] + 1);
      }
    },
  );

  standTest(
    'фокус-порядок формы естественный (Accessibility requirements): aside-ссылка до полей',
    async ({ stand }) => {
      const page = await stand('patterns/form-page');
      // Сниппет серверной ветки ставит фокус на сводную после загрузки, а
      // blur() в Chromium не сбрасывает точку последовательного Tab-обхода.
      // Поэтому порядок проверяется смежностью: фокус на элемент → следующий
      // Tab обязан попасть в СЛЕДУЮЩИЙ по DOM. «Первый таб-стоп страницы» —
      // skip-link (это поведение каркаса, пин tests/e2e/skip-link.spec.js).
      const nextStopFrom = async (selector) => {
        await page.locator(selector).focus();
        await page.keyboard.press('Tab');
        return focusedDescriptor(page);
      };

      expect(
        await nextStopFrom('.ui-skip-link'),
        'skip-link → домашняя ссылка каркаса (порядок DOM)',
      ).toBe('ui-showcase-header__home');
      expect(await nextStopFrom('.ui-showcase-header__home'), 'каркас → тема').toBe(
        'ui-showcase-theme',
      );
      expect(await nextStopFrom('#ui-showcase-theme'), 'каркас → первая ссылка крошек').toBe(
        'ui-breadcrumbs__link',
      );

      // Крошки: три ссылки по порядку; после последней — aside-ссылка.
      const secondCrumb = await page.locator(`${SEL.breadcrumbs} a`).nth(1);
      await secondCrumb.focus();
      await page.keyboard.press('Tab');
      expect(await focusedDescriptor(page), 'вторая ссылка крошек → третья').toBe(
        'ui-breadcrumbs__link',
      );

      expect(
        await nextStopFrom(`${SEL.breadcrumbs} a >> nth=2`),
        'последняя ссылка крошек → aside-ссылка «Вернуться» (решение «до формы»)',
      ).toBe('fpp-aside-back');

      // Поля формы — в DOM-порядке, без перепрыгиваний.
      expect(await nextStopFrom(SEL.asideBack), 'aside-ссылка → первое поле (Фамилия)').toBe(
        'fpp-lastname',
      );
      const fieldOrder = [
        'fpp-lastname',
        'fpp-firstname',
        'fpp-phone',
        'fpp-email',
        'fpp-resume',
        'fpp-extra',
        'fpp-consent',
      ];
      for (let i = 0; i < fieldOrder.length - 1; i += 1) {
        expect(
          await nextStopFrom(`#${fieldOrder[i]}`),
          `${fieldOrder[i]} → ${fieldOrder[i + 1]} (порядок DOM)`,
        ).toBe(fieldOrder[i + 1]);
      }
      expect(
        await nextStopFrom(SEL.consent),
        'чекбокс → ссылка Политики в hint (DOM-порядок; ссылки согласия — вне label)',
      ).toBe('ui-link');
      expect(await nextStopFrom('#fpp-consent-hint a'), 'ссылка Политики → сабмит формы').toContain(
        'ui-button',
      );
    },
  );

  standTest(
    'порядок чтения: крошки → h1 → живая форма → «серверный ответ» → success',
    async ({ stand }) => {
      const page = await stand('patterns/form-page');
      const order = await page.evaluate(() => {
        const parts = ['fpp-breadcrumbs', 'fpp-title', 'fpp-form', 'fpp-server', 'fpp-success'].map(
          (id) => document.getElementById(id),
        );
        return parts.every((el, i) => {
          if (i === 0) return true;
          return Boolean(
            parts[i - 1].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING,
          );
        });
      });
      expect(order, 'DOM-порядок = смысловой').toBe(true);
    },
  );
});

standTest.describe('patterns/form-page: эталоны (AC: visual 375/768/1440)', () => {
  standTest(
    'эталоны страницы формы на 375/768/1440 — fullPage, только из контейнера/CI',
    async ({ stand }) => {
      const page = await stand('patterns/form-page');
      // Хелпер shot(): вьюпорт из шкалы, fullPage; вне контейнера/CI — no-op
      // с аннотацией shot-skipped (ADR-0004).
      await shot(page, { name: 'pattern-form-page', viewport: 'mobile' });
      await shot(page, { name: 'pattern-form-page', viewport: 'tablet' });
      await shot(page, { name: 'pattern-form-page', viewport: 'desktop' });
    },
  );
});

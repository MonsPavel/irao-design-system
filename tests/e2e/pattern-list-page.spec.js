/**
 * e2e паттерна «Страница списка» (T8.1; Testing requirements + AC) —
 * стенд patterns/list-page (stands/patterns/list-page.html), эталонная
 * сборка страницы списка из компонентов системы БЕЗ нового CSS.
 *
 * Ветки стенда (как form-full-cycle T5.6 — якоря-состояния рядом):
 *  - #lpp-results — «с данными»: page-head (h1 + счётчик aria-live + lead),
 *    GET-форма фильтров (select-пилюли data-ui-select="wrap"), сетка
 *    ui-grid--3 с карточками, пагинация;
 *  - #lpp-empty — «пустая выдача»: счётчик 0 + ui-empty с кнопкой сброса;
 *  - #lpp-rows — «строки» (T14.10): выдача горизонтальными строками вакансий
 *    (h2 → article.ui-card--hover: h3-ссылка, место, описание, дата) с
 *    CTA-пилюлей ui-button--pill (T14.4) на демо-модалку отклика;
 *  - #lpp-side — «сайдбар фильтров» (T14.10): grid «aside | выдача» —
 *    sticky-сайдбар (select-пилюли, radio-группа «Опыт», чекбокс
 *    доступности, Применить/Сбросить, промо ui-card--filled) + чипы
 *    направлений (T14.8) над выдачей строк.
 *
 * Ключевые сценарии спеки: фильтрация GET-формой без JS (кнопка «Применить»)
 * и с JS (IraoUI.select — UX тот же); empty-ветка со сбросом; axe чист;
 * иерархия h1→h2 зелёная; фокус после применения фильтра — на заголовок
 * результатов (сниппет Technical considerations). Эталоны — element-снимки
 * веток, только из контейнера/CI (ADR-0004).
 */
import { expect } from '@playwright/test';

import { a11y, SNAPSHOTS_ENABLED, test as standTest, VIEWPORTS } from '../helpers/harness.js';

const SEL = {
  breadcrumbs: '#lpp-breadcrumbs', // крошки T4.7 в начале ветки «с данными» (T14.5)
  title: '#lpp-title', // h1 страницы-списка — цель фокуса после фильтра
  count: '#lpp-count',
  lead: '#lpp-lead',
  filter: '#lpp-filter',
  city: '#lpp-city',
  direction: '#lpp-direction',
  experience: '#lpp-experience',
  grid: '#lpp-grid',
  pagination: '#lpp-pagination',
  emptySection: '#lpp-empty',
  emptyTitle: '#lpp-empty-title',
  emptyReset: '#lpp-empty-reset',
};

const submitBtn = `${SEL.filter} button[type="submit"]`;

/** Ветка «строки» (T14.10): выдача горизонтальными строками вакансий. */
const ROWS = {
  section: '#lpp-rows',
  title: '#lpp-rows-title',
  list: '#lpp-rows-list',
  row: '.lpp-row',
  titleLink: '.lpp-row__title a',
  place: '.lpp-row__place',
  short: '.lpp-row__short',
  date: 'time.lpp-row__date',
  cta: 'a.ui-button--pill',
  applyDialog: '#lpp-apply-dialog',
};

/** Ветка «сайдбар фильтров» (T14.10): grid «aside | выдача». */
const SIDE = {
  section: '#lpp-side',
  layout: '#lpp-side .lpp-layout',
  aside: '#lpp-side-panel',
  asideTitle: '#lpp-side-title',
  form: '#lpp-side-filter',
  region: '#lpp-side-region',
  direction: '#lpp-side-direction',
  resultsTitle: '#lpp-side-results',
  chips: '#lpp-side-chips',
  promo: '#lpp-side-promo',
};

standTest.describe(
  'patterns/list-page: ветка «с данными» — эталонная сборка (Implementation requirements п.1)',
  () => {
    standTest(
      'собрана без нового CSS: подключены только файлы dist, связки — <style> стенда',
      async ({ stand }) => {
        const page = await stand('patterns/list-page');
        const source = await page.request
          .get('/showcase/dist/stands/patterns/list-page.html')
          .then((r) => r.text());

        const stylesheets = source.match(/<link rel="stylesheet"[^>]*>/g) ?? [];
        expect(
          stylesheets.length,
          'внешних стилей три — ui-core и ui-vi из dist + showcase.css каркаса (нового CSS у паттерна нет)',
        ).toBe(3);
        for (const link of stylesheets) {
          expect(link, 'стилевой файл — dist или стили каркаса полигона').toMatch(
            /ui-(core|vi)\.min\.css|showcase\.css/,
          );
        }
        expect(
          source,
          'связующие стили паттерна — inline <style> стенда (showcase, не dist)',
        ).toContain('<style>');
      },
    );

    standTest(
      'крошки T14.5: в начале сборки, несут вертикальный ритм страницы (computed 20/24px)',
      async ({ stand }) => {
        const page = await stand('patterns/list-page');

        const crumbs = page.locator(SEL.breadcrumbs);
        await expect(crumbs, 'крошки T4.7 в начале ветки «с данными»').toBeVisible();
        await expect(crumbs).toHaveAttribute('aria-label', /Хлебные крошки/);

        // Ритм крошек — у паттерна страницы (T14.5), не у компонента
        // (инвариант T4.7): полоса 62px оригинала — padding .breadcrumbs
        // 20px 0 24px (career-portal components.css:14).
        const padding = await crumbs.evaluate((el) => {
          const cs = getComputedStyle(el);
          return { top: cs.paddingTop, bottom: cs.paddingBottom };
        });
        expect(padding.top, 'сверху 20px — верх полосы 62px (components.css:14)').toBe('20px');
        expect(padding.bottom, 'снизу 24px — низ полосы 62px (components.css:14)').toBe('24px');

        // DOM-порядок: крошки раньше заголовка страницы (конвенция T8.2).
        const order = await page.evaluate(() =>
          Boolean(
            document
              .getElementById('lpp-breadcrumbs')
              .compareDocumentPosition(document.getElementById('lpp-title')) &
            Node.DOCUMENT_POSITION_FOLLOWING,
          ),
        );
        expect(order, 'крошки в DOM раньше h1 (page-head после крошек)').toBe(true);
      },
    );

    standTest(
      'page-head: h1 + счётчик aria-live polite + lead; сетка --3 и пагинация на месте',
      async ({ stand }) => {
        const page = await stand('patterns/list-page');

        const h1 = page.locator('h1');
        await expect(h1, 'один h1 — заголовок страницы-списка').toHaveCount(1);
        await expect(h1).toHaveAttribute('tabindex', '-1');
        await expect(page.locator(SEL.count)).toHaveText('Найдено: 6 вакансий');
        await expect(
          page.locator(SEL.count),
          'счётчик — aria-live polite (Technical considerations)',
        ).toHaveAttribute('aria-live', 'polite');
        await expect(page.locator(SEL.lead), 'lead-подзаголовок page-head').toBeVisible();

        const cards = page.locator(`${SEL.grid} .ui-card`);
        await expect(cards, 'сетка --3 собрана из карточек T4.4').toHaveCount(6);
        for (let i = 0; i < 6; i += 1) {
          await expect(cards.nth(i), `карточка ${i}: паттерн карточки-ссылки`).toHaveClass(
            /ui-card--link/,
          );
        }
        await expect(
          page.locator(`${SEL.grid} .ui-tag`).first(),
          'теги T4.3 в карточках',
        ).toBeVisible();
        await expect(page.locator(SEL.pagination), 'пагинация T6.3').toBeVisible();
        await expect(page.locator(SEL.pagination)).toHaveAttribute('aria-label', /Пагинация/);
      },
    );

    standTest(
      'select-пилюли: IraoUI.select инициализирован, триггер растянут на обёртку сайта (wrap)',
      async ({ stand }) => {
        const page = await stand('patterns/list-page');

        // Модуль построил триггер и скрыл нативный select (PE-пара).
        const trigger = page.locator('#lpp-city-trigger');
        await expect(trigger, 'триггер построен модулем').toBeVisible();
        await expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
        await expect(page.locator(SEL.city)).toHaveClass(/ui-select__native/);

        // Растяжка триггера: бокс триггера = бокс пилюли-обёртки (data-ui-select="wrap").
        const pillBox = await page
          .locator(SEL.city)
          .evaluate((el) => el.closest('.lpp-pill').getBoundingClientRect().toJSON());
        const triggerBox = await trigger.boundingBox();
        expect(pillBox, 'пилюля-обёртка на месте').not.toBeNull();
        expect(
          Math.abs(pillBox.x - triggerBox.x),
          'триггер накрывает пилюлю: x совпадает',
        ).toBeLessThan(1);
        expect(
          Math.abs(pillBox.width - triggerBox.width),
          'триггер накрывает пилюлю: ширина совпадает',
        ).toBeLessThan(1);

        // Имя поля — label[for] рядом с пилюлей: пара APG listbox-button
        // (aria-labelledby = подпись + собственный текст триггера).
        await expect(trigger).toHaveAttribute('aria-labelledby', 'lpp-city-name lpp-city-trigger');
        await expect(page.locator('label[for="lpp-city"]')).toHaveText('Город');
      },
    );
  },
);

standTest.describe(
  'patterns/list-page: фильтрация GET-формой (Implementation requirements п.2)',
  () => {
    standTest(
      'без JS: выбор select + кнопка «Применить» → GET-навигация с параметрами',
      async ({ stand }) => {
        const page = await stand('patterns/list-page');
        const standUrl = page.url();
        const context = await page.context().browser().newContext({ javaScriptEnabled: false });
        const noJsPage = await context.newPage();
        try {
          await noJsPage.goto(standUrl, { waitUntil: 'networkidle' });

          // Без JS select нативный (модуль его не прятал) — значение выбирается им.
          await noJsPage.selectOption(SEL.city, 'msk');
          await noJsPage.selectOption(SEL.experience, 'senior');
          await noJsPage.locator(submitBtn).click();

          await noJsPage.waitForURL(/\?/, { timeout: 5000 });
          const params = new URL(noJsPage.url()).searchParams;
          expect(params.get('city'), 'город ушёл GET-параметром').toBe('msk');
          expect(params.get('experience'), 'опыт ушёл GET-параметром').toBe('senior');
          expect(
            noJsPage.url(),
            'action ведёт на якорь результатов — страница открыта на выдаче',
          ).toContain('#lpp-title');
        } finally {
          await context.close();
        }
      },
    );

    standTest(
      'с JS (IraoUI.select): выбор через триггер синхронизирует select — GET тот же',
      async ({ stand }) => {
        const page = await stand('patterns/list-page');

        const trigger = page.locator('#lpp-city-trigger');
        await trigger.click();
        const listbox = page.getByRole('listbox', { name: 'Город' });
        await expect(listbox, 'список открыт').toBeVisible();
        await listbox.getByRole('option', { name: 'Москва' }).click();

        // Выбор синхронизирован в нативный select (форма отправит его значение).
        expect(
          await page.locator(SEL.city).inputValue(),
          'значение в нативном select — форма работает как с нативным контролом',
        ).toBe('msk');

        await page.locator(submitBtn).click();
        await page.waitForURL(/\?/, { timeout: 5000 });
        expect(new URL(page.url()).searchParams.get('city'), 'GET-навигация с фильтром').toBe(
          'msk',
        );
      },
    );
  },
);

standTest.describe(
  'patterns/list-page: фокус после применения фильтра (Technical considerations)',
  () => {
    standTest(
      'перезагрузка с применённым фильтром: фокус на заголовок результатов (h1)',
      async ({ stand }) => {
        const page = await stand('patterns/list-page');
        await page.goto(`${page.url().split('?')[0]}?city=msk`, { waitUntil: 'networkidle' });
        await expect(
          page.locator(SEL.title),
          'сниппет фокуса перевёл фокус на заголовок результатов',
        ).toBeFocused();
      },
    );

    standTest('чистая загрузка (без фильтра): фокус не крадётся', async ({ stand }) => {
      const page = await stand('patterns/list-page');
      const focused = await page.evaluate(() => document.activeElement);
      expect(
        focused && (focused.id || focused.tagName),
        'на чистой загрузке заголовок не перехватывает фокус',
      ).not.toBe('lpp-title');
    });
  },
);

standTest.describe(
  'patterns/list-page: empty-ветка «ничего не найдено» (Implementation requirements п.3)',
  () => {
    standTest('счётчик 0 + ui-empty с заголовком-ролью h2 и сбросом', async ({ stand }) => {
      const page = await stand('patterns/list-page');

      await expect(
        page.locator(SEL.emptyTitle),
        'заголовок состояния — h2 (правило T4.8)',
      ).toHaveText('Вакансии не найдены');
      await expect(
        page.locator(`${SEL.emptySection} .ui-empty`),
        'empty-state виден',
      ).toBeVisible();

      const reset = page.locator(SEL.emptyReset);
      await expect(reset, 'сброс выглядит действием (link-button)').toContainClass('ui-button');
      const href = await reset.getAttribute('href');
      expect(href, 'сброс — ссылка на чистый URL, без GET-параметров').not.toContain('?');
    });

    standTest(
      'клик по сбросу ведёт на страницу без параметров (работает без JS)',
      async ({ stand }) => {
        const page = await stand('patterns/list-page');
        await page.locator(SEL.emptyReset).click();
        await page.waitForLoadState('networkidle');
        expect(new URL(page.url()).search, 'после сброса GET-параметров нет — фильтры сняты').toBe(
          '',
        );
      },
    );
  },
);

standTest.describe(
  'patterns/list-page: ветка «строки» (T14.10) — выдача строками вместо сетки',
  () => {
    standTest(
      '3+ строки: h2 выдачи → article.ui-card--hover с h3-ссылкой, местом, описанием, датой и pill-CTA',
      async ({ stand }) => {
        const page = await stand('patterns/list-page');

        const rows = page.locator(`${ROWS.section} ${ROWS.row}`);
        await expect(rows, 'выдача строками — 3+ строки вакансии').toHaveCount(4);

        // Иерархия ветки: заголовок выдачи — h2, строки — article с h3-ссылкой
        // (иерархия h1→h2→h3 без пропусков; глобальный гейт — в a11y-блоке).
        await expect(page.locator(ROWS.title), 'заголовок выдачи — h2').toBeVisible();
        expect(
          await page.locator(ROWS.title).evaluate((el) => el.tagName),
          'тег заголовка выдачи — h2 (перед h3 строк)',
        ).toBe('H2');
        for (let i = 0; i < (await rows.count()); i += 1) {
          const row = rows.nth(i);
          await expect(row, `строка ${i}: карточка с hover, НЕ карточка-ссылка`).toHaveClass(
            /ui-card ui-card--hover/,
          );
          expect(
            await row.evaluate((el) => el.classList.contains('ui-card--link')),
            `строка ${i}: CTA-пилюля вне карточки-ссылки — растянутой ссылки нет (инвариант вложенных интерактивов ui-card)`,
          ).toBe(false);
          await expect(row.locator('h3')).toHaveCount(1);
          await expect(row.locator(ROWS.titleLink), `строка ${i}: заголовок-ссылка`).toBeVisible();
          await expect(row.locator(ROWS.place), `строка ${i}: место`).not.toBeEmpty();
          await expect(row.locator(ROWS.short), `строка ${i}: описание`).toBeVisible();
          await expect(
            row.locator(ROWS.date),
            `строка ${i}: дата — <time datetime>`,
          ).toBeVisible();
          await expect(row.locator(ROWS.cta), `строка ${i}: CTA — пилюля (T14.4)`).toBeVisible();
        }
      },
    );

    standTest(
      'CTA-пилюля вне ссылки заголовка; с JS открывает демо-модалку отклика, без JS — ссылка (href)',
      async ({ stand }) => {
        const page = await stand('patterns/list-page');

        const dialog = page.locator(ROWS.applyDialog);
        await expect(dialog, 'демо-модалка отклика на стенде').toHaveCount(1);
        await expect(dialog).toHaveAttribute('data-ui-modal', '');
        await expect(dialog, 'диалог скрыт на чистой загрузке').not.toBeVisible();

        // Инвариант вложенных интерактивов: CTA — сиблинг main-блока, не внутри ссылки заголовка.
        const nested = await page.evaluate(() => {
          const row = document.querySelector('.lpp-row');
          const titleLink = row.querySelector('.lpp-row__title a');
          const cta = row.querySelector('a.ui-button--pill');
          return titleLink.contains(cta);
        });
        expect(nested, 'пилюля не вложена в ссылку заголовка').toBe(false);

        const cta = page.locator(`${ROWS.section} ${ROWS.row}`).first().locator(ROWS.cta);
        const href = await cta.getAttribute('href');
        expect(href, 'без JS пилюля ведёт ссылкой на страницу отклика').toBeTruthy();

        await cta.click();
        await expect(dialog, 'с JS пилюля открывает демо-модалку отклика').toBeVisible();
        await page.locator(`${ROWS.applyDialog} .ui-modal__close`).click();
        await expect(dialog, 'диалог закрывается крестом').not.toBeVisible();
      },
    );
  },
);

standTest.describe(
  'patterns/list-page: ветка «сайдбар фильтров» (T14.10) — grid «aside | выдача»',
  () => {
    standTest(
      'aside со sticky от md и scrollable-region-focusable; на мобиле — одна колонка',
      async ({ stand }) => {
        const page = await stand('patterns/list-page');

        const aside = page.locator(SIDE.aside);
        await expect(aside, 'aside имеет доступное имя (aria-labelledby)').toHaveAttribute(
          'aria-labelledby',
          SIDE.asideTitle.slice(1),
        );
        await expect(
          page.locator(SIDE.asideTitle),
          'заголовок сайдбара виден и именует лендмарку',
        ).toBeVisible();

        // md (768, шкала T2.5): grid «aside | выдача» — две колонки, aside sticky
        // и scrollable (max-height) — keyboard access даёт tabindex="0"
        // (axe scrollable-region-focusable).
        await page.setViewportSize(VIEWPORTS.desktop);
        const desktop = await aside.evaluate((el) => {
          const cs = getComputedStyle(el);
          return { position: cs.position, overflow: cs.overflowY, tabindex: el.tabIndex };
        });
        expect(desktop.position, 'aside sticky от md (порт .vac-side career-portal)').toBe(
          'sticky',
        );
        expect(desktop.overflow, 'сайдбар прокручивается внутри sticky-региона').toBe('auto');
        expect(desktop.tabindex, 'scrollable-region-focusable: регион фокусируется с клавиатуры').toBe(0);
        const tracks = await page
          .locator(SIDE.layout)
          .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
        expect(tracks, 'от md — две колонки (aside | выдача)').toBe(2);

        // Мобильная база: одна колонка, позиционирования нет.
        await page.setViewportSize(VIEWPORTS.mobile);
        const mobile = await aside.evaluate((el) => {
          const cs = getComputedStyle(el);
          return { position: cs.position, tracks: getComputedStyle(el.closest('.lpp-layout')).gridTemplateColumns.split(' ').length };
        });
        expect(mobile.position, 'на мобиле aside в потоке (min-width-деградация)').not.toBe(
          'sticky',
        );
        expect(mobile.tracks, 'на мобиле grid сворачивается в колонку').toBe(1);
      },
    );

    standTest(
      'label у каждого контрола, radio-группа — fieldset/legend «Опыт», чекбокс, Применить/Сбросить, промо ui-card--filled',
      async ({ stand }) => {
        const page = await stand('patterns/list-page');

        // select-пилюли сайдбара — канон ui-select wrap: label[for] рядом.
        for (const id of [SIDE.region.slice(1), SIDE.direction.slice(1)]) {
          await expect(
            page.locator(`label[for="${id}"]`),
            `пилюля ${id}: подпись label[for]`,
          ).toBeVisible();
          await expect(
            page.locator(`#${id}`),
            `пилюля ${id}: data-ui-select="wrap"`,
          ).toHaveAttribute('data-ui-select', 'wrap');
        }

        // Radio-группа «Опыт» — fieldset/legend (гейт irao/radio-group-fieldset).
        const fieldset = page.locator(`${SIDE.aside} fieldset.ui-radio-group`);
        await expect(fieldset, 'радио-группа опыта — fieldset.ui-radio-group').toHaveCount(1);
        await expect(fieldset.locator('legend')).toHaveText(/Опыт/);
        await expect(
          fieldset.locator('input[type="radio"][name="experience"]'),
          'три варианта опыта',
        ).toHaveCount(3);

        // Чекбокс доступности — label оборачивает input.
        const checkbox = page.locator(`${SIDE.aside} label.ui-checkbox input[name="accessible"]`);
        await expect(checkbox, 'чекбокс доступности в label-обвязке').toHaveCount(1);

        // GET-форма: метод/якорь выдачи и пара кнопок.
        const form = page.locator(SIDE.form);
        await expect(form).toHaveAttribute('method', 'get');
        await expect(form, 'якорь выдачи ветки — no-JS-скролл к результатам').toHaveAttribute(
          'action',
          /#lpp-side-results/,
        );
        await expect(
          form.locator('button[type="submit"]'),
          'Применить — сабмит формы',
        ).toHaveText('Применить');
        await expect(
          form.locator('button[type="reset"]'),
          'Сбросить — нативный reset формы',
        ).toHaveText('Сбросить');

        // Промо-карточка в сайдбаре — ui-card--filled со ссылкой-действием.
        const promo = page.locator(SIDE.promo);
        await expect(promo, 'промо — заполненная карточка').toHaveClass(/ui-card--filled/);
        await expect(promo.locator('a'), 'промо несёт действие-ссылку').toBeVisible();
      },
    );

    standTest(
      'чипы направлений (T14.8, ссылочная форма) в DOM раньше выдачи строк; выдача — строки',
      async ({ stand }) => {
        const page = await stand('patterns/list-page');

        const chips = page.locator(`${SIDE.chips} .ui-chip__pill`);
        const chipCount = await chips.count();
        expect(chipCount, 'лента чипов направлений — 3+').toBeGreaterThanOrEqual(3);
        for (let i = 0; i < chipCount; i += 1) {
          await expect(chips.nth(i), `чип ${i}: GET-ссылка (работает без JS)`).toHaveAttribute(
            'href',
            /\?/,
          );
        }
        await expect(
          chips.locator('[aria-current="page"]'),
          'активный чип — ровно один, aria-current="page"',
        ).toHaveCount(1);

        const order = await page.evaluate(() =>
          Boolean(
            document
              .getElementById('lpp-side-chips')
              .compareDocumentPosition(document.getElementById('lpp-side-results-list')) &
              Node.DOCUMENT_POSITION_FOLLOWING,
          ),
        );
        expect(order, 'чипы в DOM раньше выдачи строк').toBe(true);

        await expect(
          page.locator('#lpp-side-results-list .lpp-row'),
          'выдача ветки сайдбара — строки вакансий',
        ).toHaveCount(3);
      },
    );

    standTest(
      'без JS: сайдбар-форма уходит GET-параметрами, страница открывается на выдаче ветки',
      async ({ stand }) => {
        const page = await stand('patterns/list-page');
        const standUrl = page.url();
        const context = await page.context().browser().newContext({ javaScriptEnabled: false });
        const noJsPage = await context.newPage();
        try {
          await noJsPage.goto(standUrl, { waitUntil: 'networkidle' });
          await noJsPage.selectOption(SIDE.region, 'msk');
          await noJsPage.locator(`${SIDE.form} button[type="submit"]`).click();
          await noJsPage.waitForURL(/\?/, { timeout: 5000 });
          const params = new URL(noJsPage.url()).searchParams;
          expect(params.get('region'), 'регион ушёл GET-параметром').toBe('msk');
          expect(
            noJsPage.url(),
            'action ведёт на якорь выдачи ветки сайдбара',
          ).toContain('#lpp-side-results');
        } finally {
          await context.close();
        }
      },
    );

    standTest(
      'перезагрузка с фильтром сайдбара: фокус на заголовок выдачи ветки (не крадётся к ветке «с данными»)',
      async ({ stand }) => {
        const page = await stand('patterns/list-page');
        await page.goto(`${page.url().split('?')[0]}?region=msk`, { waitUntil: 'networkidle' });
        await expect(
          page.locator(SIDE.resultsTitle),
          'гвард стенда переводит фокус на заголовок выдачи ветки сайдбара',
        ).toBeFocused();
      },
    );
  },
);

standTest.describe('patterns/list-page: a11y страницы (AC)', () => {
  standTest('axe страницы чист', async ({ stand }) => {
    const page = await stand('patterns/list-page');
    const results = await a11y(page).analyze();
    expect(
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`),
      'axe: violations = []',
    ).toEqual([]);
  });

  standTest('иерархия h1→h2 зелёная: один h1, уровни без пропусков', async ({ stand }) => {
    const page = await stand('patterns/list-page');
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
  });

  standTest(
    'порядок чтения: фильтры → результаты (Accessibility requirements)',
    async ({ stand }) => {
      const page = await stand('patterns/list-page');
      const order = await page.evaluate(() => {
        const form = document.getElementById('lpp-filter');
        const grid = document.getElementById('lpp-grid');
        // Node.DOCUMENT_POSITION_FOLLOWING = 4: form идёт перед grid.
        return Boolean(form.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      expect(order, 'форма фильтров в DOM раньше выдачи').toBe(true);
    },
  );
});

standTest.describe('patterns/list-page: эталоны веток (AC: visual 3 вьюпорта)', () => {
  standTest(
    'эталоны веток «с данными»/«пустая выдача» на шкале вьюпортов — element-снимки, только из контейнера/CI',
    async ({ stand }) => {
      const page = await stand('patterns/list-page');

      const branches = [
        ['lpp-branch-results', page.locator('#lpp-results')],
        ['lpp-branch-empty', page.locator(SEL.emptySection)],
        ['lpp-branch-rows', page.locator(ROWS.section)], // T14.10 — выдача строками
        ['lpp-branch-side', page.locator(SIDE.section)], // T14.10 — сайдбар фильтров
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
            // Допуск 32 px — точечный, для AA-шума скруглений карточек у края
            // element-снимка (тот же класс явления, что глобальные 8 px в
            // playwright.config.mjs — «лотерея растеризации», диагноз
            // pattern-form-page--desktop 19.10). T14.2 (h1 стал шкалой h2)
            // сдвинул углы в дробную фазу бокса секции (y=701.25): правый
            // срез снимка режет дуги скруглений, фаза AA шатается между
            // прогонами ±1/255 на 18–20 px (x=357–359, полосы — верх/низ
            // карточек). Структурно устранить нельзя: scrollMargin у
            // toHaveScreenshot в Playwright 1.63 нет (проверено по
            // node_modules; вариант «снимать page.screenshot с clip по фону»
            // требует toMatchSnapshot-механики и локального дубля настроек).
            // 32 px: запас 1.6× к наблюдённому максимуму (20) и 2.4× ниже
            // минимальной реальной регрессии (78 px, search-overlay PR #5).
            maxDiffPixels: 32,
          });
        }
      }
    },
  );
});

/**
 * e2e паттерна «Страница списка» (T8.1; Testing requirements + AC) —
 * стенд patterns/list-page (stands/patterns/list-page.html), эталонная
 * сборка страницы списка из компонентов системы БЕЗ нового CSS.
 *
 * Ветки стенда (как form-full-cycle T5.6 — якоря-состояния рядом):
 *  - #lpp-results — «с данными»: page-head (h1 + счётчик aria-live + lead),
 *    GET-форма фильтров (select-пилюли data-ui-select="wrap"), сетка
 *    ui-grid--3 с карточками, пагинация;
 *  - #lpp-empty — «пустая выдача»: счётчик 0 + ui-empty с кнопкой сброса.
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

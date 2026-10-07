/**
 * e2e ui-breadcrumbs (T4.7; Testing requirements).
 *
 * Поверхность — стенд showcase/pages/ui-breadcrumbs (базовая цепочка из
 * 3 уровней, длинные названия/мобильная лента, промежуточный уровень без
 * ссылки). Проверяется:
 *  1. микроразметка schema.org BreadcrumbList (AC, Implementation requirements
 *     п.1): парсер-тест структуры — itemscope/itemtype на ol, ListItem на li,
 *     позиции 1..N строго последовательно, имена непустые, item (href) есть у
 *     всех элементов цепочки, кроме текущего (правило Google:
 *     https://developers.google.com/search/docs/appearance/structured-data/
 *     breadcrumb — item последнего не требуется, берётся URL страницы);
 *  2. aria-current="page" (AC): текущая страница — span, не ссылка, из
 *     Tab-порядка исключена (Accessibility requirements: текущая не ссылка);
 *  3. Tab-навигация (AC): ссылки доступны с клавиатуры в порядке чтения
 *     (порядок чтения = визуальный порядок), фокус-обводка — глобальная
 *     политика ADR-0001;
 *  4. разделитель — не в тексте ссылок (Implementation requirements п.2):
 *     псевдоэлемент ::before на соседнем li, в доступном тексте ссылок «/» нет;
 *  5. мобильная лента (Scope, Implementation requirements п.3): на 375 цепочка
 *     скроллится (overflow-x: auto, свайп-поверхность), страница горизонтально
 *     не переполняется, скроллбар скрыт (scrollbar-width: none) при
 *     сохранённой функциональности; на md+ — перенос (flex-wrap: wrap);
 *  6. axe чист — известных исключений нет;
 *  7. эталоны 375/768/1280/1440 — только из контейнера/CI (ADR-0004).
 *
 * Разовая проверка Rich Results (Implementation requirements п.1) выполняется
 * вручную на развёрнутой странице — в локальном прогоне недоступна (внешний
 * сервис Google); локальный эквивалент — парсер-тест п.1 по схеме Google.
 */
import { expect } from '@playwright/test';

import { a11y, shot, test as standTest, VIEWPORTS } from '../helpers/harness.js';

/** Идентификаторы стендов-навигаций (showcase/pages/ui-breadcrumbs/index.html). */
const BC = {
  basic: 'ui-breadcrumbs-basic',
  long: 'ui-breadcrumbs-long',
  unlinked: 'ui-breadcrumbs-unlinked',
};

/** Ожидание базовой цепочки: Главная → Вакансии → Стажировка (текущая). */
const BASIC_EXPECTED = [
  { position: 1, name: 'Главная', item: '#ui-breadcrumbs-home' },
  { position: 2, name: 'Вакансии', item: '#ui-breadcrumbs-vacancies' },
  { position: 3, name: 'Стажировка в ИРАО', item: null },
];

/**
 * Парсер микроразметки (Implementation requirements п.1): читает цепочку
 * стенда как робот — BreadcrumbList на ol, ListItem на li, position/name/item.
 * Возвращает { listSemantics, items: [{position, name, item, prop}] }.
 */
const parseChain = (page, navId) =>
  page.locator(`#${navId}`).evaluate((nav) => {
    const list = nav.querySelector('[itemtype="https://schema.org/BreadcrumbList"]');
    if (!list) return { error: 'BreadcrumbList (itemscope/itemtype) на ol не найден' };
    const listItems = [
      ...list.querySelectorAll(':scope > [itemtype="https://schema.org/ListItem"]'),
    ];
    return {
      listSemantics: list.tagName === 'OL' && list.getAttribute('role') === 'list',
      items: listItems.map((li) => ({
        prop: li.getAttribute('itemprop'),
        position: Number(li.querySelector('meta[itemprop="position"]')?.content ?? NaN),
        name: li.querySelector('[itemprop="name"]')?.textContent.trim() ?? null,
        item: li.querySelector('a[itemprop="item"]')?.getAttribute('href') ?? null,
      })),
    };
  });

/** Ссылки цепочки: текст без разделителя и полный текст li (для сравнения). */
const linkTexts = (page, navId) =>
  page.locator(`#${navId}`).evaluate((nav) =>
    [...nav.querySelectorAll('a')].map((a) => ({
      href: a.getAttribute('href'),
      text: a.textContent.trim(),
    })),
  );

/** Разделитель второго li: computed content псевдоэлемента ::before. */
const separatorContent = (page, navId) =>
  page
    .locator(`#${navId} .ui-breadcrumbs__item:nth-child(2)`)
    .evaluate((el) => getComputedStyle(el, '::before').content);

/** Геометрия и computed-стили ленты цепочки. */
const stripState = (page, navId) =>
  page.locator(`#${navId} .ui-breadcrumbs__list`).evaluate((list) => ({
    scrollWidth: list.scrollWidth,
    clientWidth: list.clientWidth,
    overflowX: getComputedStyle(list).overflowX,
    flexWrap: getComputedStyle(list).flexWrap,
    scrollbarWidth: getComputedStyle(list).scrollbarWidth,
  }));

/** Горизонтальное переполнение страницы (лента обязана скроллиться внутри). */
const pageOverflowX = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Клавиатурный обход до элемента (фокус с клавиатуры — :focus-visible, ADR-0001). */
async function tabTo(page, locator) {
  for (let step = 0; step < 30; step += 1) {
    if (await locator.evaluate((el) => el.matches(':focus-visible'))) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('фокус не дошёл до элемента за 30 Tab');
}

standTest.describe('ui-breadcrumbs: микроразметка BreadcrumbList (T4.7)', () => {
  standTest(
    'парсер структуры (AC): позиции 1..N, имена, item у предков и его отсутствие у текущей',
    async ({ stand }) => {
      const page = await stand('ui-breadcrumbs');

      const parsed = await parseChain(page, BC.basic);
      expect(parsed.error, 'BreadcrumbList найден на ol').toBeUndefined();
      expect(
        parsed.listSemantics,
        'ol + role="list" (семантика «шаг N из M» сохранена при list-style: none)',
      ).toBe(true);
      expect(parsed.items, 'цепочка из 3 уровней (AC)').toHaveLength(3);

      for (const [index, expected] of BASIC_EXPECTED.entries()) {
        const item = parsed.items[index];
        expect(item.prop, `li ${index + 1}: itemprop="itemListElement"`).toBe('itemListElement');
        expect(item.position, `li ${index + 1}: position ${expected.position}`).toBe(
          expected.position,
        );
        expect(item.name, `li ${index + 1}: имя ${expected.name}`).toBe(expected.name);
        expect(item.item, `li ${index + 1}: item (URL уровня)`).toBe(expected.item);
      }

      // item обязан быть у всех элементов, кроме последнего (правило Google);
      // последний без item наследует URL текущей страницы.
      expect(
        parsed.items.slice(0, -1).every((item) => item.item),
        'у всех элементов, кроме последнего, есть item',
      ).toBe(true);
      expect(parsed.items.at(-1).item, 'у текущей страницы item нет (span без ссылки)').toBeNull();
    },
  );

  standTest(
    'промежуточный уровень без ссылки: «Главная → Раздел без ссылки → Текущая» разбирается',
    async ({ stand }) => {
      const page = await stand('ui-breadcrumbs');

      const parsed = await parseChain(page, BC.unlinked);
      expect(parsed.error, 'BreadcrumbList найден').toBeUndefined();
      expect(parsed.items).toHaveLength(3);
      expect(parsed.items.map((item) => item.name)).toEqual([
        'Главная',
        'Каталог материалов',
        'Отчёты за 2025 учебный год',
      ]);
      expect(
        parsed.items.map((item) => item.item),
        'item есть только у «Главной»: уровень без страницы item не несёт, текущая — span',
      ).toEqual(['#ui-breadcrumbs-home', null, null]);
      expect(
        parsed.items.map((item) => item.position),
        'позиции последовательны (1..3) и при уровне без ссылки',
      ).toEqual([1, 2, 3]);
    },
  );

  standTest(
    'длинная цепочка разбирается: 4 уровня, позиции последовательно, текущая — span',
    async ({ stand }) => {
      const page = await stand('ui-breadcrumbs');

      const parsed = await parseChain(page, BC.long);
      expect(parsed.error, 'BreadcrumbList найден').toBeUndefined();
      expect(parsed.items).toHaveLength(4);
      expect(
        parsed.items.map((item) => item.position),
        'позиции 1..4 без пропусков',
      ).toEqual([1, 2, 3, 4]);
      expect(parsed.items.at(-1).item, 'текущая — без ссылки').toBeNull();
      for (const item of parsed.items) {
        expect(item.name, 'имена непусты').toBeTruthy();
      }
    },
  );

  standTest(
    'aria-current="page" (AC): текущая — span, не ссылка; порядок чтения = разметке',
    async ({ stand }) => {
      const page = await stand('ui-breadcrumbs');

      const nav = page.locator(`#${BC.basic}`);
      await expect(nav).toHaveAttribute('aria-label', /Хлебные крошки/);

      const current = nav.locator('.ui-breadcrumbs__current');
      await expect(current).toHaveAttribute('aria-current', 'page');
      await expect(
        current,
        'текущая — span, не ссылка (Accessibility requirements)',
      ).toHaveJSProperty('tagName', 'SPAN');

      // Текущая страница — последний элемент разметки (порядок чтения =
      // визуальный порядок: текст «Стажировка» правее «Вакансий»).
      const list = nav.locator('.ui-breadcrumbs__list');
      await expect(list.locator('.ui-breadcrumbs__item')).toHaveCount(3);
      const currentBox = await current.boundingBox();
      const lastLinkBox = await nav.locator('a').last().boundingBox();
      expect(currentBox.x, 'текущая страница — визуально последняя').toBeGreaterThan(lastLinkBox.x);
    },
  );

  standTest(
    'Tab-навигация (AC): ссылки доступны с клавиатуры по порядку, текущая — не остановка',
    async ({ stand }) => {
      const page = await stand('ui-breadcrumbs');

      const links = page.locator(`#${BC.basic} .ui-breadcrumbs__link`);
      await tabTo(page, links.first());
      await expect(links.first(), 'первая ссылка — фокус с клавиатуры').toBeFocused();

      await page.keyboard.press('Tab');
      await expect(links.nth(1), 'вторая ссылка — следующий Tab (порядок чтения)').toBeFocused();

      await page.keyboard.press('Tab');
      const focusedTag = await page.evaluate(() => document.activeElement.tagName);
      expect(focusedTag, 'после последней ссылки фокус покидает nav (текущая — span)').not.toBe(
        'SPAN',
      );
      await expect(page.locator(`#${BC.basic} .ui-breadcrumbs__current`)).not.toBeFocused();
    },
  );

  standTest(
    'разделитель — не в тексте ссылок (Implementation requirements п.2): ::before, «/» вне имён',
    async ({ stand }) => {
      const page = await stand('ui-breadcrumbs');

      for (const { text, href } of await linkTexts(page, BC.basic)) {
        expect(text, `текст ссылки ${href} без разделителя`).not.toContain('/');
      }
      expect(
        await separatorContent(page, BC.basic),
        'разделитель — content псевдоэлемента ::before соседнего li',
      ).toBe('"/"');
    },
  );
});

standTest.describe('ui-breadcrumbs: адаптив и доступность (T4.7)', () => {
  standTest(
    'мобильная лента (Scope): 375 — скролл внутри цепочки, страница не переполняется, скроллбар скрыт',
    async ({ stand }) => {
      const page = await stand('ui-breadcrumbs');
      await page.setViewportSize(VIEWPORTS.mobile);

      const strip = await stripState(page, BC.long);
      expect(strip.overflowX, 'лента: overflow-x auto (Implementation requirements п.3)').toBe(
        'auto',
      );
      expect(strip.scrollWidth, 'длинные названия дают переполнение ленты').toBeGreaterThan(
        strip.clientWidth,
      );
      expect(strip.scrollbarWidth, 'скроллбар скрыт (scrollbar-width: none)').toBe('none');
      expect(
        await pageOverflowX(page),
        'страница горизонтально не переполняется',
      ).toBeLessThanOrEqual(0);

      // Базовая цепочка на 375 помещается: лента — свойство длинных цепочек.
      const basic = await stripState(page, BC.basic);
      expect(basic.scrollWidth, 'базовая цепочка без переполнения').toBeLessThanOrEqual(
        basic.clientWidth,
      );
    },
  );

  standTest(
    'md+ (768): цепочка переносится (flex-wrap), лента деактивирована',
    async ({ stand }) => {
      const page = await stand('ui-breadcrumbs');
      await page.setViewportSize(VIEWPORTS.tablet);

      const strip = await stripState(page, BC.long);
      expect(strip.flexWrap, 'на md+ цепочка переносится (career-portal десктоп)').toBe('wrap');
      expect(strip.overflowX, 'скролл не активен — перенос решает длину').toBe('visible');
      expect(strip.scrollWidth, 'перенесённая цепочка не скроллится').toBeLessThanOrEqual(
        strip.clientWidth,
      );
    },
  );

  standTest('axe: стенд чист — известных исключений нет (AC)', async ({ stand }) => {
    const page = await stand('ui-breadcrumbs');
    const results = await a11y(page).analyze();
    expect(
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`),
      'axe: violations = []',
    ).toEqual([]);
  });

  standTest(
    'эталоны ui-breadcrumbs 375/768/1280/1440 — только из контейнера (ADR-0004)',
    async ({ stand }) => {
      const page = await stand('ui-breadcrumbs');
      for (const viewport of Object.keys(VIEWPORTS)) {
        await shot(page, { name: 'ui-breadcrumbs', viewport });
      }
    },
  );
});

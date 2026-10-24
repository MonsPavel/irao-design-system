/**
 * Юнит-пин пилотной страницы каталога обучения (T15.3; Testing requirements —
 * «поверхностная проверка compare.mjs», пины до браузерной пробы — практика
 * pilot-company.test.js T15.2).
 *
 * Поверхность браузера (docHeight/probes/скриншоты/console) даёт compare.mjs
 * на живой паре страниц; здесь — пины исполняемой формы решения:
 *  - build.mjs: страница education-catalog.html в PAGES (мёртвая ссылка
 *    «Все предложения» с education.html — раунд 2, REPORT §7); крошки —
 *    «Целевое обучение» ссылка, ровно один aria-current (helper); панель
 *    фильтров — 6 нативных select wrap-режимом ui-select с label[for]
 *    (канон T7.3, Accessibility requirements); выдача — все предложения
 *    educat.json (оригинaл строит каталог тем же offer_card, build.py:803);
 *    пагинация — ui-pagination СО стрелками (education-catalog — одна из
 *    двух страниц оригинала с pagination__arrow; vacancies без стрелок —
 *    REPORT §8.2 №7, там ui-pagination--bare);
 *  - pilot.css: сайт-зона cp-catalog-* на токенах, box-sizing на корнях
 *    (ADR-0002); без hex и !important;
 *  - compare.mjs: education-catalog.html в PAGES (AC: compare.json содержит
 *    метрики страницы).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев: пины смотрят на исполняемый код, а не на прозу
 *  шапки; CRLF-хост нормализуется (см. tests/unit/link.test.js). */
const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (tests/unit/link.test.js). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

const pilotDir = join(root, 'pilot', 'career-portal');
const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8');
const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8');
const pilotCss = stripCssComments(readFileSync(join(pilotDir, 'pilot.css'), 'utf8'));
const educat = JSON.parse(readFileSync(join(pilotDir, 'data', 'educat.json'), 'utf8'));

/** Исполняемая копия чистой функции buildOptions из исходника build.mjs
 *  (T15.3-бэклог: поведенческий пин «ровно одна selected»). build.mjs —
 *  скрипт с верхнеуровневыми побочками (сборка), импортом не берётся —
 *  тело функции вырезается из исходника и исполняется со стабом esc. */
const buildOptions = (() => {
  const start = build.indexOf('function buildOptions');
  const end = build.indexOf('function selectField');
  expect(start, 'buildOptions в build.mjs').toBeGreaterThan(-1);
  expect(end, 'selectField после buildOptions').toBeGreaterThan(start);
  return new Function('esc', `return (${build.slice(start, end)});`)((value) =>
    String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;'),
  );
})();

/** Разметка, которую возвращает educationCatalogMain() (один return-шаблон;
 *  рабочая копия Windows отдаёт CRLF — хвост без `\n`, см. link.test.js). */
const catalogHtml =
  build.match(/function educationCatalogMain[\s\S]*?return `([\s\S]*?)`;/)?.[1] ?? '';
/** Тело функции целиком (до следующей секции-комментария): вызовы helper'ов
 *  (selectField/offerCard) живут до return-шаблона. */
const catalogMainBody =
  build.match(/function educationCatalogMain[\s\S]*?(?=\n\/\* ──)/)?.[0] ?? '';

/** Константа фильтров каталога (6 групп оригинала education-catalog.html:10–50). */
const catalogFilters = build.match(/const CATALOG_FILTERS = \[([\s\S]*?)\n\];/)?.[1] ?? '';

describe('build.mjs — страница education-catalog.html (T15.3 Scope)', () => {
  it('PAGES содержит education-catalog.html с заголовком по канону оригинала (build.py: «Каталог предложений целевого обучения — Портал карьеры Интер РАО»)', () => {
    expect(build).toMatch(/\{\s*file: 'education-catalog.html',/);
    expect(build).toContain(
      `title: 'Каталог предложений целевого обучения — Портал карьеры Интер РАО'`,
    );
  });

  it('мёртвая ссылка закрыта: education.html ведёт «Все предложения» на education-catalog.html (раунд 2; обе страницы собираются)', () => {
    expect(build).toContain(`href="education-catalog.html">Все предложения</a>`);
    expect(catalogHtml, 'страница каталога собиралась бы main()-функцией').toContain(
      'ui-page-title',
    );
  });

  it('крошки: Главная (index.html) → «Целевое обучение» (ссылка на education.html) → «Каталог предложений» (текущая, aria-current даёт helper — ровно один на цепочку; Implementation requirements п.2)', () => {
    expect(catalogHtml).toContain(`['Главная', 'index.html']`);
    expect(catalogHtml).toContain(`['Целевое обучение', 'education.html']`);
    expect(catalogHtml).toMatch(/\['Каталог предложений', ''\]/);
  });

  it('page-head: h1 — ui-page-title (T14.2) + подзаголовок оригинала (src/pages/education-catalog.html:5)', () => {
    expect(catalogHtml).toMatch(
      /<h1 class="ui-page-title">Каталог предложений целевого обучения<\/h1>/,
    );
    expect(catalogHtml).toContain(
      'Выберите направление подготовки и компанию Группы «Интер РАО» — заявка оформляется на сайте «Работа России».',
    );
  });

  it('панель фильтров: 6 select-групп с именами и подписями оригинала (region/city/direction/segment/org/level — education-catalog.html:10–50)', () => {
    for (const name of ['region', 'city', 'direction', 'segment', 'org', 'level']) {
      expect(catalogFilters, `name='${name}' из оригинала`).toContain(`name: '${name}'`);
    }
    for (const label of [
      'Регион',
      'Город',
      'Направление подготовки',
      'Сегмент бизнеса',
      'Образовательная организация',
      'Уровень образования',
    ]) {
      expect(catalogFilters, `подпись «${label}» из aria-label оригинала`).toContain(
        `label: '${label}'`,
      );
    }
    expect(catalogHtml).toContain('<div class="cp-catalog-filters">');
  });

  it('опции фильтров — байт-в-байт оригинала (в т.ч. крайние значения каждой группы)', () => {
    for (const option of [
      'Все регионы',
      'Свердловская область',
      'Все города',
      'Екатеринбург',
      'Все направления',
      'ИТ',
      'Все сегменты',
      'Энергомашиностроение',
      'Все образовательные организации',
      'СПбПУ',
      'Все уровни',
      'Среднее профессиональное',
    ]) {
      expect(catalogFilters, `опция «${option}» из оригинала`).toContain(`'${option}'`);
    }
  });

  it('select-пилюли с подписью label[for] рядом с обёрткой — канон ui-select после ревью T7.3 (Accessibility requirements): label идёт в helper, aria-label не задаётся', () => {
    expect(catalogMainBody).toContain(
      'selectField({ name: f.name, label: f.label, options: f.options, pill: true })',
    );
    // канон в helper: пилюля с label отдаёт label[for] рядом с обёрткой
    // (срез до следующей функции: у selectField многострочные параметры —
    // ленивый `\n}` останавливается на закрывающей скобке деструктуризации)
    const selectFieldBody = build.slice(
      build.indexOf('function selectField'),
      build.indexOf('function radioGroup'),
    );
    expect(selectFieldBody.length).toBeGreaterThan(200);
    expect(selectFieldBody).toMatch(/label class="cp-vh" for="\$\{fieldId\}"/);
    expect(selectFieldBody, 'aria-label в пилюле с label не дублирует подпись').toMatch(
      /\$\{ariaLabel \? ` aria-label="\$\{esc\(ariaLabel\)\}"` : ''\}/,
    );
  });

  it('selected получает только плейсхолдер (первая строковая опция при пустой selected): раньше selected получала КАЖДАЯ строковая опция — нативный select брал последнюю, и триггер пилюли показывал не плейсхолдер оригинала («Все регионы»), а последний пункт («Свердловская область»); логика вынесена в чистую buildOptions — исполняемый пин ниже, здесь source-пин вызова', () => {
    const selectFieldBody = build.slice(
      build.indexOf('function selectField'),
      build.indexOf('function radioGroup'),
    );
    expect(
      selectFieldBody,
      'selectField делегирует опции чистой buildOptions (исполняемый пин — describe buildOptions)',
    ).toContain('buildOptions(options, selected)');
  });

  it('выдача: все предложения educat.json (6) тем же offerCard, что на education.html (оригинaл каталога — тот же offer_card целиком, build.py:794 vs :803); данные — из файла, не литералы. Тег заголовка карточки h2 (T15.9, axe heading-order: первый offer прямо за h1 страницы; на education.html карточки остались h3)', () => {
    expect(educat.offers).toHaveLength(6);
    expect(catalogMainBody).toContain(`EDU.offers.map((offer) => offerCard(offer, 'h2'))`);
    expect(catalogMainBody, 'без slice — education.html берёт первые 3').not.toContain(
      'EDU.offers.slice',
    );
  });

  it('пагинация — ui-pagination СО стрелками (оригинал страницы содержит pagination__arrow, education-catalog.html:59–67; отличать от ui-pagination--bare vacancies, REPORT §8.2 №7)', () => {
    expect(catalogHtml).toContain(
      '<nav class="ui-pagination" aria-label="Пагинация: каталог обучения">',
    );
    expect(catalogHtml, 'стрелка «Назад» есть').toContain('ui-pagination__arrow');
    expect(catalogHtml, 'модификатор --bare (без стрелок) не применяется').not.toContain(
      'ui-pagination--bare',
    );
    expect(catalogHtml, 'текущая страница — span aria-current (канон T6.3)').toMatch(
      /<span class="ui-pagination__page" aria-current="page">1<\/span>/,
    );
    expect(catalogHtml, 'страницы 2/3 — ссылки с aria-label').toMatch(
      /href="education-catalog\.html\?page=2" aria-label="Страница 2"/,
    );
    expect(
      catalogHtml,
      'недоступная стрелка — button[disabled] с каноническим именем «Предыдущая страница» (README ui-pagination:17, T6.3;Accessibility requirements: aria-метки по канону)',
    ).toMatch(
      /<button class="ui-pagination__arrow" type="button" disabled aria-label="Предыдущая страница">/,
    );
    expect(
      catalogHtml,
      'доступная стрелка — «Следующая страница» (README ui-pagination:18) и href на СЛЕДУЮЩУЮ страницу, не на себя (?page=2, ui-pagination.html:32; иначе лишняя Tab-остановка с ложным обещанием перехода — Do README)',
    ).toMatch(
      /<a class="ui-pagination__arrow" href="education-catalog\.html\?page=2" aria-label="Следующая страница">/,
    );
    expect(
      catalogHtml,
      'стрелки с прозой «Назад»/«Вперёд» не по канону — не применяются',
    ).not.toMatch(/aria-label="Назад"|aria-label="Вперёд"/);
  });

  it('классы оригинала не копируются — только cp-* поверх ui-* (Implementation requirements п.1; Out of scope: отдельного паттерна строк не заводим)', () => {
    expect(catalogHtml).not.toMatch(/class="vac-filters|class="vacancy-search|class="offer-card/);
    expect(catalogHtml).not.toMatch(/class="pagination[" ]/);
    expect(catalogHtml).not.toContain('cp-vac-row');
  });
});

describe('pilot.css — сайт-зона каталога cp-catalog-* (T15.3 Scope, правила пилота: токены --ui-*)', () => {
  it('блоки существуют: cp-catalog-filters, cp-vh, cp-catalog-nav — и несут box-sizing на корне (ADR-0002)', () => {
    for (const selector of ['.cp-catalog-filters', '.cp-vh', '.cp-catalog-nav']) {
      const block = blockOf(pilotCss, selector);
      expect(block, `${selector} найдено`).toBeTruthy();
      expect(block, `${selector}: box-sizing первой строкой (ADR-0002)`).toContain(
        'box-sizing: border-box;',
      );
    }
  });

  it('панель фильтров — flex-лента: gap 16px (--ui-space-4) и отступ снизу 2.5rem «как есть» (pages.css:14–20; 40px вне шкалы §3.2 — прецедент --ui-card-gap)', () => {
    const filters = blockOf(pilotCss, '.cp-catalog-filters');
    expect(filters).toContain('display: flex;');
    expect(filters).toContain('flex-wrap: wrap;');
    expect(filters).toContain('gap: var(--ui-space-4);');
    expect(filters).toContain('margin-bottom: 2.5rem;');
  });

  it('ширину пилюли задаёт сайт: flex 0 0 260px оригинала (pages.css:467 «как есть»; канон list-page — без basis бокс select сжимается)', () => {
    expect(blockOf(pilotCss, '.cp-catalog-filters .cp-pill')).toContain('flex: 0 0 260px;');
  });

  it('cp-vh — техника visually-hidden для label[for]: в оригинале видимых подписей нет, имя доступно ассистивным технологиям (WCAG 2.5.3)', () => {
    const vh = blockOf(pilotCss, '.cp-vh');
    expect(vh).toContain('position: absolute;');
    expect(vh).toContain('overflow: hidden;');
    expect(vh).toContain('width: 1px;');
    expect(vh).toContain('height: 1px;');
  });

  it('обёртка пагинации — по центру с ритмом 48px (--ui-space-7; оригинал education-catalog.html:57)', () => {
    const nav = blockOf(pilotCss, '.cp-catalog-nav');
    expect(nav).toContain('display: flex;');
    expect(nav).toContain('justify-content: center;');
    expect(nav).toContain('margin-top: var(--ui-space-7);');
  });

  it('в блоках каталога нет hex и !important (инварианты системы)', () => {
    const start = pilotCss.indexOf('.cp-catalog-filters');
    const end =
      pilotCss.indexOf('.cp-catalog-nav') +
      pilotCss.indexOf('}', pilotCss.indexOf('.cp-catalog-nav'));
    const section = pilotCss.slice(start, end);
    expect(section).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(section).not.toContain('!important');
  });
});

describe('compare.mjs — страница в PAGES (T15.3 Scope; AC: compare.json содержит метрики страницы)', () => {
  it('education-catalog.html включена в compare-прогон (порядок оригинала build.py: после education.html, до events.html)', () => {
    const pages = compare.match(/const PAGES = \[([\s\S]*?)\];/)?.[1] ?? '';
    const order = [...pages.matchAll(/'([a-z-]+\.html)'/g)].map((m) => m[1]);
    expect(order).toContain('education-catalog.html');
    expect(order.indexOf('education-catalog.html')).toBeGreaterThan(
      order.indexOf('education.html'),
    );
    expect(order.indexOf('education-catalog.html')).toBeLessThan(order.indexOf('events.html'));
  });
});

describe('buildOptions — ровно одна selected на select (T15.3-бэклог: исполняемый пин)', () => {
  /** Число selected-атрибутов в сгенерированных опциях. */
  const selectedCount = (html) => (html.match(/ selected/g) ?? []).length;

  it('смешанный список vacancy-apply ([{label,value}, строки], selected="") — ровно один selected (плейсхолдер)', () => {
    const html = buildOptions(
      [{ label: 'Выберите', value: '' }, 'Высшее', 'Среднее профессиональное'],
      '',
    );
    expect(selectedCount(html), 'ровно одна selected').toBe(1);
    expect(html).toContain('<option value="" selected>Выберите</option>');
    expect(html).toContain('<option value="">Высшее</option>');
  });

  it('строковый список сайдбара (selected="") — ровно один selected, первая опция (плейсхолдер «Все регионы»)', () => {
    const html = buildOptions(['Все регионы', 'Москва', 'Омская область'], '');
    expect(selectedCount(html)).toBe(1);
    expect(html).toContain('<option value="" selected>Все регионы</option>');
  });

  it('список объектов с selected="Высшее" — ровно один selected на совпавшем value', () => {
    const html = buildOptions(
      [
        { label: 'Выберите', value: '' },
        { label: 'Высшее', value: 'Высшее' },
        { label: 'Среднее', value: 'Среднее' },
      ],
      'Высшее',
    );
    expect(selectedCount(html)).toBe(1);
    expect(html).toContain('<option value="Высшее" selected>');
  });

  it('регрессия 0206496 не воспроизводится: строковые опции при пустом selected НЕ получают selected все', () => {
    const html = buildOptions(['Все регионы', 'Москва', 'Санкт-Петербург'], '');
    expect(selectedCount(html), 'одна, не три').toBe(1);
  });
});

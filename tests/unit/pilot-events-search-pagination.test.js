/**
 * Юнит-пин страницы поиска мероприятий и пагинации events (T15.5; Testing
 * requirements — «поверхностная проверка compare.mjs», пины до браузерной
 * пробы — практика pilot-education-catalog.test.js T15.3 /
 * pilot-internship-applies.test.js T15.4).
 *
 * Поверхность браузера (docHeight/probes/скриншоты/console) даёт compare.mjs
 * на живой паре страниц; здесь — пины исполняемой формы решения:
 *  - build.mjs: страница events-search.html в PAGES (оригинал build.py:817–823;
 *    одна из 4 страниц, достижимых только из неперенесённых — EPIC-15
 *    README:31–34); крошки — «Мероприятия» ссылка, ровно один aria-current
 *    (helper; Implementation requirements п.2); панель поиска —
 *    переиспользуемая cp-функция вместо копии разметки vacancies
 *    (Technical considerations: events-search — единственный второй
 *    потребитель «поиска по карточкам»); выдача — все предстоящие события
 *    events.json тем же eventCard, что на events.html (оригинал строит
 *    страницу тем же events_upcoming(), build.py:821); тулбар «Найдено: N»
 *    из длины данных + фильтр-теги без активного состояния (оригинал
 *    events-search.html:158–164 — is-active нет ни на одном теге);
 *  - events.html: пагинация — ui-pagination СО стрелками (events — вторая
 *    из двух страниц оригинала, где .pagination содержит pagination__arrow,
 *    events.html:358–367; vacancies без стрелок — REPORT §8.2 №7, там
 *    ui-pagination--bare); мок-пагинация ?page=N без бэкенда (Out of scope);
 *  - pilot.css: сайт-зона cp-find-bar/cp-events-nav на токенах --ui-*,
 *    box-sizing на корнях (ADR-0002); без hex и !important;
 *  - compare.mjs: events-search.html в PAGES (AC: compare.json содержит
 *    метрики страницы); probe pagination-page существует без изменений —
 *    44px пара на events появляется от ui-pagination в разметке (AC).
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
const events = JSON.parse(readFileSync(join(pilotDir, 'data', 'events.json'), 'utf8'));

/** Тело функции целиком (до следующей секции-комментария `/* ──`): вызовы
 *  helper'ов живут до return-шаблона (практика pilot-education-catalog). */
const sectionBody = (source, name) =>
  source.match(new RegExp(`function ${name}[\\s\\S]*?(?=\\n/\\* ──)`))?.[0] ?? '';

/** Разметка, которую возвращает main()-функция (один return-шаблон;
 *  рабочая копия Windows отдаёт CRLF — хвост без `\n`, см. link.test.js). */
const returnHtml = (source, name) =>
  source.match(new RegExp(`function ${name}[\\s\\S]*?return \`([\\s\\S]*?)\`;`))?.[1] ?? '';

const eventsMainBody = sectionBody(build, 'eventsMain');
const eventsSearchMainBody = sectionBody(build, 'eventsSearchMain');
const eventsSearchHtml = returnHtml(build, 'eventsSearchMain');
const vacanciesMainBody = sectionBody(build, 'vacanciesMain');

/** Тело переиспользуемого helper'а строки поиска (до следующей функции). */
const findBarBody = build.slice(
  build.indexOf('function findBar'),
  build.indexOf('function radioGroup') > build.indexOf('function findBar')
    ? build.indexOf('function radioGroup')
    : build.length,
);

describe('data — предстоящие события (выдача поиска привязана к ним)', () => {
  it('events.json upcoming — 6 записей, как «Найдено: 6» оригинала (events-search.html:159)', () => {
    expect(events.upcoming).toHaveLength(6);
  });
});

describe('build.mjs — страница events-search.html (T15.5 Scope)', () => {
  it('PAGES содержит events-search.html с заголовком оригинала (build.py:818 «Поиск мероприятий — Портал карьеры Интер РАО»)', () => {
    expect(build).toMatch(/\{\s*file: 'events-search.html',/);
    expect(build).toContain(`title: 'Поиск мероприятий — Портал карьеры Интер РАО'`);
  });

  it('порядок страниц — по оригиналу build.py: events-search между events.html и event.html (build.py:806/818/825)', () => {
    const buildPages = build.match(/const PAGES = \[([\s\S]*?)\n\];/)?.[1] ?? '';
    const order = [...buildPages.matchAll(/file: '([a-z-]+\.html)'/g)].map((m) => m[1]);
    expect(order.indexOf('events-search.html')).toBeGreaterThan(order.indexOf('events.html'));
    expect(order.indexOf('events-search.html')).toBeLessThan(order.indexOf('event.html'));
  });

  it('крошки: Главная (index.html) → «Мероприятия» (ССЫЛКА на events.html — Implementation requirements п.2) → «Поиск» (текущая, aria-current даёт helper — ровно один на цепочку)', () => {
    expect(eventsSearchHtml).toContain(`['Главная', 'index.html']`);
    expect(eventsSearchHtml).toContain(`['Мероприятия', 'events.html']`);
    expect(eventsSearchHtml).toMatch(/\['Поиск', ''\]/);
  });

  it('page-head: только h1 «Поиск мероприятий» — ui-page-title (T14.2), подзаголовка у оригинала нет (events-search.html:149–151)', () => {
    expect(eventsSearchHtml).toMatch(/<h1 class="ui-page-title">Поиск мероприятий<\/h1>/);
    expect(eventsSearchHtml, 'cp-page-subtitle у страницы поиска нет').not.toContain(
      'cp-page-subtitle',
    );
  });

  it('панель поиска — переиспользуемый findBar, а не копия разметки (Technical considerations: vacanciesMain больше не несёт inline-панель)', () => {
    expect(findBarBody).toContain('function findBar');
    expect(vacanciesMainBody).toContain('findBar(');
    expect(vacanciesMainBody, 'inline-панель cp-vac-find из vacanciesMain убрана').not.toContain(
      'cp-vac-find',
    );
    expect(eventsSearchMainBody).toContain('findBar(');
  });

  it('findBar: форма role="search" с нативным GET-сабмитом, поле type=search name=q с aria-label (Accessibility requirements), кнопка — ui-button варианта-параметра', () => {
    expect(findBarBody).toContain('role="search"');
    expect(findBarBody).toContain('method="get"');
    expect(findBarBody).toContain('type="search"');
    expect(findBarBody).toContain('name="q"');
    expect(findBarBody).toMatch(/aria-label="\$\{esc\(/);
    expect(findBarBody).toMatch(/ui-button--\$\{variant\}/);
  });

  it('панель events-search — параметры оригинала (events-search.html:153–155): action на себя, плейсхолдер, aria-label «Поиск мероприятий», кнопка primary «найти»', () => {
    expect(eventsSearchMainBody).toContain(`action: 'events-search.html'`);
    expect(eventsSearchMainBody).toContain('Название мероприятия, город или ключевое слово');
    expect(eventsSearchMainBody).toContain(`label: 'Поиск мероприятий'`);
    expect(eventsSearchMainBody).toMatch(/variant: 'primary'/);
    expect(eventsSearchMainBody).toMatch(/text: 'найти'/);
  });

  it('тулбар — «Найдено: N» из длины данных (не литерал) + фильтр-теги оригинала Все/Экскурсии/Чемпионаты/Вебинары (events-search.html:158–164)', () => {
    expect(eventsSearchHtml).toMatch(/Найдено: \$\{EVT\.upcoming\.length\}/);
    for (const tag of ['Все', 'Экскурсии', 'Чемпионаты', 'Вебинары']) {
      expect(eventsSearchHtml, `фильтр-тег «${tag}»`).toContain(`>${tag}</a>`);
    }
  });

  it('фильтр-теги — ui-chip без активного состояния (в оригинале is-active нет ни на одном теге — aria-current не ставится)', () => {
    expect(eventsSearchHtml).toContain('ui-chip__pill');
    const chipNav = eventsSearchHtml.match(/<nav class="ui-chip"[\s\S]*?<\/nav>/)?.[0] ?? '';
    expect(chipNav, 'ни один фильтр не активен').not.toContain('aria-current');
  });

  it('выдача: все предстоящие события events.json тем же eventCard, что на events.html (оригинал строит страницу тем же events_upcoming(), build.py:821); данные — из файла, не литералы', () => {
    expect(eventsSearchMainBody).toContain('EVT.upcoming.map(eventCard)');
    expect(eventsSearchMainBody, 'без slice — events.html берёт полный список').not.toContain(
      'EVT.upcoming.slice',
    );
  });

  it('пагинации на events-search нет — в оригинале страницы поиска .pagination не имеет (events-search.html:145–253)', () => {
    expect(eventsSearchHtml).not.toContain('ui-pagination');
  });

  it('классы оригинала не копируются — только cp-* поверх ui-* (Implementation requirements п.1)', () => {
    expect(eventsSearchHtml).not.toMatch(
      /class="events-search-bar|class="media-toolbar|class="event-card/,
    );
    expect(eventsSearchHtml).not.toMatch(/class="tag[ "]/);
  });
});

describe('build.mjs — пагинация events.html (T15.5 Scope)', () => {
  it('ui-pagination СО стрелками (оригинал содержит pagination__arrow, events.html:358–367; отличать от ui-pagination--bare vacancies — REPORT §8.2 №7)', () => {
    expect(eventsMainBody).toContain(
      '<nav class="ui-pagination" aria-label="Пагинация: мероприятия">',
    );
    expect(eventsMainBody, 'стрелка «Назад» есть').toContain('ui-pagination__arrow');
    expect(eventsMainBody, 'модификатор --bare (без стрелок) не применяется').not.toContain(
      'ui-pagination--bare',
    );
  });

  it('канон T6.3: текущая страница — span aria-current, страницы — ссылки ?page=N с именами «Страница N» (мок без бэкенда — Out of scope)', () => {
    expect(eventsMainBody).toMatch(
      /<span class="ui-pagination__page" aria-current="page">1<\/span>/,
    );
    expect(eventsMainBody).toMatch(/href="events\.html\?page=2" aria-label="Страница 2">2<\/a>/);
  });

  it('недоступная стрелка — button[disabled] с каноническим именем «Предыдущая страница» (в оригинале disabled на <a> невалиден — README ui-pagination), доступная — ссылка «Следующая страница» на СЛЕДУЮЩУЮ страницу, не на себя', () => {
    expect(eventsMainBody).toMatch(
      /<button class="ui-pagination__arrow" type="button" disabled aria-label="Предыдущая страница">/,
    );
    expect(eventsMainBody).toMatch(
      /<a class="ui-pagination__arrow" href="events\.html\?page=2" aria-label="Следующая страница">/,
    );
    expect(
      eventsMainBody,
      'стрелки с прозой «Назад»/«Вперёд» не по канону — не применяются',
    ).not.toMatch(/aria-label="Назад"|aria-label="Вперёд"/);
  });

  it('обёртка пагинации — сайт-зона cp-events-nav (по центру, ритм 48px — оригинал events.html:357); список карточек events не тронут', () => {
    expect(eventsMainBody).toContain('cp-events-nav');
    expect(eventsMainBody).toContain('EVT.upcoming.map(eventCard)');
    expect(eventsMainBody).toContain('EVT.past.map(eventCard)');
  });
});

describe('pilot.css — сайт-зона поиска и пагинации (T15.5, правила пилота: токены --ui-*)', () => {
  it('cp-find-bar существует (переименование cp-vac-find — один класс на оба потребителя), box-sizing на корне (ADR-0002), flex-строка; поле растягивается', () => {
    const bar = blockOf(pilotCss, '.cp-find-bar');
    expect(bar, '.cp-find-bar найдено').toBeTruthy();
    expect(bar, 'box-sizing первой строкой (ADR-0002)').toContain('box-sizing: border-box;');
    expect(bar).toContain('display: flex;');
    expect(blockOf(pilotCss, '.cp-find-bar .ui-field')).toContain('flex: 1 1 auto;');
    expect(pilotCss, 'старое имя cp-vac-find не остаётся').not.toContain('cp-vac-find');
  });

  it('cp-events-nav — box-sizing (ADR-0002), по центру с ритмом 48px (--ui-space-7; оригинал events.html:357 — пара cp-catalog-nav)', () => {
    const nav = blockOf(pilotCss, '.cp-events-nav');
    expect(nav, '.cp-events-nav найдено').toBeTruthy();
    expect(nav, 'box-sizing первой строкой (ADR-0002)').toContain('box-sizing: border-box;');
    expect(nav).toContain('display: flex;');
    expect(nav).toContain('justify-content: center;');
    expect(nav).toContain('margin-top: var(--ui-space-7);');
  });

  it('в новых блоках нет hex и !important (инварианты системы)', () => {
    const start = pilotCss.indexOf('.cp-find-bar');
    const end = pilotCss.indexOf('}', pilotCss.indexOf('.cp-events-nav'));
    const section = pilotCss.slice(start, end);
    expect(section).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(section).not.toContain('!important');
  });
});

describe('compare.mjs — страница в PAGES (T15.5 Scope; AC: compare.json содержит метрики events-search)', () => {
  it('events-search.html включена в compare-прогон (порядок оригинала build.py: после events.html, до event.html)', () => {
    const pages = compare.match(/const PAGES = \[([\s\S]*?)\];/)?.[1] ?? '';
    const order = [...pages.matchAll(/'([a-z-]+\.html)'/g)].map((m) => m[1]);
    expect(order).toContain('events-search.html');
    expect(order.indexOf('events-search.html')).toBeGreaterThan(order.indexOf('events.html'));
    expect(order.indexOf('events-search.html')).toBeLessThan(order.indexOf('event.html'));
  });

  it('probe pagination-page существует (44px пара на events появляется от ui-pagination в разметке — AC)', () => {
    expect(compare).toMatch(/\['pagination-page', '\.pagination__page', '\.ui-pagination__page'\]/);
  });
});

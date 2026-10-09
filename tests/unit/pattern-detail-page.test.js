/**
 * Юнит-пины T8.2 — паттерн «Детальная страница» (patterns/detail-page/):
 * контракт копируемой разметки, которую собирает интегратор.
 *
 * Исполняемая форма решения (спека T8.2, Scope + Implementation requirements):
 *  - patterns/detail-page/detail-page.html — эталонная сборка детальной
 *    страницы (вакансия) БЕЗ нового CSS системы: крошки (T4.7) → page-head
 *    (h1 + теги T4.3 + мета с <time datetime>) → двухколоночный контент
 *    (типографика T3.3, секции h2) + aside (sticky ≥md: CTA-кнопка +
 *    дисклеймер «обработка ПД» + справочная панель — перенос form-aside-
 *    структуры) → related (h2 + сетка карточек);
 *  - schema.org-кейс: JobPosting-микроразметка эталонной вакансии —
 *    title, hiringOrganization, jobLocation, datePosted; для статей —
 *    Article (дока README паттерна);
 *  - связующие стили паттерна (dpp-*) живут <style>'ом стенда, НЕ в dist;
 *    значения — только токены --ui-*, media — только min-width шкалы T2.5;
 *  - sticky только ≥md (768): в мобильной базе позиционирования нет —
 *    aside идёт после контента (DOM-порядок = смысловой);
 *  - Bitrix-заметки в доке (AC): bitrix:news.detail, свойства ИБ в теги/мету,
 *    связанные блоки; предупреждение о wrapper'ах (sticky × overflow).
 * Поверхность браузера (sticky/32px, schema-парсер, axe, иерархия, эталоны)
 * — tests/e2e/pattern-detail-page.spec.js.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');
const patternPath = join(root, 'patterns', 'detail-page', 'detail-page.html');
const readmePath = join(root, 'patterns', 'detail-page', 'README.md');

/** Шкала брейкпоинтов T2.5 (BREAKPOINTS stylelint.config.mjs). */
const BREAKPOINTS = ['480', '768', '1024', '1280', '1440'];

describe('patterns/detail-page/detail-page.html — контракт эталонной сборки (Scope T8.2)', () => {
  let pattern = '';
  try {
    pattern = readFileSync(patternPath, 'utf8');
  } catch {
    // Красный шаг TDD: файла ещё нет — пины ниже упадут с понятным сообщением.
    pattern = '';
  }

  it('page-head: один h1 (page-title), он же itemprop="title" вакансии', () => {
    const h1 = pattern.match(/<h1\b[^>]*>/g) ?? [];
    expect(h1, 'ровно один h1 — детальная страница (гейт irao/one-h1)').toHaveLength(1);
    expect(h1[0], 'h1 несёт itemprop="title" — поле JobPosting').toContain('itemprop="title"');
  });

  it('крошки T4.7 идут перед page-head: BreadcrumbList, текущая — span + aria-current', () => {
    expect(pattern.indexOf('ui-breadcrumbs'), 'крошки в DOM раньше h1').toBeGreaterThan(-1);
    expect(pattern.indexOf('ui-breadcrumbs')).toBeLessThan(pattern.indexOf('<h1'));
    expect(pattern, 'микроразметка BreadcrumbList (T4.7)').toContain(
      'itemtype="https://schema.org/BreadcrumbList"',
    );
    const current = pattern.match(/<span[^>]*ui-breadcrumbs__current[^>]*>/s) ?? [''];
    expect(current[0], 'текущая страница крошек — span с aria-current="page"').toContain(
      'aria-current="page"',
    );
  });

  it('schema.org JobPosting: title, hiringOrganization, jobLocation, datePosted (поля ТЗ №7)', () => {
    expect(pattern, 'JobPosting-микроразметка на эталоне вакансии').toContain(
      'itemtype="https://schema.org/JobPosting"',
    );
    expect(
      pattern,
      'hiringOrganization — вложенный itemscope Organization с name',
    ).toContain('itemtype="https://schema.org/Organization"');
    expect(pattern, 'имя организации — itemprop="name"').toContain('itemprop="name"');
    expect(pattern, 'jobLocation — вложенный Place с PostalAddress').toContain(
      'itemtype="https://schema.org/PostalAddress"',
    );
    const posted = pattern.match(/<time[^>]*itemprop="datePosted"[^>]*>/) ?? [''];
    expect(posted[0], 'datePosted — на <time> (Technical considerations)').not.toBe('');
    expect(posted[0], 'datetime — машиночитаемый формат ISO').toMatch(
      /datetime="\d{4}-\d{2}-\d{2}"/,
    );
  });

  it('page-head: теги T4.3 и мета-строка; метаданные времени — <time> с datetime', () => {
    expect(pattern, 'теги T4.3 в page-head').toContain('ui-tag ui-tag--');
    const times = pattern.match(/<time\b[^>]*datetime="[^"]+"[^>]*>/g) ?? [];
    expect(times.length, 'время — элемент <time datetime> (Technical considerations)').toBeGreaterThanOrEqual(
      1,
    );
  });

  it('двухколоночный лейаут: .dpp-main + aside.dpp-aside (перенос form-aside-структуры)', () => {
    expect(pattern, 'лейаут контент+aside — связка dpp-layout').toContain('dpp-layout');
    expect(pattern, 'основная колонка — dpp-main').toContain('dpp-main');
    const aside = pattern.match(/<aside\b[^>]*class="[^"]*dpp-aside[^"]*"[^>]*>/) ?? [''];
    expect(aside[0], 'aside — семантический <aside> (complementary)').not.toBe('');
    // Структура form-aside: dl-список пар «метка — значение» (dt/dd).
    expect(pattern, 'справочная панель — dl (dpp-aside__list)').toContain('dpp-aside__list');
    expect(pattern, 'строка панели — dpp-aside__row').toContain('dpp-aside__row');
    expect(pattern, 'метка строки — dpp-aside__label на dt').toContain('dpp-aside__label');
    expect(pattern, 'значение строки — dpp-aside__value на dd').toContain('dpp-aside__value');
  });

  it('CTA-панель aside: кнопка + дисклеймер «обработка ПД» (перенос паттерна согласия career-portal)', () => {
    const cta = pattern.match(/<a[^>]*class="[^"]*ui-button[^"]*"[^>]*>[\s\S]*?<\/a>/) ?? [''];
    expect(cta[0], 'CTA aside — ссылка-кнопка ui-button (работает без JS)').toContain(
      'ui-button',
    );
    expect(cta[0]).toContain('Откликнуться');
    expect(pattern, 'дисклеймер про обработку персональных данных').toContain(
      'обработку персональных данных',
    );
    expect(pattern, 'в дисклеймере — ссылка на Политику конфиденциальности').toContain(
      'Политике конфиденциальности',
    );
  });

  it('контент: секции h2 (типографика T3.3), списки ui-list, текст ui-body', () => {
    const h2 = pattern.match(/<h2\b[^>]*>/g) ?? [];
    expect(h2.length, 'контентные секции + aside + related — заголовки h2').toBeGreaterThanOrEqual(
      3,
    );
    expect(pattern, 'списки — роль ui-list (T3.3)').toContain('ui-list');
    expect(pattern, 'абзацы — роль ui-body (T3.3)').toContain('ui-body');
  });

  it('related: заголовок h2 + сетка ui-grid--3 с карточками-ссылками T4.4', () => {
    expect(pattern, 'related-блок с заголовком «Похожие вакансии»').toContain(
      'Похожие вакансии',
    );
    expect(pattern, 'сетка --3 паттерна (T3.4)').toMatch(/class="ui-grid ui-grid--3"/);
    const cards = pattern.match(/ui-card--link/g) ?? [];
    expect(cards.length, 'карточки-ссылки — паттерн T4.4').toBeGreaterThanOrEqual(3);
    // Внутри related есть свой h2 → заголовки карточек — h3 (без пропуска
    // уровня, гейт irao/heading-order), вид — роль ui-h3.
    const cardTitles = pattern.match(/<h3 class="ui-h3 ui-card__title">/g) ?? [];
    expect(cardTitles.length, 'заголовки карточек related — тег h3 с ролью ui-h3').toBeGreaterThanOrEqual(
      3,
    );
  });

  it('порядок чтения: крошки → h1 → контент → aside → related (DOM-порядок = смысловой)', () => {
    const positions = [
      ['крошки', pattern.indexOf('ui-breadcrumbs')],
      ['h1', pattern.indexOf('<h1')],
      ['контент', pattern.indexOf('dpp-main')],
      ['aside', pattern.indexOf('dpp-aside"')],
      ['related', pattern.indexOf('dpp-related')],
    ];
    for (const [name, index] of positions) {
      expect(index, `${name} найден в разметке`).toBeGreaterThan(-1);
    }
    for (let i = 1; i < positions.length; i += 1) {
      expect(
        positions[i][1],
        `${positions[i][0]} идёт после ${positions[i - 1][0]} (Accessibility requirements)`,
      ).toBeGreaterThan(positions[i - 1][1]);
    }
  });

  it('sticky только ≥md: в мобильной базе позиционирования нет (aside — после контента)', () => {
    const style = pattern.match(/<style>([\s\S]*?)<\/style>/) ?? ['', ''];
    expect(style[1], 'связки живут <style> стенда, не в dist').toContain('.dpp-aside');
    // База (до первого media) — мобильная: sticky в ней нет (IR 1).
    const base = style[1].slice(0, style[1].indexOf('@media'));
    expect(base, 'база mobile-first: без position: sticky').not.toContain('position: sticky');
    // Sticky — внутри min-width: 768px (шкала T2.5).
    const md = style[1].match(/@media \(min-width: 768px\)\s*\{([\s\S]*?)\n\}/) ?? [''];
    expect(md[0], 'sticky-правило в min-width: 768px (md)').toContain('position: sticky');
    expect(md[0]).toContain('.dpp-aside');
  });

  it('media связок — только min-width из шкалы брейкпоинтов T2.5', () => {
    const style = pattern.match(/<style>([\s\S]*?)<\/style>/) ?? ['', ''];
    const medias = [...style[1].matchAll(/@media \(min-width: (\d+)px\)/g)].map((m) => m[1]);
    expect(medias.length, 'медиа-точки в связках есть').toBeGreaterThan(0);
    for (const value of medias) {
      expect(BREAKPOINTS, `значение ${value}px — из шкалы T2.5`).toContain(value);
    }
    expect(style[1], 'max-width в связках не используется (mobile-first)').not.toContain(
      'max-width',
    );
  });

  it('связующие стили паттерна — только токены: без hex и !important (инварианты системы)', () => {
    const style = pattern.match(/<style>([\s\S]*?)<\/style>/) ?? ['', ''];
    expect(style[1], 'hex в связках запрещён (hex только в tokens/primitives.css)').not.toMatch(
      /#[0-9a-fA-F]{3,8}\b/,
    );
    expect(style[1], '!important запрещён (только a11y/vi.css)').not.toContain('!important');
  });

  it('корни блоков связок — box-sizing: border-box (ADR-0002)', () => {
    const style = pattern.match(/<style>([\s\S]*?)<\/style>/) ?? ['', ''];
    for (const selector of ['.dpp-layout', '.dpp-main', '.dpp-aside']) {
      const rule = style[1].match(new RegExp(`${selector.replace(/[-]/g, '\\-')}\\s*\\{([^}]*)\\}`));
      expect(rule, `правило ${selector} найдено`).toBeTruthy();
      expect(rule[1], `${selector}: box-sizing на корне (ADR-0002)`).toContain(
        'box-sizing: border-box;',
      );
    }
  });

  it('без inline-стилей (инвариант системы: перекраска vi.css накрывает всё)', () => {
    expect(pattern, 'атрибут style= в разметке паттерна не используется').not.toContain('style="');
  });

  it('ключевые узлы размечены data-ui-check-layout — поверхность 32px-сценария (IR 1)', () => {
    const markers = pattern.match(/data-ui-check-layout/g) ?? [];
    expect(
      markers.length,
      'маркеры раскладки: main, aside, related-сетка (гейт не пустой)',
    ).toBeGreaterThanOrEqual(3);
  });
});

describe('patterns/detail-page/README.md — дока паттерна (AC: Bitrix-заметки, JobPosting/Article)', () => {
  let readme = '';
  try {
    readme = readFileSync(readmePath, 'utf8');
  } catch {
    readme = '';
  }

  it('состав паттерна: крошки, page-head, контент+aside, related', () => {
    for (const marker of [
      'ui-breadcrumbs',
      'page-head',
      'dpp-aside',
      'ui-grid--3',
      'ui-card',
      'sticky',
    ]) {
      expect(readme, `дока называет «${marker}»`).toContain(marker);
    }
  });

  it('schema.org-кейс (Scope): JobPosting-поля эталона + Article для статей, «когда уместно»', () => {
    expect(readme, 'JobPosting-кейс разобран').toContain('JobPosting');
    for (const field of ['title', 'hiringOrganization', 'jobLocation', 'datePosted']) {
      expect(readme, `поле ${field} названо`).toContain(field);
    }
    expect(readme, 'Article-кейс для статей').toContain('Article');
    expect(readme, 'правило «не ради галочки» (когда уместно)').toContain('уместно');
  });

  it('sticky × overflow: док-предупреждение о wrapper'+"'"+'ах (Technical considerations)', () => {
    expect(readme, 'предупреждение про overflow-контексты').toContain('overflow');
    expect(readme, 'предупреждение про wrapper-обёртки').toContain('обёртк');
  });

  it('Bitrix-заметки (AC): news.detail, свойства ИБ в теги/мету, связанные блоки', () => {
    expect(readme, 'детальная страница — bitrix:news.detail').toContain('news.detail');
    expect(readme, 'вывод свойств инфоблока (DISPLAY_PROPERTIES)').toContain('DISPLAY_PROPERTIES');
    expect(readme, 'связанные блоки — news.list с фильтром').toContain('news.list');
  });

  it('метаданные времени — <time datetime> (Technical considerations)', () => {
    expect(readme).toContain('datetime');
  });

  it('порядок чтения и границы: контент → aside (DOM), related после main; sticky ≥md — из спеки', () => {
    expect(readme, 'мобильное поведение — aside после контента').toContain('после контента');
    expect(readme, 'граница sticky — md (768)').toContain('768');
  });
});

describe('сборка: стенд паттерна генерируется в stands/patterns/detail-page.html', () => {
  it('build.mjs читает patterns/detail-page/detail-page.html и кладёт стенд на два уровня ниже', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    const collapsed = build.replace(/\s+/g, ' ');
    expect(collapsed).toContain(`'patterns', 'detail-page', 'detail-page.html'`);
    expect(collapsed).toContain(`'stands', 'patterns', 'detail-page.html'`);
    // Стенд вложенный (stands/patterns/…): рантайм на два уровня выше.
    expect(collapsed).toContain(`rel: '../..'`);
  });

  it('каркас стенда БЕЗ служебного h1: h1 несёт сам паттерн (гейт irao/one-h1)', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    const block = build.slice(build.indexOf('patterns/detail-page'));
    expect(block).toContain('Без служебного h1');
  });

  it('patterns/README.md перечисляет паттерн детальной страницы', () => {
    const index = readFileSync(join(root, 'patterns', 'README.md'), 'utf8');
    expect(index).toContain('detail-page');
  });
});

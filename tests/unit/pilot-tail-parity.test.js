/**
 * Юнит-пины точечного хвоста EPIC-18 (T18.9 — companies/events/
 * internship-apply; Testing requirements — пины исполняемой формы решения
 * до браузерной пробы, практика pilot-company/pilot-education-catalog).
 *
 * Корни и источники — разбор DOM-пробами (.zcode/acc-t189-decomp/chain.mjs,
 * 1440×900, оригинал 8469ea6 ↔ пилот) + css/inline оригинала:
 *  - companies.html −612: ритм грида сегментов — page-head gap 16/низ 40
 *    (components.css:36–41 против 12/32 базы cp-page-head), h2 низ 32
 *    (components.css:340), сетки шаг 36 (pages.css:9) + низ 48 (inline
 *    companies.html:153–196), секция 40/40 с гашением верхнего (inline
 *    companies.html:147);
 *  - events.html −282: обложка cover-hero с кнопкой (pages.css:953–969,
 *    events.html:149–152), лента фильтров vac-filters (pages.css:14–21,
 *    events.html:163–208), заголовки лент fs-h3/низ 24 (pages.css:583),
 *    карточка события 16/220/тело 16-4-0 шаг 10 (pages.css:565–581) на
 *    сетке 36 (pages.css:9) + низ 56 (inline events.html:210);
 *  - internship-apply.html −115: карточная форма (pages.css:367–375 —
 *    колонка 24, паддинг 36, фон surface, рамка, радиус; заголовок h1
 *    fs-h3 внутри карточки — pages.css:377, internship-apply.html:151),
 *    двойной лейаут ui-form__layout снят (оригинал form-page — одна
 *    раскладка, pages.css:365), radio-row 52px inline
 *    (internship-apply.html:171/216/226).
 *
 * Каркасы — ДС/слой (ui-page-title/ui-button/ui-card--media/lpp-filters/
 * ui-form/ui-tabs--pill); хуки cmp-/ev-/ia- — не-cp имена сайт-зоны
 * (конвенция T18.1/T18.4/T18.5/T18.6: ценз cp-семейств не растёт).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев; CRLF-хост нормализуется (link.test.js). */
const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (pilot-company.test.js). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

const pilotDir = join(root, 'pilot', 'career-portal');
const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
const pilotCss = stripCssComments(readFileSync(join(pilotDir, 'pilot.css'), 'utf8'));

/** Шаблон функции-строителя — ПОСЛЕДНИЙ return тела функции (у
 *  companiesMain внутренняя стрелка .map тоже возвращает шаблон); CRLF
 *  нормализован. */
const templateOf = (fnName) => {
  const start = build.indexOf(`function ${fnName}`);
  const end = build.indexOf('\nfunction ', start + 1);
  const body = build.slice(start, end === -1 ? undefined : end);
  const at = body.lastIndexOf('return `');
  if (at === -1) return '';
  const tail = body.slice(at + 'return `'.length);
  return tail.slice(0, tail.indexOf('`;'));
};

const companiesHtml = templateOf('companiesMain');
const eventsHtml = templateOf('eventsMain');
const applyHtml = templateOf('internshipApplyMain');

describe('T18.9 — companies.html: ритм грида сегментов (−612)', () => {
  it('секция — хук cmp-sec (гашение верхнего ритма inline companies.html:147, низ 40 components.css:347)', () => {
    expect(companiesHtml).toContain('<section class="ui-section cmp-sec">');
    expect(blockOf(pilotCss, '.cmp-sec')).toMatch(/padding-top:\s*0/);
    expect(blockOf(pilotCss, '.cmp-sec')).toMatch(/padding-bottom:\s*2\.5rem/);
  });

  it('шапка — обложка на каноне php (T18.10): шаг 16/низ 40 несёт база канона (.page-head components.css:38/41; хук cmp-head снят как дубликат базы)', () => {
    expect(companiesHtml).toContain('<div class="php">');
    expect(blockOf(pilotCss, '.cmp-head')).toBeNull();
  });

  it('заголовки сегментов — низ 32 (.section__title components.css:340); сетки — хук cmp-grid: шаг 36 (pages.css:9) + низ 48 (inline companies.html:153)', () => {
    // h2/сетка живут во внутреннем шаблоне .map — пин на исходнике build.mjs
    expect(build).toContain('<h2 class="ui-h3 cmp-title">');
    expect(blockOf(pilotCss, '.cmp-title')).toMatch(/margin-bottom:\s*var\(--ui-space-6\)/);
    expect(build).toContain('<div class="ui-grid ui-grid--3 cmp-grid">');
    expect(blockOf(pilotCss, '.cmp-grid')).toMatch(/gap:\s*2\.25rem/);
    expect(blockOf(pilotCss, '.cmp-grid')).toMatch(/margin-bottom:\s*var\(--ui-space-7\)/);
  });
});

describe('T18.9 — events.html: обложка, фильтры, лента событий (−282)', () => {
  it('секция — id="upcoming" (ссылка кнопки обложки events.html:152) и хук ev-sec (inline padding-top: 0 events.html:147, низ 40 components.css:347)', () => {
    expect(eventsHtml).toContain('<section class="ui-section ev-sec" id="upcoming">');
    expect(blockOf(pilotCss, '.ev-sec')).toMatch(/padding-top:\s*0/);
    expect(blockOf(pilotCss, '.ev-sec')).toMatch(/padding-bottom:\s*2\.5rem/);
  });

  it('обложка — форма cover-hero (pages.css:953–969): хук ev-cover на каркасе cvh (T18.10 — cp-page-head снят; прижатие влево pages.css:955 — база каркаса cvh), паддинг 64/56, шаг 20, фон blue-50, радиус md; нижнего ритма каркас не несёт', () => {
    expect(eventsHtml).toContain('<div class="cvh ev-cover">');
    const css = blockOf(pilotCss, '.ev-cover');
    expect(css).toMatch(/gap:\s*1\.25rem/);
    expect(css).toMatch(/padding:\s*4rem 3\.5rem/);
    expect(css).toMatch(/background-color:\s*var\(--ui-color-surface-muted\)/);
    expect(css).toMatch(/border-radius:\s*var\(--ui-radius-md\)/);
    expect(css).toMatch(/box-sizing:\s*border-box/);
    // прижатие влево (pages.css:955) и отсутствие нижнего ритма — база
    // каркаса cvh канона (T17.15); хук их не переобъявляет (T18.10).
    expect(css).not.toMatch(/align-items/);
    expect(css).not.toMatch(/margin-bottom/);
  });

  it('кнопка обложки — ui-button--primary «смотреть мероприятия» → #upcoming (events.html:152); ритм +16 (pages.css:967); подпись 640px — хук на php-subtitle канона (T18.10)', () => {
    expect(eventsHtml).toContain(
      '<a class="ui-button ui-button--primary" href="#upcoming">смотреть мероприятия</a>',
    );
    expect(blockOf(pilotCss, '.ev-cover .ui-button')).toMatch(/margin-top:\s*var\(--ui-space-4\)/);
    expect(blockOf(pilotCss, '.ev-cover .php-subtitle')).toMatch(/max-width:\s*40rem/);
  });

  it('подпись обложки — текст оригинала 1:1 (events.html:151 — три строки 97px против двух у сокращённого)', () => {
    expect(eventsHtml).toContain(
      'Экскурсии, кейс-чемпионаты, вебинары и ярмарки вакансий компаний Группы «Интер РАО» для школьников, студентов и начинающих специалистов.',
    );
  });

  it('лента фильтров — канон lpp-filters слоя с шестью пилюлями (имя поля — label[for] ui-vh, канон T7.3: EVENT_FILTERS label × selectField pill; подписи/опции 1:1 events.html:164–207) и кнопкой поиска (btn--light events.html:207)', () => {
    expect(eventsHtml).toContain('<div class="lpp-filters">');
    for (const label of [
      'Регион',
      'Город',
      'Для кого',
      'Формат',
      'Направления подготовки',
      'Период',
    ]) {
      expect(build, label).toContain(`label: '${label}'`);
    }
    expect(build).toContain("'Все регионы'");
    expect(build).toContain("'Начинающим специалистам'");
    expect(build).toContain("'Ноябрь 2026'");
    expect(eventsHtml).toMatch(
      /<a class="ui-button ui-button--light"[^>]*href="events-search\.html">поиск мероприятий<\/a>/,
    );
    // рендер пилюль с именем — label[for] ui-vh рядом с обёрткой (канон T7.3)
    const distEvents = readFileSync(join(pilotDir, 'dist', 'events.html'), 'utf8');
    expect(distEvents).toMatch(/<label class="ui-vh" for="[^"]*">Регион<\/label>/);
    expect(distEvents).toContain('<div class="lpp-filters">');
  });

  it('заголовки лент — роль ui-h3 (fs-h3 pages.css:583; ui-h2 60px снят) с низом 24', () => {
    expect(eventsHtml).toContain('<h2 class="ui-h3 ev-title">Предстоящие</h2>');
    expect(eventsHtml).toContain('<h2 class="ui-h3 ev-title">Прошедшие</h2>');
    expect(eventsHtml).not.toMatch(/<h2 class="ui-h2">/);
    expect(blockOf(pilotCss, '.ev-title')).toMatch(/margin-bottom:\s*var\(--ui-space-5\)/);
  });

  it('лента событий — хук ev-grid: шаг 36 (pages.css:9); карточка — паддинг 16 (pages.css:565), фото-слот 220 (pages.css:569), тело 16/4/0 шаг 10 (pages.css:575), мета-шаг 8 (pages.css:581), заголовок 1.3 (pages.css:579)', () => {
    expect(eventsHtml).toContain('<div class="ui-grid ui-grid--3 ev-grid">');
    expect(blockOf(pilotCss, '.ev-grid')).toMatch(/gap:\s*2\.25rem/);
    expect(blockOf(pilotCss, '.ev-grid .ui-card')).toMatch(/padding:\s*1rem/);
    const media = blockOf(pilotCss, '.ev-grid .ui-card__media');
    expect(media).toMatch(/aspect-ratio:\s*auto/);
    expect(media).toMatch(/height:\s*13\.75rem/);
    expect(blockOf(pilotCss, '.ev-grid .ui-card__media > img')).toMatch(/height:\s*100%/);
    const body = blockOf(pilotCss, '.ev-grid .ui-card__body');
    expect(body).toMatch(/gap:\s*0\.625rem/);
    expect(body).toMatch(/padding:\s*1rem 0\.25rem 0/);
    expect(blockOf(pilotCss, '.ev-grid .ui-card__meta')).toMatch(/gap:\s*var\(--ui-space-2\)/);
    expect(blockOf(pilotCss, '.ev-grid .ui-h6')).toMatch(/line-height:\s*1\.3/);
    expect(blockOf(pilotCss, '.ev-grid .ui-h6')).toMatch(/letter-spacing:\s*normal/);
  });

  it('лента «Предстоящие» — низ 56 inline оригинала (events.html:210)', () => {
    expect(eventsHtml).toContain('<div class="ui-grid ui-grid--3 ev-grid ev-grid--lead">');
    expect(blockOf(pilotCss, '.ev-grid--lead')).toMatch(/margin-bottom:\s*3\.5rem/);
  });
});

describe('T18.9 — internship-apply.html: карточная форма (−115)', () => {
  it('секция — хук ia-sec: паддинг 40/40 (.section components.css:347 против 48 канона ui-section)', () => {
    expect(applyHtml).toContain('<section class="ui-section ia-sec">');
    expect(blockOf(pilotCss, '.ia-sec')).toMatch(/padding-block:\s*2\.5rem/);
  });

  it('двойной лейаут снят — ui-form__layout один (оригинал form-page — одна раскладка pages.css:365; внутренняя сжимала колонку формы до 465px)', () => {
    expect(applyHtml.match(/ui-form__layout/g) ?? []).toHaveLength(1);
  });

  it('карточка формы — хук ia-form-card на cp-form-wrap: колонка 24, паддинг 36, фон surface, рамка, радиус 16 (.form-card pages.css:367–375); рамка — токен (hex в сайт-зоне запрещён)', () => {
    expect(applyHtml).toContain('<div class="cp-form-wrap ia-form-card">');
    const css = blockOf(pilotCss, '.ia-form-card');
    expect(css).toMatch(/display:\s*flex/);
    expect(css).toMatch(/flex-direction:\s*column/);
    expect(css).toMatch(/gap:\s*var\(--ui-space-5\)/);
    expect(css).toMatch(/padding:\s*2\.25rem/);
    expect(css).toMatch(/background-color:\s*var\(--ui-color-surface\)/);
    expect(css).toMatch(/border:\s*1px solid var\(--ui-color-border-muted\)/);
    expect(css).toMatch(/border-radius:\s*var\(--ui-radius-md\)/);
    expect(css).toMatch(/box-sizing:\s*border-box/);
  });

  it('заголовок анкеты и вводный абзац — вне карточки (решение T15.4 «form-card__title fs-h3 не переносится — клон несёт канон 60px» не отменяется); карточка оборачивает форму', () => {
    const title = applyHtml.indexOf('<h1 class="ui-page-title">Заявка на стажировку</h1>');
    const intro = applyHtml.indexOf('<p class="ui-small ui-text--muted">Стажировка:');
    const wrap = applyHtml.indexOf('<div class="cp-form-wrap ia-form-card">');
    const form = applyHtml.indexOf('<form class="ui-form"');
    expect(title).toBeGreaterThan(-1);
    expect(intro).toBeGreaterThan(title);
    expect(wrap).toBeGreaterThan(intro);
    expect(form).toBeGreaterThan(wrap);
  });

  it('radio-row — высота 52 по центру (inline internship-apply.html:171/216/226; без хука строка 20px против 52)', () => {
    const css = blockOf(pilotCss, '.ia-form-card .ui-radio-group__row');
    expect(css).toMatch(/min-height:\s*3\.25rem/);
    expect(css).toMatch(/align-items:\s*center/);
  });
});

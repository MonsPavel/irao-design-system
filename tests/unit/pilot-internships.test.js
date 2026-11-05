/**
 * Юнит-пин T18.6 — internships/practices: секция 8 (−555px) и ритм лендингов
 * (спека docs/ui-system/epics/EPIC-18-macro-parity/
 * T18.6-internships-practices.md; практика пинов исходников —
 * pilot-education.test.js T18.5, pilot-career-track.test.js T18.4).
 *
 * Поверхность:
 *  - build.mjs: internshipsMain (общий строитель обеих страниц) — состав
 *    и ритм 1:1 по HTML/CSS оригинала internships.html:145–403: обложка
 *    cover-hero (каркас cvh T17.15 + хук int-cover, прецедент .edu-cover
 *    T18.5) без ритма секции (inline padding: 0 оригинала); табы — секция
 *    pt 24 (internships.html:158) с рядом cp-tabs-row без переноса;
 *    направления — шапка dir-head (титул + select, pages.css:1009),
 *    чипы mb 32 (pages.css:135), сетка шаг 36/минвысота 424
 *    (pages.css:1007) с клампом шорта карточки (pages.css:1045–1054);
 *    марка — канон mrq (T17.15) с хуком int-marquee: тело колонкой,
 *    фото 100%×260 (pages.css:1083–1092; расхождение канона — через
 *    сайт-зону, Out of scope: канон слоя);
 *    стажёры — карточки ui-card--media с фото 4/3 (pages.css:1138,
 *    против 1/1 канона --square), тело 0 20 20/шаг 10 (pages.css:1142–1146);
 *    секция 8 «Наши мероприятия» — лента events-feature 2fr/1fr с большой
 *    карточкой на два ряда и фото 1/1 (pages.css:1150–1171; internship-1.png
 *    431×431 — интринсик 1/1), карточки pad 16/фото 220/тело 16 4 0
 *    (pages.css:565–581);
 *  - сравнение: BLOCK_PROBES internships.html/practices.html в compare.mjs —
 *    пары блоков для приёмки (docHeight Δ≤60, секция 8 Δ≤8);
 *  - ценз: гейт чист (пороги строк подняты errata по процедуре census.mjs).
 *
 * Поверхность браузера (docHeight Δ≤60, секция 8 Δ≤8) — compare-прогон и
 * DOM-пробы .zcode/accept-e18-sections.mjs / .zcode/accept-t186-probe.mjs.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { censusMetrics, runCensusGate } from '../../pilot/career-portal/census.mjs';

const root = join(import.meta.dirname, '..', '..');
const pilotDir = join(root, 'pilot', 'career-portal');

const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8').replace(/\r\n/g, '\n');
const pilotCssRaw = readFileSync(join(pilotDir, 'pilot.css'), 'utf8').replace(/\r\n/g, '\n');
const pilotCss = stripCssComments(pilotCssRaw);

/** Тело internshipsMain() — общий строитель internships.html/practices.html. */
const internFn = build.slice(
  build.indexOf('function internshipsMain'),
  build.indexOf('/* ── целевое обучение ──'),
);

/** Разметка internPerson() — карточка стажёра. */
const personFn = build.slice(
  build.indexOf('function internPerson'),
  build.indexOf('/** карточка организации'),
);

describe('build.mjs — обложка и табы (T18.6, internships.html:145–168)', () => {
  it('обложка — каркас cvh канона (T17.15) с хуком формы сайта int-cover, секция без ритма (inline padding: 0 оригинала, internships.html:147)', () => {
    expect(internFn).toContain('<section class="ui-section int-lead">');
    expect(internFn).toContain('<div class="cvh int-cover">');
  });

  it('CTA обложки — ui-button--primary «смотреть стажировки/практики» на #directions (internships.html:152)', () => {
    expect(internFn).toContain('href="#directions"');
    expect(internFn).toContain(
      '<a class="ui-button ui-button--primary" href="#directions">смотреть ${titleLower}</a>',
    );
  });

  it('секция табов — pt 24 (internships.html:158) и ряд cp-tabs-row без переноса (одна полоса 56px, оригинал pages.css:974–1003)', () => {
    expect(internFn).toContain('<section class="ui-section int-tabs">');
    expect(blockOf(pilotCss, '.int-tabs')).toContain('padding-top: 1.5rem');
    expect(blockOf(pilotCss, '.int-tabs')).toContain('padding-bottom: 2.5rem');
    expect(blockOf(pilotCss, '.int-tabs .cp-tabs-row')).toContain('flex-wrap: nowrap');
  });

  it('панели-подсказки табов — visually-hidden (ui-vh, T17.2): панелей у tabs-pill оригинала нет (internships.html:158–168), панель активного таба давала секции +19px; ритм ленты ui-tabs__list погашен (маргин канона «лента → панель»)', () => {
    expect(internFn.match(/class="ui-tabs__panel ui-vh"/g)?.length).toBe(2);
    expect(blockOf(pilotCss, '.int-tabs .cp-tabs-row .ui-tabs__list')).toContain(
      'margin-bottom: 0',
    );
  });
});

describe('pilot.css — хуки обложки int-cover (pages.css:953–967, прецедент .edu-cover T18.5)', () => {
  it('форма cover-hero: паддинг 64/56, шаг 20, фон/радиус токенами', () => {
    const css = blockOf(pilotCss, '.int-cover');
    expect(css).toContain('padding: 4rem 3.5rem');
    expect(css).toContain('gap: 1.25rem');
    expect(css).toContain('background-color: var(--ui-color-surface-muted)');
    expect(css).toContain('border-radius: var(--ui-radius-md)');
  });

  it('подзаголовок max-width 640 (pages.css:965), кнопка +16 к шагу (pages.css:967)', () => {
    expect(blockOf(pilotCss, '.int-cover .cp-page-subtitle')).toContain('max-width: 40rem');
    expect(blockOf(pilotCss, '.int-cover .ui-button')).toContain('margin-top: var(--ui-space-4)');
  });

  it('секция обложки без ритма (inline padding: 0, internships.html:147; прецедент .edu-lead)', () => {
    expect(blockOf(pilotCss, '.int-lead')).toContain('padding-block: 0');
  });
});

describe('build.mjs + pilot.css — ритм секций лендингов (Scope: паддинги/маргины по оригиналу)', () => {
  it('секции страницы несут хук int-sec — паддинг 40 (.section components.css:336, против 48 канона ui-section)', () => {
    expect(internFn.match(/class="ui-section int-sec"/g)?.length).toBe(7);
    expect(blockOf(pilotCss, '.int-sec')).toContain('padding-block: 2.5rem');
  });

  it('контейнеры лендинга — паддинг 40 только на ступени 2xl (--container-pad variables.css:68 = 40 база; ниже у оригинала лестница 32/24/16 — base.css:96–102, канон ДС с ней совпадает; ступень 40 ≥1440 в слой не перенесена — T2.2, base/layout.css:41; ревью T18.6: без media 1280 → 1185 против 1201, 375 → 280 против 328)', () => {
    expect(pilotCss).toMatch(
      /@media \(min-width: 1440px\) \{\s*\.int-lead \.ui-container,\s*\.int-tabs \.ui-container,\s*\.int-sec \.ui-container \{\s*padding-inline: 2\.5rem;/,
    );
  });

  it('заголовки разделов — int-title mb 32 (.section__title components.css:341; прецедент .ctr-title T18.4/.edu-title T18.5; FAQ-титул — параметр faq(), education без класса не задет)', () => {
    expect(internFn.match(/class="ui-h2 int-title"/g)?.length).toBe(5);
    expect(internFn).toContain("${faq(INT.faq, 'int-title')}");
    expect(blockOf(pilotCss, '.int-title')).toContain('margin: 0 0 var(--ui-space-6)');
  });

  it('шапка направлений — dir-head: flex space-between, шаг 24, низ 24 (pages.css:1009–1015); титул без нижнего маргина (inline mb 0, internships.html:173); select 180 (pages.css:1017)', () => {
    expect(internFn).toContain('<div class="int-dir-head">');
    const css = blockOf(pilotCss, '.int-dir-head');
    expect(css).toContain('justify-content: space-between');
    expect(css).toContain('gap: var(--ui-space-5)');
    expect(css).toContain('margin-bottom: var(--ui-space-5)');
    expect(blockOf(pilotCss, '.int-dir-head .ui-h2')).toContain('margin-bottom: 0');
    expect(blockOf(pilotCss, '.int-dir-head .ui-select--pill')).toContain('min-width: 11.25rem');
  });

  it('чипы направлений — низ 32 (.chip-row pages.css:135) против маргинов канона ui-chip', () => {
    expect(internFn).toContain('<div class="ui-chip int-chips"');
    expect(blockOf(pilotCss, '.int-chips')).toContain('margin: 0 0 var(--ui-space-6)');
  });
});

describe('build.mjs + pilot.css — сетка направлений (T18.6, pages.css:1007–1054)', () => {
  it('сетка — хук int-dir-grid: шаг 36 (.cards-grid) и минвысота 424 (.dir-set pages.css:1007)', () => {
    expect(internFn).toContain('<div class="ui-grid ui-grid--3 int-dir-grid">');
    const css = blockOf(pilotCss, '.int-dir-grid');
    expect(css).toContain('gap: 2.25rem');
    expect(css).toContain('min-height: 26.5rem');
  });

  it('карточка направления — шаг 12 (.dir-card pages.css:1024) против 14 канона ui-card; кламп шорта 3 строки — канон T16.12 на общей cp-intern-card (pages.css:1045–1054), дублирующего хука нет', () => {
    expect(blockOf(pilotCss, '.int-dir-grid .cp-intern-card')).toContain('gap: var(--ui-space-3)');
    expect(blockOf(pilotCss, '.cp-intern-card .ui-small')).toContain('-webkit-line-clamp: 3');
    expect(blockOf(pilotCss, '.int-dir-grid .cp-intern-card .ui-small')).toBeNull();
  });
});

describe('build.mjs + pilot.css — марка преимуществ (хук int-marquee на каноне mrq T17.15)', () => {
  it('разметка несёт хук на каркасе канона; канон слоя не тронут (Out of scope спеки — расхождение через сайт-зону)', () => {
    expect(internFn).toContain('<div class="mrq int-marquee">');
  });

  it('тело — колонка с шагом 20, фото 100%×260, текст 1.5 (pages.css:1083–1092; канон mrq__body — строка с фото 256 — принятая композиция T17.15, здесь ритм высоты 546 ведёт колонка оригинала)', () => {
    const body = blockOf(pilotCss, '.int-marquee .mrq__body');
    expect(body).toContain('flex-direction: column');
    expect(body).toContain('gap: 1.25rem');
    const photo = blockOf(pilotCss, '.int-marquee .mrq__photo');
    expect(photo).toContain('width: 100%');
    expect(photo).toContain('height: 16.25rem');
    expect(blockOf(pilotCss, '.int-marquee .mrq__body .ui-body')).toContain('line-height: 1.5');
  });
});

describe('build.mjs + pilot.css — карточки стажёров (T18.6, pages.css:1136–1146)', () => {
  it('карточка — хук int-person на ui-card--media, фото 4/3 (pages.css:1138) против 1/1 канона --square; каркас — компонент ДС', () => {
    expect(personFn).toContain('class="ui-card ui-card--hover ui-card--media int-person"');
    expect(personFn, 'квадратный слот канона снят — аспект несёт хук').not.toContain(
      'ui-card__media--square',
    );
    expect(blockOf(pilotCss, '.int-person .ui-card__media')).toContain('aspect-ratio: 4 / 3');
  });

  it('геометрия оригинала: карточка без паддинга, шаг 10; тело 0 20 20 (pages.css:1136/1142–1146)', () => {
    const card = blockOf(pilotCss, '.int-person');
    expect(card).toContain('padding: 0');
    expect(card).toContain('gap: 0.625rem');
    const body = blockOf(pilotCss, '.int-person .ui-card__body');
    expect(body).toContain('padding: 0 1.25rem 1.25rem');
    expect(body).toContain('gap: 0.625rem');
  });

  it('сетка людей — шаг 36 (.cards-grid, замер 06.11: orig gap 36 против 32 канона ui-grid)', () => {
    expect(internFn).toContain('<div class="ui-grid ui-grid--3 int-people">');
    expect(blockOf(pilotCss, '.int-people')).toContain('gap: 2.25rem');
  });
});

describe('build.mjs + pilot.css — секция 8 «Наши мероприятия» (T18.6 Goal: −555px, pages.css:565–581/1150–1171)', () => {
  it('лента — 2fr/1fr от lg (pages.css:1150–1155, mobile-first: база колонка), большой карточке — два ряда (pages.css:1157–1161)', () => {
    const base = blockOf(pilotCss, '.cp-events-feature');
    expect(base).toContain('display: grid');
    expect(base).toContain('gap: var(--ui-space-5)');
    expect(base).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(pilotCss).toMatch(
      /\.cp-events-feature \{\s*grid-template-columns: 2fr minmax\(0, 1fr\);/,
    );
    expect(pilotCss).toMatch(/\.cp-events-feature \.ui-card:first-child \{\s*grid-row: 1 \/ 3;/);
  });

  it('большая карточка — слот без аспекта и img без фикс-высоты (pages.css:1163–1171: флекс-растяжка; internship-1.png 431×431 — квадрат; ревью T18.6: aspect-ratio 1/1 на слоте оставлял img полосой 220px от правил 12.5/13.75rem — 627px пустоты при Δ0 гейта; гашение специфичностью (0,4,1), height:100% не нужен — урок ui-card.css:163–172)', () => {
    expect(pilotCss).toMatch(
      /\.cp-events-feature \.ui-card:first-child \.ui-card__media \{\s*aspect-ratio: auto;/,
    );
    expect(pilotCss).toMatch(
      /\.cp-events-feature \.ui-card:first-child \.ui-card__media img \{\s*height: auto;/,
    );
  });

  it('карточка события — паддинг 16 (.event-card pages.css:565), фото 200→220 (pages.css:569/932), тело 16 4 0 с шагом 10 (pages.css:575)', () => {
    const card = blockOf(pilotCss, '.cp-events-feature .ui-card');
    expect(card).toContain('padding: var(--ui-space-4)');
    expect(card).toContain('gap: 0');
    expect(blockOf(pilotCss, '.cp-events-feature .ui-card__media')).toContain('aspect-ratio: auto');
    const img = blockOf(pilotCss, '.cp-events-feature .ui-card__media img');
    expect(img).toContain('height: 12.5rem');
    expect(pilotCss).toMatch(
      /@media \(min-width: 768px\) \{\s*\.cp-events-feature \.ui-card__media img \{\s*height: 13\.75rem;/,
    );
    const body = blockOf(pilotCss, '.cp-events-feature .ui-card__body');
    expect(body).toContain('padding: var(--ui-space-4) 0.25rem 0');
    expect(body).toContain('gap: 0.625rem');
  });

  it('заголовок карточки — lh 1.3 (.event-card__title pages.css:579; прецедент пар T18.5), дата — fs-small (.event-card__date pages.css:577)', () => {
    expect(blockOf(pilotCss, '.cp-events-feature .ui-h6')).toContain('line-height: 1.3');
    expect(blockOf(pilotCss, '.cp-events-feature .ui-card__body time')).toContain(
      'font-size: var(--ui-fs-small)',
    );
  });
});

describe('compare.mjs — BLOCK_PROBES internships/practices (приёмка AC: docHeight Δ≤60, секция 8 Δ≤8)', () => {
  it('пары блоков обеих страниц присутствуют', () => {
    for (const page of ['internships.html', 'practices.html']) {
      const block = compare.match(
        new RegExp(`'${page.replace('.', '\\.')}': \\[[\\s\\S]*?\\n  \\],`),
      );
      expect(block, `BLOCK_PROBES ${page}`).toBeTruthy();
      const text = block[0];
      for (const [name, orig] of [
        ['cover', '.cover-hero'],
        ['tabs', '.tabs-pill'],
        ['directions', '#directions'],
        ['marquee', '.adv-marquee'],
        ['advantages', '.adv-grid'],
        ['timeline', '.timeline'],
        ['interns', '.cards-grid--3:not(.dir-set)'],
        ['events', '.events-feature'],
        ['faq', '.faq'],
      ]) {
        expect(text).toContain(`['${name}', '${orig}'`);
      }
    }
  });
});

describe('ценз T17.16 — гейт чист после errata T18.6 (потолки строк, семейства не менялись)', () => {
  it('пороги строк подняты errata по процедуре census.mjs (файл был ровно на 1894/1089 — прецедент T18.5)', async () => {
    const census = readFileSync(join(pilotDir, 'census.mjs'), 'utf8');
    expect(census).toMatch(/MAX_PILOT_CSS_LINES = 21\d\d/);
    expect(census).toMatch(/MAX_PILOT_CSS_CODE_LINES = 12\d\d/);
    expect(census).toContain('T18.6');
  });

  it('фактические pilot.css/pilot.js проходят гейт: 0 проблем, новых cp-семейств 0', () => {
    const js = readFileSync(join(pilotDir, 'pilot.js'), 'utf8');
    const metrics = censusMetrics(pilotCssRaw.replace(/\r\n/g, '\n'), js.replace(/\r\n/g, '\n'));
    const gate = runCensusGate(metrics);
    expect(gate.problems, JSON.stringify(gate.problems)).toEqual([]);
    expect(gate.newBlocks).toEqual([]);
  });
});

describe('инварианты слой-гейтов (ADR-0002/0001, §3.2)', () => {
  it('без !important и без сырых цветов в цветовых свойствах новых хуков', () => {
    const family = pilotCss.slice(pilotCss.indexOf('── T18.6'));
    expect(family).not.toMatch(/!important/);
    expect(family).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(family).not.toMatch(/rgba?\(/);
  });
});

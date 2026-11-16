/**
 * Юнит-пины T18.16 — макро-вынос: vacancy-search (панель фильтров) и
 * dir-modal → слой (спека docs/ui-system/epics/EPIC-18-macro-parity/
 * T18.16-vacancy-search-dir-modal.md).
 *
 * Исполняемая форма решения:
 *  - паттерн-слой (patterns/patterns.css → dist/ui-patterns.css): канон
 *    панели «Найди свою вакансию» — связка vcs (list-page секция: сетка
 *    «панель | CTA-плитка» 2fr 1fr от lg, мобильная база колонкой —
 *    инверсия ступени 1023; плитка 310px «как есть»
 *    vacancy-search.css:15–18; лента пилюль — стык lpp-filters T17.12,
 *    ширина 260px на потомке ui-select--pill) и канон контента модалки
 *    направления — связка dmd (секция dpp: фото клип/cover, стрелки
 *    галереи по краям) — порт cp-vacancy-search/cp-dir-modal pilot.css
 *    1:1; каркас модалки — компонент ui-modal (T7.2), API не меняется
 *    (Implementation requirements п.2), галерея — форма data-ui-gallery
 *    компонента ui-carousel (T17.7);
 *  - доки — источник правды: list-page (#lpp-vcs-demo) и detail-page
 *    (#dpp-dir-modal-demo) несут те же классы (пин синхронности —
 *    PATTERN_SOURCE_EXTRA patterns-layer.test.js, пары vcs/dmd);
 *  - пилот: cp-vacancy-search/cp-dir-modal сняты из разметки build.mjs и
 *    pilot.css целиком (включая мёртвые базу/__tasks стажировочной
 *    модалки T15.4 и ступень 1023); семейства vacancy-search/dir-modal
 *    уходят из allowlist ценза (судьба «вынос в слой», REPORT §11.4);
 *  - compare: блок-пара панели #vacancies сохранена (310↔310 — Δ0);
 *    computed-пара dir-modal — на крючках канона.
 *
 * Поверхность браузера (эталоны vcs/dmd ×3, проба панели Δ ≤ 4px) —
 * e2e/compare-прогоны (ADR-0004).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { patternLayerProblems } from '../../showcase/patterns-layer-gate.mjs';
import { ALLOWED_CP_FAMILIES } from '../../pilot/career-portal/census.mjs';

const root = join(import.meta.dirname, '..', '..');

const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (первое вхождение; практика pattern-company-family.test.js). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

/** Тело media-ступени (min-width: Npx), содержащей селектор hook (практика
 *  pattern-why-us.test.js). */
const mediaBlockOf = (css, px, hook) => {
  for (const match of css.matchAll(
    new RegExp(`@media \\(min-width: ${px}px\\)\\s*\\{([\\s\\S]*?)\\n\\}`, 'g'),
  )) {
    if (match[1].includes(`.${hook}`)) return match[1];
  }
  return null;
};

const layerFile = readFileSync(join(root, 'patterns', 'patterns.css'), 'utf8');
const layer = stripCssComments(layerFile);
const layerRaw = layerFile.replace(/\r\n/g, '\n');

/** lpp-секция слоя (от .lpp-breadcrumbs до dpp-секции) — Scope спеки
 *  «patterns.css: vcs — стык с lpp-filters» (практика dppSection T18.15). */
const lppSection = layer.slice(0, layer.indexOf('.dpp-breadcrumbs'));
/** dpp-секция слоя (от .dpp-breadcrumbs до fpp-секции). */
const dppSection = layer.slice(
  layer.indexOf('.dpp-breadcrumbs'),
  layer.indexOf('.fpp-breadcrumbs'),
);

const detailHtml = readFileSync(
  join(root, 'patterns', 'detail-page', 'detail-page.html'),
  'utf8',
).replace(/\r\n/g, '\n');
const listHtml = readFileSync(join(root, 'patterns', 'list-page', 'list-page.html'), 'utf8').replace(
  /\r\n/g,
  '\n',
);

const pilotDir = join(root, 'pilot', 'career-portal');
const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
const pilotCss = stripCssComments(readFileSync(join(pilotDir, 'pilot.css'), 'utf8'));
const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8').replace(/\r\n/g, '\n');

describe('patterns/patterns.css — канон панели «Найди свою вакансию» vcs (T18.16 Scope)', () => {
  it('каноны vcs в lpp-секции слоя (до dpp-секции) — стык с lpp-filters', () => {
    for (const hook of ['vcs__wrap', 'vcs__panel', 'vcs__fields']) {
      expect(lppSection.includes(`.${hook}`), `канон .${hook} — в lpp-секции слоя`).toBe(true);
    }
  });

  it('vcs__wrap: сетка «панель | CTA-плитка» — мобильная база колонкой (инверсия ступени 1023), 2fr 1fr от lg; шаг 12 = space-3 (принятый рендер пилота)', () => {
    const wrap = blockOf(layer, '.vcs__wrap');
    expect(wrap, '.vcs__wrap найдено').toBeTruthy();
    expect(wrap, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(wrap, 'grid — порт принятого рендера (cp-vacancy-search__wrap)').toContain(
      'display: grid;',
    );
    expect(wrap, 'шаг 12px — space-3 (принятая интерпретация клона)').toContain(
      'gap: var(--ui-space-3);',
    );
    expect(
      wrap,
      'мобильная база — колонка (оригинал ≤1023 vacancy-search.css:75, инверсия); minmax(0, 1fr) — гранула 32px-гейта T3.6 (прецедент lpp-layout)',
    ).toContain('grid-template-columns: minmax(0, 1fr);');
    const lg = mediaBlockOf(layer, 1024, 'vcs__wrap');
    expect(lg, 'ступень lg (1024) есть').toBeTruthy();
    expect(lg, '«панель | CTA-плитка» 2fr 1fr от lg — принятый рендер пилота').toContain(
      'grid-template-columns: 2fr 1fr;',
    );
  });

  it('vcs__panel: плитка 310px — колонка с шагом 48 «как есть» (vacancy-search.css:16), space-between (:15), мин-высота 310 (:17), паддинг 36 (:18), фон surface (:19); радиус — принятая интерпретация клона radius-lg; типографику несёт роль ui-page-title', () => {
    const panel = blockOf(layer, '.vcs__panel');
    expect(panel, '.vcs__panel найдено').toBeTruthy();
    expect(panel, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(panel, 'flex-колонка — vacancy-search.css:13-14').toContain('display: flex;');
    expect(panel).toContain('flex-direction: column;');
    expect(panel, 'шаг 48px «как есть» — vacancy-search.css:16').toContain('gap: 3rem;');
    expect(panel, 'растяжка по высоте — vacancy-search.css:15').toContain(
      'justify-content: space-between;',
    );
    expect(panel, 'мин-высота 310px «как есть» — vacancy-search.css:17').toContain(
      'min-height: 19.375rem;',
    );
    expect(panel, 'паддинг 36px «как есть» — vacancy-search.css:18').toContain('padding: 2.25rem;');
    expect(panel, 'радиус — принятая интерпретация клона (radius-lg)').toContain(
      'border-radius: var(--ui-radius-lg);',
    );
    expect(panel, 'фон surface — vacancy-search.css:19').toContain(
      'background-color: var(--ui-color-surface);',
    );
    expect(panel, 'fs/fw несёт роль ui-page-title разметки').not.toContain('font-');
  });

  it('vcs__fields: лента пилюль — flex-wrap, шаг 16 (vacancy-search.css:33); ширина пилюли 260px «как есть» (:36) на потомке ui-select--pill, max-width: 100% — гранула T3.6 (прецедент lpp-pill)', () => {
    const fields = blockOf(layer, '.vcs__fields');
    expect(fields, '.vcs__fields найдено').toBeTruthy();
    expect(fields, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(fields, 'flex-лента — vacancy-search.css:32').toContain('display: flex;');
    expect(fields, 'перенос — vacancy-search.css:34').toContain('flex-wrap: wrap;');
    expect(fields, 'шаг 16px — vacancy-search.css:33').toContain('gap: 1rem;');
    const pill = blockOf(layer, '.vcs__fields > .ui-select--pill');
    expect(pill, 'ширина пилюли — правило на потомке .ui-select--pill').toBeTruthy();
    expect(pill, 'basis 260px «как есть» — vacancy-search.css:36').toContain(
      'flex: 0 0 16.25rem;',
    );
    expect(pill, 'max-width: 100% — reflow-гранула 32px-гейта T3.6').toContain(
      'max-width: 100%;',
    );
  });

  it('инварианты vcs: медиа только min-width из шкалы T2.5; геометрию пилюли несёт компонент ui-select--pill (T17.12) — слой её не дублирует', () => {
    const section = lppSection.slice(lppSection.indexOf('.vcs__wrap'));
    const medias = [...section.matchAll(/@media \(min-width: (\d+)px\)/g)].map((m) => m[1]);
    for (const value of medias) {
      expect(['480', '768', '1024', '1280', '1440'], `${value}px — из шкалы T2.5`).toContain(value);
    }
    const pill = blockOf(layer, '.vcs__fields > .ui-select--pill');
    expect(pill, 'геометрия (радиус/фон/высота) — компонент T17.12').not.toMatch(
      /border-radius|background|height|font-/,
    );
  });
});

describe('patterns/patterns.css — канон контента модалки направления dmd (T18.16 Scope)', () => {
  it('каноны dmd в dpp-секции слоя (до fpp-секции) — контент поверх ui-modal', () => {
    for (const hook of ['dmd__photo', 'dmd__nav']) {
      expect(dppSection.includes(`.${hook}`), `канон .${hook} — в dpp-секции слоя`).toBe(true);
    }
  });

  it('dmd__photo: во всю ширину тела, клип радиуса md (= --radius-card 16px оригинала directions.css:154), cover (:153); высоту ведут width/height атрибуты разметки (aspect-канон)', () => {
    const photo = blockOf(layer, '.dmd__photo');
    expect(photo, '.dmd__photo найдено').toBeTruthy();
    expect(photo, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(photo, 'cover — directions.css:153').toContain('object-fit: cover;');
    expect(photo, 'во всю ширину — directions.css:151').toContain('width: 100%;');
    expect(photo, 'радиус md = --radius-card 16px — directions.css:154').toContain(
      'border-radius: var(--ui-radius-md);',
    );
    expect(photo, 'фиксированную высоту оригинала (400px) ведёт aspect разметки').not.toContain(
      'height',
    );
  });

  it('dmd__nav: стрелки галереи по краям (space-between — принятая интерпретация T18.14), боковой паддинг 8px = space-2, отрицательный верх −24px = space-5 (накрытие края фото)', () => {
    const nav = blockOf(layer, '.dmd__nav');
    expect(nav, '.dmd__nav найдено').toBeTruthy();
    expect(nav, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(nav, 'flex-строка стрелок — directions.css:158').toContain('display: flex;');
    expect(nav, 'стрелки по краям — интерпретация пилота (T18.14)').toContain(
      'justify-content: space-between;',
    );
    expect(nav, 'отрицательный верх −24px = space-5').toContain(
      'margin-top: calc(-1 * var(--ui-space-5));',
    );
    expect(nav, 'боковой паддинг 8px = space-2').toContain('padding: 0 var(--ui-space-2);');
  });

  it('инварианты dmd: каркас модалки — компонент ui-modal (слой панель/заголовок/кнопку не дублирует); без hex/!important; гейт префиксов проходит (vcs/dmd — канонические)', () => {
    expect(layer, 'панель ui-modal в слое нет (компонент T7.2)').not.toMatch(
      /\.dmd[^_]*(?:__title|__close|__body)/,
    );
    expect(layer, 'hex только в tokens/primitives.css').not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(layer, '!important только в a11y/vi.css').not.toContain('!important');
    expect(
      patternLayerProblems('.vcs__panel { padding: 2.25rem; }\n.dmd__nav { display: flex; }'),
      'vcs/dmd — канонические префиксы',
    ).toEqual([]);
    expect(
      patternLayerProblems('.vv-evil { gap: 4px; }').length,
      'чужой namespace ловится (две диагностики: нет крючка слоя + чужой крючок)',
    ).toBe(2);
  });
});

describe('доки паттернов — источник правды (синхронность док ↔ слой, прецедент dir/hld)', () => {
  /** Классы-крючки канона в разметке дока (class="…", комментарии вне). */
  const docHooks = (docHtml, re) => {
    const html = docHtml.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ');
    const found = new Set();
    for (const attr of html.match(/class="[^"]*"/g) ?? []) {
      for (const name of attr.slice(7, -1).split(' ')) {
        if (re.test(name)) found.add(name);
      }
    }
    return found;
  };

  /** Крючки канона в правилах слоя. */
  const layerHookSet = (layerCss, re) => {
    const hooks = new Set();
    for (const selector of layerCss.match(/[^{}]+(?=\{)/g) ?? []) {
      for (const hook of selector.match(/\.[a-z][a-z0-9_-]*/g) ?? []) {
        if (re.test(hook)) hooks.add(hook.slice(1));
      }
    }
    return hooks;
  };

  it('синхронность док ↔ слой (vcs): стенд list-page несёт полный API канона панели (vcs__wrap/vcs__panel/vcs__fields)', () => {
    const hooks = layerHookSet(layer, /^\.vcs(?:__|$)/);
    expect([...hooks].sort(), 'слой несёт полный API канона vcs').toEqual([
      'vcs__fields',
      'vcs__panel',
      'vcs__wrap',
    ]);
    const markup = docHooks(listHtml, /^vcs__/);
    expect(markup.size, 'list-page.html: классы канона vcs в разметке есть').toBe(3);
    for (const hook of hooks) {
      expect(markup.has(hook), `list-page: крючок «${hook}» из слоя есть в разметке дока`).toBe(
        true,
      );
    }
    for (const name of markup) {
      expect(hooks.has(name), `list-page: класс «${name}» разметки имеет правило слоя`).toBe(true);
    }
  });

  it('синхронность док ↔ слой (dmd): стенд detail-page несёт полный API канона dmd (dmd__photo/dmd__nav)', () => {
    const hooks = layerHookSet(layer, /^\.dmd__/);
    expect([...hooks].sort(), 'слой несёт полный API канона dmd').toEqual([
      'dmd__nav',
      'dmd__photo',
    ]);
    const markup = docHooks(detailHtml, /^dmd__/);
    expect(markup.size, 'detail-page.html: классы канона dmd в разметке есть').toBe(2);
    for (const hook of hooks) {
      expect(markup.has(hook), `detail-page: крючок «${hook}» из слоя есть в разметке дока`).toBe(
        true,
      );
    }
    for (const name of markup) {
      expect(hooks.has(name), `detail-page: класс «${name}» разметки имеет правило слоя`).toBe(
        true,
      );
    }
  });

  it('стенд detail-page: модалка — диалог ui-modal ui-modal--md (каркас компонента, T7.2) с каноном dmd внутри; галерея — форма data-ui-gallery (T17.7)', () => {
    const section =
      detailHtml
        .replace(/<!--[\s\S]*?-->/g, '')
        .match(/<dialog[^>]*id="dpp-dir-modal-demo-dialog"[\s\S]*?<\/dialog>/)?.[0] ?? '';
    expect(section, 'диалог модалки найден').not.toBe('');
    expect(section, 'каркас — компонент ui-modal --md').toContain('ui-modal ui-modal--md');
    expect(section, 'заголовок — компонентный слот ui-modal__title').toContain('ui-modal__title');
    expect(section, 'тело — компонентный слот ui-modal__body').toContain('ui-modal__body');
    expect(section, 'фото — канон dmd__photo').toContain('dmd__photo');
    expect(section, 'навигация — канон dmd__nav').toContain('dmd__nav');
    expect(section, 'стрелки — компонент ui-button--sm').toMatch(
      /ui-button ui-button--light ui-button--sm/,
    );
  });
});

describe('пилот career-portal: панель и модалка на канонах (T18.16; AC: cp-семейства 0)', () => {
  it('разметка build.mjs: cp-vacancy-search снят — панель на каноне vcs (wrap id="vacancies" сохранён — цель навигации не меняется; пилюли/CTA — компоненты T17.12/T17.8)', () => {
    expect(build, 'cp-vacancy-search из разметки снят').not.toMatch(
      /class="[^"]*\bcp-vacancy-search\b/,
    );
    expect(build, 'обёртка панели — канон vcs__wrap (id сохранён)').toContain(
      '<div class="vcs__wrap" id="vacancies">',
    );
    expect(build, 'плитка панели — канон vcs__panel').toContain(
      '<form class="vcs__panel" action="vacancies.html" method="get" aria-label="Поиск вакансии">',
    );
    expect(build, 'лента пилюль — канон vcs__fields').toContain(
      '<div class="vcs__fields">',
    );
    expect(build, 'CTA-плитка — компонент ui-card--cta (T17.8) сохранён').toContain(
      '<a class="ui-card ui-card--cta ui-card--cta--accent ui-card--cta--row" href="vacancies.html">',
    );
  });

  it('разметка build.mjs: cp-dir-modal снят — контент модалки на каноне dmd (каркас ui-modal ui-modal--md и галерея data-ui-gallery сохранены)', () => {
    expect(build, 'cp-dir-modal из разметки снят').not.toMatch(/cp-dir-modal/);
    expect(build, 'каркас модалки — компонент ui-modal--md').toContain(
      '<dialog class="ui-modal ui-modal--md" id="cp-direction-dialog" open data-ui-modal aria-labelledby="cp-direction-dialog-title">',
    );
    expect(build, 'фото модалки — канон dmd__photo').toContain(
      '<img class="dmd__photo" src="${esc(directionPhotos[0])}" alt="" data-ui-gallery-photo width="590" height="400">',
    );
    expect(build, 'навигация галереи — канон dmd__nav').toContain('<div class="dmd__nav">');
    expect(build, 'галерея — форма data-ui-gallery (T17.7) сохранена').toContain(
      '<div class="ui-modal__body ui-carousel" data-ui-gallery>',
    );
  });

  it('pilot.css: пара cp-семейств снята целиком (базы/элементы + ступень 1023; мёртвые база/__tasks стажировочной модалки T15.4 — тоже)', () => {
    for (const gone of [
      '.cp-vacancy-search__wrap',
      '.cp-vacancy-search__panel',
      '.cp-vacancy-search__fields',
      '.cp-dir-modal',
      '.cp-dir-modal__photo',
      '.cp-dir-modal__nav',
      '.cp-dir-modal__tasks',
    ]) {
      expect(pilotCss, `семейство ${gone} перенесено в слой`).not.toContain(gone);
    }
    const m1023 = pilotCss.slice(
      pilotCss.indexOf('@media (max-width: 1023px)'),
      pilotCss.indexOf('@media (max-width: 767px)'),
    );
    expect(m1023, 'ступень 1023: обёртка панели снята (мобильная база lg канона)').not.toContain(
      'cp-vacancy-search',
    );
    expect(m1023, 'ступень 1023: сетка модалки снята').not.toContain('cp-dir-modal');
  });

  it('compare: блок-пара панели #vacancies сохранена; computed-пара dir-modal — на крючках канона (прецедент prd/whu/dir)', () => {
    expect(compare, 'блок-пара панели — id не меняется').toContain(
      "['vacancy-search', '.vacancy-search', '#vacancies']",
    );
    expect(compare, 'computed-пара фото модалки — на крючке слоя').toContain("pilot: '.dmd__photo'");
    expect(compare, 'computed-пара навигации — на крючке слоя').toContain("pilot: '.dmd__nav'");
    expect(compare).not.toContain('.cp-vacancy-search');
    expect(compare).not.toContain('.cp-dir-modal');
  });
});

describe('ценз сайт-зоны: vacancy-search/dir-modal ушли из allowlist (T18.16 AC)', () => {
  it('allowlist ценза без vacancy-search/dir-modal — судьба семейств «вынос в слой» (REPORT §11.4); прочие семейства не тронуты', () => {
    expect(ALLOWED_CP_FAMILIES, 'панель — вынесена в слой (канон vcs, T18.16)').not.toContain(
      'vacancy-search',
    );
    expect(ALLOWED_CP_FAMILIES, 'модалка — вынесена в слой (канон dmd, T18.16)').not.toContain(
      'dir-modal',
    );
    expect(ALLOWED_CP_FAMILIES, 'ленты компании — сайт-зона (T18.3)').toContain('company-feed');
    expect(ALLOWED_CP_FAMILIES, 'allowlist — errata T18.3/T18.10–T18.16').toHaveLength(16);
  });
});

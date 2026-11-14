/**
 * Юнит-пины T18.14 — макро-вынос: directions и holding → паттерн-слой
 * (спека docs/ui-system/epics/EPIC-18-macro-parity/T18.14-directions-holding-layer.md).
 *
 * Исполняемая форма решения:
 *  - паттерн-слой (patterns/patterns.css → dist/ui-patterns.css): канон dir —
 *    сетка карточек-направлений (порт .cp-directions pilot.css:137-201,
 *    каркас оригинала directions.css 1:1 батч 31.10 «приведи к оригиналу» —
 *    рамочные карточки 179px, сетка 4×; блок 652↔652 байт-паритет) и канон
 *    hld — фото-фон + статы + ритм 72/48 (порт .cp-holding pilot.css:126-245;
 *    фон — примитив ui-section--photo T17.3 без оверлея, статы — компонент
 *    ui-stat--glass T17.4, компакт-вариант v2 index-2 — модификатор
 *    hld--compact, специфичность 0-2-0 — решение батча 01.11); значения 1:1
 *    принятому пилоту с источниками в комментариях (Implementation
 *    requirements п.2); мобильные базы — ступени пилота max-1023/767,
 *    инвертированные mobile-first (768/1024 шкалы T2.5 — прецедент msh/whu);
 *  - гейт префиксов слоя расширен (dir|hld);
 *  - док-паттерн landing-section — источник правды: секции lsp-directions/
 *    lsp-holding несут те же классы (пин синхронности, прецедент whu/prd);
 *    hld--compact — модификатор слоя без секции дока (прецедент
 *    lgo--mosaic/hro--marquee: вариант исполнен разметкой пилота —
 *    applyVariant2, пин маркера ниже);
 *  - пилот: cp-directions/cp-holding сняты из разметки build.mjs и pilot.css
 *    (включая группы ступеней 1023/767) — семейства directions/holding уходят
 *    из allowlist ценза (судьба «вынос в слой», REPORT §11.4); модалка
 *    направления (dir-modal — T18.16, Out of scope) остаётся сайт-зоной:
 *    контентные классы модалки index переименованы в семейство dir-modal
 *    (cp-dir-modal__photo — дубликат правила стажировочной модалки снят
 *    1:1, cp-dir-modal__nav добавлен);
 *  - compare: блок-пары directions/holding — на крючках канона (.dir/.hld).
 *
 * Поверхность браузера (эталоны dir/hld ×3, docHeight index/index-2 ±4px) —
 * e2e/compare-прогоны (ADR-0004).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { patternLayerProblems } from '../../showcase/patterns-layer-gate.mjs';
import { ALLOWED_CP_FAMILIES } from '../../pilot/career-portal/census.mjs';

const root = join(import.meta.dirname, '..', '..');

const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (первое вхождение; практика pattern-why-us.test.js). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

/** Тело media-ступени (min-width: Npx), содержащей селектор hook — поиск по
 *  ВСЕМ ступеням файла (практика pattern-why-us.test.js). */
const mediaBlockOf = (css, px, hook) => {
  for (const match of css.matchAll(
    new RegExp(`@media \\(min-width: ${px}px\\)\\s*\\{([\\s\\S]*?)\\n\\}`, 'g'),
  )) {
    if (match[1].includes(`.${hook}`)) return match[1];
  }
  return null;
};

/** Тело media-ступени (hover: hover), содержащей селектор hook (hover-состояния
 *  канонов — под гвардом EPIC-4; практика pattern-why-us.test.js). */
const hoverBlockOf = (css, hook) => {
  for (const match of css.matchAll(/@media \(hover: hover\)\s*\{([\s\S]*?)\n\}/g)) {
    if (match[1].includes(hook)) return match[1];
  }
  return null;
};

const layerFile = readFileSync(join(root, 'patterns', 'patterns.css'), 'utf8');
const layer = stripCssComments(layerFile);

const landingHtml = readFileSync(
  join(root, 'patterns', 'landing-section', 'landing-section.html'),
  'utf8',
).replace(/\r\n/g, '\n');

const pilotDir = join(root, 'pilot', 'career-portal');
const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
const pilotCss = stripCssComments(readFileSync(join(pilotDir, 'pilot.css'), 'utf8'));
const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8').replace(/\r\n/g, '\n');

describe('patterns/patterns.css — канон сетки направлений (dir, T18.14 Scope)', () => {
  it('секция .dir: ритм 72/72 «как есть» (directions.css:2, ритм ui-section погашен); position не переобъявляется (голая секция без фона — ритм несёт каркас ui-section)', () => {
    const dir = blockOf(layer, '.dir');
    expect(dir, '.dir найдено').toBeTruthy();
    expect(dir, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(dir, 'ритм 72/72 «как есть» — directions.css:2').toContain('padding: 4.5rem 0;');
    expect(dir, 'фон/позиция — каркас ui-section (секция светлая, без примитива)').not.toContain(
      'position',
    );
    expect(dir, 'фон — каркас ui-section (не переобъявляется)').not.toContain('background');
  });

  it('заголовок: .dir .ui-h2 margin-bottom 48px (directions.css:8; роль ui-h2 канона без отступа — ui-потомок под крючком слоя, прецедент .lgo .ui-h2)', () => {
    const title = blockOf(layer, '.dir .ui-h2');
    expect(title, '.dir .ui-h2 найдено').toBeTruthy();
    expect(title, 'низ 48px — directions.css:8').toContain('margin-bottom: 3rem;');
    expect(title, 'fs/fw несёт роль ui-h2 разметки').not.toContain('font-size');
  });

  it('сетка: grid, шаг 36px «как есть» (directions.css:10); мобильная база — колонка, 2×1fr от md (ступень пилота max-1023, инверсия), 4×1fr от lg (десктоп-форма)', () => {
    const grid = blockOf(layer, '.dir__grid');
    expect(grid, '.dir__grid найдено').toBeTruthy();
    expect(grid, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(grid, 'grid — принятый порт пилота').toContain('display: grid;');
    expect(grid, 'шаг 36px «как есть» — directions.css:10').toContain('gap: 2.25rem;');
    expect(grid, 'мобильная база — колонка (оригинал ≤767, инверсия)').toContain(
      'grid-template-columns: minmax(0, 1fr);',
    );
    const md = mediaBlockOf(layer, 768, 'dir__grid');
    expect(md, 'ступень md есть').toBeTruthy();
    expect(md, '2 колонки от md — ступень пилота max-1023 (directions.css:222), инверсия').toContain(
      'grid-template-columns: repeat(2, 1fr);',
    );
    const lg = mediaBlockOf(layer, 1024, 'dir__grid');
    expect(lg, 'ступень lg есть').toBeTruthy();
    expect(lg, '4×1fr — десктоп-форма (directions.css:16)').toContain(
      'grid-template-columns: repeat(4, 1fr);',
    );
  });

  it('карточка-рамка: flex-колонка gap 34 (directions.css:17), имя прижато к низу (directions.css:15), min-height 179 (directions.css:18), padding 20 (directions.css:19), рамка gray-300 = border-пара (directions.css:20), радиус card 16 = md, поверхность surface, text-align left (кнопка), переходы фона/рамки; шрифт не задаётся — 1:1 порт пилота (UA-кнопка, дельта канона — REPORT)', () => {
    const card = blockOf(layer, '.dir__card');
    expect(card, '.dir__card найдено').toBeTruthy();
    expect(card, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(card, 'flex-колонка (directions.css:14-15)').toContain('display: flex;');
    expect(card).toContain('flex-direction: column;');
    expect(card, 'gap 34px «как есть» — directions.css:17').toContain('gap: 2.125rem;');
    expect(card, 'имя прижато к низу — directions.css:15').toContain(
      'justify-content: space-between;',
    );
    expect(card, 'во всю ширину (directions.css:19)').toContain('width: 100%;');
    expect(card, 'min-height 179px — directions.css:18').toContain('min-height: 11.1875rem;');
    expect(card, 'padding 20px — directions.css:19').toContain('padding: 1.25rem;');
    expect(card, 'рамка gray-300 = --ui-border-color (directions.css:20)').toContain(
      'border: var(--ui-border-width) solid var(--ui-border-color);',
    );
    expect(card, 'радиус --radius-card 16px = md').toContain('border-radius: var(--ui-radius-md);');
    expect(card, 'поверхность — var(--ui-color-surface) (directions.css:21)').toContain(
      'background-color: var(--ui-color-surface);',
    );
    expect(card, 'text-align left — кнопка оригинала (directions.css:24)').toContain(
      'text-align: left;',
    );
    expect(card, 'переходы фона/рамки — directions.css:25').toContain('transition:');
    expect(card).toContain('background-color var(--ui-transition),');
    expect(card).toContain('border-color var(--ui-transition);');
    expect(card, 'шрифт не задаётся (1:1 порт пилота — UA-кнопка)').not.toContain('font-');
  });

  it('hover карточки — под гвардом (hover: hover) (EPIC-4): рамка и фон blue-100 = --ui-color-surface-hover (directions.css:27-28)', () => {
    const hover = hoverBlockOf(layer, '.dir__card:hover');
    expect(hover, 'hover-ветка под гвардом').toBeTruthy();
    const rule = hover.match(/\.dir__card:hover\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(rule, 'рамка blue-100 — directions.css:27').toContain(
      'border-color: var(--ui-color-surface-hover);',
    );
    expect(rule, 'фон blue-100 — directions.css:28').toContain(
      'background-color: var(--ui-color-surface-hover);',
    );
    expect(
      layer.match(/\.dir__card:hover/g)?.length,
      'одна hover-ветка канона (стрелка оригинала rotate(45) пилотом не велась — не переносится)',
    ).toBe(1);
  });

  it('иконка 76px (directions.css:31-33) и имя (directions.css:34-38): flex-строка gap 4, прижато к низу, space-between, color-text (не primary), fw 500, ls −0.02em; стрелка прижата (5px, directions.css:42)', () => {
    const icon = blockOf(layer, '.dir__icon');
    expect(icon, '.dir__icon найдено').toBeTruthy();
    expect(icon, 'contain — directions.css:32').toContain('object-fit: contain;');
    expect(icon, '76px — directions.css:31').toContain('width: 4.75rem;');
    expect(icon).toContain('height: 4.75rem;');
    const name = blockOf(layer, '.dir__name');
    expect(name, '.dir__name найдено').toBeTruthy();
    expect(name, 'flex-строка (directions.css:35-37)').toContain('display: flex;');
    expect(name, 'gap 4px — directions.css:34').toContain('gap: 0.25rem;');
    expect(name, 'прижато к низу — directions.css:36').toContain('align-items: flex-end;');
    expect(name, 'стрелка справа — directions.css:37').toContain('justify-content: space-between;');
    expect(name, 'color-text (не primary) — directions.css:38').toContain(
      'color: var(--ui-color-text);',
    );
    expect(name, 'fw 500 — directions.css:36').toContain('font-weight: var(--ui-fw-body-bold);');
    expect(name, 'ls −0.02em «как есть» — directions.css:37').toContain('letter-spacing: -0.02em;');
    const arrow = blockOf(layer, '.dir__name svg');
    expect(arrow, '.dir__name svg найдено').toBeTruthy();
    expect(arrow, 'не сжимается (directions.css:45)').toContain('flex: 0 0 auto;');
    expect(arrow, 'прижатие 5px — directions.css:42').toContain('margin-bottom: 0.3125rem;');
  });

  it('инварианты слоя: без hex, без !important (гейт); модалки направления в каноне нет (dir-modal — T18.16, Out of scope)', () => {
    expect(layer.match(/\.dir-modal|\.dmd-/g)?.length ?? 0, 'модалки в слое нет (T18.16)').toBe(0);
    expect(layer, 'hex только в tokens/primitives.css').not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(layer, '!important только в a11y/vi.css').not.toContain('!important');
  });
});

describe('patterns/patterns.css — канон холдинга (hld, T18.14 Scope)', () => {
  it('секция .hld: ритм 72/48 «как есть» (holding.css:3, ритм ui-section погашен — компакт та же сумма); position/isolation несёт примитив ui-section--photo (T17.3) — слой не переобъявляет', () => {
    const hld = blockOf(layer, '.hld');
    expect(hld, '.hld найдено').toBeTruthy();
    expect(hld, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(hld, 'ритм 72/48 «как есть» — holding.css:3').toContain('padding: 4.5rem 0 3rem;');
    expect(hld, 'position несёт ui-section--photo (T17.3)').not.toContain('position');
    expect(hld, 'фон/оверлей несёт примитив (без оверлея — on-dark контент)').not.toContain(
      'background',
    );
  });

  it('внутренняя зона: .hld__inner — вертикальная геометрия space-8 (64px, принятый батч ритма 01.11 — «вертикальную геометрию несёт __inner»); высоту база не фиксирует (auto — форма index)', () => {
    const inner = blockOf(layer, '.hld__inner');
    expect(inner, '.hld__inner найдено').toBeTruthy();
    expect(inner, 'верх 64px — space-8 (пилот, батч ритма 01.11)').toContain(
      'padding-top: var(--ui-space-8);',
    );
    expect(inner, 'низ 64px — space-8').toContain('padding-bottom: var(--ui-space-8);');
    expect(inner, 'высоту ведёт контент (auto — форма index)').not.toContain('height');
  });

  it('заголовок: max-width 704px (44rem — принятый пилот) и цвет on-dark (holding.css:42 — пара на фото-фоне); fs/fw/lh несёт роль ui-h2', () => {
    const title = blockOf(layer, '.hld__title');
    expect(title, '.hld__title найдено').toBeTruthy();
    expect(title, 'max-width 704px — принятый пилот (44rem)').toContain('max-width: 44rem;');
    expect(title, 'цвет on-dark — holding.css:42').toContain(
      'color: var(--ui-color-text-on-dark);',
    );
    expect(title, 'fs/fw/lh несёт роль ui-h2 разметки').not.toContain('font-');
  });

  it('статы: grid — колонка в мобильной базе, 2×1fr от md (ступень пилота max-1023, инверсия), 3×1fr от lg; шаг 12 (space-3 — принятый рендер T17.4), верх 48 (space-7); список без маркеров несёт reset.css', () => {
    const stats = blockOf(layer, '.hld__stats');
    expect(stats, '.hld__stats найдено').toBeTruthy();
    expect(stats, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(stats, 'grid — принятый порт пилота (оригинал flex)').toContain('display: grid;');
    expect(stats, 'мобильная база — колонка (оригинал ≤767, инверсия)').toContain(
      'grid-template-columns: minmax(0, 1fr);',
    );
    expect(stats, 'шаг 12px — space-3 (принятый рендер, T17.4)').toContain(
      'gap: var(--ui-space-3);',
    );
    expect(stats, 'верх 48px — space-7 (пилот)').toContain('margin-top: var(--ui-space-7);');
    const md = mediaBlockOf(layer, 768, 'hld__stats');
    expect(md, 'ступень md есть').toBeTruthy();
    expect(md, '2 колонки от md — ступень пилота max-1023 (holding.css:87), инверсия').toContain(
      'grid-template-columns: repeat(2, 1fr);',
    );
    const lg = mediaBlockOf(layer, 1024, 'hld__stats');
    expect(lg, 'ступень lg есть').toBeTruthy();
    expect(lg, '3×1fr — десктоп-форма (holding.css:47)').toContain(
      'grid-template-columns: repeat(3, 1fr);',
    );
  });

  it('компакт-вариант v2 — модификатор .hld--compact (holding.css:34): __inner фикс 638px «как есть», специфичность 0-2-0 (решение батча 01.11); паддинги секции на базе — модификатор несёт только высоту', () => {
    const compact = blockOf(layer, '.hld--compact .hld__inner');
    expect(compact, '.hld--compact .hld__inner найдено').toBeTruthy();
    expect(compact, '638px «как есть» — holding.css:34').toContain('height: 39.875rem;');
    expect(compact.trim(), 'модификатор несёт только высоту (паддинги 72/48 — база)').toBe(
      'height: 39.875rem;',
    );
    // пустой no-op-модификатор пилота (только комментарий) не переносится
    expect(blockOf(layer, '.hld--compact'), 'no-op-правила модификатора нет').toBeFalsy();
  });

  it('гейт префиксов слоя расширен (dir|hld): канонические крючки проходят, ui-потомок проходит, чужой крючок ловится', () => {
    expect(
      patternLayerProblems('.dir { padding: 4.5rem 0; }\n.hld__stats { display: grid; }'),
      'dir/hld — канонические префиксы',
    ).toEqual([]);
    expect(
      patternLayerProblems('.hld--compact .hld__inner { height: 39.875rem; }'),
      'модификатор канона каноничен',
    ).toEqual([]);
    expect(
      patternLayerProblems('.dir-evil { gap: 4px; }').length,
      'чужой namespace ловится',
    ).toBeGreaterThan(0);
    expect(
      patternLayerProblems('.cp-directions__grid { gap: 4px; }').length,
      'сайт-семейство в слое ловится',
    ).toBeGreaterThan(0);
  });
});

describe('док landing-section: секции directions/holding (док — источник правды, T18.14)', () => {
  /** Классы-крючки dir-/hld- в разметке дока (class="…", комментарии вне). */
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

  /** Крючки dir-/hld- в правилах слоя. */
  const layerHookSet = (layerCss, re) => {
    const hooks = new Set();
    for (const selector of layerCss.match(/[^{}]+(?=\{)/g) ?? []) {
      for (const hook of selector.match(/\.[a-z][a-z0-9_-]*/g) ?? []) {
        if (re.test(hook)) hooks.add(hook.slice(1));
      }
    }
    return hooks;
  };

  it('синхронность док ↔ слой (dir): секция lsp-directions несёт ровно те же классы (прецедент whu/prd)', () => {
    const re = /^dir(?:__|$)/;
    const hooks = layerHookSet(layer, re);
    expect([...hooks].sort(), 'слой несёт полный API канона dir').toEqual([
      'dir',
      'dir__card',
      'dir__grid',
      'dir__icon',
      'dir__name',
    ]);
    const markup = docHooks(landingHtml, re);
    expect(markup.size, 'landing-section.html: dir-классы в разметке есть').toBeGreaterThan(0);
    for (const hook of hooks) {
      expect(
        markup.has(hook),
        `landing-section: крючок «${hook}» из слоя есть в разметке дока`,
      ).toBe(true);
    }
    for (const name of markup) {
      expect(hooks.has(name), `landing-section: класс «${name}» разметки имеет правило слоя`).toBe(
        true,
      );
    }
    expect(landingHtml, 'секция — светлая ui-section (фон не фото)').toContain(
      '<section class="ui-section dir" id="lsp-directions"',
    );
    const dirIdx = landingHtml.indexOf('id="lsp-directions"');
    expect(dirIdx, 'секция dir на месте').toBeGreaterThan(-1);
    expect(dirIdx, 'dir после production-v2 (предыдущая секция дока)').toBeGreaterThan(
      landingHtml.indexOf('id="lsp-production-v2"'),
    );
  });

  it('синхронность док ↔ слой (hld): секция lsp-holding несёт классы базы; hld--compact — модификатор без секции дока (прецедент lgo--mosaic/hro--marquee: вариант исполнен разметкой пилота)', () => {
    const re = /^hld(?:-|__|$)/;
    const hooks = layerHookSet(layer, re);
    expect([...hooks].sort(), 'слой несёт полный API канона hld').toEqual([
      'hld',
      'hld--compact',
      'hld__inner',
      'hld__stats',
      'hld__title',
    ]);
    const markup = docHooks(landingHtml, re);
    expect(markup.size, 'landing-section.html: hld-классы в разметке есть').toBeGreaterThan(0);
    for (const hook of hooks) {
      if (hook === 'hld--compact') {
        // модификатор v2 — маркер applyVariant2 пилота (пин в блоке пилота ниже)
        continue;
      }
      expect(
        markup.has(hook),
        `landing-section: крючок «${hook}» из слоя есть в разметке дока`,
      ).toBe(true);
    }
    for (const name of markup) {
      expect(hooks.has(name), `landing-section: класс «${name}» разметки имеет правило слоя`).toBe(
        true,
      );
    }
    expect(landingHtml, 'секция — фото-примитив + канон hld').toContain(
      '<section class="ui-section ui-section--photo hld" id="lsp-holding"',
    );
    const hldIdx = landingHtml.indexOf('id="lsp-holding"');
    expect(hldIdx, 'секция hld на месте').toBeGreaterThan(-1);
    expect(hldIdx, 'hld после directions (предыдущая секция дока)').toBeGreaterThan(
      landingHtml.indexOf('id="lsp-directions"'),
    );
  });

  it('VI-инвариант дока (hld): фон секции — ui-section__bg примитива (aria-hidden, alt=""), оверлея нет; иконки направлений — декоративные alt=""', () => {
    const markup = landingHtml.replace(/<!--[\s\S]*?-->/g, '');
    const holding = markup.match(/<section[^>]*id="lsp-holding"[\s\S]*?<\/section>/)?.[0] ?? '';
    expect(holding, 'секция hld найдена').not.toBe('');
    expect(holding, 'оверлея нет (фото без затемнения — канон оригинала)').not.toContain(
      'ui-section__overlay',
    );
    const bg = holding.match(/<div class="ui-section__bg"[\s\S]*?<\/div>/)?.[0] ?? '';
    expect(bg, 'фон __bg на месте').not.toBe('');
    expect(bg, 'img фона — alt=""').toContain('alt=""');
    expect(holding.indexOf('ui-section__bg'), '__bg до контента').toBeLessThan(
      holding.indexOf('hld__inner'),
    );
    for (const img of holding.match(/<img[^>]*>/g) ?? []) {
      expect(img, `img декоративный (alt=""): ${img.slice(0, 60)}`).toContain('alt=""');
    }
    const directions = markup.match(/<section[^>]*id="lsp-directions"[\s\S]*?<\/section>/)?.[0] ?? '';
    for (const img of directions.match(/<img[^>]*>/g) ?? []) {
      expect(img, `иконка декоративная (alt=""): ${img.slice(0, 60)}`).toContain('alt=""');
    }
  });
});

describe('пилот career-portal: directions/holding на канонах dir/hld (T18.14; AC: cp-семейства 0)', () => {
  it('разметка build.mjs: cp-directions снят — секция/сетка/карточки на dir, id="directions" сохранён (якоря ссылок), данные/скрипт — прежние data-атрибуты', () => {
    expect(build, 'cp-directions из разметки снят').not.toMatch(/class="[^"]*\bcp-directions/);
    expect(build, 'секция — канон dir слоя').toContain(
      '<section class="ui-section dir" id="directions">',
    );
    expect(build, 'сетка — канон (данные-атрибут прежние)').toContain(
      '<ul class="dir__grid" data-cp-directions>',
    );
    expect(build, 'карточки — канон (билдер по данным DIRECTIONS)').toMatch(
      /<button class="dir__card" type="button" data-cp-direction="\$\{index\}">/,
    );
    expect(build, 'иконка — канон (alt="", lazy)').toMatch(
      /<img class="dir__icon" src="assets\/icons\/dir-\$\{index \+ 1\}\.svg" alt="" width="76" height="76" loading="lazy">/,
    );
    expect(build, 'имя со стрелкой — канон').toContain(
      '<span class="dir__name">${esc(name)} ${ARROW_UP_RIGHT}</span>',
    );
  });

  it('разметка build.mjs: cp-holding снят — секция/тело/заголовок/статы на hld; ui-stat--glass (T17.4) сохранён', () => {
    expect(build, 'cp-holding из разметки снят').not.toMatch(/class="[^"]*\bcp-holding/);
    expect(build, 'секция — фото-примитив + канон hld').toContain(
      '<section class="ui-section ui-section--photo hld">',
    );
    expect(build, 'тело — канон на контейнере').toContain(
      '<div class="ui-container hld__inner">',
    );
    expect(build, 'заголовок — канон + роль ui-h2').toContain('class="hld__title ui-h2"');
    expect(build, 'статы — канон-сетка').toContain('<ul class="hld__stats">');
    expect(build.match(/class="ui-stat ui-stat--glass"/g)?.length, '3 стата --glass').toBe(3);
  });

  it('модалка направления — dir-modal остаётся сайт-зоной (T18.16, Out of scope): контентные классы модалки index переименованы в семейство dir-modal', () => {
    expect(build, 'фото модалки — семейство dir-modal').toContain(
      '<img class="cp-dir-modal__photo" src="${esc(directionPhotos[0])}" alt="" data-ui-gallery-photo width="590" height="400">',
    );
    expect(build, 'навигация модалки — семейство dir-modal').toContain(
      '<div class="cp-dir-modal__nav">',
    );
    expect(build, 'классов cp-directions__photo/__nav нет').not.toMatch(
      /cp-directions__(photo|nav)/,
    );
  });

  it('applyVariant2: маркер компакт-варианта v2 — на модификаторе канона hld--compact (прецедент build.py оригинала)', () => {
    expect(build).toContain(
      "'class=\"ui-section ui-section--photo hld\"',\n      'class=\"ui-section ui-section--photo hld hld--compact\"',",
    );
    expect(build, 'старый маркер снят').not.toContain('cp-holding--compact');
  });

  it('pilot.css: пара cp-семейств снята целиком (базы/элементы/hover + группы ступеней 1023/767); модалка dir-modal остаётся', () => {
    expect(pilotCss, 'семейство .cp-directions перенесено в слой').not.toContain('.cp-directions');
    expect(pilotCss, 'семейство .cp-holding перенесено в слой').not.toContain('.cp-holding');
    expect(pilotCss, 'модалка — сайт-зона до T18.16').toContain('.cp-dir-modal__photo');
    expect(pilotCss, 'модалка — сайт-зона до T18.16').toContain('.cp-dir-modal__nav');
  });

  it('compare: блок-пары directions/holding — на крючках канона .dir/.hld (прецедент prd/whu)', () => {
    expect(compare, 'проба directions index — на крючке слоя').toContain(
      "['directions', '.directions', '.dir']",
    );
    expect(compare, 'проба holding index — на крючке слоя').toContain(
      "['holding', '.holding', '.hld']",
    );
    expect(compare.match(/'\.hld'/g)?.length, 'holding — index и index-2 (две пары)').toBe(2);
    expect(compare).not.toContain('.cp-holding');
  });
});

describe('ценз сайт-зоны: семейства directions/holding ушли из allowlist (T18.14 AC)', () => {
  it('allowlist ценза без directions/holding — судьба семейств «вынос в слой» (REPORT §11.4)', () => {
    expect(ALLOWED_CP_FAMILIES, 'directions — вынесена в слой (канон dir)').not.toContain(
      'directions',
    );
    expect(ALLOWED_CP_FAMILIES, 'holding — вынесен в слой (канон hld)').not.toContain('holding');
    expect(ALLOWED_CP_FAMILIES, 'модалка dir-modal — сайт-зона до T18.16').toContain('dir-modal');
    expect(ALLOWED_CP_FAMILIES, 'прочие семейства ценза не тронуты').toContain('hero');
    expect(ALLOWED_CP_FAMILIES, 'прочие семейства ценза не тронуты').toContain('vacancy-search');
  });
});

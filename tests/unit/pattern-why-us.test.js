/**
 * Юнит-пины T18.12 — макро-вынос тёмной секции «why-us» в паттерн-слой
 * (спека docs/ui-system/epics/EPIC-18-macro-parity/T18.12-why-us-layer.md).
 *
 * Исполняемая форма решения:
 *  - паттерн-слой (patterns/patterns.css → dist/ui-patterns.css): канон whu —
 *    композиция тёмной секции со стеклянными карточками (порт .cp-why-us
 *    pilot.css:540–666 и ступени оригинала why-us.css; блок 1350↔1350
 *    байт-паритет 01.11 — решение владельца в батче ритма); значения
 *    десктопа 1:1 принятому пилоту с источниками в комментариях (дисциплина
 *    паттернов); гейт префиксов слоя расширен (whu);
 *  - hover-раскрытие карточек — CSS-канон без JS (Implementation
 *    requirements п.2): текст/номер/фото переключаются opacity/max-height
 *    под гвардом (hover: hover) (EPIC-4) — контент остаётся в a11y-дереве
 *    (никаких display:none/visibility:hidden), переходы VI-mode гасит
 *    vi.css (body.vi * { transition: none }) — раскрытие мгновенно;
 *  - VI-инвариант: фото-фон — примитив ui-section--photo (T17.3), не голым
 *    IMG; фото карточки — класс __card-photo: vi.css img:off прячет
 *    [class*='-photo'] (пре-существующее поведение T9.1 — секция целиком,
 *    пин задокументированного поведения — прецедент hro/msh на стенде);
 *  - мобильные базы канона — ступени оригинала why-us.css:108-115,
 *    инвертированные mobile-first (прецедент msh T18.2): top колонкой и
 *    row колонкой до 1023 → база, строка/3 колонки от lg (1024, шкала
 *    T2.5); top-карточка 429px от lg, во всю ширину в базе (гейт T3.6:
 *    429px на 375 переполняет — колонка проходит);
 *  - слот панели вакансий — контент секции (канон секции правила не несёт):
 *    панель в пилоте — канон vcs слоя T18.16 (vcs__wrap id="vacancies",
 *    семейство vacancy-search ушло из сайт-зоны — errata пина T18.12);
 *    ритм до панели ведёт margin-bottom 144px строки (why-us.css:42);
 *  - док-паттерн landing-section — источник правды: секция lsp-why-us
 *    несёт те же классы (пин синхронности, прецедент msh/vcp T18.2);
 *  - пилот: cp-why-us снят из разметки build.mjs и pilot.css — семейство
 *    why-us уходит из allowlist ценза (ГЕЙТ: 0 вхождений; судьба «вынос
 *    в слой» — REPORT §11.4); маркер applyVariant2 — на новом классе;
 *  - compare: блок-пара why-us — на крючке канона (.whu).
 *
 * Поверхность браузера (эталоны whu, VI-проба, docHeight index Δ≤4px) —
 * e2e/compare-прогоны (ADR-0004).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { patternLayerProblems } from '../../showcase/patterns-layer-gate.mjs';
import { ALLOWED_CP_FAMILIES } from '../../pilot/career-portal/census.mjs';

const root = join(import.meta.dirname, '..', '..');

const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (первое вхождение; практика pattern-tabs-row.test.js). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

/** Тело media-ступени (min-width: Npx), содержащей селектор hook — поиск по
 *  ВСЕМ ступеням файла (практика pattern-mentorship-capsule.test.js). */
const mediaBlockOf = (css, px, hook) => {
  for (const match of css.matchAll(
    new RegExp(`@media \\(min-width: ${px}px\\)\\s*\\{([\\s\\S]*?)\\n\\}`, 'g'),
  )) {
    if (match[1].includes(`.${hook}`)) return match[1];
  }
  return null;
};

/** Тело media-ступени (hover: hover), содержащей селектор hook (hover-состояния
 *  канонов — под гвардом EPIC-4; практика pattern-mentorship-capsule.test.js). */
const hoverBlockOf = (css, hook) => {
  for (const match of css.matchAll(/@media \(hover: hover\)\s*\{([\s\S]*?)\n\}/g)) {
    if (match[1].includes(hook)) return match[1];
  }
  return null;
};

/** Классы-крючки whu- в разметке дока (class="…", комментарии вне). */
const docHooks = (docHtml) => {
  const html = docHtml.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ');
  const found = new Set();
  for (const attr of html.match(/class="[^"]*"/g) ?? []) {
    for (const name of attr.slice(7, -1).split(' ')) {
      if (/^whu(?:__|$)/.test(name)) found.add(name);
    }
  }
  return found;
};

/** Крючки whu- в правилах слоя. */
const layerHookSet = (layer) => {
  const hooks = new Set();
  for (const selector of layer.match(/[^{}]+(?=\{)/g) ?? []) {
    for (const hook of selector.match(/\.[a-z][a-z0-9_-]*/g) ?? []) {
      if (/^\.whu(?:__|$)/.test(hook)) hooks.add(hook.slice(1));
    }
  }
  return hooks;
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
const viCss = stripCssComments(readFileSync(join(root, 'a11y', 'vi.css'), 'utf8'));

describe('patterns/patterns.css — канон тёмной секции why-us (whu, T18.12 Scope)', () => {
  it('секция .whu: клип (overflow hidden — why-us.css:4); ритм оригинала — 96/48 в мобильной базе (why-us.css:111), 140/80 «как есть» от lg (why-us.css:3; why-us.css:3 — 140/80: 8.75rem 0 5rem)', () => {
    const whu = blockOf(layer, '.whu');
    expect(whu, '.whu найдено').toBeTruthy();
    expect(whu, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(
      whu,
      'клип секции — why-us.css:4 (position/isolation несёт ui-section--photo)',
    ).toContain('overflow: hidden;');
    expect(whu, 'мобильная база 96/48 (why-us.css:111; 48 = space-7)').toContain(
      'padding: 6rem 0 var(--ui-space-7);',
    );
    const lg = mediaBlockOf(layer, 1024, 'whu ');
    expect(lg, 'ступень lg канона есть').toBeTruthy();
    expect(
      lg,
      '140/80 (why-us.css:3) «как есть» — принятый рендер 1440 (батч ритма 01.11)',
    ).toContain('padding: 8.75rem 0 5rem;');
  });

  it('top-зона: flex, gap 36 (why-us.css:27), прижато кверху (why-us.css:24), space-between (why-us.css:25), низ 36 (why-us.css:28); мобильная база — колонкой (why-us.css:108), строка от lg', () => {
    const top = blockOf(layer, '.whu__top');
    expect(top, '.whu__top найдено').toBeTruthy();
    expect(top, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(top, 'flex-зона (why-us.css:23)').toContain('display: flex;');
    expect(top, 'мобильная база — колонкой (why-us.css:108, инверсия @max-1023)').toContain(
      'flex-direction: column;',
    );
    expect(top, 'gap 36px «как есть» — why-us.css:27').toContain('gap: 2.25rem;');
    expect(top, 'align-items: flex-start — why-us.css:24').toContain('align-items: flex-start;');
    expect(top, 'space-between — why-us.css:25').toContain('justify-content: space-between;');
    expect(top, 'низ 36px «как есть» — why-us.css:28').toContain('margin-bottom: 2.25rem;');
    const lg = mediaBlockOf(layer, 1024, 'whu__top');
    expect(lg, 'ступень lg: строка (оригинал ≥1024)').toContain('flex-direction: row;');
    expect(lg, 'шаг/выравнивание в ступени не переобъявляются (база)').not.toMatch(
      /gap|align-items|justify-content/,
    );
  });

  it('top-карточка: во всю ширину в мобильной базе (why-us.css:109), фикс 429px от lg (why-us.css:64 «как есть» — принятая карточка top-зоны)', () => {
    const base = blockOf(layer, '.whu__top .whu__card');
    expect(base, '.whu__top .whu__card найдено').toBeTruthy();
    expect(base, 'мобильная база — во всю ширину (why-us.css:109)').toContain('width: 100%;');
    const lg = mediaBlockOf(layer, 1024, 'whu__top .whu__card');
    expect(lg, 'ступень lg есть').toBeTruthy();
    expect(lg, 'flex: 0 0 429px (why-us.css:64) — принятый порт top-карточки').toContain(
      'flex: 0 0 26.8125rem;',
    );
  });

  it('заголовок: max-width 894px (why-us.css:32), lh 1.3 (why-us.css:34) и ls −0.02em (why-us.css:35) — override роли ui-h2 (1.1/normal), цвет on-dark (why-us.css:36); fs/fw несёт роль', () => {
    const title = blockOf(layer, '.whu__title');
    expect(title, '.whu__title найдено').toBeTruthy();
    expect(title, 'max-width 894px — why-us.css:32').toContain('max-width: 55.875rem;');
    expect(title, 'lh 1.3 — override lh-роли 1.1').toContain('line-height: 1.3;');
    expect(title, 'ls −0.02em — override роли normal').toContain('letter-spacing: -0.02em;');
    expect(title, 'цвет on-dark — why-us.css:36').toContain('color: var(--ui-color-text-on-dark);');
    expect(title, 'fs/fw несёт роль ui-h2 разметки').not.toContain('font-size');
    expect(title).not.toContain('font-weight');
  });

  it('row карточек: grid — колонка в мобильной базе (оригинал ≤1023, why-us.css:110), 3×1fr от lg; вертикальный шаг базы 36 (gap why-us.css:41), шаг колонок от lg — 12 (принятый рендер пилота, батч ритма 01.11); низ 144px «как есть» — панель вакансий ниже (why-us.css:42)', () => {
    const row = blockOf(layer, '.whu__row');
    expect(row, '.whu__row найдено').toBeTruthy();
    expect(row, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(row, 'grid (принятый порт пилота; оригинал flex) — батч ритма 01.11').toContain(
      'display: grid;',
    );
    expect(row, 'мобильная база — колонка (оригинал ≤1023 flex-direction: column)').toContain(
      'grid-template-columns: minmax(0, 1fr);',
    );
    expect(row, 'вертикальный шаг стека 36 — gap why-us.css:41').toContain('gap: 2.25rem;');
    expect(row, 'низ 144px «как есть» — why-us.css:42 (панель вакансий ниже)').toContain(
      'margin-bottom: 9rem;',
    );
    const lg = mediaBlockOf(layer, 1024, 'whu__row');
    expect(lg, 'ступень lg есть').toBeTruthy();
    expect(lg, '3×1fr — принятый рендер пилота (pilot.css:588)').toContain(
      'grid-template-columns: repeat(3, 1fr);',
    );
    expect(lg, 'шаг колонок 12 — var(--ui-space-3), принятый рендер (pilot.css:587)').toContain(
      'gap: var(--ui-space-3);',
    );
    expect(lg, 'низ в ступени не переобъявляется (база)').not.toMatch(/margin/);
  });

  it('стеклянная карточка: flex-колонка gap 36 (why-us.css:55), клип, min-height 320 (why-us.css:56), padding 20 (why-us.css:57), радиус card 16 = md, заливка blue-700 → surface-blue-deep (why-us.css:58), текст on-dark (why-us.css:59); fs/fw несут роли разметки (ui-h4/ui-small); мёртвая переменная --cp-why-photo снята при выносе (потребителей нет)', () => {
    const card = blockOf(layer, '.whu__card');
    expect(card, '.whu__card найдено').toBeTruthy();
    expect(card, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(card, 'flex-колонка (why-us.css:51-53)').toContain('display: flex;');
    expect(card).toContain('flex-direction: column;');
    expect(card, 'gap 36px — why-us.css:55').toContain('gap: 2.25rem;');
    expect(card, 'клип фото/num — why-us.css:62').toContain('overflow: hidden;');
    expect(card, 'min-height 320px — why-us.css:56').toContain('min-height: 20rem;');
    expect(card, 'padding 20px — why-us.css:57').toContain('padding: 1.25rem;');
    expect(card, 'радиус --radius-card 16px = md').toContain('border-radius: var(--ui-radius-md);');
    expect(card, 'blue-700 (why-us.css:58) — семантика surface-blue-deep').toContain(
      'background-color: var(--ui-color-surface-blue-deep);',
    );
    expect(card, 'цвет текста карточки — why-us.css:59 (наследуют title/text/num)').toContain(
      'color: var(--ui-color-text-on-dark);',
    );
    expect(card, 'fs/fw несут роли ui-h4/ui-small разметки').not.toContain('font-size');
    expect(card).not.toContain('font-weight');
    expect(card, 'мёртвая переменная снята').not.toContain('--cp-why-photo');
  });

  it('фото карточки: absolute-слой поверх заливки (why-us.css:68-75), cover, переход opacity; VI-инвариант: класс несёт -photo — vi.css img:off прячет фото-классы (пре-существующее поведение T9.1)', () => {
    const photo = blockOf(layer, '.whu__card-photo');
    expect(photo, '.whu__card-photo найдено').toBeTruthy();
    expect(photo, 'absolute — why-us.css:68').toContain('position: absolute;');
    expect(photo).toContain('inset: 0;');
    expect(photo, 'cover — why-us.css:73').toContain('object-fit: cover;');
    expect(photo).toContain('width: 100%;');
    expect(photo).toContain('height: 100%;');
    expect(photo, 'переход opacity — why-us.css:74').toContain(
      'transition: opacity var(--ui-transition);',
    );
    const vi = viCss.match(/body\.vi\.vi-img--off \[class\*='-photo'\][\s\S]*?\}/)?.[0] ?? '';
    expect(vi, 'правило vi.css img:off ловит -photo-классы').toContain('display: none');
    expect('whu__card-photo', 'крючок канона под правило vi.css').toMatch(/-photo/);
  });

  it('hover-раскрытие — CSS-канон без JS (Implementation requirements п.2): фото 0.15 (why-us.css:77), текст max-height 220 + opacity 1 (why-us.css:99-100), num opacity 1 (why-us.css:114) — все под (hover: hover) (EPIC-4)', () => {
    expect(layer.match(/\.whu__card:hover/g)?.length, 'три hover-ветки канона').toBe(3);
    const photoHover = hoverBlockOf(layer, '.whu__card:hover .whu__card-photo');
    expect(photoHover, 'hover фото — под гвардом').toBeTruthy();
    expect(photoHover, 'фото 0.15 — why-us.css:77').toContain('opacity: 0.15;');
    const textHover = hoverBlockOf(layer, '.whu__card:hover .whu__card-text');
    expect(textHover, 'hover текст — под гвардом').toBeTruthy();
    expect(textHover, 'max-height 220px — why-us.css:100').toContain('max-height: 13.75rem;');
    expect(textHover, 'opacity 1 — why-us.css:99').toContain('opacity: 1;');
    const numHover = hoverBlockOf(layer, '.whu__card:hover .whu__card-num');
    expect(numHover, 'hover num — под гвардом').toBeTruthy();
    expect(numHover, 'opacity 1 — why-us.css:114').toContain('opacity: 1;');
  });

  it('текст карточки: скрыт в покое (max-height 0 + opacity 0, why-us.css:92-94), раскрытие меняет ТОЛЬКО opacity/max-height — контент остаётся в a11y-дереве (display:none/visibility запрещены); переходы «как есть» (why-us.css:95-96)', () => {
    const text = blockOf(layer, '.whu__card-text');
    expect(text, '.whu__card-text найдено').toBeTruthy();
    expect(text, 'position: relative — над фото (why-us.css:91)').toContain('position: relative;');
    expect(text, 'клип при раскрытии — why-us.css:93').toContain('overflow: hidden;');
    expect(text, 'скрыт в покое — why-us.css:94').toContain('max-height: 0;');
    expect(text).toContain('opacity: 0;');
    expect(text, 'переходы — why-us.css:95-96').toContain('transition:');
    expect(text).toContain('opacity var(--ui-transition),');
    expect(text).toContain('max-height 0.3s ease;');
    expect(
      layer.slice(layer.indexOf('.whu__card-text')),
      'раскрытие без display/visibility',
    ).not.toMatch(/\.whu__card-text[\s\S]{0,400}?(display:\s*none|visibility:\s*hidden)/);
    expect(layer.slice(layer.indexOf('.whu__card-text')), 'раскрытие без JS-хуков').not.toMatch(
      /\.whu__card-text[\s\S]{0,400}?\[data-[a-z-]+=/,
    );
  });

  it('номер карточки: круг 44px (why-us.css:108-109), right/bottom 20/16 (why-us.css:106-107), padding 10 (why-us.css:112), пилюля, стекло glass-dark (white 10% — why-us.css:113), fs-body (why-us.css:111), скрыт в покое (why-us.css:114 — под hover)', () => {
    const num = blockOf(layer, '.whu__card-num');
    expect(num, '.whu__card-num найдено').toBeTruthy();
    expect(num, 'inline-flex — why-us.css:105').toContain('display: inline-flex;');
    expect(num, 'absolute — why-us.css:102').toContain('position: absolute;');
    expect(num, 'right 20px — why-us.css:106').toContain('right: 1.25rem;');
    expect(num, 'bottom 16px — why-us.css:107').toContain('bottom: 1rem;');
    expect(num).toContain('align-items: center;');
    expect(num).toContain('justify-content: center;');
    expect(num, '44px — why-us.css:108').toContain('width: 2.75rem;');
    expect(num).toContain('height: 2.75rem;');
    expect(num, 'padding 10px — why-us.css:112').toContain('padding: 0.625rem;');
    expect(num, 'радиус пилюли — why-us.css:115').toContain(
      'border-radius: var(--ui-radius-pill);',
    );
    expect(num, 'white 10% (why-us.css:113) — токен стекла').toContain(
      'background-color: var(--ui-color-glass-dark);',
    );
    expect(num, 'fs-body — why-us.css:111 (16px оригинала)… роль-класса нет').toContain(
      'font-size: var(--ui-fs-body);',
    );
    expect(num).toContain('opacity: 0;');
    expect(num, 'переход opacity — why-us.css:116').toContain(
      'transition: opacity var(--ui-transition);',
    );
  });

  it('инварианты слоя: без hex, без !important (гейт); канон не переобъявляет позицию/фона секции (несёт примитив ui-section--photo)', () => {
    const whu = blockOf(layer, '.whu');
    expect(whu, 'position несёт ui-section--photo (T17.3)').not.toContain('position');
    expect(layer, 'hex только в tokens/primitives.css').not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(layer, '!important только в a11y/vi.css').not.toContain('!important');
  });

  it('гейт префиксов слоя расширен (whu): канон проходит, ui-потомок проходит, чужой крючок ловится', () => {
    expect(patternLayerProblems('.whu { padding: 6rem 0; }'), 'whu — канонический префикс').toEqual(
      [],
    );
    expect(
      patternLayerProblems('.whu__card .ui-h4 { margin: 0; }'),
      'whu + ui-потомок каноничны',
    ).toEqual([]);
    expect(
      patternLayerProblems('.wh-evil { gap: 4px; }').length,
      'чужой namespace ловится',
    ).toBeGreaterThan(0);
  });

  it('синхронность док ↔ слой: секция lsp-why-us в landing-section несёт ровно те же классы (док — источник правды, прецедент msh/vcp T18.2)', () => {
    const hooks = layerHookSet(layer);
    expect([...hooks].sort(), 'слой несёт полный API канона').toEqual([
      'whu',
      'whu__card',
      'whu__card-num',
      'whu__card-photo',
      'whu__card-text',
      'whu__card-title',
      'whu__row',
      'whu__title',
      'whu__top',
    ]);
    const markup = docHooks(landingHtml);
    expect(markup.size, 'landing-section.html: whu-классы в разметке есть').toBeGreaterThan(0);
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
    expect(landingHtml, 'секция — по имени канона (фото-примитив)').toContain(
      'ui-section ui-section--photo whu',
    );
    const why = landingHtml.indexOf('id="lsp-why-us"');
    const capsule = landingHtml.indexOf('id="lsp-capsule"');
    expect(why, 'секция whu на месте').toBeGreaterThan(-1);
    expect(why, 'whu после капсулы vcp (следующая секция дока)').toBeGreaterThan(capsule);
  });

  it('VI-инвариант дока: фон секции — ui-section__bg примитива (aria-hidden, alt=""), фото карточки — декоративный слот alt=""', () => {
    const markup = landingHtml.replace(/<!--[\s\S]*?-->/g, '');
    const section = markup.match(/<section[^>]*id="lsp-why-us"[\s\S]*?<\/section>/)?.[0] ?? '';
    expect(section, 'секция whu найдена').not.toBe('');
    const bg = section.match(/<div class="ui-section__bg"[\s\S]*?<\/div>/)?.[0] ?? '';
    expect(bg, 'фон __bg на месте').not.toBe('');
    expect(bg, 'img фона — alt=""').toContain('alt=""');
    expect(section.indexOf('ui-section__bg'), '__bg до контента').toBeLessThan(
      section.indexOf('whu__top'),
    );
    for (const img of section.match(/<img[^>]*>/g) ?? []) {
      expect(img, `img декоративный (alt=""): ${img.slice(0, 60)}`).toContain('alt=""');
    }
  });
});

describe('пилот career-portal: why-us на каноне whu (T18.12; AC: cp-семейство 0)', () => {
  it('разметка build.mjs: cp-why-us снят — секция/зоны/карточки на whu, панель вакансий внутри секции сохранена (канон vcs слоя, T18.16 — errata пина T18.12)', () => {
    expect(build, 'cp-why-us из разметки снят').not.toMatch(/class="[^"]*\bcp-why-us/);
    expect(build, 'секция — фото-примитив + канон whu слоя').toContain(
      '<section class="ui-section ui-section--photo whu">',
    );
    expect(build, 'контейнер без пары __inner (no-op ритма ui-container)').not.toContain(
      'whu__inner',
    );
    expect(build, 'top-зона — канон').toContain('<div class="whu__top">');
    expect(build, 'заголовок — канон + роль ui-h2').toContain('class="whu__title ui-h2"');
    expect(build, 'row карточек — канон').toContain('<div class="whu__row">');
    expect(build, 'карточки — канон (билдер по данным WHY_US)').toMatch(
      /<article class="whu__card">/,
    );
    expect(build, 'фото карточки — канон (alt="", lazy)').toMatch(
      /<img class="whu__card-photo" src="\$\{esc\(card\.photo\)\}" alt="" loading="lazy">/,
    );
    expect(build, 'заголовок карточки — роль ui-h4').toContain('class="ui-h4 whu__card-title"');
    expect(build, 'текст карточки — роль ui-small').toContain('class="ui-small whu__card-text"');
    expect(build, 'номер карточки — aria-hidden').toContain(
      '<span class="whu__card-num" aria-hidden="true">0${index + 1}</span>',
    );
    expect(build, 'панель вакансий внутри секции сохранена (build.py SLOTS; T18.16 — канон vcs)').toContain(
      '<div class="vcs__wrap" id="vacancies">',
    );
  });

  it('applyVariant2: маркер снятия секции — на новом классе канона (v2 оригинала why-us не несёт)', () => {
    expect(build).toContain('html.indexOf(\'<section class="ui-section ui-section--photo whu">\')');
    expect(build, 'старый маркер снят').not.toContain(
      'html.indexOf(\'<section class="ui-section ui-section--photo cp-why-us">\')',
    );
  });

  it('pilot.css: пара cp-why-us снята целиком (секция/top/title/row/карточки/hover) + ступени 1023/767; панель — канон vcs слоя (errata T18.16)', () => {
    expect(pilotCss, 'пара .cp-why-us перенесена в слой').not.toContain('.cp-why-us');
    expect(pilotCss, 'панель вынесена в слой (T18.16)').not.toContain('.cp-vacancy-search');
  });

  it('compare: блок-пара why-us — на крючке канона .whu (прецедент lpp-/msh-)', () => {
    expect(compare, 'проба why-us index — на крючке слоя').toContain(
      "['why-us', '.why-us', '.whu']",
    );
    expect(compare).not.toContain('.cp-why-us');
  });
});

describe('ценз сайт-зоны: семейство why-us ушло из allowlist (T18.12 AC)', () => {
  it('allowlist ценза без why-us — судьба семейства «вынос в слой» (REPORT §11.4)', () => {
    expect(ALLOWED_CP_FAMILIES, 'why-us — вынесена в слой').not.toContain('why-us');
    // errata T18.16: панель vacancy-search вынесена в слой (канон vcs) —
    // семейство ушло из allowlist вместе с why-us (пин T18.12 инвертирован)
    expect(ALLOWED_CP_FAMILIES, 'панель vacancy-search — вынесена в слой (T18.16)').not.toContain(
      'vacancy-search',
    );
    expect(ALLOWED_CP_FAMILIES, 'прочие семейства ценза не тронуты').toContain('hero');
  });
});

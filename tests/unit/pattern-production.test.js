/**
 * Юнит-пины T18.13 — макро-вынос раскладок карусели «production» v1/v2
 * в паттерн-слой (спека docs/ui-system/epics/EPIC-18-macro-parity/
 * T18.13-production-layer.md).
 *
 * Исполняемая форма решения:
 *  - паттерн-слой (patterns/patterns.css → dist/ui-patterns.css): канон prd —
 *    раскладки карусели поверх компонента ui-carousel (T17.7 — поведение в
 *    dist, вид компонента; раскладка секции — слой): база секции (фото-примитив
 *    ui-section--photo + хук тинта --tint 90%, solid primary — errata 31.10)
 *    + --v1 (абсолютные координаты текста/кнопки, лента табов, планка-спинка,
 *    номер активного таба — пины errata 31.10 «приведи к оригиналу») +
 *    --v2 (фото-центр, чипы сверху 59px blur, степпер); значения 1:1 принятому
 *    пилоту с источниками production.css в комментариях (дисциплина паттернов);
 *  - v1-координаты скоупятся модификатором --v1 (оригинал production.css:202–249
 *    — «.production--v1»): в пилоте блок @min-1280 был без скоупа — правила
 *    перебрасывало и на v2 (index-2 ≥1280: тело absolute, чипы растянуты
 *    низом-лентой) — артефакт незавершённого паритета v2, в канон не переносится;
 *    рендер index (v1) при этом не меняется — модификатор в разметке;
 *  - v2-дельты оригиналу синхронизируются при выносе (пин — реализации ниже):
 *    заливка чипов 50% (production.css:288 — в пилоте наследовалась база 30%),
 *    чипы ≤1023 — static-лента оригинала (production.css:313; фиксированные
 *    700pxAbsolute в пилоте давали hscroll на 375 — 32px-база T3.6);
 *  - мобильная база: фото скрыто до lg (ступень пилота max-1023
 *    pilot.css:1928, инвертирована mobile-first — Implementation requirements
 *    T17.1 п.4);
 *  - VI-инвариант: фото слайда — класс __photo (конвенция vi.css
 *    [class*='__photo'], секция — ui-section--photo);
 *  - док-паттерн landing-section — источник правды: секции lsp-production
 *    (v1) и lsp-production-v2 (v2) несут те же классы (пин синхронности,
 *    прецедент whu T18.12);
 *  - пилот: cp-production снят из разметки build.mjs и pilot.css — семейство
 *    production уходит из allowlist ценза (ГЕЙТ: 0 вхождений; судьба «вынос
 *    в слой» — REPORT §11.4); маркер applyVariant2 — на паре модификаторов;
 *  - compare: блок-пара production — на крючке канона (.prd).
 *
 * Поверхность браузера (эталоны prd ×3, docHeight index/index-2 Δ≤4px,
 * compare-пробы) — e2e/compare-прогоны (ADR-0004).
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

/** Классы-крючки prd в разметке дока (class="…", комментарии вне). */
const docHooks = (docHtml) => {
  const html = docHtml.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ');
  const found = new Set();
  for (const attr of html.match(/class="[^"]*"/g) ?? []) {
    for (const name of attr.slice(7, -1).split(' ')) {
      if (/^prd(?:-|__|$)/.test(name)) found.add(name);
    }
  }
  return found;
};

/** Крючки prd в правилах слоя. */
const layerHookSet = (layer) => {
  const hooks = new Set();
  for (const selector of layer.match(/[^{}]+(?=\{)/g) ?? []) {
    for (const hook of selector.match(/\.[a-z][a-z0-9_-]*/g) ?? []) {
      if (/^\.prd(?:-|__|$)/.test(hook)) hooks.add(hook.slice(1));
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

describe('patterns/patterns.css — канон раскладок карусели production (prd, T18.13 Scope)', () => {
  it('база секции .prd: flex прижат к низу (production.css:4-5), клип (production.css:6), min-height 760 «как есть» (production.css:3), ритм ui-section погашен (padding 0 — батч 31.10); position несёт примитив ui-section--photo — слой не переобъявляет', () => {
    const prd = blockOf(layer, '.prd');
    expect(prd, '.prd найдено').toBeTruthy();
    expect(prd, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(prd, 'flex-секция (production.css:4)').toContain('display: flex;');
    expect(prd, 'тело прижато к низу (production.css:5)').toContain('align-items: flex-end;');
    expect(prd, 'клип — production.css:6').toContain('overflow: hidden;');
    expect(prd, 'min-height 760px «как есть» — production.css:3').toContain('min-height: 47.5rem;');
    expect(prd, 'ритм ui-section погашен (решение владельца 31.10)').toContain('padding: 0;');
    expect(prd, 'position несёт примитив ui-section--photo (T17.3)').not.toContain('position');
    expect(
      prd,
      'тон завода rgba(0,40,86,.9) — канон-хук --tint (base/layout.css:169, errata 31.10)',
    ).toContain(
      '--ui-section-overlay-tint: color-mix(in srgb, var(--ui-color-primary) 90%, transparent);',
    );
  });

  it('планка-спинка под лентой табов: ::after — absolute снизу, 17px, радиус сверху md, surface, вне tab-порядка (production.css:189-200); z-index 5 — над контентом', () => {
    const after = blockOf(layer, '.prd::after');
    expect(after, '.prd::after найдено').toBeTruthy();
    expect(after, "планка — content '' (production.css:190)").toContain("content: '';");
    expect(after, 'absolute — production.css:191').toContain('position: absolute;');
    expect(after, 'низ −1px — production.css:194').toContain('bottom: -1px;');
    expect(after, 'z 5 — production.css:192').toContain('z-index: 5;');
    expect(after, 'высота 17px — production.css:196').toContain('height: 1.0625rem;');
    expect(after, 'радиус 16px сверху = md — production.css:198').toContain(
      'border-radius: var(--ui-radius-md) var(--ui-radius-md) 0 0;',
    );
    expect(after, 'спинка surface — production.css:197').toContain(
      'background: var(--ui-color-surface);',
    );
    expect(after, 'pointer-events: none — production.css:199').toContain('pointer-events: none;');
    expect(after, 'во всю ширину — production.css:195').toContain('inset-inline: 0;');
  });

  it('фото слайда: absolute top 71 left 43.5% «как есть» (production.css:40-45), contain с привязкой к низу (production.css:50-51), z 2; мобильная база — скрыто (ступень пилота max-1023 pilot.css:1928, инвертирована mobile-first), от lg — виден', () => {
    const photo = blockOf(layer, '.prd__photo');
    expect(photo, '.prd__photo найдено').toBeTruthy();
    expect(photo, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(photo, 'мобильная база — скрыто (pilot.css:1928, инверсия @max-1023)').toContain(
      'display: none;',
    );
    expect(photo, 'absolute — production.css:42').toContain('position: absolute;');
    expect(photo, 'top 71px — production.css:45').toContain('top: 4.4375rem;');
    expect(photo, 'left 43.5% «как есть» — production.css:44').toContain('left: 43.5%;');
    expect(photo, 'z 2 — production.css:43').toContain('z-index: 2;');
    expect(photo, 'contain — production.css:50').toContain('object-fit: contain;');
    expect(photo, 'привязка к низу — production.css:51').toContain(
      'object-position: bottom center;',
    );
    const lg = mediaBlockOf(layer, 1024, 'prd__photo');
    expect(lg, 'ступень lg канона есть (показ фото ≥1024)').toBeTruthy();
    expect(lg, 'фото видимо от lg').toContain('display: block;');
    const vi = viCss.match(/body\.vi\.vi-img--off \[class\*='__photo'\][\s\S]*?\}/)?.[0] ?? '';
    expect(vi, 'правило vi.css img:off ловит __photo-классы').toContain('display: none');
    expect('prd__photo', 'крючок канона под конвенцию vi.css __photo').toMatch(/__photo/);
  });

  it('тело слайда: flex-колонка gap 24 (production.css:53/58-61), max-width 545 (production.css:62), padding 72/56 (production.css:63), z 3; fs/fw/lh заголовка и текста — override ролей (production.css:59-67/74-79 «как есть»)', () => {
    const body = blockOf(layer, '.prd__body');
    expect(body, '.prd__body найдено').toBeTruthy();
    expect(body, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(body, 'flex — production.css:58').toContain('display: flex;');
    expect(body, 'z 3 — production.css:57').toContain('z-index: 3;');
    expect(body).toContain('flex-direction: column;');
    expect(body, 'gap 24px — production.css:61').toContain('gap: var(--ui-space-4);');
    expect(body, 'align-items: flex-start — production.css:60').toContain(
      'align-items: flex-start;',
    );
    expect(body, 'max-width 545px — production.css:62').toContain('max-width: 34.0625rem;');
    expect(body, 'padding 72/56 — production.css:63').toContain('padding: 0 0 4.5rem 3.5rem;');
    const title = blockOf(layer, '.prd__title');
    expect(title, '.prd__title найдено').toBeTruthy();
    expect(title, 'пара цветов on-dark — production.css:70').toContain(
      'color: var(--ui-color-text-on-dark);',
    );
    expect(title, '48px «как есть» (против ui-h2 60) — production.css:67').toContain(
      'font-size: 3rem;',
    );
    expect(title, 'fw 500 — production.css:68').toContain('font-weight: var(--ui-fw-body-bold);');
    expect(title, 'lh 1.2 — production.css:69').toContain('line-height: 1.2;');
    const text = blockOf(layer, '.prd__text');
    expect(text, '.prd__text найдено').toBeTruthy();
    expect(text, '18px — production.css:75').toContain('font-size: 1.125rem;');
    expect(text, 'fw 500 — production.css:76').toContain('font-weight: var(--ui-fw-body-bold);');
    expect(text, 'lh 1.22 — production.css:77').toContain('line-height: 1.22;');
    const btn = blockOf(layer, '.prd__btn');
    expect(btn, '.prd__btn найдено').toBeTruthy();
    expect(btn, 'fs caption — production.css:90 (вид — ui-button--light ДС)').toContain(
      'font-size: var(--ui-fs-caption);',
    );
    expect(btn, 'uppercase — production.css:93').toContain('text-transform: uppercase;');
    expect(btn, 'letter-spacing 0.01em оригинала НЕ переносится (пин errata 31.10)').not.toContain(
      'letter-spacing',
    );
  });

  it('v1: абсолютные координаты текста/кнопки от xl 1280 «как есть» (production.css:202-228) — скоуп модификатором --v1 (пин errata 31.10: значения не тронуты)', () => {
    const lg = mediaBlockOf(layer, 1280, 'prd--v1');
    expect(lg, 'ступень 1280 канона есть').toBeTruthy();
    expect(lg, 'тело — блок на всю секцию (production.css:203-209)').toContain(
      '.prd--v1 .prd__body',
    );
    expect(lg, 'display: block — production.css:204').toContain('display: block;');
    expect(lg, 'absolute inset 0 — production.css:205-206').toContain('position: absolute;');
    expect(lg, 'max-width none — production.css:207').toContain('max-width: none;');
    for (const el of ['.prd__title', '.prd__text', '.prd__btn']) {
      expect(lg, `${el} absolute left 55 (production.css:211-216)`).toContain(`.prd--v1 ${el}`);
    }
    expect(lg, 'title top 78 width 545 — production.css:218-221').toContain('top: 4.875rem;');
    expect(lg, 'text top 430 — production.css:223-226').toContain('top: 26.875rem;');
    expect(lg, 'btn top 523 — production.css:228').toContain('top: 32.6875rem;');
    expect(lg, 'номер/тело таба −8px — production.css:245-248').toContain(
      'transform: translateY(-0.5rem);',
    );
    // Скоуп: вне --v1 абсолютных координат нет (v2-рендер оригиналу production.css:274-302)
    expect(
      mediaBlockOf(layer, 1280, 'prd__body')?.includes('.prd--v1'),
      'правила ступени — только внутри .prd--v1',
    ).toBe(true);
  });

  it('стрелки: 100×100 hit-area по краям секции, top 311 (production.css:79-96), opacity .9 — hover .6 под гвардом (hover: hover) (production.css:114)', () => {
    const arrow = blockOf(layer, '.prd__arrow');
    expect(arrow, '.prd__arrow найдено').toBeTruthy();
    expect(arrow, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(arrow, 'inline-flex — production.css:104').toContain('display: inline-flex;');
    expect(arrow, 'absolute — production.css:101').toContain('position: absolute;');
    expect(arrow, 'top 311px — production.css:103').toContain('top: 19.4375rem;');
    expect(arrow, 'z 4 — production.css:102').toContain('z-index: 4;');
    expect(arrow, '100×100 — production.css:107-108').toContain('width: 6.25rem;');
    expect(arrow).toContain('height: 6.25rem;');
    expect(arrow, 'opacity .9 — production.css:110').toContain('opacity: 0.9;');
    expect(arrow, 'переход opacity — production.css:111').toContain(
      'transition: opacity var(--ui-transition);',
    );
    const prev = blockOf(layer, '.prd__arrow--prev');
    expect(prev, 'prev у левого края — production.css:116').toContain('left: 0;');
    const next = blockOf(layer, '.prd__arrow--next');
    expect(next, 'next у правого края — production.css:117').toContain('right: 0;');
    const hover = hoverBlockOf(layer, '.prd__arrow:hover');
    expect(hover, 'hover под гвардом (EPIC-4)').toBeTruthy();
    expect(hover, 'opacity .6 — production.css:114').toContain('opacity: 0.6;');
  });

  it('лента табов v1: absolute полоса внизу во всю ширину, высота 82, табы вплотную (gap 0 — канон 8px погашен), li прозрачны (display: contents — кнопки — прямые дети ленты оригинала)', () => {
    const stepper = blockOf(layer, '.prd__stepper');
    expect(stepper, '.prd__stepper найдено').toBeTruthy();
    expect(stepper, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(stepper, 'absolute полоса — production.css:228-235/230').toContain(
      'position: absolute;',
    );
    expect(stepper, 'bottom 0 — production.css:232').toContain('bottom: 0;');
    expect(stepper, 'z 3 — production.css:122').toContain('z-index: 3;');
    expect(
      stepper,
      'табы вплотную — production.css:97-103 gap не задаёт (canon 8px погашен)',
    ).toContain('gap: 0;');
    expect(stepper, 'во всю ширину — production.css:234').toContain('width: 100%;');
    expect(stepper, 'высота 82px — production.css:235').toContain('height: 5.125rem;');
    expect(stepper, 'inset-inline 0 — production.css:233').toContain('inset-inline: 0;');
    const li = blockOf(layer, '.prd__stepper > li');
    expect(li, 'li прозрачны для ленты (build-разметка несёт li)').toContain('display: contents;');
  });

  it('таб: 20% ширины ленты (5 поровну — production.css:237), заливка blue-100@30, без рамки, активности — 82px/радиус сверху/50% (production.css:99-111) — сайт-облик поверх рамки канона ui-carousel (дельта канона — REPORT §9.1, PLAN P3 — НЕ решается здесь)', () => {
    const tab = blockOf(layer, '.prd__tab');
    expect(tab, '.prd__tab найдено').toBeTruthy();
    expect(tab, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(tab, 'flex 0 0 20% — production.css:240/285').toContain('flex: 0 0 20%;');
    expect(tab, 'gap 12px — production.css:134/103').toContain('gap: 0.75rem;');
    expect(tab, 'min-height 68px — production.css:135/104').toContain('min-height: 4.25rem;');
    expect(tab, 'padding 14/28 — production.css:136/106').toContain('padding: 0.875rem 1.75rem;');
    expect(tab, 'без рамки — вид канона ui-carousel погашен (облик сайта)').toContain(
      'border: none;',
    );
    expect(tab, 'radius 0 — production.css:139').toContain('border-radius: 0;');
    expect(tab, 'blue-100@30 — production.css:138 (преттиер переносит длинный color-mix)').toMatch(
      /background-color:\s*color-mix\(\s*in srgb,\s*var\(--ui-color-surface-hover\) 30%,\s*transparent\s*\);/,
    );
    expect(tab, 'переходы «как есть» — production.css:140').toContain(
      'background-color var(--ui-transition),',
    );
    expect(tab).toContain('min-height var(--ui-transition);');
    const active = blockOf(layer, ".prd__tab:where([aria-selected='true'])");
    expect(active, '.prd__tab:where([aria-selected]) найдено').toBeTruthy();
    expect(active, 'min-height 82px — production.css:144/109').toContain('min-height: 5.125rem;');
    expect(active, 'радиус 16px сверху = md — production.css:146').toContain(
      'border-radius: var(--ui-radius-md) var(--ui-radius-md) 0 0;',
    );
    expect(
      active,
      'blue-100@50 — production.css:145 (преттиер переносит длинный color-mix)',
    ).toMatch(
      /background-color:\s*color-mix\(\s*in srgb,\s*var\(--ui-color-surface-hover\) 50%,\s*transparent\s*\);/,
    );
  });

  it('номер активного таба: скрыт в покое, круг 30px с рамкой white@50, пилюля, fs caption (production.css:149-163); тело/подпись/счётчик — колонка gap 2, small/micro on-dark (production.css:165-187)', () => {
    const num = blockOf(layer, '.prd__tab-num');
    expect(num, '.prd__tab-num найдено').toBeTruthy();
    expect(num, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(num, 'скрыт в покое — production.css:150').toContain('display: none;');
    expect(num, '30×30 — production.css:153-154').toContain('width: 1.875rem;');
    expect(num).toContain('height: 1.875rem;');
    expect(num, 'рамка white@50 — production.css:155-156').toContain(
      'border: var(--ui-border-width) solid',
    );
    expect(num).toContain('color-mix(in srgb, var(--ui-color-text-on-dark) 50%, transparent)');
    expect(num, 'пилюля — production.css:157').toContain('border-radius: var(--ui-radius-pill);');
    expect(num, 'fs caption — production.css:158').toContain('font-size: var(--ui-fs-caption);');
    const activeNum = blockOf(layer, ".prd__tab:where([aria-selected='true']) .prd__tab-num");
    expect(activeNum, 'номер — только у активного (production.css:163)').toContain(
      'display: inline-flex;',
    );
    const tabBody = blockOf(layer, '.prd__tab-body');
    expect(tabBody, 'колонка gap 2 — production.css:166-168').toContain('flex-direction: column;');
    expect(tabBody).toContain('gap: 2px;');
    expect(tabBody).toContain('min-width: 0;');
    const tabTitle = blockOf(layer, '.prd__tab-title');
    expect(tabTitle, 'small on-dark, nowrap-кламп — production.css:172-180').toContain(
      'color: var(--ui-color-text-on-dark);',
    );
    expect(tabTitle).toContain('font-size: var(--ui-fs-small);');
    expect(tabTitle).toContain('text-overflow: ellipsis;');
    const tabCount = blockOf(layer, '.prd__tab-count');
    expect(tabCount, 'micro on-dark — production.css:182-187').toContain(
      'font-size: var(--ui-fs-micro);',
    );
  });

  it('v2: фото-центр (photo left 22 top 72 — production.css:278-280), тело вправо (margin-left auto, padding 56/72 — production.css:282-284), шаги 26/24 (production.css:287-291), min-height 740/stretch (production.css:275-276)', () => {
    const v2 = blockOf(layer, '.prd--v2');
    expect(v2, '.prd--v2 найдено').toBeTruthy();
    expect(v2, 'align-items: stretch — production.css:276').toContain('align-items: stretch;');
    expect(v2, 'min-height 740px «как есть» — production.css:275').toContain(
      'min-height: 46.25rem;',
    );
    const photo = blockOf(layer, '.prd--v2 .prd__photo');
    expect(photo, 'left 22px top 72px — production.css:279-280').toContain('left: 1.375rem;');
    expect(photo).toContain('top: 4.5rem;');
    expect(photo).toContain('right: auto;');
    const body = blockOf(layer, '.prd--v2 .prd__body');
    expect(body, 'вправо — production.css:282-284').toContain('margin-left: auto;');
    expect(body).toContain('padding: 0 3.5rem 4.5rem 0;');
    expect(body).toContain('justify-content: flex-end;');
    expect(blockOf(layer, '.prd--v2 .prd__title'), 'шаг 26px — production.css:288').toContain(
      'margin-bottom: 1.625rem;',
    );
    expect(blockOf(layer, '.prd--v2 .prd__text'), 'шаг 24px — production.css:291').toContain(
      'margin-bottom: 1.5rem;',
    );
  });

  it('чипы v2 (степпер): автоширина/blur — табы 59px radius 32 padding 12/16, заливка 50% (production.css:283-291), актив — primary-deep 90% + кольцо white@35 (production.css:293-297); номер всегда (production.css:299)', () => {
    const tab = blockOf(layer, '.prd--v2 .prd__tab');
    expect(tab, '.prd--v2 .prd__tab найдено').toBeTruthy();
    expect(tab, 'flex auto — production.css:284').toContain('flex: 0 0 auto;');
    expect(tab, 'min-height 59px — production.css:285/301').toContain('min-height: 3.6875rem;');
    expect(tab, 'padding 12/16 — production.css:286/302').toContain('padding: 0.75rem 1rem;');
    expect(tab, 'radius 32px — production.css:287/303').toContain('border-radius: 2rem;');
    expect(tab, 'blur 6px — production.css:289-290/305').toContain('backdrop-filter: blur(6px);');
    expect(
      tab,
      'заливка 50% — production.css:288 (в пилоте наследовалась база 30% — синхронизация оригиналу при выносе; преттиер переносит длинный color-mix)',
    ).toMatch(
      /background-color:\s*color-mix\(\s*in srgb,\s*var\(--ui-color-surface-hover\) 50%,\s*transparent\s*\);/,
    );
    const active = blockOf(layer, ".prd--v2 .prd__tab:where([aria-selected='true'])");
    expect(active, '.prd--v2 active найдено').toBeTruthy();
    expect(active, 'хук кольца — гейт теней требует var() (прецедент пилота)').toContain(
      '--prd-tab-ring: inset 0 0 0 1px color-mix(in srgb, var(--ui-color-text-on-dark) 35%, transparent);',
    );
    expect(active, 'primary-deep 90% — rgba(21,42,79,.9) production.css:295/309').toContain(
      'background-color: color-mix(in srgb, var(--ui-color-primary-deep) 90%, transparent);',
    );
    expect(active).toContain('box-shadow: var(--prd-tab-ring);');
    const num = blockOf(layer, '.prd--v2 .prd__tab-num');
    expect(num, 'номер всегда — production.css:299/312').toContain('display: inline-flex;');
  });

  it('степпер v2 — mobile-first: мобильная база — static-лента оригинала (production.css:313, фиксирует hscroll 700pxAbsolute пилота), от lg — absolute чипы справа сверху (production.css:272-281): top 42/right 56/width 700/gap 19, height auto + bottom auto (погашение ленты v1)', () => {
    const base = blockOf(layer, '.prd--v2 .prd__stepper');
    expect(base, '.prd--v2 .prd__stepper найдено').toBeTruthy();
    expect(base, 'мобильная база — static (production.css:313, инверсия @max-1023)').toContain(
      'position: static;',
    );
    expect(base, 'wrap — production.css:277/304').toContain('flex-wrap: wrap;');
    expect(base, 'gap 19px — production.css:279/297').toContain('gap: 1.1875rem;');
    expect(base, 'width auto (мобильная база production.css:313)').toContain('width: auto;');
    expect(base, 'фон снят — production.css:280').toContain('background: none;');
    expect(base, 'паддинг 24/40 — production.css:313').toContain('padding: 1.5rem 2.5rem 0;');
    const lg = mediaBlockOf(layer, 1024, 'prd__stepper');
    expect(lg, 'ступень lg: чипы absolute (оригинал production.css:272-281)').toBeTruthy();
    expect(lg, 'top 42px — production.css:275/293').toContain('top: 2.625rem;');
    expect(lg, 'bottom auto — погашение bottom 0 ленты-базы (лента v1)').toContain('bottom: auto;');
    expect(lg, 'width 700px — production.css:278/296').toContain('width: 43.75rem;');
    expect(lg, 'height auto — production.css (чипы по контенту)').toContain('height: auto;');
    expect(lg, 'padding 0 — погашение мобильного').toContain('padding: 0;');
    expect(lg, 'right 56px — production.css:276/294').toContain('inset-inline: auto 3.5rem;');
  });

  it('инварианты слоя: без hex, без !important (гейт); канон не дублирует вид компонента (font-family/text-align/cursor — ui-carousel__tab)', () => {
    const tab = blockOf(layer, '.prd__tab');
    expect(tab, 'font-family несёт компонент ui-carousel (T17.7)').not.toContain('font-family');
    expect(tab, 'cursor несёт компонент').not.toContain('cursor');
    expect(layer, 'hex только в tokens/primitives.css').not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(layer, '!important только в a11y/vi.css').not.toContain('!important');
  });

  it('гейт префиксов слоя расширен (prd): канон проходит, ui-потомок проходит, чужой крючок ловится', () => {
    expect(patternLayerProblems('.prd { padding: 0; }'), 'prd — канонический префикс').toEqual([]);
    expect(
      patternLayerProblems('.prd__tab .ui-carousel__tab { border: none; }'),
      'prd + ui-потомок каноничны',
    ).toEqual([]);
    expect(
      patternLayerProblems('.pr-evil { gap: 4px; }').length,
      'чужой namespace ловится',
    ).toBeGreaterThan(0);
  });

  it('синхронность док ↔ слой: секции lsp-production (v1) и lsp-production-v2 (v2) в landing-section несут ровно те же классы (док — источник правды, прецедент whu T18.12)', () => {
    const hooks = layerHookSet(layer);
    expect([...hooks].sort(), 'слой несёт полный API канона').toEqual([
      'prd',
      'prd--v1',
      'prd--v2',
      'prd__arrow',
      'prd__arrow--next',
      'prd__arrow--prev',
      'prd__body',
      'prd__btn',
      'prd__photo',
      'prd__stepper',
      'prd__tab',
      'prd__tab-body',
      'prd__tab-count',
      'prd__tab-num',
      'prd__tab-title',
      'prd__text',
      'prd__title',
    ]);
    const markup = docHooks(landingHtml);
    expect(markup.size, 'landing-section.html: prd-классы в разметке есть').toBeGreaterThan(0);
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
    expect(landingHtml, 'секция v1 — фото-примитив + канон + компонент').toContain(
      'ui-section ui-section--photo prd prd--v1 ui-carousel',
    );
    expect(landingHtml, 'секция v2 — модификатор --v2 (маркер applyVariant2 пилота)').toContain(
      'prd prd--v2',
    );
    const prd1 = landingHtml.indexOf('id="lsp-production"');
    const prd2 = landingHtml.indexOf('id="lsp-production-v2"');
    expect(prd1, 'секция production v1 на месте').toBeGreaterThan(-1);
    expect(prd2, 'секция production v2 на месте').toBeGreaterThan(-1);
    expect(prd1, 'v1 после why-us (предыдущая секция дока)').toBeGreaterThan(
      landingHtml.indexOf('id="lsp-why-us"'),
    );
    expect(prd2, 'v2 после v1').toBeGreaterThan(prd1);
  });

  it('VI-инвариант дока: фон секции — ui-section__bg примитива (aria-hidden, alt=""), тинт — оверлей --tint, фото слайда — смысловой alt; JSON слайдов — данные разметки (компонент не ходит в сеть)', () => {
    const markup = landingHtml.replace(/<!--[\s\S]*?-->/g, '');
    for (const [id, cls] of [
      ['lsp-production', 'prd prd--v1'],
      ['lsp-production-v2', 'prd prd--v2'],
    ]) {
      const section =
        markup.match(new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?<\\/section>`))?.[0] ?? '';
      expect(section, `секция ${id} найдена`).not.toBe('');
      expect(section, `${id}: классы канона`).toContain(cls);
      const bg = section.match(/<div class="ui-section__bg"[\s\S]*?<\/div>/)?.[0] ?? '';
      expect(bg, `${id}: __bg на месте`).not.toBe('');
      expect(bg, `${id}: img фона — alt=""`).toContain('alt=""');
      expect(section, `${id}: оверлей --tint (solid 90% — errata 31.10)`).toContain(
        'ui-section__overlay ui-section__overlay--tint',
      );
      expect(section, `${id}: JSON слайдов — data разметки`).toContain('data-ui-carousel-slides');
      expect(section, `${id}: контролы без JS скрыты (разметка правдива)`).toMatch(
        /data-ui-carousel-prev hidden/,
      );
    }
    for (const img of markup.match(/<img class="prd__photo[^>]*>/g) ?? []) {
      expect(img, `img слайда — смысловой alt: ${img.slice(0, 60)}`).not.toContain('alt=""');
    }
  });
});

describe('пилот career-portal: production на каноне prd (T18.13; AC: cp-семейство 0)', () => {
  it('разметка build.mjs: cp-production снят — секция v1 на prd--v1, табы/стрелки/фото/тело на prd__*, поведение остаётся ui-carousel (T17.7)', () => {
    expect(build, 'cp-production из разметки снят').not.toMatch(/class="[^"]*\bcp-production/);
    expect(build, 'секция v1 — фото-примитив + канон prd + компонент ui-carousel').toContain(
      '<section class="ui-section ui-section--photo prd prd--v1 ui-carousel" data-ui-carousel>',
    );
    expect(build, 'фото — канон (конвенция vi.css __photo)').toMatch(
      /<img class="prd__photo ui-carousel__photo"/,
    );
    expect(build, 'тело — канон + слот компонента').toContain(
      '<div class="prd__body ui-carousel__body">',
    );
    expect(build, 'заголовок — канон + роль ui-h2').toContain('class="prd__title ui-h2"');
    expect(build, 'кнопка — роль ui-button--light + канон').toContain(
      'class="ui-button ui-button--light prd__btn"',
    );
    expect(build, 'стрелки — модификаторы канона + компонент').toMatch(
      /class="prd__arrow prd__arrow--prev ui-carousel__arrow"/,
    );
    expect(build, 'степпер — канон + компонент').toContain(
      '<ul class="prd__stepper ui-carousel__stepper"',
    );
    expect(build, 'табы — канон + компонент').toMatch(/class="prd__tab ui-carousel__tab"/);
    expect(build, 'элементы таба — канон').toContain('class="prd__tab-num"');
    expect(build).toContain('class="prd__tab-body"');
  });

  it('applyVariant2: маркер v2 — замена модификатора --v1 → --v2 (прецедент build.py:589 оригинала)', () => {
    expect(build).toContain(`'ui-section--photo prd prd--v1 ui-carousel"'`);
    expect(build).toContain(`'ui-section--photo prd prd--v2 ui-carousel"'`);
    expect(build, 'старый маркер снят').not.toContain('cp-production--v2');
  });

  it('pilot.css: семейство production снято целиком (база/--v1/--v2/табы/стрелки + ступень 1023 photo-hide)', () => {
    expect(pilotCss, 'семейство .cp-production перенесено в слой').not.toContain('cp-production');
  });

  it('compare: блок-пара production (index и index-2) — на крючке канона .prd (прецедент whu)', () => {
    expect(
      compare.match(/\['production', '\.production', '[^']+'\]/g)?.join('\n'),
      'обе пробы — на крючке слоя',
    ).toBe("['production', '.production', '.prd']\n['production', '.production', '.prd']");
    expect(compare).not.toContain('.cp-production');
  });
});

describe('ценз сайт-зоны: семейство production ушло из allowlist (T18.13 AC)', () => {
  it('allowlist ценза без production — судьба семейства «вынос в слой» (REPORT §11.4)', () => {
    expect(ALLOWED_CP_FAMILIES, 'production — вынесена в слой').not.toContain('production');
    expect(ALLOWED_CP_FAMILIES, 'прочие семейства ценза не тронуты').toContain('hero');
    // T18.14: directions/holding тоже ушли из allowlist (каноны dir/hld
    // слоя) — прежние пины «не тронуты» сняты, судьба семейств — REPORT §11.4.
  });
});

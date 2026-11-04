/**
 * Юнит-пины T18.2 — макро-блоки v2 главной: наставничество (msh) и
 * капсула вакансий (vcp) в паттерн-слое (спека
 * docs/ui-system/epics/EPIC-18-macro-parity/T18.2-index2-mentorship-capsule.md).
 *
 * Исполняемая форма решения:
 *  - паттерн-слой (patterns/patterns.css → dist/ui-patterns.css): каноны
 *    msh (фото-секция ui-section--photo + внутренняя сетка 552px + нижняя
 *    rail-полоса 108px) и vcp (капсула-плашка «Найди …» 176.5px: inner 80px,
 *    label-пилюля + btn-CTA); значения 1:1 из оригинала с источниками
 *    *.css:строки в комментариях (дисциплина паттернов); гейт префиксов
 *    слоя расширен (msh|vcp);
 *  - VI-инвариант: фото-фон msh — через примитив ui-section--photo (T17.3),
 *    не голым IMG (Implementation requirements п.2): __bg слоя фона +
 *    mask-фото вторым декоративным слоем канона;
 *  - док-паттерн landing-section — источник правды: разметка
 *    patterns/landing-section/landing-section.html несёт те же классы
 *    (пин синхронности, прецедент T17.15 — landing-compositions.test.js);
 *  - вид активной карточки rail — хук --msh-card-active-bg: градиент
 *    E88A2C→D9A441 (mentorship.css:90) вне токенов — цветовая строка
 *    сайт-зоны на хуке канона (прецедент --hro-tag-bg T17.15), дефолт
 *    хука — токен.
 *
 * Поверхность браузера (эталоны msh/vcp, presence index-2, docHeight) —
 * compare/пробы пилота (tests/unit/pilot-mentorship-capsule.test.js —
 * пины сборки; .zcode/accept-t182-* — DOM-проба).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { patternLayerProblems } from '../../showcase/patterns-layer-gate.mjs';

const root = join(import.meta.dirname, '..', '..');

const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (первое вхождение; практика landing-compositions.test.js). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

/** Тело media-ступени (min-width: Npx), содержащей селектор hook — поиск по
 *  ВСЕМ ступеням файла (первая @media файла — ветка lpp-layout). */
const mediaBlockOf = (css, px, hook) => {
  for (const match of css.matchAll(
    new RegExp(`@media \\(min-width: ${px}px\\)\\s*\\{([\\s\\S]*?)\\n\\}`, 'g'),
  )) {
    if (match[1].includes(`.${hook}`)) return match[1];
  }
  return null;
};

/** Классы-крючки msh-/vcp- в разметке дока (class="…", комментарии вне). */
const docHooks = (docHtml) => {
  const html = docHtml.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ');
  const found = new Set();
  for (const attr of html.match(/class="[^"]*"/g) ?? []) {
    for (const name of attr.slice(7, -1).split(' ')) {
      if (/^(msh|vcp)(?:-|__|$)/.test(name)) found.add(name);
    }
  }
  return found;
};

/** Крючки msh-/vcp- в правилах слоя. */
const layerHookSet = (layer) => {
  const hooks = new Set();
  for (const selector of layer.match(/[^{}]+(?=\{)/g) ?? []) {
    for (const hook of selector.match(/\.[a-z][a-z0-9_-]*/g) ?? []) {
      if (/^\.(msh|vcp)(?:-|__|$)/.test(hook)) hooks.add(hook.slice(1));
    }
  }
  return hooks;
};

const layerFile = readFileSync(join(root, 'patterns', 'patterns.css'), 'utf8');
const layer = stripCssComments(layerFile);
const docHtml = readFileSync(
  join(root, 'patterns', 'landing-section', 'landing-section.html'),
  'utf8',
).replace(/\r\n/g, '\n');

describe('patterns/patterns.css — канон наставничества (msh, T18.2 Scope)', () => {
  it('блок: клип (overflow hidden) + ритм секции перекрыт собственными паддингами (72/48 от md; 40/32 — мобильная база @max-767)', () => {
    const msh = blockOf(layer, '.msh');
    expect(msh, '.msh найдено').toBeTruthy();
    expect(msh, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(msh, 'клип фото/рail — overflow hidden (mentorship.css:4)').toContain(
      'overflow: hidden;',
    );
    expect(msh, 'мобильная база 40/32 (mentorship.css:115) — 32 = space-6').toContain(
      'padding: 2.5rem 0 var(--ui-space-6);',
    );
    const md = mediaBlockOf(layer, 768, 'msh');
    expect(md, 'ступень md есть').toBeTruthy();
    expect(md, 'паддинги 72/48 (mentorship.css:3) от md — 48 = space-7').toContain(
      'padding: 4.5rem 0 var(--ui-space-7);',
    );
  });

  it('VI-инвариант: фото-фон — примитив ui-section--photo (T17.3), слой __bg несёт заливку primary и blend-фото (не голый IMG)', () => {
    const bg = blockOf(layer, '.msh .ui-section__bg');
    expect(bg, 'заливка __bg — primary (mentorship.css:11)').toContain(
      'background-color: var(--ui-color-primary);',
    );
    const img = blockOf(layer, '.msh .ui-section__bg img');
    expect(img, 'IMAGE fill LUMINOSITY @ 40% (mentorship.css:19-20)').toContain(
      'mix-blend-mode: luminosity;',
    );
    expect(img).toContain('opacity: 0.4;');
  });

  it('второй слой — mask-фото справа: absolute, 80% мобильная база / 62% от lg, низ 140/156, маска (прецедент #000 → color-text hro__marquee)', () => {
    const photo = blockOf(layer, '.msh__photo');
    expect(photo).toContain('position: absolute;');
    expect(photo, 'правый край (mentorship.css:25)').toContain('right: 0;');
    expect(photo).toContain('top: 0;');
    expect(photo, 'низ 140px @max-1023 (mentorship.css:111) — мобильная база').toContain(
      'bottom: 8.75rem;',
    );
    expect(photo, 'ширина 80% @max-1023 (mentorship.css:111)').toContain('width: 80%;');
    expect(photo).toContain('z-index: -1;');
    expect(photo, 'маска 22% (mentorship.css:30-31)').toContain(
      'mask-image: linear-gradient(90deg, transparent 0%, var(--ui-color-text) 22%);',
    );
    const lg = mediaBlockOf(layer, 1024, 'msh__photo');
    expect(lg, 'ступень lg есть').toBeTruthy();
    expect(lg, 'низ 156px (mentorship.css:27) от lg').toContain('bottom: 9.75rem;');
    expect(lg, 'ширина 62% (mentorship.css:28) от lg').toContain('width: 62%;');
    const img = blockOf(layer, '.msh__photo img');
    expect(img, 'fill по слою (mentorship.css:34-38)').toContain('object-fit: cover;');
    expect(img).toContain('width: 100%;');
    expect(img).toContain('height: 100%;');
  });

  it('внутренняя сетка: min-height 300 → 380 (md) → 552 (lg) — лестница @max-767/1023 инвертирована mobile-first', () => {
    const inner = blockOf(layer, '.msh__inner');
    expect(inner, 'мобильная база 300px (mentorship.css:118)').toContain('min-height: 18.75rem;');
    const md = mediaBlockOf(layer, 768, 'msh__inner');
    expect(md, '380px @max-1023 (mentorship.css:110)').toContain('min-height: 23.75rem;');
    const lg = mediaBlockOf(layer, 1024, 'msh__inner');
    expect(lg, '552px (mentorship.css:41)').toContain('min-height: 34.5rem;');
  });

  it('заголовок/текст: max-width 894/514, on-dark, lh 1.3/1.25 (override ролей — mentorship.css:49/57), 34px/24px — мобильная база заголовка', () => {
    const title = blockOf(layer, '.msh__title');
    expect(title, 'max-width 894px (mentorship.css:45)').toContain('max-width: 55.875rem;');
    expect(title, 'mb 24px @max-767 (mentorship.css:116)').toContain(
      'margin-bottom: var(--ui-space-5);',
    );
    expect(title, '34px @max-767 (mentorship.css:116) «как есть»').toContain(
      'font-size: 2.125rem;',
    );
    expect(title, 'lh 1.3 (mentorship.css:49) — override lh-роли 1.1').toContain(
      'line-height: 1.3;',
    );
    expect(title, 'цвет on-dark (mentorship.css:51)').toContain(
      'color: var(--ui-color-text-on-dark);',
    );
    const md = mediaBlockOf(layer, 768, 'msh__title');
    expect(md, 'mb 48px (mentorship.css:46) от md').toContain('margin-bottom: var(--ui-space-7);');
    expect(md, 'fs — роль ui-h2 (лестница fs-h2) от md').toContain(
      'font-size: var(--ui-fs-h2);',
    );
    const text = blockOf(layer, '.msh__text');
    expect(text, 'max-width 514px (mentorship.css:55)').toContain('max-width: 32.125rem;');
    expect(text, 'lh 1.25 (mentorship.css:57) — override lh-роли 1.35').toContain(
      'line-height: 1.25;',
    );
    expect(text, 'ls −0.02em (mentorship.css:58) — override роли normal').toContain(
      'letter-spacing: -0.02em;',
    );
    expect(text).toContain('color: var(--ui-color-text-on-dark);');
  });

  it('rail-полоса: flex gap 24, скролл скрыт, отступ слева — max(container-pad, (100vw − container-max)/2) со ступенями pad', () => {
    const rail = blockOf(layer, '.msh__rail');
    expect(rail, 'flex (mentorship.css:64)').toContain('display: flex;');
    expect(rail, 'gap 24px (mentorship.css:65)').toContain('gap: var(--ui-space-5);');
    expect(rail, 'скролл-лента (mentorship.css:66)').toContain('overflow-x: auto;');
    expect(rail, 'скроллбар скрыт (mentorship.css:69)').toContain('scrollbar-width: none;');
    expect(rail, 'отступ слева «под контейнер» (mentorship.css:67)').toContain(
      'padding-left: max(var(--ui-container-pad), (100vw - var(--ui-container-max)) / 2);',
    );
    expect(rail, 'справа 16px (mentorship.css:68)').toContain('padding-right: var(--ui-space-4);');
    const webkit = blockOf(layer, '.msh__rail::-webkit-scrollbar');
    expect(webkit, 'webkit-скроллбар скрыт (mentorship.css:72)').toContain('display: none;');
    const md = mediaBlockOf(layer, 768, 'msh__rail');
    expect(md, 'ступень pad-md (аналог ui-container)').toContain(
      'padding-left: max(var(--ui-container-pad-md), (100vw - var(--ui-container-max)) / 2);',
    );
    const lg = mediaBlockOf(layer, 1024, 'msh__rail');
    expect(lg, 'ступень pad-lg').toContain(
      'padding-left: max(var(--ui-container-pad-lg), (100vw - var(--ui-container-max)) / 2);',
    );
  });

  it('карточка rail: 300px мобильная база / 429px от lg, высота 108, паддинг 20 «как есть», заливка blue-700 (--ui-color-surface-blue-deep)', () => {
    const card = blockOf(layer, '.msh__card');
    expect(card, 'flex-базис 300px @max-767 (mentorship.css:119)').toContain(
      'flex: 0 0 18.75rem;',
    );
    expect(card, 'центрирование строки (mentorship.css:77-78)').toContain('align-items: center;');
    expect(card).toContain('justify-content: space-between;');
    expect(card, 'gap 16px (mentorship.css:79)').toContain('gap: var(--ui-space-4);');
    expect(card, 'min-height 108px (mentorship.css:80)').toContain('min-height: 6.75rem;');
    expect(card, 'padding 20px (mentorship.css:81) «как есть», вне шкалы §3.2').toContain(
      'padding: 1.25rem;',
    );
    expect(card, 'blue-700 (mentorship.css:82) — семантика surface-blue-deep').toContain(
      'background-color: var(--ui-color-surface-blue-deep);',
    );
    expect(card, 'радиус --radius-card 16px = md').toContain(
      'border-radius: var(--ui-radius-md);',
    );
    expect(card, 'курсор — псевдо-навигация rail (mentorship.css:84)').toContain(
      'cursor: pointer;',
    );
    const lg = mediaBlockOf(layer, 1024, 'msh__card');
    expect(lg, 'flex-базис 429px (mentorship.css:75) от lg').toContain('flex: 0 0 26.8125rem;');
  });

  it('активная/hover-карточка: градиент — хук --msh-card-active-bg (дефолт токен, одобренная строка E88A2C→D9A441 — сайт-зона, прецедент --hro-tag-bg); hover под (hover: hover)', () => {
    const active = blockOf(layer, '.msh__card--active');
    expect(active, 'is-active оригинала (mentorship.css:88) → --active (BEM-модификатор канона)').toContain(
      'background: var(--msh-card-active-bg, var(--ui-color-accent));',
    );
    const hoverZone = layer.slice(layer.indexOf('.msh__card:hover'));
    expect(
      layer.slice(0, layer.indexOf('.msh__card:hover')),
      'hover вне media — нет (EPIC-4)',
    ).not.toContain('.msh__card:hover');
    expect(hoverZone).toMatch(/@media \(hover: hover\)/);
    expect(blockOf(layer, '.msh__card:hover')).toContain(
      'background: var(--msh-card-active-bg, var(--ui-color-accent));',
    );
  });

  it('текст карточки — fs-body/fw-body-bold/lh 1.35 (mentorship.css:94-98); thumb 88×68 radius-sm (mentorship.css:103-106)', () => {
    const title = blockOf(layer, '.msh__card-title');
    expect(title).toContain('font-size: var(--ui-fs-body);');
    expect(title).toContain('font-weight: var(--ui-fw-body-bold);');
    expect(title).toContain('line-height: 1.35;');
    expect(title).toContain('color: var(--ui-color-text-on-dark);');
    const thumb = blockOf(layer, '.msh__card-thumb');
    expect(thumb, '88px (mentorship.css:103)').toContain('width: 5.5rem;');
    expect(thumb, '68px (mentorship.css:104)').toContain('height: 4.25rem;');
    expect(thumb).toContain('object-fit: cover;');
    expect(thumb, '--radius-small 8px = sm').toContain('border-radius: var(--ui-radius-sm);');
  });

  it('инварианты слоя: без hex, без !important (гейт); hex градиента карточек в слое не едет', () => {
    expect(layer, 'hex только в tokens/primitives.css').not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(layer, '!important только в a11y/vi.css').not.toContain('!important');
  });
});

describe('patterns/patterns.css — канон капсулы вакансий (vcp, T18.2 Scope)', () => {
  it('секция: паддинг 32 мобильная база / 48 от md, min-height 176.5px «как есть» (vacancy-capsule.css:2-3)', () => {
    const vcp = blockOf(layer, '.vcp');
    expect(vcp, '.vcp найдено').toBeTruthy();
    expect(vcp, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(vcp, 'padding 32px 0 @max-767 (vacancy-capsule.css:46) — space-6').toContain(
      'padding: var(--ui-space-6) 0;',
    );
    const md = mediaBlockOf(layer, 768, 'vcp');
    expect(md, 'padding 48px 0 (vacancy-capsule.css:3) — space-7').toContain(
      'padding: var(--ui-space-7) 0;',
    );
    expect(md, 'height 176.5px (vacancy-capsule.css:2) → min-height, border-box').toContain(
      'min-height: 11.03125rem;',
    );
  });

  it('inner: flex — колонка stretch на мобильной базе, строка по центру от md; gap 0 (vacancy-capsule.css:7-11)', () => {
    const inner = blockOf(layer, '.vcp__inner');
    expect(inner).toContain('display: flex;');
    expect(inner, 'мобильная база — колонка (vacancy-capsule.css:47)').toContain(
      'flex-direction: column;',
    );
    expect(inner).toContain('align-items: stretch;');
    expect(inner, 'gap 0 (vacancy-capsule.css:10)').toContain('gap: 0;');
    const md = mediaBlockOf(layer, 768, 'vcp__inner');
    expect(md, 'строка (vacancy-capsule.css:8) от md').toContain('flex-direction: row;');
    expect(md, 'центр (vacancy-capsule.css:9)').toContain('justify-content: center;');
  });

  it('label: пилюля-заголовок 64 → 80px, blue-50/surface-muted, fs 20 → 36px «как есть», radius pill-слева; hover — под (hover: hover)', () => {
    const label = blockOf(layer, '.vcp__label');
    expect(label).toContain('display: inline-flex;');
    expect(label).toContain('align-items: center;');
    expect(label, '64px @max-767 (vacancy-capsule.css:49)').toContain('height: 4rem;');
    expect(label, 'pad 0 24px @max-767 (vacancy-capsule.css:50) — space-5').toContain(
      'padding: 0 var(--ui-space-5);',
    );
    expect(label, 'blue-50 (vacancy-capsule.css:18) — surface-muted').toContain(
      'background-color: var(--ui-color-surface-muted);',
    );
    expect(label, 'radius pill pill 0 0 @max-767 (vacancy-capsule.css:52)').toContain(
      'border-radius: var(--ui-radius-pill) var(--ui-radius-pill) 0 0;',
    );
    expect(label, '20px @max-767 (vacancy-capsule.css:51)').toContain('font-size: 1.25rem;');
    expect(label, 'fw-h1 (vacancy-capsule.css:21)').toContain('font-weight: var(--ui-fw-h1);');
    expect(label, 'lh 1.1 (vacancy-capsule.css:22)').toContain('line-height: 1.1;');
    expect(label, 'primary (vacancy-capsule.css:23)').toContain(
      'color: var(--ui-color-primary);',
    );
    expect(label, 'transition (vacancy-capsule.css:24)').toContain(
      'transition: background-color var(--ui-transition);',
    );
    const md = mediaBlockOf(layer, 768, 'vcp__label');
    expect(md, '80px (vacancy-capsule.css:16)').toContain('height: 5rem;');
    expect(md, 'pad 0 56px (vacancy-capsule.css:17) «как есть», вне шкалы §3.2').toContain(
      'padding: 0 3.5rem;',
    );
    expect(md, '36px (vacancy-capsule.css:20) «как есть»').toContain('font-size: 2.25rem;');
    expect(md, 'radius pill 0 0 pill (vacancy-capsule.css:19)').toContain(
      'border-radius: var(--ui-radius-pill) 0 0 var(--ui-radius-pill);',
    );
    const hoverZone = layer.slice(layer.indexOf('.vcp__label:hover'));
    expect(
      layer.slice(0, layer.indexOf('.vcp__label:hover')),
      'hover вне media — нет (EPIC-4)',
    ).not.toContain('.vcp__label:hover');
    expect(hoverZone).toMatch(/@media \(hover: hover\)/);
    expect(blockOf(layer, '.vcp__label:hover'), 'blue-100 (vacancy-capsule.css:27)').toContain(
      'background-color: var(--ui-color-surface-hover);',
    );
  });

  it('btn: CTA 64 → 80px, accent, fw-body-bold, on-dark; mobile — центр и radius снизу, от md — справа; hover — под (hover: hover)', () => {
    const btn = blockOf(layer, '.vcp__btn');
    expect(btn).toContain('display: inline-flex;');
    expect(btn, '64px @max-767 (vacancy-capsule.css:54)').toContain('height: 4rem;');
    expect(btn, 'центр подписи @max-767 (vacancy-capsule.css:56)').toContain(
      'justify-content: center;',
    );
    expect(btn, 'gap 12px (vacancy-capsule.css:32) — space-3').toContain(
      'gap: var(--ui-space-3);',
    );
    expect(btn, 'pad 0 44px (vacancy-capsule.css:34) «как есть» — на всех ступенях').toContain(
      'padding: 0 2.75rem;',
    );
    expect(btn, 'accent (vacancy-capsule.css:35)').toContain(
      'background-color: var(--ui-color-accent);',
    );
    expect(btn, 'radius 0 0 pill pill @max-767 (vacancy-capsule.css:57)').toContain(
      'border-radius: 0 0 var(--ui-radius-pill) var(--ui-radius-pill);',
    );
    expect(btn, '18px (vacancy-capsule.css:37)').toContain('font-size: 1.125rem;');
    expect(btn, 'fw-body-bold (vacancy-capsule.css:38)').toContain(
      'font-weight: var(--ui-fw-body-bold);',
    );
    expect(btn, 'on-dark (vacancy-capsule.css:39)').toContain(
      'color: var(--ui-color-text-on-dark);',
    );
    const md = mediaBlockOf(layer, 768, 'vcp__btn');
    expect(md, '80px (vacancy-capsule.css:33)').toContain('height: 5rem;');
    expect(md, 'дефолт justify-content (vacancy-capsule.css:30 — центр только @max-767)').toContain(
      'justify-content: flex-start;',
    );
    expect(md, 'radius 0 pill pill 0 (vacancy-capsule.css:36)').toContain(
      'border-radius: 0 var(--ui-radius-pill) var(--ui-radius-pill) 0;',
    );
    const hoverZone = layer.slice(layer.indexOf('.vcp__btn:hover'));
    expect(
      layer.slice(0, layer.indexOf('.vcp__btn:hover')),
      'hover вне media — нет (EPIC-4)',
    ).not.toContain('.vcp__btn:hover');
    expect(hoverZone).toMatch(/@media \(hover: hover\)/);
    expect(blockOf(layer, '.vcp__btn:hover'), 'accent-light (vacancy-capsule.css:43)').toContain(
      'background-color: var(--ui-color-accent-hover);',
    );
  });
});

describe('док-паттерн landing-section — источник правды (синхронность, прецедент T17.15)', () => {
  it('эталон несёт секции наставничества и капсулы (id lsp-mentorship / lsp-capsule) после лендинг-композиций T17.15', () => {
    const mentorship = docHtml.indexOf('id="lsp-mentorship"');
    const capsule = docHtml.indexOf('id="lsp-capsule"');
    const coverHero = docHtml.indexOf('id="lsp-cover-hero"');
    expect(mentorship, 'секция msh на месте').toBeGreaterThan(-1);
    expect(capsule, 'секция vcp на месте').toBeGreaterThan(-1);
    expect(mentorship, 'msh после композиций T17.15').toBeGreaterThan(coverHero);
    expect(capsule, 'vcp после msh').toBeGreaterThan(mentorship);
  });

  it('синхронность «разметка дока ↔ крючки слоя»: наборы классов msh-/vcp- совпадают', () => {
    const markup = docHooks(docHtml);
    const hooks = layerHookSet(layer);
    for (const hook of hooks) {
      expect(markup.has(hook), `крючок слоя «${hook}» есть в разметке дока`).toBe(true);
    }
    for (const hook of markup) {
      expect(hooks.has(hook), `класс дока «${hook}» имеет правило слоя`).toBe(true);
    }
    expect(markup.size, 'канон не пуст').toBeGreaterThan(8);
  });

  it('VI-инвариант в доке: фон msh — ui-section__bg примитива (aria-hidden, alt=""), до контента; mask-фото — декоративный слой канона', () => {
    const markup = docHtml.replace(/<!--[\s\S]*?-->/g, '');
    const section = markup.match(/<section[^>]*id="lsp-mentorship"[\s\S]*?<\/section>/)?.[0] ?? '';
    expect(section, 'секция msh найдена').not.toBe('');
    expect(section, 'модификатор фото-секции').toContain('ui-section ui-section--photo msh');
    const bg = section.match(/<div class="ui-section__bg"[\s\S]*?<\/div>/)?.[0] ?? '';
    expect(bg, 'фон __bg на месте').not.toBe('');
    expect(bg, 'img фона — alt=""').toContain('alt=""');
    expect(section.indexOf('ui-section__bg'), '__bg до контента').toBeLessThan(
      section.indexOf('msh__inner'),
    );
    expect(section, 'маска-фото — второй слой канона').toContain('msh__photo');
    expect(section, 'rail-полоса на месте').toContain('msh__rail');
    expect(section, 'активная карточка — BEM-модификатор канона').toContain('msh__card--active');
  });

  it('капсула в доке: label-пилюля + btn-CTA на vcp-крючках, секция-контейнер — ui-container vcp__inner', () => {
    const markup = docHtml.replace(/<!--[\s\S]*?-->/g, '');
    const section = markup.match(/<section[^>]*id="lsp-capsule"[\s\S]*?<\/section>/)?.[0] ?? '';
    expect(section, 'секция vcp найдена').not.toBe('');
    expect(section).toContain('ui-container vcp__inner');
    expect(section).toContain('vcp__label');
    expect(section).toContain('vcp__btn');
  });

  it('шапка дока и README называют канон T18.2 (msh/vcp)', () => {
    expect(docHtml, 'шапка дока перечисляет T18.2').toContain('T18.2');
    const readme = readFileSync(
      join(root, 'patterns', 'landing-section', 'README.md'),
      'utf8',
    );
    expect(readme, 'README несёт раздел наставничества').toContain('msh');
    expect(readme, 'README несёт раздел капсулы').toContain('vcp');
  });
});

describe('гейт префиксов слоя — msh|vcp допущены (Implementation requirements: канон исполняем)', () => {
  it('showcase/patterns-layer-gate.mjs допускает msh|vcp и пропускает слой с канонами', () => {
    const gate = readFileSync(join(root, 'showcase', 'patterns-layer-gate.mjs'), 'utf8');
    expect(gate).toMatch(/lpp\|dpp\|fpp\|lnk\|lgo\|tlp\|nvp\|hsp\|ftp\|hro\|mrq\|mdl\|cvh\|pstr\|msh\|vcp/);
    expect(patternLayerProblems(layerFile), 'гейт на фактическом слое чист').toEqual([]);
  });

  it('tests/unit/patterns-layer.test.js — гейт префиксов синхронен с patterns-layer-gate.mjs', () => {
    const test = readFileSync(join(root, 'tests', 'unit', 'patterns-layer.test.js'), 'utf8');
    expect(test.match(/lpp\|dpp\|fpp\|lnk\|lgo\|tlp\|nvp\|hsp\|ftp\|hro\|mrq\|mdl\|cvh\|pstr\|msh\|vcp/g)?.length ?? 0)
      .toBeGreaterThanOrEqual(2);
  });

  it('tests/unit/pattern-landing-section.test.js — инвариант «чужих классов» допускает msh-/vcp- в эталоне', () => {
    const test = readFileSync(
      join(root, 'tests', 'unit', 'pattern-landing-section.test.js'),
      'utf8',
    );
    expect(test).toMatch(/hro\|mrq\|mdl\|cvh\|msh\|vcp/);
  });
});

/**
 * Юнит-пины T17.15 — лендинг-композиции и спец-тинты (спека
 * docs/ui-system/epics/EPIC-17-ds-full-coverage/T17.15-landing-compositions.md).
 *
 * Исполняемая форма решения:
 *  - паттерн-слой (patterns/patterns.css → dist/ui-patterns.css): каноны
 *    hro (hero: контент/заголовок/стеклянная пилюля поиска/лента тегов),
 *    mrq (adv-marquee, T16.15-канон 40/18/13), mdl (спец-сетка media:
 *    big 2×2 + lead 2 колонки, ступени 2→1), cvh (cover-hero: колонка
 *    gap 16 start); гейт префиксов слоя расширен (hro|mrq|mdl|cvh);
 *  - спец-тинты hero-тегов — решение владельца, вариант (а): тон —
 *    бренд-слой, НЕ система. Слой несёт хук --hro-tag-bg с каноническим
 *    дефолтом sand (--ui-color-primary-a26, T14.7); спец-тоны
 *    (violet/green/rose) — цветовые строки САЙТ-ЗОНЫ (color-mix 20%,
 *    hex в ДС не едет — гейт), value в слое отсутствует;
 *  - VI-инвариант: пилюля/теги несут backdrop-filter в каноне; в режиме
 *    img:off (фото скрыто — blur нечему размывать) blur отключается
 *    правилом a11y/vi.css (T17.15 Implementation requirements п.1);
 *  - док-паттерн landing-section — источник правды: разметка
 *    patterns/landing-section/landing-section.html несёт те же классы
 *    (пин синхронности, прецедент T17.9); блок «тон тега» — в доке;
 *  - пилот: cp-hero/cp-adv-marquee/cp-media__grid/cp-cover-hero сняты из
 *    pilot.css (~180 строк), разметка build.mjs — на классах канона,
 *    тон-строки остаются (хук --hro-tag-bg).
 *
 * Поверхность браузера (compare до/после, VI-проба img:off, скрин-пары
 * index/internships/practices) — пробы .zcode/accept-t1715-*; здесь —
 * пины исходников.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { patternLayerProblems } from '../../showcase/patterns-layer-gate.mjs';

const root = join(import.meta.dirname, '..', '..');

const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (первое вхождение; tests/unit/link.test.js). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

/** Тело media-ступени (min-width: Npx), содержащей селектор hook — поиск по
 *  ВСЕМ ступеням файла (первая @media файла — ветка lpp-layout, не T17.15). */
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

const docPath = join(root, 'patterns', 'landing-section', 'landing-section.html');
const docHtml = readFileSync(docPath, 'utf8').replace(/\r\n/g, '\n');

const viCss = stripCssComments(readFileSync(join(root, 'a11y', 'vi.css'), 'utf8'));

const pilotDir = join(root, 'pilot', 'career-portal');
const pilotBuild = readFileSync(join(pilotDir, 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
const pilotCss = stripCssComments(readFileSync(join(pilotDir, 'pilot.css'), 'utf8'));
const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8').replace(/\r\n/g, '\n');

/** Классы-крючки hro/mrq/mdl/cvh в разметке дока (class="…", комментарии вне). */
const docHooks = () => {
  const html = docHtml.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ');
  const found = new Set();
  for (const attr of html.match(/class="[^"]*"/g) ?? []) {
    for (const name of attr.slice(7, -1).split(' ')) {
      if (/^(hro|mrq|mdl|cvh)(?:-|__|$)/.test(name)) found.add(name);
    }
  }
  return found;
};

/** Крючки hro/mrq/mdl/cvh в правилах слоя. */
const layerHookSet = () => {
  const hooks = new Set();
  for (const selector of layer.match(/[^{}]+(?=\{)/g) ?? []) {
    for (const hook of selector.match(/\.[a-z][a-z0-9_-]*/g) ?? []) {
      if (/^\.(hro|mrq|mdl|cvh)(?:-|__|$)/.test(hook)) hooks.add(hook.slice(1));
    }
  }
  return hooks;
};

/** Классы разметки hero-тегов пилота: тон — класс сайт-зоны, устанавливающий
 *  --hro-tag-bg (спец-тоны violet/green/rose; sand — канонический дефолт
 *  хука, строка сайта остаётся для явности тона). */
const PILOT_TAG_TONES = ['violet', 'sand', 'green', 'rose'];

describe('patterns/patterns.css — канон hero (связка hro, T17.15 Scope)', () => {
  it('блок: секция-фото + собственная вертикальная геометрия (min-height 50.5rem от md, 35rem мобильная база — канон оригинала @max-767)', () => {
    const hro = blockOf(layer, '.hro');
    expect(hro, '.hro найдено').toBeTruthy();
    expect(hro, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(hro, 'flex-колонка поверх фото-секции').toContain('display: flex;');
    expect(hro).toContain('position: relative;');
    expect(hro).toContain('flex-direction: column;');
    expect(hro, 'клип фото-фона').toContain('overflow: hidden;');
    expect(hro, 'мобильная база 35rem — оригинал @max-767 (hero.css:211), mobile-first').toContain(
      'min-height: 35rem;',
    );
    expect(
      hro,
      'ритм ui-section погашен — геометрию несут min-height/паддинги __content',
    ).toContain('padding: 0;');
    const md = mediaBlockOf(layer, 768, 'hro');
    expect(md, 'ступень md есть').toBeTruthy();
    expect(md, 'min-height 50.5rem = 808px оригинала (hero.css:3) от md').toContain(
      'min-height: 50.5rem;',
    );
  });

  it('контент: центр, паддинги 136/container-pad/24, шаг 48 (space-7)', () => {
    const content = blockOf(layer, '.hro__content');
    expect(content, '.hro__content найдено').toBeTruthy();
    expect(content).toContain('box-sizing: border-box;');
    expect(content, 'растёт на свободную высоту hero').toContain('flex: 1 1 auto;');
    expect(content).toContain('flex-direction: column;');
    expect(
      content,
      'шаг блоков 48px — пилот (space-7; оригинал 64px hero.css:53 — принято ДС)',
    ).toContain('gap: var(--ui-space-7);');
    expect(content).toContain('align-items: center;');
    expect(content).toContain('justify-content: center;');
    expect(content).toContain('width: 100%;');
    expect(
      content,
      'паддинги 136/container-pad/24 — 8.5rem «как есть» (hero.css:54), низ 24 — space-5',
    ).toContain('padding: 8.5rem var(--ui-container-pad) var(--ui-space-5);');
  });

  it('заголовок: max-width 56rem, центр строки, primary (1:1 порт cp-hero__title)', () => {
    const title = blockOf(layer, '.hro__title');
    expect(title, '.hro__title найдено').toBeTruthy();
    expect(title).toContain('box-sizing: border-box;');
    expect(title, 'max-width 56rem (896px — принято ДС против 900px оригинала)').toContain(
      'max-width: 56rem;',
    );
    expect(title, 'цвет заголовка hero — primary ( approved-пара на фото)').toContain(
      'color: var(--ui-color-primary);',
    );
    expect(title).toContain('text-align: center;');
  });

  it('стеклянная пилюля поиска: glass-light + blur(12px), пилюля-радиус, ширина 50rem (Implementation requirements п.1)', () => {
    const search = blockOf(layer, '.hro__search');
    expect(search, '.hro__search найдено').toBeTruthy();
    expect(search).toContain('box-sizing: border-box;');
    expect(search).toContain('display: flex;');
    expect(search, 'зазор поле/иконка/плита 16 — space-3').toContain('gap: var(--ui-space-3);');
    expect(search).toContain('align-items: center;');
    expect(search, '50rem = 800px оригинала (hero.css:72)').toContain('width: 50rem;');
    expect(search).toContain('max-width: 100%;');
    expect(search, 'паддинг 4px «как есть» (hero.css:74), левый 24 — space-5').toContain(
      'padding: 4px 4px 4px var(--ui-space-5);',
    );
    expect(search).toContain('border-radius: var(--ui-radius-pill);');
    expect(search, 'стекло — токен glass-light').toContain(
      'background-color: var(--ui-color-glass-light);',
    );
    expect(
      search,
      'backdrop-filter в каноне (VI-инвариант: отключение в img:off — a11y/vi.css)',
    ).toContain('backdrop-filter: blur(12px);');
  });

  it('внутреннее поле пилюли прозрачное, слот плиты-кнопки 72px на surface-muted/primary-deep', () => {
    const field = blockOf(layer, '.hro__search .ui-field');
    expect(field, 'поле растягивается, min-width: 0').toBeTruthy();
    expect(field).toContain('flex: 1 1 auto;');
    expect(field).toContain('min-width: 0;');
    const input = blockOf(layer, '.hro__search .ui-field__input');
    expect(input, 'input прозрачный внутри стекла (порт hero__search-input)').toBeTruthy();
    expect(input).toContain('border-color: transparent;');
    expect(input).toContain('background-color: transparent;');
    const all = blockOf(layer, '.hro__search-all');
    expect(all, 'плита «Все вакансии» 72px — hero.css:114').toBeTruthy();
    expect(all).toContain('height: 4.5rem;');
    expect(all).toContain('border-radius: var(--ui-radius-pill);');
    expect(all).toContain('background-color: var(--ui-color-surface-muted);');
    expect(all).toContain('color: var(--ui-color-primary-deep);');
    expect(all).toContain('font-size: var(--ui-fs-small);');
    expect(all).toContain('font-weight: var(--ui-fw-small);');
  });

  it('лента тегов: 1:1:1:1, min-height 56, on-dark 18px, стекло blur(10px); тон — ТОЛЬКО хук --hro-tag-bg', () => {
    const tags = blockOf(layer, '.hro__tags');
    expect(tags, '.hro__tags найдено').toBeTruthy();
    expect(tags).toContain('display: flex;');
    expect(tags, 'зазор ленты 16 — space-4').toContain('gap: var(--ui-space-4);');
    expect(tags).toContain('width: 100%;');
    expect(tags).toContain('max-width: var(--ui-container-max);');
    expect(tags).toContain('margin: 0 auto;');
    expect(tags).toContain('padding: 0 var(--ui-container-pad) var(--ui-space-6);');
    const tag = blockOf(layer, '.hro__tag');
    expect(tag, '.hro__tag найдено').toBeTruthy();
    expect(tag, 'лента 1:1:1:1 — flex 1 1 0 (спека)').toContain('flex: 1 1 0;');
    expect(tag, 'min-height 56px — hero.css:142').toContain('min-height: 3.5rem;');
    expect(tag).toContain('justify-content: center;');
    expect(tag, 'текст тега — on-dark (hero.css:147)').toContain(
      'color: var(--ui-color-text-on-dark);',
    );
    expect(tag, '18px — fs-lead').toContain('font-size: var(--ui-fs-lead);');
    expect(tag, 'стекло тега — blur(10px) (hero.css:148)').toContain(
      'backdrop-filter: blur(10px);',
    );
    expect(
      tag,
      'тон — ТОЛЬКО хук: дефолт sand — --ui-color-primary-a26 (T14.7; спец-тоны — сайт-зона)',
    ).toContain('background-color: var(--hro-tag-bg, var(--ui-color-primary-a26));');
  });

  it('спец-тинты — вариант (а): в слое нет ни hex, ни color-mix тонов (тон — бренд-слой, hex не едет в ДС — гейт)', () => {
    const hroZone = layer.slice(layer.indexOf('.hro {'), layer.indexOf('.mrq {'));
    expect(hroZone, 'hex в каноне hero запрещён').not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(hroZone, 'color-mix тонов в каноне нет — тон несёт сайт-зона').not.toContain(
      'color-mix',
    );
    expect(patternLayerProblems(layerFile), 'гейт префиксов пропускает канон T17.15').toEqual([]);
  });
});

describe('patterns/patterns.css — канон adv-marquee (связка mrq, литералы T16.15)', () => {
  it('блок: светлый blue-50, гэп/паддинг 48, радиус md, сетка 1.2fr/1fr от lg (база — колонка, mobile-first)', () => {
    const mrq = blockOf(layer, '.mrq');
    expect(mrq, '.mrq найдено').toBeTruthy();
    expect(mrq).toContain('box-sizing: border-box;');
    expect(mrq).toContain('display: grid;');
    expect(mrq).toContain('gap: var(--ui-space-7);');
    expect(mrq).toContain('align-items: center;');
    expect(mrq, 'мобильная база — колонка (оригинал ≤1023, pages.css:915)').toContain(
      'grid-template-columns: minmax(0, 1fr);',
    );
    expect(mrq).toContain('padding: var(--ui-space-7);');
    expect(mrq).toContain('border-radius: var(--ui-radius-md);');
    expect(mrq).toContain('background-color: var(--ui-color-surface-muted);');
    const lg = mediaBlockOf(layer, 1024, 'mrq');
    expect(lg, 'ступень lg есть').toBeTruthy();
    expect(lg, '1.2fr/1fr — pages.css:1060 «как есть» (minmax — rem-стресс T3.6)').toContain(
      'grid-template-columns: 1.2fr minmax(0, 1fr);',
    );
  });

  it('лента строк: гэп 12 (space-3), min-width: 0; строки — литералы канона T16.15 (40/18/13 fw 500 uppercase ls 0.02em primary), не роли', () => {
    const type = blockOf(layer, '.mrq__type');
    expect(type, '.mrq__type найдено').toBeTruthy();
    expect(type).toContain('flex-direction: column;');
    expect(type, 'гэп 12 — pages.css:1068').toContain('gap: var(--ui-space-3);');
    expect(type).toContain('min-width: 0;');
    const line = blockOf(layer, '.mrq__line');
    expect(line, '.mrq__line найдено').toBeTruthy();
    expect(line, 'color primary — pages.css:1074').toContain('color: var(--ui-color-primary);');
    expect(line, 'fw 500 — --ui-fw-body-bold (pages.css:1072)').toContain(
      'font-weight: var(--ui-fw-body-bold);',
    );
    expect(line, 'ls 0.02em — pages.css:1075').toContain('letter-spacing: 0.02em;');
    expect(line, 'uppercase через CSS — контент строчный (a11y)').toContain(
      'text-transform: uppercase;',
    );
    const bar = blockOf(layer, '.mrq__line--bar');
    expect(bar, 'подписи 18px «как есть» (pages.css:1078)').toContain('font-size: 1.125rem;');
    const sm = blockOf(layer, '.mrq__line--sm');
    expect(sm, 'мелкая 13px «как есть» (pages.css:1080)').toContain('font-size: 0.8125rem;');
    expect(sm).toContain('font-weight: var(--ui-fw-small);');
    const xl = blockOf(layer, '.mrq__line--xl');
    expect(xl, 'крупная 40px/1.15/ls 0 «как есть» (pages.css:1082–1084)').toContain(
      'font-size: 2.5rem;',
    );
    expect(xl).toContain('line-height: 1.15;');
    expect(xl).toContain('letter-spacing: 0;');
    expect(xl).toContain('white-space: normal;');
    expect(xl, 'роль ui-h3 снята (T16.15: замер 42/500 — не канон)').not.toContain('--ui-fs-h3');
  });

  it('тело и фото: строка с 480 (база — перенос, фото на своей строке); гранулы стресса — anywhere на тексте, max-width на фото', () => {
    const body = blockOf(layer, '.mrq__body');
    expect(body, '.mrq__body найдено').toBeTruthy();
    expect(body).toContain('display: flex;');
    expect(
      body,
      'база — flex-wrap: wrap: ≤ ~550px в пилоте текст выталкивался за блок в hscroll страницы; фото переносится на свою строку',
    ).toContain('flex-wrap: wrap;');
    expect(body).toContain('gap: var(--ui-space-4);');
    expect(body).toContain('align-items: center;');
    const nowrap = mediaBlockOf(layer, 480, 'mrq__body');
    expect(nowrap, 'ступень 480 есть (шкала T2.5)').toBeTruthy();
    expect(nowrap, 'с 480 — строка, как в одобренном рендере (помещается)').toContain(
      'flex-wrap: nowrap;',
    );
    const text = blockOf(layer, '.mrq__body .ui-body');
    expect(
      text,
      'гранула стресса 32px-базы T3.6 — anywhere (прецедент .lpp-rows .ui-button)',
    ).toContain('overflow-wrap: anywhere;');
    const photo = blockOf(layer, '.mrq__photo');
    expect(photo, '.mrq__photo найдено').toBeTruthy();
    expect(photo).toContain('object-fit: cover;');
    expect(photo).toContain('width: 16rem;');
    expect(
      photo,
      'reflow-гранула 32px-гейта (прецедент .lpp-pill): 16rem × 32px-базы клампится к колонке',
    ).toContain('max-width: 100%;');
    expect(photo).toContain('border-radius: var(--ui-radius-md);');
  });
});

describe('patterns/patterns.css — канон спец-сетки media (mdl) и cover-hero (cvh)', () => {
  it('mdl: 4 колонки от lg, big 2×2 и lead 2 колонки от md, ступени 2→1 (mobile-first)', () => {
    const grid = blockOf(layer, '.mdl');
    expect(grid, '.mdl найдено').toBeTruthy();
    expect(grid).toContain('box-sizing: border-box;');
    expect(grid).toContain('display: grid;');
    expect(grid, 'шаг 12px — space-3').toContain('gap: var(--ui-space-3);');
    expect(grid, 'мобильная база — 1 колонка (оригинал ≤767)').toContain(
      'grid-template-columns: minmax(0, 1fr);',
    );
    const md = mediaBlockOf(layer, 768, 'mdl');
    expect(md, 'ступень md есть').toBeTruthy();
    expect(md, 'md — 2 колонки (оригинал ≤1023)').toContain(
      'grid-template-columns: repeat(2, minmax(0, 1fr));',
    );
    const big = md.match(/\.mdl__big\s*\{([^}]*)\}/);
    expect(big, 'span big в ступени md (на 1 колонке span 2 порвал бы базу)').toBeTruthy();
    expect(big[1], 'big — row/col span 2 (pilot.css:466)').toContain('grid-row: span 2;');
    expect(big[1]).toContain('grid-column: span 2;');
    const lead = md.match(/\.mdl__lead\s*\{([^}]*)\}/);
    expect(lead, 'span lead в ступени md').toBeTruthy();
    expect(lead[1], 'lead — col span 2 (pilot.css:471)').toContain('grid-column: span 2;');
    const lg = mediaBlockOf(layer, 1024, 'mdl');
    expect(lg, 'ступень lg есть').toBeTruthy();
    expect(lg, 'lg — 4 колонки').toContain('grid-template-columns: repeat(4, minmax(0, 1fr));');
  });

  it('mdl__lead: карточка-сводка — колонка gap 8, паддинг 16, рамка/радиус/поверхность (1:1 порт cp-media__lead)', () => {
    const lead = blockOf(layer, '.mdl__lead');
    expect(lead, '.mdl__lead найдено').toBeTruthy();
    expect(lead).toContain('box-sizing: border-box;');
    expect(lead).toContain('display: flex;');
    expect(lead).toContain('flex-direction: column;');
    expect(lead, 'шаг 8px — space-2').toContain('gap: var(--ui-space-2);');
    expect(lead).toContain('padding: var(--ui-space-4);');
    expect(lead).toContain('border: var(--ui-border-width) solid var(--ui-color-border);');
    expect(lead).toContain('border-radius: var(--ui-radius-md);');
    expect(lead).toContain('background-color: var(--ui-color-surface);');
  });

  it('cvh: колонка gap 16 start (спека; оригинал .cover-hero pages.css:953 — gap 20, принято ДС)', () => {
    const cvh = blockOf(layer, '.cvh');
    expect(cvh, '.cvh найдено').toBeTruthy();
    expect(cvh).toContain('box-sizing: border-box;');
    expect(cvh).toContain('display: flex;');
    expect(cvh).toContain('flex-direction: column;');
    expect(cvh, 'gap 16 — space-4').toContain('gap: var(--ui-space-4);');
    expect(cvh, 'прижато влево (pages.css:957)').toContain('align-items: flex-start;');
  });
});

describe('гейт префиксов слоя расширен: hro|mrq|mdl|cvh каноничны (Implementation requirements T17.1 п.2 + T17.15)', () => {
  it('реальный слой чист — все правила проходят расширенный гейт', () => {
    expect(
      patternLayerProblems(layerFile),
      'hro-/mrq-/mdl-/cvh- — канонические крючки слоя',
    ).toEqual([]);
  });

  it('чужие префиксы по-прежнему ловятся', () => {
    const problems = patternLayerProblems('.cp-evil { color: var(--ui-color-text); }');
    expect(problems.length, 'чужой крючок пойман').toBeGreaterThan(0);
    expect(problems.join('; ')).toContain('.cp-evil');
  });

  it('инварианты слоя: без hex, без !important, без ID-селекторов', () => {
    expect(layer, 'hex только в tokens/primitives.css').not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(layer, '!important только в a11y/vi.css').not.toContain('!important');
    expect(layer, 'ID в CSS системы запрещены (02-architecture §1)').not.toMatch(/^\s*#[a-zA-Z]/m);
  });
});

describe('a11y/vi.css — VI-инвариант стекла: blur отключён в img:off (Implementation requirements п.1)', () => {
  it('канон несёт backdrop-filter (пилюля blur 12, теги blur 10) — предпосылка правила', () => {
    expect(blockOf(layer, '.hro__search')).toContain('backdrop-filter: blur(12px);');
    expect(blockOf(layer, '.hro__tag')).toContain('backdrop-filter: blur(10px);');
  });

  it('в режиме img:off backdrop-filter отключён (фото скрыто — blur нечему размывать)', () => {
    const rule = viCss.match(
      /body\.vi\.vi-img--off[^{]*\{[^}]*backdrop-filter:\s*none\s*!important;[^}]*\}/,
    );
    expect(rule, 'правило отключения blur в img:off есть').toBeTruthy();
  });
});

describe('док-паттерн landing-section — источник правды (синхронность, прецедент T17.9)', () => {
  it('канон связок живёт в разметке дока: hero/marquee/медиа-сетка/cover-hero', () => {
    const hooks = docHooks();
    for (const name of [
      'hro',
      'hro__content',
      'hro__title',
      'hro__search',
      'hro__search-icon',
      'hro__search-all',
      'hro__tags',
      'hro__tag',
      'mrq',
      'mrq__type',
      'mrq__line',
      'mrq__line--bar',
      'mrq__line--sm',
      'mrq__line--xl',
      'mrq__body',
      'mrq__photo',
      'mdl',
      'mdl__big',
      'mdl__lead',
      'cvh',
    ]) {
      expect(hooks.has(name), `${name} в разметке дока есть`).toBe(true);
    }
  });

  it('крючки слоя существуют в разметке дока — слой не изобретает имён', () => {
    const hooks = docHooks();
    for (const hook of layerHookSet()) {
      expect(hooks.has(hook), `крючок «${hook}» из слоя отсутствует в разметке дока`).toBe(true);
    }
  });

  it('блок «тон тега» задокументирован: хук --hro-tag-bg, дефолт sand, спец-тоны — сайт-зона (hex не едет)', () => {
    expect(docHtml, 'хук тона назван в доке').toContain('--hro-tag-bg');
    expect(docHtml, 'дефолт sand — токен T14.7').toContain('--ui-color-primary-a26');
    expect(docHtml, 'спец-тоны названы (violet/green/rose)').toMatch(
      /violet[\s\S]{0,400}green[\s\S]{0,400}rose/,
    );
    expect(
      docHtml,
      'hex в доке не приводится (инвариант: hex только в tokens/primitives.css)',
    ).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });

  it('эталон hero: фото-фон ui-section--photo, декоративные слои aria-hidden, поиск role="search", input с aria-label', () => {
    const section = docHtml.match(/<section[^>]*id="lsp-hero"[\s\S]*?<\/section>/)?.[0] ?? '';
    expect(section, 'секция lsp-hero найдена').not.toBe('');
    expect(section, 'фото-фон — примитив T17.3').toContain('ui-section ui-section--photo hro');
    expect(section, 'оверлей --fade-bottom — канон hero').toContain(
      'ui-section__overlay--fade-bottom',
    );
    expect(section, 'поиск — форма role="search"').toContain('role="search"');
    expect(section, 'input поиска доступно именован (строка пилота)').toContain(
      'aria-label="Поиск вакансий"',
    );
    expect(section, 'теги — ui-tag hro__tag (пример спеки)').toContain('ui-tag hro__tag');
  });

  it('док остаётся фрагментом: h1 в эталоне нет (пин T8.3 — h1 несёт каркас стенда)', () => {
    expect(docHtml, 'h1 в эталоне секций нет').not.toContain('<h1');
  });
});

describe('пилот career-portal: лендинг-композиции на канонах (AC T17.15)', () => {
  it('hero — разметка hro: контент/заголовок/пилюля/теги; тон — классом сайт-зоны на хуке', () => {
    expect(pilotBuild, 'блок hero — канон hro на фото-секции').toContain(
      'ui-section ui-section--photo hro',
    );
    expect(pilotBuild).toContain('<div class="hro__content">');
    expect(pilotBuild).toContain('<h1 class="hro__title ui-h1">');
    expect(pilotBuild).toContain('<form class="hro__search"');
    expect(pilotBuild).toContain('<div class="hro__tags">');
    expect(pilotBuild, 'тег — ui-tag hro__tag + тон-класс сайт-зоны (пример спеки)').toContain(
      '<span class="ui-tag hro__tag cp-hero__tag--violet">',
    );
    for (const gone of [
      'cp-hero__content',
      'cp-hero__title',
      'cp-hero__search-icon',
      'cp-hero__search-all',
      'cp-hero__tags',
    ]) {
      expect(
        pilotBuild,
        `${gone} из разметки снят (тон-классы cp-hero__tag--* — исключение)`,
      ).not.toMatch(new RegExp(`class="[^"]*\\b${gone}\\b`));
    }
    expect(
      pilotBuild,
      'базовый cp-hero__tag снят (остались только тон-классы --violet/--sand/--green/--rose)',
    ).not.toMatch(/cp-hero__tag(?!-)/);
  });

  it('marquee — разметка mrq: строки с модификаторами канона T16.15', () => {
    expect(pilotBuild).toContain('<div class="mrq">');
    expect(pilotBuild, 'лента aria-hidden (визуальная типографика — дубликат смысла)').toContain(
      '<div class="mrq__type" aria-hidden="true">',
    );
    expect(pilotBuild).toContain(
      '<span class="mrq__line mrq__line--bar">Группа «Интер РАО»</span>',
    );
    expect(pilotBuild).toMatch(/mrq__line mrq__line--sm">оплачиваемые программы/);
    expect(pilotBuild).toMatch(/mrq__line mrq__line--xl">НАЧНИ КАРЬЕРУ/);
    expect(pilotBuild).toMatch(/mrq__line mrq__line--bar">опыт · наставники/);
    const lines = pilotBuild.match(/<span class="mrq__line[^"]*">/g) ?? [];
    expect(lines.length, 'четыре строки marquee').toBe(4);
    for (const line of lines) {
      expect(line, `модификатор у ${line}`).toMatch(/mrq__line--(bar|sm|xl)/);
    }
    expect(pilotBuild).toContain('<div class="mrq__body">');
    expect(pilotBuild).toContain('<img class="mrq__photo"');
  });

  it('media — разметка mdl: сетка и lead на каноне; span big НЕ активируется (см. пин ниже)', () => {
    expect(pilotBuild, 'сетка — канон mdl').toContain('<div class="mdl">');
    expect(pilotBuild).toContain('<div class="mdl__lead">');
    expect(pilotBuild, 'cp-media__* из разметки сняты').not.toMatch(
      /class="[^"]*\bcp-media__(?:grid|lead)\b/,
    );
  });

  it('span 2×2 big-карточки НЕ активируется в пилоте: одобренный рендер index не меняется (AC docHeight ±1%); активация — design-decision владельца', () => {
    // История: правило .cp-media__card--big не применялось с клона (в разметке
    // опечатка cp-media-card--big) — одобренные скрин-пары/высоты (REPORT)
    // сняты БЕЗ span. Миграция рендер-нейтральна: канон mdl__big в слое есть
    // (спека Scope), пилот его не включает. Замер 27.10: span +214px docHeight
    // (+3.1% > порога ±1%).
    expect(pilotBuild, 'big-карточка без mdl__big (в class=)').not.toMatch(
      /class="[^"]*\bmdl__big\b/,
    );
    expect(pilotBuild, 'мёртвый класс cp-media-card снят (в class=)').not.toMatch(
      /class="[^"]*\bcp-media-card\b/,
    );
  });

  it('cover-hero — разметка cvh', () => {
    expect(pilotBuild).toContain('<div class="cvh">');
    expect(pilotBuild, 'cp-cover-hero из разметки снят').not.toMatch(
      /class="[^"]*\bcp-cover-hero\b/,
    );
  });

  it('pilot.css: связки сняты (~180 строк), тон-строки hero остаются на хуке --hro-tag-bg', () => {
    for (const gone of [
      '.cp-hero {',
      '.cp-hero__content',
      '.cp-hero__title',
      '.cp-hero__search',
      '.cp-hero__search-icon',
      '.cp-hero__search-all',
      '.cp-hero__tags',
      '.cp-hero__tag {',
      '.cp-cover-hero',
      '.cp-adv-marquee {',
      '.cp-adv-marquee__type',
      '.cp-adv-marquee__line',
      '.cp-adv-marquee__body',
      '.cp-adv-marquee__photo',
      '.cp-media__grid',
      '.cp-media__card--big',
      '.cp-media__lead',
    ]) {
      expect(pilotCss, `связка ${gone} перенесена в слой`).not.toContain(gone);
    }
    for (const tone of PILOT_TAG_TONES) {
      const row = blockOf(pilotCss, `.cp-hero__tag--${tone}`);
      expect(row, `тон-строка ${tone} остаётся (AC «тон-строки остаются»)`).toBeTruthy();
      expect(
        row,
        `тон ${tone} — на хуке канона (спец-тоны violet/green/rose — color-mix 20% сайт-зоны; sand — токен T14.7)`,
      ).toContain('--hro-tag-bg:');
    }
    const violet = blockOf(pilotCss, '.cp-hero__tag--violet');
    expect(violet, 'violet 20% — value в сайт-зоне (hex не едет в ДС)').toContain(
      'color-mix(in srgb, #3142ff 20%, transparent);',
    );
  });

  it('лестницы 1023/767: портированные селекторы из групп сняты (ступени — канон слоя mobile-first)', () => {
    const max1023 = pilotCss.match(/@media \(max-width: 1023px\)\s*\{[\s\S]*?\n\}\n/)?.[0] ?? '';
    const max767 = pilotCss.match(/@media \(max-width: 767px\)\s*\{[\s\S]*?\n\}\n/)?.[0] ?? '';
    expect(
      max1023,
      'marquee в ступени 1023 снят (канон mrq: база-колонка, 1.2fr/1fr от lg)',
    ).not.toContain('.cp-adv-marquee');
    expect(max1023, 'media-сетка в ступени 1023 снята (канон mdl: 2 от md)').not.toContain(
      '.cp-media__grid',
    );
    expect(max767, 'hero в ступени 767 снят (канон hro: 35rem база, 50.5rem от md)').not.toContain(
      '.cp-hero',
    );
    expect(
      max767,
      'media-сетка/lead в ступени 767 сняты (канон mdl: без span в базе)',
    ).not.toContain('.cp-media__');
  });

  it('compare: пробы marquee/hero — на крючках канона (прецедент lpp-/nvp-/tlp-)', () => {
    expect(compare, 'проба строки marquee — на крючке слоя').toContain("pilot: '.mrq__line--xl'");
    expect(compare, 'старый крючок снят').not.toContain("'.cp-adv-marquee__line--xl'");
    expect(compare, 'блок hero — на крючке слоя').toContain("['hero', '.hero', '.hro']");
    expect(compare).not.toContain("['hero', '.hero', '.cp-hero']");
  });

  it('mapping-док синхронен миграции: строка adv-marquee указывает на канон mrq слоя, не на снятую сайт-зону (ревью T17.15; прецедент salary→dpp__salary T17.14)', () => {
    const mapping = readFileSync(
      join(root, 'docs', 'ui-system', 'architecture', 'tokens-career-portal-mapping.md'),
      'utf8',
    ).replace(/\r\n/g, '\n');
    const row = mapping.split('\n').find((line) => line.includes('промо-блок «бегущие строки»'));
    expect(row, 'строка mapping-таблицы adv-marquee найдена').toBeTruthy();
    expect(
      row,
      'значения — канон mrq паттерн-слоя (после миграции сайт-зонных правил нет)',
    ).toMatch(/канон `mrq` паттерн-слоя/);
    expect(row, 'источник канона назван').toContain('patterns/patterns.css');
    expect(row, 'док-канон назван (patterns/landing-section/README.md)').toContain(
      'patterns/landing-section/README.md',
    );
    expect(
      row,
      'снятая сайт-зона не подаётся как живое место значений (present-tense claim снят)',
    ).not.toContain('сайт-зона пилота `.cp-adv-marquee*`');
    expect(
      mapping,
      'история переноса T17.15 записана в третьей колонке (строка adv-marquee)',
    ).toMatch(/T17\.15: правила `\.cp-adv-marquee\*` сняты из pilot\.css/);
  });
});

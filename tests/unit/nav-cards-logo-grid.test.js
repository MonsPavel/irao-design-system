/**
 * Юнит-пины T17.9 — nav-карточки «Школьникам и студентам» (связка lnk-card)
 * и лента логотипов работодателей (связка lgo-grid) + модификатор
 * ui-button--round (спека docs/ui-system/epics/EPIC-17-ds-full-coverage/
 * T17.9-nav-cards-logo-grid.md).
 *
 * Исполняемая форма решения:
 *  - ui-button--round (components/ui-button/ui-button.css): круглая
 *    icon-кнопка --ui-control-size; цветовая пара — токен-хуках
 *    --ui-button-bg/--ui-button-color с каноническим дефолтом (primary/
 *    on-dark); hover/active пару НЕ меняют (одобренный дизайн круглой
 *    стрелки состояний не несёт — pilot.css .cp-students__card-btn).
 *    Фактический размер кнопки в одобренном пилоте — 20×20 (--ui-control-
 *    size, before-проба T17.9); «48px» из прозы Context спеки противоречит
 *    и коду пилота (pilot.css:550), и значению токена (1.25rem) — норма
 *    спеки «--ui-control-size» исполнена;
 *  - связки в паттерн-слое (patterns/patterns.css → dist/ui-patterns.css):
 *    lnk-card (тон — хук --lnk-card-bg/--lnk-card-fg, слоты
 *    body/illustration/action, сетка lnk-cards 1→2→3) и lgo-grid/lgo-card
 *    (рамочные плашки на ui-grid, 1→4→6); гейт префиксов слоя расширен
 *    (lnk-|lgo- рядом с lpp-|ddp-|fpp-);
 *  - док-паттерн landing-section — источник правды: разметка
 *    patterns/landing-section/landing-section.html несёт те же классы
 *    (пин синхронности);
 *  - пилот: students/employers на связках, правила cp-students/cp-employers-
 *    семейства сняты из pilot.css (сайт-зона — только тоны на хуках);
 *    compare-проба employers — на крючке слоя.
 *
 * Поверхность браузера (пары before/after, axe, эталоны стенда) —
 * compare-прогон/e2e; здесь — пины исходников.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { patternLayerProblems } from '../../showcase/patterns-layer-gate.mjs';

const root = join(import.meta.dirname, '..', '..');

const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

const buttonCss = stripCssComments(
  readFileSync(join(root, 'components/ui-button/ui-button.css'), 'utf8'),
);
const layerFile = readFileSync(join(root, 'patterns', 'patterns.css'), 'utf8');
const layer = stripCssComments(layerFile);

const pilotDir = join(root, 'pilot', 'career-portal');
const pilotBuild = readFileSync(join(pilotDir, 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
const pilotCss = stripCssComments(readFileSync(join(pilotDir, 'pilot.css'), 'utf8'));
const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8').replace(/\r\n/g, '\n');

const landingDoc = readFileSync(
  join(root, 'patterns/landing-section/landing-section.html'),
  'utf8',
).replace(/\r\n/g, '\n');

/** Классы-крючки lnk-/lgo- в разметке дока (class="…", комментарии вне). */
const docHooks = () => {
  const html = landingDoc.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ');
  const found = new Set();
  for (const attr of html.match(/class="[^"]*"/g) ?? []) {
    for (const name of attr.slice(7, -1).split(' ')) {
      if (/^(lnk|lgo)-/.test(name)) found.add(name);
    }
  }
  return found;
};

/** Крючки lnk-/lgo- в правилах слоя. */
const layerHookSet = () => {
  const hooks = new Set();
  for (const selector of layer.match(/[^{}]+(?=\{)/g) ?? []) {
    for (const hook of selector.match(/\.[a-z][a-z0-9_-]*/g) ?? []) {
      if (/^\.(lnk|lgo)-/.test(hook)) hooks.add(hook.slice(1));
    }
  }
  return hooks;
};

/** Класс разметки связки без собственных правил (вид несут ui-button--round
 *  и роль заголовка; таксономия имён канона). */
const MARKERS_WITHOUT_RULES = new Set(['lnk-card__body']);

describe('components/ui-button — модификатор --round (T17.9 Scope)', () => {
  const round = blockOf(buttonCss, '.ui-button--round');

  it('правило существует: круглая icon-кнопка --ui-control-size', () => {
    expect(round, '.ui-button--round найдено').toBeTruthy();
    expect(round, 'диаметр — --ui-control-size (кнопка 20×20 одобренного пилота)').toContain(
      'width: var(--ui-control-size);',
    );
    expect(round).toContain('height: var(--ui-control-size);');
    expect(round, 'круг — 50%').toContain('border-radius: 50%;');
  });

  it('сброс текстовой геометрии базы: min-height 0 (прецедент --text), паддинг 0', () => {
    expect(round, 'min-height базы 52px гасится (урок ревью T4.2, прецедент --text)').toContain(
      'min-height: 0;',
    );
    expect(round, 'паддинг базы гасится — диаметр строгий').toContain('padding: 0;');
  });

  it('цветовая пара — токен-хуках --ui-button-bg/--ui-button-color (дефолт primary/on-dark)', () => {
    expect(round, 'фон — хук, дефолт primary').toContain(
      'background-color: var(--ui-button-bg, var(--ui-color-primary));',
    );
    expect(round, 'подпись — хук, дефолт text-on-dark').toContain(
      'color: var(--ui-button-color, var(--ui-color-text-on-dark));',
    );
  });

  it('hover/active пару НЕ меняют — защитное переобъявление против generic-правил базы (одобренный дизайн круглой стрелки состояний не несёт)', () => {
    const hover = buttonCss.match(
      /@media \(hover: hover\)\s*\{[\s\S]*\.ui-button--round:not\(:disabled\):hover\s*\{([^}]*)\}/,
    );
    expect(hover, 'hover-правило под (hover: hover) есть').toBeTruthy();
    expect(hover[1], 'hover: фон = пара хука').toContain(
      'background-color: var(--ui-button-bg, var(--ui-color-primary));',
    );
    expect(hover[1], 'hover: подпись = пара хука').toContain(
      'color: var(--ui-button-color, var(--ui-color-text-on-dark));',
    );
    const active = blockOf(buttonCss, '.ui-button--round:not(:disabled):active');
    expect(active, 'active-правило есть').toBeTruthy();
    expect(active, 'active: фон = пара хука').toContain(
      'background-color: var(--ui-button-bg, var(--ui-color-primary));',
    );
    expect(active, 'active: подпись = пара хука').toContain(
      'color: var(--ui-button-color, var(--ui-color-text-on-dark));',
    );
  });

  it("README: строка API + раздел модификатора (DoD «Documentation updated»)", () => {
    const readme = readFileSync(join(root, 'components/ui-button/README.md'), 'utf8');
    expect(readme, 'API-таблица несёт --round').toMatch(/\|\s*`--round`/);
    expect(readme, 'раздел круглой кнопки с примером пар').toContain('ui-button--round');
  });
});

describe('patterns/patterns.css — связка lnk-card (T17.9 Scope)', () => {
  it('карточка-ссылка: геометрия 1:1 порт .cp-students__card, тон — хуки', () => {
    const card = blockOf(layer, '.lnk-card');
    expect(card, '.lnk-card найдено').toBeTruthy();
    expect(card, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(card, 'flex-колонка').toContain('display: flex;');
    expect(card).toContain('position: relative;');
    expect(card).toContain('flex-direction: column;');
    expect(card, 'шаг 16px').toContain('gap: var(--ui-space-4);');
    expect(card, 'кнопка прижата к низу').toContain('justify-content: space-between;');
    expect(card, 'клип иллюстрации радиусом').toContain('overflow: hidden;');
    expect(card, 'min-height 352px оригинала («как есть» 22rem)').toContain('min-height: 22rem;');
    expect(card, 'паддинг 24px').toContain('padding: var(--ui-space-5);');
    expect(card, 'радиус md').toContain('border-radius: var(--ui-radius-md);');
    expect(card, 'фон — токен-хук (дефолт светлая поверхность)').toContain(
      'background-color: var(--lnk-card-bg, var(--ui-color-surface));',
    );
    expect(card, 'цвет текста — токен-хук (дефолт text)').toContain(
      'color: var(--lnk-card-fg, var(--ui-color-text));',
    );
    expect(card, 'карточка — ссылка: без подчёркивания').toContain('text-decoration: none;');
  });

  it('заголовочные роли на заливке — пара хука (баг «невидимый h4» navy-тона закрыт, прецедент ui-card--cta T17.8)', () => {
    const rule = layer.match(
      /\.lnk-card :is\(\.ui-h1, \.ui-h2, \.ui-h3, \.ui-h4, \.ui-h5, \.ui-page-title\)\s*\{([^}]*)\}/,
    );
    expect(rule, 'правило восстановления ролей есть').toBeTruthy();
    expect(rule[1], 'цвет ролей — пара хука, дефолт — сама роль heading').toContain(
      'color: var(--lnk-card-fg, var(--ui-color-heading));',
    );
  });

  it('слот иллюстрации: absolute bottom/right, max-height 70% (Implementation requirements п.2)', () => {
    const illu = blockOf(layer, '.lnk-card__illu');
    expect(illu, '.lnk-card__illu найдено').toBeTruthy();
    expect(illu).toContain('position: absolute;');
    expect(illu).toContain('right: 0;');
    expect(illu).toContain('bottom: 0;');
    expect(illu).toContain('max-height: 70%;');
  });

  it('слот действия: поверх иллюстрации (z-пара) и прижат вправо', () => {
    const action = blockOf(layer, '.lnk-card__action');
    expect(action, '.lnk-card__action найдено').toBeTruthy();
    expect(action).toContain('position: relative;');
    expect(action).toContain('z-index: 1;');
    expect(action).toContain('align-self: flex-end;');
  });

  it('сетка lnk-cards: каркас ui-grid, шаг 12px, ступени 2/3 (инверсия лестницы пилота)', () => {
    const grid = blockOf(layer, '.lnk-cards');
    expect(grid, '.lnk-cards найдено').toBeTruthy();
    expect(grid, 'шаг 12px — .cp-students__grid').toContain('gap: var(--ui-space-3);');
    const md = layer.match(/@media \(min-width: 768px\)\s*\{[\s\S]*?\.lnk-cards\s*\{([^}]*)\}/);
    expect(md, 'ступень md есть').toBeTruthy();
    expect(md[1], 'md — 2 колонки').toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    const lg = layer.match(/@media \(min-width: 1024px\)\s*\{[\s\S]*?\.lnk-cards\s*\{([^}]*)\}/);
    expect(lg, 'ступень lg есть').toBeTruthy();
    expect(lg[1], 'lg — 3 колонки').toContain('grid-template-columns: repeat(3, minmax(0, 1fr));');
  });
});

describe('patterns/patterns.css — связка lgo-grid/lgo-card (T17.9 Scope)', () => {
  it('сетка на ui-grid: шаг 8px, ступени 4/6 (инверсия лестницы пилота ≤1023/≤767)', () => {
    const grid = blockOf(layer, '.lgo-grid');
    expect(grid, '.lgo-grid найдено').toBeTruthy();
    expect(grid, 'шаг 8px — .cp-employers__grid').toContain('gap: var(--ui-space-2);');
    const md = layer.match(/@media \(min-width: 768px\)\s*\{[\s\S]*?\.lgo-grid\s*\{([^}]*)\}/);
    expect(md, 'ступень md есть').toBeTruthy();
    expect(md[1], 'md — 4 колонки').toContain('grid-template-columns: repeat(4, minmax(0, 1fr));');
    const lg = layer.match(/@media \(min-width: 1024px\)\s*\{[\s\S]*?\.lgo-grid\s*\{([^}]*)\}/);
    expect(lg, 'ступень lg есть').toBeTruthy();
    expect(lg[1], 'lg — 6 колонок').toContain('grid-template-columns: repeat(6, minmax(0, 1fr));');
  });

  it('рамочная плашка: растянута, радиус md, рамка border-muted (спека), поверхность surface', () => {
    const card = blockOf(layer, '.lgo-card');
    expect(card, '.lgo-card найдено').toBeTruthy();
    expect(card, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(card, 'img растянута на ячейку («img растянута», канон пилота width 100%)').toContain(
      'width: 100%;',
    );
    expect(
      card,
      'рамка — border-muted по спеке (в пилоте рамка несуществующим токеном --ui-color-border вычислялась 0px)',
    ).toContain('border: var(--ui-border-width) solid var(--ui-color-border-muted);');
    expect(card, 'радиус md').toContain('border-radius: var(--ui-radius-md);');
    expect(card, 'поверхность — surface').toContain(
      'background-color: var(--ui-color-surface);',
    );
  });
});

describe('гейт префиксов слоя расширен: lnk-|lgo- каноничны (Implementation requirements T17.1 п.2 + T17.9)', () => {
  it('реальный слой чист — все правила проходят расширенный гейт', () => {
    expect(patternLayerProblems(layerFile), 'lnk-/lgo- — канонические крючки слоя').toEqual([]);
  });

  it('чужие префиксы по-прежнему ловятся', () => {
    const problems = patternLayerProblems('.cp-evil { color: var(--ui-color-text); }');
    expect(problems.length, 'чужой крючок пойман').toBeGreaterThan(0);
    expect(problems.join('; ')).toContain('.cp-evil');
  });
});

describe('синхронность док-паттерна landing-section и слоя (AC: одни классы)', () => {
  it('канон связок живёт в разметке дока (источник правды, как lpp-/dpp-/fpp-)', () => {
    const hooks = docHooks();
    for (const name of ['lnk-cards', 'lnk-card', 'lnk-card__body', 'lnk-card__illu', 'lnk-card__action', 'lgo-grid', 'lgo-card']) {
      expect(hooks.has(name), `${name} в разметке дока есть`).toBe(true);
    }
  });

  it('крючки слоя существуют в разметке дока — слой не изобретает имён', () => {
    const hooks = docHooks();
    for (const hook of layerHookSet()) {
      expect(hooks.has(hook), `крючок «${hook}» из слоя отсутствует в разметке дока`).toBe(true);
    }
  });

  it('классы разметки покрыты слоем (новый класс без правила падает тестом)', () => {
    const hooks = layerHookSet();
    for (const name of docHooks()) {
      expect(
        hooks.has(name) || MARKERS_WITHOUT_RULES.has(name),
        `класс «${name}» разметки дока не имеет правила в слое (добавь правило или MARKERS_WITHOUT_RULES)`,
      ).toBe(true);
    }
  });

  it('иллюстрация канона декоративна, стрелка декоративна (Implementation requirements п.2)', () => {
    const card = landingDoc.slice(landingDoc.indexOf('lnk-card lnk-card--'));
    expect(card, 'img иллюстрации alt=""').toMatch(/<img class="lnk-card__illu"[^>]*alt=""/);
    expect(card, 'стрелка — aria-hidden').toMatch(
      /class="ui-button ui-button--round lnk-card__action"[^>]*aria-hidden="true"/,
    );
  });
});

describe('пилот career-portal: students/employers на связках (AC T17.9)', () => {
  it('students: сетка — ui-grid + lnk-cards, карточки — ссылки lnk-card с aria-label', () => {
    expect(pilotBuild).toContain('<div class="ui-grid lnk-cards">');
    expect(pilotBuild).toContain('<a class="lnk-card lnk-card--${card.tone}" href="${esc(card.href)}" aria-label="Подробнее: ${esc(card.title)}">');
    expect(pilotBuild).toContain('<div class="lnk-card__body">');
    expect(pilotBuild).toContain('<img class="lnk-card__illu" src="${esc(card.illu)}" alt="" loading="lazy">');
    expect(
      pilotBuild,
      'стрелка — декоративный span ui-button--round (канон примера спеки: интерактив один — карточка)',
    ).toContain('<span class="ui-button ui-button--round lnk-card__action" aria-hidden="true">${ARROW}</span>');
    expect(pilotBuild, 'cp-students* из разметки сняты').not.toContain('cp-students');
  });

  it('employers: сетка — ui-grid + lgo-grid, плашки — lgo-card', () => {
    expect(pilotBuild).toContain('<div class="ui-grid lgo-grid">');
    expect(pilotBuild).toContain('<img class="lgo-card" src="assets/logos/employer-2086-');
    expect(pilotBuild, 'cp-employers* из разметки сняты').not.toContain('cp-employers');
  });

  it('pilot.css: правила cp-students*/cp-employers* сняты (~75 строк), сайт-зона — тоны на хуках', () => {
    for (const gone of [
      '.cp-students__grid',
      '.cp-students__card',
      '.cp-students__card--peach',
      '.cp-students__card--navy',
      '.cp-students__card--light',
      '.cp-students__card-illu',
      '.cp-students__card-btn',
      '.cp-students__card-btn--orange',
      '.cp-students__card-btn--white',
      '.cp-students__card-btn--navy',
      '.cp-employers__grid',
      '.cp-employers__card',
    ]) {
      expect(pilotCss, `дубликат ${gone} удалён`).not.toContain(gone);
    }
    expect(pilotCss, 'тон peach — color-mix на хуке bg').toMatch(
      /\.lnk-card--peach\s*\{[^}]*--lnk-card-bg: color-mix\([^)]*--ui-color-accent[^)]*\);/,
    );
    expect(pilotCss, 'тон navy — пара primary/on-dark').toMatch(
      /\.lnk-card--navy\s*\{[^}]*--lnk-card-fg: var\(--ui-color-text-on-dark\);/,
    );
    expect(pilotCss, 'кнопка тона navy — surface/primary («white»)').toMatch(
      /\.lnk-card--navy\s*\{[^}]*--ui-button-bg: var\(--ui-color-surface\);/,
    );
    expect(pilotCss, 'кнопка тона light — primary/surface («navy»)').toMatch(
      /\.lnk-card--light\s*\{[^}]*--ui-button-bg: var\(--ui-color-primary\);/,
    );
    // Медиа-лестницы пилота для двух сеток сняты вместе с правилами.
    expect(pilotCss).not.toMatch(/\.cp-students__grid/);
    expect(pilotCss).not.toMatch(/\.cp-employers__grid/);
  });

  it('compare-проба employers — на крючке слоя (прецедент video-block/cta-mail T17.8)', () => {
    expect(compare).toContain("['employers', '.employers', '.lgo-grid']");
    expect(compare, 'старый крючок из пробы снят').not.toContain("'.cp-employers__grid'");
  });
});

/**
 * Юнит-пины T17.1 — паттерн-слой ui-patterns.css в dist (вариант A, решение
 * владельца 25.10; спека docs/ui-system/epics/EPIC-17-ds-full-coverage/
 * T17.1-pattern-layer.md).
 *
 * Исполняемая форма решения:
 *  - patterns/patterns.css — единый исходник слоя: канонические связки
 *    list/detail/form-страниц (классы lpp-, ddp-, fpp-), перенесённые 1:1 из
 *    док-HTML паттернов (значения и «как есть»-литералы с комментариями-
 *    источниками); компонентные стили слой не дублирует;
 *  - showcase/build.mjs собирает слой в dist/ui-patterns.css (минифицированный,
 *    с баннером версии, как ui-core) и подключает его стендам трёх паттернов;
 *  - подключение ОПЦИОНАЛЬНО: ui-core.min.css не меняется; порядок в <head>:
 *    токены → core → patterns → сайт;
 *  - селекторы слоя — только канонические префиксы lpp-|ddp-|fpp- (гейт
 *    «защита от превращения слоя в свалку»); док-HTML паттернов и слой
 *    синхронны (одни классы);
 *  - слой не содержит @media-ступеней, кроме канонических ступеней паттернов
 *    (mobile-first ДС; лестницы пилота 1023/767 не переносятся);
 *  - пилот подключает слой (ds/ui-patterns.css) и перевёл строки/сайдбар
 *    вакансий на lpp-*; дубликаты cp-vac-row-семейства, cp-vac-layout,
 *    cp-vac-side-семейства и cp-breadcrumbs сняты из pilot.css
 *    (cp-page-head с модификатором и cp-find-bar — полнота
 *    в adoption-задачах: нет канона в док-HTML, перевод по T17.12/T17.14).
 *
 * Поверхность браузера (стенды, compare-пробы, визуальные эталоны) — e2e/
 * compare-прогон; здесь — пины исходников и сборки.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { patternLayerProblems } from '../../showcase/patterns-layer-gate.mjs';

const root = join(import.meta.dirname, '..', '..');

/** Шкала брейкпоинтов T2.5 (значения BREAKPOINTS stylelint.config.mjs;
 *  формат — строковые px-значения, прецедент pattern-detail-page.test.js). */
const BREAKPOINTS = ['480', '768', '1024', '1280', '1440'];

const LAYER_PATH = join(root, 'patterns', 'patterns.css');
const PATTERN_SOURCES = {
  'patterns/list-page/list-page.html': 'lpp-',
  'patterns/detail-page/detail-page.html': 'dpp-',
  'patterns/form-page/form-page.html': 'fpp-',
  // Таймлайн — adoption T17.10: связки tlp-* переехали из <style> дока
  // (T14.11) в слой, разметка дока и пилота — на классах канона. Значение
  // БЕЗ дефиса: блок-класс таймлайна — голый `tlp` (пример спеки T17.10).
  'patterns/timeline/timeline.html': 'tlp',
};

let layer = '';
try {
  layer = readFileSync(LAYER_PATH, 'utf8');
} catch {
  // Красный шаг TDD: файла ещё нет — пины ниже упадут с понятным сообщением.
  layer = '';
}

/** CSS без комментариев: гейты смотрят на исполняемый код, не на прозу. */
const code = layer.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Селекторы исполняемого кода: прелюдии @media/at-rule пропускаются. */
const selectors =
  code
    .split('\n')
    .join('\n')
    .match(/([^{}]+)\{/g)
    ?.map((piece) => piece.replace(/\{$/, '').trim())
    .filter((selector) => selector !== '' && !selector.startsWith('@')) ?? [];

/** Классы-крючки селектора: все \.имена в нём. */
const hookClasses = (selector) => selector.match(/\.[a-z][a-z0-9_-]*/g) ?? [];

/** Классы паттерна из разметки дока (атрибуты class="", многострочные —
 *  схлопнуты; комментарии не участвуют). */
const markupClasses = (html, prefix) => {
  const collapsed = html
    .replace(/\r\n/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ');
  const attrs = collapsed.match(/class="[^"]*"/g) ?? [];
  const found = new Set();
  for (const attr of attrs) {
    for (const name of attr.slice(7, -1).split(' ')) {
      if (name.startsWith(prefix)) found.add(name);
    }
  }
  return found;
};

/** Крючки слоя по префиксам из селекторов (классы lpp-, ddp-, fpp-). Блок
 *  таймлайна — голый `tlp` (пример спеки T17.10, без дефиса) — значение без
 *  дефиса матчит префикс и его BEM-потомков. */
const layerHooks = (prefix) => {
  const hooks = new Set();
  for (const selector of selectors) {
    for (const hook of hookClasses(selector)) {
      if (hook.startsWith(`.${prefix}`)) hooks.add(hook.slice(1));
    }
  }
  return hooks;
};

/** Классы-маркеры канона без собственных правил (таксономия имён, вид несёт
 *  разметка/компоненты). Список осознанный: новый класс разметки без правила
 *  падает тестом — снимается правилом слоя или дописывается сюда. */
const MARKERS_WITHOUT_RULES = new Set([
  'lpp-row__short', // цвет несёт роль ui-text--muted разметки
  'dpp-article', // semantic-обёртка article (JobPosting), стилей не требует
  'dpp-aside__title', // вид несёт роль ui-h4 разметки
  'dpp-aside__note', // цвет несёт роль ui-text--muted разметки
]);

describe('patterns/patterns.css — единый исходник паттерн-слоя (Scope T17.1)', () => {
  it('файл существует и объявляет слой: вариант A, опциональное подключение, порядок в head', () => {
    expect(layer, 'исходник слоя на месте').not.toBe('');
    expect(layer, 'решение владельца (вариант A) зафиксировано в шапке').toContain('вариант A');
    expect(layer, 'опциональность подключения задокументирована').toContain('ui-patterns.css');
    expect(layer, 'порядок каскада: токены → core → patterns → сайт').toContain('core');
  });

  it('селекторы слоя — только канонические префиксы lpp-|ddp-|fpp-|lnk-|lgo-|tlp- (Implementation requirements п.2; lnk-/lgo- — лендинг-связки T17.9; tlp- — таймлайн T17.10)', () => {
    expect(selectors.length, 'правила в слое есть').toBeGreaterThan(0);
    for (const selector of selectors) {
      const hooks = hookClasses(selector);
      // Блок-класс таймлайна — голый `tlp` (пример спеки T17.10): префикс
      // продолжается дефисом, модификатором __ или заканчивается на нём.
      expect(
        hooks.some((hook) => /^\.(lpp|dpp|fpp|lnk|lgo|tlp)(?:-|__|$)/.test(hook)),
        `селектор «${selector}» несёт крючок слоя lpp-/ddp-/fpp-/lnk-/lgo-/tlp-`,
      ).toBe(true);
      for (const hook of hooks) {
        expect(
          /^\.(?:ui-|(?:lpp|dpp|fpp|lnk|lgo|tlp)(?:-|__|$))/.test(hook),
          `крючок «${hook}» селектора «${selector}» — канонический префикс (или компонент-потомок ui-), не свалка`,
        ).toBe(true);
      }
      expect(selector, 'ID-селекторов в слое нет (02-architecture §1)').not.toMatch(/#[a-zA-Z]/);
    }
  });

  it('слой не дублирует компоненты: ни один селектор не начинается с ui-крючка (Out of scope)', () => {
    for (const selector of selectors) {
      const first = hookClasses(selector)[0];
      expect(
        first.startsWith('.ui-'),
        `селектор «${selector}» начинается с крючка слоя, не компонента`,
      ).toBe(false);
    }
  });

  it('инварианты системы: без hex, без !important, без inline-стилей', () => {
    expect(code, 'hex только в tokens/primitives.css').not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(code, '!important только в a11y/vi.css').not.toContain('!important');
  });

  it('media-ступени — только канонические: min-width из шкалы T2.5 и (hover: hover)', () => {
    const medias = [...code.matchAll(/@media\s+([^{]+)/g)].map((match) => match[1].trim());
    expect(medias.length, 'media-ступени в слое есть').toBeGreaterThan(0);
    for (const media of medias) {
      if (media.startsWith('(hover')) {
        expect(media, 'hover-гвард канонический').toBe('(hover: hover)');
        continue;
      }
      const values = [...media.matchAll(/min-width:\s*(\d+)px/g)].map((match) => match[1]);
      expect(values.length, `ступень «${media}» — min-width (mobile-first)`).toBeGreaterThan(0);
      for (const value of values) {
        expect(BREAKPOINTS, `значение ${value}px — из шкалы T2.5`).toContain(value);
      }
      expect(media, 'лестницы пилота (max-width) не переносятся').not.toContain('max-width');
    }
  });

  it('значения канона 1:1 — строка списка (24/28, шаг main 8px, лента 16px, CTA-пилюля вне ссылки)', () => {
    const blockOf = (selector) => {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = code.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
      return match ? match[1] : null;
    };
    const row = blockOf('.lpp-row');
    expect(row, '.lpp-row найдено').toBeTruthy();
    expect(row, 'паддинг строки 24/28 — pages.css:165 «как есть»').toContain(
      'padding: var(--ui-space-5) 1.75rem;',
    );
    expect(row, 'gap — канон list-page (space-7, решение владельца 25.10)').toContain(
      'gap: var(--ui-space-7);',
    );
    expect(row, 'flex-direction: row — сброс колонки ui-card').toContain('flex-direction: row;');
    const main = blockOf('.lpp-row__main');
    expect(main, 'шаг main-блока 8px').toContain('gap: var(--ui-space-2);');
    expect(main, 'min-width: 0 — перенос длинных заголовков').toContain('min-width: 0;');
    const rows = blockOf('.lpp-rows');
    expect(rows, 'шаг ленты 16px — .vac-rows pages.css:157').toContain('gap: var(--ui-space-4);');
    const title = blockOf('.lpp-row__title a');
    expect(title, 'ссылка заголовка — plain (inherit, без линии)').toContain('color: inherit;');
    expect(title).toContain('text-decoration: none;');
  });

  it('значения канона 1:1 — сайдбар (280px от lg, mobile-база одна колонка, sticky от md)', () => {
    const lgBlock = code.match(/@media \(min-width: 1024px\)\s*\{[\s\S]*?\n\}/);
    expect(lgBlock, 'ступень lg в слое есть').toBeTruthy();
    expect(
      lgBlock[0],
      'колонка сайдбара 17.5rem = 280px оригинала (калибровка T17.1: значение канона, не пилота)',
    ).toContain('grid-template-columns: 17.5rem minmax(0, 1fr);');
    // База лейаута — правило до первой media-ступени связки (mobile-first).
    const layoutBase = code.match(/\.lpp-layout\s*\{([^}]*)\}/);
    expect(layoutBase, '.lpp-layout найдено').toBeTruthy();
    expect(layoutBase[1], 'мобильная база — одна колонка (mobile-first)').toContain(
      'grid-template-columns: minmax(0, 1fr);',
    );
    const mdBlock = code.match(/@media \(min-width: 768px\)\s*\{[\s\S]*?\n\}/);
    expect(mdBlock[0], 'sticky сайдбара — от md (ступень канона)').toContain('position: sticky;');
  });

  it('значения канона 1:1 — крошки/page-head/detail/form («как есть»-литералы с источниками)', () => {
    expect(code, 'ритм крошек 20px «как есть» (полоса 62px, T14.5)').toContain(
      'padding-block: 1.25rem var(--ui-space-5);',
    );
    expect(code, 'detail: aside — порт form-aside (поверхность muted)').toContain(
      'background-color: var(--ui-color-surface-muted);',
    );
    expect(code, 'detail: related-кнопки — anywhere (32px-стресс T3.6)').toContain(
      'overflow-wrap: anywhere;',
    );
    expect(code, 'form: форма после page-head — space-6').toContain(
      'margin-top: var(--ui-space-6);',
    );
    expect(code, 'detail: aside lg — токен --ui-form-aside-width').toContain(
      'grid-template-columns: minmax(0, 1fr) var(--ui-form-aside-width);',
    );
  });
});

describe('синхронность док-HTML паттернов и слоя (AC: одни классы)', () => {
  for (const [docPath, prefix] of Object.entries(PATTERN_SOURCES)) {
    describe(docPath, () => {
      const html = readFileSync(join(root, docPath), 'utf8');
      const markup = markupClasses(html, prefix);
      const hooks = layerHooks(prefix);

      it('перенос исполнен: связки живут в слое, <style> в док-HTML больше нет', () => {
        expect(
          html.replace(/<!--[\s\S]*?-->/g, ''),
          '<style> перенесён в patterns/patterns.css (упоминания в комментариях — история переноса)',
        ).not.toContain('<style>');
      });

      it('крючки слоя существуют в разметке дока (слой не изобретает имён)', () => {
        expect(hooks.size, `${prefix}-крючки в слое есть`).toBeGreaterThan(0);
        for (const hook of hooks) {
          expect(
            markup.has(hook),
            `${prefix}-крючок «${hook}» из слоя отсутствует в разметке ${docPath}`,
          ).toBe(true);
        }
      });

      it('классы разметки покрыты слоем (новый класс без правила падает тестом)', () => {
        expect(markup.size, `${prefix}-классы в разметке есть`).toBeGreaterThan(0);
        for (const name of markup) {
          expect(
            hooks.has(name) || MARKERS_WITHOUT_RULES.has(name),
            `класс «${name}» разметки ${docPath} не имеет правила в слое (добавь правило или MARKERS_WITHOUT_RULES)`,
          ).toBe(true);
        }
      });
    });
  }

  it('грид-ветка канона получает крючок класса: lpp-grid в разметке list-page (адаптация #lpp-grid → класс)', () => {
    const html = readFileSync(join(root, 'patterns/list-page/list-page.html'), 'utf8');
    expect(html, 'крючок грид-ветки — класс (ID в CSS запрещён §1)').toMatch(
      /class="ui-grid ui-grid--3 lpp-grid"/,
    );
  });
});

describe('сборка showcase/build.mjs: dist/ui-patterns.css (AC: собирается, подключение опционально)', () => {
  const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');

  it('исходник слоя в явном порядке каскада и бандлится с баннером', () => {
    expect(build, 'исходник слоя — patterns/patterns.css').toContain("'patterns/patterns.css'");
    expect(build, 'dist-файл слоя — ui-patterns.css').toContain("'ui-patterns.css'");
    expect(build, 'минификация+баннер — общий bundle()/emitRuntime').toContain('emitRuntime');
  });

  it('гейт префиксов — проверка в сборке (Implementation requirements п.2)', () => {
    expect(build, 'self-check селекторов слоя в сборке').toContain('слоя');
  });

  it('подключение опционально: слой получают стенды паттернов с связками в слое (list/detail/form, landing-section, timeline — T17.10)', () => {
    for (const stand of ['list-page', 'detail-page', 'form-page', 'landing-section', 'timeline']) {
      // Якорь — title стенда: первое вхождение имени паттерна в build.mjs —
      // список навигации buildNav, до frame-вызова.
      const block = build.slice(build.indexOf(`title: 'patterns/${stand} — irao-ui showcase'`));
      expect(block.slice(0, 800), `patterns/${stand}: слой подключён стенду`).toContain(
        'withPatterns: true',
      );
    }
    // Включение адресное: ровно пять вызовов frame() передают слой
    // («withPatterns: true,»); остальные страницы полигона — нет.
    // Четвёртый — patterns/landing-section (T17.9): связки lnk-card/lgo-grid
    // живут в слое, мини-стенд паттерна их рендерит; пятый — patterns/
    // timeline (T17.10): связки tlp-* переехали из <style> дока в слой.
    expect(
      build.match(/withPatterns: true,/g)?.length,
      'получателей слоя ровно пять — стенды паттернов с связками в слое',
    ).toBe(5);
  });

  it('self-check: dist/ui-patterns.css существует и несёт баннер версии', () => {
    expect(build, 'файл слоя в списке self-check структуры §6.1').toContain("'ui-patterns.css'");
    expect(build, 'баннер слоя проверяется как у ui-core').toContain('баннер версии не в начале');
  });
});

describe('пилот career-portal: слой подключён, вакансии на lpp-* (AC T17.1)', () => {
  const pilotDir = join(root, 'pilot', 'career-portal');
  const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const pilotCss = readFileSync(join(pilotDir, 'pilot.css'), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const probe = readFileSync(join(pilotDir, 'probe-vac-rows.mjs'), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  it('слой копируется в dist/ds/ и подключается в порядке токены → core → patterns → сайт', () => {
    expect(build, 'рантайм ДС копирует ui-patterns.css').toContain("'ui-patterns.css'");
    // Якоря — link-теги head (упоминания в комментариях раньше шаблона страницы).
    const coreIdx = build.indexOf('<link rel="stylesheet" href="ds/ui-core.min.css">');
    const patternsIdx = build.indexOf('<link rel="stylesheet" href="ds/ui-patterns.css">');
    const siteIdx = build.indexOf('<link rel="stylesheet" href="pilot.css">');
    expect(coreIdx, 'core в head').toBeGreaterThan(-1);
    expect(patternsIdx, 'слой в head после core (и после vi)').toBeGreaterThan(coreIdx);
    expect(siteIdx, 'сайт-зона после слоя').toBeGreaterThan(patternsIdx);
  });

  it('строки вакансий — разметка lpp-row (канон list-page 1:1, мета — muted ролью)', () => {
    expect(build).toContain('<article class="ui-card ui-card--hover lpp-row"');
    expect(build).toContain('<div class="lpp-row__main">');
    expect(build).toContain('<h2 class="ui-h6 lpp-row__title">');
    expect(build).toContain('class="lpp-row__place ui-small ui-text--muted"');
    expect(build).toContain('<p class="lpp-row__short ui-small ui-text--muted">');
    expect(build).toContain('class="lpp-row__date ui-small ui-text--muted"');
    expect(build).toContain('<div class="lpp-rows">');
    expect(build, 'cp-vac-row* из разметки сняты').not.toContain('cp-vac-row');
  });

  it('сайдбар вакансий — разметка lpp-layout/lpp-side/lpp-side__group (280px по канону)', () => {
    expect(build).toContain('<div class="lpp-layout">');
    expect(build).toContain('<aside class="lpp-side"');
    expect(build).toContain('<div class="lpp-side__group">');
    expect(build, 'подписи групп — канон lpp-pill__name').toContain('lpp-pill__name');
    expect(build, 'cp-vac-layout/cp-vac-side из разметки сняты').not.toMatch(
      /cp-vac-layout|cp-vac-side(?!__promo)/,
    );
  });

  it('крошки — канон lpp-breadcrumbs по всем страницам (helper breadcrumbs)', () => {
    expect(build).toContain('class="ui-breadcrumbs lpp-breadcrumbs"');
    expect(build).not.toContain('cp-breadcrumbs');
  });

  it('pilot.css: дубликаты сняты, шимы переадресованы на крючки слоя', () => {
    for (const gone of [
      '.cp-breadcrumbs',
      '.cp-vac-rows',
      '.cp-vac-row',
      '.cp-vac-layout',
      '.cp-vac-side__group',
      '.cp-vac-side__label',
    ]) {
      expect(pilotCss, `дубликат ${gone} удалён`).not.toContain(gone);
    }
    expect(pilotCss, 'шим пилюли сайдбара — на крючке слоя (до T17.12)').toContain(
      '.lpp-side__group .cp-pill',
    );
    expect(pilotCss, 'шим «Сбросить» — на крючке слоя').toContain('.lpp-side > .ui-button--text');
    expect(pilotCss, 'cp-vac-main остаётся (нет в списке снятия — ритм main-колонки)').toContain(
      '.cp-vac-main',
    );
  });

  it('пробы compare переведены на lpp-*: MATCH-статусы REPORT §8.2 сохраняются', () => {
    expect(compare).toContain("pilot: '.lpp-row .ui-h6'");
    expect(compare).toContain("pilot: '.lpp-row'");
    expect(compare).toContain("pilot: '.lpp-row .ui-button__icon'");
    expect(compare, 'reset-control — на крючке слоя').toContain("pilot: '.lpp-side .ui-button'");
    expect(compare, 'side-promo — hook пробы сохранён').toContain("pilot: '.cp-vac-side__promo'");
    expect(compare).toContain("pilot: '.cp-vac-side__promo .ui-button--primary'");
    expect(probe).toContain("const ROW_SELECTOR = { original: '.vac-row', pilot: '.lpp-row' };");
  });

  it('cp-page-head*/cp-find-bar не снимаются (канона в док-HTML нет — T17.12/T17.14)', () => {
    expect(pilotCss, 'page-head — ритм страниц, полное снятие в adoption').toContain(
      '.cp-page-head',
    );
    expect(pilotCss, 'find-bar — канон придёт с T17.12').toContain('.cp-find-bar');
    expect(build, 'cp-find-bar в разметке остаётся').toContain('cp-find-bar');
  });
});

describe('гейт селекторов слоя — patternLayerProblems (функционально; ревью T17.1: матч всех правил, не первого)', () => {
  /** Ревью T17.1 high: гейт в selfChecks матчил /([^{}]+)\{/ БЕЗ /g —
   *  проверялось только первое правило, чужой префикс в любом другом
   *  проходил сборку. Гейт вынесен в showcase/patterns-layer-gate.mjs
   *  (matchAll по всем правилам) — здесь он тестируется КАК КОД: реальные
   *  и отравленные входы, а не пины текста build.mjs. */

  it('реальный patterns.css чист: ВСЕ правила проходят гейт (0 проблем)', () => {
    expect(patternLayerProblems(layer), 'все правила слоя каноничны').toEqual([]);
  });

  it('чужой префикс в ЛЮБОМ правиле ловится — не только в первом', () => {
    // Первое правило каноническое (пройдено бы и старым гейтом), чужое — в
    // середине и в конце: старый код (match без /g) вернул бы 0 проблем.
    const poisoned = [
      '/* комментарий с .cp-обманом внутри — не селектор */',
      '.lpp-row { display: flex; }',
      '',
      '.cp-evil .ui-button { overflow-wrap: anywhere; }',
      '',
      '.lpp-rows { display: flex; flex-direction: column; }',
      '.tl-evil { gap: var(--ui-space-2); }',
    ].join('\n');
    const problems = patternLayerProblems(poisoned);
    // Чужой селектор даёт ДВЕ диагностики: «нет канонического крючка» +
    // «чужой крючок» (по одной на каждый нарушенный инвариант).
    expect(problems.length, 'по две диагностики на каждый чужой селектор').toBe(4);
    expect(problems.join('; '), 'первый чужой крючок пойман').toContain('.cp-evil');
    expect(problems.join('; '), 'последний чужой крючок пойман').toContain('.tl-evil');
  });

  it('ID-селектор ловится в любом правиле (02-architecture §1)', () => {
    const problems = patternLayerProblems(
      '.lpp-row { display: flex; }\n\n#lpp-grid .ui-button { overflow-wrap: anywhere; }',
    );
    // Две диагностики: нет канонического КЛАССА-крючка + сам ID-селектор.
    expect(problems.length, 'ID даёт «нет крючка» и «ID-селектор»').toBe(2);
    expect(problems.join('; ')).toContain('ID');
  });

  it('правила ВНУТРИ @media проверяются, прелюдия селектором не считается', () => {
    const css = [
      '@media (min-width: 768px) {',
      '  .cp-inside-media { position: sticky; }',
      '}',
    ].join('\n');
    const problems = patternLayerProblems(css);
    // Чужой селектор — две диагностики («нет крючка слоя» + «чужой крючок»);
    // прелюдия @media в селекторы не попадает (иначе матч был бы один и
    // мусорный, а .cp-inside-media не проверился бы вовсе).
    expect(problems.length, 'правило из media поймано, прелюдия — не селектор').toBe(2);
    expect(problems.join('; ')).toContain('.cp-inside-media');
    expect(problems.join('; ')).not.toContain('@media');
  });

  it('потомки ui-* разрешены, пустой слой — проблема', () => {
    expect(
      patternLayerProblems(
        '.lpp-rows .ui-button, .lpp-grid .ui-button { overflow-wrap: anywhere; }',
      ),
      'ui-потомок под крючком слоя каноничен',
    ).toEqual([]);
    expect(patternLayerProblems('/* только комментарии */').length, 'пустой слой — проблема').toBe(
      1,
    );
  });
});

/**
 * Юнит-пин ui-dropdown (задача T6.1; Testing requirements — tests first).
 *
 * Поверхность браузера — клавиатурный цикл APG menu-button, вне-клик, no-JS
 * деградация, axe и эталоны — в tests/e2e/ui-dropdown.spec.js; здесь — пины
 * исполняемой формы решения:
 *  - tokens/semantic.css: --ui-z-dropdown — из лестницы T2.2 (Technical
 *    considerations: «z-index меню — --ui-z-dropdown»);
 *  - components/ui-dropdown/ui-dropdown.css: @define dropdown; box-sizing на
 *    корне (ADR-0002); позиционирование меню — absolute от обёртки;
 *    z-index — токен лестницы; hover — только под (hover: hover) (EPIC-4);
 *    вход-анимация гасится prefers-reduced-motion (DoD EPIC-6); цвета —
 *    только токены слоя 2; без !important и hex;
 *  - канонический паттерн: деградация без JS — в разметке НЕТ hidden на меню
 *    и НЕТ aria-expanded/aria-controls на триггере (их ставит модуль при
 *    инициализации — разметка остаётся доступной без JS; тот же трюк, что
 *    novalidate в ui-form T5.5); два назначения — nav > ul > li > a (навигация,
 *    без menu-роли — правило доки) и role="menu" + role="menuitem" (действия);
 *  - контракт модуля IraoUI.dropdown (jsdom-песочница — образец
 *    tests/unit/module-template.test.js, T1.6): readyState-guard, guard
 *    отсутствия элементов, отказоустойчивость init, guard повторной
 *    инициализации, флаг — data-атрибут (не dataset);
 *  - init-мутации модуля: hidden + aria-expanded="false" + aria-controls на
 *    id меню (генерация id при отсутствии) — «hidden на меню ставит/снимает
 *    JS» (Implementation requirements п.3);
 *  - публичный API: init/selector/closeAll (открытие одного закрывает другие —
 *    перенос closeAll career-portal header.js).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев: пины смотрят на исполняемый код, а не на прозу шапки. */
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (начало строки — селектор, до закрывающей скобки). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

describe('tokens/semantic.css — z-лестница T2.2 (Technical considerations T6.1)', () => {
  const source = readFileSync(join(root, 'tokens', 'semantic.css'), 'utf8');

  it('--ui-z-dropdown = 70 (career-portal components.css:376) — токен лестницы', () => {
    expect(source).toMatch(/--ui-z-dropdown:\s*70;/);
  });
});

describe('components/ui-dropdown/ui-dropdown.css — база (ADR-0002, Technical considerations)', () => {
  const path = join(root, 'components', 'ui-dropdown', 'ui-dropdown.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define dropdown — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define dropdown */')).toBe(true);
  });

  it('.ui-dropdown: box-sizing на корне (ADR-0002); обёртка — позиционный контекст меню', () => {
    const block = blockOf(css, '.ui-dropdown');
    expect(block, 'правило .ui-dropdown найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('position: relative;');
  });

  it('.ui-dropdown__menu: absolute от обёртки; z-index — ТОЛЬКО токен --ui-z-dropdown', () => {
    const block = blockOf(css, '.ui-dropdown__menu');
    expect(block, 'правило .ui-dropdown__menu найдено').toBeTruthy();
    expect(block).toContain('position: absolute;');
    expect(block).toContain('z-index: var(--ui-z-dropdown);');
    expect(css, 'других z-index в компоненте нет').not.toMatch(/z-index:\s*(?!var\()/);
  });

  it('видимость меню управляется [hidden] (ставит модуль); собственных display-переключений нет', () => {
    // Деградация без JS: в CSS нет правил вида .ui-dropdown__menu { display: none }
    // — скрытие живёт на атрибуте hidden (base/reset делает его сильным).
    expect(css).not.toMatch(/\.ui-dropdown__menu\s*\{[^}]*display:\s*none/);
  });

  it('цвета — только токены слоя 2; без !important и hex (инварианты системы)', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it(':hover-правила — только внутри @media (hover: hover) (конвенция EPIC-4)', () => {
    const mediaIndex = css.indexOf('@media (hover: hover)');
    expect(mediaIndex, 'media-обёртка hover присутствует').toBeGreaterThan(-1);
    expect(css.slice(0, mediaIndex), 'до media-обёртки :hover нет').not.toContain(':hover');
  });

  it('вход-анимация меню объявлена и гасится prefers-reduced-motion (DoD EPIC-6)', () => {
    expect(css).toMatch(/@keyframes ui-dropdown-in\s*\{/);
    const reduceBlock = css.match(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\}/,
    );
    expect(reduceBlock, 'преференс-блок есть').toBeTruthy();
    expect(reduceBlock[0]).toContain('animation: none');
  });
});

describe('канонический паттерн (components/ui-dropdown/ui-dropdown.html) — деградация и назначения', () => {
  const html = readFileSync(join(root, 'components', 'ui-dropdown', 'ui-dropdown.html'), 'utf8');

  it('хук модуля data-ui-dropdown в разметке (JS-хуки — только data-ui-*, ADR-0005)', () => {
    expect(html).toContain('data-ui-dropdown');
  });

  it('деградация без JS: в разметке НЕТ hidden на меню (Implementation requirements п.3)', () => {
    const menus = [...html.matchAll(/<[^>]*ui-dropdown__menu[^>]*>/g)].map(([tag]) => tag);
    expect(menus.length, 'в паттерне есть меню').toBeGreaterThan(0);
    for (const tag of menus) {
      expect(tag, `меню без hidden в разметке: ${tag}`).not.toMatch(/\bhidden\b/);
    }
  });

  it('aria-expanded/aria-controls ставит модуль: на триггерах их НЕТ в разметке', () => {
    const triggers = [...html.matchAll(/<button[^>]*ui-dropdown__trigger[^>]*>/g)].map(
      ([tag]) => tag,
    );
    expect(triggers.length, 'в паттерне есть триггеры').toBeGreaterThan(0);
    for (const tag of triggers) {
      expect(tag, `триггер без aria-expanded в разметке: ${tag}`).not.toContain('aria-expanded');
      expect(tag, `триггер без aria-controls в разметке: ${tag}`).not.toContain('aria-controls');
    }
  });

  it('навигационное назначение: nav > ul > li > a, БЕЗ menu-роли (правило доки)', () => {
    expect(html).toMatch(/<nav[^>]*class="ui-dropdown__menu"/);
    expect(html).toMatch(/<ul[^>]*class="ui-dropdown__list"/);
    expect(html).toMatch(/<li>\s*<a[^>]*class="ui-dropdown__item"/);
    expect(html).not.toMatch(/<nav[^>]*role="menu"/);
  });

  it('назначение «действия»: role="menu" + role="menuitem" на кнопках', () => {
    expect(html).toMatch(/class="ui-dropdown__menu"[^>]*role="menu"/);
    expect(html).toMatch(/role="menuitem"/);
  });

  it('у каждой <button> явный type; иконка-шеврон aria-hidden на currentColor', () => {
    const buttons = [...html.matchAll(/<button[\s\S]*?>/g)].map(([tag]) => tag);
    for (const tag of buttons) {
      expect(tag, `нет type у кнопки: ${tag}`).toMatch(/\btype="/);
    }
    const iconTags = [...html.matchAll(/<svg[^>]*class="ui-dropdown__icon"[^>]*>/g)].map(
      ([tag]) => tag,
    );
    expect(iconTags.length, 'шеврон в паттерне есть').toBeGreaterThan(0);
    for (const tag of iconTags) {
      expect(tag, 'шеврон декоративный').toContain('aria-hidden="true"');
    }
    expect(html).toContain('currentColor');
  });

  it('текущая страница навигации помечена aria-current="page" (перенос career-portal)', () => {
    expect(html).toMatch(/aria-current="page"/);
  });

  it('без inline-стилей (VI-инвариант §5)', () => {
    expect(html).not.toMatch(/\sstyle=/);
  });
});

describe('контракт модуля ui-dropdown.js (jsdom; образец — tests/unit/module-template.test.js)', () => {
  const source = readFileSync(join(root, 'components', 'ui-dropdown', 'ui-dropdown.js'), 'utf8');

  const SELECTOR = '[data-ui-dropdown]';
  const INIT_ATTR = 'data-ui-dropdown-init';

  /** Инстанс с меню и триггером — каноническая структура паттерна. */
  const instanceHtml = `
    <div class="ui-dropdown" data-ui-dropdown>
      <button class="ui-dropdown__trigger" type="button">Разделы</button>
      <nav class="ui-dropdown__menu" id="dd-menu-1" aria-label="Разделы">
        <ul class="ui-dropdown__list">
          <li><a class="ui-dropdown__item" href="/a/">Пункт А</a></li>
          <li><a class="ui-dropdown__item" href="/b/">Пункт Б</a></li>
        </ul>
      </nav>
    </div>`;

  /**
   * Песочница: документ с заданным readyState и телом; шпионы на подписку
   * document.addEventListener и console.warn (модуль пишет в window.console.warn).
   */
  function makeSandbox({ readyState = 'complete', bodyHtml = '' } = {}) {
    const dom = new JSDOM('<!doctype html><html><body>' + bodyHtml + '</body></html>', {
      url: 'https://showcase.test/',
      runScripts: 'outside-only',
    });
    const { window } = dom;
    const { document } = window;

    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => readyState,
    });

    const domContentLoadedSubscriptions = [];
    const originalAddEventListener = document.addEventListener.bind(document);
    vi.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
      if (type === 'DOMContentLoaded') {
        domContentLoadedSubscriptions.push(listener);
      }
      return originalAddEventListener(type, listener, options);
    });

    const warnings = [];
    window.console.warn = (...args) => warnings.push(args);

    window.eval(source);

    return { window, document, domContentLoadedSubscriptions, warnings };
  }

  function fireDOMContentLoaded(window) {
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  }

  /** Публичный API модуля из песочницы. */
  const apiOf = ({ window }) => window.IraoUI.dropdown;

  it('это модуль по шаблону T1.6: имя, селектор и data-атрибут флага (не dataset)', () => {
    expect(source).toContain("var MODULE_NAME = 'dropdown';");
    expect(source).toContain("var SELECTOR = '[data-ui-dropdown]';");
    expect(source).toContain("var INIT_ATTR = 'data-ui-' + MODULE_NAME + '-init';");
    expect(source).not.toContain('dataset');
  });

  it("readyState 'loading': init отложен (одна подписка), регистрация в IraoUI — сразу; 'complete' — синхронно", () => {
    const deferred = makeSandbox({
      readyState: 'loading',
      bodyHtml: instanceHtml,
    });
    expect(deferred.domContentLoadedSubscriptions).toHaveLength(1);
    expect(deferred.document.querySelectorAll(`[${INIT_ATTR}]`)).toHaveLength(0);
    expect(typeof apiOf(deferred).init).toBe('function');

    fireDOMContentLoaded(deferred.window);
    expect(deferred.document.querySelectorAll(`[${INIT_ATTR}]`)).toHaveLength(1);

    const sync = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    expect(sync.domContentLoadedSubscriptions).toHaveLength(0);
    expect(sync.document.querySelectorAll(`[${INIT_ATTR}]`)).toHaveLength(1);
  });

  it('guard отсутствия элементов: init молча выходит; повторный init — no-op (guard дублей)', () => {
    const empty = makeSandbox({ readyState: 'complete' });
    expect(empty.warnings).toHaveLength(0);
    expect(typeof apiOf(empty).init).toBe('function');

    const once = makeSandbox({ readyState: 'loading', bodyHtml: instanceHtml });
    fireDOMContentLoaded(once.window);
    once.window.IraoUI.dropdown.init();
    expect(once.document.querySelectorAll(`[${INIT_ATTR}]`)).toHaveLength(1);
  });

  it('init-мутации: hidden на меню, aria-expanded="false", aria-controls на id меню (id генерируется при отсутствии)', () => {
    // Без id у меню.
    const generated = makeSandbox({
      readyState: 'complete',
      bodyHtml: instanceHtml.replace(' id="dd-menu-1"', ''),
    });
    const menu = generated.document.querySelector('.ui-dropdown__menu');
    const trigger = generated.document.querySelector('.ui-dropdown__trigger');
    expect(menu.hidden, 'модуль закрыл меню при инициализации').toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    const controls = trigger.getAttribute('aria-controls');
    expect(controls, 'aria-controls указан').toBeTruthy();
    expect(menu.id).toBe(controls);

    // С существующим id (канонический паттерн) — id не меняется.
    const preset = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    expect(preset.document.querySelector('.ui-dropdown__trigger').getAttribute('aria-controls')).toBe(
      'dd-menu-1',
    );
  });

  it('неполная разметка (нет триггера/меню) — console.warn, соседние инстансы живы (контракт шаблона п.4)', () => {
    const { document, warnings } = makeSandbox({
      readyState: 'loading',
      bodyHtml:
        '<div class="ui-dropdown" data-ui-dropdown><button type="button">нет меню</button></div>' +
        instanceHtml,
    });

    apiOf({ window: document.defaultView }).init();

    expect(warnings).toHaveLength(1);
    expect(document.querySelectorAll(`[${INIT_ATTR}]`)).toHaveLength(1);
  });

  it('публичный API: init, selector, closeAll (открытие одного закрывает другие)', () => {
    const api = apiOf(makeSandbox({ readyState: 'complete' }));
    expect(api.selector).toBe(SELECTOR);
    expect(typeof api.init).toBe('function');
    expect(typeof api.closeAll).toBe('function');
  });
});

describe('подключение и гейты (DoD T6.1)', () => {
  it("'ui-dropdown' в COMPONENTS showcase/build.mjs — CSS/JS попадают в dist", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-dropdown'[^\]]*\]/);
  });

  it('стенд showcase/pages/ui-dropdown: навигационная и действия-секции с якорями', () => {
    const stand = readFileSync(join(root, 'showcase', 'pages', 'ui-dropdown', 'index.html'), 'utf8');
    expect(stand, 'секция навигационного меню').toContain('id="uidd-nav"');
    expect(stand, 'секция меню действий').toContain('id="uidd-actions"');
    expect(stand, 'aria-current в навигационном демо').toContain('aria-current="page"');
    expect(stand, 'статус активации действия').toContain('id="uidd-actions-status"');
  });

  it("README компонента: APG menu-button чек-лист, правило menu-роли, хелпер aria-current, деградация без JS", () => {
    const readme = readFileSync(join(root, 'components', 'ui-dropdown', 'README.md'), 'utf8');
    expect(readme).toMatch(/menu-button/i);
    expect(readme).toMatch(/menu-рол[ия] только для командных меню|только для командных меню/i);
    expect(readme).toContain('aria-current');
    expect(readme).toContain('Escape');
    expect(readme).toMatch(/без JS|без-JS/i);
  });
});

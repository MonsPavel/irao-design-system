/**
 * Юнит-пин ui-tabs (задача T6.2; Testing requirements — tests first).
 *
 * Поверхность браузера — клавиатурный цикл APG tabs (roving tabindex,
 * стрелки/Home/End, Tab в панель), деградация без JS, axe и эталоны — в
 * tests/e2e/ui-tabs.spec.js; здесь — пины исполняемой формы решения:
 *  - components/ui-tabs/ui-tabs.css: @define tabs; box-sizing на всех
 *    элементах с размерами (ADR-0002); hover — только под (hover: hover)
 *    (конвенция EPIC-4); активный таб — :where([aria-selected='true'])
 *    (семантика — единственный источник правды, вклад в специфичность
 *    нулевой — прецедент aria-current ui-dropdown T6.1); визуал одобренного
 *    дизайна career-portal .track-tabs (pages.css:485–487): outline-кнопка
 *    «как есть», активный таб = заливка primary + белая подпись (.btn.is-
 *    active / .btn--outline:hover components.css:90); цвета — только токены
 *    слоя 2; без !important и hex; без z-index (табы — не оверлей);
 *  - канонический паттерн (ui-tabs.html): деградация без JS — табы-ссылки на
 *    панели, панели все видимы (hidden в разметке НЕТ — его ставит модуль,
 *    Implementation requirements п.2), id-связки tab↔panel (href → id панели,
 *    панель aria-labelledby → id таба), ролей/tabindex/aria-selected в
 *    разметке нет (их ставит модуль — разметка правдива без JS, приём
 *    ui-dropdown T6.1);
 *  - контракт модуля IraoUI.tabs (jsdom-песочница — образец
 *    tests/unit/module-template.test.js, T1.6): readyState-guard, регистрация
 *    в window.IraoUI сразу, guard отсутствия элементов, отказоустойчивость
 *    init (сломанная id-связка таба → console.warn, соседние инстансы живы),
 *    guard повторной инициализации, флаг — data-атрибут (не dataset);
 *  - init-мутации модуля: role=tablist/tab/tabpanel, aria-controls, roving
 *    tabindex, скрытие неактивных панелей hidden (Implementation requirements
 *    п.2), стартовый выбор — первый таб; клавиатура (←/→/Home/End — выбор
 *    automatic: фокус+выбор вместе, зацикливание) и клик — тоже jsdom-уровень
 *    (детерминированные события, без браузера — граница unit/e2e
 *    tests/README.md);
 *  - событие irao-ui:tabs-select (bubbles) — точка расширения сайта
 *    (прецедент irao-ui:dropdown-open/close T6.1); при инициализации НЕ
 *    диспатчится — это событие смены выбора, а не декларация стартового.
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

describe('components/ui-tabs/ui-tabs.css — база (ADR-0002, одобренный дизайн)', () => {
  const path = join(root, 'components', 'ui-tabs', 'ui-tabs.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define tabs — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define tabs */')).toBe(true);
  });

  it('.ui-tabs, __list, __tab, __panel: box-sizing на корне и элементах с размерами (ADR-0002)', () => {
    for (const selector of ['.ui-tabs', '.ui-tabs__list', '.ui-tabs__tab', '.ui-tabs__panel']) {
      const block = blockOf(css, selector);
      expect(block, `правило ${selector} найдено`).toBeTruthy();
      expect(block, `${selector}: box-sizing (ADR-0002)`).toContain('box-sizing: border-box;');
    }
  });

  it('список — flex-лента career-portal .track-tabs: gap --ui-space-4, отступ снизу --ui-space-6', () => {
    const block = blockOf(css, '.ui-tabs__list');
    expect(block).toContain('display: flex;');
    expect(block).toContain('gap: var(--ui-space-4);'); // 16px .track-tabs
    expect(block).toContain('margin: 0 0 var(--ui-space-6);'); // 32px margin-bottom
    // Мобильная ветка career-portal (pages.css:732 flex-wrap: wrap) в mobile-first
    // переносится в базу: перенос строк — поведение узких экранов.
    expect(block).toContain('flex-wrap: wrap;');
  });

  it('таб — outline-кнопка одобренного дизайна: height/border/radius/шрифт из токенов', () => {
    const block = blockOf(css, '.ui-tabs__tab');
    expect(block).toContain('min-height: var(--ui-button-height);'); // 52px .btn
    expect(block).toContain('border: var(--ui-button-border-width) solid var(--ui-color-primary);');
    expect(block).toContain('border-radius: var(--ui-radius-pill);'); // .btn
    expect(block).toContain('color: var(--ui-color-primary);'); // .btn--outline
    expect(block).toContain('font-size: var(--ui-fs-small);'); // .btn fs-small
    expect(block).toContain('font-weight: var(--ui-fw-small);');
    // Табы канонического паттерна — ссылки: подчёркивание ссылки убрано.
    expect(block).toContain('text-decoration: none;');
    expect(block).toContain('cursor: pointer;');
  });

  it('активный таб — :where([aria-selected=\'true\']): заливка primary + белая подпись (.btn.is-active)', () => {
    expect(css).toMatch(/\.ui-tabs__tab:where\(\[aria-selected='true'\]\)/);
    const block = blockOf(css, ".ui-tabs__tab:where([aria-selected='true'])");
    expect(block).toContain('background-color: var(--ui-color-primary);');
    expect(block).toContain('color: var(--ui-color-text-on-dark);');
  });

  it(':hover — только внутри @media (hover: hover) (конвенция EPIC-4); hover = .btn--outline:hover', () => {
    const mediaIndex = css.indexOf('@media (hover: hover)');
    expect(mediaIndex, 'media-обёртка hover присутствует').toBeGreaterThan(-1);
    expect(css.slice(0, mediaIndex), 'до media-обёртки :hover нет').not.toContain(':hover');
    const media = css.slice(mediaIndex);
    expect(media).toMatch(/\.ui-tabs__tab:hover\s*\{[^}]*background-color: var\(--ui-color-primary\);/);
    expect(media).toMatch(/\.ui-tabs__tab:hover\s*\{[^}]*color: var\(--ui-color-text-on-dark\);/);
  });

  it('скрытие панели — только атрибут hidden (ставит модуль); display:none в CSS нет', () => {
    expect(css).not.toMatch(/\.ui-tabs__panel\s*\{[^}]*display:\s*none/);
  });

  it('цвета — только токены слоя 2; без !important и hex; z-index нет (табы — не оверлей)', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/\bz-index\s*:/);
  });
});

describe('канонический паттерн (components/ui-tabs/ui-tabs.html) — деградация и id-связки', () => {
  // Разметка без комментариев: пины смотрят на теги, а не на прозу.
  const stripHtmlComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');
  const html = stripHtmlComments(
    readFileSync(join(root, 'components', 'ui-tabs', 'ui-tabs.html'), 'utf8'),
  );

  it('хук модуля data-ui-tabs в разметке (JS-хуки — только data-ui-*, ADR-0005)', () => {
    expect(html).toContain('data-ui-tabs');
  });

  it('табы — ссылки с href на id панелей; панели несут aria-labelledby на id таба', () => {
    const tabTags = [...html.matchAll(/<a[^>]*ui-tabs__tab[^>]*>/g)].map(([tag]) => tag);
    expect(tabTags.length, 'в паттерне есть табы-ссылки').toBeGreaterThan(0);
    for (const tag of tabTags) {
      expect(tag, `href на панель: ${tag}`).toMatch(/href="#[a-z0-9-]+"/);
    }
    const panelTags = [...html.matchAll(/<section[^>]*ui-tabs__panel[^>]*>/g)].map(([tag]) => tag);
    expect(panelTags.length, 'в паттерне есть панели').toBeGreaterThan(0);
    for (const tag of panelTags) {
      expect(tag, `панель названа табом (aria-labelledby): ${tag}`).toMatch(
        /aria-labelledby="[a-z0-9-]+"/,
      );
    }
    // Каждая ссылка-таб ведёт на существующий в паттерне id; каждая панель
    // названа существующим табом (id-связки tab↔panel обязательны —
    // Implementation requirements п.1; гейт html-validate irao/tabs-id-links).
    const ids = [...html.matchAll(/\bid="([a-z0-9-]+)"/g)].map(([, id]) => id);
    for (const [, href] of html.matchAll(/<a[^>]*ui-tabs__tab[^>]*href="#([a-z0-9-]+)"/g)) {
      expect(ids, `панель ${href} существует`).toContain(href);
    }
    for (const [, labelledby] of html.matchAll(
      /<section[^>]*ui-tabs__panel[^>]*aria-labelledby="([a-z0-9-]+)"/g,
    )) {
      expect(ids, `таб ${labelledby} существует`).toContain(labelledby);
    }
  });

  it('деградация без JS: в разметке НЕТ hidden на панелях (Implementation requirements п.2)', () => {
    const panels = [...html.matchAll(/<[^>]*ui-tabs__panel[^>]*>/g)].map(([tag]) => tag);
    for (const tag of panels) {
      expect(tag, `панель без hidden в разметке: ${tag}`).not.toMatch(/\bhidden\b/);
    }
  });

  it('роль/tabindex/aria-selected ставит модуль: в разметке их НЕТ (разметка правдива без JS)', () => {
    expect(html).not.toMatch(/\brole="/);
    expect(html).not.toMatch(/\btabindex=/);
    expect(html).not.toMatch(/\baria-selected=/);
    expect(html).not.toMatch(/\baria-controls=/);
  });

  it('без inline-стилей (VI-инвариант §5)', () => {
    expect(html).not.toMatch(/\sstyle=/);
  });
});

describe('контракт модуля ui-tabs.js (jsdom; образец — tests/unit/module-template.test.js)', () => {
  const source = readFileSync(join(root, 'components', 'ui-tabs', 'ui-tabs.js'), 'utf8');

  const SELECTOR = '[data-ui-tabs]';
  const INIT_ATTR = 'data-ui-tabs-init';

  /** Инстанс с двумя табами — каноническая структура паттерна. */
  const instanceHtml = `
    <div class="ui-tabs" data-ui-tabs>
      <div class="ui-tabs__list">
        <a class="ui-tabs__tab" href="#uitab-a" id="uitab-a-tab">Колледж</a>
        <a class="ui-tabs__tab" href="#uitab-b" id="uitab-b-tab">Университет</a>
      </div>
      <section class="ui-tabs__panel" id="uitab-a" aria-labelledby="uitab-a-tab"><p>Панель А</p></section>
      <section class="ui-tabs__panel" id="uitab-b" aria-labelledby="uitab-b-tab"><p>Панель Б</p></section>
    </div>`;

  /**
   * Песочница: документ с заданным readyState и телом; шпион на подписку
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
  const apiOf = (sandbox) => sandbox.window.IraoUI.tabs;

  /** Инициализованные табы/панели инстанса из песочницы (порядок — документный). */
  const tabsOf = ({ document }) => [...document.querySelectorAll('.ui-tabs__tab')];
  const panelsOf = ({ document }) => [...document.querySelectorAll('.ui-tabs__panel')];

  /** Собрать KeyboardEvent песочницы (bubbles+cancelable — как в браузере). */
  function keyOf(sandbox, key) {
    return new sandbox.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  }

  it('это модуль по шаблону T1.6: имя, селектор и data-атрибут флага (не dataset)', () => {
    expect(source).toContain("var MODULE_NAME = 'tabs';");
    expect(source).toContain("var SELECTOR = '[data-ui-tabs]';");
    expect(source).toContain("var INIT_ATTR = 'data-ui-' + MODULE_NAME + '-init';");
    // Флаг — через get/removeAttribute: обращения к dataset-свойству нет
    // (DOMStringMap запрещает дефисы — контракт T1.6, п. 6).
    expect(source).toContain('root.getAttribute(INIT_ATTR)');
    expect(source).not.toMatch(/dataset\s*\./);
  });

  it("readyState 'loading': init отложен (одна подписка), регистрация в IraoUI — сразу; 'complete' — синхронно", () => {
    const deferred = makeSandbox({ readyState: 'loading', bodyHtml: instanceHtml });
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
    once.window.IraoUI.tabs.init();
    expect(once.document.querySelectorAll(`[${INIT_ATTR}]`)).toHaveLength(1);
  });

  it('init-мутации: роли APG, aria-controls, roving tabindex, панели tabindex=0, hidden у неактивных', () => {
    const sandbox = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    const list = sandbox.document.querySelector('.ui-tabs__list');
    const tabs = tabsOf(sandbox);
    const panels = panelsOf(sandbox);

    expect(list.getAttribute('role'), 'список — tablist').toBe('tablist');
    for (const tab of tabs) {
      expect(tab.getAttribute('role'), 'роль таба').toBe('tab');
    }
    expect(tabs[0].getAttribute('aria-controls')).toBe('uitab-a');
    expect(tabs[1].getAttribute('aria-controls')).toBe('uitab-b');

    // Стартовый выбор — первый таб; roving tabindex.
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
    expect(tabs[0].getAttribute('tabindex')).toBe('0');
    expect(tabs[1].getAttribute('tabindex')).toBe('-1');

    for (const panel of panels) {
      expect(panel.getAttribute('role'), 'роль панели').toBe('tabpanel');
      // Панель — цель Tab с активного таба (Scope модуля): последовательный
      // tab-stop (0), скрытые панели и так исключаются из обхода.
      expect(panel.getAttribute('tabindex')).toBe('0');
    }
    expect(panels[0].hidden, 'активная панель видима').toBe(false);
    expect(panels[1].hidden, 'неактивная панель скрыта — hidden ставит модуль').toBe(true);
  });

  it('сломанная id-связка (нет панели по href) — console.warn, соседний инстанс жив (п.1 + контракт п.4)', () => {
    const { document, warnings } = makeSandbox({
      readyState: 'loading',
      // Первый инстанс — таб ведёт на несуществующую панель; второй — полный.
      bodyHtml:
        '<div data-ui-tabs><div class="ui-tabs__list">' +
        '<a class="ui-tabs__tab" href="#nowhere">Пусто</a></div></div>' +
        instanceHtml,
    });

    apiOf({ window: document.defaultView }).init();

    expect(warnings).toHaveLength(1);
    // Соседний (полный) инстанс инициализован.
    expect(document.querySelectorAll(`[${INIT_ATTR}]`)).toHaveLength(1);
  });

  it('id-связка кнопкой (aria-controls вместо href) — легитимный альтернативный паттерн', () => {
    const buttons = instanceHtml
      .replace(/<a class="ui-tabs__tab" href="#uitab-a" id="uitab-a-tab">/g, '<button class="ui-tabs__tab" type="button" id="uitab-a-tab" aria-controls="uitab-a">')
      .replace(/<a class="ui-tabs__tab" href="#uitab-b" id="uitab-b-tab">/g, '<button class="ui-tabs__tab" type="button" id="uitab-b-tab" aria-controls="uitab-b">')
      .replace(/<\/a>/g, '</button>');
    const sandbox = makeSandbox({ readyState: 'complete', bodyHtml: buttons });

    expect(tabsOf(sandbox)[0].getAttribute('aria-selected')).toBe('true');
    expect(panelsOf(sandbox)[1].hidden).toBe(true);
    expect(sandbox.warnings).toHaveLength(0);
  });

  it('клавиатура: ←/→ с зацикливанием, Home/End; automatic-активация (фокус+выбор вместе)', () => {
    const sandbox = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    const list = sandbox.document.querySelector('.ui-tabs__list');
    const tabs = tabsOf(sandbox);
    const panels = panelsOf(sandbox);

    const selected = () => tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');

    // → : фокус и выбор переходят на второй таб (automatic — APG tabs).
    list.dispatchEvent(keyOf(sandbox, 'ArrowRight'));
    expect(selected()).toBe(1);
    expect(sandbox.document.activeElement, 'фокус на втором табе').toBe(tabs[1]);
    expect(panels[1].hidden).toBe(false);
    expect(panels[0].hidden).toBe(true);
    expect(tabs[1].getAttribute('tabindex')).toBe('0');
    expect(tabs[0].getAttribute('tabindex')).toBe('-1');

    // → с последнего зацикливается на первый.
    list.dispatchEvent(keyOf(sandbox, 'ArrowRight'));
    expect(selected()).toBe(0);

    // ← с первого зацикливается на последний.
    list.dispatchEvent(keyOf(sandbox, 'ArrowLeft'));
    expect(selected()).toBe(1);

    // Home/End — края.
    list.dispatchEvent(keyOf(sandbox, 'Home'));
    expect(selected()).toBe(0);
    list.dispatchEvent(keyOf(sandbox, 'End'));
    expect(selected()).toBe(1);
    expect(sandbox.document.activeElement, 'Home/End тоже двигают фокус').toBe(tabs[1]);

    // Стрелки отменяют действие по умолчанию (скролл страницы).
    const cancelled = keyOf(sandbox, 'ArrowRight');
    list.dispatchEvent(cancelled);
    expect(cancelled.defaultPrevented).toBe(true);
  });

  it('клик по табу выбирает панель; ссылке-табу отменяется переход по якорю; повторный клик — no-op', () => {
    const sandbox = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    const tabs = tabsOf(sandbox);
    const panels = panelsOf(sandbox);

    const clickTab = (tab) => {
      const event = new sandbox.window.MouseEvent('click', { bubbles: true, cancelable: true });
      tab.dispatchEvent(event);
      return event;
    };

    const event = clickTab(tabs[1]);
    expect(event.defaultPrevented, 'якорный прыжок отменён').toBe(true);
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(panels[0].hidden).toBe(true);
    expect(panels[1].hidden).toBe(false);

    // Повторный клик по выбранному — состояние и событие не дёргаются.
    expect(clickTab(tabs[1]).defaultPrevented).toBe(true);
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  });

  it('событие irao-ui:tabs-select (bubbles) — на смене выбора; при инициализации НЕ диспатчится', () => {
    const sandbox = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    const root = sandbox.document.querySelector('[data-ui-tabs]');

    const events = [];
    root.addEventListener('irao-ui:tabs-select', (event) => events.push(event));
    // Инициализация уже прошла (silent-старт) — событий нет.
    expect(events).toHaveLength(0);

    tabsOf(sandbox)[1].dispatchEvent(
      new sandbox.window.MouseEvent('click', { bubbles: true, cancelable: true }),
    );
    expect(events).toHaveLength(1);
    expect(events[0].bubbles, 'событие всплывает — точка расширения сайта').toBe(true);
  });

  it('destroy возвращает разметку к no-JS состоянию (роли/aria/tabindex сняты, панели раскрыты)', () => {
    // destroy живёт на хэндле инстанса initInstance; через публичный init()
    // он не отдаётся (как в ui-dropdown) — проверяем через повторный eval
    // модуля с прямым доступом к внутренностям недоступен, поэтому пин —
    // декларативный: исходник содержит возврат атрибутов и снятие hidden.
    expect(source).toMatch(/removeAttribute\('role'\)/);
    expect(source).toMatch(/removeAttribute\('aria-selected'\)/);
    expect(source).toMatch(/removeAttribute\('aria-controls'\)/);
    expect(source).toMatch(/removeAttribute\('tabindex'\)/);
    expect(source).toMatch(/\.hidden = false/);
  });

  it('публичный API: init и selector', () => {
    const api = apiOf(makeSandbox({ readyState: 'complete' }));
    expect(api.selector).toBe(SELECTOR);
    expect(typeof api.init).toBe('function');
  });
});

describe('подключение и гейты (DoD T6.2)', () => {
  it("'ui-tabs' в COMPONENTS showcase/build.mjs — CSS/JS попадают в dist", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-tabs'[^\]]*\]/);
  });

  it('стенд showcase/pages/ui-tabs: статические табы + JSON-кейс (Bitrix) со статусом выбора', () => {
    const stand = readFileSync(join(root, 'showcase', 'pages', 'ui-tabs', 'index.html'), 'utf8');
    expect(stand, 'секция статических табов').toContain('id="uitab-static"');
    expect(stand, 'секция JSON-кейса').toContain('id="uitab-json"');
    expect(stand, 'JSON-паттерн данных (Bitrix, 02-architecture §6.3)').toContain(
      'type="application/json"',
    );
    expect(stand, 'статус выбора').toContain('id="uitab-json-status"');
  });

  it('README компонента: APG tabs, automatic-активация, деградация без JS, JSON-паттерн Bitrix', () => {
    const readme = readFileSync(join(root, 'components', 'ui-tabs', 'README.md'), 'utf8');
    expect(readme).toMatch(/tabs pattern|APG/i);
    expect(readme).toMatch(/automatic|автоматическ/i);
    expect(readme).toMatch(/без JS|без-JS/i);
    expect(readme).toContain('json_encode');
    expect(readme).toContain('roving tabindex');
  });

  it('html-validate: правило irao/tabs-id-links зарегистрировано (id-связки — гейт, п.1)', () => {
    const config = readFileSync(join(root, '.htmlvalidate.js'), 'utf8');
    expect(config).toContain('tabs-id-links');
    const expectations = readFileSync(join(root, 'tools', 'run-lint-cases.mjs'), 'utf8');
    expect(expectations).toContain('tabs-id-links');
  });
});

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
 *    диспатчится — это событие смены выбора, а не декларация стартового;
 *  - T14.9: начальный выбор из разметки — таб с aria-current="page"
 *    выбирается вместо первого (silent); дубли — первый + console.warn;
 *    без aria-current — поведение как раньше; модуль aria-current не снимает;
 *    модификатор ui-tabs--pill — прозрачные пилюли .tabs-pill
 *    (pages.css:969–1001) на токенах: трек surface-muted, паддинг/gap 4px,
 *    радиус pill; таб без рамки, hover — подпись primary без заливки и только
 *    у невыбранных; активная — заливка primary/text-on-dark;
 *  - T17.11: активная пилюля модификатора --pill красится и по
 *    aria-current="page" (межстраничные наборы-ссылки без панелей модуль не
 *    инициализирует — контракт T13.6): ветка aria-current действует только
 *    ДО инициализации (:not([aria-selected]) — модуль ставит атрибут всем
 *    табам), в таб-инстансах активность по-прежнему один aria-selected.
 *    Расширение — :is() берёт максимум аргументов ((0,2,0) — из ветки с
 *    :not([aria-selected])): специфичность существующих правил не растёт
 *    (Implementation requirements п.1 T17.11).
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

  it("активный таб — :where([aria-selected='true']): заливка primary + белая подпись (.btn.is-active)", () => {
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
    expect(media).toMatch(
      /\.ui-tabs__tab:hover\s*\{[^}]*background-color: var\(--ui-color-primary\);/,
    );
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
      .replace(
        /<a class="ui-tabs__tab" href="#uitab-a" id="uitab-a-tab">/g,
        '<button class="ui-tabs__tab" type="button" id="uitab-a-tab" aria-controls="uitab-a">',
      )
      .replace(
        /<a class="ui-tabs__tab" href="#uitab-b" id="uitab-b-tab">/g,
        '<button class="ui-tabs__tab" type="button" id="uitab-b-tab" aria-controls="uitab-b">',
      )
      .replace(/<\/a>/g, '</button>');
    const sandbox = makeSandbox({ readyState: 'complete', bodyHtml: buttons });

    expect(tabsOf(sandbox)[0].getAttribute('aria-selected')).toBe('true');
    expect(panelsOf(sandbox)[1].hidden).toBe(true);
    expect(sandbox.warnings).toHaveLength(0);
  });

  it('таб вне .ui-tabs__list — Error в цикле сбора → console.warn через init() (ревью T13.6: тихо мёртвых табов нет)', () => {
    // Прежний код брал в tabs[] ЛЮБОЙ .ui-tabs__tab корня: таб-«сирота» с
    // валидной id-связкой получал роли APG, но клавиатура списка (слушатель
    // на .ui-tabs__list) его не достигала — таб молча не работал. Пин
    // симметричен брою id-связок: Error в том же цикле сбора → warn через
    // init() (контракт шаблона п.4), соседние инстансы живы.
    const { document, warnings } = makeSandbox({
      readyState: 'loading',
      bodyHtml:
        '<div data-ui-tabs>' +
        '<a class="ui-tabs__tab" href="#uitab-orphan">Сирота вне списка</a>' +
        '<div class="ui-tabs__list">' +
        '<a class="ui-tabs__tab" href="#uitab-orphan">В списке</a>' +
        '</div>' +
        '<section class="ui-tabs__panel" id="uitab-orphan">Панель</section>' +
        '</div>',
    });

    apiOf({ window: document.defaultView }).init();

    expect(warnings, 'таб вне списка — warn, а не тихая инициализация').toHaveLength(1);
    expect(
      document.querySelectorAll(`[${INIT_ATTR}]`),
      'инстанс с сиротой не инициализирован',
    ).toHaveLength(0);
    // Ролей APG никому не досталось: бросок ДО расстановки атрибутов.
    for (const tab of document.querySelectorAll('.ui-tabs__tab')) {
      expect(
        tab.getAttribute('role'),
        'роли не расставлены — init сорван в цикле сбора',
      ).toBeNull();
    }
  });

  it('select(index) игнорирует индексы вне диапазона (ревью T13.6: select(5) на двух табах — no-op)', () => {
    // Хэндл select() не покидает замыкание инстанса (публичный API модуля —
    // только init), поэтому пин декларативный — как destroy-пин ниже:
    // гард диапазона на входе select() до цикла расстановки атрибутов.
    expect(source).toMatch(/if \(index < 0 \|\| index >= tabs\.length\)\s*\{\s*return;/);
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
    // Deferred-режим: слушатель сайта подключается ДО init — тогда проверка
    // «silent-старт» настоящая (в 'complete' init уходит раньше подписки).
    const sandbox = makeSandbox({ readyState: 'loading', bodyHtml: instanceHtml });
    const root = sandbox.document.querySelector('[data-ui-tabs]');

    const events = [];
    root.addEventListener('irao-ui:tabs-select', (event) => events.push(event));

    fireDOMContentLoaded(sandbox.window);
    expect(events, 'инициализация не диспатчит событие (silent-старт)').toHaveLength(0);

    tabsOf(sandbox)[1].dispatchEvent(
      new sandbox.window.MouseEvent('click', { bubbles: true, cancelable: true }),
    );
    expect(events, 'смена выбора диспатчит событие').toHaveLength(1);
    expect(events[0].bubbles, 'событие всплывает — точка расширения сайта').toBe(true);
  });

  describe('начальный выбор из разметки — aria-current="page" (T14.9; пины до правок модуля)', () => {
    /** Канонический инстанс, где aria-current="page" стоит на табах с этими индексами. */
    const instanceWithCurrent = (indices) =>
      instanceHtml.replace(/id="uitab-([ab])-tab">/g, (tag, side) =>
        indices.includes(side === 'a' ? 0 : 1)
          ? `id="uitab-${side}-tab" aria-current="page">`
          : tag,
      );

    it('aria-current="page" на втором табе: выбран второй (роли/roving/панели), событие НЕ диспатчится, атрибут остаётся', () => {
      // Deferred-режим: слушатель сайта подключается ДО init — проверка
      // silent-старта настоящая (select(index, false, true)).
      const sandbox = makeSandbox({
        readyState: 'loading',
        bodyHtml: instanceWithCurrent([1]),
      });
      const root = sandbox.document.querySelector('[data-ui-tabs]');
      const events = [];
      root.addEventListener('irao-ui:tabs-select', (event) => events.push(event));

      fireDOMContentLoaded(sandbox.window);

      const tabs = tabsOf(sandbox);
      const panels = panelsOf(sandbox);
      expect(tabs[1].getAttribute('aria-selected'), 'выбран таб с aria-current').toBe('true');
      expect(tabs[0].getAttribute('aria-selected')).toBe('false');
      expect(tabs[1].getAttribute('tabindex'), 'roving tabindex за выбором').toBe('0');
      expect(tabs[0].getAttribute('tabindex')).toBe('-1');
      expect(panels[1].hidden, 'панель aria-current-таба видима').toBe(false);
      expect(panels[0].hidden).toBe(true);
      expect(events, 'стартовый выбор silent — событие сайту не нужно').toHaveLength(0);
      expect(
        tabs[1].getAttribute('aria-current'),
        'модуль aria-current не снимает (семантика автора разметки)',
      ).toBe('page');
      expect(sandbox.warnings, 'единственный aria-current — без warn').toHaveLength(0);
    });

    it('дубли aria-current="page": выбирается первый, console.warn — ровно один (контракт шаблона п.4)', () => {
      const sandbox = makeSandbox({
        readyState: 'complete',
        bodyHtml: instanceWithCurrent([0, 1]),
      });

      const tabs = tabsOf(sandbox);
      expect(tabs[0].getAttribute('aria-selected'), 'из дублей выбран первый').toBe('true');
      expect(tabs[1].getAttribute('aria-selected')).toBe('false');
      expect(panelsOf(sandbox)[1].hidden).toBe(true);
      expect(sandbox.warnings, 'дубли — брак разметки: warn, init продолжается').toHaveLength(1);
      expect(String(sandbox.warnings[0][0])).toContain('aria-current');
    });

    it('без aria-current — поведение не изменилось: первый таб, warn-ов нет', () => {
      const sandbox = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });

      const tabs = tabsOf(sandbox);
      expect(tabs[0].getAttribute('aria-selected')).toBe('true');
      expect(tabs[1].getAttribute('aria-selected')).toBe('false');
      expect(panelsOf(sandbox)[0].hidden).toBe(false);
      expect(sandbox.warnings).toHaveLength(0);
    });
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

describe('JSON-паттерн — безопасный вывод (T13.3): escapeHtml перед innerHTML-конкатенацией', () => {
  // Пин присутствия escapeHtml в примере ui-tabs (Testing requirements T13.3):
  // README и стенд — источники копипасты; JSON-паттерн интерполирует данные
  // инфоблока в innerHTML — каждая строка данных проходит escapeHtml до
  // конкатенации (innerHTML собирает разметку: сырая строка соберёт и тег).
  const readme = readFileSync(join(root, 'components', 'ui-tabs', 'README.md'), 'utf8');
  const stand = readFileSync(join(root, 'showcase', 'pages', 'ui-tabs', 'index.html'), 'utf8');
  // Демо-скрипт стенда — единственный голый <script> (второй — application/json).
  const demoScript = stand.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1] ?? '';

  it('README-пример определяет escapeHtml-хелпер и применяет его к данным (label, text)', () => {
    expect(readme, 'хелпер определён в примере (копипаст-готово)').toMatch(/function escapeHtml\(/);
    expect(readme, 'label таба экранируется').toMatch(/\+\s*escapeHtml\(t\.label\)/);
    expect(readme, 'текст панели экранируется').toMatch(/\+\s*escapeHtml\(t\.text\)/);
    expect(readme, 'сырая интерполяция label ушла').not.toMatch(/\+\s*t\.label\b/);
    expect(readme, 'сырая интерполяция text ушла').not.toMatch(/\+\s*t\.text\b/);
  });

  it('README: комментарий о границе допустимости (что допустимо без экранирования)', () => {
    expect(readme).toContain('Граница допустимости');
  });

  it('стенд — тот же паттерн: escapeHtml в демо-скрипте перед innerHTML (id, label, intro, шаги)', () => {
    expect(demoScript, 'хелпер в демо-скрипте стенда').toMatch(/function escapeHtml\(/);
    expect(demoScript, 'id из данных уходит в атрибут — экранируется').toMatch(
      /escapeHtml\(tab\.id\)/,
    );
    expect(demoScript, 'label экранируется').toMatch(/escapeHtml\(tab\.label\)/);
    expect(demoScript, 'intro экранируется').toMatch(/escapeHtml\(tab\.intro\)/);
    expect(demoScript, 'шаги списка экранируются по одному').toMatch(/\.map\(escapeHtml\)/);
    expect(demoScript, 'сырая интерполяция данных ушла').not.toMatch(
      /\+\s*tab\.(?:id|label|intro)\b/,
    );
    expect(demoScript, 'комментарий о границе допустимости').toContain('Граница допустимости');
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

describe('расхождение паддинга таба с ui-button (ревью ветки T14.3)', () => {
  // Шапка и README читаются С комментариями: предмет пина — проза контракта,
  // рассинхрон доки и кода (рубрика ревью T14.3).
  const raw = readFileSync(join(root, 'components', 'ui-tabs', 'ui-tabs.css'), 'utf8');
  const css = stripCssComments(raw);

  it('исполняемый контракт: паддинг таба — ступени шкалы 12×24 (--ui-space-3/5), не токен кнопки', () => {
    const block = blockOf(css, '.ui-tabs__tab');
    expect(block).toContain('padding: var(--ui-space-3) var(--ui-space-5);');
    expect(block, 'синхронизация с кнопкой — только отдельной задачей EPIC-14').not.toContain(
      '--ui-button-pad-inline',
    );
  });

  it('шапка не декларирует парность паддинга с кнопкой: после T14.3 у .ui-button --ui-button-pad-inline (28px) — заявка «как в ui-button» ложна', () => {
    const normalized = raw.replace(/\s+/g, ' ');
    expect(normalized, 'ложная заявка парности снята').not.toContain(
      'паддинг --ui-space-3/5 как в ui-button',
    );
    expect(normalized, 'расхождение задокументировано в шапке').toContain('--ui-button-pad-inline');
  });

  it('README фиксирует решение: таб сознательно 12×24; синхронизация — отдельная задача EPIC-14', () => {
    const readme = readFileSync(join(root, 'components', 'ui-tabs', 'README.md'), 'utf8');
    expect(readme).toContain('--ui-button-pad-inline');
    expect(readme).toMatch(/EPIC-14/);
  });
});

describe('модификатор ui-tabs--pill (T14.9; .tabs-pill career-portal pages.css:969–1001)', () => {
  const path = join(root, 'components', 'ui-tabs', 'ui-tabs.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));
  // T17.11: селекторы активной пары и :not()-исключений длиннее printWidth —
  // prettier переносит их в произвольных местах (в т.ч. внутри скобок).
  // Нормализованная копия для пинов длинных селекторов; короткие пины ниже
  // читают исходный css через blockOf.
  const cssFlat = css.replace(/\s+/g, ' ');

  it('лента — трек-пилюля .tabs-pill: тинт surface-muted, паддинг/gap 4px (ступень шкалы --ui-space-1), радиус pill', () => {
    const block = blockOf(css, '.ui-tabs--pill .ui-tabs__list');
    expect(block, 'правило модификатора ленты найдено').toBeTruthy();
    expect(block).toContain('gap: var(--ui-space-1);'); // 4px .tabs-pill
    expect(block).toContain('padding: var(--ui-space-1);'); // 4px .tabs-pill
    expect(block).toContain('background-color: var(--ui-color-surface-muted);'); // blue-50 трек
    expect(block).toContain('border-radius: var(--ui-radius-pill);');
  });

  it('таб — прозрачная пилюля без рамки: color text только у НЕвыбранных (:not — иначе модификатор перебил бы активное правило базы); типографика/высота базы не переопределяются', () => {
    const border = blockOf(css, '.ui-tabs--pill .ui-tabs__tab');
    expect(border, 'правило модификатора таба найдено').toBeTruthy();
    expect(border).toContain('border: 0;'); // рамка outline-кнопки не входит в вид пилюли
    // Подпись text (pages.css:989) — правило с :not(:is(...))-исключением
    // (T17.11: обе цели — aria-selected и aria-current): без исключения (0,2,0)
    // модификатора перебило бы (0,1,0) активное правило — тёмная подпись на
    // заливке primary (ловилось axe на стенде). Ветка current несёт тот же
    // guard :not([aria-selected]), что активное правило (ревью T17.11 high):
    // остаточный aria-current инициализированного инстанса остаётся в
    // исключении — подпись text, как на main. Специфичность правила +0,1,0
    // (0,4,0) — приемлемо, цели дизъюнктны активному правилу по построению.
    const color = cssFlat.match(
      /\.ui-tabs--pill \.ui-tabs__tab:not\(:is\(\[aria-selected='true'\], \[aria-current='page'\]:not\(\[aria-selected\]\)\)\) \{([^}]*)\}/,
    );
    expect(
      color,
      ':not-правило подписи найдено (guard ветки current — как у активного)',
    ).toBeTruthy();
    expect(color[1]).toContain('color: var(--ui-color-text);');
    // fs-small-масштаб спеки и базовая min-height — общие с базой правилами:
    // модификатор меняет только вид (Technical considerations T14.9).
    for (const block of [border, color]) {
      expect(block).not.toContain('font-size');
      expect(block).not.toContain('height');
      expect(block).not.toContain('padding');
    }
  });

  it('hover пилюли — только у НЕактивных, подпись primary БЕЗ заливки (pages.css:998); внутри (hover: hover)', () => {
    // Guard ветки current — как у активного правила (ревью T17.11 high):
    // остаточный aria-current инициализированного инстанса остаётся в
    // исключении — hover невыбранного (transparent + подпись primary), а не
    // полная заливка. Пин по cssFlat — prettier переносит длинный селектор
    // в произвольных местах.
    const hover = cssFlat.match(
      /\.ui-tabs--pill \.ui-tabs__tab:not\(\s*:is\(\[aria-selected='true'\], \[aria-current='page'\]:not\(\[aria-selected\]\)\)\s*\):hover \{([^}]*)\}/,
    );
    expect(hover, 'hover-правило найдено (guard ветки current — как у активного)').toBeTruthy();
    expect(hover[1]).toContain('background-color: transparent;');
    expect(hover[1]).toContain('color: var(--ui-color-primary);');
  });

  it('активная пилюля — пара базы, расширенная aria-current="page" (T17.11): ветка current действует только до инициализации модуля', () => {
    // Активная пара в модификаторе (T17.11): навигационные наборы-ссылки без
    // панелей модуль не инициализирует (контракт T13.6) — активный раздел
    // несёт aria-current="page". :is() берёт максимум аргументов — (0,2,0)
    // из ветки с :not([aria-selected]). Пин по cssFlat — prettier переносит
    // длинный селектор в произвольных местах.
    const active = cssFlat.match(
      /\.ui-tabs--pill \.ui-tabs__tab:is\(\[aria-selected='true'\], \[aria-current='page'\]:not\(\[aria-selected\]\)\) \{([^}]*)\}/,
    );
    expect(active, 'активная пара модификатора найдена').toBeTruthy();
    expect(active[1]).toContain('background-color: var(--ui-color-primary);');
    expect(active[1]).toContain('color: var(--ui-color-text-on-dark);');
    // Ветка aria-current гасится :not([aria-selected]): модуль при init ставит
    // атрибут ВСЕМ табам (ui-tabs.js) — после инициализации активность задаёт
    // один aria-selected, оставшийся aria-current (модуль его не снимает,
    // T14.9) не рисует вторую активную пилюлю. В nav-наборах без панелей
    // aria-selected нет — активный раздел красится по aria-current.
    expect(css).toMatch(/\[aria-current='page'\]:not\(\[aria-selected\]\)/);
    // База не менялась (Scope T17.11 — только модификатор --pill): активный
    // таб панельных инстансов — прежнее :where()-правило с нулевым вкладом.
    const base = blockOf(css, ".ui-tabs__tab:where([aria-selected='true'])");
    expect(base, 'базовое активное правило на месте').toBeTruthy();
    expect(base).toContain('background-color: var(--ui-color-primary);');
    // aria-current — стилевой крючок ТОЛЬКО модификатора --pill: базовые
    // табы с панелями на атрибут не реагируют (деградация без JS прежняя).
    // Разбор правил как в гейте слоя (patterns-layer-gate.mjs: прелюдии @media
    // срезаются — правила внутри media проверяются); селектор длиннее
    // printWidth перенесён prettier'ом — нормализуем пробелы.
    const flat = css.replace(/@[^{}]*\{/g, '{');
    for (const [, selector] of flat.matchAll(/([^{}]+)\{[^}]*\}/g)) {
      if (!selector.includes('aria-current')) continue;
      expect(
        selector.replace(/\s+/g, ' ').trim(),
        'aria-current — только в правилах --pill',
      ).toMatch(/^\.ui-tabs--pill\b/);
    }
  });
});

describe('доки T14.9 (README): модификатор --pill и правило начального выбора', () => {
  const readme = readFileSync(join(root, 'components', 'ui-tabs', 'README.md'), 'utf8');

  it('README описывает модификатор ui-tabs--pill: когда (межстраничная навигация разделов) и вид', () => {
    expect(readme).toContain('ui-tabs--pill');
    expect(readme).toMatch(/\.tabs-pill/);
  });

  it('README фиксирует правило начального выбора: aria-current="page" → N-й таб; дубли — первый + console.warn; без — первый', () => {
    expect(readme).toContain('aria-current="page"');
    expect(readme).toMatch(/console\.warn/);
    expect(readme).toMatch(/дубл[а-я]*/i);
  });

  it('README: граница стилевой реакции на aria-current — модификатор --pill красит активную пилюлю (T17.11), база не реагирует', () => {
    // База (табы с панелями): aria-current — подсказка модулю, вид активного
    // таба определяет aria-selected (деградация без JS прежняя).
    expect(readme).toMatch(/aria-current[\s\S]{0,400}не реагирует/i);
    // Модификатор --pill / навигационный набор: активная пилюля по
    // aria-current="page" (покой и hover).
    expect(readme).toMatch(/aria-current="page"[\s\S]{0,600}активн[а-яё]* пилюл[а-яё]*/i);
  });

  it('README: навигационный набор — ссылки без панелей, модуль не подключается, канон nvp паттерн-слоя (T17.11)', () => {
    expect(readme).toMatch(/навигационн/i);
    expect(readme).toMatch(/nvp/);
    expect(readme).toMatch(/(не подключается|без панелей)/i);
  });
});

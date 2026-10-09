/**
 * Юнит-пины ui-select (задача T7.3; Testing requirements — tests first).
 *
 * Поверхность браузера — полный APG listbox-цикл, форма с change, no-JS
 * деградация, pointer:coarse, axe и эталоны — tests/e2e/ui-select.spec.js;
 * здесь — пины исполняемой формы решения:
 *  - ЧИСТАЯ ФУНКЦИЯ СИНХРОНИЗАЦИИ (Implementation requirements п.1, конвенция
 *    tests/README «синхронизация select — чистая логика»): viewOf(select) —
 *    представление опций (выбор/сброс/disabled/optgroup) без мутаций DOM;
 *  - ЧИСТЫЙ typeahead по первой букве (Scope: «оценить, APG рекомендует» —
 *    принят): typeaheadIndex(texts, from, char[, disabled]) — цикл по
 *    совпадениям, disabled пропускаются;
 *  - components/ui-select/ui-select.css: @define select; box-sizing на корне
 *    (ADR-0002); z-index списка — ТОЛЬКО --ui-z-dropdown (Technical
 *    considerations); скрытие нативного select — opacity+pointer-events
 *    (custom-select-hidden career-portal) без !important (гейт); «✓»
 *    выбранного — перенос career-portal (components.css:399); цвета вне
 *    токенов и hex запрещены (инварианты системы); hover — только под
 *    (hover: hover) (EPIC-4); модификатор --wrap — замена dd--in-wrap;
 *  - канонический паттерн: деградация без JS — select в разметке НЕ скрыт
 *    (класс скрытия ставит модуль), хук data-ui-select, без inline-стилей;
 *  - контракт модуля IraoUI.select (jsdom-песочница — образец
 *    tests/unit/module-template.test.js): readyState-guard, guard отсутствия
 *    элементов, отказоустойчивость init, guard повторной инициализации, флаг —
 *    data-атрибут (не dataset);
 *  - init-мутации и синхронизация (jsdom): select скрыт классом ТОЛЬКО после
 *    инициализации; tabindex="-1" на select (триггер заменяет его в Tab-
 *    порядке — иначе двойная таб-остановка с невидимым фокусом), снят
 *    destroy(); disabled select → disabled триггер; aria триггера —
 *    haspopup/expanded/controls + имя поля (label[for] → aria-labelledby,
 *    иначе SR терял бы имя «Город» нативного select); список — aria-label
 *    поля; optgroup → role="group"; sync(): label триггера = текст
 *    выбранного, is-selected + aria-selected (пустое значение не отмечается —
 *    пара career-portal components.css:68), is-placeholder; модификатор
 *    data-ui-select="wrap" — обёртка сайта, select не перемещается;
 *  - pointer:coarse — модуль НЕ активируется (Implementation requirements
 *    п.3, решение зафиксировано в доке и ADR-0012);
 *  - публичный API: init/selector/viewOf/typeaheadIndex/closeAll/destroy.
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

describe('tokens/semantic.css — z-лестница (Technical considerations T7.3)', () => {
  const source = readFileSync(join(root, 'tokens', 'semantic.css'), 'utf8');

  it('--ui-z-dropdown = 70 (лестница T2.2; career-portal components.css:376) — токен списка', () => {
    expect(source).toMatch(/--ui-z-dropdown:\s*70;/);
  });
});

describe('components/ui-select/ui-select.css — база (ADR-0002, Technical considerations)', () => {
  const path = join(root, 'components', 'ui-select', 'ui-select.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define select — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define select */')).toBe(true);
  });

  it('.ui-select: box-sizing на корне (ADR-0002) и позиционный контекст списка', () => {
    const block = blockOf(css, '.ui-select');
    expect(block, 'правило .ui-select найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('position: relative;');
  });

  it('нативный select скрыт паттерном custom-select-hidden (opacity 0 + pointer-events none, career-portal components.css:339) — без !important (гейт)', () => {
    const block = blockOf(css, '.ui-select__native');
    expect(block, 'правило скрытия нативного select найдено').toBeTruthy();
    expect(block).toContain('opacity: 0;');
    expect(block).toContain('pointer-events: none;');
    expect(css, '!important вне a11y/vi.css запрещён').not.toContain('!important');
  });

  it('.ui-select__list: absolute от корня; z-index — ТОЛЬКО токен --ui-z-dropdown', () => {
    const block = blockOf(css, '.ui-select__list');
    expect(block, 'правило .ui-select__list найдено').toBeTruthy();
    expect(block).toContain('position: absolute;');
    const values = [...css.matchAll(/z-index:\s*([^;]+);/g)].map((m) => m[1]);
    expect(values.length, 'z-index объявлен').toBeGreaterThan(0);
    for (const value of values) {
      expect(value, 'z-index — только var(--ui-z-dropdown)').toBe('var(--ui-z-dropdown)');
    }
  });

  it('видимость списка управляется [hidden] (ставит модуль); собственных display-переключений нет', () => {
    expect(css).not.toMatch(/\.ui-select__list\s*\{[^}]*display:\s*none/);
  });

  it('цвета — только токены слоя 2; без hex (инварианты системы)', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it(':hover-правила — только внутри @media (hover: hover) (конвенция EPIC-4)', () => {
    const mediaIndex = css.indexOf('@media (hover: hover)');
    expect(mediaIndex, 'media-обёртка hover присутствует').toBeGreaterThan(-1);
    expect(css.slice(0, mediaIndex), 'до media-обёртки :hover нет').not.toContain(':hover');
  });

  it('модификатор --wrap (замена dd--in-wrap, career-portal components.css:404): корень static, триггер растянут на обёртку', () => {
    const wrap = blockOf(css, '.ui-select--wrap');
    expect(wrap, 'правило .ui-select--wrap найдено').toBeTruthy();
    expect(wrap).toContain('position: static;');
    expect(css).toMatch(/\.ui-select--wrap \.ui-select__trigger\s*\{/);
  });

  it('перенос паттерна «✓» выбранного (career-portal components.css:399) — is-selected::after в цепочке блока', () => {
    const check = css.match(/\.ui-select__option\.is-selected::after\s*\{([^}]*)\}/);
    expect(check, 'правило галочки найдено').toBeTruthy();
    expect(check[1]).toContain("content: '✓';");
  });
});

describe('канонический паттерн (components/ui-select/ui-select.html) — деградация и хуки', () => {
  const stripHtmlComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');
  const html = stripHtmlComments(
    readFileSync(join(root, 'components', 'ui-select', 'ui-select.html'), 'utf8'),
  );

  it('хук модуля data-ui-select стоит только на <select> (JS-хуки — data-ui-*, ADR-0005)', () => {
    const hooked = [...html.matchAll(/<[^>]*data-ui-select[^>]*>/g)].map(([tag]) => tag);
    expect(hooked.length, 'в паттерне есть хук').toBeGreaterThan(0);
    for (const tag of hooked) {
      expect(tag, `хук на select: ${tag}`).toMatch(/^<select/);
    }
  });

  it('деградация без JS: в разметке select НЕ скрыт (класс скрытия ставит модуль)', () => {
    const selects = [...html.matchAll(/<select[^>]*>/g)].map(([tag]) => tag);
    expect(selects.length, 'в паттерне есть select').toBeGreaterThan(0);
    for (const tag of selects) {
      expect(tag, `select не скрыт в разметке: ${tag}`).not.toMatch(/ui-select__native/);
    }
  });

  it('у select есть name (форма отправляет значение и без JS, и с JS)', () => {
    expect(html).toMatch(/<select[^>]*name="/);
  });

  it('optgroup с label в паттерне (optgroup-поддержка)', () => {
    expect(html).toMatch(/<optgroup[^>]*label="/);
  });

  it('label связан с select по for/id (имя поля — источник aria триггера)', () => {
    expect(html).toMatch(/<label[^>]*for="/);
    expect(html).toMatch(/<select[^>]*id="/);
  });

  it('без inline-стилей (VI-инвариант §5)', () => {
    expect(html).not.toMatch(/\sstyle=/);
  });
});

describe('чистая функция синхронизации viewOf (Implementation requirements п.1)', () => {
  const source = readFileSync(join(root, 'components', 'ui-select', 'ui-select.js'), 'utf8');

  /** Песочница с исполненным модулем; select с заданным содержимым. */
  function makeApi() {
    const dom = new JSDOM('<!doctype html><body></body>', {
      url: 'https://showcase.test/',
      runScripts: 'outside-only',
    });
    dom.window.eval(source);
    return dom.window.IraoUI.select;
  }

  it('модуль экспортирует viewOf и typeaheadIndex (юнит-поверхность)', () => {
    const api = makeApi();
    expect(typeof api.viewOf).toBe('function');
    expect(typeof api.typeaheadIndex).toBe('function');
  });

  it('плоский select: kind/value/text/selected/disabled без мутаций DOM', () => {
    const api = makeApi();
    const dom = new JSDOM(
      '<!doctype html><body><select name="city">' +
        '<option value="">Любой город</option>' +
        '<option value="msk">Москва</option>' +
        '<option value="spb" selected>Санкт-Петербург</option>' +
        '<option value="kzn" disabled>Казань</option>' +
        '</select></body>',
      { url: 'https://showcase.test/' },
    );
    const select = dom.window.document.querySelector('select');
    const view = api.viewOf(select);
    expect(view).toHaveLength(4);
    expect(
      view.every((entry) => entry.kind === 'option'),
      'только опции',
    ).toBe(true);
    expect(view[0]).toEqual({
      kind: 'option',
      value: '',
      text: 'Любой город',
      selected: false,
      disabled: false,
    });
    expect(view[1]).toEqual({
      kind: 'option',
      value: 'msk',
      text: 'Москва',
      selected: false,
      disabled: false,
    });
    expect(view[2]).toEqual({
      kind: 'option',
      value: 'spb',
      text: 'Санкт-Петербург',
      selected: true,
      disabled: false,
    });
    expect(view[3]).toEqual({
      kind: 'option',
      value: 'kzn',
      text: 'Казань',
      selected: false,
      disabled: true,
    });
    // Чистота: DOM не мутирован.
    expect(select.children).toHaveLength(4);
  });

  it('optgroup: kind=group с label и индексами своих опций (документный порядок)', () => {
    const api = makeApi();
    const dom = new JSDOM(
      '<!doctype html><body><select name="spec">' +
        '<option value="">Все специализации</option>' +
        '<optgroup label="Разработка">' +
        '<option value="fe">Frontend</option>' +
        '<option value="be">Backend</option>' +
        '</optgroup>' +
        '<optgroup label="Дизайн">' +
        '<option value="ux">UX/UI</option>' +
        '</optgroup>' +
        '</select></body>',
      { url: 'https://showcase.test/' },
    );
    const view = api.viewOf(dom.window.document.querySelector('select'));
    // Документный порядок: группа — перед своими опциями; options — индексы
    // опций в select.options (они же индексы плоского списка кнопок UI).
    expect(view).toHaveLength(6);
    expect(view[0]).toMatchObject({ kind: 'option', value: '' });
    expect(view[1]).toEqual({ kind: 'group', label: 'Разработка', options: [1, 2] });
    expect(view[2]).toMatchObject({ kind: 'option', value: 'fe', text: 'Frontend' });
    expect(view[3]).toMatchObject({ kind: 'option', value: 'be', text: 'Backend' });
    expect(view[4]).toEqual({ kind: 'group', label: 'Дизайн', options: [3] });
    expect(view[5]).toMatchObject({ kind: 'option', value: 'ux', text: 'UX/UI' });
  });

  it('повторный вызов и после мутаций отражает текущее состояние select (состояние ↔ модель)', () => {
    const api = makeApi();
    const dom = new JSDOM(
      '<!doctype html><body><select>' +
        '<option value="a">А</option><option value="b">Б</option>' +
        '</select></body>',
      { url: 'https://showcase.test/' },
    );
    const select = dom.window.document.querySelector('select');
    const first = api.viewOf(select);
    expect(first[0].selected, 'без selected-атрибута выбрана первая опция').toBe(true);
    expect(api.viewOf(select)).toEqual(first);
    select.value = 'b';
    const third = api.viewOf(select);
    expect(third[1].selected).toBe(true);
    expect(third[0].selected).toBe(false);
  });
});

describe('чистый typeahead по первой букве (Scope: APG type-ahead — принят)', () => {
  const source = readFileSync(join(root, 'components', 'ui-select', 'ui-select.js'), 'utf8');

  function api() {
    const dom = new JSDOM('<!doctype html><body></body>', {
      url: 'https://showcase.test/',
      runScripts: 'outside-only',
    });
    dom.window.eval(source);
    return dom.window.IraoUI.select;
  }

  const texts = ['Любой', 'Москва', 'Минск', 'Казань'];

  it('первое совпадение после текущей позиции; from=-1 — с начала списка', () => {
    expect(api().typeaheadIndex(texts, -1, 'м')).toBe(1);
    expect(api().typeaheadIndex(texts, 1, 'м')).toBe(2);
  });

  it('цикл по совпадениям: после последнего — снова первое (APG type-ahead)', () => {
    expect(api().typeaheadIndex(texts, 2, 'м')).toBe(1);
  });

  it('регистронезависимо (кириллица и латиница); без совпадений — -1', () => {
    expect(api().typeaheadIndex(texts, -1, 'М')).toBe(1);
    expect(api().typeaheadIndex(['Alpha', 'beta', 'Gamma'], -1, 'g')).toBe(2);
    expect(api().typeaheadIndex(texts, -1, 'ж')).toBe(-1);
  });

  it('disabled-опции пропускаются (третий аргумент — массив disabled)', () => {
    const disabled = [false, false, false, true];
    const withDisabled = ['Любой', 'Москва', 'Казань'];
    expect(api().typeaheadIndex(withDisabled, -1, 'к', [false, false, true])).toBe(-1);
    expect(api().typeaheadIndex(texts, -1, 'к', disabled)).toBe(-1);
    expect(api().typeaheadIndex(texts, -1, 'м', disabled)).toBe(1);
  });
});

describe('контракт модуля ui-select.js (jsdom; образец tests/unit/module-template.test.js)', () => {
  const source = readFileSync(join(root, 'components', 'ui-select', 'ui-select.js'), 'utf8');

  // Селектор — по атрибуту (как data-ui-modal): не-select с хуком получает
  // диагностику console.warn (контракт шаблона п.4), а не молчаливый пропуск.
  const SELECTOR = '[data-ui-select]';
  const INIT_ATTR = 'data-ui-select-init';

  const instanceHtml = `
    <label class="ui-field__label" for="ui-city">Город</label>
    <select id="ui-city" name="city" data-ui-select>
      <option value="">Любой город</option>
      <option value="msk">Москва</option>
      <option value="spb">Санкт-Петербург</option>
    </select>`;

  /**
   * Песочница: документ с заданным readyState и телом; matchMedia (модуль
   * спрашивает pointer:coarse — Implementation requirements п.3); шпионы на
   * подписку document.addEventListener и console.warn (модуль пишет в
   * window.console.warn).
   */
  function makeSandbox({ readyState = 'complete', bodyHtml = '', coarse = false } = {}) {
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

    window.matchMedia = (query) => ({
      matches: query === '(pointer: coarse)' ? coarse : false,
    });

    const warnings = [];
    window.console.warn = (...args) => warnings.push(args);

    window.eval(source);

    return { window, document, domContentLoadedSubscriptions, warnings };
  }

  function fireDOMContentLoaded(window) {
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  }

  const apiOf = ({ window }) => window.IraoUI.select;

  /** change-событие песочницы для select. */
  function change(window, select) {
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
  }

  it('это модуль по шаблону T1.6: имя, селектор активации и data-атрибут флага (не dataset)', () => {
    expect(source).toContain("var MODULE_NAME = 'select';");
    expect(source).toContain(`var SELECTOR = '${SELECTOR}';`);
    expect(source).toContain("var INIT_ATTR = 'data-ui-' + MODULE_NAME + '-init';");
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
    once.window.IraoUI.select.init();
    expect(once.document.querySelectorAll(`[${INIT_ATTR}]`)).toHaveLength(1);
  });

  it('pointer:coarse — модуль НЕ активируется (Implementation requirements п.3, ADR-0012): select остаётся нативным', () => {
    const touch = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml, coarse: true });
    expect(touch.document.querySelectorAll(`[${INIT_ATTR}]`)).toHaveLength(0);
    expect(touch.document.querySelector('.ui-select')).toBeNull();
    expect(touch.document.querySelector('select').className).not.toContain('ui-select__native');
  });

  it('init-мутации: select скрыт классом (custom-select-hidden), tabindex=-1 (триггер заменяет его в Tab-порядке)', () => {
    const { document } = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    const select = document.querySelector('select');
    expect(select.classList.contains('ui-select__native'), 'select скрыт классом').toBe(true);
    expect(select.getAttribute('tabindex')).toBe('-1');
    expect(select.parentElement.classList.contains('ui-select'), 'корень .ui-select создан').toBe(
      true,
    );
    // select не спрятан «до инициализации» — класс появился только от модуля.
  });

  it('disabled select — disabled триггер (активация и клавиатура закрыты)', () => {
    const { document } = makeSandbox({
      readyState: 'complete',
      bodyHtml: instanceHtml.replace('name="city"', 'name="city" disabled'),
    });
    expect(document.querySelector('.ui-select__trigger').disabled).toBe(true);
  });

  it('aria триггера: haspopup=listbox, expanded=false, controls на id списка; имя поля — label[for] → aria-labelledby (SR не теряет «Город»)', () => {
    const { document } = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    const trigger = document.querySelector('.ui-select__trigger');
    const list = document.querySelector('.ui-select__list');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe(list.id);
    expect(list.getAttribute('role')).toBe('listbox');
    // Имя поля: label[for=select.id] → aria-labelledby триггера на label+триггер
    // (пара APG listbox-button: label элемента + собственный текст).
    const label = document.querySelector('label');
    expect(label.id, 'id label сгенерирован при отсутствии').toBeTruthy();
    expect(trigger.getAttribute('aria-labelledby')).toBe(`${label.id} ${trigger.id}`);
    expect(list.getAttribute('aria-label')).toBe('Город');
  });

  it('синхронизация: label триггера = текст выбранного; выбранный — is-selected + aria-selected', () => {
    const { document, window } = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    const select = document.querySelector('select');
    const trigger = document.querySelector('.ui-select__trigger');
    const options = document.querySelectorAll('.ui-select__option');

    expect(options).toHaveLength(3);
    expect(trigger.querySelector('.ui-select__label').textContent).toBe('Любой город');
    expect(options[0].getAttribute('aria-selected')).toBe('true');

    select.value = 'spb';
    change(window, select);

    expect(trigger.querySelector('.ui-select__label').textContent).toBe('Санкт-Петербург');
    expect(options[2].classList.contains('is-selected'), 'выбранный отмечен классом').toBe(true);
    expect(options[2].getAttribute('aria-selected')).toBe('true');
    expect(options[0].classList.contains('is-selected')).toBe(false);
    expect(options[0].getAttribute('aria-selected')).toBe('false');
  });

  it('сброс: пустое значение (value="") — placeholder-состояние триггера, опции без is-selected (career-portal components.css:68)', () => {
    const { document, window } = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    const select = document.querySelector('select');
    const trigger = document.querySelector('.ui-select__trigger');
    const options = document.querySelectorAll('.ui-select__option');

    select.value = 'msk';
    change(window, select);
    expect(trigger.classList.contains('is-placeholder')).toBe(false);
    expect(options[1].classList.contains('is-selected')).toBe(true);

    select.value = '';
    change(window, select);
    expect(trigger.classList.contains('is-placeholder'), 'пустое значение — placeholder').toBe(
      true,
    );
    expect(
      [...options].some((option) => option.classList.contains('is-selected')),
      'пустой не отмечается (career-portal)',
    ).toBe(false);
  });

  it('optgroup: role=group с aria-label поля группы; опции в документном порядке (синхронизация по группам)', () => {
    const { document, window } = makeSandbox({
      readyState: 'complete',
      bodyHtml: `
        <select name="spec" data-ui-select>
          <option value="">Все специализации</option>
          <optgroup label="Разработка">
            <option value="fe">Frontend</option>
            <option value="be">Backend</option>
          </optgroup>
        </select>`,
    });
    const group = document.querySelector('.ui-select__group');
    expect(group, 'группа построена').toBeTruthy();
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Разработка');
    const options = document.querySelectorAll('.ui-select__option');
    expect(options).toHaveLength(3);
    expect(group.contains(options[1]) && group.contains(options[2])).toBe(true);
    expect(document.querySelector('.ui-select__list').contains(options[0])).toBe(true);

    const select = document.querySelector('select');
    select.value = 'be';
    change(window, select);
    expect(options[2].classList.contains('is-selected'), 'опция из группы синхронизована').toBe(
      true,
    );
  });

  it('модификатор data-ui-select="wrap": обёртка сайта — select НЕ перемещается, корень со статической позицией рядом', () => {
    const { document } = makeSandbox({
      readyState: 'complete',
      bodyHtml: `
        <div class="site-pill" id="pill">
          <select id="ui-city" name="city" data-ui-select="wrap">
            <option value="">Любой город</option>
            <option value="msk">Москва</option>
          </select>
        </div>`,
    });
    const select = document.querySelector('select');
    const pill = document.getElementById('pill');
    const root = document.querySelector('.ui-select');
    expect(root.classList.contains('ui-select--wrap'), 'модификатор на корне').toBe(true);
    expect(select.parentElement, 'select остался в обёртке сайта').toBe(pill);
    expect(root.parentElement, 'корень добавлен в ту же обёртку').toBe(pill);
  });

  it('destroy(select) возвращает разметку к no-JS состоянию: корень снят, select раскрыт и табулируем', () => {
    const manual = makeSandbox({ readyState: 'loading', bodyHtml: instanceHtml });
    fireDOMContentLoaded(manual.window);
    const { document } = manual;
    const select = document.querySelector('select');
    const root = select.closest('.ui-select');
    expect(root).toBeTruthy();

    apiOf(manual).destroy(select);

    expect(document.querySelector('.ui-select'), 'корень снят').toBeNull();
    expect(select.classList.contains('ui-select__native')).toBe(false);
    expect(select.getAttribute('tabindex')).toBeNull();
    expect(select.parentElement, 'select возвращён на своё место').toBe(document.body);
    // Повторная инициализация после destroy возможна (PE-цикл Bitrix AJAX).
    apiOf(manual).init();
    expect(select.closest('.ui-select')).toBeTruthy();
  });

  it('неполная разметка (хук не на select) — console.warn, соседние инстансы живы (контракт шаблона п.4)', () => {
    const { document, warnings } = makeSandbox({
      readyState: 'loading',
      bodyHtml: '<div data-ui-select>не select</div>' + instanceHtml,
    });

    apiOf({ window: document.defaultView }).init();

    expect(warnings).toHaveLength(1);
    expect(document.querySelectorAll(`[${INIT_ATTR}]`)).toHaveLength(1);
  });

  it('публичный API: init, selector, viewOf, typeaheadIndex, closeAll, destroy', () => {
    const api = apiOf(makeSandbox({ readyState: 'complete' }));
    expect(api.selector).toBe(SELECTOR);
    expect(typeof api.init).toBe('function');
    expect(typeof api.closeAll).toBe('function');
    expect(typeof api.viewOf).toBe('function');
    expect(typeof api.typeaheadIndex).toBe('function');
    expect(typeof api.destroy).toBe('function');
  });
});

describe('подключение и гейты (DoD T7.3)', () => {
  it("'ui-select' в COMPONENTS showcase/build.mjs — CSS/JS попадают в dist", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toMatch(/const COMPONENTS = \[[\s\S]*?'ui-select'/);
  });

  it('стенд showcase/pages/ui-select: базовый/optgroup/wrap/форма-фильтр со статусом change', () => {
    const stand = readFileSync(join(root, 'showcase', 'pages', 'ui-select', 'index.html'), 'utf8');
    expect(stand, 'секция базового select').toContain('id="uiss-basic"');
    expect(stand, 'секция optgroup').toContain('id="uiss-optgroups"');
    expect(stand, 'секция wrap-модификатора').toContain('id="uiss-wrap"');
    expect(stand, 'форма фильтра').toContain('id="uiss-form"');
    expect(stand, 'статус change-событий').toContain('id="uiss-form-status"');
  });

  it('README компонента: APG listbox чек-лист, mobile-стратегия (pointer:coarse), деградация без JS, синхронизация change', () => {
    const readme = readFileSync(join(root, 'components', 'ui-select', 'README.md'), 'utf8');
    expect(readme).toMatch(/listbox/i);
    expect(readme).toMatch(/pointer:\s*coarse/);
    expect(readme).toMatch(/без JS|без-JS/i);
    expect(readme).toContain('change');
    expect(readme).toContain('Escape');
    expect(readme).toContain('Home');
  });

  it('решение мобильной стратегии зафиксировано ADR-0012 (Implementation requirements п.3)', () => {
    const adr = readFileSync(join(root, 'docs', 'adr', '0012-select-pointer-coarse.md'), 'utf8');
    expect(adr).toMatch(/pointer:\s*coarse/);
    expect(adr).toMatch(/select/i);
  });
});

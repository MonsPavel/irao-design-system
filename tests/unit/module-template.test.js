/**
 * Эталонный Vitest-тест контракта module-template (задача T1.6).
 *
 * Проверяет docs/templates/module-template.js по всем шести пунктам контракта
 * из шапки шаблона; главный из них — readyState-guard в обоих режимах:
 * документ ещё грузится → init отложен до DOMContentLoaded, уже прошёл →
 * init синхронный; оба пути инициализируют ровно один раз. Тест — образец
 * для будущих юнит-тестов модулей (T5.5 валидация, T9.1 VI): чистая логика
 * и guard'ы — сюда, DOM-поведение — в Playwright (tests/README.md).
 *
 * Изоляция: песочница `new JSDOM(..., { runScripts: 'outside-only' })` на
 * каждый тест — шаблон исполняется через window.eval в КОНТЕКСТЕ песочницы
 * и видит её window/document. Глобальные window/document Vitest-среды
 * сознательно не используются: у каждого теста свой readyState и свой DOM.
 * readyState управляется перекрытием геттера на инстансе документа (в jsdom
 * после конструктора он всегда 'complete') — этого достаточно для guard'а;
 * полноценное DOM-поведение, как догрузка скриптов, — класс Playwright.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

// import.meta.url под module-runner Vitest — не file-URL; у Vitest есть
// собственные import.meta.dirname/import.meta.filename (cwd-независимы).
const templateSource = readFileSync(
  join(import.meta.dirname, '../../docs/templates/module-template.js'),
  'utf8',
);

/** Атрибут-флаг инициализации, который ставит шаблон (MODULE_NAME = 'example'). */
const INIT_ATTR = 'data-ui-example-init';

/**
 * Песочница: документ с заданным readyState и телом; шпионы на подписку
 * document.addEventListener и console.warn (шаблон пишет в window.console.warn).
 */
function makeSandbox({ readyState = 'complete', bodyHtml = '', source = templateSource } = {}) {
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

/** Число инициализированных инстансов (по флагу-атрибуту из шаблона). */
function initCount(document, attr = INIT_ATTR) {
  return document.querySelectorAll('[' + attr + ']').length;
}

/** Два корневых элемента по селектору шаблона. */
const twoInstancesHtml = '<div data-ui-example></div><div data-ui-example></div>';

function fireDOMContentLoaded(window) {
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
}

describe('module-template — readyState-guard (оба режима, init ровно один раз)', () => {
  it("readyState 'loading': init отложен — до DOMContentLoaded инстансов нет, регистрация в window.IraoUI — сразу", () => {
    const { window, document } = makeSandbox({
      readyState: 'loading',
      bodyHtml: twoInstancesHtml,
    });

    expect(initCount(document)).toBe(0);
    expect(typeof window.IraoUI.example.init).toBe('function');
    expect(window.IraoUI.example.selector).toBe('[data-ui-example]');
  });

  it("readyState 'loading': подписка на DOMContentLoaded ровно одна; событие инициализирует все инстансы", () => {
    const { window, document, domContentLoadedSubscriptions } = makeSandbox({
      readyState: 'loading',
      bodyHtml: twoInstancesHtml,
    });

    expect(domContentLoadedSubscriptions).toHaveLength(1);

    fireDOMContentLoaded(window);
    expect(initCount(document)).toBe(2);

    // Повторное событие ничего не меняет: второй проход init — no-op (guard).
    fireDOMContentLoaded(window);
    expect(initCount(document)).toBe(2);
  });

  it("readyState 'complete': init синхронный — инстансы готовы сразу, подписки нет", () => {
    const { window, document, domContentLoadedSubscriptions } = makeSandbox({
      readyState: 'complete',
      bodyHtml: twoInstancesHtml,
    });

    expect(initCount(document)).toBe(2);
    expect(domContentLoadedSubscriptions).toHaveLength(0);
  });

  it("readyState 'interactive': init синхронный — как 'complete'", () => {
    const { window, document, domContentLoadedSubscriptions } = makeSandbox({
      readyState: 'interactive',
      bodyHtml: twoInstancesHtml,
    });

    expect(initCount(document)).toBe(2);
    expect(domContentLoadedSubscriptions).toHaveLength(0);
  });
});

describe('module-template — отсутствие элементов', () => {
  it("readyState 'complete': init завершается без ошибок и без инстансов", () => {
    const { window, document, warnings } = makeSandbox({ readyState: 'complete' });

    expect(initCount(document)).toBe(0);
    expect(warnings).toHaveLength(0);
    expect(typeof window.IraoUI.example.init).toBe('function');
  });

  it("readyState 'loading': init молча ждёт DOMContentLoaded и корректно выходит при пустом DOM", () => {
    const { window, document, warnings } = makeSandbox({ readyState: 'loading' });

    fireDOMContentLoaded(window);

    expect(initCount(document)).toBe(0);
    expect(warnings).toHaveLength(0);
  });
});

describe('module-template — отказоустойчивость init', () => {
  // Оба теста — в режиме 'loading': init отложен, поэтому патчи на элементах
  // ставятся ДО инициализации (в 'complete' init уже отработал внутри
  // makeSandbox, и повторный вызов — no-op по guard'у).
  it('ошибка одного инстанса ловится (console.warn), не мешает соседям и регистрации', () => {
    const { window, document, warnings } = makeSandbox({
      readyState: 'loading',
      bodyHtml: twoInstancesHtml,
    });

    // Первый инстанс «сломан»: привязка слушателя бросает (флаг ещё не стоит —
    // шаблон ставит его только после успешного addEventListener).
    const broken = document.querySelectorAll('[data-ui-example]')[0];
    broken.addEventListener = () => {
      throw new Error('boom');
    };

    window.IraoUI.example.init();

    expect(warnings).toHaveLength(1);
    expect(initCount(document)).toBe(1);
    expect(broken.hasAttribute(INIT_ATTR)).toBe(false);
    expect(typeof window.IraoUI.example.init).toBe('function');
  });

  it('повторный вызов init() не создаёт дублей (guard повторной инициализации)', () => {
    const { window, document } = makeSandbox({
      readyState: 'loading',
      bodyHtml: '<div data-ui-example></div>',
    });

    const root = document.querySelector('[data-ui-example]');
    const clickBindings = [];
    const originalAddEventListener = root.addEventListener.bind(root);
    root.addEventListener = (type, listener, options) => {
      if (type === 'click') {
        clickBindings.push(listener);
      }
      return originalAddEventListener(type, listener, options);
    };

    window.IraoUI.example.init();
    window.IraoUI.example.init();

    expect(clickBindings).toHaveLength(1);
    expect(initCount(document)).toBe(1);
  });
});

describe("module-template — имя модуля в kebab-case ('skip-link')", () => {
  // Копия шаблона с двумя «НАСТРОЙКА»-местами, заменёнными на kebab-case-имя;
  // флаг инициализации собирается в data-ui-skip-link-init через setAttribute.
  const skipLinkSource = templateSource
    .replace("var MODULE_NAME = 'example';", "var MODULE_NAME = 'skip-link';")
    .replace("var SELECTOR = '[data-ui-example]';", "var SELECTOR = '[data-ui-skip-link]';");

  const SKIP_INIT_ATTR = 'data-ui-skip-link-init';
  const skipLinkHtml = '<a data-ui-skip-link href="#main"></a>';

  it('обе НАСТРОЙКИ подменены (защита от дрейфа шаблона)', () => {
    expect(skipLinkSource).toContain("var MODULE_NAME = 'skip-link';");
    expect(skipLinkSource).toContain("var SELECTOR = '[data-ui-skip-link]';");
  });

  it("readyState 'loading' и 'complete': контракт пп. 1–5 не ломается", () => {
    const deferred = makeSandbox({
      readyState: 'loading',
      bodyHtml: skipLinkHtml,
      source: skipLinkSource,
    });
    expect(initCount(deferred.document, SKIP_INIT_ATTR)).toBe(0);
    fireDOMContentLoaded(deferred.window);
    expect(initCount(deferred.document, SKIP_INIT_ATTR)).toBe(1);
    expect(deferred.window.IraoUI['skip-link'].selector).toBe('[data-ui-skip-link]');

    const sync = makeSandbox({
      readyState: 'complete',
      bodyHtml: skipLinkHtml,
      source: skipLinkSource,
    });
    expect(initCount(sync.document, SKIP_INIT_ATTR)).toBe(1);
    expect(sync.domContentLoadedSubscriptions).toHaveLength(0);

    sync.window.IraoUI['skip-link'].init();
    expect(initCount(sync.document, SKIP_INIT_ATTR)).toBe(1);
  });
});

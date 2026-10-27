/**
 * Юнит-пин механизма deprecation (T12.2; ADR-0007, 02-architecture §11).
 *
 * Dev-модуль base/deprecations.js — работающий механизм ДО первого
 * deprecated: реестр deprecated-классов, console.warn при использовании
 * имени в DOM, скан при старте и MutationObserver для динамики. Модуль
 * попадает ТОЛЬКО в dev-сборку dist/ui.dev.js (showcase/build.mjs):
 * прод-бандл ui.min.js молчит — ADR-0007 «dev-сборка пишет warning в
 * консоль».
 *
 * Изоляция — как в эталонном tests/unit/module-template.test.js: песочница
 * `new JSDOM(..., { runScripts: 'outside-only' })` на каждый тест, модуль
 * исполняется через window.eval в КОНТЕКСТЕ песочницы; readyState
 * перекрывается геттером на инстансе документа. Реестр заполняется через
 * публичный массив window.IraoUI.dev.deprecations — в бою записи правятся в
 * исходнике до загрузки, сценарий «заполнен до init» покрывается веткой
 * readyState 'loading' + DOMContentLoaded.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

// import.meta.dirname под module-runner Vitest — cwd-независим (как в эталоне T1.6).
const moduleSource = readFileSync(join(import.meta.dirname, '../../base/deprecations.js'), 'utf8');
const buildSource = readFileSync(join(import.meta.dirname, '../../showcase/build.mjs'), 'utf8');

/** Демо-запись реестра: формат { name, since, useInstead, note? }. */
const DEMO = { name: 'ui-demo-old', since: '0.2.0', useInstead: 'ui-demo-new' };

/**
 * Песочница: документ с заданным readyState; шпионы на подписку
 * DOMContentLoaded и перехват console.warn (модуль пишет в window.console.warn).
 * registryAfterEval — записи, дописываемые в публичный реестр СРАЗУ после
 * исполнения модуля (до init в ветке 'loading', после — для ручных сценариев).
 */
function makeSandbox({ readyState = 'complete', bodyHtml = '', registryAfterEval = [] } = {}) {
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

  window.eval(moduleSource);
  window.IraoUI.dev.deprecations.push(...registryAfterEval);

  return { window, document, domContentLoadedSubscriptions, warnings };
}

function fireDOMContentLoaded(window) {
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
}

/** Полный текст первого предупреждения по имени (args сплющены в строку). */
function warningText(warnings, name) {
  const found = warnings.find((args) => args.join(' ').includes(name));
  return found ? found.join(' ') : '';
}

describe('механизм deprecation: модуль window.IraoUI.dev (base/deprecations.js, T12.2)', () => {
  it('регистрация в window.IraoUI.dev — сразу, включая отложенный init (контракт модулей)', () => {
    const { window, warnings } = makeSandbox({ readyState: 'loading' });

    expect(window.IraoUI.dev).toBeDefined();
    expect(Array.isArray(window.IraoUI.dev.deprecations)).toBe(true);
    expect(window.IraoUI.dev.deprecations).toHaveLength(0); // deprecated ещё нет — механизм пуст
    expect(typeof window.IraoUI.dev.scan).toBe('function');
    expect(warnings).toEqual([]);
  });

  it("readyState 'loading': подписка на DOMContentLoaded ровно одна; init сканирует уже заполненный реестр", () => {
    const { window, domContentLoadedSubscriptions, warnings } = makeSandbox({
      readyState: 'loading',
      bodyHtml: '<div class="ui-demo-old"></div>',
      registryAfterEval: [DEMO],
    });

    expect(domContentLoadedSubscriptions).toHaveLength(1);
    expect(warnings).toEqual([]); // до события — тишина

    fireDOMContentLoaded(window);
    expect(warningText(warnings, 'ui-demo-old')).not.toBe('');

    // Повторное событие — init идемпотентен: дубли предупреждений не появляются.
    fireDOMContentLoaded(window);
    expect(warnings).toHaveLength(1);
  });

  it("readyState 'complete': скан при старте находит deprecated-класс без ручного вызова", () => {
    // Записи реестра живут в исходнике модуля (бой: правка base/deprecations.js
    // в minor-PR), поэтому «заполнен до init» моделируется подстановкой литерала.
    const sourceWithDemo = moduleSource.replace(
      'var DEPRECATIONS = [];',
      "var DEPRECATIONS = [{ name: 'ui-demo-old', since: '0.2.0', useInstead: 'ui-demo-new' }];",
    );
    const dom = new JSDOM(
      '<!doctype html><html><body><div class="ui-demo-old"></div></body></html>',
      {
        url: 'https://showcase.test/',
        runScripts: 'outside-only',
      },
    );
    Object.defineProperty(dom.window.document, 'readyState', {
      configurable: true,
      get: () => 'complete',
    });
    const warnings = [];
    dom.window.console.warn = (...args) => warnings.push(args);

    dom.window.eval(sourceWithDemo);

    expect(warnings).toHaveLength(1);
    expect(dom.window.IraoUI.dev.deprecations).toHaveLength(1);
  });

  it('пустой реестр — скан молчит (механизм существует до первого deprecated)', () => {
    const { window, document, warnings } = makeSandbox({
      bodyHtml: '<div class="ui-anything"></div>',
    });

    expect(window.IraoUI.dev.scan(document)).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('scan() возвращает имена, по которым отправлено предупреждение; текст содержит имя, since и замену', () => {
    const { window, document, warnings } = makeSandbox({
      registryAfterEval: [DEMO],
      bodyHtml: '<div class="ui-demo-old"></div>',
    });

    const fired = window.IraoUI.dev.scan(document);
    expect(fired).toEqual(['ui-demo-old']);

    const text = warningText(warnings, 'ui-demo-old');
    expect(text).toContain('[IraoUI:dev]');
    expect(text).toContain('ui-demo-old');
    expect(text).toContain('0.2.0');
    expect(text).toContain('ui-demo-new');
  });

  it('warn-once: два элемента одного имени — одно предупреждение; повторный scan молчит', () => {
    const { window, document, warnings } = makeSandbox({
      registryAfterEval: [DEMO],
      bodyHtml: '<div class="ui-demo-old"></div><div class="ui-demo-old"></div>',
    });

    expect(window.IraoUI.dev.scan(document)).toEqual(['ui-demo-old']);
    expect(warnings).toHaveLength(1);

    expect(window.IraoUI.dev.scan(document)).toEqual([]);
    expect(warnings).toHaveLength(1);
  });

  it('корень скана тоже проверяется: scan(element) на элементе с deprecated-классом предупреждает', () => {
    const { window, document } = makeSandbox({ registryAfterEval: [DEMO] });
    const el = document.createElement('div');
    el.className = 'ui-demo-old';
    document.body.appendChild(el);

    expect(window.IraoUI.dev.scan(el)).toEqual(['ui-demo-old']);
  });

  it('разные имена реестра — разные предупреждения (по одному на имя)', () => {
    const { window, document, warnings } = makeSandbox({
      registryAfterEval: [
        DEMO,
        { name: 'ui-demo-second', since: '0.3.0', useInstead: 'ui-demo-third' },
      ],
      bodyHtml: '<div class="ui-demo-old ui-demo-second"></div>',
    });

    const fired = window.IraoUI.dev.scan(document);
    expect(fired).toEqual(['ui-demo-old', 'ui-demo-second']);
    expect(warnings).toHaveLength(2);
  });

  it('MutationObserver: элемент, добавленный после init, предупреждает без ручного скана', async () => {
    const { document, warnings } = makeSandbox({ registryAfterEval: [DEMO] });

    const el = document.createElement('div');
    el.className = 'ui-demo-old';
    document.body.appendChild(el);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(warningText(warnings, 'ui-demo-old')).not.toBe('');
  });

  it('MutationObserver: добавление deprecated-класса существующему элементу (classList.add) ловится', async () => {
    const { document, warnings } = makeSandbox({
      registryAfterEval: [DEMO],
      bodyHtml: '<div id="target"></div>',
    });

    document.getElementById('target').classList.add('ui-demo-old');

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(warningText(warnings, 'ui-demo-old')).not.toBe('');
  });

  it('guard console: без window.console.warn скан не роняет страницу', () => {
    const dom = new JSDOM(
      '<!doctype html><html><body><div class="ui-demo-old"></div></body></html>',
      {
        url: 'https://showcase.test/',
        runScripts: 'outside-only',
      },
    );
    const { window } = dom;
    Object.defineProperty(window.document, 'readyState', {
      configurable: true,
      get: () => 'complete',
    });
    window.console = undefined;
    window.eval(moduleSource);
    window.IraoUI.dev.deprecations.push(DEMO);

    expect(window.IraoUI.dev.scan(window.document)).toEqual(['ui-demo-old']);
  });

  it('битая запись реестра (имя даёт невалидный селектор) не роняет скан остальных', () => {
    const { window, document, warnings } = makeSandbox({
      // '[' в имени делает селектор '.ui-demo[' невалидным — querySelectorAll
      // бросает SyntaxError; модуль обязан пропустить запись с объяснением.
      registryAfterEval: [{ name: 'ui-demo[', since: '0.2.0' }, DEMO],
      bodyHtml: '<div class="ui-demo-old"></div>',
    });

    expect(window.IraoUI.dev.scan(document)).toEqual(['ui-demo-old']);
    // Причина пропуска объяснима в консоли, но страница работает.
    expect(warningText(warnings, 'ui-demo[')).not.toBe('');
    expect(warningText(warnings, 'ui-demo-old')).not.toBe('');
  });
});

describe('сборка: dev-вариант ui.min.js (T12.2, showcase/build.mjs)', () => {
  it('ui.dev.js выпускается в обе точки раздачи и получает баннер версии + попадает в selfChecks', () => {
    expect(buildSource).toContain("join(target, 'ui.dev.js')");
    // Список баннер-проверки рантайма: ui-patterns.css добавлен T17.1
    // (паттерн-слой — четвёртый CSS-файл поставки с баннером); \s* —
    // однострочный/многострочный вид списка не влияет на пин.
    expect(buildSource).toMatch(
      /'ui-core\.min\.css',\s*'ui-vi\.min\.css',\s*'ui-patterns\.css',\s*'ui\.min\.js',\s*'ui\.dev\.js'/,
    );
  });

  it('base/deprecations.js — только в dev-бандле, без минификации (minify: false)', () => {
    expect(buildSource).toMatch(/JS_DEV_ONLY\s*=\s*\[\s*'base\/deprecations\.js'\s*\]/);
    expect(buildSource).toMatch(/\[\.\.\.jsFiles, \.\.\.JS_DEV_ONLY\],\s*'js',\s*false/);
  });

  it('прод-бандл ui.min.js собирается из jsFiles без base/deprecations.js (прод молчит)', () => {
    const prodBundle = buildSource.match(/const uiJs = await bundle\(([^;]+)\);/);
    expect(prodBundle).not.toBeNull();
    expect(prodBundle[1]).not.toContain('deprecations');
  });
});

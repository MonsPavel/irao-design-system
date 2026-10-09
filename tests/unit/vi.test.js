/**
 * Юнит-тесты VI-модуля (задача T9.1; Testing requirements — tests first).
 *
 * Поверхность браузера (включение, темы, размеры, персистентность,
 * выключение, тема×стенды) — tests/e2e/ui-vi.spec.js; здесь — чистая логика
 * состояния (parse/apply/save/merge-defaults, Implementation requirements
 * п.3) и guard'ы модуля:
 *  - parse: мусор localStorage / не-объект JSON → null, без бросков;
 *  - merge-defaults: частично сохранённое состояние дополняется дефолтами;
 *    вход в режим — сброс к дефолтам ГОСТ-панели (поведение career-portal);
 *  - apply: классы режимов на body («темы/режимы — как есть»), синхронизация
 *    aria-pressed сегментных кнопок и кнопки входа, hidden панели,
 *    padding-top по offsetHeight панели;
 *  - save: JSON под ключом `irao-ui-vi` (BREAKING против career-portal
 *    'vi-settings' — career-portal не потребляет пакет, зафиксировано в
 *    доке компонента); try/catch вокруг чтения и записи — режим без
 *    сохранения не роняет страницу.
 *
 * Изоляция: песочница `new JSDOM(..., { runScripts: 'outside-only' })` на
 * каждый тест — a11y/vi.js исполняется через window.eval в КОНТЕКСТЕ
 * песочницы (образец — tests/unit/module-template.test.js, T1.6).
 * window.scrollTo в jsdom не реализован — перекрыт заглушкой с записью
 * вызовов (пин «scrollTo(0) при переключении»).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

import { contrastRatio, declarationsFromTokenFile, resolveTokenColor } from '../contrast/lib.mjs';

const viSource = readFileSync(join(import.meta.dirname, '../../a11y/vi.js'), 'utf8');
const viCss = readFileSync(join(import.meta.dirname, '../../a11y/vi.css'), 'utf8');

const STORAGE_KEY = 'irao-ui-vi';

/** Темы ГОСТ Р 52872 (career-portal vi.css, «как есть»). */
const THEMES_GOST = ['baw', 'wb', 'bb', 'beige', 'green'];

/** Панель и кнопки для DOM-проверок apply (сокращённый канонический паттерн). */
const panelHtml = [
  '<div class="ui-vi-bar" data-ui-vi-panel hidden>',
  '  <button type="button" data-ui-vi-set="size:md" aria-pressed="false">A</button>',
  '  <button type="button" data-ui-vi-set="size:lg" aria-pressed="false">A</button>',
  '  <button type="button" data-ui-vi-set="theme:bb" aria-pressed="false">Синим по голубому</button>',
  '  <button type="button" data-ui-vi-set="img:off" aria-pressed="false">выкл</button>',
  '  <button type="button" data-ui-vi-toggle aria-pressed="false">Обычная версия сайта</button>',
  '</div>',
].join('\n');

/**
 * Песочница: документ с заданным readyState, телом и содержимым localStorage
 * (сеется ДО eval — модуль читает сохранённое состояние на этапе исполнения
 * скрипта, как career-portal). brokenStorage=true — доступ к localStorage
 * бросает (корп. ИБ/приватный режим): модуль обязан работать без сохранения.
 */
function makeSandbox({
  readyState = 'complete',
  bodyHtml = '',
  storage = {},
  brokenStorage = false,
} = {}) {
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

  if (brokenStorage) {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError: доступ к localStorage запрещён');
      },
    });
  } else {
    for (const [key, value] of Object.entries(storage)) {
      window.localStorage.setItem(key, value);
    }
  }

  const domContentLoadedSubscriptions = [];
  const originalAddEventListener = document.addEventListener.bind(document);
  vi.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
    if (type === 'DOMContentLoaded') {
      domContentLoadedSubscriptions.push(listener);
    }
    return originalAddEventListener(type, listener, options);
  });

  const scrollToCalls = [];
  window.scrollTo = (...args) => scrollToCalls.push(args);

  window.eval(viSource);

  return { window, document, domContentLoadedSubscriptions, scrollToCalls };
}

function fireDOMContentLoaded(window) {
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
}

/** Классы режимов VI на body (все семейства). */
function viClasses(body) {
  return [...body.classList].filter((c) => c === 'vi' || c.startsWith('vi-'));
}

describe('a11y/vi.js — публичный API и ключ хранения (breaking T9.1)', () => {
  it('модуль зарегистрирован как window.IraoUI.vi сразу, в любом readyState', () => {
    const deferred = makeSandbox({ readyState: 'loading' });
    expect(typeof deferred.window.IraoUI.vi.init).toBe('function');
    expect(typeof deferred.window.IraoUI.vi.apply).toBe('function');
    expect(typeof deferred.window.IraoUI.vi.set).toBe('function');
    expect(typeof deferred.window.IraoUI.vi.toggle).toBe('function');

    const sync = makeSandbox({ readyState: 'complete' });
    expect(typeof sync.window.IraoUI.vi.init).toBe('function');
  });

  it("ключ localStorage — 'irao-ui-vi' (career-portal 'vi-settings' не переносится); старого ключа в исполняемом коде нет", () => {
    const { window } = makeSandbox({ readyState: 'complete' });
    expect(window.IraoUI.vi.STORAGE_KEY).toBe('irao-ui-vi');
    // Пин — по исполняемому коду: шапка-комментарий вправе упоминать старый
    // ключ как историю breaking-изменения (тот же приём, что stripCssComments
    // в dropdown.test.js).
    const code = viSource.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toContain('vi-settings');
  });

  it('дефолты ГОСТ-панели: off, md, baw, on, normal', () => {
    const { window } = makeSandbox({ readyState: 'complete' });
    expect(window.IraoUI.vi.DEFAULTS).toEqual({
      on: false,
      size: 'md',
      theme: 'baw',
      img: 'on',
      kern: 'normal',
    });
  });
});

describe('a11y/vi.js — parse: мусор хранилища не роняет и не применяется', () => {
  it.each([
    ['не JSON', 'мусор'],
    ['JSON null', 'null'],
    ['JSON число', '42'],
    ['JSON строка', '"строка"'],
    ['пустая строка', ''],
  ])('parseSaved(%s) → null', (_label, raw) => {
    const { window } = makeSandbox({ readyState: 'complete' });
    expect(window.IraoUI.vi.parseSaved(raw)).toBeNull();
  });

  it('parseSaved(валидный JSON-объект) → объект', () => {
    const { window } = makeSandbox({ readyState: 'complete' });
    expect(window.IraoUI.vi.parseSaved('{"theme":"bb"}')).toEqual({ theme: 'bb' });
  });

  it('битый JSON в localStorage: состояние — дефолты, страница жива (классов режимов нет — режим off)', () => {
    const { window, document } = makeSandbox({
      readyState: 'loading',
      bodyHtml: panelHtml,
      storage: { [STORAGE_KEY]: '{битый json' },
    });

    fireDOMContentLoaded(window);

    expect(viClasses(document.body)).toEqual([]);
    expect(window.IraoUI.vi.state).toEqual({
      on: false,
      size: 'md',
      theme: 'baw',
      img: 'on',
      kern: 'normal',
    });
  });

  it('localStorage недоступен (бросает): состояние — дефолты, страница жива', () => {
    const { window, document } = makeSandbox({
      readyState: 'loading',
      bodyHtml: panelHtml,
      brokenStorage: true,
    });

    fireDOMContentLoaded(window);

    expect(viClasses(document.body)).toEqual([]);
    expect(document.body.classList.contains('vi')).toBe(false);
    expect(window.IraoUI.vi.state).toEqual(window.IraoUI.vi.DEFAULTS);
  });
});

describe('a11y/vi.js — merge-defaults', () => {
  it('частично сохранённое дополняется дефолтами, сохранённое побеждает', () => {
    const { window } = makeSandbox({ readyState: 'complete' });
    const api = window.IraoUI.vi;

    expect(api.mergeState(api.DEFAULTS, { theme: 'green', on: true })).toEqual({
      on: true,
      size: 'md',
      theme: 'green',
      img: 'on',
      kern: 'normal',
    });
  });

  it('null вместо сохранённого — копия дефолтов; исходники не мутируются', () => {
    const { window } = makeSandbox({ readyState: 'complete' });
    const api = window.IraoUI.vi;
    const frozen = { ...api.DEFAULTS };

    const merged = api.mergeState(api.DEFAULTS, null);
    merged.size = 'lg';

    expect(api.DEFAULTS).toEqual(frozen);
    expect(api.DEFAULTS.size).toBe('md');
  });
});

describe('a11y/vi.js — загрузка сохранённого состояния при старте', () => {
  it('сохранённое «вкл + bb/lg/off/wide» применяется на body и панель раскрывается', () => {
    const { window, document } = makeSandbox({
      readyState: 'loading',
      bodyHtml: panelHtml,
      storage: {
        [STORAGE_KEY]: JSON.stringify({
          on: true,
          theme: 'bb',
          size: 'lg',
          img: 'off',
          kern: 'wide',
        }),
      },
    });

    // До DOMContentLoaded ничего не применяется.
    expect(document.body.classList.contains('vi')).toBe(false);

    fireDOMContentLoaded(window);

    expect(document.body.classList.contains('vi')).toBe(true);
    expect(document.body.classList.contains('vi-theme--bb')).toBe(true);
    expect(document.body.classList.contains('vi-size--lg')).toBe(true);
    expect(document.body.classList.contains('vi-img--off')).toBe(true);
    expect(document.body.classList.contains('vi-kern--wide')).toBe(true);
    expect(document.querySelector('[data-ui-vi-panel]').hidden).toBe(false);
  });

  it('сохранённое «выкл» режим не включает (класса vi нет)', () => {
    const { window, document } = makeSandbox({
      readyState: 'loading',
      storage: { [STORAGE_KEY]: JSON.stringify({ on: false, theme: 'green' }) },
    });

    fireDOMContentLoaded(window);

    expect(document.body.classList.contains('vi')).toBe(false);
  });
});

describe('a11y/vi.js — apply: классы, aria-pressed, панель, padding-top', () => {
  it('включение: классы дефолтов на body, aria-pressed кнопок синхронизирован, панель видима', () => {
    const { window, document } = makeSandbox({
      readyState: 'loading',
      bodyHtml: panelHtml,
    });

    fireDOMContentLoaded(window);
    document.querySelector('[data-ui-vi-toggle]').click();

    expect(viClasses(document.body).sort()).toEqual(['vi', 'vi-size--md', 'vi-theme--baw']);
    expect(document.querySelector('[data-ui-vi-panel]').hidden).toBe(false);
    expect(document.querySelector('[data-ui-vi-set="size:md"]').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(document.querySelector('[data-ui-vi-set="size:lg"]').getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(document.querySelector('[data-ui-vi-toggle]').getAttribute('aria-pressed')).toBe('true');
    // jsdom: offsetHeight = 0 → '0px'; реальная высота панели — e2e (T9.1).
    expect(document.body.style.paddingTop).toBe('0px');
  });

  it('переключение сегментной кнопки меняет класс и aria-pressed всей группы', () => {
    const { window, document } = makeSandbox({
      readyState: 'loading',
      bodyHtml: panelHtml,
    });

    fireDOMContentLoaded(window);
    // Сегментные кнопки живут в панели — доступны только в режиме (панель
    // hidden вне режима): сначала вход, затем переключение темы.
    document.querySelector('[data-ui-vi-toggle]').click();
    document.querySelector('[data-ui-vi-set="theme:bb"]').click();

    expect(document.body.classList.contains('vi-theme--bb')).toBe(true);
    expect(document.body.classList.contains('vi-theme--baw')).toBe(false);
    expect(document.querySelector('[data-ui-vi-set="theme:bb"]').getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('img:off / kern:wide включают соответствующие классы, img:on снимает', () => {
    const { window, document } = makeSandbox({
      readyState: 'loading',
      bodyHtml: panelHtml,
    });

    fireDOMContentLoaded(window);
    document.querySelector('[data-ui-vi-toggle]').click();

    document.querySelector('[data-ui-vi-set="img:off"]').click();
    expect(document.body.classList.contains('vi-img--off')).toBe(true);

    window.IraoUI.vi.set('img', 'gray');
    expect(document.body.classList.contains('vi-img--off')).toBe(false);
    expect(document.body.classList.contains('vi-img--gray')).toBe(true);

    window.IraoUI.vi.set('img', 'on');
    expect(document.body.className).not.toContain('vi-img--');

    window.IraoUI.vi.set('kern', 'wide');
    expect(document.body.classList.contains('vi-kern--wide')).toBe(true);
  });
});

describe('a11y/vi.js — поведение входа/выхода (career-portal «как есть»)', () => {
  it('вход в режим сбрасывает настройки к дефолтам ГОСТ-панели', () => {
    const { window, document } = makeSandbox({
      readyState: 'loading',
      bodyHtml: panelHtml,
      storage: {
        [STORAGE_KEY]: JSON.stringify({ on: true, theme: 'green', size: 'lg', kern: 'wide' }),
      },
    });

    fireDOMContentLoaded(window);
    expect(document.body.classList.contains('vi-theme--green')).toBe(true);

    // Выход…
    document.querySelector('[data-ui-vi-toggle]').click();
    expect(document.body.classList.contains('vi')).toBe(false);

    // …и повторный вход — к дефолтам, а не к green/lg/wide.
    document.querySelector('[data-ui-vi-toggle]').click();
    expect(document.body.classList.contains('vi')).toBe(true);
    expect(document.body.classList.contains('vi-theme--baw')).toBe(true);
    expect(document.body.classList.contains('vi-size--md')).toBe(true);
    expect(document.body.classList.contains('vi-kern--wide')).toBe(false);
  });

  it('выключение полностью снимает классы режимов и отступ панели', () => {
    const { window, document } = makeSandbox({
      readyState: 'loading',
      bodyHtml: panelHtml,
      storage: {
        [STORAGE_KEY]: JSON.stringify({
          on: true,
          theme: 'beige',
          size: 'sm',
          img: 'gray',
          kern: 'wide',
        }),
      },
    });

    fireDOMContentLoaded(window);
    expect(viClasses(document.body).length).toBeGreaterThan(1);

    document.querySelector('[data-ui-vi-toggle]').click();

    expect(viClasses(document.body)).toEqual([]);
    expect(document.body.style.paddingTop).toBe('');
    expect(document.querySelector('[data-ui-vi-panel]').hidden).toBe(true);
    expect(document.querySelector('[data-ui-vi-toggle]').getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('переключение режима сопровождается scrollTo({ top: 0 })', () => {
    const { window, document, scrollToCalls } = makeSandbox({
      readyState: 'loading',
      bodyHtml: panelHtml,
    });

    fireDOMContentLoaded(window);
    document.querySelector('[data-ui-vi-toggle]').click();
    document.querySelector('[data-ui-vi-toggle]').click();

    expect(scrollToCalls).toEqual([[{ top: 0 }], [{ top: 0 }]]);
  });
});

describe('a11y/vi.js — save: JSON под ключом irao-ui-vi, сбои записи не роняют', () => {
  it('set() сохраняет состояние JSON-строкой под ключом irao-ui-vi', () => {
    const { window } = makeSandbox({ readyState: 'loading', bodyHtml: panelHtml });

    fireDOMContentLoaded(window);
    window.IraoUI.vi.set('theme', 'bb');

    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    expect(saved).toMatchObject({ theme: 'bb', size: 'md', img: 'on', kern: 'normal' });
  });

  it('запись бросает (квота/приватный режим): состояние применяется, страница жива', () => {
    const { window, document } = makeSandbox({ readyState: 'loading', bodyHtml: panelHtml });

    fireDOMContentLoaded(window);
    const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    // Вход в режим (панель доступна только в нём), затем смена темы.
    document.querySelector('[data-ui-vi-toggle]').click();
    expect(() => window.IraoUI.vi.set('theme', 'bb')).not.toThrow();
    expect(document.body.classList.contains('vi-theme--bb')).toBe(true);
    expect(originalSetItem).toBeDefined();
  });
});

describe('a11y/vi.js — guard-ы модуля (контракт docs/templates/module-template.js)', () => {
  // Применение состояния при off наблюдаем по синхронизации aria-pressed
  // сегментной кнопки (классы режимов при off на body не ставятся — AC T9.1).
  it("readyState 'loading': применение отложено одной подпиской на DOMContentLoaded", () => {
    const { window, document, domContentLoadedSubscriptions } = makeSandbox({
      readyState: 'loading',
      bodyHtml: panelHtml,
    });

    expect(domContentLoadedSubscriptions).toHaveLength(1);
    expect(document.body.className).not.toContain('vi');
    expect(document.querySelector('[data-ui-vi-set="size:md"]').getAttribute('aria-pressed')).toBe(
      'false',
    );

    fireDOMContentLoaded(window);
    expect(document.querySelector('[data-ui-vi-set="size:md"]').getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it("readyState 'complete'/'interactive': применяется синхронно, без подписки", () => {
    for (const readyState of ['complete', 'interactive']) {
      const { document, domContentLoadedSubscriptions } = makeSandbox({
        readyState,
        bodyHtml: panelHtml,
      });
      expect(
        document.querySelector('[data-ui-vi-set="size:md"]').getAttribute('aria-pressed'),
      ).toBe('true');
      expect(domContentLoadedSubscriptions).toHaveLength(0);
    }
  });

  it('отсутствие панели и кнопок — не ошибка: состояние всё равно применяется', () => {
    const { window, document } = makeSandbox({
      readyState: 'loading',
      storage: { [STORAGE_KEY]: JSON.stringify({ on: true, theme: 'bb' }) },
    });

    expect(() => fireDOMContentLoaded(window)).not.toThrow();
    expect(document.body.classList.contains('vi-theme--bb')).toBe(true);
  });

  it('повторный init() не навешивает дубли слушателей', () => {
    const { window, document } = makeSandbox({ readyState: 'loading', bodyHtml: panelHtml });

    const toggle = document.querySelector('[data-ui-vi-toggle]');
    const originalAddEventListener = toggle.addEventListener.bind(toggle);
    let clickListeners = 0;
    toggle.addEventListener = (type, listener, options) => {
      if (type === 'click') clickListeners += 1;
      return originalAddEventListener(type, listener, options);
    };

    fireDOMContentLoaded(window);
    window.IraoUI.vi.init();

    expect(clickListeners).toBe(1);
  });
});

describe('a11y/vi.css — гарантированные пары тем ГОСТ (Accessibility requirements T9.1)', () => {
  /**
   * VI-темы — не токены, обычный контраст-гейт T2.3 их не видит (осознанное
   * исключение в шапке tests/contrast/pairs.config.mjs): «проверка в T9.1».
   * Здесь — машин-контроль: константы пар из :root vi.css против порога AA
   * текста (4.5:1); соответствие computed на страницах — e2e-матрица
   * «тема × стенды EPIC-4/5» (tests/e2e/ui-vi.spec.js).
   */
  const THRESHOLD_TEXT = 4.5;

  /** Константы пар из :root-блока vi.css: имя → hex. */
  const viConstants = new Map(
    [
      ...viCss.match(/:root\s*\{([^}]*)\}/)[1].matchAll(/(--ui-vi-[a-z0-9-]+):\s*(#[0-9a-f]{6})/gi),
    ].map((match) => [match[1], match[2]]),
  );

  const themePair = (theme) => ({
    bg: viConstants.get(`--ui-vi-theme-${theme}-bg`),
    text: viConstants.get(`--ui-vi-theme-${theme}-text`),
  });

  it('константы всех пяти тем на месте (перенос career-portal «как есть»)', () => {
    expect([...viConstants.keys()].sort()).toEqual(
      [
        '--ui-vi-swatch-border-baw',
        '--ui-vi-swatch-border-beige',
        '--ui-vi-theme-baw-bg',
        '--ui-vi-theme-baw-text',
        '--ui-vi-theme-bb-bg',
        '--ui-vi-theme-bb-text',
        '--ui-vi-theme-beige-bg',
        '--ui-vi-theme-beige-text',
        '--ui-vi-theme-green-bg',
        '--ui-vi-theme-green-btn-text',
        '--ui-vi-theme-green-text',
        '--ui-vi-theme-wb-bg',
        '--ui-vi-theme-wb-text',
      ].sort(),
    );
  });

  it.each(THEMES_GOST)('пара темы %s — контраст ≥ 4.5:1 (AA текста)', (theme) => {
    const { bg, text } = themePair(theme);
    expect(contrastRatio(text, bg)).toBeGreaterThanOrEqual(THRESHOLD_TEXT);
  });

  it('кнопочные пары тем (bg = текст темы) — контраст ≥ 4.5:1', () => {
    // Кнопки перекрашиваются фоном = цвет текста темы (vi.css: .ui-button);
    // подписка — white (bb/beige, токен --ui-color-text-on-dark) и
    // тёмно-зелёный (green, --ui-vi-theme-green-btn-text).
    const declarations = new Map([
      ...declarationsFromTokenFile(
        readFileSync(join(import.meta.dirname, '../../tokens/primitives.css'), 'utf8'),
        'primitive',
      ),
      ...declarationsFromTokenFile(
        readFileSync(join(import.meta.dirname, '../../tokens/semantic.css'), 'utf8'),
        'semantic',
      ),
    ]);
    const white = resolveTokenColor('--ui-color-text-on-dark', declarations);

    expect(contrastRatio(white, viConstants.get('--ui-vi-theme-bb-text'))).toBeGreaterThanOrEqual(
      THRESHOLD_TEXT,
    );
    expect(
      contrastRatio(white, viConstants.get('--ui-vi-theme-beige-text')),
    ).toBeGreaterThanOrEqual(THRESHOLD_TEXT);
    expect(
      contrastRatio(
        viConstants.get('--ui-vi-theme-green-btn-text'),
        viConstants.get('--ui-vi-theme-green-text'),
      ),
    ).toBeGreaterThanOrEqual(THRESHOLD_TEXT);
  });

  it('hex в vi.css — только в :root-блоке констант (осознанное исключение инварианта hex)', () => {
    // Инвариант «hex только в tokens/primitives.css»: для ГОСТ-модуля
    // исключение — один блок констант (цвета не бренд-палитра, в tokens/ не
    // попадают — §3.2). Комментарии не считаются (пины смотрят на код).
    const code = viCss.replace(/\/\*[\s\S]*?\*\//g, '');
    const rootBlock = code.match(/:root\s*\{[^}]*\}/)[0];
    expect(code.replace(rootBlock, '')).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

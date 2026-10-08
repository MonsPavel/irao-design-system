/**
 * Юнит-пин ui-modal (задача T7.2; Testing requirements — tests first).
 *
 * Поверхность браузера — dialog-чек-лист (trap/Escape/restore/повторные
 * циклы/скролл-лок), axe и эталоны — в tests/e2e/ui-modal.spec.js; здесь —
 * пины исполняемой формы решения ADR-0011 (основа — native <dialog> +
 * showModal(), собственный оверлей отвергнут):
 *  - tokens/semantic.css: --ui-z-modal из лестницы T2.2 существует, но в
 *    CSS компонента НЕ используется (top-layer выше любых z-index; Technical
 *    considerations: «z-index (если собственный)» — собственный отвергнут);
 *    --ui-color-overlay существует (фон ::backdrop);
 *  - components/ui-modal/ui-modal.css: @define modal; box-sizing на корне
 *    (ADR-0002); ::backdrop — только токен --ui-color-overlay; класс
 *    is-closing только в цепочке с блоком (§2); открытие — @starting-style
 *    (ADR-0011 К5); без !important и hex; hover — только под (hover: hover);
 *  - base/reset.css: kill-switch reduced-motion накрывает *::backdrop —
 *    сопутствующее обязательство (а) ADR-0011, T7.2;
 *  - канонический паттерн: native <dialog> с data-ui-modal, aria-labelledby,
 *    __close с доступным именем «Закрыть», __title, __body; атрибут open в
 *    разметке есть (деградация без JS — статичный инлайн, К9 ADR-0011),
 *    модуль снимает его при инициализации;
 *  - контракт модуля IraoUI.modal (jsdom-песочница — образец
 *    tests/unit/module-template.test.js, T1.6): readyState-guard, guard
 *    отсутствия элементов, отказоустойчивость init, guard повторной
 *    инициализации, флаг — data-атрибут (не dataset). jsdom не реализует
 *    методы <dialog>, поэтому песочница получает минимальный полифилл
 *    showModal/close с событием close — нативная семантика (trap, Escape,
 *    top-layer) остаётся классом Playwright;
 *  - init-мутации: снятие статичного open, aria-labelledby на заголовок
 *    (id генерируется при отсутствии); is-closing снимается НА close
 *    (контракт ADR-0011: иначе класс зажимает opacity и ломает повторные
 *    циклы — регресс-кейс career-portal); скролл-лок ставит overflow на
 *    корень и снимает без остаточных эффектов.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев: пины смотрят на исполняемый код, а не на прозу шапки. */
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (начало строки — селектор, до закрывающей скобки). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

describe('tokens/semantic.css — лестница T2.2 (Technical considerations T7.2)', () => {
  const source = readFileSync(join(root, 'tokens', 'semantic.css'), 'utf8');

  it('--ui-z-modal = 300 существует, но компонент его НЕ читает (top-layer выше любых z-index)', () => {
    expect(source).toMatch(/--ui-z-modal:\s*300;/);
    const css = stripCssComments(
      readFileSync(join(root, 'components', 'ui-modal', 'ui-modal.css'), 'utf8'),
    );
    expect(css, 'z-index в ui-modal.css нет — нативный top-layer (ADR-0011 К4)').not.toMatch(
      /z-index\s*:/,
    );
  });

  it('--ui-color-overlay существует — фон ::backdrop', () => {
    expect(source).toMatch(/--ui-color-overlay:/);
  });
});

describe('components/ui-modal/ui-modal.css — база (ADR-0002, ADR-0011)', () => {
  const path = join(root, 'components', 'ui-modal', 'ui-modal.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define modal — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define modal */')).toBe(true);
  });

  it('.ui-modal: box-sizing на корне (ADR-0002)', () => {
    const block = blockOf(css, '.ui-modal');
    expect(block, 'правило .ui-modal найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
  });

  it('::backdrop — фон только токен --ui-color-overlay (ADR-0011 К6)', () => {
    // Атрибут open может быть записан прямо или внутри :where() (конвенция
    // нулевой специфичности — прецедент aria-current ui-dropdown).
    const backdrop = css.match(/\.ui-modal(?:\[open\]|:where\(\[open\]\))::backdrop\s*\{([^}]*)\}/);
    expect(backdrop, 'правило ::backdrop найдено').toBeTruthy();
    expect(backdrop[1]).toContain('background-color: var(--ui-color-overlay);');
  });

  it('открытие — @starting-style (ADR-0011 К5: работает на всех трёх движках)', () => {
    expect(css).toMatch(/@starting-style\s*\{/);
  });

  it('закрывающее состояние — .is-closing только в цепочке с блоком (§2)', () => {
    // is-closing без .ui-modal в селекторе — нарушение конвенции состояний.
    const orphans = css.match(/^\.is-closing[^{]*\{/gm) ?? [];
    expect(orphans, 'is-closing живёт в цепочке (.ui-modal…is-closing)').toEqual([]);
    expect(css).toMatch(/\.ui-modal[^{]*\.is-closing/);
  });

  it('цвета — только токены слоя 2; без !important и hex (инварианты системы)', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it(':hover-правила — только внутри @media (hover: hover) (конвенция EPIC-4)', () => {
    const mediaIndex = css.indexOf('@media (hover: hover)');
    if (mediaIndex === -1) {
      expect(css, 'hover-правил нет вовсе — обёртка не требуется').not.toContain(':hover');
      return;
    }
    expect(css.slice(0, mediaIndex), 'до media-обёртки :hover нет').not.toContain(':hover');
  });

  it('рост — только mobile-first min-width из шкалы T2.5 (02-architecture §3.2)', () => {
    // max-width-МЕДИАЗАПРОСОВ нет (свойство max-width: none — кламп UA
    // dialog'а, не media-фича).
    expect(css, 'max-width-медиазапросов нет').not.toMatch(/@media[^{]*max-width/);
    const minWidths = [...css.matchAll(/min-width:\s*(\d+)px/g)].map((m) => Number(m[1]));
    expect(minWidths.length, 'media-рост присутствует').toBeGreaterThan(0);
    for (const value of minWidths) {
      expect([480, 768, 1024, 1280, 1440], `${value}px — из шкалы брейкпоинтов`).toContain(value);
    }
  });

  it('размеры --sm/--md/--full присутствуют (Scope)', () => {
    expect(css).toMatch(/\.ui-modal--sm/);
    expect(css).toMatch(/\.ui-modal--full/);
  });
});

describe('base/reset.css — kill-switch reduced-motion накрывает ::backdrop (обязательство (а) ADR-0011)', () => {
  const css = stripCssComments(readFileSync(join(root, 'base', 'reset.css'), 'utf8'));
  const reduceBlock = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\}/);

  it('селектор kill-switch включает *::backdrop', () => {
    expect(reduceBlock, 'блок kill-switch на месте').toBeTruthy();
    expect(reduceBlock[0]).toMatch(/\*::backdrop/);
  });

  it('инвариант «!important только в a11y/vi.css» с двумя осознанными исключениями не расширен', () => {
    // T7.2 меняет только СПИСОК селекторов kill-switch, не механику
    // исключений: 1 в [hidden] + 4 в kill-switch — как до T7.2.
    expect((css.match(/!important/g) ?? []).length).toBe(5);
  });
});

describe('канонический паттерн (components/ui-modal/ui-modal.html) — деградация и семантика', () => {
  // Разметка без комментариев: пины смотрят на теги, а не на прозу.
  const stripHtmlComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');
  const html = stripHtmlComments(
    readFileSync(join(root, 'components', 'ui-modal', 'ui-modal.html'), 'utf8'),
  );

  it('native <dialog> с хуком модуля data-ui-modal (ADR-0011: основа — native)', () => {
    expect(html).toMatch(/<dialog[^>]*class="ui-modal[^"]*"[^>]*data-ui-modal/);
  });

  it('деградация без JS: атрибут open в разметке ЕСТЬ (статичный инлайн, К9) — модуль снимает при init', () => {
    const dialogs = [...html.matchAll(/<dialog[^>]*>/g)].map(([tag]) => tag);
    expect(dialogs.length, 'в паттерне есть диалог').toBeGreaterThan(0);
    for (const tag of dialogs) {
      expect(tag, `диалог с open в разметке: ${tag}`).toMatch(/\bopen\b/);
    }
  });

  it('aria-labelledby на диалоге ведёт на .ui-modal__title (Implementation requirements п.3)', () => {
    const labelledby = html.match(/<dialog[^>]*aria-labelledby="([^"]+)"/);
    expect(labelledby, 'aria-labelledby указан').toBeTruthy();
    const titleTag = html.match(/<[a-z0-9]+[^>]*ui-modal__title[^>]*>/);
    expect(titleTag, 'заголовок в паттерне').toBeTruthy();
    expect(titleTag[0], `id заголовка = aria-labelledby (${labelledby[1]})`).toContain(
      `id="${labelledby[1]}"`,
    );
  });

  it('__close — <button type="button"> с доступным именем «Закрыть» (Scope)', () => {
    const closeTag = html.match(/<button[^>]*ui-modal__close[^>]*>/);
    expect(closeTag, 'кнопка закрытия в паттерне').toBeTruthy();
    expect(closeTag[0]).toMatch(/\btype="button"/);
    expect(closeTag[0]).toMatch(/aria-label="Закрыть"/);
  });

  it('__title и __body на месте (Scope); фоновой aria-hidden НЕ ставится (п.3: native top-layer)', () => {
    // Роль типографики может соседствовать в классе (прецедент ui-card).
    expect(html).toMatch(/class="ui-modal__title[ "]/);
    expect(html).toMatch(/class="ui-modal__body"/);
    // aria-hidden допустим только на декоративной иконке ВНУТРИ диалога;
    // фону (разметка вне <dialog>…) он не ставится — top-layer блокирует сам.
    const outside = html.replace(/<dialog[\s\S]*?<\/dialog>/g, '');
    expect(outside, 'aria-hidden вне диалога нет').not.toContain('aria-hidden');
  });

  it('у каждой <button> явный type; без inline-стилей (VI-инвариант §5)', () => {
    const buttons = [...html.matchAll(/<button[\s\S]*?>/g)].map(([tag]) => tag);
    expect(buttons.length, 'в паттерне есть кнопки').toBeGreaterThan(0);
    for (const tag of buttons) {
      expect(tag, `нет type у кнопки: ${tag}`).toMatch(/\btype="/);
    }
    expect(html).not.toMatch(/\sstyle=/);
  });

  it('триггер открытия — data-ui-modal-target на id диалога (Scope: программное открытие)', () => {
    const trigger = html.match(/<[^>]*data-ui-modal-target="([^"]+)"/);
    expect(trigger, 'триггер с data-ui-modal-target').toBeTruthy();
    expect(html).toMatch(new RegExp(`<dialog[^>]*id="${trigger[1]}"`));
  });
});

describe('контракт модуля ui-modal.js (jsdom; образец — tests/unit/module-template.test.js)', () => {
  const source = readFileSync(join(root, 'components', 'ui-modal', 'ui-modal.js'), 'utf8');

  const SELECTOR = '[data-ui-modal]';
  const INIT_ATTR = 'data-ui-modal-init';

  /** Каноническая структура инстанса (триггер — вне диалога). */
  const instanceHtml = `
    <button type="button" data-ui-modal-target="m-1">Открыть</button>
    <dialog class="ui-modal ui-modal--md" open data-ui-modal id="m-1" aria-labelledby="m-1-title">
      <button class="ui-modal__close" type="button" aria-label="Закрыть">×</button>
      <h2 class="ui-modal__title" id="m-1-title">Заголовок</h2>
      <div class="ui-modal__body"><p>Содержимое</p></div>
    </dialog>`;

  /**
   * jsdom не реализует методы <dialog>: минимальный полифилл с нативной
   * семантикой контракта (showModal ставит open; close снимает open, а
   * событие close доставляет ОТЛОЖЕННЫМ таском — Chromium снимает open
   * синхронно и шлёт close очередью, замерено e2e-инструментацией) —
   * достаточно для пинов логики модуля; нативное поведение
   * (trap/top-layer/Escape) — tests/e2e/ui-modal.spec.js.
   */
  function polyfillDialog(window) {
    const proto = window.HTMLDialogElement.prototype;
    proto.showModal = function showModal() {
      if (this.hasAttribute('open')) {
        throw new window.DOMException('dialog уже открыт', 'InvalidStateError');
      }
      this.setAttribute('open', '');
    };
    proto.close = function close() {
      if (!this.hasAttribute('open')) return;
      this.removeAttribute('open');
      window.setTimeout(() => {
        this.dispatchEvent(new window.Event('close'));
      }, 0);
    };
  }

  /**
   * Песочница: документ с заданным readyState и телом; шпионы на подписку
   * document.addEventListener и console.warn (модуль пишет в window.console.warn).
   */
  function makeSandbox({ readyState = 'complete', bodyHtml = '', widthDelta = 0 } = {}) {
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

    polyfillDialog(window);

    // Замер сдвига скролл-лока: clientWidth до/после overflow:hidden.
    let clientWidth = 1000;
    const rootEl = document.documentElement;
    const bodyEl = document.body;
    const originalClientWidth = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(rootEl),
      'clientWidth',
    );
    Object.defineProperty(rootEl, 'clientWidth', {
      configurable: true,
      get: () => (rootEl.style.overflow === 'hidden' ? clientWidth + widthDelta : clientWidth),
    });
    Object.defineProperty(bodyEl, 'clientWidth', {
      configurable: true,
      get: () => clientWidth,
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

    return {
      window,
      document,
      domContentLoadedSubscriptions,
      warnings,
      setClientWidth: (value) => {
        clientWidth = value;
      },
      restoreClientWidth: () => {
        if (originalClientWidth) {
          Object.defineProperty(rootEl, 'clientWidth', originalClientWidth);
        }
      },
    };
  }

  function fireDOMContentLoaded(window) {
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  }

  /** Публичный API модуля из песочницы. */
  const apiOf = ({ window }) => window.IraoUI.modal;

  afterEach(() => {
    vi.useRealTimers();
  });

  it('это модуль по шаблону T1.6: имя, селектор и data-атрибут флага (не dataset)', () => {
    expect(source).toContain("var MODULE_NAME = 'modal';");
    expect(source).toContain("var SELECTOR = '[data-ui-modal]';");
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
    once.window.IraoUI.modal.init();
    expect(once.document.querySelectorAll(`[${INIT_ATTR}]`)).toHaveLength(1);
  });

  it('инициализация снимает статичный open (деградация К9: модуль забирает open на себя)', () => {
    const { document } = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    const dialog = document.getElementById('m-1');
    expect(dialog.hasAttribute('open'), 'модуль закрыл статично-открытый диалог').toBe(false);
    expect(dialog.classList.contains('is-closing')).toBe(false);
  });

  it('aria-labelledby: не трогает указанный; генерирует при отсутствии (Implementation requirements п.3)', () => {
    // С указанным — не меняется.
    const preset = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    expect(preset.document.getElementById('m-1').getAttribute('aria-labelledby')).toBe('m-1-title');

    // Без aria-labelledby и без id у заголовка — генерируются.
    const generated = makeSandbox({
      readyState: 'complete',
      bodyHtml: instanceHtml
        .replace(' aria-labelledby="m-1-title"', '')
        .replace(' id="m-1-title"', ''),
    });
    const dialog = generated.document.getElementById('m-1');
    const title = dialog.querySelector('.ui-modal__title');
    const labelledby = dialog.getAttribute('aria-labelledby');
    expect(labelledby, 'aria-labelledby сгенерирован').toBeTruthy();
    expect(title.id).toBe(labelledby);
  });

  it('неполная разметка (data-ui-modal не на <dialog>) — console.warn, соседние инстансы живы', () => {
    const { document, warnings } = makeSandbox({
      readyState: 'loading',
      bodyHtml: '<div class="ui-modal" data-ui-modal>не диалог</div>' + instanceHtml,
    });

    apiOf({ window: document.defaultView }).init();

    expect(warnings).toHaveLength(1);
    expect(document.querySelectorAll(`[${INIT_ATTR}]`)).toHaveLength(1);
  });

  it('публичный API: init, selector, open(el), close() (верхний открытый)', () => {
    const api = apiOf(makeSandbox({ readyState: 'complete' }));
    expect(api.selector).toBe(SELECTOR);
    expect(typeof api.init).toBe('function');
    expect(typeof api.open).toBe('function');
    expect(typeof api.close).toBe('function');
  });

  it('open/close: showModal, событие irao-ui:modal-open, is-closing снимается НА close (ADR-0011, регресс career-portal)', () => {
    vi.useFakeTimers();
    const { window, document } = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    const dialog = document.getElementById('m-1');
    const api = apiOf({ window });

    const events = [];
    document.addEventListener('irao-ui:modal-open', () => events.push('open'));
    document.addEventListener('irao-ui:modal-close', () => events.push('close'));

    api.open(dialog);
    expect(dialog.hasAttribute('open'), 'диалог открыт (showModal)').toBe(true);
    expect(events).toEqual(['open']);
    expect(dialog.classList.contains('is-closing'), 'закрывающего класса при открытии нет').toBe(
      false,
    );

    api.close();
    expect(dialog.classList.contains('is-closing'), 'is-closing на время анимации').toBe(true);
    expect(dialog.hasAttribute('open'), 'close() анимированный: диалог ещё открыт').toBe(true);

    vi.advanceTimersByTime(500);
    expect(dialog.hasAttribute('open'), 'после анимации диалог закрыт').toBe(false);
    expect(
      dialog.classList.contains('is-closing'),
      'ОСТАТОЧНОГО класса нет — контракт «снимается на close» (регресс-кейс career-portal)',
    ).toBe(false);
    expect(events, 'обо события жизненного цикла').toEqual(['open', 'close']);
  });

  it('скролл-лок: overflow на корне при открытии, снятие без остаточных эффектов; компенсация — по факту сдвига', () => {
    vi.useFakeTimers();
    // Кейс «полоса исчезла» — сдвиг появился, компенсация обязательна.
    const shifted = makeSandbox({
      readyState: 'complete',
      bodyHtml: instanceHtml,
      widthDelta: 15,
    });
    const rootEl = shifted.document.documentElement;
    const bodyEl = shifted.document.body;
    const api = apiOf({ window: shifted.window });

    api.open(shifted.document.getElementById('m-1'));
    expect(rootEl.style.overflow, 'overflow hidden на корне').toBe('hidden');
    expect(bodyEl.style.paddingRight, 'padding-компенсация фактического сдвига').toBe('15px');

    api.close();
    vi.advanceTimersByTime(500);
    expect(rootEl.style.overflow, 'overflow восстановлен').toBe('');
    expect(bodyEl.style.paddingRight, 'остаточного padding нет (регресс design-qa)').toBe('');

    // Повторный цикл — снова чисто (регресс-кейс «повторные циклы»).
    api.open(shifted.document.getElementById('m-1'));
    expect(bodyEl.style.paddingRight).toBe('15px');
    api.close();
    vi.advanceTimersByTime(500);
    expect(bodyEl.style.paddingRight).toBe('');
    expect(rootEl.style.overflow).toBe('');
  });

  it('скролл-лок без сдвига (scrollbar-gutter: stable в base): padding НЕ ставится вовсе', () => {
    vi.useFakeTimers();
    const stable = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml, widthDelta: 0 });
    const bodyEl = stable.document.body;
    const api = apiOf({ window: stable.window });

    api.open(stable.document.getElementById('m-1'));
    expect(bodyEl.style.paddingRight, 'сдвига нет — компенсация нулевая').toBe('');

    api.close();
    vi.advanceTimersByTime(500);
    expect(bodyEl.style.paddingRight).toBe('');
  });

  it('Escape (cancel) закрывает анимированно, а не мгновенно (ADR-0011 К5: JS-delayed)', () => {
    vi.useFakeTimers();
    const { window, document } = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    const dialog = document.getElementById('m-1');
    const api = apiOf({ window });

    api.open(dialog);
    dialog.dispatchEvent(new window.Event('cancel'));

    expect(dialog.classList.contains('is-closing'), 'is-closing на месте').toBe(true);
    expect(dialog.hasAttribute('open'), 'мгновенного закрытия нет — preventDefault').toBe(true);

    vi.advanceTimersByTime(500);
    expect(dialog.hasAttribute('open'), 'после анимации закрыт').toBe(false);
  });

  it('клик по __close закрывает (career-portal: data-directions-close)', () => {
    vi.useFakeTimers();
    const { window, document } = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    const dialog = document.getElementById('m-1');
    const api = apiOf({ window });

    api.open(dialog);
    dialog.querySelector('.ui-modal__close').click();
    vi.advanceTimersByTime(500);
    expect(dialog.hasAttribute('open')).toBe(false);
  });

  it('transitionend transform на диалоге закрывает РАНЬШЕ страховочного таймера (контракт К5 в доке = код)', () => {
    vi.useFakeTimers();
    const { window, document } = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    const dialog = document.getElementById('m-1');
    const api = apiOf({ window });

    api.open(dialog);
    api.close();
    expect(dialog.hasAttribute('open')).toBe(true);

    // Событие с панели (target — диалог): закрывает без прокрутки таймеров.
    const end = new window.Event('transitionend', { bubbles: true });
    end.propertyName = 'transform';
    dialog.dispatchEvent(end);

    expect(dialog.hasAttribute('open'), 'close() по завершении перехода, не по таймеру 500ms').toBe(
      false,
    );
    vi.advanceTimersByTime(0); // отложенный таск close-события (как в Chromium)
  });

  it('диалог скрыт УЖЕ без is-closing: чистка синхронна с close(), окно «скрыт, но закрывающийся» исключено (гонка e2e)', () => {
    vi.useFakeTimers();
    const { window, document } = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    const dialog = document.getElementById('m-1');
    const api = apiOf({ window });

    api.open(dialog);
    api.close();

    const end = new window.Event('transitionend', { bubbles: true });
    end.propertyName = 'transform';
    dialog.dispatchEvent(end);

    // Chromium: open снимается синхронно, close-событие — очередью (замер
    // e2e-инструментацией: ~20ms между «скрыт» и «событие»). Если чистка
    // класса живёт только в обработчике close, в этом окне диалог скрыт,
    // но с is-closing — на нём спотыкаются регресс-циклы (toBeHidden +
    // evaluate). Чистка обязана быть синхронной с close().
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(
      dialog.classList.contains('is-closing'),
      'класс снят синхронно с close(), а не в отложенном close-событии',
    ).toBe(false);
    vi.advanceTimersByTime(0);
  });

  it('посторонние transitionend (другое свойство, bubbling от детей) закрытие не ускоряют', () => {
    vi.useFakeTimers();
    const { window, document } = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    const dialog = document.getElementById('m-1');
    const api = apiOf({ window });

    api.open(dialog);
    api.close();

    // opacity (0.25s) — не самый долгий переход; закрывает только transform.
    const opacity = new window.Event('transitionend', { bubbles: true });
    opacity.propertyName = 'opacity';
    dialog.dispatchEvent(opacity);
    expect(dialog.hasAttribute('open'), 'opacity не завершает анимацию панели').toBe(true);

    // Bubbling от ребёнка (hover __close и т.п.) — target не диалог, игнор.
    const child = dialog.querySelector('.ui-modal__close');
    const bubbled = new window.Event('transitionend', { bubbles: true });
    bubbled.propertyName = 'transform';
    child.dispatchEvent(bubbled);
    expect(dialog.hasAttribute('open'), 'чужой target не завершает анимацию').toBe(true);

    vi.advanceTimersByTime(500);
    expect(dialog.hasAttribute('open'), 'страховка по-прежнему закрывает').toBe(false);
  });

  it('prefers-reduced-motion: close() закрывает сразу — без is-closing и мёртвого окна (Chromium не доставляет transitionend под 0.01ms)', () => {
    vi.useFakeTimers();
    const { window, document } = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    const dialog = document.getElementById('m-1');
    const api = apiOf({ window });

    // В jsdom matchMedia нет вовсе — ставим вручную; модуль читает его
    // с typeof-guard'ом (как window.console.warn в контракте шаблона).
    window.matchMedia = function (query) {
      return { matches: query.includes('prefers-reduced-motion'), media: query };
    };

    const events = [];
    document.addEventListener('irao-ui:modal-close', () => events.push('close'));

    api.open(dialog);
    api.close();

    expect(
      dialog.hasAttribute('open'),
      'закрыто мгновенно — анимировать нечего (kill-switch гасит переходы)',
    ).toBe(false);
    expect(
      dialog.classList.contains('is-closing'),
      'закрывающий класс не нужен — его нечему доставать',
    ).toBe(false);
    expect(events, 'событие irao-ui:modal-close дошло (контракт не зависит от пути)').toEqual([
      'close',
    ]);
  });

  it('запаздывающее close-событие прошлого цикла не трогает живой цикл (гонка reopened — ревью T7.2)', () => {
    vi.useFakeTimers();
    const { window, document } = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    const dialog = document.getElementById('m-1');
    const rootEl = document.documentElement;
    const api = apiOf({ window });

    // Мгновенное закрытие (reduced-путь) — единственный способ в fake-таймерах
    // получить «закрыто, но close-таск ещё в очереди»: ровно окно Chromium
    // (~20ms между синхронным снятием open и отложенным close-событием).
    window.matchMedia = function (query) {
      return { matches: query.includes('prefers-reduced-motion'), media: query };
    };

    let closeEvents = 0;
    document.addEventListener('irao-ui:modal-close', () => {
      closeEvents += 1;
    });

    // Цикл 1: закрыли — чистка синхронна, close-событие висит в таймерах.
    api.open(dialog);
    api.close();
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(closeEvents).toBe(1);

    // Цикл 2 открыт ДО доставки запаздывающего события прошлого цикла.
    api.open(dialog);
    expect(dialog.hasAttribute('open'), 'живой цикл открыт').toBe(true);
    expect(rootEl.style.overflow, 'лок живого цикла стоит').toBe('hidden');

    vi.advanceTimersByTime(0); // доставили запаздывающее close-событие

    expect(
      rootEl.style.overflow,
      'лок живого цикла не снят фантомом — фон не скроллится под открытой модалкой',
    ).toBe('hidden');
    expect(dialog.hasAttribute('open'), 'живой цикл не закрыт фантомной чисткой').toBe(true);
    expect(closeEvents, 'irao-ui:modal-close — один раз, без фантомного второго').toBe(1);
    expect(
      document.activeElement,
      'фокус не выдернут на старого опенера — остался внутри диалога',
    ).toBe(dialog.querySelector('.ui-modal__close'));

    // Стек цел: верхний инстанс закрывается API; чистка и событие — один раз.
    api.close();
    expect(dialog.hasAttribute('open'), 'обычное закрытие живого цикла работает').toBe(false);
    vi.advanceTimersByTime(0); // отложенный close-таск живого цикла
    expect(closeEvents, 'второе легитимное irao-ui:modal-close доставлено').toBe(2);
    expect(rootEl.style.overflow, 'лок снят с закрытием живого цикла').toBe('');
  });

  it('data-ui-modal-target: клик по триггеру открывает целевой диалог; восстановление фокуса — на триггер', () => {
    vi.useFakeTimers();
    const { window, document } = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml });
    const dialog = document.getElementById('m-1');
    const trigger = document.querySelector('[data-ui-modal-target]');
    const api = apiOf({ window });

    trigger.click();
    expect(dialog.hasAttribute('open'), 'триггер открыл диалог').toBe(true);
    expect(document.activeElement, 'фокус на опенере до showModal (Safari-нюанс ADR-0011 К3)').toBe(
      trigger,
    );

    api.close();
    vi.advanceTimersByTime(500);
    expect(document.activeElement, 'фокус возвращён на опенер').toBe(trigger);
  });
});

describe('подключение и гейты (DoD T7.2)', () => {
  it("'ui-modal' в COMPONENTS showcase/build.mjs — CSS/JS попадают в dist", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    // [\s\S] а не [^\]]: комментарии строк массива содержат ']' (button[disabled]).
    expect(build).toMatch(/const COMPONENTS = \[[\s\S]*?'ui-modal'[\s\S]*?\]/);
  });

  it('стенд showcase/pages/ui-modal: три размера с якорями + статус-регион событий', () => {
    const stand = readFileSync(join(root, 'showcase', 'pages', 'ui-modal', 'index.html'), 'utf8');
    expect(stand, 'секция --sm').toContain('id="uimd-sm"');
    expect(stand, 'секция --md').toContain('id="uimd-md"');
    expect(stand, 'секция --full').toContain('id="uimd-full"');
    expect(stand, 'статус событий irao-ui:modal-*').toContain('id="uimd-status"');
  });

  it('README компонента: ADR-0011, чек-лист диалога, деградация без JS, вложенные модалки — док-заметка', () => {
    const readme = readFileSync(join(root, 'components', 'ui-modal', 'README.md'), 'utf8');
    expect(readme).toMatch(/ADR-0011/);
    expect(readme).toMatch(/showModal/);
    expect(readme).toMatch(/без JS|без-JS/i);
    expect(readme).toMatch(/[Вв]ложенн/);
    expect(readme).toMatch(/Escape/);
  });
});

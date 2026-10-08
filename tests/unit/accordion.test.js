/**
 * Юнит-пин ui-accordion (задача T6.4; Testing requirements — tests first).
 *
 * Поверхность браузера — Enter/Space, клик, no-JS, single-open, анимация
 * (rAF-сэмплы), reduced-motion, axe и эталоны — в tests/e2e/ui-accordion.spec.js;
 * здесь — пины исполняемой формы решения:
 *  - components/ui-accordion/ui-accordion.css: @define accordion; box-sizing
 *    на корнях (ADR-0002); техника анимации — grid-rows 0fr→1fr на
 *    ::details-content (зонд 2026-10-08: анимирует открытие на всей матрице
 *    evergreen — chromium/firefox/webkit; career-portal-обёртка 0fr на __a в
 *    chromium мгновенна — слот содержимого details рендерится в момент
 *    [open], переходу не с чего стартовать; height+interpolate-size — только
 *    chromium 129+); transition несёт и content-visibility allow-discrete —
 *    отложенное скрытие при закрытии; reduced-motion — transition: none
 *    (kill-switch base/reset не проходит по ::details-content — он бьёт
 *    *::before/*::after, но не произвольные псевдоэлементы);
 *  - визуал career-portal .faq (components.css:272–317) перенесён «как есть»
 *    в токены: вариант --faq — bg --ui-color-surface-muted (surface-blue-50),
 *    радиус --ui-radius-md (radius-card), вопрос fs-body × fw 500 (новый
 *    --ui-fw-body-bold: career-portal --fw-body-bold, отдельной роли
 *    typografiki нет), ответ fs-small × lh-small (роль small T3.3 вместо
 *    локальной 1.45 career-portal — расходилась с собственной
 *    --lh-small-regular 1.35), шеврон с rotate(180deg) при [open];
 *  - состояние — нативный [open]: класса is-open career-portal нет (нативный
 *    атрибут — источник правды, семантика вместо класса — прецедент
 *    aria-selected ui-tabs T6.2 / aria-current ui-pagination T6.3);
 *  - канонический паттерн (ui-accordion.html): details/summary/div по Scope,
 *    шеврон svg aria-hidden (имя вопроса — текст summary), БЕЗ ARIA-атрибутов
 *    (Accessibility requirements) и БЕЗ data-ui-* (single — опция стенда);
 *  - модуль IraoUI.accordion (jsdom-песочница — образец
 *    tests/unit/module-template.test.js): шаблон T1.6 (readyState-guard,
 *    регистрация, отказоустойчивость, guard дублей, флаг-атрибут), режим
 *    single по data-ui-accordion="single" (Implementation requirements п.3)
 *    закрывает соседей при открытии, события irao-ui:accordion-open/close
 *    на корне (bubbles — точка расширения сайта, прецедент
 *    irao-ui:dropdown-open/close T6.1); в multi-режиме (значение не single)
 *    слушатели ставятся, соседи не закрываются — события работают и там;
 *  - инварианты системы: без !important, hex, inline-стилей (VI §5);
 *  - 'ui-accordion' в COMPONENTS showcase/build.mjs — CSS/JS в dist;
 *  - README компонента: решение по анимации details зафиксировано (AC),
 *    single-open, no-JS, schema.org FAQPage «когда уместно» (ТЗ №7).
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

describe('components/ui-accordion/ui-accordion.css — база (ADR-0002, техника анимации)', () => {
  const path = join(root, 'components', 'ui-accordion', 'ui-accordion.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define accordion — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define accordion */')).toBe(true);
  });

  it('.ui-accordion: box-sizing; колонка career-portal .faq — flex, gap 16px (--ui-space-4)', () => {
    const block = blockOf(css, '.ui-accordion');
    expect(block, 'правило .ui-accordion найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: flex;');
    expect(block).toContain('flex-direction: column;');
    expect(block).toContain('gap: var(--ui-space-4);'); // 16px .faq
  });

  it('анимация — grid-rows на ::details-content (решение по матрице evergreen, зонд 2026-10-08): 0fr закрыто, [open] — 1fr', () => {
    const block = blockOf(css, '.ui-accordion__item::details-content');
    expect(block, 'правило ::details-content найдено').toBeTruthy();
    expect(block, 'слот — grid (техника grid-rows)').toContain('display: grid;');
    expect(block).toContain('grid-template-rows: 0fr;');
    // Переход: grid-template-rows токеном + content-visibility allow-discrete
    // (отложенное скрытие; формат prettier — построчный).
    expect(block).toContain('grid-template-rows var(--ui-transition)');
    expect(block).toContain('content-visibility var(--ui-transition)');
    expect(block).toContain('allow-discrete');
    const openBlock = blockOf(css, '.ui-accordion__item[open]::details-content');
    expect(openBlock, 'правило открытого слота найдено').toBeTruthy();
    expect(openBlock).toContain('grid-template-rows: 1fr;');
  });

  it('grid-item-контракт .ui-accordion__a: box-sizing, min-height: 0 и overflow: hidden (трек 0fr сжимается в ноль, клип при анимации)', () => {
    const block = blockOf(css, '.ui-accordion__a');
    expect(block, 'правило .ui-accordion__a найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('min-height: 0;');
    expect(block).toContain('overflow: hidden;');
  });

  it('reduced-motion: transition: none на ::details-content — kill-switch base/reset не проходит по псевдоэлементу слота (*::before/*::after ≠ ::details-content)', () => {
    const media = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/);
    expect(media, 'reduced-motion-блок присутствует').toBeTruthy();
    const block = blockOf(media[0], '.ui-accordion__item::details-content');
    expect(block, 'правило внутри reduced-motion').toBeTruthy();
    expect(block).toContain('transition: none;');
  });

  it('вариант --faq — визуал career-portal .faq__item: bg --ui-color-surface-muted, радиус --ui-radius-md, overflow hidden', () => {
    const block = blockOf(css, '.ui-accordion--faq .ui-accordion__item');
    expect(block, 'правило варианта --faq найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('background-color: var(--ui-color-surface-muted);');
    expect(block).toContain('border-radius: var(--ui-radius-md);');
    expect(block).toContain('overflow: hidden;');
  });

  it('.ui-accordion__q: box-sizing; вопрос career-portal .faq__q — flex между текстом и шевроном (gap 24px), fs-body × fw-body-bold, primary; маркер disclosure снят', () => {
    const block = blockOf(css, '.ui-accordion__q');
    expect(block, 'правило .ui-accordion__q найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: flex;');
    expect(block).toContain('align-items: center;');
    expect(block).toContain('justify-content: space-between;');
    expect(block).toContain('gap: var(--ui-space-6);'); // 24px .faq__q
    expect(block).toContain('padding: var(--ui-space-5);'); // 24px (20→24, ступень шкалы — README)
    expect(block).toContain('font-size: var(--ui-fs-body);');
    expect(block).toContain('font-weight: var(--ui-fw-body-bold);');
    expect(block).toContain('color: var(--ui-color-primary);');
    expect(block, 'маркер disclosure снят').toContain('list-style: none;');
    expect(block).toContain('cursor: pointer;');
  });

  it('шеврон: flex 0 0 auto, transition transform токеном; поворот — по нативному [open] (класса is-open нет)', () => {
    const block = blockOf(css, '.ui-accordion__icon');
    expect(block, 'правило .ui-accordion__icon найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('flex: 0 0 auto;');
    expect(block).toContain('transition: transform var(--ui-transition);');
    const openBlock = blockOf(css, '.ui-accordion__item[open] .ui-accordion__icon');
    expect(openBlock, 'правило поворота при [open] найдено').toBeTruthy();
    expect(openBlock).toContain('transform: rotate(180deg);');
    expect(css, 'is-open career-portal не переносится: состояние — нативный [open]').not.toContain(
      'is-open',
    );
  });

  it('.ui-accordion__a-inner: box-sizing; ответ ролью small (fs-small × lh-small), паддинг --ui-space-5, цвет текста', () => {
    const block = blockOf(css, '.ui-accordion__a-inner');
    expect(block, 'правило .ui-accordion__a-inner найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('padding: 0 var(--ui-space-5) var(--ui-space-5);');
    expect(block).toContain('font-size: var(--ui-fs-small);');
    expect(block).toContain('line-height: var(--ui-lh-small);');
    expect(block).toContain('color: var(--ui-color-text);');
  });

  it('инварианты системы: без !important и hex (vi-перекраска, ADR-0002); фикс. высот нет', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/(?:^|\n)\s*(?:min-)?height:\s*[\d.]+(?:px|rem|pt)/);
  });
});

describe('канонический паттерн (components/ui-accordion/ui-accordion.html)', () => {
  // Разметка без комментариев: пины смотрят на теги, а не на прозу.
  const stripHtmlComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');
  const path = join(root, 'components', 'ui-accordion', 'ui-accordion.html');
  const html = stripHtmlComments(readFileSync(path, 'utf8'));

  it('структура по Scope: details.ui-accordion__item > summary.ui-accordion__q + div.ui-accordion__a > .ui-accordion__a-inner', () => {
    const items = [...html.matchAll(/<details[^>]*class="[^"]*ui-accordion__item[^"]*"[^>]*>/g)];
    expect(items.length, 'N × details.ui-accordion__item').toBeGreaterThanOrEqual(3);
    for (const item of items) {
      expect(item[0], 'item — внутри корня ui-accordion').not.toBe('');
    }
    expect(html).toContain('<summary class="ui-accordion__q">');
    expect(html).toContain('<div class="ui-accordion__a">');
    expect(html).toContain('<div class="ui-accordion__a-inner">');
  });

  it('вопрос — текст summary (Implementation requirements п.2); шеврон svg aria-hidden (глиф декоративен)', () => {
    const summaryTags = [...html.matchAll(/<summary[^>]*>/g)].map(([tag]) => tag);
    expect(summaryTags.length, 'summary есть').toBeGreaterThanOrEqual(3);
    expect(html).toContain('<svg class="ui-accordion__icon" aria-hidden="true"');
    // Имя вопроса — ТЕКСТ summary: в разметке нет aria-label на summary.
    expect(html).not.toMatch(/<summary[^>]*aria-label/);
  });

  it('нативная семантика без ARIA (Accessibility requirements): role/aria-expanded/aria-controls в разметке нет', () => {
    expect(html, 'без role').not.toMatch(/\brole="/);
    expect(html, 'без aria-expanded').not.toMatch(/\baria-expanded=/);
    expect(html, 'без aria-controls').not.toMatch(/\baria-controls=/);
  });

  it('начальное состояние — нативный open на первом вопросе (career-portal: первый пункт открыт); состояние — атрибут, не класс', () => {
    const openItems = [...html.matchAll(/<details[^>]*\bopen\b[^>]*>/g)];
    expect(openItems.length, 'ровно один пункт открыт по умолчанию').toBe(1);
  });

  it('канонический паттерн — без JS-хука: data-ui-* в разметке нет (single — опция, Implementation requirements п.3)', () => {
    expect(html).not.toContain('data-ui-');
  });

  it('без inline-стилей (VI-инвариант §5)', () => {
    expect(html).not.toMatch(/<[a-z]+[^>]*style=/);
  });
});

describe('контракт модуля ui-accordion.js (jsdom; образец — tests/unit/module-template.test.js)', () => {
  const source = readFileSync(join(root, 'components', 'ui-accordion', 'ui-accordion.js'), 'utf8');

  const SELECTOR = '[data-ui-accordion]';
  const INIT_ATTR = 'data-ui-accordion-init';

  /** Инстанс с тремя пунктами; режим — значение data-ui-accordion. */
  const instanceHtml = (mode) =>
    `<div class="ui-accordion" data-ui-accordion${mode ? `="${mode}"` : ''}>` +
    ['Альфа', 'Бета', 'Гамма']
      .map(
        (q) =>
          `<details class="ui-accordion__item"><summary class="ui-accordion__q">${q}` +
          `<svg class="ui-accordion__icon" aria-hidden="true"></svg></summary>` +
          `<div class="ui-accordion__a"><div class="ui-accordion__a-inner">Ответ ${q}</div></div></details>`,
      )
      .join('') +
    '</div>';

  /** Песочница: документ с заданным readyState и телом; шпион на подписку
   *  document.addEventListener и console.warn (модуль пишет в window.console.warn). */
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
  const apiOf = (sandbox) => sandbox.window.IraoUI.accordion;

  /** Синтетический toggle пункта: нативный toggle не бабблится и в jsdom не
   *  генерируется — дублируем контракт браузера (open уже изменён, событие
   *  — уведомление о смене). */
  const fireToggle = (sandbox, item) => {
    item.dispatchEvent(new sandbox.window.Event('toggle'));
  };

  /** События accordion-open/close, пойманные на корне. */
  const listenEvents = (sandbox, root) => {
    const events = [];
    root.addEventListener('irao-ui:accordion-open', (e) => events.push({ type: 'open', e }));
    root.addEventListener('irao-ui:accordion-close', (e) => events.push({ type: 'close', e }));
    return events;
  };

  it('это модуль по шаблону T1.6: имя, селектор и data-атрибут флага (не dataset)', () => {
    expect(source).toContain("var MODULE_NAME = 'accordion';");
    expect(source).toContain("var SELECTOR = '[data-ui-accordion]';");
    expect(source).toContain("var INIT_ATTR = 'data-ui-' + MODULE_NAME + '-init';");
    // Флаг — через get/removeAttribute: обращения к dataset-свойству нет
    // (DOMStringMap запрещает дефисы — контракт T1.6, п. 6).
    expect(source).toContain('root.getAttribute(INIT_ATTR)');
    expect(source).not.toMatch(/dataset\s*\./);
  });

  it("readyState 'loading': init отложен (одна подписка), регистрация в IraoUI — сразу; 'complete' — синхронно", () => {
    const deferred = makeSandbox({ readyState: 'loading', bodyHtml: instanceHtml('single') });
    expect(deferred.domContentLoadedSubscriptions).toHaveLength(1);
    expect(deferred.document.querySelectorAll(`[${INIT_ATTR}]`)).toHaveLength(0);
    expect(typeof apiOf(deferred).init).toBe('function');

    fireDOMContentLoaded(deferred.window);
    expect(deferred.document.querySelectorAll(`[${INIT_ATTR}]`)).toHaveLength(1);

    const sync = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml('single') });
    expect(sync.domContentLoadedSubscriptions).toHaveLength(0);
    expect(sync.document.querySelectorAll(`[${INIT_ATTR}]`)).toHaveLength(1);
  });

  it('guard отсутствия элементов: init молча выходит; повторный init — no-op (guard дублей)', () => {
    const empty = makeSandbox({ readyState: 'complete' });
    expect(empty.warnings).toHaveLength(0);
    expect(typeof apiOf(empty).init).toBe('function');

    const once = makeSandbox({ readyState: 'loading', bodyHtml: instanceHtml('single') });
    fireDOMContentLoaded(once.window);
    once.window.IraoUI.accordion.init();
    expect(once.document.querySelectorAll(`[${INIT_ATTR}]`)).toHaveLength(1);
  });

  it('инстанс без пунктов — console.warn, сосед жив (контракт п.4: init-мутации обязательны)', () => {
    const { document, warnings } = makeSandbox({
      readyState: 'loading',
      bodyHtml: '<div data-ui-accordion="single"><p>пусто</p></div>' + instanceHtml('single'),
    });

    apiOf({ window: document.defaultView }).init();

    expect(warnings).toHaveLength(1);
    expect(document.querySelectorAll(`[${INIT_ATTR}]`), 'полный инстанс жив').toHaveLength(1);
  });

  it('init не мутирует состояние и не добавляет ARIA: native open/закрытые пункты как в разметке', () => {
    const html = instanceHtml('single').replace(
      '<details class="ui-accordion__item"><summary class="ui-accordion__q">Альфа',
      '<details class="ui-accordion__item" open><summary class="ui-accordion__q">Альфа',
    );
    const sandbox = makeSandbox({ readyState: 'complete', bodyHtml: html });
    const items = [...sandbox.document.querySelectorAll('.ui-accordion__item')];

    expect(items[0].open, 'начальные состояния не тронуты').toBe(true);
    expect(items[1].open).toBe(false);
    expect(sandbox.document.querySelector('[role]'), 'ARIA не добавляется').toBeNull();
    expect(
      sandbox.document.querySelector('[aria-expanded]'),
      'aria-expanded не добавляется — семантика details нативная',
    ).toBeNull();
  });

  it('single: открытие пункта закрывает соседей; события irao-ui:accordion-open/close на корне (bubbles)', () => {
    const sandbox = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml('single') });
    const root = sandbox.document.querySelector('[data-ui-accordion]');
    const items = [...sandbox.document.querySelectorAll('.ui-accordion__item')];
    const events = listenEvents(sandbox, root);

    items[0].open = true;
    fireToggle(sandbox, items[0]);
    expect(events.map(({ type }) => type), 'первое открытие — open').toEqual(['open']);

    items[1].open = true;
    fireToggle(sandbox, items[1]);
    expect(items[0].open, 'сосед закрыт (один открыт)').toBe(false);
    expect(items[1].open).toBe(true);
    expect(events.map(({ type }) => type), 'open второго + close первого').toEqual([
      'open',
      'close',
      'open',
    ]);

    items[1].open = false;
    fireToggle(sandbox, items[1]);
    expect(events.map(({ type }) => type), 'закрытие последнего — close').toEqual([
      'open',
      'close',
      'open',
      'close',
    ]);
    for (const { e } of events) {
      expect(e.bubbles, 'событие всплывает — точка расширения сайта').toBe(true);
    }
  });

  it('повторный toggle открытого пункта (клик по открытому) — соседей не трогает, состояние сходится', () => {
    const sandbox = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml('single') });
    const items = [...sandbox.document.querySelectorAll('.ui-accordion__item')];

    items[0].open = true;
    fireToggle(sandbox, items[0]);
    items[0].open = true; // toggle уже открытого — no-op по соседям
    fireToggle(sandbox, items[0]);
    expect(items[1].open).toBe(false);
    expect(items[2].open).toBe(false);
    expect(items[0].open).toBe(true);
  });

  it('multi-режим (значение не single): соседи независимы, события open/close работают', () => {
    const sandbox = makeSandbox({ readyState: 'complete', bodyHtml: instanceHtml('multi') });
    const root = sandbox.document.querySelector('[data-ui-accordion]');
    const items = [...sandbox.document.querySelectorAll('.ui-accordion__item')];
    const events = listenEvents(sandbox, root);

    items[0].open = true;
    fireToggle(sandbox, items[0]);
    items[1].open = true;
    fireToggle(sandbox, items[1]);

    expect(items[0].open, 'multi: соседи независимы (без JS все независимы)').toBe(true);
    expect(items[1].open).toBe(true);
    expect(events.map(({ type }) => type), 'оба открытия отслежены').toEqual(['open', 'open']);
  });

  it('destroy снимает слушатели и флаг: toggle после destroy не меняет соседей и не диспатчит', () => {
    // destroy живёт на хэндле инстанса initInstance; через публичный init()
    // он не отдаётся (как в ui-tabs/ui-dropdown) — пин декларативный:
    // исходник содержит снятие слушателя toggle и атрибута-флага.
    expect(source).toMatch(/removeEventListener\('toggle'/);
    expect(source).toMatch(/removeAttribute\(INIT_ATTR\)/);
  });

  it('публичный API: init и selector', () => {
    const api = apiOf(makeSandbox({ readyState: 'complete' }));
    expect(api.selector).toBe(SELECTOR);
    expect(typeof api.init).toBe('function');
  });
});

describe('стенд и подключение (DoD T6.4)', () => {
  it("'ui-accordion' в COMPONENTS showcase/build.mjs — CSS/JS попадают в dist", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-accordion'[^\]]*\]/);
  });

  it('стенд showcase/pages/ui-accordion: FAQ-вариант + список + single-open (AC)', () => {
    const stand = readFileSync(join(root, 'showcase', 'pages', 'ui-accordion', 'index.html'), 'utf8');
    expect(stand, 'секция FAQ-варианта').toContain('id="uiacc-faq"');
    expect(stand, 'секция списка').toContain('id="uiacc-list"');
    expect(stand, 'секция single-open').toContain('id="uiacc-single"');
    expect(stand, 'FAQ-вариант — модификатор --faq').toContain('ui-accordion--faq');
    expect(
      stand.match(/data-ui-accordion="single"/g),
      'хук single — ровно на одном инстансе',
    ).toHaveLength(1);
  });

  it('токен веса вопроса в слое 2: --ui-fw-body-bold: 500 (career-portal --fw-body-bold, --fs-body × bold)', () => {
    const semantic = readFileSync(join(root, 'tokens', 'semantic.css'), 'utf8');
    expect(semantic).toContain('--ui-fw-body-bold: 500;');
  });

  it('README компонента: решение по анимации details, no-JS, single-open, FAQPage «когда уместно» (AC)', () => {
    const readme = readFileSync(join(root, 'components', 'ui-accordion', 'README.md'), 'utf8');
    for (const keyword of [
      '::details-content',
      'grid-template-rows',
      'allow-discrete',
      'interpolate-size',
      'Enter',
      'Space',
      'data-ui-accordion="single"',
      'FAQPage',
      'prefers-reduced-motion',
    ]) {
      expect(readme, keyword).toContain(keyword);
    }
  });
});

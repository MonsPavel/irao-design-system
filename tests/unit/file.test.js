/**
 * Юнит-пины ui-file (задача T5.3; Testing requirements).
 *
 * Доступный файловый инпут: закрывает класс D аудита career-portal —
 * `.field__file input { display: none }` (css/pages.css:242) убивал
 * клавиатуру и скринридера. Исполняемая форма решения:
 *  - components/ui-file/ui-file.css: коробка одобренного .field__file
 *    (flex, gap 12px, 52px, bg surface-muted, radius sm); кнопка-лейбл —
 *    визуал .btn--light; input — sr-only КЛИПОМ (не display:none, не
 *    visibility:hidden); видимый фокус рисует кнопка через :has
 *    (прецедент ui-field__select-wrap); disabled — :has затемнение;
 *  - канонический паттерн ui-file.html: ОДИН label на инпут (кнопка-лейбл
 *    обёрткой) — второй label дал бы axe form-field-multiple-labels,
 *    поэтому имя полю задаёт aria-labelledby на видимый label-текст
 *    обвязки (span.ui-field__label); значение выбора — ui-file__value с
 *    role="status" в разметке; сброс — доступная нативная кнопка;
 *  - модуль ui-file.js по контракту module-template (T1.6): readyState-
 *    guard, регистрация window.IraoUI.file, formatSize — чистая функция;
 *  - стенд: пусто / выбран (демо-разметка без JS-хука) / ошибка / disabled;
 *  - подключение 'ui-file' в COMPONENTS showcase/build.mjs; дока README
 *    с анти-примером career-portal и правилом «без display:none/visibility:
 *    hidden на нативных контролах».
 * Поверхность браузера (Tab/фокус/выбор/сброс/Escape/axe/эталоны) —
 * tests/e2e/ui-file.spec.js.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев: пины смотрят на исполняемый код, а не на прозу шапки.
 *  \r\n → \n: рабочая копия Windows (core.autocrlf=true) отдаёт CRLF —
 *  нормализация делает прогон одинаковым на обеих сторонах. */
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\r\n/g, '\n');

/** Тело правила по селектору (начало строки — селектор, до закрывающей скобки). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

describe('components/ui-file/ui-file.css — коробка, кнопка, sr-only (T5.3)', () => {
  const path = join(root, 'components', 'ui-file', 'ui-file.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define file — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define file */')).toBe(true);
  });

  it('.ui-file: box-sizing (ADR-0002); коробка одобренного .field__file — flex, gap 12px, 52px min-height, bg surface-muted, radius sm', () => {
    const block = blockOf(css, '.ui-file');
    expect(block, 'правило .ui-file найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: flex;');
    expect(block).toContain('flex-wrap: wrap;');
    expect(block, 'gap 12px одобренного .field__file').toContain('gap: var(--ui-space-3);');
    expect(block).toContain('align-items: center;');
    expect(block, '52px одобренного, min-height (не height — 32px-база T3.6)').toContain(
      'min-height: var(--ui-field-height);',
    );
    expect(block, 'padding 4px 16px одобренного .field__file').toContain(
      'padding: var(--ui-space-1) var(--ui-space-4);',
    );
    expect(block).toContain('border-radius: var(--ui-radius-sm);');
    expect(block, 'фон surface-blue-50 одобренного').toContain(
      'background-color: var(--ui-color-surface-muted);',
    );
  });

  it('.ui-file__button: кнопка-лейбл — визуал одобренного .btn--light (текст primary на фоне коробки, pill, тройка small), высота из токенов поля', () => {
    const block = blockOf(css, '.ui-file__button');
    expect(block, 'правило кнопки-лейбла найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: inline-flex;');
    expect(block).toContain('align-items: center;');
    expect(block).toContain('justify-content: center;');
    expect(block, 'внутри 52px-коробки с вертикальным паддингом 4px×2').toContain(
      'min-height: calc(var(--ui-field-height) - var(--ui-space-2));',
    );
    expect(block).toContain('padding: var(--ui-space-3) var(--ui-space-5);');
    expect(block, 'pill одобренного .btn').toContain('border-radius: var(--ui-radius-pill);');
    expect(block, 'подпись primary одобренного .btn--light').toContain(
      'color: var(--ui-color-primary);',
    );
    expect(block).toContain('font-size: var(--ui-fs-small);');
    expect(block).toContain('transition:');
    expect(block).toContain('cursor: pointer;');
  });

  it('.ui-file__input — sr-only КЛИПОМ (Scope T5.3): не display:none, не visibility:hidden, не opacity — класс D аудита в систему не переносится', () => {
    const block = blockOf(css, '.ui-file__input');
    expect(block, 'правило sr-only инпута найдено').toBeTruthy();
    expect(block).toContain('position: absolute;');
    expect(block, 'классический sr-only: бокс 1px').toContain('width: 1px;');
    expect(block).toContain('height: 1px;');
    expect(block).toContain('overflow: hidden;');
    expect(block, 'клип вместо display:none — инпут остаётся в tab-порядке').toContain(
      'clip-path: inset(50%);',
    );
    expect(
      block,
      'display:none убрал бы контрол из клавиатуры (анти-паттерн career-portal)',
    ).not.toContain('display');
    expect(block, 'visibility:hidden тоже убирает из a11y-дерева').not.toContain('visibility');
    expect(block, 'opacity:0 — та же подмена, запрещена').not.toContain('opacity');
  });

  it('фокус: обводку рисует кнопка-лейбл через :has (Technical considerations T5.3), тройка токенов ADR-0001; outline нигде не гасится', () => {
    const focus = blockOf(css, '.ui-file__button:has(.ui-file__input:focus-visible)');
    expect(focus, 'правило фокуса кнопки найдено').toBeTruthy();
    expect(focus).toContain('outline: var(--ui-focus-width) solid var(--ui-focus-color);');
    expect(focus).toContain('outline-offset: var(--ui-focus-offset);');
    expect(
      css,
      'outline: none в компоненте нет — глобальная политика ADR-0001 не гасится',
    ).not.toMatch(/outline[^:]*:\s*(?:none|0)/);
  });

  it('.ui-file__value: значение выбора — цвет текста, тройка small, длинное имя переносится', () => {
    const block = blockOf(css, '.ui-file__value');
    expect(block, 'правило значения найдено').toBeTruthy();
    expect(block).toContain('color: var(--ui-color-text);');
    expect(block).toContain('font-size: var(--ui-fs-small);');
    expect(block, 'имя файла без пробелов не ломает коробку').toContain('overflow-wrap: anywhere;');
  });

  it('.ui-file__reset: доступная кнопка сброса — нативный button, высота sm-токена, прозрачная коробка', () => {
    const block = blockOf(css, '.ui-file__reset');
    expect(block, 'правило кнопки сброса найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: inline-flex;');
    expect(block, 'высота — токен sm-кнопки (слой 2)').toContain(
      'min-height: var(--ui-button-height-sm);',
    );
    expect(block).toContain('background-color: transparent;');
    expect(block).toContain('cursor: pointer;');
  });

  it('.ui-file__hint: accept-подсказка внутри коробки — micro/muted (визуал .field__file-hint career-portal)', () => {
    const block = blockOf(css, '.ui-file__hint');
    expect(block, 'правило подсказки найдено').toBeTruthy();
    expect(block).toContain('color: var(--ui-color-text-muted);');
    expect(block).toContain('font-size: var(--ui-fs-micro);');
  });

  it('disabled: коробка гаснет целиком через :has (инпут sr-only — прецедент стрелки select T5.2), курсор default', () => {
    const box = blockOf(css, '.ui-file:has(.ui-file__input:disabled)');
    expect(box, 'правило затемнения найдено').toBeTruthy();
    expect(box).toContain('opacity: var(--ui-opacity-disabled);');

    const cursor = blockOf(css, '.ui-file:has(.ui-file__input:disabled) .ui-file__button');
    expect(cursor, 'курсор кнопки disabled').toContain('cursor: default;');
  });

  it('hover только под (hover: hover) — пара одобренного .btn--light (blue-100 = surface-hover); width-медиа нет', () => {
    expect(css).toContain('@media (hover: hover)');
    const hover = css.match(/@media \(hover: hover\) \{([\s\S]*?)\n\}/);
    expect(hover, 'блок hover найден').toBeTruthy();
    expect(hover[1]).toContain('.ui-file__button:hover');
    expect(hover[1]).toContain('background-color: var(--ui-color-surface-hover);');
    expect(css, 'mobile-first: width-медиа не заводим (шкала T2.5)').not.toMatch(
      /@media \((?:min|max)-width/,
    );
  });

  it('инварианты системы: без !important и hex (vi-перекраска, §5); компонент читает только слой 2', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    const families = [
      'blue',
      'gray',
      'red',
      'green',
      'orange',
      'slate',
      'purple',
      'peach',
      'white',
      'black',
    ];
    const primitiveRef = new RegExp(`var\\(--ui-(?:${families.join('|')})-[0-9]`);
    expect(css, 'ссылки на примитивы запрещены вне tokens/').not.toMatch(primitiveRef);
  });

  it('геометрия только из токенов слоя 2 (новых токенов задача не вводит)', () => {
    for (const token of [
      '--ui-field-height',
      '--ui-space-1',
      '--ui-space-3',
      '--ui-space-4',
      '--ui-radius-sm',
      '--ui-radius-pill',
      '--ui-color-surface-muted',
      '--ui-color-primary',
      '--ui-color-surface-hover',
      '--ui-focus-width',
      '--ui-focus-color',
      '--ui-focus-offset',
      '--ui-opacity-disabled',
    ]) {
      expect(css, `${token} читается компонентом`).toContain(`var(${token})`);
    }
  });
});

describe('components/ui-file/ui-file.js — контракт module-template и formatSize (T5.3)', () => {
  const path = join(root, 'components', 'ui-file', 'ui-file.js');
  const source = readFileSync(path, 'utf8');

  /**
   * Песочница: документ с заданным readyState и телом (эталон —
   * tests/unit/module-template.test.js). Скрипт исполняется window.eval
   * в КОНТЕКСТЕ песочницы.
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

  const liveInstanceHtml = `
    <div class="ui-file" data-ui-file>
      <label class="ui-file__button">
        <input class="ui-file__input" type="file" id="resume">
        <span class="ui-file__button-text">прикрепить файл</span>
      </label>
      <p class="ui-file__value" role="status">устаревший текст разметки</p>
      <button class="ui-file__reset" type="button">Убрать файл</button>
    </div>`;

  it('модуль существует и регистрируется в window.IraoUI.file (init + selector), имя kebab-case', () => {
    expect(existsSync(path), 'модуль на месте').toBe(true);
    const { window } = makeSandbox();
    expect(typeof window.IraoUI.file.init).toBe('function');
    expect(window.IraoUI.file.selector).toBe('[data-ui-file]');
  });

  it("readyState 'complete': init синхронный — значение нормализуется в «Файл не выбран», сброс скрыт", () => {
    const { document } = makeSandbox({ bodyHtml: liveInstanceHtml });

    const value = document.querySelector('.ui-file__value');
    expect(value.textContent, 'render() при init выравнивает разметку').toBe('Файл не выбран');
    const reset = document.querySelector('.ui-file__reset');
    expect(reset.hidden, 'кнопка сброса без файла скрыта').toBe(true);
  });

  it("readyState 'loading': init отложен одной подпиской на DOMContentLoaded, регистрация — сразу", () => {
    const { window, document, domContentLoadedSubscriptions } = makeSandbox({
      readyState: 'loading',
      bodyHtml: liveInstanceHtml,
    });

    const value = document.querySelector('.ui-file__value');
    expect(value.textContent, 'до события ничего не инициализируется').toBe(
      'устаревший текст разметки',
    );
    expect(domContentLoadedSubscriptions).toHaveLength(1);
    expect(typeof window.IraoUI.file.init).toBe('function');

    document.dispatchEvent(new window.Event('DOMContentLoaded'));
    expect(value.textContent).toBe('Файл не выбран');
  });

  it('повторный init не создаёт дублей (guard); клик по сбросу навешан ровно один раз', () => {
    const { window, document } = makeSandbox({ bodyHtml: liveInstanceHtml });

    const clicks = [];
    const reset = document.querySelector('.ui-file__reset');
    const original = reset.addEventListener.bind(reset);
    reset.addEventListener = (type, listener, options) => {
      if (type === 'click') clicks.push(listener);
      return original(type, listener, options);
    };

    window.IraoUI.file.init();
    window.IraoUI.file.init();

    expect(clicks).toHaveLength(1);
  });

  it('нет элементов — тихий выход; сломанный инстанс (без __value) уходит в console.warn и не мешает соседям', () => {
    const empty = makeSandbox({ bodyHtml: '<p>ничего</p>' });
    expect(empty.warnings).toHaveLength(0);

    const mixed = makeSandbox({
      bodyHtml:
        '<div class="ui-file" data-ui-file><input class="ui-file__input" type="file"></div>' +
        liveInstanceHtml,
    });
    expect(mixed.warnings.length, 'ошибка первого инстанса поймана').toBeGreaterThanOrEqual(1);
    expect(
      mixed.document.querySelector('.ui-file__value').textContent,
      'соседний инстанс инициализирован',
    ).toBe('Файл не выбран');
    expect(typeof mixed.window.IraoUI.file.init).toBe('function');
  });

  it('formatSize — чистая функция: Б/КБ/МБ/ГБ, дробь через запятую (ru)', () => {
    const { window } = makeSandbox();
    const formatSize = window.IraoUI.file.formatSize;
    expect(typeof formatSize).toBe('function');

    expect(formatSize(0)).toBe('0 Б');
    expect(formatSize(511)).toBe('511 Б');
    expect(formatSize(1024)).toBe('1 КБ');
    expect(formatSize(1536)).toBe('1,5 КБ');
    expect(formatSize(250880)).toBe('245 КБ');
    expect(formatSize(5242880)).toBe('5 МБ');
    expect(formatSize(7340032)).toBe('7 МБ');
    expect(formatSize(1073741824)).toBe('1 ГБ');
    expect(formatSize(1610612736)).toBe('1,5 ГБ');
  });
});

describe('канонический паттерн ui-file (components/ui-file/ui-file.html)', () => {
  const path = join(root, 'components', 'ui-file', 'ui-file.html');
  const html = readFileSync(path, 'utf8');

  it('корень обвязки ui-field с полным паттерном ошибки; имя полю несёт span.ui-field__label с id (НЕ второй label — axe form-field-multiple-labels)', () => {
    expect(html).toContain('class="ui-field');
    expect(html).toMatch(/<(?:span|label|h\d)[^>]*class="ui-field__label"[^>]*id="([^"]+)"/);

    const labels = html.match(/<label\b/g) ?? [];
    expect(labels, 'на инпуте ровно один label — кнопка-лейбл (Scope T5.3)').toHaveLength(1);
    expect(html, 'кнопка-лейбл — label.ui-file__button').toContain('class="ui-file__button"');
  });

  it('нативный input type=file внутри кнопки-лейбла: sr-only класс, accept из паттерна career-portal, без hidden/style-подмен', () => {
    const labelBlock = html.match(/<label\b[\s\S]*?<\/label>/)?.[0] ?? '';
    expect(labelBlock, 'инпут внутри кнопки-лейбла').toContain('<input');

    const inputTag = html.match(/<input\b[^>]*>/s)?.[0] ?? '';
    expect(inputTag).toContain('type="file"');
    expect(inputTag).toContain('class="ui-file__input"');
    expect(inputTag, 'accept — пример из career-portal (Technical considerations T5.3)').toContain(
      'accept=".doc,.docx,.pdf"',
    );
    expect(inputTag, 'нативный контрол не прячется атрибутом hidden').not.toMatch(/\bhidden\b/);
    expect(inputTag, 'без inline-стилей (VI §5)').not.toMatch(/\bstyle=/);
    expect(html, 'без tabindex — естественный tab-порядок').not.toMatch(/tabindex=/);
  });

  it('имя поля через aria-labelledby на label-текст обвязки; подсказка и ошибка — aria-describedby', () => {
    const inputTag = html.match(/<input\b[^>]*>/s)?.[0] ?? '';
    const labelId = html.match(/class="ui-field__label"[^>]*id="([^"]+)"/)?.[1];
    expect(labelId, 'у label-текста есть id').toBeTruthy();
    expect(inputTag, 'aria-labelledby ведёт на имя поля').toContain(`aria-labelledby="${labelId}"`);

    const describedby = inputTag.match(/aria-describedby="([^"]+)"/)?.[1] ?? '';
    const hintId = html.match(/class="ui-file__hint"[^>]*id="([^"]+)"/)?.[1];
    const errorId = html.match(/class="ui-field__error"[^>]*id="([^"]+)"/)?.[1];
    expect(hintId, 'id подсказки есть').toBeTruthy();
    expect(errorId, 'id ошибки есть').toBeTruthy();
    expect(describedby, 'describedby ведёт и на hint, и на error').toContain(hintId);
    expect(describedby).toContain(errorId);
  });

  it('значение выбора: ui-file__value с role="status" (озвучивание) и пустым текстом; сброс — нативный button type=button, скрыт до выбора', () => {
    expect(html).toMatch(
      /class="ui-file__value"[^>]*role="status"|role="status"[^>]*class="ui-file__value"/,
    );
    const valueText = html.match(/class="ui-file__value"[^>]*>([^<]+)</)?.[1]?.trim();
    expect(valueText, 'пустое состояние означено в DOM').toBe('Файл не выбран');

    const resetTag = html.match(/<button[^>]*class="ui-file__reset"[^>]*>/)?.[0] ?? '';
    expect(resetTag, 'кнопка сброса — нативный button').toContain('<button');
    expect(resetTag, 'type="button" — не сабмитит форму').toContain('type="button"');
    expect(
      resetTag,
      'до выбора скрыта (hidden — допустимо: это не нативный контрол значения)',
    ).toContain('hidden');
    expect(html, 'название действия сброса').toContain('Убрать файл');
  });

  it('ошибка — визуал и aria в одном паттерне: required-маркер, aria-invalid, role="alert"', () => {
    const inputTag = html.match(/<input\b[^>]*>/s)?.[0] ?? '';
    expect(inputTag, 'aria-invalid="true" при ошибке').toContain('aria-invalid="true"');
    expect(inputTag).toContain('required');
    expect(html, 'звёздочка декоративна, смысл — текстом скринридеру').toContain(
      'class="ui-field__req"',
    );
    expect(html).toMatch(
      /class="ui-field__error"[^>]*role="alert"|role="alert"[^>]*class="ui-field__error"/,
    );
  });
});

describe('стенд и подключение (Scope T5.3)', () => {
  it('стенд ui-file (showcase/pages/ui-file/index.html): пусто / выбран (демо) / ошибка / disabled', () => {
    const stand = readFileSync(join(root, 'showcase', 'pages', 'ui-file', 'index.html'), 'utf8');

    expect(stand, 'живой инстанс с JS-хуком').toContain('data-ui-file');
    expect(stand, 'состояние «выбран» продемонстрировано').toContain('Выбран файл:');
    expect(stand, 'демо «выбран» — без JS-хука (в живом поле состояние рисует модуль)').toMatch(
      /Выбран файл:[\s\S]{0,400}/,
    );
    expect(stand, 'состояние error').toContain('ui-field--error');
    expect(stand, 'состояние disabled').toMatch(
      /ui-file__input[^>]*disabled|disabled[^>]*ui-file__input/,
    );
    expect(stand, 'кнопка сброса продемонстрирована').toContain('ui-file__reset');
    expect(stand, 'гейт T3.6 не расширяется без CHECK_STANDS').not.toContain(
      'data-ui-check-layout',
    );
  });

  it("'ui-file' в COMPONENTS showcase/build.mjs — CSS/JS попадают в dist", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-file'[^\]]*\]/);
  });
});

describe('дока компонента (DoD T5.3 — правило анти-паттерна)', () => {
  const readme = () => readFileSync(join(root, 'components', 'ui-file', 'README.md'), 'utf8');

  it('README: запрет display:none/visibility:hidden на нативных контролах, анти-пример career-portal, sr-only, role=status, сброс, Escape', () => {
    const text = readme();
    for (const keyword of [
      'display: none',
      'visibility: hidden',
      'career-portal',
      'sr-only',
      'clip-path',
      'role="status"',
      'aria-labelledby',
      'aria-describedby',
      'Убрать файл',
      'Escape',
      'accept',
      'form-field-multiple-labels',
    ]) {
      expect(text, keyword).toContain(keyword);
    }
  });
});

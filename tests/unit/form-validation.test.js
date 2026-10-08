/**
 * Юнит-пины T5.5 — модуль IraoUI.form: клиентская валидация как
 * progressive enhancement (Testing requirements).
 *
 * Источник — career-portal js/forms.js (класс B): порт модели «сервер —
 * источник истины, JS — UX» с рефакторингом в неймспейс IraoUI и чистые
 * функции. Исполняемая форма решения:
 *  - components/ui-form/ui-form.js: активация form[data-ui-form]; novalidate
 *    ставит ТОЛЬКО инициализация модуля (в разметке его нет — нативная
 *    валидация работает без JS, принцип ТЗ №14); правила из нативных
 *    атрибутов (required, type=email, pattern, minlength) + data-ui-max-size
 *    (файл) + data-ui-validate (кастомный валидатор сайта — точка
 *    расширения, Out of scope «кастомные правила бизнес-логики»);
 *  - чистые функции (юнит-тестируемые): checkRequired (career-portal:
 *    trim), checkEmail (регэксп career-portal — перенос «как есть»),
 *    checkPattern/checkMinLength (нативная семантика: якоря по всей
 *    строке, пустое значение проходит, битый регэксп игнорируется),
 *    checkFileSize (лимит включительно), formatBytes (лестница ui-file);
 *  - контракт ошибок единый с сервером (T5.6): ui-field--error +
 *    aria-invalid + aria-describedby + текст в ui-field__error (создаётся
 *    при отсутствии); скрытые ветки ([hidden]-предок) пропускаются —
 *    перенос поведения career-portal;
 *  - submit: блокировка с ошибками, фокус на сводную ошибку (или первое
 *    невалидное поле без summary — WCAG 3.3.1), заполнение summary
 *    ссылками; валидный сабмит модуль ПРОПУСКАЕТ (dispatch form-valid,
 *    кнопка is-loading + aria-busy — интеграция с T4.2), повторный сабмит
 *    на время валидного заблокирован.
 * Поверхность браузера (полный цикл no-JS → with-JS, input/blur, события,
 * axe) — tests/e2e/ui-form-validate.spec.js.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

const root = join(import.meta.dirname, '..', '..');
const modulePath = join(root, 'components', 'ui-form', 'ui-form.js');
const source = readFileSync(modulePath, 'utf8');

/**
 * Песочница: документ с заданным readyState и телом (эталон —
 * tests/unit/module-template.test.js, сценарии файла — file.test.js).
 * Скрипт исполняется window.eval в КОНТЕКСТЕ песочницы.
 */
function makeSandbox({ readyState = 'complete', bodyHtml = '' } = {}) {
  const dom = new JSDOM('<!doctype html><html><body>' + bodyHtml + '</body></html>', {
    url: 'https://showcase.test/stands/ui-form.html',
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

/** Живая форма песочницы: required-имя, required-email, summary, сабмит. */
const liveFormHtml = `
  <form class="ui-form" id="tf" action="#target" data-ui-form>
    <div class="ui-form__summary" role="alert" tabindex="-1" hidden>
      <h3 class="ui-form__summary-title"></h3>
      <ul class="ui-form__summary-list"></ul>
    </div>
    <div class="ui-form__grid">
      <div class="ui-field ui-field--required">
        <label class="ui-field__label" for="tf-name">Имя</label>
        <input class="ui-field__input" type="text" id="tf-name" name="name" required>
      </div>
      <div class="ui-field ui-field--required">
        <label class="ui-field__label" for="tf-email">E-mail</label>
        <input class="ui-field__input" type="email" id="tf-email" name="email" required>
      </div>
    </div>
    <button class="ui-button" type="submit">Отправить</button>
  </form>`;

/** Отправить форму песочницы (нативная валидация jsdom не мешает). */
const submitForm = (window, form) =>
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

describe('components/ui-form/ui-form.js — чистые функции валидации (Scope T5.5)', () => {
  const { window } = makeSandbox();
  const api = () => window.IraoUI.form;

  it('модуль существует и регистрируется в window.IraoUI.form (init + selector)', () => {
    expect(typeof api().init).toBe('function');
    expect(api().selector).toBe('[data-ui-form]');
  });

  it('реестр кастомных валидаторов сайта — расширяемый объект (точка расширения)', () => {
    expect(api().validators).toEqual({});
    api().validators.even = () => true;
    expect(api().validators.even).toBeTypeOf('function');
    delete api().validators.even;
  });

  describe('checkRequired — career-portal: непусто после trim', () => {
    it.each([
      ['Иван', true],
      ['привет', true],
      ['0', true],
      ['', false],
      ['   ', false],
      ['\n\t', false],
    ])('checkRequired(%j) → %j', (value, expected) => {
      expect(api().checkRequired(value)).toBe(expected);
    });
  });

  describe('checkEmail — регэксп career-portal: пустые/краевые/unicode (AC)', () => {
    it.each([
      // валидные
      ['user@example.com', true],
      ['user.name+tag@example.co', true],
      ["o'brien@example.ie", true],
      ['пример@пример.ру', true],
      ['user@xn--e1afmkfd.xn--p1ai', true],
      ['a@b.cd', true],
      // краевые/невалидные
      ['', false],
      ['   ', false],
      ['resume@', false],
      ['@example.com', false],
      ['user@', false],
      ['user@example', false],
      ['user@example.c', false],
      ['user@@example.com', false],
      ['us er@example.com', false],
      ['user@exa mple.com', false],
      ['user@example.co m', false],
    ])('checkEmail(%j) → %j', (value, expected) => {
      expect(api().checkEmail(value)).toBe(expected);
    });
  });

  describe('checkPattern — нативная семантика pattern: вся строка, пустое проходит', () => {
    it.each([
      ['+7 999 123-45-67', '[0-9\\s+-]+', true],
      ['abc', '[0-9]+', false],
      ['abc123', '[0-9]+', false],
      ['123', '[0-9]+', true],
      ['Иван', '[А-ЯЁа-яё\\s-]+', true],
      ['Ivan', '[А-ЯЁа-яё\\s-]+', false],
      ['Иваn', '[А-ЯЁа-яё\\s-]+', false],
      ['', '[0-9]+', true],
      ['любое', '[', true],
    ])('checkPattern(%j, %j) → %j', (value, pattern, expected) => {
      expect(api().checkPattern(value, pattern)).toBe(expected);
    });
  });

  describe('checkMinLength — нативная семантика: пустое значение проходит', () => {
    it.each([
      ['абв', 3, true],
      ['абвг', 3, true],
      ['аб', 3, false],
      ['', 3, true],
      ['привет', 0, true],
    ])('checkMinLength(%j, %j) → %j', (value, min, expected) => {
      expect(api().checkMinLength(value, min)).toBe(expected);
    });
  });

  describe('checkFileSize — лимит включительно', () => {
    it.each([
      [0, 1048576, true],
      [1048575, 1048576, true],
      [1048576, 1048576, true],
      [1048577, 1048576, false],
      [7340032, 1048576, false],
    ])('checkFileSize(%j, %j) → %j', (size, max, expected) => {
      expect(api().checkFileSize(size, max)).toBe(expected);
    });
  });

  describe('formatBytes — лестница Б/КБ/МБ/ГБ, дробь через запятую (ru)', () => {
    it.each([
      [0, '0 Б'],
      [511, '511 Б'],
      [1024, '1 КБ'],
      [1536, '1,5 КБ'],
      [1048576, '1 МБ'],
      [1572864, '1,5 МБ'],
      [5242880, '5 МБ'],
      [1073741824, '1 ГБ'],
      [1610612736, '1,5 ГБ'],
    ])('formatBytes(%j) → %j', (bytes, expected) => {
      expect(api().formatBytes(bytes)).toBe(expected);
    });
  });
});

describe('components/ui-form/ui-form.js — validateField: правила одного поля (jsdom)', () => {
  /** Поле в обвязке ui-field с заданными атрибутами. */
  const fieldHtml = (attrs) => `
    <div class="ui-field">
      <label class="ui-field__label" for="vf">Поле</label>
      <input class="ui-field__input" id="vf" name="field" ${attrs}>
    </div>`;

  const validate = (attrs, value = '') => {
    const { window, document } = makeSandbox({ bodyHtml: fieldHtml(attrs) });
    const field = document.getElementById('vf');
    field.value = value;
    return { message: window.IraoUI.form.validateField(field), field };
  };

  it('обязательное пустое/из пробелов → сообщение по умолчанию (RU); заполненное → null', () => {
    expect(validate('required').message).toBe('Заполните это поле');
    expect(validate('required', '   ').message).toBe('Заполните это поле');
    expect(validate('required', 'Иван').message).toBeNull();
  });

  it('порядок правил: required раньше email — у пустого required-email сообщение required', () => {
    const { window, document } = makeSandbox({
      bodyHtml: fieldHtml('type="email" required'),
    });
    const field = document.getElementById('vf');
    field.value = '';
    expect(window.IraoUI.form.validateField(field)).toBe('Заполните это поле');
  });

  it('type=email: значение trim-ится (career-portal); краевой регэксп', () => {
    expect(validate('type="email"', 'resume@').message).toBe('Исправьте адрес e-mail');
    expect(validate('type="email"', ' user@example.com ').message).toBeNull();
    expect(validate('type="email"', 'пример@пример.ру').message).toBeNull();
  });

  it('pattern: нативная семантика (вся строка, пустое проходит)', () => {
    expect(validate('pattern="[0-9]+"', 'abc').message).toBe('Исправьте формат значения');
    expect(validate('pattern="[0-9]+"').message).toBeNull();
    expect(validate('pattern="[0-9]+"', '123').message).toBeNull();
  });

  it('minlength: нативная семантика (пустое проходит), число в сообщении', () => {
    expect(validate('minlength="10"', 'аб').message).toBe('Используйте не менее 10 символов');
    expect(validate('minlength="10"').message).toBeNull();
    expect(validate('minlength="10"', 'десять симв').message).toBeNull();
  });

  it('checkbox: required — «Отметьте этот пункт» до включения', () => {
    const { window, document } = makeSandbox({
      bodyHtml: `
        <div class="ui-field ui-field--required">
          <label class="ui-checkbox"><input class="ui-checkbox__input" id="vf" type="checkbox" required> Согласен</label>
        </div>`,
    });
    const field = document.getElementById('vf');
    expect(window.IraoUI.form.validateField(field)).toBe('Отметьте этот пункт');
    field.checked = true;
    expect(window.IraoUI.form.validateField(field)).toBeNull();
  });

  it('file: data-ui-max-size — человечий лимит в сообщении; в лимите — null', () => {
    const oversize = makeSandbox({
      bodyHtml: fieldHtml('type="file" data-ui-max-size="1048576"'),
    });
    const overField = oversize.document.getElementById('vf');
    Object.defineProperty(overField, 'files', {
      configurable: true,
      value: [{ name: 'big.pdf', size: 2097152 }],
    });
    expect(oversize.window.IraoUI.form.validateField(overField)).toBe(
      'Файл слишком большой — максимум 1 МБ',
    );

    const within = makeSandbox({
      bodyHtml: fieldHtml('type="file" data-ui-max-size="1048576"'),
    });
    const withinField = within.document.getElementById('vf');
    Object.defineProperty(withinField, 'files', {
      configurable: true,
      value: [{ name: 'ok.pdf', size: 1048576 }],
    });
    expect(within.window.IraoUI.form.validateField(withinField)).toBeNull();
  });

  it('data-ui-validate: валидатор сайта (реестр IraoUI.form.validators) — true/false/строка-сообщение', () => {
    const { window, document } = makeSandbox({
      bodyHtml: fieldHtml('data-ui-validate="even"'),
    });
    const field = document.getElementById('vf');

    window.IraoUI.form.validators.even = (el) => {
      window.IraoUI.form.validators.evenCalls = (window.IraoUI.form.validators.evenCalls ?? 0) + 1;
      window.IraoUI.form.validators.evenArg = el;
      return el.value === 'вал' ? true : 'Только «вал»';
    };

    field.value = 'зло';
    expect(window.IraoUI.form.validateField(field)).toBe('Только «вал»');
    field.value = 'вал';
    expect(window.IraoUI.form.validateField(field)).toBeNull();
    expect(window.IraoUI.form.validators.evenArg).toBe(field);
    delete window.IraoUI.form.validators.even;

    // false → сообщение по умолчанию кастомного правила.
    const fallback = makeSandbox({ bodyHtml: fieldHtml('data-ui-validate="nope"') });
    fallback.window.IraoUI.form.validators.nope = () => false;
    expect(fallback.window.IraoUI.form.validateField(fallback.document.getElementById('vf'))).toBe(
      'Исправьте значение поля',
    );
  });

  it('data-ui-validate: имя без валидатора в реестре — правило пропускается (сайт зарегистрирует позже)', () => {
    expect(validate('data-ui-validate="нет-такого"', '').message).toBeNull();
  });

  it('data-ui-error на контроле переопределяет сообщение любого правила', () => {
    expect(validate('required data-ui-error="Укажите имя"', '').message).toBe('Укажите имя');
    expect(validate('type="email" data-ui-error="Проверьте e-mail"', 'x').message).toBe(
      'Проверьте e-mail',
    );
  });

  it('скрытая ветка ([hidden]-предок) пропускается — перенос career-portal; disabled тоже', () => {
    const { window, document } = makeSandbox({
      bodyHtml: `
        <div hidden>
          <div class="ui-field"><input class="ui-field__input" id="vf" required></div>
        </div>`,
    });
    expect(window.IraoUI.form.validateField(document.getElementById('vf'))).toBeNull();

    const disabled = makeSandbox({ bodyHtml: fieldHtml('required disabled') });
    expect(
      disabled.window.IraoUI.form.validateField(disabled.document.getElementById('vf')),
    ).toBeNull();
  });
});

describe('components/ui-form/ui-form.js — контракт module-template и novalidate (T1.1/AC)', () => {
  it('модуль на месте; активация — form[data-ui-form] (Scope)', () => {
    const { window } = makeSandbox();
    expect(window.IraoUI.form.selector).toBe('[data-ui-form]');
  });

  it("readyState 'loading': init отложен (novalidate ещё не стоит), регистрация — сразу", () => {
    const { window, document, domContentLoadedSubscriptions } = makeSandbox({
      readyState: 'loading',
      bodyHtml: liveFormHtml,
    });

    expect(document.getElementById('tf').hasAttribute('novalidate')).toBe(false);
    expect(domContentLoadedSubscriptions).toHaveLength(1);
    expect(typeof window.IraoUI.form.init).toBe('function');

    document.dispatchEvent(new window.Event('DOMContentLoaded'));
    expect(document.getElementById('tf').hasAttribute('novalidate')).toBe(true);
  });

  it('novalidate в разметке паттернов отсутствует; под JS модуль его проставляет (AC)', () => {
    // «В разметке его нет» — источник правды: канонический паттерн и стенд.
    const pattern = readFileSync(join(root, 'components', 'ui-form', 'ui-form.html'), 'utf8');
    expect(pattern, 'канонический паттерн без novalidate').not.toContain('novalidate');

    // Под JS: init при 'complete' выполняется синхронно в песочнице —
    // атрибут появляется у всех активированных форм.
    const { document } = makeSandbox({ bodyHtml: liveFormHtml });
    expect(document.getElementById('tf').hasAttribute('novalidate')).toBe(true);
    expect(document.getElementById('tf').getAttribute('data-ui-form-init')).toBe('true');
  });

  it('модуль не трогает формы без data-ui-form (активация по селектору)', () => {
    const { document } = makeSandbox({
      bodyHtml: liveFormHtml + '<form id="plain" action="/x/"></form>',
    });
    expect(document.getElementById('plain').hasAttribute('novalidate')).toBe(false);
  });

  it('повторный init не создаёт дублей (guard): submit-обработчик один', () => {
    const { window, document } = makeSandbox({
      readyState: 'loading',
      bodyHtml: liveFormHtml,
    });

    const form = document.getElementById('tf');
    const submissions = [];
    const original = form.addEventListener.bind(form);
    form.addEventListener = (type, listener, options) => {
      if (type === 'submit') submissions.push(listener);
      return original(type, listener, options);
    };

    window.IraoUI.form.init();
    window.IraoUI.form.init();

    expect(submissions).toHaveLength(1);
  });

  it('нет форм — тихий выход без предупреждений; сбой одного инстанса не роняет соседей', () => {
    const empty = makeSandbox({ bodyHtml: '<p>без форм</p>' });
    expect(empty.warnings).toHaveLength(0);

    const mixed = makeSandbox({
      bodyHtml: liveFormHtml + '<form id="second" data-ui-form></form>',
    });
    expect(mixed.document.getElementById('tf').hasAttribute('novalidate')).toBe(true);
    expect(mixed.document.getElementById('second').hasAttribute('novalidate')).toBe(true);
    expect(typeof mixed.window.IraoUI.form.init).toBe('function');
  });
});

describe('components/ui-form/ui-form.js — поведение сабмита и ошибок (jsdom)', () => {
  const sandboxWithForm = () => makeSandbox({ bodyHtml: liveFormHtml });

  it('сабмит с ошибками: preventDefault, ошибки отрендерены по контракту T5.6, form-invalid диспатчен с detail.errors', () => {
    const { window, document } = sandboxWithForm();
    const form = document.getElementById('tf');
    const invalidEvents = [];
    form.addEventListener('irao-ui:form-invalid', (event) => invalidEvents.push(event));

    expect(submitForm(window, form), 'сабмит заблокирован').toBe(false);
    expect(form.querySelector('[data-ui-form-body]'), 'демо-хука в фикстуре нет').toBeNull();

    for (const id of ['tf-name', 'tf-email']) {
      const field = document.getElementById(id);
      expect(field.getAttribute('aria-invalid'), `${id}: aria-invalid`).toBe('true');
      const describedby = field.getAttribute('aria-describedby') ?? '';
      expect(describedby, `${id}: describedby ведёт на ошибку`).toContain(`${id}-error`);
      const error = document.getElementById(`${id}-error`);
      expect(error, `${id}: текст ошибки создан`).not.toBeNull();
      expect(error.getAttribute('role')).toBe('alert');
      expect(error.textContent.length, `${id}: текст не пуст`).toBeGreaterThan(3);
      expect(field.closest('.ui-field').classList.contains('ui-field--error')).toBe(true);
    }

    expect(invalidEvents).toHaveLength(1);
    const detail = invalidEvents[0].detail;
    expect(detail.errors).toHaveLength(2);
    expect(detail.errors[0].field.id).toBe('tf-name');
    expect(typeof detail.errors[0].message).toBe('string');
  });

  it('ui-field__error из разметки используется (не дублируется); aria-describedby c hint сохраняется', () => {
    const { window, document } = makeSandbox({
      bodyHtml: liveFormHtml.replace(
        '<input class="ui-field__input" type="email" id="tf-email" name="email" required>',
        `<input class="ui-field__input" type="email" id="tf-email" name="email" required
               aria-describedby="tf-email-hint">
        <p class="ui-field__hint" id="tf-email-hint">Подсказка</p>`,
      ),
    });
    const email = document.getElementById('tf-email');
    submitForm(window, document.getElementById('tf'));

    const errors = document.querySelectorAll('#tf-email ~ .ui-field__error');
    expect(errors).toHaveLength(1);
    const describedby = (email.getAttribute('aria-describedby') ?? '').split(/\s+/);
    expect(describedby).toContain('tf-email-hint');
    expect(describedby).toContain('tf-email-error');
  });

  it('summary заполнен ссылками и показан; фокус — на summary; RU-множественное (2 ошибки)', () => {
    const { window, document } = sandboxWithForm();
    submitForm(window, document.getElementById('tf'));

    const summary = document.querySelector('.ui-form__summary');
    expect(summary.hidden, 'summary показан (hidden снят)').toBe(false);
    expect(document.activeElement, 'фокус на summary (паттерн T5.4)').toBe(summary);
    expect(summary.querySelector('.ui-form__summary-title').textContent).toBe('В форме 2 ошибки');

    const links = summary.querySelectorAll('.ui-form__summary-list a');
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute('href')).toBe('#tf-name');
    expect(links[0].classList.contains('ui-link')).toBe(true);
    expect(links[0].textContent, 'текст ссылки — сообщение поля').toBe('Заполните это поле');
    expect(links[1].getAttribute('href')).toBe('#tf-email');
  });

  it('одна ошибка → «В форме 1 ошибка» (RU-множественное)', () => {
    const { window, document } = makeSandbox({
      bodyHtml: liveFormHtml.replace(
        'id="tf-email" name="email" required',
        'id="tf-email" name="email" value="user@example.com" required',
      ),
    });
    submitForm(window, document.getElementById('tf'));
    expect(document.querySelector('.ui-form__summary-title').textContent).toBe('В форме 1 ошибка');
  });

  it('полей без summary: фокус на первом невалидном поле (WCAG 3.3.1)', () => {
    const { window, document } = makeSandbox({
      bodyHtml: liveFormHtml.replace(/<div class="ui-form__summary"[\s\S]*?<\/div>\s*/, ''),
    });
    submitForm(window, document.getElementById('tf'));
    expect(document.activeElement, 'фокус на первой ошибке').toBe(
      document.getElementById('tf-name'),
    );
  });

  it('валидный сабмит: НЕ блокируется (defaultPrevented false), form-valid диспатчен, summary скрыт', () => {
    const { window, document } = sandboxWithForm();
    const form = document.getElementById('tf');
    document.getElementById('tf-name').value = 'Иван Иванов';
    document.getElementById('tf-email').value = 'user@example.com';

    const validEvents = [];
    form.addEventListener('irao-ui:form-valid', (event) => validEvents.push(event));

    expect(submitForm(window, form), 'модуль пропускает валидный сабмит').toBe(true);
    expect(validEvents).toHaveLength(1);
    expect(document.querySelector('.ui-form__summary').hidden).toBe(true);
  });

  it('валидный сабмит: кнопка is-loading + aria-busy (интеграция T4.2); повторный сабмит заблокирован; unlock снимает', () => {
    const { window, document } = sandboxWithForm();
    const form = document.getElementById('tf');
    const button = form.querySelector('[type="submit"]');
    document.getElementById('tf-name').value = 'Иван';
    document.getElementById('tf-email').value = 'user@example.com';

    let validCount = 0;
    form.addEventListener('irao-ui:form-valid', () => {
      validCount += 1;
    });

    submitForm(window, form);
    expect(button.classList.contains('is-loading')).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');

    expect(submitForm(window, form), 'повторный сабмит заблокирован').toBe(false);
    expect(validCount, 'form-valid повторно не диспатчится').toBe(1);

    window.IraoUI.form.unlock(form);
    expect(button.classList.contains('is-loading'), 'unlock снял состояние кнопки').toBe(false);
    expect(button.hasAttribute('aria-busy')).toBe(false);

    submitForm(window, form);
    expect(validCount, 'после unlock сабмит снова проходит').toBe(2);
  });

  it('ошибка на change/blur, снятие на input (поведение career-portal + blur)', () => {
    const { window, document } = sandboxWithForm();
    const form = document.getElementById('tf');
    const name = document.getElementById('tf-name');
    const email = document.getElementById('tf-email');

    email.dispatchEvent(new window.Event('blur'));
    expect(email.getAttribute('aria-invalid'), 'blur: пустой email → ошибка').toBe('true');

    email.dispatchEvent(new window.Event('change'));
    expect(
      email.closest('.ui-field').classList.contains('ui-field--error'),
      'change: ошибка остаётся',
    ).toBe(true);

    name.dispatchEvent(new window.Event('change'));
    expect(name.getAttribute('aria-invalid'), 'change пустого required → ошибка').toBe('true');

    email.value = 'user@example.com';
    email.dispatchEvent(new window.Event('input'));
    expect(email.hasAttribute('aria-invalid'), 'input снял aria-invalid').toBe(false);
    expect(
      (email.getAttribute('aria-describedby') ?? '').includes('tf-email-error'),
      'input убрал ошибку из describedby',
    ).toBe(false);
    expect(email.closest('.ui-field').classList.contains('ui-field--error')).toBe(false);
    expect(document.getElementById('tf-email-error').textContent, 'текст ошибки очищен').toBe('');

    submitForm(window, form);
    expect(document.querySelector('.ui-form__summary').hidden, 'email исправлен — 1 ошибка').toBe(
      false,
    );
    expect(document.querySelectorAll('.ui-form__summary-list a')).toHaveLength(1);
  });

  it('клик по ссылке summary переводит фокус на поле (доопределение T5.4)', () => {
    const { window, document } = sandboxWithForm();
    submitForm(window, document.getElementById('tf'));

    const link = document.querySelector('.ui-form__summary-list a');
    link.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(document.activeElement).toBe(document.getElementById('tf-name'));
  });
});

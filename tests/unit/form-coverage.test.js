/**
 * Драйвер покрытия ui-form.js (T13.4, замечание бэклога T5.5 medium:
 * AC «покрытие ≥ 90%» не был измерен — @vitest/coverage-* отсутствовал).
 *
 * Почему файл существует: основные юнит-пины (form-validation.test.js)
 * исполняют модуль через window.eval в jsdom-песочницах — V8 не атрибутирует
 * такой запуск файлу (нет URL-маппинга), coverage-v8 видит 0%. Файл
 * импортирует модуль НАПРЯМУЮ (jsdom-окружение vitest: window/document —
 * глобальные) и прогоняет ключевые ветки — исполнение контрибьютит в
 * `npm run test:coverage`. Сценарии компактны и повторяют главные пины
 * поведения (не дублируя параметрические таблицы правил): полный цикл
 * сабмита, summary, radio-группа, unlock/destroy. Измерение —
 * vitest.config.mjs (coverage.include = components/ui-form/ui-form.js);
 * число фиксируется в отчёте задачи T13.4.
 */
import '../../components/ui-form/ui-form.js';
import { describe, expect, it } from 'vitest';

/** Короткий алиас: модуль в глобалах после импорта (jsdom-окружение). */
const api = () => window.IraoUI.form;

/** Живая форма: summary, required-имя, email, radio-группа, сабмит. */
function mountForm() {
  document.body.innerHTML = `
    <form class="ui-form" id="cf" action="#target" data-ui-form>
      <div class="ui-form__summary" role="alert" tabindex="-1" hidden>
        <h3 class="ui-form__summary-title"></h3>
        <ul class="ui-form__summary-list" role="list"></ul>
      </div>
      <div class="ui-field ui-field--required">
        <label class="ui-field__label" for="cf-name">Имя</label>
        <input class="ui-field__input" type="text" id="cf-name" name="name" required>
      </div>
      <div class="ui-field ui-field--required">
        <label class="ui-field__label" for="cf-email">E-mail</label>
        <input class="ui-field__input" type="email" id="cf-email" name="email" required>
      </div>
      <fieldset class="ui-field ui-field--required">
        <legend>Формат</legend>
        <label class="ui-radio"><input class="ui-radio__input" type="radio" id="cf-yes" name="plan" value="yes" required> Да</label>
        <label class="ui-radio"><input class="ui-radio__input" type="radio" id="cf-no" name="plan" value="no"> Нет</label>
      </fieldset>
      <button type="submit">Отправить</button>
    </form>`;
  api().init();
  return document.getElementById('cf');
}

const submitForm = (form) =>
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

describe('ui-form.js — драйвер coverage (T13.4; прямое исполнение модуля для v8)', () => {
  it('чистые функции и реестр валидаторов', () => {
    expect(api().checkRequired(' Иван ')).toBe(true);
    expect(api().checkRequired('   ')).toBe(false);
    expect(api().checkEmail('user@example.com')).toBe(true);
    expect(api().checkEmail('resume@')).toBe(false);
    expect(api().checkPattern('123', '[0-9]+')).toBe(true);
    expect(api().checkPattern('abc', '[0-9]+')).toBe(false);
    expect(api().checkPattern('', '[0-9]+')).toBe(true);
    expect(api().checkPattern('abc', '[\\q{abc}]')).toBe(true);
    expect(api().checkPattern('ab', '[\\q{abc}]')).toBe(false);
    // u-совместимый, но v-невалидный синтаксис — fallback на 'u' (старые браузеры).
    expect(api().checkPattern('/', '[/]')).toBe(true);
    expect(api().checkPattern('a', '[/]')).toBe(false);
    // Невалидный нигде ('[' бит и в v, и в u) — правило игнорируется (нативно).
    expect(api().checkPattern('любой', '[')).toBe(true);
    expect(api().checkMinLength('абв', 3)).toBe(true);
    expect(api().checkMinLength('аб', 3)).toBe(false);
    expect(api().checkMinLength('', 3)).toBe(true);
    expect(api().checkFileSize(1048576, 1048576)).toBe(true);
    expect(api().checkFileSize(1048577, 1048576)).toBe(false);
    expect(api().formatBytes(1572864)).toBe('1,5 МБ');
    expect(api().formatBytes(500)).toBe('500 Б');

    api().validators.even = (field) => (field.value === '2' ? true : 'Только 2');
    const probe = document.createElement('input');
    probe.setAttribute('data-ui-validate', 'even');
    probe.value = '3';
    expect(api().validateField(probe)).toBe('Только 2');
    probe.value = '2';
    expect(api().validateField(probe)).toBeNull();
    delete api().validators.even;
  });

  it('validateField: ветки правил — сообщения email/pattern/minlength/maxSize, checkbox/file, hidden/disabled', () => {
    const fieldWith = (attrs, value = '', files = null) => {
      const input = document.createElement('input');
      for (const [name, attrValue] of Object.entries(attrs)) {
        if (attrValue === true) {
          input.setAttribute(name, '');
        } else {
          input.setAttribute(name, attrValue);
        }
      }
      input.value = value;
      if (files) {
        Object.defineProperty(input, 'files', { configurable: true, value: files });
      }
      return input;
    };

    expect(api().validateField(fieldWith({ type: 'email' }, 'resume@'))).toBe(
      'Исправьте адрес e-mail',
    );
    expect(api().validateField(fieldWith({ pattern: '[0-9]+' }, 'abc'))).toBe(
      'Исправьте формат значения',
    );
    expect(api().validateField(fieldWith({ minlength: '10' }, 'абв'))).toBe(
      'Используйте не менее 10 символов',
    );

    const oversize = fieldWith({ type: 'file', 'data-ui-max-size': '1048576' }, '', [
      { name: 'big.pdf', size: 2097152 },
    ]);
    expect(api().validateField(oversize)).toBe('Файл слишком большой — максимум 1 МБ');

    const box = fieldWith({ type: 'checkbox', required: true });
    expect(api().validateField(box)).toBe('Отметьте этот пункт');
    box.checked = true;
    expect(api().validateField(box)).toBeNull();

    const file = fieldWith({ type: 'file', required: true });
    expect(api().validateField(file)).toBe('Прикрепите файл');

    const hiddenWrap = document.createElement('div');
    hiddenWrap.hidden = true;
    const hidden = fieldWith({ required: true });
    hiddenWrap.appendChild(hidden);
    document.body.appendChild(hiddenWrap);
    expect(api().validateField(hidden), 'скрытая ветка пропускается').toBeNull();

    const disabled = fieldWith({ required: true });
    disabled.disabled = true;
    expect(api().validateField(disabled), 'disabled пропускается').toBeNull();
  });

  it('инициализация: novalidate ставится только модулем; невалидный сабмит блокируется с контрактом T5.6 и summary', () => {
    const form = mountForm();
    expect(form.hasAttribute('novalidate'), 'novalidate при инициализации').toBe(true);

    const invalidEvents = [];
    form.addEventListener('irao-ui:form-invalid', (event) => invalidEvents.push(event));

    expect(submitForm(form), 'сабмит заблокирован').toBe(false);
    expect(invalidEvents).toHaveLength(1);
    expect(document.querySelector('.ui-form__summary').hidden).toBe(false);
    expect(document.querySelector('.ui-form__summary-title').textContent).toBe('В форме 3 ошибки');
    expect(document.querySelectorAll('.ui-form__summary-list a')).toHaveLength(3);
    expect(document.getElementById('cf-name').getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById('cf-yes').getAttribute('aria-invalid')).toBe('true');

    // Снятие ошибки на input.
    const name = document.getElementById('cf-name');
    name.value = 'Иван';
    name.dispatchEvent(new Event('input'));
    expect(name.hasAttribute('aria-invalid')).toBe(false);
  });

  it('radio-группа: выбор соседа без правил чистит ошибку всей группы (input), change валидирует', () => {
    mountForm();
    submitForm(document.getElementById('cf'));
    const yes = document.getElementById('cf-yes');
    const no = document.getElementById('cf-no');
    expect(yes.getAttribute('aria-invalid'), 'невалидная группа помечена сабмитом').toBe('true');

    no.checked = true;
    no.dispatchEvent(new Event('input', { bubbles: true }));
    expect(yes.hasAttribute('aria-invalid')).toBe(false);

    no.checked = false;
    no.dispatchEvent(new Event('change', { bubbles: true }));
    expect(yes.getAttribute('aria-invalid'), 'группа снова пуста — ошибка возвращена').toBe('true');

    yes.checked = true;
    yes.dispatchEvent(new Event('change', { bubbles: true }));
    expect(yes.hasAttribute('aria-invalid')).toBe(false);
  });

  it('валидный сабмит: модуль пропускает, кнопка is-loading + aria-busy; unlock снимает; повтор заблокирован', () => {
    const form = mountForm();
    const button = form.querySelector('[type="submit"]');
    document.getElementById('cf-name').value = 'Иван';
    document.getElementById('cf-email').value = 'user@example.com';
    document.getElementById('cf-yes').checked = true;

    const validEvents = [];
    form.addEventListener('irao-ui:form-valid', () => validEvents.push(1));

    expect(submitForm(form), 'валидный сабмит пропущен').toBe(true);
    expect(validEvents).toHaveLength(1);
    expect(button.classList.contains('is-loading')).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(document.querySelector('.ui-form__summary').hidden).toBe(true);

    expect(submitForm(form), 'повтор заблокирован').toBe(false);
    expect(validEvents).toHaveLength(1);

    api().unlock(form);
    expect(button.classList.contains('is-loading')).toBe(false);
    expect(button.hasAttribute('aria-busy')).toBe(false);
  });

  it('поле без обвязки ui-field: ошибка — реальный элемент рядом (без висячей aria-ссылки)', () => {
    document.body.innerHTML = `
      <form id="cf2" action="#target" data-ui-form>
        <input type="text" id="cf2-name" name="name" required>
        <button type="submit">Отправить</button>
      </form>`;
    api().init();
    submitForm(document.getElementById('cf2'));

    const field = document.getElementById('cf2-name');
    const errorEl = document.getElementById(`${field.id}-error`);
    expect(errorEl, 'элемент ошибки существует').not.toBeNull();
    expect(errorEl.getAttribute('role')).toBe('alert');
    expect(errorEl.textContent).toBe('Заполните это поле');
    expect(errorEl.previousElementSibling).toBe(field);
  });

  it('destroy: слушатели сняты, INIT_ATTR сброшен, повторная инициализация работает; чужая форма — null', () => {
    const form = mountForm();
    const destroyed = api().destroy(form);
    expect(destroyed).not.toBeNull();
    expect(form.hasAttribute('data-ui-form-init')).toBe(false);
    expect(submitForm(form), 'модуль больше не перехватывает сабмит').toBe(true);
    expect(api().destroy(document.createElement('form'))).toBeNull();
    expect(() => api().unlock(document.createElement('form'))).not.toThrow();

    api().init();
    expect(form.hasAttribute('data-ui-form-init'), 'повторная инициализация').toBe(true);
    expect(submitForm(form), 'валидация снова на месте').toBe(false);
  });

  it('края цикла: повторный init (guard), blur-валидация, клики мимо/по ссылке summary, clearSummary при валидном сабмите', () => {
    const form = mountForm();
    api().init(); // повторный вызов по той же форме — guard переинициализации

    // blur валидирует текстовое поле (ветка applyError не-radio).
    const name = document.getElementById('cf-name');
    name.dispatchEvent(new Event('blur'));
    expect(name.getAttribute('aria-invalid')).toBe('true');
    name.value = 'Иван';
    name.dispatchEvent(new Event('input'));

    // Клик мимо ссылки summary — ранний выход (обработчик на корне формы).
    document
      .querySelector('#cf .ui-form__summary')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    submitForm(form); // ошибки: email + radio (имя исправлено)
    const summary = document.querySelector('#cf .ui-form__summary');
    expect(summary.hidden).toBe(false);
    expect(summary.querySelector('.ui-form__summary-title').textContent).toBe('В форме 2 ошибки');

    // Клик по ссылке summary — фокус на поле (closest-ветка).
    const link = summary.querySelector('.ui-form__summary-list a');
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(document.activeElement.id).toBe(link.getAttribute('href').slice(1));

    // Довались → валидный сабмит: clearSummary чистит заголовок/список и прячет.
    document.getElementById('cf-email').value = 'user@example.com';
    document.getElementById('cf-yes').checked = true;
    expect(submitForm(form)).toBe(true);
    expect(summary.hidden).toBe(true);
    expect(summary.querySelector('.ui-form__summary-title').textContent).toBe('');
    expect(summary.querySelectorAll('.ui-form__summary-list a')).toHaveLength(0);
  });

  it('summary без tabindex получает tabindex="-1"; поле без id — сгенерированный id в ссылках summary; 1 и 5 ошибок — склонение', () => {
    let fiveInputs = '';
    for (let i = 0; i < 5; i += 1) {
      fiveInputs += `<input type="text" id="cf5-f${i}" name="f${i}" required>`;
    }
    document.body.innerHTML = `
      <form id="cf5" action="#target" data-ui-form>
        <div class="ui-form__summary" role="alert" tabindex="-1" hidden>
          <h3 class="ui-form__summary-title"></h3>
          <ul class="ui-form__summary-list"></ul>
        </div>
        ${fiveInputs}
        <button type="submit">Отправить</button>
      </form>
      <form id="cf3" action="#target" data-ui-form>
        <div class="ui-form__summary" role="alert" hidden>
          <h3 class="ui-form__summary-title"></h3>
          <ul class="ui-form__summary-list"></ul>
        </div>
        <input type="text" name="anon" required>
        <button type="submit">Отправить</button>
      </form>`;
    api().init();
    submitForm(document.getElementById('cf5'));
    expect(document.querySelector('#cf5 .ui-form__summary-title').textContent).toBe(
      'В форме 5 ошибок',
    );

    submitForm(document.getElementById('cf3'));

    const summary = document.querySelector('#cf3 .ui-form__summary');
    expect(summary.getAttribute('tabindex'), 'tabindex для программного фокуса').toBe('-1');
    const anon = document.querySelector('#cf3 input[name="anon"]');
    expect(anon.id, 'полю сгенерирован id').toMatch(/^ui-form-field-/);
    expect(document.querySelector('#cf3 .ui-form__summary-list a').getAttribute('href')).toBe(
      `#${anon.id}`,
    );
    expect(document.querySelector('#cf3 .ui-form__summary-title').textContent).toBe(
      'В форме 1 ошибка',
    );
  });

  it('снятие ошибки сохраняет hint в aria-describedby (join оставшегося списка)', () => {
    document.body.innerHTML = `
      <form id="cf6" action="#target" data-ui-form>
        <div class="ui-form__summary" role="alert" tabindex="-1" hidden>
          <h3 class="ui-form__summary-title"></h3>
          <ul class="ui-form__summary-list"></ul>
        </div>
        <div class="ui-field">
          <input type="text" id="cf6-name" name="name" required aria-describedby="cf6-name-hint">
          <p class="ui-field__hint" id="cf6-name-hint">Подсказка</p>
        </div>
        <button type="submit">Отправить</button>
      </form>`;
    api().init();
    submitForm(document.getElementById('cf6'));

    const name = document.getElementById('cf6-name');
    expect((name.getAttribute('aria-describedby') ?? '').split(/\s+/)).toEqual([
      'cf6-name-hint',
      'cf6-name-error',
    ]);

    name.value = 'Иван';
    name.dispatchEvent(new Event('input'));
    expect(name.getAttribute('aria-describedby'), 'hint сохранён, ошибка убрана').toBe(
      'cf6-name-hint',
    );
  });

  it('13 ошибок — «ошибок» (mod100 11–14); radio-группа из двух required — ОДНА запись в summary (дедуп form+name)', () => {
    let textInputs = '';
    for (let i = 0; i < 12; i += 1) {
      textInputs += `<input type="text" id="cf4-f${i}" name="f${i}" required>`;
    }
    document.body.innerHTML = `
      <form id="cf4" action="#target" data-ui-form>
        <div class="ui-form__summary" role="alert" tabindex="-1" hidden>
          <h3 class="ui-form__summary-title"></h3>
          <ul class="ui-form__summary-list"></ul>
        </div>
        <fieldset class="ui-field ui-field--required">
          <legend>План</legend>
          <label class="ui-radio"><input type="radio" id="cf4-a" name="cf4-plan" value="a" required> A</label>
          <label class="ui-radio"><input type="radio" id="cf4-b" name="cf4-plan" value="b" required> B</label>
        </fieldset>
        ${textInputs}
        <button type="submit">Отправить</button>
      </form>`;
    api().init();
    submitForm(document.getElementById('cf4'));

    expect(document.querySelector('#cf4 .ui-form__summary-title').textContent).toBe(
      'В форме 13 ошибок',
    );
    const links = [...document.querySelectorAll('#cf4 .ui-form__summary-list a')];
    expect(links).toHaveLength(13);
    const radioLinks = links.filter((a) => /^#cf4-(a|b)$/.test(a.getAttribute('href')));
    expect(radioLinks, 'radio-группа — одна запись, не по числу radio').toHaveLength(1);
  });
});

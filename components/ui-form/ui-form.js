/**
 * irao-ui — ui-form: клиентская валидация как progressive enhancement
 * (задача T5.5).
 *
 * Порт js/forms.js career-portal (класс B) в системный модуль: «сервер —
 * источник истины, JS — UX». Ключевой трюк совместимости: novalidate ставит
 * МОДУЛЬ при инициализации — разметка остаётся нативно-валидной, без JS
 * браузерная валидация работает (принцип ТЗ №14; e2e: в разметке стенда
 * novalidate отсутствует, появляется только под JS). Success-цикл делегируется
 * сайту/паттерну: модуль ПРОПУСКАЕТ валидный сабмит (не вызывает
 * preventDefault) — страница перезагружается, сервер рендерит состояния по
 * контракту T5.6; блокировка повторной отправки — на время валидного сабмита
 * (кнопка is-loading + aria-busy — интеграция с ui-button T4.2).
 *
 * Правила — из нативных атрибутов поля: required (чекбокс/радио-группа/файл
 * — по состоянию, не по value), type=email (регэксп career-portal — перенос
 * «как есть»; пустое опциональное поле проходит — нативная семантика, с JS
 * форма не строже, чем без JS), pattern и minlength (нативная семантика:
 * значение сверяется целиком, пустое значение проходит, битый регэксп
 * игнорируется), + data-ui-max-size (лимит размера файла в байтах)
 * и data-ui-validate (имя валидатора сайта в IraoUI.form.validators — точка
 * расширения вместо кастомных правил бизнес-логики, Out of scope).
 * Сообщение — по типу правила (RU) либо целиком из data-ui-error поля.
 *
 * Контракт ошибок единый с сервером (T5.6): ui-field--error на обвязке +
 * aria-invalid="true" + aria-describedby (id ошибки дописывается к hint) +
 * текст в ui-field__error (создаётся при отсутствии, role="alert" —
 * объявление при появлении). Ошибки radio-группы синхронны: aria на каждом
 * radio, общий текст обвязки, одна запись в summary; выбор варианта чистит
 * всю группу. Скрытые ветки ([hidden]-предок) и disabled-
 * поля пропускаются — перенос поведения career-portal и нативной семантики.
 *
 * Поведение: ошибка на change/blur, снятие на input (career-portal).
 * Сабмит: валидация всех видимых полей с правилами; с ошибками —
 * блокировка (preventDefault), заполнение сводной ошибки (T5.4) ссылками
 * на поля, фокус на summary (без summary — на первое невалидное поле,
 * WCAG 3.3.1), событие irao-ui:form-invalid (detail.errors). Валидный —
 * очистка ошибок/summary, событие irao-ui:form-valid, кнопка is-loading,
 * блокировка повторного сабмита до перезагрузки (AJAX-сайты снимают
 * IraoUI.form.unlock(form) — точка расширения, докa README).
 *
 * DOM-поведение — tests/e2e/ui-form-validate.spec.js; чистые функции и
 * контракт шаблона — tests/unit/form-validation.test.js.
 */
(function (window, document) {
  'use strict';

  // --- НАСТРОЙКА 1/3: уникальное имя модуля (ключ в window.IraoUI). ---
  var MODULE_NAME = 'form';

  // --- НАСТРОЙКА 2/3: селектор корней; JS-хуки — только data-ui-* (ADR-0005) ---
  var SELECTOR = '[data-ui-form]';

  // Флаг инициализации — data-атрибут, НЕ dataset (дефисы в DOMStringMap
  // запрещены — контракт module-template, T1.6).
  var INIT_ATTR = 'data-ui-' + MODULE_NAME + '-init';

  // Регэксп e-mail career-portal (js/forms.js) — перенос «как есть».
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // Сообщения по умолчанию (RU) по типу правила; {n} — число, {size} —
  // человекуемый лимит. Переопределение поля — data-ui-error на контроле.
  var MESSAGES = {
    required: 'Заполните это поле',
    requiredCheckbox: 'Отметьте этот пункт',
    requiredRadio: 'Выберите вариант',
    requiredFile: 'Прикрепите файл',
    email: 'Исправьте адрес e-mail',
    pattern: 'Исправьте формат значения',
    minlength: 'Используйте не менее {n} символов',
    maxSize: 'Файл слишком большой — максимум {size}',
    custom: 'Исправьте значение поля',
  };

  /**
   * Реестр кастомных валидаторов сайтов (точка расширения): сайт пишет
   * IraoUI.form.validators.имя = function (field) { … } и помечает поле
   * data-ui-validate="имя". Возврат: true — валидно; false — невалидно
   * (сообщение по умолчанию); строка — невалидно с этим сообщением.
   */
  var validators = {};

  // Реестр активных инстансов — для публичного unlock(form) и destroy.
  var instances = [];

  /* ── Чистые функции валидации (юнит-слой, tests/unit/form-validation.test.js) ── */

  /**
   * Обязательность текстового значения: непусто после trim (career-portal).
   * @param {string} value значение поля
   * @returns {boolean}
   */
  function checkRequired(value) {
    return value.trim() !== '';
  }

  /**
   * E-mail по регэкспу career-portal (unicode-local-part допускается).
   * @param {string} value значение БЕЗ trim (trim — на вызывающем)
   * @returns {boolean}
   */
  function checkEmail(value) {
    return EMAIL_RE.test(value);
  }

  /**
   * Соответствие нативному атрибуту pattern: значение сверяется ЦЕЛИКОМ
   * (неявные якоря ^(?:…)$, семантика HTML), пустое значение проходит
   * (обязательность — отдельное правило), невалидный регэксп игнорируется
   * (нативное поведение браузеров).
   * @param {string} value значение поля
   * @param {string} pattern содержимое атрибута pattern
   * @returns {boolean}
   */
  function checkPattern(value, pattern) {
    if (value === '') {
      return true;
    }
    try {
      return new RegExp('^(?:' + pattern + ')$', 'u').test(value);
    } catch {
      // Невалидный pattern — нативные браузеры правило игнорируют.
      return true;
    }
  }

  /**
   * Нативная семантика minlength: пустое значение не проверяется.
   * @param {string} value значение поля
   * @param {number} min minLength
   * @returns {boolean}
   */
  function checkMinLength(value, min) {
    if (value === '') {
      return true;
    }
    return value.length >= min;
  }

  /**
   * Размер файла в лимите (лимит включителен).
   * @param {number} size размер в байтах
   * @param {number} maxBytes лимит в байтах (data-ui-max-size)
   * @returns {boolean}
   */
  function checkFileSize(size, maxBytes) {
    return size <= maxBytes;
  }

  /**
   * Размер в человекуемом виде: лестница Б/КБ/МБ/ГБ, дробь через запятую
   * (ru). Дублирует formatSize ui-file сознательно: модули самодостаточны,
   * общего util-файла в системе нет (поставка — один бандл IIFE).
   * @param {number} bytes размер в байтах
   * @returns {string} «1 МБ», «1,5 ГБ» и т.п.
   */
  function formatBytes(bytes) {
    var UNITS = ['Б', 'КБ', 'МБ', 'ГБ'];
    if (bytes < 1024) {
      return bytes + ' ' + UNITS[0];
    }
    var value = bytes;
    var unit = 0;
    while (value >= 1024 && unit < UNITS.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return String(Math.round(value * 10) / 10).replace('.', ',') + ' ' + UNITS[unit];
  }

  /** RU-множественное слова «ошибка» для заголовка сводной ошибки. */
  function pluralErrors(count) {
    var mod100 = count % 100;
    if (mod100 >= 11 && mod100 <= 14) {
      return 'ошибок';
    }
    var mod10 = count % 10;
    if (mod10 === 1) {
      return 'ошибка';
    }
    if (mod10 >= 2 && mod10 <= 4) {
      return 'ошибки';
    }
    return 'ошибок';
  }

  /* ── Правило одного поля: сообщение или null ── */

  /** Скрытые условные ветки не валидируются (career-portal: closest('[hidden]')). */
  function isVisible(field) {
    return !field.closest('[hidden]');
  }

  /**
   * Радио той же группы (тот же name в рамках form-владельца; без формы —
   * документа). Перебор с equal-сравнением name, а не селектор с
   * экранированием: значение name произвольно.
   * @param {Element} field radio-инпут
   * @returns {Array<Element>} все radio группы, включая само поле
   */
  function radioGroupFields(field) {
    var scope = field.form || document;
    var radios = scope.querySelectorAll('input[type="radio"]');
    var group = [];
    for (var i = 0; i < radios.length; i += 1) {
      if (radios[i].name === field.name) {
        group.push(radios[i]);
      }
    }
    return group;
  }

  /** У поля есть хотя бы одно правило модуля? */
  function hasRule(field) {
    return (
      field.hasAttribute('required') ||
      field.type === 'email' ||
      field.hasAttribute('pattern') ||
      field.hasAttribute('minlength') ||
      field.hasAttribute('data-ui-max-size') ||
      field.hasAttribute('data-ui-validate')
    );
  }

  function defaultMessage(key, params) {
    var text = MESSAGES[key];
    if (params) {
      for (var name in params) {
        if (Object.prototype.hasOwnProperty.call(params, name)) {
          text = text.replace('{' + name + '}', params[name]);
        }
      }
    }
    return text;
  }

  /**
   * Валидация одного поля: первое нарушение правил или null. Чистая
   * логика правил — выше; здесь только их разводка по атрибутам поля.
   * @param {Element} field контрол (input/textarea/select)
   * @returns {string|null} сообщение об ошибке или null
   */
  function validateField(field) {
    if (!isVisible(field) || field.disabled) {
      return null;
    }

    var value = field.value;
    var override = field.getAttribute('data-ui-error');
    function message(key, params) {
      return override !== null ? override : defaultMessage(key, params);
    }

    if (field.hasAttribute('required')) {
      var ok;
      if (field.type === 'checkbox') {
        ok = field.checked;
      } else if (field.type === 'radio') {
        // Радио: состояние ГРУППЫ — field.value у неотмеченного радио
        // непуст (value-атрибут), нативная валидация блокирует сабмит по
        // valueMissing группы (ревью T5.5: без спец-кейса — тихий false pass).
        var group = radioGroupFields(field);
        ok = false;
        for (var g = 0; g < group.length; g += 1) {
          if (group[g].checked) {
            ok = true;
            break;
          }
        }
      } else if (field.type === 'file') {
        ok = !!(field.files && field.files.length > 0);
      } else {
        ok = checkRequired(value);
      }
      if (!ok) {
        var requiredKey =
          field.type === 'checkbox'
            ? 'requiredCheckbox'
            : field.type === 'radio'
              ? 'requiredRadio'
              : field.type === 'file'
                ? 'requiredFile'
                : 'required';
        return message(requiredKey);
      }
    }

    // Пустое опциональное поле проходит (нативная семантика: typeMismatch
    // пустого email = false — с JS форма не строже, чем без JS, ревью T5.5).
    if (field.type === 'email' && value.trim() !== '' && !checkEmail(value.trim())) {
      return message('email');
    }

    var pattern = field.getAttribute('pattern');
    if (pattern !== null && !checkPattern(value, pattern)) {
      return message('pattern');
    }

    var minlength = field.getAttribute('minlength');
    if (minlength !== null && !checkMinLength(value, parseInt(minlength, 10))) {
      return message('minlength', { n: parseInt(minlength, 10) });
    }

    var maxSize = field.getAttribute('data-ui-max-size');
    if (maxSize !== null) {
      var file = field.files && field.files[0];
      if (file && !checkFileSize(file.size, parseInt(maxSize, 10))) {
        return message('maxSize', { size: formatBytes(parseInt(maxSize, 10)) });
      }
    }

    var customName = field.getAttribute('data-ui-validate');
    if (customName !== null && typeof validators[customName] === 'function') {
      var result = validators[customName](field);
      if (result !== true) {
        return typeof result === 'string' ? result : message('custom');
      }
    }

    return null;
  }

  /* ── Рендер ошибки: контракт T5.6 (классы + aria + текст) ── */

  var uid = 0;

  /** id текста ошибки: из разметки, иначе «id поля-error», иначе генерация. */
  function errorIdOf(field, errorEl) {
    if (errorEl && errorEl.id) {
      return errorEl.id;
    }
    var id = field.id ? field.id + '-error' : 'ui-form-error-' + (uid += 1);
    if (errorEl) {
      errorEl.id = id;
    }
    return id;
  }

  /** Полю без id генерируется id — на него ведут ссылки summary (T5.4). */
  function ensureFieldId(field) {
    if (!field.id) {
      field.id = 'ui-form-field-' + (uid += 1);
    }
    return field.id;
  }

  /** Показ ошибки по контракту: класс обвязки + aria + текст role="alert". */
  function renderError(field, text) {
    var wrap = field.closest('.ui-field');
    var errorEl = wrap ? wrap.querySelector('.ui-field__error') : null;
    if (wrap && !errorEl) {
      errorEl = document.createElement('p');
      errorEl.className = 'ui-field__error';
      errorEl.setAttribute('role', 'alert');
      wrap.appendChild(errorEl);
    }

    field.setAttribute('aria-invalid', 'true');
    var id = errorIdOf(field, errorEl);
    var described = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (described.indexOf(id) === -1) {
      described.push(id);
      field.setAttribute('aria-describedby', described.join(' '));
    }
    if (wrap) {
      wrap.classList.add('ui-field--error');
    }
    if (errorEl) {
      errorEl.textContent = text;
    }
  }

  /** Снятие ошибки: зеркально контракту (класс, aria, ссылка, текст). */
  function clearError(field) {
    var wrap = field.closest('.ui-field');
    var errorEl = wrap ? wrap.querySelector('.ui-field__error') : null;
    field.removeAttribute('aria-invalid');
    if (errorEl && errorEl.id) {
      var described = (field.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter(function (token) {
          return token && token !== errorEl.id;
        });
      if (described.length) {
        field.setAttribute('aria-describedby', described.join(' '));
      } else {
        field.removeAttribute('aria-describedby');
      }
      errorEl.textContent = '';
    }
    if (wrap) {
      wrap.classList.remove('ui-field--error');
    }
  }

  /* ── Сводная ошибка (T5.4): заполнение ссылками, показ, фокус ── */

  function fillSummary(form, errors) {
    var summary = form.querySelector('.ui-form__summary');
    if (!summary) {
      return;
    }
    var title = summary.querySelector('.ui-form__summary-title');
    var list = summary.querySelector('.ui-form__summary-list');
    if (title) {
      title.textContent = 'В форме ' + errors.length + ' ' + pluralErrors(errors.length);
    }
    if (list) {
      list.textContent = '';
      for (var i = 0; i < errors.length; i += 1) {
        var item = document.createElement('li');
        var link = document.createElement('a');
        link.className = 'ui-link';
        link.setAttribute('href', '#' + ensureFieldId(errors[i].field));
        link.textContent = errors[i].message;
        item.appendChild(link);
        list.appendChild(item);
      }
    }
    summary.hidden = false;
    if (!summary.hasAttribute('tabindex')) {
      summary.setAttribute('tabindex', '-1');
    }
    summary.focus();
  }

  function clearSummary(form) {
    var summary = form.querySelector('.ui-form__summary');
    if (!summary || summary.hidden) {
      return;
    }
    var title = summary.querySelector('.ui-form__summary-title');
    var list = summary.querySelector('.ui-form__summary-list');
    if (title) {
      title.textContent = '';
    }
    if (list) {
      list.textContent = '';
    }
    summary.hidden = true;
  }

  /** Ссылки summary — реальный переход фокуса на поле (доопределение T5.4). */
  function onSummaryClick(event) {
    var link = event.target.closest ? event.target.closest('.ui-form__summary-list a') : null;
    if (!link) {
      return;
    }
    var target = document.getElementById((link.getAttribute('href') || '').slice(1));
    if (target && typeof target.focus === 'function') {
      target.focus();
    }
  }

  /* ── Инициализация инстанса (контракт module-template, T1.1) ── */

  function initInstance(root) {
    if (root.getAttribute(INIT_ATTR) === 'true') {
      return null; // повторная инициализация запрещена
    }

    // novalidate ставится ТОЛЬКО здесь, при инициализации модуля: без JS
    // разметка нативно-валидна (браузерная валидация работает), под JS —
    // правила исполняет модуль (AC: в разметке стенда novalidate нет).
    root.setAttribute('novalidate', '');

    var fields = [];
    var controls = root.querySelectorAll('input, textarea, select');
    for (var i = 0; i < controls.length; i += 1) {
      if (hasRule(controls[i])) {
        fields.push(controls[i]);
      }
    }

    var submitting = false;
    var submitButton = null;

    /** Ошибка/очистка одного поля (radio-группы синхронизируются отдельно). */
    function applyError(field, text) {
      if (text) {
        renderError(field, text);
      } else {
        clearError(field);
      }
    }

    function validateNow(event) {
      var field = event.currentTarget;
      var text = validateField(field);
      if (field.type === 'radio') {
        // change/blur на radio — состояние общее для группы: результат
        // применяется ко ВСЕМ radio (соседи не остаются с висящей ошибкой,
        // ревью T5.5).
        var group = radioGroupFields(field);
        for (var i = 0; i < group.length; i += 1) {
          applyError(group[i], text);
        }
      } else {
        applyError(field, text);
      }
    }

    // Ошибка на change/blur, снятие на input (career-portal).
    function onFieldInput() {
      if (this.getAttribute('aria-invalid') === 'true') {
        if (this.type === 'radio') {
          var group = radioGroupFields(this);
          for (var i = 0; i < group.length; i += 1) {
            if (group[i].getAttribute('aria-invalid') === 'true') {
              clearError(group[i]);
            }
          }
        } else {
          clearError(this);
        }
      }
    }

    function onSubmit(event) {
      if (submitting) {
        // Повторная отправка заблокирована на время валидного сабмита.
        event.preventDefault();
        return;
      }

      var errors = [];
      for (var i = 0; i < fields.length; i += 1) {
        var field = fields[i];
        var text = validateField(field);
        if (text) {
          renderError(field, text);
          // Ошибка группы радио — одна запись в summary (нативно браузер
          // показывает один bubble на группу; aria — на каждом radio).
          var duplicate = false;
          if (field.type === 'radio') {
            for (var d = 0; d < errors.length; d += 1) {
              var other = errors[d].field;
              if (
                other.type === 'radio' &&
                other.form === field.form &&
                other.name === field.name
              ) {
                duplicate = true;
                break;
              }
            }
          }
          if (!duplicate) {
            errors.push({ field: field, message: text });
          }
        } else {
          clearError(field);
        }
      }

      if (errors.length) {
        event.preventDefault();
        fillSummary(root, errors);
        if (!root.querySelector('.ui-form__summary')) {
          // Сводной нет — фокус на первое невалидное поле (WCAG 3.3.1).
          ensureFieldId(errors[0].field);
          errors[0].field.focus();
        }
        root.dispatchEvent(
          new window.CustomEvent('irao-ui:form-invalid', {
            bubbles: true,
            detail: { errors: errors },
          }),
        );
        return;
      }

      // Валидный сабмит модуль ПРОПУСКАЕТ: success-цикл — сайт/сервер
      // (перезагрузка, контракт T5.6). Блокируем только повтор.
      for (var j = 0; j < fields.length; j += 1) {
        clearError(fields[j]);
      }
      clearSummary(root);
      submitting = true;
      submitButton =
        event.submitter && event.submitter.type === 'submit'
          ? event.submitter
          : root.querySelector('[type="submit"]');
      if (submitButton) {
        submitButton.classList.add('is-loading');
        submitButton.setAttribute('aria-busy', 'true');
      }
      root.dispatchEvent(new window.CustomEvent('irao-ui:form-valid', { bubbles: true }));
    }

    for (var k = 0; k < fields.length; k += 1) {
      fields[k].addEventListener('input', onFieldInput);
      fields[k].addEventListener('change', validateNow);
      fields[k].addEventListener('blur', validateNow);
    }
    root.addEventListener('submit', onSubmit);
    root.addEventListener('click', onSummaryClick);

    // Флаг только после успешной привязки (контракт шаблона).
    root.setAttribute(INIT_ATTR, 'true');

    var instance = {
      root: root,
      destroy: function () {
        for (var i = 0; i < fields.length; i += 1) {
          fields[i].removeEventListener('input', onFieldInput);
          fields[i].removeEventListener('change', validateNow);
          fields[i].removeEventListener('blur', validateNow);
        }
        root.removeEventListener('submit', onSubmit);
        root.removeEventListener('click', onSummaryClick);
        unlock();
        root.removeAttribute(INIT_ATTR);
      },
    };
    instances.push(instance);

    function unlock() {
      submitting = false;
      if (submitButton) {
        submitButton.classList.remove('is-loading');
        submitButton.removeAttribute('aria-busy');
        submitButton = null;
      }
    }

    instance.unlock = unlock;
    return instance;
  }

  /**
   * Снять блокировку повторной отправки и состояние кнопки — для сайтов
   * с AJAX-отправкой (слушают irao-ui:form-valid и сами завершают цикл).
   * @param {Element} form форма с data-ui-form
   */
  function unlock(form) {
    for (var i = 0; i < instances.length; i += 1) {
      if (instances[i].root === form) {
        instances[i].unlock();
        return;
      }
    }
  }

  /**
   * Точка входа модуля: инициализирует все формы на странице.
   * Идемпотентна; безопасна при отсутствии элементов.
   */
  function init() {
    var roots = document.querySelectorAll(SELECTOR);

    // guard отсутствия элементов: модуль молча выходит
    if (!roots.length) {
      return;
    }

    for (var i = 0; i < roots.length; i += 1) {
      try {
        initInstance(roots[i]);
      } catch (err) {
        // один сломанный инстанс не должен ронять страницу и соседние инстансы
        if (window.console && window.console.warn) {
          window.console.warn(
            '[IraoUI:' + MODULE_NAME + '] ошибка инициализации инстанса:',
            roots[i],
            err,
          );
        }
      }
    }
  }

  // Регистрация в публичном API — сразу, до отложенной инициализации.
  window.IraoUI = window.IraoUI || {};
  window.IraoUI[MODULE_NAME] = {
    init: init,
    selector: SELECTOR,
    checkRequired: checkRequired,
    checkEmail: checkEmail,
    checkPattern: checkPattern,
    checkMinLength: checkMinLength,
    checkFileSize: checkFileSize,
    formatBytes: formatBytes,
    validateField: validateField,
    validators: validators,
    unlock: unlock,
  };

  // readyState-guard (Bitrix addJs(..., true) кладёт скрипт в конец страницы).
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})(window, document);

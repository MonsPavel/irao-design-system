/**
 * irao-ui — ui-file: доступный файловый инпут (задача T5.3).
 *
 * Модуль ведёт ОБРАТНУЮ СВЯЗЬ выбора: нативный input работает и без JS
 * (Tab → Enter/клик открывает диалог, форма отправляет файл — progressive
 * enhancement, принципы ТЗ №14/16). Модулю принадлежат:
 *  - значение выбора: имя + человекуемый размер в ui-file__value с
 *    role="status" — обновление озвучивается скринридером нативно
 *    (Implementation requirements п.3);
 *  - кнопка сброса ui-file__reset: нативная очистка input.value = ''
 *    (появляется с выбором); фокус после сброса возвращается на инпут —
 *    кнопка исчезает, фокус не теряется в body;
 *  - нормализация после form.reset(): событие reset формы не даёт change
 *    на file-инпуте — перерисовка откладывается до конца очистки полей.
 * Отмена диалога (Escape) change не даёт — состояние не трогается
 * (Implementation requirements п.2). DOM-поведение —
 * tests/e2e/ui-file.spec.js; контракт шаблона и formatSize —
 * tests/unit/file.test.js.
 */
(function (window, document) {
  'use strict';

  // --- НАСТРОЙКА 1/3: уникальное имя модуля (ключ в window.IraoUI). ---
  var MODULE_NAME = 'file';

  // --- НАСТРОЙКА 2/3: селектор корней; JS-хуки — только data-ui-* (ADR-0005) ---
  var SELECTOR = '[data-ui-file]';

  // Флаг инициализации — data-атрибут, НЕ dataset (дефисы в DOMStringMap
  // запрещены — контракт module-template, T1.6).
  var INIT_ATTR = 'data-ui-' + MODULE_NAME + '-init';

  var EMPTY_TEXT = 'Файл не выбран';

  /**
   * Размер файла в человекуемом виде: лестница Б/КБ/МБ/ГБ, дробь — через
   * запятую (ru), один знак. Чистая функция — юнит-пины
   * tests/unit/file.test.js; публичная — интеграторам для своих статусов.
   * @param {number} bytes размер в байтах
   * @returns {string} «245 КБ», «1,5 МБ» и т.п.
   */
  function formatSize(bytes) {
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

  /**
   * Инициализация одного инстанса. Не бросает наружу: init() оборачивает
   * вызов в try/catch; неполная разметка (нет __input/__value) сообщает о
   * себе через throw → console.warn (контракт шаблона, п. 4).
   * @param {Element} root корневой элемент инстанса
   * @returns {{root: Element, destroy: Function}|null} хэндл инстанса или null
   */
  function initInstance(root) {
    if (root.getAttribute(INIT_ATTR) === 'true') {
      return null; // повторная инициализация запрещена
    }

    var input = root.querySelector('.ui-file__input');
    var value = root.querySelector('.ui-file__value');
    var reset = root.querySelector('.ui-file__reset');
    if (!input || !value) {
      throw new Error(
        '[IraoUI:' + MODULE_NAME + '] в инстансе нет .ui-file__input или .ui-file__value',
      );
    }

    function render() {
      var file = input.files && input.files[0];
      if (file) {
        value.textContent = 'Выбран файл: ' + file.name + ', ' + formatSize(file.size);
        if (reset) {
          reset.hidden = false;
        }
      } else {
        value.textContent = EMPTY_TEXT;
        if (reset) {
          reset.hidden = true;
        }
      }
    }

    function onInputChange() {
      render();
    }

    function onResetClick() {
      input.value = '';
      render();
      input.focus(); // кнопка исчезает — фокус не теряется в body
    }

    function onFormReset() {
      // reset приходит ДО очистки полей — перерисовка после очистки.
      window.setTimeout(render, 0);
    }

    input.addEventListener('change', onInputChange);
    if (reset) {
      reset.addEventListener('click', onResetClick);
    }
    if (input.form) {
      input.form.addEventListener('reset', onFormReset);
    }

    // Флаг только после успешной привязки (контракт шаблона).
    root.setAttribute(INIT_ATTR, 'true');

    // Разметка стартует с означенного пустого состояния (рендер идемпотентен).
    render();

    return {
      root: root,
      destroy: function () {
        input.removeEventListener('change', onInputChange);
        if (reset) {
          reset.removeEventListener('click', onResetClick);
        }
        if (input.form) {
          input.form.removeEventListener('reset', onFormReset);
        }
        root.removeAttribute(INIT_ATTR);
      },
    };
  }

  /**
   * Точка входа модуля: инициализирует все инстансы на странице.
   * Идемпотентна; безопасна при отсутствии элементов.
   */
  function init() {
    var roots = document.querySelectorAll(SELECTOR);

    // guard отсутствия элементов: модуль молча выходит
    if (!roots.length) {
      return;
    }

    for (var i = 0; i < roots.length; i++) {
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
    formatSize: formatSize,
  };

  // readyState-guard (Bitrix addJs(..., true) кладёт скрипт в конец страницы).
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})(window, document);

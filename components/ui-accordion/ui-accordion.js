/**
 * irao-ui — ui-accordion: режим «один открыт» + события (задача T6.4).
 *
 * Аккордеон построен на нативных <details>/<summary> и БЕЗ JS полностью
 * работает (Enter/Space, клик, состояние — браузер). Модуль — УСИЛЕНИЕ
 * (Implementation requirements п.3):
 *  - режим single по data-ui-accordion="single" на корне: открытие пункта
 *    закрывает соседей (без JS все пункты независимы — значение атрибута,
 *    отличное от 'single', поведение не меняет);
 *  - события irao-ui:accordion-open / irao-ui:accordion-close (bubbles) на
 *    КОРНЕ инстанса — точка расширения сайта (аналитика); диспатчатся на
 *    каждый toggle инициализированного инстанса в любом режиме (прецедент —
 *    irao-ui:dropdown-open/close, T6.1; событие нативного toggle не
 *    всплывает — поэтому диспатчим своё);
 *  - init НЕ мутирует состояние пунктов и не добавляет ARIA — нативная
 *    семантика details полна (Accessibility requirements), разметка остаётся
 *    правдивой без JS.
 *
 * Хук — native toggle (не click): ловит и программные изменения open
 * (фильтры, deep-links сайта); toggle не всплывает — слушатель ставится на
 * каждый пункт. Закрытие соседей внутри обработчика порождает их toggle —
 * каскада нет (соседи закрываются, не открываются).
 *
 * DOM-поведение — tests/e2e/ui-accordion.spec.js; контракт шаблона, single
 * и события — tests/unit/accordion.test.js (jsdom).
 */
(function (window, document) {
  'use strict';

  // --- НАСТРОЙКА 1/3: уникальное имя модуля (ключ в window.IraoUI). ---
  var MODULE_NAME = 'accordion';

  // --- НАСТРОЙКА 2/3: селектор корней; JS-хуки — только data-ui-* (ADR-0005) ---
  var SELECTOR = '[data-ui-accordion]';

  // Флаг инициализации — data-атрибут, НЕ dataset (дефисы в DOMStringMap
  // запрещены — контракт module-template, T1.6).
  var INIT_ATTR = 'data-ui-' + MODULE_NAME + '-init';

  /** Значение data-ui-accordion, включающее режим «один открыт». */
  var SINGLE = 'single';

  /**
   * Инициализация одного инстанса. Не бросает наружу: init() оборачивает
   * вызов в try/catch; инстанс без пунктов сообщает о себе через throw →
   * console.warn (контракт шаблона, п. 4).
   * @param {Element} root корневой элемент инстанса
   * @returns {{root: Element, destroy: Function}|null} хэндл или null
   */
  function initInstance(root) {
    if (root.getAttribute(INIT_ATTR) === 'true') {
      return null; // повторная инициализация запрещена
    }

    var items = root.querySelectorAll('.ui-accordion__item');
    if (!items.length) {
      throw new Error('[IraoUI:' + MODULE_NAME + '] в инстансе нет .ui-accordion__item');
    }

    var isSingle = root.getAttribute('data-ui-accordion') === SINGLE;

    /** Событие жизненного цикла пункта (bubbles) — точка расширения сайта. */
    function dispatch(item) {
      root.dispatchEvent(
        new window.CustomEvent('irao-ui:' + MODULE_NAME + '-' + (item.open ? 'open' : 'close'), {
          bubbles: true,
        }),
      );
    }

    /** Native toggle пункта: в single открытие закрывает соседей; в любом
        режиме диспатчит событие на корень. */
    function onToggle(event) {
      if (isSingle && event.currentTarget.open) {
        for (var i = 0; i < items.length; i += 1) {
          if (items[i] !== event.currentTarget && items[i].open) {
            items[i].open = false; // порождает их toggle → accordion-close
          }
        }
      }
      dispatch(event.currentTarget);
    }

    /* ── обработчики: toggle не всплывает — слушатель на каждом пункте ── */

    for (var n = 0; n < items.length; n += 1) {
      items[n].addEventListener('toggle', onToggle);
    }

    // Флаг только после успешной привязки (контракт шаблона).
    root.setAttribute(INIT_ATTR, 'true');

    return {
      root: root,
      destroy: function () {
        for (var i = 0; i < items.length; i += 1) {
          items[i].removeEventListener('toggle', onToggle);
        }
        // Возврат разметки к no-JS состоянию: состояния пунктов НЕ
        // трогаются (нативные, честные) — снимаются только слушатели.
        root.removeAttribute(INIT_ATTR);
      },
    };
  }

  /**
   * Точка входа модуля: инициализирует все инстансы на странице.
   * Идемпотентна; безопасна при отсутствии элементов. Инстансы, отрендеренные
   * после загрузки (JSON-рендер сайта), инициализируются повторным init().
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
  };

  // readyState-guard (Bitrix addJs(..., true) кладёт скрипт в конец страницы).
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})(window, document);

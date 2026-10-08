/**
 * irao-ui — ui-dropdown: выпадающее меню двух назначений по паттерну APG
 * menu-button (задача T6.1).
 *
 * Порт поведения header.js career-portal (класс B) в системный модуль:
 * multi-instance, отрыв от классов шапки, обобщение на два назначения —
 * навигация (nav > ul > li > a, без menu-роли — правило доки: menu-роль
 * только для командных меню) и действия (role="menu" + role="menuitem").
 *
 * Деградация без JS (принцип ТЗ №14): в разметке меню раскрыто, hidden и
 * aria-expanded/aria-controls отсутствуют; их ставит МОДУЛЬ при инициализации
 * (тот же приём, что novalidate в ui-form T5.5) — разметка остаётся правдивой
 * без JS, а закрытие появляется только вместе с умением открывать.
 *
 * Поведение (APG menu-button + перенос career-portal):
 *  - открытие: клик по триггеру (фокус остаётся — pointer-сценарий),
 *    Enter/Space (event.detail === 0 — клавиатурная активация, фокус на первый
 *    пункт), ArrowDown (первый пункт), ArrowUp (последний);
 *  - закрытие: Escape — возврат фокуса на триггер (career-portal: слушатель
 *    документа — срабатывает и при фокусе вне инстанса), вне-клик, Tab-выход
 *    (закрытие — решение APG; фокус уводит нативная навигация, пункты скрыты
 *    hidden и пропускаются);
 *  - стрелки внутри меню: Down/Up с зацикливанием, Home/End (APG menu);
 *  - N инстансов: открытие одного закрывает другие (closeAll career-portal);
 *  - активация role="menuitem" закрывает меню, фокус на триггер (APG: кто
 *    открыл — тот получает фокус обратно; навигационные ссылки поведению не
 *    подлежат — их семантика это переход);
 *  - события irao-ui:dropdown-open / irao-ui:dropdown-close (bubbles) — точки
 *    расширения сайта (например, анимации/аналитика; T7.3 переиспользует
 *    вне-клик/Escape-логику).
 *
 * DOM-поведение — tests/e2e/ui-dropdown.spec.js; контракт шаблона и
 * init-мутации — tests/unit/dropdown.test.js.
 */
(function (window, document) {
  'use strict';

  // --- НАСТРОЙКА 1/3: уникальное имя модуля (ключ в window.IraoUI). ---
  var MODULE_NAME = 'dropdown';

  // --- НАСТРОЙКА 2/3: селектор корней; JS-хуки — только data-ui-* (ADR-0005) ---
  var SELECTOR = '[data-ui-dropdown]';

  // Флаг инициализации — data-атрибут, НЕ dataset (дефисы в DOMStringMap
  // запрещены — контракт module-template, T1.6).
  var INIT_ATTR = 'data-ui-' + MODULE_NAME + '-init';

  /** Реестр активных инстансов — closeAll (открытие одного закрывает другие). */
  var instances = [];

  var uid = 0;

  /**
   * Пункты меню по назначению: role="menuitem" (действия) либо ссылки
   * (навигация). Порядок — документный; элементы нативно фокусируемы,
   * tabindex не требуется (Tab из меню уводит нативная навигация — APG).
   * @param {Element} menu меню инстанса
   * @returns {NodeList} пункты меню
   */
  function itemsOf(menu) {
    var items = menu.querySelectorAll('[role="menuitem"]');
    return items.length ? items : menu.querySelectorAll('a[href]');
  }

  /**
   * Инициализация одного инстанса. Не бросает наружу: init() оборачивает
   * вызов в try/catch; неполная разметка (нет __trigger/__menu) сообщает о
   * себе через throw → console.warn (контракт шаблона, п. 4).
   * @param {Element} root корневой элемент инстанса
   * @returns {{root: Element, destroy: Function}|null} хэндл инстанса или null
   */
  function initInstance(root) {
    if (root.getAttribute(INIT_ATTR) === 'true') {
      return null; // повторная инициализация запрещена
    }

    var trigger = root.querySelector('.ui-dropdown__trigger');
    var menu = root.querySelector('.ui-dropdown__menu');
    if (!trigger || !menu) {
      throw new Error(
        '[IraoUI:' + MODULE_NAME + '] в инстансе нет .ui-dropdown__trigger или .ui-dropdown__menu',
      );
    }

    var items = itemsOf(menu);

    // id меню для aria-controls: из разметки, иначе генерация.
    if (!menu.id) {
      menu.id = 'ui-' + MODULE_NAME + '-menu-' + (uid += 1);
    }

    /* ── состояние ── */

    function isOpen() {
      return !menu.hidden;
    }

    function focusItem(index) {
      if (items.length) {
        items[index].focus();
      }
    }

    /** Событие жизненного цикла (bubbles) — точка расширения сайта. */
    function dispatch(type) {
      root.dispatchEvent(
        new window.CustomEvent('irao-ui:' + MODULE_NAME + '-' + type, {
          bubbles: true,
        }),
      );
    }

    /**
     * Открытие меню. focus: 'first'|'last'|undefined — куда перевести фокус
     * (клавиатурное открытие по APG входит в меню, pointer — остаётся).
     * Открытие одного закрывает другие (closeAll career-portal).
     * @param {string} [focus] режим фокуса
     */
    function open(focus) {
      if (!isOpen()) {
        closeAll(root);
        menu.hidden = false;
        root.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        dispatch('open');
      }
      if (focus === 'first') {
        focusItem(0);
      } else if (focus === 'last') {
        focusItem(items.length - 1);
      }
    }

    function close() {
      if (menu.hidden) {
        return;
      }
      menu.hidden = true;
      root.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      dispatch('close');
    }

    /* ── обработчики ── */

    /** Toggle триггера. event.detail === 0 — клавиатурная активация
        (Enter/Space диспетчат click без координат): фокус в меню (APG). */
    function onTriggerClick(event) {
      if (isOpen()) {
        close();
      } else {
        open(event.detail === 0 ? 'first' : undefined);
      }
    }

    /** Активация команды меню действий: закрыть, фокус на триггер (APG).
        Навигационные ссылки (без menuitem-роли) не трогаются. */
    function onRootClick(event) {
      var item = event.target.closest ? event.target.closest('[role="menuitem"]') : null;
      if (item && menu.contains(item)) {
        close();
        trigger.focus();
      }
    }

    /** Клавиатура APG: Tab-выход, стрелки триггера, стрелки/Home/End меню. */
    function onRootKeydown(event) {
      if (event.key === 'Tab') {
        // Tab-выход закрывает — решение APG; фокус уводит нативная навигация.
        if (isOpen()) {
          close();
        }
        return;
      }

      if (event.target === trigger) {
        // Стрелки триггера открывают меню И входят в него (APG): закрытое —
        // открыть с фокусом на край, открытое — перевести фокус в меню.
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          if (isOpen()) {
            focusItem(0);
          } else {
            open('first');
          }
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          if (isOpen()) {
            focusItem(items.length - 1);
          } else {
            open('last');
          }
        }
        return;
      }

      if (!isOpen() || !menu.contains(event.target)) {
        return;
      }

      // Стрелки/Home/End внутри меню — с зацикливанием (APG menu).
      var index = Array.prototype.indexOf.call(items, event.target);
      if (index === -1) {
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        focusItem((index + 1) % items.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        focusItem((index - 1 + items.length) % items.length);
      } else if (event.key === 'Home') {
        event.preventDefault();
        focusItem(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        focusItem(items.length - 1);
      }
    }

    /** Вне-клик закрывает (career-portal: клик мимо меню и триггера). */
    function onDocumentClick(event) {
      if (isOpen() && !root.contains(event.target)) {
        close();
      }
    }

    /** Escape закрывает с возвратом фокуса на триггер — слушатель ДОКУМЕНТА,
        как в career-portal: работает и при фокусе вне инстанса. */
    function onDocumentKeydown(event) {
      if (event.key === 'Escape' && isOpen()) {
        close();
        trigger.focus();
      }
    }

    /* ── init-мутации: закрытое состояние + aria (в разметке их нет —
       деградация без JS, Implementation requirements п. 3) ── */

    menu.hidden = true;
    root.classList.remove('is-open');
    trigger.setAttribute('aria-controls', menu.id);
    trigger.setAttribute('aria-expanded', 'false');

    trigger.addEventListener('click', onTriggerClick);
    root.addEventListener('click', onRootClick);
    root.addEventListener('keydown', onRootKeydown);
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onDocumentKeydown);

    // Флаг только после успешной привязки (контракт шаблона).
    root.setAttribute(INIT_ATTR, 'true');

    var instance = {
      root: root,
      close: close,
      open: open,
      destroy: function () {
        close();
        trigger.removeEventListener('click', onTriggerClick);
        root.removeEventListener('click', onRootClick);
        root.removeEventListener('keydown', onRootKeydown);
        document.removeEventListener('click', onDocumentClick);
        document.removeEventListener('keydown', onDocumentKeydown);
        // Возврат разметки к no-JS состоянию: меню раскрыто, aria убрана.
        menu.hidden = false;
        root.classList.remove('is-open');
        trigger.removeAttribute('aria-controls');
        trigger.removeAttribute('aria-expanded');
        root.removeAttribute(INIT_ATTR);
      },
    };
    instances.push(instance);

    return instance;
  }

  /**
   * Закрыть все открытые меню (перенос closeAll career-portal). exceptRoot —
   * внутренний параметр open(): чей-то own open не закрывает сам себя.
   * @param {Element} [exceptRoot] корень, который не закрывать
   */
  function closeAll(exceptRoot) {
    for (var i = 0; i < instances.length; i += 1) {
      if (instances[i].root !== exceptRoot) {
        instances[i].close();
      }
    }
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
    closeAll: closeAll,
  };

  // readyState-guard (Bitrix addJs(..., true) кладёт скрипт в конец страницы).
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})(window, document);

/**
 * irao-ui — ui-modal: модальное окно на native <dialog> (задача T7.2,
 * решение ADR-0011 — native `showModal()`, собственный оверлей отвергнут).
 *
 * Порт фокус-паттернов directions.js career-portal (класс B) в системный
 * модуль: сохранение опенера, открытие с фокусом на закрывающую кнопку,
 * закрытие по завершении перехода, restore фокуса. Поверх бесплатного
 * диалогового слоя платформы (trap — top-layer, Escape — событие cancel,
 * инертность фона без aria-hidden — К1/К2/К12 ADR-0011) модуль несёт
 * ровно то, чего в платформе нет:
 *  - анимация закрытия JS-delayed (К5): is-closing ставится на close(),
 *    диалог закрывается по transitionend transform панели (0.36s — самый
 *    долгий переход) со страховочным таймером 500ms (career-portal: 400ms);
 *    остаточный класс снимается НА СОБЫТИИ close — контракт ADR-0011
 *    (иначе класс зажимает opacity и ломает повторные циклы — регресс-кейс
 *    career-portal, e2e tests/e2e/ui-modal.spec.js обязателен);
 *  - Escape через cancel → preventDefault → анимированный close (нативное
 *    закрытие мгновенно и анимацию теряет);
 *  - focus(opener, preventScroll) ДО showModal() — Safari не фокусирует
 *    кнопку кликом, нативный restore держится на фокусе до showModal (К3);
 *    явный restore на опенера после close (перенос career-portal lastFocused);
 *  - скролл-лок (К10): overflow hidden на корне + padding-компенсация ПО
 *    ФАКТУ сдвига (с scrollbar-gutter: stable из base/reset сдвига нет —
 *    padding не ставится вовсе, остаточный padding исключён по построению);
 *    счётчик — вложенные showModal лочат один раз;
 *  - PE-деградация (К9): в разметке диалог статично открыт (open) — контент
 *    доступен инлайн; модуль снимает open при инициализации;
 *  - aria-labelledby → заголовок (генерация id при отсутствии);
 *  - события irao-ui:modal-open/close (bubbles) — точки расширения сайта;
 *  - программное открытие по data-ui-modal-target (кнопка или ссылка на
 *    страницу контента — без JS контент доступен по href, правило доки).
 *
 * Вложенные модалки: стек top-layer и cancel/close ведёт браузер (К7:
 * Escape закрывает только верхнюю); полноценной поддержки не обещаем —
 * док-заметка README.
 *
 * DOM-поведение — tests/e2e/ui-modal.spec.js; контракт шаблона, init-мутации
 * и пины решения — tests/unit/modal.test.js.
 */
(function (window, document) {
  'use strict';

  // --- НАСТРОЙКА 1/3: уникальное имя модуля (ключ в window.IraoUI). ---
  var MODULE_NAME = 'modal';

  // --- НАСТРОЙКА 2/3: селектор корней; JS-хуки — только data-ui-* (ADR-0005) ---
  var SELECTOR = '[data-ui-modal]';

  // Хук триггера (программное открытие по Scope) и элементы компонента.
  var TRIGGER_ATTR = 'data-ui-modal-target';
  var CLOSE_SELECTOR = '.ui-modal__close';
  var TITLE_SELECTOR = '.ui-modal__title';

  // Флаг инициализации — data-атрибут, НЕ dataset (дефисы в DOMStringMap
  // запрещены — контракт module-template, T1.6).
  var INIT_ATTR = 'data-ui-' + MODULE_NAME + '-init';

  /**
   * Страховка transitionend закрытия: 500ms > 0.36s анимации панели
   * (career-portal directions.js: setTimeout 400 при той же анимации).
   */
  var CLOSE_FALLBACK_MS = 500;

  /** Все инстансы (для open(el) по элементу). */
  var instances = [];

  /** Открытые — стек для close() без аргументов (верхний). */
  var openStack = [];

  /** Состояние скролл-лока: счётчик + прежние inline-значения для restore. */
  var lock = { count: 0, rootOverflow: '', bodyPadding: '' };

  var uid = 0;

  /** console.warn модуля (контракт шаблона п. 4 — не ронять страницу). */
  function warn() {
    if (window.console && window.console.warn) {
      var args = ['[IraoUI:' + MODULE_NAME + ']'].concat(Array.prototype.slice.call(arguments));
      window.console.warn.apply(window.console, args);
    }
  }

  /* ── Скролл-лок (К10 ADR-0011: overflow hidden + padding-компенсация) ──
     Компенсация — по ФАКТУ сдвига (замер clientWidth корня до/после):
     с scrollbar-gutter: stable из base/reset (T3.1) сдвига нет и padding
     не ставится вовсе (остаточный padding исключён по построению — регресс
     design-qa career-portal), без base — компенсируется ширина полосы. */
  function applyScrollLock() {
    lock.count += 1;
    if (lock.count > 1) {
      return;
    }
    var root = document.documentElement;
    lock.rootOverflow = root.style.overflow;
    lock.bodyPadding = document.body.style.paddingRight;
    var before = root.clientWidth;
    root.style.overflow = 'hidden';
    var grown = root.clientWidth - before; // насколько расширилась контентная область (полоса исчезла)
    if (grown > 0) {
      document.body.style.paddingRight = grown + 'px';
    }
  }

  function releaseScrollLock() {
    if (lock.count === 0) {
      return;
    }
    lock.count -= 1;
    if (lock.count > 0) {
      return;
    }
    document.documentElement.style.overflow = lock.rootOverflow;
    document.body.style.paddingRight = lock.bodyPadding;
  }

  /**
   * Инициализация одного инстанса. Не бросает наружу: init() оборачивает
   * вызов в try/catch; data-ui-modal не на <dialog> сообщает о себе через
   * throw → console.warn (контракт шаблона, п. 4).
   * @param {Element} root корневой элемент инстанса (<dialog>)
   * @returns {{root: Element, open: Function, close: Function, destroy: Function}|null} хэндл или null
   */
  function initInstance(root) {
    if (root.getAttribute(INIT_ATTR) === 'true') {
      return null; // повторная инициализация запрещена
    }
    if (!root || root.tagName !== 'DIALOG') {
      throw new Error(
        'data-ui-modal должен стоять на <dialog>, получен: ' + (root && root.tagName),
      );
    }

    /* PE-деградация (К9 ADR-0011): в разметке диалог статично открыт —
       контент доступен инлайн без JS; модуль забирает показ на себя. */
    root.removeAttribute('open');

    /* aria-labelledby → заголовок (Implementation requirements п. 3).
       Указанный вручную — не трогаем; при отсутствии генерируем. */
    var title = root.querySelector(TITLE_SELECTOR);
    if (!root.getAttribute('aria-labelledby') && title) {
      if (!title.id) {
        title.id = 'ui-' + MODULE_NAME + '-title-' + (uid += 1);
      }
      root.setAttribute('aria-labelledby', title.id);
    }

    /* ── состояние ── */

    var opener = null; // кто открыл (career-portal: lastFocused)
    var closing = false; // идёт анимированное закрытие
    var closeTimer = 0;

    function isOpen() {
      return root.hasAttribute('open');
    }

    function pushStack() {
      if (openStack.indexOf(instance) === -1) {
        openStack.push(instance);
      }
    }

    function pullStack() {
      var index = openStack.indexOf(instance);
      if (index !== -1) {
        openStack.splice(index, 1);
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
     * Открытие модалки (спека: open(el, {…})). options.opener — элемент,
     * на который вернётся фокус (по умолчанию активный). Явный фокус на
     * опенера ДО showModal — Safari не фокусирует кнопку кликом, нативный
     * restore держится на фокусе до showModal (К3 ADR-0011).
     * @param {{opener?: Element}} [options]
     */
    function open(options) {
      if (isOpen()) {
        return;
      }
      options = options || {};
      opener = options.opener || document.activeElement || null;
      if (opener && typeof opener.focus !== 'function') {
        opener = null;
      }
      window.clearTimeout(closeTimer);
      closing = false;
      root.classList.remove('is-closing');
      if (opener) {
        opener.focus({ preventScroll: true });
      }
      applyScrollLock();
      root.showModal();
      /* Перенос career-portal (closeButton.focus): нативные dialog focusing
         steps ставят фокус на САМ диалог — панель объявлена скринридером,
         но клавиатура «в воздухе». Если автор не управил фокусом сам
         (autofocus) — ставим на закрывающую кнопку (первый элемент панели). */
      var active = document.activeElement;
      if (!active || active === root || active === document.body) {
        var closeButton = root.querySelector(CLOSE_SELECTOR);
        if (closeButton) {
          closeButton.focus({ preventScroll: true });
        }
      }
      pushStack();
      dispatch('open');
    }

    /** Завершение анимации: закрыть диалог (событие close → onClose). */
    function finishClose() {
      window.clearTimeout(closeTimer);
      if (!closing) {
        return;
      }
      root.close();
    }

    /**
     * Закрытие (перенос career-portal close(): класс + таймер; здесь —
     * transitionend transform + страховка). Повторный close/Escape во время
     * анимации — no-op (класс не перезапускает переход).
     */
    function close() {
      if (!isOpen() || closing) {
        return;
      }
      closing = true;
      root.classList.add('is-closing');
      closeTimer = window.setTimeout(finishClose, CLOSE_FALLBACK_MS);
    }

    /* Очистка ПО СОБЫТИЮ close — контракт ADR-0011: остаточный is-closing
       снимается здесь, поэтому любой путь закрытия (наша анимация, form
       method="dialog" — К11) остаётся чистым для повторных циклов. */
    function onClose() {
      closing = false;
      window.clearTimeout(closeTimer);
      root.classList.remove('is-closing');
      releaseScrollLock();
      pullStack();
      if (opener) {
        opener.focus({ preventScroll: true }); // restore (AC)
      }
      dispatch('close');
    }

    /** Escape: нативное закрытие мгновенно — заменяем анимированным (К5). */
    function onCancel(event) {
      event.preventDefault();
      close();
    }

    /** Клик по закрывающей кнопке (перенос career-portal [data-directions-close]). */
    function onRootClick(event) {
      var target = event.target;
      var button = target && target.closest ? target.closest(CLOSE_SELECTOR) : null;
      if (button && root.contains(button)) {
        close();
      }
    }

    root.addEventListener('close', onClose);
    root.addEventListener('cancel', onCancel);
    root.addEventListener('click', onRootClick);

    // Флаг только после успешной привязки (контракт шаблона).
    root.setAttribute(INIT_ATTR, 'true');

    var instance = {
      root: root,
      open: open,
      close: close,
      destroy: function () {
        window.clearTimeout(closeTimer);
        if (isOpen()) {
          root.close(); // событие close ещё слушается — очистка пройдёт по контракту
        }
        root.removeEventListener('close', onClose);
        root.removeEventListener('cancel', onCancel);
        root.removeEventListener('click', onRootClick);
        closing = false;
        pullStack();
        root.removeAttribute(INIT_ATTR);
      },
    };
    instances.push(instance);

    return instance;
  }

  /** Инстанс по корневому элементу (для open(el)). */
  function instanceOf(dialog) {
    for (var i = 0; i < instances.length; i += 1) {
      if (instances[i].root === dialog) {
        return instances[i];
      }
    }
    return null;
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
        warn('ошибка инициализации инстанса:', roots[i], err);
      }
    }
  }

  /**
   * Открыть модалку (публичный API): open(el, {…}) — el это <dialog> или
   * его id. Небычный элемент инициализируется лениво; ошибка разметки —
   * console.warn, не throw.
   * @param {Element|string} dialog диалог или id
   * @param {{opener?: Element}} [options]
   * @returns {Object|null} хэндл инстанса или null (не найден/сломан)
   */
  function open(dialog, options) {
    var el = typeof dialog === 'string' ? document.getElementById(dialog) : dialog;
    if (!el) {
      warn('open(): диалог не найден');
      return null;
    }
    var inst = instanceOf(el);
    if (!inst) {
      try {
        inst = initInstance(el);
      } catch (err) {
        warn('open():', err.message);
        return null;
      }
    }
    inst.open(options);
    return inst;
  }

  /**
   * Закрыть верхнюю открытую модалку (close() без аргументов по спеке).
   * Стек открытых ведёт модуль; Escape-очередность вложенных — браузер (К7).
   * @returns {Object|null} закрытый инстанс или null (открытых нет)
   */
  function closeTopmost() {
    var top = openStack[openStack.length - 1];
    if (top) {
      top.close();
    }
    return top || null;
  }

  /* Триггеры data-ui-modal-target — делегирование на документе: триггер
     может быть где угодно (в т.ч. добавлен динамически) и не является
     частью инстанса. Ссылка-триггер без JS ведёт на страницу контента
     (правило доки о деградации) — при открытии переход снимается. */
  function onDocumentClick(event) {
    var target = event.target;
    var trigger = target && target.closest ? target.closest('[' + TRIGGER_ATTR + ']') : null;
    if (!trigger) {
      return;
    }
    var id = trigger.getAttribute(TRIGGER_ATTR);
    var dialog = id ? document.getElementById(id) : null;
    if (!dialog) {
      warn('триггер ссылается на несуществующий диалог «' + id + '»');
      return;
    }
    if (trigger.tagName === 'A' && trigger.hasAttribute('href')) {
      event.preventDefault();
    }
    open(dialog, { opener: trigger });
  }

  document.addEventListener('click', onDocumentClick);

  // Регистрация в публичном API — сразу, до отложенной инициализации.
  window.IraoUI = window.IraoUI || {};
  window.IraoUI[MODULE_NAME] = {
    init: init,
    selector: SELECTOR,
    open: open,
    close: closeTopmost,
  };

  // readyState-guard (Bitrix addJs(..., true) кладёт скрипт в конец страницы).
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})(window, document);

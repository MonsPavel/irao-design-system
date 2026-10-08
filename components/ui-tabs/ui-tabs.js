/**
 * irao-ui — ui-tabs: табы по паттерну APG tabs (задача T6.2).
 *
 * Порт модели выбора career-portal js/tracks.js (класс B): таб-кнопки с
 * aria-selected, панель активного таба видима, остальные скрыты — в системный
 * модуль: multi-instance, отрыв от классов страницы, полный клавиатурный
 * паттерн APG, которого в career-portal не было. Рендер из JSON НЕ входит в
 * модуль (данные — зона сайта; канонический рендер — док-кейс README и
 * стенда, кейс Bitrix 02-architecture §6.3).
 *
 * Деградация без JS (принцип ТЗ №14): в разметке НЕТ hidden на панелях, НЕТ
 * ролей tablist/tab/tabpanel, НЕТ tabindex/aria-selected/aria-controls — все
 * панели видимы, табы-ссылки ведут на панели якорями. Всё это ставит МОДУЛЬ
 * при инициализации (тот же приём, что novalidate в ui-form T5.5 и
 * aria-expanded в ui-dropdown T6.1) — разметка остаётся правдивой без JS, а
 * «табовость» появляется только вместе с умением переключать.
 *
 * Поведение (APG tabs, automatic activation):
 *  - активация automatic (фокус+выбор вместе): стрелки ←/→ сразу выбирают
 *    таб — рекомендация APG для простых случаев, проще для скринридеров;
 *    зафиксировано в доке (README);
 *  - стрелки с зацикливанием, Home/End — края; Tab/Shift+Tab НЕ
 *    перехватываются: roving tabindex (0 у активного таба, −1 у остальных)
 *    уводит Tab с активного таба в активную панель (панель — таб-стоп,
 *    tabindex="0" ставит модуль; скрытые панели из обхода исключены hidden);
 *  - клик выбирает таб; ссылке-табу отменяется якорный прыжок (href нужен
 *    только деградации без JS);
 *  - N инстансов независимы (в отличие от ui-dropdown closeAll не нужен);
 *  - события irao-ui:tabs-select (bubbles) — на смене выбора ПОСЛЕ
 *    инициализации (silent-старт) — точка расширения сайта (аналитика);
 *    прецедент — irao-ui:dropdown-open/close (T6.1).
 *
 * id-связки tab↔panel обязательны (Implementation requirements п.1): панель
 * ищется по href="#id" (канонический паттерн — ссылки) или aria-controls
 * (кнопки в JS-гарантированных контекстах); без связки инстанс не
 * инициализируется (console.warn, соседи живы). Гейт разметки —
 * html-validate irao/tabs-id-links.
 *
 * DOM-поведение — tests/e2e/ui-tabs.spec.js; контракт шаблона, init-мутации
 * и клавиатура — tests/unit/tabs.test.js.
 */
(function (window, document) {
  'use strict';

  // --- НАСТРОЙКА 1/3: уникальное имя модуля (ключ в window.IraoUI). ---
  var MODULE_NAME = 'tabs';

  // --- НАСТРОЙКА 2/3: селектор корней; JS-хуки — только data-ui-* (ADR-0005) ---
  var SELECTOR = '[data-ui-tabs]';

  // Флаг инициализации — data-атрибут, НЕ dataset (дефисы в DOMStringMap
  // запрещены — контракт module-template, T1.6).
  var INIT_ATTR = 'data-ui-' + MODULE_NAME + '-init';

  /**
   * Панель таба по id-связке: href="#id" (канонический паттерн — ссылки,
   * деградация без JS) или aria-controls (кнопки). Поиск — getElementById:
   * панель обязана существовать (Implementation requirements п.1).
   * @param {Element} tab элемент таба
   * @returns {Element|null} панель или null (связки нет/панели нет)
   */
  function panelOf(tab) {
    var href = tab.getAttribute('href');
    var panelId =
      href && href.charAt(0) === '#' ? href.slice(1) : tab.getAttribute('aria-controls');
    return panelId ? document.getElementById(panelId) : null;
  }

  /**
   * Инициализация одного инстанса. Не бросает наружу: init() оборачивает
   * вызов в try/catch; сломанная id-связка таба (нет панели) сообщает о себе
   * через throw → console.warn (контракт шаблона, п. 4).
   * @param {Element} root корневой элемент инстанса
   * @returns {{root: Element, select: Function, destroy: Function}|null} хэндл или null
   */
  function initInstance(root) {
    if (root.getAttribute(INIT_ATTR) === 'true') {
      return null; // повторная инициализация запрещена
    }

    var list = root.querySelector('.ui-tabs__list');
    var tabEls = root.querySelectorAll('.ui-tabs__tab');
    if (!list || !tabEls.length) {
      throw new Error(
        '[IraoUI:' + MODULE_NAME + '] в инстансе нет .ui-tabs__list или .ui-tabs__tab',
      );
    }

    // id-связки tab↔panel обязательны: без панели таб не участвует в паттерне.
    var tabs = [];
    for (var t = 0; t < tabEls.length; t += 1) {
      var panel = panelOf(tabEls[t]);
      if (!panel) {
        throw new Error(
          '[IraoUI:' +
            MODULE_NAME +
            '] у таба «' +
            tabEls[t].textContent.trim() +
            '» нет панели: обязателен href="#id" или aria-controls на существующий id',
        );
      }
      tabs.push({ el: tabEls[t], panel: panel });
    }

    var current = -1;

    /** Событие жизненного цикла (bubbles) — точка расширения сайта. */
    function dispatch() {
      root.dispatchEvent(
        new window.CustomEvent('irao-ui:' + MODULE_NAME + '-select', {
          bubbles: true,
        }),
      );
    }

    /**
     * Выбор таба. silent — стартовый выбор при инициализации: состояние
     * меняется, но событие сайту не отправляется (это не смена выбора).
     * @param {number} index индекс таба
     * @param {boolean} focusTab перевести фокус на таб (automatic-активация)
     * @param {boolean} [silent] не диспатчить irao-ui:tabs-select
     */
    function select(index, focusTab, silent) {
      if (index === current) {
        if (focusTab) {
          tabs[index].el.focus();
        }
        return;
      }
      current = index;
      for (var i = 0; i < tabs.length; i += 1) {
        var active = i === index;
        tabs[i].el.setAttribute('aria-selected', String(active));
        // Roving tabindex: Tab с активного таба уходит в панель (следующая
        // таб-стоп), не в соседний таб (APG tabs).
        tabs[i].el.setAttribute('tabindex', active ? '0' : '-1');
        // Панель без активного таба — hidden ставит JS (Implementation
        // requirements п.2; в разметке hidden нет).
        tabs[i].panel.hidden = !active;
      }
      if (focusTab) {
        tabs[index].el.focus();
      }
      if (!silent) {
        dispatch();
      }
    }

    /* ── init-мутации: роли APG + таб-стопы панелей; выбор/hidden — ниже ── */

    list.setAttribute('role', 'tablist');
    for (var n = 0; n < tabs.length; n += 1) {
      tabs[n].el.setAttribute('role', 'tab');
      tabs[n].el.setAttribute('aria-controls', tabs[n].panel.id);
      // Панель — цель Tab с активного таба: последовательный таб-стоп (0).
      // Неактивные панели скрыты hidden и из обхода исключены сами.
      tabs[n].panel.setAttribute('role', 'tabpanel');
      tabs[n].panel.setAttribute('tabindex', '0');
    }

    /* ── обработчики ── */

    /** Клавиатура APG tabs: ←/→ с зацикливанием, Home/End; automatic-
        активация — фокус и выбор вместе (зафиксировано в доке). ↑/↓ —
        зона вертикального модификатора (Out of scope спеки, README). */
    function onListKeydown(event) {
      var next = null;
      if (event.key === 'ArrowRight') {
        next = (current + 1) % tabs.length;
      } else if (event.key === 'ArrowLeft') {
        next = (current - 1 + tabs.length) % tabs.length;
      } else if (event.key === 'Home') {
        next = 0;
      } else if (event.key === 'End') {
        next = tabs.length - 1;
      }
      if (next === null) {
        return;
      }
      event.preventDefault();
      select(next, true);
    }

    /** Клик по табу выбирает его; ссылке-табу отменяется якорный прыжок
        (href нужен только деградации без JS). Повторный клик — no-op. */
    function onListClick(event) {
      var tab = event.target.closest ? event.target.closest('.ui-tabs__tab') : null;
      if (!tab || !list.contains(tab)) {
        return;
      }
      for (var i = 0; i < tabs.length; i += 1) {
        if (tabs[i].el === tab) {
          if (tab.tagName === 'A') {
            event.preventDefault();
          }
          select(i, false);
          return;
        }
      }
    }

    list.addEventListener('keydown', onListKeydown);
    list.addEventListener('click', onListClick);

    // Стартовое состояние: первый таб (silent — событие сайту не нужно).
    select(0, false, true);

    // Флаг только после успешной привязки (контракт шаблона).
    root.setAttribute(INIT_ATTR, 'true');

    return {
      root: root,
      select: function (index) {
        select(index, false);
      },
      destroy: function () {
        list.removeEventListener('keydown', onListKeydown);
        list.removeEventListener('click', onListClick);
        // Возврат разметки к no-JS состоянию: панели раскрыты, ролей нет.
        list.removeAttribute('role');
        for (var i = 0; i < tabs.length; i += 1) {
          tabs[i].el.removeAttribute('role');
          tabs[i].el.removeAttribute('aria-selected');
          tabs[i].el.removeAttribute('aria-controls');
          tabs[i].el.removeAttribute('tabindex');
          tabs[i].panel.removeAttribute('role');
          tabs[i].panel.removeAttribute('tabindex');
          tabs[i].panel.hidden = false;
        }
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

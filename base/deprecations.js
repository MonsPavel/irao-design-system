/**
 * irao-ui — base/deprecations.js: механизм deprecation-предупреждений (T12.2).
 *
 * ADR-0007 (02-architecture §11): deprecation-цикл «пометка в minor → алиас
 * (dev-сборка пишет warning в консоль) → удаление в major с migration guide».
 * Этот модуль — работающий механизм ДО первого deprecated: когда появится
 * первый deprecated-класс, предупреждения пойдут без новых механизмов.
 *
 * Как модуль живёт в поставке:
 *  - попадает ТОЛЬКО в dev-сборку dist/ui.dev.js (не минифицированный вариант
 *    ui.min.js — showcase/build.mjs, JS_DEV_ONLY); прод-бандл ui.min.js молчит:
 *    предупреждения — инструмент разработки и миграции, не шум в консоли
 *    пользователей (Implementation requirements T12.2 п.1);
 *  - алиас-класс в проде работает всегда — это CSS (дублирование правил
 *    канонического блока с комментарием «deprecated since x.y», Technical
 *    considerations T12.2); модуль лишь сообщает разработчику сайта, что имя
 *    пора заменить.
 *
 * Как заводится deprecation (полный цикл — CONTRIBUTING, § «Semver-триггеры»):
 *  1. minor-PR: алиас-класс в CSS компонента + запись в этот реестр +
 *     список в доке компонента (## Deprecated) + категория Deprecated в
 *     CHANGELOG.md;
 *  2. сайт подключает ui.dev.js вместо ui.min.js на dev-копии — консоль
 *     показывает [IraoUI:dev]-предупреждения с заменой;
 *  3. major: имя удаляется из CSS и реестра, миграция — по
 *     docs/templates/migration-guide-template.md.
 *
 * Формат записи реестра (добавляется правкой массива в этом же minor-PR):
 *   { name: 'ui-btn--old', since: '1.2.0', useInstead: 'ui-btn--new', note: '…' }
 *   name       — deprecated-класс (без точки);
 *   since      — версия, в которой введена пометка (алиас);
 *   useInstead — каноническое имя-замена;
 *   note       — необязательное уточнение (срок удаления, особенности).
 *
 * Контракт — docs/templates/module-template.js, адаптация для страничного
 * модуля (как a11y/vi.js): инстансов нет, guard `initialized`; регистрация в
 * window.IraoUI — сразу, включая режим отложенной инициализации; readyState
 * guard (Bitrix addJs(..., true) кладёт скрипт в конец страницы).
 */
(function (window, document) {
  'use strict';

  var MODULE_NAME = 'dev';

  /**
   * Реестр deprecated-классов. Пустой = deprecated нет (состояние первого
   * релиза). Записи добавляются ТОЛЬКО вместе с алиас-классом в CSS
   * компонента того же minor-PR (semver-триггер — CONTRIBUTING).
   */
  var DEPRECATIONS = [];

  /** Префикс предупреждений — единый с contract'ом module-template. */
  var PREFIX = '[IraoUI:' + MODULE_NAME + ']';

  /** Предупреждённые имена: одно предупреждение на имя за страницу. */
  var warned = {};

  var initialized = false;
  var observer = null;
  var observing = false;

  /**
   * Текст предупреждения: имя, версия пометки, замена, число элементов.
   * @param {object} entry запись реестра
   * @param {number} count сколько элементов с этим именем найдено
   * @returns {string}
   */
  function messageFor(entry, count) {
    var message =
      PREFIX + ' класс «' + entry.name + '» устарел (deprecated since ' + entry.since + ')';
    if (entry.useInstead) {
      message += ' — используйте «' + entry.useInstead + '»';
    }
    message += '; будет удалён в следующей major-версии';
    if (count > 1) {
      message += ' (элементов на странице: ' + count + ')';
    }
    if (entry.note) {
      message += '. ' + entry.note;
    }
    return message;
  }

  /**
   * Одно предупреждение на имя за страницу (повторные сканы/мутации молчат).
   * @returns {boolean} true — предупреждение отправлено этим вызовом
   */
  function warnOnce(entry, count, element) {
    if (warned[entry.name]) {
      return false;
    }
    warned[entry.name] = true;
    if (window.console && window.console.warn) {
      window.console.warn(messageFor(entry, count), element);
    }
    return true;
  }

  /**
   * Скан области на deprecated-классы. Корень (document или элемент) тоже
   * проверяется. Возвращает имена, по которым предупреждение отправлено
   * ЭТИМ вызовом (предупреждённые раньше имена не возвращаются).
   * Битая запись реестра (имя не валидно как селектор) пропускается
   * с объяснением в консоли — остальные имена продолжают проверяться.
   * @param {Document|Element} [root] область скана, по умолчанию документ
   * @returns {string[]} имена, впервые предупреждённые этим вызовом
   */
  function scan(root) {
    var scope = root || document;
    if (!scope || typeof scope.querySelectorAll !== 'function') {
      return [];
    }

    var fired = [];
    for (var i = 0; i < DEPRECATIONS.length; i += 1) {
      var entry = DEPRECATIONS[i];
      if (!entry || typeof entry.name !== 'string' || entry.name === '') {
        continue;
      }
      var selector = '.' + entry.name;
      var elements = [];
      try {
        if (typeof scope.matches === 'function' && scope.matches(selector)) {
          elements.push(scope);
        }
        var found = scope.querySelectorAll(selector);
        for (var j = 0; j < found.length; j += 1) {
          elements.push(found[j]);
        }
      } catch (err) {
        if (window.console && window.console.warn) {
          window.console.warn(
            PREFIX + ' запись реестра пропущена (селектор «' + selector + '»):',
            err,
          );
        }
        continue;
      }
      if (elements.length && warnOnce(entry, elements.length, elements[0])) {
        fired.push(entry.name);
      }
    }
    return fired;
  }

  /**
   * Наблюдение за DOM: элементы, добавленные после загрузки, и смена class
   * существующих попадают в скан автоматически. Колбэк сканирует документ
   * целиком: реестр мал (записи = текущие deprecation), один
   * querySelectorAll на запись за пакет мутаций. Без MutationObserver
   * (старые окружения) — деградация до скана при старте.
   */
  function startObserving() {
    if (observing || typeof window.MutationObserver !== 'function') {
      return;
    }
    observing = true;
    observer = new window.MutationObserver(function () {
      scan(document);
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  /**
   * Точка входа: скан документа при старте + наблюдение за динамикой.
   * Идемпотентна (guard повторной инициализации — контракт модулей).
   */
  function init() {
    if (initialized) {
      return;
    }
    initialized = true;
    scan(document);
    startObserving();
  }

  // Регистрация в публичном API — сразу, до отложенной инициализации:
  // интеграторы могут полагаться на window.IraoUI (контракт модулей).
  window.IraoUI = window.IraoUI || {};
  window.IraoUI[MODULE_NAME] = {
    deprecations: DEPRECATIONS,
    scan: scan,
  };

  // readyState-guard (Bitrix addJs(..., true) кладёт скрипт в конец страницы):
  // документ ещё грузится — ждём DOMContentLoaded, иначе инициализируемся сразу.
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})(window, document);

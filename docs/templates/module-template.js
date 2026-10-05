/**
 * ШАБЛОН JS-модуля irao-ui (docs/templates/module-template.js).
 *
 * Как пользоваться: скопируйте файл в components/<name>/<name>.js и замените
 * три места, помеченные «НАСТРОЙКА». Остальное менять не нужно — контракт
 * ниже закреплён здесь и будет проверен эталонным Vitest-тестом в T1.6.
 *
 * Контракт модуля (сценарии эталонного Vitest-теста, T1.6):
 *   1. readyState = 'loading'  → init отложен: один обработчик DOMContentLoaded,
 *      до события ничего не инициализируется; регистрация в window.IraoUI — сразу.
 *   2. readyState = 'complete'/'interactive' → init вызывается синхронно, без подписки.
 *   3. Нет элементов по селектору → init завершается без ошибок и без инстансов.
 *   4. Ошибка одного инстанса ловится (console.warn) и не мешает соседним инстансам
 *      и регистрации модуля.
 *   5. Повторный вызов init() не создаёт дублей (guard повторной инициализации).
 *   6. Имя модуля в kebab-case ('skip-link') не ломает ничего из пп. 1–5: флаг
 *      инициализации хранится в data-атрибуте data-ui-<name>-init через
 *      set/get/removeAttribute, а не через dataset (DOMStringMap запрещает дефисы
 *      в именах свойств — запись бросает SyntaxError и маскируется catch'ем).
 *
 * Почему readyState-guard обязателен: Bitrix `addJs(..., true)` кладёт скрипт
 * в конец страницы — на момент выполнения DOMContentLoaded мог уже произойти,
 * наивная подписка на событие никогда не сработает (02-architecture §6).
 */
(function (window, document) {
  'use strict';

  // --- НАСТРОЙКА 1/3: уникальное имя модуля (ключ в window.IraoUI).
  // kebab-case разрешён ('skip-link') — флаг ниже собирается из имени как data-атрибут,
  // dataset с такими именами несовместим.
  var MODULE_NAME = 'example';

  // --- НАСТРОЙКА 2/3: селектор корневых элементов; JS-хуки — только data-ui-* (ADR-0005) ---
  var SELECTOR = '[data-ui-example]';

  // Флаг инициализации — data-атрибут, НЕ dataset: свойство DOMStringMap не может
  // содержать дефис (запись бросает SyntaxError), а имена модулей по конвенции
  // проекта — kebab-case. set/get/removeAttribute работают с любым именем.
  var INIT_ATTR = 'data-ui-' + MODULE_NAME + '-init';

  /**
   * Инициализация одного инстанса. Не должна бросать исключения наружу:
   * вызывающий код оборачивает вызов в try/catch (см. init()).
   * @param {Element} root корневой элемент инстанса
   * @returns {{root: Element, destroy: Function}|null} хэндл инстанса или null
   */
  function initInstance(root) {
    if (root.getAttribute(INIT_ATTR) === 'true') {
      return null; // повторная инициализация запрещена
    }

    // --- НАСТРОЙКА 3/3: логика инстанса (слушатели, состояние) ---
    // Слушатели вешаются на root/потомков; для снятия в destroy() удобны
    // именованные функции вместо анонимных.
    function onRootClick() {
      // поведение компонента
    }

    root.addEventListener('click', onRootClick);

    // Флаг ставится только после успешной привязки: если addEventListener
    // бросил, инстанс останется «неинициализированным» и не зависнет в полу-состоянии.
    root.setAttribute(INIT_ATTR, 'true');

    return {
      root: root,
      destroy: function () {
        root.removeEventListener('click', onRootClick);
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

  // Регистрация в публичном API — сразу, до отложенной инициализации:
  // соседние модули и интеграторы могут полагаться на window.IraoUI.
  window.IraoUI = window.IraoUI || {};
  window.IraoUI[MODULE_NAME] = {
    init: init,
    selector: SELECTOR,
  };

  // readyState-guard: если документ ещё грузится — ждём DOMContentLoaded,
  // иначе (complete/interactive) инициализируемся немедленно.
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})(window, document);

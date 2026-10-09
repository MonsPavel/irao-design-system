/**
 * irao-ui — ui-select: кастомный listbox поверх нативного <select> (задача
 * T7.3). Порт зрелого PE-паттерна dropdowns.js career-portal (класс B аудита)
 * в системный модуль; критический рефакторинг — отвязка от классов проекта:
 * знание «select в пилюле vacancy-search__select-wrap» заменено модификатором
 * data-ui-select="wrap" (обёртку и её геометрию рисует сайт, триггер
 * растягивается на неё).
 *
 * Прогрессивное улучшение (принцип ТЗ №14):
 *  - в разметке select НИКАК не скрыт — без JS это обычный нативный select
 *    (форма отправляет значение, скринридер и клавиатура работают с ним);
 *  - модуль при инициализации прячет select паттерном custom-select-hidden
 *    career-portal (класс ui-select__native: opacity 0 + pointer-events none —
 *    бокс остаётся в потоке, задавая триггеру габариты, и остаётся форм-
 *    контролом) и строит поверх кнопку-триггер + listbox с role="option";
 *  - выбор в listbox синхронизируется в нативный select и диспатчится
 *    new Event('change', { bubbles: true }) — формы/фильтры сайтов работают
 *    как с нативным контролом (перенос career-portal);
 *  - нативный change (значение изменил сторонний код) обновляет UI —
 *    синхронизация двусторонняя;
 *  - destroy() возвращает разметку к no-JS состоянию (PE-цикл Bitrix AJAX).
 *
 * Поведение (APG «Listbox and associated button» + перенос career-portal):
 *  - открытие: клик по триггеру (фокус остаётся), Enter/Space и стрелки на
 *    закрытом триггере — открытие с фокусом на ВЫБРАННОЙ опции (open()
 *    career-portal фокусирует optionButtons[select.selectedIndex]);
 *  - навигация по списку: стрелки без зацикливания с пропуском disabled
 *    опций (APG listbox; career-portal не обрабатывал disabled), Home/End,
 *    Escape — закрытие с возвратом фокуса на триггер (слушатель ДОКУМЕНТА,
 *    как в career-portal: работает и при фокусе вне инстанса), Tab —
 *    закрытие с естественным выходом, typahead по первой букве с циклом по
 *    совпадениям (APG type-ahead; Scope «оценить» — принят, чистая функция
 *    typeaheadIndex), клик по опции — выбор + закрытие + фокус на триггер
 *    (career-portal btn.focus());
 *  - N инстансов: открытие одного закрывает другие (closeAll career-portal);
 *  - aria: триггер — aria-haspopup="listbox"/aria-expanded/aria-controls;
 *    имя поля переносится с нативного select (label[for]/label-обёртка →
 *    aria-labelledby триггера и aria-label списка — без этого триггер
 *    терял бы имя «Город», оставшееся на select); опции — aria-selected,
 *    optgroup → role="group" + aria-label группы.
 *
 * Мобильная стратегия (Implementation requirements п.3, решение ADR-0012):
 * на устройствах с coarse-указателем (matchMedia('(pointer: coarse)')) модуль
 * НЕ активируется — нативный select остаётся как есть (системный пикер ОС
 * доступнее самодельного списка на таче; e2e — эмуляция hasTouch).
 *
 * Чистая функция синхронизации (Implementation requirements п.1, конвенция
 * tests/README): viewOf(select) — представление опций/групп без мутаций DOM;
 * typeaheadIndex(texts, from, char[, disabled]) — поиск следующего совпадения.
 * Обе экспортируются в IraoUI.select и покрыты юнит-тестами
 * tests/unit/select.test.js; DOM-поведение — tests/e2e/ui-select.spec.js.
 */
(function (window, document) {
  'use strict';

  // --- НАСТРОЙКА 1/3: уникальное имя модуля (ключ в window.IraoUI). ---
  var MODULE_NAME = 'select';

  // --- НАСТРОЙКА 2/3: селектор корней; JS-хуки — только data-ui-* (ADR-0005) ---
  // Активация — select[data-ui-select] (Spec); запрос по атрибуту без тега
  // даёт диагностику «хук не на select» через console.warn (контракт
  // шаблона п. 4, как data-ui-modal не на <dialog>).
  var SELECTOR = '[data-ui-select]';

  // Значение хука — модификатор обёртки сайта: триггер растягивается на
  // неё (замена хака vacancy-search__select-wrap career-portal).
  var WRAP_VALUE = 'wrap';

  // Флаг инициализации — data-атрибут, НЕ dataset (дефисы в DOMStringMap
  // запрещены — контракт module-template, T1.6).
  var INIT_ATTR = 'data-ui-' + MODULE_NAME + '-init';

  /** SVG-namespace шеврона. */
  var SVG_NS = 'http://www.w3.org/2000/svg';

  /** Реестр активных инстансов — closeAll (открытие одного закрывает другие). */
  var instances = [];

  var uid = 0;

  /** console.warn модуля (контракт шаблона п. 4 — не ронять страницу). */
  function warn() {
    if (window.console && window.console.warn) {
      var args = ['[IraoUI:' + MODULE_NAME + ']'].concat(Array.prototype.slice.call(arguments));
      window.console.warn.apply(window.console, args);
    }
  }

  /* ── Чистые функции синхронизации (Implementation requirements п. 1) ── */

  /**
   * Представление одной опции select — без мутаций DOM.
   * @param {HTMLOptionElement} option опция
   * @returns {{kind: string, value: string, text: string, selected: boolean, disabled: boolean}}
   */
  function optionView(option) {
    return {
      kind: 'option',
      value: option.value,
      text: option.text,
      selected: option.selected,
      disabled: option.disabled,
    };
  }

  /**
   * Чистая функция синхронизации: состояние select → модель опций и групп.
   * Порядок — документный: группа идёт ПЕРЕД своими опциями (как элемент
   * optgroup в разметке; её options — индексы опций в select.options, они же
   * индексы плоского списка кнопок UI).
   * @param {HTMLSelectElement} root нативный select
   * @returns {Array<Object>} записи kind="option"/kind="group"
   */
  function viewOf(root) {
    var view = [];
    var index = 0;
    for (var i = 0; i < root.children.length; i += 1) {
      var child = root.children[i];
      if (child.tagName === 'OPTGROUP') {
        var groupAt = view.length; // позиция записи группы — перед её опциями
        var optionIndexes = [];
        for (var j = 0; j < child.children.length; j += 1) {
          if (child.children[j].tagName === 'OPTION') {
            optionIndexes.push(index);
            view.push(optionView(child.children[j]));
            index += 1;
          }
        }
        view.splice(groupAt, 0, {
          kind: 'group',
          label: child.getAttribute('label') || '',
          options: optionIndexes,
        });
      } else if (child.tagName === 'OPTION') {
        view.push(optionView(child));
        index += 1;
      }
    }
    return view;
  }

  /**
   * Чистый typeahead по первой букве (APG listbox type-ahead): индекс
   * следующей после from опции, чей текст начинается с char (регистро-
   * независимо), с циклом по совпадениям; disabled-опции пропускаются.
   * @param {string[]} texts тексты опций (документный порядок)
   * @param {number} from индекс текущей позиции (-1 — с начала)
   * @param {string} char нажатый символ (одна «буква»)
   * @param {boolean[]} [disabled] параллельный массив disabled-флагов
   * @returns {number} индекс совпадения или -1
   */
  function typeaheadIndex(texts, from, char, disabled) {
    var query = String(char).toLowerCase();
    if (!query || !texts.length) {
      return -1;
    }
    var start = (from + 1 + texts.length) % texts.length;
    for (var step = 0; step < texts.length; step += 1) {
      var index = (start + step) % texts.length;
      if (disabled && disabled[index]) {
        continue;
      }
      if (
        String(texts[index] || '')
          .toLowerCase()
          .charAt(0) === query
      ) {
        return index;
      }
    }
    return -1;
  }

  /**
   * Инициализация одного инстанса. Не бросает наружу: init() оборачивает
   * вызов в try/catch; data-ui-select не на <select> сообщает о себе через
   * throw → console.warn (контракт шаблона, п. 4).
   * @param {Element} root элемент с хуком (ожидается <select>)
   * @returns {{root: Element, select: Element, open: Function, close: Function, sync: Function, destroy: Function}|null} хэндл или null
   */
  function initInstance(root) {
    if (root.getAttribute(INIT_ATTR) === 'true') {
      return null; // повторная инициализация запрещена
    }
    if (root.tagName !== 'SELECT') {
      throw new Error(
        'data-ui-select должен стоять на <select>, получен: ' + (root.tagName || root.nodeName),
      );
    }

    // Мобильная стратегия (Implementation requirements п. 3, решение ADR-0012):
    // coarse-указатель (тач) — модуль НЕ активируется, select остаётся
    // нативным: системный пикер ОС на таче доступнее самодельного списка.
    var coarseQuery =
      typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: coarse)') : null;
    if (coarseQuery && coarseQuery.matches) {
      return null;
    }

    var wrap = root.getAttribute('data-ui-select') === WRAP_VALUE;

    /* ── имя поля (ДО перестройки DOM): label[for=id] или label-обёртка.
       Без переноса имени триггер терял бы его — нативный select скрыт, а
       имя «Город» оставалось бы только у него (объявление триггера было бы
       безымянным «кнопка-список»). Пара APG listbox-button: aria-labelledby
       = label + собственный текст триггера. ── */
    var labelElement = null;
    if (root.id) {
      labelElement = document.querySelector('label[for="' + root.id + '"]');
    }
    if (!labelElement) {
      var ancestor = root.parentElement;
      while (ancestor) {
        if (ancestor.tagName === 'LABEL') {
          labelElement = ancestor;
          break;
        }
        ancestor = ancestor.parentElement;
      }
    }
    var labelText = labelElement
      ? (labelElement.textContent || '').replace(/\s+/g, ' ').trim()
      : '';

    /* ── сборка UI ── */

    var elementRoot = document.createElement('div');
    elementRoot.className = 'ui-select' + (wrap ? ' ui-select--wrap' : '');

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'ui-select__trigger';
    trigger.id = root.id ? root.id + '-trigger' : 'ui-select-trigger-' + (uid += 1);
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    var labelSpan = document.createElement('span');
    labelSpan.className = 'ui-select__label';
    trigger.appendChild(labelSpan);

    // Шеврон — байты dd__chevron career-portal (decorативный, currentColor).
    var chevron = document.createElementNS(SVG_NS, 'svg');
    chevron.setAttribute('class', 'ui-select__icon');
    chevron.setAttribute('aria-hidden', 'true');
    chevron.setAttribute('focusable', 'false');
    chevron.setAttribute('width', '16');
    chevron.setAttribute('height', '16');
    chevron.setAttribute('viewBox', '0 0 16 16');
    chevron.setAttribute('fill', 'none');
    var chevronPath = document.createElementNS(SVG_NS, 'path');
    chevronPath.setAttribute('d', 'M3 6l5 4 5-4');
    chevronPath.setAttribute('stroke', 'currentColor');
    chevronPath.setAttribute('stroke-width', '2');
    chevronPath.setAttribute('stroke-linecap', 'round');
    chevronPath.setAttribute('stroke-linejoin', 'round');
    chevron.appendChild(chevronPath);
    trigger.appendChild(chevron);

    var labelIdGenerated = false;
    if (labelElement) {
      if (!labelElement.id) {
        labelElement.id = 'ui-select-label-' + (uid += 1);
        labelIdGenerated = true;
      }
      trigger.setAttribute('aria-labelledby', labelElement.id + ' ' + trigger.id);
    }

    var list = document.createElement('div');
    list.className = 'ui-select__list';
    list.hidden = true;
    list.id = root.id ? root.id + '-listbox' : 'ui-select-listbox-' + (uid += 1);
    list.setAttribute('role', 'listbox');
    if (labelText) {
      list.setAttribute('aria-label', labelText);
    }
    trigger.setAttribute('aria-controls', list.id);

    elementRoot.appendChild(trigger);
    elementRoot.appendChild(list);

    /* ── опции: кнопки role="option" по модели viewOf (группы — role="group") ── */

    var optionButtons = [];

    function buildOption(entry) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className =
        'ui-select__option' + (entry.value === '' ? ' ui-select__option--reset' : '');
      button.setAttribute('role', 'option');
      button.textContent = entry.text;
      if (entry.disabled) {
        button.disabled = true;
      }
      var index = optionButtons.length;
      optionButtons.push(button);
      button.addEventListener('click', function () {
        choose(index);
      });
      return button;
    }

    var view = viewOf(root);
    var currentContainer = list;
    for (var entryIndex = 0; entryIndex < view.length; entryIndex += 1) {
      var entry = view[entryIndex];
      if (entry.kind === 'group') {
        currentContainer = document.createElement('div');
        currentContainer.className = 'ui-select__group';
        currentContainer.setAttribute('role', 'group');
        currentContainer.setAttribute('aria-label', entry.label);
        var groupLabel = document.createElement('span');
        groupLabel.className = 'ui-select__group-label';
        groupLabel.textContent = entry.label;
        currentContainer.appendChild(groupLabel);
        list.appendChild(currentContainer);
      } else {
        currentContainer.appendChild(buildOption(entry));
      }
    }

    /* ── состояние ── */

    function isOpen() {
      return !list.hidden;
    }

    /** Событие синхронизации UI ← select (мутаций DOM модели нет). */
    function sync() {
      var selected = root.options[root.selectedIndex] || null;
      labelSpan.textContent = selected ? selected.text : '';
      trigger.classList.toggle('is-placeholder', !selected || selected.value === '');
      trigger.disabled = root.disabled;
      for (var i = 0; i < optionButtons.length; i += 1) {
        var option = root.options[i];
        var isSelected = Boolean(option && option.selected && option.value !== '');
        optionButtons[i].classList.toggle('is-selected', isSelected);
        optionButtons[i].setAttribute(
          'aria-selected',
          option && option.selected ? 'true' : 'false',
        );
      }
    }

    /** Фокус на ближайшей включённой опции в направлении step (±1). */
    function focusSibling(fromIndex, step) {
      var i = fromIndex;
      while (i + step >= 0 && i + step < optionButtons.length) {
        i += step;
        if (!optionButtons[i].disabled) {
          optionButtons[i].focus();
          return true;
        }
      }
      return false;
    }

    function focusEdge(step) {
      var i = step > 0 ? -1 : optionButtons.length;
      focusSibling(i, step);
    }

    /** Фокус на выбранной опции (open() career-portal); fallback — край. */
    function focusSelected(fallbackStep) {
      var target = optionButtons[root.selectedIndex];
      if (target && !target.disabled) {
        target.focus();
        return;
      }
      focusEdge(fallbackStep);
    }

    function open(focusMode) {
      if (isOpen()) {
        return;
      }
      closeAll(elementRoot);
      list.hidden = false;
      elementRoot.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      if (focusMode === 'selected') {
        focusSelected(1);
      }
    }

    function close() {
      if (!isOpen()) {
        return;
      }
      list.hidden = true;
      elementRoot.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    /** Выбор опции (клик/Enter): синхронизация + change (bubbles) + закрытие
        с фокусом на триггер (career-portal: btn.focus после выбора). */
    function choose(index) {
      root.selectedIndex = index;
      sync();
      close();
      trigger.focus();
      root.dispatchEvent(new window.Event('change', { bubbles: true }));
    }

    /* ── обработчики ── */

    /** Toggle триггера; event.detail === 0 — клавиатурная активация
        (Enter/Space диспетчат click без координат): фокус на выбранную.
        Pointer-клик фокус не уводит (сценарий мыши, пара ui-dropdown). */
    function onTriggerClick(event) {
      if (isOpen()) {
        close();
      } else {
        open(event.detail === 0 ? 'selected' : undefined);
      }
    }

    /** Клавиатура APG listbox: Tab-выход, стрелки триггера, навигация по
        списку, typahead (первая буква, цикл по совпадениям). */
    function onRootKeydown(event) {
      if (event.key === 'Tab') {
        // Tab-выход закрывает; фокус уводит нативная навигация (select
        // вне Tab-порядка — tabindex="-1" стоит при инициализации).
        if (isOpen()) {
          close();
        }
        return;
      }

      var index = Array.prototype.indexOf.call(optionButtons, event.target);

      if (event.target === trigger) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          if (isOpen()) {
            focusSelected(event.key === 'ArrowUp' ? -1 : 1);
          } else {
            open('selected');
          }
        }
        return;
      }

      if (!isOpen() || index === -1) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        focusSibling(index, 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        focusSibling(index, -1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        focusEdge(1);
      } else if (event.key === 'End') {
        event.preventDefault();
        focusEdge(-1);
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // Typahead по первой букве (APG listbox type-ahead).
        var texts = [];
        var flags = [];
        for (var i = 0; i < optionButtons.length; i += 1) {
          texts.push(optionButtons[i].textContent);
          flags.push(optionButtons[i].disabled);
        }
        var next = typeaheadIndex(texts, index, event.key, flags);
        if (next !== -1) {
          event.preventDefault();
          optionButtons[next].focus();
        }
      }
    }

    /** Вне-клик закрывает (career-portal; переиспользование логики T6.1). */
    function onDocumentClick(event) {
      if (isOpen() && !elementRoot.contains(event.target)) {
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

    /** Нативный change (значение изменил сторонний код) → UI (career-portal:
        select.addEventListener('change', updateLabel)). */
    function onNativeChange() {
      sync();
    }

    /* ── перестройка DOM: PE — select скрыт ТОЛЬКО теперь ── */

    if (wrap) {
      // Обёртка сайта — геометрию и позиционный контекст рисует она; модуль
      // гарантирует лишь position (иначе absolute-триггер улетел бы дальше).
      root.parentElement.appendChild(elementRoot);
      var wrapper = root.parentElement;
      if (window.getComputedStyle(wrapper).position === 'static') {
        wrapper.style.position = 'relative';
      }
    } else {
      // Корень вместо select; select остаётся последним ребёнком — его бокс
      // (в потоке) задаёт корню/триггеру габариты (custom-select-hidden).
      root.parentElement.insertBefore(elementRoot, root);
      elementRoot.appendChild(root);
    }

    sync();
    root.classList.add('ui-select__native');
    // Триггер заменяет select в Tab-порядке: без tabindex="-1" после триггера
    // фокус попадал бы на невидимый select (двойная таб-остановка). SR-режим
    // обзора и формы по-прежнему видят нативный select.
    root.setAttribute('tabindex', '-1');

    trigger.addEventListener('click', onTriggerClick);
    elementRoot.addEventListener('keydown', onRootKeydown);
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onDocumentKeydown);
    root.addEventListener('change', onNativeChange);

    // Флаг только после успешной привязки (контракт шаблона).
    root.setAttribute(INIT_ATTR, 'true');

    var instance = {
      root: elementRoot,
      select: root,
      open: function () {
        open('selected');
      },
      close: close,
      sync: sync,
      destroy: function () {
        close();
        trigger.removeEventListener('click', onTriggerClick);
        elementRoot.removeEventListener('keydown', onRootKeydown);
        document.removeEventListener('click', onDocumentClick);
        document.removeEventListener('keydown', onDocumentKeydown);
        root.removeEventListener('change', onNativeChange);
        // Возврат разметки к no-JS состоянию: select на прежнем месте,
        // раскрыт и табулируем.
        elementRoot.parentElement.insertBefore(root, elementRoot);
        elementRoot.parentElement.removeChild(elementRoot);
        root.classList.remove('ui-select__native');
        root.removeAttribute('tabindex');
        if (labelIdGenerated) {
          labelElement.removeAttribute('id');
        }
        root.removeAttribute(INIT_ATTR);
      },
    };
    instances.push(instance);

    return instance;
  }

  /**
   * Закрыть все открытые списки (перенос closeAll career-portal).
   * exceptRoot — внутренний параметр open(): чей-то own open не закрывает
   * сам себя.
   * @param {Element} [exceptRoot] корень, который не закрывать
   */
  function closeAll(exceptRoot) {
    for (var i = 0; i < instances.length; i += 1) {
      if (instances[i].root !== exceptRoot) {
        instances[i].close();
      }
    }
  }

  /** Инстанс по select (или корню .ui-select). */
  function instanceOf(element) {
    for (var i = 0; i < instances.length; i += 1) {
      if (instances[i].select === element || instances[i].root === element) {
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
   * Уничтожить инстанс (публичный API): select или корень .ui-select, либо id.
   * Разметка возвращается к no-JS состоянию; повторная инициализация возможна.
   * @param {Element|string} element select, корень .ui-select или id
   * @returns {Object|null} уничтоженный инстанс или null (не найден)
   */
  function destroy(element) {
    var el = typeof element === 'string' ? document.getElementById(element) : element;
    var instance = el && instanceOf(el);
    if (!instance) {
      warn('destroy(): инстанс не найден');
      return null;
    }
    instance.destroy();
    var index = instances.indexOf(instance);
    if (index !== -1) {
      instances.splice(index, 1);
    }
    return instance;
  }

  // Регистрация в публичном API — сразу, до отложенной инициализации.
  window.IraoUI = window.IraoUI || {};
  window.IraoUI[MODULE_NAME] = {
    init: init,
    selector: SELECTOR,
    viewOf: viewOf,
    typeaheadIndex: typeaheadIndex,
    closeAll: closeAll,
    destroy: destroy,
  };

  // readyState-guard (Bitrix addJs(..., true) кладёт скрипт в конец страницы).
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})(window, document);

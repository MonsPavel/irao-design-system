/**
 * irao-ui — a11y/vi.js: версия для слабовидящих (ГОСТ Р 52872), задача T9.1.
 *
 * Порт js/vi.js career-portal (класс A аудита) с рефакторингом имён:
 *  - модуль в публичном API window.IraoUI.vi (02-architecture §2);
 *  - JS-хуки — только data-ui-* (ADR-0005): data-ui-vi-panel,
 *    data-ui-vi-set="ключ:значение", data-ui-vi-toggle;
 *  - классы режимов на <body> — «как есть» career-portal: vi,
 *    vi-size--sm|md|lg, vi-theme--baw|wb|bb|beige|green, vi-img--gray|off,
 *    vi-kern--wide (перекрашивает a11y/vi.css);
 *  - BREAKING: ключ localStorage — `irao-ui-vi` (career-portal:
 *    `vi-settings`). career-portal пакет не потребляет; настройки старого
 *    сайта не переносятся автоматически — осознанное решение T9.1 (дока:
 *    components/ui-vi/README.md).
 *
 * Поведение — без изменений (Implementation requirements T9.1 п.1):
 *  - вход в режим — сброс к дефолтам ГОСТ-панели (mergeState(DEFAULTS, {on:true}));
 *  - переключение режима сопровождается scrollTo({ top: 0 });
 *  - padding-top <body> = фактическая высота фиксированной панели
 *    (offsetHeight), снятие — пустая строка;
 *  - чтение и запись localStorage — в try/catch: приватный режим/запрет
 *    хранилища переводят модуль в режим без сохранения, страницу не роняют.
 *
 * Одна осознанная дельта против career-portal (AC T9.1 «выключение полностью
 * снимает классы»): при state.on = false классы-семейства (vi-size--,
 * vi-theme--, vi-img--, vi-kern--) снимаются с <body> целиком; в career-portal
 * они оставались на body инертными (без .vi ни один селектор vi.css не
 * действует — наблюдаемое поведение то же, состояние DOM чище).
 *
 * Отличия от инстансных компонентов (контракт docs/templates/module-template.js,
 * адаптация для страничного модуля): инстансов нет — вместо per-instance
 * try/catch и data-флага инициализации модульный guard `initialized`
 * (повторный init() не навешивает дубли слушателей); отсутствие панели и
 * кнопок ошибкой не является — сохранённое состояние применяется всегда
 * (режим действует на всём сайте, панель рендерит сайт).
 *
 * Чистая логика состояния (parse/merge) вынесена в функции parseSaved и
 * mergeState — поверхность tests/unit/vi.test.js (T1.6/T9.1); DOM-поведение —
 * tests/e2e/ui-vi.spec.js.
 */
(function (window, document) {
  'use strict';

  var MODULE_NAME = 'vi';

  /**
   * Ключ localStorage (breaking против career-portal 'vi-settings' —
   * см. шапку и доку компонента).
   */
  var STORAGE_KEY = 'irao-ui-vi';

  /** Стандартные настройки ГОСТ-панели; вход в режим возвращается к ним. */
  var DEFAULTS = { on: false, size: 'md', theme: 'baw', img: 'on', kern: 'normal' };

  /** Классы-семейства режимов на body — снимаются перед установкой новых. */
  var SIZE_CLASSES = ['vi-size--sm', 'vi-size--md', 'vi-size--lg'];
  var THEME_CLASSES = [
    'vi-theme--baw',
    'vi-theme--wb',
    'vi-theme--bb',
    'vi-theme--beige',
    'vi-theme--green',
  ];

  var state = mergeState(DEFAULTS, parseSaved(readSaved()));
  var initialized = false;

  /** Сырая строка хранилища; недоступное хранилище = отсутствие сохранения. */
  function readSaved() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return null; /* нет доступа к localStorage — режим без сохранения */
    }
  }

  /**
   * Чистая: сырая строка → сохранённые настройки (объект) или null.
   * Мусор, не-JSON и JSON не-объектов (null, числа, строки) — null.
   * @param {string|null} raw сырое значение localStorage
   * @returns {object|null}
   */
  function parseSaved(raw) {
    if (typeof raw !== 'string' || raw === '') {
      return null;
    }
    try {
      var saved = JSON.parse(raw);
      return saved && typeof saved === 'object' ? saved : null;
    } catch {
      return null;
    }
  }

  /**
   * Чистая: дефолты + сохранённое (частичное) — сохранённое побеждает.
   * Оба аргумента не мутируются.
   * @param {object} defaults полные дефолтные настройки
   * @param {object|null} saved сохранённые (возможно частичные) настройки
   * @returns {object} новое полное состояние
   */
  function mergeState(defaults, saved) {
    return Object.assign({}, defaults, saved || {});
  }

  /** Сохранить состояние; сбой записи (квота, приватный режим) игнорируется. */
  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore — режим без сохранения */
    }
  }

  /**
   * Применить состояние к странице: классы режимов на <body>, hidden панели,
   * синхронизация aria-pressed сегментных кнопок и кнопок входа/выхода,
   * padding-top по фактической высоте панели. Завершается сохранением.
   */
  function apply() {
    var body = document.body;
    body.classList.toggle('vi', state.on);
    // Классы режимов — только в режиме (AC T9.1 «выключение полностью снимает
    // классы»; отличие от career-portal, где семейства оставались на body
    // инертными без .vi — в системе все селекторы режимов требуют body.vi).
    SIZE_CLASSES.forEach(function (className) {
      body.classList.remove(className);
    });
    THEME_CLASSES.forEach(function (className) {
      body.classList.remove(className);
    });
    body.classList.remove('vi-img--gray', 'vi-img--off', 'vi-kern--wide');
    if (state.on) {
      body.classList.add('vi-size--' + state.size);
      body.classList.add('vi-theme--' + state.theme);
      body.classList.toggle('vi-img--gray', state.img === 'gray');
      body.classList.toggle('vi-img--off', state.img === 'off');
      body.classList.toggle('vi-kern--wide', state.kern === 'wide');
    }

    var panels = document.querySelectorAll('[data-ui-vi-panel]');
    for (var p = 0; p < panels.length; p += 1) {
      panels[p].hidden = !state.on;
    }

    // Состояние сегментных кнопок: data-ui-vi-set="ключ:значение".
    var setButtons = document.querySelectorAll('[data-ui-vi-set]');
    for (var s = 0; s < setButtons.length; s += 1) {
      var parts = setButtons[s].getAttribute('data-ui-vi-set').split(':');
      setButtons[s].setAttribute('aria-pressed', String(state[parts[0]] === parts[1]));
    }

    var toggleButtons = document.querySelectorAll('[data-ui-vi-toggle]');
    for (var t = 0; t < toggleButtons.length; t += 1) {
      toggleButtons[t].setAttribute('aria-pressed', String(state.on));
    }

    // Отступ сверху = реальная высота панели (она фиксирована); без панели
    // и в обычном режиме — пустая строка (работает резерв body.vi в CSS).
    var panel = document.querySelector('[data-ui-vi-panel]');
    document.body.style.paddingTop = state.on && panel ? panel.offsetHeight + 'px' : '';

    save();
  }

  /** Задать значение настройки и применить (сегментные кнопки и API сайтов). */
  function set(key, value) {
    state[key] = value;
    apply();
  }

  /**
   * Вход/выход из режима (кнопки data-ui-vi-toggle). Вход — сброс к
   * стандартным настройкам ГОСТ-панели (поведение career-portal); состояние
   * мутируется на месте — ссылка window.IraoUI.vi.state остаётся живой.
   */
  function toggle() {
    state.on = !state.on;
    if (state.on) {
      Object.assign(state, DEFAULTS, { on: true });
    }
    apply();
    window.scrollTo({ top: 0 });
  }

  /**
   * Точка входа: слушатели кнопок + первичное применение состояния.
   * Идемпотентна (guard повторной инициализации); безопасна при отсутствии
   * панели/кнопок — сохранённое состояние применяется в любом случае.
   */
  function init() {
    if (initialized) {
      return;
    }

    var setButtons = document.querySelectorAll('[data-ui-vi-set]');
    for (var s = 0; s < setButtons.length; s += 1) {
      setButtons[s].addEventListener('click', onSetClick);
    }

    var toggleButtons = document.querySelectorAll('[data-ui-vi-toggle]');
    for (var t = 0; t < toggleButtons.length; t += 1) {
      toggleButtons[t].addEventListener('click', onToggleClick);
    }

    initialized = true;
    apply();
  }

  function onSetClick(event) {
    var parts = event.currentTarget.getAttribute('data-ui-vi-set').split(':');
    set(parts[0], parts[1]);
  }

  function onToggleClick() {
    toggle();
  }

  // Регистрация в публичном API — сразу, до отложенной инициализации.
  window.IraoUI = window.IraoUI || {};
  window.IraoUI[MODULE_NAME] = {
    init: init,
    apply: apply,
    set: set,
    toggle: toggle,
    state: state,
    DEFAULTS: DEFAULTS,
    STORAGE_KEY: STORAGE_KEY,
    parseSaved: parseSaved,
    mergeState: mergeState,
  };

  // readyState-guard (Bitrix addJs(..., true) кладёт скрипт в конец страницы):
  // документ ещё грузится — ждём DOMContentLoaded, иначе применяем немедленно.
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})(window, document);

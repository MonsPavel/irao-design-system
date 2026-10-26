/**
 * irao-ui — ui-carousel: карусель слайдов и фото-галерея (задача T17.7).
 *
 * Порт поведения пилота career-portal (pilot.js:18–134, ES5 ~120 строк:
 * карусель «Производство» + попап «Направлений») в системный модуль:
 * multi-instance, отрыв от классов страницы, полный клавиатурный паттерн
 * табов (прецедент ui-tabs T6.2), деградация без JS.
 *
 * Две формы одного модуля:
 *  - карусель: корень [data-ui-carousel] — слайды «фото + заголовок + текст
 *    + CTA» из <script type="application/json" data-ui-carousel-slides>
 *    (массив {photo,title,text,link,count}), слоты активного слайда
 *    [data-ui-carousel-photo/-title/-text/-link], стрелки
 *    [data-ui-carousel-prev/-next], степпер .ui-carousel__stepper
 *    (role="tablist" из разметки — канон спеки T17.7) с табами
 *    .ui-carousel__tab (role="tab", aria-selected);
 *  - галерея: корень [data-ui-gallery] — prev/next по JSON-массиву фото
 *    <script type="application/json" data-ui-gallery-photos> (массив строк),
 *    слот [data-ui-gallery-photo], стрелки [data-ui-gallery-prev/-next]
 *    (модалка направлений career-portal); степпера нет.
 *
 * Деградация без JS (принцип ТЗ №14): первый слайд продублирован в слотах
 * разметки, стрелки и степпер несут hidden — модуль снимает его при
 * инициализации (симметрично атрибуту open в ui-modal: разметка правдива
 * без JS — мёртвых контролов нет; CSS-скрытие делает display-правило
 * компонента, показ — класс is-initialized на корне, спека T17.7 упоминала
 * «:root.js-хук», которого в dist нет — приём «состояние ставит модуль»,
 * прецедент is-open ui-dropdown). Компонент не ходит в сеть: JSON-данные —
 * зона разметки (Implementation requirements п.2).
 *
 * Поведение:
 *  - клик стрелки/таба — активный слайд; prev/next зацикливаются;
 *  - клавиатура на табах (APG tabs, automatic-активация): ←/→ с
 *    зацикливанием, Home/End — края; фокус и выбор вместе; Tab/Shift+Tab НЕ
 *    перехватываются — roving tabindex (0 у активного таба, −1 у остальных)
 *    ставит модуль (прецедент ui-tabs); таб вне степпера — брак разметки:
 *    отказ инициализации (клавиатура его не достигает — урок T13.6);
 *  - стартовый выбор: таб с aria-selected="true" в разметке, иначе первый —
 *    разметка (дубли данных первого слайда в слотах) остаётся источником
 *    начального состояния; стартовый рендер silent;
 *  - слоты опциональны (рендер по наличию — прецедент pilot.js), JSON
 *    обязателен: нет/битый/пустой → отказ инстанса (console.warn, соседи
 *    живы — контракт шаблона п.4); link-слот показывает slide.link, а без
 *    него строку пилота «Подробнее: count»;
 *  - галерея: alt фото-слота не трогает (декоративные фото попапа —
 *    alt="" в разметке сайта);
 *  - событие irao-ui:carousel-select (bubbles, detail.index) — на смене
 *    слайда ПОСЛЕ инициализации (silent-старт) — точка расширения сайта
 *    (прецедент irao-ui:tabs-select); пилот подпиской обновляет тексты
 *    попапа направлений при перелистывании фото;
 *  - API IraoUI.carousel.select(root, index) — программный выбор (сайт
 *    открывает модалку направлений на выбранном; ленивая инициализация —
 *    прецедент IraoUI.modal.open); N инстансов независимы.
 *
 * DOM-поведение — tests/e2e/ui-carousel.spec.js; контракт, JSON-парс и
 * клавиатура — tests/unit/carousel.test.js.
 */
(function (window, document) {
  'use strict';

  // --- НАСТРОЙКА 1/3: уникальное имя модуля (ключ в window.IraoUI). ---
  var MODULE_NAME = 'carousel';

  // --- НАСТРОЙКА 2/3: селектор корней обеих форм; JS-хуки — только data-ui-* (ADR-0005) ---
  var SELECTOR = '[data-ui-carousel], [data-ui-gallery]';

  // Флаги инициализации — data-атрибуты, НЕ dataset (дефисы в DOMStringMap
  // запрещены — контракт module-template, T1.6).
  var INIT_ATTR = 'data-ui-' + MODULE_NAME + '-init';
  var GALLERY_INIT_ATTR = 'data-ui-gallery-init';

  // CSS-крючок показа контролов (ui-carousel.css): скрыты по умолчанию —
  // модуль снимает hidden из разметки и ставит класс на корень.
  var INIT_CLASS = 'is-initialized';

  var EVENT_NAME = 'irao-ui:' + MODULE_NAME + '-select';

  /* ── Чистые функции JSON-парса (Testing requirements: unit — чистая
     функция; здесь — разбор строки данных в массив слайдов/фото).
     ES5-совместимость (ADR-0005): try/catch здесь НЕТ — битый JSON даёт
     SyntaxError из JSON.parse, который перехватывает общий отказ
     инициализации (init() → console.warn, catch с биндингом): optional
     catch binding (ES2019) в конкатенированном ui.min.js был бы
     синтаксической ошибкой для ВСЕХ модулей на ES5-движке. ── */

  /**
   * Разобрать JSON-текст в массив слайдов. Битый JSON — SyntaxError
   * (перехватывает отказ инициализации), не-массив — null (инстанс откажет
   * с console.warn); не-объекты массива отбрасываются.
   * @param {string} text содержимое <script type="application/json">
   * @returns {Array<Object>|null} массив слайдов или null
   */
  function parseSlides(text) {
    var data = window.JSON.parse(text);
    if (!Array.isArray(data)) {
      return null;
    }
    var slides = [];
    for (var i = 0; i < data.length; i += 1) {
      if (data[i] && typeof data[i] === 'object') {
        slides.push(data[i]);
      }
    }
    return slides;
  }

  /**
   * Разобрать JSON-текст в массив фото (строк-URL). Битый JSON —
   * SyntaxError (как parseSlides); не-массив — null; не-строки
   * отбрасываются.
   * @param {string} text содержимое <script type="application/json">
   * @returns {Array<string>|null} массив фото или null
   */
  function parsePhotos(text) {
    var data = window.JSON.parse(text);
    if (!Array.isArray(data)) {
      return null;
    }
    var photos = [];
    for (var i = 0; i < data.length; i += 1) {
      if (typeof data[i] === 'string' && data[i] !== '') {
        photos.push(data[i]);
      }
    }
    return photos;
  }

  /** Реестр живых инстансов (прецедент instances ui-modal): линейный поиск
     по корню — ES5-совместимо (WeakMap — не ES5, ADR-0005). */
  var instances = [];

  /** Инстанс по корневому элементу (для публичного select(root, index)). */
  function instanceOf(root) {
    for (var i = 0; i < instances.length; i += 1) {
      if (instances[i].root === root) {
        return instances[i];
      }
    }
    return null;
  }

  /**
   * Инициализация одного инстанса (обе формы). Не бросает наружу: init()
   * оборачивает вызов в try/catch; брак данных/разметки (нет JSON, пустой
   * массив, таб вне степпера, нет фото-слота галереи) сообщает о себе через
   * throw → console.warn (контракт шаблона, п. 4).
   * @param {Element} root корневой элемент инстанса
   * @returns {{root: Element, select: Function, destroy: Function}|null} хэндл или null
   */
  function initInstance(root) {
    var isGallery = root.hasAttribute('data-ui-gallery');
    var initAttr = isGallery ? GALLERY_INIT_ATTR : INIT_ATTR;
    if (root.getAttribute(initAttr) === 'true') {
      return null; // повторная инициализация запрещена
    }

    /* ── Данные: JSON из разметки, сеть не трогается (п.2). ── */
    var dataScript = root.querySelector(
      isGallery ? '[data-ui-gallery-photos]' : '[data-ui-carousel-slides]',
    );
    if (!dataScript) {
      throw new Error(
        '[IraoUI:' +
          MODULE_NAME +
          '] в инстансе нет <script type="application/json"> с данными (' +
          (isGallery ? 'data-ui-gallery-photos' : 'data-ui-carousel-slides') +
          ') — данные слайдов отдаёт разметка, компонент не ходит в сеть',
      );
    }
    var items = (isGallery ? parsePhotos : parseSlides)(dataScript.textContent);
    if (!items || !items.length) {
      throw new Error(
        '[IraoUI:' +
          MODULE_NAME +
          '] данные инстанса не разобрались (битый JSON, не массив или пусто) — ' +
          'ожидается массив ' +
          (isGallery ? 'фото-строк' : '{photo,title,text,link,count}'),
      );
    }

    /* ── Контролы переключения: стрелки (обе формы) и степпер (карусель). ── */
    var prev = root.querySelector(isGallery ? '[data-ui-gallery-prev]' : '[data-ui-carousel-prev]');
    var next = root.querySelector(isGallery ? '[data-ui-gallery-next]' : '[data-ui-carousel-next]');

    var stepper = null;
    var tabs = [];
    if (!isGallery) {
      stepper = root.querySelector('.ui-carousel__stepper');
      var tabEls = root.querySelectorAll('.ui-carousel__tab');
      // Таб вне степпера — брак разметки (прецедент таба вне .ui-tabs__list,
      // T13.6): без списка клавиатура и roving tabindex его не достигают.
      if (!stepper && tabEls.length) {
        throw new Error(
          '[IraoUI:' +
            MODULE_NAME +
            '] в инстансе есть .ui-carousel__tab, но нет .ui-carousel__stepper: ' +
            'клавиатура и roving tabindex таба не работают вне таблиста',
        );
      }
      if (stepper) {
        for (var t = 0; t < tabEls.length; t += 1) {
          if (!stepper.contains(tabEls[t])) {
            throw new Error(
              '[IraoUI:' +
                MODULE_NAME +
                '] таб «' +
                tabEls[t].textContent.trim() +
                '» вне .ui-carousel__stepper: перенесите его в таблист ' +
                '(иначе клавиатура и roving tabindex его не достигают)',
            );
          }
          tabs.push(tabEls[t]);
        }
      }
    }

    /* ── Слоты: опциональны (рендер по наличию — прецедент pilot.js);
          фото-слот галереи обязателен — без него галерея не переключаема. ── */
    var photoSlot = root.querySelector(
      isGallery ? '[data-ui-gallery-photo]' : '[data-ui-carousel-photo]',
    );
    if (isGallery && !photoSlot) {
      throw new Error(
        '[IraoUI:' + MODULE_NAME + '] в галерее нет фото-слота [data-ui-gallery-photo]',
      );
    }
    var titleSlot = isGallery ? null : root.querySelector('[data-ui-carousel-title]');
    var textSlot = isGallery ? null : root.querySelector('[data-ui-carousel-text]');
    var linkSlot = isGallery ? null : root.querySelector('[data-ui-carousel-link]');

    /* ── Стартовый выбор: таб с aria-selected="true" в разметке, иначе 0. ──
       Разметка дублирует первый слайд в слотах — она остаётся источником
       начального состояния (как aria-current="page" в ui-tabs, T14.9);
       стартовый рендер ниже синхронизирует всё с выбранным. */
    var current = 0;
    for (var m = 0; m < tabs.length; m += 1) {
      if (tabs[m].getAttribute('aria-selected') === 'true') {
        current = m;
        break;
      }
    }
    if (current >= items.length) {
      current = 0; // табов больше, чем слайдов — брак данных, выбираем первый
    }

    /**
     * Событие смены выбора (bubbles) — точка расширения сайта.
     * @param {number} index новый индекс
     */
    function dispatch(index) {
      root.dispatchEvent(
        new window.CustomEvent(EVENT_NAME, { bubbles: true, detail: { index: index } }),
      );
    }

    /**
     * Рендер активного слайда в слоты + aria-состояние табов.
     * silent — стартовый выбор: событие сайту не отправляется.
     * @param {number} index индекс слайда
     * @param {boolean} focusTab перевести фокус на таб (automatic-активация)
     * @param {boolean} [silent] не диспатчить irao-ui:carousel-select
     */
    function select(index, focusTab, silent) {
      if (index < 0 || index >= items.length) {
        return; // вне диапазона — no-op (прецедент ui-tabs, ревью T13.6)
      }
      var changed = index !== current;
      current = index;

      if (isGallery) {
        if (photoSlot) {
          photoSlot.setAttribute('src', items[index]);
          // alt галереи не трогаем: фото попапа декоративны (alt="" — сайт).
        }
      } else {
        var slide = items[index];
        if (photoSlot) {
          photoSlot.setAttribute('src', slide.photo || '');
          photoSlot.setAttribute('alt', slide.title || '');
        }
        if (titleSlot) {
          titleSlot.textContent = slide.title || '';
        }
        if (textSlot) {
          textSlot.textContent = slide.text || '';
        }
        if (linkSlot) {
          // CTA: slide.link из данных, иначе строка пилота «Подробнее: N»
          // (PRODUCTION_SLIDES career-portal несут count, не link).
          if (slide.link !== null && slide.link !== undefined) {
            linkSlot.textContent = slide.link;
          } else if (slide.count !== null && slide.count !== undefined) {
            linkSlot.textContent = 'Подробнее: ' + slide.count;
          }
        }
        for (var i = 0; i < tabs.length; i += 1) {
          var active = i === index;
          tabs[i].setAttribute('aria-selected', String(active));
          // Roving tabindex: Tab с активного таба уходит за степпер, не в
          // соседний таб (APG tabs — прецедент ui-tabs).
          tabs[i].setAttribute('tabindex', active ? '0' : '-1');
        }
        if (focusTab && tabs[index]) {
          tabs[index].focus();
        }
      }
      if (changed && !silent) {
        dispatch(index);
      }
    }

    /** Нормализация ARIA-состояния табов без рендера слотов (стартовый
        индекс 0 — разметка уже несёт первый слайд; перезапись слотов
        стёрла бы разметочные детали — nbsp в текстах пилота, alt фото).
        Прецедент: оригинал/пилот рендерят ТОЛЬКО по действию. */
    function syncTabs() {
      for (var i = 0; i < tabs.length; i += 1) {
        var active = i === current;
        tabs[i].setAttribute('aria-selected', String(active));
        tabs[i].setAttribute('tabindex', active ? '0' : '-1');
      }
    }

    /** Шаг относительно текущего с зацикливанием (пилот go(step)). */
    function go(step) {
      select((current + step + items.length) % items.length);
    }

    /* ── init-мутации: снять hidden контролов, класс показа, флаг. ──
       Деградация без JS: hidden из разметки оставляет контролы мёртвыми —
       модуль снимает его вместе со взятием поведения на себя (симметрично
       open в ui-modal). Слушатели — именованные функции (destroy снимает
       те же ссылки). */
    function onPrev() {
      go(-1);
    }
    function onNext() {
      go(1);
    }
    if (prev) {
      prev.removeAttribute('hidden');
      prev.addEventListener('click', onPrev);
    }
    if (next) {
      next.removeAttribute('hidden');
      next.addEventListener('click', onNext);
    }
    if (stepper) {
      stepper.removeAttribute('hidden');
    }
    /** Клавиатура APG tabs на ленте (named — destroy снимает ссылку). */
    function onStepperKeydown(event) {
      var target = null;
      if (event.key === 'ArrowRight') {
        target = (current + 1) % tabs.length;
      } else if (event.key === 'ArrowLeft') {
        target = (current - 1 + tabs.length) % tabs.length;
      } else if (event.key === 'Home') {
        target = 0;
      } else if (event.key === 'End') {
        target = tabs.length - 1;
      }
      if (target === null || !tabs.length) {
        return;
      }
      event.preventDefault();
      select(target, true);
    }
    /** Клик по табу выбирает слайд (делегирование на ленте — прецедент
        onListClick ui-tabs). */
    function onStepperClick(event) {
      var tab = event.target.closest ? event.target.closest('.ui-carousel__tab') : null;
      if (!tab || !stepper.contains(tab)) {
        return;
      }
      for (var i = 0; i < tabs.length; i += 1) {
        if (tabs[i] === tab) {
          select(i, false);
          return;
        }
      }
    }
    if (stepper) {
      stepper.addEventListener('keydown', onStepperKeydown);
      stepper.addEventListener('click', onStepperClick);
    }
    root.classList.add(INIT_CLASS);
    root.setAttribute(initAttr, 'true');

    // Стартовое состояние: ARIA табов нормализуется всегда; слоты
    // перезаписываются только при старте не с первого слайда (aria-selected
    // в разметке на другом табе) — иначе разметка остаётся источником
    // (деградация без JS и стартовый кадр идентичны, прецедент пилота:
    // рендер только по действию). Старт — не смена выбора: silent.
    syncTabs();
    if (current !== 0) {
      select(current, false, true);
    }

    var instance = {
      root: root,
      select: function (index) {
        select(index, false);
      },
      destroy: function () {
        if (prev) {
          prev.removeEventListener('click', onPrev);
        }
        if (next) {
          next.removeEventListener('click', onNext);
        }
        if (stepper) {
          stepper.removeEventListener('keydown', onStepperKeydown);
          stepper.removeEventListener('click', onStepperClick);
        }
        // Возврат разметки к no-JS состоянию: контролы скрыты (hidden),
        // roving tabindex снят (aria-selected/роли — семантика разметки).
        if (prev) {
          prev.setAttribute('hidden', '');
        }
        if (next) {
          next.setAttribute('hidden', '');
        }
        if (stepper) {
          stepper.setAttribute('hidden', '');
        }
        for (var i = 0; i < tabs.length; i += 1) {
          tabs[i].removeAttribute('tabindex');
        }
        root.classList.remove(INIT_CLASS);
        root.removeAttribute(initAttr);
        var index = instances.indexOf(instance);
        if (index !== -1) {
          instances.splice(index, 1);
        }
      },
    };

    instances.push(instance);
    return instance;
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

  /**
   * Программный выбор слайда/фото (публичный API): select(root, index) —
   * сайт открывает карусель/модалку на нужном слайде. Небычный корень
   * инициализируется лениво; ошибка разметки — console.warn, не throw
   * (прецедент IraoUI.modal.open).
   * @param {Element|string} root корень инстанса или его id
   * @param {number} index индекс слайда/фото
   * @returns {Object|null} хэндл инстанса или null (не найден/сломан)
   */
  function select(root, index) {
    var el = typeof root === 'string' ? document.getElementById(root) : root;
    if (!el) {
      warnOnce('select(): корень не найден');
      return null;
    }
    var inst = instanceOf(el);
    if (!inst) {
      try {
        inst = initInstance(el);
      } catch (err) {
        warnOnce('select():', err.message);
        return null;
      }
    }
    inst.select(index);
    return inst;
  }

  /** console.warn с префиксом модуля (jsdom-пины собирают аргументы). */
  function warnOnce() {
    if (window.console && window.console.warn) {
      var args = ['[IraoUI:' + MODULE_NAME + ']'];
      for (var i = 0; i < arguments.length; i += 1) {
        args.push(arguments[i]);
      }
      window.console.warn.apply(window.console, args);
    }
  }

  // Регистрация в публичном API — сразу, до отложенной инициализации.
  window.IraoUI = window.IraoUI || {};
  window.IraoUI[MODULE_NAME] = {
    init: init,
    selector: SELECTOR,
    select: select,
  };

  // readyState-guard (Bitrix addJs(..., true) кладёт скрипт в конец страницы).
  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})(window, document);

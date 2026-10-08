/*
 * SPIKE T7.1 — прототип «собственный оверлей» (ВРЕМЕННЫЙ, выбрасывается).
 * Старт от career-portal directions.js (div + классы + transitionend +
 * lastFocused) — без trap и семантики; до чек-листа К1–К12 дописано:
 * trap (Tab-цикл), Escape (верхний из стека), инертность фона (inert),
 * aria-modal/role, скролл-лок со счётчиком, перенос в body при init
 * (fixed внутри transform-обёрток legacy позиционируется от обёртки — К4).
 *
 * Не window.IraoUI.*: это не компонент — песочница выбрасывается.
 */
(function (window, document) {
  'use strict';

  var OVERLAY_SELECTOR = '[data-ui-spike-custom]';
  var OPENER_SELECTOR = '[data-ui-spike-custom-open]';
  var INIT_ATTR = 'data-ui-spike-custom-init';
  var OPEN_CLASS = 'is-open';
  var CLOSE_FALLBACK_MS = 400; // --ui-transition (0.25s) + запас

  /* ── Скролл-лок: счётчик на вложенность (как в spike-native.js) ── */
  var lockCount = 0;

  function lockScroll() {
    lockCount += 1;
    if (lockCount > 1) return;
    var gap = window.innerWidth - document.documentElement.clientWidth;
    if (gap > 0) document.body.style.paddingRight = gap + 'px';
    document.body.setAttribute('data-spike-lock', '');
  }

  function unlockScroll() {
    if (lockCount === 0) return;
    lockCount -= 1;
    if (lockCount > 0) return;
    document.body.style.paddingRight = '';
    document.body.removeAttribute('data-spike-lock');
  }

  /* ── Стек открытых инстансов (К7: Escape — верхнему) ── */
  var openStack = [];

  /* ── Инертность фона (К12): пересчёт по открытым инстансам. Инертны дети
   * body, пока ХОТЬ ОДИН оверлей открыт; открытые оверлеи и их потомки — нет. */
  function refreshInert() {
    var children = document.body.children;
    for (var i = 0; i < children.length; i += 1) {
      var child = children[i];
      var inOpenOverlay = false;
      for (var j = 0; j < openStack.length; j += 1) {
        if (child === openStack[j] || openStack[j].contains(child)) inOpenOverlay = true;
      }
      child.inert = openStack.length > 0 && !inOpenOverlay;
    }
  }

  /* ── Focus trap (К1): Tab/Shift+Tab цикл внутри панели ── */
  var FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function trapTab(overlay, event) {
    var focusable = overlay.querySelectorAll(FOCUSABLE);
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ── Закрытие: transitionend (паттерн directions.js) + timeout-страховка ── */

  function finishClose(overlay) {
    overlay.hidden = true;
    overlay.classList.remove(OPEN_CLASS);
    for (var i = 0; i < openStack.length; i += 1) {
      if (openStack[i] === overlay) openStack.splice(i, 1);
    }
    unlockScroll();
    refreshInert();
    // К3 restore: перенос career-portal (lastFocused + preventScroll)
    var last = overlay.__spikeLastFocused;
    if (last && typeof last.focus === 'function') last.focus({ preventScroll: true });
  }

  function requestClose(overlay) {
    if (
      !openStack.some(function (item) {
        return item === overlay;
      })
    )
      return;
    overlay.classList.remove(OPEN_CLASS);
    var finished = false;
    var finish = function () {
      if (finished) return;
      finished = true;
      overlay.removeEventListener('transitionend', onEnd);
      window.clearTimeout(timer);
      finishClose(overlay);
    };
    var onEnd = function (event) {
      if (event.target === overlay && event.propertyName === 'opacity') finish();
    };
    var timer = window.setTimeout(finish, CLOSE_FALLBACK_MS);
    overlay.addEventListener('transitionend', onEnd);
  }

  function open(overlay, opener) {
    // Safari не фокусирует кнопку кликом: lastFocused = activeElement даёт
    // body. Опенер фиксируется явно (К3 на всей матрице); directions.js-паттерн
    // (lastFocused) остаётся fallback.
    overlay.__spikeLastFocused =
      opener || (document.activeElement !== document.body ? document.activeElement : null);
    overlay.hidden = false;
    lockScroll();
    openStack.push(overlay);
    refreshInert();
    // Кадр без is-open → transition (directions.js: force reflow; здесь rAF)
    window.requestAnimationFrame(function () {
      overlay.classList.add(OPEN_CLASS);
    });
    var close = overlay.querySelector('[data-ui-spike-custom-close]');
    if (close) close.focus({ preventScroll: true }); // directions.js: фокус на закрывающую
  }

  function initOverlay(overlay) {
    if (overlay.getAttribute(INIT_ATTR) === 'true') return;

    // Перенос в body: fixed внутри transform/filter-обёрток legacy
    // позиционируется от ОБЁРТКИ (К4); до init разметка живёт на месте
    // (PE-деградация К9 — без JS контент виден инлайн).
    document.body.appendChild(overlay);
    overlay.hidden = true; // модуль забирает состояние (как dropdown T6.1)

    overlay.addEventListener('keydown', function (event) {
      if (event.key === 'Tab') trapTab(overlay, event);
    });

    var closers = overlay.querySelectorAll('[data-ui-spike-custom-close]');
    for (var i = 0; i < closers.length; i += 1) {
      closers[i].addEventListener('click', function () {
        requestClose(overlay);
      });
    }

    overlay.setAttribute(INIT_ATTR, 'true');
  }

  function init() {
    var overlays = document.querySelectorAll(OVERLAY_SELECTOR);
    if (!overlays.length) return; // guard отсутствия элементов (контракт T1.6)

    for (var i = 0; i < overlays.length; i += 1) {
      try {
        initOverlay(overlays[i]);
      } catch (error) {
        window.console.warn('spike-custom: ' + error.message);
      }
    }

    // К2 Escape — верхнему из стека (как directions.js: слушатель документа)
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !openStack.length) return;
      requestClose(openStack[openStack.length - 1]);
    });

    var openers = document.querySelectorAll(OPENER_SELECTOR);
    for (var j = 0; j < openers.length; j += 1) {
      openers[j].addEventListener('click', function () {
        var overlay = document.getElementById(this.getAttribute('data-ui-spike-custom-open'));
        if (overlay) open(overlay, this);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);

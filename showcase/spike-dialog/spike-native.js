/*
 * SPIKE T7.1 — прототип «native <dialog>» (ВРЕМЕННЫЙ, выбрасывается после
 * решения; см. showcase/spike-dialog/README.md — критерии К1–К12).
 *
 * Минимальный чек-лист диалога на native showModal():
 *   К1 trap, К2 Escape, К3 restore — БРАУЗЕР (top-layer), JS не пишет;
 *   К12 инертность фона — браузер (блокинг top-layer);
 *   К10 скролл-лок — overflow hidden + padding-компенсация (+счётчик для
 *      вложенности; сдвига нет и за счёт scrollbar-gutter: stable в base/reset);
 *   К5 анимация — открытие @starting-style (CSS), закрытие JS-delayed
 *      (is-closing + transitionend/timeout → close(): зонд 2026-10-08 —
 *      pure-CSS закрытие анимирует только chromium);
 *   К7 вложенность — стек ведёт браузер (top-layer: cancel/close — верхнему).
 *
 * Не window.IraoUI.*: это не компонент — песочница выбрасывается.
 */
(function (window, document) {
  'use strict';

  var DIALOG_SELECTOR = 'dialog[data-ui-spike-native]';
  var OPENER_SELECTOR = '[data-ui-spike-native-open]';
  var INIT_ATTR = 'data-ui-spike-native-init';
  var CLOSING_CLASS = 'is-closing';
  var CLOSE_FALLBACK_MS = 400; // --ui-transition (0.25s) + запас

  /* ── Скролл-лок: счётчик на вложенность (К7) ── */
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

  /* ── Закрытие с анимацией: JS-delayed (is-closing → завершение → close()) ── */

  function requestClose(dialog) {
    if (dialog.classList.contains(CLOSING_CLASS)) return;
    dialog.classList.add(CLOSING_CLASS);
    var finished = false;
    var finish = function () {
      if (finished) return;
      finished = true;
      dialog.removeEventListener('transitionend', onEnd);
      window.clearTimeout(timer);
      dialog.close(); // нативный restore фокуса (зонд П6) + событие close
    };
    var onEnd = function (event) {
      if (event.target === dialog && event.propertyName === 'opacity') finish();
    };
    var timer = window.setTimeout(finish, CLOSE_FALLBACK_MS);
    dialog.addEventListener('transitionend', onEnd);
  }

  function initDialog(dialog) {
    if (dialog.getAttribute(INIT_ATTR) === 'true') return;

    // PE-деградация (К9): open в разметке (контент виден инлайн без JS) —
    // модуль забирает управление состоянием.
    if (dialog.open) dialog.removeAttribute('open');

    // К10: лок на всё модальное время; снятие — на нативном close (в т.ч.
    // после анимированного path и method="dialog"). Класс is-closing тоже
    // снимается здесь: остаточный класс при повторном открытии зажимает
    // opacity в 0 и блокирует requestClose (регресс-кейс career-portal
    // «повторные циклы — без остаточных эффектов»).
    dialog.addEventListener('close', function () {
      unlockScroll();
      dialog.classList.remove(CLOSING_CLASS);
    });

    // К2: Escape → браузер шлёт cancel верхнему диалогу топ-слоя (К7);
    // уводим в анимированный путь.
    dialog.addEventListener('cancel', function (event) {
      event.preventDefault();
      requestClose(dialog);
    });

    var closers = dialog.querySelectorAll('[data-ui-spike-native-close]');
    for (var k = 0; k < closers.length; k += 1) {
      closers[k].addEventListener('click', function () {
        requestClose(dialog);
      });
    }

    dialog.setAttribute(INIT_ATTR, 'true');
  }

  function init() {
    var dialogs = document.querySelectorAll(DIALOG_SELECTOR);
    if (!dialogs.length) return; // guard отсутствия элементов (контракт T1.6)

    for (var i = 0; i < dialogs.length; i += 1) {
      try {
        initDialog(dialogs[i]);
      } catch (error) {
        window.console.warn('spike-native: ' + error.message);
      }
    }

    var openers = document.querySelectorAll(OPENER_SELECTOR);
    for (var j = 0; j < openers.length; j += 1) {
      openers[j].addEventListener('click', function () {
        var dialog = document.getElementById(this.getAttribute('data-ui-spike-native-open'));
        if (!dialog) return;
        // Safari не фокусирует кнопку кликом: «previously focused element»
        // для нативного restore остаётся body. Явный focus(opener) до
        // showModal даёт корректный restore на всей матрице (К3);
        // preventScroll — фокус не двигает страницу (К10).
        this.focus({ preventScroll: true });
        dialog.showModal(); // К1 trap, К12 блокинг фона — бесплатно
        lockScroll();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);

/*
 * pilot/career-portal/pilot.js — СКРИПТЫ ЗОНЫ САЙТА пилотного клона
 * career-portal. Интерактив компонентов (дропдауны, табы, селекты, модалки,
 * аккордеоны, VI) — модули dist/ui.min.js (window.IraoUI); здесь только
 * поведение сайт-зоны: попап «Направлений» (тексты направлений поверх
 * карусели-галереи Irao.carousel), мок-поведение форм (успех после сабмита),
 * мок-переключение aria-pressed кнопочных чипов ui-chip.
 *
 * Карусель «Производство» и фото-галерея попапа направлений с T17.7 —
 * компонент ui-carousel (data-ui-carousel / data-ui-gallery, модуль
 * IraoUI.carousel в ui.min.js): ~120 строк ES5-поведения перенесены в
 * компонент, сайт остаётся только с данными направления попапа.
 *
 * Деградация без JS: карусель показывает первый слайд (данные в разметке,
 * контролы hidden), попап направлений не открывается (кнопки остаются в
 * разметке), формы отправляются нативно. Vanilla ES5, новых зависимостей
 * нет (ADR-0005).
 */
(function () {
  'use strict';

  var ARROW = document.querySelectorAll.bind(document);

  /* ── попап «Направления деятельности»: галерея фото — IraoUI.carousel
     (data-ui-gallery), тексты направления — сайт-зона. Событие
     irao-ui:carousel-select (detail.index) синхронизирует тексты с
     перелистыванием фото (плоский JSON фото попапа = фото направлений по
     порядку); клик по карточке направления выставляет фото через
     IraoUI.carousel.select (ленивая инициализация — прецедент modal.open). ── */

  var directionsGrid = document.querySelector('[data-cp-directions]');
  if (directionsGrid) {
    var directions = [];
    // Данные — в <script> секции направлений (как в оригинале: section →
    // data-directions-data). Поиск внутри UL directionsGrid не находил
    // скрипт (он сосед секции) — тексты попапа в пилоте не обновлялись
    // никогда; при переносе галереи на компонент поиск поднят до документа.
    var dirScript = document.querySelector('[data-cp-directions-data]');
    if (dirScript) {
      try {
        directions = JSON.parse(dirScript.textContent);
      } catch {
        directions = [];
      }
    }
    var dialog = document.getElementById('cp-direction-dialog');
    var dirTitle = dialog && dialog.querySelector('[data-cp-dir-title]');
    var dirSubtitle = dialog && dialog.querySelector('[data-cp-dir-subtitle]');
    var dirText = dialog && dialog.querySelector('[data-cp-dir-text]');
    var galleryRoot = dialog && dialog.querySelector('[data-ui-gallery]');

    function renderDirection(index) {
      var item = directions[index];
      if (!item) return;
      if (dirTitle) dirTitle.textContent = item.title;
      if (dirSubtitle) dirSubtitle.textContent = item.subtitle;
      if (dirText) dirText.textContent = item.text;
    }

    if (galleryRoot) {
      galleryRoot.addEventListener('irao-ui:carousel-select', function (event) {
        renderDirection(event.detail.index);
      });
    }

    ARROW('[data-cp-direction]').forEach(function (button) {
      button.addEventListener('click', function () {
        var index = Number(button.getAttribute('data-cp-direction')) || 0;
        renderDirection(index);
        if (galleryRoot && window.IraoUI && window.IraoUI.carousel) {
          window.IraoUI.carousel.select(galleryRoot, index);
        }
        if (dialog && window.IraoUI && window.IraoUI.modal) {
          window.IraoUI.modal.open(dialog, { opener: button });
        }
      });
    });
  }

  /* ── мок-формы: сабмит → success-блок ui-form (T15.4) ──
     Порт форм.js оригинала (js/forms.js): валидируются ТОЛЬКО видимые
     обязательные поля — «скрытые условные ветки не валидируем» (блок опыта
     internship-apply скрыт, нативный checkValidity() считает и его — мок
     никогда не дошёл бы до success). Состояние ошибки — канон ui-field:
     --error на корне поля + aria-invalid на контроле (текст ошибки, где он
     есть в разметке — ui-field__error event-apply — показывает CSS ДС);
     первое невалидное видимое поле получает фокус. Отправки нет (мок,
     без бэкенда). Ввод снимает состояние ошибки; change (выбор в кастомном
     listbox ui-select шлёт ТОЛЬКО change, T15.4-бэклог) — перевалидация
     поля, как validateField в forms.js оригинала. */
  ARROW('[data-cp-form]').forEach(function (form) {
    var checkField = function (field) {
      var hidden = Boolean(field.closest('[hidden]'));
      var ok = true;
      if (!hidden) {
        var value = field.value.trim();
        // select: у опций selectField клана value="" (выбранное значение
        // уходит текстом опции) — выбор проверяем индексом, плейсхолдер
        // всегда первая опция (канон selectField, T7.3)
        if (field.tagName === 'SELECT') {
          ok = field.selectedIndex > 0;
        } else {
          ok = field.type === 'checkbox' ? field.checked : value !== '';
          if (ok && field.type === 'email') {
            ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
          }
        }
      }
      var wrap = field.closest('.ui-field');
      if (wrap) {
        wrap.classList.toggle('ui-field--error', !ok);
        if (ok) field.removeAttribute('aria-invalid');
        else field.setAttribute('aria-invalid', 'true');
      }
      return { ok: ok, hidden: hidden };
    };

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var firstError = null;
      var fields = form.querySelectorAll('[required]');
      for (var i = 0; i < fields.length; i += 1) {
        var result = checkField(fields[i]);
        if (!result.ok && !firstError && !result.hidden) firstError = fields[i];
      }
      if (firstError) {
        // Фокус — на ВИДИМЫЙ контрол (WCAG 2.4.7, T15.4-бэклог): у select
        // клана в wrap-режиме нативный select скрыт (ui-select__native,
        // opacity 0 — ui-select.css:52); фокусить построенный триггер
        // (прецедент btn.focus, ui-select.js:455). Без обёртки (без JS
        // список не построен) видим сам нативный select.
        var trigger =
          firstError.tagName === 'SELECT'
            ? firstError.closest('.ui-select') &&
              firstError.closest('.ui-select').querySelector('.ui-select__trigger')
            : null;
        (trigger || firstError).focus();
        return;
      }
      var body = form.querySelector('[data-cp-form-body]');
      var success = form.querySelector('[data-cp-form-success]');
      if (body && success) {
        body.hidden = true;
        success.hidden = false;
        var heading = success.querySelector('[tabindex="-1"]');
        if (heading && typeof heading.focus === 'function') heading.focus();
      }
    });
    var clearError = function (event) {
      var target = event.target;
      var wrap = target.closest && target.closest('.ui-field');
      if (wrap) wrap.classList.remove('ui-field--error');
      if (target.removeAttribute) target.removeAttribute('aria-invalid');
    };
    form.addEventListener('input', clearError);
    form.addEventListener('change', function (event) {
      // выбор курса в listbox: 'change' (ui-select.js:461) — снять ошибку и
      // перевалидировать select (change от других контролов тоже валиден)
      clearError(event);
      if (event.target.tagName === 'SELECT') checkField(event.target);
    });
  });

  /* ── кнопочные чипы ui-chip: мок-переключение aria-pressed (канон
       компонента: состояние — ARIA-атрибут, один слушатель на группе;
       ссылочные чипы работают нативно и в JS не нуждаются) ── */

  ARROW('[data-cp-filter-group]').forEach(function (group) {
    group.addEventListener('click', function (event) {
      var chip = event.target.closest('.ui-chip__pill');
      if (!chip || !group.contains(chip)) return;
      var pressed = group.querySelector('[aria-pressed="true"]');
      if (pressed) pressed.setAttribute('aria-pressed', 'false');
      chip.setAttribute('aria-pressed', 'true');
    });
  });

  /* ── поиск-оверлей: фокус в поле при открытии (сниппет паттерна) ── */

  var searchDialog = document.getElementById('cp-search-dialog');
  if (searchDialog) {
    searchDialog.addEventListener('irao-ui:modal-open', function () {
      var input = searchDialog.querySelector('input[type="search"]');
      if (input && typeof input.focus === 'function') input.focus();
    });
  }
})();

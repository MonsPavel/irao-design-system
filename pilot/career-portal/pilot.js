/*
 * pilot/career-portal/pilot.js — СКРИПТЫ ЗОНЫ САЙТА пилотного клона
 * career-portal. Интерактив компонентов (дропдауны, табы, селекты, модалки,
 * аккордеоны, VI) — модули dist/ui.min.js (window.IraoUI); здесь только
 * поведение сайт-зоны: карусель «Производство», попап «Направлений»,
 * мок-поведение форм (успех после сабмита), фильтры-чипы.
 *
 * Деградация без JS: карусель показывает первый слайд (данные в разметке),
 * попап направлений не открывается (кнопки остаются в разметке), формы
 * отправляются нативно. Vanilla ES5, новых зависимостей нет (ADR-0005).
 */
(function () {
  'use strict';

  var ARROW = document.querySelectorAll.bind(document);

  /* ── карусель «Производство»: данные в <script type="application/json"> ── */

  var production = document.querySelector('[data-cp-production]');
  if (production) {
    var slides = [];
    var slidesScript = production.querySelector('[data-cp-production-slides]');
    if (slidesScript) {
      try {
        slides = JSON.parse(slidesScript.textContent);
      } catch {
        slides = [];
      }
    }
    var index = 0;
    var photo = production.querySelector('[data-cp-production-photo]');
    var title = production.querySelector('[data-cp-production-title]');
    var text = production.querySelector('[data-cp-production-text]');
    var link = production.querySelector('[data-cp-production-link]');
    var tabs = production.querySelectorAll('.cp-production__tab');

    function render() {
      var slide = slides[index];
      if (!slide) return;
      if (photo) {
        photo.src = slide.photo;
        photo.alt = slide.title;
      }
      if (title) title.textContent = slide.title;
      if (text) text.textContent = slide.text;
      if (link) {
        link.textContent = 'Подробнее: ' + slide.count;
      }
      for (var i = 0; i < tabs.length; i++) {
        var selected = String(i) === String(index);
        tabs[i].setAttribute('aria-selected', selected ? 'true' : 'false');
      }
    }

    function go(step) {
      index = (index + step + slides.length) % slides.length;
      render();
    }

    var prev = production.querySelector('[data-cp-production-prev]');
    var next = production.querySelector('[data-cp-production-next]');
    if (prev)
      prev.addEventListener('click', function () {
        go(-1);
      });
    if (next)
      next.addEventListener('click', function () {
        go(1);
      });
    for (var t = 0; t < tabs.length; t++) {
      (function (tab) {
        tab.addEventListener('click', function () {
          index = Array.prototype.indexOf.call(tabs, tab);
          render();
        });
      })(tabs[t]);
    }
  }

  /* ── попап «Направления деятельности»: один ui-modal + наполнение из JSON ── */

  var directionsGrid = document.querySelector('[data-cp-directions]');
  if (directionsGrid) {
    var directions = [];
    var dirScript = directionsGrid.querySelector('[data-cp-directions-data]');
    if (dirScript) {
      try {
        directions = JSON.parse(dirScript.textContent);
      } catch {
        directions = [];
      }
    }
    var dirIndex = 0;
    var dialog = document.getElementById('cp-direction-dialog');
    var dirPhoto = dialog && dialog.querySelector('[data-cp-dir-photo]');
    var dirTitle = dialog && dialog.querySelector('[data-cp-dir-title]');
    var dirSubtitle = dialog && dialog.querySelector('[data-cp-dir-subtitle]');
    var dirText = dialog && dialog.querySelector('[data-cp-dir-text]');

    function renderDirection() {
      var item = directions[dirIndex];
      if (!item) return;
      if (dirPhoto) dirPhoto.src = item.photos[0] || '';
      if (dirTitle) dirTitle.textContent = item.title;
      if (dirSubtitle) dirSubtitle.textContent = item.subtitle;
      if (dirText) dirText.textContent = item.text;
    }

    ARROW('[data-cp-direction]').forEach(function (button) {
      button.addEventListener('click', function () {
        dirIndex = Number(button.getAttribute('data-cp-direction')) || 0;
        renderDirection();
        if (dialog && window.IraoUI && window.IraoUI.modal) {
          window.IraoUI.modal.open(dialog, { opener: button });
        }
      });
    });

    var dirPrev = dialog && dialog.querySelector('[data-cp-dir-prev]');
    var dirNext = dialog && dialog.querySelector('[data-cp-dir-next]');
    if (dirPrev) {
      dirPrev.addEventListener('click', function () {
        dirIndex = (dirIndex - 1 + directions.length) % directions.length;
        renderDirection();
      });
    }
    if (dirNext) {
      dirNext.addEventListener('click', function () {
        dirIndex = (dirIndex + 1) % directions.length;
        renderDirection();
      });
    }
  }

  /* ── мок-формы: сабмит → success-блок ui-form ── */

  ARROW('[data-cp-form]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      if (!form.checkValidity()) return; // нативная валидация остаётся
      event.preventDefault();
      var body = form.querySelector('[data-cp-form-body]');
      var success = form.querySelector('[data-cp-form-success]');
      if (body && success) {
        body.hidden = true;
        success.hidden = false;
        var heading = success.querySelector('[tabindex="-1"]');
        if (heading && typeof heading.focus === 'function') heading.focus();
      }
    });
  });

  /* ── чипы-фильтры: мок-переключение активного (GAP: нет чипа в ДС) ── */

  ARROW('[data-cp-chip-group]').forEach(function (group) {
    group.addEventListener('click', function (event) {
      var chip = event.target.closest('[data-cp-chip]');
      if (!chip || !group.contains(chip)) return;
      event.preventDefault();
      var active = group.querySelector('.is-active');
      if (active) active.classList.remove('is-active');
      chip.classList.add('is-active');
    });
  });

  /* ── модалка направления практики/стажировки: наполнение из data-атрибутов ── */

  var internDialog = document.getElementById('cp-intern-dialog');
  if (internDialog) {
    ARROW('[data-cp-intern]').forEach(function (card) {
      card.addEventListener('click', function () {
        var title = internDialog.querySelector('[data-cp-intern-title]');
        var short = internDialog.querySelector('[data-cp-intern-short]');
        var photo = internDialog.querySelector('[data-cp-intern-photo]');
        if (title) title.textContent = card.getAttribute('data-title') || '';
        if (short) short.textContent = card.getAttribute('data-short') || '';
        if (photo) photo.src = card.getAttribute('data-image') || '';
        if (window.IraoUI && window.IraoUI.modal) {
          window.IraoUI.modal.open(internDialog, { opener: card });
        }
      });
    });
  }

  /* ── поиск-оверлей: фокус в поле при открытии (сниппет паттерна) ── */

  var searchDialog = document.getElementById('cp-search-dialog');
  if (searchDialog) {
    searchDialog.addEventListener('irao-ui:modal-open', function () {
      var input = searchDialog.querySelector('input[type="search"]');
      if (input && typeof input.focus === 'function') input.focus();
    });
  }
})();

/**
 * Метаданные доки ui-skip-link (шаблон T10.1; прогон T10.2): машинные части
 * страницы + карта «секция шаблона → ## заголовок README.md». Тексты живут
 * в README компонента (один источник), здесь — только сопоставление и то,
 * чего в README нет: клавиатурная таблица, ARIA-список, чек-лист
 * скринридера, версия/changelog. Контракт формы — showcase/docs-template.mjs;
 * чек-лист — CONTRIBUTING.md.
 */
export default {
  readme: {
    states: ['Состояния'],
    a11y: ['Клавиатура и a11y'],
    api: ['API'],
    doDont: ["Do / Don't"],
    extra: ['VI-режим (EPIC-9)', 'Bitrix (header.php)'],
  },

  keyboard: [
    {
      keys: 'Tab (первый на странице)',
      action:
        'Фокус на skip-link — фиксированная плашка top-left (z-уровень оверлеев); появление мгновенное, без анимации',
    },
    {
      keys: 'Enter',
      action:
        'Переход к #main: tabindex="-1" на цели обязателен — фокус переносится реально (иначе хэш меняется, activeElement уходит на body — зонд chromium, пин e2e)',
    },
  ],

  aria: [
    {
      what: 'нативная `<a href="#main">` без ARIA',
      why: 'роль/имя объявляет платформа; скринридер видит ссылку первым элементом страницы',
    },
    {
      what: 'sr-only-клип до фокуса (не display: none)',
      why: 'ссылка скрыта визуально, но остаётся в дереве доступности и Tab-порядке',
    },
    {
      what: '`tabindex="-1"` на цели (main)',
      why: 'программная фокусируемость цели без входа в Tab-порядок; стандартное решение переноса фокуса',
    },
  ],

  screenReader: {
    source: 'docs/ui-system/a11y/screen-reader-protocol.md',
    note: 'поведение в NVDA/VoiceOver — протокол T9.2; контракт «Tab → Enter → фокус в main» пинят e2e-сценарии',
    rows: [
      {
        scenario: 'Первый Tab страницы',
        expect: '«Перейти к основному содержимому, ссылка» — первая остановка, до шапки и меню',
        pin: 'tests/e2e/skip-link.spec.js',
      },
      {
        scenario: 'Enter на skip-link',
        expect: 'activeElement внутри main — скринридер/клавиатура продолжают с контента',
        pin: 'tests/e2e/skip-link.spec.js',
      },
      {
        scenario: 'До фокуса',
        expect: 'Ссылка присутствует в дереве доступности при скрытости визуально (клип)',
        pin: 'tests/e2e/skip-link.spec.js',
      },
    ],
  },

  schema: null,

  version: {
    introduced: '0.1.0',
    task: 'T3.5',
    changelog: [
      {
        version: '0.1.0',
        change:
          'Введение компонента (WCAG 2.4.1; закрытие пробела аудита career-portal): sr-only-клип до фокуса, ' +
          'плашка top-left в фокусе, правило «цель #main с tabindex="-1"», валидация пары «ссылка + цель» ' +
          'в selfChecks сборки.',
      },
    ],
  },
};

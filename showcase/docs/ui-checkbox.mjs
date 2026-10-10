/**
 * Метаданные доки ui-checkbox (шаблон T10.1; прогон T10.2): машинные части
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
    extra: ['Ссылка внутри label (паттерн согласия)', 'Известные границы'],
  },

  keyboard: [
    {
      keys: 'Tab / Shift+Tab',
      action: 'Фокус на нативном инпуте; видимый фокус — нативный рендер браузера',
    },
    {
      keys: 'Space',
      action:
        'Переключение фокусированного чекбокса; клик по тексту label переключает так же — без JS',
    },
  ],

  aria: [
    {
      what: 'нативный `input[type="checkbox"]` без подмен',
      why: 'роль/состояние «включён» объявляет платформа; кастомные коробки (класс D аудита career-portal) запрещены',
    },
    {
      what: 'имя = содержимое label',
      why: 'текст ошибки кладётся ВНЕ label (aria-describedby на его id) — иначе скринридер зачитает ошибку как имя',
    },
    {
      what: '`aria-invalid` + `aria-describedby` на инпуте',
      why: 'ошибка живёт на обвязке ui-field--error и связывается с инпутом; `__error` с role="alert" объявляется при вставке',
    },
    {
      what: '`accent-color: var(--ui-color-primary)`',
      why: 'отметка красится токеном — темы и VI-режим работают без правки компонента',
    },
  ],

  screenReader: {
    source: 'docs/ui-system/a11y/screen-reader-protocol.md',
    note: 'контракт «имя из label, ошибка вне label» пинят авто-сценарии формы ниже',
    rows: [
      {
        scenario: 'Tab к чекбоксу',
        expect: '«Я даю согласие на обработку персональных данных, чекбокс» — имя из label со ссылкой внутри',
        pin: 'tests/e2e/ui-forms.spec.js',
      },
      {
        scenario: 'Space на чекбоксе',
        expect: 'Переключение с объявлением состояния; ссылка политики внутри label кликом не переключает',
        pin: 'tests/e2e/ui-forms.spec.js',
      },
      {
        scenario: 'Чекбокс с ошибкой',
        expect: 'Ошибка объявляется `__error` (role="alert") и связывается aria-describedby — не как имя чекбокса',
        pin: 'tests/e2e/ui-forms.spec.js',
      },
    ],
  },

  schema: null,

  version: {
    introduced: '0.1.0',
    task: 'T5.2',
    changelog: [
      {
        version: '0.1.0',
        change:
          'Введение компонента: label-обёртка нативного инпута (accent-color primary), инпут прижат к верху ' +
          '(паттерн согласия career-portal), ссылка политики внутри label, групповая раскладка колонкой.',
      },
    ],
  },
};

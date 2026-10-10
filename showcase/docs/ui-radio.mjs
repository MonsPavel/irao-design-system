/**
 * Метаданные доки ui-radio (шаблон T10.1; прогон T10.2): машинные части
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
    extra: ['Известные границы'],
  },

  keyboard: [
    {
      keys: 'Стрелки ←→↑↓',
      action:
        'Нативный roving по группе: выбор и фокус переходят к следующему/предыдущему варианту без JS и tabindex (e2e-пин ui-forms)',
    },
    {
      keys: 'Tab',
      action:
        'В группу вход один раз — на выбранный вариант (нативно); одиночное радио вне группы не используется',
    },
    {
      keys: 'Space / клик',
      action: 'Выбор ярлыка — label-обёртка нативна; взаимоисключение даёт общий name группы',
    },
  ],

  aria: [
    {
      what: 'нативный `input[type="radio"]` без подмен',
      why: 'состояние «включена» и роль объявляет платформа; своя точка = потеря клавиатуры и скринридера',
    },
    {
      what: 'общий `name` у вариантов группы',
      why: 'нативная взаимоисключающая группа; имя группы даёт legend (ui-radio-group)',
    },
    {
      what: '`accent-color: var(--ui-color-primary)`',
      why: 'точка красится токеном — темы и VI-режим работают сами',
    },
  ],

  screenReader: {
    source: 'docs/ui-system/a11y/screen-reader-protocol.md',
    note: 'контракт группы («имя ярлыка + имя группы из legend») пинят авто-сценарии формы ниже',
    rows: [
      {
        scenario: 'Обход группы стрелками',
        expect:
          '«Полная занятость, радио-кнопка, включена, 1 из 2, Формат работы» — имя ярлыка, состояние и имя группы нативно',
        pin: 'tests/e2e/ui-forms.spec.js',
      },
      {
        scenario: 'Клик по тексту ярлыка',
        expect: 'Выбор варианта как по инпуту (label-обёртка)',
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
          'Введение компонента: label-обёртка нативного радио (accent-color primary), inline-flex ярлык 20px, ' +
          'шаг --ui-radio-gap 10px одобренного .radio; группа — ui-radio-group.',
      },
    ],
  },
};

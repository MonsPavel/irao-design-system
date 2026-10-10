/**
 * Метаданные доки ui-button (шаблон T10.1): машинные части страницы + карта
 * «секция шаблона → ## заголовок README.md». Тексты живут в README компонента
 * (один источник), здесь — только сопоставление и то, чего в README нет:
 * клавиатурная таблица, ARIA-список, чек-лист скринридера, версия/changelog.
 * Контракт формы — showcase/docs-template.mjs; чек-лист — CONTRIBUTING.md.
 */
export default {
  readme: {
    states: ['Варианты и состояния'],
    a11y: ['Клавиатура и a11y'],
    api: ['API'],
    doDont: ["Do / Don't: действие против перехода"],
    extra: ['Bitrix (шаблоны)', 'Известные границы'],
  },

  keyboard: [
    {
      keys: 'Tab',
      action: 'Фокус на кнопке; видимый фокус — глобальный outline политики ADR-0001',
    },
    {
      keys: 'Enter / Space',
      action:
        'Нажатие — нативный `button`. В `is-loading` повторные клавиатурные отправки ' +
        'перехватывает управляющий модуль формы (T5.5) по `aria-busy` — сам компонент JS не содержит',
    },
  ],

  aria: [
    {
      what: '`<button>` с явным `type`',
      why: 'умолчание submit отправит чужую форму; гейт html-validate `no-implicit-button-type` (warning)',
    },
    {
      what: '`is-loading` + `aria-busy="true"`',
      why: 'состояние загрузки объявляется скринридеру; лейбл остаётся в DOM — accessible name неизменен',
    },
    {
      what: '`aria-hidden="true"` на `__icon` и `__spinner`',
      why: 'декоративные элементы не озвучиваются; цвет — `currentColor` от подписи варианта',
    },
    {
      what: 'атрибут `disabled`',
      why: 'нативное состояние: скринридер объявляет «недоступна», фокус и клики браузер выключает сам (класс-имитация запрещена)',
    },
  ],

  screenReader: {
    source: 'docs/ui-system/a11y/screen-reader-protocol.md',
    note:
      'отдельных сценариев для кнопки протокол не заводит — контракт «имя, роль, состояние» ' +
      'пинят авто-сценарии ниже',
    rows: [
      {
        scenario: 'Tab к кнопке',
        expect: '«Отправить отклик, кнопка» — имя из подписи, роль нативная; ARIA не дублирует',
        pin: 'tests/e2e/ui-button.spec.js',
      },
      {
        scenario: 'Enter / Space на кнопке',
        expect: 'Активация без лишних объявлений; иконка и спиннер не озвучиваются (aria-hidden)',
        pin: 'tests/e2e/ui-button.spec.js',
      },
      {
        scenario: 'Кнопка с атрибутом disabled',
        expect: '«Отправить отклик, кнопка, недоступна» — состояние объявляется нативно',
        pin: 'tests/e2e/ui-button.spec.js',
      },
      {
        scenario: 'is-loading + aria-busy',
        expect: 'Имя кнопки неизменно (лейбл скрыт клипом, но в DOM); спиннер декоративен',
        pin: 'tests/e2e/ui-button.spec.js',
      },
    ],
  },

  schema: null,

  version: {
    introduced: '0.1.0',
    task: 'T4.2',
    changelog: [
      {
        version: '0.1.0',
        change:
          'Введение компонента (эталон компонентного цикла): 4 варианта одобренного дизайна ' +
          'career-portal, 2 размера, состояния disabled/loading, граница «действие против ' +
          "перехода» (do/don't).",
      },
    ],
  },
};

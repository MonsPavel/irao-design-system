/**
 * Метаданные доки ui-radio-group (шаблон T10.1; прогон T10.2): машинные части
 * страницы + карта «секция шаблона → ## заголовок README.md». Тексты живут
 * в README компонента (один источник), здесь — только сопоставление и то,
 * чего в README нет: клавиатурная таблица, ARIA-список, чек-лист
 * скринридера, версия/changelog. Контракт формы — showcase/docs-template.mjs;
 * чек-лист — CONTRIBUTING.md.
 */
export default {
  readme: {
    states: ['Связность ошибки группы (Accessibility requirements T5.2)'],
    a11y: ['Клавиатура и a11y'],
    api: ['API'],
    doDont: ["Do / Don't"],
    extra: ['Известные границы'],
  },

  keyboard: [
    {
      keys: 'Стрелки ←→↑↓',
      action: 'Нативный roving по вариантам группы — без JS и tabindex',
    },
    {
      keys: 'Tab',
      action: 'В группу — одна остановка (на выбранный вариант), нативно',
    },
  ],

  aria: [
    {
      what: '`fieldset` + `legend`',
      why: 'имя («Формат работы») и роль group скринридер объявляет сам, без ARIA; legend — первый ребёнок, обязательна',
    },
    {
      what: '`aria-describedby` на fieldset (списком hint error)',
      why: 'описание связано с ГРУППОЙ, а не с отдельной кнопкой; объявляется после имени группы',
    },
    {
      what: 'ошибка — `__error` с role="alert" на обвязке',
      why: 'групповой aria-invalid не существует: сигнал ошибки несёт текст обвязки (ui-field--error)',
    },
    {
      what: 'required-маркер в legend',
      why: 'звёздочка aria-hidden + текст «обязательное поле» — смысл не только цветом/знаком (WCAG 1.4.1)',
    },
  ],

  screenReader: {
    source: 'docs/ui-system/a11y/screen-reader-protocol.md',
    note: 'контракт группы (legend + описания на fieldset) пинят авто-сценарии формы ниже',
    rows: [
      {
        scenario: 'Вход в группу',
        expect: '«Формат работы, группировка» + выбранный вариант — имя из legend, роль group нативная',
        pin: 'tests/e2e/ui-forms.spec.js',
      },
      {
        scenario: 'Группа с hint и ошибкой',
        expect: 'После имени группы объявляются подсказка и ошибка (aria-describedby списком, hint первым)',
        pin: 'tests/e2e/ui-forms.spec.js',
      },
      {
        scenario: 'Ошибка группы',
        expect: '«Выберите формат работы» — role="alert" обвязки объявляет при вставке',
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
          'Введение компонента: fieldset/legend без ARIA-костылей, раскладка radio-row (24px) с переносом, ' +
          'связность ошибки группы (aria-describedby на fieldset), гейт irao/radio-group-fieldset.',
      },
    ],
  },
};

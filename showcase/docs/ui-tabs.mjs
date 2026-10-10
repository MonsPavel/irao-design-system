/**
 * Метаданные доки ui-tabs (шаблон T10.1; прогон T10.2): машинные части
 * страницы + карта «секция шаблона → ## заголовок README.md». Тексты живут
 * в README компонента (один источник), здесь — только сопоставление и то,
 * чего в README нет: клавиатурная таблица, ARIA-список, чек-лист
 * скринридера, версия/changelog. Контракт формы — showcase/docs-template.mjs;
 * чек-лист — CONTRIBUTING.md.
 */
export default {
  readme: {
    states: ['Деградация без JS'],
    a11y: ['Клавиатура — чек-лист APG tabs (проверено e2e)', 'A11y'],
    api: ['API'],
    doDont: ["Do / Don't"],
    extra: ['JSON-паттерн данных (кейс Bitrix)', 'Известные границы'],
  },

  keyboard: [
    {
      keys: '← / →',
      action:
        'Automatic-активация: фокус и выбор переходят вместе, с зацикливанием (решение спеки — проще для скринридеров)',
    },
    { keys: 'Home / End', action: 'Первый / последний таб (automatic)' },
    {
      keys: 'Tab',
      action:
        'С активного таба — в активную панель (roving tabindex: у активного 0, у остальных −1); панель — tabindex="0"',
    },
    { keys: 'Shift+Tab', action: 'Из панели — назад на активный таб' },
    {
      keys: 'Клик',
      action: 'Выбрать таб; якорный прыжок ссылки отменяется (href нужен только деградации)',
    },
  ],

  aria: [
    {
      what: 'полный APG-набор — ставит модуль',
      why: 'role="tablist" → role="tab" (aria-selected, aria-controls) → role="tabpanel" + aria-labelledby: в разметке их нет (деградация без JS — все панели видимы)',
    },
    {
      what: '`aria-selected` ровно один true',
      why: 'выбор фиксируется атрибутом; CSS активного — :where([aria-selected="true"]), класса-дубля нет',
    },
    {
      what: 'id-связки tab↔panel (гейт irao/tabs-id-links)',
      why: 'панель объявляется именем таба при переключении; инстанс без связки не инициализируется',
    },
    {
      what: 'панель `hidden` неактивным — ставит модуль',
      why: 'скрытые панели исключены из Tab-обхода; без JS hidden нет — потери контента нет',
    },
  ],

  screenReader: {
    source: 'docs/ui-system/a11y/screen-reader-protocol.md',
    note: 'клавиатурный чек-лист APG tabs пинят e2e-сценарии ниже',
    rows: [
      {
        scenario: 'Tab к ленте',
        expect: '«Я учусь в колледже, вкладка, выбрана, 1 из 2» — roving: одна остановка на ленте',
        pin: 'tests/e2e/ui-tabs.spec.js',
      },
      {
        scenario: 'Стрелка →',
        expect:
          'Выбор переходит к следующему табу, панель объявляется его именем (automatic-активация)',
        pin: 'tests/e2e/ui-tabs.spec.js',
      },
      {
        scenario: 'Tab с активного таба',
        expect: 'Фокус в активной панели (содержимое панели достижимо из обхода)',
        pin: 'tests/e2e/ui-tabs.spec.js',
      },
      {
        scenario: 'Без JS',
        expect: 'Все панели видимы и читаемы потоком — потери контента нет',
        pin: 'tests/e2e/ui-tabs.spec.js',
      },
    ],
  },

  schema: null,

  version: {
    introduced: '0.1.0',
    task: 'T6.2',
    changelog: [
      {
        version: '0.1.0',
        change:
          'Введение компонента (класс B career-portal, tracks.js): APG tabs с automatic-активацией, roving ' +
          'tabindex, деградация без JS (табы-ссылки на якоря панелей), событие irao-ui:tabs-select, гейт ' +
          'irao/tabs-id-links.',
      },
    ],
  },
};

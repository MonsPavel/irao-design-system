/**
 * Метаданные доки ui-dropdown (шаблон T10.1; прогон T10.2): машинные части
 * страницы + карта «секция шаблона → ## заголовок README.md». Тексты живут
 * в README компонента (один источник), здесь — только сопоставление и то,
 * чего в README нет: клавиатурная таблица, ARIA-список, чек-лист
 * скринридера, версия/changelog. Контракт формы — showcase/docs-template.mjs;
 * чек-лист — CONTRIBUTING.md.
 */
export default {
  readme: {
    states: ['Деградация без JS', 'Позиционирование'],
    a11y: ['Клавиатура — чек-лист APG menu-button (проверено e2e)', 'A11y'],
    api: ['API'],
    doDont: ["Do / Don't"],
    extra: ['Aria-current по URL (хелпер)', 'Bitrix (шаблоны)', 'Известные границы'],
  },

  keyboard: [
    { keys: 'Enter / Space (триггер)', action: 'Открыть меню, фокус на первый пункт (APG menu-button)' },
    { keys: 'ArrowDown / ArrowUp (триггер)', action: 'Открыть меню, фокус на первый / последний пункт' },
    { keys: 'ArrowDown / ArrowUp (в меню)', action: 'Перемещение по пунктам с зацикливанием' },
    { keys: 'Home / End (в меню)', action: 'Первый / последний пункт' },
    {
      keys: 'Escape',
      action:
        'Закрыть с возвратом фокуса на триггер; слушатель документа — работает и при фокусе вне инстанса',
    },
    {
      keys: 'Tab / Shift+Tab',
      action: 'Закрыть меню, фокус уходит по естественному порядку (пункты скрыты hidden и пропускаются)',
    },
  ],

  aria: [
    {
      what: '`aria-expanded`/`aria-controls` на триггере — ставит модуль',
      why: 'в разметке атрибутов нет: без JS меню всегда раскрыто, атрибуты не лгут (деградация)',
    },
    {
      what: 'два назначения: `<nav>` или `role="menu"`',
      why: 'навигация остаётся списком ссылок скринридера; menu-роль — только для команд (скринридер ждёт командную клавиатуру APG). Смешивать нельзя',
    },
    {
      what: 'возврат фокуса на триггер (Escape, активация menuitem)',
      why: 'правило «кто открыл — тот получает фокус обратно»; открытие одного меню закрывает другие',
    },
    {
      what: '`aria-hidden` на шевроне, `is-open` — только в цепочке блока',
      why: 'декоративный индикатор не озвучивается; состояние — на блоке, не на голом классе',
    },
  ],

  screenReader: {
    source: 'docs/ui-system/a11y/screen-reader-protocol.md',
    note: 'клавиатурный чек-лист APG menu-button пинят e2e-сценарии ниже',
    rows: [
      {
        scenario: 'Открытие (Enter на триггере)',
        expect: 'Триггер объявляет aria-expanded="true"; фокус — на первом пункте меню',
        pin: 'tests/e2e/ui-dropdown.spec.js',
      },
      {
        scenario: 'Навигационное меню',
        expect: 'Пункты — ссылки в списке ссылок (nav > ul > li > a), без menu-роли',
        pin: 'tests/e2e/ui-dropdown.spec.js',
      },
      {
        scenario: 'Командное меню',
        expect: '«Действия с записью, меню» — role="menu" с пунктов menuitem; активация возвращает фокус на триггер',
        pin: 'tests/e2e/ui-dropdown.spec.js',
      },
      {
        scenario: 'Escape',
        expect: 'Меню закрыто (aria-expanded="false"), фокус вернулся на триггер',
        pin: 'tests/e2e/ui-dropdown.spec.js',
      },
    ],
  },

  schema: null,

  version: {
    introduced: '0.1.0',
    task: 'T6.1',
    changelog: [
      {
        version: '0.1.0',
        change:
          'Введение компонента (класс B career-portal): два назначения (nav / role="menu") по APG menu-button, ' +
          'клавиатурный цикл, вне-клик, Escape с возвратом фокуса, деградация без JS (атрибуты ставит модуль), ' +
          'события irao-ui:dropdown-open/close.',
      },
    ],
  },
};

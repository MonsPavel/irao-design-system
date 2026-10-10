/**
 * Метаданные доки ui-select (шаблон T10.1; прогон T10.2): машинные части
 * страницы + карта «секция шаблона → ## заголовок README.md». Тексты живут
 * в README компонента (один источник), здесь — только сопоставление и то,
 * чего в README нет: клавиатурная таблица, ARIA-список, чек-лист
 * скринридера, версия/changelog. Контракт формы — showcase/docs-template.mjs;
 * чек-лист — CONTRIBUTING.md.
 */
export default {
  readme: {
    states: ['Деградация без JS', 'Синхронизация'],
    a11y: ['Клавиатура — чек-лист APG listbox (проверено e2e)', 'A11y'],
    api: ['API'],
    doDont: ["Do / Don't"],
    extra: ['Мобильная стратегия — [ADR-0012](../../docs/adr/0012-select-pointer-coarse.md)', 'Bitrix (шаблоны)', 'Известные границы'],
  },

  keyboard: [
    { keys: 'Enter / Space (триггер)', action: 'Открыть список, фокус на выбранной опции (open() career-portal)' },
    { keys: 'ArrowDown / ArrowUp (закрытый триггер)', action: 'Открыть, фокус на выбранной опции' },
    {
      keys: 'ArrowDown / ArrowUp (в списке)',
      action: 'Соседняя опция без зацикливания (APG listbox); disabled пропускается',
    },
    { keys: 'Home / End', action: 'Первая / последняя доступная опция' },
    {
      keys: 'Печатный символ',
      action:
        'Typeahead по первой букве с циклом; disabled не матчится (чистая функция typeaheadIndex)',
    },
    {
      keys: 'Enter / Space (на опции)',
      action: 'Выбрать: value синхронизован, change (bubbles), список закрыт, фокус на триггере',
    },
    {
      keys: 'Escape',
      action:
        'Закрыть, фокус на триггер; слушатель документа — работает и при фокусе вне инстанса',
    },
    { keys: 'Tab', action: 'Закрыть список, фокус уходит по естественному порядку (select вне Tab-порядка)' },
  ],

  aria: [
    {
      what: '`aria-haspopup="listbox"` + `aria-expanded` + `aria-controls` на триггере — ставит модуль',
      why: 'в разметке атрибутов нет: без JS select не скрыт и не тронут, разметка правдива',
    },
    {
      what: 'имя поля: label[for] → aria-labelledby триггера; label-обёртка → aria-label чистым текстом',
      why: 'наивный textContent обёртки дал бы весь список опций; нюанс схем и юнит-пины — в README (A11y)',
    },
    {
      what: 'опции — `<button role="option">` + aria-selected',
      why: 'фокус настоящий, без roving/activedescendant (перенос career-portal); aria-selected — правда состояния select',
    },
    {
      what: '`<optgroup>` → role="group" + aria-label',
      why: 'ARIA 1.1: группы внутри listbox; заголовок группы виден',
    },
    {
      what: 'нативный select — opacity 0 + tabindex="-1" (ставит модуль)',
      why: 'остаётся форм-контролом и элементом a11y-дерева, но не даёт двойной таб-остановки',
    },
  ],

  screenReader: {
    source: 'docs/ui-system/a11y/screen-reader-protocol.md',
    note: 'клавиатурный чек-лист APG listbox пинят e2e-сценарии; схема имени поля — юнит-пины обоих случаев (ревью T7.3)',
    rows: [
      {
        scenario: 'Открытие списка',
        expect: '«Город, комбинированный список, развёрнуто» — имя из label, состояние триггера синхронно',
        pin: 'tests/e2e/ui-select.spec.js',
      },
      {
        scenario: 'Выбор опции',
        expect: 'Имя триггера отражает выбор; нативный change объявляется обработчикам формы как от нативного контрола',
        pin: 'tests/e2e/ui-select.spec.js',
      },
      {
        scenario: 'Typeahead',
        expect: 'Переход к следующей опции на букву; disabled не матчится',
        pin: 'tests/e2e/ui-select.spec.js',
      },
      {
        scenario: 'pointer: coarse',
        expect: 'Кастомный список не строится — системный пикер ОС (ADR-0012)',
        pin: 'tests/e2e/ui-select.spec.js',
      },
    ],
  },

  schema: null,

  version: {
    introduced: '0.1.0',
    task: 'T7.3',
    changelog: [
      {
        version: '0.1.0',
        change:
          'Введение компонента (класс B career-portal, dropdowns.js): listbox-button по APG поверх живого ' +
          'нативного select, синхронизация обе стороны с change (bubbles), typahead, optgroup → role="group", ' +
          'pointer:coarse — нативный пикер (ADR-0012), деградация без JS.',
      },
    ],
  },
};

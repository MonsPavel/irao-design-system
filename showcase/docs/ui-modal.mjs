/**
 * Метаданные доки ui-modal (шаблон T10.1): карта «секция шаблона → ## заголовок
 * README.md» + машинные части страницы. Тексты живут в README компонента;
 * контракт формы — showcase/docs-template.mjs, чек-лист — CONTRIBUTING.md.
 */
export default {
  readme: {
    states: ['Деградация без JS', 'Поведение модуля (что платформа не даёт)'],
    a11y: ['Клавиатура — dialog-чек-лист (проверено e2e)', 'A11y'],
    api: ['API'],
    doDont: ["Do / Don't"],
    extra: ['Вложенные модалки (док-заметка)', 'Bitrix (шаблоны)', 'Известные границы'],
  },

  keyboard: [
    {
      keys: 'Enter на триггере',
      action:
        'Открыть; фокус внутри диалога — на `__close` (перенос career-portal `closeButton.focus`)',
    },
    {
      keys: 'Tab / Shift+Tab',
      action:
        'Цикл фокуса ведёт браузер (top-layer): фоновые элементы недостижимы. Нюанс К1 ADR-0011: ' +
        'на границе диалога фокус на один шаг уходит на `body` и возвращается',
    },
    {
      keys: 'Escape',
      action:
        'Закрыть (событие `cancel` → модуль закрывает анимированно); со скринридером диалог ' +
        'объявляется закрытым',
    },
    {
      keys: 'Закрытие любым способом',
      action: 'Фокус возвращается на опенера (нативный restore + явный `focus(opener)`)',
    },
  ],

  aria: [
    {
      what: 'native `<dialog>` + `showModal()`',
      why: 'роль dialog, `aria-modal`, focus trap, Escape и инертность фона — платформа; ARIA не дублируется',
    },
    {
      what: '`aria-labelledby` → `__title`',
      why: 'скринридер объявляет «диалог, Заголовок»; модуль генерирует id, если в разметке нет',
    },
    {
      what: '`aria-label="Закрыть"` на `__close`',
      why: 'иконка-крест декоративна (`aria-hidden`); доступное имя несёт кнопка',
    },
    {
      what: '`aria-hidden` фону НЕ ставится',
      why: 'top-layer блокирует клики и фокус сам; ручная простановка по детям body ломает restore (поймано в T7.1)',
    },
    {
      what: '`open` в разметке (деградация)',
      why: 'без JS диалог показан инлайном, контент доступен; модуль снимает `open` при инициализации (К9 ADR-0011)',
    },
  ],

  screenReader: {
    source: 'docs/ui-system/a11y/screen-reader-protocol.md',
    note: 'сценарии M1–M4 матрицы §3.3',
    rows: [
      {
        scenario: 'Enter на триггере (M1)',
        expect:
          '«Заголовок модалки, диалог» (`aria-labelledby`), фокус на кнопке «Закрыть»',
        pin: 'tests/e2e/ui-modal.spec.js',
      },
      {
        scenario: 'Tab / Shift+Tab внутри диалога (M2)',
        expect: 'Цикл фокуса замкнут (top layer), фон недоступен для фокуса и чтения',
        pin: 'tests/e2e/ui-modal.spec.js',
      },
      {
        scenario: 'Escape и повторное открытие (M3)',
        expect:
          'Диалог закрыт, фокус возвращён на триггер; повторный цикл без остаточных состояний',
        pin: 'tests/e2e/ui-modal.spec.js',
      },
      {
        scenario: 'Деградация без JS (M4)',
        expect: 'Диалог с `open` в разметке показан инлайн, контент читается',
        pin: 'tests/e2e/ui-modal.spec.js',
      },
    ],
  },

  schema: null,

  version: {
    introduced: '0.1.0',
    task: 'T7.2',
    changelog: [
      {
        version: '0.1.0',
        change:
          'Введение ([ADR-0011](docs/adr/0011-modal-native-dialog.md)): native `<dialog>` + ' +
          '`showModal()`, модификаторы `--sm`/`--md`/`--full`, анимация закрытия, скролл-лок ' +
          'без сдвига макета, события `irao-ui:modal-open`/`irao-ui:modal-close`.',
      },
    ],
  },
};

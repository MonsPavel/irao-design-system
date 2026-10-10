/**
 * Метаданные доки ui-link (шаблон T10.1; прогон T10.2): машинные части
 * страницы + карта «секция шаблона → ## заголовок README.md». Тексты живут
 * в README компонента (один источник), здесь — только сопоставление и то,
 * чего в README нет: клавиатурная таблица, ARIA-список, чек-лист
 * скринридера, версия/changelog. Контракт формы — showcase/docs-template.mjs;
 * чек-лист — CONTRIBUTING.md.
 */
export default {
  readme: {
    states: ['Варианты и состояния'],
    a11y: ['Клавиатура и a11y'],
    api: ['API'],
    doDont: ["Do / Don't: ссылка vs кнопка"],
    extra: ['Правила особых случаев', 'Bitrix (шаблоны)', 'Известные границы'],
  },

  keyboard: [
    {
      keys: 'Tab / Shift+Tab',
      action:
        'Фокус на ссылке; видимый фокус — глобальный outline политики ADR-0001, компонент его не заменяет',
    },
    {
      keys: 'Enter',
      action: 'Переход по адресу — нативная ссылка. Space ссылку не активирует (отличие от кнопки)',
    },
  ],

  aria: [
    {
      what: '`<a href>` — нативная семантика',
      why: 'роль link объявляется платформой; ссылка слышна в списке ссылок скринридера — ARIA не дублирует',
    },
    {
      what: '`aria-hidden="true"` + `focusable="false"` на `__icon`',
      why: 'декоративная иконка не озвучивается и не застревает в IE-подобных Tab-обходах; цвет — `currentColor` от текста',
    },
    {
      what: '`aria-label` на icon-only ссылке',
      why: 'доступное имя описывает назначение; гейт html-validate `irao/link-accessible-name` (warning)',
    },
    {
      what: '`--button`: вид кнопки, семантика ссылки',
      why: 'скринридер объявит «ссылку» — Enter ведёт, Space не активирует; расхождение вида и роли — осознанное (do/don\'t)',
    },
  ],

  screenReader: {
    source: 'docs/ui-system/a11y/screen-reader-protocol.md',
    note: 'отдельных сценариев для ссылки протокол не заводит — контракт «имя, роль, состояние» пинят авто-сценарии ниже',
    rows: [
      {
        scenario: 'Tab к ссылке',
        expect:
          '«Смотреть вакансии, ссылка» — имя из текста (или aria-label у icon-only); фокус виден по глобальному outline',
        pin: 'tests/e2e/ui-link.spec.js',
      },
      {
        scenario: 'Enter на ссылке',
        expect: 'Переход по адресу; повторное объявление роли — без сюрпризов нативной семантики',
        pin: 'tests/e2e/ui-link.spec.js',
      },
      {
        scenario: 'Ссылка с иконкой',
        expect: 'Иконка не озвучивается (aria-hidden); в объявлении только текст ссылки',
        pin: 'tests/e2e/ui-link.spec.js',
      },
      {
        scenario: 'Список ссылок страницы (NVDA: Insert+F7)',
        expect:
          'Имена описывают назначение — без «нажмите здесь» и голых URL (правило do/don\'t, читается в списке ссылок)',
        pin: 'tests/e2e/ui-link.spec.js',
      },
    ],
  },

  schema: null,

  version: {
    introduced: '0.1.0',
    task: 'T4.1',
    changelog: [
      {
        version: '0.1.0',
        change:
          'Введение компонента: варианты default/--on-dark/--button, подчёркивание как фикс бренда (различимость ' +
          "без цвета, WCAG 1.4.1), правила внешних/файловых/анкорных ссылок, гейты noopener и accessible-name.",
      },
    ],
  },
};

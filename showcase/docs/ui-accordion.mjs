/**
 * Метаданные доки ui-accordion (шаблон T10.1; прогон T10.2): машинные части
 * страницы + карта «секция шаблона → ## заголовок README.md». Тексты живут
 * в README компонента (один источник), здесь — только сопоставление и то,
 * чего в README нет: клавиатурная таблица, ARIA-список, чек-лист
 * скринридера, версия/changelog. Контракт формы — showcase/docs-template.mjs;
 * чек-лист — CONTRIBUTING.md.
 */
export default {
  readme: {
    states: ['Режим «один открыт» (single)', 'Деградация без JS'],
    a11y: ['Клавиатура — чек-лист (нативная, проверено e2e)'],
    api: ['API'],
    doDont: ["Do / Don't"],
    extra: [
      'Анимация `<details>` — зафиксированное решение (AC)',
      'schema.org FAQPage — когда уместно',
      'Известные границы',
    ],
  },

  keyboard: [
    {
      keys: 'Tab / Shift+Tab',
      action:
        'Вопрос (summary) — обычный таб-стоп; из открытого ответа фокус идёт по его содержимому',
    },
    {
      keys: 'Enter / Space',
      action: 'Раскрыть/свернуть вопрос — нативная семантика details/summary, без JS и ARIA',
    },
  ],

  aria: [
    {
      what: 'без ARIA (никаких aria-expanded/ролей)',
      why: 'details/summary объявляют раскрыватель и состояние сами; дублирующие атрибуты путают скринридеры',
    },
    {
      what: 'состояние — нативный атрибут `open`',
      why: 'стартово раскрытый пункт задаётся в разметке и правдив без JS; is-open в CSS нет — источник правды [open]',
    },
    {
      what: '`aria-hidden` на шевроне `__icon`',
      why: 'индикатор декоративен; имя вопроса — прямой текст summary',
    },
    {
      what: 'фокус-обводка — политика ADR-0001',
      why: 'base/focus.css содержит summary:focus-visible; компонент outline не гасит и не заменяет',
    },
  ],

  screenReader: {
    source: 'docs/ui-system/a11y/screen-reader-protocol.md',
    note: 'нативная семантика details/summary; ниже — авто-пины контракта (e2e-чек-лист клавиатуры)',
    rows: [
      {
        scenario: 'Tab к вопросу',
        expect: '«Работает ли аккордеон без JavaScript, кнопка раскрытия/раскрыто» — нативное объявление details',
        pin: 'tests/e2e/ui-accordion.spec.js',
      },
      {
        scenario: 'Enter на вопросе',
        expect: 'Раскрытие/сворачивание с нативным объявлением состояния; шеврон не озвучивается',
        pin: 'tests/e2e/ui-accordion.spec.js',
      },
      {
        scenario: 'Режим single',
        expect:
          'Открытие соседа закрывает предыдущий пункт; объявление идёт по нативному toggle — ARIA у модуля нет',
        pin: 'tests/e2e/ui-accordion.spec.js',
      },
    ],
  },

  schema:
    'FAQPage уместен, когда блок — действительный FAQ: разметка отражает видимый контент 1:1, ответы доступны ' +
    'пользователю (раскрытие по действию допустимо). Правила и границы — README-секция ' +
    '[«schema.org FAQPage — когда уместно»](#ui-docs-extra-1-heading); решение о разметке — зона сайта, ' +
    'компонент её не несёт.',

  version: {
    introduced: '0.1.0',
    task: 'T6.4',
    changelog: [
      {
        version: '0.1.0',
        change:
          'Введение компонента (класс A career-portal): нативные details/summary без ARIA, анимация раскрытия ' +
          'через grid-rows на ::details-content (проба трёх движков), режим single, вариант --faq, события ' +
          'irao-ui:accordion-open/close.',
      },
    ],
  },
};

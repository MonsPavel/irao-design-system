/**
 * Метаданные доки ui-loader (шаблон T10.1; прогон T10.2): машинные части
 * страницы + карта «секция шаблона → ## заголовок README.md». Тексты живут
 * в README компонента (один источник), здесь — только сопоставление и то,
 * чего в README нет: клавиатурная таблица, ARIA-список, чек-лист
 * скринридера, версия/changelog. Контракт формы — showcase/docs-template.mjs;
 * чек-лист — CONTRIBUTING.md.
 */
export default {
  readme: {
    states: ['Размеры и цвет', 'Reduced motion'],
    a11y: ['A11y'],
    api: ['API'],
    doDont: ["Do / Don't"],
    extra: ['Паттерн aria-busy: загрузка области (сниппет для сайтов)', 'Bitrix', 'Известные границы', 'Связанные задачи'],
  },

  keyboard: [
    {
      keys: '— (не интерактивен)',
      action:
        'Лоадер не ловит фокус и не содержит интерактивов; клавиатурный доступ — к элементам контента после загрузки',
    },
  ],

  aria: [
    {
      what: '`role="status"` на `__text` — обязателен (гейт irao/loader-text-status)',
      why: 'состояние загрузки объявляется текстом-живой-областью, не голым спиннером; появление и смена текста озвучиваются вежливо',
    },
    {
      what: '`aria-hidden="true"` + `focusable="false"` на спиннере',
      why: 'декоративная графика вне a11y-дерева (WCAG 1.1.1); цвет — currentColor от контекста',
    },
    {
      what: '`aria-busy="true"` на контейнере области + `--overlay`',
      why: 'область объявлена обновляющейся; прежний контент читается сквозь полупрозрачный оверлей',
    },
    {
      what: 'не добавляйте aria-live поверх role="status"',
      why: 'роль уже несёт неявную polite — двойная область даёт повторное озвучивание',
    },
  ],

  screenReader: {
    source: 'docs/ui-system/a11y/screen-reader-protocol.md',
    note: 'ручной прогон по протоколу T9.2 — релизный гейт; контракт «не голый спиннер» исполняет гейт lint:html',
    rows: [
      {
        scenario: 'Появление лоадера',
        expect: '«Загрузка…» — вежливое объявление живой области, без прерывания текущей реплики',
        pin: 'tests/e2e/ui-loader.spec.js',
      },
      {
        scenario: 'Смена текста',
        expect: '«Готово» — обновление role="status" озвучивается; спиннер не объявляется вовсе',
        pin: 'tests/e2e/ui-loader.spec.js',
      },
      {
        scenario: 'aria-busy-паттерн области',
        expect: 'Область объявлена busy; после снятия — контент доступен, оверлей удалён',
        pin: 'tests/e2e/ui-loader.spec.js',
      },
    ],
  },

  schema: null,

  version: {
    introduced: '0.1.0',
    task: 'T7.5',
    changelog: [
      {
        version: '0.1.0',
        change:
          'Введение компонента (в career-portal отсутствовал): спиннер + обязательный текст role="status" ' +
          '(гейт irao/loader-text-status), размеры sm/md, --block и --overlay для aria-busy-паттерна, ' +
          'двойной reduced-motion (kill-switch + локальное правило).',
      },
    ],
  },
};

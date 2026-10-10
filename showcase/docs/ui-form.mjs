/**
 * Метаданные доки ui-form (шаблон T10.1; прогон T10.2): машинные части
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
    extra: [
      'Правила фокуса (паттерны для T5.5/T5.6)',
      'Серверный контракт ошибок (T5.6)',
      'JS-модуль: IraoUI.form (клиентская валидация, T5.5)',
      'Адаптив',
      'Bitrix (шаблон)',
      'Известные границы',
    ],
  },

  keyboard: [
    {
      keys: 'Tab',
      action:
        'Порядок = DOM: summary (если показана) → поля → actions; tabindex > 0 не используется',
    },
    {
      keys: 'Enter на ссылке summary',
      action:
        'Переход фокуса на поле по href="#id" — нативный хэш-фокус всех браузеров матрицы (проверено e2e chromium/firefox/webkit)',
    },
    {
      keys: 'Enter (сабмит)',
      action:
        'С ошибками — фокус на summary (tabindex="-1"); валидный сабмит модуль пропускает — страницу перезагружает сервер',
    },
  ],

  aria: [
    {
      what: '`.ui-form__summary` — role="alert" + tabindex="-1"',
      why: 'сводная ошибка объявляется немедленно при появлении и получает фокус — пользователь в начале списка ошибок (WCAG 3.3.1)',
    },
    {
      what: '`.ui-form__success-title` — tabindex="-1"',
      why: 'цель фокуса после показа успеха; работает и без JS (серверный success-рендер)',
    },
    {
      what: '`<aside aria-labelledby>`',
      why: 'боковая колонка — именованная complementary-область; пары «label/value» — dl-семантика',
    },
    {
      what: 'контракт поля: aria-invalid + aria-describedby + __error role="alert"',
      why: 'единый с клиентской валидацией T5.5 и сервером T5.6 (сниппет рендерит те же классы и aria)',
    },
    {
      what: 'звёздочка `__req` — aria-hidden',
      why: 'обязательность дублируется текстом footnote, не только знаком (WCAG 1.4.1)',
    },
  ],

  screenReader: {
    source: 'docs/ui-system/a11y/screen-reader-protocol.md',
    note: 'сценарии полного цикла формы (без JS → с JS → сервер → success) — интеграционный стенд и e2e form-full-cycle; ниже — авто-пины контракта',
    rows: [
      {
        scenario: 'Сабмит с ошибками',
        expect: '«В форме 2 ошибки, alert» — немедленное объявление; фокус в начале summary',
        pin: 'tests/e2e/ui-form.spec.js',
      },
      {
        scenario: 'Клик/Enter по ссылке summary',
        expect: 'Фокус и скролл на невалидное поле (нативный хэш-фокус)',
        pin: 'tests/e2e/ui-form.spec.js',
      },
      {
        scenario: 'Успешная отправка',
        expect: 'Фокус на заголовке успеха — объявление нового состояния вместо тихой перерисовки',
        pin: 'tests/e2e/form-full-cycle.spec.js',
      },
      {
        scenario: 'Серверная ветка (после перезагрузки)',
        expect: 'Разметка и объявления идентичны клиентской валидации — один интерфейс ошибок до и после сабмита',
        pin: 'tests/e2e/form-full-cycle.spec.js',
      },
    ],
  },

  schema: null,

  version: {
    introduced: '0.1.0',
    task: 'T5.4',
    changelog: [
      {
        version: '0.1.0',
        change:
          'Введение компонента (T5.4): раскладка grid/aside мобильным-first, сводная ошибка role="alert" с фокусом, ' +
          'success-блок, легенда обязательных полей; T5.5 — модуль клиентской валидации IraoUI.form; T5.6 — ' +
          'серверный контракт ошибок и сниппет form-error-render.php.',
      },
    ],
  },
};

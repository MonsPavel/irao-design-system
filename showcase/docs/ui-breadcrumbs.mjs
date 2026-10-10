/**
 * Метаданные доки ui-breadcrumbs (шаблон T10.1; прогон T10.2): машинные части
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
      'Микроразметка BreadcrumbList (ТЗ №7)',
      'Построение цепочки в шаблонах',
      'Bitrix',
      'Известные границы',
    ],
  },

  keyboard: [
    {
      keys: 'Tab',
      action:
        'Остановки — только ссылки уровней; текущая страница (span + aria-current) не ссылка и не остановка Tab',
    },
    {
      keys: 'Enter',
      action: 'На ссылке уровня — переход; видимый фокус — глобальная политика ADR-0001',
    },
  ],

  aria: [
    {
      what: '`nav aria-label="Хлебные крошки"`',
      why: 'лендмарка навигации с именем: скринридер объявляет её при входе; конвенция career-portal, не меняйте',
    },
    {
      what: '`role="list"` на ol',
      why: 'защита семантики списка от list-style: none (Safari ≤13 удалял роль) — «шаг N из M» бесплатно',
    },
    {
      what: '`aria-current="page"` ровно один раз',
      why: 'текущая страница объявляется как текущая; ссылка «на себя» или второй aria-current — ложные остановки',
    },
    {
      what: 'разделитель «/» — CSS-псевдоэлемент',
      why: 'в тексте ссылок его нет: имена уровней чистые для скринридера и микроразметки',
    },
  ],

  screenReader: {
    source: 'docs/ui-system/a11y/screen-reader-protocol.md',
    note: 'контракт цепочки (позиции, имена, aria-current) пинят авто-сценарии и парсер-тест микроразметки ниже',
    rows: [
      {
        scenario: 'Вход в лендмарку крошек',
        expect: '«Хлебные крошки, навигация» — имя лендмарки объявляется при входе',
        pin: 'tests/e2e/ui-breadcrumbs.spec.js',
      },
      {
        scenario: 'Обход цепочки',
        expect: 'Ссылки уровней по порядку DOM (= визуальному); позиции 1..N монотонны',
        pin: 'tests/e2e/ui-breadcrumbs.spec.js',
      },
      {
        scenario: 'Текущая страница',
        expect: 'Объявляется с aria-current="page" как текущая, не как ссылка; Tab её пропускает',
        pin: 'tests/e2e/ui-breadcrumbs.spec.js',
      },
    ],
  },

  schema:
    'Компонент несёт микроразметку **schema.org BreadcrumbList** (microdata, ТЗ №7) — правила и обязательные ' +
    'свойства (itemListElement ≥ 2, position, name, item у предков) — в README-секции ' +
    '[«Микроразметка BreadcrumbList»](#ui-docs-extra-0-heading); парсер-гейт — `tests/e2e/ui-breadcrumbs.spec.js` ' +
    '(позиции монотонны, имена непустые, item у всех уровней, кроме последнего). JSON-LD-дубль не нужен: две ' +
    'разметки одной цепочки — риск расхождения.',

  version: {
    introduced: '0.1.0',
    task: 'T4.7',
    changelog: [
      {
        version: '0.1.0',
        change:
          'Введение компонента: перенос .breadcrumbs career-portal (caption-типографика, лента на ≤767), ' +
          'микроразметка BreadcrumbList (microdata), aria-current="page", role="list" против потери семантики.',
      },
    ],
  },
};

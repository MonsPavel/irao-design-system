/**
 * Метаданные доки ui-carousel (шаблон T10.1; задача T17.7): машинные части
 * страницы + карта «секция шаблона → ## заголовок README.md». Тексты живут
 * в README компонента (один источник), здесь — только сопоставление и то,
 * чего в README нет: клавиатурная таблица, ARIA-список, чек-лист
 * скринридера, версия/changelog. Контракт формы — showcase/docs-template.mjs;
 * чек-лист — CONTRIBUTING.md.
 */
export default {
  readme: {
    states: ['Деградация без JS'],
    a11y: ['Клавиатура — чек-лист (проверено e2e)', 'A11y'],
    api: ['API'],
    doDont: ["Do / Don't"],
    extra: ['Известные границы'],
  },

  // Контекст живых примеров (редизайн 30.10): обе формы компонента — on-dark
  // (стрелки/активный таб — text-on-dark, на белой странице контраст 1:1,
  // контролы невидимы). examplesContext: 'photo' ставит область примеров в
  // демо-контекст тёмной фото-секции (renderDocPage в docs-template.mjs):
  // канон и сниппет остаются чистым API, полный вид с раскладкой и glow —
  // стенд (та же ссылка выше и responsive-секция ниже).
  examplesContext: 'photo',
  examplesNote:
    'Обе формы рассчитаны на тёмную фото-секцию: стрелки и активный таб — ' +
    'on-dark, цвет заголовка и лида перекрашивает композиция (правило — ' +
    'README, «Do»). Ниже — копируемый API без композиции; полный вид блока ' +
    '«Производство» с раскладкой и glow — на стенде и в responsive-секции.',

  keyboard: [
    {
      keys: '← / →',
      action:
        'На табах степпера — automatic-активация: фокус и выбор переходят вместе, с зацикливанием (прецедент APG ui-tabs)',
    },
    { keys: 'Home / End', action: 'Первый / последний таб (automatic)' },
    {
      keys: 'Tab / Shift+Tab',
      action:
        'Не перехватываются — roving tabindex (0 у активного таба, −1 у остальных) уводит Tab за степпер',
    },
    {
      keys: 'Enter / Space',
      action: 'Стрелки prev/next — нативные кнопки вне tablist; табы — тоже кнопки (канон спеки)',
    },
    { keys: 'Клик', action: 'Стрелка — соседний слайд (зацикливание); таб — выбор слайда' },
  ],

  aria: [
    {
      what: 'степпер — честный tablist в разметке',
      why: 'role="tablist" (aria-label) → role="tab" (aria-selected) — канон спеки T17.7: без JS степпер скрыт, роли не врут; roving tabindex ставит модуль',
    },
    {
      what: 'стрелки — вне tablist',
      why: 'обычные кнопки с aria-label («Предыдущий слайд»); Implementation requirements п.3',
    },
    {
      what: 'деградация без JS — hidden на контролах',
      why: 'стрелки/степпер несут hidden в разметке, модуль снимает при init (симметрично open ui-modal): первый слайд — в слотах разметки',
    },
    {
      what: 'фото карусели — alt = заголовок слайда',
      why: 'ставит модуль при переключении (как пилот); фото галереи — alt="" (декоративные)',
    },
  ],

  screenReader: {
    source: 'docs/ui-system/a11y/screen-reader-protocol.md',
    note: 'клавиатурный чек-лист APG-табов пинят e2e-сценарии ниже',
    rows: [
      {
        scenario: 'Tab к степперу',
        expect: '«Направления производства, список вкладок» — лента объявлена именем из aria-label',
        pin: 'tests/e2e/ui-carousel.spec.js',
      },
      {
        scenario: 'Стрелка →',
        expect:
          'Выбор переходит к следующему табу (automatic) — слоты обновляются содержимым слайда',
        pin: 'tests/e2e/ui-carousel.spec.js',
      },
      {
        scenario: 'Клик стрелки prev/next',
        expect: 'Соседний слайд с зацикливанием; aria-selected переезжает',
        pin: 'tests/e2e/ui-carousel.spec.js',
      },
      {
        scenario: 'Без JS',
        expect:
          'Первый слайд читается из слотов разметки; стрелки/степпер скрыты (hidden) — мёртвых контролов нет',
        pin: 'tests/e2e/ui-carousel.spec.js',
      },
    ],
  },

  schema: null,

  version: {
    introduced: '0.1.0',
    task: 'T17.7',
    changelog: [
      {
        version: '0.1.0',
        change:
          'Введение компонента: карусель (JSON-слайды {photo,title,text,link,count}, слоты, ' +
          'стрелки, степпер-tablist с roving tabindex) и фото-галерея prev/next; модуль ' +
          'IraoUI.carousel (ES5, ADR-0005) в ui.min.js — порт ~120 строк pilot.js; деградация ' +
          'без JS: первый слайд в слотах, контролы hidden снимает модуль; событие ' +
          'irao-ui:carousel-select и API select(root, index).',
      },
    ],
  },
};

/**
 * Метаданные доки ui-file (шаблон T10.1; прогон T10.2): машинные части
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
      'Правило системы: нативный контрол никогда не прячется',
      'Один label: имя поля через aria-labelledby',
      'Без JS и form.reset',
      'Bitrix (шаблон)',
      'Известные границы',
    ],
  },

  keyboard: [
    {
      keys: 'Tab / Shift+Tab',
      action:
        'Достигает sr-only-инпута (нативный порядок DOM); видимый фокус рисует кнопка-лейбл через :has(input:focus-visible) — focus-тройка ADR-0001',
    },
    {
      keys: 'Enter / Space',
      action:
        'На инпуте — нативный диалог выбора; после клика по кнопке-лейблу activeElement — инпут (Chromium/Firefox; WebKit фокус не переносит — клавиатурный путь Tab → Enter работает везде)',
    },
    {
      keys: 'Enter на «Убрать файл»',
      action:
        'Сброс значения и возврат фокуса на инпут — кнопка исчезает, фокус не теряется в body',
    },
  ],

  aria: [
    {
      what: 'sr-only-клип инпута (не display: none)',
      why: 'нативный контрол остаётся в tab-порядке и a11y-дереве; сокрытие контрола форм запрещено правилом системы',
    },
    {
      what: '`aria-labelledby` на текст обвязки',
      why: 'кнопка-лейбл — единственный label инпута: две метки ломают axe form-field-multiple-labels',
    },
    {
      what: '`role="status"` на значении выбора',
      why: 'живая область (polite): «Выбран файл: имя, размер» озвучивается сразу после выбора',
    },
    {
      what: '`aria-describedby` (hint + error списком)',
      why: 'подсказка accept и ошибка обвязки связаны с инпутом; текст ошибки не попадает в имя кнопки',
    },
    {
      what: 'disabled через `:has(input:disabled)`',
      why: 'гаснет только аффорданс (кнопка), значение и подсказка остаются полноконтрастными — axe учитывает opacity предка',
    },
  ],

  screenReader: {
    source: 'docs/ui-system/a11y/screen-reader-protocol.md',
    note: 'контракт «sr-only инпут + role="status" значения» пинят авто-сценарии ниже',
    rows: [
      {
        scenario: 'Tab к полю',
        expect: '«Резюме, обязательное поле — кнопка выбора файла» — имя из aria-labelledby, hint из aria-describedby',
        pin: 'tests/e2e/ui-file.spec.js',
      },
      {
        scenario: 'Выбор файла',
        expect: '«Выбран файл: резюме.pdf, 245 КБ» — role="status" объявляет обновление значения',
        pin: 'tests/e2e/ui-file.spec.js',
      },
      {
        scenario: 'Сброс «Убрать файл»',
        expect: 'Значение возвращается к «Файл не выбран», фокус — на инпуте',
        pin: 'tests/e2e/ui-file.spec.js',
      },
      {
        scenario: 'Отмена диалога (Escape)',
        expect: 'change не возникает — состояние и объявление не меняются',
        pin: 'tests/e2e/ui-file.spec.js',
      },
    ],
  },

  schema: null,

  version: {
    introduced: '0.1.0',
    task: 'T5.3',
    changelog: [
      {
        version: '0.1.0',
        change:
          'Введение компонента (закрывает класс D аудита career-portal): кнопка-лейбл + sr-only инпут, ' +
          'значение с role="status", доступный сброс с возвратом фокуса, модуль IraoUI.file (значение/сброс/form.reset).',
      },
    ],
  },
};

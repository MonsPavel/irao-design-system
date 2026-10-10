/**
 * Метаданные доки ui-field (шаблон T10.1): карта «секция шаблона → ## заголовок
 * README.md» + машинные части страницы. Тексты живут в README компонента;
 * контракт формы — showcase/docs-template.mjs, чек-лист — CONTRIBUTING.md.
 */
export default {
  readme: {
    states: ['Состояния и геометрия'],
    a11y: ['Связность (контракт доступности, работает без JS)'],
    api: ['API'],
    doDont: ["Do / Don't"],
    extra: [
      'Placeholder-политика',
      'Autocomplete-рекомендации (WCAG 1.3.5)',
      'Bitrix (шаблоны)',
      'Известные границы',
    ],
  },

  keyboard: [
    {
      keys: 'Tab',
      action:
        'Фокус в контрол в порядке DOM; видимый фокус — фирменный bg-swap поля + глобальный ' +
        'outline (ADR-0001): паттерн поля дополняет политику, не заменяет её',
    },
    {
      keys: 'Tab (мимо disabled)',
      action: 'Атрибут `disabled` пропускается нативно: поле не фокусируется и не редактируется',
    },
    {
      keys: 'Tab → readonly',
      action: '`readonly` достигается: значение выделяется и копируется, редактирование выключено',
    },
  ],

  aria: [
    {
      what: '`label for` ↔ `id` контрола',
      why: 'клик по label ставит фокус, скринридер именует поле; label обязателен и всегда видим',
    },
    {
      what: '`aria-describedby` = «hint error»',
      why: 'подсказка и текст ошибки озвучиваются после имени поля (hint первым)',
    },
    {
      what: '`aria-invalid="true"` при `--error`',
      why: 'поле объявляется невалидным; тот же атрибут ставит модуль T5.5 и серверный рендер Bitrix',
    },
    {
      what: '`role="alert"` на тексте ошибки',
      why: 'вставленная/обновлённая ошибка объявляется скринридером немедленно',
    },
    {
      what: '`required` + `__req` (звёздочка `aria-hidden` + скрытый текст «обязательное поле»)',
      why: 'обязательность — не только цветом (WCAG 1.4.1); `aria-required` дублировать не нужно',
    },
    {
      what: '`autocomplete` по типу поля',
      why: 'WCAG 1.3.5: автозаполнение не отключается (`autocomplete="off"` запрещён политикой)',
    },
  ],

  screenReader: {
    source: 'docs/ui-system/a11y/screen-reader-protocol.md',
    note: 'сценарии F1, F3 матрицы §3.5',
    rows: [
      {
        scenario: 'Tab по полю с hint и required (F1)',
        expect:
          '«Служебный e-mail, обязательное поле, редактируемый текст» — label + req-текст + hint ' +
          'из `aria-describedby`; placeholder не заменяет label',
        pin: 'tests/e2e/ui-field.spec.js',
      },
      {
        scenario: 'Ошибка поля (F3)',
        expect:
          'Текст ошибки объявляется как оповещение (`role="alert"`); поле объявляется ' +
          'невалидным (`aria-invalid="true"`)',
        pin: 'tests/e2e/ui-form.spec.js',
      },
    ],
  },

  schema: null,

  version: {
    introduced: '0.1.0',
    task: 'T5.1',
    changelog: [
      {
        version: '0.1.0',
        change:
          'Введение: обвязка label/req/hint/error, `input` × `textarea`, состояния ' +
          'error/disabled/readonly, связность aria без JS; основа контролов форм ' +
          '(select/checkbox/radio — T5.2, file — T5.3).',
      },
    ],
  },
};

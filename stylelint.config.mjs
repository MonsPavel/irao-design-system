/**
 * stylelint irao-ui — машинная форма CSS-правил docs/02-architecture.md (задача T1.2).
 *
 * Гейты и их источники:
 *
 * 1. `plugin/selector-bem-pattern` — БЭМ-паттерн `ui-{block}__{elem}--{mod}`
 *    (02-architecture §2 «Namespace»). Контекст задаётся комментарием
 *    `/** @define <block> *⁄` в начале CSS компонента: файлы без него
 *    (tokens, base, a11y, themes) — не компоненты, БЭМ-проверку не проходят
 *    сознательно. Состояния `is-*`/`has-*` допустимы только в цепочке с
 *    блоком/элементом (`.ui-modal.is-open`), отдельно — нельзя.
 *
 * 2. `scale-unlimited/declaration-strict-value` — цвета только через токены:
 *    разрешены var(), inherit, currentColor, transparent. `color-mix()`
 *    разрешён как механизм производных состояний (§3.2, hover/active через
 *    color-mix над var()) — ограничение: regex не заглядывает внутрь вызова,
 *    вложенные сырые цвета ловит ревью (см. правило в CONTRIBUTING).
 *    Hex/rgb()/hsl() в компонентах — главный класс ошибок career-portal
 *    (#D6D6D6, #B9C6DE; риск №5 из 05-mvp-risks) — потому функция-гейт жёсткий.
 *
 * 3. `declaration-no-important` — специфичность одного класса
 *    (§1, принцип 4). Исключение — только a11y/vi.css: перекраска ГОСТ-модуля
 *    обязана побеждать всё (§5, инвариант VI-режима).
 *
 * 4. `declaration-property-value-disallowed-list` — `outline: none`/`0`
 *    без замены убивает видимый фокус (ADR-0001). Сознательно `warning`
 *    до конца EPIC-4, затем переводится в `error`.
 *
 * 5. `order/properties-order` — единый порядок свойств; `box-sizing` — сразу
 *    после токенов: строка ADR-0002 «box-sizing на корне компонента» должна
 *    бросаться в глаза первой в каждом блоке.
 *
 * Исключения по путям сделаны через `overrides` (а не глобальный ignoreFiles):
 * файл продолжает линтиться остальными правилами, снимается только конкретный
 * гейт. Негативные фикстуры tests/lint-cases/** исключены из прогона на уровне
 * globs в package.json (`lint:css`) — их гоняет tools/run-lint-cases.mjs.
 *
 * Пресет stylelint-config-recommended сознательно не подключён: задача T1.2 —
 * архитектурные гейты, а не общая гигиена; добавим отдельным решением, если
 * понадобится (без шума в PR компонентов).
 */
export default {
  plugins: [
    'stylelint-selector-bem-pattern',
    'stylelint-declaration-strict-value',
    'stylelint-order',
  ],
  rules: {
    // 1. БЭМ ui-{block}__{elem}--{mod}: имя компонента — без префикса `ui-`
    //    (`/** @define button */`), префикс вшит в паттерн селектора.
    //    Функция, а не строка с {componentName}: postcss-bem-linter
    //    интерполирует только первое вхождение плейсхолдера, а блок нужен
    //    в паттерне дважды (цепочка `.ui-button--primary.ui-button--large`).
    'plugin/selector-bem-pattern': {
      componentName: '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$',
      componentSelectors: (componentName) => {
        const block = `ui-${componentName}`;
        const blockPart = `\\.${block}(?:__[-a-z0-9]+)?(?:--[-a-z0-9]+)?`;
        const chained = '(?:\\.(?:(?:is|has)-[a-z0-9-]+)|' + blockPart + ')*';
        return new RegExp(`^${blockPart}${chained}$`);
      },
      utilitySelectors: '^\\.(?:is|has)-[a-z0-9-]+$',
      // Токены системы глобальны: `--ui-*` в :root компонента не являются
      // «свойствами компонента» и не обязаны начинаться с его имени (§3).
      ignoreCustomProperties: '^--ui-',
    },

    // 2. Цвета — только токены; исключение по пути — см. overrides.
    'scale-unlimited/declaration-strict-value': [
      ['/color$/', 'fill', 'stroke'],
      {
        // var(--ui-*) — основной способ; оставить включённым.
        ignoreVariables: true,
        // Жёстко: rgb()/hsl()/lab() с сырыми аргументами — нарушение.
        ignoreFunctions: false,
        ignoreValues: ['inherit', 'currentColor', 'transparent', '/^color-mix\\(/'],
      },
    ],

    // 3. !important вне a11y/vi.css запрещён (см. overrides).
    'declaration-no-important': true,

    // 4. Фокус обязателен (ADR-0001): warning до EPIC-4, потом error.
    'declaration-property-value-disallowed-list': [
      { '/^outline$/': ['none', '0'] },
      { severity: 'warning' },
    ],

    // 5. Порядок свойств: токены → box-sizing (ADR-0002) → компоновка →
    //    коробка → рамки → фон → типографика → визуал → анимация → взаимодействие.
    //    Незарегистрированные свойства — в конец, по алфавиту.
    'order/properties-order': [
      [
        '/^--/',
        'content',
        'box-sizing',
        'display',
        'appearance',
        'visibility',
        'position',
        'inset',
        'top',
        'right',
        'bottom',
        'left',
        'z-index',
        'float',
        'clear',
        'flex',
        'flex-flow',
        'flex-direction',
        'flex-wrap',
        'flex-grow',
        'flex-shrink',
        'flex-basis',
        'gap',
        'row-gap',
        'column-gap',
        'align-content',
        'align-items',
        'align-self',
        'justify-content',
        'justify-items',
        'justify-self',
        'order',
        'grid',
        'grid-template',
        'grid-template-rows',
        'grid-template-columns',
        'grid-template-areas',
        'grid-area',
        'grid-auto-flow',
        'grid-auto-rows',
        'grid-auto-columns',
        'grid-row',
        'grid-column',
        'columns',
        'column-count',
        'column-rule',
        'overflow',
        'overflow-x',
        'overflow-y',
        'object-fit',
        'object-position',
        'width',
        'min-width',
        'max-width',
        'height',
        'min-height',
        'max-height',
        'aspect-ratio',
        'margin',
        'margin-top',
        'margin-right',
        'margin-bottom',
        'margin-left',
        'padding',
        'padding-top',
        'padding-right',
        'padding-bottom',
        'padding-left',
        'border',
        'border-width',
        'border-style',
        'border-color',
        'border-top',
        'border-right',
        'border-bottom',
        'border-left',
        'border-radius',
        'outline',
        'outline-width',
        'outline-style',
        'outline-color',
        'outline-offset',
        'background',
        'background-color',
        'background-image',
        'background-repeat',
        'background-position',
        'background-size',
        'background-clip',
        'background-origin',
        'background-attachment',
        'color',
        'font',
        'font-family',
        'font-size',
        'font-style',
        'font-weight',
        'font-variant',
        'line-height',
        'letter-spacing',
        'text-align',
        'text-align-last',
        'text-decoration',
        'text-decoration-color',
        'text-decoration-line',
        'text-decoration-style',
        'text-transform',
        'text-indent',
        'text-overflow',
        'text-shadow',
        'vertical-align',
        'white-space',
        'word-break',
        'word-spacing',
        'overflow-wrap',
        'list-style',
        'list-style-position',
        'list-style-type',
        'fill',
        'stroke',
        'box-shadow',
        'opacity',
        'filter',
        'backdrop-filter',
        'transform',
        'transform-origin',
        'perspective',
        'clip-path',
        'transition',
        'transition-property',
        'transition-duration',
        'transition-timing-function',
        'transition-delay',
        'animation',
        'animation-name',
        'animation-duration',
        'animation-timing-function',
        'animation-delay',
        'animation-iteration-count',
        'animation-direction',
        'animation-fill-mode',
        'animation-play-state',
        'cursor',
        'pointer-events',
        'user-select',
        'touch-action',
        'resize',
        'will-change',
        'quotes',
        'counter-reset',
        'counter-increment',
      ],
      {
        unspecified: 'bottomAlphabetical',
      },
    ],
  },
  overrides: [
    {
      // Слой 1 «примитивы» — единственное место с hex (02-architecture §3.1,
      // CONTRIBUTING «Куда положить файл X»). AC T1.2: hex здесь разрешён.
      files: ['**/tokens/primitives.css'],
      rules: {
        'scale-unlimited/declaration-strict-value': null,
      },
    },
    {
      // ГОСТ-модуль vi перекрашивает всё через !important — инвариант §5:
      // «компонент не зависит от цветов вне токенов», иначе перекраска vi
      // некорректна. AC T1.2: !important здесь разрешён.
      files: ['**/a11y/vi.css'],
      rules: {
        'declaration-no-important': null,
      },
    },
  ],
};

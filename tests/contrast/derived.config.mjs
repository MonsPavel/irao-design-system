/**
 * Конфиг ревизии контраста производных состояний (задача T9.2) — пары
 * «подпись/индикатор → фон состояния» и осознанные исключения.
 *
 * Предмет — все производные hover/active системы (T2.6, ADR-0010): фон
 * состояния — явная токен-пара (--ui-color-primary-hover/--ui-color-accent-
 * hover/--ui-color-surface-hover) или конвенция color-mix(in srgb, токен 88%,
 * black). Спецификации: { token: '--ui-…' } — токен слоя 1–2; { mix: { base,
 * percent, with } } — производная (with — цвет подмешивания, CSS-ключевое
 * слово black = #000000; hex в конфиге теста — значение ключевого слова,
 * не дизайн-значение).
 *
 * Уровни порогов (чек-лист T9.2, ADR-0010 п.6):
 *  - 'large' ≥ 3:1 — кнопочные подписи («крупные элементы ≥ 3:1 в hover»);
 *    формально подписи 14px — критерий чек-листа, разрывы ниже — исключения;
 *  - 'text' ≥ 4.5:1 — ссылки/крошки (обычный текст);
 *  - 'non-text' ≥ 3:1 — фокус (WCAG 1.4.11).
 *
 * Исключение — ТОЛЬКО записью в DERIVED_EXCEPTIONS с обоснованием; нарушений
 * вне исключений быть не должно (Implementation requirements T9.2 п.2: каждое
 * нарушение → фикс в спринте или исключение с обоснованием).
 *
 * Границы гейта (осознанные, не баги):
 *  - alpha-производные (hover триггера ui-select = color-mix 55% transparent)
 *    не вычислимы без подложки — в конфиг не попадают; аффорданс поля несёт
 *    не hover, а базовый фон контрола (пара muted-on-surface-muted T2.3);
 *  - color-mix(currentColor 88%, black) в ui-alert — производная от уже
 *    гейтнутой пары варианта на светлой поверхности: микс к чёрному контраст
 *    только увеличивает, отдельной пары не заводилось;
 *  - базовые (не производные) пары «использование → фон» — гейт T2.3
 *    (tests/contrast/pairs.config.mjs), здесь не дублируются.
 */

/**
 * Пары производных состояний. fg/bg — спецификации; значения resolve через
 * var()-цепочки до примитивов.
 */
export const DERIVED_PAIRS = [
  /* ── Кнопки: подписи на производных фонах (level: large — чек-лист T9.2) ── */

  {
    id: 'btn-primary-hover',
    level: 'large',
    fg: { token: '--ui-color-text-on-dark' },
    bg: { token: '--ui-color-primary-hover' },
    usage:
      'подпись на hover primary — пара одобренного дизайна #164b89 (ui-button--primary:hover, ui-link--button:hover); ADR-0010 п.6: 8.74:1',
  },
  {
    id: 'btn-accent-hover',
    level: 'large',
    fg: { token: '--ui-color-text-on-dark' },
    bg: { token: '--ui-color-accent-hover' },
    usage:
      'подпись на hover accent — пара одобренного дизайна #f37131 (ui-button--accent:hover); ADR-0010 п.6: 2.91:1',
  },
  {
    id: 'btn-outline-hover',
    level: 'large',
    fg: { token: '--ui-color-text-on-dark' },
    bg: { token: '--ui-color-surface-dark' },
    usage:
      'подпись на hover outline — заливка primary (ui-button--outline:hover, career-portal components.css:90)',
  },
  {
    id: 'btn-light-hover',
    level: 'large',
    fg: { token: '--ui-color-primary' },
    bg: { token: '--ui-color-surface-hover' },
    usage:
      'подпись на hover light — blue-100 (ui-button--light:hover, ui-file hover; пара базы — primary-on-surface-hover гейта T2.3)',
  },
  {
    id: 'btn-ghost-hover',
    level: 'large',
    fg: { token: '--ui-color-text' },
    bg: { token: '--ui-color-surface-hover' },
    usage: 'подпись generic-кнопки на hover — blue-100 (.ui-button:hover, career-portal)',
  },
  {
    id: 'btn-active-on-primary-mix',
    level: 'large',
    fg: { token: '--ui-color-text-on-dark' },
    bg: { mix: { base: '--ui-color-primary', percent: 88, with: '#000000' } },
    usage:
      'подпись на active primary/outline/link--button — color-mix 88% primary (одобренным дизайном active не задан, ADR-0010)',
  },
  {
    id: 'btn-accent-active',
    level: 'large',
    fg: { token: '--ui-color-text-on-dark' },
    bg: { mix: { base: '--ui-color-accent', percent: 88, with: '#000000' } },
    usage: 'подпись на active accent — color-mix 88% accent (ui-button--accent:active)',
  },
  {
    id: 'btn-light-active',
    level: 'large',
    fg: { token: '--ui-color-primary' },
    bg: { mix: { base: '--ui-color-surface-hover', percent: 88, with: '#000000' } },
    usage:
      'подпись на active light — color-mix 88% surface-hover (ui-button--light:active, ui-file:active)',
  },
  {
    id: 'btn-ghost-active',
    level: 'large',
    fg: { token: '--ui-color-text' },
    bg: { mix: { base: '--ui-color-surface-hover', percent: 88, with: '#000000' } },
    usage: 'подпись generic-кнопки на active — color-mix 88% surface-hover (.ui-button:active)',
  },

  /* ── Ссылки: цвет производной на поверхности (level: text — обычный текст) ── */

  {
    id: 'link-mix-primary',
    level: 'text',
    fg: { mix: { base: '--ui-color-primary', percent: 88, with: '#000000' } },
    bg: { token: '--ui-color-surface' },
    usage:
      'ссылка в hover/active — color-mix 88% primary на белом (ui-link:hover/:active; одобренным дизайном hover ссылки не задан)',
  },
  {
    id: 'link-on-dark-mix',
    level: 'text',
    fg: { mix: { base: '--ui-color-text-on-dark', percent: 88, with: '#000000' } },
    bg: { token: '--ui-color-surface-dark' },
    usage:
      'ссылка на тёмной секции в hover/active — color-mix 88% белого (ui-link--on-dark:hover/:active)',
  },
  {
    id: 'link-on-dark-mix-deep',
    level: 'text',
    fg: { mix: { base: '--ui-color-text-on-dark', percent: 88, with: '#000000' } },
    bg: { token: '--ui-color-primary-deep' },
    usage: 'то же на секциях primary-deep (паттерн landing-section, «тёмный» вариант — T8.1)',
  },

  /* ── Крошки: hover одобренного дизайна (level: text) ── */

  {
    id: 'breadcrumbs-hover',
    level: 'text',
    fg: { token: '--ui-color-accent' },
    bg: { token: '--ui-color-surface' },
    usage:
      'hover крошек — accent одобренного макета (.breadcrumbs a:hover, career-portal components.css:21; не color-mix — ADR-0010)',
  },

  /* ── Фокус на тёмных секциях (известный разрыв, pairs.config → чек-лист T9.2) ── */

  {
    id: 'focus-on-dark',
    level: 'non-text',
    fg: { token: '--ui-focus-color' },
    bg: { token: '--ui-color-surface-dark' },
    usage:
      'outline фокуса ADR-0001 на тёмной секции (bg surface-dark = primary): разрыв зафиксирован за T9.2 в pairs.config.mjs',
  },
  {
    id: 'focus-on-primary-deep',
    level: 'non-text',
    fg: { token: '--ui-focus-color' },
    bg: { token: '--ui-color-primary-deep' },
    usage: 'то же на секциях primary-deep (паттерн landing-section, тёмный вариант)',
  },
];

/**
 * Осознанные исключения: id ПАРЫ с обоснованием (Implementation requirements
 * T9.2 п.2: нарушение → фикс в спринте или исключение). Исключение для
 * неизвестной пары — ошибка конфига.
 */
export const DERIVED_EXCEPTIONS = [
  {
    id: 'btn-accent-hover',
    reason:
      'Значение одобренного дизайна (#f37131, career-portal components.css:83, ADR-0010 п.2/п.6): инвариант «значения макета не пересчитываются», замена — design-decision владельца дизайна. 2.91:1 < 3:1 крупного (и < 4.5 обычного): hover слегка УХУДШАЕТ подпись против базового состояния (accent, 3.12:1 — проходит порог крупных); смену состояния видно по сдвигу тона заливки, но подпись в hover менее читаема. Путь исправления без правки макета: тема переопределяет пару --ui-color-accent-hover вместе с --ui-color-accent (граница ADR-0010 п.3); вынесено на design-decision владельца (Phase 0 — один бренд).',
  },
  {
    id: 'breadcrumbs-hover',
    reason:
      'Значение одобренного дизайна (career-portal components.css:21): hover крошек = accent 3.12:1 на белом при тексте 14px (порог 4.5). Изменение — design-decision владельца; альтернатива сайтам: переопределение в каскаде после ui-core. Разрыв известен до спринта (pairs.config.mjs, «Известные границы гейта»).',
  },
  {
    id: 'focus-on-dark',
    reason:
      'Ограничение архитектуры фокуса ADR-0001: outline = var(--ui-focus-color) (primary #002856) — совпадает с тёмными поверхностями surface-dark/primary-deep (1.0–1.1:1). Токен-механизм — штатный путь исправления: владелец тёмной секции переопределяет focus-тройку в её контексте (data-атрибут/класс секции { --ui-focus-color: var(--ui-color-text-on-dark) }), как это делают темы (ADR-0001 «смена темы переопределяет --ui-focus-*»); системного класса «тёмная секция» в v1 нет (секции — разметка сайтов/паттернов). Проверка на своих страницах — чек-лист доки VI/a11y-спринта; гарантированное решение вынесено владельцем дизайна (Phase 0 — один бренд).',
  },
  {
    id: 'focus-on-primary-deep',
    reason:
      'То же ограничение ADR-0001 для поверхности primary-deep (#152a4f): рецепт тот же — переопределение focus-тройки в контексте тёмной секции (паттерн landing-section демонстрирует on-dark-пару текста; focus тройка — зона сайта/темы).',
  },
];

/**
 * Конфиг контраст-гейта AA (задача T2.3): пары «использование → фон»,
 * уровни порогов и осознанные исключения.
 *
 * Правила (Implementation requirements T2.3):
 *  1. каждый ЦВЕТОВОЙ токен слоя 2 обязан быть в паре или в исключениях —
 *     новый цвет без пары делает прогон красным (evaluateContrast → coverageGaps);
 *  2. исключение — ТОЛЬКО записью в EXCEPTIONS с комментарием-обоснованием;
 *  3. значения, не проходящие порог, правятся в слое 2 (примитивы — эталон
 *     одобренного дизайна career-portal) с записью в таблицу диффов:
 *     docs/ui-system/architecture/tokens-career-portal-mapping.md.
 *
 * Уровни порогов WCAG AA (THRESHOLDS в lib.mjs):
 *  - 'text'     ≥ 4.5:1 — обычный текст;
 *  - 'large'    ≥ 3:1   — крупный текст (≥ 24px или ≥ 19px bold); пока в
 *    дефолтной палитре крупных «тонких» пар нет — уровень задействуют
 *    производные состояния (T2.6) и компоненты (EPIC-4+);
 *  - 'non-text' ≥ 3:1   — контуры фокуса, индикаторы (WCAG 1.4.11).
 *
 * Известные границы гейта (осознанные, не баги):
 *  - производные hover/active (например, breadcrumbs a:hover = accent 3.12:1
 *    на белом как текст) — зона T2.6 (color-mix) с ревизией T9.2;
 *  - белые подписи кнопок на accent (3.12:1 < 4.5 для обычного текста) —
 *    кнопочные пары не гейтятся здесь: ui-button — T4.2, изменение значений —
 *    design-decision владельца одобренного дизайна;
 *  - фокус цветом primary на ТЁМНЫХ секциях не читается — замена производных
 *    состояний на тёмном зафиксирована за T9.2 (ревизия контраста);
 *  - VI-темы (гарантированные пары ГОСТ) — Out of scope, проверка в T9.1;
 *  - темы каталога themes/ (T2.4): гейт парсит только tokens/*.css и на темы
 *    не действует. Синтетическая theme-test.css не проходит контраст сознательно
 *    (Accessibility requirements T2.4): она не поставляется на сайты (Phase 0 —
 *    один бренд; значение файлов — доказать механизм, поэтому значения взяты
 *    из декоративных серий палитры без контраст-гарантий). Реальная брендовая
 *    тема при введении (minor) проходит те же пары против своих значений —
 *    гейт допускает расчёт по произвольному набору карт объявлений
 *    (evaluateContrast), отчёт включается в её PR.
 */

/**
 * Пары «использование → фон». fg/bg — токены слоёв 1–2; значения resolve
 * через var()-цепочки до примитивов. Прямых ссылок на примитивы в парах нет:
 * последняя (tag-blue, семантической пары не было) закрыта токеном
 * --ui-color-tag-blue-bg в T4.3.
 */
export const PAIRS = [
  /* ── Текст на светлых поверхностях (level: text) ── */

  {
    id: 'text-on-surface',
    fg: '--ui-color-text',
    bg: '--ui-color-surface',
    level: 'text',
    usage: 'основной текст на карточках и страницах',
  },
  {
    id: 'text-on-surface-muted',
    fg: '--ui-color-text',
    bg: '--ui-color-surface-muted',
    level: 'text',
    usage: 'текст на приглушённых секциях и карточках (section--gray, card--filled)',
  },
  {
    id: 'muted-on-surface',
    fg: '--ui-color-text-muted',
    bg: '--ui-color-surface',
    level: 'text',
    usage:
      'вторичный текст: даты, подписи, placeholder — в career-portal это fs-small/fs-micro, крупности нет, порог 4.5',
  },
  {
    id: 'muted-on-surface-muted',
    fg: '--ui-color-text-muted',
    bg: '--ui-color-surface-muted',
    level: 'text',
    usage: 'вторичный текст на приглушённых секциях',
  },
  {
    id: 'muted-on-tag-gray',
    fg: '--ui-color-text-muted',
    bg: '--ui-color-tag-gray-bg',
    level: 'text',
    usage: '.tag--gray (components.css:111) — текст тега muted, 12px',
  },
  {
    id: 'text-on-error-bg',
    fg: '--ui-color-text',
    bg: '--ui-color-error-bg',
    level: 'text',
    usage: 'текст в поле с ошибкой (field--error красит фон, текст остаётся --ui-color-text)',
  },
  {
    id: 'text-on-success-bg',
    fg: '--ui-color-text',
    bg: '--ui-color-success-bg',
    level: 'text',
    usage: 'обычный текст на success-поверхности',
  },
  {
    id: 'text-on-info-bg',
    fg: '--ui-color-text',
    bg: '--ui-color-info-bg',
    level: 'text',
    usage: 'обычный текст на info-поверхности',
  },

  /* ── Текст на тёмных поверхностях (level: text) ── */

  {
    id: 'on-dark-on-surface-dark',
    fg: '--ui-color-text-on-dark',
    bg: '--ui-color-surface-dark',
    level: 'text',
    usage: 'текст тёмных секций (surface-dark = primary; заодно .tag--navy)',
  },
  {
    id: 'on-dark-on-primary-deep',
    fg: '--ui-color-text-on-dark',
    bg: '--ui-color-primary-deep',
    level: 'text',
    usage: 'текст тёмно-синих панелей (primary-deep)',
  },
  {
    id: 'on-dark-on-surface-blue-deep',
    fg: '--ui-color-text-on-dark',
    bg: '--ui-color-surface-blue-deep',
    level: 'text',
    usage: 'текст синих карточек «почему мы» (surface-blue-deep)',
  },
  {
    id: 'on-dark-muted-on-surface-dark',
    fg: '--ui-color-text-on-dark-muted',
    bg: '--ui-color-surface-dark',
    level: 'text',
    usage: 'вторичный текст на тёмных секциях',
  },
  {
    id: 'on-dark-muted-on-primary-deep',
    fg: '--ui-color-text-on-dark-muted',
    bg: '--ui-color-primary-deep',
    level: 'text',
    usage: 'вторичный текст на тёмно-синих панелях',
  },

  /* ── Теги fg/bg (career-portal .tag*, текст 12px → порог text) ── */

  {
    id: 'tag-orange',
    fg: '--ui-color-tag-orange-text',
    bg: '--ui-color-tag-orange-bg',
    level: 'text',
    usage: 'тег orange; исходный #B34A10 давал 4.40:1 — AA-замена T2.3',
  },
  {
    id: 'tag-green',
    fg: '--ui-color-tag-green-text',
    bg: '--ui-color-tag-green-bg',
    level: 'text',
    usage: 'тег green',
  },
  {
    id: 'tag-blue',
    fg: '--ui-color-primary',
    bg: '--ui-color-tag-blue-bg',
    level: 'text',
    usage:
      '.tag--blue (components.css:108); до T4.3 bg ссылался на примитив --ui-blue-100 — пара заведена токеном --ui-color-tag-blue-bg',
  },

  /* ── Акцентный, статусный текст и ссылки на светлых поверхностях ── */

  {
    id: 'primary-on-surface',
    fg: '--ui-color-primary',
    bg: '--ui-color-surface',
    level: 'text',
    usage: 'ссылки-заголовки карточек и акцентный текст (vac-card__title a, btn--outline)',
  },
  {
    id: 'primary-on-surface-muted',
    fg: '--ui-color-primary',
    bg: '--ui-color-surface-muted',
    level: 'text',
    usage: 'btn--light: текст primary на blue-50',
  },
  {
    id: 'primary-on-surface-hover',
    fg: '--ui-color-primary',
    bg: '--ui-color-surface-hover',
    level: 'text',
    usage:
      'btn--light:hover и ghost-hover: текст primary на blue-100 (--ui-color-surface-hover, T4.2)',
  },
  {
    id: 'success-on-surface',
    fg: '--ui-color-success',
    bg: '--ui-color-surface',
    level: 'text',
    usage: 'success-текст и иконки на белом',
  },
  {
    id: 'success-on-success-bg',
    fg: '--ui-color-success',
    bg: '--ui-color-success-bg',
    level: 'text',
    usage: 'success-текст на success-поверхности (алерты — T4.5)',
  },
  {
    id: 'error-on-surface',
    fg: '--ui-color-error',
    bg: '--ui-color-surface',
    level: 'text',
    usage:
      'сообщения об ошибках field__error (fs-small); исходный #D8402C давал 4.48:1 — AA-замена T2.3',
  },
  {
    id: 'error-on-error-bg',
    fg: '--ui-color-error',
    bg: '--ui-color-error-bg',
    level: 'text',
    usage: 'error-текст на error-поверхности (алерты — T4.5)',
  },
  {
    id: 'info-on-surface',
    fg: '--ui-color-info',
    bg: '--ui-color-surface',
    level: 'text',
    usage: 'info-текст и иконки на белом',
  },
  {
    id: 'info-on-info-bg',
    fg: '--ui-color-info',
    bg: '--ui-color-info-bg',
    level: 'text',
    usage: 'info-текст на info-поверхности',
  },

  /* ── Некстовые (level: non-text, WCAG 1.4.11) ── */

  {
    id: 'focus-on-surface',
    fg: '--ui-focus-color',
    bg: '--ui-color-surface',
    level: 'non-text',
    usage: 'outline фокуса на белом (ADR-0001, 3px primary)',
  },
  {
    id: 'focus-on-surface-muted',
    fg: '--ui-focus-color',
    bg: '--ui-color-surface-muted',
    level: 'non-text',
    usage: 'outline фокуса на приглушённых секциях',
  },
  {
    id: 'accent-on-surface',
    fg: '--ui-color-accent',
    bg: '--ui-color-surface',
    level: 'non-text',
    usage:
      'акцент как иконка/индикатор на белом; текстовые пары accent (кнопки, hover) — T4.2/T2.6',
  },
];

/**
 * Осознанные исключения: цветовой токен слоя 2 без пары — только с
 * обоснованием (Implementation requirements T2.3 п.2). Токен-исключение,
 * найденный в паре, или неизвестный токен — ошибка конфига.
 */
export const EXCEPTIONS = [
  {
    token: '--ui-color-surface-translucent',
    reason:
      'альфа-поверхность (white-90) поверх контента/фото (pages.css:164): результат зависит от подложки; текст поверх шапки покрыт парами text-on-*',
  },
  {
    token: '--ui-color-glass-light',
    reason:
      'декоративное стекло поверх фото; текст поверх стекла дефолтной палитрой не предусмотрен (подписи на тёмном — зона T2.6/T9.1)',
  },
  {
    token: '--ui-color-glass-dark',
    reason: 'декоративное стекло поверх фото/тёмных секций; текстовых пар в дефолтной палитре нет',
  },
  {
    token: '--ui-color-glass-blue',
    reason: 'стекло поверх фото на тёмно-синем (баннер); декоративное, текстовых пар нет',
  },
  {
    token: '--ui-color-overlay',
    reason:
      'подложка оверлея баннера (pages.css:478; модалки — T7.2): затемнение сцены, а не текстовая пара',
  },
  {
    token: '--ui-color-divider',
    reason:
      'некстовой разделитель (крошки/прогресс): WCAG 1.4.11 не требует контраста для декоративных элементов',
  },
  {
    token: '--ui-color-border-muted',
    reason: 'мягкая рамка шапки внутренних страниц — декоративная',
  },
  {
    token: '--ui-border-color',
    reason:
      'рамка карточек (#D6D6D6) — декоративная; границы интерактивных контролов проверят e2e+axe компонентов (WCAG 1.4.11, EPIC-5)',
  },
  {
    token: '--ui-color-primary-hover',
    reason:
      'hover-пара одобренного дизайна (T2.6, ADR-0010: .btn--primary:hover = blue-700): значение макета не пересчитывается; белая подпись на #164b89 — 8.74:1 (AA), ревизия производных состояний — чек-лист T9.2 (крупные элементы ≥ 3:1 в hover)',
  },
  {
    token: '--ui-color-accent-hover',
    reason:
      'hover-пара одобренного дизайна (T2.6, ADR-0010: .btn--accent:hover = accent-light #f37131): значение макета не пересчитывается; белая подпись — 2.91:1 (< 3:1 крупного) — известный разрыв кнопочных пар (как 3.12:1 на базовом accent, не гейтится здесь — T4.2); ревизия производных — чек-лист T9.2',
  },
];

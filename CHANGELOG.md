# Changelog

Все заметные изменения irao-ui документируются в этом файле.

Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/),
версионирование — [SemVer](https://semver.org/lang/ru/) (политика — ADR-0007,
рабочая практика — T12.2).

## [Unreleased]

### Changed

- Цвет подписи поля: `ui-field__label` и legend группы радио (ui-radio-group)
  несут новый токен `--ui-color-field-label` (gray-700 `#616161`) вместо
  `--ui-color-text` — подпись «чуть тише текста, но читаема»: AA-замена серого
  #808080 оригинала (`.apply-form .field__label`, pages.css:1206) по прецеденту
  muted T2.3 — 6.19:1 на белом, 5.67:1 на blue-50 (визуальное изменение
  поставки, T16.9; пары `field-label-on-*` контраст-гейта). Границы токена:
  текст согласия чекбоксов/radio — контент, остаётся `--ui-color-text`;
  кнопка-лейбл ui-file — визуал `.btn--light` (primary);
- Горизонтальный паддинг полей: `4px 24px` → `4px 20px` (textarea `14px 20px`), как
  `.field__input` career-portal (components.css:150) — новый токен
  `--ui-field-pad-inline` (20px вне шкалы отступов — перенос «как есть», T14.6).
  Селект наследует автоматически; кастомный listbox ui-select не зависит от
  паддинга поля (триггер повторяет одобренный `.dd__trigger` 4/16). Визуальное
  изменение поставки;
- Горизонтальный паддинг кнопки: `12px 24px` → `12px 28px`, как `.btn`
  career-portal (components.css:71) — новый токен `--ui-button-pad-inline`
  (28px вне шкалы отступов — перенос «как есть», T14.3). sm-вариант наследует
  горизонталь (вертикаль sm не менялась); кнопочный вид `ui-link--button`
  следует за тем же токеном (визуальное изменение поставки);
- Цвет заголовков: роли `ui-h1…ui-h6` несут новый токен `--ui-color-heading`
  (alias на `--ui-color-primary`) — в поставке заголовки теперь тёмно-синие
  `#002856` career-portal вместо унаследованного цвета текста `#1F1F1F`
  (визуальное изменение поставки, T14.1; контраст 14.60:1 на surface,
  13.38:1 на surface-muted — пары `heading-on-*` гейта T2.3).

### Added

- Паттерн «Таймлайн этапов» (T14.11; REPORT §4, PLAN P1-5) —
  [`patterns/timeline/`](patterns/timeline/README.md): порт композиции
  `.timeline`/`steps_html` career-portal (build.py:484, pages.css:1096) — ol
  этапов (`role="list"` по конвенции Safari/VoiceOver) с видимыми номерами в
  точках 56px (не `content: counter`), заголовками h3 и текстами;
  соединительная линия — декоративное `::after` связки этапа (2px, под
  точками, в a11y-дерево не попадает); горизонтальный ряд 1fr-колонок от
  1024, мобильная деградация в колонку. Связки `tl-*` — зона сайта (на
  стенде — `<style>` паттерна, в dist не попадает); компонент
  `dist/ui-timeline` не создаётся (второго потребителя нет). Стенд —
  `stands/patterns/timeline.html`; юнит-пины + e2e (axe, ряд/колонка,
  эталоны 4 вьюпортов в контейнере — ADR-0004);
- Паттерн «Страница списка» — ветки раскладок «строки» и «сайдбар фильтров»
  (T14.10; REPORT §4, PLAN P1-3/P1-4). «Строки»: выдача горизонтальными
  строками вакансий — порт `.vac-row` (build.py `render_vacancy_card`) —
  `article.ui-card--hover` + flex-связка `lpp-row` (зона сайта, на стенде —
  `<style>` паттерна), заголовок выдачи h2 → строки-`article` с h3-ссылкой
  (роль `ui-h4`), место/описание/дата (`<time datetime>`), CTA
  `ui-button--pill` (T14.4) вне ссылки заголовка (инвариант вложенных
  интерактивов ui-card) с `href`-заглушкой и `data-ui-modal-target` на
  демо-модалку отклика. «Сайдбар»: grid «aside | выдача» — порт
  `.vac-layout`/`.vac-side`: sticky-панель от md (280px, top 24px,
  `max-height` + `overflow-y` + `tabindex="0"` — axe
  scrollable-region-focusable), select-пилюли `label[for]`, radio-группа
  «Опыт» (fieldset/legend), чекбокс доступности, «Применить»/«Сбросить»,
  промо `ui-card--filled`; чипы направлений `ui-chip` (T14.8) над выдачей
  строк. Новый CSS в системе отсутствует (граница patterns/README); README
  паттерна — правила выбора раскладок и Bitrix-заметки (строки из ИБ,
  сохранение GET-параметров пагинации);
- Модификатор тега «на фото» `.ui-tag--on-photo` (T16.10; REPORT §3.3,
  остаток раунда 1): API оверлейного тега поверх фото/тёмного —
  непрозрачная плашка `--ui-color-primary` / `--ui-color-text-on-dark`
  (14.60:1, контраст не зависит от снимка — не tint), высота 40px
  (`--ui-tag-height-on-photo`; 40 вне шкалы §3.2 — перенос «как есть»,
  провенанс pages.css:596). Правило применения — README ui-tag: только
  поверх фото/тёмного, на светлом фоне — цветовые варианты базы 28px;
  алиас `tag-on-photo` в контраст-гейте (T2.3). Реклассификация ревью
  T16.10 (errata спеки): «белый на primary, 40px» оригинала — активные
  фильтр-ссылки `.tag--blue.filter-tag` (pages.css:596), теги на фото несут
  тинты 28px — в пилоте модификатор не применяется (паритет с оригиналом),
  применение — решение владельца (зона T16.14);
- Модификатор пагинации «без стрелок» `.ui-pagination--bare` (T16.6; REPORT
  §8.2 №7): форма компонента только из страниц — как `.pagination` оригинала
  career-portal на списковых страницах (у того стрелок в DOM нет вовсе).
  Основная форма — разметка не включает `ui-pagination__arrow`; модификатор
  на блоке — страховка для готовой разметки (`display: none`: скрытое не
  фокусируется, не кликается и не читается, лишних остановок Tab нет).
  Стили `__page` не меняются, `aria-label` контейнера прежний. Когда уместен
  (компактные списки, как в career-portal) и граница с правилом «не прятать
  недоступную стрелку выборочно» — README ui-pagination; adoption пилота:
  пагинация vacancies клона — bare (паритет с оригиналом);
- ui-tabs: модификатор `.ui-tabs--pill` и начальный выбор таба из разметки
  (T14.9). Модификатор — вид навигации разделов career-portal (`.tabs-pill`,
  pages.css:969–1001, REPORT §3.3/PLAN P1-2): прозрачные пилюли без рамки на
  тинт-треке `--ui-color-surface-muted` (паддинг/gap `--ui-space-1`, радиус
  pill), hover — подпись primary без заливки, активная — общая заливка
  primary/text-on-dark; клавиатура/ARIA базы не меняются. Начальный выбор:
  при инициализации модуль выбирает таб с `aria-current="page"` вместо
  первого (silent — без `irao-ui:tabs-select`); дубли атрибута — первый +
  `console.warn`; без атрибута поведение прежнее. Межстраничным наборам
  табов больше не нужен ручной `IraoUI.tabs.select(i)` с сайта (пилот снимет
  хак в T14.12);
- Компонент `ui-chip` — интерактивный фильтр-чип (T14.8): пилюля 36px
  (`--ui-chip-height`, `.chip` career-portal pages.css:137–151, 4+ страницы),
  блок-группа (лента flex-wrap, gap 8px) + `__pill`; обе формы — кнопочная
  (`type="button"` + `aria-pressed`) и ссылочная (GET, `aria-current="page"`
  на активной); активное состояние — ARIA-атрибутом, не классом (WCAG 1.4.1),
  JS-модуля нет. Пары `chip-default`/`chip-active` в контраст-гейте (T2.3).
  Закрывает самый частый GAP пилота (REPORT §4, PLAN P1-1) и обещание README
  ui-tag «паттерн T8.1» (ссылка заменена на ui-chip);
- Тинты primary — штатные полупрозрачные производные `--ui-color-primary-a10/
  -a20/-a26/-a55/-a94` (T14.7): `color-mix(in srgb, var(--ui-color-primary)
  N%, transparent)`, суффикс — процент primary в смеси. Следуют за primary в
  темах автоматически (в отличие от примитивов-альф, прибитых к blue-800);
  color-mix — Baseline 2023, фолбэк не пишется (ADR-0005). Потребители —
  сайт-зоны (плашки hero-тегов, стеклянные карточки, оверлеи; REPORT §4,
  PLAN P3); граница — декоративные поверхности, не текст
  (docs/ui-system/architecture/tokens-usage.md, раздел «Тинты primary»).
  Контраст-гейт: токены-тинты — осознанные исключения pairs.config.mjs,
  текст на тинте проверяется парой с конкретным фоном (T2.3);
- Модификатор поля «плотная анкета-модалка» `.ui-field--compact` (T14.6):
  `min-height` 48px (`--ui-field-height-compact`; height `.apply-form
  .field__input` pages.css:1208 оригинала) на `__input`/`__select`; textarea
  высоту не меняет (многострочность важнее плотности), паддинг не трогает.
  Расширение API поля; потребитель — apply-формы career-portal. 48 ≥ 44px —
  touch-минимум не нарушен;
- Модификатор кнопки «пилюля со стрелкой» `.ui-button--pill` (T14.4): самый
  частый CTA оригинала (`.pill-btn` career-portal — «откликнуться →»):
  h44 (`--ui-button-height-pill`), фон surface, рамка 1px, круглая иконка-
  стрелка в кружке accent (`--ui-button-pill-icon-size`) на обычном
  `__icon`; hover — `surface-hover`; совместим с `ui-button--sm`
  (кружок `--ui-button-pill-icon-size-sm`). Расширение API кнопки;
  потребитель — ветка «строки» паттерна списка (T14.10) и карточки-ссылки;
- Роль «заголовок страницы» `.ui-page-title` (T14.2): тег `h1` внутренних
  страниц (список/детальная/форма) со шкалой `h2` — fs/lh/fw-h2 + ls −0.02em +
  `--ui-color-heading`, как `.page-title` career-portal (60px при h1 вместо
  80px у `ui-h1`). Расширение API типографики; page-паттерны list/detail/form
  переведены на роль, лендинг/hero-h1 остаётся `ui-h1`;
- Dev-сборка `dist/ui.dev.js` — не минифицированный вариант `ui.min.js` с
  механизмом deprecation-предупреждений: `window.IraoUI.dev` печатает
  `console.warn` при использовании deprecated-класса в DOM (скан при старте +
  MutationObserver для динамики). Прод-бандл `ui.min.js` молчит — механизм
  существует до первого deprecated (T12.2, ADR-0007);
- Шаблон migration-guide для будущих major —
  [docs/templates/migration-guide-template.md](docs/templates/migration-guide-template.md).

### Fixed

- ui-modal: сигнал завершения закрытия не зависит от движка анимаций (webkit);
  guard'ы requestAnimationFrame и поллинга в startCloseWatch — устойчивость
  на стендах без rAF.

## [v0.1.0] — 2026-10-10

Первый предрелиз дизайн-системы irao-ui (линия 0.x): полный кодовый стек
компонентов, доступность и релизный конвейер.

### Added

- Токены: primitives + semantic-слой, темы, контраст-гейт AA, брейкпоинты (T2.1–T2.6);
- База: шрифты/reset, политика фокуса, типографика, layout, skip-link, zoom-гейты (T3.1–T3.6);
- Примитивы: link, button, tag/badge, card, alert, image/figure, breadcrumbs, empty/error (T4.1–T4.8);
- Формы: field, select/checkbox/radio, file, layout, валидация, контракт серверных ошибок (T5.1–T5.6, MVP-код);
- Навигация и интерактив: dropdown, tabs, pagination, accordion, native dialog/modal (T6.1–T6.4, T7.1–T7.2);
- Сложные компоненты и паттерны: select, таблицы, loader, паттерны страниц (T7.3–T7.6, T8.1–T8.3);
- Доступность: VI-модуль по ГОСТ Р 52872, a11y-hardening, протокол скринридеров (T9.1–T9.2);
- Документация: шаблон док-страниц, доки всех компонентов, quickstart и гайды внедрения, CONTRIBUTING, ADR (T10.1–T10.4);
- Инфраструктура: сборка dist + showcase, CI-гейт, Playwright-харнесс и visual-эталоны, vitest, сниппеты Bitrix и legacy-констрейнты (T1.1–T1.6, T11.1);
- Релизный конвейер: тег → матрица браузеров → smoke → dist-zip → GitHub Release (T12.1).

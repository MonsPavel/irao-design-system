# Архитектура UI System для сайтов на 1С-Битрикс

Рабочее название: **irao-ui**. Статус: архитектурное решение, код не пишется до утверждения.

Базируется на аудите `D:/repositories/career-portal` (см. [01-audit-career-portal.md](01-audit-career-portal.md)) и на требовании «не overengineering»: система должна пережить несколько лет поддержки силами 1–3 frontend-разработчиков и интеграторов на Bitrix.

---

## 0. Требования как архитектурные ограничения

Из 21 требования заказчика каждое либо закреплено конкретным механизмом системы, либо покрывается процессом (тесты/документация):

| Требование | Механизм |
|---|---|
| Mobile-first, responsive | mobile-first CSS, токенизированные брейкпоинты, контейнер |
| Кросс-браузерность | нативный CSS/JS без транспиляции; матрица evergreen-браузеров в CI (Playwright) |
| Версия для слабовидящих | модуль `vi` из career-portal (ГОСТ Р 52872) как отдельный слой |
| Semantic HTML5, валидный HTML | HTML-паттерны компонентов + `html-validate` в CI |
| Schema.org | микроразметка в паттернах там, где уместно (хлебные крошки, статьи, организации, события) — по правилам «не ради галочки» |
| SEO: h1→h2→h3, meta, alt | правила в доке каждого компонента + автотест иерархии заголовков (перенос идеи из career-portal) |
| Retina | политика изображений: векторные иконки, srcset/@2x, width/height обязательны |
| Fallback-шрифты | стек `Golos Text, Arial, sans-serif` + системный фолбэк-набор для тем без Golos |
| Работа без JS | все компоненты работают/деградируют без JS (progressive enhancement); формы отправляются нативно |
| Без Flash | нет по построению |
| HTML5 forms | нативные элементы, валидация серверная первична, клиентская — усиление |
| Keyboard / screen readers | стратегия раздела 5 |
| Увеличение шрифта не ломает вёрстку | типографика в rem, размеры контролов от em/rem, запрет фиксированных высот текстовых блоков |
| Отсутствующие изображения | правила alt, `width/height`, стили fallback-состояний |
| Переиспользование между Bitrix-сайтами | версия + дистрибутив + themes (разделы 6–8) |

---

## 1. Общая архитектура

```text
                    ┌──────────────────────────────────┐
                    │  репозиторий irao-ui (mono-repo) │
                    │  tokens → base → components →    │
                    │  a11y(vi) → patterns → docs      │
                    └───────────────┬──────────────────┘
                                    │  build (esbuild, dev-only)
                                    ▼
                       dist/  ui-core.min.css, ui-vi.min.css,
                              ui.min.js, fonts/, themes/
                                    │  release vMAJOR.MINOR.PATCH
                                    ▼
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
   Bitrix-сайт A              Bitrix-сайт B              Bitrix-сайт C
   /local/ui/1.x/…            /local/ui/1.x/…            /local/ui/2.x/…
   theme-a.css                theme-b.css                theme-c.css
   (переопределяет            (переопределяет            (мажорная версия
    --ui-* токены)             --ui-* токены)             — своя папка)
```

Принципы:

1. **Компонент = HTML-паттерн + CSS (БЭМ, `ui-`) + опциональный JS-модуль.** API компонента — имена классов и data-атрибуты. Визуал — токены. Разделение: классы не меняются от сайта к сайту, меняются только значения `--ui-*`.
2. **Никаких runtime-зависимостей** (ни jQuery, ни Vue/React, ни Bootstrap/Tailwind). Сборочные зависимости — только dev-only в репозитории системы (esbuild, stylelint, eslint, Playwright). На сайтах — только готовые файлы из `dist/`.
3. **Progressive enhancement**: без JS доступны навигация, формы, аккордеоны (`<details>`-совместимая разметка или скрытый контент в DOM), select'ы остаются нативными; JS добавляет удобство (кастомный listbox, focus trap, динамическую валидацию).
4. **Специфичность — один класс.** Никаких вложенных селекторов глубже элемента, никаких ID в CSS, `!important` запрещён вне модуля `vi` (там он — осознанный инструмент перекраски). Два осознанных исключения (ADR-0001/0002, [adr/](adr/)): политика фокуса — селекторы «элемент+псевдокласс» `a:focus-visible…`, побеждающие legacy tag-правила независимо от порядка каскада; и `box-sizing: border-box` на корне каждого компонента, переживающий legacy `*`-сбросы.

---

## 2. CSS-подход: сравнение и решение

Критерии именно наши: server-rendered HTML из PHP-шаблонов Bitrix, сосуществование с legacy-CSS сайтов, интеграторы на Bitrix без глубокого frontend-бэкграунда, темизация per-site, поддержка годами.

| Подход | Вердикт | Почему |
|---|---|---|
| **Bootstrap** | ❌ | Тянет свою нормализацию, свои паттерны разметки и вид; конфликтует с brand-дизайном (придётся перебивать сотни правил); избыточен — нам нужно ~25 компонентов; обновления мажорных версий Bootstrap исторически ломают кастомизацию; +200KB CSS, из которых сайтом используется четверть. В legacy-Bitrix Bootstrap часто уже есть (старые шаблоны) — второй Bootstrap усугубит конфликт. |
| **Tailwind (utility-first)** | ❌ | Утилиты в PHP-шаблонах Битрикса = нечитаемая «каша» классов, которую интеграторы не смогут править; требует build-процесса на каждом сайте (или огромный CDN-байтcode); темизация через конфиг, а не через токены в рантайме; версионировать компонентный API невозможно (API и есть набор утилит). Прямо противоречит «переиспользуемые компоненты + темы без пересборки». |
| **CSS Modules** | ❌ | Требуют JS-сборку на стороне потребителя; генерируют имена классов — HTML в PHP-шаблонах пишется руками, имена не скопируешь в доку; бессмысленны без компонентного фреймворка. |
| **Native CSS + custom properties + БЭМ** | ✅ | Работает без сборки вообще (файлы из dist можно подключить как есть); предсказуемая специфичность одного класса; namespace `ui-` изолирует от legacy; темизация — переопределением CSS-переменных без пересборки; HTML-паттерны копируются в шаблоны; доказано career-portal (4881 строка CSS/JS в продакшн-режиме без единой зависимости). |

Дополнительные решения внутри выбранного подхода:

- **CSS Cascade Layers (`@layer`)** — осознанно **не используем для базовой изоляции**: непослойные legacy-стили Битрикса всегда победят слоистые, то есть `@layer` сделает систему беззащитной перед старым CSS сайтов. Вместо слоёв — namespace + односелекторная специфичность + контроль порядка подключения (система подключается **раньше** CSS сайта). `@layer` допустим внутри системы в будущем, когда legacy уйдёт.
- **Препроцессор не нужен**: custom properties закрывают все сценарии (темы, состояния, dark/VI). PostCSS-плагины (autoprefixer, minify) — только на этапе сборки dist.
- **Scope изоляции reset'а**: сброс стилей применяется к элементам и классам системы, а не глобально (`*, *::before` только в `ui-base` с осторожностью — см. раздел про base). Глобальные вещи (`[hidden]`, `img { max-width: 100% }`) переносим из career-portal как безопасные и полезные для сайта в целом; подключение `ui-base.css` документируется как «безопасный глобальный слой».
- **box-sizing под legacy (ADR-0002):** глобальный сброс `box-sizing` не переживает legacy-правила, подключённые позже (равная специфичность универсальных селекторов — решает порядок). Поэтому каждый компонент объявляет `box-sizing: border-box` на своём корне и внутренних элементах с размерами; строка входит в шаблон новой компоненты и ревью-чек-лист.

### Namespace

- Блоки: `ui-button`, `ui-field`, `ui-modal`…
- Элементы: `ui-button__icon`, `ui-field__label`…
- Модификаторы: `ui-button--primary`, `ui-field--error`…
- Состояния: `is-open`, `is-active`, `is-loading` (одинаково во всей системе; из career-portal) — только вместе с блоком: `.ui-modal.is-open`.
- Токены: `--ui-*` (например `--ui-color-primary`, `--ui-space-4`).
- JS-хуки: `data-ui-*` (например `data-ui-modal`, `data-ui-select`) — JS никогда не вешается на стилевые классы. Глобальный неймспейс JS: `window.IraoUI` (модули `IraoUI.vi`, `IraoUI.select`, события `irao-ui:modal-open`).
- Темы: `data-ui-theme="irao"` на `<html>` или `<body>`.

Префикс `ui-` короток, читаем интеграторами, не пересекается с классами Bitrix (`bx-`, типовые `wrapper`, `container`, `btn` остаются занятыми старыми сайтами — именно поэтому neutral-имена запрещены).

---

## 3. Design Tokens

### 3.1 Два обязательных слоя + один опциональный

```css
/* ── Слой 1: примитивы (raw) — имена значений, не смысла. Не переопределяются темами. */
:root {
  --ui-blue-800: #002856;
  --ui-blue-700: #164B89;
  --ui-orange-500: #F26722;
  --ui-gray-100: #F0F1F3;
  --ui-gray-600: #808080;
  --ui-white: #FFFFFF;
  --ui-black: #1F1F1F;
  /* … полная палитра */
}

/* ── Слой 2: семантика — единственное, что переопределяет тема. */
:root {
  --ui-color-primary: var(--ui-blue-800);
  --ui-color-accent: var(--ui-orange-500);
  --ui-color-text: var(--ui-black);
  --ui-color-text-muted: var(--ui-gray-600);
  --ui-color-surface: var(--ui-white);
  --ui-color-surface-muted: var(--ui-gray-100);
  --ui-color-error: var(--ui-red-600);
  --ui-color-success: var(--ui-green-700);
  /* focus */
  --ui-focus-color: var(--ui-color-primary);
  --ui-focus-width: 3px;
  --ui-focus-offset: 2px;
}

/* ── Слой 3 (опционально): компонентные токены — только где реальная потребность в темизации. */
:root {
  --ui-button-height: 52px;
  --ui-button-radius: var(--ui-radius-pill);
}
```

Правило против over-abstraction: **слой 3 заводится только если хотя бы двум сайтам нужно разное значение**. По умолчанию компоненты читают слой 2.

### 3.2 Полный состав токенов (MVP)

| Группа | Токены | Примечания |
|---|---|---|
| Цвета-примитивы | палитра brand + neutral + status | из `variables.css` career-portal + недостающие статусы |
| Цвета-семантика | primary, accent, text, text-muted, surface*, border, error/success/info (+bg), on-dark | + пары для контрастных секций |
| Типографика | `--ui-font-family[-mono]`, `--ui-fs-{h1..h6,lead,body,small,caption,micro}`, `--ui-lh-*`, `--ui-fw-*` | **в rem**, база на `html`; фолбэк-стек `Golos Text, Arial, Helvetica Neue, sans-serif` |
| Отступы | `--ui-space-1..8` (4/8/12/16/24/32/48/64) | фиксированная степенная шкала, без «произвольных» значений |
| Брейкпоинты | **не CSS-переменные** (media query нельзя выразить через var) — константы сборки + задокументированная шкала: `sm 480, md 768, lg 1024, xl 1280, 2xl 1440` | единая шкала `min-width`, mobile-first |
| Контейнеры | `--ui-container-max`, `--ui-container-pad{,-md,-lg}` | значения по брейкпоинтам |
| Рамки/радиусы | `--ui-radius-{none,sm,md,lg,pill}`, `--ui-border-width`, `--ui-border-color` | |
| Тени | `--ui-shadow-{sm,md,lg}` + токен тени карточки | сейчас в career-portal тени захардкожены |
| Z-index | `--ui-z-{dropdown:70, sticky:100, header:150, overlay:200, modal:300, vi:400}` | фиксирует сегодняшний плавающий `z-index: 70/200` |
| Focus | `--ui-focus-color/width/offset` | единая политика `:focus-visible` |
| Переходы | `--ui-transition{,-fast,-slow}` (0.15/0.25/0.4s ease) | |
| Состояния | hover/active/disabled через color-mix: `color-mix(in srgb, var(--ui-color-primary) 88%, black)` | современный нативный способ производных цветов; проверка поддержки в матрице браузеров |
| VI-режим | токены не переопределяются — модуль vi работает классами по ГОСТ | см. раздел 5 |

### 3.3 Механика тем: `Base UI → Theme → Site`

```text
ui-core.css            (значения по умолчанию = бренд Интер РАО, слой 2 в :root)
      ↓ подключается раньше
themes/theme-corp.css  ([data-ui-theme="corp"] { --ui-color-primary: …green… })
      ↓ подключается раньше
site CSS               (.my-landing .ui-button { … } — точечные правки, допускается)
```

- Тема — **только файл с переопределением семантических токенов**. Ни одного селектора по классам компонентов.
- Сайт может переключать темы декларативно (`<body data-ui-theme="company-x">`), в том числе по разделу сайта.
- Обратная совместимость тем: добавление новых семантических токенов — minor-версия с дефолтом в `:root` (старая тема просто не знает про новый токен, работает дефолт). **Переименование/удаление токена — major.**
- API компонента при этом стабилен: `ui-button ui-button--primary` одинаков на всех сайтах, «Site A синяя / Site B зелёная» — это значения токенов.
- **Решение Phase 0 (2026-10-05):** в MVP поставляется только дефолтная тема Интер РАО; мульти-брендовых тем нет. Механизм тем полностью сохраняется и проверяется одной синтетической тестовой темой — реальные темы компаний добавятся minor-версиями без изменения архитектуры. Дефолтная тема = одобренный визуал career-portal (макет CP_Ревью): значения переносятся, отклонения от них — design-decision с согласованием владельца дизайна.

---

## 4. Компоненты: карта и приоритеты

Обозначения: **P0** — MVP, **P1** — сразу после MVP, **P2** — позже (по потребности реальных сайтов).

| Компонент | Приоритет | Источник | Комментарий |
|---|---|---|---|
| Tokens + base (reset, fonts, focus, skip-link) | P0 | career-portal B | фундамент |
| Typography (заголовки, текст, lead, list) | P0 | career-portal B | rem-шкала |
| Container / Section / Grid (cards-grid) | P0 | career-portal B | mobile-first пересборка |
| Link (`ui-link`) | P0 | new | стили + внешние/файловые паттерны |
| Button | P0 | career-portal B | +sizes, disabled, loading, focus-visible |
| Badge / Tag | P0 | career-portal A | готов |
| Card | P0 | career-portal B | + варианты border/filled, hover-правила для touch |
| Breadcrumbs (+schema.org BreadcrumbList) | P0 | career-portal A | + микроразметка |
| Input / Textarea / Select (нативный) / Checkbox / Radio / File | P0 | career-portal B | включая error/hint/required |
| Form layout (`ui-form-grid`) + validation states | P0 | career-portal B | серверная валидация первична |
| Alert / status message | P0 | new | из токенов статусов |
| Image (паттерн + `ui-figure`) | P0 | career-portal D | retina, alt-правила, lazy, fallback |
| Empty state / Error state (404, list-empty) | P0 (паттерны) | new | доки + разметка, CSS-минимум |
| VI-модуль (панель + режимы) | P0 | career-portal A | отдельный dist-файл |
| Accordion (FAQ, `<details>`-база) | P1 | career-portal B | a11y-полировка |
| Dropdown (header-подобный) | P1 | career-portal B | из header.js + dropdowns.js |
| Tabs | P1 | career-portal B | из tracks.js, +roving tabindex |
| Modal (dialog) | P1 | career-portal B | native `<dialog>` + fallback |
| Custom Select (listbox поверх нативного) | P1 | career-portal B | уже зрелый |
| Pagination | P1 | career-portal A | +disabled текущая, aria-current |
| Table (responsive паттерны) | P1 | new | scroll/collapse-паттерны |
| Tooltip | P2 | new | только после modal (переиспользует позиционирование) |
| Loader/Spinner | P1 (мини) | new | skeleton P2 |
| Header/Nav/Footer — паттерны (не компоненты) | P1 | career-portal C→B | как референс-доки, не как код системы |
| Search overlay — паттерн | P1 | career-portal B | на базе modal |
| Carousel/Slider | P2 | career-portal C→B | scroll-snap без JS в базе |
| Stepper, Breadcrumbs-deep, Notifications/toast | P2 | new | по запросу сайтов |

Граница «компонент vs паттерн»: компонент имеет CSS+доку+тесты и живёт в `dist`; паттерн — документированный HTML-скелет (header, страница списка), CSS-минимум, сайты адаптируют под себя. Это защищает систему от раздувания.

---

## 5. Accessibility strategy

**Целевой уровень: WCAG 2.1 AA** (критерии-цели: 1.4.3 контраст, 2.1.1 клавиатура, 2.4.7 фокус, 4.1.2 имя/роль/значение). ГОСТ Р 52872 (VI-версия) закрывает отдельный контур и не заменяет AA.

| Область | Архитектурное решение |
|---|---|
| Focus-visible | Глобальное правило в `ui-base` (ADR-0001): список селекторов `a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, summary:focus-visible, [tabindex]:focus-visible { outline: var(--ui-focus-width) solid var(--ui-focus-color); outline-offset: var(--ui-focus-offset); }` — специфичность 0-1-1 каждой побеждает legacy tag-правила вида `a { outline: none }` независимо от порядка подключения (система грузится первой). Сознательное исключение из правила «один класс». Все компоненты запрещают `outline: none` без замены (stylelint). |
| Focus management | Модуль `IraoUI.focus`: trap/restore для modal/dropdown/search — один код на все оверлеи. Правило: кто открыл — тот получает фокус обратно (паттерн уже есть в career-portal). |
| Skip-link | `ui-skip-link` в P0: первый элемент `<body>`, переход на `#main` (или `data-ui-main`). |
| Keyboard | Все интерактивные паттерны из WAI-ARIA APG: dropdown (Escape, стрелки, вне-клик), tabs (стрелки + Home/End), modal (Tab/Shift+Tab trap, Escape), accordion (Enter/Space), listbox-стрелки. Всё уже частично реализовано в career-portal — переносим и закрываем пробелы. |
| ARIA | Принцип «сначала нативная семантика»: `<dialog>`, `<details>`, `<button>`, `<nav>`; ARIA только там, где нативного нет (listbox, tabs). Правило для интеграторов — в доке каждого компонента с do/don't. |
| Screen readers | `aria-current`, `aria-expanded`, `aria-hidden` на декоративном SVG, живые области `aria-live="polite"` для успеха форм и загрузки списков. Проверка NVDA/VoiceOver — чек-лист в доке компонента (регресс в CI — axe, не скринридер). |
| Contrast | Токены проходят проверку AA до утверждения (задача в Phase 2); «серый muted на белом» из career-portal (#808080) заменяется на 4.5:1-вариант. VI-темы имеют собственные гарантированные пары. |
| Reduced motion | Глобальный kill-switch (из career-portal) + `@media (prefers-reduced-motion)` в анимированных компонентах. |
| Font scaling | Типографика и контролы в rem/em; в доках компонентов запрет фиксированных высот для текстовых узлов; тест «страница при 200% zoom и 32px base не разваливается» в CI (Playwright). |
| High contrast / forced-colors | Базовая поддержка: `@media (forced-colors: active)` для кнопок/полей (system colors, видимые границы). P1. |
| Формы и валидация | `label` обязателен, `required` + `aria-required`, ошибка: `.ui-field--error` + `aria-invalid` + `aria-describedby` на поле, текст ошибки связан id; фокус на первую ошибку (паттерн career-portal); серверные ошибки рендерятся теми же классами — Bitrix-форма и фронт выглядят одинаково. |
| Modal/Dropdown/Tabs/Accordion | Семантика + фокус по APG (выше); модалки — native `<dialog>` (метод `.showModal()` даёт trap и Escape бесплатно) с fallback на классический паттерн для старых браузеров — SPIKE в backlog'е подтверждает поддержку в матрице. |
| Loading states | `aria-busy` на контейнере, спиннеры `aria-hidden` + текстовая альтернатива, skeleton'ы без мерцания при reduced-motion. |
| Изображения | Правила: декоративное — `alt=""`; информативное — осмысленный alt; `width/height` обязательны (нет CLS); complex images — `aria-describedby`. |
| VI-версия (ГОСТ Р 52872) | Модуль `vi` из career-portal как есть (класс A): панель настроек, 5 тем, размер шрифта, интервал, картинки, localStorage. Инвариант системы: **ни один компонент не использует inline-стили и не должен зависеть от конкретных цветов вне токенов** — тогда перекраска `!important` из vi.css корректно накрывает всё. Это фиксируется stylelint-правилом (запрет inline-стилей в паттернах, запрет hex вне tokens.css). |

---

## 6. Интеграция с Битрикс

### 6.1 Форма дистрибуции

Единый источник — релизы репозитория irao-ui. Релиз = git-тег + артефакты `dist/`:

```
dist/
├── ui-core.min.css        # tokens + base + все P0/P1 компоненты (~30–50 KB gzip)
├── ui-vi.min.css          # версия для слабовидящих (подключать по желанию)
├── ui.min.js              # все JS-модули, один файл, IIFE (~10–15 KB)
├── fonts/                 # Golos Text woff2 (cyr/lat, 400/500/600)
└── themes/                # механизм тем (в MVP — только дефолтный бренд; файлы компаний появятся по мере надобности)
```

Способ доставки на сайт (рекомендация): **копия версии в сайт** — `/local/ui/{version}/…`. Почему не общий статик-домен: нет CORS/инфраструктурных зависимостей, кэш-инвалидация тривиальна, сайт автономен (требование корп. ИБ обычно именно такое), откат = смена одной константы. Общий домен остаётся опцией на будущее для группы из 5+ сайтов — решение за вами (см. открытые вопросы в 05-mvp-risks).

### 6.2 Подключение CSS/JS/шрифтов (шаблон сайта)

`header.php` шаблона сайта:

```php
<?php
// Версия UI-системы, закреплённая за сайтом. Обновление = правка этой строки.
const UI_VERSION = '1.4.2';

$asset = \Bitrix\Main\Page\Asset::getInstance();
$asset->addCss('/local/ui/' . UI_VERSION . '/ui-core.min.css');
$asset->addCss('/local/ui/' . UI_VERSION . '/themes/theme-career.css'); // тема — необязательна (в MVP все сайты в дефолтном бренде)
$asset->addJs('/local/ui/' . UI_VERSION . '/ui.min.js', true); // true => в конец, defer-семантика Bitrix

// VI-версия: подключается всегда (кнопка входа должна работать на любой странице)
$asset->addCss('/local/ui/' . UI_VERSION . '/ui-vi.min.css');
?>
<!DOCTYPE html>
<html lang="<?= LANGUAGE_ID ?>">
<head>
  <!-- preload шрифтов до CSS-каскада Bitrix -->
  <link rel="preload" href="/local/ui/<?= UI_VERSION ?>/fonts/golos-400-cyr.woff2"
        as="font" type="font/woff2" crossorigin>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <?php $APPLICATION->ShowHead(); ?>
</head>
<body data-ui-theme="irao">
```

Шрифты кладутся рядом с CSS — относительные `url()` из `@font-face` работают без правок. Порядок в каскаде: `ui-core` → тема → `template_styles.css` сайта (стили сайта подключаются последними и могут точечно доопределять — это документированная точка расширения).

### 6.3 Использование компонентов в PHP/HTML

Компонент — копируемый HTML-паттерн из документации. Пример в шаблоне Bitrix-компонента списка вакансий:

```php
<!-- template.php компонента bitrix:news.list -->
<?php foreach ($arResult['ITEMS'] as $item): ?>
  <article class="ui-card ui-card--hover">
    <h3 class="ui-card__title">
      <a href="<?= $item['DETAIL_PAGE_URL'] ?>"><?= $item['NAME'] ?></a>
    </h3>
    <div class="ui-tag-group">
      <span class="ui-tag ui-tag--muted"><?= $item['PROPERTIES']['EXPERIENCE']['VALUE'] ?></span>
    </div>
    <a class="ui-button ui-button--accent" href="<?= $item['DETAIL_PAGE_URL'] ?>apply/">
      Откликнуться
    </a>
  </article>
<?php endforeach; ?>
```

Форма отклика (нативная отправка работает без JS, валидация — серверная, классы ошибок совпадают с клиентскими):

```php
<form class="ui-form" method="post" action="/local/ajax/apply.php" novalidate>
  <div class="ui-field <?= $errors['email'] ? 'ui-field--error' : '' ?>">
    <label class="ui-field__label" for="apply-email">E-mail <span class="ui-field__req">*</span></label>
    <input class="ui-field__input" type="email" id="apply-email" name="email"
           value="<?= htmlspecialchars($form['email']) ?>"
           <?= $errors['email'] ? 'aria-invalid="true" aria-describedby="apply-email-err"' : '' ?>
           required>
    <?php if ($errors['email']): ?>
      <p class="ui-field__error" id="apply-email-err" role="alert"><?= $errors['email'] ?></p>
    <?php endif; ?>
  </div>
  <label class="ui-checkbox">
    <input type="checkbox" name="consent" required> <span>Согласен на обработку персональных данных</span>
  </label>
  <button class="ui-button ui-button--primary" type="submit">Отправить</button>
</form>
```

Данные для JS-компонентов — тот же паттерн, что доказан в career-portal (JSON в разметке → `json_encode` из инфоблока):

```php
<script type="application/json" data-ui-tabs-data>
  <?= json_encode($tabsFromIblock, JSON_UNESCAPED_UNICODE) ?>
</script>
```

Позднее (не MVP) возможен тонкий PHP-слой: хелпер `\IRAO\UI::button('Отправить', ['variant' => 'primary'])` — вводится только если копирование HTML реально начнёт доставать болью (решение по факту эксплуатации, см. риски over-abstraction).

### 6.4 Ответы на 14 вопросов интеграции

1. **Как подключается система** — версионированная папка `/local/ui/{version}/` + 3–4 строки в `header.php` (код выше).
2. **CSS** — через `Asset::addCss` в порядке: core → theme → site. Объединение/минификация Bitrix (`\Bitrix\Main\Page\Asset::getInstance()->setJsOptimize` etc.) совместимы: файлы уже минифицированы, дополнительная компрессия безопасна.
3. **JS** — один файл `ui.min.js`, `addJs(..., true)`; все модули самодостаточные IIFE без глобальных конфликтов; публичное API — `window.IraoUI`.
4. **Шрифты/assets** — рядом с CSS в той же папке версии; preload 1–2 файлов (400/500 cyr — 90% русской страницы, паттерн career-portal).
5. **Использование в PHP** — копирование HTML-паттернов (примеры выше); JSON-данные через `<script type="application/json">`.
6. **Конфликты со старым CSS** — namespace `ui-` (нейтральные имена запрещены), односелекторная специфичность, подключение до CSS сайта, никаких `@layer`/`!important` в core (кроме vi). Legacy-страницы вообще не трогают систему.
7. **Версионирование** — semver; папка с точной версией; `UI_VERSION` — единственное место правки при обновлении.
8. **Релизы** — tag → CI собирает dist → артефакт релиза (zip) + changelog. Обновление сайта = скачать zip в новую папку + сменить константу.
9. **Breaking changes** — только в major; папка новой мажорной версии (`/local/ui/2.0.0/`) не затирает `/local/ui/1.x/` — сайт мигрирует, когда готов.
10. **Переопределение токенов сайтом** — theme-файл (бренд) и/или точечный CSS сайта после core. Токен уровня сайта: `:root { --ui-color-primary: … }` в `template_styles.css` — работает, потому что подключён позже.
11. **Обновление существующих сайтов** — minor/patch: смена константы + smoke-тест по чек-листу релиза (дока «Upgrade guide» в каждом релизе). Major: параллельная папка, поэтапный перевод страниц.
12. **Постепенная миграция legacy** — новые страницы/разделы сразу на ui-; старые остаются на старом CSS; правило сосуществования ниже.
13. **Сосуществование старого и нового UI** — (а) разные страницы: никакой связи, оба CSS живут параллельно; (б) одна страница: ui-компоненты вкладываются в legacy-разметку — безопасно, пока legacy-CSS не стилизует теги глобально (типовой случай `input { … }` в старых шаблонах: лечится обёрткой `.ui-field .ui-field__input` — специфичность 2 классов против тега; системные селекторы это уже покрывают, т.к. пишутся классом, а не тегом); запрет только один — не оборачивать ui-компоненты в legacy-контейнеры с `overflow: hidden` и фиксированной высотой.
14. **Граница ответственности** — система: токены, примитивы, a11y, поведение, документация. Сайт: контент, шаблоны страниц, бизнес-компоненты Bitrix, контентные секции (hero и т.п.), интеграция данных. Сайт не правит файлы в `/local/ui/` (копия = read-only, обновления не трогают правки — их просто нет).

---

## 7. Структура репозитория irao-ui

Решение: **один репозиторий, исходники = почти-dist** (CSS/JS пишутся готовыми к браузеру, сборка только конкатенация+минификация). Это сознательный отказ от src-компиляции: то, что лежит в git, читаемо теми же файлом, что уходит на сайты.

```
irao-design-system/
├── tokens/                     # только токены
│   ├── primitives.css          # слой 1 (палитра)
│   └── semantic.css            # слой 2 (смысловые значения)
├── base/                       # reset, fonts.css, focus.css, typography.css, container/grid
├── components/
│   └── <name>/                 # ui-button, ui-field, ui-modal…
│       ├── <name>.css          # стили (БЭМ, только --ui-токены)
│       ├── <name>.html         # канонический HTML-паттерн (источник для доки и тестов)
│       ├── <name>.js           # опционально
│       └── README.md           # API, состояния, a11y, do/don't, миграции
├── a11y/
│   ├── vi.css / vi.js / vi-panel.html    # ГОСТ-модуль (портирован)
│   └── skip-link/…
├── patterns/                   # доки-паттерны без кода в dist (header, list-page, form-page)
├── themes/                     # theme-irao.css, theme-<company>.css (только токены!)
├── showcase/                   # статический styleguide: страницы-стенды компонентов
│   ├── build.mjs               # сборка стендов + dist (esbuild, dev-only)
│   └── pages/…
├── bitrix/
│   ├── snippets/header-php.snippet.php    # готовые сниппеты подключения
│   └── integration-guide.md               # раздел 6 как living doc
├── docs/                       # архитектура, roadmap, backlog (эти документы)
├── tests/
│   ├── e2e/                    # Playwright: компонентные страницы
│   ├── a11y/                   # axe-сценарии
│   └── visual/                 # скриншот-эталоны
├── .stylelintrc.json / .eslintrc.json / .prettierrc
└── package.json                # ТОЛЬКО devDependencies + scripts (build/lint/test)
```

Почему так:

- `tokens/` отдельно от `base/` — токены меняются дизайнерами/темами, база — почти неизменна; разный ритм изменений.
- Компонент = папка (доказано career-portal): всё рядом, ревью одним дифром, доки не отрываются от кода.
- `showcase/` — и документация, и тестовый полигон: Playwright гоняет по тем же страницам, что читают интеграторы. Один источник правды.
- `bitrix/` — интеграционный слой живёт в системе, а не в вики: версионируется вместе с кодом.
- Зависимости: только dev-инструменты (esbuild, stylelint, eslint, playwright). Ни одной runtime-зависимости.

---

## 8. Документация

Решение: **статический showcase-сайт** (как demo-страницы career-portal), а не Storybook — на MVP.

Почему не Storybook: требует Node-инфраструктуры, MDX/CSF-обвязки, добавляет вторую «правду» о компоненте (сторя ≠ реальный HTML в PHP-шаблоне), тяжела в поддержке 1–2 разработчиками, а выигрыш (изоляция сторис, аддоны) на статических HTML-компонентах мал. Пересмотр — если команда вырастет (SPIKE в backlog).

Страница компонента в showcase содержит (единый шаблон доки):

1. Живые примеры всех вариантов/состояний (реальный HTML, не картинка);
2. Копируемый HTML-сниппет;
3. Состояния: default/hover/focus-visible/active/disabled/error/loading + responsive-поведение (стенд 375/768/1440 в iframe);
4. A11y: клавиатурные сценарии, ARIA-атрибуты, чек-лист скринридера;
5. API: классы, модификаторы, токены, data-атрибуты, JS-методы/события;
6. Do / Don't с примерами;
7. Schema.org-заметка, если применимо;
8. Версия введения и changelog компонента.

Плюс: `bitrix/integration-guide.md` и сниппеты; README репозитория с quickstart за 5 минут; CHANGELOG.md по Keep a Changelog.

---

## 9. Стратегия тестирования

Принцип: минимальный набор инструментов, каждый закрывает реальный класс ошибок. Всё крутится вокруг showcase-страниц (единый полигон).

| Уровень | Инструмент | Что проверяет | Гейт |
|---|---|---|---|
| CSS lint | stylelint (+stylelint-order,declaration-strict-value для hex-запрета вне tokens) | БЭМ-нейминг по шаблону `ui-`, запрет hex/!important вне tokens/vi, порядок свойств | mandatory PR |
| JS lint | eslint (native JS, без TS — кодовая база мала и шаблонна) | ошибки, `===`, запрещён глобальный scope | mandatory PR |
| HTML validation | html-validate | валидность паттернов/стендов, правила семантики (h1 один, label у input и т.п.) | mandatory PR |
| Unit JS | Vitest (+jsdom) — только для модулей с логикой (vi, валидация, focus-utils) | чистые функции: парсинг localStorage, расчёт валидности | mandatory PR |
| Integration/E2E | Playwright по showcase | поведение компонентов: dropdown Escape/стрелки, modal trap, tabs, форма | mandatory PR |
| Accessibility | axe-core (в Playwright, `@axe-core/playwright`) по всем стендам | автоматизируемая часть WCAG на каждом состоянии | mandatory PR |
| Visual regression | Playwright screenshots (built-in toHaveScreenshot) по стендам 375/768/1440; единое контейнерное окружение — официальный Playwright-образ и локально (`test:docker`), и в CI: эталоны, созданные в контейнере, совпадают с CI; CI-джоба `update-snapshots` — fallback для машин без контейнера (ADR-0004, заменил ADR-0003) | непреднамеренные визуальные сдвиги | advisory в PR → mandatory с v1.0 |
| Кросс-браузерность | Playwright: chromium, firefox, webkit | матрица evergreen; отдельный smoke на мобильном Safari-профиле | nightly + release |
| Шрифто-зум тест | Playwright scenario | страница жива при 200% zoom / 32px базы | release |
| VI-режим | Playwright scenario | включение тем/размеров не ломает стенды, панель работает | release |
| Design QA | ручной процесс по образцу career-portal design-qa.md (дока с evidence) | соответствие бренд-дизайну | release |

Что НЕ добавляем (сознательно): Jest (дублирует Vitest), Percy/Chromatic (платные сервисы; встроенных скриншотов Playwright достаточно), Cypress (второй E2E-инструмент ни к чему), локаторные тесты на реальных сайтах (вне scope системы).

---

## 10. CI/CD

GitHub Actions (стек уже используется в career-portal; при размещении в корп. GitLab — тот же пайплайн в `.gitlab-ci.yml`, структура идентична).

```text
Pull Request:
  lint (stylelint+eslint+prettier --check)      ← mandatory
  html-validate (showcase)                      ← mandatory
  unit (vitest)                                 ← mandatory
  build (esbuild: dist + showcase)              ← mandatory
  e2e + axe (Playwright, chromium)              ← mandatory
  visual regression (диф-артефакты)              ← advisory до v1.0 → mandatory (ADR-0004)

main (после merge):
  полный матричный прогон (chromium/firefox/webkit)
  deploy showcase → GitHub Pages (дока для всех)

release (тег vX.Y.Z):
  полный прогон + шрифто-зом/VI smoke
  сборка dist-артефакта (zip) → GitHub Release
  обновление CHANGELOG.md
```

Mandatory-гейты: lint, unit, e2e+axe, build. Visual regression — advisory до v1.0 (диф-артефакты прикладываются к PR, ревью по желанию), с v1.0 — mandatory с ревью диффа (ADR-0004). Nightly матрица — не гейт для PR (скорость), но гейт для релиза.

---

## 11. Версионирование и совместимость

- **Semver строго**: PATCH — фиксы внешне невидимые; MINOR — новые компоненты/токены/модификаторы (всё обратно совместимо); MAJOR — удаление/переименование классов/токенов/data-атрибутов, изменение HTML-паттернов.
- **CHANGELOG.md** (Keep a Changelog) + changelog-секция в доке каждого компонента.
- **Политика поддержки**: одновременно живут текущая мажорная и предыдущая (N−1): багфиксы портируются в N−1 в течение 6 месяцев после выхода N. Сайты на N−1 не блокируют релизы N.
- **Deprecation**: помечаем в minor (класс-алиас, warning в консоли в dev-сборке), удаляем в следующем major. Список deprecated — в CHANGELOG и на странице компонента.
- **Migration guide** на каждый major: список переименований классов/токенов + скрипт-помощник codemod (regex replace) — опционально.
- **Разные сайты на разных версиях** — нормальное состояние: сайт A на 1.x, сайт B на 2.x (отдельные папки `/local/ui/1.4.2/` и `/local/ui/2.0.0/`). Общего рантайма между сайтами нет — конфликт невозможен.
- Обратная совместимость **HTML-паттернов важнее удобства кода**: интеграторы копируют разметку по докам; переименование класса = broken prod. Это фиксируется правилом ревью: любое изменение канонического HTML компонента — только через major или новый модификатор.

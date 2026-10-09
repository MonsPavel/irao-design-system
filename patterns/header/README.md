# Паттерн «Header» (T7.6)

Референс-разметка шапки сайта — эталонная сборка
[`header.html`](header.html), она же стенд
`/showcase/dist/stands/patterns/header.html` (генерируется
`showcase/build.mjs`). Источник — `header.html` career-portal: переносится
**композиция** (две навигации вокруг логотипа, dropdown разделов, кнопка VI,
поиск), не стили — визуал шапки бренд-специфичен (Out of scope).

Шапки/подвалы сайтов слишком различаются, чтобы быть компонентами системы
(02-architecture §4, граница «компонент vs паттерн») — паттерн это
документированный HTML-скелет; CSS-минимум (`hdp-*`) — зона сайта (в бою —
`template_styles.css`; на стенде — `<style>` рядом, не в `dist`).

## Состав

| Блок | Компоненты | Примечания |
|---|---|---|
| Skip-link | `ui-skip-link` (T3.5) | первый элемент `body`, до шапки и контента |
| `<header>` | каркас страницы (не компонент) | прямому ребёнку `body` — роль banner |
| Основная навигация | `nav[aria-label]` + `ui-link` + `ui-dropdown` (T6.1) | dropdown — навигационное назначение: `nav > ul > li > a`, без `role="menu"` |
| Логотип | ссылка на главную (T4.6) | доступное имя; в бою — `img` с `alt` + `width`/`height` |
| Дополнительная навигация | `nav[aria-label]` + кнопка VI (T9.1) + поиск | имя навигации отличается от основной |
| Диалог поиска | копия паттерна [search-overlay](../search-overlay/README.md) (T7.6) | в бою — перед `</body>` |

## Разметка

Копируйте блоки из [`header.html`](header.html) (он же — живой стенд).
Ключевые решения:

### Место в каркасе: уровень body, после skip-link, до main (правила ленмарк)

```html
<body>
  <a class="ui-skip-link" href="#main">Перейти к основному содержимому</a>
  <header class="hdp-header">…</header>   <!-- banner -->
  <main id="main" tabindex="-1">…</main>
  <footer>…</footer>                       <!-- contentinfo, паттерн footer -->
</body>
```

- Роль banner есть только у `<header>`, который **не вложен** в другой
  ленмарк: внутри `<main>` шапка роли banner не получит — держите её на
  уровне `body`.
- Порядок каркаса: **skip-link → header → main → footer**: skip-link —
  первый интерактивный элемент (T3.5), контент — сразу после шапки.
- Шапка **одна** на странице: вторая `<header>` на уровне body — вторая
  banner-лендмарка (нарушение axe `landmark-no-duplicate-banner`).

### Навигации: уникальные aria-label (Accessibility requirements)

```html
<nav class="hdp-header__nav" aria-label="Основное меню">…</nav>
<nav class="hdp-header__nav" aria-label="Дополнительное меню">…</nav>
```

Несколько навигаций на странице обязаны иметь **различимые имена** — иначе
скринридер объявляет «navigation» без контекста. Вложенная навигация
dropdown'а (`aria-label="Школьникам и студентам"`) тоже несёт своё имя.

### Dropdown (T6.1): навигационное назначение

```html
<div class="ui-dropdown" data-ui-dropdown>
  <button class="ui-dropdown__trigger" type="button" id="hdp-sections-trigger">…</button>
  <nav class="ui-dropdown__menu" id="hdp-sections-menu" aria-label="Школьникам и студентам">
    <ul class="ui-dropdown__list">
      <li><a class="ui-dropdown__item" href="/practices/">Стажировки и практики</a></li>
      …
    </ul>
  </nav>
</div>
```

Ссылки-переходы — не команды: `role="menu"` не ставится (правило
README `ui-dropdown`). В разметке меню раскрыто (без `hidden`) —
без JS все ссылки доступны; `hidden`/`aria-expanded`/`aria-controls`
ставит модуль при инициализации.

### Логотип (T4.6): доступное имя и зафиксированное место

Демо — инлайновый svg + текст (без внешних файлов):

```html
<a class="hdp-logo" href="/" aria-label="Интер РАО — на главную">…</a>
```

В бою — растровый/векторный файл по правилам T4.6 (`ui-image`): `alt`
обязателен, `width`/`height` обязательны (CLS-страховка, гейт
`irao/img-dimensions`):

```html
<!-- prettier-ignore -->
<img class="ui-image" src="/upload/logo.svg" alt="Интер РАО — на главную" width="105" height="100">
```

### Кнопка VI (T9.1): в шапке на каждой странице

```html
<button class="hdp-vi" type="button" data-ui-vi-toggle aria-pressed="false">
  …svg…
  <span>Версия для слабовидящих</span>
</button>
```

- Хук — `data-ui-vi-toggle`; модуль `IraoUI.vi` синхронизирует
  `aria-pressed` (состояние читается кнопками панели и этой кнопкой).
- CSS модуля — **отдельный** `dist/ui-vi.min.css`, подключается **последним**
  в каскаде (после core и CSS сайта); панель `ui-vi-bar` ставится первым
  элементом `body` (README `ui-vi`, чек-лист проверки страниц).
- Место под кнопку зарезервировано в разметке заранее — Technical
  considerations спеки T7.6 (согласование с T9.1).

### Поиск: триггер — ссылка к диалогу search-overlay

```html
<a class="hdp-search" href="/search/" data-ui-modal-target="sop-dialog">Поиск</a>
```

Диалог — копия паттерна [search-overlay](../search-overlay/README.md)
(включён в сниппет для самодостаточности; источник правды — он):
в бою держите разметку диалога перед `</body>`. Без JS триггер ведёт на
страницу результатов — поиск работает.

## A11y

- Ленмарки: banner (header) → main → contentinfo (footer) + navigation с
  уникальными именами + search (форма оверлея).
- Заголовков в шапке нет — это каркас страницы; h1 несёт контент `main`
  (правила заголовков, AC).
- Фокус всех контролов рисует `base/focus.css` (ADR-0001) — в связках
  `outline` не переопределяется.
- Кнопка VI — `aria-pressed` (переключатель); dropdown — `aria-expanded`/
  `aria-controls` ставит модуль T6.1.

## Bitrix-заметки (AC: bitrix:menu)

- Навигации шапки рендерит **`bitrix:menu`**: в `header.php` шаблона сайта —
  два вызова (основное и дополнительное меню, `ROOT`/`SUB` уровни). Паттерн
  задаёт разметку пунктов (`ui-link`, dropdown-структура), интегратор
  вписывает её в `template.php` компонента меню; выпадающий раздел —
  шаблон с `data-ui-dropdown` (модуль уже в `ui.min.js`). Где стилизовать
  меню: классы пунктов — из шаблона `bitrix:menu`, их внешний вид — в
  `template_styles.css` сайта (связки `hdp-*` переносятся туда же); классы
  `ui-*` не переопределяются.
- Кнопка VI — статичная часть `header.php`; подключение `ui-vi.min.css`
  последним и панель первым элементом `body` — README `ui-vi`
  (`bitrix/snippets/header-php.snippet.php`).
- Триггер поиска — ссылка: `href` ведёт на страницу `bitrix:search.page`,
  `data-ui-modal-target` — на диалог search-overlay в include-файле.
- Логотип — `img` из настроек сайта/директории `/upload/` с `alt` и
  `width`/`height` (T4.6).

## Do / Don't

- **Do**: одна шапка на странице; skip-link до неё; у каждой `nav` — своё
  имя; dropdown — для навигации с подпунктами.
- **Don't**: не оборачивайте `<header>` в `<main>`/секции (теряется banner);
  не ставьте `role="menu"` на навигационные меню; не дублируйте имена
  навигаций; не прячьте кнопку VI на мобильных — ГОСТ Р 52872 предполагает
  доступ на каждой странице.
- **Don't**: не переносите визуал career-portal (шапка бренд-специфична,
  Out of scope) — связки `hdp-*` сайты рисуют под себя из токенов `--ui-*`.

## Тесты

- Юнит-пины контракта: `tests/unit/pattern-header.test.js`.
- Поверхность браузера (banner/navigation-лендмарки, dropdown, VI-переключение,
  триггер поиска → диалог с фокусом в поле, axe, иерархия заголовков,
  эталоны): `tests/e2e/pattern-header.spec.js`.

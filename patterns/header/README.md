# Паттерн «Header» (T7.6)

Референс-разметка шапки сайта — эталонная сборка
[`header.html`](header.html), она же стенд
`/showcase/dist/stands/patterns/header.html` (генерируется
`showcase/build.mjs`). Источник — `header.html` career-portal: переносится
**композиция** (две навигации вокруг логотипа, dropdown разделов, кнопка VI,
поиск), не стили — визуал шапки бренд-специфичен (Out of scope).

Шапки/подвалы сайтов слишком различаются, чтобы быть компонентами системы
(02-architecture §4, граница «компонент vs паттерн») — паттерн это
документированный HTML-скелет. Каркас шапки — связки `hsp-*` в
**паттерн-слое** (T17.13, прецедент таймлайна T17.10): единый исходник
[`../patterns.css`](../patterns.css) → опциональный `dist/ui-patterns.css`
(порядок в head: токены → core → patterns → сайт). Бренд-вид — сайт-зона
(в бою — `template_styles.css`): VI-пилюля (у career-portal — 15px, рамка
primary, glass-light — на слоте `hsp__action` поверх общего вида кнопки),
размеры логотипа, letter-spacing пунктов.

## Режимы каркаса (T17.13)

- **`hsp` (базовый, static)** — внутренние страницы: рамка низа `muted`,
  фон `surface` (surface-пара основы — единственные цвета каркаса).
- **`hsp--overlay`** — главная: `absolute` поверх контента (`z-40`), без
  рамки/фона — фон несёт hero-секция. Та же разметка, модификатор рядом
  с `hsp` (пример спеки T17.13: `<header class="hsp hsp--overlay">`).
- Меню-право скрыто в мобильной базе и включается от 768 (ступень канона
  career-portal, header.css:131; mobile-first в слое).

## Состав

| Блок | Компоненты | Примечания |
|---|---|---|
| Skip-link | `ui-skip-link` (T3.5) | первый элемент `body`, до шапки и контента |
| `<header class="hsp">` | каркас страницы + связка слоя | прямому ребёнку `body` — роль banner; режимы `hsp` / `hsp--overlay` |
| `hsp__inner` | `ui-container` + сетка слоя | «меню — логотип — меню» 1fr auto 1fr; max-width/паддинг-горизонталь несёт контейнер |
| Основная навигация | `hsp__menu hsp__menu--left` + `ui-link` **`--nav`** (T16.3) + `ui-dropdown` (T6.1) | пункты — nav-вариант (fs-small, без подчёркивания); nowrap-строки с иконками — слой; dropdown — навигационное назначение: `nav > ul > li > a`, без `role="menu"` |
| Логотип | `hsp__logo` (T4.6) | доступное имя; в бою — `img` с `alt` + `width`/`height`; размеры — сайт-зона |
| Дополнительная навигация | `hsp__menu hsp__menu--right` + `hsp__action` (VI, T9.1) + поиск | имя навигации отличается от основной; слот действия — общий вид кнопки в слое, бренд-оболочка — сайт |
| Диалог поиска | копия паттерна [search-overlay](../search-overlay/README.md) (T7.6) | в бою — перед `</body>`; вид формы `sop-*` — у паттерна search-overlay/сайта |

## Разметка

Копируйте блоки из [`header.html`](header.html) (он же — живой стенд).
Ключевые решения:

### Место в каркасе: уровень body, после skip-link, до main (правила ленмарк)

```html
<body>
  <a class="ui-skip-link" href="#main">Перейти к основному содержимому</a>
  <header class="hsp">…</header>          <!-- banner; главная — class="hsp hsp--overlay" -->
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
<nav class="hsp__menu hsp__menu--left" aria-label="Основное меню">…</nav>
<nav class="hsp__menu hsp__menu--right" aria-label="Дополнительное меню">…</nav>
```

Несколько навигаций на странице обязаны иметь **различимые имена** — иначе
скринридер объявляет «navigation» без контекста. Вложенная навигация
dropdown'а (`aria-label="Школьникам и студентам"`) тоже несёт своё имя.

### Пункты навигаций: `ui-link ui-link--nav` (T16.3)

```html
<nav class="hsp__menu hsp__menu--left" aria-label="Основное меню">
  <a class="ui-link ui-link--nav" href="/vacancies/">Вакансии</a>
  …
</nav>
```

Пункты меню — nav-вариант ссылки: `fs-small`/`fw-small` (14/500), **без
подчёркивания** — в структурном контексте (`<nav[aria-label]>`) WCAG 1.4.1
не требует отличать ссылку подчёркиванием, пункт различим самим положением
(обоснование — README `ui-link`, do/don't «Навигационные ссылки»). Inline-
ссылки текста контента остаются на **default** `ui-link` (подчёркнуты
всегда): переключать их на `--nav` не нужно — модификатор для пунктов
навигации, не для текста.

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
<a class="hsp__logo" href="/" aria-label="Интер РАО — на главную">…</a>
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
<button class="hsp__action" type="button" data-ui-vi-toggle aria-pressed="false">
  …svg…
  <span>Версия для слабовидящих</span>
</button>
```

Слот `hsp__action` несёт общий вид кнопки (пилюля на токенах — слой,
T17.13 п.2); бренд-оболочку (VI-пилюля career-portal: 15px, рамка primary,
glass-light) сайт рисует поверх в `template_styles.css`.

- Хук — `data-ui-vi-toggle`; модуль `IraoUI.vi` синхронизирует
  `aria-pressed` (состояние читается кнопками панели и этой кнопкой).
- CSS модуля — **отдельный** `dist/ui-vi.min.css`, подключается **последним**
  в каскаде (после core и CSS сайта); панель `ui-vi-bar` ставится первым
  элементом `body` (README `ui-vi`, чек-лист проверки страниц).
- Место под кнопку зарезервировано в разметке заранее — Technical
  considerations спеки T7.6 (согласование с T9.1).

### Поиск: триггер — ссылка к диалогу search-overlay

```html
<a class="ui-link ui-link--nav" href="/search/" data-ui-modal-target="sop-dialog">Поиск</a>
```

Диалог — копия паттерна [search-overlay](../search-overlay/README.md)
(включён в сниппет для самодостаточности; источник правды — он):
в бою держите разметку диалога перед `</body>`. Без JS триггер ведёт на
страницу результатов — поиск работает.

**На странице ровно один диалог `sop-dialog`/`sop-query`**: если паттерн
[search-overlay](../search-overlay/README.md) уже подключён (его копия в
include-файле или `footer.php`) — удалите копию диалога из шапки. При дублях
id `data-ui-modal-target` откроет только первый диалог, а повторные `id`
ловятся гейтом `html-validate` (`no-duplicate-id`) уже на сборке сайта.

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
  задаёт разметку пунктов (`ui-link ui-link--nav`, T16.3, dropdown-структура),
  интегратор
  вписывает её в `template.php` компонента меню; выпадающий раздел —
  шаблон с `data-ui-dropdown` (модуль уже в `ui.min.js`). Где стилизовать
  меню: каркас (сетка/режимы/строки) несёт слой `hsp-*`; бренд-вид пунктов
  (letter-spacing, hover-оттенки сверх `ui-link--nav`) — в
  `template_styles.css` сайта; классы `ui-*` не переопределяются.
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
  навигаций. Каркас скрывает правое меню в мобильной базе (канон
  career-portal, ≤767) — если VI живёт там, дайте на узких экранах другой
  вход в панель (ГОСТ Р 52872 предполагает доступ на каждой странице).
- **Don't**: не переносите визуал career-portal (шапка бренд-специфична,
  Out of scope) — бренд-строки (VI-пилюля, логотип-размеры) сайты рисуют
  под себя из токенов `--ui-*` поверх каркаса слоя.
- **Don't**: не оставляйте копию диалога поиска из шапки, если
  search-overlay уже на странице, — id `sop-dialog`/`sop-query` должны
  встречаться ровно один раз (см. «Поиск» выше).

## Тесты

- Юнит-пины контракта: `tests/unit/pattern-header.test.js`.
- Поверхность браузера (banner/navigation-лендмарки, dropdown, VI-переключение,
  триггер поиска → диалог с фокусом в поле, axe, иерархия заголовков,
  эталоны): `tests/e2e/pattern-header.spec.js`.

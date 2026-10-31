# Паттерн «Footer» (T7.6)

Референс-разметка подвала сайта — эталонная сборка
[`footer.html`](footer.html), она же стенд
`/showcase/dist/stands/patterns/footer.html` (генерируется
`showcase/build.mjs`). Источник — `footer.html` career-portal: переносится
**композиция** (логотип, колонки ссылок, контакты, соцсети, копирайт), не
стили — визуал подвала бренд-специфичен (Out of scope).

Подвалы/шапки сайтов слишком различаются, чтобы быть компонентами системы
(02-architecture §4) — паттерн это документированный HTML-скелет. Каркас
подвала — связки `ftp-*` в **паттерн-слое** (T17.13, прецедент таймлайна
T17.10): единый исходник [`../patterns.css`](../patterns.css) →
опциональный `dist/ui-patterns.css` (порядок в head: токены → core →
patterns → сайт). Тон — surface-пара каркаса: база `ftp` **светлая** (белый
фон — одобренный дизайн career-portal), приглушённый вариант — модификатор
`ftp--muted` (в доке — второй экземпляр на `div`: contentinfo одна).
Бренд-вид — сайт-зона (в бою — `template_styles.css`): цвет ссылок,
hover-accent, `:visited`-политика, размеры логотипа.

## Состав

| Блок | Компоненты | Примечания |
|---|---|---|
| `<footer class="ftp">` | каркас страницы + связка слоя | прямому ребёнку `body` — роль contentinfo; тон — `ftp` (светлый) / `ftp--muted` |
| `ftp__inner` | `ui-container` + сетка слоя | «логотип — ссылки — контакты — правая колонка»: 2 колонки в базе, 4 — от 1024 |
| Логотип | `ftp__logo` (T4.6) | доступное имя; в бою — `img` с `alt` + `width`/`height`; размеры — сайт-зона |
| Колонка ссылок | `nav[aria-label]` + `ftp__links` + `ui-link` **`--nav`** (T16.3) | канон — одна колонка (список); шаг строк и 14/1.35 — слой; цвет — сайт-зона |
| Контакты | `ftp__contacts`/`ftp__contact` + `<address>` + `ui-link` | подпись — `ui-text--muted` в разметке; `tel:`/`mailto:` — работают без JS |
| Соцсети | `ui-button` **`--round`** (T17.9) + `ftp__social` | icon-only — `aria-label`; пара 36px blue-50 → hover primary — хуками слоя («по оригиналу», T17.13) |
| Переход кверху | `ui-link` на `#top` | цель — якорь в начале страницы |

## Разметка

Копируйте блоки из [`footer.html`](footer.html) (он же — живой стенд).
Ключевые решения:

### Место в каркасе: уровень body, после main (правила ленмарк)

```html
<body>
  <a class="ui-skip-link" href="#main">…</a>
  <header>…</header>
  <main id="main" tabindex="-1">…</main>
  <footer class="ftp">…</footer>   <!-- contentinfo -->
</body>
```

Роль contentinfo есть только у `<footer>`, не вложенного в другой ленмарк:
внутри `<main>` (или `<article>`) подвал роли contentinfo не получит —
держите его на уровне `body`, после `main` (чтение: контент → подвал).

### Колонка ссылок: nav-лендмарка с aria-label

```html
<nav aria-label="Меню подвала">
  <ul class="ftp__links">
    <li><a class="ui-link ui-link--nav" href="/vacancies/">Вакансии</a></li>
    …
  </ul>
</nav>
```

Список — нативные `ul/li` (семантика списка скринридеру); канон `ftp` —
одна колонка ссылок (несколько колонок — сайт-зона поверх сетки слоя).
Навигация с именем — лендмарк различим скринридеру.

### Контакты: address-семантика (Technical considerations)

```html
<div class="ftp__contacts">
  <address class="ftp__contact">
    <span class="ftp__contact-label ui-text--muted">Адрес</span>
    ул. Большая Пироговская, д.&nbsp;27, …
  </address>
  <div class="ftp__contact-group">
    <div class="ftp__contact">
      <span class="ftp__contact-label ui-text--muted">Телефон</span>
      <a class="ui-link ui-link--nav" href="tel:+74956648840">+7 495 664-88-40</a>
    </div>
    <div class="ftp__contact">
      <span class="ftp__contact-label ui-text--muted">E-mail</span>
      <a class="ui-link ui-link--nav" href="mailto:career@interrao.ru">career@interrao.ru</a>
    </div>
  </div>
</div>
```

`<address>` — нативная семантика «контактная информация организации/автора»
(Technical considerations спеки T7.6): скринридер и поисковики получают
контакты без ARIA. Телефон и почта — ссылки `tel:`/`mailto:` — работают без
JS. UA-курсив address гасит связка слоя (`ftp__contact`,
`font-style: normal` — прецедент роли `ui-address`).

### Соцсети: ui-button--round + пара хуками слоя (T17.13)

```html
<a class="ui-button ui-button--round ftp__social" href="https://vk.com/" aria-label="ВКонтакте">
  <svg aria-hidden="true" …>…</svg>
</a>
```

Иконка — единственный контент ссылки: без `aria-label` ссылка безымянная
(T4.1, предупреждение `irao/link-accessible-name`). Вид контрола —
модификатор `ui-button--round` (T17.9); пару несёт слой хуками
`--ui-button-bg`/`--ui-button-color`: покой — blue-50/текст (видны на белом,
«по оригиналу»), hover — primary/on-dark. Другая пара — своя у сайта
(do/don't — patterns/landing-section/README.md).

Размер цели — 36px: канон оригинала (T17.13); проходит WCAG 2.5.8
(минимум 24px; прежняя a11y-пометка «≥ 44px — правило T6.3» снята
каркасом). Пересмотр на ≥ 44px — design-decision владельца при будущей
правке каркаса.

### Переход кверху

```html
<a class="ui-link ftp__top" href="#top">Наверх</a>
```

Цель — якорь в начале страницы: `<body id="top">` или `id="top"` на первом
контентном блоке (шапке/заголовке). Без JS работает как обычный якорь;
на стенде цель — демо-заголовок каркаса.

## A11y

- Ленмарки: banner (header) → main → **contentinfo** (footer) + navigation с
  уникальными именами; контакты — `address`.
- Заголовков в подвале нет — каркас страницы; иерархия заголовков живёт в
  `main` (правила заголовков, AC).
- Icon-only ссылки — `aria-label`; декоративные svg — `aria-hidden`.
- Фокус рисует `base/focus.css` (ADR-0001); в VI-режиме подвал перекрашивается
  модулём как обычные элементы (значения связок — только токены `--ui-*`).

## Bitrix-заметки (AC)

- Подвал — **`footer.php`** шаблона сайта (второй обязательный файл каркаса
  после `header.php`); редактируемые блоки ссылок — `include`-области
  (`$APPLICATION->IncludeFile(SITE_DIR."include/footer-links.php", …)`) или
  `bitrix:menu` с типом меню «bottom» — паттерн задаёт разметку пунктов,
  интегратор вписывает её в шаблон компонента.
- Контакты/соцсети — include-области или свойства сайта; `tel:`/`mailto:` —
  из настроек инфоблока «Контакты».
- Логотип — `img` из `/upload/` с `alt` и `width`/`height` (T4.6).
- Каркас (сетки/ритмы/соц-кнопки) несёт слой `ftp-*`; бренд-вид (цвет
  ссылок, hover-accent, `:visited`, размеры логотипа) — в
  `template_styles.css` сайта из токенов `--ui-*`.

## Do / Don't

- **Do**: `<address>` для контактов; `tel:`/`mailto:`-ссылки; у навигации
  подвала — своё имя; icon-only ссылки — с `aria-label`.
- **Don't**: не вкладывайте `<footer>` в `<main>`/`<article>` (теряется
  contentinfo; футер статьи — другой случай, там роль и не нужна); не
  оставляйте соцссылки безымянными; не делайте «наверх» кнопкой с JS-скроллом
  — якорь работает без JS; не ставьте второй `<footer class="ftp">` для
  варианта тона — contentinfo одна (в доке приглушённый экземпляр на `div`).
- **Don't**: не переносите визуал career-portal (подвал бренд-специфичен,
  Out of scope) — бренд-строки сайты рисуют под себя из токенов `--ui-*`
  поверх каркаса слоя.

## Тесты

- Юнит-пины контракта: `tests/unit/pattern-footer.test.js`.
- Поверхность браузера (contentinfo-лендмарка, address, уникальные имена
  навигаций, «наверх», axe, иерархия заголовков, эталоны):
  `tests/e2e/pattern-footer.spec.js`.

# Паттерн «Footer» (T7.6)

Референс-разметка подвала сайта — эталонная сборка
[`footer.html`](footer.html), она же стенд
`/showcase/dist/stands/patterns/footer.html` (генерируется
`showcase/build.mjs`). Источник — `footer.html` career-portal: переносится
**композиция** (логотип, колонки ссылок, контакты, соцсети, копирайт), не
стили — визуал подвала бренд-специфичен (Out of scope).

Подвалы/шапки сайтов слишком различаются, чтобы быть компонентами системы
(02-architecture §4) — паттерн это документированный HTML-скелет; CSS-минимум
(`fdp-*`) — зона сайта (в бою — `template_styles.css`; на стенде — `<style>`
рядом, не в `dist`).

## Состав

| Блок | Компоненты | Примечания |
|---|---|---|
| `<footer>` | каркас страницы (не компонент) | прямому ребёнку `body` — роль contentinfo |
| Логотип | ссылка на главную (T4.6) | доступное имя; в бою — `img` с `alt` + `width`/`height` |
| Колонки ссылок | `nav[aria-label]` × 2 + `ui-link` | у каждой колонки своё имя навигации |
| Контакты | `<address>` + `ui-link` | `tel:`/`mailto:` — работают без JS |
| Соцсети | icon-only ссылки + `aria-label` | svg декоративен (`aria-hidden`) |
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
  <footer class="fdp-footer">…</footer>   <!-- contentinfo -->
</body>
```

Роль contentinfo есть только у `<footer>`, не вложенного в другой ленмарк:
внутри `<main>` (или `<article>`) подвал роли contentinfo не получит —
держите его на уровне `body`, после `main` (чтение: контент → подвал).

### Колонки ссылок: nav-лендмарки с уникальными aria-label

```html
<nav class="fdp-footer__nav" aria-label="Навигация по сайту">
  <ul class="fdp-footer__links">
    <li><a class="ui-link" href="/vacancies/">Вакансии</a></li>
    …
  </ul>
</nav>
<nav class="fdp-footer__nav" aria-label="Документы">
  <ul class="fdp-footer__links">…</ul>
</nav>
```

Списки — нативные `ul/li` (семантика списка скринридеру); каждая колонка —
отдельная навигация со **своим** именем (правило то же, что в шапке).

### Контакты: address-семантика (Technical considerations)

```html
<address class="fdp-footer__contacts">
  <p class="fdp-footer__contact">
    <span class="fdp-footer__label">Адрес</span>
    ул. Большая Пироговская, д.&nbsp;27, …
  </p>
  <p class="fdp-footer__contact">
    <span class="fdp-footer__label">Телефон</span>
    <a class="ui-link" href="tel:+74956648840">+7 495 664-88-40</a>
  </p>
  <p class="fdp-footer__contact">
    <span class="fdp-footer__label">E-mail</span>
    <a class="ui-link" href="mailto:career@interrao.ru">career@interrao.ru</a>
  </p>
</address>
```

`<address>` — нативная семантика «контактная информация организации/автора»
(Technical considerations спеки T7.6): скринридер и поисковики получают
контакты без ARIA. Телефон и почта — ссылки `tel:`/`mailto:` — работают без
JS. UA-курсив address гасится в связке `fdp-footer__contacts`
(`font-style: normal`).

### Соцсети: icon-only ссылки — aria-label обязателен

```html
<a class="fdp-footer__social" href="https://vk.com/" aria-label="ВКонтакте">
  <svg aria-hidden="true" …>…</svg>
</a>
```

Иконка — единственный контент ссылки: без `aria-label` ссылка безымянная
(T4.1, предупреждение `irao/link-accessible-name`). Touch-цель ≥ 44px —
связка `fdp-footer__social` (правило T6.3).

### Переход кверху

```html
<a class="fdp-footer__top ui-link" href="#top">Наверх</a>
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
- Связующие стили (`fdp-*`) перенесите в `template_styles.css` — источник:
  `<style>` в [`footer.html`](footer.html), значения — только токены `--ui-*`.

## Do / Don't

- **Do**: `<address>` для контактов; `tel:`/`mailto:`-ссылки; у каждой
  колонки ссылок — своя навигация с именем; icon-only ссылки — с
  `aria-label`.
- **Don't**: не вкладывайте `<footer>` в `<main>`/`<article>` (теряется
  contentinfo; футер статьи — другой случай, там роль и не нужна); не
  оставляйте соцссылки безымянными; не делайте «наверх» кнопкой с JS-скроллом
  — якорь работает без JS.
- **Don't**: не переносите визуал career-portal (подвал бренд-специфичен,
  Out of scope) — связки `fdp-*` сайты рисуют под себя из токенов `--ui-*`.

## Тесты

- Юнит-пины контракта: `tests/unit/pattern-footer.test.js`.
- Поверхность браузера (contentinfo-лендмарка, address, уникальные имена
  навигаций, «наверх», axe, иерархия заголовков, эталоны):
  `tests/e2e/pattern-footer.spec.js`.

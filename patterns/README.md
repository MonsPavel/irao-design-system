# patterns/

Доки-паттерны страниц (header, list-page, form-page), собранные из готовых компонентов.

- Можно: HTML из канонических паттернов `components/`.
- Нельзя: новый CSS/JS — кода, попадающего в dist, здесь нет (02-architecture §7),
  КРОМЕ паттерн-слоя (оговорка T17.1, решение владельца 25.10 — вариант A).

## Паттерн-слой (T17.1)

Слой = связки, которых НЕТ в компонентах: канонические композиции страниц
поверх готовых ui-компонентов. Каноны list/detail/form-страниц (классы
`lpp-*` list-page, `dpp-*` detail-page, `fpp-*` form-page), лендинг-связок
(`lnk-*` nav-карточки, `lgo-*` лента логотипов — T17.9) и таймлайна
(`tlp-*` — T17.10) живут единым
исходником [`patterns.css`](patterns.css) и собираются в **опциональный**
`dist/ui-patterns.css` (порядок в head: токены → core → patterns → сайт;
`ui-core.min.css` не меняется). Доки-паттерны остаются источником правды:
их HTML несёт те же классы, слой синхронен с разметкой (пины —
`tests/unit/patterns-layer.test.js`, гейт префиксов — в сборке). Слой
пополняют задачи эпика EPIC-17 (лендинг-связки T17.9, find-bar и пилюля
фильтра T17.12, каркасы шапки/подвала T17.13) — не руками сайтов.

Паттерны:

- [`list-page/`](list-page/README.md) — «Страница списка» (T8.1): page-head с
  фильтрами, сетка карточек, пагинация, empty-состояние; связки `lpp-*` —
  в паттерн-слое (см. выше); стенд — `stands/patterns/list-page.html`.
- [`detail-page/`](detail-page/README.md) — «Детальная страница» (T8.2):
  крошки, page-head, контент + sticky-aside, related, schema.org-кейс
  (JobPosting/Article); связки `dpp-*` — в паттерн-слое; стенд —
  `stands/patterns/detail-page.html`.
- [`form-page/`](form-page/README.md) — «Страница формы» (T8.3): крошки +
  h1 + lead, ui-form с aside-сводкой вакансии (до формы в порядке чтения),
  полный форма-цикл (T5.6); связки `fpp-*` — в паттерн-слое; стенд —
  `stands/patterns/form-page.html`.
- [`landing-section/`](landing-section/README.md) — «Landing-секция» (T8.3):
  формула секции, тёмные секции (on-dark-пары), full-bleed в контейнере,
  nav-карточки `lnk-*` и лента логотипов `lgo-*` (T17.9 — паттерн-слой),
  правило границы «система / сайт»; mini-эталон из 6 секций; стенд —
  `stands/patterns/landing-section.html`.
- [`timeline/`](timeline/README.md) — «Таймлайн этапов» (T14.11): композиция
  «этапы процесса» — ol нумерованных точек с заголовками и текстами, ряд от
  1024, мобильная колонка; связки `tlp-*` — в паттерн-слое (adoption T17.10);
  стенд — `stands/patterns/timeline.html`.
- [`search-overlay/`](search-overlay/README.md) — «Поисковый оверлей» (T7.6):
  полноэкранный поиск на ui-modal--full (T7.2): фокус в поле при открытии,
  полный диалог-чек, GET-форма (без JS — переход); стенд —
  `stands/patterns/search-overlay.html`.
- [`header/`](header/README.md) — «Шапка» (T7.6): skip-link + header (banner)
  + навигации с уникальными aria-label + dropdown (T6.1) + логотип (T4.6) +
  кнопка VI (T9.1) + поиск; стенд — `stands/patterns/header.html`.
- [`footer/`](footer/README.md) — «Подвал» (T7.6): footer (contentinfo) +
  колонки ссылок + контакты в address + переход кверху; стенд —
  `stands/patterns/footer.html`.

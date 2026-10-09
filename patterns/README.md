# patterns/

Доки-паттерны страниц (header, list-page, form-page), собранные из готовых компонентов.

- Можно: HTML из канонических паттернов `components/`.
- Нельзя: новый CSS/JS — кода, попадающего в dist, здесь нет (02-architecture §7).

Паттерны:

- [`list-page/`](list-page/README.md) — «Страница списка» (T8.1): page-head с
  фильтрами, сетка карточек, пагинация, empty-состояние; стенд —
  `stands/patterns/list-page.html`.
- [`detail-page/`](detail-page/README.md) — «Детальная страница» (T8.2):
  крошки, page-head, контент + sticky-aside, related, schema.org-кейс
  (JobPosting/Article); стенд — `stands/patterns/detail-page.html`.
- [`form-page/`](form-page/README.md) — «Страница формы» (T8.3): крошки +
  h1 + lead, ui-form с aside-сводкой вакансии (до формы в порядке чтения),
  полный форма-цикл (T5.6); стенд — `stands/patterns/form-page.html`.
- [`landing-section/`](landing-section/README.md) — «Landing-секция» (T8.3):
  формула секции, тёмные секции (on-dark-пары), full-bleed в контейнере,
  правило границы «система / сайт»; mini-эталон из 3 секций; стенд —
  `stands/patterns/landing-section.html`.
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

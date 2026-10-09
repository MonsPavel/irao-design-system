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

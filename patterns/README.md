# patterns/

Доки-паттерны страниц (header, list-page, form-page), собранные из готовых компонентов.

- Можно: HTML из канонических паттернов `components/`.
- Нельзя: новый CSS/JS — кода, попадающего в dist, здесь нет (02-architecture §7).

Паттерны:

- [`list-page/`](list-page/README.md) — «Страница списка» (T8.1): page-head с
  фильтрами, сетка карточек, пагинация, empty-состояние; стенд —
  `stands/patterns/list-page.html`.

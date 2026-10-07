# bitrix/snippets/

Готовые сниппеты подключения UI-системы к сайтам.

- [`header-php.snippet.php`](header-php.snippet.php) — заготовка подключения к
  `header.php`: preload приоритетных граней Golos (400/500 cyr, T3.1) до
  CSS-каскада, порядок CSS `ui-core → (тема) → template_styles.css`, JS в
  конец. Полная версия сниппетов — T11.1 (02-architecture §6.2).

- [`breadcrumbs.php`](breadcrumbs.php) — генерация хлебных крошек ui-breadcrumbs
  (T4.7) из массива `$arResult` (`bitrix:breadcrumb` / собственная цепочка):
  микроразметка BreadcrumbList, `aria-current="page"` на текущей, экранирование
  вывода. Правила построения цепочки — `components/ui-breadcrumbs/README.md`.

- Можно: копируемые фрагменты PHP/HTML для интеграторов.
- Нельзя: логика, требующая поддержки — только то, что покрыто integration-guide.md.

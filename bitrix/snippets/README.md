# bitrix/snippets/

Готовые сниппеты подключения UI-системы к сайтам.

- [`header-php.snippet.php`](header-php.snippet.php) — заготовка подключения к
  `header.php`: preload приоритетных граней Golos (400/500 cyr, T3.1) до
  CSS-каскада, порядок CSS `ui-core → (тема) → template_styles.css`, JS в
  конец. Полная версия сниппетов — T11.1 (02-architecture §6.2).

- Можно: копируемые фрагменты PHP/HTML для интеграторов.
- Нельзя: логика, требующая поддержки — только то, что покрыто integration-guide.md.

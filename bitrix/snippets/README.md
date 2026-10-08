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

- [`form-error-render.php`](form-error-render.php) — серверный рендер ошибок
  формы по контракту irao-ui (T5.6) для `bitrix:form.result.new` / произвольной
  формы: сводная `ui-form__summary[role=alert]` из `$arResult["FORM_ERRORS"]`,
  `ui-field--error` + `aria-invalid` + `aria-describedby` +
  `ui-field__error` (суффикс id `-error` — единый с модулем `IraoUI.form`),
  inline-сниппет фокуса на summary (работает без модулей); вывод экранируется.
  Контракт — секция «Серверный контракт ошибок» в
  `components/ui-form/README.md`; интеграционный стенд —
  `showcase/pages/integration/form-full-cycle`.

- [`pagination.php`](pagination.php) — генерация пагинации ui-pagination
  (T6.3) из общего числа страниц и текущей: окно показа с «…» (края всегда,
  окно ±side у текущей, разрыв в одну страницу — номером, длиннее — «…»),
  `aria-current="page"` на текущей, имена «Страница N», недоступные стрелки —
  `button[disabled]`, экранирование вывода. Правила и решения —
  `components/ui-pagination/README.md`.

- Можно: копируемые фрагменты PHP/HTML для интеграторов.
- Нельзя: логика, требующая поддержки — только то, что покрыто integration-guide.md.

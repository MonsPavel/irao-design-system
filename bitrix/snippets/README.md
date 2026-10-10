# bitrix/snippets/

Готовые сниппеты подключения UI-системы к сайтам (пакет T11.1; каждый —
копипаст-готовый файл, подключение — по чек-листу
[`../first-connect-checklist.md`](../first-connect-checklist.md)).

- [`header-php.snippet.php`](header-php.snippet.php) — подключение к
  `header.php`: константа `UI_VERSION` (пин версии — констрейнт 8), порядок
  CSS `ui-core → (тема, опционально) → ui-vi`, `template_styles.css` сайта —
  последним (констрейнт 1); preload приоритетных граней Golos (400/500 cyr,
  T3.1) до `ShowHead()`; `addJs(…, true)` — в конец (readyState-guard модулей
  T1.1 закрывает позднюю загрузку); `ui-skip-link` первым элементом `<body>`
  (T3.5). Атрибут `data-ui-theme` — опционально (см. theme-connect.php).

- [`theme-connect.php`](theme-connect.php) — подключение опциональной темы
  бренда (механика T2.4/ADR-0009): файл `themes/theme-<имя>.css` строго после
  core, атрибут `data-ui-theme` на `<html>` (значение = имя файла без
  `theme-`/`.css`), декларативно / по разделам / без перезагрузки. В MVP
  (дефолтный бренд) не используется — по факту появления брендовой темы.

- [`json-data.php`](json-data.php) — данные для JS-компонентов в разметке
  (ADR-0008 п.2, §6.3): `irao_ui_json_script($data, 'tabs')` →
  `<script type="application/json" data-ui-tabs-data>`; json_encode с
  `JSON_HEX_TAG` (защита от вылезания из `<script>` — XSS) и
  `JSON_UNESCAPED_UNICODE`; имя данных — гейт `/^[a-z][a-z0-9-]*$/i`
  (позиция ИМЕНИ атрибута — защита валидацией, не экранированием;
  враждебное/пустое имя → `invalid`); парсит и рендерит сайт, модули системы
  инициализируют готовую разметку (прецедент — ui-tabs).

- [`breadcrumbs.php`](breadcrumbs.php) — генерация хлебных крошек ui-breadcrumbs
  (T4.7) из массива `$arResult` (`bitrix:breadcrumb` / собственная цепочка):
  микроразметка BreadcrumbList, `aria-current="page"` на текущей, экранирование
  вывода. Правила построения цепочки — `components/ui-breadcrumbs/README.md`.

- [`form-error-render.php`](form-error-render.php) — серверный рендер ошибок
  формы по контракту irao-ui (T5.6) для `bitrix:form.result.new` / произвольной
  формы: сводная `ui-form__summary[role=alert]` из `$arResult["FORM_ERRORS"]`,
  `ui-field--error` + `aria-invalid` + `aria-describedby` +
  `ui-field__error` (суффикс id `-error` — единый с модулем `IraoUI.form`);
  вывод экранируется. Контракт — секция «Серверный контракт ошибок» в
  `components/ui-form/README.md`; интеграционный стенд —
  `showcase/pages/integration/form-full-cycle`.

- Фокус-менеджмент серверных состояний — inline-сниппет
  `irao_ui_form_focus_script($targetId)` внутри
  [`form-error-render.php`](form-error-render.php) (T5.6, работает без
  модулей): после перезагрузки с ошибками ставит фокус на сводную
  `ui-form__summary[tabindex="-1"]`, на success-странице — на заголовок
  успеха (тот же сниппет с id цели).

- [`pagination.php`](pagination.php) — генерация пагинации ui-pagination
  (T6.3) из общего числа страниц и текущей: окно показа с «…» (края всегда,
  окно ±side у текущей, разрыв в одну страницу — номером, длиннее — «…»),
  `aria-current="page"` на текущей, имена «Страница N», недоступные стрелки —
  `button[disabled]`, экранирование вывода. Правила и решения —
  `components/ui-pagination/README.md`.

- Можно: копируемые фрагменты PHP/HTML для интеграторов.
- Нельзя: логика, требующая поддержки — только то, что покрыто integration-guide.md.

# Bitrix-разработчику за 30 минут

Сквозной туториал: от чистого сайта до страницы со списком вакансий и формы
отклика с серверными ошибками — копипастом, без Node на сайте. Бюджет
каждого шага указан в заголовке; на весь маршрут — ≈30 минут. Каждая
врезка кода сверяется с файлом-сниппетом на билде — копируйте как есть.

Легенда: сайт `example.ru`, раздел `/vacancies/`, шаблон сайта
`/local/templates/main/`. Правила за кадром (каскад, версии, legacy) не
дублируются здесь — [integration guide](doc:integration-guide).

## Шаг 1. Дистрибутив на сайт (≈5 минут)

Скачайте артефакт релиза `dist/` (или соберите раз на dev-машине
`npm run build` — Node на сайте не понадобится) и скопируйте содержимое в
`/local/ui/0.1.0/`: имя папки = точная версия, копия read-only. Структура
поставки и что в каждом файле — Quickstart, Шаг 1.

## Шаг 2. Подключение в header.php (≈5 минут)

В `header.php` шаблона (`/local/templates/main/header.php`) — PHP-блок до
`<!DOCTYPE html>` (источник —
[bitrix/snippets/header-php.snippet.php](snippets/header-php.snippet.php)):

```php snippet=bitrix/snippets/header-php.snippet.php
// Версия UI-системы, закреплённая за сайтом. Обновление = правка этой строки.
const UI_VERSION = '0.1.0';

$asset = \Bitrix\Main\Page\Asset::getInstance();
$asset->addCss('/local/ui/' . UI_VERSION . '/ui-core.min.css');
// Тема бренда — опциональна (в MVP все сайты в дефолтном бренде). Если тема
// есть, она идёт СТРОГО после core (порядок каскада core → theme → сайт):
// $asset->addCss('/local/ui/' . UI_VERSION . '/themes/theme-corp.css');
$asset->addCss('/local/ui/' . UI_VERSION . '/ui-vi.min.css');
$asset->addJs('/local/ui/' . UI_VERSION . '/ui.min.js', true); // true => в конец, defer-семантика Bitrix
```

В `<head>` — preload шрифтов до `ShowHead()`; первой строкой `<body>` —
skip-link (оба блока — Quickstart, Шаг 2). В шаблоне страницы контент
должен лежать в `<main id="main" tabindex="-1">` — цель skip-link
(иначе первый Tab «ведёт в никуда», T3.5).

## Шаг 3. Пробная страница с кнопкой (≈3 минуты)

Создайте `/test-ui.php` (вне кэша), вставьте кнопку из доки
[ui-button](doc:ui-button) (канонический паттерн —
components/ui-button/ui-button.html):

```html snippet=components/ui-button/ui-button.html
  <button class="ui-button ui-button--primary" type="submit">Отправить отклик</button>
```

Проверка: кнопка стилизована как в доке; `Tab` начинает со skip-link,
фокус на кнопке виден; в консоли — ни одной ошибки. Если кнопка «голая» —
проверьте порядок каскада (ui-core первым) и 404 в сети.

## Шаг 4. Страница списка вакансий (≈8 минут)

Каркас страницы списка — эталонный паттерн «Страница списка»
([живой стенд](stand:patterns/list-page)): page-head со счётчиком
`aria-live="polite"`,
панель фильтров (GET-форма: работает и без JS), выдача `ui-grid--3` из
`ui-card--hover ui-card--link` с `ui-tag`, пустая выдача `ui-empty`.
Копируйте блоки из эталона patterns/list-page/list-page.html — он же живой
стенд. Связующие стили раскладки — зона сайта (`template_styles.css`),
нового CSS системы не появляется.

Хлебные крошки — серверный сниппет
[bitrix/snippets/breadcrumbs.php](snippets/breadcrumbs.php) (микроразметка
BreadcrumbList, `aria-current="page"` на текущей, экранирование вывода):

```php snippet=bitrix/snippets/breadcrumbs.php
renderUiBreadcrumbs([
    ['NAME' => 'Главная', 'LINK' => SITE_DIR],
    ['NAME' => 'Вакансии', 'LINK' => SITE_DIR . 'vacancies/'],
    ['NAME' => 'Стажировка в ИРАО', 'LINK' => null], // текущая — span aria-current="page"
]);
```

Пагинация —
[bitrix/snippets/pagination.php](snippets/pagination.php) (окно показа с
«…», `aria-current="page"` на текущей, недоступные стрелки —
`button[disabled]`); для `bitrix:news.list` данные лежат в `$arResult`:

```php snippet=bitrix/snippets/pagination.php
if ((int)$arResult['NAV_PAGE_COUNT'] > 1) {
    renderUiPagination(
        (int)$arResult['NAV_PAGE_COUNT'],
        (int)$arResult['NAV_PAGE_NOMER'],
        $arResult['sUrlPath'] . '?PAGEN_1=#PAGE#'
    );
}
```

## Шаг 5. Форма отклика с серверными ошибками (≈8 минут)

Каркас страницы формы — паттерн «Страница формы»
([живой стенд](stand:patterns/form-page)):
`ui-form` с полями `ui-field`/`ui-checkbox` и aside-сводкой вакансии.
Правило контракта форм (T5.6): валидация — на сервере всегда, JS (`IraoUI.form`)
только помогает на клиенте. После перезагрузки страницы с ошибками PHP
обязан рендерить те же классы и aria, что клиентская валидация, — иначе
пользователь увидит два разных интерфейса ошибок. Копипаст-шаблон —
[bitrix/snippets/form-error-render.php](snippets/form-error-render.php):
сводная ошибка `ui-form__summary[role=alert]` (первым ребёнком `<form class="ui-form">`)
и inline-фокус на неё — работает без модулей; вызовы из примера использования
файла:

```php snippet=bitrix/snippets/form-error-render.php
<?= irao_ui_form_summary_html($arResult['FORM_ERRORS'], 'apply-', 'apply-summary') ?>
```

Сразу после summary — inline-сниппет фокуса того же файла:
`<?= irao_ui_form_focus_script('apply-summary') ?>`.

id текста ошибки = `{id поля}-error` — суффикс единый с клиентским модулем,
поэтому после перезагрузки модуль работает с серверной разметкой как со
своей. Поля: `ui-field--error` + `aria-invalid="true"` + `aria-describedby`
(хелперы `irao_ui_form_field_wrap_class`/`_error_attrs`/`_error_html` из
того же файла). Success-страница — тот же inline-сниппет фокуса с id
заголовка успеха. Полный цикл (без JS → с JS → «серверный ответ» → success)
вживую — стенд integration/form-full-cycle полигона.

## Итог: чек-лист и что читать дальше

Пробегите [чек-лист первого подключения](first-connect-checklist.md) — 9
legacy-констрейнтов в порядке внедрения (каскад, специфичность, box-sizing,
запрет эскалации, обёртки, смешение, глобалы base, пин версии, журнал
конфликтов). Заведите журнал конфликтов сразу (формат — T11.2): пустой
журнал — тоже результат.

Дальше: [integration guide](doc:integration-guide) — темы и
токены-переопределения, JSON-данные для JS, миграция legacy по стадиям,
обновление версии; доки компонентов полигона (шаблон T10.1) — разметка,
состояния и a11y каждого компонента. Итого путь занял ≈30 минут.

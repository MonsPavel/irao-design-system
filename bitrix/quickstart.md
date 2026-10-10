# Quickstart: подключение irao-ui за 5 минут

Быстрый старт: от «скачал» до «кнопка на живой странице» за пять минут,
копипастом. На сайте Node не нужен — только копирование файлов и четыре
строки в `header.php`. Правила сосуществования с legacy-CSS, темы и миграция
— integration guide; сквозной сценарий «подключили и собрали страницу со
списком и формой» — «[Bitrix-разработчику за 30 минут](doc:bitrix-30-minutes)».

## Что понадобится

- Доступ к файлам сайта по FTP/SSH (или файловый менеджер хостинга);
- дистрибутив релиза irao-ui: git-тег → артефакт `dist/`
  ([02-architecture §6.1](../docs/02-architecture.md)). Пока релизы не
  публикуются, соберите `dist/` один раз на dev-машине: `npm run build`
  (Node нужен ТОЛЬКО здесь — на сайте его нет);
- 5 минут.

## Шаг 1. Скопируйте dist в /local/ui/{version}/

Скачайте артефакт релиза и скопируйте содержимое `dist/` на сайт в папку
`/local/ui/0.1.0/` — имя папки = точная версия. Структура поставки:

| Файл | Что это |
|---|---|
| `ui-core.min.css` | токены → base → все компоненты (обязателен) |
| `ui-vi.min.css` | версия для слабовидящих (ГОСТ Р 52872) |
| `ui.min.js` | все JS-модули, публичное API `window.IraoUI` |
| `fonts/` | Golos Text woff2 — лежат рядом с CSS, относительные `url()` работают без правок |
| `themes/` | темы бренда (в MVP не подключаются) |

Копия версии на сайте read-only: файлы в `/local/ui/0.1.0/` не правятся —
обновление = новая папка версии + смена одной константы (ADR-0006/0007,
«Обновление версии» в integration guide).

## Шаг 2. Четыре строки в header.php

PHP-блок подключения в начало `header.php` (до `<!DOCTYPE html>`),
файл-источник —
[bitrix/snippets/header-php.snippet.php](snippets/header-php.snippet.php):

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

В `<head>` шаблона (до `ShowHead()`) — preload приоритетных шрифтов
400/500 cyr:

```php snippet=bitrix/snippets/header-php.snippet.php
  <!-- preload шрифтов до CSS-каскада Bitrix (T3.1): 400/500 cyr -->
  <link rel="preload" href="/local/ui/<?= UI_VERSION ?>/fonts/golos-400-cyr.woff2"
        as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/local/ui/<?= UI_VERSION ?>/fonts/golos-500-cyr.woff2"
        as="font" type="font/woff2" crossorigin>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <?php $APPLICATION->ShowHead(); ?>
```

Первой строкой `<body>` — skip-link (цель `<main id="main" tabindex="-1">`
обязана быть в шаблоне страницы):

```php snippet=bitrix/snippets/header-php.snippet.php
  <a class="ui-skip-link" href="#main">Перейти к основному содержимому</a>
```

Почему именно так (порядок каскада core → vi → сайт, совместимость с
объединением CSS Bitrix, «поздняя» загрузка JS) — integration guide,
[чек-лист первого подключения](first-connect-checklist.md).

## Шаг 3. Скопируйте кнопку из доки

Откройте доку [ui-button](doc:ui-button) и скопируйте разметку из секции
«HTML-сниппет» (канонический паттерн —
components/ui-button/ui-button.html). Минимальная кнопка:

```html snippet=components/ui-button/ui-button.html
  <button class="ui-button ui-button--primary" type="submit">Отправить отклик</button>
```

Создайте тестовую страницу вне кэша (например `/test-ui.php`), вставьте
кнопку и откройте её: кнопка выглядит и ведёт себя как в доке — каскад,
шрифты и состояния приехали с `ui-core.min.css`. Проверьте фокус с
клавиатуры (Tab): рамка видна — политика фокуса системы работает
(ADR-0001).

## Инкогнито-проверка

Формализованный сценарий «доки — единственный контекст» (инкогнито-тест —
гейт эпиков 11/12): разработчик, который видит систему впервые, проходит
только по этим документам:

1. скачал/собрал `dist/`, скопировал в `/local/ui/0.1.0/` — без сборочных
   команд на сайте;
2. вставил блок подключения в `header.php` — страница открывается, все
   файлы системы отдаются (нет 404 и ошибок в консоли);
3. скопировал кнопку из доки — кнопка стилизована, фокус с клавиатуры
   виден, `Tab` начинается со skip-link;
4. прошёл [чек-лист первого подключения](first-connect-checklist.md) —
   9 legacy-констрейнтов, журнал конфликтов заведён.

Затык на любом шаге — дефект доков: правится здесь, а не «объясняется в
личке».

## Что дальше

- «[Bitrix-разработчику за 30 минут](doc:bitrix-30-minutes)» — страница
  списка и форма с серверными ошибками за полчаса;
- [Integration guide](doc:integration-guide) — CSS/JS/шрифты по частям,
  порядок каскада, темы и токены-переопределения, JSON-данные, серверные
  ошибки форм, legacy-констрейнты, миграция по стадиям, обновление версии;
- [Чек-лист первого подключения](first-connect-checklist.md) — исполнимая
  форма 9 констрейнтов (копируется в задачу подключения).

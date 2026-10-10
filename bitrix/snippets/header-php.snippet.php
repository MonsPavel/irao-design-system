<?php
/**
 * Сниппет подключения irao-ui к header.php шаблона сайта на Bitrix (T11.1 —
 * полная версия; зерно T3.1, источник — 02-architecture §6.2, ADR-0006/0008).
 *
 * Что делает:
 *   1. закрепляет версию системы константой UI_VERSION — единственное место
 *      правки при обновлении (пин версии — констрейнт 8 плана 06 §6;
 *      обновление = новая папка /local/ui/{version}/ + правка этой строки,
 *      ADR-0006/0007);
 *   2. подключает CSS в порядке каскада (констрейнт 1): ui-core → (тема,
 *      опционально — snippets/theme-connect.php) → ui-vi → template_styles.css
 *      сайта (стили сайта подключаются Bitrix'ом ПОСЛЕ — документированная
 *      точка расширения, integration-guide.md);
 *   3. preload приоритетных граней Golos (400/500 cyr — 90% русской страницы,
 *      паттерн career-portal, T3.1) ДО CSS-каскада Bitrix: до ShowHead(), в
 *      начало head-области (Technical considerations T11.1). Атрибут
 *      crossorigin обязателен — шрифты грузятся в CORS-режиме, без него
 *      preload не матчится с загрузкой и шрифт запросится дважды;
 *   4. подключает ui.min.js В КОНЕЦ страницы (addJs(…, true) — defer-семантика
 *      Bitrix; readyState-guard модулей T1.1 закрывает позднюю загрузку) и
 *      ui-vi.min.css — кнопка входа в версию для слабовидящих на любой
 *      странице;
 *   5. ставит ui-skip-link первым элементом <body> (T3.5, WCAG 2.4.1): первый
 *      Tab страницы — «Перейти к основному содержимому». Цель —
 *      <main id="main" tabindex="-1"> в шаблоне страницы/footer.php:
 *      tabindex="-1" делает цель фокусируемой, иначе Enter меняет только
 *      хэш, а фокус остаётся на ссылке (Safari-кейс). Правило —
 *      components/ui-skip-link/README.md.
 *
 * data-ui-theme — ОПЦИОНАЛЬНО (Scope T11.1): атрибут темы на <html> нужен
 * только сайту с не-дефолтной темой (механизм и правила —
 * snippets/theme-connect.php, themes/README.md). В MVP все сайты в дефолтном
 * бренде — атрибут не ставится.
 *
 * Шрифты и лицензия лежат рядом с css в той же папке версии
 * (/local/ui/{version}/fonts/) — относительные url() @font-face работают
 * без правок (структура dist, T1.3.2). Копия dist на сайте read-only:
 * обновление = новая папка версии + смена UI_VERSION (ADR-0006/0008).
 */

// Версия UI-системы, закреплённая за сайтом. Обновление = правка этой строки.
const UI_VERSION = '0.1.0';

$asset = \Bitrix\Main\Page\Asset::getInstance();
$asset->addCss('/local/ui/' . UI_VERSION . '/ui-core.min.css');
// Тема бренда — опциональна (в MVP все сайты в дефолтном бренде). Если тема
// есть, она идёт СТРОГО после core (порядок каскада core → theme → сайт):
// $asset->addCss('/local/ui/' . UI_VERSION . '/themes/theme-corp.css');
$asset->addCss('/local/ui/' . UI_VERSION . '/ui-vi.min.css');
$asset->addJs('/local/ui/' . UI_VERSION . '/ui.min.js', true); // true => в конец, defer-семантика Bitrix
?>
<!DOCTYPE html>
<html lang="<?= LANGUAGE_ID ?>">
<head>
  <!-- preload шрифтов до CSS-каскада Bitrix (T3.1): 400/500 cyr -->
  <link rel="preload" href="/local/ui/<?= UI_VERSION ?>/fonts/golos-400-cyr.woff2"
        as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/local/ui/<?= UI_VERSION ?>/fonts/golos-500-cyr.woff2"
        as="font" type="font/woff2" crossorigin>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <?php $APPLICATION->ShowHead(); ?>
</head>
<body>
  <a class="ui-skip-link" href="#main">Перейти к основному содержимому</a>

<?php
/**
 * Заготовка сниппета подключения irao-ui к header.php шаблона сайта на Bitrix
 * (задача T3.1: preload-сниппет шрифтов; полная версия сниппетов — T11.1).
 *
 * Источник — 02-architecture §6.2. Что делает:
 *   1. preload приоритетных граней Golos (400/500 cyr — 90% русской страницы,
 *      паттерн career-portal) ДО CSS-каскада Bitrix; атрибут crossorigin
 *      обязателен — шрифты грузятся в CORS-режиме, без него preload не
 *      матчится с загрузкой и шрифт запросится дважды;
 *   2. подключает CSS системы в порядке каскада: ui-core → (тема) →
 *      template_styles.css сайта (последним — точка расширения);
 *   3. подключает ui.min.js в конец (defer-семантика Bitrix) и ui-vi.min.css
 *      (кнопка входа в версию для слабовидящих — на любой странице).
 *
 * Шрифты и лицензия лежат рядом с css в той же папке версии
 * (/local/ui/{version}/fonts/) — относительные url() @font-face работают
 * без правок (структура dist, T1.3.2). Копия dist на сайте read-only:
 * обновление = новая папка версии + смена UI_VERSION (ADR-0006/0008).
 */
?>
<?php
// Версия UI-системы, закреплённая за сайтом. Обновление = правка этой строки.
const UI_VERSION = '0.1.0';

$asset = \Bitrix\Main\Page\Asset::getInstance();
$asset->addCss('/local/ui/' . UI_VERSION . '/ui-core.min.css');
// Тема бренда (необязательна; в MVP все сайты в дефолтном бренде):
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
<body data-ui-theme="irao">

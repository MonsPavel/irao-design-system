<?php
/**
 * Сниппет генерации хлебных крошек irao-ui (ui-breadcrumbs, задача T4.7)
 * для Bitrix-шаблонов. Печатает разметку, канонический паттерн которой —
 * components/ui-breadcrumbs/ui-breadcrumbs.html; правила и кейсы —
 * README.md компонента. Полные сниппеты — T11.1.
 *
 * Что делает:
 *   1. из массива цепочки строит nav[aria-label] > ol[role="list"] > li с
 *      микроразметкой schema.org BreadcrumbList (microdata по схеме Google —
 *      без JS, дружелюбна к шаблонам): BreadcrumbList на ol, ListItem на li,
 *      itemprop="item" на ссылке, name в span, position в meta (автонумерация);
 *   2. текущая страница (элемент без LINK) — span + aria-current="page",
 *      itemprop="item" у неё не выводится (Google берёт URL самой страницы);
 *   3. весь пользовательский вывод экранируется (htmlspecialchars) — названия
 *      приходят из инфоблоков/меню и не обязаны быть доверенными.
 *
 * Источник цепочки (на выбор, примеры — в конце файла):
 *   - $arResult компонента bitrix:breadcrumb (нативная цепочка навигации:
 *      элемент = ['TITLE' => …, 'LINK' => …]); шаблон .default компонента
 *      заменяется вызовом этого сниппета;
 *   - собственный массив по образцу $arResult из bitrix:menu / IncludeArea.
 *
 * Формат входного массива: список элементов ['NAME' => string, 'LINK' => ?string].
 * Элемент с LINK => null считается текущей страницей и обязан быть последним.
 */

if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) {
    die();
}

/**
 * Печатает цепочку крошек в разметке ui-breadcrumbs.
 *
 * @param array  $items      Цепочка [['NAME' => string, 'LINK' => ?string], ...].
 * @param string $label      Имя лендмарки nav (конвенция: «Хлебные крошки»).
 * @param bool   $needReturn Вернуть строку вместо вывода (для кэша/JSON).
 *
 * @return string|null
 */
function renderUiBreadcrumbs(array $items, string $label = 'Хлебные крошки', bool $needReturn = false): ?string
{
    // Пустая цепочка — компонент не выводится вовсе (шаблон без «пустого» nav).
    if ($items === []) {
        return $needReturn ? '' : null;
    }

    $e = static function ($value) {
        // Пользовательские названия из инфоблоков/меню не доверенные — экранируем всё.
        return htmlspecialchars((string)$value, ENT_QUOTES, defined('SITE_CHARSET') ? SITE_CHARSET : 'UTF-8');
    };

    $html = '<nav class="ui-breadcrumbs" aria-label="' . $e($label) . '">';
    $html .= '<ol class="ui-breadcrumbs__list" role="list" itemscope itemtype="https://schema.org/BreadcrumbList">';

    $total = count($items);
    foreach (array_values($items) as $index => $item) {
        $position = $index + 1; // position в BreadcrumbList начинается с 1
        $name = (string)($item['NAME'] ?? '');
        $link = $item['LINK'] ?? null;

        $html .= '<li class="ui-breadcrumbs__item" itemprop="itemListElement"'
            . ' itemscope itemtype="https://schema.org/ListItem">';

        if ($link !== null && $link !== '' && $index < $total - 1) {
            // Уровень-ссылка: itemprop="item" на <a>, имя — в span itemprop="name".
            $html .= '<a class="ui-breadcrumbs__link" itemprop="item" href="' . $e($link) . '">'
                . '<span itemprop="name">' . $e($name) . '</span></a>';
        } else {
            // Текущая страница (последний элемент без LINK) или уровень без страницы:
            // span + itemprop="name"; у текущей aria-current="page", itemprop="item" не выводится.
            $ariaCurrent = $index === $total - 1 ? ' aria-current="page"' : '';
            $html .= '<span class="ui-breadcrumbs__current" itemprop="name"' . $ariaCurrent . '>'
                . $e($name) . '</span>';
        }

        $html .= '<meta itemprop="position" content="' . $position . '">';
        $html .= '</li>';
    }

    $html .= '</ol></nav>';

    if ($needReturn) {
        return $html;
    }

    echo $html;

    return null;
}

/* ── Пример 1: цепочка из $arResult компонента bitrix:breadcrumb ──
   В шаблоне компонента (или в footer.php/header.php шаблона сайта):

if (!empty($arResult)) {
    $items = [];
    foreach ($arResult as $crumb) {
        $items[] = ['NAME' => (string)$crumb['TITLE'], 'LINK' => $crumb['LINK']];
    }
    renderUiBreadcrumbs($items);
}
*/

/* ── Пример 2: собственная цепочка в шаблоне страницы ──

renderUiBreadcrumbs([
    ['NAME' => 'Главная', 'LINK' => SITE_DIR],
    ['NAME' => 'Вакансии', 'LINK' => SITE_DIR . 'vacancies/'],
    ['NAME' => 'Стажировка в ИРАО', 'LINK' => null], // текущая — span aria-current="page"
]);
*/

/* ── Пример 3: «Главная → Раздел без ссылки → Текущая» (README, кейс) ──
   У уровня без собственной страницы LINK => null: itemprop="item" не выводится
   (schema.org это допускает), но Google Rich Results может предупредить о
   пропущенном item у не-последнего уровня — если URL существует, давайте ссылку.

renderUiBreadcrumbs([
    ['NAME' => 'Главная', 'LINK' => SITE_DIR],
    ['NAME' => 'Каталог материалов', 'LINK' => null], // раздел без страницы
    ['NAME' => 'Отчёты за 2025 учебный год', 'LINK' => null],
]);
*/

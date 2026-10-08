<?php
/**
 * Сниппет генерации пагинации irao-ui (ui-pagination, задача T6.3) для
 * Bitrix-шаблонов постраничной навигации. Печатает разметку, канонический
 * паттерн которой — components/ui-pagination/ui-pagination.html; правила
 * и решения — README.md компонента. Полные сниппеты — T11.1.
 *
 * Что делает:
 *   1. из общего числа страниц и текущей рассчитывает ОКНО показа: первая и
 *      последняя страницы видны всегда, вокруг текущей — окно ±$side;
 *      разрыв длиннее одной страницы сжимается в «…»
 *      (ui-pagination__ellipsis, span aria-hidden), разрыв ровно в одну
 *      страницу сворачивается в сам номер — «…» ради одной страницы не
 *      показывается;
 *   2. семантика: nav[aria-label] — лендмарка; текущая страница —
 *      span + aria-current="page" (не ссылка: «ссылка на себя» — мусорная
 *      остановка Tab); страницы — ссылки с именами «Страница N»;
 *   3. стрелки: доступная — <a> с aria-label («Предыдущая страница» /
 *      «Следующая страница»), недоступная (на первой/последней странице) —
 *      button[type="button"][disabled] — нативно не фокусируется, не
 *      кликается, объявляется неактивной (disabled на <a>, как в
 *      career-portal, невалиден; решение зафиксировано в README);
 *   4. весь пользовательский вывод (label, URL) экранируется
 *      (htmlspecialchars); номера страниц — целые из (int).
 *
 * AJAX-пагинация — зона сайта (Out of scope задачи): сниппет рендерит
 * серверную навигацию ссылками; перехват кликов и подмена контента —
 * шаблон сайта, контракт состояний тот же.
 */

if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) {
    die();
}

/**
 * Печатает пагинацию в разметке ui-pagination.
 *
 * @param int    $total       Всего страниц (>= 1; иначе компонент не выводится).
 * @param int    $current     Текущая страница (1..total; вне диапазона — клампится).
 * @param string $urlTemplate Шаблон URL страницы: плейсхолдер #PAGE# заменяется
 *                            номером (например '?page=#PAGE#' или
 *                            '/vacancies/page-#PAGE#/').
 * @param string $label       Имя лендмарки nav (конвенция: «Пагинация»;
 *                            на странице с несколькими пагинациями —
 *                            различайте: «Пагинация каталога» и т.п.).
 * @param int    $side        Размер окна вокруг текущей страницы (>= 0).
 * @param bool   $needReturn  Вернуть строку вместо вывода (для кэша/JSON).
 *
 * @return string|null
 */
function renderUiPagination(
    int $total,
    int $current,
    string $urlTemplate = '?page=#PAGE#',
    string $label = 'Пагинация',
    int $side = 1,
    bool $needReturn = false
): ?string {
    // Нет страниц — компонент не выводится вовсе (шаблон без «пустого» nav).
    if ($total < 1) {
        return $needReturn ? '' : null;
    }

    $current = max(1, min($current, $total));
    $side = max(0, $side);

    $e = static function ($value) {
        // URL-шаблон приходит из кода шаблона, но уходит в атрибут — экранируем.
        return htmlspecialchars((string)$value, ENT_QUOTES, defined('SITE_CHARSET') ? SITE_CHARSET : 'UTF-8');
    };
    $url = static function (int $page) use ($urlTemplate, $e) {
        return $e(str_replace('#PAGE#', (string)$page, $urlTemplate));
    };

    // Глифы стрелок — декоративные (svg aria-hidden, цвет currentColor).
    $svgPrev = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">'
        . '<path d="M14 8H3M8 3L3 8l5 5" stroke="currentColor" stroke-width="2"'
        . ' stroke-linecap="round" stroke-linejoin="round"/></svg>';
    $svgNext = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">'
        . '<path d="M2 8h11M9 3l5 5-5 5" stroke="currentColor" stroke-width="2"'
        . ' stroke-linecap="round" stroke-linejoin="round"/></svg>';

    // ── Окно показа: края всегда, окно ±$side вокруг текущей, «…» в разрывах ──
    $visible = [];
    for ($n = 1; $n <= $total; $n++) {
        if ($n === 1 || $n === $total || abs($n - $current) <= $side) {
            $visible[] = $n;
        }
    }
    $items = []; // ['page' => int] | ['ellipsis' => true]
    $prev = 0;
    foreach ($visible as $n) {
        if ($n - $prev === 2) {
            // Разрыв ровно в одну страницу — показываем номер, а не «…».
            $items[] = ['page' => $prev + 1];
        } elseif ($n - $prev > 2) {
            $items[] = ['ellipsis' => true];
        }
        $items[] = ['page' => $n];
        $prev = $n;
    }

    $html = '<nav class="ui-pagination" aria-label="' . $e($label) . '">';

    // Стрелка «Назад»: доступна — ссылка; на первой странице — disabled-кнопка.
    if ($current > 1) {
        $html .= '<a class="ui-pagination__arrow" href="' . $url($current - 1) . '"'
            . ' aria-label="Предыдущая страница">' . $svgPrev . '</a>';
    } else {
        $html .= '<button class="ui-pagination__arrow" type="button" disabled'
            . ' aria-label="Предыдущая страница">' . $svgPrev . '</button>';
    }

    foreach ($items as $item) {
        if (isset($item['ellipsis'])) {
            $html .= '<span class="ui-pagination__ellipsis" aria-hidden="true">…</span>';
            continue;
        }
        $n = $item['page'];
        if ($n === $current) {
            // Текущая — span + aria-current="page": не ссылка, не остановка Tab.
            $html .= '<span class="ui-pagination__page" aria-current="page">' . $n . '</span>';
        } else {
            $html .= '<a class="ui-pagination__page" href="' . $url($n) . '"'
                . ' aria-label="Страница ' . $n . '">' . $n . '</a>';
        }
    }

    // Стрелка «Вперёд»: доступна — ссылка; на последней странице — disabled.
    if ($current < $total) {
        $html .= '<a class="ui-pagination__arrow" href="' . $url($current + 1) . '"'
            . ' aria-label="Следующая страница">' . $svgNext . '</a>';
    } else {
        $html .= '<button class="ui-pagination__arrow" type="button" disabled'
            . ' aria-label="Следующая страница">' . $svgNext . '</button>';
    }

    $html .= '</nav>';

    if ($needReturn) {
        return $html;
    }

    echo $html;

    return null;
}

/* ── Пример 1: постраничная навигация bitrix:news.list ──
   В template.php компонента (в $arResult — NavPageCount/NavPageNomer):

if ((int)$arResult['NAV_PAGE_COUNT'] > 1) {
    renderUiPagination(
        (int)$arResult['NAV_PAGE_COUNT'],
        (int)$arResult['NAV_PAGE_NOMER'],
        $arResult['sUrlPath'] . '?PAGEN_1=#PAGE#'
    );
}
*/

/* ── Пример 2: собственный список (страницы ЧПУ) ──

renderUiPagination(
    20,
    7,
    SITE_DIR . 'education/page-#PAGE#/',
    'Пагинация каталога',
    1
);
// 20 страниц, текущая 7: «1 … 6 7 8 … 20», обе стрелки — ссылки.
*/

/* ── Пример 3: окно шире (±2) ──

renderUiPagination(10, 4, '?page=#PAGE#', 'Пагинация', 2);
// 10 страниц, текущая 4, окно ±2: «1 2 3 4 5 6 … 10» — между 6 и 10 скрыты
// 7–9 (больше одной страницы) → «…»; скрытый разрыв ровно в одну страницу
// показывался бы самим номером, а не «…».
*/

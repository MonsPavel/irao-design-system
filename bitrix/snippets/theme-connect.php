<?php
/**
 * Сниппет подключения ОПЦИОНАЛЬНОЙ темы irao-ui (T11.1; механика — ADR-0009,
 * themes/README.md; порядок каскада — ADR-0008, 02-architecture §6.2).
 *
 * Тема — файл dist/themes/theme-<имя>.css, ПЕРЕОПРЕДЕЛЯЮЩИЙ только
 * семантические токены слоя 2 в одном блоке [data-ui-theme="…"]. Классы,
 * HTML и компоненты при смене темы не меняются (проверено T2.4).
 *
 * Правила подключения (не нарушать):
 *   1. файл темы — ПОСЛЕ ui-core и ДО template_styles.css сайта
 *      (каскад: core → theme → сайт; сайт получает законную точку
 *      переопределения темы последним каскадом);
 *   2. атрибут data-ui-theme — на <html>, значение = имя файла БЕЗ префикса
 *      theme- и суффикса .css (зафиксировано T2.4; переключатель ?theme=
 *      каркаса showcase делает так же);
 *   3. в MVP (все сайты в дефолтном бренде) тема НЕ подключается и атрибут
 *      НЕ ставится — подключение по этому сниппету только по факту появления
 *      брендовой темы (minor-версия системы, ADR-0007/0009);
 *   4. правило совместимости: новые семантические токены системы всегда
 *      имеют дефолт в :root слоя 2 — старая тема работает дефолтами.
 *
 * Файл темы кладётся РЯДОМ с ui-core.min.css в копии dist на сайте
 * (/local/ui/{version}/themes/) — структура поставки не меняется (ADR-0006).
 */

if (!function_exists('irao_ui_theme_url')) {
    /**
     * URL файла темы в копии dist сайта. Имя — без префикса theme- и
     * суффикса .css: irao_ui_theme_url('corp') → /local/ui/0.1.0/themes/theme-corp.css.
     *
     * Требует константу UI_VERSION из snippets/header-php.snippet.php
     * (подключается раньше — тема не используется без системы).
     *
     * @param string $name имя темы
     * @return string URL CSS-файла темы
     */
    function irao_ui_theme_url($name)
    {
        if (!defined('UI_VERSION')) {
            return '';
        }

        return '/local/ui/' . UI_VERSION . '/themes/theme-' . rawurlencode((string) $name) . '.css';
    }
}

if (!function_exists('irao_ui_theme_attr')) {
    /**
     * Атрибут темы для тега <html>: строка ` data-ui-theme="…"` или пустая
     * строка, если тема не задана (вызов безусловен — сайт с дефолтным
     * брендом не ставит атрибут вовсе, механизм T2.4).
     *
     * @param string|null $name имя темы (null/'' — тема не задана)
     * @return string фрагмент HTML-атрибута с ведущим пробелом или ''
     */
    function irao_ui_theme_attr($name = null)
    {
        $name = (string) $name;
        if ($name === '') {
            return '';
        }

        return sprintf(' data-ui-theme="%s"', htmlspecialchars($name, ENT_QUOTES, 'UTF-8'));
    }
}

/**
 * Использование (копипаст-готово).
 *
 * 1. Декларативно — тема всего сайта. В snippets/header-php.snippet.php
 *    после строки подключения ui-core (до ui-vi и стилей сайта):
 *
 *      $asset->addCss(irao_ui_theme_url('corp'));
 *
 *    и атрибут на <html> того же header.php:
 *
 *      <html lang="<?= LANGUAGE_ID ?>"<?= irao_ui_theme_attr('corp') ?>>
 *
 * 2. По разделам сайта — решение о теме принимается в header.php до вывода
 *    <html> (механика var-каскада та же, integration-guide.md):
 *
 *      $sectionTheme = strpos($APPLICATION->GetCurDir(), '/career/') === 0
 *          ? 'corp' : null;
 *      $asset->addCss(irao_ui_theme_url('corp')); // файл один, каскад решает:
 *                                                 // без атрибута работают
 *                                                 // дефолты :root
 *      ...
 *      <html lang="<?= LANGUAGE_ID ?>"<?= irao_ui_theme_attr($sectionTheme) ?>>
 *
 * 3. Переключение без перезагрузки (необязательно): смена атрибута на
 *    document.documentElement + подмена/добавление <link> темы — так делает
 *    переключатель ?theme= каркаса showcase (showcase/build.mjs). Система
 *    не требует JS для смены темы: декларативного подключения достаточно.
 *
 * Своё значение (подкрутка темы под сайт) — переопределение СЕМАНТИЧЕСКОГО
 * токена в template_styles.css (после темы), кейс в integration-guide.md;
 * правки файла темы и имена ui-* запрещены (themes/README.md).
 *
 * @see themes/README.md — механизм тем и правила файла темы (гейт stylelint)
 * @see bitrix/integration-guide.md — порядок каскада и кейс переопределения токенов
 */

<?php
/**
 * Сниппет T5.6 — серверный рендер ошибок формы по контракту irao-ui.
 *
 * Сценарий: Bitrix-форма валидирует на сервере и перезагружает страницу —
 * PHP выводит ТЕ ЖЕ классы и aria, что рендерит клиентская валидация
 * (модуль IraoUI.form, T5.5). Пользователь видит один интерфейс ошибок
 * до и после сабмита. Контракт стабильнее классов: изменение классов
 * ошибок = major (ADR-0007); таблица «состояние → классы → aria → фокус» —
 * components/ui-form/README.md («Серверный контракт ошибок»).
 *
 * Состав (все функции под function_exists — шаблон может подключаться
 * повторно; копипаст-готово, без зависимостей от ядра):
 *  - irao_ui_form_error_plural()      — RU-множественное «ошибка/ошибки/ошибок»;
 *  - irao_ui_form_summary_html()      — сводная ошибка ui-form__summary
 *                                       [role=alert][tabindex=-1] из массива
 *                                       ошибок вида FIELD_NAME => сообщение
 *                                       (например $arResult["FORM_ERRORS"]);
 *  - irao_ui_form_field_wrap_class()  — класс обвязки поля
 *                                       (ui-field [+ ui-field--error]);
 *  - irao_ui_form_field_error_attrs() — aria невалидного контрола:
 *                                       aria-invalid="true" + aria-describedby;
 *  - irao_ui_form_field_error_html()  — текст ошибки
 *                                       <p class="ui-field__error" id="…-error"
 *                                       role="alert">…</p>;
 *  - irao_ui_form_focus_script()      — inline-сниппет фокуса (работает без
 *                                       модулей): при наличии ошибок — фокус
 *                                       на summary после перезагрузки;
 *                                       для серверной success-страницы — тот
 *                                       же сниппет с id success-заголовка.
 *
 * Идентификаторы: id контрола на странице = $fieldIdPrefix . FIELD_NAME
 * (по умолчанию префикс пуст); id текста ошибки = {id}-error — суффикс
 * единый с клиентским модулем (T5.5), поэтому после перезагрузки модуль
 * работает с серверной разметкой как со своей.
 *
 * ВАЖНО (XSS — часть контракта): сообщения об ошибках и имена полей могут
 * содержать пользовательские данные — весь вывод экранируется
 * htmlspecialchars() в кодировке сайта. Экранирование не убирать.
 *
 * AJAX-отправка (Out of scope T5.6): сниппет не нужен — ошибки рендерит
 * клиентский модуль по тому же контракту; сервер возвращает данные, а не HTML.
 *
 * Серверная валидация ВСЕГДА включена: JS — только UX. Отключение серверной
 * проверки (или сабмит «мимо JS») не должно менять поведение формы.
 */

if (!function_exists('irao_ui_form_errors_charset')) {
    /**
     * Кодировка экранирования: сайт может работать не в UTF-8.
     *
     * @return string
     */
    function irao_ui_form_errors_charset()
    {
        return defined('SITE_CHARSET') ? SITE_CHARSET : 'UTF-8';
    }
}

if (!function_exists('irao_ui_form_error_plural')) {
    /**
     * RU-множественное слова «ошибка» (едино с IraoUI.form, T5.5).
     *
     * @param int $count число ошибок
     * @return string
     */
    function irao_ui_form_error_plural($count)
    {
        $count = (int) $count;
        $mod100 = $count % 100;
        if ($mod100 >= 11 && $mod100 <= 14) {
            return 'ошибок';
        }
        $mod10 = $count % 10;
        if ($mod10 === 1) {
            return 'ошибка';
        }
        if ($mod10 >= 2 && $mod10 <= 4) {
            return 'ошибки';
        }

        return 'ошибок';
    }
}

if (!function_exists('irao_ui_form_summary_html')) {
    /**
     * Сводная ошибка формы: <div class="ui-form__summary" role="alert"
     * tabindex="-1"> с заголовком «В форме N ошибк(и/ок)» и списком ссылок
     * на id полей (href — реальный id контрола: переход фокуса нативен).
     * Выводится ПЕРВЫМ ребёнком <form class="ui-form">.
     *
     * @param array  $errors        ошибки вида FIELD_NAME => сообщение
     *                              (например $arResult["FORM_ERRORS"]);
     * @param string $fieldIdPrefix префикс id контролов на странице
     *                              (id поля = префикс . FIELD_NAME);
     * @param string $summaryId     id сводного блока — цель inline-сниппета
     *                              фокуса (irao_ui_form_focus_script).
     * @return string HTML
     */
    function irao_ui_form_summary_html(array $errors, $fieldIdPrefix = '', $summaryId = 'ui-form-summary')
    {
        if (count($errors) === 0) {
            return '';
        }

        $charset = irao_ui_form_errors_charset();
        $html = sprintf(
            '<div class="ui-form__summary" id="%s" role="alert" tabindex="-1">',
            htmlspecialchars($summaryId, ENT_QUOTES, $charset)
        );
        $html .= sprintf(
            '<h2 class="ui-h4 ui-form__summary-title">В форме %d %s</h2>',
            count($errors),
            irao_ui_form_error_plural(count($errors))
        );
        $html .= '<ul class="ui-form__summary-list">';
        foreach ($errors as $fieldName => $message) {
            $anchor = $fieldIdPrefix . rawurlencode((string) $fieldName);
            $html .= sprintf(
                '<li><a class="ui-link" href="#%s">%s</a></li>',
                htmlspecialchars($anchor, ENT_QUOTES, $charset),
                htmlspecialchars((string) $message, ENT_QUOTES, $charset)
            );
        }
        $html .= '</ul></div>';

        return $html;
    }
}

if (!function_exists('irao_ui_form_field_wrap_class')) {
    /**
     * Класс обвязки поля: «ui-field» либо «ui-field ui-field--error»,
     * если у поля есть серверная ошибка.
     *
     * @param string|null $message   сообщение ошибки поля (пусто — ошибки нет);
     *                               например $arResult["FORM_ERRORS"]["NAME"] ?? null
     * @param string      $baseClass базовый класс обвязки (модификаторы
     *                               --required/--wide дописывает сайт)
     * @return string
     */
    function irao_ui_form_field_wrap_class($message, $baseClass = 'ui-field')
    {
        return $message === null || (string) $message === ''
            ? $baseClass
            : $baseClass . ' ui-field--error';
    }
}

if (!function_exists('irao_ui_form_field_error_attrs')) {
    /**
     * Атрибуты невалидного контрола: aria-invalid="true" aria-describedby="{id}-error".
     * Для поля без ошибки возвращает пустую строку — вызов безусловен:
     * <?= irao_ui_form_field_error_attrs('apply-NAME', $nameError) ?>
     * Если контрол уже несёт aria-describedby (например подсказку), перечислите
     * id подсказки здесь же: подсказка идёт первой, ошибка — второй
     * (порядок единый с модулем T5.5).
     *
     * @param string      $fieldId id контрола на странице
     * @param string|null $message сообщение ошибки поля (пусто — ошибки нет)
     * @return string
     */
    function irao_ui_form_field_error_attrs($fieldId, $message = null)
    {
        if ($message === null || (string) $message === '') {
            return '';
        }

        return sprintf(
            'aria-invalid="true" aria-describedby="%s-error"',
            htmlspecialchars((string) $fieldId, ENT_QUOTES, irao_ui_form_errors_charset())
        );
    }
}

if (!function_exists('irao_ui_form_field_error_html')) {
    /**
     * Текст ошибки поля: <p class="ui-field__error" id="{id}-error"
     * role="alert">…</p> (роль объявляет сообщение немедленно — тот же
     * контракт, что у созданного модулем текста). Для поля без ошибки
     * возвращает пустую строку.
     *
     * @param string      $fieldId id контрола на странице
     * @param string|null $message сообщение ошибки поля (пусто — ошибки нет)
     * @return string
     */
    function irao_ui_form_field_error_html($fieldId, $message = null)
    {
        if ($message === null || (string) $message === '') {
            return '';
        }

        return sprintf(
            '<p class="ui-field__error" id="%s-error" role="alert">%s</p>',
            htmlspecialchars((string) $fieldId, ENT_QUOTES, irao_ui_form_errors_charset()),
            htmlspecialchars((string) $message, ENT_QUOTES, irao_ui_form_errors_charset())
        );
    }
}

if (!function_exists('irao_ui_form_focus_script')) {
    /**
     * Inline-сниппет фокуса серверного состояния — работает БЕЗ модулей
     * (Implementation requirements T5.6 п.3): скрипт печатается сразу после
     * целевого элемента, ставит фокус, если элемент в DOM и видим.
     * tabindex="-1" на цели обеспечивает разметка (summary из
     * irao_ui_form_summary_html(); success-заголовок — паттерн T5.4).
     *
     * Ошибки:      <?= irao_ui_form_focus_script('ui-form-summary') ?>
     * Success:     <?= irao_ui_form_focus_script('ui-form-success-title') ?>
     *
     * @param string $targetId id элемента серверного состояния
     * @return string HTML <script>…</script>
     */
    function irao_ui_form_focus_script($targetId)
    {
        $id = json_encode(
            (string) $targetId,
            JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
        );
        $js = <<<JS
(function () {
  var el = document.getElementById(%s);
  if (el && !el.hidden && typeof el.focus === 'function') {
    el.focus();
  }
})();
JS;

        return '<script>' . "\n" . sprintf($js, $id) . "\n" . '</script>';
    }
}

/**
 * Использование в шаблоне bitrix:form.result.new (или любой формы сайта) —
 * копипаст-готово. Подключение: require_once __DIR__ . '/form-error-render.php';
 * (или разместить функции в result_modification.php / init.php).
 *
 *   <?php /** серверный рендер после перезагрузки: контракт irao-ui T5.6 * / ?>
 *   <form class="ui-form" method="post" action="/local/ajax/apply.php">
 *     <?php if (!empty($arResult['FORM_ERRORS'])): ?>
 *       <?= irao_ui_form_summary_html($arResult['FORM_ERRORS'], 'apply-', 'apply-summary') ?>
 *       <?= irao_ui_form_focus_script('apply-summary') ?>
 *     <?php endif; ?>
 *     <div class="ui-form__grid">
 *       <?php $nameError = isset($arResult['FORM_ERRORS']['NAME'])
 *         ? $arResult['FORM_ERRORS']['NAME'] : null; ?>
 *       <div class="<?= irao_ui_form_field_wrap_class($nameError) ?> ui-field--required">
 *         <label class="ui-field__label" for="apply-NAME">Имя и фамилия</label>
 *         <input class="ui-field__input" type="text" id="apply-NAME" name="NAME"
 *                value="<?= htmlspecialchars((string) $_POST['NAME'], ENT_QUOTES, irao_ui_form_errors_charset()) ?>"
 *                <?= irao_ui_form_field_error_attrs('apply-NAME', $nameError) ?>>
 *         <?= irao_ui_form_field_error_html('apply-NAME', $nameError) ?>
 *       </div>
 *     </div>
 *     <div class="ui-form__actions">
 *       <button class="ui-button ui-button--primary" type="submit">Отправить</button>
 *     </div>
 *   </form>
 *
 * Серверная success-страница (валидные данные приняты): success-блок
 * рендерится сразу видимым, фокус на заголовок — тем же inline-сниппетом.
 *
 * @see components/ui-form/README.md — контракт и таблица «состояние → классы → aria → фокус»
 * @see showcase/pages/integration/form-full-cycle/index.html — стенд полного цикла (стендовая репетиция пилота)
 */

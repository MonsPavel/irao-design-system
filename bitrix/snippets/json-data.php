<?php
/**
 * Сниппет «JSON-данные для JS» irao-ui (T11.1; контракт — ADR-0008 п.2,
 * 02-architecture §6.3; прецедент — ui-tabs, data-ui-tabs-data).
 *
 * Зачем: данные для JS-компонентов живут В РАЗМЕТКЕ страницы в
 * <script type="application/json"> и заполняются из PHP (json_encode
 * массивов инфоблоков). Сервер отдаёт данные вместе с разметкой — JS модулей
 * системы остаётся без запросов к API; модель «данные — зона сайта»
 * (ADR-0008: модули системы рендер НЕ выполняют — инициализируют готовую
 * каноническую разметку, например ui-tabs из README компонента).
 *
 * Именование: data-ui-<имя>-data — единый паттерн с data-ui-tabs-data
 * (ui-tabs README, 02-architecture §6.3). Значение — имя компонента
 * (или роль данных), гейт /^[a-z][a-z0-9-]*$/i (латиница/цифры/дефис,
 * враждебное или пустое → 'invalid': имя попадает в позицию ИМЕНИ атрибута —
 * см. докблок irao_ui_json_script); парсер сайта ищет
 * script[data-ui-<имя>-data].
 *
 * БЕЗОПАСНОСТЬ (XSS — часть контракта): данные инфоблока могут содержать
 * пользовательский ввод. Внутри <script> HTML-экранирование не работает —
 * вектор атаки, это преждевременное закрытие тега </script><script>…
 * json_encode с JSON_HEX_TAG превращает < и > в \u003C/\u003E — валидный
 * JSON (JSON.parse читает) и нечитаемый HTML-тег. Флаги вы НЕ убираете:
 * JSON_HEX_TAG (XSS), JSON_UNESCAPED_UNICODE (русские тексты читаемы),
 * HEX_AMP/APOS/QUOT (защита от вылезания из строки в контексте атрибутов).
 * Разметку из этих данных сайт рендерит через htmlspecialchars — как любой
 * пользовательский вывод Bitrix.
 */

if (!function_exists('irao_ui_json_script')) {
    /**
     * JSON-данные для JS в разметке страницы.
     *
     * @param mixed  $data любые данные (массив/скаляр) — после json_encode
     *                      попадают в <script type="application/json">;
     * @param string $name имя данных: атрибут станет data-ui-{$name}-data
     *                      (например 'tabs' → data-ui-tabs-data). Имя
     *                      валидируется гейтом /^[a-z][a-z0-9-]*$/i —
     *                      латиница/цифры/дефис; враждебное (и пустое) имя
     *                      подменяется на 'invalid'. ВАЖНО: $name попадает
     *                      в позицию ИМЕНИ атрибута (без кавычек) —
     *                      htmlspecialchars здесь не защита (пробел и '='
     *                      он не экранирует: 'x src=//evil.tld/a.js' собрал бы
     *                      второй атрибут src=), защиту даёт только гейт;
     * @param string $id   необязательный id тега (если парсер ищет по id)
     * @return string HTML <script type="application/json">…</script>
     */
    function irao_ui_json_script($data, $name, $id = '')
    {
        // Гейт имени (см. @param $name): контекст — имя атрибута, экранирование
        // не работает, работает валидация. htmlspecialchars ниже — страховка
        // в глубину (для гейтованного имени — тождественна).
        if (!preg_match('/^[a-z][a-z0-9-]*$/i', (string) $name)) {
            $name = 'invalid';
        }
        $attr = sprintf('data-ui-%s-data', htmlspecialchars((string) $name, ENT_QUOTES, 'UTF-8'));
        $idAttr = $id !== ''
            ? sprintf(' id="%s"', htmlspecialchars((string) $id, ENT_QUOTES, 'UTF-8'))
            : '';
        $json = json_encode(
            $data,
            JSON_UNESCAPED_UNICODE
                | JSON_HEX_TAG
                | JSON_HEX_AMP
                | JSON_HEX_APOS
                | JSON_HEX_QUOT
        );
        // json_encode возвращает false на не-UTF-8/рекурсии — деградация без
        // 500-й страницы: 'null' — валидный JSON, парсер сайта читает и
        // обрабатывает отсутствие данных своими силами.
        $json = $json === false ? 'null' : $json;

        return '<script type="application/json" ' . $attr . $idAttr . '>' . "\n"
            . $json . "\n"
            . '</script>';
    }
}

/**
 * Использование в шаблоне Bitrix-компонента (копипаст-готово).
 *
 *   <?php // template.php компонента списка: данные инфоблока — в разметку ?>
 *   <?= irao_ui_json_script($tabsFromIblock, 'tabs') ?>
 *   <div class="ui-tabs" data-ui-tabs id="track-tabs"></div>
 *   <script>
 *     // сайт рендерит каноническую разметку из данных (модуль рендер НЕ
 *     // выполняет — ui-tabs README), затем инициализирует модуль:
 *     var dataScript = document.querySelector('script[data-ui-tabs-data]');
 *     var tracks = JSON.parse(dataScript.textContent);
 *     /* …рендер разметки вкладок сайта… * /
 *     IraoUI.tabs.init();
 *   </script>
 *
 * Проверка данных без риска: contentScript пустой/битый JSON — JSON.parse
 * кинет исключение в консоль страницы, разметка системы останется рабочей
 * (деградация без JS-ошибок модулей — модуль инициализирует готовую
 * разметку и без данных).
 *
 * @see components/ui-tabs/README.md — прецедент паттерна (data-ui-tabs-data)
 * @see docs/02-architecture.md §6.3 — данные для JS-компонентов
 * @see bitrix/snippets/form-error-render.php — пример безопасного вывода пользовательских строк
 */

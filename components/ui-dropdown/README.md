# ui-dropdown

Выпадающее меню двух назначений — **навигация** (ссылки) и **действия**
(команды) — по паттерну [APG menu-button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/):
клавиатурный цикл, вне-клик, Escape с возвратом фокуса, деградация без JS.
Задача T6.1, первый интерактивный компонент после MVP. Источник поведения —
`header.js` career-portal (класс B): toggle с aria-expanded, закрытие по
внешнему клику и Escape (с возвратом фокуса на триггер), aria-current по URL.
Система обобщает перенос на N инстансов и два сценария.

## API

| Что | Значение |
|---|---|
| Блок | `.ui-dropdown` — обёртка, позиционный контекст меню (`position: relative`) |
| Элемент `.ui-dropdown__trigger` | `<button type="button">` — триггер; модуль ставит `aria-expanded`/`aria-controls` |
| Элемент `.ui-dropdown__menu` | меню: `<nav>` (навигация) **или** `role="menu"` (действия); видимость — атрибут `hidden`, ставит модуль |
| Элемент `.ui-dropdown__list` | `<ul>` внутри nav-меню (сброс отступов) |
| Элемент `.ui-dropdown__item` | пункт: `<a>` (навигация) или `<button type="button" role="menuitem">` (действия) |
| Элемент `.ui-dropdown__icon` | декоративный шеврон: `aria-hidden="true"`, `currentColor`, `1em`; разворот в состоянии `is-open` |
| Состояние `.is-open` | на блоке, только в цепочке (`.ui-dropdown.is-open`) — ставит модуль |
| JS | `IraoUI.dropdown`: `init()`, `selector`, `closeAll()`; хук разметки — `data-ui-dropdown` |
| События | `irao-ui:dropdown-open` / `irao-ui:dropdown-close` на корне (`bubbles: true`) |
| Токены | `--ui-z-dropdown` (лестница T2.2), `--ui-color-{surface, surface-muted, border-muted, primary, text}`, `--ui-shadow-lg`, `--ui-radius-sm`, `--ui-border-width`, `--ui-space-2/3/8`, focus-тройка ADR-0001, `--ui-transition{-fast}` |

```html
<!-- Назначение 1: навигация — nav > ul > li > a, БЕЗ role="menu" -->
<div class="ui-dropdown" data-ui-dropdown>
  <button class="ui-dropdown__trigger" type="button" id="ui-sections-trigger">
    Разделы
    <svg class="ui-dropdown__icon" aria-hidden="true" focusable="false" width="16" height="16"
         viewBox="0 0 16 16"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor"
         stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>
  </button>
  <nav class="ui-dropdown__menu" id="ui-sections-menu" aria-label="Разделы">
    <ul class="ui-dropdown__list">
      <li><a class="ui-dropdown__item" href="/practices/" aria-current="page">Практики</a></li>
      <li><a class="ui-dropdown__item" href="/vacancies/">Вакансии</a></li>
    </ul>
  </nav>
</div>

<!-- Назначение 2: действия — role="menu" + role="menuitem" -->
<div class="ui-dropdown" data-ui-dropdown>
  <button class="ui-dropdown__trigger" type="button" id="ui-actions-trigger">Действия</button>
  <div class="ui-dropdown__menu" id="ui-actions-menu" role="menu" aria-label="Действия с записью">
    <button class="ui-dropdown__item" type="button" role="menuitem">Редактировать</button>
    <button class="ui-dropdown__item" type="button" role="menuitem">Удалить</button>
  </div>
</div>
```

## Деградация без JS

В разметке **нет** `hidden` на меню и **нет** `aria-expanded`/`aria-controls`
на триггерах — меню всегда раскрыто, всё содержимое доступно, атрибуты не лгут.
Их ставит модуль при инициализации (тот же приём, что `novalidate` в ui-form,
T5.5): закрытое состояние появляется только вместе с умением открывать.
Триггер без JS — обычная кнопка: у навигационного сценария содержимое и так
видно, у действий-сценария команды должны дублироваться видимыми кнопками
страницы (см. don't ниже).

## Клавиатура — чек-лист APG menu-button (проверено e2e)

| Действие | Поведение |
|---|---|
| Клик по триггеру | toggle; фокус остаётся на триггере (pointer-сценарий) |
| `Enter` / `Space` на триггере | открыть, фокус на первый пункт (APG) |
| `ArrowDown` на триггере | открыть, фокус на первый пункт; если открыто — в меню |
| `ArrowUp` на триггере | открыть, фокус на последний пункт |
| `Escape` | закрыть, **фокус на триггер** (возврат, APG; слушатель документа — работает и при фокусе вне инстанса, перенос career-portal) |
| `Tab` / `Shift+Tab` | закрыть меню, фокус уходит по естественному порядку (решение APG; пункты скрыты `hidden` и пропускаются) |
| `ArrowDown` / `ArrowUp` в меню | перемещение по пунктам **с зацикливанием** |
| `Home` / `End` в меню | первый / последний пункт |
| Клик вне меню и триггера | закрыть (career-portal) |
| Открытие одного меню | закрывает другие (N инстансов, `closeAll` career-portal) |
| Активация `role="menuitem"` | выполнить команду, закрыть меню, фокус на триггер (APG: кто открыл — тот получает фокус обратно) |

## A11y

- `aria-expanded`/`aria-controls` на триггере — ставит модуль, синхронны
  состоянию; `aria-controls` ведёт на id меню (id генерируется при отсутствии).
- **Menu-роль только для командных меню**: `role="menu"` + `role="menuitem"` —
  для команд над объектом (скринридер объявляет «меню» и ожидает командную
  клавиатуру APG). Навигация — `nav > ul > li > a` без menu-роли: ссылки
  остаются ссылками в списке ссылок скринридера. Смешивать нельзя.
- Escape возвращает фокус на триггер; активация menuitem — тоже (правило
  системы: кто открыл — тот получает фокус обратно).
- Видимый фокус рисует глобальная политика `base/focus.css` (ADR-0001) —
  компонент outline не гасит и не заменяет; плюс подсветка пункта поверхностью
  (как hover/aria-current).
- `prefers-reduced-motion`: вход-анимация меню отключена (поверхностный
  kill-switch `base/reset` гасит и переходы).
- Контраст пар «подпись primary / поверхность», «подпись / surface-muted» —
  гейт T2.3; e2e axe чист на закрытом и открытых состояниях.

## Aria-current по URL (хелпер)

Перенос career-portal (`header.js`): текущая страница помечается
`aria-current="page"` — пункт подсвечивается CSS-ом компонента. На статике
проставьте атрибут в шаблоне; для клиентских шаблонов — хелпер:

```js
/**
 * Пометить текущую страницу в навигационном меню (перенос header.js
 * career-portal). Сравнение — по pathname; хвостовые «/» нормализуются.
 * @param {Element} menu меню (.ui-dropdown__menu или любой контейнер ссылок)
 */
function markCurrentPage(menu) {
  var current = window.location.pathname.replace(/\/+$/, '') || '/';
  var links = menu.querySelectorAll('a[href]');
  for (var i = 0; i < links.length; i += 1) {
    var target = new URL(links[i].href, window.location.href);
    var path = target.pathname.replace(/\/+$/, '') || '/';
    if (path === current) {
      links[i].setAttribute('aria-current', 'page');
    }
  }
}
```

## Позиционирование

Меню — `position: absolute` от обёртки (`top: calc(100% + 1.125rem)`,
`left: 0`), ширина `min(19.5rem, 100vw − --ui-space-8)` (312px одобренного
дизайна с мобильным клампом career-portal). **Коллизия с краем вьюпорта
компонентом не решается** — сайт делает это модификатором на своей стороне,
например выравнивание по правому краю триггера:

```css
/* сайт: меню у правого края шапки */
.my-header .ui-dropdown__menu {
  left: auto;
  right: 0;
}
```

Тот же приём — для подъёма меню вверх («drop-up») в подвале страницы. z-index
меню — токен лестницы T2.2 `--ui-z-dropdown: 70` (под sticky/header/overlay).

## Do / Don't

- **Do**: навигация — `<nav>` + ссылки; действия над объектом (строка таблицы,
  карточка) — `role="menu"` + `<button role="menuitem">`.
- **Do**: стилизовать триггер под кнопку сайта — поставьте на него классы
  `ui-button` (`<button class="ui-dropdown__trigger ui-button ui-button--light" …>`):
  компонент задаёт только сброс и подпись primary, конфликта нет.
- **Don't**: `role="menu"` для навигации по сайту — скринридер потребует
  командную клавиатуру и скроет ссылки из списка ссылок.
- **Don't**: hover-открытие — только клик/клавиатура (доступнее и проще,
  Out of scope спеки); touch-устройства не имеют hover.
- **Don't**: класть `hidden` в разметку вручную — его ставит/снимает модуль;
  статичный `hidden` убивает деградацию без JS.
- **Don't**: action-меню без дублей на странице — команды из `role="menu"`
  без JS недоступны, если нигде больше не повторены.

## Bitrix (шаблоны)

Разметка копируется в `template.php` компонента меню или в include-файл;
`data-ui-dropdown` — хук модуля (он уже в `ui.min.js`). id меню и триггеров
уникальны на странице; для нескольких инстансов достаточно разметки — модуль
инициализирует все и держит «одно открытое». Серверная простановка
`aria-current="page"` — в шаблоне меню (сравнение с `$APPLICATION->GetCurPage()`),
JS-хелпер выше — для клиентских сценариев.

## Известные границы

- Подменю второго уровня не поддерживаются (Out of scope — APG submenu по
  потребности); стрелки влево/вправо в меню не обрабатываются.
- Комбинобокс с вводом текста — не этот компонент (нет требований);
  кастомный select — отдельный паттерн T7.3 (переиспользует вне-клик/Escape).
- Тест typeahead по первым буквам (APG menu) не реализован — по потребности.
- Высота меню не ограничена: длинные списки — зона ответственности сайта
  (`max-height` + `overflow: auto` модификатором); пункты вне видимой области
  при стрелочной навигации в этом случае скроллит браузер.

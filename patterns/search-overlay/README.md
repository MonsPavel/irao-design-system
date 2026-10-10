# Паттерн «Search overlay» (T7.6)

Полноэкранный поиск сайта на базе **ui-modal** (T7.2, дока:
[ui-modal](../../components/ui-modal/README.md)) — эталонная сборка
[`search-overlay.html`](search-overlay.html), она же стенд
`/showcase/dist/stands/patterns/search-overlay.html` (генерируется
`showcase/build.mjs`). Переносится композиция `src/blocks/search-screen`
career-portal (полноэкранная строка поиска), но с полной диалоговой
семантикой: в career-portal оверлей был `<div hidden>` без роли диалога —
класс B аудита, пробел закрывает нативный `<dialog>` + модуль ui-modal
(ADR-0011).

Собирается **без нового CSS системы**: только компоненты (`ui-modal`,
`ui-field`, `ui-button`) и связки `sop-*` — зона сайта (в бою —
`template_styles.css`; на стенде — `<style>` рядом, не в `dist`).

## Состав

| Блок | Компоненты | Примечания |
|---|---|---|
| Триггер | ссылка `ui-button ui-button--outline` + `data-ui-modal-target` | без JS срабатывает `href` на страницу результатов, с JS модуль откроет диалог |
| Диалог | `ui-modal--full` (T7.2) | `open` в разметке — деградация без JS; `__close` — первый элемент панели |
| Заголовок | `.ui-modal__title` + роль `ui-h3` | цель `aria-labelledby` диалога |
| Форма поиска | `ui-field` + `ui-button`, `role="search"` | нативный GET: без JS — переход на `/search/?q=…` |

## Разметка

Копируйте блоки из [`search-overlay.html`](search-overlay.html) (он же —
живой стенд). Ключевые решения:

### Диалог: ui-modal--full, всё диалоговое поведение даёт T7.2

```html
<dialog class="ui-modal ui-modal--full" id="sop-dialog" open data-ui-modal aria-labelledby="sop-title">
  <button class="ui-modal__close" type="button" aria-label="Закрыть">…</button>
  <h2 class="ui-modal__title ui-h3" id="sop-title">Поиск по сайту</h2>
  <div class="ui-modal__body">…форма…</div>
</dialog>
```

- `--full` — весь вьюпорт (100vw × 100dvh) — полноэкранный поиск, как
  `search-screen` career-portal.
- `open` в разметке — деградация без JS (К9 ADR-0011): контент доступен
  инлайн; модуль снимает атрибут при инициализации и управляет показом сам.
- Trap/Escape/инертность фона/restore — платформа (`showModal()`) + модуль;
  `aria-modal` и роль `dialog` — нативные свойства, ARIA не дублируется.
- Разметку диалога держите **перед `</body>`** (README ui-modal, Bitrix) —
  топ-лейвер делает позицию в DOM неважной, так чище.

### Форма: нативный GET, роль search

```html
<form class="sop-form" action="/search/" method="get" role="search">
  <div class="ui-field">
    <label class="ui-field__label" for="sop-query">Поисковый запрос</label>
    <input class="ui-field__input" type="search" id="sop-query" name="q" autocomplete="off">
  </div>
  <button class="ui-button ui-button--primary" type="submit">Найти</button>
</form>
```

- **Без JS** форма отправляется нативно — переход на `/search/?q=…`
  (Implementation requirements п.2 спеки: «форма поиска — нативный GET
  (без JS работает как переход)»); AJAX-поиск — зона сайта (Out of scope).
- `role="search"` — лендмарка поиска (правила ленмарк, AC).
- `label[for]` обязателен; `placeholder` — пример запроса, не подпись
  (политика README `ui-field`).
- `action` в бою — URL страницы результатов вашего сайта; параметр `q`
  передаёт `bitrix:search.page` (см. Bitrix-заметки).

### Фокус в поле при открытии: событие модуля

Модуль ui-modal даёт первый фокус закрывающей кнопке (перенос career-portal
`closeButton.focus`). Для поискового оверлея сайт переносит фокус в поле —
одним сниппетом рядом с диалогом, по событию `irao-ui:modal-open`
(README ui-modal, «События»):

```js
document.getElementById('sop-dialog').addEventListener('irao-ui:modal-open', function () {
  document.getElementById('sop-query').focus();
});
```

### Триггер: ссылка, не кнопка

```html
<a class="ui-button ui-button--outline" href="/search/" data-ui-modal-target="sop-dialog">Поиск по сайту</a>
```

Без JS ссылка ведёт на страницу результатов — поиск доступен (правило доки
«контент доступен отдельной страницей»); с JS модуль снимает переход и
открывает диалог. В шапке триггер — из паттерна [header](../header/README.md).

## A11y — диалог-чек (как T7.2, AC)

| Действие | Поведение | Кто даёт |
|---|---|---|
| Клик / `Enter` по триггеру | диалог открыт, фокус **в поле поиска** (сниппет выше поверх первого фокуса `__close`) | модуль + сниппет |
| `Tab` / `Shift+Tab` | цикл внутри диалога, фон недостижим | top-layer (К1 ADR-0011) |
| `Escape` | закрытие, фокус на триггер | модуль (cancel → анимированный close, restore) |
| Роль/модальность | `role="dialog"`, `aria-modal="true"` при `showModal()` | платформа, ARIA не дублируется |
| Повторные циклы | без остаточного `is-closing`/скролл-лока (регресс design-qa) | модуль T7.2 |

e2e-чек — `tests/e2e/pattern-search-overlay.spec.js` (поверх стенда).

## Bitrix-заметки (AC)

- Разметка диалога — в include-файле или прямо в `footer.php` шаблона
  (перед `</body>`); триггер — в `header.php`. `ui.min.js` инициализирует
  все `data-ui-modal` сам.
- Страница результатов — штатный **`bitrix:search.page`** (комплексный
  компонент): параметр `q` формы приходит в `$_GET["q"]`; шаблон компонента
  стилизуется классами системы, страница подключает тот же `ui-core.min.css`.
- Сниппет фокуса — рядом с диалогом (инлайн `<script>` или в общем js-файле
  сайта). Событие `irao-ui:modal-open/close` — точки интеграции аналитики.
- Связующие стили (`sop-form`) перенесите в `template_styles.css` —
  источник: `<style>` в [`search-overlay.html`](search-overlay.html),
  значения — только токены `--ui-*`.

## Do / Don't

- **Do**: `open` в разметке диалога (деградация); `label[for]`; `role="search"`;
  триггер — ссылка на страницу результатов.
- **Don't**: не прячьте диалог своими классами — скрытие это отсутствие
  `open` (ставит/снимает браузер и модуль); не ставьте `aria-hidden` фону
  (top-layer блокирует сам); не делайте AJAX-подмену результатов в оверлее —
  это зона сайта и отдельное решение.
- **Don't**: не вкладывайте форму с `method="dialog"` — поиск должен
  отправляться на сервер (GET-переход).

## Тесты

- Юнит-пины контракта: `tests/unit/pattern-search-overlay.test.js`.
- Поверхность браузера (полный диалог-чек: open→фокус в поле, trap,
  Escape+restore, aria-modal, повторные циклы; GET без JS; axe; эталоны):
  `tests/e2e/pattern-search-overlay.spec.js`.

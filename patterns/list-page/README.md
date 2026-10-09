# Паттерн «Страница списка» (T8.1)

Референс списковой страницы (вакансии/события/предложения) — перенос композиции
`career-portal` (`src/pages/vacancies.html`, `events.html`,
`education-catalog.html` + блок `vacancy-search`) на компоненты системы.
Эталонная сборка целиком: [`list-page.html`](list-page.html) — она же стенд
`/showcase/dist/stands/patterns/list-page.html` (генерируется
`showcase/build.mjs`).

Собирается **без нового CSS системы**: только компоненты
(`ui-select`, `ui-button`, `ui-card`, `ui-tag`, `ui-empty`, `ui-pagination`)
и layout-примитивы (`ui-section`, `ui-grid--3`). Связующие стили — зона сайта
(в бою — `template_styles.css`; на стенде — `<style>` рядом, не в `dist`).
Если какой-то связке понадобится место в системе — поднимается вопрос о
компоненте (Scope T8.1), а не о расширении паттерна.

## Состав

| Блок | Компоненты | Примечания |
|---|---|---|
| page-head | h1 (`ui-h1`) + счётчик + lead (`ui-lead`) | счётчик — `aria-live="polite"`; h1 — цель фокуса (`tabindex="-1"`) |
| Панель фильтров | `select` в пилюлях + `ui-button` | GET-форма: без JS — кнопкой «Применить»; с JS — `IraoUI.select` (wrap-режим), UX тот же |
| Выдача | `ui-grid--3` + `ui-card--hover ui-card--link` + `ui-tag` | карточка-ссылка T4.4, теги T4.3 |
| Пагинация | `ui-pagination` | T6.3; сохраняет GET-параметры фильтров |
| Empty-ветка | `ui-empty` | заголовок-роль h2; сброс — ссылка на чистый URL |

## Разметка

Копируйте блоки из [`list-page.html`](list-page.html) (он же — живой стенд).
Ключевые решения:

### page-head: счётчик — живая область

```html
<h1 class="ui-h1" id="page-title" tabindex="-1">Вакансии</h1>
<p class="ui-small ui-text--muted" aria-live="polite">Найдено: 6 вакансий</p>
<p class="ui-lead">Открытые вакансии компаний Группы «Интер РАО»…</p>
```

`aria-live="polite"` — обновлённое число объявляется скринридеру
(Technical considerations T8.1). `tabindex="-1"` на h1 — цель фокуса после
применения фильтра.

### Панель фильтров: GET-форма, select-пилюли

```html
<form class="lpp-filters" method="get" action="/vacancies/" aria-label="Фильтры вакансий">
  <label class="lpp-pill__name" for="f-city">Город</label>
  <div class="lpp-pill">
    <select id="f-city" name="city" data-ui-select="wrap">
      <option value="" selected>Любой город</option>
      <option value="msk">Москва</option>
    </select>
  </div>
  <button class="ui-button ui-button--primary" type="submit">Применить</button>
  <button class="ui-button ui-button--outline" type="reset">Сбросить</button>
</form>
```

- **Без JS** форма отправляется кнопкой «Применить» (нативный GET), select
  нативный — фильтрация работает (Implementation requirements п.2). AJAX —
  зона сайта (Out of scope): паттерн работает перезагрузкой.
- **С JS** модуль `IraoUI.select` строит listbox поверх нативного select
  (выбор диспатчит `change`) — UX тот же. Хук — `data-ui-select="wrap"`:
  обёртку-«пилюлю» и её геометрию рисует сайт (замена хака
  `.vacancy-search__select-wrap` career-portal).
- Подпись поля — `label[for]` **рядом** с пилюлей: имя получают и нативный
  select, и триггер (пара APG listbox-button). Внутри обёртки — только
  `select`: построенный триггер накрывает обёртку `inset: 0` целиком.
- `type="reset"` очищает контролы нативно (без JS). Граница: нативный
  `form.reset()` не диспатчит `change` — подпись триггера обновится после
  перезагрузки (уйдёт пустое значение — корректное); если нужен немедленный
  сброс вида — используйте ссылку на чистый URL (как в empty-ветке).
- `action` на стенде — `#lpp-title` (якорь результатов: после сабмита статика
  открывает страницу на выдаче); в бою — URL страницы списка. Якорь в `action`
  легален и в бою — как no-JS-скролл к результатам.

### Выдача и пагинация

```html
<div class="ui-grid ui-grid--3">
  <article class="ui-card ui-card--hover ui-card--link">
    <p><span class="ui-tag ui-tag--blue">Электроэнергетика</span>…</p>
    <h2 class="ui-h3 ui-card__title"><a class="ui-card__link" href="/vacancy/123/">…</a></h2>
    <p class="ui-body ui-card__body">Короткое описание…</p>
    <div class="ui-card__footer"><button class="ui-button ui-button--outline" type="button">Откликнуться</button></div>
  </article>
</div>
<nav class="ui-pagination" aria-label="Пагинация: вакансии">…</nav>
```

Заголовок карточки — `h2` по семантике страницы (h1 → h2 без пропусков, иначе
нарушение гейта `irao/heading-order`); **уровень тега определяет контекст
страницы, роль `ui-h3` — вид** («классы, а не теги», T3.3) — канон `ui-card`
не задаёт уровень тега.

Ссылки страниц пагинации **сохраняют применённые GET-параметры фильтров**
(`?city=msk&page=2`), иначе смена страницы сбрасывает фильтр.

### Empty-ветка: ui-empty со сбросом

```html
<p class="ui-small ui-text--muted" aria-live="polite">Найдено: 0 вакансий</p>
<div class="ui-empty">
  <h2 class="ui-empty__title ui-h3">Вакансии не найдены</h2>
  <p class="ui-empty__text ui-body ui-text--muted">Под выбранные фильтры ничего не подошло…</p>
  <div class="ui-empty__actions">
    <a class="ui-button ui-button--outline" href="/vacancies/">Сбросить фильтры</a>
  </div>
</div>
```

Заголовок состояния — h2 (у страницы уже есть h1 — правило T4.8). Кнопка
сброса — **ссылка** на страницу списка без GET-параметров: переход работает
без JS (Implementation requirements п.3); `type="reset"` формы очищает только
клиентские контролы и пустую выдачу не возвращает.

## A11y

- **Порядок чтения: фильтры → список** — форма в DOM раньше выдачи
  (Accessibility requirements T8.1).
- **Фокус после применения фильтра** — на заголовок результатов: скринридер
  объявляет заголовок и следующие за ним счётчик/выдачу, клавиатура продолжает
  с результатов. Сервер ставит сниппет только когда фильтр реально применён:

  ```php
  <?php // Гвард — по всем фильтрам формы (city/direction/experience),
     // синхронно со сниппетом канона list-page.html. ?>
  <?php if (!empty($_GET['city']) || !empty($_GET['direction']) || !empty($_GET['experience'])): ?>
    <script>document.getElementById('page-title').focus();</script>
  <?php endif; ?>
  ```

- Счётчик результатов — `aria-live="polite"` (сниппет выше).
- Пагинация — `aria-current="page"` на текущей, стрелки-`button[disabled]` на
  краях (T6.3).

## Bitrix-заметки (AC: news.list / GET / $nav)

Список = `bitrix:news.list` (или `bitrix:news.line` под задачи). Эскиз
`template.php`:

```php
<?php
// GET-параметры фильтров — только через экранирование; фильтрация ИБ —
// в result_modifier.php / кастомном компоненте: arFilter по $_GET.
$sCity = isset($_GET['city']) ? htmlspecialcharsbx((string)$_GET['city']) : '';
$sDirection = isset($_GET['direction']) ? htmlspecialcharsbx((string)$_GET['direction']) : '';
$sExperience = isset($_GET['experience']) ? htmlspecialcharsbx((string)$_GET['experience']) : '';
$iCount = count($arResult['ITEMS']);
?>
<h1 class="ui-h1" id="page-title" tabindex="-1">Вакансии</h1>
<p class="ui-small ui-text--muted" aria-live="polite">Найдено: <?= $iCount ?> вакансий</p>

<form class="lpp-filters" method="get" action="<?= $APPLICATION->GetCurPage() ?>" aria-label="Фильтры вакансий">
  <!-- select-пилюли: name = ключ GET-параметра (city/direction/…);
       data-ui-select="wrap" — хук модуля (он уже в ui.min.js). -->
  <button class="ui-button ui-button--primary" type="submit">Применить</button>
</form>

<?php if (!empty($arResult['ITEMS'])): ?>
  <div class="ui-grid ui-grid--3">
    <?php foreach ($arResult['ITEMS'] as $item): ?>
      <article class="ui-card ui-card--hover ui-card--link">
        <!-- теги из свойств ИБ, заголовок-ссылка NAME → DETAIL_PAGE_URL -->
      </article>
    <?php endforeach; ?>
  </div>
  <?php // Пагинация — штатный $nav компонента: NAV_STRING учитывает текущий
     // GET-запрос (параметры фильтров сохраняются в ссылках страниц);
     // у кастомной пагинации собирайте параметры самостоятельно —
     // см. bitrix/snippets/pagination.php. ?>
  <?= $arResult['NAV_STRING'] ?>
<?php else: ?>
  <!-- empty-ветка: ui-empty со сбросом-ссылкой на чистый URL -->
<?php endif; ?>

<?php // Фокус на заголовок результатов — когда применён любой из фильтров
   // формы (все три, как в сниппете канона list-page.html и в A11y выше). ?>
<?php if ($sCity !== '' || $sDirection !== '' || $sExperience !== ''): ?>
  <script>document.getElementById('page-title').focus();</script>
<?php endif; ?>
```

- Шаблон компонента правит интегратор — паттерн задаёт **разметку цикла**,
  а не код компонента; значения опций select — из справочников ИБ
  (JSON-паттерн 02-architecture §6.3).
- Динамически вставленная разметка (AJAX-подмена выдачи — зона сайта) требует
  повторного `IraoUI.select.init()` — README `ui-select`, Bitrix-раздел.
- Связующие стили (`.lpp-filters`, `.lpp-pill`, `.lpp-pill__name`, отступы
  page-head) перенесите в `template_styles.css` сайта — источник: `<style>`
  в [`list-page.html`](list-page.html), значения — только токены `--ui-*`.

## Do / Don't

- **Do**: одна GET-форма на страницу; все фильтры — её контролы; сабмит —
  «Применить»; сброс формы — `type="reset"`, сброс выдачи — ссылка на чистый
  URL.
- **Do**: `name` обязателен у каждого select (иначе форма не отправит
  значение без JS) — README `ui-select`.
- **Don't**: не прячьте нативный select в разметке (скрытие — работа модуля);
  не кладите `.ui-select__native`/`tabindex="-1"` руками.
- **Don't**: не оборачивайте select в `ui-field__select-wrap` — пилюля рисует
  обёртку сама (`.lpp-pill`), стрелка — шеврон триггера.
- **Don't**: не делайте фильтры-чипы ссылками-«пилюлями» с JS-переключением —
  это либо ссылки с полным набором параметров (без JS), либо select'ы формы.

## Тесты

- Юнит-пины контракта: `tests/unit/pattern-list-page.test.js`.
- Поверхность браузера (GET-цикл с JS/без, empty-ветка со сбросом, фокус,
  axe, иерархия h1→h2, эталоны): `tests/e2e/pattern-list-page.spec.js`.

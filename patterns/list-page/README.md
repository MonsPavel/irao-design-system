# Паттерн «Страница списка» (T8.1 + T14.10)

Референс списковой страницы (вакансии/события/предложения) — перенос композиции
`career-portal` (`src/pages/vacancies.html`, `events.html`,
`education-catalog.html` + блок `vacancy-search`) на компоненты системы.
Эталонная сборка целиком: [`list-page.html`](list-page.html) — она же стенд
`/showcase/dist/stands/patterns/list-page.html` (генерируется
`showcase/build.mjs`). Ветки стенда: «с данными» (сетка карточек), «ничего не
найдено», плюс ветки T14.10 — «строки» и «сайдбар фильтров» (раскладки
оригинала, REPORT §4 / PLAN P1-3/P1-4) и поднавигация разделов (T17.11).

Собирается **без нового CSS системы**: только компоненты
(`ui-breadcrumbs`, `ui-select`, `ui-button`, `ui-card`, `ui-tag`, `ui-empty`,
`ui-pagination`, `ui-radio-group`, `ui-checkbox`, `ui-chip`, `ui-modal`)
и layout-примитивы (`ui-section`, `ui-grid--3`). Связки `lpp-*` — в
паттерн-слое (T17.1, вариант A): [`patterns.css`](../patterns.css) →
опциональный `dist/ui-patterns.css`; в бою возможен и собственный CSS
сайт-зоны (`template_styles.css`). Если какой-то связке понадобится место
в системе — поднимается вопрос о компоненте (Scope T8.1), а не о расширении
паттерна.

## Состав

| Блок | Компоненты | Примечания |
|---|---|---|
| Крошки | `ui-breadcrumbs` | T4.7; текущая страница («Вакансии») — `span` + `aria-current="page"`; вертикальный ритм — обвязка `lpp-breadcrumbs` (T14.5, ниже) |
| page-head | h1 (`ui-page-title`) + счётчик + lead (`ui-lead`) | счётчик — `aria-live="polite"`; h1 — цель фокуса (`tabindex="-1"`) |
| Панель фильтров | `select` в пилюлях + `ui-button` | GET-форма: без JS — кнопкой «Применить»; с JS — `IraoUI.select` (wrap-режим), UX тот же |
| Выдача | `ui-grid--3` + `ui-card--hover ui-card--link` + `ui-tag` | карточка-ссылка T4.4, теги T4.3; вариант «строками» — ниже (T14.10) |
| Выдача строками (T14.10) | `ui-card--hover` + связка `lpp-row` + CTA `ui-button--pill` (T14.4) | заголовок выдачи — h2, строки — article с h3-ссылкой; демо-модалка отклика — `ui-modal` |
| Сайдбар фильтров (T14.10) | select-пилюли, `ui-radio-group`, `ui-checkbox`, `ui-button`, промо `ui-card--filled`, чипы `ui-chip` (T14.8) | grid «aside \| выдача»; aside sticky от md + scrollable-focusable |
| Поднавигация разделов (T17.11) | `ui-tabs--pill` + связка `nvp` | межстраничные ссылки без панелей: `data-ui-tabs` не ставится (контракт T13.6), активный раздел — `aria-current="page"` (активную пилюлю красит модификатор, покой + hover); раскладка — связки `nvp` паттерн-слоя: маргины 24/48, сетка 5×1fr от md (мобильная база — перенос ленты) |
| Пагинация | `ui-pagination` | T6.3; сохраняет GET-параметры фильтров |
| Empty-ветка | `ui-empty` | заголовок-роль h2; сброс — ссылка на чистый URL |

## Разметка

Копируйте блоки из [`list-page.html`](list-page.html) (он же — живой стенд).
Ключевые решения:

### Крошки: вертикальный ритм несёт шаблон (T14.5)

Компонент `ui-breadcrumbs` внешних отступов не имеет (инвариант T4.7) — без
обвязки крошки стоят плоско и контент «прилипает» к шапке. Правило: **крошки
без обвязки — над контентом; вертикальный ритм страницы несёт шаблон**.
Обвязка — связка сайта (`lpp-*`) с `padding-block` 20/24px — полоса 62px
одобренного дизайна (career-portal `components.css:14`, `padding: 20px 0 24px`;
верх 20px вне шкалы отступов §3.2 — перенос «как есть»):

```html
<nav class="ui-breadcrumbs lpp-breadcrumbs" aria-label="Хлебные крошки">
  <ol class="ui-breadcrumbs__list" role="list" itemscope itemtype="https://schema.org/BreadcrumbList">
    <li class="ui-breadcrumbs__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <a class="ui-breadcrumbs__link" itemprop="item" href="/"><span itemprop="name">Главная</span></a>
      <meta itemprop="position" content="1" />
    </li>
    <li class="ui-breadcrumbs__item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <span class="ui-breadcrumbs__current" itemprop="name" aria-current="page">Вакансии</span>
      <meta itemprop="position" content="2" />
    </li>
  </ol>
</nav>
```

```css
.lpp-breadcrumbs {
  box-sizing: border-box;
  padding-block: 1.25rem var(--ui-space-5); /* 20/24px — полоса 62px career-portal */
}
```

Крошки — в DOM раньше page-head (конвенция page-паттернов T8.2); цепочка той
же страницы на других шаблонах та же (детальная T8.2, форма отклика T8.3).

### page-head: счётчик — живая область

```html
<h1 class="ui-page-title" id="page-title" tabindex="-1">Вакансии</h1>
<p class="ui-small ui-text--muted" aria-live="polite">Найдено: 6 вакансий</p>
<p class="ui-lead">Открытые вакансии компаний Группы «Интер РАО»…</p>
```

`aria-live="polite"` — обновлённое число объявляется скринридеру
(Technical considerations T8.1). `tabindex="-1"` на h1 — цель фокуса после
применения фильтра. Роль h1 — `ui-page-title` (T14.2): шкала h2 при теге h1,
как `.page-title` career-portal.

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
нарушение гейта `irao/heading-order`); канон `ui-card` показывает разметку
вне контекста страницы — **уровень тега задаёт страница, роль `ui-h3` — вид**
(«классы, а не теги», T3.3).

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

## Ветки раскладок: строки и сайдбар фильтров (T14.10)

Оригинал собирает список вакансий **строками** (`.vac-row`, build.py
`render_vacancy_card`) с фильтрами в **сайдбаре** (`.vac-side`) — базовые ветки
паттерна знают только сетку и горизонтальные пилюли. Стенд держит обе пары
рядом — выбор раскладки делает страница, а не система.

### Когда строки vs сетка

| | Строки (T14.10) | Сетка карточек (базовая ветка) |
|---|---|---|
| Когда | однотипные позиции-«анкеты»: заголовок-ссылка, место, описание, дата, CTA | контентные карточки: теги, медиа, футер-действия |
| Разметка | `article.ui-card--hover` + flex-связка `lpp-row` (зона сайта) | `ui-grid--3` + `ui-card--link` (паттерн T4.4) |
| Кликабельность | только заголовок-ссылка и CTA — две отдельные цели | вся карточка (растянутая ссылка) |

**Ссылки разделов — вне `.ui-tabs__list`** (перенос правила из README
`ui-tabs`, T14.9→сюда по решению владельца 25.10): если над выдачей нужна
поднавигация разделами, ссылки-«разделы» (межстраничные) не смешиваются с
табами `.ui-tabs__list` — таб-список семантически управляет панелями
(ARIA tabs), а переходы на другие страницы в нём ломают паттерн; на стенде
такую поднавигацию несёт отдельный `nav` (см. `cp-subnav` пилота, T16.16).

Сниппет строки (копируется из канона [`list-page.html`](list-page.html),
секция `#lpp-rows`):

```html
<div class="lpp-rows">
  <article class="ui-card ui-card--hover lpp-row">
    <div class="lpp-row__main">
      <h3 class="ui-h4 lpp-row__title"><a href="/vacancy/123/">Название вакансии</a></h3>
      <span class="lpp-row__place ui-small ui-text--muted">Москва · Площадка</span>
      <p class="lpp-row__short ui-small ui-text--muted">Короткое описание…</p>
      <time class="lpp-row__date ui-small ui-text--muted" datetime="2026-09-12">12.09.2026</time>
    </div>
    <a class="ui-button ui-button--pill" href="/vacancy-apply/" data-ui-modal-target="apply-modal">
      <span class="ui-button__label">Откликнуться</span>
      <svg class="ui-button__icon" aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16"><path d="M2 8h11M9 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
  </article>
</div>
```

- **`ui-card--link` на строке НЕ включается**: CTA-пилюля обязана быть вне
  карточки-ссылки — инвариант вложенных интерактивов `ui-card` (README
  `ui-card`: интерактивы — сиблинги растянутой ссылки, не внутри неё).
- **Иерархия заголовков**: заголовок выдачи — `h2`, каждая строка —
  `article` с `h3`-ссылкой (h1 → h2 → h3 без пропусков — гейт
  `irao/heading-order`); вид заголовка — роль `ui-h4` (20px, как
  `.vac-row__title` оригинала) — «классы, а не теги» (T3.3).
- **CTA-пилюля** — `ui-button--pill` (T14.4): `href` на анкету отклика
  работает без JS, с JS `data-ui-modal-target` открывает модалку (модуль
  снимает переход — README `ui-modal`); форма анкеты — паттерн «Страница
  формы» (T8.3). В каноне ветки — минимальная демо-модалка, одна на стенд
  (триггеры строк обеих веток ведут на один диалог).
- Дата — `<time datetime>`: семантика машине, формат — странице.
- Демо-данные канона — правдоподобные вакансии по мотивам моков пилота
  (`pilot/career-portal/data/vacancies.json`), не дословная копия.
- Компонент «строка списка» сознательно не заведён (Out of scope T14.10):
  связка `lpp-*` — в паттерн-слое (T17.1) и/или шаблоне сайта до появления
  второго потребителя.

### Когда сайдбар vs горизонтальные пилюли

| | Сайдбар (T14.10) | Горизонтальные пилюли (базовая ветка) |
|---|---|---|
| Когда | фильтров много (5+) или есть группы: radio, чекбоксы | 2–4 фильтра, влезают в одну строку над выдачей |
| Разметка | grid «aside \| выдача» (связка `lpp-layout`), форма в aside | flex-форма `lpp-filters` |

Сайдбар (сниппет в каноне, секция `#lpp-side`):

- **Лендмарка**: `<aside aria-labelledby>` + видимый заголовок `h2` (имя
  сайдбара для скринридера); в DOM сайдбар **раньше выдачи** — порядок чтения
  «фильтры → результаты» (Accessibility requirements, как в базовой ветке).
- **Sticky от md** (768 — шкала брейкпоинтов T2.5), `top: 24px`; панель выше
  вьюпорта прокручивается внутри себя (`max-height` + `overflow-y: auto`) и
  обязана получать фокус с клавиатуры — `tabindex="0"` (axe
  `scrollable-region-focusable`). На мобильной базе — одна колонка, aside в
  потоке (min-width-деградация).
- **Label у каждого контрола**: select-пилюли — `label[for]` рядом (канон
  `ui-select` wrap, тот же `.lpp-pill`), radio-группа «Опыт» —
  `fieldset`/`legend` (гейт `irao/radio-group-fieldset`), чекбокс доступности
  — `label` оборачивает нативный input.
- **Кнопки**: «Применить» (`type="submit"`) и «Сбросить» (`type="reset"`) —
  форма работает без JS, как в базовой ветке; AJAX — зона сайта.
- **Промо-карточка** после формы — `ui-card--filled` со ссылкой-действием.
- **Чипы направлений над выдачей** — `ui-chip` (T14.8) в ссылочной форме:
  GET-ссылки работают без JS; активная — `aria-current="page"` и ОСТАЁТСЯ
  ссылкой (повторный клик перезапрашивает выдачу).
- **Крошки и page-head — общие для всех веток**: цепочка и вертикальный ритм
  (полоса 62px) не зависят от раскладки выдачи — правило ритма крошек выше,
  раздел «Крошки: вертикальный ритм несёт шаблон (T14.5)».
- **Пагинация** (если есть) — общая: ссылки страниц **сохраняют применённые
  GET-параметры фильтров сайдбара** (`?region=msk&experience=senior&page=2`),
  иначе смена страницы сбрасывает фильтры (правило выше, «Выдача и
  пагинация»).

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
<nav class="ui-breadcrumbs lpp-breadcrumbs" aria-label="Хлебные крошки">
  <?php // цепочка — bitrix:breadcrumb (сниппет bitrix/snippets/breadcrumbs.php):
     // «Главная» — ссылка, текущая страница («Вакансии») — span + aria-current="page". ?>
</nav>
<h1 class="ui-page-title" id="page-title" tabindex="-1">Вакансии</h1>
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
  <?php // Вариант «строками» (T14.10): тот же цикл, другая разметка строки —
     // NAME → h3-ссылка, свойства ИБ → место/описание/дата
     // (<time datetime="…">), CTA — ui-button--pill с URL анкеты отклика
     // (+ data-ui-modal-target, если отклик модалкой; диалог в шаблоне —
     // один на страницу). Итерация цикла:
     // <article class="ui-card ui-card--hover lpp-row">…</article> ?>
  <?php // Пагинация — штатный $nav компонента: NAV_STRING учитывает текущий
     // GET-запрос (параметры фильтров — в том числе сайдбара T14.10 —
     // сохраняются в ссылках страниц); у кастомной пагинации собирайте
     // параметры самостоятельно — см. bitrix/snippets/pagination.php. ?>
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
  axe, иерархия h1→h2, ветки T14.10: состав строки/CTA-модалка, sticky-сайдбар
  с label/legend, чипы до выдачи, no-JS GET и фокус-гвард ветки, эталоны 4
  веток): `tests/e2e/pattern-list-page.spec.js`.

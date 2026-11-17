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
| Обложка страницы (T18.10) | связка `php` / `php--split` / `php-subtitle` / `php-note` + роли `ui-page-title`, `ui-lead`, `ui-body`, `ui-text--muted` | раскладка обёртки 1:1 (`.page-head` career-portal components.css:36–47: шаг 16, низ 40; `--split` — правая колонка «На сайте N вакансий» прижата к низу от md, мобильная база — колонка); раздел стенда — `#lpp-cover` |
| Панель фильтров | `select` в пилюлях + `ui-button` | GET-форма: без JS — кнопкой «Применить»; с JS — `IraoUI.select` (wrap-режим), UX тот же |
| Выдача | `ui-grid--3` + `ui-card--hover ui-card--link` + `ui-tag` | карточка-ссылка T4.4, теги T4.3; вариант «строками» — ниже (T14.10) |
| Выдача строками (T14.10) | `ui-card--hover` + связка `lpp-row` + CTA `ui-button--pill` (T14.4) | заголовок выдачи — h2, строки — article с h3-ссылкой; демо-модалка отклика — `ui-modal` |
| Сайдбар фильтров (T14.10) | select-пилюли, `ui-radio-group`, `ui-checkbox`, `ui-button`, промо `ui-card--filled`, чипы `ui-chip` (T14.8) | grid «aside \| выдача»; aside sticky от md + scrollable-focusable |
| Поднавигация разделов (T17.11) | `ui-tabs--pill` + связка `nvp` | межстраничные ссылки без панелей: `data-ui-tabs` не ставится (контракт T13.6), активный раздел — `aria-current="page"` (активную пилюлю красит модификатор, покой + hover); раскладка — связки `nvp` паттерн-слоя: маргины 24/48, сетка 5×1fr от md (мобильная база — перенос ленты) |
| Строка табов + ссылок (T18.11) | `ui-tabs--pill` + табы `ui-tabs__tab` (tablist, `data-ui-tabs` + панели-подсказки) + связки `tnv`/`tnv__links` | смешанный набор «табы + ссылки разделов» (T18.11): ряд одной полосой от md (мобильная база — перенос, осознанное отклонение — прецедент `nvp`), лента ссылок вне tablist (правило ui-tabs), DS-маргин ленты в ряду погашен; раздел стенда — `#lpp-tabs-row` |
| Панель «Найди свою вакансию» (T18.16) | `ui-page-title` + select-пилюли `ui-select--pill` + `ui-button--accent` + CTA `ui-card--cta--accent--row` + связка `vcs__wrap`/`vcs__panel`/`vcs__fields` | плитка 310px «как есть» (`vacancy-search.css:15–18`), сетка «панель \| CTA-плитка» 2fr 1fr от lg (мобильная база — колонка); стык с лентой `lpp-filters` (шаг 16, ширина пилюли 260px на потомке); раздел стенда — `#lpp-vcs-demo` |
| Тулбар тегов-фильтров (T18.17) | связка `mtb`/`mtb__group`/`mtb__label` + теги `ui-tag--blue × ui-tag--filter` (T16.14), подписи `ui-tag--gray` | лента тегов каталога с шагом 12px «как есть» (`pages.css:594`), подписи групп в центре ленты; группы — named landmark в ленте (`display: contents`); раздел стенда — `#lpp-mtb` |
| Карточка предложения (T18.17) | связка `ofc-card` (`__head`/`__date`/`__meta`/`__company`/`__city`/`__footer`) + роли `ui-h6`/`ui-small` + теги + `ui-button--accent` | колонка шаг 14px «как есть»/паддинг 24 (`pages.css:837`), пара заголовка lh 1.3 без трекинга (`pages.css:841`), мета-колонка шаг 2 с компанией fw-small/primary (`pages.css:849/851`); раздел стенда — `#lpp-offer-card` |
| Карточка организации (T18.17) | связка `org-card`/`org-card__meta` + роли `ui-h6`/`ui-small` + теги `ui-tag` | колонка шаг 12/паддинг 24 «как есть» (`pages.css:829`), пара заголовка lh 1.3 (`pages.css:831`), мета к низу — `margin-top: auto` (`pages.css:835`); раздел стенда — `#lpp-org-card` |
| Пагинация | `ui-pagination` | T6.3; сохраняет GET-параметры фильтров; обёртка «по центру, ритм 48px» — канон `cnv` (T18.17: inline-обёртки оригинала `education-catalog.html:57`/`events.html:357`); раздел стенда — `#lpp-cnv` |
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

### Обложка страницы: связка php (T18.10)

Обложка внутренних страниц — раскладка обёртки «заголовок → подзаголовок» в
паттерн-слое (T18.10, точка расширения list-page/detail-page): шаг 16px и
низ 40px — 1:1 порт `.page-head` career-portal (`components.css:36–41`;
40px вне шкалы отступов §3.2 — перенос «как есть»). Вариант `php--split`
несёт правую колонку «На сайте N вакансий» — **эффективные** значения
оригинала (`pages.css:24–29`, грузится после components.css и выигрывает
каскад): шаг 24px (`pages.css:28`), прижатие к низу строки/правому краю
`align-items: flex-end` на всех ширинах (`pages.css:26` — перебивает
`components.css:46` со своим flex-start); строка — от md
(`components.css:43`, инверсия mobile-first), мобильная база — колонка;
усадку ноты гасит `php-note` (`flex: none` — `pages.css:31`).
Типографика — роли base (слой её не дублирует): заголовок —
`ui-page-title`, подзаголовок — пара `ui-lead` + `ui-text--muted` (цвет
muted слой не переобъявляет), ширина подзаголовка 780px — `php-subtitle`
(`components.css:61`, «как есть»). Обложка лендинга — отдельная сущность
(cover-hero, `cvh`-канон T17.15) — обложкой страниц не является.

```html
<div class="php php--split">
  <div>
    <h1 class="ui-page-title">Вакансии</h1>
    <p class="php-subtitle ui-lead ui-text--muted">
      Открытые вакансии компаний Группы «Интер РАО» — от производственных до офисных направлений.
    </p>
  </div>
  <span class="php-note ui-body ui-text--muted">На сайте 250 вакансий</span>
</div>
```

```css
.php { box-sizing: border-box; display: flex; flex-direction: column; gap: var(--ui-space-4); margin-bottom: 2.5rem; } /* шаг 16 / низ 40 — components.css:39/40 */
.php--split { flex-direction: column; gap: 1.5rem; align-items: flex-end; justify-content: space-between; } /* база: ≤767 колонка — components.css:46; шаг/прижатие — pages.css:26–28 */
@media (min-width: 768px) { .php--split { flex-direction: row; } .php--split .php-note { flex-shrink: 1; min-width: 0; } } /* от md: components.css:43; усадка ноты — гранула 32px-гейта T3.6 */
.php-note { flex: none; } /* pages.css:31 */
.php-subtitle { max-width: 48.75rem; } /* 780px — components.css:61 */
```

### Строка табов + ссылок: связка tnv (T18.11)

Смешанный набор «табы + ссылки разделов» (порт `cp-tabs-row/cp-tabs-links`
career-portal, T18.11): настоящий tablist на `ui-tabs--pill` (`data-ui-tabs`,
панели-подсказки — клавиатура/roving tabindex даёт компонент; начальный выбор
— `aria-current="page"`, T14.9; активную пилюлю красит модификатор —
active-состояние 1:1 `pages.css:1000`) плюс nav ссылок разделов вне tablist
(правило ui-tabs). Ряд «лента + nav» — одна полоса от md
(оригинал `pages.css:974` — grid 5 колонок без переноса); мобильная база —
перенос (осознанное отклонение канона, прецедент `nvp` T17.11: оригинал
держит ряд на всех ширинах — на 375/32px-базе T3.6 nowrap min-content ряда
не проходит). DS-маргин ленты табов (ритм «лента → панель») в ряду погашен —
панелей-подсказок в потоке нет, ритм ведёт секция (замер 06.11: маргин давал
ряд 92px).

```html
<div class="ui-tabs ui-tabs--pill" data-ui-tabs>
  <div class="tnv">
    <div class="ui-tabs__list">
      <a class="ui-tabs__tab" href="#tnv-panel-practice" id="tnv-tab-practice">практики</a>
      <a class="ui-tabs__tab" href="#tnv-panel-internship" id="tnv-tab-internship" aria-current="page">стажировки</a>
    </div>
    <nav class="tnv__links" aria-label="Другие разделы">
      <a class="ui-link" href="education.html">Целевое обучение</a>
      <a class="ui-link" href="career-track.html">Карьерный трек</a>
      <a class="ui-link" href="events.html">Мероприятия</a>
    </nav>
  </div>
  <section class="ui-tabs__panel ui-vh" id="tnv-panel-practice" aria-labelledby="tnv-tab-practice">
    <p class="ui-small">Каталог практик — на странице «Практики».</p>
  </section>
  <section class="ui-tabs__panel ui-vh" id="tnv-panel-internship" aria-labelledby="tnv-tab-internship">
    <p class="ui-small">Каталог стажировок — на странице «Стажировки».</p>
  </section>
</div>
```

```css
.tnv { box-sizing: border-box; display: flex; flex-wrap: wrap; gap: var(--ui-space-2) var(--ui-space-4); align-items: center; } /* шаг 8/16 и центр — .cp-tabs-row pilot.css:2110–2113; база — перенос (прецедент nvp) */
@media (min-width: 768px) { .tnv { flex-wrap: nowrap; } } /* «одна полоса» оригинала — pages.css:974; порт хука .int-tabs (замер 06.11) */
.tnv .ui-tabs__list { margin-bottom: 0; } /* DS-ритм «лента → панель» в ряду снят — замер 06.11 (ряд 92px); прецедент сброса .nvp */
.tnv__links { box-sizing: border-box; display: inline-flex; flex-wrap: wrap; gap: var(--ui-space-2) var(--ui-space-4); } /* шаг 8/16 — .cp-tabs-links pilot.css:2116–2120 */
```

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
- T17.12: геометрию пилюли несёт модификатор `ui-select--pill` (компонент
  ui-select: рамка/радиус/фон — система, замена сайт-класса
  `.vacancy-search__select-wrap`); ширина пилюли в ленте — раскладка
  (в ленте канона — 260px оригинала, `.lpp-filters > .ui-select--pill`).
  Для пилюль с видимыми подписями канон ленты несёт `.lpp-pill` (выше) —
  для пилюль БЕЗ видимых подписей (скрытая `ui-vh`, как на страницах
  фильтров career-portal) — модификатор компонента.

### Find-bar: строка «найти по списку» (T17.12)

```html
<form class="lpp-find" action="/vacancies/" method="get" role="search">
  <div class="ui-field">
    <input class="ui-field__input" type="search" name="q"
      placeholder="Поиск по списку" aria-label="Найти вакансию">
  </div>
  <button class="ui-button ui-button--accent" type="submit">Найти</button>
</form>
```

- Связка `lpp-find` — flex-строка «поле + кнопка»: поле растягивается
  (`flex: 1 1 auto`), gap 8px и ритм снизу 8px (метрики принятого find-bar
  career-portal, T15.5). В каноне find-bar лежит в gap-колонке `lpp-main`
  (шаг 24px): margin не схлопывается во флексе — фактический зазор до
  следующего блока 32px (8+24); «чистые» 8px — в колонке сайта без gap
  (vac-main пилота — T18.17: судьба семейства vac-main «остаётся сайт-зоне», не-cp имя). Гашение — design-decision владельца (батч 31.10).
  Вид поля — `ui-field` (T5.2), кнопка —
  `ui-button` (вариант задаёт сайт: vacancies — accent, события — primary).
- `role="search"` — канон поисковой формы WAI; нативный GET — работа
  фильтра — зона бэкенда (мок-слой сайта).
- Имя поля — `aria-label` (видимой подписи в каноне нет, как у пилюль
  фильтров).
- Порядок чтения: find-bar — первый ребёнок main-колонки выдачи (до чипов и
  строк, как в композиции vacancies career-portal).

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

### Простая карточка-ссылка: связка lpp-card (T18.15)

Выдача без тела и фото — грид простых карточек (страница «Компании группы»
career-portal, `companies.html:153+`): вся карточка — имя-ссылка. Каркас —
`ui-card--hover`, паддинг 20/24px «как есть» несёт канон `lpp-card`
(inline-стиль оригинала: вертикаль 20px вне шкалы отступов §3.2 — прецедент
`cp-breadcrumbs`; горизонталь 24px = space-5):

```html
<div class="ui-grid ui-grid--3">
  <a class="ui-card ui-card--hover ui-small lpp-card" href="/companies/1/">АО «Интер РАО»</a>
</div>
```

Имя — роль `ui-small` **на самой ссылке** (канон мини-карточки 14/500 —
тройка small; вариант «роль на внутреннем span» отклонён замером T16.16:
статтер строки родителя оставлял карточке высоту 69px против 61 оригинала);
цвет наследует от карточки — fs/fw слой не задаёт. Колонки/адаптив несёт
примитив `ui-grid`.

### Панель «Найди свою вакансию»: связка vcs (T18.16)

Точка расширения «плитка-панель фильтров» — макро-композиция главной
career-portal (панель 310px в тёмной секции whu, `build.py SLOTS`; порт
`cp-vacancy-search` pilot.css 1:1). Сетка «панель | CTA-плитка» — `vcs__wrap`
(2fr 1fr от lg, шаг 12px; мобильная база — колонка: инверсия ступени ≤1023
оригинала `vacancy-search.css:75`); плитка — `vcs__panel`: колонка
«заголовок → лента» с шагом 48px, `space-between`, мин-высота 310px, паддинг
36px «как есть» (`vacancy-search.css:15–18`); лента пилюль — `vcs__fields`
(стык с `lpp-filters` T17.12: flex-wrap, шаг 16px, ширина пилюли 260px на
потомке `ui-select--pill` — геометрия несёт компонент):

```html
<div class="vcs__wrap">
  <form class="vcs__panel" action="/vacancies/" method="get" aria-label="Поиск вакансии">
    <h2 class="ui-page-title">Найди свою вакансию</h2>
    <div class="vcs__fields">
      <div class="ui-select--pill">
        <select class="ui-field__select" name="city" aria-label="Город" data-ui-select="wrap">
          <option value="" selected>Город</option>
          <option value="msk">Москва</option>
        </select>
      </div>
      <button class="ui-button ui-button--accent" type="submit">найти</button>
    </div>
  </form>
  <a class="ui-card ui-card--cta ui-card--cta--accent ui-card--cta--row" href="/vacancies/">
    <span class="ui-h4">Все 140 вакансий</span>
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true"><!-- стрелка --></svg>
  </a>
</div>
```

- Заголовок — роль `ui-page-title` (без JS-блока: на реальной странице тег —
  h2 внутри секции), кнопка — `ui-button--accent` (оранжевая пара «найти»
  оригинала), CTA-плитка — `ui-card--cta --accent/--row` (T17.8) — вид плитки
  несёт компонент, слой её не дублирует.
- Пилюли без видимых подписей — `aria-label` на select (как в пилоте и в
  ленте каталога); радиус плитки — принятая интерпретация клона
  `radius-lg` (оригинал `--radius-card` 16px; расхождение принято клоном —
  блок-пара compare Δ0).
- Панель растягивается на трек сетки (высоту колонки ведёт `vcs__wrap`);
  ступени плитки/ленты оригинала ≤767 (`vacancy-search.css:81–87`) пилотом
  не велись — канон их не несёт.

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
- **Пилюля не переносится (от md)** (T18.7): раскладка строки — row-nowrap,
  `lpp-row__main` несёт `flex: 1` — текст переносится **внутри** main-блока,
  а CTA-пилюля всегда прижата к правому краю строки (оригинал `.vac-row`,
  `pages.css:159–166`, wrap не имеет; высота строки определяется текстом).
  flex-wrap-канон разрешает перенос только на мобильной базе (до md пилюля
  уходит под текст — оригинал на ≤760 тоже ставит строку колонкой,
  `pages.css:359`); flex-wrap: wrap на строке на десктопе собирает строку
  248px против 178 (+70 × 8 строк = +400px страницы vacancies пилота).
  Порядок DOM не меняется: кнопка — второй ребёнок строки, после текста
  (VI-инвариант).
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
  `ui-select` wrap; геометрия пилюли — `ui-select--pill` или `.lpp-pill`,
  см. «Панель фильтров» выше), radio-группа «Опыт» —
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
- Связующие стили (`.lpp-filters`, `.lpp-pill`, `.lpp-pill__name`, `.lpp-find`,
  отступы page-head) живут в паттерн-слое `ui-patterns.css` (T17.1/T17.12 —
  подключение опционально); геометрия пилюль фильтров — модификатор
  `ui-select--pill` компонента (T17.12). Источник значений:
  [`patterns/patterns.css`](../../patterns/patterns.css) — только токены `--ui-*`.

## Do / Don't

- **Do**: одна GET-форма на страницу; все фильтры — её контролы; сабмит —
  «Применить»; сброс формы — `type="reset"`, сброс выдачи — ссылка на чистый
  URL.
- **Do**: `name` обязателен у каждого select (иначе форма не отправит
  значение без JS) — README `ui-select`.
- **Don't**: не прячьте нативный select в разметке (скрытие — работа модуля);
  не кладите `.ui-select__native`/`tabindex="-1"` руками.
- **Don't**: не оборачивайте select в `ui-field__select-wrap` — пилюлю рисует
  модификатор `ui-select--pill` (или `.lpp-pill` канона), стрелка — шеврон
  триггера.
- **Don't**: не делайте фильтры-чипы ссылками-«пилюлями» с JS-переключением —
  это либо ссылки с полным набором параметров (без JS), либо select'ы формы.

## Тесты

- Юнит-пины контракта: `tests/unit/pattern-list-page.test.js`; пины канона
  панели/модалки — `tests/unit/pattern-vacancy-search-dir-modal.test.js`
  (T18.16).
- Поверхность браузера (GET-цикл с JS/без, empty-ветка со сбросом, фокус,
  axe, иерархия h1→h2, ветки T14.10: состав строки/CTA-модалка, sticky-сайдбар
  с label/legend, чипы до выдачи, no-JS GET и фокус-гвард ветки, эталоны 4
  веток + панель vcs — T18.16): `tests/e2e/pattern-list-page.spec.js`.

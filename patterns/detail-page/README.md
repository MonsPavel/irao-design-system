# Паттерн «Детальная страница» (T8.2)

Референс детальной страницы (вакансия/статья/событие) — перенос композиции
`career-portal` (`src/pages/vacancy.html`, `article.html`, `event.html` +
`form-aside` из `build.py render_vacancy_detail`/`render_vacancy_apply`) на
компоненты системы. Эталонная сборка целиком:
[`detail-page.html`](detail-page.html) — она же стенд
`/showcase/dist/stands/patterns/detail-page.html` (генерируется
`showcase/build.mjs`).

Собирается **без нового CSS системы**: только компоненты (`ui-breadcrumbs`,
`ui-button`, `ui-card`, `ui-tag`, `ui-link`) и layout-примитивы (`ui-section`,
`ui-grid--3`) + роли типографики T3.3. Связующие стили — зона сайта (в бою —
`template_styles.css`; на стенде — `<style>` рядом, не в `dist`); связки
именуются `dpp-*`. Если какой-то связке понадобится место в системе —
поднимается вопрос о компоненте (Scope T8.2), а не о расширении паттерна.

## Состав

| Блок | Компоненты | Примечания |
|---|---|---|
| Крошки | `ui-breadcrumbs` | T4.7; микроразметка BreadcrumbList, текущая — `span` + `aria-current="page"` |
| page-head | h1 (`ui-h1`) + зарплата (`ui-h3`) + теги (`ui-tag`) + мета | мета — `ui-small ui-text--muted`; дата — `<time datetime>` |
| Контент | роли T3.3 (`ui-body`, `ui-list`), секции h2 | уровень тега — семантика страницы, роль — вид |
| Aside | справочная панель `dl` + CTA `ui-button` + дисклеймер `ui-link` | перенос `form-aside` career-portal; **sticky только ≥ md (768)** |
| Related | h2 + `ui-grid--3` + `ui-card--hover ui-card--link` | после main; заголовки карточек — h3 |

## Разметка

Копируйте блоки из [`detail-page.html`](detail-page.html) (он же — живой
стенд). Ключевые решения:

### Порядок чтения: заголовок → контент → aside → related

DOM-порядок = смысловой (Accessibility requirements): крошки → page-head →
`dpp-main` → `dpp-aside` → related. На мобиле aside визуально тоже
после контента (одна колонка — порядок DOM сохраняется), от md — правая колонка.

### Лейаут «контент + aside»: sticky только ≥ md

```css
.dpp-layout {
  box-sizing: border-box;
  display: grid;
  gap: var(--ui-space-7);
  align-items: start;
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 768px) {
  .dpp-layout {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .dpp-aside {
    position: sticky;
    top: var(--ui-space-5);
  }
}

@media (min-width: 1024px) {
  .dpp-layout {
    grid-template-columns: minmax(0, 1fr) var(--ui-form-aside-width);
  }
}
```

- **Мобильная база** — одна колонка, aside в конце потока; `position: sticky`
  в базе не объявляется вовсе (Implementation requirements T8.2 п.1; проверено
  e2e: на 375 computed `position` = `static`).
- **От md (768, шкала T2.5)** — вторая колонка и sticky; `top` — одобренные
  24px `.form-aside`. От **lg (1024)** aside получает ширину одобренного
  `.form-aside` — токен `--ui-form-aside-width` (400px). В career-portal
  двухколоночный лейаут включался от 1280 (desktop-first ≤1279 — стек);
  для системы граница перенесена на md по спеке T8.2 — на узких планшетах
  aside занимает вторую половину контейнера.
- **`align-items: start` обязателен**: grid-элемент по умолчанию
  растягивается (`stretch`) на высоту строки — sticky-блоку некуда прилипать.

### Sticky × overflow: осторожно с wrapper'ами

`position: sticky` работает только пока ни один предок между aside и
скролл-контейнером не создаёт scroll-контекст:

- предок с `overflow: hidden/auto/scroll` (в том числе классический приём
  `overflow-x: hidden` на `body` или обёртке — он делает `overflow-y: auto`)
  захватывает прокрутку: sticky прилипает к ней, а не к окну — визуально
  «не работает»;
- промежуточные wrapper-обёртки с фиксированной высотой или `display: flex`
  без `align-items: start` растягивают/ограничивают aside — тот же эффект.

Не оборачивайте `.dpp-layout` в лишние обёртки; если сайту нужен
`overflow-x: hidden` — вешайте его на элемент вне цепочки предков aside.
Сценарий «32px-база не перекрывает контент» (Implementation requirements
T8.2 п.1) закрыт e2e на эталоне: `tests/e2e/pattern-detail-page.spec.js`.

### Aside: справочная панель + CTA + дисклеймер (перенос `form-aside`)

```html
<aside class="dpp-aside" id="dpp-aside" aria-labelledby="dpp-aside-title">
  <h2 class="ui-h4 dpp-aside__title" id="dpp-aside-title">Детали вакансии</h2>
  <dl class="dpp-aside__list">
    <div class="dpp-aside__row">
      <dt class="ui-micro ui-text--muted dpp-aside__label">Опыт работы</dt>
      <dd class="ui-small dpp-aside__value">От 3 лет</dd>
    </div>
    <!-- … -->
  </dl>
  <a class="ui-button ui-button--primary" id="dpp-cta" href="/vacancy-apply/">Откликнуться</a>
  <p class="ui-small ui-text--muted dpp-aside__note">
    Отправляя отклик, вы соглашаетесь на обработку персональных данных согласно
    <a class="ui-link" href="/privacy/">Политике конфиденциальности</a>.
  </p>
</aside>
```

- Пары «метка — значение» — `dl`/`dt`/`dd` (структура `form-aside`); UA-дефолты
  `dl`/`dd` обнуляйте в связках (урок ui-form: `dd` уезжал на 40px вправо).
- **CTA — ссылка**, не кнопка: страница отклика (T8.3) открывается переходом,
  работает без JS и с клавиатуры в sticky-зоне (обычный элемент DOM-порядка).
  Чекбокс согласия на обработку ПД остаётся в форме отклика (T5.2/T8.3) —
  здесь его переносимый аналог: дисклеймер со ссылкой на Политику.
- Aside — семантический `<aside>` (complementary-лендмарка) с
  `aria-labelledby` на заголовок панели.

### Мета и время: `<time>` с `datetime`

Даты/время — всегда `<time datetime="YYYY-MM-DD">`: машиночитаемое значение
(schema-парсер и поисковики читают атрибут, человек — текст):

```html
<meta-строка>
  … · Опубликовано <time itemprop="datePosted" datetime="2026-09-12">12 сентября 2026</time>
</meta-строка>
```

### Related: заголовок h2 + сетка карточек

```html
<section class="ui-section" id="dpp-related" aria-labelledby="dpp-related-title">
  <h2 class="ui-h3" id="dpp-related-title">Похожие вакансии</h2>
  <div class="ui-grid ui-grid--3 dpp-related__grid" id="dpp-related-grid">
    <article class="ui-card ui-card--hover ui-card--link">
      <p><span class="ui-tag ui-tag--blue">Теплоэнергетика</span>…</p>
      <h3 class="ui-h3 ui-card__title"><a class="ui-card__link" href="/vacancies/…/">…</a></h3>
      <p class="ui-body ui-card__body">Короткое описание…</p>
      <div class="ui-card__footer">
        <button class="ui-button ui-button--outline" type="button">Откликнуться</button>
      </div>
    </article>
  </div>
</section>
```

У related есть свой h2 → заголовки карточек — **h3** (без пропуска уровня,
гейт `irao/heading-order`); вид — роль `ui-h3` («классы, а не теги», T3.3).
В списковой странице (T8.1) промежуточного h2 нет — там карточки h2: уровень
тега определяет контекст страницы, а не канон `ui-card`.

## Schema.org-кейс: JobPosting / Article («когда уместно»)

Микроразметка ставится там, где у страницы есть машиночитаемый смысл
(ТЗ №7 «не ради галочки»): детальная вакансия — `JobPosting`, статья —
`Article`. Разметка — microdata (как у крошек T4.7): работает без JS,
дружелюбна к Bitrix-шаблонам. Достаточно базовых полей (эталон валидируется
парсером e2e, расширенные поля — по мере появления данных в ИБ):

```html
<article class="dpp-article" itemscope itemtype="https://schema.org/JobPosting">
  <h1 class="ui-h1" itemprop="title">…</h1>
  <span itemprop="hiringOrganization" itemscope itemtype="https://schema.org/Organization">
    <span itemprop="name">АО «Интер РАО – Электрогенерация»</span>
  </span>
  <span itemprop="jobLocation" itemscope itemtype="https://schema.org/Place">
    <span itemprop="address" itemscope itemtype="https://schema.org/PostalAddress">
      <span itemprop="addressLocality">Москва</span>,
      <span itemprop="streetAddress">ул. Энергетическая, д. 10</span>
    </span>
  </span>
  <time itemprop="datePosted" datetime="2026-09-12">12 сентября 2026</time>
</article>
```

- Поля эталона: **title, hiringOrganization, jobLocation, datePosted**
  (обязательный минимум спеки T8.2); `datePosted` — `ACTIVE_FROM` записи.
- Для статей — тот же приём с `https://schema.org/Article`:
  `headline` (h1), `datePublished` (`<time datetime>`), `author`,
  `articleBody` (обёртка текста).
- Валидация — парсер-тест структуры в e2e (как у крошек T4.7); разовая
  проверка Rich Results Google — вручную на развёрнутой странице (внешний
  сервис, в локальном прогоне недоступен).

## A11y

- **Порядок чтения: заголовок → контент → aside → related** — DOM-порядок =
  смысловой; на мобиле визуальный порядок совпадает (aside в конце потока),
  от md aside уезжает вправо, не ломая порядок чтения.
- **CTA доступен с клавиатуры в sticky-зоне** — это обычная ссылка в
  DOM-порядке: Tab доходит до неё и при прилипшем aside (проверено e2e).
- **time-семантика** — `<time datetime>` для всех дат меты.
- Заголовки: h1 → h2 (секции контента, панель aside, related) → h3
  (карточки related) — без пропусков (гейт `irao/heading-order`).

## Bitrix-заметки (AC: news.detail / свойства ИБ / связанные блоки)

Детальная страница = `bitrix:news.detail` (вакансии, статьи, события —
инфоблоки одного типа). Эскиз `template.php`:

```php
<?php
// Свойства ИБ — в теги и мету: $arResult['DISPLAY_PROPERTIES']
// (DIRECTION, EXPERIENCE, SALARY…), дата — ACTIVE_FROM.
$sDate = $arResult['ACTIVE_FROM'] ?? '';
?>
<nav class="ui-breadcrumbs" aria-label="Хлебные крошки">
  <?php // цепочка — bitrix:breadcrumb или BUILD_LINK_CHAIN news.detail
     // (сниппет bitrix/snippets/breadcrumbs.php) ?>
</nav>
<article itemscope itemtype="https://schema.org/JobPosting">
  <h1 class="ui-h1" itemprop="title"><?= $arResult['NAME'] ?></h1>
  <p class="dpp-tags">
    <?php foreach ($arResult['DISPLAY_PROPERTIES'] as $code => $prop):
      if (empty($prop['DISPLAY_VALUE'])) continue; ?>
      <span class="ui-tag ui-tag--blue"><?= htmlspecialcharsbx(is_array($prop['DISPLAY_VALUE']) ? implode(', ', $prop['DISPLAY_VALUE']) : $prop['DISPLAY_VALUE']) ?></span>
    <?php endforeach; ?>
  </p>
  <p class="dpp-meta ui-small ui-text--muted">
    <?php // hiringOrganization/jobLocation — из свойств ИБ (COMPANY, CITY):
     // те же itemprop, что в эталоне; datePosted — ACTIVE_FROM. ?>
    <time itemprop="datePosted" datetime="<?= date('Y-m-d', strtotime($sDate)) ?>"><?= $sDate ?></time>
  </p>

  <div class="dpp-layout">
    <div class="dpp-main">
      <?php // секции h2 + ui-body/ui-list: DETAIL_TEXT или свойства-таблицы ?>
    </div>
    <aside class="dpp-aside">
      <?php // dl «метка — значение» из DISPLAY_PROPERTIES + CTA-ссылка
         // на страницу отклика (T8.3) + дисклеймер ПД ?>
    </aside>
  </div>
</article>

<?php // Related — bitrix:news.list в режиме «связанные»: GetList с фильтром
   // по свойству (тот же DIRECTION, исключая текущий ID) или
   // PROPERTY_linked элементы; кнопки/карточки — паттерн T4.4. ?>
```

- Шаблон компонента правит интегратор — паттерн задаёт **разметку страницы**,
  а не код компонента; значения тегов/меты — свойства ИБ (JSON-паттерн
  02-architecture §6.3).
- `datePosted` в разметке обязателен даже если дату не показываете визуально:
  спрячьте элемент классом сайта, но не удаляйте `<time>`.
- Связующие стили (`dpp-*`) перенесите в `template_styles.css` сайта —
  источник: `<style>` в [`detail-page.html`](detail-page.html), значения —
  только токены `--ui-*`.

## Do / Don't

- **Do**: aside — `<aside>` с `aria-labelledby`; sticky — только от md и
  вместе с `align-items: start` на лейауте.
- **Do**: даты — `<time datetime>`; CTA — ссылка на страницу отклика.
- **Don't**: не оборачивайте `.dpp-layout`/aside в wrapper'ы с `overflow`
  или фикс. высотой — sticky перестаёт работать (см. раздел выше).
- **Don't**: не дублируйте h1 в aside/related; заголовки — строго по
  иерархии страницы (h1 → h2 → h3).
- **Don't**: не тащите `form-aside`-классы ui-form в детальную страницу —
  это элементы формы (T5.4); здесь их переносимая структура (`dpp-aside`).

## Тесты

- Юнит-пины контракта: `tests/unit/pattern-detail-page.test.js`.
- Поверхность браузера (schema-парсер JobPosting, sticky/32px, CTA с
  клавиатуры, axe, иерархия h1→h2→h3, эталоны 375/768/1440):
  `tests/e2e/pattern-detail-page.spec.js`.

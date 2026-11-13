# Паттерн «Landing-секция» (T8.3)

Правила сборки лендинг-секций из системных примитивов + mini-эталон из
пятнадцати секций (светлая / тёмная / с-изображением full-bleed /
с-фото-фоном — T17.3 / nav-карточки и лента логотипов — T17.9 / hero,
adv-marquee, спец-сетка «Медиа», cover-hero — T17.15 / наставничество,
капсула вакансий — T18.2 / тёмная секция «why-us» — T18.12 / раскладки
карусели production v1/v2 — T18.13).
Эталон целиком: [`landing-section.html`](landing-section.html) — он же стенд
`/showcase/dist/stands/patterns/landing-section.html` (генерируется
`showcase/build.mjs`).

Лендинг-секции (hero, holding, why-us career-portal — «класс C») —
**контентные, принадлежат сайтам**; система не переносит их дизайн, а
фиксирует правила сборки каркаса. Связующие стили — зона сайта (в бою —
`template_styles.css`; на стенде — `<style>` рядом, не в `dist`); связки
именуются `lsp-*`.

## Формула секции

```html
<section class="ui-section" aria-labelledby="section-title">
  <div class="ui-container">
    <h2 class="ui-h2" id="section-title">Заголовок секции</h2>
    <p class="ui-lead">Подзаголовок — роль ui-lead.</p>
    <div class="ui-grid ui-grid--3">
      <article class="ui-card ui-card--hover ui-card--link">
        <h3 class="ui-h3 ui-card__title"><a class="ui-card__link" href="…">…</a></h3>
        <p class="ui-body ui-card__body">…</p>
        <div class="ui-card__footer"><button class="ui-button" type="button">…</button></div>
      </article>
    </div>
  </div>
</section>
```

| Слой | Что | Откуда |
|---|---|---|
| Секция | `ui-section` (+`--muted`) — вертикальный ритм 32/48px | base/layout.css, T3.4 |
| Контейнер | `ui-container` — max-width + паддинги 16/24/32 | base/layout.css, T3.4 |
| Заголовок | роль `ui-h2` («классы, а не теги», T3.3); секция именована `aria-labelledby` | base/typography.css |
| Сетка | `ui-grid ui-grid--3` — 1/2/3 колонки по вьюпорту | base/layout.css, T3.4 |
| Карточки | `ui-card--hover ui-card--link` (T4.4) + теги T4.3 + `ui-button` | components/ |
| Ритм связок | lead после заголовка — `--ui-space-3`, сетка после — `--ui-space-5` | связки `lsp-*` сайта |

У секции есть свой заголовок h2 → заголовки карточек — **h3** (без пропуска
уровня, гейт `irao/heading-order`); на странице, где секции идут после h1,
иерархия h1 → h2 (секции) → h3 (карточки) остаётся без пропусков.

## Правило границы «система / сайт» (итог EPIC-8)

> **Контент и уникальный дизайн секции — сайт; каркас (секция / сетка /
> типографика / карточки / кнопки) — система.**

- **Система даёт**: вертикальный ритм секции, контейнер, сетки, роли
  типографики, карточки, теги, кнопки, изображения (правила T4.6), on-dark- и
  surface-пары токенов. Секция собирается копипастой **без нового CSS**.
- **Сайт даёт**: контент секции, уникальные декоративные приёмы (герой-блоки,
  коллажи, бейджи-фото, marquee, слайдеры — hero/production/why-us
  career-portal), связующие стили ритма (`lsp-*` → `template_styles.css`).
- **Не переносите** уникальный дизайн конкретных лендингов в систему
  (Out of scope T8.3): если приём нужен нескольким сайтам — это заявка на
  компонент/примитив (EPIC-2/4+), а не расширение паттерна.

## Тёмные секции: on-dark-пары токенов

Фон тёмной секции — семантика **`--ui-color-primary-deep`** (surface-inverse-
пара, Technical considerations T8.3); текст — пары
`--ui-color-text-on-dark` / `--ui-color-text-on-dark-muted`:

```css
.lsp-dark {
  box-sizing: border-box;
  background-color: var(--ui-color-primary-deep);
  color: var(--ui-color-text-on-dark);
}

.lsp-dark .lsp-lead {
  color: var(--ui-color-text-on-dark-muted);
}
```

- Обе пары проходят **контраст-гейт T2.3** (`npm run test:contrast`): 
  `on-dark-on-primary-deep`, `on-dark-muted-on-primary-deep` — контраст ≥ 4.5:1
  (Accessibility requirements T8.3).
- **Карточки внутри тёмной секции — обычные светлые `ui-card`**: их текст
  остаётся в паре `text-on-surface`, перекраска не требуется. Не перекрашивайте
  карточки под фон — пары для «тёмной карточки» в системе нет. Обязательно
  восстановите цвет текста карточек в связке секции — `ui-card` цвет текста
  не задаёт, а `.ui-card__link` несёт `color: inherit`: без восстановления
  карточный текст наследует белый `on-dark` и становится невидимым на белой
  карточке:

  ```css
  .lsp-dark .ui-card {
    color: var(--ui-color-text);
  }
  ```
- Одобренная альтернатива фона — `--ui-color-surface-dark` (= primary): её
  on-dark-пары тоже в гейте (`on-dark-on-surface-dark`); выбирайте одну пару
  на секцию и не смешивайте.

### Фокус на тёмном (ревизия T9.2)

Outline клавиатурного фокуса рисует глобальная политика ADR-0001 токеном
`--ui-focus-color` (= primary): на тёмных поверхностях секции он не читается
(1.0–1.03:1 против порога некстовых 3:1 — ревизия производных,
`tests/contrast/derived.config.mjs`, исключения `focus-on-dark` /
`focus-on-primary-deep`). Если в тёмной секции появляются интерактивные
элементы НАНЯПРЯМУЮ на тёмном фоне (в демо-паттерне интерактив живёт на
светлых `ui-card` — там дефолтный фокус читается), переопределите focus-тройку
в контексте секции — штатный механизм токенов, как у тем:

```css
.lsp-dark {
  --ui-focus-color: var(--ui-color-text-on-dark);
}
```

## Full-bleed внутри контейнера (правила T4.6)

Изображение шире колонки контента (панорама, обложка секции) тянется до краёв
секции **шириной и отрицательными margin от container-pad** — значения только
токенами, ступени повторяют лестницу `ui-container`:

```css
.lsp-bleed {
  box-sizing: border-box;
  width: calc(100% + 2 * var(--ui-container-pad));
  max-width: none;
  margin-inline: calc(-1 * var(--ui-container-pad));
}

@media (min-width: 768px) {
  .lsp-bleed {
    width: calc(100% + 2 * var(--ui-container-pad-md));
    margin-inline: calc(-1 * var(--ui-container-pad-md));
  }
}

@media (min-width: 1024px) {
  .lsp-bleed {
    width: calc(100% + 2 * var(--ui-container-pad-lg));
    margin-inline: calc(-1 * var(--ui-container-pad-lg));
  }
}
```

Важно, связка переопределяет **два** ограничения базы `ui-image`:

- `width: 100%` (его даёт `ui-image--ratio-*`) считается от **контент-бокса
  контейнера**, а margin только смещает элемент — ширину добавляем явно
  (`calc(100% + 2 * pad)`), иначе справа останется зазор в один паддинг;
- `max-width: 100%` (база `ui-image`) сжимает расширенный бокс обратно к
  колонке контента — снимаем (`max-width: none`).

Само изображение — правила T4.6: `ui-image ui-image--cover ui-image--ratio-16-9`
(место зафиксировано `aspect-ratio` из шкалы — CLS = 0; `--cover` кадрирует
файл любой пропорции), атрибуты `width`/`height` обязательны (гейт
`irao/img-dimensions`), `loading="lazy"` вне первого экрана, осмысленный `alt`
(декоративный фон секции — `alt=""`).

## Фото-фон секции (ui-section--photo, T17.3)

Фотография на всю секцию под контентом — примитив **`ui-section--photo`**
(base/layout.css, T17.3): секция изолирует стекинг, слои `__bg` (слот `img`)
и `__overlay` красятся под контентом (z-пара `-1`, прецедент career-portal —
hero/production/holding/why-us/company-banner):

```html
<section class="ui-section ui-section--photo" aria-labelledby="photo-title">
  <div class="ui-section__bg" aria-hidden="true">
    <img src="factory.jpg" alt="" width="1600" height="900" loading="lazy">
  </div>
  <div class="ui-section__overlay ui-section__overlay--fade-bottom" aria-hidden="true"></div>
  <div class="ui-container">
    <h2 class="ui-h2" id="photo-title">…</h2>
  </div>
</section>
```

- **Секция не задаёт типографику/цвет текста** — on-dark-пары
  (`--ui-color-text-on-dark[-muted]`) несёт контент (существующие роли);
  заголовочные роли возвращаются в on-dark связкой секции — как у
  `lsp-dark` выше.
- **Оверлеи** — три канона одобренного дизайна: `--fade-bottom`
  (растворение в страницу сверху + в `primary-a94` снизу — канон hero),
  `--glow` (горизонтальный градиент primary слева — канон production),
  `--tint` — цветовое затемнение токен-хуком
  **`--ui-section-overlay-tint`** (дефолт — none; сайт ставит ступень
  лестницы тинтов T14.7, например `--ui-color-primary-a55`):

  ```css
  .my-banner {
    --ui-section-overlay-tint: var(--ui-color-primary-a55);
  }
  ```

- **img фона — декоративный**: `alt=""`, слои — `aria-hidden` (прецедент
  пилота); размеры/`loading` — правила T4.6 (гейт `irao/img-dimensions`).
- **Высота — от контента**; декларативные пропорции (`min-height`) и клип
  радиуса (`overflow: hidden` + `border-radius`) — решения сайта. Ритм
  `ui-section` действует как у обычной секции: если блок несёт собственную
  вертикальную геометрию — погасите её в связке сайта (`padding: 0`).
- Миграция из пилота career-portal: правила `__bg`/`__glow` сайт-зоны
  снимаются, разметка переезжает на слои ДС (T17.3 — пять блоков:
  hero/production/holding/why-us/company-banner).

## Nav-карточки (lnk-card, T17.9)

Цветные карточки-ссылки «Школьникам и студентам» (порт `.cp-students__card`
career-portal — типовой навигационный блок лендинга): тоновый фон, слот
декоративной иллюстрации снизу-справа, круглая кнопка-стрелка
(`ui-button--round`, T17.9). Связка живёт в паттерн-слое
(`dist/ui-patterns.css`, префикс `lnk-`); сетка — каркас `ui-grid`
(1 → 2 на md → 3 на lg, шаг 12px):

```html
<!-- тон .lnk-card--navy { --lnk-card-bg: var(--ui-color-primary);
     --lnk-card-fg: var(--ui-color-text-on-dark); } — сайт-зона -->
<a class="lnk-card lnk-card--navy" href="practices.html"
   aria-label="Подробнее: Стажировки и практики">
  <div class="lnk-card__body">
    <h3 class="ui-h4">Стажировки и практики</h3>
    <p class="ui-small">Уникальный шанс получить опыт в энергетике!</p>
  </div>
  <img class="lnk-card__illu" src="boy.png" alt="" loading="lazy">
  <span class="ui-button ui-button--round lnk-card__action" aria-hidden="true">→</span>
</a>
```

| Слой | Что | Откуда |
|---|---|---|
| Сетка | `ui-grid lnk-cards` — 1/2/3 колонки (md/lg), шаг 12px | паттерн-слой `lnk-cards`, порт `.cp-students__grid` |
| Карточка-ссылка | `a.lnk-card` — flex-колонка, min-height 22rem (352px), паддинг 24, радиус md, клип `overflow: hidden` | паттерн-слой, порт `.cp-students__card` |
| Тон | пара `--lnk-card-bg` / `--lnk-card-fg` — сайт-зона (класс тона) | хуки связки; дефолт — `surface`/`text` (тон light) |
| Тело | `lnk-card__body` — заголовок-роль h3 + текст-роль (шаг несёт карточка) | разметка |
| Иллюстрация | `lnk-card__illu` — absolute bottom/right, max-height 70%, **декоративна (`alt=""`)** | паттерн-слой, порт `.cp-students__card-illu` |
| Действие | `ui-button ui-button--round lnk-card__action` — круг 20px (`--ui-control-size`), поверх иллюстрации, прижата вправо | компонент (T17.9) + связка (z-пара, align-self) |

### Правило карточки-ссылки и именование

Интерактив на карточке **один** — вся карточка `<a>` (прецедент
`ui-card--link` T4.4, но с собственным каноном career-portal): доступное имя
несёт `aria-label="Подробнее: …"` (axe: имена карточек-ссылок), стрелка —
декоративный `span` с `aria-hidden="true"`. Держите внутреннюю ссылку-
кнопку отдельным интерактивом — вложенные интерактивы недопустимы
(инвариант `ui-card`).

### Тон — параметр сайта (Implementation requirements п.1)

Связка цвет тона НЕ задаёт: сайт ставит пару на хуках классом тона. Контраст
пары — **обязанность сайта**; гейтите `npm run test:contrast` или таблицей
ниже. Одобренные пары career-portal (оригинал; peach — color-mix-паттерн
сайт-зоны, токенизация спец-тинтов — T17.15):

| Тон | `--lnk-card-bg` | `--lnk-card-fg` | Контраст текста |
|---|---|---|---|
| navy | `var(--ui-color-primary)` | `var(--ui-color-text-on-dark)` | 14.6:1 (AA/AAA) — автомат |
| light | `var(--ui-color-surface)` (дефолт) | `var(--ui-color-text)` (дефолт) | 16.5:1 — автомат |
| peach | `color-mix(in srgb, var(--ui-color-accent) 24%, var(--ui-color-surface))` | `var(--ui-color-text)` (дефолт) | 12.7:1 — одобренная пара оригинала |

- Заголовочные роли на заливке связка возвращает в пару карточки
  (`color: var(--lnk-card-fg, …)` — прецедент `ui-card--cta` T17.8): роль
  h4 несёт `--ui-color-heading` (= primary) и на navy-тоне невидима —
  живой баг пилота «невидимый h4» закрыт связкой (после миграции заголовок
  navy-карточки читается).
- Круглая кнопка-стрелка красится хуками `--ui-button-bg` /
  `--ui-button-color` того же класса тона (пары: peach → accent/on-dark,
  navy → surface/primary, light → primary/surface; белая стрелка на accent —
  одобренное исключение 3.12:1, графика ≥ 3:1 — WCAG 1.4.11).

### Do / Don't

- **Do**: держите контраст пары ≥ 4.5:1 (таблица выше — готовые значения);
  новую пару проверяйте контраст-гейтом до публикации.
- **Do**: иллюстрация — `alt=""`, `loading="lazy"` (декоративный слот);
  осмысленное изображение — контент сайта и не слот `__illu`.
- **Don't**: не задавайте тон inline-стилем (инвариант §5) — только классом
  сайт-зоны на токенах; цвета вне токенов перекраска VI не поймает.
- **Don't**: не тащите tone-пары в компонент/слой — тон карточки — параметр
  сайта (Out of scope: peach как токен ДС — T17.15).
- **Don't**: не добавляйте второй интерактив внутрь карточки (ссылка + 
  кнопка) — имена и фокус дублируются; действие несёт сама карточка.

### Миграция из пилота career-portal

Разметка: `article.cp-students__card[--tone]` + внутренняя ссылка-кнопка →
`a.lnk-card[--tone]` + декоративная стрелка (пример выше); сетка
`.cp-students__grid` → `ui-grid lnk-cards`. Правила `cp-students*` сняты
(~75 строк вместе с `cp-employers*`), сайт-зона — только тоны (пары на
хуках; рамка light-тона сохранена исходником 1:1).

## Лента логотипов (lgo-grid/lgo-card, T17.9; канон по оригиналу — решение владельца 31.10)

Сетка плашек «Популярные работодатели Группы» (порт `.employers__*`
career-portal — типовой блок «партнёры/клиенты»): каркас `ui-grid`, лестница
и шаг — оригинал employers.css (база 6 колонок, gap 40/36; ≤1023 → 3 колонки
gap 24; ≤767 → 2 колонки gap 12; переформулировано mobile-first), плашка —
растянутый голый `img` (ширина 100%, размеры атрибутами — гейт T4.6), радиус
md = `--radius-card` 16px оригинала. Рамки и фона нет: blue-50 запечён в PNG
(«рамочная плашка» спеки T17.9 снята сравнением с оригиналом — «рамка-в-рамке»
на белых полях логотипов):

```html
<div class="ui-grid lgo-grid">
  <img class="lgo-card" src="logo-1.png" alt="Логотип работодателя"
       width="197" height="108" loading="lazy">
  …
</div>
```

- Плашка — `img` напрямую (логотипы с запечённой подложкой). Паддинги
  «как есть» — нулевые: плашка обнимает логотип.
- Hover-подъём оригинала (translateY −4 + тень, employers.css:22–26) —
  сайт-зона при интерактивных применениях: плитка канона — не ссылка.
- Мозаика live-индекса (5×197px, gap 64, смещения nth-child) — композиция
  страницы, не канон (прецедент tlp: переносится композиция, не стили).
- Подбор логотипов/альтернативные подписи — контент сайта; в оригинале
  marquee-анимации нет — статическая сетка (Out of scope T17.9).
- Миграция: `.employers__grid` → `ui-grid lgo-grid`,
  `.employers__card` → `lgo-card` (лестницы оригинала переформулированы
  mobile-first: 2×12 → 3×24 → 6×40/36).

## Лендинг-композиции (hro / mrq / mdl / cvh, T17.15)

Четыре канонические композиции лендингов живут в паттерн-слое
(`dist/ui-patterns.css`, гейт префиксов `hro|mrq|mdl|cvh`); разметка канона —
секции 7–10 эталона. Значения — принятые связки career-portal (пилот,
калибровки compare-раундов) с source-комментариями; лестницы оригинала
переформулированы mobile-first (768/1024 из шкалы T2.5). Слой подключается
опционально; тон тега hero — единственный сайт-параметр (ниже).

### Hero (hro)

Самый фирменный блок главной (PLAN §P2-1): фото-фон — примитив
`ui-section--photo` (T17.3, оверлей `--fade-bottom` — канон hero),
вертикальную геометрию несёт связка (min-height 50.5rem = 808px оригинала
от md, мобильная база 35rem; ритм `ui-section` погашен `padding: 0`):

```html
<section class="ui-section ui-section--photo hro" aria-labelledby="hero-title">
  <div class="ui-section__bg" aria-hidden="true">
    <img src="hero.jpg" alt="" width="1600" height="900" loading="eager">
  </div>
  <div class="ui-section__overlay ui-section__overlay--fade-bottom" aria-hidden="true"></div>
  <div class="hro__content">
    <h1 class="ui-h1 hro__title">Заголовок hero</h1>
    <form class="hro__search" action="/vacancies" method="get" role="search">
      <svg class="hro__search-icon" … aria-hidden="true">…</svg>
      <div class="ui-field">
        <input class="ui-field__input" type="search" name="q" aria-label="Поиск вакансий">
      </div>
      <a class="hro__search-all" href="/vacancies">Все вакансии</a>
    </form>
  </div>
  <div class="hro__tags">
    <span class="ui-tag hro__tag">Тег ленты</span> …
  </div>
</section>
```

| Слой | Что | Откуда |
|---|---|---|
| Блок | `.hro` — flex-колонка, клип фото (`overflow: hidden`), min-height 50.5rem (от md; 35rem — мобильная база канона) | паттерн-слой, порт `.hero` (hero.css:3, @max-767:211) |
| Контент | `.hro__content` — центр, паддинги 136/container-pad/24, шаг 48 | паттерн-слой (hero.css:47–56; принято ДС) |
| Заголовок | `.hro__title` — max-width 56rem, центр строки, primary | паттерн-слой (hero.css:58–66) |
| Поиск | `.hro__search` — стекло `--ui-color-glass-light` + blur(12px), пилюля, ширина 50rem; поле прозрачное (`__search .ui-field__input`); плита `.hro__search-all` 72px | паттерн-слой (hero.css:68–124) |
| Теги | `.hro__tags` — лента 4×`1:1:1:1`; `.hro__tag` — min-height 56, fs-lead, on-dark, стекло blur(10px) | паттерн-слой (hero.css:127–150) |
| Тон тега | хук `--hro-tag-bg` — сайт-зона (таблица ниже) | решение владельца T17.15 |

- **Поведение поиска** — не часть связки (Out of scope T17.15): GET-форма —
  канон search-overlay/find-bar; самостоятельный сценарий поиска — своя задача.
- **Стекло и VI**: пилюля/теги несут `backdrop-filter` в каноне; в режиме
  img:off blur отключается правилом `a11y/vi.css` (фото скрыто — blur нечему
  размывать) — VI-инвариант стекла (Implementation requirements п.1 T17.15).

### Тон тега hero — параметр сайта (решение владельца, вариант (а))

Тон hero-тега — **бренд-слой, не система**: связка несёт хук `--hro-tag-bg`
с каноническим дефолтом; спец-тоны сайт задаёт СВОИМ классом на хуке
(инлайн-стили запрещены — инвариант §5). Hex в ДС не едет (гейт слоя):
значения color-mix живут в сайт-зоне.

| Тон | Значение `--hro-tag-bg` | Где живёт |
|---|---|---|
| sand (дефолт) | `var(--ui-color-primary-a26)` — ступень 26% лестницы тинтов T14.7 | канон хука; пилот дублирует строкой тона для явности |
| violet | `color-mix(in srgb, #3142ff 20%, transparent)` — оригинал rgba(49,66,255,0.2) (hero.css:152) | сайт-зона (pilot.css, класс `.cp-hero__tag--violet`) |
| green | `color-mix(in srgb, #31ff76 20%, transparent)` — rgba(49,255,118,0.2) (hero.css:154) | сайт-зона |
| rose | `color-mix(in srgb, #ff3134 20%, transparent)` — rgba(255,49,52,0.2) (hero.css:155) | сайт-зона |

- Отвергнутая альтернатива (б) — расширять лестницу тинтов ДС
  violet/green/rose: тон — бренд-слой конкретного сайта; T14.7 брал только
  primary-лестницу. Статус-кво (в) — color-mix в сайт-зоне без хука —
  не переносим: хук делает канон исполняемым (разметка — `ui-tag hro__tag`,
  тон — строкой сайта).
- Контраст текста тегов — пара on-dark поверх полупрозрачных плашек на
  фото — обязанность сайта (do/don't пар на заливке — выше, lnk-card).

### Adv-marquee (mrq)

Типографская полоса преимуществ (канон T16.15, `.adv-marquee`
pages.css:1058–1081): светлый блок blue-50, строки 40/18/13 fw 500
uppercase ls 0.02em primary — литералы «как есть» (вне шкалы ДС), сетка
1.2fr/1fr от lg (база — колонка):

```html
<div class="mrq">
  <div class="mrq__type" aria-hidden="true">
    <span class="mrq__line mrq__line--bar">Группа «Интер РАО»</span>
    <span class="mrq__line mrq__line--sm">оплачиваемые программы…</span>
    <span class="mrq__line mrq__line--xl">НАЧНИ КАРЬЕРУ…</span>
    <span class="mrq__line mrq__line--bar">опыт · наставники · трудоустройство</span>
  </div>
  <div class="mrq__body">
    <img class="mrq__photo" src="photo.jpg" alt="" width="256" height="360" loading="lazy">
    <p class="ui-body">Расшифровка ленты — смысловой текст.</p>
  </div>
</div>
```

- Лента строк — **`aria-hidden`**: визуальная типографика дублирует смысл
  абзаца тела; uppercase ставит CSS — контент строчный (a11y).
- Бирки строк — по ролям оригинала: `--bar` (18px, подписи), `--sm`
  (13px, мелкая), `--xl` (40px, базовая крупная).
- Гранулы стресса (рендер при помещении строки — байт-равен одобренному):
  в мобильной базе (до 480) тело переносится — фото на своей строке, текст
  во всю ширину (в пилоте-оригинале этой зоны текст выталкивался за блок
  в hscroll страницы); с 480 — строка; текст — `overflow-wrap: anywhere`,
  фото — `max-width: 100%` (32px-база T3.6).

### Спец-сетка «Медиа» (mdl)

Раскладка блока «Медиа» на главной (порт принятой сетки пилота; оригинал —
вариант `--wide` media.css:130–153): 4 колонки от lg, big-карточка 2×2,
lead-сводка 2 колонки; ступени 2 (md) → 1 (база). Карточки — `ui-card`:

```html
<div class="mdl">
  <article class="ui-card mdl__big">…</article>
  <div class="mdl__lead">…заголовок/дата/анонс/ссылка…</div>
  <article class="ui-card">…</article> …
</div>
```

- Span-геометрия включается от md: на мобильной базе (1 колонка) span 2
  порвал бы сетку implicit-колонкой.
- **Кейс career-portal**: правило span 2×2 big-карточки не применялось с
  клона (в разметке был опечаточный класс мимо селектора) — одобренные
  высоты/скрин-пары сняты без span; активация +214px docHeight index
  (+3.1% > порога compare ±1%) — design-decision владельца (канон
  `mdl__big` в слое есть и рендерится на стенде паттерна).

### Cover-hero (cvh)

Колонка «заголовок + lead + CTA» обложек лендингов стажировок (порт
`.cover-hero` pages.css:953–959 в принятой форме клона): зазор 16px,
прижато влево. Карточную форму (фон/паддинг/радиус оригинала) клон не
переносил — обложка рендерится на странице без плашки.

```html
<div class="cvh">
  <h1 class="ui-page-title">Стажировки</h1>
  <p class="ui-lead">Оплачиваемые программы…</p>
  <a class="ui-button ui-button--primary" href="#directions">смотреть стажировки</a>
</div>
```

### Миграция из пилота career-portal (T17.15)

Разметка: `cp-hero*` → `hro`/`hro__*`, `cp-adv-marquee*` → `mrq`/`mrq__*`,
`cp-media__grid`/`cp-media__lead` → `mdl`/`mdl__lead`,
`cp-cover-hero` → `cvh`. Правила сняты из `pilot.css` (~180 строк);
сайт-зона — тон-строки тегов hero на хуке `--hro-tag-bg` (таблица выше).
Compare-пробы `hero`/`marquee-line` — на крючках слоя.

## Наставничество и капсула вакансий (msh / vcp, T18.2)

Два макро-блока v2 главной career-portal вынесены в паттерн-слой целиком
(`dist/ui-patterns.css`, гейт префиксов `msh|vcp`); разметка канона —
секции 11–12 эталона. Значения — оригинал 1:1 с источниками
`mentorship.css` / `vacancy-capsule.css` в комментариях; лестницы
`@max-1023/767` переформулированы mobile-first (768/1024 шкалы T2.5).

### Наставничество (msh)

Секция «Наставничество в реальном времени» (порт `.mentorship`):
фото-фон — примитив `ui-section--photo` (T17.3, VI-инвариант — не голым
IMG): слой `__bg` несёт заливку primary и blend-фото (IMAGE fill
LUMINOSITY @ 40%), mask-фото справа — второй декоративный слой канона;
внутренняя сетка min-height 552px от lg (380/300 — ступени) и нижняя
rail-полоса карточек-тегов 108px с горизонтальным скроллом (отступ слева —
`max(container-pad, (100vw − container-max)/2)` со ступенями pad, скроллбар
скрыт):

```html
<section class="ui-section ui-section--photo msh" aria-labelledby="msh-title">
  <div class="ui-section__bg" aria-hidden="true">
    <img src="bg.jpg" alt="" width="1600" height="900" loading="lazy">
  </div>
  <div class="msh__photo" aria-hidden="true">
    <img src="photo.png" alt="" width="920" height="624" loading="lazy">
  </div>
  <div class="ui-container msh__inner">
    <h2 class="ui-h2 msh__title" id="msh-title">Наставничество…</h2>
    <p class="ui-lead msh__text">…</p>
  </div>
  <div class="msh__rail">
    <article class="msh__card">
      <h3 class="msh__card-title">…</h3>
      <img class="msh__card-thumb" src="thumb.png" alt="" width="88" height="68" loading="lazy">
    </article>
    <article class="msh__card msh__card--active">…</article>
  </div>
</section>
```

- Заголовок/текст — роли `ui-h2`/`ui-lead`; канон несёт override ролей
  оригинала (lh 1.3/1.25, ls −0.02em текста, 34px мобильной базы заголовка).
- Активная карточка — `msh__card--active` (is-active оригинала →
  BEM-модификатор, гейт префиксов слоя). Тон — хук `--msh-card-active-bg`:
  дефолт токен (`--ui-color-accent`), одобренный градиент E88A2C→D9A441
  (mentorship.css:90) — цветовая строка сайт-зоны (прецедент
  `--hro-tag-bg` T17.15).
- Постраничный скролл rail оригинала (JS) — не часть связки; канон несёт
  ленту со скроллом и состояние разметки.

### Капсула вакансий (vcp)

Плашка-пилюля «Найди своё призвание / свою команду» (порт
`.vacancy-capsule`): label — ссылка-заголовок blue-50 (fs 36px «как есть»),
btn — CTA-ссылка accent (80px от md); от md — строка по центру, на
мобильной базе — колонка stretch (радиусы складываются в пилюлю):

```html
<section class="ui-section vcp" aria-label="Капсула вакансий">
  <div class="ui-container vcp__inner">
    <a class="vcp__label" href="/vacancies">Найди своё призвание</a>
    <a class="vcp__btn" href="/vacancies">Все 144 вакансии
      <svg … aria-hidden="true">…</svg>
    </a>
  </div>
</section>
```

- Высота секции 176.5px оригинала — `min-height` «как есть» от md (border-box;
  прецедент hro — декларативные пропорции min-height); на мобильной базе
  секция от контента.
- Hover-пары (blue-100/accent-light) — под гвардом `(hover: hover)` (EPIC-4).

## Тёмная секция «why-us» (whu, T18.12)

Тёмная секция с фото-фоном и стеклянными карточками «Работа в „Интер РАО"»
(порт `.cp-why-us` career-portal — принятый рендер, батч ритма 01.11: блок
1350↔1350 байт-паритет): фото-фон — примитив `ui-section--photo` (T17.3,
**без оверлея** — on-dark текст несёт контент), top-зона «заголовок +
карточка 01» (429px от lg), ряд стеклянных карточек (blue-700) с
hover-раскрытием, панель вакансий **внутри секции** (build.py SLOTS).
Связка живёт в паттерн-слое (`dist/ui-patterns.css`, гейт префиксов
`whu`); значения — принятый пилот 1:1 с источниками `why-us.css` в
комментариях; мобильные базы — ступени оригинала, инвертированные
mobile-first (прецедент msh, T18.2):

```html
<section class="ui-section ui-section--photo whu" aria-labelledby="whu-title">
  <div class="ui-section__bg" aria-hidden="true">
    <img src="bg.jpg" alt="" width="1600" height="900" loading="lazy">
  </div>
  <div class="ui-container">
    <div class="whu__top">
      <h2 class="ui-h2 whu__title" id="whu-title">Работа в «Интер РАО»…</h2>
      <article class="whu__card">…</article>
    </div>
    <div class="whu__row">
      <article class="whu__card">…</article> …
    </div>
    <!-- Слот панели вакансий — контент секции (в пилоте
         cp-vacancy-search__wrap id="vacancies"; вынос — T18.16). -->
  </div>
</section>
```

| Слой | Что | Откуда |
|---|---|---|
| Секция | `.whu` — клип, ритм 140/80 «как есть» от lg (96/48 — мобильная база оригинала) | паттерн-слой, порт `.cp-why-us` (why-us.css:3/111) |
| Top-зона | `.whu__top` — flex space-between, gap/низ 36 «как есть»; база колонкой, строка от lg | паттерн-слой (why-us.css:23–28/108) |
| Top-карточка | `.whu__top .whu__card` — во всю ширину в базе, фикс 429px от lg | паттерн-слой (why-us.css:64/109) |
| Заголовок | `.whu__title` — max-width 894px, lh 1.3/ls −0.02em (override роли), on-dark | паттерн-слой (why-us.css:32–36) |
| Ряд | `.whu__row` — grid: колонка в базе, 3×1fr от lg (шаг 36 в базе / 12 от lg — принятый рендер), низ 144 «как есть» | паттерн-слой (why-us.css:40–42 + пилот) |
| Карточка | `.whu__card` — flex-колонка gap 36, min-height 320, padding 20, радиус md, заливка blue-700 (`--ui-color-surface-blue-deep`), текст on-dark | паттерн-слой (why-us.css:49–62) |
| Фото | `.whu__card-photo` — absolute-слой поверх заливки, cover; класс несёт `-photo` — vi.css img:off прячет (VI-инвариант) | паттерн-слой (why-us.css:68–75) |

- **Hover-раскрытие — CSS-канон без JS** (Implementation requirements
  T18.12 п.2): текст (`.whu__card-text` — max-height 0/opacity 0 в покое →
  220px/1 по hover), номер (`.whu__card-num` — круг 44px на стекле
  `--ui-color-glass-dark`) и фото (opacity 0.15) переключаются под гвардом
  `(hover: hover)` (EPIC-4). Раскрытие меняет только opacity/max-height —
  контент остаётся в a11y-дереве при любом состоянии (display:none/
  visibility:hidden не используются); переходы в VI-режиме гасит vi.css
  (`body.vi * { transition: none }`) — раскрытие мгновенно.
- **Панель вакансий — слот контента секции**: канон правила не несёт
  (панель — самостоятельное семейство `vacancy-search`: в пилоте
  `cp-vacancy-search__wrap id="vacancies"` — min-height 310, вынос —
  T18.16); ритм до панели ведёт margin-bottom 144px строки.
- **Мобильные базы — ступени оригинала** (why-us.css:108–115,
  инвертированы mobile-first): top колонкой и row колонкой ≤1023 — база,
  строка/3 колонки от lg (1024, шкала T2.5); top-карточка 429px от lg,
  во всю ширину в базе (гейт 32px-базы T3.6: 429px на 375 переполняет).
- **Заголовки**: у секции h2 → у карточек h3 (без пропуска уровня, гейт
  `irao/heading-order`); номера карточек — декоративные `span` с
  `aria-hidden="true"`.
- **Тёмная секция — on-dark-пары** (раздел выше): заголовок/карточки несут
  `--ui-color-text-on-dark`; текст карточки — роль `ui-small` (цвет
  наследует карточка — слой его не переобъявляет, дисциплина dpp__place).
- Миграция из пилота career-portal: разметка `cp-why-us*` → `whu`/`whu__*`
  (пара no-op `__inner` снята — вертикальных паддингов у `ui-container`
  нет), правила сняты из `pilot.css` (~130 строк + ступени 1023/767);
  панель `cp-vacancy-search__*` — сайт-зона остаётся (T18.16).

## Раскладки карусели «production» v1/v2 (prd, T18.13)

Раскладки карусели «Производство» (порт `.cp-production` career-portal —
блок 760↔760 байт-паритет errata 31.10 «приведи к оригиналу») поверх
компонента **`ui-carousel`** (T17.7): поведение слайдов (модуль в dist) и
вид элементов несёт компонент, слой несёт **раскладку секции** — позиции
фото/тела/стрелок/ленты, облик табов сайт-зоны и модификаторы вариантов.
Связка живёт в паттерн-слое (`dist/ui-patterns.css`, гейт префиксов
`prd`); значения — принятый пилот 1:1 с источниками `production.css` в
комментариях. Варианты — модификаторы оригинала: **`prd--v1`** (текст/
кнопка — абсолютные координаты макета от 1280, лента табов внизу) и
**`prd--v2`** (фото-центр + чипы сверху). Тон завода — оверлей `--tint`
примитива `ui-section--photo` (solid primary 90% — хук
`--ui-section-overlay-tint`, errata 31.10: `--glow`-градиент с z-index
auto замирал текст слайда):

```html
<section class="ui-section ui-section--photo prd prd--v1 ui-carousel"
         data-ui-carousel aria-labelledby="prd-title">
  <div class="ui-section__bg" aria-hidden="true">
    <img src="factory.jpg" alt="" width="1600" height="900" loading="lazy">
  </div>
  <div class="ui-section__overlay ui-section__overlay--tint" aria-hidden="true"></div>
  <img class="prd__photo ui-carousel__photo" src="worker.png"
       alt="Сотрудник на производстве" width="585" height="674"
       data-ui-carousel-photo loading="lazy">
  <div class="prd__body ui-carousel__body">
    <h2 class="prd__title ui-h2" id="prd-title" data-ui-carousel-title>Производство</h2>
    <p class="prd__text ui-lead" data-ui-carousel-text>…</p>
    <p><a class="ui-button ui-button--light prd__btn" href="/vacancies"
          data-ui-carousel-link>Подробнее о вакансии</a></p>
  </div>
  <button class="prd__arrow prd__arrow--prev ui-carousel__arrow" type="button"
          data-ui-carousel-prev hidden aria-label="Предыдущий слайд">…</button>
  <button class="prd__arrow prd__arrow--next ui-carousel__arrow" type="button"
          data-ui-carousel-next hidden aria-label="Следующий слайд">…</button>
  <script type="application/json" data-ui-carousel-slides>…</script>
  <ul class="prd__stepper ui-carousel__stepper" role="tablist"
      aria-label="Направления производства" hidden>
    <li role="presentation"><button class="prd__tab ui-carousel__tab" type="button"
        role="tab" aria-selected="true">
      <span class="prd__tab-num">1</span>
      <span class="prd__tab-body">
        <span class="prd__tab-title">Производство</span>
        <span class="prd__tab-count">25 вакансий</span>
      </span>
    </button></li>…
  </ul>
</section>
```

| Слой | Что | Откуда |
|---|---|---|
| Секция | `.prd` — flex, тело прижато к низу, клип, min-height 760, ритм погашен; тинт — хук `--tint` (solid primary 90%) | паттерн-слой, порт `.cp-production` (production.css:3-6/28) |
| Планка | `.prd::after` — белая спинка 17px под лентой, радиус сверху md, z 5 | паттерн-слой (production.css:189-200) |
| Фото | `.prd__photo` — absolute top 71/left 43.5%, contain к низу; скрыто до lg (ступень пилота, mobile-first) | паттерн-слой (production.css:40-45 + pilot.css:1928) |
| Тело | `.prd__body` — flex-колонка gap 24, max-width 545, padding 72/56, z 3 | паттерн-слой (production.css:55-64) |
| Типографика | `.prd__title`/`.prd__text` — 48/18px «как есть», on-dark (override ролей); `.prd__btn` — caption/uppercase (ls 0.01em оригинала не переносится — пин errata) | паттерн-слой (production.css:66-93) |
| Стрелки | `.prd__arrow[--prev/--next]` — 100×100 по краям, top 311, opacity .9→.6 под `(hover: hover)` | паттерн-слой (production.css:79-96/114) |
| Лента | `.prd__stepper` — absolute внизу во всю ширину, высота 82, табы вплотную; `> li` — display: contents | паттерн-слой (production.css:228-235/97-103) |
| Таб | `.prd__tab` — 20% ленты, заливка blue-100@30, без рамки; активный — 82px/радиус сверху/50%; номер — только у активного (круг 30) | паттерн-слой (production.css:130-163) |
| v1 | `.prd--v1` — от 1280: тело блок на всю секцию, текст/кнопка absolute (55/78/430/523), номер/тело таба −8px; скоуп модификатором — как в оригинале | паттерн-слой (production.css:202-249) |
| v2 | `.prd--v2` — min-height 740/stretch, фото left 22/top 72, тело вправо, шаги 26/24; чипы 59px radius 32 blur, заливка 50%, актив — primary-deep 90% + кольцо; чипы absolute справа сверху от lg, static-лента в базе | паттерн-слой (production.css:274-302/313) |

- **Поверх ui-carousel** (T17.7): контент-слоты (`__photo`/`__body` +
  роли `ui-h2`/`ui-lead`/`ui-button--light`) и контролы (стрелки/степпер
  с `hidden` — разметка правдива без JS), данные слайдов —
  `<script type="application/json" data-ui-carousel-slides>` (компонент
  не ходит в сеть). Слой не дублирует вид компонента: cursor/font-family/
  текст-выравнивание табов и display-переключение контролов
  (`is-initialized`) — из `ui-carousel.css`. Рамка табов канона компонента
  против заливок сайта — дельта канона REPORT §9.1 (PLAN P3-кандидат
  `ui-carousel__tab--bar`) — **НЕ** решается связкой (Implementation
  requirements T18.13 п.3 — отдельное решение владельца).
- **Варианты — модификаторы разметки**: v1 — `prd prd--v1` (index), v2 —
  `prd prd--v2` (index-2; в билде пилота ставит applyVariant2 — прецедент
  build.py:589 оригинала «--v1 → --v2»). Скоуп v1-координат модификатором
  снял артефакт пилота: блок @min-1280 был без скоупа и правила
  перебрасывало и на v2 index-2 (тело absolute, чипы растянуты) —
  рендер index (v1) при выносе не меняется.
- **v2-дельты оригиналу синхронизированы при выносе**: заливка чипов 50%
  (production.css:288 — в пилоте наследовалась база 30%), чипы ≤1023 —
  static-лента оригинала (production.css:313 — фиксированные 700px
  absolute пилота давали hscroll на 375), погашение bottom 0 ленты-базы.
- **Мобильная база**: фото слайда скрыто до lg (ступень пилота max-1023,
  инвертирована mobile-first); прочие лестницы оригинала
  (production.css:301-334) пилот не вёз — не переносятся.
- **VI-инвариант**: фото слайда — класс `__photo` (vi.css img:off прячет,
  прецедент whu/msh); фон секции — `__bg` примитива.
- Миграция из пилота career-portal: разметка `cp-production*` →
  `prd[--v1|--v2]`/`prd__*` (поведение и слоты — ui-carousel), правила
  сняты из `pilot.css` (~290 строк + ступень 1023); тинт — хук `--tint`
  на секции (errata 31.10).

## A11y

- Заголовок секции — h2 с ролью `ui-h2`; секция именована
  `aria-labelledby="…"`. Заголовки карточек — h3 (без пропуска уровня).
- Тёмная секция: контраст текста on-dark ≥ 4.5:1 — пары в контраст-гейте
  (`tests/contrast/pairs.config.mjs`), e2e дополнительно сверяет
  computed-цвета секции с токенами.
- Карточки-ссылки — паттерн T4.4 (заголовок-ссылка, естественный фокус);
  кнопки в футере карточек — `type="button"` (демо-действие сайта).

## Do / Don't

- **Do**: собирайте секцию по формуле «секция → контейнер → заголовок-роль →
  сетка карточек»; новый CSS — только связки ритма и фон секции (зона сайта).
- **Do**: для тёмной секции берите готовые on-dark-пары токенов и держите
  карточки светлыми.
- **Do**: для фото-фона берите примитив `ui-section--photo` — не собирайте
  абсолютный фон руками (z-пара/изоляция стекинга уже решены, T17.3).
- **Don't**: не тащите уникальный дизайн секций (герои, коллажи, анимации) в
  систему — это зона сайтов (Out of scope T8.3).
- **Don't**: не выдумывайте «тёмные» оттенки текста поверх тёмного фона —
  только пары `--ui-color-text-on-dark[-muted]` (контраст-гейт).
- **Don't**: не задавайте bleed-отступы пикселями (`-16px`/`-24px`) — только
  `calc(-1 * var(--ui-container-pad{,-md,-lg}))`, иначе расхождение с
  контейнером на каждой ступени.

## Bitrix-заметки

- Секция собирается в `template.php` включаемых областей или статичных
  страниц: каркас — копипаста формулы выше, контент — из инфоблоков
  (заголовок = `NAME` раздела/элемента, карточки — элементы списка).
- Связки `lsp-*` (ритм lead/сетки, фон тёмной секции, bleed, фокус на
  тёмном) перенесите в `template_styles.css` сайта — источник: `<style>`
  в [`landing-section.html`](landing-section.html), значения только токенами
  `--ui-*` (граница «система / сайт» — правило выше).
- Заголовок секции и `id` для `aria-labelledby` уникальны на странице:
  при выводе секции циклом добавляйте суффикс (`section-title-<?= $id ?>`).
- VI-режим (T9.1): тёмная секция перекрашивается темами модуля как все
  элементы (цветов вне токенов в связках быть не должно — инвариант §5);
  чек-лист проверки страниц в VI — README `ui-vi`.

## Тесты

- Юнит-пины контракта: `tests/unit/pattern-landing-section.test.js`.
- Юнит-пины лендинг-композиций (hro/mrq/mdl/cvh, тон-хук, синхронность
  дока и слоя, миграция пилота): `tests/unit/landing-compositions.test.js`.
- Юнит-пины наставничества и капсулы (msh/vcp, синхронность дока и слоя,
  гейт префиксов): `tests/unit/pattern-mentorship-capsule.test.js`.
- Юнит-пины тёмной секции why-us (whu, hover-раскрытие — CSS-канон,
  синхронность дока и слоя, миграция пилота): `tests/unit/pattern-why-us.test.js`.
- Юнит-пины раскладок карусели production (prd, поверх ui-carousel,
  синхронность дока и слоя, миграция пилота): `tests/unit/pattern-production.test.js`.
- Поверхность браузера (4 секции, computed on-dark-цвета, bleed-геометрия по
  вьюпортам, axe, адаптив, эталоны): `tests/e2e/pattern-landing-section.spec.js`.

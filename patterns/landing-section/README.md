# Паттерн «Landing-секция» (T8.3)

Правила сборки лендинг-секций из системных примитивов + mini-эталон из шести
секций (светлая / тёмная / с-изображением full-bleed / с-фото-фоном — T17.3 /
nav-карточки и лента логотипов — T17.9).
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

## Лента логотипов (lgo-grid/lgo-card, T17.9)

Сетка рамочных плашек «Популярные работодатели Группы» (порт
`.cp-employers__*` career-portal — типовой блок «партнёры/клиенты»): каркас
`ui-grid`, шаг 8px, ступени 4 (md) → 6 (lg), плашка — растянутый `img`
(ширина 100%, размеры атрибутами — гейт T4.6), радиус md, рамка
`--ui-color-border-muted`:

```html
<div class="ui-grid lgo-grid">
  <img class="lgo-card" src="logo-1.png" alt="Логотип работодателя"
       width="197" height="108" loading="lazy">
  …
</div>
```

- Плашка может быть `img` напрямую (канон пилота — логотипы с запечённой
  подложкой) или обёрткой над `img` — геометрия та же. Паддинги «как есть» —
  нулевые: плашка обнимает логотип.
- Подбор логотипов/альтернативные подписи — контент сайта; в оригинале
  marquee-анимации нет — статическая сетка (Out of scope T17.9).
- Миграция: `.cp-employers__grid` → `ui-grid lgo-grid`,
  `.cp-employers__card` → `lgo-card` (лестницы 1023/767 инвертированы в
  канон 768/1024; сравнение высот — порог ±4px, AC T17.9).

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
- Поверхность браузера (4 секции, computed on-dark-цвета, bleed-геометрия по
  вьюпортам, axe, адаптив, эталоны): `tests/e2e/pattern-landing-section.spec.js`.

# Паттерн «Landing-секция» (T8.3)

Правила сборки лендинг-секций из системных примитивов + mini-эталон из трёх
секций (светлая / тёмная / с-изображением full-bleed). Эталон целиком:
[`landing-section.html`](landing-section.html) — он же стенд
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
  карточки под фон — пары для «тёмной карточки» в системе нет.
- Одобренная альтернатива фона — `--ui-color-surface-dark` (= primary): её
  on-dark-пары тоже в гейте (`on-dark-on-surface-dark`); выбирайте одну пару
  на секцию и не смешивайте.

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
- **Don't**: не тащите уникальный дизайн секций (герои, коллажи, анимации) в
  систему — это зона сайтов (Out of scope T8.3).
- **Don't**: не выдумывайте «тёмные» оттенки текста поверх тёмного фона —
  только пары `--ui-color-text-on-dark[-muted]` (контраст-гейт).
- **Don't**: не задавайте bleed-отступы пикселями (`-16px`/`-24px`) — только
  `calc(-1 * var(--ui-container-pad{,-md,-lg}))`, иначе расхождение с
  контейнером на каждой ступени.

## Тесты

- Юнит-пины контракта: `tests/unit/pattern-landing-section.test.js`.
- Поверхность браузера (3 секции, computed on-dark-цвета, bleed-геометрия по
  вьюпортам, axe, адаптив, эталоны): `tests/e2e/pattern-landing-section.spec.js`.

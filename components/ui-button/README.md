# ui-button

Кнопка-действие: 4 варианта (primary, accent, light и «тихая»), 2 размера,
состояния disabled/loading. Кнопка — только для действий; переход по адресу —
`ui-link` (do/don't ниже).

## API

| Что | Значение |
|---|---|
| Блок | `.ui-button` на `<button>` — **`type` обязателен** (`button`/`submit`; умолчание submit — гейт html-validate `no-implicit-button-type`, warning) |
| Без модификатора | «тихая» кнопка каркаса career-portal (button-reset base.css:77): прозрачный фон, цвет текста |
| Модификатор `.ui-button--primary` | основное действие (pair `--ui-color-primary` / `--ui-color-text-on-dark`) |
| Модификатор `.ui-button--accent` | акцентное действие (pair `--ui-color-accent` / `--ui-color-text-on-dark`) |
| Модификатор `.ui-button--outline` | вторичное действие: рамка и текст primary на прозрачном |
| Модификатор `.ui-button--light` | действие на приглушённом фоне (pair `--ui-color-surface-muted` / `--ui-color-primary`) |
| Модификатор `.ui-button--text` | **текстовая кнопка** (T16.7) — действующее слово в текстовом контексте («Сбросить» фильтров, отмена, «очистить форму»): fs 14/400 (`--ui-fs-small` × `--ui-fw-body`), подпись `--ui-color-text-muted`, подчёркивание — маркер действия; фона, рамки и своей высоты нет (min-height сброшен — размер по строке, не 52px); hover/active — подпись primary на прозрачном |
| Модификатор `.ui-button--pill` | пилюля со стрелкой — CTA строки/карточки-ссылки (ниже — «Пилюля со стрелкой»); совместим с `.ui-button--sm` |
| Модификатор `.ui-button--round` | **круглая icon-кнопка** (T17.9) — диаметр `--ui-control-size` (20px), круг 50%, паддинг/высота-минимум базы сброшены; цветовая пара — токен-хуках `--ui-button-bg`/`--ui-button-color` (дефолт — primary/on-dark), hover/active пару не меняют (ниже — «Круглая кнопка») |
| Размер md | база: `min-height: var(--ui-button-height)` (52px) — модификатор не нужен |
| Размер `.ui-button--sm` | `min-height: var(--ui-button-height-sm)` (32px, ступень шкалы §3.2) |
| Паддинг | `12px 28px` — как `.btn` career-portal (components.css:71): вертикаль `--ui-space-3`, горизонталь `--ui-button-pad-inline` (28px вне шкалы отступов — перенос «как есть», прецедент `--ui-card-gap`; T14.3) |
| Паддинг sm | вертикаль уплотнена до `--ui-space-1` (иначе контент выше 32px и `min-height` не работает — ревью T4.2); **горизонталь sm не уплотняется**: наследует `--ui-button-pad-inline` (28px) — в одобренном макете кнопка одна, компактного inline-паддинга у неё нет (решение T14.3) |
| Элемент `.ui-button__label` | подпись; в `is-loading` остаётся в DOM (accessible name) |
| Элемент `.ui-button__icon` | инлайн-SVG: `aria-hidden="true"`, `focusable="false"`, цвета — `currentColor` в `fill`/`stroke`; размер 1em |
| Элемент `.ui-button__spinner` | декоративный (`aria-hidden="true"`); рисуется CSS на `currentColor` |
| Подчёркивание | **сброс подчёркивания якоря гарантируется**: `a.ui-button` (переход-выглядит-как-действие) рисуется без underline — `text-decoration: none` в базовом правиле, во всех состояниях (T16.2); **единственное исключение — `.ui-button--text`** (underline — осознанный маркер действия в тексте, T16.7); подчёркнутая ссылка — `ui-link` |
| Состояние disabled | **атрибут** `disabled` — не фокусируется и не кликается нативно |
| Состояние loading | класс `is-loading` + `aria-busy="true"` (ставит управляющий код формы/приложения) |
| JS | не требуется (CSS-компонент; переключение loading — за формой, T5.5) |
| Токены | `--ui-button-height(-sm)`, `--ui-button-height-pill`, `--ui-button-pill-icon-size(-sm)`, `--ui-button-pill-pad-inline(-sm)`, `--ui-button-pill-label-fs`, `--ui-button-pill-letter-spacing`, `--ui-button-pad-inline`, `--ui-button-border-width`, `--ui-control-size` (диаметр `--round`), `--ui-button-bg` / `--ui-button-color` (хуки пары `--round`), `--ui-opacity-disabled`, `--ui-color-surface-hover`, `--ui-color-surface-muted` (hover пилюли), пары `--ui-color-primary-hover` / `--ui-color-accent-hover`, focus-тройка ADR-0001 |

```html
<button class="ui-button ui-button--primary" type="submit">Отправить отклик</button>

<button class="ui-button ui-button--primary is-loading" type="submit" aria-busy="true">
  <span class="ui-button__spinner" aria-hidden="true"></span>
  <span class="ui-button__label">Отправить отклик</span>
</button>
```

## Варианты и состояния

- **default (hover)** — generic-правило под `@media (hover: hover)`:
  одобренная hover-поверхность `--ui-color-surface-hover` (blue-100 — та же,
  у light-варианта и hover карточек career-portal).
- **primary / accent (hover)** — пары одобренного дизайна:
  `--ui-color-primary-hover` (blue-700), `--ui-color-accent-hover`
  (accent-light) — значения макета не пересчитываются (ADR-0010).
- **outline (hover)** — одобренный макет: заливка primary, белая подпись;
  **light (hover)** — фон `--ui-color-surface-hover`.
- **text (T16.7)** — подпись muted (пара `muted-on-surface` контраст-гейта,
  6.19:1), подчёркивание сохраняется во всех состояниях; **hover/active** —
  подпись primary (пара `primary-on-surface`), фон остаётся прозрачным; цвет
  линии подчёркивания — как у текста (currentColor).
- **active** — одобренным дизайном не задан: `color-mix(in srgb, var(--ui-…)
  88%, black)` — конвенция T2.6/ADR-0010; тема пересчитывает сама.
- **focus-visible** — глобальная политика `base/focus.css` (ADR-0001):
  outline focus-тройки; компонент outline не заменяет.
- **disabled** — атрибут `disabled`; визуал — затемнение
  `--ui-opacity-disabled` (0.3 — единственный disabled-паттерн одобренного
  дизайна, career-portal components.css:269). Подпись disabled теряет
  контраст — сознательно: WCAG 1.4.3 исключает неактивные компоненты
  (исключение зафиксировано в e2e `KNOWN_AXE_EXCEPTIONS`).
- **loading** — `is-loading` + `aria-busy="true"`: спиннер виден,
  лейбл скрыт clip-path'ом, но остаётся в accessibility tree — **accessible
  name неизменен**; повторные клики мышью игнорируются (`pointer-events:
  none`). Границы: клавиатурные (Enter/Space) и программные активации CSS
  не отменяет — повторные отправки перехватывает управляющий модуль формы
  (T5.5) по `aria-busy`; сам компонент JS не содержит.

## Пилюля со стрелкой (`.ui-button--pill`)

Самый частый CTA оригинала career-portal (`.pill-btn`, REPORT §3.3:
«откликнуться →», «подробнее →»): компактная пилюля 44px, фон surface, рамка
1px primary, круглая иконка-стрелка в кружке primary (на hover — accent).
Пилот заменял её `ui-button--outline` (h52, рамка 2px) — CTA выходил тяжелее
и неузнаваемее макета.

- **Когда**: CTA строки списка (T14.10) и карточки-ссылки — короткое
  приглашающее действие с иконкой-стрелкой («откликнуться», «подробнее»).
- **Границы**: обычные действия форм и панелей — базовые варианты
  (primary/outline/…); pill — не «пятый цвет», а CTA-паттерн строк/карточек.
  Иконочные кнопки без лейбла — отдельная потребность (Out of scope T4.2).
- **Геометрия** (байт-канон probe-сверки T16.11): `--ui-button-height-pill`
  (44px — прецедент touch-токена пагинации), паддинг `0 6px 0 20px`
  (`--ui-button-pill-pad-inline` — перенос «как есть», pages.css:221),
  вертикаль 0, гэп 12px (`--ui-space-3`); кружок `--ui-button-pill-icon-size`
  (2rem) на обычном `__icon` — без нового элемента, доступное имя кнопки =
  лейбл; радиус пилюли — общий `--ui-radius-pill`.
- **Правило варианта**: кружок — primary (`--ui-color-primary`) со стрелкой
  `text-on-dark`; **accent — состояние hover** (свап под `@media
  (hover: hover)`, pages.css:250), не покой; hover пилюли — фон
  `--ui-color-surface-muted` (blue-50, pages.css:248).
- **Метка** (правило варианта, происхождение — uppercase-стиль варфрейма
  оригинала): fs 13 (`--ui-button-pill-label-fs`), fw-small,
  `text-transform: uppercase`, `letter-spacing: 0.04em`
  (`--ui-button-pill-letter-spacing`). Uppercase ставит CSS — текст в разметке
  остаётся строчным: локализация и скринридер читают исходный регистр.
  Применять с короткими глагольными CTA (одно-два слова): длинная подпись в
  uppercase+13px хуже читается.
- **С `--sm`**: комбинированный модификатор даёт компактную версию — высота
  sm-токена (32px), гэп 8 и паддинг `0 5px 0 16px`
  (`--ui-button-pill-pad-inline-sm`), кружок
  `--ui-button-pill-icon-size-sm` (1.875rem/30px — канон `.pill-btn--sm`,
  pages.css:254).
- **A11y**: стрелка `aria-hidden="true"` (декоративная), имя — лейбл;
  touch-цель 44px; контраст подписи primary/surface — пара outline
  (≥ 4.5:1); стрелка на primary — 12.58:1, на hover-кружке accent — 3.12:1 —
  графика ≥ 3:1 (WCAG 1.4.11, пара `on-dark-on-accent` гейта; как текст —
  известный разрыв кнопочных пар, T2.3/T2.6).

```html
<button class="ui-button ui-button--pill" type="button">
  <span class="ui-button__label">Откликнуться</span>
  <svg class="ui-button__icon" aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16">
    <path d="M2 8h11M9 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
  </svg>
</button>
```

## Круглая кнопка (`.ui-button--round`)

Круглая icon-кнопка — общий знаменатель круглых контролов (Notes T17.9:
стрелка пилюли T16.11, play T17.6, соц-кнопки шапки/подвала T17.13):
диаметр `--ui-control-size` (20px — как в одобренной nav-карточке
career-portal), круг 50%, `min-height`/`padding` текстовой базы сброшены
(прецедент `--text`).

- **Когда**: декоративный слот действия внутри карточки-ссылки (стрелка
  nav-карточки `lnk-card__action`, T17.9) или настоящий круглый контрол
  (соц-кнопки — T17.13). Интерактив один на композицию: если вся карточка —
  ссылка, стрелка — `aria-hidden`-span.
- **Пара — на хуках**: `--ui-button-bg` / `--ui-button-color` (дефолт —
  primary/on-dark); одобренные пары career-portal: accent/on-dark,
  surface/primary, primary/surface — контраст пары на совести сайта
  (do/don't — patterns/landing-section/README.md). Прецедент хука с
  дефолтом — `--ui-section-overlay-tint` (T17.3).
- **hover/active пару не меняют** (защитное переобъявление против
  generic-правил базы): одобренный дизайн круглой стрелки состояний не
  имеет; сайту с другой механикой — собственное правило поверх.
- **A11y**: как icon-only — контент кнопки обязан быть доступным иначе
  (имя несёт обёртка-ссылка с `aria-label` или сам контрол получает
  `aria-label`); стрелка-иконка — svg с `aria-hidden="true"`.

```html
<!-- Карточка-ссылка: интерактив один, стрелка декоративна (T17.9) -->
<a class="lnk-card lnk-card--navy" href="practices.html" aria-label="Подробнее: Стажировки и практики">
  …
  <span class="ui-button ui-button--round lnk-card__action" aria-hidden="true">
    <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16"><path d="M2 8h11M9 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
  </span>
</a>
```

## Клавиатура и a11y

- **Tab** — фокус; **Enter** и **Space** — нажатие (нативный `button`).
  Focus-visible — глобальная политика ADR-0001.
- **type обязателен**: `<button>` без type — submit (отправит чужую форму);
  гейт — html-validate `no-implicit-button-type` (warning).
- Accessible name — текст `__label` (или `aria-label`); при loading имя
  сохраняется (лейбл не удаляется и не получает `display:none`).
- Иконка — `aria-hidden="true"`, `currentColor`; цвет иконке задаёт подпись
  варианта, VI-перекраска (EPIC-9) работает сама.
- Контраст: primary/outline/light и все их hover/active ≥ 4.5:1 — e2e
  (`tests/contrast/lib.mjs`, сквозной с T2.3). **Известный разрыв**:
  белая подпись на accent — 3.12:1 (на hover accent-light — 2.91:1) —
  значение одобренного дизайна; изменение — design-decision владельца
  (исключение токен-уровня зафиксировано в `tests/contrast/pairs.config.mjs`
  с T2.6; ревизия производных — чек-лист T9.2).
- Размеры и текст в rem/min-height — 32px-база T3.6 растит кнопку вместе
  с текстом без горизонтального скролла.

## Do / Don't: действие против перехода

- **Do**: `<button class="ui-button ui-button--primary" type="submit">Отправить</button>`
  — действие на странице (отправка формы, отмена, раскрытие).
- **Do**: `<button class="ui-button ui-button--text" type="button">Сбросить</button>`
  — действующее слово в текстовом контексте (сброс фильтров, отмена, «очистить
  форму»): без фона и рамки, fs 14/400 muted, подчёркивание — осознанный
  маркер действия в тексте (T16.7); hover — primary, фокус-ring — общий
  (ADR-0001).
- **Don't**: `<a class="ui-link" href="#">Сбросить</a>` — действие в тексте
  под видом ссылки. Отличие от `ui-button--text` — семантика, а не вид:
  `ui-link` переходит по адресу (href), кнопка выполняет действие и
  активируется Enter/Space как `button`. Подчёркивание само по себе не
  делает элемент ссылкой.
- **Do**: `<button class="ui-button ui-button--outline" type="button" disabled>…</button>`
  — недоступное действие: именно атрибут `disabled`, не класс-имитация —
  скринридер объявит состояние, фокус и клики браузер выключит сам.
- **Don't**: `<a class="ui-link" href="#" onclick="…">Отправить</a>` —
  действие под видом ссылки: без JS не работает, Enter/пробел ведут себя
  по-разному, скринридер объявит «ссылку». (Обратный случай — «переход,
  который выглядит как кнопка» — легален: `ui-link--button`, дока:
  [ui-link](doc:ui-link).)
- **Don't**: `<div class="ui-button" role="button">` — не воспроизводит
  нативные фокус/клавиатуру/состояния; кнопка — тег `<button>`.
- **Don't**: кнопка-картинка без текста — icon-only требует `aria-label`
  (в системе отдельного модификатора пока нет — Out of scope T4.2; до него
  используйте текстовую подпись или `aria-label` на такой кнопке осознанно).
- **Don't**: двойная отправка «на честном слове» — при отправке формы ставьте
  `is-loading` + `aria-busy="true"` (и `disabled`, если повторное нажатие
  недопустимо семантически).

## Bitrix (шаблоны)

Класс ставится на `<button>` в `template.php`-шаблонах; `type` проставлять
явно (гейт warning). Состояние loading форм (T5.5) — класс + `aria-busy`
тем же управляющим кодом, что и валидация. Цвета едут из токенов: смена
темы (бренда) перекрашивает все варианты и их hover без правки разметки.

## Известные границы

- Контраст accent (3.12:1) и hover accent (2.91:1) — одобренный дизайн,
  не меняется без владельца; некстовый пол ≥ 3:1 запинен e2e, ревизия — T9.2.
- `pointer-events: none` в `is-loading` выключает только мышь; программный
  `el.click()` и клавиатура нативно активируют `button` — граница контракта
  с T5.5 (см. e2e-пин).
- Disabled-визуал — затемнение всей кнопки (opacity): отдельной пары
  «фон/текст disabled» в слое 2 нет (правило «слой 3/новые токены — когда
  двум сайтам понадобится различие»); заведение пар — minor с дефолтом.
- Анимация спиннера гасится глобальным kill-switch `prefers-reduced-motion`
  (base/reset.css) — пользователю остаётся aria-busy-состояние.

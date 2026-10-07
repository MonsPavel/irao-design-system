# ui-button

Кнопка-действие: 4 варианта одобренного дизайна career-portal (`.btn`), 2
размера, состояния disabled/loading. Задача T4.2 — **эталонный компонент**:
на нём отработан полный цикл компонентной задачи (тесты-first → реализация →
дока → visual-матрица → чек-лист CONTRIBUTING), который копируют остальные.
Кнопка — только для действий; переход по адресу — `ui-link` (do/don't ниже).

## API

| Что | Значение |
|---|---|
| Блок | `.ui-button` на `<button>` — **`type` обязателен** (`button`/`submit`; умолчание submit — гейт html-validate `no-implicit-button-type`, warning) |
| Без модификатора | «тихая» кнопка каркаса career-portal (button-reset base.css:77): прозрачный фон, цвет текста |
| Модификатор `.ui-button--primary` | основное действие (pair `--ui-color-primary` / `--ui-color-text-on-dark`) |
| Модификатор `.ui-button--accent` | акцентное действие (pair `--ui-color-accent` / `--ui-color-text-on-dark`) |
| Модификатор `.ui-button--outline` | вторичное действие: рамка и текст primary на прозрачном |
| Модификатор `.ui-button--light` | действие на приглушённом фоне (pair `--ui-color-surface-muted` / `--ui-color-primary`) |
| Размер md | база: `min-height: var(--ui-button-height)` (52px) — модификатор не нужен |
| Размер `.ui-button--sm` | `min-height: var(--ui-button-height-sm)` (32px, ступень шкалы §3.2) |
| Элемент `.ui-button__label` | подпись; в `is-loading` остаётся в DOM (accessible name) |
| Элемент `.ui-button__icon` | инлайн-SVG: `aria-hidden="true"`, `focusable="false"`, цвета — `currentColor` в `fill`/`stroke`; размер 1em |
| Элемент `.ui-button__spinner` | декоративный (`aria-hidden="true"`); рисуется CSS на `currentColor` |
| Состояние disabled | **атрибут** `disabled` — не фокусируется и не кликается нативно |
| Состояние loading | класс `is-loading` + `aria-busy="true"` (ставит управляющий код формы/приложения) |
| JS | не требуется (CSS-компонент; переключение loading — за формой, T5.5) |
| Токены | `--ui-button-height(-sm)`, `--ui-button-border-width`, `--ui-opacity-disabled`, `--ui-color-surface-hover`, пары `--ui-color-primary-hover` / `--ui-color-accent-hover`, focus-тройка ADR-0001 |

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
- **Do**: `<button class="ui-button ui-button--outline" type="button" disabled>…</button>`
  — недоступное действие: именно атрибут `disabled`, не класс-имитация —
  скринридер объявит состояние, фокус и клики браузер выключит сам.
- **Don't**: `<a class="ui-link" href="#" onclick="…">Отправить</a>` —
  действие под видом ссылки: без JS не работает, Enter/пробел ведут себя
  по-разному, скринридер объявит «ссылку». (Обратный случай — «переход,
  который выглядит как кнопка» — легален: `ui-link--button`.)
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

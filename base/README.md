# base/

База каскада: reset, `fonts.css`, `focus.css`, `typography.css`, container/grid. Почти неизменна — ритм изменений отличается от токенов.

- Можно: глобальные базовые стили; глобальная политика фокуса — только ADR-0001.
- Нельзя: hex (только токены `--ui-*`), стили конкретных компонентов, `!important`
  (исключения — строкой ниже).

## Что base делает глобально (T3.1; констрейнт №7 ADR-0008)

Страница, подключившая `ui-core.min.css`, получает два глобальных эффекта —
минимальный набор, осознанно безопасный для сайта в целом:

**`base/fonts.css` — шрифты Golos Text (T3.1, порт career-portal):**

- 6 `@font-face` — веса 400/500/600, каждый разбит на cyr/lat-грани через
  `unicode-range`; `font-display: swap` (текст не прячется на время загрузки).
  Браузер грузит только грани, реально нужные тексту страницы;
- `url()` — относительно корня дистрибутива: `fonts/` рядом с
  `ui-core.min.css` (в dist и на сайте в `/local/ui/{version}/` — структура
  повторяется, T1.3.2);
- файлы woff2 и текст лицензии SIL OFL (`OFL-LICENSE.txt`) — `assets/fonts/`,
  сборка копирует их в `dist/fonts/`;
- фолбэк при недоступности шрифта — стек `--ui-font-family` (Golos Text,
  Arial, Helvetica Neue, sans-serif): страница остаётся читаемой
  (e2e-сценарий блокировки — `tests/e2e/fonts.spec.js`);
- приоритетные грани (400/500 cyr — 90% русской страницы) препружаргружаются
  каркасом showcase и документированы в `bitrix/snippets/header-php.snippet.php`.

**`base/focus.css` — глобальная политика фокуса (T3.2, ADR-0001):**

- список селекторов «элемент + `:focus-visible`» — `a`, `button`, `input`,
  `select`, `textarea`, `summary`, `[tabindex]` — со специфичностью 0-1-1:
  видимый фокус побеждает legacy tag-правила вида `a { outline: none }`
  независимо от порядка подключения (ui-core грузится первым). «Почему так» —
  дока [«Focus visible: почему так»](../docs/ui-system/architecture/focus-policy.md);
- значения — focus-тройка токенов слоя 2 (`--ui-focus-color/width/offset`,
  T2.2): смена темы меняет фокус без правки `base/`;
- `:focus-visible` — только клавиатурный фокус, мышиный сознательно не
  подсвечивается; `outline-offset` — видимость на заполненных фонах;
- компоненты стилизуют фокус своими классами поверх этого минимума;
  `outline: none`/`0` без замены запрещён stylelint-гейтом (warning до конца
  EPIC-4, затем error);
- расширение списка новым интерактивным тегом — ответственность T3.2
  (процедура — в доке выше); e2e-поверхность — стенд `stands/base.html`
  (Tab-обход, legacy-атака, смена темы — `tests/e2e/focus.spec.js`).

**`base/reset.css` — безопасный reset (T3.1, порт career-portal):**

- `*, *::before, *::after { box-sizing: border-box }` — база для зон без
  legacy-конфликтов. Политика ADR-0002: **компонент объявляет свой box-sizing
  и не полагается на этот сброс** (legacy-сброс сайта подключён позже и
  побеждает равные универсальные селекторы);
- `[hidden] { display: none !important }` — атрибут `hidden` всегда сильнее
  любых display-правил (доступность скрытия без JS);
- `html { scrollbar-gutter: stable }` — сетка не сдвигается при появлении
  скролла;
- `img { display: block; max-width: 100% }`;
- ресет отступов: `body`, `h1, h2, h3, h4, p`, `ul, ol`;
- глобальный `prefers-reduced-motion` kill-switch — все анимации/переходы
  отключаются настройкой ОС.

Единственные `!important` вне `a11y/vi.css` — `[hidden]` и kill-switch в
`base/reset.css`: байты career-portal (без `!important` правила теряют смысл),
каждое помечено inline-disable с обоснованием; других нет — пин в
`tests/unit/fonts.test.js`.

## Файлы

| Файл | Статус | Что |
|---|---|---|
| `reset.css` | T3.1 | глобальный reset (выше) |
| `fonts.css` | T3.1 | @font-face Golos Text 400/500/600 × cyr/lat |
| `focus.css` | T3.2 | глобальная политика `:focus-visible` (ADR-0001) |
| `typography.css` | T3.3 | body-типографика, rem-шкала |

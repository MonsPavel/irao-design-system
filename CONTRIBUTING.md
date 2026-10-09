# CONTRIBUTING (черновик)

> Статус: обновлён в T1.4. Гейты линтеров работают (`npm run lint`), сборка
> работает (`npm run build`), e2e+axe-харнесс работает (`npm test`,
> `npm run test:docker` — tests/README.md); unit-слой — T1.6. Остальное
> исполняется ревью.

## Куда положить файл X

| Тип файла | Куда | Примечание |
|---|---|---|
| Примитив-токен (палитра, шкалы) | `tokens/primitives.css` | hex допустим **только** здесь |
| Смысловой токен `--ui-*` | `tokens/semantic.css` | только ссылки на примитивы (ADR-0009) |
| Базовый стиль (reset, шрифты, фокус, типографика, сетка) | `base/<файл>.css` | глобальная политика фокуса — ADR-0001 |
| Новый компонент | `components/ui-<name>/` | см. «Как добавить компонент» ниже |
| CSS компонента | `components/ui-<name>/ui-<name>.css` | БЭМ `ui-`, токены `--ui-*`, box-sizing на корне (ADR-0002) |
| Канонический HTML компонента | `components/ui-<name>/ui-<name>.html` | источник доки и тестов |
| JS компонента | `components/ui-<name>/ui-<name>.js` | копия `docs/templates/module-template.js` |
| Дока компонента (API, состояния, a11y) | `components/ui-<name>/README.md` | |
| A11y-модуль (ГОСТ vi) | `a11y/` | `!important` допустим **только** в `a11y/vi.css`; skip-link — не здесь, а компонент `components/ui-skip-link/` (T3.5) |
| Паттерн страницы (header, list-page…) | `patterns/<name>/` | HTML из готовых компонентов, без кода в dist |
| Тема бренда | `themes/theme-<company>.css` | только переопределение токенов `--ui-*` |
| Стенд компонента | `showcase/pages/<name>/` | расширенный стенд; базовый генерируется автоматически из паттерна (showcase/README.md) |
| Сниппет подключения Bitrix | `bitrix/snippets/` | см. `bitrix/integration-guide.md` |
| e2e/axe-тесты | `tests/e2e/`, `tests/a11y/` | привязка к стендам `showcase/pages/` |
| Unit-тесты JS (Vitest, T1.6) | определяется в T1.6 (в §7 каталога `tests/unit/` нет) | эталонный тест контракта шаблона — T1.6 |
| Скриншот-эталоны | `tests/visual/` | создаются только в контейнере (ADR-0004) |
| Архитектурные доки и ADR | `docs/`, `docs/adr/` | ADR — только новым решением |
| Шаблон JS-модуля | `docs/templates/` | не production-код |
| Негативная lint-фикстура | `tests/lint-cases/` | намеренно «кривой» файл; строка-ожидание в `tools/run-lint-cases.mjs`; из `npm run lint` исключён |

Правила каскада, действующие везде: hex только в `tokens/primitives.css`;
`!important` только в `a11y/vi.css` (единственные осознанные исключения —
`[hidden]` и reduced-motion kill-switch в `base/reset.css`: байты
career-portal, перенос T3.1, каждое помечено inline-disable с обоснованием);
правило ADR-0002: компонент объявляет свой `box-sizing: border-box` на корне
и не полагается на глобальный сброс `base/reset.css` — legacy-сброс сайта
подключён позже и побеждает равные универсальные селекторы; mobile-first,
`min-width` только из шкалы брейкпоинтов
(шкала и исключения — дока [«Адаптивный подход»](docs/ui-system/architecture/responsive-approach.md));
производные состояния без одобренного дизайна — `color-mix` над токеном слоя 2
(88% базовый + black, под `@media (hover: hover)`), hover-пары одобренного
дизайна — явные токены `--ui-color-primary-hover` / `--ui-color-accent-hover`
(ADR-0010); значения утверждённого дизайна career-portal не меняются
(отклонение — design-decision владельца дизайна).

## Гейты линтеров (с T1.2)

Команды: `npm run lint` — всё сразу (css → js → format → html);
`npm run test:lint` — прогон негативных фикстур `tests/lint-cases/`.
Оба должны быть зелёными в каждом PR. Что ловит машина:

| Гейт | Правило | Что запрещает |
|---|---|---|
| `stylelint.config.mjs` | `plugin/selector-bem-pattern` | классы вне БЭМ `ui-{block}__{elem}--{mod}`; `is-*`/`has-*` — только в цепочке с блоком (§2 «Namespace») |
| | `scale-unlimited/declaration-strict-value` | сырые цвета (hex/rgb/hsl) вне `var()`/`inherit`/`currentColor`/`transparent`/`color-mix()` — включая цветоносные шорткаты `background`/`border`/`outline` (expandShorthand) и `box-shadow`/`text-shadow` (значение — целостный `var()`-токен); hex разрешён только в `tokens/primitives.css` (§3.1) |
| | `declaration-property-value-allowed-list` | цветной кастом-проп (`--ui-color-*`) — ровно один токен: `var()`/`color-mix()`/`inherit`/`currentColor`/`transparent` (declaration-strict-value кастом-свойства не видит) |
| | `declaration-no-important` | `!important` вне `a11y/vi.css` (§1, принцип 4) |
| | `declaration-property-value-disallowed-list` | `outline: none`/`0` без замены — warning до EPIC-4, затем error (ADR-0001) |
| | `media-feature-name-disallowed-list` + `media-feature-name-value-allowed-list` + `irao/no-negated-min-width` (плагин `tools/stylelint/no-negated-min-width.mjs`) | media-запросы вне mobile-first шкалы (T2.5): viewport-фичи ширины/высоты запрещены, кроме `min-width` (в т.ч. `max-width` и range-синтаксис `width >= …`); значения `min-width` — только шкала `BREAKPOINTS` из конфига (§3.2); «not» перед `min-width` (`not (min-width: …)`, `not all and (…)`) запрещён — семантика «width < Npx», встроенная пара её не видит; неширинные фичи (`prefers-reduced-motion`…) не регулируются; исключение — только через ADR + override (дока «Адаптивный подход») |
| | `irao/no-primitive-token-references` (локальный плагин `tools/stylelint/no-primitive-token-references.mjs`) | ссылки на примитивы слоя 1 (`var(--ui-blue-800)`…) вне `tokens/` — компоненты читают только слой 2 (ADR-0009, T2.2); список семейств синхронизирован с primitives.css юнит-тестом |
| | `order/properties-order` | произвольный порядок свойств; `box-sizing` — сразу после токенов (ADR-0002) |
| `eslint.config.mjs` | `eqeqeq`, `no-implicit-globals`, recommended | `==`, глобальный scope (только `window.IraoUI.*`), ошибки; код компонентов — классический скрипт, tools — Node ESM, tests — jsdom |
| `prettier.config.mjs` + `.editorconfig` | — | разнобой стиля кода (проза `*.md` не форматируется) |
| `.htmlvalidate.js` | recommended + `wcag/h37`, `input-missing-label`, `irao/one-h1`, `irao/no-positive-tabindex` | невалидный HTML, img без alt, input без label, второй h1, `tabindex > 0` (§0, §5) |

Обязательства, которые линтер не увидит (исполняет ревью):

- **`/** @define <block> */` в начале CSS компонента** — без него файл
  выпадает из БЭМ-проверки сознательно (tokens/base/a11y/themes — не
  компоненты); забыли `@define` в компоненте — БЭМ-гейт молчит.
- Остаточные ограничения hex-гейта (исполняет ревью):
  - `color-mix()` и значения с `var()` внутри гейтятся «снаружи»: сырой цвет
    внутри `linear-gradient(var(--x), #fff)` или `color-mix(in srgb, var(--p), #fff)`
    regex не увидит — внутри функций цвета только из `var(--ui-*)`;
  - `box-shadow`/`text-shadow` проверяются по частям значения: тень — только
    целостный `var()`-токен (`box-shadow: var(--ui-shadow-md)`) либо `none`
    (легитимный сброс при active/hover); составные
    тени из сырых длин не проходят гейт сознательно — тени токенизированы
    (§3.2);
  - цветной кастом-проп — ровно один токен (значение сопоставляется целиком):
    составное значение оформляйте нецветным именем (`--ui-ring`, не
    `--ui-color-ring`) или переносите в слой токенов.
- HTML-паттерны — в стиле HTML5: void-элементы без слэша (`<meta>`, не
  `<meta />`) — `void-style` из recommended это и ловит.

### Как добавить негативную lint-фикстуру

1. Положите файл в `tests/lint-cases/` (для CSS-гейтов путь повторяет
   структуру репозитория: `css/components/...`, `css/tokens/primitives.css` —
   path-based исключения проверяются на тех же путях).
2. Добавьте строку-ожидание в `EXPECTATIONS` в `tools/run-lint-cases.mjs`:
   `{ file, tool, expect: 'fail', rules: [...] }` — с ожидаемым id правила
   (и severity, если оно warning), либо `expect: 'pass'` для позитивного
   контроля исключения.
3. `npm run test:lint` должен быть зелёным — это и есть тест конфигов.

## Граница «система / сайт» для контентных секций (итог EPIC-8)

Лендинг-секции (hero/holding/why-us и любые контентные блоки главной) —
**контентные, принадлежат сайтам**. Правило границы (спека T8.3, дока
[`patterns/landing-section/`](patterns/landing-section/README.md)):

> **Контент и уникальный дизайн секции — сайт; каркас (секция / сетка /
> типографика / карточки / кнопки) — система.**

- **Система даёт** готовый каркас без нового CSS: `ui-section`/`ui-container`/
  `ui-grid` (T3.4), роли типографики (T3.3), `ui-card`/`ui-tag`/`ui-button`/
  `ui-image` (EPIC-4), on-dark- и surface-пары токенов (контраст-гейт T2.3).
- **Сайт даёт** контент секции и уникальные декоративные приёмы (герой-блоки,
  коллажи, слайдеры, marquee) — связки в `template_styles.css`, значения —
  только токены `--ui-*`.
- **Не переносите** уникальный дизайн конкретных лендингов в `components/` —
  это зона сайтов (Out of scope EPIC-8). Если приём нужен нескольким сайтам —
  заявка на компонент/примитив (minor по бэклогу), а не правка паттерна.
- Сборка страниц — копипаста из паттернов `patterns/` («собери без нового
  CSS»): новые связки паттерна не попадают в dist (`<style>` стенда —
  showcase, не поставка; 02-architecture §7).

## Как добавить компонент

1. Создайте папку `components/ui-<name>/` — одна папка = один компонент
   (нейминг: существительное в единственном числе, kebab-case).
2. `ui-<name>.html` — канонический HTML-паттерн. Это источник правды: из него
   живёт документация, стенд и тесты. JS-хуки — только `data-ui-*` (ADR-0005).
3. `ui-<name>.css` — первой строкой `/** @define <name> */` (без префикса
   `ui-`: его добавит гейт; без этой строки файл выпадает из БЭМ-проверки),
   дальше БЭМ с namespace `ui-`, специфичность одного класса, состояния
   `is-*`; только токены `--ui-*`; `box-sizing: border-box` на корневом
   селекторе (ADR-0002); mobile-first.
4. Если нужна логика — `ui-<name>.js` по шаблону
   [`docs/templates/module-template.js`](docs/templates/module-template.js):
   замените три места «НАСТРОЙКА», контракт — ниже.
5. Добавьте имя компонента одной строкой в `COMPONENTS` в
   [`showcase/build.mjs`](showcase/build.mjs) — без него CSS не попадёт в
   `dist/ui-core.min.css` (сборка предупредит; JS `ui-<name>.js` подключается
   автоматически).
6. `README.md` компонента: API (классы, модификаторы, токены, data-атрибуты),
   состояния, a11y (клавиатура, ARIA), do/don't.
7. Базовый стенд генерируется автоматически из `ui-<name>.html`. Расширенный
   стенд — живые примеры всех состояний на 375/768/1440 — положите в
   `showcase/pages/<name>/index.html`: он заменит базовый (showcase/README.md).
8. Тесты: e2e-сценарий поведения и axe-проверка, привязанные к стенду —
   шаблон компонентного теста: `tests/README.md` (харнесс T1.4: `stand`,
   `a11y`, `shot`).

## Чек-лист новой компоненты (эталон — T4.2, ui-button)

Каждая компонентная задача проходит полный цикл; эталонный пример —
`components/ui-button/` (T4.2). Прежде чем выставлять PR на приёмку:

1. **Тесты first** (TDD): юнит-пин исполняемой формы решения
   (`tests/unit/<name>.test.js`) и e2e-сценарии (`tests/e2e/<name>.spec.js`)
   написаны ДО реализации и падают (красный шаг зафиксирован коммитом).
2. **Папка `components/ui-<name>/`**: `ui-<name>.css` (первая строка
   `/** @define <name> */`, box-sizing на корне — ADR-0002, только токены
   слоя 2, без `!important`/hex, `:hover` только под `@media (hover: hover)`);
   `ui-<name>.html` — канонический паттерн; `README.md` — API, состояния,
   a11y, do/don't, известные границы.
3. **Токены**: значения — из слоя 2; новый смысловой токен — minor
   (дефолт в `:root`, комментарий происхождения, строка в таблице диффов
   `docs/ui-system/architecture/tokens-career-portal-mapping.md`); новый
   ЦВЕТОВОЙ токен получает пару или исключение в
   `tests/contrast/pairs.config.mjs` (иначе `npm run test:contrast` красный).
4. **Подключение**: одна строка в `COMPONENTS` `showcase/build.mjs`.
5. **Стенд**: `showcase/pages/<name>/index.html` — матрица
   варианты × размеры × состояния; `data-ui-check-layout` — только если стенд
   входит в `CHECK_STANDS` гейта масштабирования (пин — scaling.test.js).
6. **e2e**: computed-стили состояний, поведение (клавиатура Tab/Enter/Space
   для интерактивных), axe на всём стенде (исключения — только списком
   `KNOWN_AXE_EXCEPTIONS` в спеке с обоснованием + таблица в
   `tests/README.md` при отключении правил харнесса), контраст сквозной
   с T2.3 (`tests/contrast/lib.mjs`), эталоны 375/768/1280/1440 —
   только из контейнера/CI (`npm run test:docker`, ADR-0003/0004).
7. **Гейты**: `npm run lint` зелёный; новые html-validate/stylelint-правила —
   с негативной фикстурой в `tests/lint-cases/` + строка в `EXPECTATIONS`
   `tools/run-lint-cases.mjs` (`npm run test:lint` зелёный).
8. **a11y-требования задачи** отмечены в AC файла задачи и исполнены
   (клавиатурный прогон, accessible name, контраст, семантика).

## Контракт JS-модуля (эталонный Vitest-тест — в T1.6)

Каждый модуль компонента обязан соответствовать; шаблон уже соответствует,
сценарии проверены фактически при T1.1 (node-симуляция window/document), а
физический Vitest-тест добавляется задачей T1.6:

1. **readyState-guard в обоих режимах:** при `readyState = 'loading'` init
   откладывается ровно одной подпиской на `DOMContentLoaded`; при `'complete'` /
   `'interactive'` (Bitrix `addJs(..., true)` кладёт скрипт в конец страницы)
   — вызывается синхронно, без подписки.
2. **Регистрация в `window.IraoUI`** под именем модуля — сразу, включая режим
   отложенной инициализации.
3. **Guard отсутствия элементов:** нет корневых элементов — тихий выход, без ошибок.
4. **try/catch вокруг инициализации инстансов:** ошибка одного инстанса уходит в
   `console.warn` и не мешает остальным инстансам и регистрации.
5. **Повторная инициализация запрещена:** повторный `init()` не создаёт дублей.
6. **Флаг инициализации — data-атрибут, не dataset:** `data-ui-<name>-init` через
   `setAttribute/getAttribute/removeAttribute`. Имена модулей пишутся в kebab-case
   (конвенция «Как добавить компонент»), а свойства `dataset` (DOMStringMap) дефисов
   не допускают: запись `dataset['uiSkip-linkInit']` бросает SyntaxError, которая
   ловится catch'ем как «ошибка инстанса», при этом слушатель уже навешан — повторный
   `init()` вешает дубли. Эталонный тест T1.6 обязательно включает кейс дефисного имени.

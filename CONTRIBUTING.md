# CONTRIBUTING (черновик)

> Статус: обновлён в T1.2. Гейты линтеров работают (`npm run lint`), сборка —
> T1.3, тестовый харнесс — T1.4/T1.6. До T1.3/T1.6 остальное исполняется ревью.

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
| A11y-модуль (ГОСТ vi, skip-link) | `a11y/` | `!important` допустим **только** в `a11y/vi.css` |
| Паттерн страницы (header, list-page…) | `patterns/<name>/` | HTML из готовых компонентов, без кода в dist |
| Тема бренда | `themes/theme-<company>.css` | только переопределение токенов `--ui-*` |
| Стенд компонента | `showcase/pages/<name>/` | тот же HTML, что в доке и тестах |
| Сниппет подключения Bitrix | `bitrix/snippets/` | см. `bitrix/integration-guide.md` |
| e2e/axe-тесты | `tests/e2e/`, `tests/a11y/` | привязка к стендам `showcase/pages/` |
| Unit-тесты JS (Vitest, T1.6) | определяется в T1.6 (в §7 каталога `tests/unit/` нет) | эталонный тест контракта шаблона — T1.6 |
| Скриншот-эталоны | `tests/visual/` | создаются только в контейнере (ADR-0004) |
| Архитектурные доки и ADR | `docs/`, `docs/adr/` | ADR — только новым решением |
| Шаблон JS-модуля | `docs/templates/` | не production-код |
| Негативная lint-фикстура | `tests/lint-cases/` | намеренно «кривой» файл; строка-ожидание в `tools/run-lint-cases.mjs`; из `npm run lint` исключён |

Правила каскада, действующие везде: hex только в `tokens/primitives.css`;
`!important` только в `a11y/vi.css`; `box-sizing: border-box` на корне каждого
компонента (ADR-0002); mobile-first, `min-width` только из шкалы брейкпоинтов;
значения утверждённого дизайна career-portal не меняются (отклонение —
design-decision владельца дизайна).

## Гейты линтеров (с T1.2)

Команды: `npm run lint` — всё сразу (css → js → format → html);
`npm run test:lint` — прогон негативных фикстур `tests/lint-cases/`.
Оба должны быть зелёными в каждом PR. Что ловит машина:

| Гейт | Правило | Что запрещает |
|---|---|---|
| `stylelint.config.mjs` | `plugin/selector-bem-pattern` | классы вне БЭМ `ui-{block}__{elem}--{mod}`; `is-*`/`has-*` — только в цепочке с блоком (§2 «Namespace») |
| | `scale-unlimited/declaration-strict-value` | сырые цвета (hex/rgb/hsl) вне `var()`/`inherit`/`currentColor`/`transparent`/`color-mix()`; hex разрешён только в `tokens/primitives.css` (§3.1) |
| | `declaration-no-important` | `!important` вне `a11y/vi.css` (§1, принцип 4) |
| | `declaration-property-value-disallowed-list` | `outline: none`/`0` без замены — warning до EPIC-4, затем error (ADR-0001) |
| | `order/properties-order` | произвольный порядок свойств; `box-sizing` — сразу после токенов (ADR-0002) |
| `eslint.config.mjs` | `eqeqeq`, `no-implicit-globals`, recommended | `==`, глобальный scope (только `window.IraoUI.*`), ошибки; код компонентов — классический скрипт, tools — Node ESM, tests — jsdom |
| `prettier.config.mjs` + `.editorconfig` | — | разнобой стиля кода (проза `*.md` не форматируется) |
| `.htmlvalidate.js` | recommended + `wcag/h37`, `input-missing-label`, `irao/one-h1`, `irao/no-positive-tabindex` | невалидный HTML, img без alt, input без label, второй h1, `tabindex > 0` (§0, §5) |

Обязательства, которые линтер не увидит (исполняет ревью):

- **`/** @define <block> */` в начале CSS компонента** — без него файл
  выпадает из БЭМ-проверки сознательно (tokens/base/a11y/themes — не
  компоненты); забыли `@define` в компоненте — БЭМ-гейт молчит.
- `color-mix()` гейтится только снаружи: аргументы внутри вызова должны быть
  из `var(--ui-*)` (производные состояния, §3.2).
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
5. `README.md` компонента: API (классы, модификаторы, токены, data-атрибуты),
   состояния, a11y (клавиатура, ARIA), do/don't.
6. Стенд в `showcase/pages/<name>/`: живые примеры всех состояний на 375/768/1440.
7. Тесты: e2e-сценарий поведения и axe-проверка, привязанные к стенду
   (харнесс подключается в T1.4/T1.6 — до тех пор сценарии фиксируются
   текстом в README стенда).

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

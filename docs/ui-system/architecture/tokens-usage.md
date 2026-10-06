# Как пользоваться токенами irao-ui (слои 1–2, ADR-0009)

> Деливерабл T2.2 (DoD: «дока "Как пользоваться токенами"»). Исполняемые
> контракты: tests/unit/tokens-semantic.test.js, tests/unit/tokens-stand.test.js;
> стенд: `npm run build && npm run serve` → `/showcase/dist/stands/tokens.html`.

## Два слоя

| Слой | Файл | Что это | Кто читает |
| --- | --- | --- | --- |
| 1 — примитивы | `tokens/primitives.css` | «Сырая» палитра: `--ui-blue-800`, `--ui-gray-300`… Единственное место системы с hex. | **только** слой 2 |
| 2 — семантика | `tokens/semantic.css` | Смысловой API: `--ui-color-primary`, `--ui-fs-h1`, `--ui-space-4`… | компоненты, base, темы |

Правило (ADR-0009): **компонент читает только слой 2.** Прямая ссылка на
примитив из компонента запрещена и ловится stylelint-правилом
`irao/no-primitive-token-references` (error; исключение — каталог `tokens/`):
позитивный контроль `tests/lint-cases/css/tokens/semantic.css`, негативный —
`tests/lint-cases/css/components/ui-button/primitive-ref.css`, прогон —
`npm run test:lint`. Зачем: тема переопределяет семантику и всё
перекрашивается каскадом; компонент, читающий примитив, тему не услышит.

Слой 3 (компонентные токены `--ui-button-height`…) не заводится без
доказанной потребности двух сайтов в разных значениях (ADR-0009).

## Типографика: rem и mobile-first лестница

- Все `--ui-fs-*` в **rem**, база 16px на `html` (установит `base/reset`, T3.1;
  до T3.1 действует браузерный дефолт 16px). `line-height` — безразмерные
  множители. Это основа требования «увеличение шрифта не ломает вёрстку»
  (T3.6): при `html { font-size: 32px }` масштабируется вся страница.
- Роль = тройка: `--ui-fs-h1` / `--ui-lh-h1` / `--ui-fw-h1`. Роли §3.2:
  h1–h6, lead, body, small, caption, micro. Комбинации career-portal
  `body-bold` / `small-regular` — пары «роль × вес» (`body` × `--ui-fw-*` 500).
- Лестница mobile-first: **база = мобильные значения** career-portal
  (≤767: h1 34/2.125rem…), переопределения в `tokens/semantic.css`:
  `@media (min-width: 768px)` (из 1023-правила: h1 48…) и
  `@media (min-width: 1024px)` (десктоп variables.css: h1 80…).
  Брейкпоинты — константы 768/1024 из шкалы §3.2 (линтер шкалы — T2.5), не переменные.
- Отклонение от career-portal (запись в таблице диффов): промежуточный шаг
  `@media (max-width: 1439px)` (h1 64/h2 48/h3 36) и паддинг 40px ≥1440
  не перенесены — спека T2.2: «рост к lg», паддинги 16/24/32.
  Перенос — design-decision владельца дизайна.

## Отступы, радиусы, тени, z-index, переходы

- Отступы — только шкала `--ui-space-1..8` (4/8/12/16/24/32/48/64 → rem),
  произвольные значения не используются (§3.2).
- Радиусы: `--ui-radius-{none,sm,md,lg,pill}` (= none/8/16/24/100 career-portal);
  рамки: `--ui-border-width: 1px`, `--ui-border-color` (карточка #D6D6D6).
- Тени: `--ui-shadow-{sm,md,lg}` + семантический `--ui-shadow-card`;
  геометрия в rem, цвет — примитивы-альфы (`--ui-blue-800-10/16`):
  md = тень карточки career-portal `0 12px 32px`, lg = тень dropdown `0 16px 40px`.
- Z-лестница: dropdown 70 → sticky 100 → header 150 → overlay 200 → modal 300 →
  vi 400 (фиксирует «плавающие» 70/200 career-portal; vi поверх всего по ГОСТ).
- Переходы: `--ui-transition-fast/base/slow` (0.15/0.25/0.4s ease).

## Focus (ADR-0001)

Тройка `--ui-focus-color / --ui-focus-width / --ui-focus-offset`
(= primary, 3px, 2px — значения career-portal pages.css:52). Глобальное
правило фокуса появится в `base/focus.css` (T3.2); компоненты не отключают
outline без замены (stylelint, warning до EPIC-4). Ширина/смещение фолбэка —
в px сознательно: волосяная геометрия, не влияет на layout при зуме;
видимость фокуса при 32px-базе проверяется сценарием T3.6.

## Темы и обратная совместимость

Тема = файл переопределения ТОЛЬКО семантических токенов под
`[data-ui-theme="…"]` (T2.4). Новый семантический токен — minor-версия
с дефолтом в `:root`; переименование/удаление — major (ADR-0007/0009).
Примитивы темы не переопределяют.

## Стенд и проверки полноты

- Стенд «Токены» генерируется из файлов токенов (`showcase/tokens-stand.mjs`,
  запуск — `npm run build`), ручное редактирование запрещено: новый токен
  появляется сам.
- Полнота «узлов стенда = токенов файлов» и порядок каскада dist
  (primitives → semantic) — `tests/unit/tokens-stand.test.js`
  (`npm run test:unit`, прогоняет реальную сборку).
- Сценарий `html { font-size: 32px }` (AC T2.2) гоняется по собранной
  странице (до харнесса T1.4 — вручную в браузере): страница не даёт
  горизонтального переполнения на 1280 и 375, таблицы стенда скроллятся
  внутри обёртки; проверено 2026-10-06 (Playwright, chromium):
  `tokenNodes: 142`, `horizontalOverflow: false` на обоих вьюпортах,
  вычислимость var-цепочек: `--ui-color-primary` → rgb(0, 40, 86),
  `--ui-fs-h1` = 160px при 32px базе. В T1.4 сценарий переезжает в
  `tests/e2e/` как постоянный гейт.
- Контраст пар «смысл → фон» — обязательный CI-гейт AA (T2.3):
  `npm run test:contrast` (`tests/contrast/check.mjs` + конфиг пар
  `tests/contrast/pairs.config.mjs`); нарушенный порог или цветовой токен
  слоя 2 без пары/исключения делают прогон красным. Как работает и как
  добавлять пары/исключения — [tests/contrast/README.md](../../../tests/contrast/README.md);
  правки значений против career-portal (muted, tag-orange, error) — таблица
  «AA-замены» в [tokens-career-portal-mapping.md](tokens-career-portal-mapping.md).

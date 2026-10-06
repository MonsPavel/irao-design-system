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

## Производные состояния: hover-пары и color-mix (T2.6, ADR-0010)

- **Стандарт состояний, которых дизайн не задавал** (active, hover-производные
  outline/light-вариантов), — `color-mix` над токеном слоя 2:
  `color-mix(in srgb, var(--ui-color-…) 88%, black)` (конвенция 88% базовый +
  black). Hover-правила — под `@media (hover: hover)`. Браузер вычисляет mix в
  момент рендера, поэтому **тема меняет такие производные автоматически**.
  Fallback — прозрачная деградация: браузер без color-mix (Chromium 111+ /
  Firefox 113+ / Safari 16.2+ ниже) отбрасывает объявление и состояние остаётся
  базового цвета; фолбэк-строки с ручными цветами не пишутся.
- **Исключение — hover-значения одобренного дизайна**: `--ui-color-primary-hover`
  (btn--primary:hover = blue-700 `#164b89`, components.css:80) и
  `--ui-color-accent-hover` (btn--accent:hover = accent-light `#f37131`,
  components.css:83) — явные токены-пары слоя 2; color-mix их значение не
  заменяет (одобренный визуал не пересчитывается). Пара за `--ui-color-primary`
  автоматически не следует — **тема переопределяет её явно** вместе с базовым
  токеном (или осознанно оставляет). Новый явный hover-токен — только через
  ревью-гейт (п.4 ADR-0010).
- Контраст производных состояний — чек-лист T9.2 (крупные элементы ≥ 3:1 в
  hover); до ревизии hover-пары — осознанные исключения контраст-гейта
  (`tests/contrast/pairs.config.mjs`, с числами).
- Живое демо и e2e: секция «Производные состояния» стенда «Токены» +
  `tests/e2e/derived-states.spec.js` (hover computed-style до/после смены
  темы). Эталонный потребитель — ui-button (T4.2): hover из пар, active —
  color-mix.

## Темы и обратная совместимость (T2.4)

Тема = файл переопределения ТОЛЬКО семантических токенов под
`[data-ui-theme="…"]` в `themes/` (файл из `dist/themes/`, подключается после
core, до CSS сайта). Атрибут `data-ui-theme` вешается на `<html>` (фиксация
T2.4; переключатель `?theme=` на всех стендах showcase, сниппет T11.1 — так же).
Механизм доказан синтетической `themes/theme-test.css`: 6 переопределений
(primary → purple-900, accent → peach-300, surface-muted → peach-100,
focus-color → orange-400, radius-md → 0.25rem, shadow-card → lg) меняют вид
без правки классов и HTML. Факт (chromium, 2026-10-06): `?theme=test` на
стенде «Токены» — computed `--ui-color-primary` `#002856 → #511d59`,
`--ui-color-surface-muted` `#f1f5fe → #ffd3b7`, `--ui-radius-md` `16px → 4px`,
производный `--ui-color-surface-dark` следует за primary, не переопределённые
токены (`--ui-color-info` и др.) не меняются; смена select'ом работает и без
перезагрузки (скриншот прогона — артефакт, эталоны по ADR-0004 пишутся только
в контейнере; постоянный e2e-гейт — T1.4).

Правило обратной совместимости: **новый семантический токен — minor-версия
с дефолтом в `:root`**; переименование/удаление — major (ADR-0007/0009).
Старая тема не знает новый токен и работает дефолтом — проверено фикстурой
`tests/lint-cases/css/themes/theme-old-compat.css` («старая» тема из трёх
токенов + core с более поздними `--ui-color-info*`): юнит-тест
`tests/unit/themes.test.js` (каскад вычислим для каждого токена слоя 2,
`--ui-color-info` даёт дефолт) и браузерная проверка на стенде.

Гейт тем (stylelint `irao/theme-semantic-overrides`, включён только для
каталога `themes/`): один блок `[data-ui-theme="…"]`, только кастом-свойства,
имена — из слоя 2 (примитивы не переопределяются, опечатки и новые имена
невозможны); значения (исполнимая форма, ревью T2.4): цветовые токены — ровно
один `var()`, теневые — целый `var()`/`none` (сырой rgba/hex в тени ловится
гейтом — tests/lint-cases/css/themes/theme-shadow-raw.css), прочие
неколоровые — без сырых цветов (длины разрешены: `--ui-radius-md: 0.25rem`).
Тестовая тема контраст-гейт AA
(T2.3) не проходит сознательно — она синтетическая и не поставляется
(исключение в шапке `tests/contrast/pairs.config.mjs`); кейс локального
переопределения токенов сайтом — `bitrix/integration-guide.md` (черновик).
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

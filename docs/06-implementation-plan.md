# Implementation Plan irao-ui

Execution-план разработки по утверждённой архитектуре ([02-architecture.md](02-architecture.md)); фазировка — [03-roadmap.md](03-roadmap.md), решения Phase 0 — [05-mvp-risks.md](05-mvp-risks.md)). Архитектура не пересматривается; обнаруженные при детализации уточнения вынесены в раздел 1 явно. Итоговый backlog, итерации и граница MVP — [07-execution.md](07-execution.md).

Поток разработки (принцип §1 исходного ТЗ, с одной поправкой: тестирование встроено в каждый шаг, а не идёт после документации — иначе TDD невозможен):

```text
Foundation → Tokens → Base/Typography → Primitives → Forms
     → Navigation/Interactive → Complex → Layout patterns
     → A11y hardening → Documentation → Bitrix Integration → Release
```

---

## 1. ⚠️ Уточнения к утверждённой архитектуре — ПРИНЯТЫ 2026-10-05

Три уточнения реализации, без которых план невыполним в среде legacy-Bitrix. Приняты пользователем, внесены в [02-architecture.md](02-architecture.md) (§1, §2, §5, §9) и оформлены ADR-журналом в [adr/](adr/). Ниже сохранена исходная мотивация решений.

### ⚠️ Architecture issue 1 — специфичность глобального focus-правила — ✅ ADR-0001, внесено в 02 §1/§5

- **Problem:** В architecture §5 предложено `:where(a, button, …):focus-visible { … }`. `:where()` даёт нулевую специфичность, а наш CSS подключается **первым**. Любой legacy-стиль вида `a { outline: none }` (специфичность 0-0-1, подключён позже) победит наше правило — фокус пропадёт на целых страницах.
- **Why it matters:** keyboard-доступность — P0-требование; поломка будет массовой и незаметной для мышиных пользователей.
- **Recommended correction:** писать политику фокуса списком plain-селекторов `a:focus-visible, button:focus-visible, input:focus-visible, …` (специфичность 0-1-1 каждая) — они побеждают tag-level legacy-правила независимо от порядка подключения. Односелекторная философия не нарушается: это элемент+псевдокласс, не классовый каскад. Исключение (осознанное) из правила «стилизуем только классы».

### ⚠️ Architecture issue 2 — выживание компонентов под legacy-сбросами (`box-sizing`, `*`-правила) — ✅ ADR-0002, внесено в 02 §1/§2

- **Problem:** Legacy-сайты содержат `* { box-sizing: content-box }` / агрессивные универсальные ресеты, подключённые позже нашего CSS. Универсальный сброс системы (`*, *::before { box-sizing: border-box }`) проиграет по порядку каскада, и геометрия ui-компонентов развалится.
- **Why it matters:** это самый вероятный источник «у вас кнопка кривая» при интеграции на реальный сайт.
- **Recommended correction:** каждый компонент объявляет `box-sizing: border-box` на своём корне и внутренних элементах с размерами (одна строка на компонент, включена в шаблон новой компоненты). Плюс общее правило в base для случаев без legacy. Аналогично: компоненты **не зависят** от element-стилей base (body-шрифт и т.п.) для своей корректности — класс компонента полностью определяет свой вид.

### ⚠️ Architecture issue 3 — visual-регрессия и рендеринг шрифтов на разных ОС — ✅ перерешено 2026-10-05: ADR-0004 (заменил ADR-0003), внесено в 02 §9/§10

- **Problem:** Скриншот-эталоны Playwright не совпадают между Windows (локальная машина разработчика) и Linux (CI-раннер) из-за разного шрифтового рендеринга — «ложные» диффы.
- **Why it matters:** если эталоны создаёт разработчик локально, CI красный постоянно; если CI — у разработчика. Гейт теряет доверие за неделю.
- **Recommended correction:** эталоны создаёт и обновляет **только CI** (Linux-раннер). Локальный запуск — в режиме `--update-snapshots` с пометкой «не коммитить эталоны с локальной машины» (проверка в CI: диф эталонов от не-Linux машины отклоняется). Альтернатива для точности — Docker-раннер и локально, вводится позже без изменения плана.

  **Итог обсуждения (2026-10-05):** решение смягчено — принят [ADR-0004](adr/0004-visual-baselines-container.md): единый Playwright-контейнер локально и в CI (эталоны свободно создаются локально в контейнере через `test:docker`), CI-джоба `update-snapshots` остаётся fallback'ом, path-защита/CODEOWNERS не вводятся; гейт advisory до v1.0, mandatory — с заморозки компонентного набора (Iteration 10). Исходный вариант сохранён выше как история (ADR-0003, заменён).

---

## 2. Обзор эпиков

Соответствие фазам roadmap — в скобках. Детальные задачи — раздел 3. Тестирование и accessibility не вынесены в отдельные эпики: они встроены в DoD каждой задачи (принцип §9 ТЗ); исключение — EPIC-9 (VI-модуль — это поставляемый продукт) и EPIC-1 (тестовая инфраструктура).

| # | Epic | Фаза | Objective (кратко) |
|---|---|---|---|
| 1 | Foundation & Tooling | 1 | Репозиторий и конвейер, делающие каждый следующий шаг дешёвым |
| 2 | Design Tokens | 2 | Два слоя токенов + механизм тем, контраст AA |
| 3 | Base & Typography | 3 | Безопасный глобальный фундамент + типографика rem |
| 4 | Primitive Components | 3 | P0-компоненты общего назначения |
| 5 | Forms | 4 | Полный контур форм с PE-валидацией и серверными ошибками |
| 6 | Navigation & Interactive | 5 | Dropdown, tabs, accordion, pagination |
| 7 | Complex Components | 5 | Modal, custom select, table, loader, оверлей-паттерны |
| 8 | Layout & Page Patterns | 6 | «Собери страницу из кубиков» |
| 9 | Accessibility (VI) | 3/7 | VI-модуль ГОСТ + hardening-спринт |
| 10 | Documentation | 8 | Showcase полный, гайды, contribution |
| 11 | Bitrix Integration | 9 | Сниппеты, legacy-констрейнты, пилоты A/B, upgrade |
| 12 | Release & Versioning | 10 | Пайплайн релизов, политика поддержки, v1.0 |

---

## 3. Эпики и задачи

Формат каждой задачи: Goal / Context / Tests first (для тестируемых) / Implementation / Acceptance Criteria / Dependencies / Definition of Done / Complexity. Общие DoD-инварианты всех компонентных задач (не повторяются в каждой): stylelint+eslint чистые; стенд компонента в showcase; visual-эталон (создан CI); axe без нарушений на всех состояниях стенда; клавиатурный прогон чист; доки по шаблону §8 architecture. Accessibility-требования перечисляются в AC конкретных компонентов (§9 ТЗ).

### EPIC-1 — Foundation & Tooling (Phase 1)

**Objective:** за одну итерацию получить конвейер, в котором любой компонент пишется «в тесте» с первого дня.
**Scope:** скелет репо, линтеры, сборка dist+showcase, Playwright+axe+Vitest-харнесс, CI с гейтами.
**Dependencies:** нет.
**Expected outcome:** PR с тестовым компонентом проходит lint → build → unit → e2e+axe → visual; showcase задеплоен на Pages.
**Risks:** over-engineering tooling (митигация: только esbuild+stylelint+eslint+prettier+html-validate+playwright+vitest, ничего сверх); ловушка issue-3 про эталоны (решение выше).
**Definition of Done:** конвейер зелен на демо-PR; README «Как добавить компонент».

#### T1.1 [TASK] Скелет репозитория и шаблон JS-модуля

- **Goal:** структура из architecture §7 + конвенции, исключающие споры «как правильно».
- **Context:** каталоги tokens/base/components/a11y/patterns/themes/showcase/bitrix/docs/tests; npm-скрипты-заглушки.
- **Implementation:**
  1. создать дерево каталогов с .gitkeep и README в каждом (назначение);
  2. зафиксировать шаблон JS-модуля: IIFE, регистрация в `window.IraoUI`, init с guard `if (document.readyState !== 'loading') init(); else DOMContentLoaded…` (защита от поздней загрузки в Bitrix, см. architecture §6);
  3. CONTRIBUTING-заготовка: нейминг, где что лежит, чек-лист новой компоненты;
  4. `.gitignore`, editorconfig.
- **Acceptance Criteria:**
  - структура соответствует architecture §7;
  - шаблон модуля скопирован в `docs/templates/module-template.js`, содержит readyState-guard и guard отсутствия элементов;
  - README корня отвечает «что это / как собрать / куда смотреть» за 2 минуты.
- **Dependencies:** нет.
- **Definition of Done:** смёржено; следующий таск стартует с чистого листа.
- **Complexity:** M

#### T1.2 [TASK] Линтеры: stylelint (БЭМ + запрет hex вне tokens), eslint, prettier, html-validate

- **Goal:** архитектурные правила исполняет машина, а не ревьюер.
- **Context:** правила из architecture §2–3: нейминг `ui-{block}__{el}--{mod}`, hex только в `tokens/primitives.css`, `!important` только в `a11y/vi.css`, порядок свойств, запрет inline-стилей в паттернах.
- **Implementation:**
  1. stylelint + `stylelint-selector-bem-pattern` (пресет `ui-`), `declaration-strict-value` для color-свойств (разрешённые значения: var(...), inherit, currentColor, transparent);
  2. `declaration-property-value-allowed-list`/`disallowed-list` для `!important` по путям файлов;
  3. eslint (нативный JS, env: browser; для тестов — jsdom), prettier, editorconfig;
  4. html-validate: один h1, label для input, запрет tab-атрибутов>0 без причины, alt обязателен у img.
- **Acceptance Criteria:**
  - файл-нарушитель (нейтральное имя класса; hex в компоненте; !important вне vi; img без alt) валит каждый соответствующий линтер;
  - `npm run lint` < 10 сек.
- **Dependencies:** T1.1.
- **Definition of Done:** конфиги в репо, нарушения показаны на демо-коммите.
- **Complexity:** M

#### T1.3 [TASK] Сборка dist и showcase (esbuild)

- **Goal:** один билд-скрипт производит поставку (dist) и полигон (showcase) из одних исходников.
- **Context:** порядок бандлов фиксирован (аналог CSS_ORDER из career-portal `build.py`): tokens → base → компоненты в алфавитном порядке каталогов → (отдельно) vi. url() шрифтов остаются относительными — структура dist повторяет исходники.
- **Implementation:**
  1. `showcase/build.mjs`: esbuild — конкатенация+минификация css в `dist/ui-core.min.css`, js в `dist/ui.min.js`, отдельно `dist/ui-vi.min.css`; копия `fonts/`, `themes/`;
  2. инжект версии из package.json + git-sha в комментарий баннера файлов;
  3. генерация страниц showcase: индекс-каталог стендов + страница на компонент из `components/*/<name>.html` + обвязка (каркас страницы с skip-link, header-заглушкой, подключением dist);
  4. `npm run serve` — локальный статик-сервер;
  5. `npm run build` — полный прогон; проверка что относительные пути шрифтов валидны из dist.
- **Acceptance Criteria:**
  - dist-структура = architecture §6.1; ui-core.min.css валиден и подключается standalone-страницей;
  - стенд-страница компонента открывается локально и использует собранные файлы (не исходники);
  - баннер версии читается в начале файлов.
- **Dependencies:** T1.1.
- **Definition of Done:** сборка воспроизводима локально и в CI.
- **Complexity:** L

#### T1.4 [TASK] Playwright-харнесс: e2e + axe + скриншоты

- **Goal:** тестовая база, на которой компоненты пишутся по TDD.
- **Context:** матрица PR — chromium; firefox/webkit — релизная. Скриншоты 375/768/1440. Единое контейнерное окружение (ADR-0004): официальный Playwright-образ и локально, и в CI — эталоны, созданные локально в контейнере, бинарно совпадают с CI; CI-джоба — fallback; гейт advisory до v1.0.
- **Tests first:** (сам харнесс — это и есть тесты)
- **Implementation:**
  1. конфиг playwright: проект chromium (PR), матрица (nightly/release); baseURL на локальный serve; версия образа `mcr.microsoft.com/playwright:vX-jammy` пиннится в репо;
  2. `npm run test:docker` — прогон тестов в контейнере (docker/podman + WSL2; см. лицензионную оговорку ADR-0004);
  3. фикстура `stand(name)`: открыть стенд, дождаться networkidle;
  4. хелпер `a11y()`: `AxeBuilder().analyze()` c отключением известных-нерелевантных правил (список документируется);
  5. хелпер `shot(viewport)` с маскировкой таймеров/дат;
  6. первый сквозной тест: индекс showcase открывается, axe чист, эталон снят;
  7. README «Как писать тесты компонента» (шаблон: состояния → e2e-сценарии → скриншоты; правило: эталоны — только из контейнера/CI-джобы).
- **Acceptance Criteria:**
  - `npm test` локально гоняет e2e+axe; падение axe валит тест;
  - `npm run test:docker` создаёт эталон, бинарно совпадающий с CI-эталоном (проверка на контрольном компоненте);
  - CI-джоба `update-snapshots` (fallback) работает и коммитит от имени бота.
- **Dependencies:** T1.3.
- **Definition of Done:** харнесс используется первой компонентной задачей (T3.x/T4.x).
- **Complexity:** M

#### T1.5 [TASK] CI-конвейер с mandatory-гейтами

- **Goal:** PR не мёржится без полного набора проверок; showcase и артефакт dist — автоматически.
- **Context:** GitHub Actions (решение Phase 0). Схема гейтов — architecture §10.
- **Implementation:**
  1. workflow `ci.yml` (PR): lint → html-validate → unit (vitest) → build → e2e+axe+visual в контейнере Playwright-образа (visual — advisory-чек: continue-on-error с отдельным check-результатом, диф-артефакты прикладываются к PR — ADR-0004);
  2. джоба `update-snapshots` (workflow_dispatch, коммит бота) — fallback-обновление эталонов с CI-раннера для машин без контейнера;
  3. workflow `pages.yml` (main): деплой showcase;
  4. workflow `release.yml` (тег, каркас для T12.1): матрица + артефакты;
  5. nightly: матрица chromium/firefox/webkit;
  6. branch protection: обязательные проверки lint/build/unit/e2e (visual — advisory до v1.0; включение mandatory — Iteration 10 по ADR-0004).
- **Acceptance Criteria:**
  - демо-PR с нарушением блокируется; чистый PR зелёный ≤ 5 мин;
  - showcase доступен по URL Pages после merge.
- **Dependencies:** T1.2, T1.3, T1.4, T1.6.
- **Definition of Done:** branch protection включена, воркфлоу в репо.
- **Complexity:** M

#### T1.6 [TASK] Vitest для JS-логики

- **Goal:** юнит-слой для чистой логики (валидация, vi-состояния, focus-utils).
- **Implementation:**
  1. vitest + jsdom, скрипт `test:unit`;
  2. один эталонный тест на module-template (readyState-guard) как образец;
  3. конвенция: DOM-независимая логика выносится в чистые функции и тестируется здесь, DOM-поведение — Playwright.
- **Acceptance Criteria:** `npm run test:unit` в CI; эталонный тест зелёный.
- **Dependencies:** T1.1.
- **Definition of Done:** подключено в T1.5.
- **Complexity:** S

### EPIC-2 — Design Tokens (Phase 2)

**Objective:** вся визуальная правда в двух слоях `--ui-*`; механизм тем доказан; контраст AA дефолтной палитры подтверждён инструментально.
**Scope:** primitives, semantic, focus/state-токены, spacing/z-index/shadows/breakpoints-шкала, тестовая тема, контраст-валидация.
**Dependencies:** EPIC-1.
**Expected outcome:** стенд токенов; смена темы меняет стенд без правок компонентов.
**Risks:** расползание токенов (митигация: ревью-гейт «новый семантический токен — только с потребителем»); color-mix в состояниях (задача T2.6 решает).
**Definition of Done:** stylelint подтверждает отсутствие hex вне tokens; контраст-отчёт в docs.

#### T2.1 [TASK] Токены-примитивы (палитра)

- **Goal:** слой 1 — полный словарь значений.
- **Context:** источник — `css/variables.css` career-portal (~35 цветов); дополнить: полные шкалы red/green/orange для статусов, нейтральная шкала серых (100–900), цвета рамок/разделителей (сейчас в career-portal захардкожены `#D6D6D6`, `#B9C6DE`, `#C4CDDC`).
- **Implementation:**
  1. перенести палитру в `tokens/primitives.css` с префиксом `--ui-` и системными именами (`--ui-blue-800`, `--ui-gray-300`…);
  2. добавить недостающие шкалы; каждому значению — комментарий с исходником (career-portal / новый / исправлен для контраста);
  3. стекло/glass-значения из career-portal — включить как есть.
- **Acceptance Criteria:**
  - все hex career-portal отображены в примитивы (таблица соответствия в PR);
  - stylelint: hex встречаются только в этом файле.
- **Dependencies:** T1.2.
- **Definition of Done:** файл в dist (первым в ui-core).
- **Complexity:** M

#### T2.2 [TASK] Семантические токены (слой 2) + недостающие группы

- **Goal:** единый API значений для всех компонентов: цвета-смыслы, focus, типографика rem, spacing 1–8, радиусы, тени, z-index, transitions, containers.
- **Context:** состав — architecture §3.2. Ключевые отличия от career-portal: px→rem (база на `html` = 16px), spacing-шкала вместо произвольных значений, z-index-лестница (сегодняшние 70/200 → 70/100/150/200/300/400), тени-токены вместо inline rgba.
- **Tests first:**
  - unit-подобный CSS-тест (stylelint-ci скрипт): каждый семантический токен ссылается только на примитивы/другие семантические;
  - стенд токенов рендерит 100% токенов (проверка e2e: счётчик узлов стенда = счётчик токенов в файле).
- **Implementation:**
  1. `tokens/semantic.css` по §3.2;
  2. типографика: перенести тройки fs/lh/fw из career-portal, пересчитать px→rem, сохранить шаги по брейкпоинтам (мобильные значения — из media-правил career-portal);
  3. spacing 4/8/12/16/24/32/48/64;
  4. страница-стенд «Tokens»: сетки цветов с значениями, шкала типографики, отступы, радиусы/тени/z-index-таблица.
- **Acceptance Criteria:**
  - стенд отображает все токены (e2e-проверка полноты);
  - ни один компонент (в будущем) не сможет сослаться на примитив напрямую — так настроен stylelint (правило включается в T1.2, активируется здесь);
  - при `html { font-size: 32px }` стенд токентов масштабируется без наложений.
- **Dependencies:** T2.1, T1.3.
- **Definition of Done:** ui-core начинается с tokens; дока «Как пользоваться токенами».
- **Complexity:** L

#### T2.3 [TASK] Контраст-валидация дефолтной палитры (AA)

- **Goal:** инструментальное доказательство 4.5:1 / 3:1 для всех текстовых пар слоя 2.
- **Context:** известный кандидат на исправление — `--color-text-muted: #808080` на белом (≈3.5:1). Решение Phase 0: одна палитра, поэтому качество дефолта критично.
- **Tests first:**
  - node-скрипт в CI: парсит semantic.css, вычисляет пары (text/surface, text-muted/surface, on-dark и т.п.) по конфигу «кто на ком сидит», сравнивает с порогами AA; падает при нарушении.
- **Implementation:**
  1. конфиг пар (использование-токен → фон-токен);
  2. скрипт контраста + отчёт markdown в артефакты;
  3. правки значений (muted-серый затемнить до ≥4.5:1; проверить пары тегов/бейджей из career-portal);
  4. фиксация правила: новый семантический цвет проходит скрипт автоматически (CI).
- **Acceptance Criteria:** CI-скрипт зелёный; отчёт приложен; изменения против career-portal задокументированы (что и почему).
- **Dependencies:** T2.2.
- **Definition of Done:** гейт включён в PR-checks.
- **Complexity:** M

#### T2.4 [TASK] Механизм тем + синтетическая тестовая тема

- **Goal:** доказать «переопределили токены — изменился вид, API и классы нетронуты» (мульти-бренда в MVP нет — решение Phase 0).
- **Tests first:**
  - e2e: на стенде токенов включается `data-ui-theme="test"`; проверка computed-стилов: `--ui-color-primary` = значение тестовой темы; стенд кнопок перекрасился.
- **Implementation:**
  1. `themes/theme-test.css`: `[data-ui-theme="test"] { …5–7 переопределений… }`;
  2. переключатель темы на всех стендах (query-параметр `?theme=`);
  3. правило в доках: тема трогает только семантический слой; правило обратной совместимости (новый токен = дефолт в core).
- **Acceptance Criteria:** e2e-сценарий зелёный; проверка «тема, написанная до добавления нового токена, работает с обновлённым core» (фикстура в тесте).
- **Dependencies:** T2.2, T1.3.
- **Definition of Done:** механизм в dist; кейс в integration-guide.
- **Complexity:** S

#### T2.5 [TASK] Шкала брейкпоинтов и правило её соблюдения

- **Goal:** конец «плавающим» 1439/1365/1279/479/359 из career-portal.
- **Context:** media-query нельзя выразить переменной — шкала фиксируется конвенцией + линтером: `sm 480 / md 768 / lg 1024 / xl 1280 / 2xl 1440`, только `min-width` (mobile-first).
- **Implementation:**
  1. stylelint-правило `media-feature-name-value-allowed-list`/custom: `(min-width)` only, значения из шкалы (px или em — фиксируем px для простоты);
  2. дока «Адаптивный подход»: mobile-first, точка перелома контента, правило «проверяй 375 и 320»;
  3. допущение исключений только по ADR (аргументированная запись).
- **Acceptance Criteria:** файл с `max-width`-запросом валит линт; шкала задокументирована.
- **Dependencies:** T1.2.
- **Definition of Done:** все следующие CSS-задачи пишутся под линтером.
- **Complexity:** S

#### T2.6 [TASK] Состояния hover/active через производные цвета — решение и эталон

- **Goal:** единый способ состояний без ручных hex-производных.
- **Context:** матрица «evergreen ×2» разрешает `color-mix()`. Нужен эталон + fallback-политика.
- **Implementation:**
  1. паттерн: `:hover { background: color-mix(in srgb, var(--ui-color-primary) 88%, var(--ui-black)); }`;
  2. решение о дублирующих hover-токенах (не нужны, т.к. матрица подтверждена; зафиксировать ADR);
  3. применить в T4.2 (button) как эталонный потребитель.
- **Acceptance Criteria:** ADR записан; кнопка имеет hover/active/focus из производных; visual-эталон состояний снят CI.
- **Dependencies:** T2.2.
- **Complexity:** S

### EPIC-3 — Base & Typography (Phase 3)

**Objective:** глобальный слой, безопасный для legacy-сайтов, плюс типографика и layout-примитивы, отвечающие требованию «не ломается при увеличении шрифта».
**Scope:** fonts+reset, focus-политика (⚠️ issue 1), box-sizing-дисциплина (⚠️ issue 2), типографика, container/section/grid, skip-link, zoom-тест.
**Dependencies:** EPIC-2.
**Expected outcome:** страница, собранная только из base+tokens, выглядит как система и проходит a11y-прогон.
**Risks:** глобальный base конфликтует с сайтом (митигация: base минимален, компоненты самодостаточны, дока «что base делает глобально»).
**Definition of Done:** zoom/200% и 32px-сценарии зелёные; axe чист на стенде base.

#### T3.1 [TASK] Шрифты и reset (порт base.css из career-portal)

- **Goal:** проверенный в проде фундамент (класс A аудита) с доведением до системы.
- **Context:** источник — `css/base.css` + `assets/fonts/`. Golos Text 400/500/600 cyr/lat, unicode-range, font-display: swap.
- **Tests first:**
  - e2e: woff2 отдаются (200), `document.fonts.check('16px "Golos Text"')` = true, cyr+lat;
  - html-validate паттернов: preload шрифтов присутствует на каркасе showcase.
- **Implementation:**
  1. `base/fonts.css`: 6 @font-face (перенос без изменений) + LICENSE-проверка Golos (OFL — приложить текст лицензии в dist/fonts);
  2. `base/reset.css`: `[hidden] !important`, `scrollbar-gutter: stable`, img/pointer-правила, ресет отступов, `prefers-reduced-motion` kill-switch (всё — класс A);
  3. box-sizing: глобально + правило «компонент объявляет свой» (⚠️ issue 2) — в шаблон компоненты;
  4. preload-сниппет (400/500 cyr) в каркас showcase и в bitrix-сниппеты (прообраз).
- **Acceptance Criteria:** тесты шрифтов зелёные; при заблокированном шрифте страница читаема (Arial-фолбэк, e2e-сценарий с offline-шрифтом);
- **Dependencies:** T2.2 (токены для font-family), T1.3.
- **Definition of Done:** base в ui-core после tokens.
- **Complexity:** M

#### T3.2 [TASK] Политика фокуса (⚠️ issue 1)

- **Goal:** видимый фокус на каждом интерактивном элементе, переживающий legacy-CSS.
- **Tests first:**
  - e2e: Tab-обход стенда base — у каждого элемента в фокусе computed `outline-width` ≥ 2px;
  - e2e «legacy-атака»: инжект `a { outline: none }` после ui-core — фокус всё ещё виден (валидация специфичности из ⚠️ issue 1).
- **Implementation:**
  1. `base/focus.css`: список `a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, summary:focus-visible, [tabindex]:focus-visible` с токенами `--ui-focus-*`;
  2. правило «никто не пишет outline: none без замены» — в stylelint-конфиг (warning → error после EPIC-4);
  3. дока «Focus visible: почему так» (ADR по специфичности).
- **Acceptance Criteria:** оба e2e-сценария зелёные, включая legacy-атаку.
- **Dependencies:** T2.2, T3.1.
- **Definition of Done:** правило активно для всех компонентов EPIC-4+.
- **Complexity:** S

#### T3.3 [TASK] Типографика: классы ui-h1…ui-micro и базовые стили текста

- **Goal:** типографическая шкала как API + текстовые элементы в rem.
- **Context:** перенос троек из career-portal (T2.2 уже пересчитал в rem); классы для контентных областей + element-минимум (body-шрифт/цвет — с оговоркой из ⚠️ issue 2: компоненты не зависят).
- **Tests first:**
  - e2e: каждый класс ui-h*…ui-micro имеет computed font-size из соответствующего токена; иерархия h1>h2>… визуально (visual-эталон);
  - сценарий 32px-базы: типографика масштабируется, переносы корректны.
- **Implementation:**
  1. классы заголовков/текста с letter-spacing из макета career-portal;
  2. `ui-text--muted`, `ui-lead`, списки (внешние отступы, маркеры), `ui-address`-минимум;
  3. правила SEO-доков: один h1, h2→h3 без пропусков (перенос тест-идеи `test_internship_headings.py` в html-validate/e2e showcase);
  4. стенд типографики.
- **Acceptance Criteria:** стенд полный; html-валидация иерархии на всех страницах showcase зелёная.
- **Dependencies:** T2.2, T3.1.
- **Definition of Done:** входит в ui-core.
- **Complexity:** M

#### T3.4 [TASK] Container, Section, Grid — mobile-first

- **Goal:** layout-примитивы (класс B: пересборка с desktop-first на mobile-first).
- **Context:** источник — `.container` (base.css), `.section`, `.cards-grid--2/3/4` (components/pages.css career-portal).
- **Tests first:**
  - e2e 375/768/1024/1440: контейнер не даёт горизонтального скролла (`scrollWidth === clientWidth` — перенос проверки из design-qa career-portal);
  - grid: колонки = 1 на 375, 2 на 768, N на ≥1024 (проверка computed grid-template-columns).
- **Implementation:**
  1. `ui-container` (max-width из токенов, паддинги по брейкпоинтам — mobile-first);
  2. `ui-section` (+ `--muted` фон с радиусом);
  3. `ui-grid` с модификаторами колонок и адаптивом `auto-fit/minmax` где уместно;
  4. запрет фиксированных высот; проверка на 320px.
- **Acceptance Criteria:** тест-сценарии зелёные; visual-эталоны 4 вьюпортов.
- **Dependencies:** T2.2, T2.5.
- **Definition of Done:** стенды в showcase; используются всеми паттернами EPIC-8.
- **Complexity:** M

#### T3.5 [TASK] ui-skip-link

- **Goal:** переход к контенту с клавиатуры (пробел аудита career-portal).
- **Tests first:**
  - e2e: первый Tab на стенде — фокус на skip-link; Enter — фокус на `#main`; ссылка визуально скрыта вне фокуса.
- **Implementation:** классика visually-hidden-until-focus; цель — `data-ui-main`/`#main`; правило для сайтов — target существует (валидация в html-validate каркаса).
- **Acceptance Criteria:** e2e зелёный; док-заметка для Bitrix-шаблона (куда ставить в header.php).
- **Dependencies:** T3.2.
- **Definition of Done:** в каркасе showcase и в bitrix-сниппетах по умолчанию.
- **Complexity:** S

#### T3.6 [TASK] Сценарии масштабирования шрифта и zoom (релизный гейт)

- **Goal:** требование «корректная работа при увеличении шрифта» — исполняется тестом, не надеждой.
- **Tests first:** e2e: browser zoom 200% на стендах base+типографика+grid — нет горизонтального скролла, нет перекрытий (проверка boundingBox пересечений ключевых узлов); `html{font-size:32px}` — аналогично.
- **Implementation:** два сценария в `tests/e2e/scaling.spec.js`; подключение к nightly+release (не к PR — скорость).
- **Acceptance Criteria:** зелёные в nightly; поломка блокирует релиз.
- **Dependencies:** T3.3, T3.4.
- **Definition of Done:** гейт в release-workflow.
- **Complexity:** S

### EPIC-4 — Primitive Components (Phase 3)

**Objective:** P0-компоненты общего назначения, каждый — эталон качества (стенд всех состояний, a11y в AC, visual-эталоны).
**Dependencies:** EPIC-3. **Expected outcome:** типовую не-формовую страницу можно собрать целиком.
**Risks:** ложные инварианты (делаем DoD одинаковым через шаблон задачи).
**Definition of Done:** все компоненты в ui-core; доки по шаблону §8 architecture; каждый имеет axe-чистый стенд.

#### T4.1 [TASK] ui-link

- **Goal:** ссылки с вариантами и правилами внешних/файловых/anchор-случаев.
- **Tests first:** e2e: состояния default/hover/focus-visible/visited; внешняя ссылка имеет rel="noopener" (html-validate); контраст ≥ 4.5:1.
- **Implementation:** варианты (default/на-тёмном/подчёркнутая/кнопочная — с отсылкой к button при action!); иконка `__icon`; do/don't «ссылка vs кнопка».
- **Acceptance Criteria:** keyboard accessible; visible focus (T3.2 наследуется); accessible name при icon-only; стенд + эталоны.
- **Dependencies:** T3.2, T3.3. **DoD:** в ui-core; дока. **Complexity:** S

#### T4.2 [TASK] ui-button (эталонный компонент)

- **Goal:** кнопка — шаблон качества для всех следующих.
- **Context:** источник — `.btn` из career-portal (4 варианта); расширения: sizes md/sm, disabled, loading.
- **Tests first:**
  - e2e: все варианты×состояния (default/hover/focus-visible/active/disabled/loading) рендерятся на стенде; disabled не фокусируется и не кликается; loading: `aria-busy`, повторный клик игнорируется, лейбл сохраняет имя;
  - axe на стенде; visual-эталоны матрицы состояний (CI).
- **Implementation:**
  1. варианты primary/accent/outline/light из токенов; hover/active через color-mix (эталон T2.6);
  2. размеры через токены высот; `box-sizing` на корне (⚠️ issue 2);
  3. `ui-button__icon` (svg currentColor, aria-hidden); спиннер loading;
  4. семантика: `<button type=…>`; для ссылок-кнопок — ui-link--button; do/don't.
- **Acceptance Criteria:** клавиатурный прогон чист; контраст всех вариантов ≥ 4.5:1 (кроме крупных декоративных — фиксировать); disabled/loading корректны для скринридера.
- **Dependencies:** T2.6, T3.2. **DoD:** эталонная дока «как устроена компонентная задача». **Complexity:** M

#### T4.3 [TASK] ui-tag и ui-badge

- **Context:** перенос `.tag` (5 цветов) из career-portal почти без изменений (класс A) + счётный badge.
- **Tests first:** e2e: варианты; empty-badge (счётчик 0) имеет `aria-hidden` или скрыт по правилу доки; контраст пар из T2.3.
- **Acceptance Criteria:** стенд; эталоны; в VI-темах не теряют читаемость (функциональная проверка в EPIC-9).
- **Dependencies:** T2.3. **DoD:** в ui-core. **Complexity:** S

#### T4.4 [TASK] ui-card

- **Context:** `.card` (base/hover/filled) из career-portal; hover — только `@media (hover: hover)` (touch не залипает); слоты `__title/__body/__footer/__media`;Whole-card-link паттерн (растянутая ссылка) с сохранением фокуса (перенос `.vac-card__title a:focus-visible::after` идеи).
- **Tests first:** e2e: hover-состояние только на hover-устройствах (emulation); stretched link — Tab порядок осмысленный, фокус виден; axe.
- **Acceptance Criteria:** карточка-ссылка доступна с клавиатуры и скринридера (одно имя, один фокус-стоп или обоснованный порядок).
- **Dependencies:** T3.4 (grid-стенд), T3.2. **DoD:** в ui-core. **Complexity:** M

#### T4.5 [TASK] ui-alert

- **Context:** инфо/успех/предупреждение/ошибка из статусных токенов; закрываемый вариант; `role="status"` vs `role="alert"` по критичности.
- **Tests first:** e2e: появление алерта озвучивается (role в DOM); close-кнопка доступна; контраст.
- **Acceptance Criteria:** дока правила выбора роли; стенд 4×2 состояний.
- **Dependencies:** T2.3. **DoD:** в ui-core. **Complexity:** S

#### T4.6 [TASK] ui-image / ui-figure: паттерн изображений

- **Context:** правила alt/retina/CLS + `ui-figure` с подписью. Retina-политика: вектор для иконок, srcset/@2x для растра, width/height обязательны (перенос идей career-portal: width/height на лого, lazy на карточках).
- **Tests first:** html-validate: alt обязателен ("" допустим); CLS-проверка (layout-shift = 0 при lazy-загрузке стенда); e2e: сломанный src → деградация без поехавшей сетки.
- **Implementation:** `ui-figure` (+`__caption`), `ui-image`-модификаторы (cover/contain/ratio); дока-чек-лист «как готовить картинки» (форматы, вес, @2x); empty-src fallback-стили.
- **Acceptance Criteria:** чек-лист в доке; тесты зелёные; стенд (декоративное/информативное/complex+describe).
- **Dependencies:** T3.1. **DoD:** паттерн обязателен для всех стендов. **Complexity:** M

#### T4.7 [TASK] ui-breadcrumbs + schema.org BreadcrumbList

- **Context:** перенос (класс A: скролл-лента на мобиле) + микроразметка + `aria-current="page"` (уже было в career-portal).
- **Tests first:** e2e: навигация по крошкам Tab/Enter; schema-разметка валидна (структурная проверка парсером в тесте); axe.
- **Acceptance Criteria:** сниппет из доки проходит Rich Results (ручная проверка 1 раз + автопроверка структуры); дока «крошки в Bitrix-шаблоне».
- **Dependencies:** T3.3. **DoD:** в ui-core. **Complexity:** M

#### T4.8 [TASK] Empty state и Error state — паттерны

- **Context:** пустой список / 404 / ошибка загрузки: разметка + минимальные стили + дока; входит в MVP как паттерн (не тяжёлый компонент).
- **Tests first:** html-validate структуры; axe; visual-эталоны.
- **Acceptance Criteria:** 3 эталонных стенда; правила «что говорить пользователю» в доке.
- **Dependencies:** T4.5, T3.4. **DoD:** паттерны в showcase. **Complexity:** M

### EPIC-5 — Forms (Phase 4) — MVP-контур

**Objective:** формы «всё из коробки»: нативные контролы, состояния ошибок (клиентские и серверные), PE-валидация, готовность к bitrix-формам.
**Dependencies:** EPIC-3, T4.2 (кнопка отправки).
**Expected outcome:** интеграционный стенд «форма целиком» проходит цикл без-JS → с-JS → серверная ошибка.
**Risks:** соблазн собственного форм-фреймворка (митигация: сервер — источник истины, JS — только усиление).
**Definition of Done:** полный e2e-цикл формы зелёный; доки интеграции с `bitrix:form.result.new`.

#### T5.1 [TASK] ui-field: label/hint/error + input и textarea

- **Context:** источник `.field` из career-portal; расширения: hint, sizes, required-маркер (не только цвет — текст/скринридер).
- **Tests first:**
  - e2e: связка label-input (клик по label → фокус); error: `aria-invalid`, `aria-describedby` → id ошибки; hint связан; axe;
  - сценарий «увеличение шрифта»: поле не обрезает текст (нет фикс. height у textarea — min-height).
- **Implementation:**
  1. обвязка `ui-field` (__label/__input/__hint/__error/—error/—required);
  2. input (все типы из ТЗ: text/email/tel/password/date/number), textarea (resize: vertical, min-height, авто-рост — опция без JS не нужна);
  3. стили фокуса — border+background как в career-portal + глобальный focus-visible;
  4. placeholder-политика (placeholder ≠ label — дока).
- **Acceptance Criteria:** каждый контрол доступен без JS; состояния full-стенд; контраст ошибок.
- **Dependencies:** T3.2. **DoD:** в ui-core. **Complexity:** M

#### T5.2 [TASK] Select (нативный), checkbox, radio

- **Context:** перенос `.checkbox/.radio` (класс A: нативные+accent-color); select — стилизованный нативный (позже T7.3 — усиление listbox'ом).
- **Tests first:** e2e: чекбокс/radio переключаются с клавиатуры (Space/стрелки), группа radio — стрелочный обход; label связывает; select открывается нативно; axe.
- **Implementation:**
  1. `ui-field__select` стилизация нативного select (без скрытия нативного!);
  2. `ui-checkbox` (в т.ч. consent-вариант с длинным текстом), `ui-radio`, `ui-radio-group` (fieldset/legend — правила доки);
  3. required-маркеры и error-состояния как в T5.1.
- **Acceptance Criteria:** все контролы — нативная семантика без ARIA-костылей; стенд; тесты.
- **Dependencies:** T5.1. **DoD:** в ui-core. **Complexity:** M

#### T5.3 [TASK] ui-file — доступный файловый инпут

- **Context:** в career-portal `.field__file` прятал input (`display:none`) — fix аудита; надо: label-обёртка/кнопка + визуально-скрытый input, фокус переносится, имя выбранного файла озвучивается.
- **Tests first:**
  - e2e: Tab достигает контрола; фокус виден; после выбора — имя файла в DOM (status); Escape/повторный выбор; axe;
  - клавиатурный activeElement после клика по кнопке = input.
- **Implementation:** паттерн «кнопка-лейбл + sr-only input»; `accept`-подсказка в hint; правило «никогда display:none на нативном контроле» — в stylelint/docs.
- **Acceptance Criteria:** сценарии зелёные; дока do/don't (анти-пример из career-portal).
- **Dependencies:** T5.1. **DoD:** в ui-core. **Complexity:** M

#### T5.4 [TASK] ui-form: раскладка, required-легенда, сводная ошибка, success

- **Context:** `form-grid` (2→1 колонки), `form-aside` — перенос из career-portal; success-свап (из forms.js-паттерна).
- **Tests first:** e2e: раскладка на 375/768/1440; сводная ошибка `role="alert"` появляется после попытки submit; success-блок доступен + фокус переведён; axe.
- **Implementation:**
  1. `ui-form`, `ui-form-grid` (+`--wide`), `ui-form__aside`;
  2. `ui-form__summary` (role=alert, список ошибок-ссылками на поля);
  3. `ui-form__success` + правила фокуса после успеха;
  4. легенда обязательных полей.
- **Acceptance Criteria:** полный стенд формы; сценарии зелёные.
- **Dependencies:** T5.1, T5.2, T3.4. **DoD:** в ui-core. **Complexity:** M

#### T5.5 [TASK] IraoUI.form — клиентская валидация как progressive enhancement

- **Goal:** перенос `forms.js` career-portal в модуль системы.
- **Tests first (Vitest + e2e):**
  - unit: чистые функции валидации (required/email/pattern/file-size) — таблица кейсов;
  - e2e: без JS форма отправляется (нативная валидация выключена только при активном модуле — проверка: атрибут `novalidate` ставится JS'ом, в разметке его нет);
  - e2e: submit с ошибками → блокировка, фокус на первую ошибку, summary-связка; input снимает ошибку; success-цикл.
- **Implementation:**
  1. конфиг через data-атрибуты (`data-ui-form`, `data-ui-validate="email,required"` опц.);
  2. модуль ставит `novalidate` при инициализации (разметка остаётся нативно-валидной);
  3. события `irao-ui:form-invalid/valid` для сайтов;
  4. контракт ошибок: класс `ui-field--error` + aria — тот же, что у сервера (см. T5.6).
- **Acceptance Criteria:** unit ≥ 90% логики; e2e-циклы зелёные; форма без модуля полностью функциональна.
- **Dependencies:** T5.4, T1.6. **DoD:** модуль в ui.min.js. **Complexity:** L

#### T5.6 [TASK] Серверные ошибки: контракт Bitrix-форм + интеграционный стенд

- **Goal:** ошибки после сабмита (перезагрузка страницы, рендер PHP) выглядят и ведут себя идентично клиентским.
- **Context:** сценарий `bitrix:form.result.new` / AJAX-формы: сервер знает `FIELD_NAME → сообщение`.
- **Tests first:** e2e-стенд «серверный ответ»: поля с pre-rendered `ui-field--error` + aria-invalid + summary — полный a11y-прогон; фокус-менеджмент (landmark/фокус на summary при загрузке с ошибками).
- **Implementation:**
  1. контракт в доке: PHP рендерит те же классы/aria (сниппеты для шаблона формы);
  2. интеграционный стенд «форма целиком»: без JS → с JS → серверная ошибка → успех;
  3. правило: серверная валидация всегда включена (JS — только UX).
- **Acceptance Criteria:** стенд зелёный; сниппеты в bitrix/-папке; **MVP-веха: стендовая репетиция пилота пройдена.**
- **Dependencies:** T5.5. **DoD:** стенд в showcase + сниппеты. **Complexity:** M

### EPIC-6 — Navigation & Interactive (Phase 5, P1)

**Objective:** навигационные и лёгкие интерактивные компоненты по WAI-ARIA APG.
**Dependencies:** EPIC-3/4. **Expected outcome:** шапка и список строятся из системы.
**Definition of Done:** клавиатурные чек-листы APG зелёные для каждого.

#### T6.1 [TASK] ui-dropdown

- **Context:** перенос `header.js` (класс B): вне-клик, Escape+возврат фокуса, aria-expanded/controls; обобщение на N инстансов и два назначения (навигация/действия).
- **Tests first:** e2e: открытие/закрытие (клик/Enter/Space), Escape возвращает фокус на триггер, стрелки по пунктам, Tab наружу закрывает (решение APG), вне-клик; без JS — контент раскрыт (деградация).
- **Acceptance Criteria:** APG menu-button чек-лист; стенд ×2 варианта; axe; эталоны.
- **Dependencies:** T3.2, T4.1. **DoD:** компонент+модуль в dist. **Complexity:** M

#### T6.2 [TASK] ui-tabs

- **Context:** перенос `tracks.js` (класс B): roving tabindex, стрелки/Home/End, aria-selected; панели tabpanel; без JS — все панели видимы.
- **Tests first:** e2e: полный клавиатурный цикл APG tabs; связка aria-controls; активация по данным JSON-паттерна.
- **Acceptance Criteria:** APG чек-лист; деградация без JS (панели видимы, табы — заголовки/ссылки).
- **Dependencies:** T3.2. **DoD:** в dist. **Complexity:** M

#### T6.3 [TASK] ui-pagination

- **Context:** перенос (класс A) + `aria-current`, disabled-текущая, «…», дока генерации в Bitrix-шаблоне.
- **Tests first:** e2e: навигация Tab/Enter; текущая объявляется (aria-current); disabled-стрелки не фокусируются (aria-disabled vs disabled — фиксировать решение); axe.
- **Acceptance Criteria:** стенд; сниппет PHP-генерации в bitrix/.
- **Dependencies:** T4.1. **DoD:** в dist. **Complexity:** S

#### T6.4 [TASK] ui-accordion

- **Context:** `faq` из career-portal (класс B): база на `<details>/<summary>` (нативная a11y без JS), анимация grid-rows сохраняется; вариант FAQ.
- **Tests first:** e2e: Enter/Space toggle, стрелки нет (details), состояние name (aria-expanded у summary не нужно — натив); без JS полностью работает; анимация off при reduced-motion.
- **Acceptance Criteria:** APG accordion (details-режим); стенд; эталоны.
- **Dependencies:** T3.3. **DoD:** в dist. **Complexity:** S

### EPIC-7 — Complex Components (Phase 5, P1)

**Objective:** оверлейные и усиленные компоненты.
**Dependencies:** EPIC-6 частично (dropdown — для select), T1.4 (тестовая база).
**Definition of Done:** focus trap/restor протестирован e2e; деградация без JS определена для каждого.

#### T7.1 [SPIKE] Native `<dialog>` vs собственный оверлей — ADR

- **Goal:** решение для T7.2 на матрице «evergreen ×2» + реальные Bitrix-страницы (z-index-контексты, композит).
- **Implementation:** мини-прототипы обоих подходов; таблица критериев (trap/Escape бесплатно, стилизация ::backdrop, анимация, вложенность, риск legacy); запись ADR-001.
- **Acceptance Criteria:** ADR принят; критерии измеримы.
- **Dependencies:** нет. **Complexity:** S

#### T7.2 [TASK] ui-modal

- **Context:** перенос логики `directions.js` (класс B: фокус-restore, Escape, transitionend-закрытие) + семантика dialog/aria-modal + trap.
- **Tests first:**
  - e2e: open→фокус на первый элемент; Tab/Shift+Tab не выходят за модалку; Escape закрывает; фокус возвращается на опенер; повторные циклы не оставляют padding (регресс-кейс design-qa career-portal); скролл-лок без сдвига (scrollbar-gutter);
  - axe с открытой модалкой.
- **Implementation:** размеры sm/md/full; `ui-modal__close`; анимация + reduced-motion; интеграционные хелперы `IraoUI.modal.open(el)`.
- **Acceptance Criteria:** все сценарии зелёные; стенд; эталоны.
- **Dependencies:** T7.1, T3.2. **DoD:** в dist. **Complexity:** L

#### T7.3 [TASK] IraoUI.select — кастомный select (listbox поверх нативного)

- **Context:** перенос `dropdowns.js` (класс B, зрелый): нативный select остаётся и синхронизируется; **рефакторинг:** убрать `vacancy-search__select-wrap` — опция через `data-ui-select-wrap`/модификатор; добавить optgroup, Home/End.
- **Tests first:** e2e: полный listbox-чек APG (стрелки/Home/End/Escape/typahead-опция); выбор синхронизирует select и диспатчит change (assert на форме фильтра); деградация — нативный select; unit на функцию синхронизации.
- **Acceptance Criteria:** форма фильтра отправляет выбранное; APG-чек зелёный.
- **Dependencies:** T5.2, T6.1 (вне-клик логика). **DoD:** в dist. **Complexity:** M

#### T7.4 [TASK] ui-table — адаптивные паттерны таблиц

- **Context:** паттерны: обычная; горизонтальный скролл (с доступной индикацией); карточная трансформация на мобиле (data-атрибуты-заголовки); sticky-заголовок (опция).
- **Tests first:** e2e: скролл-контейнер доступен с клавиатуры (tabindex=0 + role=region + label); карточный режим на 375 сохраняет связность данных (axe table-правила выполнены или режим не table); эталоны.
- **Acceptance Criteria:** 3 стенда; дока «какую таблицу выбирать».
- **Dependencies:** T3.4. **DoD:** паттерны в showcase + CSS в dist. **Complexity:** M

#### T7.5 [TASK] ui-loader и aria-busy-паттерн

- **Tests first:** e2e: спиннер aria-hidden + текст-альтернатива; контейнер aria-busy; reduced-motion — статичная индикация.
- **Acceptance Criteria:** паттерн задокументирован; компонент в dist.
- **Dependencies:** T3.3. **Complexity:** S

#### T7.6 [TASK] Паттерны: search overlay, header, footer

- **Context:** search-overlay — перенос `search-screen.js` на базу ui-modal (семантика диалога, trap, restore — закрывает пробел аудита); header/footer — доки-референсы разметки (не dist-код): ленмарки, nav aria-label, VI-кнопка, переключение.
- **Tests first:** e2e overlay: open→фокус в поле, Escape, restore, aria-modal; header-паттерн: html-validate + axe.
- **Acceptance Criteria:** 3 док-страницы с копируемой разметкой; overlay-паттерн проходит диалоговый чек-лист.
- **Dependencies:** T7.2. **DoD:** в showcase/patterns. **Complexity:** M

### EPIC-8 — Layout & Page Patterns (Phase 6)

**Objective:** страницы собираются копипастой без нового CSS.
**Dependencies:** EPIC-4–7. **Definition of Done:** паттерн-стенды в visual-регрессии.

#### T8.1 [TASK] Паттерн «Страница списка»

- **Context:** page-head (заголовок+подзаголовок+фильтры-пилюли) + сетка карточек + pagination + empty-state; перенос идей `vacancies.html`/`events.html`.
- **Tests first:** e2e: 375/768/1440 без скролла-overflow; axe страницы; иерархия h1→h2.
- **Acceptance Criteria:** стенд собирается из готовых компонентов без нового CSS (кроме демо-контента); док-страница с разметкой.
- **Dependencies:** T4.4, T6.3, T4.8, T3.4. **Complexity:** M

#### T8.2 [TASK] Паттерн «Детальная страница»

- **Context:** крошки + заголовок + контент/aside (липкий на десктопе — проверка на iOS-поведение) + related-блоки; перенос структуры `vacancy.html`.
- **Tests first:** e2e адаптив; aside не перекрывает контент при 32px; axe.
- **Acceptance Criteria:** стенд; док; schema.org-заметки (JobPosting-кейс — задокументировать как пример «когда уместно»).
- **Dependencies:** T4.7, T3.4. **Complexity:** M

#### T8.3 [TASK] Паттерны «Страница формы» и «Landing-секция»

- **Context:** форма с aside (перенос vacancy-apply) + лендинг-секция (фоны, full-width внутри контейнера, типографика лидов) — правила контентных секций и границы системы/сайта.
- **Tests first:** e2e адаптив; полный форма-цикл на паттерне; axe.
- **Acceptance Criteria:** 2 стенда; правила границ зафиксированы.
- **Dependencies:** T5.4, T3.4. **Complexity:** M

### EPIC-9 — Accessibility: VI-модуль и hardening (Phase 3/7)

**Objective:** VI-версия ГОСТ Р 52872 как поставляемый модуль + финальный a11y-спринт.
**Dependencies:** T3.x (для порта), EPIC-4–8 (для hardening).
**Definition of Done:** VI работает на всех стендах; ручной протокол скринридеров подписан.

#### T9.1 [TASK] Порт VI-модуля

- **Context:** перенос `vi.css + vi.js + vi-panel.html` (класс A) с заменой: классы панели → `ui-vi-*`, токены → `--ui-*`, ключ localStorage → `irao-ui-vi` (career-portal не потребляет —-breaking допустим); сохранены: 5 тем, 3 размера (zoom), интервал, картинки, `aria-pressed`-синхронизация, `padding-top` по фактической высоте панели.
- **Tests first:**
  - unit: parse/apply/save состояния vi.js (чистая логика);
  - e2e: включение → классы на body, панель видима, aria-pressed; переключение темы/размера меняет computed стили; localStorage переживает reload; выключение — полное снятие классов;
  - e2e: каждая тема на всех стендах EPIC-4/5 — ключевая пара цветов совпадает с ожиданием темы.
- **Implementation:** порт файлов в `a11y/`; сборка отдельного `ui-vi.min.css`; панель — компонент `components/ui-vi/`; кнопка входа — в header-паттерн (T7.6); инвариант «компоненты без inline-стилей» уже под линтером.
- **Acceptance Criteria:** сценарии зелёные; VI-страница в showcase со всеми режимами.
- **Dependencies:** T3.1, T1.6. **DoD:** ui-vi.min.css в dist. **Complexity:** M

#### T9.2 [TASK] A11y hardening-спринт

- **Context:** forced-colors (Windows H Contrast) для контролов; ручной протокол NVDA + VoiceOver по каждому интерактивному стенду (сценарии записываются в доки); ревизия контраста производных состояний (hover color-mix); финальный VI-прогон всех стендов/паттернов.
- **Tests first:** forced-colors: e2e с emulation `forced-colors: active` — границы кнопок/полей видимны (проверка computed system colors).
- **Acceptance Criteria:** протокол скринридера подписан (таблица стенд×сценарий×результат); все найденные фиксы закрыты или ADR-исключения; axe=0 по всем страницам.
- **Dependencies:** EPIC-6, EPIC-7, T9.1. **DoD:** отчёт в docs; релизный чек-лист дополнен. **Complexity:** L

### EPIC-10 — Documentation (Phase 8)

**Objective:** документация, по которой внешний разработчик подключает систему без автора рядом.
**Dependencies:** все компонентные эпики (доки пишутся с каждым — здесь доведение и связность).
**Definition of Done:** incognito-тест пройден.

#### T10.1 [TASK] Шаблон страницы компонента + 3 эталонные страницы

- **Context:** единый шаблон §8 architecture (примеры/HTML/состояния/responsive/a11y/API/do-don't/schema-заметки/версия); эталоны: button, field, modal.
- **Acceptance Criteria:** шаблон в showcase-генераторе; 3 страницы соответствуют шаблону полностью.
- **Dependencies:** T1.3, T4.2, T5.1, T7.2. **Complexity:** M

#### T10.2 [TASK] Доки всех компонентов по шаблону

- **Context:** доведение остальных страниц до эталона; проверка полноты: каждый компонент dist'а имеет страницу.
- **Acceptance Criteria:** чек-лист «страница = шаблон» зелёный для 100% компонентов; visual/эталоны связаны со страницами.
- **Dependencies:** T10.1 + компоненты. **Complexity:** L

#### T10.3 [TASK] Quickstart, Integration Guide, «Bitrix-разработчику за 30 минут»

- **Context:** quickstart (подключение на стенде), integration-guide (living doc из architecture §6 + сниппеты bitrix/), гайд для интегратора: подключение, копирование паттернов, формы, VI, что делать при конфликте legacy.
- **Acceptance Criteria:** три документа; сниппеты в bitrix/ синхронны с гайдами.
- **Dependencies:** T10.1, T11.1. **Complexity:** M

#### T10.4 [TASK] Contribution guide и ADR-журнал

- **Context:** процесс добавления компонента (задача→шаблон→тесты→дока→ревью-чек-лист), правила токенов, ADR-журнал (стартует с ⚠️ issues 1–3 и SPIKE-230).
- **Acceptance Criteria:** CONTRIBUTING.md полный; docs/adr/ инициализирован.
- **Dependencies:** T10.1. **Complexity:** S

### EPIC-11 — Bitrix Integration (Phase 9)

**Objective:** система на реальных сайтах; сниппеты и legacy-констрейнты выверены практикой.
**Dependencies:** T10.3 (гайды), готовность пилотов (менеджер — решение Phase 0).
**Definition of Done:** пилотные страницы в предпроде/проде; upgrade-процесс отработан.

#### T11.1 [TASK] Пакет сниппетов + legacy-констрейнты (hardening-правила)

- **Context:** bitrix/: подключение header.php (Asset::addCss/addJs, UI_VERSION-константа, preload шрифтов), подключение опционально vi, JSON-данные для JS, пагинация/крошки в шаблонах; **legacy-констрейнты** (см. раздел 6 этого плана): box-sizing-реванш, порядок каскада, запреты обёрток; чек-лист «первое подключение к сайту».
- **Tests first:** html-validate/линт сниппетов; e2e-стенд «legacy-атака» (тег-стили после ui-core) на ключевых компонентах — расширенная версия теста T3.2 (input/h1/ul legacy-правила).
- **Acceptance Criteria:** сниппеты копируются и работают на чистом стенде; legacy-атака не рушит компоненты (фиксируется перечень стойких исключений).
- **Dependencies:** T5.6, T3.2. **Complexity:** M

#### T11.2 [TASK] Пилот A: интеграция (рекомендуемый кандидат — Bitrix-версия career-portal)

- **Context:** подключение на стенд/шаблон сайта; перенос 2–3 страниц (включая форму) на ui-; журнал конфликтов legacy (каждый: симптом → причина → решение/обход).
- **Tests first:** чек-лист страницы: axe (локальный прогон), клавиатурный обход, VI-режим, 375/768/1440, консоль чистая.
- **Acceptance Criteria:** страницы в предпроде; журнал конфликтов пуст или задокументированы обходы; конфигурация подключения = quickstart без отклонений (или quickstart исправлен).
- **Dependencies:** T10.3, T11.1, решение по пилотам. **Complexity:** XL

#### T11.3 [TASK] Пилот B: интеграция (сайт с другой структурой)

- **Context:** цель — переиспользование без форка: тот же dist, другие паттерны страниц; оба пилота в одном бренде (Phase 0).
- **Acceptance Criteria:** сайт B использует компоненты без правок /local/ui/ и без fork-патчей системы; журнал конфликтов приложен.
- **Dependencies:** T11.2. **Complexity:** XL

#### T11.4 [TASK] Отработка upgrade-процесса (minor-релиз на пилотах)

- **Context:** выпустить минор (новый компонент/фикс); обновить оба пилота по чек-листу; замер трудозатрат; улучшить upgrade-гайд.
- **Acceptance Criteria:** обновление сайта ≤ 0.5 дня; гайд отражает реальность; кейсы в changelog.
- **Dependencies:** T11.2, T11.3, T12.1. **Complexity:** S

### EPIC-12 — Release & Versioning (Phase 10)

**Objective:** воспроизводимый релизный конвейер и политика.
**Dependencies:** EPIC-11.

#### T12.1 [TASK] Release pipeline

- **Context:** тег vX.Y.Z → матрица браузеров + scaling/VI smoke → сборка dist-zip → GitHub Release с артефактом; nightly-матрица; changelog-проверка (в релизе есть запись).
- **Acceptance Criteria:** релиз v1.0.0 воспроизводим тегом; артефакт содержит dist полностью; nightly стабильно зелёный.
- **Dependencies:** T1.5, T3.6, T9.1. **Complexity:** M

#### T12.2 [TASK] Политика версионирования, changelog, deprecation

- **Context:** CHANGELOG (Keep a Changelog) с первого релиза; политика N−1; deprecation: пометка в minor, удаление в major, алиас-классы на переходный период; шаблон migration-guide; semver-правила для токенов/классов/HTML-паттернов (architecture §11).
- **Acceptance Criteria:** CHANGELOG ведётся; правила в CONTRIBUTING; «пустой» релиз без changelog-записи блокируется CI.
- **Dependencies:** T12.1. **Complexity:** S

---

## 4. Career Portal extraction plan

Модель потребления: **репозиторий career-portal замораживается как референс и НЕ переходит на пакет** (это статическая вёрстка без Bitrix). Потребитель пакета — его Bitrix-воплощение (пилот A) и все новые сайты. Поэтому все переносы — однонаправленные (extract → refactor → irao-ui), без обратной синхронизации.

| # | Existing implementation (career-portal) | What we extract | What we refactor | Where it moves | How the package is consumed |
|---|---|---|---|---|---|
| 1 | `css/variables.css` (палитра, типографика px, радиусы, transition) | все значения | префикс `--ui-`; px→rem; 2 слоя; дополнить spacing/z-index/shadow/focus/статусные производные; muted-серый для AA | `tokens/primitives.css`, `tokens/semantic.css` | пилот A получает палитру через dist (T2.1–T2.2) |
| 2 | `css/base.css` (fonts, reset, container) | @font-face ×6, reset-правила, reduced-motion | container вынести из base; box-sizing-дисциплина (⚠️ issue 2) | `base/fonts.css`, `base/reset.css`, `base/container` → T3.4 | ui-core.min.css + dist/fonts |
| 3 | `css/vi.css`, `js/vi.js`, `src/blocks/vi/vi-panel.html` | модуль целиком (класс A) | префиксы классов панели `ui-vi-*`, ключ LS `irao-ui-vi`, токены `--ui-*` | `a11y/` + `components/ui-vi/` (T9.1) | ui-vi.min.css + ui.min.js, кнопка входа в header-паттерне |
| 4 | `css/components.css`: `btn/tag/card/field/checkbox/radio/pagination/breadcrumbs` | структуру и визуальные решения | префикс `ui-`; цвета только из токенов; focus-visible; размеры; hover через color-mix; mobile-first | `components/ui-button` и др. (T4.2–T4.7, T5.1–T5.2, T6.3) | ui-core.min.css |
| 5 | `js/dropdowns.js` (custom select) | архитектуру PE: нативный select жив, listbox поверх, change-синхронизация | убрать `vacancy-search__select-wrap` → `data-ui-select` опция; namespace `IraoUI.select`; optgroup, Home/End | `components/ui-select/` (T7.3) | ui.min.js, авто-инициализация по `select[data-ui-select]` |
| 6 | `js/forms.js` | модель PE-валидации (required/email, фокус на первую ошибку, success-свап) | модуль `IraoUI.form`; novalidate ставит JS; конфиг data-атрибутами; aria-контракт с сервером | `components/ui-form/` (T5.5) | ui.min.js |
| 7 | `js/faq.js` + `.faq` CSS (grid-rows анимация) | технику анимации, визуал | база на `<details>/<summary>` вместо div/button | `components/ui-accordion/` (T6.4) | ui-core.min.css (+JS не нужен) |
| 8 | `src/blocks/header/header.js` (dropdown behavior) | паттерн: Escape+возврат фокуса, вне-клик, aria-current по URL | N инстансов; отделить «aria-current по URL» в сниппет | `components/ui-dropdown/` (T6.1) | ui.min.js + header-паттерн |
| 9 | `src/blocks/directions/directions.js` (modal) | фокус save/restore, transitionend-закрытие | семантика `<dialog>`/trap (по ADR T7.1); отделить карусельную специфику (не переносим) | `components/ui-modal/` (T7.2) | ui.min.js |
| 10 | `src/blocks/search-screen/*` (поисковый оверлей) | UX-паттерн полноэкранного поиска | база на ui-modal (trap, aria-modal — пробел аудита) | `patterns/search-overlay` (T7.6) | док-паттерн |
| 11 | `css/pages.css`: `cards-grid`, `form-grid`, `form-aside`, `page-head` | layout-идеи | mobile-first пересборка; отрыв от вакансионной специфики | T3.4, T5.4, T8.x | ui-core + patterns |
| 12 | `tests/*.py` (HTML-парсинг собранных страниц) | идею «тестируем фактический HTML» | перенос на html-validate + Playwright по стендам | `tests/` (T1.2, T1.4) | CI-гейты |
| 13 | `design-qa.md` (evidence-based QA) | процесс и формат отчёта | формализация в релизный чек-лист | `docs/process/design-qa.md` (T12.1) | релизный процесс |
| 14 | `assets/fonts/golos-*.woff2` | файлы шрифтов | проверка лицензии (OFL), приложение текста лицензии | `dist/fonts/` (T3.1) | dist |
| 15 | `build.py`: CSS_ORDER/JS_ORDER, cache-busting `?v=` | принцип порядка каскада и версионирования | реализация в build.mjs + Bitrix-версии | `showcase/build.mjs` (T1.3), T11.1 | dist + сниппеты |

Не переносим (класс C, подтверждение аудита): `build.py`-страничная сборка и «вариант 2» заменами; десктопные media-правила как подход; контентные блоки (hero/production/why-us…); деплой-Pages как релизный процесс.

---

## 5. Bitrix implementation plan

Минимальный путь (соответствует §10 ТЗ):

```text
[1] Install UI System      — скопировать dist в /local/ui/{version}/ (zip релиза)
        ↓
[2] Configure              — header.php: константа UI_VERSION, addCss×(core[, vi]), addJs,
                              preload шрифтов, data-ui-theme при необходимости
        ↓
[3] Use components         — копировать HTML-паттерны из showcase в шаблоны;
                              JSON-данные — <script type="application/json">
        ↓
[4] Build Bitrix template  — header/footer по паттернам (T7.6), main#content, skip-link;
                              формы — контракт T5.6; крошки/пагинация — сниппеты T6.3/T4.7
        ↓
[5] Run QA                 — чек-лист T11.2: axe, клавиатура, VI, 375/768/1440,
                              200%-zoom, консоль; журнал конфликтов legacy
```

Задачи покрываются: подключение package/CSS/JS/fonts — T11.1; PHP-шаблоны и asset loading — T11.1 + T7.6; image handling — T4.6 (дока-чек-лист для контент-менеджеров Bitrix); legacy isolation — раздел 6 ниже + T11.1; theme overrides — T2.4 (дока; в MVP тема одна); migration — раздел 6; compatibility/version upgrade — T11.4, T12.2.

---

## 6. Migration strategy (legacy → UI System)

Стадийная модель для работающего сайта со старым CSS:

```text
Stage 0  Аудит legacy           — перечень страниц, веса CSS, глобальные tag-стили, !important-зоны
   ↓
Stage 1  Alongside install      — /local/ui/ подключён ДО template_styles.css;
                                   legacy-страницы не тронуты и не используют ui-классы
   ↓
Stage 2  New pages/sections     — новые страницы и редизайны секций сразу на ui-;
                                   оба CSS сосуществуют, конфликтов нет (разные классы)
   ↓
Stage 3  Replace per-component  — постранично: заменить разметку блока на ui-паттерн
                                   (кнопки→поля→карточки), прогнать чек-лист страницы, удалить
                                   page-specific legacy-правила этого блока
   ↓
Stage 4  Remove legacy styles   — когда ссылок на legacy-классы на странице/сайте нет
                                   (grep по шаблонам + ручная проверка) — удалить блок CSS
```

Технические ограничения, чтобы legacy не ломал UI System (констрейнты T11.1):

1. **Порядок каскада:** ui-core подключается первым; `template_styles.css` сайта — после (точка законных переопределений).
2. **Специфичность:** компоненты стилизуются одним классом (0-1-0) — побеждают legacy tag-стили (0-0-1); фокус-политика — элемент+псевдокласс (⚠️ issue 1).
3. **box-sizing:** каждый ui-компонент объявляет свой (⚠️ issue 2) — переживает `* { box-sizing: content-box }`.
4. **Запрет эскалации:** система никогда не отвечает на legacy `!important` своим `!important` (кроме vi). Конфликт = страница остаётся на legacy или изолируется.
5. **Запретные обёртки:** ui-компоненты не вкладываются в legacy-контейнеры с фиксированной высотой и `overflow: hidden` (кроме осознанных скролл-зон).
6. **Смешение на странице** допускается только на уровне целых компонентов/секций, не «половина компонента».
7. **Глобалы base минимальны** и перечислены в доке (`[hidden]`, img max-width, scrollbar-gutter, reduced-motion) — сайт знает, что получит глобально.
8. **Пин версии:** сайт закрепляет точную версию; обновление — осознанный акт по upgrade-гайду (T11.4).
9. **Журнал конфликтов** обязателен на каждом сайте (формат T11.2) — кормит «известные ограничения» документации.

---

## 7. CI/CD: джобы и гейты

Схема соответствует architecture §10; обязательность:

| Джоб | Когда | Статус |
|---|---|---|
| lint (stylelint+eslint+prettier) | PR | **mandatory** |
| html-validate (паттерны+стенды) | PR | **mandatory** |
| unit (vitest) | PR | **mandatory** |
| build (dist+showcase) | PR | **mandatory** |
| e2e + axe (chromium) | PR | **mandatory** |
| contrast-скрипт токенов (T2.3) | PR | **mandatory** |
| visual regression | PR | **advisory** (диф-артефакты, не блокирует) → mandatory с v1.0 (ADR-0004) |
| матрица chromium/firefox/webkit | nightly + release | release-**mandatory** |
| scaling (zoom/32px) + VI smoke | nightly + release | release-**mandatory** |
| deploy showcase | main | automatic |
| dist-zip + GitHub Release + changelog-check | тег | release |

Typecheck отсутствует сознательно: JS нативный без TS (architecture §9); `eslint` закрывает статический анализ.

## 8. Release strategy (задачи и правила)

Правила зафиксированы в architecture §11; задачи: **T12.1** (pipeline), **T12.2** (changelog/политика/deprecation/migration-шаблон), **T11.4** (репетиция upgrade). Ключевое для исполнения:

- semver-триггеры задокументированы в CONTRIBUTING: новый компонент/модификатор/токен = minor; фикс = patch; удаление/переименование классов/токенов/HTML-паттернов = major;
- deprecation-цикл: пометка в minor → алиас (старое имя работает, консоль-warning в dev-сборке) → удаление в major;
- каждый major сопровождается migration-guide (шаблон в T12.2) и живёт в отдельной папке на сайтах (`/local/ui/2.x/`) — откат и сосуществование бесплатны.

Storybook: решение архитектуры — статический showcase (T1.3/T10.x); Storybook не строим (пересмотр — отложенный backlog, архитектура §8).

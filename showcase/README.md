# showcase/

Статический styleguide: страницы-стенды компонентов. Один источник правды — по тем же страницам читают интеграторы и гоняют Playwright (02-architecture §7).

- `build.mjs` — сборка dist + генерация showcase (задача T1.3).
- `serve.mjs` — локальный статик-сервер (`npm run serve`, порт 8080, переопределяется `PORT`).
- `pages/<name>/` — расширенные стенды (см. ниже).
- `dist/` — сгенерированный полигон (gitignored, не коммитится).

Нельзя: production-код компонентов (он живёт в `components/`).

## Сборка

`npm run build` — полный прогон: `dist/` (поставка) + `showcase/dist/` (полигон).

```text
dist/                      # то, что уезжает на сайты (ADR-0006, §6.1)
├── ui-core.min.css        # tokens → base → компоненты, баннер версии+sha
├── ui-vi.min.css          # VI-модуль (ГОСТ Р 52872) — отдельным файлом
├── ui.min.js              # все JS-модули (IIFE), баннер версии+sha
├── fonts/                 # копия assets/fonts (появятся в T3.1)
└── themes/                # копия themes/*.css

showcase/dist/             # сгенерированный полигон (gitignored)
├── index.html             # индекс-каталог стендов
├── standalone.html        # страница только с ui-core.min.css — проверка url()
├── stands/tokens.html     # стенд токенов (T2.2) — генерация из tokens/*.css
├── stands/base.html       # стенд base (T3.2) — из showcase/pages/base/index.html
├── stands/typography.html # стенд типографики (T3.3) — из showcase/pages/typography/index.html
├── stands/layout.html     # стенд layout-примитивов (T3.4) — из showcase/pages/layout/index.html
├── stands/ui-skip-link.html # стенд ui-skip-link (T3.5) — из канонического паттерна components/ui-skip-link/
├── docs/<name>.html       # дока компонента по шаблону T10.1 (см. «Доки по шаблону»)
└── stands/<name>.html     # стенд компонента из components/<name>/<name>.html
```

Порядок каскада — явные списки в `showcase/build.mjs` (`CSS_CORE_ORDER`,
`COMPONENTS`, `CSS_VI`, `JS_VI`) — урок CSS_ORDER/JS_ORDER career-portal:
никакого glob-алфавита. Файлы из списков, которых ещё нет (T2.x/T3.x/T9.x),
пропускаются с предупреждением. Сборка — конкатенация + минификация
(esbuild transform, ADR-0005): `url()` не разрешаются и не переписываются,
поэтому `base/fonts.css` ссылается на `fonts/` относительно — структура dist
повторяет исходники.

### Как добавить файл в бандл

| Что | Куда | Действие |
|---|---|---|
| Новый компонент (CSS+JS) | `components/ui-<name>/` | одна строка `<имя>` в `COMPONENTS` в `build.mjs`; CSS обязателен, JS подключается автоматически, если есть |
| Base-стиль | `base/<файл>.css` | путь в `CSS_CORE_ORDER` на нужное место каскада |
| VI-модуль | `a11y/vi.css`, `a11y/vi.js` | уже в списках `CSS_VI`/`JS_VI` |
| Шрифты | `assets/fonts/` | копируются в `dist/fonts/` автоматически (T3.1) |
| Тема | `themes/theme-<имя>.css` | копируется в `dist/themes/`, попадает в переключатель `?theme=` автоматически |

### Стенды

- Стенд «Токены» (`stands/tokens.html`, T2.2) генерируется из
  `tokens/primitives.css` + `tokens/semantic.css` модулем
  `showcase/tokens-stand.mjs` — вручную не редактируется: новый токен
  появляется после `npm run build`. Полнота «узлов стенда = токенов файлов» —
  tests/unit/tokens-stand.test.js (`npm run test:unit`).
- Стенд «base» (`stands/base.html`, T3.2) генерируется из фрагмента
  `showcase/pages/base/index.html`: все 7 целей политики фокуса
  (`base/focus.css`, ADR-0001) на одной странице — поверхность
  Tab-обхода и legacy-атаки (`tests/e2e/focus.spec.js`).
- Стенд «typography» (`stands/typography.html`, T3.3) генерируется из
  фрагмента `showcase/pages/typography/index.html`: все классы ролей
  `ui-h1…ui-micro` + `ui-text--muted`, списки `ui-list`, `ui-address` и
  длинные RU-слова (переносы) — поверхность computed-размеров, иерархии
  заголовков и 32px-сценария (`tests/e2e/typography.spec.js`).
- Стенд «layout» (`stands/layout.html`, T3.4) генерируется из фрагмента
  `showcase/pages/layout/index.html`: контейнер, секции (в т.ч.
  `ui-section--muted`) и сетки `ui-grid--2/3/4` с длинным RU-словом в ячейке
  — поверхность overflow-проверок (320/375/768/1024/1440), computed-колонок
  по вьюпортам и эталонов на 4 вьюпортах (`tests/e2e/layout.spec.js`).
- Стенд «patterns/list-page» (T8.1) — паттерн «Страница списка»: эталонная
  сборка страницы из готовых компонентов без нового CSS; обе ветки («с
  данными» и «пустая выдача») — якоря-состояния на одной странице (приём
  integration/form-full-cycle). Источник — канонический файл паттерна
  `patterns/list-page/list-page.html` (доки-паттерны — `patterns/<name>/`,
  CONTRIBUTING); связки паттерна — `<style>` источника (зона сайта, в dist
  не попадает). Каркас БЕЗ служебного <h1>: заголовок страницы несёт сам
  паттерн — h1 page-head (приём error-404).
- Стенд «patterns/detail-page» (T8.2) — паттерн «Детальная страница»:
  эталонная сборка детальной страницы (крошки → page-head → контент +
  sticky-aside → related) с schema.org/JobPosting-микроразметкой эталона.
  Источник и правила — те же, что у patterns/list-page выше: канонический
  файл `patterns/detail-page/detail-page.html`, связки — `<style>` источника,
  каркас БЕЗ служебного <h1>.
- Стенды «patterns/search-overlay» / «patterns/header» / «patterns/footer»
  (T7.6) — паттерны «Поисковый оверлей / Шапка / Подвал» (доки-паттерны —
  `patterns/<name>/`, связки — `<style>` источника). Шапка и подвал ставятся
  НА УРОВНЕ body (frame-опции `frameHeader: false` + `preMain` / `pageFooter`):
  у копируемого `<header>`/`<footer>` честные роли banner/contentinfo;
  служебная шапка каркаса на стенде шапки выключена (вторая banner-лендмарка
  — нарушение axe), потому на этом стенде нет и переключателя темы. У
  search-overlay и header — служебный <h1> каркаса (фрагмент, не страница);
  исключение «style прямо в body» стендов шапки/подвала объявляет сборка
  (inline-директива в build.mjs — во фрагменте без body правило молчит).
- Базовый стенд генерируется автоматически для каждой папки
  `components/ui-<name>/` с каноническим `ui-<name>.html`: тело паттерна
  оборачивается в каркас (skip-link, header-заглушка,
  `<main id="main" tabindex="-1">` — цель skip-link фокусируема, T3.5,
  подключение dist, переключатель темы `?theme=`). Сборка валидирует пару
  «skip-link + цель» на каждой странице (selfChecks).
- Расширенный стенд (все варианты × состояния, 375/768/1440) —
  `showcase/pages/<name>/index.html` (фрагмент тела, как канонический
  паттерн): при наличии он заменяет базовый. Контент стендов конкретных
  компонентов — задачи EPIC-4+.
- Папка компонента без строки в `COMPONENTS` — предупреждение сборки
  (CSS не попадёт в `ui-core.min.css`).

### Доки по шаблону (T10.1)

Для компонента с метаданными `docs/<name>.mjs` сборка генерирует
`dist/docs/<name>.html` — страницу по единому шаблону (02-architecture §8):
живые примеры → HTML-сниппет → состояния → responsive-стенд (iframe
375/768/1440) → a11y → API → do/don't → schema → версия/changelog.

- Один источник — файлы компонента: примеры и сниппет рендерятся из
  канонического `components/<name>/<name>.html`, текстовые секции — из
  «## заголовков» README, машинные части (клавиатура/ARIA/скринридер/
  schema/версия) — из метаданных `showcase/docs/<name>.mjs`. Контракт и
  рендер — [`docs-template.mjs`](docs-template.mjs); чек-лист «страница =
  шаблон» — CONTRIBUTING.md.
- «Сниппет = разметка стенда» проверяется машиной на трёх уровнях: selfChecks
  сборки по записанному файлу («диф на билде»), юнит-пины
  `tests/unit/docs-template.test.js`, e2e `tests/e2e/docs-template.spec.js`
  (живой DOM + axe). Расхождение уронит сборку — дока не отстаёт от кода.
- Эталоны T10.1 — `ui-button` (CSS-only), `ui-field` (CSS+разметка-паттерн),
  `ui-modal` (JS-компонент); полный прогон по всем компонентам — T10.2
  (добавление страницы = один файл метаданных).

### Идемпотентность

В баннере каждого файла dist — версия (package.json) и git-sha, меток времени
нет: два прогона `npm run build` на одном коммите дают байт-в-байт одинаковый
результат (sha меняется только новым коммитом). Проверено: sha256 файлов
совпадают между прогонами.

## Сценарии проверки

С T1.4 сценарии гоняет Playwright (`npm test`, харнесс — tests/README.md).
Первый ручной прогон от 2026-10-05 (с временной фикстурой компонента и темы):

1. индекс showcase открывается — `GET /showcase/dist/` → 200;
2. все ссылки стендов — 200 (обход ссылок индекса);
3. все `href`/`src` всех страниц (индекс, стенды, standalone) резолвятся
   без сетевых ошибок; стенды используют `dist/`, не исходники;
4. `url()` внутри `ui-core.min.css` резолвятся (шрифты → `dist/fonts/`);
   standalone-страница с одним `ui-core.min.css` — без сетевых ошибок.

## pages/

Расширенные стенды компонентов: `pages/<name>/index.html` — живые примеры всех состояний на 375/768/1440.

- Можно: HTML из канонических паттернов `components/<name>/<name>.html`, сценарии поведения для e2e/axe (текстом — до T1.4/T1.6).
- Нельзя: уникальный CSS/JS стенда, расходящийся с компонентом.

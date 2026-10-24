# Таблица соответствия «career-portal значение → токен» (T2.1 примитивы, T2.2 семантика)

> Документ-деливерабл задачи T2.1, не файл задачи бэклога: живёт в
> architecture/, а не в epics/ — валидатор бэклога считает любой `T*.md`
> в epics/ файлом задачи (scan `T*.md` в tools/validate-backlog.mjs).

Инструмент контроля отклонений от одобренного дизайна (Implementation
requirements T2.1 п.4): каждое значение career-portal перенесено **как есть**;
отклонений от эталона нет — колонка «Решение» во всей таблице `перенос`,
`design-decision` не требуется. AA-правки значений — отдельный раздел
«AA-замены» (T2.3), микрорасхождения, решённые в пользу значений ДС, —
раздел «Принято значение ДС» (T14.6, REPORT §3.3). Исполняемая форма таблицы (гейт в PR):
`tests/unit/tokens-primitives.test.js` → `npm run test:unit`.

Источники: `css/variables.css`, захардкоженные значения `css/components.css` /
`css/pages.css` (репозиторий `D:/repositories/career-portal`, read-only).

## Основная палитра (css/variables.css)

| career-portal | Значение | Примитив | Решение |
| --- | --- | --- | --- |
| `--color-primary` | `#002856` | `--ui-blue-800` | перенос |
| `--color-primary-deep` | `#152A4F` | `--ui-blue-750` | перенос |
| `--color-accent` | `#F26722` | `--ui-orange-500` | перенос |
| `--color-accent-light` | `#F37131` | `--ui-orange-400` | перенос |
| `--color-accent-bright` | `#F28B00` | `--ui-orange-300` | перенос |
| `--color-text` | `#1F1F1F` | `--ui-black` (якорь шкалы: `--ui-gray-900`) | перенос |
| `--color-text-muted` | `#808080` | `--ui-gray-600` | перенос; AA-замена значения — слой 2, см. «AA-замены» (T2.3) |
| `--color-text-on-dark`, `--color-surface`, `#FFFFFF` кнопок | `#FFFFFF` | `--ui-white` | перенос |
| `--color-text-on-dark-muted` | `#8F9CBF` | `--ui-slate-400` | перенос |
| `--color-surface-blue-50` | `#F1F5FE` | `--ui-blue-50` | перенос |
| `--color-surface-blue-100` | `#E8EEFE` | `--ui-blue-100` | перенос |
| `--color-blue-700`, `--color-blue-800` (дубликат) | `#164B89` | `--ui-blue-700` | перенос; разведение двух смыслов — семантика (T2.2) |
| `--color-peach-100` | `#FFD3B7` | `--ui-peach-100` | перенос |
| `--color-peach-200` | `#FFCEAC` | `--ui-peach-200` | перенос |
| `--color-peach-300` | `#FFAB72` | `--ui-peach-300` | перенос |
| `--color-plum` | `#511D59` | `--ui-purple-900` | перенос |

## Стеклянные поверхности, оверлеи, сырьё теней

| career-portal | Значение | Примитив | Решение |
| --- | --- | --- | --- |
| `--glass-light` | `rgba(255, 255, 255, 0.8)` | `--ui-white-80` | перенос |
| `--glass-dark` | `rgba(255, 255, 255, 0.1)` | `--ui-white-10` | перенос |
| `--glass-blue` | `rgba(0, 40, 86, 0.5)` | `--ui-blue-800-50` | перенос |
| `pages.css:164` — фон sticky-шапки | `rgba(255, 255, 255, 0.9)` | `--ui-white-90` | перенос |
| `pages.css:620` — подпись на тёмном | `rgba(255, 255, 255, 0.75)` | `--ui-white-75` | перенос |
| `components.css:359` — hover `dd__trigger` | `rgba(241, 245, 254, 0.55)` | `--ui-blue-50-55` | перенос |
| `pages.css:478` — оверлей баннера | `rgba(0, 40, 86, 0.55)` | `--ui-blue-800-55` | перенос |
| `components.css:375` — цвет тени dropdown | `rgba(0, 40, 86, 0.16)` | `--ui-blue-800-16` | перенос; геометрия тени — T2.2 |
| `components.css:124` — цвет тени карточки | `rgba(0, 40, 86, 0.10)` | `--ui-blue-800-10` | перенос; геометрия тени — T2.2 |

## Статусы и палитра тегов (css/variables.css)

| career-portal | Значение | Примитив | Решение |
| --- | --- | --- | --- |
| `--color-error` | `#D8402C` | `--ui-red-600` | перенос; AA-замена значения — слой 2, см. «AA-замены» (T2.3) |
| `--color-error-bg` | `#FFF6F4` | `--ui-red-50` | перенос |
| `--color-success`, `--tag-green-text` (одно значение) | `#1E7A34` | `--ui-green-700` | перенос |
| `--color-success-bg`, `--tag-green-bg` (одно значение) | `#DDF3E1` | `--ui-green-50` | перенос |
| `--tag-orange-bg` | `#FFE3D3` | `--ui-orange-50` | перенос |
| `--tag-orange-text` | `#B34A10` | `--ui-orange-700` | перенос; AA-замена значения — слой 2, см. «AA-замены» (T2.3) |
| `--tag-gray-bg` | `#F0F1F3` | `--ui-gray-100` | перенос |

## Фон внутренних страниц (css/variables.css)

| career-portal | Значение | Примитив | Решение |
| --- | --- | --- | --- |
| `--color-page-head-bg` | `#F5F8FC` | `--ui-slate-50` | перенос |
| `--color-page-head-border` | `#E8EEF6` | `--ui-slate-100` | перенос |

## Захардкоженные hex компонентов (components.css / pages.css)

| career-portal | Значение | Примитив | Решение |
| --- | --- | --- | --- |
| `components.css:117`, `pages.css:182` — рамка карточки | `#D6D6D6` | `--ui-gray-300` | перенос |
| `components.css:123` — hover-рамка карточки | `#B9C6DE` | `--ui-slate-300` | перенос |
| `components.css:22`, `pages.css:526` — разделители/прогресс | `#C4CDDC` | `--ui-slate-200` | перенос |

## Дополнения сверх career-portal (Scope T2.1 — «дополнения»)

| Примитив | Значение | Обоснование |
| --- | --- | --- |
| `--ui-gray-200` | `#E0E0E0` | новый: полнота нейтральной шкалы 100–900 (поверхности) |
| `--ui-gray-400` | `#BDBDBD` | новый: полнота нейтральной шкалы 100–900 (рамки) |
| `--ui-gray-500` | `#9E9E9E` | новый: полнота нейтральной шкалы 100–900 (иконки) |
| `--ui-gray-700` | `#616161` | новый: полнота нейтральной шкалы 100–900 (сырьё AA-замены `#808080`, применена в T2.3) |
| `--ui-gray-800` | `#424242` | новый: полнота нейтральной шкалы 100–900 |
| `--ui-orange-800` | `#A94710` | новый (T2.3): AA-замена `--tag-orange-text` в слое 2; `--ui-orange-700` остаётся эталоном |
| `--ui-red-700` | `#C93A26` | новый (T2.3): AA-замена `--color-error` в слое 2; `--ui-red-600` остаётся эталоном |

## Соглашения именования (слой 1, ADR-0009)

- Шаги шкал — числа от светлых к тёмным (50 светлее 900). «Маркетинговых» имён
  нет: `--color-primary-deep` → `--ui-blue-750`, `--color-plum` → `--ui-purple-900`.
- Семейство `slate` — холодные серо-синие нейтрали career-portal (фон страниц,
  разделители, hover-рамка, muted-текст на тёмном): они отличны по насыщенности
  и от brand-синих (`blue`), и от чистых серых (`gray`); смешение их в одной
  шкале дало бы соседние шаги-близнецы (`#E8EEFE` рядом с `#E8EEF6`).
- `--ui-blue-750` — промежуточный шаг: `#152A4F` по светлоте между
  `--ui-blue-700` (#164B89) и `--ui-blue-800` (#002856); значение не менялось.
- Альфа-токены: суффикс — процент непрозрачности (`--ui-white-80` = 0.8).
- Значения, заведомо не проходящие AA (например, `--ui-gray-600` #808080 как
  muted-текст), перенесены как есть: примитивы — эталон утверждённого дизайна,
  правка значений сделана в T2.3 семантически (см. «AA-замены»).

## Слой 2 — семантика (T2.2)

Исполняемая форма — tests/unit/tokens-semantic.test.js; стенд —
`/showcase/dist/stands/tokens.html` (генерация из файлов). Нейминг —
02-architecture §3.1/§3.2 (`--ui-color-*`, `--ui-fs/lh/fw-*`, `--ui-space-*`…).

### Перенос (значение как есть, px → rem ÷16)

| career-portal | Токен слоя 2 | Примечание |
| --- | --- | --- |
| `--color-primary` | `--ui-color-primary` → `--ui-blue-800` | |
| `--color-primary-deep` | `--ui-color-primary-deep` → `--ui-blue-750` | |
| `--color-accent` | `--ui-color-accent` → `--ui-orange-500` | |
| `--color-blue-700` (hover btn--primary, components.css:80) | `--ui-color-primary-hover` → `--ui-blue-700` | hover-пара одобренного дизайна (T2.6, ADR-0010); color-mix значение не заменяет |
| `--color-accent-light` (hover btn--accent, components.css:83) | `--ui-color-accent-hover` → `--ui-orange-400` | hover-пара одобренного дизайна (T2.6, ADR-0010) |
| `--color-text` | `--ui-color-text` → `--ui-black` | |
| `page-title`/`section__title` `color: var(--color-primary)` (все заголовки макета #002856; переменной в career-portal нет) | `--ui-color-heading` → `--ui-color-primary` | T14.1: семантическое имя смысла «цвет заголовков»; alias на primary — тема с отличным primary красит заголовки сама; пары `heading-on-*` контраст-гейта |
| `--color-text-muted` | `--ui-color-text-muted` → `--ui-gray-700` | AA-замена значения — T2.3, см. «AA-замены» |
| `--color-text-on-dark` / `…-muted` | `--ui-color-text-on-dark[-muted]` → `--ui-white` / `--ui-slate-400` | |
| `--color-surface` | `--ui-color-surface` → `--ui-white` | |
| `--color-surface-blue-50` | `--ui-color-surface-muted` → `--ui-blue-50` | см. решение №2 ниже |
| `--color-surface-blue-100` (hover `.btn--light`, components.css:93) | `--ui-color-surface-hover` → `--ui-blue-100` | пара одобренного дизайна (ADR-0010 п.4: color-mix значение не воспроизводит); семантическое имя заведено T4.2 |
| `--color-surface-blue-100` (bg `.tag--blue`, components.css:108) | `--ui-color-tag-blue-bg` → `--ui-blue-100` | T4.3: та же ступень одобренной шкалы под именем пары тега; до T4.3 пара tag-blue контраст-гейта ссылалась на примитив напрямую |
| `--color-blue-700` (карточки «почему мы») | `--ui-color-surface-blue-deep` → `--ui-blue-700` | разведение дубля #164B89 |
| `--color-page-head-bg` | (поверхность внутренних страниц — EPIC-4 паттерны) → `--ui-slate-50` | смысловая пара к border-muted |
| `--color-page-head-border` | `--ui-color-border-muted` → `--ui-slate-100` | |
| `#B9C6DE` (hover-рамка карточки, components.css:123) | `--ui-color-border-hover` → `--ui-slate-300` | T4.4: семантическое имя по решению №1 ниже («имена заведут задачи компонентов»); пара в контраст-гейте не требуется — осознанное исключение (декоративная рамка) |
| `--glass-light/dark/blue` | `--ui-color-glass-light/dark/blue` → `--ui-white-80` / `--ui-white-10` / `--ui-blue-800-50` | |
| `--color-error[-bg]` | `--ui-color-error[-bg]` → `--ui-red-600` / `--ui-red-50` | |
| `--color-success[-bg]` | `--ui-color-success[-bg]` → `--ui-green-700` / `--ui-green-50` | |
| `--tag-orange-bg/text`, `--tag-green-bg/text`, `--tag-gray-bg` | `--ui-color-tag-*` | пары bg/text для Badge (T4.2) |
| `--fs/lh/fw-{h1..h4,lead,body,small,caption,micro}` | `--ui-fs/lh/fw-*` тройками | px → rem; лестница из media-правил base.css |
| `--font-family` | `--ui-font-family` | стек расширен по §3.2 — решение №6 |
| `--radius-small/card/big/pill` (8/16/24/100) | `--ui-radius-{sm,md,lg,pill}` | |
| тень карточки `0 12px 32px rgba(0,40,86,.10)` (components.css:124) | `--ui-shadow-md`, `--ui-shadow-card` | геометрия px → rem, цвет — примитив-альфа |
| тень dropdown `0 16px 40px rgba(0,40,86,.16)` (components.css:375) | `--ui-shadow-lg` | |
| `--transition` 0.25s ease | `--ui-transition` | fast/slow 0.15/0.4 — §3.2 (новые) |
| height `.btn` 52px (components.css:70) | `--ui-button-height: 3.25rem` | T4.2: используется как min-height (32px-база T3.6) |
| height `.pill-btn` 44px (pages.css:220) | `--ui-button-height-pill: 2.75rem` | T14.4, калибровка T16.11 (байт-канон probe-сверки original/clone): 44px вне шкалы отступов §3.2 — перенос «как есть» (прецедент `--ui-pagination-size`), используется как min-height; паддинг 0 6px 0 20px (pages.css:221) — «как есть» токеном `--ui-button-pill-pad-inline: 1.25rem 0.375rem` (20px/6px вне шкалы, прецеденты `--ui-field-pad-inline`/`--ui-tag-gap`; решение T14.4 «16/4 из шкалы» переоткрыто директивой пиксель-перфект), вертикаль 0; гэп 12px (pages.css:218) — `--ui-space-3` (на шкале); рамка 1px **primary** (пара primary, pages.css:222 — решение T14.4 `--ui-border-color` переоткрыто); метка fs 13px (pages.css:229) — «как есть» `--ui-button-pill-label-fs: 0.8125rem` (вне тройки ролей T3.3, прецедент `--ui-dropdown-item-fs`; решение T14.4 fs-small 14 переоткрыто), **uppercase** и letter-spacing 0.04em (pages.css:230/231; `--ui-button-pill-letter-spacing`, прецедент `--ui-tag-letter-spacing`); кружок `.pill-btn__icon` 32×32 (pages.css:240/241) → `--ui-button-pill-icon-size: 2rem`, фон **primary** (pages.css:243 — алиас пар tag-blue; решение T14.4 «accent постоянно» — неверно прочитанный канон), на hover **accent** (pages.css:250 — алиас пар tag-orange; пара `on-dark-on-accent` контраст-гейта, графика 3.12:1 ≥ 3:1); hover пилюли — фон blue-50 = `--ui-color-surface-muted` (pages.css:248; решение T14.4 surface-hover/blue-100 переоткрыто); sm: гэп 8, паддинг 0 5px 0 16px → `--ui-button-pill-pad-inline-sm: 1rem 0.3125rem` («как есть»), sm-кружок 30px (pages.css:254) → `--ui-button-pill-icon-size-sm: 1.875rem` («как есть», заменяет ступень 24px T14.4), высота sm 32px — «принято ДС» (ступень шкалы T4.2; у оригинала `.pill-btn--sm` 40px — вне задачи T16.11, высотная шкала ДС не менялась) |
| padding `.btn` 12px 28px (components.css:71) | `--ui-button-pad-inline: 1.75rem` (горизонталь; вертикаль — `--ui-space-3`) | T14.3: 28px вне шкалы отступов §3.2 — перенос «как есть» (прецедент `--ui-card-gap`); до T14.3 горизонталь несла `--ui-space-5` (24px) — REPORT §3.3 «кнопки клона плотнее оригинала» |
| сброс подчёркивания ссылок каркаса: `a { text-decoration: none }` (base.css:75) — `a.btn` без underline | `text-decoration: none` в базовом правиле `.ui-button` (токена нет: глобального сброса в ДС нет — ui-link подчёркнут всегда, T4.1; сброс точечный в кнопочном виде — конвенция BEM, T4.2) | T16.2: a.btn tdl none == a.ui-button tdl none — закрыто (REPORT §8.2 №3) |
| текст-кнопка «Сбросить ×» сайдбара фильтров: `.vac-side__reset` — `<button>` fs 14/400 (fs-small-regular), underline, color muted, border 0, padding 0, без подложки (pages.css:100; замер REPORT §8.2 №8) | модификатор `.ui-button--text` (T16.7): fs-small-regular — пара `--ui-fs-small` × `--ui-fw-body` (400; прецедент ui-select), подпись `--ui-color-text-muted` (AA-замена muted T2.3), `text-decoration: underline` — переопределяет сброс базы T16.2 (правило после базы); фон/рамка прозрачные, паддинг 0, min-height базы сброшен — высота по строке, не 52px; hover/active — подпись primary, подчёркивание сохраняется (цвет линии — currentColor) | T16.7: аналога текстовой кнопки не было (пилот вынужденно ставил outline 52px — REPORT §8.2 №6); новых токенов нет — muted-пара уже гейтится (muted-on-surface); hover оригинала — accent (pages.css:114), спека T16.7 осознанно задаёт primary (как T14.4 — решение спеки) |
| padding `.breadcrumbs` 20px 0 24px (components.css:14) | вне токенов — связка page-паттернов `padding-block: 1.25rem var(--ui-space-5)` (`lpp-/dpp-/fpp-breadcrumbs`, `<style>` паттернов) | T14.5: вертикальный ритм крошек — ответственность шаблона, компонент отступов не получает (инвариант T4.7); верх 20px вне шкалы отступов §3.2 — перенос «как есть» (прецедент `--ui-button-pad-inline`), полоса 62px; REPORT §3.3 «крошки прилипают к контенту — нет ритма страницы» |
| height `.tag` 28px (components.css:101) | `--ui-tag-height: 1.75rem` | T4.3: используется как min-height (тот же прецедент) |
| height «белый на primary, 40px» (pages.css:596 — `.filter-tag` 40px в паре с inline `background: var(--color-primary); color: #fff` активных фильтр-ссылок — media.html:156, education.html:187; REPORT §3.3 ошибочно атрибутировал фото-оверлею) | `--ui-tag-height-on-photo: 2.5rem` — модификатор `ui-tag--on-photo` (API поверх фото/тёмного) | T16.10; реклассификация ревью T16.10: теги на фото событий/статей оригинала несут тинты вариантов 28px (events.html:270/302) либо `.media__tag` (media.css:72–87; позиционирование — pages.css:573 без цвета), прямого аналога у модификатора нет; 40px вне шкалы отступов §3.2 — перенос «как есть» (прецедент `--ui-chip-height`), используется как min-height (прецедент `--ui-tag-height`); в пилоте модификатор не применяется (паритет с оригиналом; применение и вопрос 40-vs-28 у фильтр-тегов — решение владельца, зона T16.14); пара primary/text-on-dark — готовая пара слоя 2 (14.60:1, новых токенов нет), контраст-гейт — алиас `tag-on-photo`; правило «когда on-photo» — README ui-tag |
| filter-tag/media — фильтры каталогов: `.tag--blue.filter-tag` (media.html:156, education.html:187, events-search.html:14; размер — pages.css:596: height 40px, padding 8px 20px, font-size `--fs-small-regular` — ТОЛЬКО размер: fw 500 остаётся у `.tag` от `--fw-caption`, ls 0.02em; probe reg-4/media.json: 40/14/500/18.9/0.28px/8×20/100px; активная — inline primary/`#fff`) | модификатор `ui-tag--filter` (вариант A спеки) поверх цветового варианта: `ui-tag--blue ui-tag--filter` — height `--ui-tag-height-filter` 2.5rem (min-height; 40 вне шкалы §3.2 — перенос «как есть», собственный токен при равном значении с on-photo — прецедент пары `--ui-pagination-size`/`--ui-button-height-pill`), padding `--ui-space-2` × `--ui-tag-filter-pad-inline` 1.25rem (20px вне шкалы — прецедент `--ui-field-pad-inline`), тройка small целиком `--ui-fs-small` × `--ui-fw-small` × `--ui-lh-small` (14/500/1.35 = probe; «fs-small × fw 400» спеки — значение `--fw-small-regular`, которое pages.css:596 НЕ переносит — DS-выражение по probe), `text-decoration: none`; активное — `[aria-current='page']` → primary/text-on-dark (пара `tag-on-photo`, форма inline-стиля оригинала; ARIA вместо inline — осознанно, прецедент `ui-chip__pill:where`) | T16.14: первый потребитель `ui-tag--blue` в роли фильтра; выбор варианта A (модификатор тега) против B (`ui-chip--blue`): канон фильтра — тег со своей высотой 40/типографикой small, не чип (у `ui-chip--blue` высота 40 против 36 базы чипа потребовала бы размерного варианта чипа и дублирования тройки), `--ui-chip-height` 36 остаётся у чипов вакансий/стажировок; пара покоя — `tag-blue` (primary/blue-100, в гейте); hover у `.filter-tag` нет (base.css:75) — модификатор не вводит; зазоры тулбара media (gap 12px, отступ «Рубрики:» 24px) — сайт-зона пилота `.cp-media-toolbar` (`--ui-space-3`/`--ui-space-5`, nav display: contents); adoption — mediaMain (обе группы); events-search/education — та же связка ДС, adoption вне Scope T16.14 (страничные); probe-пара `filter-tag` — compare.mjs (гейт закрывающей T16.8) |
| заголовки карточек списков 20/500 color-text: `.event-card__title` (pages.css:579), `.org-card__name` (pages.css:831), `.dir-card__title` (pages.css:1041), `.timeline__title` (pages.css:1130), `.intern-person__name` (pages.css:1142) — `fs-body` × `fw-body-bold`, lh 1.3, `color-text` | роль `ui-h6` — тройка `--ui-fs/lh/fw-h6` (20/500, lh 1.25), цвет НЕ задаёт — наследует `body` (`--ui-color-text`): осознанное исключение из политики T14.1 «заголовочные роли несут --ui-color-heading» (канон карточных заголовков — color-text); lh 1.25 против 1.3 (25 против 26px на строке) — в пороге ≤4px эпика, «принято ДС» | T16.12: роль закреплена за «заголовком карточки списков» (typography-roles.md); adoption build.mjs — event/org/offer/adv/intern/timeline/person |
| заголовки карточек adv/offer 20/500 primary: `.adv-card__title` (pages.css:509), `.offer-card__direction` (pages.css:841) — те же тройки, `color: var(--color-primary)` | модификатор `ui-h6--primary` — `color: var(--ui-color-primary)`, только цвет (тройка остаётся на роли); прецедент — цветные варианты `ui-tag`/`ui-text--muted` | T16.12: выбор спеки «модификатор vs сайт-зонная перекраска» решён модификатором (повторяющийся канонный смысл «акцентный заголовок карточки», не зона конкретной страницы) |
| мини-тайтл карточки статьи 14/500: `.article-card__title` (pages.css:608) — `fs-small` × `fw-small`, lh 1.35, `color-text`; заголовок остаётся тегом h3 | роль `ui-small` на семантике заголовка (канон «визуал ≠ семантика», typography-roles.md): fs-small/fw-small совпадают с каноном точно (fw-small = 500 в обеих системах); выбор спеки «ui-h6--sm vs ui-small» — ui-small: модификатор дублировал бы тройку small-роли, нарушение правила «роль задаёт тройку целиком» (T3.3) | T16.12: adoption — articleCard и mediaHomeCard (ветка с desc); НЮАНС владельцу: на index большая карточка media несёт `.media__card-caption` fs-lead 24/500 (src/blocks/media/media.css:99, live-замер 24.10) — спека ставит 14/500 «одним выбором на оба места»; блок — лендинг index (P2, вне эпика), расхождение зафиксировано здесь |
| подписи/шорты/даты карточек muted: `.org-card__short` (pages.css:833), `.dir-card__short` (pages.css:1045), `.timeline__text` (pages.css:1132), `.intern-person__short` (pages.css:1146), `.article-card__date` (pages.css:610), `.media__card-date` — `fs-small-regular` 14/400 `color-text-muted`; offer-card short / adv-card text остаются `color-text` (pages.css:845/511) | `ui-small ui-text--muted` — AA-замена `#808080` → gray-700 `#616161` (T2.3, «принято ДС»); fw 400→500 — small-роль ДС, «принято ДС» (mapping T14.8/T14.9, не переоткрывается); обрез 3 строки `.dir-card__short` (-webkit-line-clamp, pages.css:1050–1053) — сайт-зона пилота `.cp-intern-card .ui-small` | T16.12: подписи без muted-класса в клоне — REPORT §9.1 №2; clamp в спеке приписан `.org-card__short`, фактически (pages.css:833 — без обреза) несёт `.dir-card__short` — применено по фактическому канону |
| зарплата детальной вакансии: `.vacancy-page__salary` (pages.css:271) — литерал 18px + `color-text-muted` (fw 400/lh 1.35 наследует body — совпадают с ДС; Probe раунда 4: клон 42/500 navy) | литерал `1.125rem` сайт-зоны пилота (`.cp-vacancy-page__salary`, правило сведено к размеру; цвет — `ui-text--muted` в разметке, AA gray-700 — «принято ДС» №11) | T16.13: 18px вне десктоп-шкалы ДС — ступень `--ui-fs-lead` = 1.125rem живёт только в мобильной базе (semantic.css:311), лестница роли ui-lead на ≥1024 даёт 24px (semantic.css:464) и меняла бы одобренное значение (инвариант «канон не менять»); «как есть» литерал сайт-зоны (прецедент 0.9375rem VI-кнопки). ОТКЛОНЕНИЕ от механизма спеки (`ui-lead ui-text--muted` с удалением правила): probe-замер 1440 дал бы 24 ≠ 18 — остаток диффа не закрылся бы; перевод на роль при согласии владельца на 24px@≥1024 — один класс + удаление правила (design-decision, сформулировано в comment правила pilot.css) |
| подзаголовки секций детальной вакансии: `.vacancy-page__section h2` — fs-h4-тройка (variables.css `--fs-h4` 28 / `--fw-h4` 500; замер 28/500 navy; клон `h2.ui-h3` 42/500) | роль `ui-h4` в разметке (build.mjs, 4 секции «Что предстоит»/«Требования»/«Условия»/«Где предстоит работать») — тройка роли на ≥1024 совпадает с каноном; lh 1.25 против канонных 1.35 (37.8 → 35px, 2.8px на строке) — в пороге ≤4px эпика, «принято ДС» | T16.13: probe-пара section-h2 — MATCH 28/500 navy |
| метка aside-панели анкеты: `.form-aside__label` (pages.css:417) — `fs-micro` 12 + `color-text-muted` (fw наследует body 400 = fw-micro; клон — 20/400) | `--ui-fs-micro` × `--ui-fw-micro` + `--ui-color-text-muted` на крючке `.ui-form__aside-label` (DS-правка ui-form) — третья точка fs-micro | T16.13: AA-замена `#808080` → gray-700 («принято ДС» №11); роли в разметке не требуются (bare-крючок даёт канон), роли поверх согласованы (прецедент form-page `ui-small ui-text--muted` — перебивается крючком к тем же 12/400) |
| текст aside-панели: `.form-aside__text` (pages.css:413) — `fs-small-regular` 14/400 (клон — `ui-body` 20/400) | `--ui-fs-small` на крючке `.ui-form__aside-text` (решение спеки «компонентный fs vs утилита ui-small» — компонентный fs: fw-small 500 роли ui-small не даёт канонную пару 14/400; fw 400 несёт роль `ui-body` разметки), lh 1.45 → 1.35 — «принято ДС» (№13) | T16.13: probe-пара aside-text — MATCH 14/400; пины form.test.js |
| значение aside-панели: `.form-aside__value` (pages.css:419) — `fs-small-regular` × `fw-small` 14/500 (клон — наследование body 20/400) | `--ui-fs-small` × `--ui-fw-small` на крючке `.ui-form__aside-value` | T16.13: СОПУТСТВУЮЩАЯ правка — спека не называла value, но дифф 20/400 ↔ 14/500 в тех же парах aside (reg-4) не дал бы закрыть REPORT §9.1 №4; probe-пара aside-value — MATCH |
| промо-блок «бегущие строки» (сайт-зона, internships/practices): `.adv-marquee` (pages.css:1058) — grid 1.2fr 1fr, gap/padding 48, bg `--color-surface-blue-50`, radius `--radius-card` 16; строки — база fw `--fw-body-bold` 500, uppercase, ls 0.02em, `--color-primary` (pages.css:1070), `--bar` 18px (pages.css:1077), `--sm` 13px × `--fw-small` (pages.css:1079), `--xl` 40px/ls 0/lh 1.15 (pages.css:1081); замер раунда 4: клон 42/24/20 белым на primary (REPORT §9.1 №6) | сайт-зона пилота `.cp-adv-marquee*` (DS-компонента нет и не требуется — одна зона на две страницы): 40/18/13 — литералы «как есть» (вне шкалы ДС, токены не требуются); фон `--ui-color-surface-muted` (= blue-50), радиус `--ui-radius-md` (= 16 — прецедент ui-card), отступы/гэп колонок `--ui-space-7` (= 48), гэп ленты `--ui-space-3` (= 12), fw `--ui-fw-body-bold`/`--ui-fw-small`, цвет `--ui-color-primary` | T16.15: бирки строк разметки — по ролям оригинала (`__bar`/`__sm`/`__xl`, internships.html:247–250 — build.mjs internshipsMain, обе страницы); uppercase через CSS (контент строчный — a11y); probe до/после (.zcode/accept-t1615-*.json): 4 строки MATCH 18/13/40/18 по fs/fw/lh/ls/tt/color, блок bg/padding/radius/color MATCH; остаток зоны — правый блок фото+текст (вне Scope T16.15: у оригинала column 546×260 + текст ниже против row 256×165 у клона) и ширина контейнера 1345↔1361 (shell ui-container); контраст primary/blue-50 13.38:1 (AA обычного текста); probe-пара `marquee-line` — в compare.mjs (гейт закрывающей T16.8) |
| height `.chip` 36px (pages.css:139) | `--ui-chip-height: 2.25rem` | T14.8: интерактивный фильтр-чип; 36px вне шкалы отступов §3.2 — перенос «как есть» (прецедент `--ui-card-gap`), используется как min-height (прецедент `--ui-tag-height`); паддинг 0 16px (pages.css:140) и gap группы `.chip-row` 8px (pages.css:135) — ступени шкалы `--ui-space-4`/`--ui-space-2`; touch-компромисс 36 против 44 пагинации — README ui-chip |
| gap `.tag` 6px (components.css:100) | `--ui-tag-gap: 0.375rem` | T4.3: ступени шкалы отступов кратны 4 — значение перенесено «как есть», пересмотр — design-decision владельца |
| gap `.vac-card` 14px (pages.css:42) | `--ui-card-gap: 0.875rem` | T4.4: тот же случай — вне шкалы §3.2, перенос «как есть» |
| height `.field__input/.field__select/.field__textarea` 52px (components.css:148) | `--ui-field-height: 3.25rem` | T5.1: используется как min-height (прецедент `--ui-button-height` — 32px-база T3.6) |
| padding `.field__input/.field__select` 4px 20px и `.field__textarea` 14px 20px — горизонталь 20px (components.css:150) | `--ui-field-pad-inline: 1.25rem` (горизонталь всех контролов поля; вертикали — `--ui-space-1` и `--ui-field-textarea-padding-y`) | T14.6: 20px вне шкалы отступов §3.2 — перенос «как есть» (прецедент `--ui-button-pad-inline`); до T14.6 горизонталь несла `--ui-space-5` (24px) — REPORT §3.3 «паддинг 20 vs 24» |
| height `.apply-form .field__input` 48px (pages.css:1208 — анкеты-модалки оригинала) | `--ui-field-height-compact: 3rem` — модификатор `ui-field--compact` на input/select | T14.6: компактный вариант «поле в анкете-модалке», не отставание Pages (REPORT §2 (г)); 48px вне шкалы отступов §3.2 — перенос «как есть» (прецедент `--ui-card-gap`), используется как min-height (прецедент `--ui-field-height`); textarea высоту не меняет (многострочность важнее плотности); 48 ≥ 44 — touch-минимум |
| min-height `.field__textarea` 120px (components.css:161) | `--ui-field-textarea-min-height: 7.5rem` | T5.1: у textarea фикс. высоты нет (Scope) |
| вертикальный паддинг `.field__textarea` 14px (components.css:162) | `--ui-field-textarea-padding-y: 0.875rem` | T5.1: вне шкалы §3.2, перенос «как есть» (прецедент `--ui-card-gap`) |
| размер инпута `.checkbox input`/`.radio input` 20px (components.css:203/223) | `--ui-control-size: 1.25rem` | T5.2: единый токен обоих блоков (в career-portal значение продублировано) |
| gap `.radio` 10px (components.css:215) | `--ui-radio-gap: 0.625rem` | T5.2: вне шкалы §3.2, перенос «как есть» (прецедент `--ui-tag-gap`), пересмотр — design-decision владельца |
| letter-spacing `.tag` 0.02em (components.css:106) | `--ui-tag-letter-spacing: 0.02em` | T4.3: em — от размера роли |
| рамка `.btn--outline` 2px (components.css:87) | `--ui-button-border-width: 0.125rem` | T4.2: «все значения из токенов» |
| `.pagination__arrow[disabled]` opacity 0.3 (components.css:269) | `--ui-opacity-disabled: 0.3` | T4.2: единственный disabled-паттерн одобренного дизайна |
| min-width/height `.pagination__page` и 44×44 `.pagination__arrow` (components.css:240/261) | `--ui-pagination-size: 2.75rem` | T6.3: touch-цель 44×44, 44px вне шкалы отступов §3.2 — перенос «как есть» (прецедент `--ui-card-gap`); min-геометрия (прецедент `--ui-button-height`) |
| `--container-max` 1440px | `--ui-container-max: 90rem` | |
| фокус pages.css:52 (outline 3px primary, offset 2px) | `--ui-focus-color/width/offset` | ADR-0001 |
| z-index: 70 dropdown (components.css:376) | `--ui-z-dropdown: 70` | |
| font-size `.header__dropdown-link` 16px (header.css, fs 16 / lh 20) | `--ui-dropdown-item-fs: 1rem` (межстрочное — безразмерное 1.25 = 20px при 16, оригинал `line-height: 1.25`) | T16.3: 16px вне тройки ролей T3.3 (роль body растёт 16→18→20 по брейкпоинтам) — фикс-размер пункта dropdown «как есть» (прецедент `--ui-button-pad-inline` 28px), пересмотр — design-decision владельца; до T16.3 пункт нёс `--ui-fs-body` (20px на десктопе — REPORT §8.2 №4) |
| line-height `.header__link` 1.1 (header.css:36) | `line-height: 1.1` в модификаторе `.ui-link--nav` (безразмерное — компактная строка пункта навигации, токена нет: роль small несёт 1.35 для контентных ролей) | T16.3 (доводка приёмки AC4 — полный computed-матч шапки клона): 14 × 1.1 = 15.4px против 18.9px на роли small |

### Принято значение ДС (микрорасхождения сверки пилота — REPORT §3.3, T14.6)

Расхождения clone-сверки 20.10, решённые в пользу значений ДС: осознанные
решения, не дефекты — зафиксированы, чтобы не всплывали повторно (T14.6).
Смена значения поставки — design-decision владельца дизайна.

| Компонент | Оригинал (career-portal) | ДС (принято) | Примечание |
| --- | --- | --- | --- |
| `ui-card` padding | 20px | `--ui-space-5` (24px) | база ДС «воздушнее» оригинала на 4px; проба сверки попала в строку вакансии пилота (16px) — артефакт, значение ДС оставлено (REPORT §3.3) |
| `ui-modal` dialog padding | 40px | 2.25rem = 36px (`ui-modal.css`) | микро; принято значение ДС (REPORT §3.3) |
| `ui-tag` orange — текст пары | `#B34A10` (`--ui-orange-700`, 4.40:1 на orange-50) | `#A94710` (`--ui-orange-800`, 4.78:1) | осознанная AA-замена T2.3 — см. «AA-замены значений» ниже; не дефект (REPORT §3.3) |

### Новые (в career-portal нет источника)

| Токен | Значение | Обоснование |
| --- | --- | --- |
| `--ui-space-1..8` | 4–64 (rem) | шкала §3.2 |
| `--ui-radius-none`, `--ui-border-width` | 0, 1px | §3.2 |
| `--ui-shadow-sm` | 0 2px 8px blue-800-10 | нижняя ступень лестницы теней |
| `--ui-z-{sticky,header,overlay,modal,vi}` | 100/150/200/300/400 | лестница §3.2, фиксирует «плавающие» z |
| `--ui-color-info[-bg]` | blue-700 / blue-50 | §3.2 требует info; ступени одобренной шкалы |
| `--ui-color-warning[-bg]` | orange-800 / orange-50 | T4.5 (алерты) требует warning-пару; ступени одобренной оранжевой шкалы — примитивы существовали (`--ui-orange-50` = `--tag-orange-bg`, `--ui-orange-800` = AA-замена T2.3) |
| `--ui-font-family-mono` | ui-monospace, Consolas, 'Courier New', monospace | §3.2 |
| `--ui-fs/lh/fw-h5/h6` | ступени lead/body одобренной шкалы | роли §3.2, в career-portal их нет |
| `--ui-button-height-sm` | 2rem (32px) | T4.2: малый размер кнопки (в career-portal `.btn` один — 52px); ступень 8px-шкалы §3.2, пересмотр — design-decision владельца |
| `--ui-badge-size` | 1.5rem (24px) | T4.3: диаметр круга/min-height счётчика ui-badge (в career-portal бейджа нет); ступень шкалы §3.2, «99+» растёт в pill паддингом `--ui-space-1` |
| `--ui-ratio-{1-1,3-2,4-3,16-9}` | 1/1, 3/2, 4/3, 16/9 | T4.6: шкала пропорций ui-image (aspect-ratio); в career-portal aspect-ratio нет — медиа фиксировались высотами + object-fit: cover (pages.css:455/632/697), магические высоты контентной вёрстки не переносятся |
| `--ui-field-select-arrow-size` | 1rem (16px) | T5.2: стрелка select (appearance none обязан нести явный индикатор — Technical considerations); ступень 16px |
| `--ui-field-select-arrow-offset` | 0.75rem (12px) | T5.2: отступ стрелки select от правого края; ступень шкалы §3.2 |

### AA-замены значений (T2.3, design-decision — согласование владельца дизайна)

Правки значений слоя 2, без которых смысловые пары не проходят WCAG AA
(контраст-гейт `tests/contrast/`: `npm run test:contrast`). Примитивы —
эталон career-portal — не менялись: слой 2 указывает на новые более тёмные
ступени («Дополнения сверх career-portal» выше). До замены гейт красный
(проверено прогоном: muted 3.95/3.62/3.49, tag-orange 4.40, error 4.48/4.21).

| Токен слоя 2 | Было (career-portal) | Стало | Контраст было → стало | Обоснование |
| --- | --- | --- | --- | --- |
| `--ui-color-text-muted` | `--ui-gray-600` `#808080` (3.95:1 на белом) | `--ui-gray-700` `#616161` | 3.95 → 6.19 на белом; 3.49 → 5.48 на gray-100 (tag--gray); 3.62 → 5.67 на blue-50 | muted используется мелким кеглем (fs-small/fs-micro, placeholder) — крупности нет, порог 4.5:1; кандидат заготовлен заранее в T2.1 (gray-700 — «сырьё AA-замены») |
| `--ui-color-tag-orange-text` | `--ui-orange-700` `#B34A10` (4.40:1 на orange-50) | `--ui-orange-800` `#A94710` | 4.40 → 4.78 | пара тега orange не дотягивала 4.5:1 (текст тега 12px); минимальный сдвиг по шкале |
| `--ui-color-error` | `--ui-red-600` `#D8402C` (4.48:1 на белом) | `--ui-red-700` `#C93A26` | 4.48 → 5.10 на белом; 4.21 → 4.80 на red-50 | сообщения об ошибках (field__error, fs-small) — обычный текст; выбрано с запасом на red-50 и blue-50 (алерты — T4.5), чтобы не править дважды |
| `--ui-color-field-label` | `--ui-gray-600` `#808080` (3.95:1 на белом — label форм) | `--ui-gray-700` `#616161` | 3.95 → 6.19 на белом; 3.62 → 5.67 на blue-50 | label #808080 → gray-700 — AA-замена по прецеденту muted (T2.3); оригинал красит серым анкеты-модалки (`.apply-form .field__label`, pages.css:1206), база `.field__label` (components.css:137) несла `--color-text` — ДС сводит ВСЕ подписи полей к одному AA-серому (probe раунда 2, REPORT §3.3, T16.9; legend группы радио — тот же токен; согласие чекбоксов — контент, остаётся text) |

### Решения-отклонения (design-decision, согласование владельца дизайна)

1. **Hover-значения в слой 2 не вошли при T2.2 (Out of scope T2.2 → T2.6);**
   кнопочные hover-пары перенесены T2.6 (`--color-accent-light` →
   `--ui-color-accent-hover`, `--color-blue-700` как hover primary →
   `--ui-color-primary-hover`; см. «Перенос» выше и ADR-0010). Из оставшихся
   hover-значений `--ui-blue-100` (фон при наведении: hover `.btn--light` и
   карточек) получило семантическое имя `--ui-color-surface-hover` в T4.2;
   `--ui-slate-300` (hover-рамка) получило имя `--ui-color-border-hover` в
   T4.4 (см. «Перенос»); `--ui-blue-50-55` (hover dd__trigger) остаётся
   примитивом — имя заведёт задача dropdown (T7.x), либо состояние выразится
   color-mix по конвенции 88% + black (ADR-0010).
2. **`--ui-color-surface-muted` = blue-50, а не gray-100:** пример §3.1
   (`gray-100`) заменён значением одобренного дизайна — в career-portal
   приглушённый фон карточек и «серых» секций — `--color-surface-blue-50`
   (`.section--gray`). Gray-100 занят смыслом «фон тега» (`--ui-color-tag-gray-bg`).
3. **`--ui-color-surface-dark` = `var(--ui-color-primary)`:** тёмные секции
   career-portal красятся `--color-primary` (8 использований); семантическое
   имя даёт теме одну точку переопределения пары «тёмная секция ↔ текст на тёмном».
4. **Промежуточный шаг 1439 не перенесён:** career-portal @media (max-width:
   1439px) даёт h1 64/h2 48/h3 36 и паддинг 40px на ≥1440; спека T2.2 —
   «рост к lg» и паддинги 16/24/32 (`--ui-container-pad{,-md,-lg}` = 16/24/32).
   На 1024–1439 h1 80 вместо 64, на ≥1440 паддинг 32 вместо 40.
5. **z-лестница разводит «плавающие» 200:** vi-панель (vi.css:11) и оверлей
   баннера жили на одном 200; по §3.2 vi = 400 (поверх всего, ГОСТ), оверлей = 200.
6. **Фолбэк-стек шрифта расширен** (`Arial, 'Helvetica Neue', sans-serif`)
   по §3.2 против career-portal `Arial, sans-serif` — до подключения шрифтов (T3.1).
7. **`--ui-focus-width/offset` — в px (3/2), не rem:** волосяная геометрия
   фолбэка; значения career-portal pages.css:52 перенесены как есть.

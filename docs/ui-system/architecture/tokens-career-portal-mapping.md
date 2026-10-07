# Таблица соответствия «career-portal значение → токен» (T2.1 примитивы, T2.2 семантика)

> Документ-деливерабл задачи T2.1, не файл задачи бэклога: живёт в
> architecture/, а не в epics/ — валидатор бэклога считает любой `T*.md`
> в epics/ файлом задачи (scan `T*.md` в tools/validate-backlog.mjs).

Инструмент контроля отклонений от одобренного дизайна (Implementation
requirements T2.1 п.4): каждое значение career-portal перенесено **как есть**;
отклонений от эталона нет — колонка «Решение» во всей таблице `перенос`,
`design-decision` не требуется. Исполняемая форма таблицы (гейт в PR):
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
| height `.tag` 28px (components.css:99) | `--ui-tag-height: 1.75rem` | T4.3: используется как min-height (тот же прецедент) |
| gap `.tag` 6px (components.css:100) | `--ui-tag-gap: 0.375rem` | T4.3: ступени шкалы отступов кратны 4 — значение перенесено «как есть», пересмотр — design-decision владельца |
| gap `.vac-card` 14px (pages.css:42) | `--ui-card-gap: 0.875rem` | T4.4: тот же случай — вне шкалы §3.2, перенос «как есть» |
| letter-spacing `.tag` 0.02em (components.css:105) | `--ui-tag-letter-spacing: 0.02em` | T4.3: em — от размера роли |
| рамка `.btn--outline` 2px (components.css:87) | `--ui-button-border-width: 0.125rem` | T4.2: «все значения из токенов» |
| `.pagination__arrow[disabled]` opacity 0.3 (components.css:269) | `--ui-opacity-disabled: 0.3` | T4.2: единственный disabled-паттерн одобренного дизайна |
| `--container-max` 1440px | `--ui-container-max: 90rem` | |
| фокус pages.css:52 (outline 3px primary, offset 2px) | `--ui-focus-color/width/offset` | ADR-0001 |
| z-index: 70 dropdown (components.css:376) | `--ui-z-dropdown: 70` | |

### Новые (в career-portal нет источника)

| Токен | Значение | Обоснование |
| --- | --- | --- |
| `--ui-space-1..8` | 4–64 (rem) | шкала §3.2 |
| `--ui-radius-none`, `--ui-border-width` | 0, 1px | §3.2 |
| `--ui-shadow-sm` | 0 2px 8px blue-800-10 | нижняя ступень лестницы теней |
| `--ui-z-{sticky,header,overlay,modal,vi}` | 100/150/200/300/400 | лестница §3.2, фиксирует «плавающие» z |
| `--ui-color-info[-bg]` | blue-700 / blue-50 | §3.2 требует info; ступени одобренной шкалы |
| `--ui-font-family-mono` | ui-monospace, Consolas, 'Courier New', monospace | §3.2 |
| `--ui-fs/lh/fw-h5/h6` | ступени lead/body одобренной шкалы | роли §3.2, в career-portal их нет |
| `--ui-button-height-sm` | 2rem (32px) | T4.2: малый размер кнопки (в career-portal `.btn` один — 52px); ступень 8px-шкалы §3.2, пересмотр — design-decision владельца |
| `--ui-badge-size` | 1.5rem (24px) | T4.3: диаметр круга/min-height счётчика ui-badge (в career-portal бейджа нет); ступень шкалы §3.2, «99+» растёт в pill паддингом `--ui-space-1` |

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

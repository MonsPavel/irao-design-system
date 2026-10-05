# Execution: backlog, итерации, граница MVP

Приложение к [06-implementation-plan.md](06-implementation-plan.md). Порядок задач здесь — порядок реализации. Комплексность: S ≤ 2 дня, M ≤ 5 дней, L ≤ 10 дней, XL > 10 дней (middle/senior frontend). Приоритеты: P0 — входит в MVP, P1 — важно сразу после, P2 — позже/по запросу сайтов.

---

## 1. Dependency graph

```text
T1.1 скелет ──┬─→ T1.2 линтеры ─────────────┐
              ├─→ T1.3 сборка ──┬─→ T1.4 playwright ──┐
              └─→ T1.6 vitest ──┼──────────────────────┤
                                │                      ↓
                                │                T1.5 CI ═══ (гейт всего)
                                ↓
T2.1 примитивы → T2.2 семантика ─┬─→ T2.3 контраст ─→ (гейт P0-компонентов)
                                 ├─→ T2.4 механизм тем
                                 ├─→ T2.6 производные цвета
T1.2 ─→ T2.5 брейкпоинт-линтер
                                 ↓
T3.1 шрифты/reset → T3.2 focus-политика ─┬─→ T3.5 skip-link
                    ↓                     │
                 T3.3 типографика ────────┼─→ T3.6 zoom-тест (гейт релиза)
                 T3.4 container/grid ─────┘
                    ↓
        ┌───────────┼─────────────┐
   T4.1 link   T4.2 button   T4.6 image
   T4.3 tag    T4.4 card     T4.7 breadcrumbs → (T8.2)
   T4.5 alert  T4.8 empty/error
        ↓
T5.1 field → T5.2 select/checkbox/radio → T5.3 file
        └──→ T5.4 form-layout ─→ T5.5 validation (Vitest) ─→ T5.6 серверные ошибки ═ MVP-code-complete
                                                              ↓
T6.1 dropdown   T6.2 tabs   T6.3 pagination   T6.4 accordion (после T3.x/T4.x)
        ↓
T7.1 SPIKE dialog ─→ T7.2 modal ─→ T7.6 overlay/header/footer-паттерны
T5.2+T6.1 ─→ T7.3 custom select        T7.4 table        T7.5 loader
        ↓
T8.1 list-page   T8.2 detail-page   T8.3 form-page/landing
        ↓
T9.1 VI-порт (возможно уже после T3.1 — см. итерации)   T9.2 a11y-hardening (после EPIC-6/7/8)
        ↓
T10.1 шаблон доки → T10.2 все доки → T10.3 quickstart/гайды → T10.4 contribution
        ↓
T11.1 сниппеты+legacy ─→ T11.2 пилот A ─→ T11.3 пилот B ─→ T11.4 upgrade-репетиция
        ↓
T12.1 release pipeline ─→ T12.2 политика/changelog ─→ v1.0.0
```

### Критический путь

```text
T1.1 → T1.3 → T1.4 → T1.5 → T2.1 → T2.2 → T3.1 → T3.2 → T3.4 → T4.2 → T5.1
     → T5.4 → T5.5 → T5.6 → T10.3 → T11.1 → T11.2 → T12.1 → v1.0.0
```

Оценка суммы по критическому пути: M+L+M+M+M+L+M+S+M+M+M+M+L+M+M+M+XL+M ≈ **63–68 идеальных дней** одного разработчика до продакшн-пилота; v1.0 с пилотом B и hardening — порядка 90–100 дней. С двумя разработчиками сокращается нелинейно: параллельные ветки (EPIC-6/7/8, доки) отделяются после T5.x.

---

## 2. Final backlog (порядок реализации)

Формат §16 ТЗ: ID / Title / Type / Priority / Complexity / Dependencies / Acceptance (краеугольно).

### EPIC-1 Foundation & Tooling

| ID | Title | Type | P | C | Deps | Acceptance (ключевое) |
|---|---|---|---|---|---|---|
| T1.1 | Скелет репо + шаблон JS-модуля | TASK | P0 | M | — | структура §7; module-template с readyState-guard |
| T1.2 | Линтеры (stylelint-БЭМ/hex-гейт, eslint, prettier, html-validate) | TASK | P0 | M | T1.1 | файл-нарушитель валит каждый линтер |
| T1.3 | Сборка dist+showcase (esbuild) | TASK | P0 | L | T1.1 | dist = §6.1 architecture; стенды на собранных файлах |
| T1.4 | Playwright-харнесс (e2e+axe+скриншоты) | TASK | P0 | M | T1.3 | test:docker == CI для эталонов (ADR-0004); axe валит тест |
| T1.6 | Vitest-слой | TASK | P0 | S | T1.1 | unit-скрипт в CI, эталонный тест |
| T1.5 | CI c mandatory-гейтами + Pages | TASK | P0 | M | T1.2–T1.4, T1.6 | branch protection; чистый PR ≤ 5 мин |

### EPIC-2 Design Tokens

| ID | Title | Type | P | C | Deps | Acceptance |
|---|---|---|---|---|---|---|
| T2.1 | Токены-примитивы | TASK | P0 | M | T1.2 | hex только тут; таблица соответствия с career-portal |
| T2.2 | Семантический слой + стенд токенов | TASK | P0 | L | T2.1, T1.3 | 100% токенов на стенде; rem; масштаб при 32px |
| T2.3 | Контраст-валидация AA (CI-скрипт) | TASK | P0 | M | T2.2 | все пары ≥ 4.5:1/3:1; гейт в PR |
| T2.4 | Механизм тем + theme-test | TASK | P0 | S | T2.2 | e2e-смена темы без правок компонентов |
| T2.5 | Брейкпоинт-шкала + линтер | TASK | P0 | S | T1.2 | только min-width из шкалы |
| T2.6 | Производные цвета (color-mix) + ADR | TASK | P1 | S | T2.2 | ADR; button как эталонный потребитель |

### EPIC-3 Base & Typography

| ID | Title | Type | P | C | Deps | Acceptance |
|---|---|---|---|---|---|---|
| T3.1 | Шрифты Golos + reset (порт) | TASK | P0 | M | T2.2, T1.3 | fonts.check true; фолбэк-сценарий зелёный |
| T3.2 | Политика фокуса (⚠️ issue 1) | TASK | P0 | S | T2.2, T3.1 | видимый фокус при legacy-атаке `a{outline:none}` |
| T3.3 | Типографика ui-h1…micro | TASK | P0 | M | T2.2, T3.1 | шкала из токенов; h-иерархия валидируется |
| T3.4 | Container/Section/Grid mobile-first | TASK | P0 | M | T2.2, T2.5 | нет overflow на 320–1440; эталоны 4 вьюпортов |
| T3.5 | ui-skip-link | TASK | P0 | S | T3.2 | первый Tab → skip-link → #main |
| T3.6 | Zoom/32px-сценарии (релизный гейт) | TASK | P0 | S | T3.3, T3.4 | 200% без скролла/перекрытий |

### EPIC-4 Primitive Components

| ID | Title | Type | P | C | Deps | Acceptance |
|---|---|---|---|---|---|---|
| T4.1 | ui-link | TASK | P0 | S | T3.2, T3.3 | focus/контраст/rel=noopener-правило |
| T4.2 | ui-button (эталон) | TASK | P0 | M | T2.6, T3.2 | состояния×варианты; disabled/loading a11y; док-эталон |
| T4.3 | ui-tag / ui-badge | TASK | P0 | S | T2.3 | варианты; читаемость в VI |
| T4.4 | ui-card | TASK | P0 | M | T3.2, T3.4 | hover только (hover:hover); stretched-link доступен |
| T4.5 | ui-alert | TASK | P0 | S | T2.3 | role status/alert по критичности |
| T4.6 | ui-image/figure + retina-паттерн | TASK | P0 | M | T3.1 | CLS=0; alt-валидация; сломанный src деградирует |
| T4.7 | ui-breadcrumbs + schema.org | TASK | P0 | M | T3.3 | микроразметка валидна; aria-current |
| T4.8 | Empty/Error state-паттерны | TASK | P0 | M | T4.5, T3.4 | 3 эталонных стенда |

### EPIC-5 Forms

| ID | Title | Type | P | C | Deps | Acceptance |
|---|---|---|---|---|---|---|
| T5.1 | ui-field: input/textarea + label/hint/error | TASK | P0 | M | T3.2 | aria-invalid/describedby; масштаб шрифта не режет |
| T5.2 | Нативный select, checkbox, radio | TASK | P0 | M | T5.1 | клавиатурная навигация нативная; fieldset-правила |
| T5.3 | ui-file (доступный) | TASK | P0 | M | T5.1 | фокус достижим; имя файла озвучивается; без display:none |
| T5.4 | ui-form: раскладка + summary + success | TASK | P0 | M | T5.1, T5.2, T3.4 | role=alert summary; фокус после успеха |
| T5.5 | IraoUI.form — PE-валидация | TASK | P0 | L | T5.4, T1.6 | unit≥90% логики; novalidate ставит JS; фокус на 1-ю ошибку |
| T5.6 | Серверные ошибки: контракт Bitrix + стенд | TASK | P0 | M | T5.5 | идентичность клиентских/серверных ошибок; **MVP-веха** |

### EPIC-6 Navigation & Interactive

| ID | Title | Type | P | C | Deps | Acceptance |
|---|---|---|---|---|---|---|
| T6.1 | ui-dropdown | TASK | P1 | M | T3.2, T4.1 | APG menu-button; Escape→фокус на триггер |
| T6.2 | ui-tabs | TASK | P1 | M | T3.2 | roving tabindex; деградация без JS |
| T6.3 | ui-pagination | TASK | P1 | S | T4.1 | aria-current; PHP-сниппет |
| T6.4 | ui-accordion (`<details>`) | TASK | P1 | S | T3.3 | без JS полностью работает |

### EPIC-7 Complex Components

| ID | Title | Type | P | C | Deps | Acceptance |
|---|---|---|---|---|---|---|
| T7.1 | SPIKE: native `<dialog>` — ADR | SPIKE | P1 | S | — | ADR-001 с измеримыми критериями |
| T7.2 | ui-modal | TASK | P1 | L | T7.1, T3.2 | trap/restore/Escape; повторные циклы чисты |
| T7.3 | IraoUI.select (custom select) | TASK | P1 | M | T5.2, T6.1 | APG listbox; change-синхронизация с нативным |
| T7.4 | ui-table-паттерны | TASK | P1 | M | T3.4 | скролл-зона с клавиатуры; карточный режим |
| T7.5 | ui-loader + aria-busy | TASK | P1 | S | T3.3 | спиннер+текст; reduced-motion |
| T7.6 | Паттерны overlay/header/footer | TASK | P1 | M | T7.2 | диалоговый чек-лист overlay |

### EPIC-8 Layout & Page Patterns

| ID | Title | Type | P | C | Deps | Acceptance |
|---|---|---|---|---|---|---|
| T8.1 | Паттерн «Список» | TASK | P1 | M | T4.4, T6.3, T4.8 | собирается без нового CSS |
| T8.2 | Паттерн «Детальная» | TASK | P1 | M | T4.7 | aside на 32px не ломается; schema-кейс |
| T8.3 | Паттерны «Форма»/«Landing» | TASK | P1 | M | T5.4 | полный форма-цикл на паттерне |

### EPIC-9 Accessibility

| ID | Title | Type | P | C | Deps | Acceptance |
|---|---|---|---|---|---|---|
| T9.1 | Порт VI-модуля ГОСТ | TASK | P0 | M | T3.1, T1.6 | все темы/размеры e2e; LS-персистентность |
| T9.2 | A11y hardening (forced-colors, NVDA/VoiceOver) | TASK | P1 | L | EPIC-6/7, T9.1 | подписанный протокол; axe=0 везде |

### EPIC-10 Documentation

| ID | Title | Type | P | C | Deps | Acceptance |
|---|---|---|---|---|---|---|
| T10.1 | Шаблон доки + 3 эталона | TASK | P0 | M | T1.3, T4.2, T5.1 | шаблон генератора showcase |
| T10.2 | Доки всех компонентов | TASK | P1 | L | T10.1 | 100% компонентов по шаблону |
| T10.3 | Quickstart + Integration Guide + «за 30 минут» | TASK | P0 | M | T10.1, T11.1 | сниппеты синхронны гайдам |
| T10.4 | Contribution guide + ADR-журнал | TASK | P1 | S | T10.1 | CONTRIBUTING + docs/adr |

### EPIC-11 Bitrix Integration

| ID | Title | Type | P | C | Deps | Acceptance |
|---|---|---|---|---|---|---|
| T11.1 | Сниппеты + legacy-констрейнты | TASK | P0 | M | T5.6, T3.2 | сниппеты работают на чистом стенде; legacy-атака не рушит |
| T11.2 | Пилот A (кандидат — Bitrix career-portal) | TASK | P0 | XL | T10.3, T11.1, пилоты | страницы в предпроде; журнал конфликтов |
| T11.3 | Пилот B (другая структура) | TASK | P1 | XL | T11.2 | без форка и правок /local/ui/ |
| T11.4 | Upgrade-репетиция (minor на пилотах) | TASK | P1 | S | T11.2, T11.3, T12.1 | ≤ 0.5 дня на сайт |

### EPIC-12 Release

| ID | Title | Type | P | C | Deps | Acceptance |
|---|---|---|---|---|---|---|
| T12.1 | Release pipeline (тег→матрица→zip→Release) | TASK | P0 | M | T1.5, T3.6, T9.1 | v1.0.0 воспроизводим тегом |
| T12.2 | Changelog/политика/deprecation | TASK | P0 | S | T12.1 | CI блокирует релиз без changelog |

---

## 3. Iteration plan

Без привязки к календарю; объём итерации ≈ 8–12 идеальных дней одного разработчика (или вдвое меньше при двух). Каждая итерация заканчивается зелёным конвейером и добавляет видимой ценности.

### Iteration 0 — Конвейер
- **Цель:** репо и tooling, в которых сразу можно работать по TDD.
- **Задачи:** T1.1, T1.2, T1.3, T1.4, T1.6, T1.5.
- **Expected outcome:** демо-PR проходит полный гейт; showcase на Pages.
- **DoD:** branch protection включена; README «как добавить компонент».

### Iteration 1 — Токены
- **Задачи:** T2.1, T2.2, T2.3, T2.4, T2.5 (+T2.6 старт).
- **Expected outcome:** стенд токенов; контраст-гейт; механизм тем доказан.
- **DoD:** hex вне tokens невозможен; отчёт контраста зелёный.

### Iteration 2 — Base
- **Задачи:** T3.1, T3.2, T3.3, T3.4, T3.5, T3.6 (+T9.1 ранний старт — VI не зависит от компонентов).
- **Expected outcome:** страница на чистом base выглядит системой; фокус переживает legacy-атаку; VI-стенд жив.
- **DoD:** zoom/32px-сценарии зелёные; VI e2e зелёный.

### Iteration 3 — Primitives
- **Задачи:** T4.1→T4.8, T10.1 (шаблон доки на примере button).
- **Expected outcome:** не-формовую страницу можно собрать из системы.
- **DoD:** каждый компонент: стенд+эталоны+axe+дока по шаблону.

### Iteration 4 — Forms → MVP code-complete
- **Задачи:** T5.1→T5.6.
- **Expected outcome:** интеграционный стенд «форма целиком» (без JS → с JS → серверная ошибка → успех).
- **DoD:** полный e2e-цикл зелёный; контракт серверных ошибок задокументирован. **Граница MVP-кода.**

### Iteration 5 — Bitrix-минимум + quickstart (завершение MVP)
- **Задачи:** T11.1, T10.3, T12.1, T12.2; стендовая репетиция подключения (по T5.6/T11.1).
- **Expected outcome:** пакет подключается к чистому Bitrix-стенду по quickstart; релизный конвейер работает (v0.x теги).
- **DoD:** incognito-тест quickstart пройден; тег → zip → артефакт воспроизводим. **Граница MVP (см. §4).**

### Iteration 6 — Пилот A (первые реальные страницы)
- **Задачи:** T11.2 (стенд → 2–3 страницы, включая форму).
- **Expected outcome:** реальные страницы пилота на системе.
- **DoD:** чек-лист страницы зелёный; журнал конфликтов ведётся.

### Iteration 7 — Interactive P1
- **Задачи:** T6.1–T6.4, T7.1, T7.2.
- **Expected outcome:** dropdown/tabs/accordion/pagination/modal с полными APG-прогонами.
- **DoD:** клавиатурные чек-листы зелёные; ADR-001 закрыт.

### Iteration 8 — Select, таблицы, паттерны страниц
- **Задачи:** T7.3–T7.6, T8.1–T8.3.
- **Expected outcome:** типовые страницы собираются копипастой.
- **DoD:** паттерн-стенды в visual-регрессии.

### Iteration 9 — A11y hardening + доки
- **Задачи:** T9.2, T10.2, T10.4.
- **Expected outcome:** подписанный скринридер-протокол; документация полная.
- **DoD:** axe=0 на всех страницах; 100% компонентов с доками.

### Iteration 10 — Пилот B + upgrade + v1.0
- **Задачи:** T11.3, T11.4, включение mandatory visual-гейта (ADR-0004), финальный релизный прогон.
- **Expected outcome:** второй сайт на системе; upgrade отработан; v1.0.0.
- **DoD:** релизный чек-лист (матрица, scaling, VI, changelog) зелёный; оба пилота в предпроде/проде.

Параллелизация для двух разработчиков: после Iteration 4 второй разработчик берёт Iteration 7 (interactive) пока первый ведёт Iteration 5–6 (Bitrix+пилот); доки (T10.2) — распределить по владельцам компонентов.

---

## 4. Definition of MVP (точная граница)

MVP = Iterations 0–5. Проверка по 10 способностям ТЗ §18:

| # | Способность | Чем закрыто в MVP |
|---|---|---|
| 1 | Подключить UI System к Bitrix | T11.1 сниппеты + dist zip; quickstart |
| 2 | Настроить theme | механизм T2.4 (в MVP фактически один бренд — решение Phase 0; переопределение токенов на сайте задокументировано) |
| 3 | Использовать базовые компоненты | EPIC-4: link/button/tag/card/alert/image/breadcrumbs/empty-error |
| 4 | Создать полноценную страницу | base EPIC-3 (container/section/grid/типографика/skip-link) + page-head паттерн (минимум из T8.x, переносится из career-portal в составе стендов) |
| 5 | Реализовать формы | EPIC-5 полностью, включая серверные ошибки |
| 6 | Navigation/layout | breadcrumbs (P0) + container/grid; dropdown/tabs/pagination — P1 (сразу после MVP, Iteration 7) |
| 7 | Accessibility | focus-политика, skip-link, AA-контраст, VI-модуль (T9.1), axe в CI; NVDA-протокол — P1 |
| 8 | Automated quality checks | полный PR-гейт: lint/html/unit/e2e/axe/visual/contrast |
| 9 | Выпустить версию package | T12.1: тег → матрица → zip → Release; changelog T12.2 |
| 10 | Подключить к реальному Bitrix-сайту | пилот A (T11.2): минимум 2–3 страницы в предпроде, включая форму |

Состав dist MVP: `ui-core.min.css` (tokens+base+EPIC-4+EPIC-5), `ui-vi.min.css`, `ui.min.js` (IraoUI.form + vi + минимум утилит), `fonts/`, сниппеты bitrix/, quickstart+integration guide.

## 5. Do not build yet

```text
Do not build yet:
- Tooltip, Carousel/Slider, Skeleton, Toasts, Stepper, Datepicker — P2, по запросу реальных сайтов;
- Мульти-брендовые темы (решение Phase 0: один бренд; механизм есть, темы не строим);
- PHP-хелперы рендера компонентов (IraoUI::button) — только при доказанной боли копипасты после пилотов;
- Storybook — showcase закрывает потребность; пересмотр при >40 компонентах или росте команды;
- Собственный Bitrix-модуль с настройками в админке — это отдельный продукт;
- Иконочный пакет/менеджер — inline SVG по правилам T4.6;
- Темная тема / prefers-color-scheme — не требуется; при появлении добавится minor-версией;
- CSS Cascade Layers (@layer) для изоляции — сознательно отложено до ухода legacy (architecture §2);
- TypeScript/миграция JS на TS — кодовая база мала и шаблонна, eslint достаточен;
- Автотесты на реальных сайтах из репо системы — вне границы ответственности;
- Микро-фреймворк состояний/байндингов в JS — модули остаются простыми IIFE;
- IE/legacy-браузерные фолбэки — матрица evergreen ×2 (решение Phase 0);
- Общий статик-домен ассетов — копия на сайт; домен при 5+ сайтах отдельным решением.
```

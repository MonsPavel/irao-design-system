# Jira-ready backlog

Формат: EPIC → STORY/TASK/SPIKE. Нумерация условная (заменяется на ключи Jira). Оценки сложности: S ≤ 2 дня, M ≤ 5 дней, L ≤ 10 дней, XL > 10 дней (для 1 middle/senior frontend). Порядок внутри фазы — порядок dependencies.

---

## EPIC-1 «Foundation & Tooling» (Phase 1)

### TASK-101 Скелет репозитория и линтеры

- **Goal:** репозиторий, в котором архитектурные правила enforcing'ятся автоматически, а не ревью.
- **Description:** создать структуру из architecture §7; настроить stylelint (нейминг `ui-` через stylelint-selector-pattern, запрет hex/`!important` вне `tokens/` и `a11y/vi`, порядок свойств), eslint, prettier, html-validate; package.json только с devDependencies; editorconfig.
- **Tasks:**
  - создать каталоги и пустые точки входа;
  - настроить stylelint c selector-bem-pattern под `ui-{block}__{elem}--{mod}`;
  - настроить eslint (нативный JS, env browser+jsdom для тестов);
  - подключить html-validate с правилами семантики (один h1, label для input).
- **Acceptance Criteria:**
  - файл с нарушениями (нейтральное имя класса, hex вне tokens) падает в CI;
  - `npm run lint` работает локально за < 10 сек.
- **Dependencies:** нет.
- **Definition of Done:** конфиги в репо, README раздел «Как устроен конвейер», CI-джоба зелёная.
- **Complexity:** M

### TASK-102 CI-конвейер с mandatory-гейтами

- **Goal:** PR не смёржится без lint/unit/e2e+axe/build.
- **Description:** GitHub Actions: джобы lint → build → unit → e2e+axe (chromium) на PR; деплой showcase на Pages из main; артефакт dist прикладывается к прогону.
- **Acceptance Criteria:** битвый PR блокируется; успешный — зелёный < 5 мин.
- **Dependencies:** TASK-101.
- **Definition of Done:** workflow-файлы в репо; проверено на демонстрационных PR.
- **Complexity:** M

### TASK-103 Showcase-каркас и сборка dist

- **Goal:** единый полигон для доки, тестов и visual-регрессии + production-сборка.
- **Description:** скрипт `showcase/build.mjs` (esbuild): собирает страницы стендов из `components/*/` и `showcase/pages/`; производит `dist/` (конкатенация+минификация css/js, копия fonts/themes); страница-каталог стендов; переключатель темы на стендах (query-параметр).
- **Acceptance Criteria:** `npm run build` даёт dist-структуру из architecture §6.1; стенд открывается локально `npm run serve`.
- **Dependencies:** TASK-101.
- **Definition of Done:** сборка в CI, showcase задеплоен.
- **Complexity:** L

### TASK-104 Playwright-харнесс и первый a11y-тест

- **Goal:** инфраструктура e2e/visual/axe, чтобы все следующие компоненты писались «в тесте».
- **Description:** конфиг Playwright (chromium; firefox/webkit — в релизной матрице), хелперы: открытие стенда по имени компонента, скриншоты на 375/768/1440, подключение `@axe-core/playwright`, сценарий «skip-link есть и работает» как первый тест.
- **Acceptance Criteria:** тест запускается в CI (из TASK-102) и локально; скриншот-эталон создан и проверен.
- **Dependencies:** TASK-103.
- **Definition of Done:** README «Как писать тесты компонента».
- **Complexity:** M

---

## EPIC-2 «Design Tokens & Theming» (Phase 2)

### STORY-201 Примитивы и семантика: полный токен-слой

- **Goal:** вся визуальная правда системы в двух файлах, пригодных для тем.
- **Description:** перенести палитру career-portal в `tokens/primitives.css`; определить `tokens/semantic.css` по составу architecture §3.2 (цвета, типографика в rem, spacing 1–8, радиусы, тени, z-index, focus, transitions, containers); брейкпоинты задокументировать константами; прогнать контраст-пары через инструмент и поправить значения (muted-серый ≥ 4.5:1 на белом).
- **Tasks:**
  - миграция `variables.css` → два слоя с префиксом `--ui-`;
  - типографика px → rem с базой на `html`;
  - контраст-отчёт по семантическим парам;
  - стенд «Все токены» (сетки цветов/отступов/типографики).
- **Acceptance Criteria:**
  - стенд токенов визуализирует 100% токенов;
  - все текстовые пары ≥ 4.5:1, крупные ≥ 3:1 (или оформленное исключение);
  - stylelint подтверждает: hex только в tokens.
- **Dependencies:** EPIC-1.
- **Definition of Done:** токены в dist (входят в ui-core.css первыми).
- **Complexity:** L

### STORY-202 Механизм тем и тестовая тема

- **Goal:** доказать работоспособность механизма тем («переопределили токены — изменился вид, API не меняется»), не строя мульти-брендовых тем (решение Phase 0: один бренд Интер РАО).
- **Description:** дефолтная палитра живёт в core; `themes/theme-test.css` — синтетическая тема, переопределяющая 5–7 семантических токенов (инструмент проверки механизма, на сайты не подключается); переключатель `data-ui-theme` на стендах; правило обратной совместимости тем (новый токен = дефолт в core) в доке.
- **Acceptance Criteria:** смена data-ui-theme на стенде кнопок/карточек/форм меняет вид без единой правки компонентов; тема, написанная до появления нового токена, совместима с обновлённым core.
- **Dependencies:** STORY-201.
- **Definition of Done:** механизм тем в dist; кейс в integration-guide.
- **Complexity:** S

### TASK-203 Состояния через color-mix и проверка матрицы

- **Goal:** hover/active/disabled без ручных hex-производных.
- **Description:** производные цвета через `color-mix(in srgb, var(--ui-color-primary), …)`; проверить матрицу (Chromium 111+, Firefox 113+, Safari 16.2+ — целевые evergreen); fallback-стратегия: для критичных (кнопки) токен hover дублируется явно, если решим не полагаться на color-mix.
- **Acceptance Criteria:** состояние hover/active/focus-visible у кнопки темизуется; решение «color-mix vs явные hover-токены» зафиксировано в доке.
- **Dependencies:** STORY-201.
- **Definition of Done:** паттерн применён в button (EPIC-3) как эталон.
- **Complexity:** S

---

## EPIC-3 «Base & P0 Components» (Phase 3)

### STORY-210 Базовый слой: reset, шрифты, focus, skip-link, типографика, container/grid

- **Goal:** безопасный глобальный фундамент, который сайт подключает без страха.
- **Description:** порт `base.css` из career-portal (шрифты Golos с unicode-range — класс A; `[hidden]`, scrollbar-gutter, reduced-motion); типографика h1–h6/lead/body/small/caption в rem; глобальная политика `:focus-visible` через `:where()` и токены; `ui-skip-link`; container + section + `ui-grid` (бывший cards-grid 2/3/4) в mobile-first.
- **Tasks:** порт шрифтов и reset; focus-политика; skip-link; container/grid mobile-first; типографика; стенды.
- **Acceptance Criteria:** focus-visible виден на всех интерактивных элементах стенда; 200%-zoom тест проходит; без ui-стилей страница деградирует читаемо (стили — усиление, не условие работы разметки).
- **Dependencies:** STORY-201.
- **Definition of Done:** base входит в ui-core.css первым после токенов.
- **Complexity:** L

### STORY-211 Button и Link

- **Goal:** самые используемые компоненты как эталон качества для всех остальных.
- **Description:** `ui-button` (variants: primary/accent/outline/light; sizes md/sm; states: hover/active/focus-visible/disabled/loading с спиннером); `ui-link` (обычный/внешний `rel="noopener"`/файловый/«назад»); якорная кнопка vs ссылка — правило в доке (do/don't).
- **Acceptance Criteria:** полный стенд состояний; disabled не ловит фокус/клики; loading блокирует повторную отправку (aria-busy); клавиатурный прогон чист.
- **Dependencies:** STORY-210, TASK-203.
- **Definition of Done:** компонент в dist, дока по шаблону architecture §8.
- **Complexity:** M

### STORY-212 Tag/Badge и Card

- **Description:** порт `tag` (5 вариантов + `ui-badge` для счётчиков) и `card` (base/hover/filled; hover на touch-устройствах не «залипает» — `@media (hover: hover)`); `ui-card__title/body/footer`.
- **Acceptance Criteria:** стенды + visual-эталоны; теги не теряют контраст в VI-темах.
- **Dependencies:** STORY-210.
- **Definition of Done:** в dist. **Complexity:** M

### STORY-213 Breadcrumbs + schema.org

- **Description:** порт breadcrumbs со скроллом на мобиле; микроразметка BreadcrumbList; `aria-current="page"`; дока «как строить цепочку в Bitrix-шаблоне».
- **Acceptance Criteria:** пример из доки проходит google rich-results-валидацию; e2e-тест навигации.
- **Dependencies:** STORY-210. **Complexity:** S

### STORY-214 Image: паттерн и ui-figure

- **Description:** правила alt (декоративный/информативный), обязательные width/height, lazy, retina-политика (srcset/@2x, векторные иконки), `ui-figure` с подписью; fallback при незагрузившемся изображении (стили минимальной деградации).
- **Acceptance Criteria:** чек-лист изображений в доке; стенд с тремя видами изображений; CLS = 0 на стенде.
- **Dependencies:** STORY-210. **Complexity:** M

### STORY-215 Alert и состояния Empty/Error

- **Description:** `ui-alert` (info/success/warning/error, роль role="status"/"alert" по типу, закрываемый вариант); паттерны empty-state списка и страницы 404/error с документированной разметкой.
- **Acceptance Criteria:** alert озвучивается скринридером (правильная роль); стенды.
- **Dependencies:** STORY-210. **Complexity:** S

### TASK-216 Порт VI-модуля (ГОСТ Р 52872)

- **Description:** перенос `vi.css`/`vi.js`/`vi-panel.html` из career-portal с заменой токенов на `--ui-*` и классов панели на `ui-vi-*`; проверка что перекраска накрывает все новые компоненты; встроенный прогон VI на CI-стенде.
- **Acceptance Criteria:** все 5 тем + 3 размера шрифта + интервал + картинки работают на каждом стенде; localStorage переживает перезагрузку; панель — единственный `!important`-слой системы.
- **Dependencies:** STORY-210; желательно после 211–215.
- **Definition of Done:** ui-vi.min.css в dist; отдельная страница «VI-режим» в showcase.
- **Complexity:** M

### TASK-217 Тест масштабирования шрифта и zoom

- **Description:** Playwright-сценарии: 200% browser zoom на ключевых стендах; `html { font-size: 32px }` — вёрстка не разваливается, нет горизонтального скролла; сценарий в релизный чек-лист.
- **Acceptance Criteria:** тест в CI-релизном прогоне, зелёный.
- **Dependencies:** STORY-210. **Complexity:** S

---

## EPIC-4 «Forms» (Phase 4) — MVP-контур

### STORY-220 Полевые компоненты

- **Goal:** все нативные контролы с единым API и состояниями.
- **Description:** `ui-field` (label/req/hint/error-обвязка), input (text/email/tel/password/date), textarea (auto-рост опционально), нативный select, checkbox (согласия/обычный), radio (radio-row), file — **доступная** стилизация (label-обёртка + визуально-скрытый input, фокус стилизован, не display:none); состояния: default/focus/error/disabled/readonly.
- **Acceptance Criteria:** каждый контрол доступен с клавиатуры и в скринридере без JS; error-состояние = `ui-field--error` + aria-invalid + aria-describedby; стенд всех контролов × состояний.
- **Dependencies:** STORY-210.
- **Definition of Done:** в dist; кейсы интеграции с `bitrix:form.result.new` в доке.
- **Complexity:** L

### STORY-221 Раскладка форм и серверные ошибки

- **Description:** `ui-form`, `ui-form-grid` (2col→1col), required-легенда, паттерн «Bitrix вывел ошибки после submit» (сервер рендерит те же классы error), сводная ошибка формы (`role="alert"`), success-состояние (порт паттерна career-portal).
- **Acceptance Criteria:** интеграционный стенд «форма целиком»: без JS отправляется, с JS — валидация, после «серверного» ответа — единый вид ошибок.
- **Dependencies:** STORY-220.
- **Definition of Done:** стенд + e2e-сценарий полного цикла. **Complexity:** M

### STORY-222 Клиентская валидация как progressive enhancement

- **Description:** порт `forms.js` до `IraoUI.form`: required/email/pattern/файл-размер, ошибка на blur/change, снятие на input, фокус на первую ошибку, aria-live для сводки; сервер всегда главный (novalidate только когда JS активен).
- **Acceptance Criteria:** форма без модуля отправляется нативно; с модулем — нет отправки с ошибками; тесты Vitest на логику валидации.
- **Dependencies:** STORY-220, STORY-221.
- **Definition of Done:** модуль в ui.min.js. **Complexity:** M

### TASK-223 Подключение MVP к стенду пилотного сайта

- **Description:** стенда-репетиция интеграции: чистый Bitrix-стенд или статическая копия страницы пилота; подключение по quickstart; страница с формой на ui-.
- **Acceptance Criteria:** quickstart из доки воспроизводится без обращения к автору; конфликты со стендовым CSS отсутствуют или задокументированы.
- **Dependencies:** EPIC-3, STORY-221.
- **Definition of Done:** отчёт-страница в showcase «Пилот-реверанс». **Complexity:** M

---

## EPIC-5 «Interactive P1 Components» (Phase 5)

### SPIKE-230 Native `<dialog>` или собственный overlay

- **Description:** матрица поддержки `<dialog>`/`showModal` в целевых браузерах + внутри Bitrix-страниц (z-index контексты, композит); решение «dialog + стили» vs «div + trap руками»; критерий: бесплатный focus-trap/Escape против контроля над анимацией.
- **Acceptance Criteria:** решение с доказательствами (таблица + мини-прототип) в ADR-формате в docs.
- **Dependencies:** нет. **Complexity:** S

### STORY-231 Modal

- **Description:** `ui-modal` по итогам SPIKE-230: размеры sm/md/full, закрывающие контролы, focus trap/restore (порт из directions.js), блокировка скролла без сдвига макета (scrollbar-gutter уже есть), анимация с reduced-motion.
- **Acceptance Criteria:** клавиатурный чек-лист APG пройден; e2e: open→Tab→Escape→фокус вернулся; ретест «нет остаточного padding после повторных циклов» (кейс из design-qa career-portal).
- **Dependencies:** SPIKE-230, STORY-210. **Complexity:** L

### STORY-232 Dropdown

- **Description:** `ui-dropdown` (порт header.js): кнопка+popup, Escape с возвратом фокуса, вне-клик, стрелки, `aria-expanded/controls`; вариант «навигационное меню» и «меню действий».
- **Acceptance Criteria:** APG menu-button паттерн; работает без JS как видимая группа ссылок (нативная деградация: контент раскрыт).
- **Dependencies:** STORY-210. **Complexity:** M

### STORY-233 Tabs

- **Description:** `ui-tabs` (порт tracks.js): roving tabindex, стрелки/Home/End, `aria-selected`, панели `role="tabpanel"`; без JS все панели видимы (или первый таб + `<noscript>`-раскрытие).
- **Acceptance Criteria:** e2e клавиатурной навигации; стенд с динамическими данными из JSON-паттерна.
- **Dependencies:** STORY-210. **Complexity:** M

### STORY-234 Accordion

- **Description:** `ui-accordion` на `<details>/<summary>` (нативная доступность без JS) + стилизация и технологию анимации grid-rows из career-portal; вариант FAQ.
- **Acceptance Criteria:** работает без JS полностью; анимация отключается при reduced-motion.
- **Dependencies:** STORY-210. **Complexity:** S

### TASK-235 Порт кастомного select (dd)

- **Description:** перенос `dropdowns.js` в `IraoUI.select` с отвязкой от классов career-portal (модификатор `ui-select--wrap` вместо знания о vacancy-search); сохранение синхронизации с нативным select и `change`; optgroup-поддержка.
- **Acceptance Criteria:** listbox-паттерн APG; e2e: форма фильтра отправляет выбранное значение; деградация — нативный select.
- **Dependencies:** STORY-220. **Complexity:** M

### STORY-236 Pagination

- **Description:** порт pagination: страницы/«…»/стрелки, `aria-current="page"`, disabled-стрелки; дока «генерация в Bitrix-шаблоне».
- **Acceptance Criteria:** стенд + e2e; текущая страница объявляется скринридером.
- **Dependencies:** STORY-210. **Complexity:** S

### STORY-237 Таблицы и Loader

- **Description:** `ui-table`-паттерны: обычная, с горизонтальным скроллом на мобиле, «карточная» трансформация (attr-based); `ui-loader` (спиннер + текст, aria-busy паттерн).
- **Acceptance Criteria:** стенды адаптива таблиц; loader озвучивается корректно.
- **Dependencies:** STORY-210. **Complexity:** M

### TASK-238 Паттерны Header/Footer/Search-overlay

- **Description:** документационные страницы (не dist-код): референс-разметка шапки/подвала/поискового оверлея на базе ui-компонентов; search-overlay как паттерн поверх ui-modal.
- **Acceptance Criteria:** паттерны собираются копипастой; оверлей проходит dialog-чек-лист.
- **Dependencies:** STORY-231. **Complexity:** M

---

## EPIC-6 «Layout Patterns» (Phase 6)

### STORY-240 Страничные паттерны

- **Description:** showcase-наборы «Собери страницу»: list page (фильтры+сетка+pagination), detail page (хлебные крошки+контент+aside+related), form page (двухколоночная с aside), landing section (секции/фоны/typography); правила контентных секций и границы системы.
- **Acceptance Criteria:** страница списка собирается из паттернов без нового CSS; стенды всех 4 паттернов в visual-регрессии.
- **Dependencies:** EPIC-3, EPIC-5 (частично, можно стартовать после Phase 4).
- **Definition of Done:** раздел «Patterns» в showcase. **Complexity:** L

---

## EPIC-7 «Accessibility Hardening» (Phase 7)

### STORY-250 A11y-спринт: ручная гарантия + forced-colors

- **Description:** ручной протокол NVDA + VoiceOver по каждому интерактивному стенду (сценарии записываются в доку); forced-colors (Windows High Contrast) для кнопок/полей/карточек; ревизия контраста всех тем (включая theme-файлы пилотов); VI-прогон всех новых компонентов.
- **Acceptance Criteria:** протокол подписан, найденное — исправлено или заведено с осознанным исключением; forced-colors не теряет границы контролов; axe=0 нарушений на всех страницах.
- **Dependencies:** EPIC-5, EPIC-6. **Complexity:** L

---

## EPIC-8 «Documentation» (Phase 8)

### STORY-260 Полная документация и incognito-тест

- **Description:** доведение всех компонентных док до шаблона architecture §8; integration-guide финализация; quickstart «подключить за 30 минут»; тест: внешний разработчик по докам подключает систему к чистому стенду — фиксируем все места, где он застрял.
- **Acceptance Criteria:** incognito-тест пройден (все затыки закрыты правками доков); showcase полон.
- **Dependencies:** EPIC-3–6. **Complexity:** M

---

## EPIC-9 «Bitrix Integration» (Phase 9)

### TASK-270 Интеграция пилота A (рекомендуемый кандидат — Bitrix-версия career-portal)

- **Description:** подключить ui-core+vi на стенд/прод-шаблон сайта A (тему — только если сайт реально отличается от дефолтного бренда); перевести 2–3 страницы (включая форму) на ui-компоненты; вести журнал конфликтов legacy-CSS.
- **Acceptance Criteria:** страницы в предпроде; журнал конфликтов пуст или имеет задокументированные обходы; VI-режим работает на реальном сайте.
- **Dependencies:** STORY-260, готовность сайта A. **Complexity:** L

### TASK-271 Интеграция пилота B

- **Description:** то же для сайта B — с другой структурой страниц (цель — доказать переиспользование компонентов на отличном от пилота A типе сайта; оба в одном бренде — решение Phase 0).
- **Acceptance Criteria:** сайт B переиспользует компоненты без форка системы и без правок файлов в /local/ui/.
- **Dependencies:** STORY-260, готовность сайта B. **Complexity:** L

### TASK-272 Отработка процесса обновления

- **Description:** выпустить minor-релиз (новый компонент/фикс); обновить оба пилота по чек-листу; замерить трудозатраты; улучшить upgrade-гайд.
- **Acceptance Criteria:** обновление каждого сайта ≤ 0.5 дня; гайд отражает реальность.
- **Dependencies:** TASK-270, TASK-271. **Complexity:** S

---

## EPIC-10 «Release 1.0» (Phase 10)

### TASK-280 Release pipeline

- **Description:** тег vX.Y.Z → CI: полный матричный прогон + шрифто-зом/VI smoke → zip-артефакт dist → GitHub/GitLab Release + CHANGELOG; nightly-матрица chromium/firefox/webkit.
- **Acceptance Criteria:** релиз v1.0.0 воспроизводим одной командой/тегом; nightly зелёный.
- **Dependencies:** EPIC-9. **Complexity:** M

### STORY-281 Политика поддержки и migration guide 1.x

- **Description:** задокументировать N−1, deprecation-процесс; черновик migration-гайда для будущего 2.0 (по опыту переименований, если были); релизный чек-лист.
- **Acceptance Criteria:** CHANGELOG.md ведётся; политика в README.
- **Dependencies:** TASK-280. **Complexity:** S

---

## Отложенные (backlog après 1.0, оцениваются по запросу сайтов)

- Tooltip (P2) — после позиционирования из modal;
- Carousel/Slider (P2) — scroll-snap база + кнопки-усиление;
- Skeleton loader, Toasts, Stepper (P2);
- PHP-хелперы рендера компонентов — только при доказанной боли копипасты;
- Storybook — пересмотр при росте команды/количества компонентов > 40;
- Общий статик-домен для 5+ сайтов — инфраструктурное решение группы.

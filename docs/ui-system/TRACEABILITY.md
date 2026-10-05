# Traceability

Связь «исходное требование → архитектурное решение → эпик → задача → верификация». Покрыты все 21 требование исходного ТЗ + сквозные решения. Полные AC — в файлах задач.

| # | Requirement | Решение (architecture/ADR) | Epic | Task(s) | Verification |
|---|---|---|---|---|---|
| 1 | Mobile-first, responsive/adaptive | mobile-first min-width, шкала брейкпоинтов (02 §3.2) | EPIC-2, 3 | [T2.5](epics/EPIC-02-design-tokens/T2.5-breakpoint-scale.md), [T3.4](epics/EPIC-03-base-typography/T3.4-container-section-grid.md) | stylelint-гейт; Playwright 320–1440 overflow-тесты |
| 2 | Кросс-браузерность | матрица evergreen ×2 (Phase 0) | EPIC-1, 12 | [T1.5](epics/EPIC-01-foundation/T1.5-ci-pipeline.md), [T12.1](epics/EPIC-12-release/T12.1-release-pipeline.md) | nightly/release матрица chromium/firefox/webkit |
| 3 | Версия для слабовидящих (ГОСТ Р 52872) | модуль vi, отдельный dist-файл (02 §5) | EPIC-9 | [T9.1](epics/EPIC-09-accessibility/T9.1-vi-module.md) | e2e тем/размеров/персистентности; VI-smoke в релизе |
| 4 | Semantic HTML5, валидный HTML | HTML-паттерны, html-validate | EPIC-1 | [T1.2](epics/EPIC-01-foundation/T1.2-linters.md) + компонентные | html-validate mandatory PR |
| 5 | Schema.org где уместно | BreadcrumbList, JobPosting/Article-кейсы (02 §0) | EPIC-4, 8 | [T4.7](epics/EPIC-04-primitives/T4.7-breadcrumbs.md), [T8.2](epics/EPIC-08-layout-patterns/T8.2-detail-page-pattern.md) | e2e-парсер структуры + Rich Results |
| 6 | SEO: h1→h3, meta, title | правила иерархии в валидаторе | EPIC-1, 3 | [T1.2](epics/EPIC-01-foundation/T1.2-linters.md), [T3.3](epics/EPIC-03-base-typography/T3.3-typography-classes.md) | html-validate на всех страницах |
| 7 | Alt и a11y изображений | паттерн трёх видов изображений | EPIC-4 | [T4.6](epics/EPIC-04-primitives/T4.6-image-and-figure.md) | html-validate (alt/размеры), axe |
| 8 | Retina | srcset/@2x, векторные иконки — политика | EPIC-4 | [T4.6](epics/EPIC-04-primitives/T4.6-image-and-figure.md) | док-чеклист + визуальная сверка |
| 9 | Fallback-шрифты Win/mac/linux | стек Golos→Arial→sans (02 §3.2) | EPIC-3 | [T3.1](epics/EPIC-03-base-typography/T3.1-fonts-and-reset.md) | e2e offline-шрифт сценарий |
| 10 | Работа без JS | PE: формы/навигация/контролы нативны | EPIC-5, 6, 7 | [T5.5](epics/EPIC-05-forms/T5.5-form-validation-module.md), [T6.1](epics/EPIC-06-navigation/T6.1-dropdown.md), [T6.2](epics/EPIC-06-navigation/T6.2-tabs.md), [T7.3](epics/EPIC-07-complex-components/T7.3-custom-select.md) | e2e no-JS сценарии |
| 11 | Без Flash | нет по построению (нативный стек) | — | — | тривиально (нет плагинов) |
| 12 | HTML5 forms | нативные контролы + типы | EPIC-5 | [T5.1](epics/EPIC-05-forms/T5.1-field-input-textarea.md), [T5.2](epics/EPIC-05-forms/T5.2-select-checkbox-radio.md) | e2e + axe label-правила |
| 13 | Keyboard accessibility | глобальная политика фокуса ADR-0001 + APG-паттерны | EPIC-3, 6, 7 | [T3.2](epics/EPIC-03-base-typography/T3.2-focus-policy.md) + интерактивные | e2e клавиатурные циклы |
| 14 | Screen reader accessibility | ARIA по APG; NVDA/VoiceOver протокол | EPIC-9 | [T9.2](epics/EPIC-09-accessibility/T9.2-accessibility-hardening.md) | axe (авто) + подписанный ручной протокол |
| 15 | Увеличение шрифта не ломает | rem-типографика, min-height, zoom-гейты | EPIC-2, 3 | [T2.2](epics/EPIC-02-design-tokens/T2.2-token-semantic-layer.md), [T3.6](epics/EPIC-03-base-typography/T3.6-font-scaling-tests.md) | zoom 200% / 32px сценарии (release-гейт) |
| 16 | Отсутствующие изображения | fallback-стили, alt-правила | EPIC-4 | [T4.6](epics/EPIC-04-primitives/T4.6-image-and-figure.md) | e2e broken-src + CLS=0 |
| 17 | Переиспользование между Bitrix-сайтами | dist + сниппеты, пилоты A/B | EPIC-11 | [T11.2](epics/EPIC-11-bitrix-integration/T11.2-pilot-a.md), [T11.3](epics/EPIC-11-bitrix-integration/T11.3-pilot-b.md) | два сайта без форка; чек-листы страниц |
| — | Контраст WCAG AA | двухслойные токены + контраст-скрипт (ADR-0009) | EPIC-2 | [T2.3](epics/EPIC-02-design-tokens/T2.3-contrast-validation.md) | CI-скрипт (mandatory) + axe |
| — | Legacy-CSS сосуществование | namespace + ADR-0001/0002 + констрейнты (ADR-0008) | EPIC-11 | [T11.1](epics/EPIC-11-bitrix-integration/T11.1-snippets-and-legacy-constraints.md) | e2e legacy-атака; журналы пилотов |
| — | Темизация сайтов | механизм тем, один бренд (Phase 0) | EPIC-2 | [T2.4](epics/EPIC-02-design-tokens/T2.4-theme-mechanism.md) | e2e смена темы без правок компонентов |
| — | Версионирование/релизы | semver, N−1 (ADR-0007), delivery (ADR-0006) | EPIC-12 | [T12.1](epics/EPIC-12-release/T12.1-release-pipeline.md), [T12.2](epics/EPIC-12-release/T12.2-versioning-policy.md) | release-пайплайн; upgrade-репетиция [T11.4](epics/EPIC-11-bitrix-integration/T11.4-upgrade-rehearsal.md) |
| — | Visual regression | единый контейнер, advisory→mandatory (ADR-0004) | EPIC-1 | [T1.4](epics/EPIC-01-foundation/T1.4-playwright-harness.md), [T1.5](epics/EPIC-01-foundation/T1.5-ci-pipeline.md) | скриншот-гейты PR (CI-эталоны) |
| — | Документация/adoption | showcase, quickstart, contribution | EPIC-10 | [T10.1](epics/EPIC-10-documentation/T10.1-docs-page-template.md)–[T10.4](epics/EPIC-10-documentation/T10.4-contribution-and-adr.md) | incognito-тест; автопроверка полноты |
| — | VI + фокус + box-sizing под legacy | ADR-0001, ADR-0002 | EPIC-3 | [T3.2](epics/EPIC-03-base-typography/T3.2-focus-policy.md), [T3.1](epics/EPIC-03-base-typography/T3.1-fonts-and-reset.md) | e2e legacy-атака (outline-none / box-sizing) |

ADR-журнал: [adr/](../adr/) · Архитектура: [02-architecture.md](../02-architecture.md) · Аудит референса: [01-audit-career-portal.md](../01-audit-career-portal.md).

# Implementation Order

Порядок реализации backlog ([epics/](epics/)). Итерации без календаря: объём одной ≈ 8–12 идеальных дней одного разработчика (вдвое меньше при двух). Соответствие фазам roadmap — [03-roadmap.md](../03-roadmap.md). Итог — v1.0.

```text
Iteration 0 (Foundation) → 1 (Tokens) → 2 (Base) → 3 (Primitives)
    → 4 (Forms, MVP-code) → 5 (Bitrix-минимум, MVP) → 6 (Пилот A)
    → 7 (Interactive P1) → 8 (Select/таблицы/паттерны) → 9 (Hardening+доки)
    → 10 (Пилот B + v1.0)
```

---

## Iteration 0 — Foundation & Tooling (Phase 1)

- **Цель:** конвейер, в котором любой следующий шаг дешёвый.
- **Задачи:** [T1.1](epics/EPIC-01-foundation/T1.1-repo-skeleton-and-module-template.md), [T1.2](epics/EPIC-01-foundation/T1.2-linters.md), [T1.3](epics/EPIC-01-foundation/T1.3-build-dist-and-showcase.md), [T1.4](epics/EPIC-01-foundation/T1.4-playwright-harness.md), [T1.6](epics/EPIC-01-foundation/T1.6-vitest-layer.md), [T1.5](epics/EPIC-01-foundation/T1.5-ci-pipeline.md).
- **Dependencies:** нет.
- **Expected outcome / DoD:** демо-PR проходит полный гейт; showcase на Pages; branch protection включена.

## Iteration 1 — Design Tokens (Phase 2)

- **Цель:** единая визуальная правда + контраст-гейт + механизм тем.
- **Задачи:** [T2.1](epics/EPIC-02-design-tokens/T2.1-token-primitives.md), [T2.2](epics/EPIC-02-design-tokens/T2.2-token-semantic-layer.md), [T2.3](epics/EPIC-02-design-tokens/T2.3-contrast-validation.md), [T2.5](epics/EPIC-02-design-tokens/T2.5-breakpoint-scale.md), [T2.4](epics/EPIC-02-design-tokens/T2.4-theme-mechanism.md) (+[T2.6](epics/EPIC-02-design-tokens/T2.6-derived-color-states.md) старт).
- **Dependencies:** Iteration 0.
- **DoD:** стенд токенов 100%; hex вне primitives невозможен; контраст-гейт в PR; тема переключается.

## Iteration 2 — Base & Typography (Phase 3)

- **Цель:** безопасный глобальный фундамент; ранний старт VI.
- **Задачи:** [T3.1](epics/EPIC-03-base-typography/T3.1-fonts-and-reset.md), [T3.2](epics/EPIC-03-base-typography/T3.2-focus-policy.md), [T3.3](epics/EPIC-03-base-typography/T3.3-typography-classes.md), [T3.4](epics/EPIC-03-base-typography/T3.4-container-section-grid.md), [T3.5](epics/EPIC-03-base-typography/T3.5-skip-link.md), [T3.6](epics/EPIC-03-base-typography/T3.6-font-scaling-tests.md), [T9.1](epics/EPIC-09-accessibility/T9.1-vi-module.md) (ранний старт).
- **Dependencies:** Iteration 1.
- **DoD:** фокус переживает legacy-атаку; zoom/32px зелёные; VI e2e зелёный.

## Iteration 3 — Primitives (Phase 3)

- **Цель:** P0-компоненты + эталон качества (button) + шаблон доки.
- **Задачи:** [T4.1](epics/EPIC-04-primitives/T4.1-link.md) → [T4.2](epics/EPIC-04-primitives/T4.2-button.md) → [T4.3](epics/EPIC-04-primitives/T4.3-tag-and-badge.md), [T4.4](epics/EPIC-04-primitives/T4.4-card.md), [T4.5](epics/EPIC-04-primitives/T4.5-alert.md), [T4.6](epics/EPIC-04-primitives/T4.6-image-and-figure.md), [T4.7](epics/EPIC-04-primitives/T4.7-breadcrumbs.md), [T4.8](epics/EPIC-04-primitives/T4.8-empty-and-error-states.md) + [T10.1](epics/EPIC-10-documentation/T10.1-docs-page-template.md).
- **Dependencies:** Iteration 2 (+T2.6).
- **DoD:** каждый компонент: стенд+эталоны+axe+дока по шаблону.

## Iteration 4 — Forms → MVP code-complete (Phase 4)

- **Задачи:** [T5.1](epics/EPIC-05-forms/T5.1-field-input-textarea.md), [T5.2](epics/EPIC-05-forms/T5.2-select-checkbox-radio.md), [T5.3](epics/EPIC-05-forms/T5.3-file-input.md), [T5.4](epics/EPIC-05-forms/T5.4-form-layout.md), [T5.5](epics/EPIC-05-forms/T5.5-form-validation-module.md), [T5.6](epics/EPIC-05-forms/T5.6-server-errors-contract.md).
- **Dependencies:** Iteration 3.
- **DoD:** полный форма-цикл зелёный; контракт серверных ошибок + сниппеты; **MVP-код готов**.

## Iteration 5 — Bitrix-минимум + quickstart (MVP-граница)

- **Задачи:** [T11.1](epics/EPIC-11-bitrix-integration/T11.1-snippets-and-legacy-constraints.md), [T10.3](epics/EPIC-10-documentation/T10.3-quickstart-and-guides.md), [T12.1](epics/EPIC-12-release/T12.1-release-pipeline.md) (режим 0.x), [T12.2](epics/EPIC-12-release/T12.2-versioning-policy.md); стендовая репетиция подключения (по материалам T5.6/T11.1).
- **Dependencies:** Iteration 4.
- **DoD:** incognito-тест quickstart; тег → zip → артефакт воспроизводим. **Граница MVP** ([MVP.md](MVP.md)).

## Iteration 6 — Пилот A (Phase 9 старт)

- **Задачи:** [T11.2](epics/EPIC-11-bitrix-integration/T11.2-pilot-a.md).
- **Dependencies:** Iteration 5; решение менеджера по пилотам.
- **DoD:** 2–3 реальные страницы (вкл. форму) в предпроде; журнал конфликтов.

## Iteration 7 — Interactive P1 (Phase 5)

- **Задачи:** [T6.1](epics/EPIC-06-navigation/T6.1-dropdown.md), [T6.2](epics/EPIC-06-navigation/T6.2-tabs.md), [T6.4](epics/EPIC-06-navigation/T6.4-accordion.md), [T6.3](epics/EPIC-06-navigation/T6.3-pagination.md), [T7.1](epics/EPIC-07-complex-components/T7.1-spike-native-dialog.md), [T7.2](epics/EPIC-07-complex-components/T7.2-modal.md).
- **Dependencies:** Iteration 3 (параллелизуемо с 5–6 при двух разработчиках).
- **DoD:** APG-чек-листы зелёные; ADR SPIKE закрыт.

## Iteration 8 — Select, таблицы, паттерны страниц (Phase 5–6)

- **Задачи:** [T7.3](epics/EPIC-07-complex-components/T7.3-custom-select.md), [T7.4](epics/EPIC-07-complex-components/T7.4-table-patterns.md), [T7.5](epics/EPIC-07-complex-components/T7.5-loader.md), [T7.6](epics/EPIC-07-complex-components/T7.6-overlay-header-footer-patterns.md), [T8.1](epics/EPIC-08-layout-patterns/T8.1-list-page-pattern.md), [T8.2](epics/EPIC-08-layout-patterns/T8.2-detail-page-pattern.md), [T8.3](epics/EPIC-08-layout-patterns/T8.3-form-page-and-landing-patterns.md).
- **Dependencies:** Iteration 7 (+T5.x).
- **DoD:** страницы собираются копипастой; паттерн-стенды в регрессии.

## Iteration 9 — A11y hardening + документация (Phase 7–8)

- **Задачи:** [T9.2](epics/EPIC-09-accessibility/T9.2-accessibility-hardening.md), [T10.2](epics/EPIC-10-documentation/T10.2-all-component-docs.md), [T10.4](epics/EPIC-10-documentation/T10.4-contribution-and-adr.md).
- **Dependencies:** Iterations 7–8.
- **DoD:** скринридер-протокол подписан; доки 100%; CONTRIBUTING финал.

## Iteration 10 — Пилот B + upgrade + v1.0 (Phase 9–10)

- **Задачи:** [T11.3](epics/EPIC-11-bitrix-integration/T11.3-pilot-b.md), [T11.4](epics/EPIC-11-bitrix-integration/T11.4-upgrade-rehearsal.md), включение mandatory visual-гейта (ADR-0004), релиз v1.0 по чек-листу [T12.1](epics/EPIC-12-release/T12.1-release-pipeline.md).
- **Dependencies:** Iterations 6, 9.
- **DoD:** два сайта на системе; upgrade ≤ 0.5 дня; v1.0.0 выпущена.

---

## Critical path

```text
T1.1 → T1.3 → T1.4 → T1.5 → T2.1 → T2.2 → T3.1 → T3.2 → T3.4 → T4.2
     → T5.1 → T5.4 → T5.5 → T5.6 → T10.3 → T11.1 → T11.2 → T12.1 → v1.0
```

Сумма по критическому пути ≈ **63–68 идеальных дней** одного разработчика до продакшн-пилота (T11.2), ~90–100 дней до v1.0 (с пилотом B и hardening). Два разработчика сокращают нелинейно: после Iteration 4 ветки Iterations 5–6 (Bitrix/пилот) и 7–8 (interactive/паттерны) идут параллельно.

## Параллельные точки (для второго разработчика)

- Iterations 0–1: T1.6 + T2.5/T2.6 рядом с основным потоком;
- после Iteration 4: ветка 7–8 целиком;
- T10.2 (доки) распределяется по владельцам компонентов в Iterations 7–9.

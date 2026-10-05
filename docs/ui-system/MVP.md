# MVP Definition

Граница MVP = **Iterations 0–5** ([IMPLEMENTATION-ORDER.md](IMPLEMENTATION-ORDER.md)). Проверка по 10 способностям исходного требования — таблица ниже.

## MVP includes

- **Инфраструктура:** конвейер (lint/stylelint-гейты, html-validate, Vitest, Playwright+axe, visual advisory, CI-гейты, Pages); сборка dist+showcase (ADR-0004 — контейнер).
- **Токены и темы:** примитивы+семантика, контраст-гейт AA, шкала брейкпоинтов, механизм тем (дефолт Интер РАО + синтетическая тестовая — Phase 0: один бренд).
- **Base:** шрифты Golos, reset, focus-политика (ADR-0001), типографика rem, container/section/grid, skip-link, zoom/32px-гейты.
- **Компоненты (P0):** link, button, tag/badge, card, alert, image/figure, breadcrumbs (+schema.org), empty/error-паттерны.
- **Формы (P0):** field (input/textarea), select/checkbox/radio (нативные), file (доступный), form-layout + summary + success, IraoUI.form (PE-валидация), контракт серверных ошибок Bitrix + стенд полного цикла.
- **A11y:** VI-модуль ГОСТ Р 52872 (ui-vi.min.css), глобальная focus-политика, AA-контраст, axe в PR.
- **Доки:** шаблон страницы компонента + эталоны (button/field/modal-черновой), quickstart + integration-guide.
- **Bitrix:** сниппеты подключения + legacy-констрейнты + чек-лист; стендовая репетиция подключения.
- **Релизы:** пайплайн тег→zip→Release (режим 0.x), changelog-гейт, политика semver/N−1/deprecation.
- **Пилот A:** подключение системы к одному реальному Bitrix-сайту, 2–3 страницы (включая форму) в предпроде.

## MVP excludes (P1 — сразу после; P2 — do-not-build)

- Interactive P1: dropdown, tabs, accordion, pagination (Iteration 7); modal+SPIKE, custom select, таблицы, loader, overlay/header/footer-паттерны (7–8).
- Страничные паттерны (list/detail/form/landing) — Iteration 8.
- A11y hardening: forced-colors, NVDA/VoiceOver-протокол, ревизия hover-контраста — Iteration 9.
- Полные доки всех компонентов, contribution — Iteration 9.
- Пилот B, upgrade-репетиция, v1.0 (включая перевод visual-гейта в mandatory) — Iteration 10.
- Всё из do-not-build ([07-execution.md §5](../07-execution.md)): tooltip/carousel/skeleton/toasts, мульти-бренд-темы, PHP-хелперы, Storybook, Bitrix-модуль, тёмная тема, @layer, TypeScript, общий статик-домен.

## MVP acceptance criteria (10 способностей)

| # | Способность | Закрыто задачами | Проверка |
|---|---|---|---|
| 1 | Подключить UI System к Bitrix | [T11.1](epics/EPIC-11-bitrix-integration/T11.1-snippets-and-legacy-constraints.md) | сниппеты на чистом стенде + репетиция |
| 2 | Настроить theme | [T2.4](epics/EPIC-02-design-tokens/T2.4-theme-mechanism.md) | e2e смена токенов; локальное переопределение в гайде |
| 3 | Использовать базовые компоненты | [EPIC-4](epics/EPIC-04-primitives/README.md) | стенды + доки-эталоны |
| 4 | Создать полноценную страницу | [T3.3](epics/EPIC-03-base-typography/T3.3-typography-classes.md), [T3.4](epics/EPIC-03-base-typography/T3.4-container-section-grid.md) + page-head из стендов | сборка страницы на base-примитивах |
| 5 | Реализовать формы | [EPIC-5](epics/EPIC-05-forms/README.md) | e2e полного цикла (без JS → с JS → сервер → успех) |
| 6 | Navigation/layout | breadcrumbs (T4.7) + container/grid; dropdown/tabs — P1 | e2e крошек, адаптив сеток |
| 7 | Accessibility requirements | [T3.2](epics/EPIC-03-base-typography/T3.2-focus-policy.md), [T3.5](epics/EPIC-03-base-typography/T3.5-skip-link.md), [T9.1](epics/EPIC-09-accessibility/T9.1-vi-module.md), [T2.3](epics/EPIC-02-design-tokens/T2.3-contrast-validation.md) | axe-гейты, legacy-атака, VI-e2e, контраст-скрипт |
| 8 | Automated quality checks | [T1.5](epics/EPIC-01-foundation/T1.5-ci-pipeline.md) | обязательные PR-гейты зелёные |
| 9 | Выпустить версию package | [T12.1](epics/EPIC-12-release/T12.1-release-pipeline.md), [T12.2](epics/EPIC-12-release/T12.2-versioning-policy.md) | демо-тег → zip → Release воспроизводим |
| 10 | Подключить к реальному Bitrix-сайту | [T11.2](epics/EPIC-11-bitrix-integration/T11.2-pilot-a.md) | страницы пилота A в предпроде |

## Required components (состав dist MVP)

`ui-core.min.css` (tokens + base + EPIC-4 + EPIC-5) · `ui-vi.min.css` · `ui.min.js` (IraoUI.form + IraoUI.vi + утилиты) · `fonts/` (Golos + OFL) · `themes/` (theme-test) · `bitrix/snippets/` + quickstart/integration-guide.

## Required infrastructure

GitHub Actions (PR-гейты + Pages + release-каркас + nightly-каркас) · Playwright-контейнер (ADR-0004) · CI-джоба update-snapshots (fallback) · контраст-скрипт в гейтах · branch protection (lint/build/unit/e2e обязательны; visual advisory).

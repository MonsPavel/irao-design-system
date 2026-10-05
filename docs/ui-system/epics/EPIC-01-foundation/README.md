# EPIC-1 — Foundation & Tooling

## Goal

Создать репозиторий и конвейер, в котором любой следующий шаг разработки (компонент, токен, тест) технически дешёв и защищён гейтами: архитектурные правила исполняются машиной, а не ревью.

## Context

Фаза 1 roadmap. Дальнейшие эпики (токены, компоненты, доки) опираются на: структуру каталогов, линтеры (БЭМ-нейминг, запрет hex вне tokens, запрет `!important` вне vi), сборку dist+showcase, тестовый харнесс (Playwright+axe+Vitest) и CI с mandatory-гейтами. Решение о тестировании встроено в каждую задачу отсюда и далее (TDD), accessibility — в DoD каждого компонента.

## Scope

- скелет репозитория по структуре 02-architecture §7;
- шаблон JS-модуля (IIFE, `window.IraoUI`, readyState-guard);
- stylelint / eslint / prettier / html-validate с правилами архитектуры;
- сборка dist (esbuild) + генерация showcase;
- Playwright-харнесс: e2e, axe, скриншоты (контейнер — ADR-0004);
- Vitest для JS-логики;
- CI: PR-гейты, Pages-деплой, каркас релизного workflow.

## Out of scope

- Токены и base-стили (EPIC-2/3);
- компоненты и их тесты (EPIC-4+);
- релизный пайплайн в боевом режиме (T12.1, здесь — только каркас workflow);
- Docker-образ собственный (используется официальный Playwright-образ).

## Expected outcome

Демо-PR с тестовым компонентом проходит полный конвейер lint → html-validate → unit → build → e2e+axe → visual (advisory); showcase задеплоен на GitHub Pages; эталоны создаются в контейнере и бинарно совпадают с CI.

## Dependencies

Нет (первый эпик). Решения Phase 0 и ADR-0001…0009 приняты.

## Tasks

- [T1.1 — Скелет репозитория и шаблон JS-модуля](T1.1-repo-skeleton-and-module-template.md)
- [T1.2 — Линтеры: stylelint (БЭМ + hex-гейт), eslint, prettier, html-validate](T1.2-linters.md)
- [T1.3 — Сборка dist и showcase (esbuild)](T1.3-build-dist-and-showcase.md)
- [T1.4 — Playwright-харнесс: e2e + axe + скриншоты](T1.4-playwright-harness.md)
- [T1.5 — CI-конвейер с mandatory-гейтами](T1.5-ci-pipeline.md)
- [T1.6 — Vitest-слой для JS-логики](T1.6-vitest-layer.md)

## Acceptance Criteria

- [ ] `npm run lint` / `test` / `build` работают локально и в CI;
- [ ] файл-нарушитель каждого правила (нейтральное имя класса, hex в компоненте, `!important` вне vi, img без alt, `max-width`-media) валит соответствующий линтер;
- [ ] демо-PR блокируется при нарушении, чистый PR зелёный ≤ 5 мин;
- [ ] showcase доступен по URL Pages; dist-структура соответствует 02-architecture §6.1.

## Definition of Done

- [ ] Все 6 задач эпика закрыты, их AC выполнены
- [ ] Branch protection включена (обязательные: lint, build, unit, e2e)
- [ ] README «Как добавить компонент» и «Как писать тесты компонента» написаны
- [ ] Конвейер прогнан на реальном демо-PR (не на main)

## Risks

- Over-engineering tooling → митигация: закрытый список инструментов (esbuild, stylelint, eslint, prettier, html-validate, playwright, vitest), ничего сверх;
- Ловушка эталонов между ОС → закрыта ADR-0004 (контейнер + advisory);
- CI-время > 5 мин на PR → митигация: матрица браузеров вынесена в nightly/release.

## Notes

Typecheck отсутствует сознательно: нативный JS без TS, статический анализ закрывает eslint (см. 06-implementation-plan §7).

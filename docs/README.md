# irao-ui — проектная документация

UI-система для сайтов Группы «Интер РАО» на 1С-Битрикс. Статус: архитектура спроектирована, код ещё не пишется.

| Документ | Содержание |
|---|---|
| [01-audit-career-portal.md](01-audit-career-portal.md) | Технический аудит референсного проекта и классификация решений A/B/C/D |
| [02-architecture.md](02-architecture.md) | Архитектура: CSS-подход, namespace, токены, компоненты, accessibility, интеграция с Битрикс, структура репо, документация, тестирование, CI/CD, версионирование |
| [03-roadmap.md](03-roadmap.md) | Фазы 0–10 с целями, зависимостями и критериями приёмки |
| [04-backlog.md](04-backlog.md) | Jira-ready бэклог: EPIC/STORY/TASK/SPIKE |
| [05-mvp-risks.md](05-mvp-risks.md) | MVP по MoSCoW, риски с митигациями, открытые вопросы, финальные рекомендации |
| [06-implementation-plan.md](06-implementation-plan.md) | Implementation plan: эпики 1–12, задачи с TDD, уточнения архитектуры (⚠️ ADR), extraction из career-portal, Bitrix-план, миграция legacy, CI/CD, релизы |
| [07-execution.md](07-execution.md) | Execution: dependency graph, критический путь, итоговый backlog, итерации 0–10, граница MVP, do-not-build |
| [adr/](adr/) | Журнал архитектурных решений: ADR-0001 focus-специфичность, ADR-0002 box-sizing компонентов, ADR-0004 visual-эталоны — единый контейнер + advisory-гейт до v1.0 (заменил ADR-0003; все приняты 2026-10-05) |
| [ui-system/](ui-system/README.md) | **File-based backlog**: 12 эпиков × 57 задач (каждая — отдельный файл с AC/DoD/зависимостями), порядок реализации, MVP, traceability |
| [process/nightly-review-protocol.md](process/nightly-review-protocol.md) | Ночной цикл (night-cycle): автономный конвейер задач из STATUS.md — TDD → усиленное ревью (severity-модель ecc; critical/high правятся всегда) → приёмка → gate → merge; детерминированная CI-часть — `.github/workflows/nightly.yml` |

Референс: `D:/repositories/career-portal` (статическая вёрстка карьерного портала, источник решений класса A).

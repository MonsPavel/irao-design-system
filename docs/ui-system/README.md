# UI System — file-based backlog (epics & tasks)

Материализованный backlog утверждённого implementation plan ([06-implementation-plan.md](../06-implementation-plan.md)). Каждый эпик и каждая задача — отдельный файл. Файлы являются источником требований для последующего технического планирования (`/plan`), статус-трекинг ведётся в Jira.

## Структура

```text
docs/ui-system/
├── README.md                  # этот файл: конвенции
├── IMPLEMENTATION-ORDER.md    # порядок реализации, итерации, критический путь
├── MVP.md                     # граница MVP
├── TRACEABILITY.md            # требование → epic → task → верификация
├── architecture/
│   └── README.md              # указатель на архитектуру и ADR-журнал
└── epics/
    ├── EPIC-01-foundation/          # README.md + файлы задач
    ├── EPIC-02-design-tokens/
    ├── EPIC-03-base-typography/
    ├── EPIC-04-primitives/
    ├── EPIC-05-forms/
    ├── EPIC-06-navigation/
    ├── EPIC-07-complex-components/
    ├── EPIC-08-layout-patterns/
    ├── EPIC-09-accessibility/
    ├── EPIC-10-documentation/
    ├── EPIC-11-bitrix-integration/
    └── EPIC-12-release/
```

## Конвенции

- **ID задач:** `T<эпик>.<номер>` (например `T4.2`) — единственная система ID, совпадает с [06-implementation-plan.md](../06-implementation-plan.md) и [07-execution.md](../07-execution.md). ID из раннего черновика [04-backlog.md](../04-backlog.md) (`TASK-101`, `STORY-201`…) считаются заменёнными; черновик остаётся источником формулировок.
- **Файл задачи:** `T<эпик>.<н>-kebab-slug.md`, одна задача — один файл.
- **Файл эпика:** `README.md` внутри каталога эпика.
- **Ссылки:** только на реальные файлы относительными путями (`../EPIC-02-design-tokens/T2.2-token-semantic-layer.md`).
- **Приоритеты:** P0 (MVP, блокирует релиз) / P1 (важно сразу после MVP) / P2 (позже). P2-задачи в файлы не материализованы — их список в [07-execution.md §5](../07-execution.md) (do-not-build).
- **Type:** TASK | SPIKE (SPIKE всегда завершается ADR или документированным решением).
- **Источник требований:** не выдумываются. База: [02-architecture.md](../02-architecture.md) (архитектура), [01-audit-career-portal.md](../01-audit-career-portal.md) (референс), решения Phase 0 ([05-mvp-risks.md](../05-mvp-risks.md)), ADR-журнал ([../adr/](../adr/)). Если решение не принято — в задаче раздел `## Open Questions`.
- **Референс одобренного дизайна:** `D:/repositories/career-portal` (заморожен) — эталон визуала: макет CP_Ревью, pixel-QA пройден (design-qa.md). Дефолтная тема системы обязана воспроизводить его значения; любое отклонение (контраст-фиксы, цвета состояний, новые значения) — **design-decision**: помечается в таблице диффов задачи и согласуется с владельцем дизайна, молчаливые «улучшения» запрещены.

## Сводка

12 эпиков, 57 задач (56 TASK + 1 SPIKE). Порядок реализации и критический путь — [IMPLEMENTATION-ORDER.md](IMPLEMENTATION-ORDER.md). Граница MVP (итерации 0–5) — [MVP.md](MVP.md).

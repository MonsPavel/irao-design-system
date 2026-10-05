# EPIC-12 — Release & Versioning

## Goal

Воспроизводимый релизный конвейер (тег → проверки → dist-zip → Release) и работающая политика версионирования к v1.0.

## Context

Фаза 10. Каркас workflows заведён в T1.5; здесь — боевой режим: полная матрица, релизные smoke (zoom/32px, VI), артефакты, changelog-гейт. Политика зафиксирована ADR-0007 — задачи превращают её в практику.

## Scope

- T12.1: release pipeline (матрица, smoke, zip, GitHub Release, nightly) + включение mandatory visual-гейта перед v1.0 (ADR-0004);
- T12.2: CHANGELOG с первого релиза, N−1, deprecation-цикл, шаблон migration-guide.

## Out of scope

- Публикация в npm/composer (нет по ADR-0006);
- автогенерация changelog из коммитов;
- GitLab-зеркало.

## Expected outcome

Тег `v1.0.0` выпускается одной операцией; артефакт содержит полный dist; changelog ведётся; deprecation-механизм описан и готов к применению.

## Dependencies

- [EPIC-11](../EPIC-11-bitrix-integration/README.md); T3.6/T9.1 (релизные smoke).

## Tasks

- [T12.1 — Release pipeline](T12.1-release-pipeline.md)
- [T12.2 — Версионирование, changelog, deprecation](T12.2-versioning-policy.md)

## Acceptance Criteria

- [ ] Релиз воспроизводим тегом; артефакты скачиваемы и подключаемы по quickstart;
- [ ] Nightly-матрица зелёная 7 дней подряд перед v1.0;
- [ ] CI блокирует релиз без changelog-записи;
- [ ] Mandatory visual-гейт включён перед v1.0 (перевод из advisory — ADR-0004).

## Definition of Done

- [ ] v1.0.0 выпущена; политика опубликована (CONTRIBUTING/README)
- [ ] Релизный чек-лист: матрица, scaling, VI-smoke, changelog, скринридер-протокол (T9.2)

## Risks

- Зелёная nightly «для галочки» → релизный чек-лист требует 7 подряд зелёных дней (AC выше);
- Флейк visual после включения mandatory → все эталоны из контейнера (ADR-0004) + регенерация джобой.

## Notes

Завершающий эпик; v1.0 = Iteration 10.

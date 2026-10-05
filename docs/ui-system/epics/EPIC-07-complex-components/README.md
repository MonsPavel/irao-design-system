# EPIC-7 — Complex Components

## Goal

Оверлейные и усиленные компоненты: modal (по итогам SPIKE о `<dialog>`), кастомный select (listbox поверх нативного), адаптивные таблицы, loader, паттерны поискового оверлея и шапки/подвала.

## Context

Фаза 5 (P1). Источники: `directions.js` career-portal (модалка с фокус-restore и transitionend-закрытием, без trap/семантики — класс B), `dropdowns.js` (зрелый PE-select с привязкой к классу конкретного проекта — класс B с рефакторингом), `search-screen.js` (оверлей поиска без диалоговой семантики — класс B). SPIKE T7.1 предшествует modal.

## Scope

- SPIKE: native `<dialog>` vs собственный оверлей → ADR;
- ui-modal (+focus trap, размеры, анимация);
- IraoUI.select — кастомный listbox поверх нативного select;
- ui-table — паттерны адаптивных таблиц;
- ui-loader + aria-busy-паттерн;
- паттерны search-overlay / header / footer (доки-разметка, не dist-код).

## Out of scope

- Tooltip, carousel, skeleton (P2);
- toast-уведомления (P2);
- PHP-код шапки/подвала (паттерн = разметка для шаблона сайта).

## Expected outcome

Диалоговые сценарии (модалка, поиск) проходят полный диалог-чек-лист (trap/restore/aria); фильтры списков используют IraoUI.select с синхронизацией с нативным select; таблицы не теряют данные на мобиле.

## Dependencies

- [EPIC-6](../EPIC-06-navigation/README.md) (dropdown-логика для select);
- [T1.4 — Харнесс](../EPIC-01-foundation/T1.4-playwright-harness.md) (focus-тесты).

## Tasks

- [T7.1 — SPIKE: native `<dialog>` или собственный оверлей (ADR)](T7.1-spike-native-dialog.md)
- [T7.2 — ui-modal](T7.2-modal.md)
- [T7.3 — IraoUI.select: кастомный select (listbox)](T7.3-custom-select.md)
- [T7.4 — ui-table: адаптивные паттерны таблиц](T7.4-table-patterns.md)
- [T7.5 — ui-loader и aria-busy-паттерн](T7.5-loader.md)
- [T7.6 — Паттерны: search overlay, header, footer](T7.6-overlay-header-footer-patterns.md)

## Acceptance Criteria

- [ ] Все клавиатурные/dialog-чек-листы зелёные (e2e);
- [ ] Деградация без JS определена и протестирована для каждого;
- [ ] ADR SPIKE закрыт; visual-эталоны всех стендов.

## Definition of Done

- [ ] Все 6 задач закрыты; компоненты в dist, паттерны — в showcase
- [ ] Регресс-кейс «повторные циклы модалки не оставляют padding» (из design-qa career-portal) — в e2e

## Risks

- `<dialog>` внутри legacy-страниц Bitrix (z-index-контексты, композит) — предмет SPIKE;
- таблицы на мобиле — выбор паттерна per-кейс (дока-решение).

## Notes

Iterация 7–8; T7.2 и T7.3 — самые тяжёлые.

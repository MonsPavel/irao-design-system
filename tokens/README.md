# tokens/

Дизайн-токены, два слоя: `primitives.css` (слой 1 — палитра, шкалы) и `semantic.css` (слой 2 — смысловые значения `--ui-*`).

- Можно: hex — **только** в `primitives.css`; `semantic.css` — только ссылки на примитивы (ADR-0009).
- Нельзя: селекторы компонентов, `!important`, значения утверждённого дизайна career-portal менять без design-decision владельца.
- Соответствие значений career-portal примитивам (T2.1): [../docs/ui-system/architecture/tokens-career-portal-mapping.md](../docs/ui-system/architecture/tokens-career-portal-mapping.md); исполняемая форма — `tests/unit/tokens-primitives.test.js`.

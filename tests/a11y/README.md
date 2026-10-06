# tests/a11y/

axe-сценарии по стендам `showcase/dist/stands/`. Правило системы: **axe входит
в каждый компонентный тест** — хелпер `a11y(page)` из
`tests/helpers/harness.js`, падение axe валит тест. Отключения правил — только
с обоснованием: `DISABLED_AXE_RULES` в харнессе + таблица
[../README.md](../README.md).

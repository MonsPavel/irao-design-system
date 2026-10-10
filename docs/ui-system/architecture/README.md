# Architecture & Decisions

Файлового дублирования архитектуры здесь нет — единственные источники:

- **Архитектура системы:** [../../02-architecture.md](../../02-architecture.md) (CSS-подход, токены, компоненты, accessibility, Bitrix-интеграция, структура репо, документация, тестирование, CI/CD, версионирование).
- **Аудит референса:** [../../01-audit-career-portal.md](../../01-audit-career-portal.md) + классификация решений A/B/C/D.
- **ADR-журнал:** [../../adr/](../../adr/) — единый журнал репозитория (конвенция: 4-значная нумерация, supersede-паттерн).

## Реестр ADR

| ADR | Решение | Статус |
|---|---|---|
| [ADR-0001](../../adr/0001-focus-visible-specificity.md) | Политика фокуса: селекторы «элемент+псевдокласс» против legacy | принято |
| [ADR-0002](../../adr/0002-component-box-sizing.md) | `box-sizing` на корне каждого компонента | принято |
| [ADR-0003](../../adr/0003-visual-baselines-ci-only.md) | Visual-эталоны только из CI | заменено ADR-0004 |
| [ADR-0004](../../adr/0004-visual-baselines-container.md) | Visual-эталоны: единый контейнер + advisory-гейт до v1.0 | принято |
| [ADR-0005](../../adr/0005-css-architecture.md) | CSS: нативный CSS + custom properties + БЭМ namespace `ui-` | принято |
| [ADR-0006](../../adr/0006-package-delivery.md) | Дистрибуция: копия версионированной папки на сайт | принято |
| [ADR-0007](../../adr/0007-versioning-support.md) | Версионирование: semver, N−1, major в отдельной папке | принято |
| [ADR-0008](../../adr/0008-bitrix-integration.md) | Интеграция с Bitrix: сниппеты, HTML-паттерны, границы | принято |
| [ADR-0009](../../adr/0009-design-tokens.md) | Токены: два слоя + темы только на семантическом слое | принято |
| [ADR-0010](../../adr/0010-derived-color-states.md) | Производные цвета состояний: `color-mix` как стандарт, hover-пары одобренного дизайна — явные токены | принято |
| [ADR-0011](../../adr/0011-modal-native-dialog.md) | ui-modal — основа native `<dialog>` (`showModal()`), собственный оверлей отвергнут | принято (итог SPIKE T7.1) |
| [ADR-0012](../../adr/0012-select-pointer-coarse.md) | ui-select на touch-устройствах остаётся нативным (`pointer: coarse`) | принято |

Новые ADR пишутся в [../../adr/](../../adr/) по мере принятия решений — по
процессу «ADR-процесс» в [CONTRIBUTING](../../../CONTRIBUTING.md) (формат,
нумерация, supersede, когда ADR обязателен); строка в этом реестре — в том же PR.

## Деливераблы-документы задач

Документы-результаты задач (не файлы задач бэклога — потому не в epics/):

- [Таблица соответствия «career-portal значение → примитив»](tokens-career-portal-mapping.md) — T2.1, инструмент контроля отклонений от одобренного дизайна; исполняемая форма — `tests/unit/tokens-primitives.test.js`.
- [«Адаптивный подход» (mobile-first)](responsive-approach.md) — T2.5, шкала брейкпоинтов и правила медиазапросов; единственный источник значений — константа `BREAKPOINTS` в `stylelint.config.mjs`, исполняемая форма — stylelint-гейт + `tests/unit/breakpoints.test.js`.
- [«Focus visible: почему так»](focus-policy.md) — T3.2, политика фокуса по ADR-0001; исполняемая форма — `base/focus.css` + пин списка `tests/unit/focus.test.js` + e2e `tests/e2e/focus.spec.js` (Tab-обход, legacy-атака, смена темы).
- [«Роли типографики»](typography-roles.md) — T3.3, классы ролей `ui-h1…ui-micro` и когда какую использовать (классы-не-теги против legacy); исполняемая форма — `base/typography.css` + пин `tests/unit/typography.test.js` + e2e `tests/e2e/typography.spec.js` (computed-размеры, иерархия всех страниц showcase, 32px) + гейт `irao/heading-order`.

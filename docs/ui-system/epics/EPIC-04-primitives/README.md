# EPIC-4 — Primitive Components

## Goal

P0-компоненты общего назначения, каждый — эталон качества: полный стенд состояний, a11y в AC, keyboard-прогоны, visual-эталоны, дока по единому шаблону.

## Context

Фаза 3 roadmap (после base). Источники — примитивы `components.css` career-portal (класс A/B аудита): btn (4 варианта), tag (5 цветов), card (base/hover/filled), breadcrumbs, а также новые компоненты (link, alert, image-паттерн, empty/error). Кнопка (T4.2) — эталонный компонент, на котором отрабатывается полный жизненный цикл: задача → тесты → реализация → дока → visual-эталоны.

## Scope

- link, button, tag/badge, card, alert, image/figure, breadcrumbs (+schema.org), empty/error-паттерны;
- для каждого: компонентная папка (css/html/README), стенд, e2e+axe, visual-эталоны, дока по шаблону 02-architecture §8.

## Out of scope

- Формы (EPIC-5); навигационные интерактивы (EPIC-6/7);
- контентные секции (hero/production career-portal — класс C, паттерны EPIC-8);
- tooltip (P2).

## Expected outcome

Типовую не-формовую страницу можно собрать целиком из компонентов системы; каждый компонент доступен с клавиатуры, проходит axe во всех состояниях, имеет доку, достаточную для копирования в Bitrix-шаблон.

## Dependencies

- [EPIC-3 — Base & Typography](../EPIC-03-base-typography/README.md) (фокус, типографика, grid);
- [T2.6 — color-mix](../EPIC-02-design-tokens/T2.6-derived-color-states.md) для hover-состояний (к моменту T4.2).

## Tasks

- [T4.1 — ui-link](T4.1-link.md)
- [T4.2 — ui-button (эталонный компонент)](T4.2-button.md)
- [T4.3 — ui-tag / ui-badge](T4.3-tag-and-badge.md)
- [T4.4 — ui-card](T4.4-card.md)
- [T4.5 — ui-alert](T4.5-alert.md)
- [T4.6 — ui-image / ui-figure: паттерн изображений](T4.6-image-and-figure.md)
- [T4.7 — ui-breadcrumbs + schema.org](T4.7-breadcrumbs.md)
- [T4.8 — Empty state / Error state паттерны](T4.8-empty-and-error-states.md)

## Acceptance Criteria

- [ ] Все 8 задач закрыты; компоненты в ui-core.min.css;
- [ ] axe без нарушений на всех стендах во всех состояниях;
- [ ] Клавиатурные прогоны чистые (Tab/Enter/Space там, где применимо);
- [ ] Каждый компонент имеет страницу-доку по шаблону (предварительная версия, финализация T10.1/T10.2).

## Definition of Done

- [ ] AC выше выполнены + общие инварианты (stylelint, box-sizing на корнях, цвета из токенов)
- [ ] Дока кнопки принята как эталон для остальных (T10.1)
- [ ] Стенды всех компонентов в индексе showcase

## Risks

- Разнобой качества между компонентами → общий DoD-чек-лист в CONTRIBUTING (заводится в T4.2);
- hover на touch → все hover-эффекты под `@media (hover: hover)`.

## Notes

Порядок внутри эпика: T4.1 → T4.2 (эталон) → остальные параллельно.

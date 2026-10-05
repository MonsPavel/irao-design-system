# EPIC-6 — Navigation & Interactive

## Goal

Навигационные и лёгкие интерактивные компоненты по WAI-ARIA APG: dropdown, tabs, accordion, pagination — с клавиатурными чек-листами и деградацией без JS.

## Context

Фаза 5 (P1, после MVP-кода). Источники — поведенческие паттерны career-portal: `header.js` (dropdown: вне-клик, Escape с возвратом фокуса, aria-current по URL — класс B), `tracks.js` (табы с aria-selected — класс B), `faq.js`+`.faq` CSS (grid-rows-анимация — класс A-техника), `.pagination` (класс A). Все — с пробелами APG, которые закрываем.

## Scope

- ui-dropdown (навигационное меню и меню действий);
- ui-tabs (roving tabindex, стрелки, Home/End);
- ui-accordion на `<details>/<summary>` с анимацией grid-rows;
- ui-pagination (+PHP-сниппет).

## Out of scope

- Модалки и оверлеи (EPIC-7);
- кастомный select (T7.3 — listbox, отдельный паттерн);
- mega-menu/многоуровневые навигации (по потребности сайтов).

## Expected outcome

Шапка и список страниц строятся из системы; каждый интерактив проходит свой APG-чек-лист; без JS каждый компонент либо полностью работает (accordion), либо деградирует до доступной нативной альтернативы (dropdown — раскрытое меню, tabs — все панели).

## Dependencies

- [EPIC-3](../EPIC-03-base-typography/README.md), [EPIC-4](../EPIC-04-primitives/README.md);
- частично параллелен EPIC-7 (dropdown нужен T7.3).

## Tasks

- [T6.1 — ui-dropdown](T6.1-dropdown.md)
- [T6.2 — ui-tabs](T6.2-tabs.md)
- [T6.3 — ui-pagination](T6.3-pagination.md)
- [T6.4 — ui-accordion](T6.4-accordion.md)

## Acceptance Criteria

- [ ] Клавиатурные чек-листы APG зелёные (e2e) для каждого;
- [ ] Без-JS поведение каждого компонента задокументировано и протестировано;
- [ ] axe чист на всех состояниях (открыто/закрыто/активно).

## Definition of Done

- [ ] Все 4 задачи закрыты; компоненты+модули в dist
- [ ] Доки по шаблону с do/don't
- [ ] reduced-motion уважается во всех анимациях

## Risks

- APG-нюансы (Tab-поведение меню) → сверка с паттернами APG в ревью + протокол T9.2.

## Notes

Iterация 7; первым — T6.1 (нужен T7.3).

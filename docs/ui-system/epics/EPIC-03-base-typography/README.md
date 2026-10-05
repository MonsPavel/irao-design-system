# EPIC-3 — Base & Typography

## Goal

Безопасный глобальный фундамент (шрифты, reset, политика фокуса, skip-link) и типографика/layout-примитивы в rem, отвечающие требованию «не ломается при увеличении шрифта».

## Context

Фаза 3 roadmap. Источник — `css/base.css` career-portal (класс A аудита): @font-face Golos с unicode-range, `[hidden] !important`, scrollbar-gutter, reduced-motion kill-switch. Ключевые изменения против референса: глобальная политика `:focus-visible` (ADR-0001 — её в career-portal нет), box-sizing-дисциплина (ADR-0002), типографика rem, mobile-first-контейнеры.

## Scope

- fonts (Golos 400/500/600 cyr/lat + лицензия) и reset;
- политика фокуса с защитой от legacy `a { outline: none }`;
- классы типографики ui-h1…ui-micro, текстовые утилиты, списки;
- container / section / grid (mobile-first);
- ui-skip-link;
- zoom/32px-сценарии как релизный гейт.

## Out of scope

- Компоненты (EPIC-4+);
- VI-модуль (EPIC-9, но T9.1 может стартовать после T3.1);
- контентная типографика статей (паттерны EPIC-8).

## Expected outcome

Страница, собранная только из tokens+base, выглядит системой, проходит axe и не разваливается при 200% zoom / 32px базы; фокус виден даже при инжекте legacy-CSS.

## Dependencies

- [EPIC-2 — Design Tokens](../EPIC-02-design-tokens/README.md) (токены, брейкпоинт-гейт).

## Tasks

- [T3.1 — Шрифты Golos и reset (порт)](T3.1-fonts-and-reset.md)
- [T3.2 — Политика фокуса (ADR-0001)](T3.2-focus-policy.md)
- [T3.3 — Типографика: классы ui-h1…ui-micro](T3.3-typography-classes.md)
- [T3.4 — Container / Section / Grid (mobile-first)](T3.4-container-section-grid.md)
- [T3.5 — ui-skip-link](T3.5-skip-link.md)
- [T3.6 — Сценарии масштабирования шрифта и zoom](T3.6-font-scaling-tests.md)

## Acceptance Criteria

- [ ] e2e: woff2 отдаются, `document.fonts.check` true для cyr/lat; фолбэк-сценарий (шрифт недоступен) читаем;
- [ ] e2e «legacy-атака»: после ui-core инжект `a { outline: none }` — фокус всё ещё виден;
- [ ] zoom 200% и html 32px: нет горизонтального скролла и перекрытий (T3.6, nightly/release);
- [ ] первый Tab на любом стенде — skip-link.

## Definition of Done

- [ ] Все 6 задач закрыты, AC выполнены
- [ ] base входит в ui-core сразу после tokens; «что base делает глобально» описано в доке (ADR-0008, констрейнт №7)
- [ ] Zoom/32px-гейты включены в nightly + release

## Risks

- Глобальный base конфликтует с сайтом → base минимален, компоненты самодостаточны (ADR-0002), глобалы перечислены в доке;
- Лицензия Golos → проверка OFL и приложение текста лицензии в dist (T3.1).

## Notes

T9.1 (VI-модуль) может стартовать сразу после T3.1 — не ждать закрытия эпика.

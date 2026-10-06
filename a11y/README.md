# a11y/

Модули доступности: `vi.css` / `vi.js` / `vi-panel.html` (ГОСТ Р 52872, портируется из career-portal) и другие. Skip-link — не здесь, а компонент [`components/ui-skip-link/`](../components/ui-skip-link/README.md) (T3.5).

- Можно: `!important` — **только** в `vi.css`; JS — по шаблону `docs/templates/module-template.js` (readyState-guard обязателен).
- Нельзя: a11y-логику внутри компонентов, дублирование политики фокуса вне ADR-0001.

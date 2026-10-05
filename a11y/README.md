# a11y/

Модули доступности: `vi.css` / `vi.js` / `vi-panel.html` (ГОСТ Р 52872, портируется из career-portal), `skip-link/` и другие.

- Можно: `!important` — **только** в `vi.css`; JS — по шаблону `docs/templates/module-template.js` (readyState-guard обязателен).
- Нельзя: a11y-логику внутри компонентов, дублирование политики фокуса вне ADR-0001.

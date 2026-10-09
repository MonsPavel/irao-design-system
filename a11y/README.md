# a11y/

Модули доступности: VI-модуль ГОСТ Р 52872 (T9.1, порт career-portal завершён) и другие.
Skip-link — не здесь, а компонент [`components/ui-skip-link/`](../components/ui-skip-link/README.md) (T3.5).

- [`vi.css`](vi.css) — панель (`ui-vi-*`, токены `--ui-*`) и режимы (классы на `<body>` «как
  есть» career-portal); `!important` — **только** здесь (перекраска ГОСТ обязана побеждать
  всё); гарантированные пары тем — константы `--ui-vi-theme-*` в `:root` (единственный
  осознанный hex вне `tokens/primitives.css`, машин-контроль — `tests/unit/vi.test.js`);
  собирается отдельным `dist/ui-vi.min.css` (подключается последним, сниппет — T11.1).
- [`vi.js`](vi.js) — модуль `window.IraoUI.vi` (шаблон `docs/templates/module-template.js`:
  readyState-guard обязателен); ключ localStorage `irao-ui-vi`; хуки `data-ui-vi-*`.
- Панель как компонент — [`components/ui-vi/`](../components/ui-vi/README.md): канонический
  паттерн `ui-vi.html`, API, **breaking-изменения против career-portal** и **чек-лист
  проверки страниц сайта в VI**.
- Нельзя: a11y-логику внутри компонентов, дублирование политики фокуса вне ADR-0001.

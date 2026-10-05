# components/

Компоненты UI-системы. Одна папка = один компонент (паттерн career-portal).

```
components/ui-<name>/
├── ui-<name>.css    # стили: БЭМ ui-, только --ui-токены, box-sizing на корне (ADR-0002)
├── ui-<name>.html   # канонический HTML-паттерн — источник доки и тестов
├── ui-<name>.js     # опционально; копия docs/templates/module-template.js
└── README.md        # API, состояния, a11y, do/don't, миграции
```

- Можно: добавлять компоненты по процедуре из CONTRIBUTING («Как добавить компонент»).
- Нельзя: зависимости между компонентами, production-код вне папки компонента, hex и `!important`.

# SPIKE T7.1 — песочница «native `<dialog>` или собственный оверлей»

Временная песочница (не dist, не компонент): два мини-прототипа и зонд техники
для решения об основе ui-modal. **Выбрасывается после решения** — доказательства
живут в ADR (docs/adr/), файлы восстанавливаются из истории git.

Спека: docs/ui-system/epics/EPIC-07-complex-components/T7.1-spike-native-dialog.md.

## Файлы

| Файл | Что это |
|---|---|
| `probe.html` | зонд техники: pure-CSS анимация dialog (@starting-style/allow-discrete), `dialog:modal`, токены в `::backdrop`, PE-деградация |
| `native.html` | прототип 1: native `<dialog>` + `showModal()` |
| `custom.html` | прототип 2: собственный оверлей (старт от career-portal `directions.js`: div + классы + transitionend) |
| `legacy.html` | оба прототипа внутри агрессивного legacy-CSS (Bitrix-условия) |
| `spike-native.js` / `spike-custom.js` | JS прототипов (IIFE, без window.IraoUI — это не компонент) |

Страницы подключают реальный поставочный бандл `../../dist/ui-core.min.css`
(`npm run build` перед прогоном) и открываются напрямую (`npm run serve`):
`/showcase/spike-dialog/<имя>.html`. Сценарии прогонов —
`tests/e2e/spike-dialog.spec.js` (тоже временный, выбрасывается).

## Критерии сравнения — зафиксированы ДО прогонов

Из спеки T7.1 (Scope «критерии сравнения», Technical considerations,
Accessibility requirements). Решение принимается по этой таблице, а не по
впечатлениям от прототипов.

| # | Критерий | Метод измерения |
|---|---|---|
| К1 | Focus trap (Tab/Shift+Tab не выходят) | e2e: Tab-цикл внутри открытого диалога (обе версии) |
| К2 | Escape закрывает верхний диалог | e2e: Esc на открытом; вложенность — см. К7 |
| К3 | Restore фокуса на опенер | e2e: фокус после закрытия (native — браузерный restore, custom — JS) |
| К4 | Top-layer против z-index-контекстов | legacy-стенд: elementFromPoint поверх плашки `z-index: 2147483647`; панель изнутри `transform`-обёртки — центр вьюпорта; клик по фону не доходит до legacy-элементов |
| К5 | Анимация open/close + reduced-motion | rAF-сэмплы (паттерн T6.4): открытие ≥3 промежуточных кадров, reduced-motion ≤2; закрытие — плавность на всей матрице |
| К6 | Стилизация backdrop токенами + VI-перекраска | computed background `::backdrop` = `var(--ui-color-overlay)`; перекраска оверрайдом токена на корне (имитация VI-режима) |
| К7 | Вложенность | два диалога одновременно; Esc закрывает только верхний, первый остаётся |
| К8 | Объём JS на чек-лист parity | строки JS-кода прототипов (одинаковый чек-лист К1–К3, К10, К12) |
| К9 | Деградация без JS | javaScriptEnabled:false: контент модалки доступен инлайн (PE-разметка) |
| К10 | Скролл-лок без сдвига макета (scrollbar-gutter) | ширина fixed-шапки до/во время лока (регресс-кейс career-portal); `scrollbar-gutter: stable` как замена JS-компенсации |
| К11 | Формы method="dialog" | submit → закрытие, returnValue, без навигации (native нативно; custom — вручную) |
| К12 | aria-modal / инертность фона | клик по фону не доходит; Tab не выходит; native — браузерный блокинг top-layer, custom — `inert` на фоне (JS) |

Прогоны: матрица Playwright chromium/firefox/webkit (`npx playwright test
tests/e2e/spike-dialog.spec.js` — все проекты) на чистых страницах и
legacy-стенде. Итоги — в ADR-0011.

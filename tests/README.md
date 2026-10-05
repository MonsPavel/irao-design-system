# tests/

Тесты UI-системы. Всё крутится вокруг сгенерированного полигона
`showcase/dist/` (единый источник правды — те же страницы читают
интеграторы, 02-architecture §7): e2e-сценарии, axe-гейт и скриншот-эталоны
проверяют фактический вывод системы, а не её исходники.

- `e2e/` — Playwright-сценарии поведения компонентов;
- `a11y/` — axe-сценарии (правило харнесса: axe входит в каждый компонентный тест);
- `visual/` — скриншот-эталоны `__screenshots__/` (коммитятся; создаются
  только в контейнере/CI — ADR-0004);
- `helpers/harness.js` — харнесс: фикстура `stand()`, хелперы `a11y()`, `shot()`;
- `lint-cases/` — негативные фикстуры линтеров (не Playwright), см.
  `tools/run-lint-cases.mjs`.

## Как запускать

| Команда | Что делает | Эталоны |
|---|---|---|
| `npm test` | сборка полигона + прогон PR-проекта **chromium** (e2e + axe) | не пишут и не сравниваются |
| `npm run test:matrix` | сборка + все проекты (chromium/firefox/webkit) — матрица nightly/release | не пишут |
| `npm run test:docker` | тот же прогон **в официальном контейнере** `mcr.microsoft.com/playwright:vX-jammy` (docker или podman; на Windows — WSL2) | **создаются/проверяются** |
| `npm run test:docker -- --update-snapshots` | перегенерация эталонов в контейнере | пишутся |
| `npm run test:lint` | прогон негативных lint-фикстур (T1.2) | — |

Перед матрицей браузеры ставятся локально: `npx playwright install firefox webkit`
(chromium ставится так же, при первом локальном прогоне).

**Правило эталонов (ADR-0004):** растеризация шрифтов зависит от ОС, поэтому
эталоны создаются **только** из контейнера (`test:docker`) или CI-джобы
`update-snapshots` (fallback для машин без контейнера, T1.5). Локальный
хост-прогон эталонов не пишет: хелпер `shot()` вне контейнера — no-op с
аннотацией `shot-skipped`. Образ пиннится рядом с версией Playwright
(`package.json` → `iraoUi.playwrightImage`); смена версии Playwright = смена
образа = перегенерация всех эталонов (upgrade-чек-лист).

## Как писать тесты компонента

Тесты компонента живут в `tests/e2e/ui-<name>.spec.js` (axe-сценарии —
внутри же: axe входит в каждый компонентный тест). Шаблон: **состояния →
e2e-сценарии → axe → скриншоты**.

1. Расширенный стенд `showcase/pages/<name>/index.html` содержит все
   варианты и состояния компонента (если стенда ещё нет — базовый
   генерируется из канонического паттерна).
2. Сценарии поведения — по состояниям стенда: клик, клавиатура (фокус,
   Escape/стрелки по APG), деградация без JS.
3. axe — обязательно, на весь стенд; падение axe валит тест.
4. Скриншоты — все три вьюпорта шкалы `shot()` (375/768/1440).

```js
// tests/e2e/ui-button.spec.js
import { expect } from '@playwright/test';

import { a11y, shot, test, VIEWPORTS } from '../helpers/harness.js';

test.describe('ui-button', () => {
  test('поведение: клик и фокус с клавиатуры', async ({ stand }) => {
    const page = await stand('ui-button'); // /showcase/dist/stands/ui-button.html, networkidle

    const primary = page.getByRole('button', { name: 'Отправить' });
    await primary.click();
    await expect(primary).toBeFocused();

    await page.keyboard.tab(); // фокус переходит по DOM — без мыши
  });

  test('axe чист на всех состояниях', async ({ stand }) => {
    const page = await stand('ui-button');
    const results = await a11y(page).analyze();
    expect(results.violations).toEqual([]);
  });

  test('эталоны 375/768/1440', async ({ stand }) => {
    const page = await stand('ui-button');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-button', viewport });
    }
  });
});
```

Хелперы харнесса (`tests/helpers/harness.js`):

- `stand(name)` — фикстура: открывает `/showcase/dist/stands/<name>.html`
  и ждёт `networkidle`. Прямые URL не строить — только через фикстуру/хелперы
  (`openIndex`, `openStand`).
- `a11y(page)` — `AxeBuilder` со списком отключённых правил (см. ниже);
  возвращает builder — можно сузить `.include(locator)`, затем `.analyze()`.
- `shot(page, { name, viewport })` — эталон `name--<viewport>.png` в
  `tests/visual/__screenshots__/<spec>/` (name — ASCII `[a-z0-9-]`, по
  умолчанию slug заголовка теста). fullPage; часы страницы остановлены
  (`FIXED_TIME`, `page.clock`) — даты детерминированы; анимации/переходы и
  каретка выключены.

**Динамический контент в скриншотах** (таймеры, счётчики, случайные значения):
помечайте корень такой зоны атрибутом `data-ui-shot-mask` в разметке стенда —
`shot()` добавит её в `mask` toHaveScreenshot. Если динамику можно
детерминировать — детерминируйте (фиксированные данные на стенде), маска —
второй рубеж.

## Отключённые axe-правила

Список живёт в `DISABLED_AXE_RULES` (`tests/helpers/harness.js`):
ключ — id правила axe-core, значение — обоснование. **Каждое отключение
обязано иметь обоснование** — правило либо фиксируем как реальный дефект
стенда, либо отключаем с записью сюда.

| Правило | Обоснование |
|---|---|
| — (пусто) | На текущем полигоне (индекс showcase) axe чист полностью: отключать нечего. Таблица и механизм — часть контракта харнесса для стендов EPIC-2+ |

## Нельзя

- Тесты, не привязанные к каноническому HTML компонента (стендам).
- Править эталоны вручную / создавать их хост-прогоном — только
  `test:docker` / CI-джоба (ADR-0004). Эталон — визуальная копия
  одобренного дизайна career-portal: при расхождении рендера с одобренным
  визуалом вопрос идёт дизайнеру, а не «правится на вкус» в эталоне.
- Отключать axe-правила без обоснования в `DISABLED_AXE_RULES` и таблицы выше.

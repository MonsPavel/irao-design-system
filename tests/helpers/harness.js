/**
 * Харнесс irao-ui (задача T1.4): фикстура `stand()`, axe-хелпер `a11y()`,
 * скриншот-хелпер `shot()`. Шаблон компонентного теста — tests/README.md.
 *
 * Правила харнесса:
 *  - страницы тестов — только сгенерированный полигон `showcase/dist/`
 *    (единый источник правды, 02-architecture §9); `npm test` собирает его
 *    перед прогоном;
 *  - время страниц остановлено (FIXED_TIME): даты и таймеры в скриншотах
 *    детерминированы (page.clock);
 *  - скриншот-эталоны создаются ТОЛЬКО в контейнере/CI (ADR-0004): на хосте
 *    `shot()` — no-op с аннотацией, локальные прогоны эталоны не пишут и
 *    не сравнивают (растеризация шрифтов ОС различается).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test as base } from '@playwright/test';

/** Эталонное время страниц: «сегодня» всегда одинаковое (маскировка дат). */
export const FIXED_TIME = new Date('2026-01-01T12:00:00Z');

/**
 * Шкала вьюпортов скриншотов (T1.4: 375/768/1440; T3.4 добавил xl 1280 —
 * брейкпоинт шкалы T2.5, различающий ступени 3/4 колонок сетки --4).
 * Высоты условные: скриншоты снимаются fullPage, важна ширина
 * медиа-вычислений.
 */
export const VIEWPORTS = Object.freeze({
  mobile: Object.freeze({ width: 375, height: 667 }),
  tablet: Object.freeze({ width: 768, height: 1024 }),
  xl: Object.freeze({ width: 1280, height: 800 }),
  desktop: Object.freeze({ width: 1440, height: 900 }),
});

/**
 * Отключённые axe-правила и обоснования каждого. Валидатор: значение —
 * человеческое обоснование, ключ — id правила axe-core. Расширять список
 * можно только записью сюда + в таблицу tests/README.md.
 */
export const DISABLED_AXE_RULES = Object.freeze({});

/**
 * Осознанные исключения axe ДЛЯ СКВОЗНЫХ ПРОГОНОВ (T9.2): id правила +
 * подстрока-регэксп цели узла + обоснование. Пустое DISABLED_AXE_RULES
 * выключает правила глобально — слишком грубо; реестр точечный: нарушение
 * остаётся в результатах axe, фильтр допускает только узлы, попавшие в
 * запись. Потребители: компонентные спеки (например, ui-button) и
 * сквозной обход tests/a11y/stands-sweep.spec.js (AC T9.2 «axe=0» —
 * ноль нарушений ВНЕ реестра). Расширять — только записью сюда + в
 * таблицу tests/README.md, каждое исключение — фикс-задача или
 * design-decision/ADR-исключение (Implementation requirements T9.2 п.2).
 */
export const KNOWN_AXE_EXCEPTIONS = Object.freeze([
  {
    id: 'color-contrast',
    match: /#ui-button-accent/,
    reason:
      'белая подпись на accent — одобренный дизайн 3.12:1 (2.91:1 на hover): ' +
      'изменение — design-decision владельца; исключение токен-уровня — ' +
      'tests/contrast/pairs.config.mjs (T2.6/ADR-0010), ревизия производных — ' +
      'tests/contrast/derived.config.mjs (T9.2)',
  },
  {
    id: 'color-contrast',
    match: /#ui-button-[a-z-]*-disabled/,
    reason:
      'контраст disabled — декоративный (AC T4.2): WCAG 1.4.3 исключает ' +
      'неактивные компоненты; визуал — затемнение --ui-opacity-disabled',
  },
  {
    id: 'color-contrast',
    match: /#ui-button-[a-z-]*-loading/,
    reason:
      'лейбл в is-loading визуально скрыт (clip-path, accessible name ' +
      'сохраняется — Implementation requirements T4.2 п.3): axe видит бокс ' +
      'текста без краски; спиннер aria-hidden',
  },
]);

/**
 * Нарушения axe ВНЕ реестра KNOWN_AXE_EXCEPTIONS: список строк
 * «id → цель» (пустой = чисто). Исключение считается, если id правила
 * совпал и цель узла отвечает match-регэкспу записи.
 */
export function unexpectedViolations(results) {
  const unexpected = [];
  for (const violation of results.violations) {
    for (const node of violation.nodes) {
      const target = node.target.join(' ');
      const known = KNOWN_AXE_EXCEPTIONS.some(
        (exception) => exception.id === violation.id && exception.match.test(target),
      );
      if (!known) unexpected.push(`${violation.id} → ${target}`);
    }
  }
  return unexpected;
}

/**
 * Эталоны пишутся только в окружении создания (ADR-0004): явный opt-in
 * `IRAO_SNAPSHOTS=1`, который выставляет `npm run test:docker` (официальный
 * Playwright-образ) и джоба update-snapshots (T1.5). Хост-прогоны не пишут.
 */
export const SNAPSHOTS_ENABLED = process.env.IRAO_SNAPSHOTS === '1';

/**
 * Фикстура `stand(name)`: открыть стенд компонента
 * `/showcase/dist/stands/<name>.html` и дождаться networkidle.
 * Возвращает ту же `page` (для a11y()/shot()).
 */
export const test = base.extend({
  stand: async ({ page }, use) => {
    await use((name) => openStand(page, name));
  },
});

/** Остановить часы страницы на FIXED_TIME — до первой навигации. */
export async function freezeClock(page) {
  await page.clock.setFixedTime(FIXED_TIME);
}

/**
 * Фикстура `stand(name)` (см. test.extend): открыть стенд, networkidle.
 * Имя валидируется — из него строится URL. Имя может быть вложенным
 * («integration/form-full-cycle», T5.6) — сегменты без путей и прочего
 * мусора: из имени строится URL запроса.
 */
export async function openStand(page, name) {
  if (!/^[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)*$/.test(name)) {
    throw new Error(`openStand: некорректное имя стенда «${name}»`);
  }
  await freezeClock(page);
  await page.goto(`/showcase/dist/stands/${name}.html`);
  await page.waitForLoadState('networkidle');
  return page;
}

/** Открыть индекс showcase (`/`) — точка входа полигона. */
export async function openIndex(page) {
  await freezeClock(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  return page;
}

/**
 * axe-анализ страницы: AxeBuilder со списком отключённых нерелевантных
 * правил (DISABLED_AXE_RULES, обоснования — там же и в tests/README.md).
 * Возвращает builder — можно донастроить `.include(locator)`, потом `.analyze()`.
 */
export function a11y(page) {
  return new AxeBuilder({ page }).disableRules(Object.keys(DISABLED_AXE_RULES));
}

/** CSS-заморозка живости перед снимком (страховка к animations: 'disabled'). */
const SHOT_FREEZE_CSS = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }
`;

/**
 * Скриншот-хелпер (T1.4; xl — T3.4): вьюпорт из шкалы VIEWPORTS (375/768/1280/1440),
 * fullPage, маскировка таймеров/дат:
 *  - часы остановлены (freezeClock в openIndex/openStand);
 *  - динамические зоны стендов помечайте `data-ui-shot-mask` — попадут в mask;
 *  - анимации/переходы/каретка выключены.
 *
 * Имя эталона — `<name>--<viewport>.png` (name из аргументов, иначе — slug
 * заголовка теста); файл кладётся в tests/visual/__screenshots__/<spec>/
 * (snapshotPathTemplate в playwright.config.mjs). Явное имя суффиксов
 * браузера не получает, поэтому эталоны пишет **только chromium-проект** —
 * единое окружение эталонов (ADR-0004): firefox/webkit из матрицы идут
 * мимо скриншотов (поведение проверяют, визуал — chromium).
 *
 * Вне окружения создания эталонов (SNAPSHOTS_ENABLED) — no-op с аннотацией.
 */
export async function shot(page, { name, viewport = 'desktop' } = {}) {
  const size = VIEWPORTS[viewport];
  if (!size) {
    throw new Error(
      `shot: неизвестный вьюпорт «${viewport}» — шкала: ${Object.keys(VIEWPORTS).join(', ')}`,
    );
  }
  const info = base.info();
  if (!SNAPSHOTS_ENABLED || info.project.name !== 'chromium') {
    info.annotations.push({
      type: 'shot-skipped',
      description:
        `${viewport}: эталоны создаются только из контейнера/CI в chromium-проекте ` +
        '(ADR-0004) — запустите npm run test:docker',
    });
    return;
  }
  await page.setViewportSize(size);
  await page.addStyleTag({ content: SHOT_FREEZE_CSS });
  await expect(page).toHaveScreenshot(shotName(info, name, viewport), {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    mask: await page.locator('[data-ui-shot-mask]').all(),
  });
}

/** Стабильное ASCII-имя эталона: name или slug заголовка теста + вьюпорт. */
function shotName(info, name, viewport) {
  const slug =
    name ??
    info.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    throw new Error(`shot: имя эталона «${slug}» должно быть ASCII [a-z0-9-]`);
  }
  return `${slug}--${viewport}.png`;
}

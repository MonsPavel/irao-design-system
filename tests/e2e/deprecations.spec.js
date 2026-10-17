/**
 * E2E механизма deprecation (T12.2; ADR-0007, 02-architecture §11).
 *
 * Проверяет фактические сборки полигона:
 *  - прод ui.min.js МОЛЧИТ: window.IraoUI.dev не регистрируется;
 *  - dev-сборка dist/ui.dev.js (не минифицирована, тот же набор модулей +
 *    base/deprecations.js) печатает console.warn при использовании
 *    deprecated-класса — «механизм должен существовать до первого deprecated»;
 *  - класс-алиас (демо-кейс AC): дублирование правил канонического блока —
 *    «@extend-эквивалент» на нативном CSS (Technical considerations T12.2) —
 *    даёт элементу те же computed-стили до удаления имени в major.
 *
 * Демо-алиас живёт только внутри теста (addStyleTag + запись реестра через
 * публичный window.IraoUI.dev.deprecations): dist не несёт фейковых
 * deprecated-имён. Относительный путь ../ui.dev.js — глубина каркаса
 * frame() (рантайм на уровень выше стендов/док), та же схема, что у
 * подключаемого каркасом ui.min.js.
 */
import { expect } from '@playwright/test';

import { test } from '../helpers/harness.js';

/** Демо-запись реестра (формат — base/deprecations.js). */
const DEMO = {
  name: 'ui-deprecation-demo--old',
  since: '0.2.0',
  useInstead: 'ui-deprecation-demo--new',
};

/** Имя для сценария динамического появления (не пересекается с DEMO). */
const DEMO_LATE = {
  name: 'ui-deprecation-demo--late',
  since: '0.2.0',
  useInstead: 'ui-deprecation-demo--new',
};

/**
 * Демо-алиас: канонический блок + дублирование правил с комментарием
 * «deprecated since …» — образец из Technical considerations T12.2.
 * Значения — токены слоя 2 (гейты каскада действуют и на демо-разметку).
 */
const DEMO_ALIAS_CSS = `
  .ui-deprecation-demo--new {
    background-color: var(--ui-color-primary);
    border-radius: var(--ui-radius-md);
  }
  /* deprecated since 0.2.0 — алиас .ui-deprecation-demo--new, удалить в следующей major */
  .ui-deprecation-demo--old {
    background-color: var(--ui-color-primary);
    border-radius: var(--ui-radius-md);
  }
`;

/** Перехват console.warn страницы (сообщения типа 'warning'). */
function captureWarnings(page) {
  const warnings = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
  });
  return warnings;
}

test.describe('механизм deprecation (T12.2)', () => {
  test('прод-сборка молчит: ui.min.js не регистрирует window.IraoUI.dev', async ({ stand }) => {
    const page = await stand('ui-button');

    expect(await page.locator('script[src$="ui.min.js"]').count()).toBe(1);
    expect(await page.evaluate(() => Boolean(window.IraoUI && window.IraoUI.dev))).toBe(false);
  });

  test('dev-сборка регистрирует window.IraoUI.dev: пустой реестр + scan (механизм до первого deprecated)', async ({
    stand,
  }) => {
    const page = await stand('ui-button');
    await page.addScriptTag({ url: '../ui.dev.js' });

    const shape = await page.evaluate(() => ({
      hasDev: Boolean(window.IraoUI && window.IraoUI.dev),
      registry: window.IraoUI.dev ? window.IraoUI.dev.deprecations : null,
      scanType: window.IraoUI.dev ? typeof window.IraoUI.dev.scan : null,
    }));
    expect(shape.hasDev).toBe(true);
    expect(Array.isArray(shape.registry)).toBe(true);
    expect(shape.registry).toHaveLength(0);
    expect(shape.scanType).toBe('function');

    // Скан на чистой странице тих: предупреждений нет, имя не возвращено.
    expect(await page.evaluate(() => window.IraoUI.dev.scan(document))).toEqual([]);
  });

  test('демо-кейс AC: класс-алиас работает (computed = каноническому) + warning в dev-сборке', async ({
    stand,
  }) => {
    const page = await stand('ui-button');
    const warnings = captureWarnings(page);
    await page.addScriptTag({ url: '../ui.dev.js' });
    // Демо-алиас: дублирование правил канонического блока (нативный CSS).
    await page.addStyleTag({ content: DEMO_ALIAS_CSS });

    // Вставка разметки, запись реестра и скан — ОДНА синхронная задача:
    // MutationObserver доставит колбэк только после неё, поэтому здесь
    // предупреждение отправляет именно ручной scan() (детерминизм).
    const result = await page.evaluate((entry) => {
      const make = (id, className) => {
        const el = document.createElement('div');
        el.id = id;
        el.className = className;
        el.textContent = 'демо deprecation';
        document.body.appendChild(el);
        return el;
      };
      make('ui-demo-canonical', 'ui-deprecation-demo--new');
      make('ui-demo-alias', 'ui-deprecation-demo--old');
      window.IraoUI.dev.deprecations.push(entry);

      const fired = window.IraoUI.dev.scan(document);
      const pick = (id) => {
        const cs = getComputedStyle(document.getElementById(id));
        return { backgroundColor: cs.backgroundColor, borderRadius: cs.borderRadius };
      };
      return { fired, canonical: pick('ui-demo-canonical'), alias: pick('ui-demo-alias') };
    }, DEMO);

    // Предупреждение: имя, версия «since» и замена в одном сообщении.
    expect(result.fired).toEqual([DEMO.name]);
    const text = warnings.find((message) => message.includes(DEMO.name));
    expect(text, 'console.warn с именем и заменой').toBeTruthy();
    expect(text).toContain(DEMO.since);
    expect(text).toContain(DEMO.useInstead);

    // Алиас работает: стили алиаса = каноническому блоку (дублирование правил),
    // и это НЕ пустое совпадение дефолтов — заливка токеном реально применилась.
    expect(result.alias).toEqual(result.canonical);
    expect(result.alias.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('MutationObserver: динамическое появление deprecated-класса предупреждает без ручного скана', async ({
    stand,
  }) => {
    const page = await stand('ui-button');
    const warnings = captureWarnings(page);
    await page.addScriptTag({ url: '../ui.dev.js' });

    await page.evaluate((entry) => {
      window.IraoUI.dev.deprecations.push(entry);
      const el = document.createElement('div');
      el.className = entry.name;
      document.body.appendChild(el);
    }, DEMO_LATE);

    await expect
      .poll(() => warnings.some((message) => message.includes(DEMO_LATE.name)), {
        message: 'console.warn о динамически добавленном deprecated-классе',
      })
      .toBe(true);
  });

  test('warn-once в браузере: повторный скан не дублирует предупреждение', async ({ stand }) => {
    const page = await stand('ui-button');
    const warnings = captureWarnings(page);
    await page.addScriptTag({ url: '../ui.dev.js' });

    const first = await page.evaluate((entry) => {
      window.IraoUI.dev.deprecations.push(entry);
      const el = document.createElement('div');
      el.className = entry.name;
      document.body.appendChild(el);
      return window.IraoUI.dev.scan(document);
    }, DEMO);
    expect(first).toEqual([DEMO.name]);

    const second = await page.evaluate(() => window.IraoUI.dev.scan(document));
    expect(second).toEqual([]);
    expect(warnings.filter((message) => message.includes(DEMO.name))).toHaveLength(1);
  });
});

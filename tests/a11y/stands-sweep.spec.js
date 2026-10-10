/**
 * Сквозной axe-обход ВСЕХ страниц полигона (задача T9.2, AC «axe=0 по всем
 * страницам»). Компонентные спеки гоняют axe на своём стенде (правило
 * харнесса, tests/README.md), но полный охват гарантирует только обход по
 * списку стендов (helpers/stands.js): новая страница полигона попадает в
 * прогон автоматически — появление стенда без axe-покрытия невозможно.
 *
 * Допуск нарушений — ТОЛЬКО через реестр KNOWN_AXE_EXCEPTIONS харнесса
 * (id правила + регэксп узла + обоснование; таблица tests/README.md):
 * «axe=0» здесь означает ноль нарушений ВНЕ реестра. Правила целиком не
 * отключаются (DISABLED_AXE_RULES пуст).
 *
 * Включает индекс showcase (точка входа) и все 40+ стендов (компоненты,
 * паттерны, интеграция, сгенерированный tokens). VI-режим по страницам —
 * отдельные axe-сценарии ui-vi.spec.js (стенд ui-vi: обычный и VI-режим).
 */
import { expect } from '@playwright/test';

import { a11y, openIndex, test, unexpectedViolations } from '../helpers/harness.js';
import { listStands } from '../helpers/stands.js';

test.describe('axe-обход всех страниц полигона (T9.2)', () => {
  test('индекс showcase чист', async ({ page }) => {
    await openIndex(page);
    const results = await a11y(page).analyze();
    expect(results.violations).toEqual([]);
  });

  for (const standName of listStands()) {
    test(`${standName}: axe чист`, async ({ stand }) => {
      const page = await stand(standName);
      const results = await a11y(page).analyze();
      expect(
        unexpectedViolations(results),
        `${standName}: нарушения axe вне реестра KNOWN_AXE_EXCEPTIONS`,
      ).toEqual([]);
    });
  }
});

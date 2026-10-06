/**
 * Первый сквозной тест харнесса (T1.4, AC): индекс showcase открывается,
 * axe чист (падение axe валит тест), эталоны сняты на шкале VIEWPORTS (375/768/1280/1440; xl — T3.4).
 */
import { expect, test } from '@playwright/test';

import { a11y, openIndex, shot, VIEWPORTS } from '../helpers/harness.js';

test('индекс showcase открывается, axe чист, эталон снят', async ({ page }) => {
  await openIndex(page);
  await expect(page).toHaveTitle(/irao-ui showcase/);

  const results = await a11y(page).analyze();
  expect(results.violations).toEqual([]);

  for (const viewport of Object.keys(VIEWPORTS)) {
    await shot(page, { name: 'showcase-index', viewport });
  }
});

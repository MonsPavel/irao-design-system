/**
 * Первый сквозной тест харнесса (T1.4, AC): индекс showcase открывается,
 * axe чист (падение axe валит тест), эталоны сняты на 375/768/1440.
 */
import { expect, test } from '@playwright/test';

import { a11y, openIndex, shot, VIEWPORTS } from '../helpers/harness.js';

test('индекс showcase открывается, axe чист, эталон снят', async ({ page }) => {
  await openIndex(page);
  await expect(page).toHaveTitle(/irao-ui showcase/);

  const violations = await a11y(page).analyze();
  expect(violations).toEqual([]);

  for (const viewport of Object.keys(VIEWPORTS)) {
    await shot(page, { name: 'showcase-index', viewport });
  }
});

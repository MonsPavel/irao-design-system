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

test('индекс без горизонтального переполнения на шкале вьюпортов (гейт hscroll)', async ({
  page,
}) => {
  // Приёмка T17.8: литеральная markdown-ссылка в описании карточки каталога
  // (README ui-tabs, «[APG tabs](https://…/tabs/)») не переносится и на
  // мобильном даёт scrollWidth 381 при вьюпорте 375 — эталоны такое маскируют
  // (fullPage-скриншот запекает ширину контента). Гейт по паттерну
  // pattern-detail-page.spec.js:75 — на всей шкале вьюпортов эталонов.
  for (const viewport of Object.keys(VIEWPORTS)) {
    await openIndex(page);
    await page.setViewportSize(VIEWPORTS[viewport]);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(
      scrollWidth,
      `${viewport}: индекс без горизонтального скролла (${scrollWidth} ≤ ${clientWidth})`,
    ).toBeLessThanOrEqual(clientWidth);
  }
});

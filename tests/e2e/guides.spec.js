/**
 * E2E гайдов внедрения T10.3 (showcase/dist/docs/<имя>.html).
 *
 * Уровни проверки трёх документов (quickstart, integration-guide,
 * «Bitrix-разработчику за 30 минут»):
 *  - unit (tests/unit/guides.test.js) — living-источники bitrix/*.md,
 *    синхронизация embed-блоков «сниппет = файл bitrix/», полнота
 *    покрытия сниппетов;
 *  - сборка (selfChecks showcase/build.mjs) — синхрон на билде «диф на
 *    билде», битые ссылки полигона, публикация страниц;
 *  - здесь — живой DOM: каркас и рантайм резолвятся без 404, заголовок
 *    страницы соответствует реестру, код сниппетов присутствует, axe
 *    чист на странице гайда; индекс showcase ссылается на все три.
 *
 * Список ниже дублирует GUIDES (showcase/guides.mjs) сознательно: спека
 * Playwright транспилируется в CJS и нативный ESM-модуль не импортирует;
 * расхождение списков ловит юнит-пин tests/unit/guides.test.js.
 */
import { expect } from '@playwright/test';

import { a11y, freezeClock, openIndex, test, unexpectedViolations } from '../helpers/harness.js';

/** Гайды T10.3 (зеркало GUIDES из showcase/guides.mjs). */
const GUIDES = [
  { name: 'quickstart', title: 'Quickstart: подключение irao-ui за 5 минут' },
  { name: 'integration-guide', title: 'Integration guide: подключение и миграция (living doc)' },
  { name: 'bitrix-30-minutes', title: 'Bitrix-разработчику за 30 минут' },
];

for (const guide of GUIDES) {
  test.describe(`гайд ${guide.name} (T10.3)`, () => {
    let page;
    let badResponses;

    test.beforeEach(async ({ page: newPage }) => {
      page = newPage;
      badResponses = [];
      page.on('response', (response) => {
        if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
      });
      await freezeClock(page);
      await page.goto(`/showcase/dist/docs/${guide.name}.html`);
      await page.waitForLoadState('networkidle');
    });

    test('нет сетевых ошибок: каркас и рантайм резолвятся (все ответы < 400)', async () => {
      expect(badResponses, `${guide.name}: ответы ≥ 400`).toEqual([]);
    });

    test('заголовок страницы — из реестра гайдов, содержимое на месте', async () => {
      await expect(page.locator('main h1')).toHaveText(guide.title);
      // Копипаст-код — ядро гайдов: на каждой странице есть блоки кода.
      const codeBlocks = page.locator('main pre > code');
      await expect(codeBlocks.first()).toBeVisible();
    });

    test('axe чист на странице гайда', async () => {
      const results = await a11y(page).analyze();
      expect(unexpectedViolations(results)).toEqual([]);
    });
  });
}

test('индекс showcase публикует раздел гайдов (AC1: три документа опубликованы)', async ({
  page,
}) => {
  await openIndex(page);
  const guidesSection = page.locator('[aria-labelledby="guides-heading"]');
  await expect(guidesSection).toBeVisible();
  for (const guide of GUIDES) {
    await expect(
      guidesSection.locator(`a[href="docs/${guide.name}.html"]`),
      `ссылка на ${guide.name}`,
    ).toBeVisible();
  }
});

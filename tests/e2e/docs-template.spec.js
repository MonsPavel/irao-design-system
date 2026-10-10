/**
 * E2E док-страниц по шаблону T10.1 (showcase/dist/docs/<имя>.html).
 *
 * Уровни проверки контракта «страница = шаблон»:
 *  - unit (tests/unit/docs-template.test.js) — исполняемая форма шаблона
 *    из исходников (канонический порядок секций — там);
 *  - сборка (selfChecks showcase/build.mjs) — «диф на билде» по записанному
 *    файлу: сниппет = каноническому файлу = живым примерам, 9 секций,
 *    iframe 375/768/1440;
 *  - здесь — живой DOM: сниппет на странице равен ФАКТИЧЕСКОЙ разметке секции
 *    примеров после парсинга браузером, responsive-iframe реально загружают
 *    стенд компонента, axe чист (включая содержимое iframe).
 *
 * Списки ниже дублируют DOC_SECTIONS/REFERENCE_COMPONENTS
 * (showcase/docs-template.mjs) сознательно: спека Playwright транспилируется
 * в CJS и нативный ESM-модуль не импортирует; расхождение списков ловится
 * юнит-пином и гейтом сборки.
 */
import { expect } from '@playwright/test';

import { a11y, freezeClock, test, unexpectedViolations } from '../helpers/harness.js';

/** Секции шаблона в каноническом порядке (зеркало DOC_SECTIONS). */
const DOC_SECTIONS = [
  'examples',
  'snippet',
  'states',
  'responsive',
  'a11y',
  'api',
  'do-dont',
  'schema',
  'version',
];

/** Эталоны T10.1 (зеркало REFERENCE_COMPONENTS). */
const REFERENCE_COMPONENTS = ['ui-button', 'ui-field', 'ui-modal'];

/** Нормализация DOM-разметки для сравнения: комментарии (маркеры секций),
 *  пробелы и артефакты сериализации браузера (пробел перед «>», пустые
 *  атрибуты «=""») не считаются дифом. */
function normalizeDom(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+>/g, '>')
    .replace(/=""(?=[\s>])/g, '')
    .trim();
}

for (const name of REFERENCE_COMPONENTS) {
  test.describe(`дока ${name} (шаблон T10.1)`, () => {
    let page;
    let badResponses;

    test.beforeEach(async ({ page: newPage }) => {
      page = newPage;
      // Сетевой пин: каркас подключает рантайм dist относительно СВОЕЙ
      // глубины (docs/<имя>.html на уровень ниже SHOWCASE_DIST → «../»).
      // Любой ответ ≥ 400 — сломанный путь: рендер без CSS/JS (живые примеры
      // нестилизованы, модуль компонента мёртв); другие гейты этого не видят —
      // без CSS axe, наоборот, «зеленеет» (нет стилевых нарушений).
      badResponses = [];
      page.on('response', (response) => {
        if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
      });
      await freezeClock(page);
      await page.goto(`/showcase/dist/docs/${name}.html`);
      await page.waitForLoadState('networkidle');
    });

    test('нет сетевых ошибок: каркас и рантайм резолвятся (все ответы < 400)', async () => {
      expect(badResponses, `${name}: ответы ≥ 400`).toEqual([]);
    });

    test('9 секций шаблона присутствуют и видимы по порядку', async () => {
      let previousY = null;
      for (const section of DOC_SECTIONS) {
        const locator = page.locator(`[data-ui-docs-section="${section}"]`);
        await expect(locator, `секция ${section}`).toBeVisible();
        const box = await locator.boundingBox();
        if (previousY !== null) {
          expect(box.y, `секция ${section} ниже предыдущей`).toBeGreaterThan(previousY);
        }
        previousY = box.y;
      }
    });

    test('сниппет = фактической разметке секции «Живые примеры» (живой DOM)', async () => {
      const snippet = await page.locator('[data-ui-docs-snippet] code').textContent();
      const examples = await page.locator('[data-ui-docs-examples]').innerHTML();
      expect(normalizeDom(snippet), `${name}: разметка примеров не пуста`).not.toBe('');
      expect(normalizeDom(snippet)).toBe(normalizeDom(examples));
    });

    test('responsive-секция: три реальных iframe 375/768/1440, стенд загружен', async () => {
      const frames = page.locator('[data-ui-docs-section="responsive"] iframe');
      await expect(frames).toHaveCount(3);
      for (const width of ['375', '768', '1440']) {
        const frame = page.frameLocator(`iframe[width="${width}"]`);
        await expect(frame.locator('h1'), `стенд в iframe шириной ${width} загрузился`).toHaveText(
          name,
        );
      }
      // Ссылка на полный стенд с док-страницы ведёт на тот же файл.
      await expect(
        page.locator(`[data-ui-docs-section="examples"] a[href="../stands/${name}.html"]`),
      ).toHaveCount(1);
    });

    test('axe чист на разметке док-страницы, вне реестра исключений', async () => {
      // Область анализа — собственная разметка док-страницы (exclude iframe):
      // содержимое iframe — СТЕНДЫ компонента, у каждого свой axe-гейт
      // (tests/e2e/ui-<name>.spec.js) и сквозной обход всех стендов
      // (tests/a11y/stands-sweep.spec.js, T9.2). Прогон axe по док-странице
      // ЦЕЛИКОМ склеивал бы дерево страницы и трёх одинаковых фреймов:
      // ленмарки фреймов (banner/main/именованные регионы стенда) падают в
      // landmark-unique как «дубли» — артефакт плоского дерева, а не дефект:
      // для скринридера iframe — отдельный контекст с собственными ленмарками
      // (frame-scoped анализ недоступен в @axe-core/playwright 4.13).
      const results = await a11y(page).exclude('iframe').analyze();
      expect(unexpectedViolations(results)).toEqual([]);
    });
  });
}

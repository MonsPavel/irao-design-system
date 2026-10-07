/**
 * e2e ui-image / ui-figure (T4.6; Testing requirements).
 *
 * Поверхность — стенды showcase/pages/ui-image (три вида изображений +
 * матрица модификаторов + fallback) и showcase/pages/ui-figure (подпись).
 * Проверяется:
 *  1. три вида изображений (Implementation requirements п.2): декоративное
 *     alt="", информативное — осмысленный alt, complex — длинное описание
 *     через aria-describedby (WCAG 1.1.1);
 *  2. модификаторы: --cover/--contain (object-fit) и --ratio-* — место под
 *     картинку зафиксировано без знания размеров файла (геометрия бокса =
 *     пропорция шкалы, Implementation requirements п.1);
 *  3. e2e CLS (AC): layout-shift = 0 при lazy-загрузке стенда. Механика:
 *     счётчик устанавливается ПОСЛЕ networkidle (font-display: swap базы
 *     T3.1 может дать сдвиг подмены шрифта до этого момента — к паттерну
 *     изображений он не относится), дальше стенд прокручивается — lazy-img
 *     догружаются; сдвигов быть не должно. Чувствительность наблюдателя
 *     проверяется отдельным контролем: безразмерный img в потоке даёт
 *     layout-shift > 0 (иначе тест был бы вакуумным);
 *  4. e2e broken-src (AC): сломанный src не рушит сетку — boundingBox
 *     сломанной картинки равен соседним (место зарезервировано width/height
 *     + --ratio), горизонтального переполнения страницы нет, alt-текст —
 *     осмысленный (правило fallback: контент доступен вместо картинки);
 *  5. lazy-политика (Scope): вне первого экрана — loading="lazy", на первом
 *     экране — без lazy;
 *  6. ui-figure: подпись связана семантически (figure/figcaption), композиция
 *     с ui-image;
 *  7. axe: оба стенда чисты — известных исключений нет;
 *  8. эталоны 375/768/1280/1440 — только из контейнера/CI (ADR-0004).
 */
import { expect } from '@playwright/test';

import { a11y, shot, test as standTest, VIEWPORTS } from '../helpers/harness.js';

/** Идентификаторы стенда ui-image (showcase/pages/ui-image/index.html). */
const IMAGE = {
  decorative: 'ui-image-decorative',
  informative: 'ui-image-informative',
  complex: 'ui-image-complex',
  complexDesc: 'ui-image-complex-desc',
  cover: 'ui-image-cover',
  contain: 'ui-image-contain',
  ratio1: 'ui-image-ratio-1-1',
  ratio32: 'ui-image-ratio-3-2',
  ratio43: 'ui-image-ratio-4-3',
  ratio169: 'ui-image-ratio-16-9',
  fallback: 'ui-image-fallback',
  fallbackA: 'ui-image-fallback-a',
  fallbackB: 'ui-image-fallback-b',
  fallbackC: 'ui-image-fallback-c',
  broken: 'ui-image-broken',
};

/** Картинки первого экрана — без lazy; всё ниже — loading="lazy". */
const ABOVE_FOLD = [IMAGE.decorative, IMAGE.informative, IMAGE.complex];
const BELOW_FOLD = [
  IMAGE.cover,
  IMAGE.contain,
  IMAGE.ratio1,
  IMAGE.ratio32,
  IMAGE.ratio43,
  IMAGE.ratio169,
  IMAGE.fallbackA,
  IMAGE.broken,
  IMAGE.fallbackC,
];

/** Ожидаемые пропорции ratio-модификаторов (шкала --ui-ratio-* слоя 2). */
const RATIOS = [
  [IMAGE.ratio1, 1 / 1],
  [IMAGE.ratio32, 2 / 3],
  [IMAGE.ratio43, 3 / 4],
  [IMAGE.ratio169, 9 / 16],
];

/** Установить счётчик layout-shift (нестационарный: только сдвиги ПОСЛЕ установки). */
const installClsMeter = (page) =>
  page.evaluate(() => {
    window.__uiImageCls = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__uiImageCls += entry.value;
      }
    });
    observer.observe({ type: 'layout-shift' });
  });

/** Прочитать счётчик layout-shift. */
const readCls = (page) => page.evaluate(() => window.__uiImageCls);

/**
 * Догрузить lazy-изображения: прокат по странице шагами по пол-экрана
 * (порог подгрузки lazy — от близости к вьюпорту), ожидание complete всех
 * img, возврат наверх. img.complete истинен и для ошибочного ответа (404) —
 * ожидание завершается всегда.
 */
async function settleImages(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight / 2));
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(() => [...document.images].every((img) => img.complete));
  await page.waitForTimeout(250);
}

/** Геометрия бокса элемента по id. */
const boxOf = (page, id) => page.locator(`#${id}`).boundingBox();

standTest.describe('ui-image (T4.6)', () => {
  standTest(
    'три вида изображений: декоративное alt="", информативное — alt-текст, complex — aria-describedby',
    async ({ stand }) => {
      const page = await stand('ui-image');

      // Декоративное: пустой alt — скринридер пропускает (WCAG 1.1.1).
      await expect(page.locator(`#${IMAGE.decorative}`)).toHaveAttribute('alt', '');

      // Информативное: осмысленный alt (не имя файла и не «картинка»).
      const informativeAlt = await page.locator(`#${IMAGE.informative}`).getAttribute('alt');
      expect(informativeAlt, 'информативное — осмысленный alt').toBeTruthy();
      expect(informativeAlt.length, 'alt не пуст и не заглушка').toBeGreaterThan(15);

      // Complex: длинное описание связано атрибутом aria-describedby.
      const complex = page.locator(`#${IMAGE.complex}`);
      await expect(complex).toHaveAttribute('aria-describedby', IMAGE.complexDesc);
      const description = page.locator(`#${IMAGE.complexDesc}`);
      await expect(description).toBeVisible();
      const descText = await description.textContent();
      expect(descText.trim().length, 'описание длиннее подписи-заглушки').toBeGreaterThan(40);
    },
  );

  standTest(
    'модификаторы: object-fit --cover/--contain, место --ratio-* зафиксировано пропорцией шкалы',
    async ({ stand }) => {
      const page = await stand('ui-image');
      await settleImages(page);

      expect(
        await page.locator(`#${IMAGE.cover}`).evaluate((el) => getComputedStyle(el).objectFit),
        '--cover: object-fit cover',
      ).toBe('cover');
      expect(
        await page.locator(`#${IMAGE.contain}`).evaluate((el) => getComputedStyle(el).objectFit),
        '--contain: object-fit contain',
      ).toBe('contain');

      for (const [id, ratio] of RATIOS) {
        const box = await boxOf(page, id);
        expect(box, `${id}: бокс есть`).not.toBeNull();
        expect(
          Math.abs(box.height - box.width * ratio),
          `${id}: высота = ширина × ${ratio.toFixed(4)} (факт ${box.width}×${box.height})`,
        ).toBeLessThanOrEqual(1);
      }
    },
  );

  standTest(
    'e2e CLS (AC): layout-shift = 0 при lazy-загрузке стенда',
    async ({ stand }) => {
      const page = await stand('ui-image');

      // Счётчик — после networkidle: подмена шрифта (font-display: swap,
      // база T3.1) уже отыграла и к паттерну изображений не относится.
      await installClsMeter(page);
      await settleImages(page);

      const cls = await readCls(page);
      expect(cls, 'layout-shift за догрузку lazy-изображений = 0').toBe(0);

      const allComplete = await page.evaluate(
        () => [...document.images].filter((img) => !img.complete).length,
      );
      expect(allComplete, 'все img стенда загрузились (проверка не вакуумна)').toBe(0);
    },
  );

  standTest(
    'чувствительность наблюдателя (контроль инструмента): безразмерный img в потоке даёт layout-shift > 0',
    async ({ stand }) => {
      const page = await stand('ui-image');
      await installClsMeter(page);

      // Негативный контроль механики: img БЕЗ width/height/aspect-ratio,
      // вставлен в начало потока (сдвиг уводит весь контент ниже) — загрузка
      // раскрывает бокс из нуля до натурального размера.
      const shift = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const img = document.createElement('img');
            img.src =
              'data:image/svg+xml,' +
              encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">' +
                  '<rect width="640" height="360" fill="#164B89"/></svg>',
              );
            img.alt = 'Контроль CLS';
            const main = document.getElementById('main');
            main.insertBefore(img, main.firstChild);
            const finish = () =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => setTimeout(() => resolve(window.__uiImageCls), 150)),
              );
            if (img.complete) finish();
            else {
              img.addEventListener('load', finish);
              img.addEventListener('error', finish);
            }
          }),
      );
      expect(shift, 'безразмерный img сдвигает контент (наблюдатель жив)').toBeGreaterThan(0);
    },
  );

  standTest(
    'e2e broken-src (AC): сломанный src не рушит сетку — бокс равен соседям, переполнения нет',
    async ({ stand }) => {
      const page = await stand('ui-image');
      await settleImages(page);

      const broken = await boxOf(page, IMAGE.broken);
      const neighborA = await boxOf(page, IMAGE.fallbackA);
      const neighborC = await boxOf(page, IMAGE.fallbackC);

      expect(broken, 'сломанная картинка на месте').not.toBeNull();
      expect(
        Math.abs(broken.width - neighborA.width),
        'ширина сломанной = ширина живого соседа (левого)',
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(broken.height - neighborA.height),
        'высота сломанной = высоте живого соседа (левого) — место зарезервировано',
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(broken.height - neighborC.height),
        'высота сломанной = высоте живого соседа (правого)',
      ).toBeLessThanOrEqual(1);

      // Правило alt-текста fallback: вместо картинки скринридеру и
      // «сломанному» рендеру доступен осмысленный текст.
      const brokenAlt = await page.locator(`#${IMAGE.broken}`).getAttribute('alt');
      expect(brokenAlt, 'у сломанной картинки осмысленный alt').toBeTruthy();
      expect(brokenAlt.length).toBeGreaterThan(15);

      // Сетка не разъехалась: горизонтального переполнения страницы нет.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, 'нет горизонтального переполнения').toBeLessThanOrEqual(0);
    },
  );

  standTest(
    'lazy-политика (Scope): вне первого экрана — loading="lazy", на первом экране — без lazy',
    async ({ stand }) => {
      const page = await stand('ui-image');

      for (const id of ABOVE_FOLD) {
        const loading = await page.locator(`#${id}`).getAttribute('loading');
        expect(loading, `${id}: первый экран — без lazy`).not.toBe('lazy');
      }
      for (const id of BELOW_FOLD) {
        await expect(page.locator(`#${id}`), `${id}: вне первого экрана — lazy`).toHaveAttribute(
          'loading',
          'lazy',
        );
      }
    },
  );

  standTest('axe: стенд ui-image чист — известных исключений нет (AC)', async ({ stand }) => {
    const page = await stand('ui-image');
    const results = await a11y(page).analyze();
    expect(
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`),
      'axe: violations = []',
    ).toEqual([]);
  });

  standTest('эталоны ui-image 375/768/1280/1440 — только из контейнера (ADR-0004)', async ({
    stand,
  }) => {
    const page = await stand('ui-image');
    await settleImages(page); // lazy-изображения догружены до снимков
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-image', viewport });
    }
  });
});

standTest.describe('ui-figure (T4.6)', () => {
  standTest(
    'подпись связана семантически: figure > (img, figcaption), подпись под изображением',
    async ({ stand }) => {
      const page = await stand('ui-figure');

      const figures = page.locator('figure.ui-figure');
      const count = await figures.count();
      expect(count, 'стенд содержит ui-figure').toBeGreaterThan(0);

      const figure = page.locator('#ui-figure-caption');
      const caption = figure.locator('figcaption.ui-figure__caption');
      await expect(caption).toBeVisible();
      const captionText = (await caption.textContent()).trim();
      expect(captionText.length, 'подпись не пуста').toBeGreaterThan(0);

      const img = figure.locator('img.ui-image');
      await expect(img).toHaveCount(1);
      await expect(img).toHaveAttribute('alt', /.+/);
      await expect(img).toHaveAttribute('width', /\d+/);
      await expect(img).toHaveAttribute('height', /\d+/);

      const imgBox = await img.boundingBox();
      const captionBox = await caption.boundingBox();
      expect(
        captionBox.y,
        'подпись ниже изображения (семантика figcaption — визуальная связь)',
      ).toBeGreaterThan(imgBox.y + imgBox.height - 1);
    },
  );

  standTest('axe: стенд ui-figure чист — известных исключений нет (AC)', async ({ stand }) => {
    const page = await stand('ui-figure');
    const results = await a11y(page).analyze();
    expect(
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`),
      'axe: violations = []',
    ).toEqual([]);
  });

  standTest('эталоны ui-figure 375/768/1280/1440 — только из контейнера (ADR-0004)', async ({
    stand,
  }) => {
    const page = await stand('ui-figure');
    await settleImages(page);
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-figure', viewport });
    }
  });
});

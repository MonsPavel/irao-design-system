/**
 * e2e ui-accordion (T6.4; Testing requirements + AC).
 *
 * Поверхность — стенд showcase/pages/ui-accordion с тремя сценариями:
 * #uiacc-faq — FAQ-вариант (первый вопрос открыт нативным open, инстанс без
 * JS-хука — пункты независимы); #uiacc-list — список раскрытий без --faq
 * (поверхность анимации: пункты стартуют закрытыми); #uiacc-single — режим
 * «один открыт» (data-ui-accordion="single"). Проверяется:
 *  1. семантика (AC): нативные details/summary, имя вопроса — текст summary,
 *     шеврон svg aria-hidden, ARIA-атрибутов нет (Accessibility requirements);
 *  2. клавиатура и клик (AC): Enter/Space на summary переключают, клик тоже;
 *     фокус-обводка — глобальная политика ADR-0001 (summary:focus-visible);
 *  3. no-JS (AC): в контексте без JavaScript аккордеон полностью работает —
 *     нативная база details/summary;
 *  4. single-open (AC): открытие закрывает соседей (JS-усиление), в FAQ без
 *     хука пункты независимы;
 *  5. анимация открытия — grid-rows на ::details-content: rAF-сэмплы высоты
 *     дают промежуточные кадры (решение по матрице evergreen — README);
 *  6. reduced-motion (AC): анимация отключена — высота меняется мгновенно
 *     (переход слота гасится правилом компонента: kill-switch base/reset не
 *     проходит по ::details-content);
 *  7. touch-цель вопроса ≥ 44px (паддинг вопроса даёт запас);
 *  8. axe чист (AC) на закрытом и открытых состояниях;
 *  9. эталоны 375/768/1280/1440 (исходное состояние) + «все открыты» на
 *     desktop — только из контейнера/CI (ADR-0004).
 */
import { expect } from '@playwright/test';

import { a11y, shot, test, VIEWPORTS } from '../helpers/harness.js';

/** Идентификаторы стендов-сценариев (showcase/pages/ui-accordion/index.html). */
const ACC = {
  faq: 'uiacc-faq',
  list: 'uiacc-list',
  single: 'uiacc-single',
};

/** Сводка одного пункта: корень details + вопрос summary + ответ. */
const itemOf = (page, scope, index) => {
  const root = page.locator(`#${scope} .ui-accordion__item`).nth(index);
  return {
    root,
    q: root.locator('.ui-accordion__q'),
    a: root.locator('.ui-accordion__a'),
  };
};

/** Tab-обход до элемента (фокус с клавиатуры — :focus-visible, ADR-0001). */
async function tabTo(page, locator) {
  for (let step = 0; step < 60; step += 1) {
    if (await locator.evaluate((el) => el.matches(':focus-visible'))) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('фокус не дошёл до элемента за 60 Tab');
}

/**
 * Высоты details за 400 мс после действия (rAF-сэмплы, детерминированный
 * снимок анимации — приём зонда 2026-10-08, решение по матрице evergreen).
 */
async function heightSamples(page, locator) {
  return locator.evaluate(
    (el) =>
      new Promise((resolve) => {
        const heights = new Set();
        const start = performance.now();
        const tick = () => {
          heights.add(el.getBoundingClientRect().height.toFixed(1));
          if (performance.now() - start < 400) requestAnimationFrame(tick);
          else resolve([...heights]);
        };
        requestAnimationFrame(tick);
      }),
  );
}

/** Раскрыть все пункты стенда (для axe/эталона «открыто»). */
async function openAll(page) {
  for (const scope of [ACC.faq, ACC.list, ACC.single]) {
    const items = page.locator(`#${scope} .ui-accordion__item`);
    const count = await items.count();
    for (let i = 0; i < count; i += 1) {
      const item = itemOf(page, scope, i);
      if (!(await item.root.evaluate((el) => el.open))) {
        await item.q.click();
      }
    }
  }
  // Анимация 0fr→1fr (--ui-transition) — ждём устоявшиеся высоты.
  await page.waitForTimeout(450);
}

test.describe('ui-accordion: семантика (T6.4)', () => {
  test('нативные details/summary (AC): имя вопроса — текст summary, шеврон svg aria-hidden, ARIA нет', async ({
    stand,
  }) => {
    const page = await stand('ui-accordion');

    for (const scope of [ACC.faq, ACC.list, ACC.single]) {
      const root = page.locator(`#${scope}`);
      await expect(root).toHaveClass(/ui-accordion/);

      const items = root.locator('.ui-accordion__item');
      const count = await items.count();
      expect(count, `${scope}: пунктов ≥ 2`).toBeGreaterThanOrEqual(2);

      for (let i = 0; i < count; i += 1) {
        const item = itemOf(page, scope, i);
        // Нативная семантика: details/summary без ARIA (Accessibility
        // requirements) — раскрыватель и состояние браузер даёт сам.
        await expect(item.q, `${scope} [${i}]: вопрос — summary`).toHaveJSProperty(
          'tagName',
          'SUMMARY',
        );
        const name = (await item.q.textContent()).trim();
        expect(name.length, `${scope} [${i}]: имя из текста summary`).toBeGreaterThan(0);

        const icons = item.q.locator('svg[aria-hidden="true"]');
        expect(await icons.count(), `${scope} [${i}]: глиф декоративен`).toBe(1);
      }

      // ARIA-дублей нативной семантики в разметке нет.
      expect(await root.locator('[role], [aria-expanded], [aria-controls]').count()).toBe(0);
    }

    // Исходное состояние: ровно один пункт стенда открыт (первый FAQ,
    // career-portal education — первый вопрос раскрыт).
    const openCount = await page.locator('.ui-accordion__item[open]').count();
    expect(openCount, 'исходно открыт один пункт — первый FAQ').toBe(1);
  });

  test('touch-цель вопроса ≥ 44px во всех сценариях (паддинг вопроса)', async ({ stand }) => {
    const page = await stand('ui-accordion');

    for (const scope of [ACC.faq, ACC.list, ACC.single]) {
      const questions = page.locator(`#${scope} .ui-accordion__q`);
      const count = await questions.count();
      for (let i = 0; i < count; i += 1) {
        const box = await questions.nth(i).boundingBox();
        expect(box, `${scope} [${i}]: boundingBox`).toBeTruthy();
        expect(box.height, `${scope} [${i}]: высота ≥ 44`).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

test.describe('ui-accordion: клавиатура и no-JS (T6.4)', () => {
  test('Enter и Space на summary переключают (AC); фокус-обводка — политика ADR-0001', async ({
    stand,
  }) => {
    const page = await stand('ui-accordion');

    // FAQ: второй вопрос (первый открыт по умолчанию — не первая таб-стоп-цель).
    const second = itemOf(page, ACC.faq, 1);
    await expect(second.a, 'закрытый ответ не виден').not.toBeVisible();

    await tabTo(page, second.q);
    expect(await second.q.evaluate((el) => el.matches(':focus-visible'))).toBe(true);

    await page.keyboard.press('Enter');
    await expect(second.root, 'Enter раскрыл').toHaveAttribute('open', /.*/);
    await expect(second.a, 'ответ виден').toBeVisible();

    await page.keyboard.press('Space');
    await expect(second.root, 'Space свернул').not.toHaveAttribute('open');

    await page.keyboard.press('Space');
    await expect(second.root, 'Space раскрыл снова').toHaveAttribute('open', /.*/);

    // Клик тоже переключает.
    await second.q.click();
    await expect(second.root, 'клик свернул').not.toHaveAttribute('open');
  });

  test('no-JS (AC): аккордеон полностью работает в контексте без JavaScript', async ({ stand }) => {
    const page = await stand('ui-accordion');
    const standUrl = page.url();

    const context = await page.context().browser().newContext({ javaScriptEnabled: false });
    const noJsPage = await context.newPage();
    await noJsPage.goto(standUrl, { waitUntil: 'networkidle' });

    const item = itemOf(noJsPage, ACC.list, 0);
    await expect(item.a, 'исходно закрыт').not.toBeVisible();

    await item.q.click();
    await expect(item.root, 'клик раскрыл (нативный toggle без JS)').toHaveAttribute('open', /.*/);
    await expect(item.a, 'ответ виден').toBeVisible();

    await item.q.click();
    await expect(item.root, 'повторный клик свернул').not.toHaveAttribute('open');

    // Режим single — JS-усиление: без JS пункты независимы (нативная база).
    // Над #uiacc-single только что схлопнулся список — пункты сместились;
    // проверка стабильности Playwright в no-JS-контексте не подтверждается
    // (rAF-инструментация в javaScriptEnabled: false не тикает — зонд
    // 2026-10-08), поэтому клики force: это РЕАЛЬНЫЕ клики мышью без
    // actionability-ожиданий (прецедент — disabled-стрелки ui-pagination).
    await noJsPage.waitForTimeout(400); // устаканить раскладку после закрытия
    const single = itemOf(noJsPage, ACC.single, 0);
    await single.q.click({ force: true });
    const singleSecond = itemOf(noJsPage, ACC.single, 1);
    await singleSecond.q.click({ force: true });
    await expect(single.root, 'no-JS single: первый остался открыт').toHaveAttribute('open', /.*/);

    await context.close();
  });
});

test.describe('ui-accordion: single-open (T6.4)', () => {
  test('single (AC): открытие закрывает соседей; повторный клик закрывает единственный открытый', async ({
    stand,
  }) => {
    const page = await stand('ui-accordion');

    // Модуль загружен и зарегистрирован (поверхность single — JS-усиление).
    await expect
      .poll(() => page.evaluate(() => typeof window.IraoUI?.accordion?.init))
      .toBe('function');

    const first = itemOf(page, ACC.single, 0);
    const second = itemOf(page, ACC.single, 1);

    await first.q.click();
    await expect(first.root).toHaveAttribute('open', /.*/);

    await second.q.click();
    await expect(second.root, 'второй раскрыт').toHaveAttribute('open', /.*/);
    await expect(first.root, 'первый закрыт соседем (один открыт)').not.toHaveAttribute('open');

    await second.q.click();
    await expect(second.root, 'повторный клик — «все закрыты» допустимо').not.toHaveAttribute(
      'open',
    );
  });

  test('FAQ без JS-хука: пункты независимы — открытие второго не закрывает первого', async ({
    stand,
  }) => {
    const page = await stand('ui-accordion');

    const first = itemOf(page, ACC.faq, 0); // открыт по умолчанию (нативный open)
    const second = itemOf(page, ACC.faq, 1);

    await expect(first.root, 'первый открыт исходно').toHaveAttribute('open', /.*/);
    await second.q.click();
    await expect(second.root, 'второй раскрыт').toHaveAttribute('open', /.*/);
    await expect(first.root, 'первый остался открыт — без хука все независимы').toHaveAttribute(
      'open',
      /.*/,
    );
  });
});

test.describe('ui-accordion: анимация и reduced-motion (T6.4)', () => {
  test('анимация открытия — grid-rows на ::details-content: есть промежуточные кадры высоты', async ({
    stand,
  }) => {
    const page = await stand('ui-accordion');

    const item = itemOf(page, ACC.list, 0);
    const closedHeight = (await item.root.boundingBox()).height;

    await item.q.click();
    const samples = await heightSamples(page, item.root);
    const openHeight = (await item.root.boundingBox()).height;

    expect(openHeight, 'раскрылся до полной высоты').toBeGreaterThan(closedHeight + 8);
    const distinct = [...new Set(samples.map(Number))];
    expect(
      distinct.length,
      `промежуточные кадры анимации (сэмплы: ${samples.join(' | ')})`,
    ).toBeGreaterThanOrEqual(3);
  });

  test('reduced-motion (AC): анимация отключена — высота меняется мгновенно', async ({ stand }) => {
    const page = await stand('ui-accordion');
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const item = itemOf(page, ACC.list, 0);
    await item.q.click();

    const samples = await heightSamples(page, item.root);
    const distinct = [...new Set(samples.map(Number))];
    expect(
      distinct.length,
      `промежуточных кадров нет (сэмплы: ${samples.join(' | ')})`,
    ).toBeLessThanOrEqual(2);

    // Контент не теряется: ответ раскрыт на полную высоту.
    const inner = item.a.locator('.ui-accordion__a-inner');
    await expect(inner).toBeVisible();
  });
});

test.describe('ui-accordion: axe и эталоны (T6.4)', () => {
  test('axe: стенд чист в закрытом состоянии — известных исключений нет (AC)', async ({
    stand,
  }) => {
    const page = await stand('ui-accordion');
    const results = await a11y(page).analyze();
    expect(
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`),
      'axe: violations = []',
    ).toEqual([]);
  });

  test('axe: стенд чист при раскрытых пунктах (AC)', async ({ stand }) => {
    const page = await stand('ui-accordion');
    await openAll(page);
    const results = await a11y(page).analyze();
    expect(
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`),
      'axe: violations = []',
    ).toEqual([]);
  });

  test('эталоны ui-accordion 375/768/1280/1440 (исходное: FAQ — первый открыт) — только из контейнера (ADR-0004)', async ({
    stand,
  }) => {
    const page = await stand('ui-accordion');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-accordion', viewport });
    }
  });

  test('эталон «все открыты» на desktop — закрытое/открытое состояния (ADR-0004)', async ({
    stand,
  }) => {
    const page = await stand('ui-accordion');
    await openAll(page);
    await shot(page, { name: 'ui-accordion-open', viewport: 'desktop' });
  });
});

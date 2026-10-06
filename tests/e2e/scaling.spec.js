/**
 * e2e-гейт масштабирования (T3.6 — релизный гейт, требование №19 ТЗ /
 * WCAG 1.4.4 resize text): 200% browser zoom и 32px-база не ломают раскладку.
 *
 * Поверхность — ключевые стенды полигона (CHECK_STANDS), чьи узлы размечены
 * контрактом `data-ui-check-layout`. Сценарии (Scope T3.6):
 *  A. browser zoom 200% — CDP-эмуляция `Emulation.setDeviceMetricsOverride`
 *     (CSS-вьюпорт вдвое уже, DPR вдвое больше — точная модель системного
 *     зума; механика и fallback зафиксированы в tests/e2e/README.md);
 *  B. `html { font-size: 32px }` — инжект через page.addStyleTag;
 *  чувствительность — гейт обязан ловить специально сломанный узел
 *  (фикс. высота + overflow: hidden → обрезка; наложение соседей → перекрытие).
 *
 * «Что считать поломкой» (пороги, Implementation requirements T3.6 п.2):
 *  - горизонтальный скролл страницы: scrollWidth > clientWidth у html/body;
 *  - перекрытие ключевых узлов: пересечение boundingBox'ов двух
 *    не-предок/не-потомков глубже 2px по ОБЕИМ осям;
 *  - обрезка контента узла: computed overflow hidden/clip и
 *    scrollWidth/scrollHeight > clientWidth/clientHeight (контент
 *    недостижим; auto/scroll — достижимость прокруткой, не поломка);
 *  - стенд без единого маркера data-ui-check-layout — нарушение контракта.
 *
 * Запуск: nightly + release матрица (падение блокирует релиз), не в PR —
 * подключение к контурам зафиксировано в tests/e2e/README.md и шапках
 * .github/workflows/{nightly,release}.yml. Зум-сценарий A — только chromium
 * (CDP); 32px-сценарий B — все браузеры матрицы. Пины контракта —
 * tests/unit/scaling.test.js.
 */
import { expect } from '@playwright/test';

import { test } from '../helpers/harness.js';

/**
 * Ключевые стенды гейта (Scope T3.6: base, типографика, grid; стенд формы
 * добавится сюда с появлением формы — EPIC-5). Расширять синхронно с
 * разметкой узлов — пин синхронизации: tests/unit/scaling.test.js.
 */
const CHECK_STANDS = Object.freeze(['base', 'typography', 'layout']);

/** Базы зум-сценария A (CSS-вьюпорт = база/2: 640 и 384 — обе ≥ 320 T3.4). */
const ZOOM_BASE_WIDTHS = Object.freeze([1280, 768]);

/** Базы 32px-сценария B: десктоп, tablet, mobile-стресс rem-шкалы. */
const BASE32_WIDTHS = Object.freeze([1280, 768, 375]);

/** Порог перекрытия из Implementation requirements T3.6 п.2. */
const OVERLAP_THRESHOLD_PX = 2;

/**
 * Сборка нарушений раскладки (исполняется в браузере; замыканий снаружи —
 * только сериализуемый код). Возвращает список { kind, node, detail }.
 * Порог перекрытия — единственный источник OVERLAP_THRESHOLD_PX спеки.
 */
const collectViolations = (page) =>
  page.evaluate((threshold) => {
    const THRESHOLD = threshold; // px — порог перекрытия из OVERLAP_THRESHOLD_PX
    const violations = [];

    const label = (el) => {
      const id = el.id ? `#${el.id}` : '';
      const cls = el.classList.length ? `.${[...el.classList].join('.')}` : '';
      return `${el.tagName.toLowerCase()}${id}${cls}`;
    };

    // 1. Горизонтальный скролл страницы (проверка design-qa career-portal
    //    scrollWidth === clientWidth, автоматизирована T3.4, тут — под зумом).
    const pageOverflow = (el, name) => {
      const delta = el.scrollWidth - el.clientWidth;
      if (delta > 0) {
        violations.push({
          kind: 'hscroll',
          node: name,
          detail: `scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth} (+${delta}px)`,
        });
      }
    };
    pageOverflow(document.documentElement, 'html');
    pageOverflow(document.body, 'body');

    // 2. Ключевые узлы — контракт data-ui-check-layout.
    const nodes = [...document.querySelectorAll('[data-ui-check-layout]')];
    if (nodes.length === 0) {
      violations.push({
        kind: 'contract',
        node: 'стенд',
        detail: 'нет ни одного [data-ui-check-layout] — контракт маркеров нарушен',
      });
      return violations;
    }

    const boxes = nodes.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    // Нулевой бокс = display:none/не отрисован — в проверках не участвует.
    const visible = boxes.map((box) => box.width > 0 && box.height > 0);

    // 3. Обрезка контента: узел РЕЖЕТ содержимое (overflow hidden/clip —
    //    контент недостижим; auto/scroll — достижимость прокруткой).
    for (let i = 0; i < nodes.length; i += 1) {
      if (!visible[i]) continue;
      const cs = getComputedStyle(nodes[i]);
      const axis = [];
      if (cs.overflowY !== 'visible' && nodes[i].scrollHeight > nodes[i].clientHeight) {
        axis.push(
          `по Y: scrollHeight ${nodes[i].scrollHeight} > clientHeight ${nodes[i].clientHeight}`,
        );
      }
      if (cs.overflowX !== 'visible' && nodes[i].scrollWidth > nodes[i].clientWidth) {
        axis.push(
          `по X: scrollWidth ${nodes[i].scrollWidth} > clientWidth ${nodes[i].clientWidth}`,
        );
      }
      if (axis.length > 0) {
        violations.push({
          kind: 'clip',
          node: label(nodes[i]),
          detail: `overflow ${cs.overflowX}/${cs.overflowY} обрезает контент — ${axis.join('; ')}`,
        });
      }
    }

    // 4. Перекрытие ключевых узлов: пересечение боксов пары «не предок и не
    //    потомок» глубже THRESHOLD по обеим осям (2px гасят субпиксель).
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        if (!visible[i] || !visible[j]) continue;
        const a = nodes[i];
        const b = nodes[j];
        if (a.contains(b) || b.contains(a)) continue; // вложенность — не перекрытие
        const overlapX =
          Math.min(boxes[i].x + boxes[i].width, boxes[j].x + boxes[j].width) -
          Math.max(boxes[i].x, boxes[j].x);
        const overlapY =
          Math.min(boxes[i].y + boxes[i].height, boxes[j].y + boxes[j].height) -
          Math.max(boxes[i].y, boxes[j].y);
        if (overlapX > THRESHOLD && overlapY > THRESHOLD) {
          violations.push({
            kind: 'overlap',
            node: `${label(a)} × ${label(b)}`,
            detail: `боксы пересекаются на ${Math.round(overlapX)}×${Math.round(overlapY)}px > ${THRESHOLD}px`,
          });
        }
      }
    }
    return violations;
  }, OVERLAP_THRESHOLD_PX);

/** Читаемый ассерт «нарушений нет»: список проваливается с расшифровкой. */
const expectNoViolations = (violations, context) => {
  const rendered = violations
    .slice(0, 10)
    .map((v) => `  - [${v.kind}] ${v.node}: ${v.detail}`)
    .join('\n');
  expect(
    violations,
    `${context}: нарушений раскладки нет${rendered ? `\n${rendered}` : ''}`,
  ).toEqual([]);
};

/** Один кадр — медиазапросы/раскладка после смены вьюпорта осели. */
const nextFrame = (page) =>
  page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));

/**
 * Сценарий A — browser zoom через CDP (только chromium): CSS-вьюпорт = база/2,
 * deviceScaleFactor = множитель зума — точная модель системного зума
 * (rem-типографика в CSS-px не меняется, медиазапросы пересчитываются).
 * Реализация зафиксирована в tests/e2e/README.md; раскладка-эквивалент для
 * не-chromium браузеров — page.setViewportSize({ width: база/2 }).
 */
const applyZoom = async (page, { width, height, factor }) => {
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: Math.round(width / factor),
    height: Math.round(height / factor),
    deviceScaleFactor: factor,
    mobile: false,
  });
  return session;
};

test.describe('масштабирование: zoom 200% и 32px-база (T3.6, релизный гейт)', () => {
  for (const name of CHECK_STANDS) {
    test(`A: browser zoom 200% — стенд «${name}» без скролла, обрезок и перекрытий`, async ({
      stand,
    }) => {
      test.skip(
        test.info().project.name !== 'chromium',
        'CDP-эмуляция зума — только chromium (механика — tests/e2e/README.md)',
      );
      const page = await stand(name);

      for (const base of ZOOM_BASE_WIDTHS) {
        await page.setViewportSize({ width: base, height: 900 });
        const session = await applyZoom(page, { width: base, height: 900, factor: 2 });

        // Ожидание применения эмуляции (а не одиночное чтение): при высокой
        // параллельной нагрузке CDP-override доезжает не мгновенно, и ранний
        // замер поймал бы гонку, а не раскладку.
        const cssWidth = Math.round(base / 2);
        await page.waitForFunction((expected) => window.innerWidth === expected, cssWidth);
        await nextFrame(page);

        expectNoViolations(await collectViolations(page), `zoom 200% (база ${base}) на «${name}»`);
        await session.send('Emulation.clearDeviceMetricsOverride');
      }
    });

    test(`B: html font-size 32px — стенд «${name}» без скролла, обрезок и перекрытий`, async ({
      stand,
    }) => {
      const page = await stand(name);
      // Инжект 32px (Technical considerations T3.6): addStyleTag + !important —
      // переживает любые будущие правила html в каскаде.
      await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });

      for (const width of BASE32_WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        const root = await page.evaluate(() =>
          parseFloat(getComputedStyle(document.documentElement).fontSize),
        );
        expect(root, `32px-база применена (${width})`).toBe(32);
        await nextFrame(page);

        expectNoViolations(await collectViolations(page), `32px-база (${width}) на «${name}»`);
      }
    });
  }

  test('чувствительность гейта: фикс. высота (обрезка) и наложение соседей ловятся', async ({
    stand,
  }) => {
    const page = await stand('layout');

    // Специально сломанный узел (Testing requirements T3.6): фикс. высота +
    // overflow: hidden — контент обрезается; сосед сверху — наложение боксов.
    await page.addStyleTag({
      content: `
        [data-ui-check-layout] {
          height: 40px !important;
          overflow: hidden !important;
        }
        [data-ui-check-layout] + [data-ui-check-layout] {
          position: relative !important;
          top: -24px !important;
        }
      `,
    });
    await nextFrame(page);

    const violations = await collectViolations(page);
    const kinds = new Set(violations.map((v) => v.kind));
    expect(
      kinds.has('clip'),
      `фикс. высота + overflow: hidden ловится как обрезка (поймано: ${[...kinds].join(', ')})`,
    ).toBe(true);
    expect(
      kinds.has('overlap'),
      `наложение соседей ловится как перекрытие (поймано: ${[...kinds].join(', ')})`,
    ).toBe(true);
  });
});

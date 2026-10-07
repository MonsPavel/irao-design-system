/**
 * e2e ui-card (T4.4; Testing requirements).
 *
 * Поверхность — стенд showcase/pages/ui-card (showcase/dist/stands/ui-card.html).
 * Проверяется:
 *  1. варианты: computed-значения базы / --filled / --hover (рамка #D6D6D6 →
 *     --ui-border-color, радиус --ui-radius-md, фон surface/surface-muted);
 *     hover-состояние на hover-устройствах: рамка --ui-color-border-hover
 *     (career-portal #B9C6DE) + тень --ui-shadow-md (0 12px 32px blue-800-10);
 *  2. hover-гвард (AC): touch-эмуляция Playwright hasTouch —
 *     `(hover: hover)` не матчится, hover НЕ меняет рамку/тень и не
 *     перекрашивает контент-ссылку (sticky-hover «не залипает»);
 *  3. карточка-ссылка: Tab-порядок осмысленный (ссылка → вложенная кнопка,
 *     AC), одна остановка скринридера (доступное имя = текст ссылки, без
 *     «съедания» вложенной кнопки); фокус растянутой ссылки виден по всей
 *     площади карточки (AC): локальная обводка ссылки заменена контуром
 *     ::after (focus-policy.md «Правило для компонентов»);
 *  4. клик-зоны: тело карточки ведёт как ссылка (угол карточки далеко от
 *     текста ссылки), вложенная кнопка остаётся кликабельной (переход не
 *     происходит);
 *  5. контраст текста на карточках (сквозной с T2.3, либа tests/contrast):
 *     ≥ 4.5:1 на surface и surface-muted;
 *  6. axe: стенд чист — известных исключений нет;
 *  7. эталоны 375/768/1280/1440 — только из контейнера/CI (ADR-0004).
 */
import { expect } from '@playwright/test';

import { contrastRatio } from '../contrast/lib.mjs';
import { a11y, openStand, shot, test as standTest, VIEWPORTS } from '../helpers/harness.js';

/** Идентификаторы стенда (showcase/pages/ui-card/index.html). */
const CARD = {
  base: 'ui-card-default',
  hover: 'ui-card-hover',
  filled: 'ui-card-filled',
  slots: 'ui-card-slots',
  link: 'ui-card-link',
  linkTitle: 'ui-card-link-title',
  linkButton: 'ui-card-link-button',
};

/** Вычисленное состояние карточки/ссылки. */
const stateOf = (page, id) =>
  page.locator(`#${id}`).evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      position: style.position,
      display: style.display,
      flexDirection: style.flexDirection,
      gap: style.gap,
      padding: style.padding,
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
    };
  });

/** Цели Tab-обхода (паттерн focus.spec.js). */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** Состояние фокуса: обводка элемента и его ::after (растянутая ссылка). */
const focusState = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    const own = getComputedStyle(el);
    const after = getComputedStyle(el, '::after');
    return {
      id: el.id,
      tag: el.tagName.toLowerCase(),
      focusVisible: el.matches(':focus-visible'),
      outlineWidth: own.outlineWidth,
      outlineStyle: own.outlineStyle,
      afterOutlineWidth: after.outlineWidth,
      afterOutlineStyle: after.outlineStyle,
      afterOutlineColor: after.outlineColor,
    };
  });

standTest.describe('ui-card (T4.4)', () => {
  standTest(
    'варианты: computed-значения базы / --filled / --hover до наведения',
    async ({ stand }) => {
      const page = await stand('ui-card');

      // База: career-portal .card (components.css:115–120) на токенах слоя 2.
      const base = await stateOf(page, CARD.base);
      expect(base.backgroundColor, 'фон — --ui-color-surface').toBe('rgb(255, 255, 255)');
      expect(base.borderColor, 'рамка — --ui-border-color (#D6D6D6)').toBe('rgb(214, 214, 214)');
      expect(base.borderRadius, 'радиус — --ui-radius-md (16px, --radius-card)').toBe('16px');
      expect(base.boxShadow, 'тени в базе нет').toBe('none');
      expect(base.position, 'relative — точка позиционирования растянутой ссылки').toBe('relative');
      expect(base.display, 'слоты на флексе (Technical considerations)').toBe('flex');
      expect(base.flexDirection).toBe('column');
      expect(base.gap, 'gap слотов — --ui-card-gap (14px pages.css:42)').toBe('14px');
      expect(base.padding, 'паддинг — --ui-space-5 (24px .vac-card pages.css:43)').toBe('24px');

      // --filled: фон и рамка surface-muted (career-portal .card--filled).
      const filled = await stateOf(page, CARD.filled);
      expect(filled.backgroundColor, 'фон — --ui-color-surface-muted (blue-50)').toBe(
        'rgb(241, 245, 254)',
      );
      expect(filled.borderColor, 'рамка — surface-muted (бесшовная карточка)').toBe(
        'rgb(241, 245, 254)',
      );

      // --hover до наведения выглядит как база (эффект — только в :hover).
      const hoverIdle = await stateOf(page, CARD.hover);
      expect(hoverIdle.borderColor).toBe(base.borderColor);
      expect(hoverIdle.boxShadow).toBe('none');
    },
  );

  standTest(
    'hover на hover-устройствах: рамка --ui-color-border-hover + тень --ui-shadow-md',
    async ({ stand }) => {
      const page = await stand('ui-card');
      expect(
        await page.evaluate(() => matchMedia('(hover: hover)').matches),
        'контекст стенда — hover-устройство',
      ).toBe(true);

      await page.locator(`#${CARD.hover}`).hover();
      await expect
        .poll(() => stateOf(page, CARD.hover), { timeout: 5000 })
        .toMatchObject({ borderColor: 'rgb(185, 198, 222)' });
      const after = await stateOf(page, CARD.hover);
      expect(
        after.boxShadow,
        'тень — --ui-shadow-md (0 12px 32px blue-800-10, career-portal components.css:124)',
      ).toContain('rgba(0, 40, 86, 0.1)');
      expect(after.boxShadow).toContain('0px 12px 32px');
    },
  );

  standTest(
    'hover-гвард (AC): touch-эмуляция hasTouch — эффект отсутствует, sticky-hover не «залипает»',
    async ({ browser }) => {
      // Отдельный контекст с hasTouch (AC называет именно его): в chromium
      // уже он переключает media на (hover: none)/(pointer: coarse) и
      // поддерживается всеми движками матрицы (без chromium-only isMobile).
      const context = await browser.newContext({
        hasTouch: true,
        viewport: VIEWPORTS.mobile,
      });
      const page = await context.newPage();
      await openStand(page, 'ui-card');

      expect(
        await page.evaluate(() => matchMedia('(hover: hover)').matches),
        'touch-эмуляция: (hover: hover) не матчится',
      ).toBe(false);
      expect(
        await page.evaluate(() => matchMedia('(hover: none)').matches),
        '(hover: none) — touch-устройство',
      ).toBe(true);

      const before = await stateOf(page, CARD.hover);
      await page.locator(`#${CARD.hover}`).hover();
      // Переход --ui-transition (0.25s) закончился бы в пределах 400 мс —
      // эффект отсутствует означает: ничего не меняется и после него.
      await page.waitForTimeout(400);
      const after = await stateOf(page, CARD.hover);
      expect(after.borderColor, 'рамка не изменилась').toBe(before.borderColor);
      expect(after.boxShadow, 'тень не появилась').toBe(before.boxShadow);

      // Перекраска контент-ссылки карточки-ссылки тоже под гвардом.
      const linkBefore = await page
        .locator(`#${CARD.linkTitle}`)
        .evaluate((el) => getComputedStyle(el).color);
      await page.locator(`#${CARD.link}`).hover();
      await page.waitForTimeout(400);
      const linkAfter = await page
        .locator(`#${CARD.linkTitle}`)
        .evaluate((el) => getComputedStyle(el).color);
      expect(linkAfter, 'ссылка не перекрашена').toBe(linkBefore);

      await context.close();
    },
  );

  standTest(
    'карточка-ссылка: одна остановка (имя = текст ссылки), Tab-порядок ссылка → вложенная кнопка (AC)',
    async ({ stand }) => {
      const page = await stand('ui-card');

      const link = page.locator(`#${CARD.linkTitle}`);
      const button = page.locator(`#${CARD.linkButton}`);

      // Доступное имя растянутой ссылки — текст ссылки; вложенная кнопка НЕ
      // «съедена» (не входит в имя и остаётся отдельной остановкой).
      await expect(link).toHaveAccessibleName('Вакансия: стажёр в команду разработки');
      await expect(button).toHaveAccessibleName('Откликнуться');

      // Tab-порядок — обходом стенда (паттерн focus.spec.js): растянутая
      // ссылка и вложенная кнопка — соседние остановки в DOM-порядке.
      const total = await page.evaluate(
        (selector) => document.querySelectorAll(selector).length,
        FOCUSABLE_SELECTOR,
      );
      const visited = [];
      for (let step = 0; step < total; step += 1) {
        await page.keyboard.press('Tab');
        const state = await focusState(page);
        expect(state.tag, `шаг ${step + 1}: фокус не ушёл в body`).not.toBe('body');
        visited.push(state.id || state.tag);
      }
      const linkStep = visited.indexOf(CARD.linkTitle);
      expect(linkStep, 'растянутая ссылка в Tab-порядке').toBeGreaterThan(-1);
      expect(visited[linkStep + 1], 'AC: следующая остановка после ссылки — вложенная кнопка').toBe(
        CARD.linkButton,
      );
    },
  );

  standTest(
    'фокус растянутой ссылки виден по всей площади карточки (AC, focus-policy.md)',
    async ({ stand }) => {
      const page = await stand('ui-card');

      // Клавиатурный фокус: Tab от предыдущей остановки стенда.
      const linkIndex = await page.evaluate(
        (selector) =>
          [...document.querySelectorAll(selector)].indexOf(
            document.querySelector('#ui-card-link-title'),
          ),
        FOCUSABLE_SELECTOR,
      );
      for (let step = 0; step <= linkIndex; step += 1) {
        await page.keyboard.press('Tab');
      }

      const state = await focusState(page);
      expect(state.id, 'фокус на растянутой ссылке').toBe(CARD.linkTitle);
      expect(state.focusVisible, 'клавиатурный фокус — :focus-visible').toBe(true);
      // Замена локальной обводки: стиль ссылки none — кольцо не рисуется
      // (ширина при этом вычисляется как medium — пиним именно стиль).
      expect(state.outlineStyle, 'локальная обводка ссылки заменена — style none').toBe('none');
      expect(
        parseFloat(state.afterOutlineWidth),
        `AC: контур ::after по всей карточке ≥ 3px (факт ${state.afterOutlineWidth})`,
      ).toBeGreaterThanOrEqual(3);
      expect(state.afterOutlineStyle, 'контур solid').toBe('solid');
      expect(state.afterOutlineColor, 'цвет — focus-тройка (--ui-focus-color)').toBe(
        'rgb(0, 40, 86)',
      );

      // Геометрия: ::after (inset 0 относительно relative-карточки) больше
      // бокса самой ссылки — обводка рисуется по всей карточке.
      const boxes = await page.evaluate(() => {
        const card = document.querySelector('#ui-card-link').getBoundingClientRect();
        const link = document.querySelector('#ui-card-link-title').getBoundingClientRect();
        const after = getComputedStyle(document.querySelector('#ui-card-link-title'), '::after');
        return {
          cardArea: card.width * card.height,
          linkArea: link.width * link.height,
          afterPosition: after.position,
        };
      });
      expect(boxes.afterPosition, '::after позиционирован абсолютно').toBe('absolute');
      expect(
        boxes.cardArea,
        'площадь ::after = карточка: боксов ссылки мало для обводки',
      ).toBeGreaterThan(boxes.linkArea * 2);

      // Enter на растянутой ссылке ведёт как ссылка (одно остановочное место).
      await page.keyboard.press('Enter');
      await expect.poll(() => page.url()).toContain('#ui-card-link');
    },
  );

  standTest(
    'клик-зоны: угол карточки ведёт как ссылка, вложенная кнопка не «продавливается»',
    async ({ stand }) => {
      const page = await stand('ui-card');

      // Клик в верхний правый угол карточки — зона паддинга, далеко от текста
      // ссылки: растянутая ::after-ссылка покрывает ВСЮ карточку.
      const card = page.locator(`#${CARD.link}`);
      await card.scrollIntoViewIfNeeded();
      const box = await card.boundingBox();
      await page.mouse.click(box.x + box.width - 10, box.y + 10);
      await expect.poll(() => page.url()).toContain('#ui-card-link');

      // Вложенная кнопка выше растянутой ссылки (nested-interactive): клик
      // остаётся на кнопке — перехода нет.
      const urlBefore = page.url();
      await page.locator(`#${CARD.linkButton}`).click();
      expect(page.url(), 'клик по кнопке не ведёт по ссылке').toBe(urlBefore);
    },
  );

  standTest(
    'контраст (сквозной с T2.3): текст на surface и surface-muted ≥ 4.5:1',
    async ({ stand }) => {
      const page = await stand('ui-card');

      const assertAA = async (cardId) => {
        const { color, backdrop } = await page
          .locator(`#${cardId} .ui-card__body`)
          .evaluate((el) => ({
            color: getComputedStyle(el).color,
            backdrop: getComputedStyle(el.closest('.ui-card')).backgroundColor,
          }));
        const ratio = contrastRatio(color, backdrop);
        expect(ratio, `${cardId}: ${ratio.toFixed(2)}:1 ≥ 4.5`).toBeGreaterThanOrEqual(4.5);
      };
      await assertAA(CARD.base);
      await assertAA(CARD.filled);
    },
  );

  standTest('axe: нарушения отсутствуют — известных исключений нет (AC)', async ({ stand }) => {
    const page = await stand('ui-card');
    const results = await a11y(page).analyze();
    expect(
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`),
      'axe: violations = []',
    ).toEqual([]);
  });

  standTest('эталоны 375/768/1280/1440 — только из контейнера (ADR-0004)', async ({ stand }) => {
    const page = await stand('ui-card');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-card', viewport });
    }
  });
});

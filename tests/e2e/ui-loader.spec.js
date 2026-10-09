/**
 * e2e ui-loader (T7.5; Testing requirements).
 *
 * Поверхность — стенд showcase/pages/ui-loader (inline + блок + aria-busy-
 * оверлей). Проверяется:
 *  1. роли/текст (AC): состояние загрузки объявляется скринридером —
 *     .ui-loader__text с role="status" и видимым текстом; спиннер — svg
 *     aria-hidden (вне a11y-дерева); правило «не голый спиннер»;
 *  2. анимация вращения в обычном режиме (Implementation requirements п.1)
 *     и размеры sm/md из шкалы (п.2);
 *  3. цвет — currentColor: спиннер наследует цвет контекста (п.2);
 *  4. reduced-motion (AC, Technical considerations): эмуляция
 *     prefers-reduced-motion: reduce — вращения нет (локальное правило
 *     animation: none; kill-switch base/reset — вторая линия), спиннер
 *     остаётся статичной индикацией, текст на месте;
 *  5. aria-busy-паттерн: контейнер aria-busy="true", оверлей --overlay
 *     покрывает контейнер;
 *  6. axe чист — известных исключений нет;
 *  7. эталоны 375/768/1280/1440 — только из контейнера (ADR-0004).
 */
import { expect } from '@playwright/test';

import { a11y, shot, test as standTest, VIEWPORTS } from '../helpers/harness.js';

/** id-селекторы стенда showcase/pages/ui-loader (заданы в разметке стенда). */
const SEL = {
  inlineMd: '#uiloader-inline',
  inlineSm: '#uiloader-inline-sm',
  block: '#uiloader-block',
  busyContainer: '#uiloader-busy',
  busyLoader: '#uiloader-busy-loader',
};

standTest.describe('ui-loader: роли и текст (T7.5)', () => {
  standTest(
    'loader объявляется скринридером: role="status" с текстом, спиннер вне a11y-дерева (AC)',
    async ({ stand }) => {
      const page = await stand('ui-loader');

      const loader = page.locator(SEL.inlineMd);
      await expect(loader).toBeVisible();

      // Состояние объявляется живой областью: role="status" на тексте.
      const status = loader.getByRole('status');
      await expect(status, 'текст статуса найден по роли status').toBeVisible();
      expect(await status.textContent().then((value) => value.trim().length)).toBeGreaterThan(0);

      // Спиннер декоративен: aria-hidden — смысл несёт текст (WCAG 1.1.1).
      const spinner = loader.locator('.ui-loader__spinner');
      await expect(spinner).toHaveAttribute('aria-hidden', 'true');

      // Спиннер — svg (Implementation requirements п.1: «спиннер — svg»).
      await expect(spinner).toHaveJSProperty('tagName', 'svg');

      // Правило «не голый спиннер»: у каждого лоадера стенда есть текст-статус.
      const loaders = page.locator('.ui-loader');
      const count = await loaders.count();
      expect(count, 'лоадеры на стенде есть').toBeGreaterThan(0);
      for (let i = 0; i < count; i += 1) {
        await expect(
          loaders.nth(i).getByRole('status'),
          `лоадер #${i + 1} с текстом`,
        ).toBeVisible();
      }
    },
  );
});

standTest.describe('ui-loader: анимация, размеры, цвет (Implementation requirements)', () => {
  standTest(
    'вращение объявлено: ui-loader-spin, бесконечно',
    async ({ stand }) => {
      const page = await stand('ui-loader');
      const animation = await page.locator(`${SEL.inlineMd} .ui-loader__spinner`).evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          name: style.animationName,
          duration: style.animationDuration,
          iteration: style.animationIterationCount,
        };
      });
      expect(animation.name, 'rotate-анимация применена').toBe('ui-loader-spin');
      expect(animation.iteration, 'вращение бесконечное').toBe('infinite');
      expect(Number.parseFloat(animation.duration), 'период — из токена перехода').toBeGreaterThan(
        0,
      );
    },
  );

  standTest('размеры sm/md — ступени шкалы (md 24px, sm 16px)', async ({ stand }) => {
    const page = await stand('ui-loader');
    const md = await page.locator(`${SEL.inlineMd} .ui-loader__spinner`).evaluate((el) => {
      const box = getComputedStyle(el);
      return { width: parseFloat(box.width), height: parseFloat(box.height) };
    });
    const sm = await page.locator(`${SEL.inlineSm} .ui-loader__spinner`).evaluate((el) => {
      const box = getComputedStyle(el);
      return { width: parseFloat(box.width), height: parseFloat(box.height) };
    });
    expect(md, 'md — --ui-space-5 (24px)').toEqual({ width: 24, height: 24 });
    expect(sm, 'sm — --ui-space-4 (16px)').toEqual({ width: 16, height: 16 });
  });

  standTest('цвет — currentColor: спиннер наследует цвет контекста', async ({ stand }) => {
    const page = await stand('ui-loader');
    // Мьют-контекст стенда: sm-лоадер внутри приглушённой строки.
    const contextColor = await page
      .locator(SEL.inlineSm)
      .evaluate((el) => getComputedStyle(el.parentElement).color);
    const spinnerColor = await page
      .locator(`${SEL.inlineSm} .ui-loader__spinner`)
      .evaluate((el) => getComputedStyle(el).color);
    expect(spinnerColor, 'спиннер красится контекстом, не компонентом').toBe(contextColor);
    expect(
      spinnerColor,
      'контекст стенда действительно приглушён (наследование наблюдаемо)',
    ).not.toBe('rgb(0, 0, 0)');
  });
});

standTest.describe('ui-loader: reduced-motion (AC; Technical considerations)', () => {
  standTest(
    'prefers-reduced-motion: reduce — вращения нет, спиннер остаётся статичной индикацией, текст на месте',
    async ({ stand }) => {
      const page = await stand('ui-loader');
      await page.emulateMedia({ reducedMotion: 'reduce' });

      const state = await page.locator(`${SEL.inlineMd} .ui-loader__spinner`).evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          name: style.animationName,
          duration: style.animationDuration,
          visible: getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0,
        };
      });
      // Двойная проверка в действии: локальное правило (animation: none) —
      // имя анимации снято; глобальный kill-switch base/reset гасит и её.
      expect(state.name, 'локальное правило сняло анимацию').toBe('none');
      expect(state.visible, 'спиннер виден как статичное кольцо (точка-индикатор)').toBe(true);

      await expect(page.locator(`${SEL.inlineMd} .ui-loader__text`)).toBeVisible();
    },
  );
});

standTest.describe('ui-loader: aria-busy-паттерн (Scope)', () => {
  standTest(
    'контейнер aria-busy="true"; оверлей --overlay покрывает контейнер',
    async ({ stand }) => {
      const page = await stand('ui-loader');

      const container = page.locator(SEL.busyContainer);
      await expect(container).toHaveAttribute('aria-busy', 'true');

      const overlay = page.locator(SEL.busyLoader);
      await expect(overlay).toBeVisible();
      const overlayState = await overlay.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          position: style.position,
          top: style.top,
          left: style.left,
          background: style.backgroundColor,
        };
      });
      expect(overlayState.position, 'оверлей — absolute поверх контейнера').toBe('absolute');
      expect(parseFloat(overlayState.top), 'inset: 0 — верх').toBe(0);
      expect(parseFloat(overlayState.left), 'inset: 0 — лево').toBe(0);
      expect(
        overlayState.background,
        'полупрозрачная поверхность (контент читается сквозь)',
      ).toMatch(/rgba\(/);

      // Оверлей покрывает контейнер целиком (геометрия «поверх контента»).
      const outer = await container.boundingBox();
      const inner = await overlay.boundingBox();
      expect(inner.width, 'ширина оверлея = ширине контейнера').toBeCloseTo(outer.width, 0);
      expect(inner.height, 'высота оверлея = высоте контейнера').toBeCloseTo(outer.height, 0);

      // Контент под оверлеем остаётся в DOM (сайт заменит его после загрузки).
      await expect(container.locator('li').first()).toBeAttached();
    },
  );
});

standTest.describe('ui-loader: axe (AC)', () => {
  standTest('стенд чист — известных исключений нет (AC)', async ({ stand }) => {
    const page = await stand('ui-loader');
    // Анализ под reduced-motion (приём ui-tabs): гасит вращение спиннера —
    // axe не анализирует кадры анимации.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const violations = await a11y(page).analyze();
    expect(
      violations.violations.map(
        (violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`,
      ),
      'axe: violations = []',
    ).toEqual([]);
  });
});

standTest.describe('ui-loader: эталоны (AC; ADR-0004 — только контейнер/CI)', () => {
  standTest('стенд — 4 вьюпорта', async ({ stand }) => {
    const page = await stand('ui-loader');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-loader', viewport });
    }
  });
});

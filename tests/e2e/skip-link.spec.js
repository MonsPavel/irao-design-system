/**
 * e2e ui-skip-link (T3.5 — AC + Testing requirements, WCAG 2.4.1 bypass blocks).
 *
 * Поверхность — каркас showcase (единый frame() в showcase/build.mjs):
 * skip-link есть по умолчанию на каждой странице полигона. Проверяется:
 *  1. вне фокуса ссылка недоступна визуально (1px-клип), но доступна
 *     скринридеру (не display:none/visibility:hidden, без aria-hidden) — AC 2;
 *  2. первый Tab любой страницы каркаса — фокус на skip-link (AC 1; AC 3;
 *     EPIC-3 AC «первый Tab на любом стенде — skip-link»); в фокусе —
 *     видимая фиксированная плашка top-left на z-лестнице (--ui-z-overlay)
 *     в паре токенов primary/text-on-dark;
 *  3. Enter — хэш #main и фокус РЕАЛЬНО внутри main (Testing requirements:
 *     assert(activeElement внутри main)) — AC 1. Цель в каркасе несёт
 *     tabindex="-1": зонд chromium 2026-10-06 показал, что без него Enter
 *     меняет хэш, но activeElement уходит на body (Safari-кейс переноса
 *     фокуса, Implementation requirements п.2);
 *  4. после переноса фокус покинул ссылку — плашка скрылась обратно в клип;
 *  5. axe чист на стенде ui-skip-link; скриншоты плашки — эталоны только
 *     из контейнера/CI (ADR-0004).
 *
 * WebKit/Safari: по умолчанию Tab не встаёт на ссылки (нужен Option+Tab —
 * системная настройка полного клавиатурного доступа; зафиксировано зондом
 * 2026-10-06: первый Tab в webkit попадает в select каркаса, минуя ссылки).
 * Сценарии Tab-обхода помечены skip на webkit с этим основанием;
 * chromium — PR-гейт (`npm test`), firefox — матрица.
 */
import { expect } from '@playwright/test';

import { a11y, openIndex, shot, test as standTest, VIEWPORTS } from '../helpers/harness.js';

/** Состояние skip-link каркаса (первый якорь body) — computed + геометрия. */
const skipState = (page) =>
  page.evaluate(() => {
    const el = document.body.querySelector(':scope > a.ui-skip-link');
    const computed = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      display: computed.display,
      visibility: computed.visibility,
      ariaHidden: el.getAttribute('aria-hidden'),
      width: computed.width,
      height: computed.height,
      overflow: computed.overflow,
      clipPath: computed.clipPath,
      position: computed.position,
      top: computed.top,
      left: computed.left,
      zIndex: computed.zIndex,
      backgroundColor: computed.backgroundColor,
      color: computed.color,
      rectWidth: rect.width,
      rectHeight: rect.height,
      focusVisible: el.matches(':focus-visible'),
    };
  });

/** Куда реально указывает фокус клавиатуры (+ хэш после активации). */
const focusState = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    return {
      tag: el.tagName.toLowerCase(),
      cls: el.className,
      href: el.getAttribute('href'),
      insideMain: el.closest('main') !== null,
      isMainTarget: el.id === 'main',
      hash: location.hash,
      focusVisible: el.matches(':focus-visible'),
    };
  });

standTest.describe('ui-skip-link (T3.5, WCAG 2.4.1)', () => {
  standTest(
    'вне фокуса: 1px-клип — визуально недоступна, скринридеру доступна (AC 2)',
    async ({ stand }) => {
      const page = await stand('base');
      const state = await skipState(page);

      // Визуально: 1px-клип (Implementation requirements п.1).
      expect(state.width, 'клип до фокуса — ширина 1px').toBe('1px');
      expect(state.height, 'клип до фокуса — высота 1px').toBe('1px');
      expect(state.overflow).toBe('hidden');
      expect(state.clipPath, 'clip-path inset(50%) — невидим целиком').toBe('inset(50%)');
      expect(state.rectWidth).toBeLessThanOrEqual(1);

      // Скринридеру: не выкинута из дерева доступности.
      expect(state.display, 'не display:none — элемент в дереве доступности').not.toBe('none');
      expect(state.visibility).not.toBe('hidden');
      expect(state.ariaHidden, 'без aria-hidden').toBeNull();
    },
  );

  standTest.describe('первый Tab — фокус на skip-link (AC 1, AC 3)', () => {
    standTest.skip(
      ({ browser }) => browser.browserType().name() === 'webkit',
      'WebKit/Safari по умолчанию не даёт Tab на ссылки (Option+Tab) — поведение браузера, не разметки; см. шапку файла',
    );

    standTest('индекс showcase', async ({ page }) => {
      const page_ = await openIndex(page);
      await page_.keyboard.press('Tab');
      const focus = await focusState(page_);
      expect(focus.tag, 'фокус на якоре').toBe('a');
      expect(focus.cls, 'это skip-link каркаса').toContain('ui-skip-link');
      expect(focus.href).toBe('#main');
      expect(focus.focusVisible, 'клавиатурный фокус подсвечен политикой ADR-0001').toBe(true);
    });

    standTest('стенды base и ui-skip-link', async ({ stand }) => {
      for (const name of ['base', 'ui-skip-link']) {
        const page = await stand(name);
        await page.keyboard.press('Tab');
        const focus = await focusState(page);
        expect(focus.tag, `${name}: фокус на якоре`).toBe('a');
        expect(focus.cls, `${name}: это skip-link каркаса`).toContain('ui-skip-link');
        expect(focus.href, `${name}: цель — #main`).toBe('#main');
      }
    });

    standTest(
      'в фокусе — видимая fixed-плашка top-left на --ui-z-overlay (Technical considerations)',
      async ({ stand }) => {
        const page = await stand('base');
        await page.keyboard.press('Tab');
        const state = await skipState(page);

        expect(state.position, 'плашка фиксирована').toBe('fixed');
        expect(state.top).toBe('0px');
        expect(state.left).toBe('0px');
        expect(state.zIndex, 'z-index — уровень --ui-z-overlay (200)').toBe('200');
        expect(state.width, 'клип снят — плашка размером с текст').not.toBe('1px');
        expect(state.rectWidth).toBeGreaterThan(40);
        expect(state.rectHeight).toBeGreaterThan(24);
        expect(state.backgroundColor, 'фон — --ui-color-primary (#002856)').toBe('rgb(0, 40, 86)');
        expect(state.color, 'текст — --ui-color-text-on-dark (#fff)').toBe('rgb(255, 255, 255)');
      },
    );

    // Tab→Enter — продолжение сценария первого Tab (начинается с Tab на
    // skip-link): наследует webkit-skip describe'а (Safari/WebKit по
    // умолчанию не даёт Tab на ссылки — Option+Tab, поведение браузера).
    standTest(
      'Tab→Enter: фокус реально внутри #main, плашка скрылась (AC 1; Testing requirements)',
      async ({ stand }) => {
        const page = await stand('base');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');

        const focus = await focusState(page);
        expect(focus.hash, 'переход по якорю совершен').toBe('#main');
        expect(
          focus.isMainTarget || focus.insideMain,
          'AC/Testing requirements: activeElement внутри main',
        ).toBe(true);

        const state = await skipState(page);
        expect(
          state.rectWidth,
          'фокус покинул ссылку — плашка скрылась в 1px-клип',
        ).toBeLessThanOrEqual(1);
      },
    );
  });

  standTest('axe чист на стенде ui-skip-link', async ({ stand }) => {
    const page = await stand('ui-skip-link');
    const results = await a11y(page).analyze();
    expect(results.violations).toEqual([]);
  });

  standTest(
    'эталоны плашки в фокусе 375/768/1280/1440 — только из контейнера (ADR-0004)',
    async ({ stand }) => {
      const page = await stand('ui-skip-link');
      await page.keyboard.press('Tab');
      for (const viewport of Object.keys(VIEWPORTS)) {
        await shot(page, { name: 'skip-link-focus', viewport });
      }
    },
  );
});

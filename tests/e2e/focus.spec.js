/**
 * e2e политики фокуса (T3.2 — AC + Testing requirements, ADR-0001).
 *
 * Поверхность — стенд base (/showcase/dist/stands/base.html, генерируется
 * showcase/build.mjs из showcase/pages/base/index.html): все 7 целей
 * селекторного списка base/focus.css на одной странице.
 *
 * Проверяется:
 *  1. Tab-обход стенда: каждый сфокусированный элемент — в состоянии
 *     :focus-visible, computed outline-width ≥ 2px (AC), стиль solid;
 *     обход встречает все 7 целей политики (a, button, input, select,
 *     textarea, summary, [tabindex]);
 *  2. «legacy-атака» (AC): инжект `a { outline: none }` ПОСЛЕ ui-core —
 *     фокус на ссылке всё ещё виден; вторая атака — ДО ui-core: ADR-0001
 *     побеждает tag-правило 0-0-1 независимо от порядка каскада
 *     (специфичность «элемент+:focus-visible» = 0-1-1). Попутно пин
 *     var-цепочки цвета: computed = rgb(0, 40, 86) — --ui-focus-color →
 *     --ui-color-primary → --ui-blue-800;
 *  3. смена темы (механизм T2.4, select каркаса без перезагрузки) меняет
 *     цвет фокуса без правки base: --ui-focus-color → --ui-orange-400
 *     (сквозной сценарий с T2.4, Implementation requirements T3.2 п.2);
 *  4. axe чист на стенде; скриншот focus-состояния — эталон только из
 *     контейнера/CI (ADR-0004).
 */
import { expect } from '@playwright/test';

import { a11y, shot, test as standTest } from '../helpers/harness.js';

/** Всё, что получает фокус с клавиатуры на стенде (цели политики + каркас). */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]';

/** Состояние фокуса: цель, :focus-visible и computed outline активного элемента. */
const focusState = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    const computed = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      hasTabindex: el.hasAttribute('tabindex'),
      focusVisible: el.matches(':focus-visible'),
      outlineWidth: computed.outlineWidth,
      outlineStyle: computed.outlineStyle,
      outlineColor: computed.outlineColor,
    };
  });

/** Инжект legacy-правила: style-узел первым/последним в <head>. */
const injectAttack = (page, position) =>
  page.evaluate(({ selector, css }) => {
    const style = document.createElement('style');
    style.textContent = css;
    document.head[selector](style);
    return document.head.querySelector('style') !== null;
  }, position);

standTest.describe('политика фокуса (T3.2, ADR-0001)', () => {
  standTest(
    'Tab-обход стенда base: у каждого сфокусированного элемента computed outline-width ≥ 2px',
    async ({ stand }) => {
      const page = await stand('base');

      const focusable = await page.evaluate(
        (selector) => document.querySelectorAll(selector).length,
        FOCUSABLE_SELECTOR,
      );
      expect(focusable, 'на стенде есть интерактивные элементы').toBeGreaterThan(5);

      const visited = [];
      for (let step = 0; step < focusable; step += 1) {
        await page.keyboard.press('Tab');
        const state = await focusState(page);
        expect(state.tag, `шаг ${step + 1}: фокус на элементе, не ушёл в body`).not.toBe('body');
        visited.push(state);
      }
      expect(visited).toHaveLength(focusable);

      for (const [index, state] of visited.entries()) {
        const where = `шаг ${index + 1} (<${state.tag}>)`;
        expect(state.focusVisible, `${where}: :focus-visible применён`).toBe(true);
        expect(
          parseFloat(state.outlineWidth),
          `${where}: AC — computed outline-width ≥ 2px (факт ${state.outlineWidth})`,
        ).toBeGreaterThanOrEqual(2);
        expect(state.outlineStyle, `${where}: outline solid`).toBe('solid');
      }

      // Обход встретил каждую из 7 целей селекторного списка ADR-0001.
      const tags = new Set(visited.map((state) => state.tag));
      for (const target of ['a', 'button', 'input', 'select', 'textarea', 'summary']) {
        expect(tags.has(target), `цель <${target}> получила фокус в обходе`).toBe(true);
      }
      expect(
        visited.some((state) => state.hasTabindex),
        'цель [tabindex] получила фокус в обходе',
      ).toBe(true);
    },
  );

  standTest(
    'legacy-атака: a { outline: none } после ui-core — фокус на ссылке всё ещё виден',
    async ({ stand }) => {
      const page = await stand('base');

      // Атака №1 — строго ПОСЛЕ ui-core: <style> последним узлом <head>
      // (ui-core подключён линками выше). Ровно сценарий ADR-0001: система
      // грузится первой, legacy-CSS сайта — после.
      await injectAttack(page, { selector: 'appendChild', css: 'a { outline: none }' });
      expect(
        await page.evaluate(() => document.head.lastElementChild.tagName),
        'атака стоит после ui-core в каскаде',
      ).toBe('STYLE');

      await page.keyboard.press('Tab');
      const after = await focusState(page);
      expect(after.tag, 'первый Tab — ссылка (skip-link каркаса)').toBe('a');
      expect(after.focusVisible, 'клавиатурный фокус подсвечен').toBe(true);
      expect(
        parseFloat(after.outlineWidth),
        `AC legacy-атаки: computed outline-width ≥ 2px (факт ${after.outlineWidth})`,
      ).toBeGreaterThanOrEqual(2);
      expect(after.outlineStyle, 'outline не «none» — solid').toBe('solid');
      expect(
        after.outlineColor,
        'цвет — var-цепочка слоя 2: --ui-focus-color → --ui-color-primary → --ui-blue-800',
      ).toBe('rgb(0, 40, 86)');

      // Атака №2 — ДО ui-core (первым узлом <head>): ADR-0001 гарантирует
      // победу «независимо от порядка подключения» — 0-1-1 против 0-0-1.
      await injectAttack(page, { selector: 'prepend', css: 'a { outline: none }' });
      expect(
        await page.evaluate(() => document.head.firstElementChild.tagName),
        'вторая атака стоит до ui-core в каскаде',
      ).toBe('STYLE');

      await page.evaluate(() => document.activeElement.blur());
      await page.keyboard.press('Tab');
      const before = await focusState(page);
      expect(before.tag, 'снова ссылка').toBe('a');
      expect(
        parseFloat(before.outlineWidth),
        `фокус виден и при атаке до ui-core (факт ${before.outlineWidth})`,
      ).toBeGreaterThanOrEqual(2);
      expect(before.outlineStyle).toBe('solid');
    },
  );

  standTest(
    'смена темы (?theme=test) меняет цвет фокуса — сквозной сценарий с T2.4',
    async ({ stand }) => {
      const page = await stand('base');
      await page.keyboard.press('Tab'); // фокус на ссылке

      const before = await focusState(page);
      expect(before.tag).toBe('a');
      expect(before.outlineColor, 'дефолт: --ui-focus-color = primary #002856').toBe(
        'rgb(0, 40, 86)',
      );

      // Механизм T2.4 (как в derived-states.spec.js): select каркаса ставит
      // data-ui-theme="test" на <html> и подключает dist/themes/theme-test.css
      // без перезагрузки страницы.
      await page.selectOption('#ui-showcase-theme', 'test');
      await expect(page.locator('html')).toHaveAttribute('data-ui-theme', 'test');

      // Тема переопределила --ui-focus-color (--ui-orange-400 #f37131):
      // браузер пересчитывает computed outline сам, base/focus.css не меняется.
      await expect
        .poll(() => focusState(page), { timeout: 5000 })
        .toMatchObject({ tag: 'a', outlineColor: 'rgb(243, 113, 49)' });
      const themed = await focusState(page);
      expect(
        parseFloat(themed.outlineWidth),
        'геометрия фокуса при смене темы не теряется',
      ).toBeGreaterThanOrEqual(2);
    },
  );

  standTest('axe чист на стенде base', async ({ stand }) => {
    const page = await stand('base');
    const results = await a11y(page).analyze();
    expect(results.violations).toEqual([]);
  });

  standTest(
    'скриншот focus-состояния — эталон только из контейнера (ADR-0004)',
    async ({ stand }) => {
      const page = await stand('base');
      await page.keyboard.press('Tab'); // :focus-visible на первом интерактивном
      await shot(page, { name: 'focus-visible', viewport: 'desktop' });
    },
  );
});

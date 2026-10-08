/**
 * e2e ui-pagination (T6.3; Testing requirements + AC).
 *
 * Поверхность — стенд showcase/pages/ui-pagination с четырьмя сценариями:
 * #uipag-full — полный список (20 страниц, окно с «…»: 1 … 6 7 8 … 20,
 * текущая в середине); #uipag-short — короткий список без пропусков
 * (3 страницы, текущая 2 — все стрелки доступны); #uipag-first /
 * #uipag-last — краевые (3 страницы, текущая 1/3 — недоступна стрелка
 * назад/вперёд: button[disabled]). Проверяется:
 *  1. семантика (AC): лендмарка nav с уникальным конвенционным именем;
 *     текущая — span + aria-current="page", ровно одна на инстанс;
 *     «…» — span aria-hidden; страницы-ссылки с именами «Страница N»;
 *  2. Tab-порядок осмысленный (AC): обход = DOM/визуальный порядок
 *     (стрелка назад → страницы → стрелка вперёд), текущая — не остановка
 *     Tab (span), фокус-обводка — глобальная политика ADR-0001;
 *  3. недоступные стрелки (AC): button[disabled] нативно не фокусируется
 *     (Tab пропускает, программный фокус не берётся) и не кликается (клик
 *     не навигирует);
 *  4. touch-цели ≥ 44×44 (Implementation requirements п.1): boundingBox
 *     всех страниц и стрелок всех сценариев;
 *  5. hover — пара одобренного дизайна blue-100 под (hover: hover); у
 *     текущей hover-поверхность не меняется (career-portal
 *     components.css:250/252); disabled hover не получает (pointer-events);
 *  6. axe чист (AC) — известных исключений нет;
 *  7. эталоны 375/768/1280/1440 + фокус-состояние на desktop — только из
 *     контейнера/CI (ADR-0004).
 *
 * Без-JS-поведение компонента (AC EPIC-6) — по построению: пагинация —
 * обычные ссылки (переходы серверные), JS-модуля у компонента нет
 * (юнит-пин: data-ui-* в разметке нет), отдельный no-JS контекст не
 * требуется.
 */
import { expect } from '@playwright/test';

import { a11y, shot, test, VIEWPORTS } from '../helpers/harness.js';

/** Идентификаторы стендов-сценариев (showcase/pages/ui-pagination/index.html). */
const PAG = {
  full: 'uipag-full',
  short: 'uipag-short',
  first: 'uipag-first',
  last: 'uipag-last',
};

/** Интерактивные элементы одной навигации в DOM-порядке (= Tab-порядок). */
const tabsOf = (page, id) => page.locator(`#${id} a, #${id} button`);

/** Tab-обход до элемента (фокус с клавиатуры — :focus-visible, ADR-0001). */
async function tabTo(page, locator) {
  for (let step = 0; step < 60; step += 1) {
    if (await locator.evaluate((el) => el.matches(':focus-visible'))) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('фокус не дошёл до элемента за 60 Tab');
}

/** Ожидание устоявшегося computed-цвета (переходы --ui-transition не гасим —
 *  hover-поверхность и есть поверхность проверки; урок ui-button: кадры
 *  перехода сериализуются иначе устоявшегося значения). */
const settledColor = (locator, expected) =>
  expect
    .poll(() => locator.evaluate((el) => getComputedStyle(el).backgroundColor), {
      timeout: 3000,
    })
    .toBe(expected);

test.describe('ui-pagination: семантика (T6.3)', () => {
  test('лендмарки nav с уникальными конвенционными именами; текущая — span + aria-current="page", ровно одна на инстанс', async ({
    stand,
  }) => {
    const page = await stand('ui-pagination');

    for (const [id, currentText] of [
      [PAG.full, '7'],
      [PAG.short, '2'],
      [PAG.first, '1'],
      [PAG.last, '3'],
    ]) {
      const nav = page.locator(`#${id}`);
      await expect(nav, `${id}: лендмарка`).toHaveAttribute('aria-label', /Пагинация/);

      const current = nav.locator(".ui-pagination__page[aria-current='page']");
      await expect(current, `${id}: ровно одна текущая`).toHaveCount(1);
      await expect(current, `${id}: текущая — span, не ссылка`).toHaveJSProperty('tagName', 'SPAN');
      expect(await current.textContent(), `${id}: текст текущей`).toBe(currentText);

      const links = nav.locator('a.ui-pagination__page');
      const count = await links.count();
      expect(count, `${id}: страницы-ссылки есть`).toBeGreaterThan(0);
      for (let i = 0; i < count; i += 1) {
        await expect(links.nth(i), `${id}: имя ссылки-страницы`).toHaveAttribute(
          'aria-label',
          /^Страница \d+$/,
        );
      }

      const ellipsis = nav.locator('.ui-pagination__ellipsis');
      expect(await ellipsis.count(), `${id}: «…» только в полном сценарии (2 пропуска)`).toBe(
        id === PAG.full ? 2 : 0,
      );
      if ((await ellipsis.count()) > 0) {
        await expect(ellipsis.first(), `${id}: «…» декоративна`).toHaveAttribute(
          'aria-hidden',
          'true',
        );
      }
    }
  });

  test('полный сценарий: окно страниц с «…» — края и окно текущей в DOM, пропуски сверены (контракт сниппета)', async ({
    stand,
  }) => {
    const page = await stand('ui-pagination');

    const nav = page.locator(`#${PAG.full}`);
    const rendered = await nav.evaluate((el) =>
      [...el.children].map((child) => {
        if (child.classList.contains('ui-pagination__ellipsis')) return '…';
        if (child.classList.contains('ui-pagination__arrow')) {
          return child.getAttribute('aria-label') === 'Предыдущая страница' ? '←' : '→';
        }
        const n = child.textContent.trim();
        if (
          child.classList.contains('ui-pagination__page') &&
          child.matches("[aria-current='page']")
        ) {
          return `${n}*`;
        }
        return n;
      }),
    );
    expect(rendered, '20 страниц, текущая 7: ← 1 … 6 7 8 … 20 →').toEqual([
      '←',
      '1',
      '…',
      '6',
      '7*',
      '8',
      '…',
      '20',
      '→',
    ]);
  });

  test('стрелки носят доступные имена (Technical considerations): не пустые глифы; глифы — svg aria-hidden', async ({
    stand,
  }) => {
    const page = await stand('ui-pagination');

    for (const id of [PAG.full, PAG.short, PAG.first, PAG.last]) {
      const nav = page.locator(`#${id}`);
      await expect(nav.locator('[aria-label="Предыдущая страница"]').first()).toBeAttached();
      await expect(nav.locator('[aria-label="Следующая страница"]').first()).toBeAttached();
      const svgs = nav.locator('svg[aria-hidden="true"]');
      expect(await svgs.count(), `${id}: оба глифа декоративны`).toBeGreaterThanOrEqual(2);
    }
  });
});

test.describe('ui-pagination: клавиатура и недоступные стрелки (T6.3)', () => {
  test('Tab-порядок осмысленный (AC): стрелка назад → страницы по порядку → стрелка вперёд; фокус-обводка — политика ADR-0001', async ({
    stand,
  }) => {
    const page = await stand('ui-pagination');

    const items = tabsOf(page, PAG.short);
    // Короткий сценарий (3 страницы, текущая 2 — span): Назад → Страница 1 →
    // Страница 3 → Вперёд. Порядок Tab = порядок DOM = визуальный порядок.
    const expected = ['Предыдущая страница', 'Страница 1', 'Страница 3', 'Следующая страница'];

    for (let i = 0; i < expected.length; i += 1) {
      await tabTo(page, items.nth(i));
      await expect(items.nth(i), `Tab ${i + 1} — ${expected[i]}`).toBeFocused();
      const ring = await items.nth(i).evaluate((el) => el.matches(':focus-visible'));
      expect(ring, `фокус с клавиатуры (focus-visible) на «${expected[i]}»`).toBe(true);
    }

    // Текущая страница (span) — не остановка Tab.
    await expect(
      page.locator(`#${PAG.short} .ui-pagination__page[aria-current='page']`),
    ).not.toBeFocused();
  });

  test('текущая страница — не остановка Tab (полный сценарий: после «Страницы 6» фокус сразу на «Странице 8»)', async ({
    stand,
  }) => {
    const page = await stand('ui-pagination');

    const items = tabsOf(page, PAG.full);
    // Стопы полного сценария: Назад, 1, 6, [7 — span], 8, Вперёд.
    await tabTo(page, items.nth(3));
    await expect(
      items.nth(3),
      'четвёртый таб-стоп — «Страница 8» (текущая 7 пропущена)',
    ).toHaveAttribute('aria-label', 'Страница 8');
  });

  test('первая страница (AC): «Назад» disabled — нативно не фокусируется и не кликается; Tab её пропускает', async ({
    stand,
  }) => {
    const page = await stand('ui-pagination');

    const nav = page.locator(`#${PAG.first}`);
    const prev = nav.locator('button[disabled][aria-label="Предыдущая страница"]');
    await expect(prev, 'недоступная стрелка — button[disabled]').toHaveCount(1);
    await expect(prev).toBeDisabled();

    // Не фокусируется: программный фокус не берётся (нативный disabled).
    await prev.focus();
    await expect(prev).not.toBeFocused();

    // Не кликается: клик по disabled не навигирует (location не меняется).
    const urlBefore = page.url();
    await prev.click({ force: true });
    expect(page.url(), 'клик по disabled не навигирует').toBe(urlBefore);

    // Из Tab-порядка исключена: Tab с «Страницы 2» уходит сразу на «Страницу 3»
    // (DOM: [disabled Назад] [1 — span] [2] [3] [Вперёд]).
    await tabTo(page, nav.locator('a[aria-label="Страница 2"]'));
    await page.keyboard.press('Tab');
    await expect(
      nav.locator('a[aria-label="Страница 3"]'),
      'disabled пропущен Tab-ом',
    ).toBeFocused();

    // Встречная стрелка доступна (не disabled).
    await expect(nav.locator('a[aria-label="Следующая страница"]')).toBeAttached();
  });

  test('последняя страница (AC): «Вперёд» disabled — нативно не фокусируется и не кликается', async ({
    stand,
  }) => {
    const page = await stand('ui-pagination');

    const nav = page.locator(`#${PAG.last}`);
    const next = nav.locator('button[disabled][aria-label="Следующая страница"]');
    await expect(next, 'недоступная стрелка — button[disabled]').toHaveCount(1);
    await expect(next).toBeDisabled();

    await next.focus();
    await expect(next).not.toBeFocused();

    const urlBefore = page.url();
    await next.click({ force: true });
    expect(page.url(), 'клик по disabled не навигирует').toBe(urlBefore);

    await expect(nav.locator('a[aria-label="Предыдущая страница"]')).toBeAttached();
  });
});

test.describe('ui-pagination: touch-цели и состояния (T6.3)', () => {
  test('touch-цели ≥ 44×44 (Implementation requirements п.1): boundingBox всех страниц и стрелок', async ({
    stand,
  }) => {
    const page = await stand('ui-pagination');

    for (const id of [PAG.full, PAG.short, PAG.first, PAG.last]) {
      const items = page.locator(`#${id} .ui-pagination__page, #${id} .ui-pagination__arrow`);
      const count = await items.count();
      expect(count, `${id}: элементы есть`).toBeGreaterThan(0);
      for (let i = 0; i < count; i += 1) {
        const box = await items.nth(i).boundingBox();
        expect(box, `${id} [${i}]: boundingBox`).toBeTruthy();
        expect(box.width, `${id} [${i}]: ширина ≥ 44`).toBeGreaterThanOrEqual(44);
        expect(box.height, `${id} [${i}]: высота ≥ 44`).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('hover — пара одобренного дизайна (--ui-color-surface-hover); у текущей hover-поверхность не меняется; disabled hover не получает', async ({
    stand,
  }) => {
    const page = await stand('ui-pagination');

    const nav = page.locator(`#${PAG.short}`);
    const page1 = nav.locator('a[aria-label="Страница 1"]');
    await page1.hover();
    // hover страницы — blue-100 (career-portal components.css:250).
    await settledColor(page1, 'rgb(232, 238, 254)');

    const current = nav.locator(".ui-pagination__page[aria-current='page']");
    await current.hover();
    // У текущей hover не меняет заливку primary (components.css:252).
    await settledColor(current, 'rgb(0, 40, 86)');

    const disabled = page.locator(`#${PAG.first} button[disabled]`);
    await disabled.hover({ force: true });
    // disabled стрелка hover-поверхность не получает (pointer-events: none).
    await settledColor(disabled, 'rgba(0, 0, 0, 0)');
  });
});

test.describe('ui-pagination: axe и эталоны (T6.3)', () => {
  test('axe: стенд чист — известных исключений нет (AC)', async ({ stand }) => {
    const page = await stand('ui-pagination');
    const results = await a11y(page).analyze();
    expect(
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`),
      'axe: violations = []',
    ).toEqual([]);
  });

  test('эталоны ui-pagination 375/768/1280/1440 — только из контейнера (ADR-0004)', async ({
    stand,
  }) => {
    const page = await stand('ui-pagination');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-pagination', viewport });
    }
  });

  test('эталон фокус-состояния на desktop — клавиатурный Tab до «Страницы 1» (ADR-0004)', async ({
    stand,
  }) => {
    const page = await stand('ui-pagination');

    const items = tabsOf(page, PAG.short);
    await tabTo(page, items.nth(1)); // «Страница 1» короткого сценария
    await expect(items.nth(1)).toBeFocused();

    await shot(page, { name: 'ui-pagination-focus', viewport: 'desktop' });
  });
});

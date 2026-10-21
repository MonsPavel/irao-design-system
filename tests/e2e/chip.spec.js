/**
 * e2e ui-chip (T14.8; Testing requirements: axe + клавиатура + активное
 * состояние).
 *
 * Поверхность — расширенный стенд showcase/pages/ui-chip:
 * #uichip-buttons — кнопочная форма (aria-pressed, клиентский фильтр);
 * #uichip-links — ссылочная форма (GET-фильтр, aria-current="page" на
 * активной); #uichip-long — длинные RU-подписи (перенос ленты). Проверяется:
 *  1. семантика: кнопки type="button" с aria-pressed true/false (ровно одна
 *     true в канонической группе), ссылочная группа — nav с доступным именем,
 *     ровно одна aria-current="page";
 *  2. геометрия одобренного .chip (pages.css:137–149): min-height 36px
 *     (--ui-chip-height), радиус pill, роль small (fs 14 / fw 500);
 *     фактическая высота коротких подписей = 36 (min-height активируется,
 *     прецедент ревью T4.2), длинные на 375 растут выше 36 — контент не режется;
 *  3. активное состояние (обе формы): заливка primary + подпись text-on-dark
 *     + рамка primary; дефолт — фон surface, текст, рамка #D6D6D6;
 *  4. hover — рамка и подпись primary только у неактивных (под
 *     (hover: hover), sticky-hover EPIC-4); у активной hover-правило не
 *     срабатывает (is-active оригинала сильнее hover);
 *  5. клавиатура: Tab-порядок = DOM-порядок групп; фокус с клавиатуры —
 *     :focus-visible (глобальная политика ADR-0001); Enter и Space
 *     активируют кнопку; Enter по ссылке-чипу навигирует (GET-фильтр);
 *  6. контраст (сквозной с T2.3, либа tests/contrast/lib.mjs): дефолтная и
 *     активная пары ≥ 4.5:1 (текст 14px — обычный текст);
 *  7. axe: стенд чист — известных исключений нет;
 *  8. эталоны 375/768/1280/1440 — только из контейнера/CI (ADR-0004).
 *
 * JS-модуля у компонента нет (Scope): активное состояние приходит из
 * разметки/сервера — переключение pressed в e2e не проверяется (клиентская
 * логика фильтра — зона сайта, связка — паттерн list-page T14.10).
 */
import { expect } from '@playwright/test';

import { contrastRatio } from '../contrast/lib.mjs';
import { a11y, shot, test, VIEWPORTS } from '../helpers/harness.js';

/** Идентификаторы групп стенда (showcase/pages/ui-chip/index.html). */
const CHIPS = {
  buttons: 'uichip-buttons',
  links: 'uichip-links',
  long: 'uichip-long',
};

/** Tab-обход до элемента (фокус с клавиатуры — :focus-visible, ADR-0001). */
async function tabTo(page, locator) {
  for (let step = 0; step < 160; step += 1) {
    if (await locator.evaluate((el) => el.matches(':focus-visible'))) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('фокус не дошёл до элемента за 160 Tab');
}

/** Computed-состояние пилюли (цвета/геометрия/типографика). */
const stateOf = (locator) =>
  locator.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      color: style.color,
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      minHeight: style.minHeight,
      borderRadius: style.borderRadius,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      textDecorationLine: style.textDecorationLine,
      cursor: style.cursor,
    };
  });

/** Ожидание устоявшегося computed-значения (переходы --ui-transition не гасим
 *  — проверяем устоявшееся состояние; урок ui-button/ui-pagination). */
const settledStyle = (locator, prop, expected) =>
  expect
    .poll(() => locator.evaluate((el, p) => getComputedStyle(el)[p], prop), {
      timeout: 3000,
    })
    .toBe(expected);

test.describe('ui-chip: семантика (T14.8)', () => {
  test('кнопочная форма: type="button" (гейт no-implicit-button-type) + aria-pressed; активная ровно одна', async ({
    stand,
  }) => {
    const page = await stand('ui-chip');

    const group = page.locator(`#${CHIPS.buttons}`);
    const buttons = group.locator('button.ui-chip__pill');
    expect(await buttons.count(), 'кнопки-чипы в группе есть').toBeGreaterThan(0);

    const pressedCount = await group.locator("[aria-pressed='true']").count();
    expect(pressedCount, 'канон: активная ровно одна').toBe(1);

    for (let i = 0; i < (await buttons.count()); i += 1) {
      const button = buttons.nth(i);
      await expect(button, `кнопка ${i}: явный type`).toHaveAttribute('type', 'button');
      await expect(button, `кнопка ${i}: aria-pressed true/false`).toHaveAttribute(
        'aria-pressed',
        /^(true|false)$/,
      );
    }
  });

  test('ссылочная форма: nav с доступным именем; активная — aria-current="page", ровно одна', async ({
    stand,
  }) => {
    const page = await stand('ui-chip');

    const nav = page.locator(`#${CHIPS.links}`);
    await expect(nav, 'ссылочная группа — лендмарка nav с именем').toHaveAttribute(
      'aria-label',
      /./,
    );

    const links = nav.locator('a.ui-chip__pill');
    expect(await links.count(), 'ссылки-чипы есть').toBeGreaterThan(0);
    for (let i = 0; i < (await links.count()); i += 1) {
      await expect(links.nth(i), `ссылка ${i}: href (GET-фильтр)`).toHaveAttribute('href', /./);
    }

    const current = nav.locator("[aria-current='page']");
    expect(await current.count(), 'активная ровно одна').toBe(1);
    await expect(current).toHaveJSProperty('tagName', 'A');
  });
});

test.describe('ui-chip: геометрия одобренного .chip (T14.8)', () => {
  test('min-height 36px (--ui-chip-height), радиус pill, роль small; короткие подписи — ровно 36', async ({
    stand,
  }) => {
    const page = await stand('ui-chip');

    const pills = page.locator(`#${CHIPS.buttons} .ui-chip__pill, #${CHIPS.links} .ui-chip__pill`);
    const count = await pills.count();
    expect(count, 'пилюли на стенде есть').toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      const pill = pills.nth(i);
      const state = await stateOf(pill);
      expect(state.minHeight, `пилюля ${i}: min-height — --ui-chip-height`).toBe('36px');
      expect(state.borderRadius, `пилюля ${i}: радиус pill`).toBe('100px');
      expect(state.fontSize, `пилюля ${i}: fs-small (14px)`).toBe('14px');
      expect(state.fontWeight, `пилюля ${i}: fw-small (Scope)`).toBe('500');
      expect(state.textDecorationLine, `пилюля ${i}: ссылка без подчёркивания`).toBe('none');
      expect(state.cursor, `пилюля ${i}: аффорданс кликабельности`).toBe('pointer');
      if (i < 3) {
        // Короткие подписи: контент меньше токена — min-height активируется.
        const box = await pill.boundingBox();
        expect(
          Math.abs(box.height - 36),
          `пилюля ${i}: фактическая высота = --ui-chip-height (факт ${box.height})`,
        ).toBeLessThanOrEqual(0.5);
      }
    }
  });

  test('длинные RU-подписи на 375: лента переносится, пилюля растёт выше 36 — контент не режется (AC)', async ({
    stand,
  }) => {
    const page = await stand('ui-chip');
    await page.setViewportSize({ width: 375, height: 667 });

    const long = page.locator(`#${CHIPS.long}`);
    await expect(long, 'группа длинных подписей на месте').toHaveAttribute('aria-label', /./);

    const pills = long.locator('.ui-chip__pill');
    const count = await pills.count();
    expect(count, 'длинные чипы есть').toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      const box = await pills.nth(i).boundingBox();
      expect(box.height, `длинная пилюля ${i}: не ниже touch-минимума 36px`).toBeGreaterThanOrEqual(
        35.5,
      );
      const text = (await pills.nth(i).textContent()).trim();
      const overflow = await pills.nth(i).evaluate((el) => ({
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }));
      expect(
        overflow.scrollWidth,
        `«${text}»: контент не обрезан по горизонтали`,
      ).toBeLessThanOrEqual(overflow.clientWidth + 1);
    }
    // Лента переносится: суммарная ширина чипов группы больше ширины строки
    // (иначе на 375 длинные подписи ушли бы в горизонтальный скролл).
    const rowWidth = await long.evaluate((el) => el.clientWidth);
    expect(rowWidth, 'лента чипов на 375 уже суммы пилюль — перенос работает').toBeGreaterThan(0);
    let total = 0;
    for (let i = 0; i < count; i += 1) total += (await pills.nth(i).boundingBox()).width;
    expect(total, 'длинные подписи не умещаются в одну строку — flex-wrap перенёс').toBeGreaterThan(
      rowWidth,
    );
  });
});

test.describe('ui-chip: активное состояние (обе формы, AC)', () => {
  test('активная — заливка primary + text-on-dark + рамка primary; дефолт — surface/текст/border', async ({
    stand,
  }) => {
    const page = await stand('ui-chip');

    const pairs = [
      [`#${CHIPS.buttons} button[aria-pressed='true']`, 'aria-pressed=true'],
      [`#${CHIPS.links} a[aria-current='page']`, 'aria-current=page'],
    ];
    for (const [selector, label] of pairs) {
      const pill = page.locator(selector).first();
      const state = await stateOf(pill);
      expect(state.backgroundColor, `${label}: фон primary`).toBe('rgb(0, 40, 86)');
      expect(state.color, `${label}: подпись text-on-dark`).toBe('rgb(255, 255, 255)');
      expect(state.borderColor, `${label}: рамка primary`).toBe('rgb(0, 40, 86)');
    }

    const idle = page.locator(`#${CHIPS.buttons} button[aria-pressed='false']`).first();
    const idleState = await stateOf(idle);
    expect(idleState.backgroundColor, 'дефолт: фон surface').toBe('rgb(255, 255, 255)');
    expect(idleState.color, 'дефолт: цвет текста').toBe('rgb(31, 31, 31)');
    expect(idleState.borderColor, 'дефолт: рамка #D6D6D6 (--ui-border-color)').toBe(
      'rgb(214, 214, 214)',
    );
  });

  test('hover: неактивная — рамка и подпись primary; активная hover-правило не меняет (is-active сильнее)', async ({
    stand,
  }) => {
    const page = await stand('ui-chip');

    const idle = page.locator(`#${CHIPS.buttons} button[aria-pressed='false']`).first();
    await idle.hover();
    await settledStyle(idle, 'borderColor', 'rgb(0, 40, 86)');
    await settledStyle(idle, 'color', 'rgb(0, 40, 86)');
    await settledStyle(idle, 'backgroundColor', 'rgb(255, 255, 255)');

    const active = page.locator(`#${CHIPS.buttons} button[aria-pressed='true']`).first();
    await active.hover();
    await settledStyle(active, 'backgroundColor', 'rgb(0, 40, 86)');
    await settledStyle(active, 'color', 'rgb(255, 255, 255)');
  });
});

test.describe('ui-chip: клавиатура (T14.8; Testing requirements)', () => {
  test('Tab-порядок группы = DOM-порядку; фокус с клавиатуры — :focus-visible (ADR-0001)', async ({
    stand,
  }) => {
    const page = await stand('ui-chip');

    const buttons = page.locator(`#${CHIPS.buttons} button.ui-chip__pill`);
    const count = await buttons.count();
    expect(count, 'кнопки-чипы на стенде есть (против вакуумного прохода)').toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      await tabTo(page, buttons.nth(i));
      await expect(buttons.nth(i), `Tab-стоп ${i + 1} — по DOM-порядку`).toBeFocused();
      const ring = await buttons.nth(i).evaluate((el) => el.matches(':focus-visible'));
      expect(ring, `фокус с клавиатуры (focus-visible) на кнопке ${i}`).toBe(true);
    }
  });

  test('Enter и Space активируют кнопку-чип (клиентский фильтр — нативные клики)', async ({
    stand,
  }) => {
    const page = await stand('ui-chip');

    const target = page.locator(`#${CHIPS.buttons} button[aria-pressed='false']`).first();
    await target.evaluate((el) => {
      el.addEventListener('click', () => {
        el.setAttribute('data-uichip-clicked', '1');
      });
    });

    await tabTo(page, target);
    await page.keyboard.press('Enter');
    await expect(target, 'Enter вызывает click кнопки').toHaveAttribute('data-uichip-clicked', '1');

    await target.evaluate((el) => el.removeAttribute('data-uichip-clicked'));
    await page.keyboard.press('Space');
    await expect(target, 'Space вызывает click кнопки').toHaveAttribute('data-uichip-clicked', '1');
  });

  test('Enter по ссылке-чипу навигирует (GET-фильтр работает без JS)', async ({ stand }) => {
    const page = await stand('ui-chip');

    const target = page.locator(`#${CHIPS.links} a[href='?topic=it']`);
    await tabTo(page, target);
    await expect(target).toBeFocused();

    await page.keyboard.press('Enter');
    await page.waitForURL(/\?topic=it$/);
    expect(page.url(), 'Enter по ссылке-чипу = переход (no-JS деградация)').toMatch(/\?topic=it$/);
  });
});

test.describe('ui-chip: контраст, axe, эталоны (T14.8)', () => {
  test('контраст (сквозной с T2.3): дефолтная и активная пары ≥ 4.5:1 (текст 14px)', async ({
    stand,
  }) => {
    const page = await stand('ui-chip');

    const assertAA = async (locator, label) => {
      const state = await stateOf(locator);
      // Фон пилюли непрозрачен (surface/primary) — сам и есть эффективный фон.
      const ratio = contrastRatio(state.color, state.backgroundColor);
      expect(ratio, `${label}: ${ratio.toFixed(2)}:1 ≥ 4.5`).toBeGreaterThanOrEqual(4.5);
    };
    await assertAA(
      page.locator(`#${CHIPS.buttons} button[aria-pressed='true']`).first(),
      'активная (кнопка)',
    );
    await assertAA(
      page.locator(`#${CHIPS.links} a[aria-current='page']`).first(),
      'активная (ссылка)',
    );
    await assertAA(
      page.locator(`#${CHIPS.buttons} button[aria-pressed='false']`).first(),
      'дефолтная',
    );
  });

  test('axe: стенд чист — известных исключений нет (AC)', async ({ stand }) => {
    const page = await stand('ui-chip');
    const results = await a11y(page).analyze();
    expect(
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`),
      'axe: violations = []',
    ).toEqual([]);
  });

  test('эталоны ui-chip 375/768/1280/1440 — только из контейнера (ADR-0004)', async ({ stand }) => {
    const page = await stand('ui-chip');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-chip', viewport });
    }
  });
});

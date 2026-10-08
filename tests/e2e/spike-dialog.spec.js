/**
 * Сценарии SPIKE T7.1 — native <dialog> vs собственный оверлей.
 *
 * ВРЕМЕННЫЙ ФАЙЛ: SPIKE по спеке даёт «доказательства (сценарии прогонов),
 * не тест-сьют» — файл выбрасывается вместе с песочницей
 * showcase/spike-dialog/ после записи ADR (восстанавливается из истории git).
 *
 * Отличие от компонентных тестов: страницы песочницы не попадают в полигон
 * showcase/dist (прототипы не компоненты, build.mjs не расширяется), поэтому
 * URL строятся напрямую на /showcase/spike-dialog/ (сервер харнесса отдаёт
 * корень репозитория — showcase/serve.mjs). Хелпер stand() сюда не ходит
 * сознательно.
 *
 * Структура:
 *  - describe «probe» — зонд техники native dialog на матрице (страница без
 *    JS: измеряется браузер, не прототип);
 *  - describe «native» / «custom» — прототипы по критериям К1–К12
 *    (showcase/spike-dialog/README.md, зафиксированы до прогонов);
 *  - describe «legacy» — оба прототипа внутри агрессивного legacy-CSS.
 */
import { expect, test } from '@playwright/test';

import { a11y } from '../helpers/harness.js';

const SPIKE = '/showcase/spike-dialog';

/**
 * rAF-сэмплы opacity dialog + ::backdrop за окно мс (паттерн T6.4:
 * детерминированный снимок анимации). method — имя нативного метода старта
 * ('showModal' | 'close' | '' — сэмплы уже идущего перехода); оба значения
 * собираются ОДНИМ циклом rAF — кадры диалога и его backdrop синхронны.
 */
async function sampleOpenClose(page, selector, method, windowMs = 600) {
  return page.evaluate(
    ({ selector, method, windowMs }) => {
      const el = document.querySelector(selector);
      return new Promise((resolve) => {
        const dialogValues = new Set();
        const backdropValues = new Set();
        const start = performance.now();
        const tick = () => {
          dialogValues.add(getComputedStyle(el).opacity);
          backdropValues.add(getComputedStyle(el, '::backdrop').opacity);
          if (performance.now() - start < windowMs) requestAnimationFrame(tick);
          else resolve({ dialog: [...dialogValues], backdrop: [...backdropValues] });
        };
        if (method) el[method]();
        requestAnimationFrame(tick);
      });
    },
    { selector, method, windowMs },
  );
}

/** Число промежуточных кадров: значения opacity строго между 0 и 1. */
function intermediateCount(values) {
  return values.filter((v) => {
    const n = Number.parseFloat(v);
    return n > 0 && n < 1;
  }).length;
}

/** Открыть probe-диалог (showModal зовёт сценарий — страница зонда без JS). */
async function openProbeModal(page) {
  await page.locator('#spike-probe-dialog').evaluate((el) => el.showModal());
}

/** Прочитать computed background-color ::backdrop открытого диалога. */
function backdropBackground(page) {
  return page.evaluate(
    () =>
      getComputedStyle(document.querySelector('#spike-probe-dialog'), '::backdrop').backgroundColor,
  );
}

/* ── Хелперы прототипов (native/custom — одинаковый чек-лист К1–К12) ── */

const PROTOTYPES = {
  native: {
    page: '/native.html',
    opener: '#native-opener',
    openerNested: '#native-opener-nested',
    modal: '#native-modal',
    modalNested: '#native-modal-2',
    closeButtonName: 'Закрыть',
    closeButtonNestedName: 'Закрыть вторую',
  },
  custom: {
    page: '/custom.html',
    opener: '#custom-opener',
    openerNested: '#custom-opener-2',
    modal: '#custom-modal',
    modalNested: '#custom-modal-2',
    closeButtonName: 'Закрыть',
    closeButtonNestedName: 'Закрыть вторую',
  },
};

async function openSpikeModal(page, proto) {
  await page.locator(proto.opener).click();
  await expect(page.locator(proto.modal)).toBeVisible();
  // Анимация открытия — ждём устоявшееся состояние (сэмплы снимаются отдельно).
  await page.waitForTimeout(400);
}

/** rAF-сэмплы opacity элемента ПАРАЛЛЕЛЬНО с действием (клик/клавиша):
 * сэмплер ставится до действия, собирает кадры 700 мс. */
async function sampleOpacityDuring(page, selector, action) {
  const sampling = page.evaluate(
    ({ selector }) => {
      const el = document.querySelector(selector);
      return new Promise((resolve) => {
        const values = new Set();
        const start = performance.now();
        const tick = () => {
          values.add(getComputedStyle(el).opacity);
          if (performance.now() - start < 700) requestAnimationFrame(tick);
          else resolve([...values]);
        };
        requestAnimationFrame(tick);
      });
    },
    { selector },
  );
  await action();
  return sampling;
}

/** Tab-цикл: после каждого Tab фокус НЕ достигает фоновых элементов.
 * Для native это включает транзит через body (зонд chromium 2026-10-08:
 * top-layer с последнего фокусируемого отдаёт Tab на body, следующий Tab
 * возвращает в диалог; фоновые элементы недостижимы — они инертны). */
async function trapCycle(page, proto, steps = 12) {
  for (let i = 0; i < steps; i += 1) {
    await page.keyboard.press('Tab');
    const safe = await page.evaluate((sel) => {
      const modal = document.querySelector(sel);
      const active = document.activeElement;
      return modal.contains(active) || active === document.body;
    }, proto.modal);
    if (!safe) return false;
  }
  return true;
}

/** Ширина fixed-шапки риги К10. */
function fixedBarWidth(page) {
  return page.evaluate(
    () => document.querySelector('[data-spike-fixedbar]').getBoundingClientRect().width,
  );
}

/* ── Зонд техники native dialog (страница probe.html без JS) ── */

test.describe('spike T7.1 probe: техника native dialog', () => {
  test('П2/П3+К6: backdrop токеном слоя 2 — резолв var() и перекраска оверрайдом на корне', async ({
    page,
  }) => {
    await page.goto(SPIKE + '/probe.html');
    await page.waitForLoadState('networkidle');
    await openProbeModal(page);

    const base = await backdropBackground(page);
    expect(base, 'П2: var(--ui-color-overlay) резолвится в ::backdrop').not.toBe('');
    expect(base, 'П2: не прозрачный').not.toBe('rgba(0, 0, 0, 0)');
    expect(base, 'П2: не transparent').not.toBe('transparent');

    // П3: имитация VI-перекраски токеном на корне (механика тем ADR-0009):
    // ::backdrop должен перекраситься по наследованию от исходного элемента.
    await page.evaluate(() => document.documentElement.setAttribute('data-spike-vi', ''));
    const vi = await backdropBackground(page);
    expect(vi, 'П3: оверрайд токена на корне перекрашивает ::backdrop').not.toEqual(base);
  });

  test('П1+К5: pure-CSS анимация открытия — @starting-style даёт промежуточные кадры', async ({
    page,
  }) => {
    await page.goto(SPIKE + '/probe.html');
    await page.waitForLoadState('networkidle');

    const frames = await sampleOpenClose(page, '#spike-probe-dialog', 'showModal');
    expect(
      intermediateCount(frames.dialog),
      `dialog: промежуточных кадров ≥ 3 (сэмплы: ${frames.dialog.join(' | ')})`,
    ).toBeGreaterThanOrEqual(3);
    expect(
      intermediateCount(frames.backdrop),
      `::backdrop: промежуточных кадров ≥ 2 (сэмплы: ${frames.backdrop.join(' | ')})`,
    ).toBeGreaterThanOrEqual(2);
  });

  test('П1+К5: pure-CSS анимация закрытия — allow-discrete держит бокс в переходе', async ({
    page,
  }) => {
    await page.goto(SPIKE + '/probe.html');
    await page.waitForLoadState('networkidle');
    await openProbeModal(page);
    await page.waitForTimeout(400); // открытие устоялось

    const frames = await sampleOpenClose(page, '#spike-probe-dialog', 'close');
    expect(
      intermediateCount(frames.dialog),
      `dialog: закрытие анимируется — промежуточных кадров ≥ 2 (сэмплы: ${frames.dialog.join(' | ')})`,
    ).toBeGreaterThanOrEqual(2);
  });

  test('П4: dialog:modal — поддержка селектора и fixed-позиционирование по центру вьюпорта', async ({
    page,
  }) => {
    await page.goto(SPIKE + '/probe.html');
    await page.waitForLoadState('networkidle');

    const supports = await page.evaluate(() => CSS.supports('selector(dialog:modal)'));
    expect(supports, ':modal в CSS.supports').toBe(true);

    await openProbeModal(page);
    const dialog = page.locator('#spike-probe-dialog');
    expect(
      await dialog.evaluate((el) => getComputedStyle(el).position),
      ':modal-правило применилось (position: fixed)',
    ).toBe('fixed');
    // Анимация открытия (translateY) — замеряем устоявшуюся панель.
    await page.waitForTimeout(400);

    const box = await dialog.boundingBox();
    const viewport = page.viewportSize();
    // Нюанс (зонд 2026-10-08, chromium): base/reset (T3.1) ставит
    // scrollbar-gutter: stable — reserved gutter (15px классического
    // скроллбара) вычитается из контентной области, панель центрируется по
    // ней: горизонтальный центр смещён на gutter/2 = 7.5px от центра
    // вьюпорта. Критерий К4 — позиционирование относительно ВЬЮПОРТА (а не
    // legacy-обёртки), допускаем gutter/2.
    expect(
      Math.abs(box.x + box.width / 2 - viewport.width / 2),
      'горизонтальный центр панели ≈ центр вьюпорта (±10px: gutter/2)',
    ).toBeLessThanOrEqual(10);
    expect(
      Math.abs(box.y + box.height / 2 - viewport.height / 2),
      'вертикальный центр панели = центр вьюпорта (±2px)',
    ).toBeLessThanOrEqual(2);
  });

  test('П5+К9: PE-деградация — dialog[open] в разметке показывается инлайн (position: static)', async ({
    page,
  }) => {
    await page.goto(SPIKE + '/probe.html');
    await page.waitForLoadState('networkidle');

    const pe = page.locator('#spike-pe-dialog');
    expect(await pe.evaluate((el) => getComputedStyle(el).position), 'position: static').toBe(
      'static',
    );
    expect(await pe.evaluate((el) => getComputedStyle(el).display), 'display: block').toBe('block');
    expect(
      await pe.evaluate((el) => el.getBoundingClientRect().height),
      'контент виден (высота > 0)',
    ).toBeGreaterThan(0);
    expect(
      await pe.evaluate((el) => el.offsetTop),
      'в потоке документа (offsetTop > 0)',
    ).toBeGreaterThan(0);
  });

  test('П6+К3: нативный restore фокуса — после close фокус на опенере', async ({ page }) => {
    await page.goto(SPIKE + '/probe.html');
    await page.waitForLoadState('networkidle');

    // Страница зонда без JS: opener получает фокус, showModal зовёт сценарий —
    // измеряется нативный restore «предыдущего фокусируемого элемента».
    await page.locator('#spike-probe-opener').focus();
    await page.locator('#spike-probe-dialog').evaluate((el) => el.showModal());
    await expect(page.locator('#spike-probe-dialog')).toBeVisible();
    expect(
      await page.evaluate(() =>
        document.querySelector('#spike-probe-dialog').contains(document.activeElement),
      ),
      'после showModal фокус внутри диалога (нативный trap)',
    ).toBe(true);

    await page.getByRole('button', { name: 'Закрыть (method=dialog)' }).click();
    await expect(page.locator('#spike-probe-dialog')).not.toBeVisible();
    expect(
      await page.evaluate(() => document.activeElement.id),
      'П6: фокус вернулся на опенер (нативный restore)',
    ).toBe('spike-probe-opener');
  });

  test('П7+К11: method="dialog" — submit закрывает, returnValue выставлен, навигации нет', async ({
    page,
  }) => {
    await page.goto(SPIKE + '/probe.html');
    await page.waitForLoadState('networkidle');
    await openProbeModal(page);

    await page.getByRole('button', { name: 'Закрыть (method=dialog)' }).click();

    const dialog = page.locator('#spike-probe-dialog');
    await expect(dialog).not.toBeVisible();
    expect(await dialog.evaluate((el) => el.open), 'атрибут open снят').toBe(false);
    expect(await dialog.evaluate((el) => el.returnValue), 'returnValue = value кнопки').toBe(
      'probe-cancel',
    );
    expect(page.url(), 'навигации нет (без query в URL)').not.toContain('?');
  });

  test('П8+К12: top-layer блокирует фон — клик по контенту под модалкой не доходит', async ({
    page,
  }) => {
    await page.goto(SPIKE + '/probe.html');
    await page.waitForLoadState('networkidle');
    await openProbeModal(page);

    await page.evaluate(() => {
      window.__spikeClicks = 0;
      document.querySelector('h1').addEventListener('click', () => {
        window.__spikeClicks += 1;
      });
    });

    const h1 = page.locator('h1');
    const box = await h1.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    expect(await page.evaluate(() => window.__spikeClicks), 'клик не дошёл до фона').toBe(0);
    expect(
      await page.evaluate(() =>
        document.querySelector('#spike-probe-dialog').contains(document.activeElement),
      ),
      'фокус остался внутри диалога (trap нативный)',
    ).toBe(true);
  });

  test('К5: reduced-motion — kill-switch base/reset гасит анимацию dialog', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(SPIKE + '/probe.html');
    await page.waitForLoadState('networkidle');

    const frames = await sampleOpenClose(page, '#spike-probe-dialog', 'showModal');
    expect(
      intermediateCount(frames.dialog),
      `dialog: промежуточных кадров ≤ 1 (сэмплы: ${frames.dialog.join(' | ')})`,
    ).toBeLessThanOrEqual(1);

    // Факт для ADR (expect.soft — фиксируем значение, не валим прогон):
    // kill-switch (*, ::before, ::after) НЕ накрывает ::backdrop — гаснет ли
    // переход псевдоэлемента топ-слоя, решает движок.
    expect
      .soft(
        intermediateCount(frames.backdrop),
        `::backdrop при reduced-motion (сэмплы: ${frames.backdrop.join(' | ')})`,
      )
      .toBeLessThanOrEqual(1);
  });
});

/* ── Прототипы: одинаковый чек-лист К1–К12 на обоих (чистый контекст) ── */

for (const [kind, proto] of Object.entries(PROTOTYPES)) {
  test.describe(`spike T7.1 прототип ${kind}: чек-лист К1–К12`, () => {
    test('К1+К2+К3: trap, Escape, restore, снятие скролл-лока', async ({ page }) => {
      await page.goto(SPIKE + proto.page);
      await page.waitForLoadState('networkidle');

      await page.locator(proto.opener).click();
      const modal = page.locator(proto.modal);
      await expect(modal).toBeVisible();

      expect(
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          return el.contains(document.activeElement) && document.activeElement !== el;
        }, proto.modal),
        'после открытия фокус внутри модалки',
      ).toBe(true);

      expect(await trapCycle(page, proto), 'К1: Tab-цикл не выходит за модалку').toBe(true);

      // Shift+Tab с первого фокусируемого → не достигает фоновых элементов
      // (native: допустим тот же транзит через body, что и у Tab — зонд
      // chromium 2026-10-08; custom: строго внутри — trap JS).
      await page.evaluate((sel) => {
        const modal = document.querySelector(sel);
        const first = modal.querySelector(
          'button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])',
        );
        first.focus();
      }, proto.modal);
      await page.keyboard.press('Shift+Tab');
      const afterShift = await page.evaluate((sel) => {
        const modal = document.querySelector(sel);
        const active = document.activeElement;
        return { inside: modal.contains(active), isBody: active === document.body };
      }, proto.modal);
      if (kind === 'native') {
        expect(
          afterShift.inside || afterShift.isBody,
          'Shift+Tab не достигает фоновых элементов (транзит body допустим)',
        ).toBe(true);
      } else {
        expect(afterShift.inside, 'Shift+Tab строго внутри (trap JS)').toBe(true);
      }

      await page.keyboard.press('Escape');
      await expect(modal, 'К2: Escape закрыл модалку (анимированно)').not.toBeVisible();

      expect(
        await page.evaluate(() => document.activeElement.id),
        'К3: фокус вернулся на опенер',
      ).toBe(await page.locator(proto.opener).evaluate((el) => el.id));

      expect(
        await page.evaluate(() => ({
          lock: document.body.hasAttribute('data-spike-lock'),
          pad: document.body.style.paddingRight,
        })),
        'К10-хвост: скролл-лок снят, паддинг-компенсации нет',
      ).toEqual({ lock: false, pad: '' });
    });

    test('К5: анимация открытия и закрытия — промежуточные кадры на rAF', async ({ page }) => {
      await page.goto(SPIKE + proto.page);
      await page.waitForLoadState('networkidle');

      const openFrames = await sampleOpacityDuring(page, proto.modal, () =>
        page.locator(proto.opener).click(),
      );
      expect(
        intermediateCount(openFrames),
        `открытие: промежуточных кадров ≥ 3 (сэмплы: ${openFrames.join(' | ')})`,
      ).toBeGreaterThanOrEqual(3);
      await page.waitForTimeout(400);

      const closeFrames = await sampleOpacityDuring(page, proto.modal, () =>
        page.keyboard.press('Escape'),
      );
      expect(
        intermediateCount(closeFrames),
        `закрытие: промежуточных кадров ≥ 2 (сэмплы: ${closeFrames.join(' | ')})`,
      ).toBeGreaterThanOrEqual(2);
    });

    test('К5: reduced-motion — не более 1 промежуточного кадра', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(SPIKE + proto.page);
      await page.waitForLoadState('networkidle');

      const openFrames = await sampleOpacityDuring(page, proto.modal, () =>
        page.locator(proto.opener).click(),
      );
      expect(
        intermediateCount(openFrames),
        `reduced-motion открытие: кадров ≤ 1 (сэмплы: ${openFrames.join(' | ')})`,
      ).toBeLessThanOrEqual(1);
    });

    test('К10: скролл-лок — прокрутка заблокирована, ширина fixed-шапки не меняется, циклы чисты', async ({
      page,
    }) => {
      await page.goto(SPIKE + proto.page);
      await page.waitForLoadState('networkidle');

      await page.evaluate(() => window.scrollTo(0, 300));
      const scrolledTo = await page.evaluate(() => window.scrollY);
      expect(scrolledTo, 'страница реально прокручена (контент длиннее вьюпорта)').toBeGreaterThan(
        100,
      );
      const before = await fixedBarWidth(page);

      // Открываем JS-кликом: page.click() автоскроллит к кнопке и ломает
      // раскладку «страница на N» (замер сдвига — на скролле).
      await page.locator(proto.opener).evaluate((el) => el.click());
      await expect(page.locator(proto.modal)).toBeVisible();
      await page.waitForTimeout(400);
      expect(await page.evaluate(() => window.scrollY), 'открытие не сдвинуло прокрутку').toBe(
        scrolledTo,
      );

      const during = await fixedBarWidth(page);
      expect(
        Math.abs(during - before),
        'ширина fixed-шапки не изменилась (нет сдвига)',
      ).toBeLessThan(0.5);

      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(100);
      expect(
        await page.evaluate(() => window.scrollY),
        'wheel при открытой модалке не двигает страницу',
      ).toBe(scrolledTo);

      // Повторные циклы — регресс-кейс career-portal «остаточный padding»
      for (let cycle = 0; cycle < 2; cycle += 1) {
        await page.keyboard.press('Escape');
        await expect(page.locator(proto.modal)).not.toBeVisible();
        expect(
          await page.evaluate(() => document.body.style.paddingRight),
          `цикл ${cycle + 1}: паддинг снят`,
        ).toBe('');
        await page.locator(proto.opener).evaluate((el) => el.click());
        await expect(page.locator(proto.modal)).toBeVisible();
        await page.waitForTimeout(400);
      }

      await page.keyboard.press('Escape');
      await expect(page.locator(proto.modal)).not.toBeVisible();
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(100);
      expect(
        await page.evaluate(() => window.scrollY),
        'после закрытия страница скроллится',
      ).toBeGreaterThan(scrolledTo);
    });

    test('К7: вложенность — Escape закрывает только верхнюю', async ({ page }) => {
      await page.goto(SPIKE + proto.page);
      await page.waitForLoadState('networkidle');

      await openSpikeModal(page, proto);
      // Вторую открываем JS-кликом: реальный клик по кнопке фона блокирует
      // сама модальность (native — top-layer перехватывает pointer events,
      // custom — полноэкранный оверлей); вложенность открывается из UI
      // модалки или программно.
      await page.locator(proto.openerNested).evaluate((el) => el.click());
      await expect(page.locator(proto.modalNested)).toBeVisible();
      await expect(page.locator(proto.modal), 'первая осталась открыта').toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.locator(proto.modalNested)).not.toBeVisible();
      await expect(
        page.locator(proto.modal),
        'первая НЕ закрылась по Escape верхней',
      ).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.locator(proto.modal)).not.toBeVisible();
    });

    test('К9: no-JS — контент модалки виден инлайн (PE-разметка)', async ({ page }) => {
      const context = await page.context().browser().newContext({ javaScriptEnabled: false });
      const noJsPage = await context.newPage();
      await noJsPage.goto(SPIKE + proto.page);
      await noJsPage.waitForLoadState('networkidle');

      const modal = noJsPage.locator(proto.modal);
      expect(
        await modal.evaluate((el) => {
          const cs = getComputedStyle(el);
          return { display: cs.display, visibility: cs.visibility, opacity: cs.opacity };
        }),
        'без JS модалка не спрятана',
      ).toEqual({ display: 'block', visibility: 'visible', opacity: '1' });
      expect(
        await modal.evaluate((el) => el.getBoundingClientRect().height),
        'контент виден (высота > 0)',
      ).toBeGreaterThan(0);

      await context.close();
    });

    test('К12: инертность фона — клик по контенту за модалкой не доходит', async ({ page }) => {
      await page.goto(SPIKE + proto.page);
      await page.waitForLoadState('networkidle');
      await openSpikeModal(page, proto);

      await page.evaluate(() => {
        window.__spikeClicks = 0;
        document.querySelector('h1').addEventListener('click', () => {
          window.__spikeClicks += 1;
        });
      });
      const h1 = page.locator('h1');
      const box = await h1.boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

      expect(await page.evaluate(() => window.__spikeClicks), 'клик не дошёл до фона').toBe(0);

      if (kind === 'custom') {
        expect(
          await page.evaluate(() => document.querySelector('main').inert),
          'custom: инертность фона выставлена JS на детей body',
        ).toBe(true);
      } else {
        // Факт: native блокирует фон поведением top-layer, свойство inert
        // на элементах фона браузер не выставляет.
        expect(
          await page.evaluate(() => document.querySelector('main').inert),
          'native: main.inert остаётся false при работающем блокинге',
        ).toBe(false);
      }
    });

    test('axe на открытой модалке (факт для T7.2 — expect.soft)', async ({ page }) => {
      await page.goto(SPIKE + proto.page);
      await page.waitForLoadState('networkidle');
      await openSpikeModal(page, proto);

      const results = await a11y(page).analyze();
      expect.soft(results.violations, `${kind}: axe при открытой модалке`).toEqual([]);
    });
  });
}

/* ── Legacy-стенд (К4): оба прототипа внутри агрессивного legacy-CSS ── */

test.describe('spike T7.1 legacy-стенд: К4 (z-index-войны и fixed-обёртки)', () => {
  test('маркер ловушки: fixed внутри transform-обёртки растягивается на обёртку, не вьюпорт', async ({
    page,
  }) => {
    await page.goto(SPIKE + '/legacy.html');
    await page.waitForLoadState('networkidle');

    const marker = await page.evaluate(() => {
      const el = document.querySelector('[data-legacy-fixed-marker]');
      const wrap = el.closest('.legacy-transform');
      return {
        marker: el.getBoundingClientRect().width,
        wrap: wrap.getBoundingClientRect().width,
        viewport: document.documentElement.clientWidth,
      };
    });
    expect(
      Math.abs(marker.marker - marker.wrap),
      'fixed-маркер совпал по ширине с transform-обёрткой (ловушка подтверждена; допуск — бордюры content-box)',
    ).toBeLessThan(10);
    expect(marker.wrap, 'обёртка уже вьюпорта').toBeLessThan(marker.viewport);
  });

  test('К4 native: top-layer — панель на вьюпорте, выше z-index 2147483647, клик в баннер не доходит', async ({
    page,
  }) => {
    await page.goto(SPIKE + '/legacy.html');
    await page.waitForLoadState('networkidle');

    await page.locator('#legacy-native-opener').click();
    const modal = page.locator('#legacy-native-modal');
    await expect(modal).toBeVisible();
    await page.waitForTimeout(400);

    const viewport = page.viewportSize();
    const box = await modal.boundingBox();
    expect(
      Math.abs(box.x + box.width / 2 - viewport.width / 2),
      'панель центрирована относительно ВЬЮПОРТА (transform-обёртка не влияет)',
    ).toBeLessThanOrEqual(10);

    const banner = await page.evaluate(() => {
      const b = document.querySelector('.legacy-banner').getBoundingClientRect();
      const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return { tag: hit.tagName, id: hit.id };
    });
    expect(banner.tag, 'elementFromPoint на месте баннера — элемент топ-слоя (dialog)').toBe(
      'DIALOG',
    );

    await page.evaluate(() => {
      window.__bannerClicks = 0;
      document.querySelector('.legacy-banner').addEventListener('click', () => {
        window.__bannerClicks += 1;
      });
    });
    const bannerBox = await page.locator('.legacy-banner').boundingBox();
    await page.mouse.click(bannerBox.x + bannerBox.width / 2, bannerBox.y + bannerBox.height / 2);
    expect(await page.evaluate(() => window.__bannerClicks), 'клик в баннер не дошёл').toBe(0);
  });

  test('К4 custom: перенос в body спасает позиционирование, но z-войну с 2147483647 оверлей проигрывает', async ({
    page,
  }) => {
    await page.goto(SPIKE + '/legacy.html');
    await page.waitForLoadState('networkidle');

    await page.locator('#legacy-custom-opener').click();
    const modal = page.locator('#legacy-custom-modal');
    await expect(modal).toBeVisible();
    await page.waitForTimeout(400);

    // Оверлей перенесён в body (не внутри transform-обёртки)
    expect(
      await modal.evaluate((el) => el.parentElement === document.body),
      'оверлей в body после init (fixed от вьюпорта)',
    ).toBe(true);

    const viewport = page.viewportSize();
    const box = await modal.evaluate((el) => {
      const panel = el.querySelector('.spike-overlay__panel').getBoundingClientRect();
      return { x: panel.x + panel.width / 2, y: panel.y + panel.height / 2 };
    });
    expect(
      Math.abs(box.x - viewport.width / 2),
      'панель по центру вьюпорта (перенос сработал)',
    ).toBeLessThanOrEqual(10);

    const hit = await page.evaluate(() => {
      const banner = document.querySelector('.legacy-banner');
      const b = banner.getBoundingClientRect();
      const at = () => {
        const el = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        return el ? el.className : '(none)';
      };
      const withInert = at(); // баннер инертен (refreshInert) — non-hit-testable
      banner.inert = false; // временно: чистый замер painting order (z-война)
      const withoutInert = at();
      banner.inert = true;
      return { withInert, withoutInert, inert: banner.inert };
    });
    expect(
      hit.withInert,
      'с инертностью: хит в баннер невозможен (inert — non-hit-testable, клики блокирует доп. JS)',
    ).not.toContain('legacy-banner');
    expect(
      hit.withoutInert,
      'без инертности: хит = БАННЕР — z-войну (--ui-z-modal: 300 против 2147483647) оверлей проигрывает, баннер рисуется поверх затемнения',
    ).toContain('legacy-banner');
  });

  test('факт ADR-0002: content-box legacy распирает панель — box-sizing на корне обязателен (T7.2)', async ({
    page,
  }) => {
    await page.goto(SPIKE + '/legacy.html');
    await page.waitForLoadState('networkidle');

    await page.locator('#legacy-native-opener').click();
    await expect(page.locator('#legacy-native-modal')).toBeVisible();
    await page.waitForTimeout(400);

    const width = await page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('#legacy-native-modal'));
      return {
        boxSizing: cs.boxSizing,
        width: document.querySelector('#legacy-native-modal').getBoundingClientRect().width,
      };
    });
    expect(width.boxSizing, 'legacy-сброс победил (подключён позже)').toBe('content-box');
    expect(
      width.width,
      'панель распирает на паддинги (напоминание T7.2: box-sizing на корне — ADR-0002)',
    ).toBeGreaterThan(400);
  });
});

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

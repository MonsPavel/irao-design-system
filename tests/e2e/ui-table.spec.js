/**
 * e2e ui-table (T7.4; Testing requirements + AC) — три паттерна на трёх
 * стендах, клавиатурный скролл зоны, полнота данных карточного режима (375),
 * axe, эталоны.
 *
 * Поверхность — стенды ui-table (базовая таблица + --zebra + --compact),
 * ui-table-scroll (скролл-зона role=region + sticky-заголовок) и
 * ui-table-cards (карточная трансформация <md + матрица выбора паттерна).
 * Проверяется:
 *  1. базовая: нативная table-семантика — таблица названа caption, th
 *     scope="col"/"row" дают роли columnheader/rowheader (a11y-требование);
 *  2. скролл-зона: tabindex="0" + role="region" + aria-label; зона
 *     достижима Tab-ом, фокус видим (глобальная политика ADR-0001 —
 *     [tabindex]:focus-visible), прокрутка стрелками нативная (AC);
 *  3. sticky-заголовок: position: sticky; при вертикальном прокруте зоны
 *     шапка остаётся у верхней кромки зоны (Implementation requirements п.3);
 *  4. карточный режим (375): данные не теряются — каждая ячейка видима и
 *     несёт data-label, повторяющий текст заголовка колонки; подпись
 *     рендерится ::before и входит в доступное имя ячейки (пара
 *     «заголовок–значение» читается без таблицы); шапка скрыта. Потеря
 *     table-ролей при display: block движко-зависима (chromium сохраняет
 *     дерево таблицы — зонд 2026-10; firefox/webkit исторически снимают,
 *     поверхность — матрица nightly) — осознанный компромисс, правила
 *     допустимости зафиксированы в README (Technical considerations); на
 *     ≥md — table-раскладка, подписи сняты;
 *  5. axe: все три стенда чисты (AC);
 *  6. эталоны: три стенда × 4 вьюпорта (375/768/1280/1440, вкл. 375 — AC) +
 *     состояние «зона прокручена» (desktop, ADR-0004: создаются только в
 *     контейнере/CI, локально — no-op с аннотацией).
 */
import { expect } from '@playwright/test';

import { a11y, shot, test, VIEWPORTS } from '../helpers/harness.js';

/** Селекторы стендов (showcase/pages/ui-table*). */
const SEL = {
  basicTable: '#uitable-basic table',
  scrollZone: '#uitable-scroll .ui-table__scroll',
  stickyZone: '#uitable-sticky .ui-table__scroll',
  cardsTable: '#uitable-cards .ui-table--cards',
};

test.describe('ui-table: базовая таблица (нативная семантика)', () => {
  test('таблица названа caption, заголовки связаны scope: роли columnheader/rowheader', async ({
    stand,
  }) => {
    const page = await stand('ui-table');

    // Имя таблицы — нативный caption (доступное имя без ARIA).
    await expect(page.locator(SEL.basicTable)).toHaveAccessibleName(/Направления/);

    const headers = page.locator(`${SEL.basicTable} thead th`);
    const headerCount = await headers.count();
    expect(headerCount, 'заголовки колонок на месте').toBeGreaterThan(2);
    for (let i = 0; i < headerCount; i += 1) {
      await expect(headers.nth(i), `th ${i} — columnheader`).toHaveRole('columnheader');
      await expect(headers.nth(i)).toHaveAttribute('scope', 'col');
    }

    // Первая колонка тела — заголовки строк (th scope="row").
    const rowHeads = page.locator(`${SEL.basicTable} tbody th`);
    const rowHeadCount = await rowHeads.count();
    expect(rowHeadCount, 'заголовки строк на месте').toBeGreaterThan(1);
    for (let i = 0; i < rowHeadCount; i += 1) {
      await expect(rowHeads.nth(i), `th строки ${i} — rowheader`).toHaveRole('rowheader');
    }
  });

  test('модификаторы --zebra и --compact на стенде: фоны/паддинги из токенов', async ({
    stand,
  }) => {
    const page = await stand('ui-table');

    // zebra: чётная строка тела окрашена surface-muted, нечётная — прозрачна.
    const zebraEven = page.locator('#uitable-zebra tbody tr:nth-child(even) td').first();
    await expect(zebraEven).toHaveCSS(
      'background-color',
      'rgb(241, 245, 254)', // --ui-color-surface-muted → blue-50
    );

    // compact: горизонтальный паддинг ячейки — 12px (--ui-space-3).
    const compactCell = page.locator('#uitable-compact td').first();
    await expect(compactCell).toHaveCSS('padding-left', '12px');
  });
});

test.describe('ui-table-scroll: скролл-зона (AC — фокус и клавиатурный скролл)', () => {
  test('зона — именованный регион с tabindex="0"; достижима Tab-ом; фокус видим (глобальная политика ADR-0001)', async ({
    stand,
  }) => {
    const page = await stand('ui-table-scroll');

    const zone = page.locator(SEL.scrollZone);
    await expect(zone).toHaveAttribute('role', 'region');
    await expect(zone).toHaveAttribute('tabindex', '0');
    await expect(zone).toHaveAttribute('aria-label', /направления/i);

    // Tab-порядок: после последнего интерактива шапки каркаса (select темы)
    // следующая остановка — скролл-регион (первый интерактив main). Tab —
    // клавиатурная модальность, поэтому зона в :focus-visible и контур рисует
    // глобальная политика ADR-0001 ([tabindex]:focus-visible, base/focus.css).
    await page.locator('.ui-showcase-header__theme').focus();
    await page.keyboard.press('Tab');
    await expect(zone, 'Tab из шапки приходит в скролл-регион').toBeFocused();
    const outline = await zone.evaluate((el) => {
      const style = getComputedStyle(el);
      return { width: style.outlineWidth, style: style.outlineStyle };
    });
    expect(outline.style, 'фокус-обводка включена политикой ADR-0001').not.toBe('none');
    expect(outline.width, 'толщина контура — 3px (--ui-focus-width)').toBe('3px');
  });

  test('стрелка → прокручивает зону на 375 и на 1440 (AC: прокручивается с клавиатуры)', async ({
    stand,
  }) => {
    const page = await stand('ui-table-scroll');
    const zone = page.locator(SEL.scrollZone);

    for (const viewport of [VIEWPORTS.mobile, VIEWPORTS.desktop]) {
      await page.setViewportSize(viewport);
      // Предусловие паттерна: таблица шире зоны — есть что прокручивать.
      const overflow = await zone.evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(overflow, `горизонтальное переполнение на ${viewport.width}px`).toBeGreaterThan(0);

      await zone.focus();
      const before = await zone.evaluate((el) => el.scrollLeft);
      await zone.press('ArrowRight');
      // Нативный скролл применяет сдвиг в ближайшие кадры (зонд chromium:
      // «сразу — 0, через кадр — 40») — опрашиваем.
      await expect
        .poll(() => zone.evaluate((el) => el.scrollLeft), { timeout: 5000 })
        .toBeGreaterThan(before);
    }
  });

  test('sticky-заголовок: position: sticky; шапка остаётся у верхней кромки зоны при вертикальном прокруте', async ({
    stand,
  }) => {
    const page = await stand('ui-table-scroll');
    const zone = page.locator(SEL.stickyZone);
    const headCell = zone.locator('thead th').first();

    expect(await headCell.evaluate((el) => getComputedStyle(el).position)).toBe('sticky');

    // Фактическое прилипание: вертикальный скролл зоны (высоту задаёт сайт)
    // оставляет шапку у верхней кромки зоны.
    await zone.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const gap = await zone.evaluate((el) => {
      const zoneTop = el.getBoundingClientRect().top;
      const headTop = el.querySelector('thead th').getBoundingClientRect().top;
      return headTop - zoneTop;
    });
    expect(Math.abs(gap), 'шапка прилипла к верхней кромке зоны').toBeLessThan(2);
  });
});

test.describe('ui-table-cards: карточный режим (AC — данные не теряются на 375)', () => {
  test('375: каждая ячейка видима и несёт data-label с текстом заголовка колонки; подпись рендерится ::before; шапка скрыта', async ({
    stand,
  }) => {
    const page = await stand('ui-table-cards');
    await page.setViewportSize(VIEWPORTS.mobile);

    const table = page.locator(SEL.cardsTable);
    const headers = (await table.locator('thead th').allTextContents()).map((text) => text.trim());
    expect(headers.length, 'колонки на месте').toBeGreaterThan(2);

    await expect(table.locator('thead'), 'шапка скрыта в карточном режиме').toBeHidden();

    const rows = table.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount, 'строки на месте').toBeGreaterThan(1);
    for (let r = 0; r < rowCount; r += 1) {
      const cells = rows.nth(r).locator('th, td');
      const cellCount = await cells.count();
      expect(cellCount, `в строке ${r} ячеек столько же, сколько колонок`).toBe(headers.length);
      for (let c = 0; c < cellCount; c += 1) {
        const cell = cells.nth(c);
        await expect(cell, `ячейка ${r}/${c} видима (AC: данные не теряются)`).toBeVisible();
        await expect(cell, `ячейка ${r}/${c} несёт data-label`).toHaveAttribute(
          'data-label',
          headers[c],
        );
        const content = await cell.evaluate((el) => getComputedStyle(el, '::before').content);
        expect(content, `подпись ${headers[c]} рендерится ::before в ячейке ${r}/${c}`).toContain(
          headers[c],
        );
      }
    }
  });

  test('375: таблица — блоки (механизм трансформации), доступные имена ячеек несут пару «заголовок–значение»; 1440: table-раскладка возвращается', async ({
    stand,
  }) => {
    const page = await stand('ui-table-cards');

    await page.setViewportSize(VIEWPORTS.mobile);
    const table = page.locator(SEL.cardsTable);

    // Механизм трансформации: display: block на ячейках. Потеря table-ролей
    // при этом ДВИЖКО-ЗАВИСИМА (зонд chromium 2026-10: дерево таблицы
    // СОХРАНЯЕТСЯ — cell/rowheader остаются, потому пин ролей ниже фиксирует
    // сохранение; firefox/webkit исторически роли снимают — их поверхность —
    // матрица nightly): паттерн в любом случае не опирается на table-
    // навигацию — пары «заголовок–значение» самодостаточны, а для сравнения
    // по колонкам матрица выбора (README) предписывает скролл-зону.
    expect(
      await table
        .locator('tbody td')
        .first()
        .evaluate((el) => getComputedStyle(el).display),
      'ячейки — блоки: таблица трансформирована',
    ).toBe('block');

    // Связность данных для скринридера: доступное имя ячейки =
    // «data-label значение» (::before входит в accName) — пара читается
    // без таблицы. Проверяем первую строку (полнота — тестом выше).
    const headers = (await table.locator('thead th').allTextContents()).map((text) => text.trim());
    const firstRow = table.locator('tbody tr').first();
    const firstRowCells = firstRow.locator('th, td');
    for (let c = 0; c < headers.length; c += 1) {
      await expect(
        firstRowCells.nth(c),
        `accName ячейки ${c} несёт data-label`,
      ).toHaveAccessibleName(new RegExp(headers[c]));
    }

    // Дерево таблицы в chromium сохраняется (см. комментарий выше) —
    // фиксируем как наблюдаемое поведение движка.
    const cellCount = await table.locator('tbody td').count();
    expect(cellCount, 'ячейки на месте').toBeGreaterThan(2);
    await expect(table.getByRole('cell'), 'chromium: роли ячеек сохранены').toHaveCount(cellCount);

    await page.setViewportSize(VIEWPORTS.desktop);
    await expect(table.getByRole('cell'), 'на ≥md таблица — таблица').toHaveCount(cellCount);
    expect(
      await table
        .locator('tbody td')
        .first()
        .evaluate((el) => getComputedStyle(el).display),
      'на ≥md ячейки — table-cell',
    ).toBe('table-cell');
    const content = await table
      .locator('tbody td')
      .first()
      .evaluate((el) => getComputedStyle(el, '::before').content);
    expect(content, 'подписи data-label на ≥md сняты').toBe('none');
  });
});

test.describe('ui-table: axe (AC)', () => {
  for (const name of ['ui-table', 'ui-table-scroll', 'ui-table-cards']) {
    test(`стенд ${name} чист`, async ({ stand }) => {
      const page = await stand(name);
      expect(
        (await a11y(page).analyze()).violations.map(
          (violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`,
        ),
      ).toEqual([]);
    });
  }

  test('карточный стенд чист и на мобильном вьюпорте (режим карточек)', async ({ stand }) => {
    const page = await stand('ui-table-cards');
    await page.setViewportSize(VIEWPORTS.mobile);
    expect(
      (await a11y(page).analyze()).violations.map(
        (violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`,
      ),
    ).toEqual([]);
  });
});

test.describe('ui-table: эталоны (AC; ADR-0004 — только контейнер/CI)', () => {
  test('базовый стенд — 4 вьюпорта', async ({ stand }) => {
    const page = await stand('ui-table');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-table-default', viewport });
    }
  });

  test('скролл-стенд — 4 вьюпорта + состояние «зона прокручена» (desktop)', async ({ stand }) => {
    const page = await stand('ui-table-scroll');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-table-scroll-default', viewport });
    }

    const zone = page.locator(SEL.scrollZone);
    await zone.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    await shot(page, { name: 'ui-table-scroll-scrolled', viewport: 'desktop' });
  });

  test('карточный стенд — 4 вьюпорта (карточки на 375/768−1, таблица на 768+)', async ({
    stand,
  }) => {
    const page = await stand('ui-table-cards');
    for (const viewport of Object.keys(VIEWPORTS)) {
      await shot(page, { name: 'ui-table-cards-default', viewport });
    }
  });
});

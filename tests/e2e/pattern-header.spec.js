/**
 * e2e паттерна «Header» (T7.6; Testing requirements + AC) — стенд
 * patterns/header (stands/patterns/header.html). Разметка паттерна стоит
 * НА УРОВНЕ body (сборка: frameHeader:false + preMain), как на реальном
 * сайте — у копируемого <header> честная роль banner.
 *
 * Проверяется: ленмарки (banner + navigation с уникальными aria-label),
 * dropdown T6.1 (открытие/Escape; без JS меню раскрыто), кнопка VI T9.1
 * (data-ui-vi-toggle переключает режим, aria-pressed синхронизируется),
 * триггер поиска — пара к диалогу search-overlay (открытие → фокус в поле),
 * axe, иерархия заголовков, эталоны на шкале вьюпортов (ADR-0004).
 */
import { expect } from '@playwright/test';

import { a11y, SNAPSHOTS_ENABLED, test as standTest, VIEWPORTS } from '../helpers/harness.js';

const SEL = {
  header: 'body > header.hdp-header',
  dropdownTrigger: '#hdp-sections-trigger',
  dropdownMenu: '#hdp-sections-menu',
  vi: 'button[data-ui-vi-toggle]',
  search: 'a[data-ui-modal-target="sop-dialog"]',
  dialog: '#sop-dialog',
  query: '#sop-query',
  h1: 'main h1',
  home: 'main a[href="../../index.html"]',
};

standTest.describe('patterns/header: ленмарки (AC — правила ленмарк)', () => {
  standTest(
    'паттерн-шапка на уровне body: ровно один banner — разметка паттерна',
    async ({ stand }) => {
      const page = await stand('patterns/header');

      // Служебной шапки каркаса на стенде нет: единственная шапка уровня
      // body — паттерн (вторая banner-лендмарка была бы нарушением axe
      // landmark-no-duplicate-banner).
      const banners = page.locator('body > header');
      await expect(banners, 'ровно одна шапка уровня body').toHaveCount(1);
      await expect(banners).toHaveClass(/hdp-header/);

      // Порядок каркаса: skip-link → header → main (правила ленмарк, README).
      const order = await page.evaluate(() => {
        const skip = document.querySelector('body > a.ui-skip-link');
        const header = document.querySelector('body > header');
        const main = document.querySelector('body > main');
        const follows = (a, b) =>
          Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
        return Boolean(skip && header && main) && follows(skip, header) && follows(header, main);
      });
      expect(order, 'skip-link → header → main').toBe(true);
    },
  );

  standTest(
    'навигации — лендмарки с уникальными aria-label (Accessibility requirements)',
    async ({ stand }) => {
      const page = await stand('patterns/header');

      const navs = await page.locator(`${SEL.header} nav[aria-label]`).evaluateAll((nodes) =>
        nodes.map((nav) => ({
          label: nav.getAttribute('aria-label'),
          role: nav.getAttribute('role'),
          implicitRole: nav.tagName.toLowerCase(),
        })),
      );
      expect(
        navs.length,
        'навигаций минимум две (основная и дополнительная)',
      ).toBeGreaterThanOrEqual(2);
      const names = navs.map((nav) => nav.label);
      expect(new Set(names).size, 'aria-label навигаций уникальны и непусты').toBe(names.length);
      for (const nav of navs) {
        expect(nav.label.trim().length, 'aria-label непустой').toBeGreaterThan(0);
        // Навигационное назначение dropdown T6.1: меню — nav (не role="menu").
        expect(nav.role, 'menu-роль на навигации не ставится (T6.1)').toBeNull();
      }

      // Лендмарки резолвятся ролями: при загрузке видимы основная и
      // дополнительная навигации (третья nav — меню dropdown — скрыта
      // модулем T6.1 до открытия, роль скрытого элемента не разоблачается).
      await expect(page.getByRole('banner').getByRole('navigation')).toHaveCount(2);
    },
  );
});

standTest.describe('patterns/header: dropdown T6.1 (Implementation requirements)', () => {
  standTest('триггер открывает меню, Escape закрывает с возвратом фокуса', async ({ stand }) => {
    const page = await stand('patterns/header');

    const trigger = page.locator(SEL.dropdownTrigger);
    await trigger.click();
    await expect(trigger, 'модуль T6.1 поставил aria-expanded').toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(page.locator(SEL.dropdownMenu), 'меню раскрыто').toBeVisible();

    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger, 'фокус вернулся на триггер').toBeFocused();
  });

  standTest('без JS меню раскрыто (PE T6.1): все ссылки доступны', async ({ stand }) => {
    const page = await stand('patterns/header'); // URL стенда; JS не нужен
    const standUrl = page.url();
    const context = await page.context().browser().newContext({ javaScriptEnabled: false });
    const noJsPage = await context.newPage();
    try {
      await noJsPage.goto(standUrl, { waitUntil: 'networkidle' });
      const items = noJsPage.locator(`${SEL.dropdownMenu} a`);
      await expect(items.first(), 'первая ссылка меню видна без JS').toBeVisible();
      expect(await items.count(), 'все пункты меню в DOM').toBeGreaterThanOrEqual(3);
    } finally {
      await context.close();
    }
  });
});

standTest.describe('patterns/header: кнопка VI T9.1 (Implementation requirements)', () => {
  standTest(
    'data-ui-vi-toggle переключает режим: aria-pressed и классы на body',
    async ({ stand }) => {
      const page = await stand('patterns/header');

      const vi = page.locator(SEL.vi);
      await expect(vi, 'кнопка VI в шапке (README ui-vi)').toBeVisible();
      await expect(vi).toHaveAttribute('aria-pressed', 'false');
      await expect(vi, 'имя кнопки — видимый текст').toContainText('Версия для слабовидящих');

      await vi.click();
      await expect(vi, 'режим включён — aria-pressed true (модуль синхронизирует)').toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(
        await page.evaluate(() => document.body.classList.contains('vi')),
        'класс vi на body — режим применён',
      ).toBe(true);

      await vi.click();
      await expect(vi).toHaveAttribute('aria-pressed', 'false');
      expect(
        await page.evaluate(() => document.body.classList.contains('vi')),
        'повторный клик снимает режим',
      ).toBe(false);
    },
  );
});

standTest.describe('patterns/header: поиск — пара к search-overlay (Scope)', () => {
  standTest(
    'триггер-ссылка открывает диалог, фокус в поле; Escape — restore',
    async ({ stand }) => {
      const page = await stand('patterns/header');

      const search = page.locator(SEL.search);
      await expect(search, 'триггер — ссылка (переход без JS)').toHaveAttribute('href', '/search/');
      await search.click();
      await expect(page.locator(SEL.dialog), 'диалог search-overlay открыт').toBeVisible();
      await expect(page.locator(SEL.query), 'фокус в поле поиска').toBeFocused();

      await page.keyboard.press('Escape');
      await expect(page.locator(SEL.dialog), 'диалог закрыт').toBeHidden();
      await expect(search, 'фокус возвращён на триггер шапки').toBeFocused();
    },
  );

  standTest('без JS: диалог доступен инлайн (open в разметке, К9 ADR-0011)', async ({ stand }) => {
    const page = await stand('patterns/header');
    const standUrl = page.url();
    const context = await page.context().browser().newContext({ javaScriptEnabled: false });
    const noJsPage = await context.newPage();
    try {
      await noJsPage.goto(standUrl, { waitUntil: 'networkidle' });
      await expect(
        noJsPage.locator(`${SEL.dialog} .ui-modal__title`),
        'заголовок диалога виден без JS',
      ).toBeVisible();
      await expect(noJsPage.locator(SEL.query), 'поле поиска доступно').toBeVisible();
    } finally {
      await context.close();
    }
  });
});

standTest.describe('patterns/header: a11y страницы (AC)', () => {
  standTest('axe чист (закрытым оверлеем)', async ({ stand }) => {
    const page = await stand('patterns/header');
    const results = await a11y(page).analyze();
    expect(
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`),
      'axe: violations = []',
    ).toEqual([]);
  });

  standTest(
    'иерархия заголовков: один h1 каркаса, шапка заголовков не несёт (правила)',
    async ({ stand }) => {
      const page = await stand('patterns/header');
      const levels = await page.evaluate(() =>
        [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1])),
      );
      expect(
        levels.filter((level) => level === 1),
        'h1 один (гейт irao/one-h1)',
      ).toHaveLength(1);
      // Шапка — каркас без заголовков: заголовки страницы живут в main.
      const outsideMain = await page.evaluate(
        () => document.querySelectorAll('header :is(h1,h2,h3,h4,h5,h6)').length,
      );
      expect(outsideMain, 'в шапке заголовков нет').toBe(0);
      for (let i = 1; i < levels.length; i += 1) {
        expect(
          levels[i],
          `заголовок №${i}: без пропуска уровня (гейт irao/heading-order)`,
        ).toBeLessThanOrEqual(levels[i - 1] + 1);
      }
    },
  );
});

standTest.describe('patterns/header: эталоны (AC: visual; ADR-0004 — только контейнер/CI)', () => {
  standTest('эталоны шапки на шкале вьюпортов — element-снимки', async ({ stand }) => {
    const page = await stand('patterns/header');
    const header = page.locator(SEL.header);

    for (const viewport of Object.keys(VIEWPORTS)) {
      await page.setViewportSize(VIEWPORTS[viewport]);
      const info = standTest.info();
      if (!SNAPSHOTS_ENABLED || info.project.name !== 'chromium') {
        info.annotations.push({
          type: 'shot-skipped',
          description:
            `header--${viewport}: эталоны создаются только из контейнера/CI ` +
            '(ADR-0004) — запустите npm run test:docker',
        });
        continue;
      }
      await expect(header).toHaveScreenshot(`header--${viewport}.png`, {
        animations: 'disabled',
        caret: 'hide',
      });
    }
  });
});

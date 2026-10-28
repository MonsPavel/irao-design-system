/**
 * e2e паттерна «Footer» (T7.6; Testing requirements + AC) — стенд
 * patterns/footer (stands/patterns/footer.html). Разметка паттерна стоит
 * НА УРОВНЕ body ПОСЛЕ main (сборка: pageFooter), как на реальном сайте —
 * у копируемого <footer> честная роль contentinfo.
 *
 * Проверяется: contentinfo-лендмарка, контакты в <address> (tel:/mailto:),
 * колонки ссылок — навигации с уникальными aria-label, icon-only соцсети
 * с aria-label, переход кверху на #top, axe, иерархия заголовков, эталоны
 * на шкале вьюпортов (ADR-0004).
 */
import { expect } from '@playwright/test';

import {
  a11y,
  SNAPSHOTS_ENABLED,
  test as standTest,
  unexpectedViolations,
  VIEWPORTS,
} from '../helpers/harness.js';

const SEL = {
  // Каркас подвала — связки ftp-* паттерн-слоя (T17.13); приглушённый тон —
  // модификатор ftp--muted (второй экземпляр дока — на div, contentinfo
  // один).
  footer: 'body > footer.ftp',
  address: 'body > footer.ftp address',
  tel: 'a[href^="tel:"]',
  mail: 'a[href^="mailto:"]',
  socials: 'a.ftp__social',
  top: 'a.ftp__top',
};

standTest.describe('patterns/footer: ленмарки (AC — правила ленмарк)', () => {
  standTest(
    'паттерн-подвал на уровне body после main: contentinfo — разметка паттерна',
    async ({ stand }) => {
      const page = await stand('patterns/footer');

      // Единственный подвал уровня body — паттерн; стоит после main.
      const footers = page.locator('body > footer');
      await expect(footers, 'ровно один подвал уровня body').toHaveCount(1);
      await expect(footers).toHaveClass(/ftp/);

      const order = await page.evaluate(() => {
        const main = document.querySelector('body > main');
        const footer = document.querySelector('body > footer');
        return Boolean(main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      expect(order, 'подвал после main (чтение: контент → подвал)').toBe(true);

      // Contentinfo-лендмарка резолвится ролью (не только тегом).
      await expect(page.getByRole('contentinfo')).toHaveClass(/ftp/);
    },
  );

  standTest(
    'колонка ссылок — навигация с aria-label (канон ftp — одна колонка, T17.13)',
    async ({ stand }) => {
      const page = await stand('patterns/footer');

      const navs = await page
        .locator(`${SEL.footer} nav[aria-label]`)
        .evaluateAll((nodes) => nodes.map((nav) => nav.getAttribute('aria-label')));
      expect(navs.length, 'колонка ссылок — навигация с именем (канон ftp)').toBeGreaterThanOrEqual(
        1,
      );
      // Имена навигаций сниппета уникальны (вторая — приглушённый вариант-демо
      // на div, в contentinfo-лендмарку не входит).
      const allNavs = await page
        .locator('footer.ftp nav[aria-label], div.ftp nav[aria-label]')
        .evaluateAll((nodes) => nodes.map((nav) => nav.getAttribute('aria-label')));
      expect(new Set(allNavs).size, 'aria-label навигаций уникальны').toBe(allNavs.length);

      for (const label of navs) {
        const list = page.getByRole('navigation', { name: label });
        await expect(
          list.locator('ul li a').first(),
          `колонка «${label}»: список ссылок`,
        ).toBeVisible();
      }
    },
  );
});

standTest.describe('patterns/footer: контакты в address (Technical considerations)', () => {
  standTest(
    'address с адресом; tel- и mailto-ссылки — рядом в группе контактов (канон ftp, T17.13)',
    async ({ stand }) => {
      const page = await stand('patterns/footer');

      // Канон ftp (как в career-portal): <address> несёт физический адрес,
      // телефон/почта — группа .ftp__contact-group рядом (первый экземпляр —
      // копируемый <footer>; второй, приглушённый, — тон-специмен на div).
      const address = page.locator(SEL.address);
      await expect(address, 'контакты обёрнуты в <address>').toBeVisible();
      await expect(address, 'адрес — текстом в address').toContainText('Москва');

      const contacts = page.locator('footer.ftp .ftp__contact-group');
      await expect(contacts, 'группа телефон/почта на месте').toBeVisible();
      await expect(contacts.locator(SEL.tel), 'телефон — ссылка tel:').toHaveCount(1);
      await expect(contacts.locator(SEL.mail), 'почта — ссылка mailto:').toHaveCount(1);

      const telHref = await contacts.locator(SEL.tel).getAttribute('href');
      expect(telHref, 'tel: — машиночитаемый номер без пробелов').toMatch(/^tel:\+?\d+$/);
    },
  );

  standTest('icon-only соцсети несут aria-label (T4.1; axe link-name)', async ({ stand }) => {
    const page = await stand('patterns/footer');
    const socials = page.locator(SEL.socials);
    const count = await socials.count();
    expect(count, 'соцсети на месте').toBeGreaterThanOrEqual(2);
    for (let i = 0; i < count; i += 1) {
      const label = await socials.nth(i).getAttribute('aria-label');
      expect(label, `соцсеть ${i}: aria-label обязателен (icon-only)`).toBeTruthy();
    }
  });
});

standTest.describe('patterns/footer: переход кверху (Scope)', () => {
  standTest('ссылка #top ведёт на якорь начала страницы, цель существует', async ({ stand }) => {
    const page = await stand('patterns/footer');

    // Скоуп — копируемый <footer>: у тон-специмена на div своя ссылка «Наверх»
    // (дубль контента канона — см. исключение region в KNOWN_AXE_EXCEPTIONS).
    const top = page.locator('footer.ftp a.ftp__top');
    await expect(top, 'ссылка «Наверх» на месте').toBeVisible();
    await expect(top).toHaveAttribute('href', '#top');
    // Цель якоря существует в каркасе (правило «цель существует» — пара T3.5).
    await expect(page.locator('#top'), 'якорь #top в начале страницы').toBeVisible();

    await top.click();
    await page.waitForURL(/#top/);
    expect(new URL(page.url()).hash, 'переход кверху работает как обычный якорь (без JS)').toBe(
      '#top',
    );
  });
});

standTest.describe('patterns/footer: a11y страницы (AC)', () => {
  standTest('axe чист (вне реестра KNOWN_AXE_EXCEPTIONS)', async ({ stand }) => {
    const page = await stand('patterns/footer');
    const results = await a11y(page).analyze();
    expect(
      unexpectedViolations(results),
      'axe: нарушений вне реестра нет (тон-специмен .ftp--muted — запись в реестре)',
    ).toEqual([]);
  });

  standTest(
    'иерархия заголовков: один h1 каркаса, подвал заголовков не несёт',
    async ({ stand }) => {
      const page = await stand('patterns/footer');
      const levels = await page.evaluate(() =>
        [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1])),
      );
      expect(
        levels.filter((level) => level === 1),
        'h1 один (гейт irao/one-h1)',
      ).toHaveLength(1);
      const outsideMain = await page.evaluate(
        () => document.querySelectorAll('footer :is(h1,h2,h3,h4,h5,h6)').length,
      );
      expect(outsideMain, 'в подвале заголовков нет (каркас)').toBe(0);
      for (let i = 1; i < levels.length; i += 1) {
        expect(
          levels[i],
          `заголовок №${i}: без пропуска уровня (гейт irao/heading-order)`,
        ).toBeLessThanOrEqual(levels[i - 1] + 1);
      }
    },
  );
});

standTest.describe('patterns/footer: эталоны (AC: visual; ADR-0004 — только контейнер/CI)', () => {
  standTest('эталоны подвала на шкале вьюпортов — element-снимки', async ({ stand }) => {
    const page = await stand('patterns/footer');
    const footer = page.locator(SEL.footer);

    for (const viewport of Object.keys(VIEWPORTS)) {
      await page.setViewportSize(VIEWPORTS[viewport]);
      const info = standTest.info();
      if (!SNAPSHOTS_ENABLED || info.project.name !== 'chromium') {
        info.annotations.push({
          type: 'shot-skipped',
          description:
            `footer--${viewport}: эталоны создаются только из контейнера/CI ` +
            '(ADR-0004) — запустите npm run test:docker',
        });
        continue;
      }
      await expect(footer).toHaveScreenshot(`footer--${viewport}.png`, {
        animations: 'disabled',
        caret: 'hide',
      });
    }
  });
});

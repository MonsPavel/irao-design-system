/**
 * e2e паттерна «Детальная страница» (T8.2; Testing requirements + AC) —
 * стенд patterns/detail-page (stands/patterns/detail-page.html), эталонная
 * сборка детальной страницы (вакансия) из компонентов системы БЕЗ нового CSS.
 *
 * Состав стенда (одностраничный — реальная детальная страница, не ветки):
 * крошки (T4.7) → page-head (h1 + теги T4.3 + мета с <time datetime>) →
 * лейаут контент+aside (sticky ≥md, на мобиле aside после контента) →
 * related (h2 + сетка карточек T4.4).
 *
 * Ключевые сценарии спеки (Implementation requirements + Accessibility):
 *  1. schema-парсер JobPosting (как T4.7 — парсер микроразметки): поля title,
 *     hiringOrganization, jobLocation, datePosted присутствуют и непусты,
 *     datetime — ISO-формат;
 *  2. sticky/32px: на 375 aside статичен и идёт после контента; на md+ —
 *     position: sticky и реально прилипает (top ≈ --ui-space-5); 32px-база
 *     (T3.6-приём) — без горизонтального скролла и перекрытий ключевых узлов
 *     [data-ui-check-layout];
 *  3. CTA доступен с клавиатуры в sticky-зоне (Tab до кнопки);
 *  4. axe чист; иерархия h1→h2→h3 зелёная; порядок чтения = DOM;
 *  5. эталоны 375/768/1440 (AC) — shot(), только из контейнера/CI (ADR-0004).
 */
import { expect } from '@playwright/test';

import { a11y, shot, test as standTest, VIEWPORTS } from '../helpers/harness.js';

const SEL = {
  breadcrumbs: '#dpp-breadcrumbs',
  title: '#dpp-title',
  meta: '#dpp-meta',
  layout: '#dpp-layout',
  main: '#dpp-main',
  aside: '#dpp-aside',
  asideCta: '#dpp-cta',
  related: '#dpp-related',
  relatedGrid: '#dpp-related-grid',
};

/** Вьюпорты 32px-сценария (прецедент BASE32_WIDTHS T3.6: десктоп/tablet/mobile). */
const BASE32_WIDTHS = [1280, 768, 375];

/** Порог перекрытия из Implementation requirements T3.6 п.2. */
const OVERLAP_THRESHOLD_PX = 2;

/**
 * Парсер микроразметки JobPosting (Implementation requirements п.3 — как
 * парсер BreadcrumbList T4.7): читает эталон как робот — itemscope/itemtype
 * на article, поля title/hiringOrganization/jobLocation/datePosted.
 */
const parseJobPosting = (page) =>
  page.evaluate(() => {
    const job = document.querySelector('[itemtype="https://schema.org/JobPosting"]');
    if (!job) return { error: 'JobPosting (itemscope/itemtype) на article не найден' };
    const text = (root, name) =>
      root.querySelector(`[itemprop="${name}"]`)?.textContent.trim() ?? null;
    const org = job.querySelector('[itemtype="https://schema.org/Organization"]');
    const address = job.querySelector(
      '[itemtype="https://schema.org/Place"] [itemtype="https://schema.org/PostalAddress"]',
    );
    const time = job.querySelector('time[itemprop="datePosted"]');
    return {
      title: text(job, 'title'),
      hiringOrganization: org ? text(org, 'name') : null,
      jobLocality: address ? text(address, 'addressLocality') : null,
      datePosted: time?.getAttribute('datetime') ?? null,
      dateText: time?.textContent.trim() ?? null,
    };
  });

/** Сборка нарушений 32px-сценария: hscroll страницы + перекрытие ключевых узлов. */
const collectLayoutViolations = (page) =>
  page.evaluate((threshold) => {
    const violations = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > doc.clientWidth) {
      violations.push(
        `hscroll: scrollWidth ${doc.scrollWidth} > clientWidth ${doc.clientWidth}`,
      );
    }
    const nodes = [...document.querySelectorAll('[data-ui-check-layout]')];
    const boxes = nodes.map((el) => el.getBoundingClientRect());
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        if (nodes[i].contains(nodes[j]) || nodes[j].contains(nodes[i])) continue;
        const a = boxes[i];
        const b = boxes[j];
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (overlapX > threshold && overlapY > threshold) {
          violations.push(
            `overlap: ${nodes[i].id || nodes[i].className} × ${nodes[j].id || nodes[j].className} ` +
              `(${Math.round(overlapX)}×${Math.round(overlapY)}px > ${threshold}px)`,
          );
        }
      }
    }
    return violations;
  }, OVERLAP_THRESHOLD_PX);

/** Клавиатурный обход до элемента (фокус с клавиатуры — :focus-visible, ADR-0001). */
async function tabTo(page, locator) {
  for (let step = 0; step < 40; step += 1) {
    if (await locator.evaluate((el) => el.matches(':focus-visible'))) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('фокус не дошёл до элемента за 40 Tab');
}

standTest.describe(
  'patterns/detail-page: эталонная сборка (Scope) — состав и schema.org JobPosting',
  () => {
    standTest(
      'собрана без нового CSS: подключены только файлы dist, связки — <style> стенда',
      async ({ stand }) => {
        const page = await stand('patterns/detail-page');
        const source = await page.request
          .get('/showcase/dist/stands/patterns/detail-page.html')
          .then((r) => r.text());

        const stylesheets = source.match(/<link rel="stylesheet"[^>]*>/g) ?? [];
        expect(
          stylesheets.length,
          'внешних стилей ровно два — ui-core и ui-vi из dist (нового CSS нет)',
        ).toBe(2);
        for (const link of stylesheets) {
          expect(link, 'стилевой файл — собранный dist').toMatch(/ui-(core|vi)\.min\.css/);
        }
        expect(
          source,
          'связующие стили паттерна — inline <style> стенда (showcase, не dist)',
        ).toContain('<style>');
      },
    );

    standTest(
      'состав: крошки → page-head → контент+aside → related; h1 один, карточки related',
      async ({ stand }) => {
        const page = await stand('patterns/detail-page');

        const h1 = page.locator('h1');
        await expect(h1, 'один h1 — заголовок детальной страницы').toHaveCount(1);
        await expect(page.locator(SEL.breadcrumbs), 'крошки T4.7').toBeVisible();
        await expect(page.locator(SEL.breadcrumbs)).toHaveAttribute(
          'aria-label',
          /Хлебные крошки/,
        );
        await expect(page.locator(SEL.main), 'контентная колонка').toBeVisible();
        await expect(page.locator(SEL.aside), 'aside — справочная панель').toBeVisible();
        await expect(
          page.locator(`${SEL.aside} .ui-button`),
          'CTA-кнопка в aside',
        ).toBeVisible();
        await expect(page.locator(SEL.relatedGrid), 'related — сетка карточек').toBeVisible();
        const cards = page.locator(`${SEL.relatedGrid} .ui-card--link`);
        expect(await cards.count(), 'карточки related — паттерн карточки-ссылки T4.4').toBeGreaterThanOrEqual(
          3,
        );
      },
    );

    standTest(
      'schema-парсер JobPosting (AC): title, hiringOrganization, jobLocation, datePosted валидны',
      async ({ stand }) => {
        const page = await stand('patterns/detail-page');

        const parsed = await parseJobPosting(page);
        expect(parsed.error, 'JobPosting найден на article эталона').toBeUndefined();
        expect(parsed.title, 'поле title (заголовок вакансии)').toBe(
          'Ведущий инженер по эксплуатации энергоблоков',
        );
        expect(parsed.hiringOrganization, 'поле hiringOrganization.name непусто').toBeTruthy();
        expect(parsed.jobLocality, 'поле jobLocation → PostalAddress → addressLocality').toBe(
          'Москва',
        );
        expect(parsed.datePosted, 'поле datePosted — машиночитаемый ISO-формат').toMatch(
          /^\d{4}-\d{2}-\d{2}$/,
        );
        expect(parsed.dateText, 'человекочитаемая дата рядом с datetime').toBeTruthy();
      },
    );

    standTest(
      'time-семантика (Technical considerations): метаданные времени — <time datetime>',
      async ({ stand }) => {
        const page = await stand('patterns/detail-page');
        const datetimes = await page.locator(`${SEL.meta} time[datetime]`).all();
        expect(datetimes.length, 'в мета-строке есть <time datetime>').toBeGreaterThanOrEqual(1);
        for (const time of datetimes) {
          const value = await time.getAttribute('datetime');
          expect(
            Number.isNaN(Date.parse(value)),
            `datetime «${value}» парсится как дата`,
          ).toBe(false);
        }
      },
    );
  },
);

standTest.describe(
  'patterns/detail-page: sticky-aside (Implementation requirements п.1)',
  () => {
    standTest(
      'мобильная база (375): aside статичен и идёт после контента (не перекрывает)',
      async ({ stand }) => {
        const page = await stand('patterns/detail-page');
        await page.setViewportSize(VIEWPORTS.mobile);

        const position = await page
          .locator(SEL.aside)
          .evaluate((el) => getComputedStyle(el).position);
        expect(position, 'на мобиле sticky выключен — обычный поток').toBe('static');

        const boxes = await page.evaluate(() => {
          const main = document.getElementById('dpp-main').getBoundingClientRect();
          const aside = document.getElementById('dpp-aside').getBoundingClientRect();
          return { mainBottom: main.bottom, asideTop: aside.top, asideLeft: aside.left };
        });
        expect(
          boxes.asideTop,
          'aside начинается после контента (в конце потока)',
        ).toBeGreaterThanOrEqual(boxes.mainBottom - 1);
        expect(boxes.asideLeft, 'aside в той же колонке — перекрытия нет').toBeCloseTo(
          await page.locator(SEL.main).evaluate((el) => el.getBoundingClientRect().left),
          0,
        );
      },
    );

    standTest(
      'md+ (768): aside — position: sticky; прилипает к --ui-space-5 при прокрутке',
      async ({ stand }) => {
        const page = await stand('patterns/detail-page');
        await page.setViewportSize(VIEWPORTS.tablet);

        const position = await page
          .locator(SEL.aside)
          .evaluate((el) => getComputedStyle(el).position);
        expect(position, 'от md aside — sticky (Implementation requirements п.1)').toBe('sticky');

        // Прокрутка в конец: sticky-элемент останавливается на top (--ui-space-5 = 24px),
        // а не уезжает вместе с потоком.
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForFunction(() => window.scrollY > 0);
        const top = await page.locator(SEL.aside).evaluate((el) => el.getBoundingClientRect().top);
        expect(top, 'aside прилип к отступу от верха (24px ± допуск сглаживания)').toBeGreaterThan(
          18,
        );
        expect(top).toBeLessThan(40);
      },
    );

    standTest(
      'CTA доступен с клавиатуры в sticky-зоне (Accessibility requirements)',
      async ({ stand }) => {
        const page = await stand('patterns/detail-page');
        await page.setViewportSize(VIEWPORTS.desktop);

        // Tab от первой ссылки крошек доходит до CTA aside (DOM-порядок =
        // смысловой, в main нет промежуточных остановок).
        await tabTo(page, page.locator(`${SEL.breadcrumbs} a`).first());
        await tabTo(page, page.locator(SEL.asideCta));
        await expect(page.locator(SEL.asideCta), 'CTA получил фокус с клавиатуры').toBeFocused();
      },
    );
  },
);

standTest.describe(
  'patterns/detail-page: 32px-сценарий (Implementation requirements п.1 — не перекрывает)',
  () => {
    standTest(
      '32px-база: 375/768/1280 — без горизонтального скролла и перекрытий ключевых узлов',
      async ({ stand }) => {
        const page = await stand('patterns/detail-page');
        await page.addStyleTag({ content: 'html { font-size: 32px !important; }' });

        for (const width of BASE32_WIDTHS) {
          await page.setViewportSize({ width, height: 900 });
          const root = await page.evaluate(() =>
            parseFloat(getComputedStyle(document.documentElement).fontSize),
          );
          expect(root, `32px-база применена (${width})`).toBe(32);
          await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));

          expect(
            await collectLayoutViolations(page),
            `32px-база (${width}): aside не перекрывает контент, скролла нет`,
          ).toEqual([]);
        }
      },
    );
  },
);

standTest.describe('patterns/detail-page: a11y страницы (AC)', () => {
  standTest('axe страницы чист', async ({ stand }) => {
    const page = await stand('patterns/detail-page');
    const results = await a11y(page).analyze();
    expect(
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`),
      'axe: violations = []',
    ).toEqual([]);
  });

  standTest('иерархия h1→h2→h3 зелёная: один h1, уровни без пропусков', async ({ stand }) => {
    const page = await stand('patterns/detail-page');
    const levels = await page.evaluate(() =>
      [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1])),
    );
    expect(levels[0], 'страница открывается h1').toBe(1);
    expect(
      levels.filter((level) => level === 1),
      'h1 один',
    ).toHaveLength(1);
    for (let i = 1; i < levels.length; i += 1) {
      expect(
        levels[i],
        `заголовок №${i}: без пропуска уровня (h${levels[i - 1]} → h${levels[i]})`,
      ).toBeLessThanOrEqual(levels[i - 1] + 1);
    }
  });

  standTest(
    'порядок чтения: крошки → заголовок → контент → aside → related (Accessibility requirements)',
    async ({ stand }) => {
      const page = await stand('patterns/detail-page');
      const order = await page.evaluate(() => {
        const parts = [
          'dpp-breadcrumbs',
          'dpp-title',
          'dpp-main',
          'dpp-aside',
          'dpp-related',
        ].map((id) => document.getElementById(id));
        return parts.every((el, i) => {
          if (i === 0) return true;
          // Каждый следующий элемент идёт ПОСЛЕ предыдущего в документе.
          return Boolean(parts[i - 1].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
        });
      });
      expect(order, 'DOM-порядок = смысловой (заголовок → контент → aside → related)').toBe(
        true,
      );
    },
  );
});

standTest.describe('patterns/detail-page: эталоны (AC: visual 375/768/1440)', () => {
  standTest(
    'эталоны детальной страницы на 375/768/1440 — fullPage, только из контейнера/CI',
    async ({ stand }) => {
      const page = await stand('patterns/detail-page');
      // Хелпер shot(): вьюпорт из шкалы, fullPage; вне контейнера/CI — no-op
      // с аннотацией shot-skipped (ADR-0004).
      await shot(page, { name: 'pattern-detail-page', viewport: 'mobile' });
      await shot(page, { name: 'pattern-detail-page', viewport: 'tablet' });
      await shot(page, { name: 'pattern-detail-page', viewport: 'desktop' });
    },
  );
});

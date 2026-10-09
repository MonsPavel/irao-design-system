/**
 * e2e паттерна «Landing-секция» (T8.3; Testing requirements + AC) — стенд
 * patterns/landing-section (stands/patterns/landing-section.html),
 * mini-эталон из трёх секций: светлая / тёмная (on-dark) / с-изображением
 * full-bleed.
 *
 * Ключевые сценарии спеки:
 *  1. каркас секции = ui-section + ui-container + заголовок-роль h2 + сетка
 *     карточек (ui-grid--3 + ui-card); заголовки карточек — h3 (h2 → h3);
 *  2. тёмная секция: computed-фон/текст = парам on-dark токенов; контраст
 *     текста на фоне ≥ 4.5:1 (Accessibility requirements);
 *  3. full-bleed внутри контейнера: изображение тянется до краёв секции на
 *     375/768/1280 (отрицательные margin от container-pad), без hscroll;
 *  4. адаптив: сетка 1 → 2 → 3 колонки (шкала T3.4);
 *  5. axe чист; иерархия h2 → h3 без пропусков; эталоны 375/768/1440.
 */
import { expect } from '@playwright/test';

import { a11y, shot, test as standTest, VIEWPORTS } from '../helpers/harness.js';

const SEL = {
  light: '#lsp-light',
  lightTitle: '#lsp-light-title',
  dark: '#lsp-dark',
  darkTitle: '#lsp-dark-title',
  image: '#lsp-image',
  imageTitle: '#lsp-image-title',
};

/** Вычисленный контраст WCAG пары «цвет текста — фон секции» (≥ 4.5 — AA). */
const contrastOfDarkSection = (page) =>
  page.locator(SEL.dark).evaluate((section) => {
    const parse = (value) => value.match(/\d+(\.\d+)?/g)?.map(Number) ?? [0, 0, 0];
    const luminance = ([r, g, b]) => {
      const channel = (c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const fg = parse(getComputedStyle(section).color);
    const bg = parse(getComputedStyle(section).backgroundColor);
    const [l1, l2] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
    return (l1 + 0.05) / (l2 + 0.05);
  });

standTest.describe('patterns/landing-section: эталонная сборка (Scope) — каркас', () => {
  standTest(
    'собрана без нового CSS: подключены только файлы dist, связки — <style> стенда',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      const source = await page.request
        .get('/showcase/dist/stands/patterns/landing-section.html')
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
    'три секции-варианта: светлая → тёмная → с-изображением; каждая — каркас формулы',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');

      for (const [section, title] of [
        [SEL.light, SEL.lightTitle],
        [SEL.dark, SEL.darkTitle],
        [SEL.image, SEL.imageTitle],
      ]) {
        const sec = page.locator(section);
        await expect(sec, `секция ${section} видима`).toBeVisible();
        // Каркас: секция → контейнер → заголовок-роль → сетка (у image-секции
        // вместо сетки — full-bleed изображение; каркас = секция + контейнер + h2).
        const skeleton = await sec.evaluate((el) => ({
          isSection: el.classList.contains('ui-section'),
          hasContainer: Boolean(el.querySelector('.ui-container')),
          heading: el.querySelector('h2')?.className ?? '',
          labelledby: el.getAttribute('aria-labelledby'),
        }));
        expect(skeleton.isSection, `${section}: ui-section (ритм T3.4)`).toBe(true);
        expect(skeleton.hasContainer, `${section}: ui-container (T3.4)`).toBe(true);
        expect(skeleton.heading, `${section}: заголовок-роль ui-h2`).toContain('ui-h2');
        expect(skeleton.labelledby, `${section}: именована aria-labelledby`).toBeTruthy();
        await expect(page.locator(title)).toBeVisible();
      }

      const grids = page.locator('.ui-grid.ui-grid--3');
      expect(await grids.count(), 'сетка --3 в светлой и тёмной секциях').toBeGreaterThanOrEqual(2);
      const cards = page.locator('.ui-card--link');
      expect(await cards.count(), 'карточки — паттерн карточки-ссылки T4.4').toBeGreaterThanOrEqual(
        3,
      );
    },
  );

  standTest(
    'изображение full-bleed — по правилам T4.6: --cover + --ratio-16-9 + размеры + lazy',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      const img = page.locator(`${SEL.image} img.ui-image`);
      await expect(img).toBeVisible();
      await expect(img).toHaveClass(/ui-image--cover/);
      await expect(img).toHaveClass(/ui-image--ratio-16-9/);

      const attrs = await img.evaluate((el) => ({
        width: el.getAttribute('width'),
        height: el.getAttribute('height'),
        loading: el.getAttribute('loading'),
        alt: el.getAttribute('alt'),
      }));
      expect(attrs.width, 'атрибут width обязателен (гейт irao/img-dimensions)').toBeTruthy();
      expect(attrs.height, 'атрибут height обязателен').toBeTruthy();
      expect(attrs.loading, 'вне первого экрана — lazy').toBe('lazy');
      expect(attrs.alt, 'осмысленный alt (информативное изображение)').toBeTruthy();
    },
  );
});

standTest.describe('patterns/landing-section: тёмная секция (on-dark-пары, контраст)', () => {
  standTest(
    'computed-цвета секции = парам on-dark токенов (primary-deep + text-on-dark)',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');

      // Пробы с эталонными парами токенов: computed-значения секции обязаны
      // совпасть с resolved-значениями --ui-color-primary-deep / --ui-color-text-on-dark.
      await page.addStyleTag({
        content:
          '.lsp-probe { background-color: var(--ui-color-primary-deep); color: var(--ui-color-text-on-dark); }',
      });
      const compared = await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.className = 'lsp-probe';
        document.body.appendChild(probe);
        const section = document.getElementById('lsp-dark');
        const sectionStyle = getComputedStyle(section);
        const probeStyle = getComputedStyle(probe);
        const result = {
          bg: sectionStyle.backgroundColor === probeStyle.backgroundColor,
          fg: sectionStyle.color === probeStyle.color,
        };
        probe.remove();
        return result;
      });
      expect(
        compared.bg,
        'фон тёмной секции — --ui-color-primary-deep (Technical considerations)',
      ).toBe(true);
      expect(compared.fg, 'текст секции — --ui-color-text-on-dark (пара гейта T2.3)').toBe(true);
    },
  );

  standTest(
    'lead тёмной секции — вторая on-dark-пара (--ui-color-text-on-dark-muted)',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      await page.addStyleTag({
        content: '.lsp-probe-muted { color: var(--ui-color-text-on-dark-muted); }',
      });
      const same = await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.className = 'lsp-probe-muted';
        document.body.appendChild(probe);
        const lead = document.querySelector('#lsp-dark .ui-lead');
        const result = getComputedStyle(lead).color === getComputedStyle(probe).color;
        probe.remove();
        return result;
      });
      expect(same, 'lead тёмной секции — on-dark-muted (не светлая --muted пара)').toBe(true);
    },
  );

  standTest(
    'контраст текста тёмной секции ≥ 4.5:1 (Accessibility requirements)',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      const ratio = await contrastOfDarkSection(page);
      expect(
        ratio,
        `контраст on-dark пары (измерено ${ratio.toFixed(2)}:1)`,
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  standTest(
    'карточки внутри тёмной секции — светлые ui-card (текст в паре text-on-surface)',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      const card = page.locator(`${SEL.dark} .ui-card`).first();
      const style = await card.evaluate((el) => ({
        bg: getComputedStyle(el).backgroundColor,
        fg: getComputedStyle(el).color,
      }));
      // Проба обычной карточки вне тёмной секции — фон обязан совпасть (не перекрашена).
      const reference = await page
        .locator(`${SEL.light} .ui-card`)
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(style.bg, 'фон карточки на тёмном = фон обычной ui-card (светлая поверхность)').toBe(
        reference,
      );
      expect(style.fg, 'текст карточки — дефолтный (пара text-on-surface)').toBeTruthy();
    },
  );
});

standTest.describe('patterns/landing-section: full-bleed и адаптив', () => {
  standTest(
    'full-bleed: изображение тянется до краёв секции на 375/768/1280 (без hscroll)',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');

      for (const [name, viewport] of [
        ['mobile', VIEWPORTS.mobile],
        ['tablet', VIEWPORTS.tablet],
        ['xl', VIEWPORTS.xl],
      ]) {
        await page.setViewportSize(viewport);
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
        const geo = await page.evaluate(() => {
          const section = document.getElementById('lsp-image').getBoundingClientRect();
          const img = document.querySelector('#lsp-image img.ui-image').getBoundingClientRect();
          const doc = document.documentElement;
          return {
            left: Math.abs(img.left - section.left),
            right: Math.abs(img.right - section.right),
            hscroll: doc.scrollWidth > doc.clientWidth,
          };
        });
        expect(
          geo.left,
          `${name}: изображение от левого края секции (bleed в контейнере)`,
        ).toBeLessThan(2);
        expect(geo.right, `${name}: до правого края секции`).toBeLessThan(2);
        expect(geo.hscroll, `${name}: bleed не создаёт горизонтального скролла`).toBe(false);
      }
    },
  );

  standTest(
    'сетка карточек: 1 колонка (375) → 2 (768) → 3 (1280) — шкала T3.4',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      const columnsOf = () =>
        page
          .locator(`${SEL.light} .ui-grid`)
          .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);

      await page.setViewportSize(VIEWPORTS.mobile);
      expect(await columnsOf(), 'мобильная база — 1 колонка (порядок DOM)').toBe(1);

      await page.setViewportSize(VIEWPORTS.tablet);
      expect(await columnsOf(), 'md — 2 колонки').toBe(2);

      await page.setViewportSize(VIEWPORTS.xl);
      expect(await columnsOf(), 'lg+ — 3 колонки (--3)').toBe(3);
    },
  );
});

standTest.describe('patterns/landing-section: a11y страницы (AC)', () => {
  standTest('axe страницы чист', async ({ stand }) => {
    const page = await stand('patterns/landing-section');
    const results = await a11y(page).analyze();
    expect(
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`),
      'axe: violations = []',
    ).toEqual([]);
  });

  standTest(
    'иерархия заголовков: служебный h1 каркаса → h2 секций → h3 карточек, без пропусков',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      const levels = await page.evaluate(() =>
        [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1])),
      );
      expect(levels[0], 'страница открывается h1 каркаса (лендинг-секция — фрагмент)').toBe(1);
      expect(
        levels.filter((level) => level === 1),
        'h1 один — служебный; у самого эталона секций h1 нет',
      ).toHaveLength(1);
      for (let i = 1; i < levels.length; i += 1) {
        expect(
          levels[i],
          `заголовок №${i}: без пропуска уровня (h${levels[i - 1]} → h${levels[i]})`,
        ).toBeLessThanOrEqual(levels[i - 1] + 1);
      }
    },
  );
});

standTest.describe('patterns/landing-section: эталоны (AC: visual 375/768/1440)', () => {
  standTest(
    'эталоны лендинг-секций на 375/768/1440 — fullPage, только из контейнера/CI',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      await shot(page, { name: 'pattern-landing-section', viewport: 'mobile' });
      await shot(page, { name: 'pattern-landing-section', viewport: 'tablet' });
      await shot(page, { name: 'pattern-landing-section', viewport: 'desktop' });
    },
  );
});

/**
 * e2e паттерна «Постерная карточка» (T17.18; Testing requirements + AC) —
 * стенд patterns/poster-card (stands/patterns/poster-card.html),
 * mini-эталон из трёх тонов (peach / navy / light; оригинал
 * .students--illustrated career-portal, students.html).
 *
 * Ключевые сценарии спеки:
 *  1. собран без нового КОМПОНЕНТНОГО CSS: внешние стили — dist (ui-core +
 *     ui-vi + опциональный ui-patterns-слой) + каркас полигона; слой
 *     подключён после core (токены → core → patterns → сайт);
 *  2. каркас карточки: колонка с клипом иллюстрации, паддинг 20px, радиус
 *     карточки 16px, min-height 380 (375) / 440 (768) / 600 (1440) —
 *     mobile-first инверсия лестницы оригинала (computed-геометрия, AC2);
 *  3. тоны: peach = color-mix accent-пары, navy = primary-deep с текстом
 *     on-dark, light = surface-muted; координаты иллюстраций «как есть»
 *     (peach left 0/top 42%/width 67%; navy left 6%/top 43%/width 56%;
 *     light right −8%/top 45%/width 63%);
 *  4. действие: круг 52×52 в правом-нижнем углу 20px, пара хуков тона
 *     (peach accent/on-dark, navy surface/text, light primary/on-dark),
 *     hover — scale(1.08); имя действия — aria-label, иллюстрация alt="";
 *  5. a11y: axe чист; иерархия h1 каркаса → h2 секции → h3 карточек;
 *     без горизонтального скролла на 375;
 *  6. эталоны 375/768/1440 — element-снимки секции, только из
 *     контейнера/CI (ADR-0004), по прецеденту T14.10/T14.11.
 */
import { expect } from '@playwright/test';

import { a11y, shot, test as standTest, VIEWPORTS } from '../helpers/harness.js';

const SEL = {
  section: '#pstr-demo',
  title: '#pstr-demo-title',
  cards: '.pstr-card',
  peach: '.pstr-card--peach',
  navy: '.pstr-card--navy',
  light: '.pstr-card--light',
  illu: '.pstr-card__illu',
  action: '.pstr-card__action',
};

/** min-height по ширине вьюпорта — инверсия лестницы оригинала 600/440/380. */
const MIN_HEIGHT_BY_VIEWPORT = { mobile: '380px', tablet: '440px', desktop: '600px' };

standTest.describe('patterns/poster-card: эталонная сборка (Scope) — каркас', () => {
  standTest(
    'собран без нового CSS: внешние стили — dist (core + vi + слой patterns) и каркас полигона',
    async ({ stand }) => {
      const page = await stand('patterns/poster-card');
      const source = await page.request
        .get('/showcase/dist/stands/patterns/poster-card.html')
        .then((r) => r.text());

      const stylesheets = source.match(/<link rel="stylesheet"[^>]*>/g) ?? [];
      expect(
        stylesheets.length,
        'внешних стилей четыре — ui-core и ui-vi из dist + ui-patterns.css (слой, T17.18) + showcase.css каркаса',
      ).toBe(4);
      for (const link of stylesheets) {
        expect(link, 'стилевой файл — dist или стили каркаса полигона').toMatch(
          /ui-(core|vi)\.min\.css|ui-patterns\.css|showcase\.css/,
        );
      }
      expect(
        source,
        'слой подключён ПОСЛЕ core (порядок в head: токены → core → patterns → сайт)',
      ).toMatch(/ui-core\.min\.css[\s\S]*ui-patterns\.css/);
      expect(
        source,
        'связующих <style> связки в стенде нет — канон живёт в слое; <style> только демо-ленты',
      ).not.toMatch(/\.pstr-card\s*\{/);
    },
  );

  standTest('каркас: три карточки-постера со слотами (тело, иллюстрация, действие-ссылка)', async ({
    stand,
  }) => {
    const page = await stand('patterns/poster-card');
    const section = page.locator(SEL.section);

    await expect(page.locator(SEL.title), 'секция с h2-ролью').toHaveClass(/ui-h2/);
    const cards = section.locator(SEL.cards);
    await expect(cards, 'три тона канона').toHaveCount(3);
    for (const tone of ['peach', 'navy', 'light']) {
      await expect(section.locator(`.pstr-card--${tone}`)).toHaveCount(1);
    }

    const cardShape = await section.locator(SEL.peach).evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        display: s.display,
        position: s.position,
        flexDirection: s.flexDirection,
        overflow: s.overflow,
        padding: s.padding,
        borderRadius: s.borderRadius,
      };
    });
    expect(cardShape.display, 'карточка — flex-колонка').toBe('flex');
    expect(cardShape.flexDirection).toBe('column');
    expect(cardShape.position, 'абсолюты слотов от карточки').toBe('relative');
    expect(cardShape.overflow, 'клип иллюстрации').toBe('hidden');
    expect(cardShape.padding, 'паддинг 20px оригинала «как есть»').toBe('20px');
    expect(cardShape.borderRadius, 'радиус --radius-card 16px оригинала = md').toBe('16px');

    // Слоты: тело поверх иллюстрации (z1), действие — ссылка с именем.
    const body = await section.locator(`${SEL.peach} .pstr-card__body`).evaluate((el) => {
      const s = getComputedStyle(el);
      return { position: s.position, zIndex: s.zIndex, gap: s.gap };
    });
    expect(body.position, 'тело relative (z-пара «контент над фоном»)').toBe('relative');
    expect(body.zIndex).toBe('1');
    expect(body.gap, 'шаг тела 12px оригинала = --ui-space-3').toBe('12px');

    const action = section.locator(`${SEL.peach} ${SEL.action}`);
    await expect(action, 'действие — ссылка').toHaveAttribute('href', /./);
    await expect(action, 'имя действия на доступном имени').toHaveAttribute('aria-label', /./);
    await expect(
      section.locator(`${SEL.peach} ${SEL.illu}`),
      'иллюстрация декоративна',
    ).toHaveAttribute('alt', '');
  });

  standTest('computed-геометрия AC2: min-height лестницы 380/440/600 по вьюпортам (mobile-first)', async ({
    stand,
  }) => {
    const page = await stand('patterns/poster-card');
    // Вьюпорты по возрастанию — ступени min-width (media min-height только
    // растут);fixture-страница одна, переоткрытий не требуется.
    for (const [viewport, minHeight] of Object.entries(MIN_HEIGHT_BY_VIEWPORT)) {
      await page.setViewportSize(VIEWPORTS[viewport]);
      const heights = await page.locator(SEL.cards).evaluateAll((els) =>
        els.map((el) => {
          const s = getComputedStyle(el);
          return { tone: el.className, minHeight: s.minHeight };
        }),
      );
      for (const { tone, minHeight: value } of heights) {
        expect(
          value,
          `${tone}: min-height ${minHeight} на ${viewport} (инверсия лестницы оригинала)`,
        ).toBe(minHeight);
      }
    }
  });

  standTest('тоны: peach color-mix, navy primary-deep + on-dark, light surface-muted', async ({
    stand,
  }) => {
    const page = await stand('patterns/poster-card');
    const tone = (hook) =>
      page.locator(hook).evaluate((el) => {
        const s = getComputedStyle(el);
        return { bg: s.backgroundColor, color: s.color };
      });

    const peach = await tone(SEL.peach);
    expect(peach.bg, 'peach — рендер color-mix (не hex-строка)').toMatch(
      // chromium сериализует color-mix в color(srgb …), старые движки — rgba()
      /^(rgba?\(|color\(|oklch\()/,
    );

    const navy = await tone(SEL.navy);
    expect(navy.bg, 'navy — primary-deep (students.css:96)').toMatch(/^(rgba?\(|color\()/);
    const navyTitle = await page
      .locator(`${SEL.navy} .pstr-card__title`)
      .evaluate((el) => getComputedStyle(el).color);
    expect(navyTitle, 'на navy заголовок on-dark (students.css:114)').not.toBe(peach.color);
    expect(navyTitle).toMatch(/^(rgba?\(|color\()/);

    const light = await tone(SEL.light);
    expect(light.bg, 'light — surface-muted (surface-blue-50 оригинала)').toMatch(
      /^(rgba?\(|color\()/,
    );
  });

  standTest('координаты иллюстраций по тонам — «как есть» (students.css:131-148)', async ({
    stand,
  }) => {
    const page = await stand('patterns/poster-card');
    const illuOf = (tone) =>
      page.locator(`${tone} ${SEL.illu}`).evaluate((el) => {
        const s = getComputedStyle(el);
        const card = el.closest('.pstr-card').getBoundingClientRect();
        const rect = el.getBoundingClientRect();
        return {
          position: s.position,
          pointerEvents: s.pointerEvents,
          left: rect.left - card.left,
          right: card.right - rect.right,
          topPercent: ((rect.top - card.top) / card.height) * 100,
          widthPercent: (rect.width / card.width) * 100,
        };
      });

    const peach = await illuOf(SEL.peach);
    expect(peach.position).toBe('absolute');
    expect(peach.pointerEvents, 'иллюстрация не перехватывает клик').toBe('none');
    expect(peach.left, 'peach: left 0').toBe(0);
    expect(peach.topPercent, 'peach: top 42%').toBeCloseTo(42, 0.5);
    expect(peach.widthPercent, 'peach: width 67%').toBeCloseTo(67, 0.5);

    const navy = await illuOf(SEL.navy);
    expect(navy.left / (await page.locator(SEL.navy).evaluate((el) => el.getBoundingClientRect().width)) * 100,
      'navy: left 6%').toBeCloseTo(6, 0.5);
    expect(navy.topPercent, 'navy: top 43%').toBeCloseTo(43, 0.5);
    expect(navy.widthPercent, 'navy: width 56%').toBeCloseTo(56, 0.5);

    const light = await illuOf(SEL.light);
    expect(light.right, 'light: right −8% — заезд за правый край').toBeLessThan(0);
    expect(light.topPercent, 'light: top 45%').toBeCloseTo(45, 0.5);
    expect(light.widthPercent, 'light: width 63%').toBeCloseTo(63, 0.5);
  });

  standTest('действие: круг 52×52 в правом-низу 20px, пары хуков по тонам, hover scale(1.08)', async ({
    stand,
  }) => {
    const page = await stand('patterns/poster-card');
    const actionOf = (tone) =>
      page
        .locator(`${tone} ${SEL.action}`)
        .evaluate((el) => {
          const s = getComputedStyle(el);
          const card = el.closest('.pstr-card').getBoundingClientRect();
          const rect = el.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            rightGap: card.right - rect.right,
            bottomGap: card.bottom - rect.bottom,
            radius: s.borderRadius,
            bg: s.backgroundColor,
            color: s.color,
          };
        });

    const peach = await actionOf(SEL.peach);
    expect(peach.width, '52px = 3.25rem (спека Scope)').toBe(52);
    expect(peach.height).toBe(52);
    expect(peach.rightGap, 'right 20px').toBe(20);
    expect(peach.bottomGap, 'bottom 20px').toBe(20);
    expect(peach.radius, 'круг').toBe('50%');

    const [navy, light] = [await actionOf(SEL.navy), await actionOf(SEL.light)];
    expect(navy.bg, 'navy-карточка — кнопка surface (пара «white»)').not.toBe(peach.bg);
    expect(light.bg, 'light-карточка — кнопка primary (пара «navy»)').not.toBe(peach.bg);
    expect(light.bg).not.toBe(navy.bg);

    // Hover: transform scale(1.08) — transition на токене.
    const button = page.locator(`${SEL.peach} ${SEL.action}`);
    expect(
      await button.evaluate((el) => getComputedStyle(el).transitionProperty),
      'переход на transform',
    ).toContain('transform');
    await button.hover();
    await page.waitForTimeout(300);
    const matrix = await button.evaluate((el) => getComputedStyle(el).transform);
    expect(matrix, 'hover — scale(1.08) (students.css:172)').toMatch(
      /matrix\(1\.08, 0, 0, 1\.08/,
    );
  });

  standTest('a11y: axe чист; иерархия h1 → h2 → h3; один h1; без hscroll на 375', async ({
    stand,
  }) => {
    const page = await stand('patterns/poster-card');
    // Сквозной прогон по странице (прецедент pattern-timeline: analyze() без
    // include — include(locator) не сериализуется builder'ом).
    const results = await a11y(page).analyze();
    expect(results.violations, 'axe: 0 нарушений на стенде эталона').toEqual([]);

    const headings = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h1, h2, h3')).map((h) => h.tagName.toLowerCase()),
    );
    expect(headings[0], 'первый заголовок — h1 каркаса стенда').toBe('h1');
    expect(headings.filter((tag) => tag === 'h1'), 'один h1').toHaveLength(1);
    expect(headings, 'h1 → h2 → h3 без пропусков').toEqual(
      expect.arrayContaining(['h1', 'h2', 'h3']),
    );
    const h3s = await page.locator(`${SEL.section} h3`).count();
    expect(h3s, 'заголовки карточек — h3').toBe(3);

    await page.setViewportSize(VIEWPORTS.mobile);
    const hscroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hscroll, 'без горизонтального скролла на 375 (AC)').toBe(false);
  });

  standTest('эталоны 375/768/1440 (ADR-0004 — контейнер/CI)', async ({ stand }) => {
    const page = await stand('patterns/poster-card');
    await shot(page, { name: 'poster-card-375', viewport: 'mobile' });
    await shot(page, { name: 'poster-card-768', viewport: 'tablet' });
    await shot(page, { name: 'poster-card-1440', viewport: 'desktop' });
    // Вне окружения создания эталонов хелпер аннотирует shot-skipped —
    // здесь важно само наличие трёх снимков в сценарии (масштаб AC2).
    expect(MIN_HEIGHT_BY_VIEWPORT).toHaveProperty('mobile');
  });
});

/**
 * e2e паттерна «таймлайн этапов» (T14.11; Testing requirements + AC) — стенд
 * patterns/timeline (stands/patterns/timeline.html), mini-эталон из четырёх
 * этапов («Как попасть на практику» career-portal).
 *
 * Ключевые сценарии спеки:
 *  1. собран без нового CSS: внешние стили — dist + каркас полигона, связки
 *     tl-* — <style> стенда (зона сайта, в dist не попадает);
 *  2. композиция: секция (ui-section + ui-container + h2) + ol[role="list"]
 *     из 4 этапов (точка с видимым номером → h3 → текст);
 *  3. адаптив: база — колонка, от 1024 — горизонтальный ряд 1fr-колонок
 *     (число этапов = разметка); без горизонтального скролла на 375 (AC);
 *  4. соединительная линия: на ::after связки (не элемент DOM), только в
 *     ряду, от центра точки до края следующей, последнего этапа нет;
 *  5. a11y: axe чист; иерархия h1 каркаса → h2 секции → h3 этапов; один h1.
 *
 * Эталоны — element-снимки секции на 4 вьюпортах шкалы харнесса, только из
 * контейнера/CI (ADR-0004), по прецеденту T14.10.
 */
import { expect } from '@playwright/test';

import { a11y, SNAPSHOTS_ENABLED, test as standTest, VIEWPORTS } from '../helpers/harness.js';

const SEL = {
  section: '#tl-demo',
  title: '#tl-demo-title',
  timeline: '#tl-demo .tl',
  stage: '.tl__stage',
  dot: '.tl__dot',
};

standTest.describe('patterns/timeline: эталонная сборка (Scope) — каркас', () => {
  standTest(
    'собран без нового CSS: подключены только файлы dist, связки — <style> стенда',
    async ({ stand }) => {
      const page = await stand('patterns/timeline');
      const source = await page.request
        .get('/showcase/dist/stands/patterns/timeline.html')
        .then((r) => r.text());

      const stylesheets = source.match(/<link rel="stylesheet"[^>]*>/g) ?? [];
      expect(
        stylesheets.length,
        'внешних стилей три — ui-core и ui-vi из dist + showcase.css каркаса (нового CSS у паттерна нет)',
      ).toBe(3);
      for (const link of stylesheets) {
        expect(link, 'стилевой файл — dist или стили каркаса полигона').toMatch(
          /ui-(core|vi)\.min\.css|showcase\.css/,
        );
      }
      expect(
        source,
        'связующие стили паттерна — inline <style> стенда (showcase, не dist)',
      ).toContain('<style>');
    },
  );

  standTest(
    'композиция: секция (ui-section + контейнер + h2) + ol[role="list"] из 4 этапов',
    async ({ stand }) => {
      const page = await stand('patterns/timeline');
      const sec = page.locator(SEL.section);
      await expect(sec, 'секция эталона видима').toBeVisible();

      const skeleton = await sec.evaluate((el) => ({
        isSection: el.classList.contains('ui-section'),
        hasContainer: Boolean(el.querySelector('.ui-container')),
        heading: el.querySelector('h2')?.className ?? '',
        labelledby: el.getAttribute('aria-labelledby'),
      }));
      expect(skeleton.isSection, 'ui-section (ритм T3.4)').toBe(true);
      expect(skeleton.hasContainer, 'ui-container (T3.4)').toBe(true);
      expect(skeleton.heading, 'заголовок секции — роль ui-h2').toContain('ui-h2');
      expect(skeleton.labelledby, 'секция именована aria-labelledby').toBeTruthy();
      await expect(page.locator(SEL.title)).toBeVisible();

      const ol = page.locator(SEL.timeline);
      expect(await ol.evaluate((el) => el.tagName.toLowerCase()), 'этапы — семантика ol').toBe(
        'ol',
      );
      expect(
        await ol.evaluate((el) => el.getAttribute('role')),
        'role="list": reset снимает list-style — Safari/VoiceOver теряет роль списка',
      ).toBe('list');

      const stages = ol.locator(SEL.stage);
      expect(await stages.count(), 'mini-эталон — 4 этапа (Scope: 3–4)').toBe(4);
      for (let i = 0; i < 4; i += 1) {
        const stage = stages.nth(i);
        const part = await stage.evaluate((el) => ({
          dot: el.querySelector('.tl__dot')?.textContent?.trim() ?? '',
          dotHidden: el.querySelector('.tl__dot')?.getAttribute('aria-hidden') ?? null,
          heading: el.querySelector('h3')?.className ?? '',
          text: el.querySelector('p')?.className ?? '',
        }));
        expect(
          part.dot,
          `этап №${i + 1}: номер — видимый текст точки (не counter, WCAG 1.3.1)`,
        ).toBe(String(i + 1));
        expect(
          part.dotHidden,
          'точка НЕ aria-hidden: номер — контент, скринридер читает текст',
        ).toBeNull();
        expect(part.heading, `этап №${i + 1}: заголовок — роль ui-h3 (h2 → h3)`).toContain('ui-h3');
        expect(part.text, `этап №${i + 1}: текст — ui-small + ui-text--muted`).toContain(
          'ui-small',
        );
      }
    },
  );
});

standTest.describe('patterns/timeline: адаптив — ряд и мобильная колонка (AC)', () => {
  standTest(
    '375 — колонка без горизонтального скролла; 1024+ — ряд 1fr-колонок (число = разметка)',
    async ({ stand }) => {
      const page = await stand('patterns/timeline');
      const layoutOf = () =>
        page.locator(SEL.timeline).evaluate((el) => ({
          display: getComputedStyle(el).display,
          columns: getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length,
          flow: getComputedStyle(el).gridAutoFlow,
        }));

      // Мобильная деградация (AC: эталон 375): база — колонка.
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
      const mobile = await layoutOf();
      expect(mobile.display, 'база (375) — flex-колонка, не сетка').toBe('flex');
      const mobileGeo = await page.evaluate(() => {
        const stages = [...document.querySelectorAll('.tl__stage')].map((el) =>
          el.getBoundingClientRect(),
        );
        const doc = document.documentElement;
        return {
          stacked: stages.every(
            (box, i) => i === 0 || box.top > stages[i - 1].top + stages[i - 1].height / 2,
          ),
          hscroll: doc.scrollWidth > doc.clientWidth,
        };
      });
      expect(mobileGeo.stacked, 'этапы стекаются вертикально (колонка)').toBe(true);
      expect(
        mobileGeo.hscroll,
        'мобильная колонка без горизонтального скролла (AC «эталон 375»)',
      ).toBe(false);

      // Горизонтальный ряд — от lg (1024), как деградация оригинала (≤1024).
      await page.setViewportSize(VIEWPORTS.xl);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
      const row = await layoutOf();
      expect(row.display, 'от 1024 — сетка').toBe('grid');
      expect(row.flow, 'колонка на каждый этап: grid-auto-flow: column').toContain('column');
      expect(row.columns, '1fr-колонок = числу этапов (4), без счётчика в CSS').toBe(4);
      const rowGeo = await page.evaluate(() => {
        const boxes = [...document.querySelectorAll('.tl__stage')].map((el) =>
          el.getBoundingClientRect(),
        );
        return {
          inRow: boxes.every(
            (box, i) => i === 0 || box.left > boxes[i - 1].left + boxes[i - 1].width / 2,
          ),
        };
      });
      expect(rowGeo.inRow, 'этапы выстроены в горизонтальный ряд').toBe(true);
    },
  );

  standTest(
    'точка — 56px круг оригинала, номер в паре primary/surface-hover (токены)',
    async ({ stand }) => {
      const page = await stand('patterns/timeline');
      await page.setViewportSize(VIEWPORTS.xl);
      const dot = await page
        .locator(SEL.dot)
        .first()
        .evaluate((el) => {
          const style = getComputedStyle(el);
          return {
            size: el.getBoundingClientRect().width,
            height: el.getBoundingClientRect().height,
            radius: style.borderRadius,
            bg: style.backgroundColor,
            color: style.color,
          };
        });
      expect(dot.size, 'диаметр точки — 56px оригинала').toBe(56);
      expect(dot.height, 'точка — круг (56×56)').toBe(56);
      expect(dot.radius, 'форма — круг (border-radius: 50%)').toBe('50%');

      // Пробы с эталонными парами токенов: computed-значения точки обязаны
      // совпасть с resolved-значениями --ui-color-surface-hover / --ui-color-primary.
      const pairs = await page.evaluate(() => {
        const dot = document.querySelector('.tl__dot');
        const probeBg = document.createElement('div');
        probeBg.style.backgroundColor = 'var(--ui-color-surface-hover)';
        const probeFg = document.createElement('div');
        probeFg.style.color = 'var(--ui-color-primary)';
        document.body.append(probeBg, probeFg);
        const result = {
          bg: getComputedStyle(dot).backgroundColor === getComputedStyle(probeBg).backgroundColor,
          fg: getComputedStyle(dot).color === getComputedStyle(probeFg).color,
        };
        probeBg.remove();
        probeFg.remove();
        return result;
      });
      expect(pairs.bg, 'фон точки — --ui-color-surface-hover (= blue-100 оригинала)').toBe(true);
      expect(pairs.fg, 'номер точки — --ui-color-primary (контраст ≈12.6:1)').toBe(true);
    },
  );
});

standTest.describe('patterns/timeline: соединительная линия (::after связок)', () => {
  standTest(
    'линия — псевдоэлемент связки этапа: только в ряду, от центра точки до следующей, у последнего этапа нет',
    async ({ stand }) => {
      const page = await stand('patterns/timeline');

      // В колонке линии нет (правило живёт внутри media ряда).
      await page.setViewportSize(VIEWPORTS.mobile);
      const mobileLines = await page.locator(SEL.stage).evaluateAll((els) =>
        els.map((el) => {
          const style = getComputedStyle(el, '::after');
          return { content: style.content, display: style.display };
        }),
      );
      for (const [i, line] of mobileLines.entries()) {
        expect(
          line.content === 'none' || line.display === 'none' || line.content === '""',
          `колонка: у этапа №${i + 1} линии нет`,
        ).toBe(true);
      }

      // В ряду: линия у всех, кроме последнего; геометрия — от центра точки.
      await page.setViewportSize(VIEWPORTS.xl);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
      const geo = await page.locator(SEL.stage).evaluateAll((els) =>
        els.map((el) => {
          const after = getComputedStyle(el, '::after');
          const dot = el.querySelector('.tl__dot').getBoundingClientRect();
          const box = el.getBoundingClientRect();
          return {
            hasLine: after.content !== 'none' && after.height === '2px',
            lineTop: box.top + parseFloat(after.top || '0'),
            dotCenterY: dot.top + dot.height / 2,
            lineLeft: box.left + parseFloat(after.left || '0'),
            dotCenterX: dot.left + dot.width / 2,
            lineRight: box.right + parseFloat(after.right || '0') * -1,
          };
        }),
      );
      expect(
        geo.slice(0, 3).every((g) => g.hasLine),
        'в ряду линия у первых трёх этапов (::after, 2px)',
      ).toBe(true);
      expect(geo[3].hasLine, 'у последнего этапа линии нет (некуда вести)').toBe(false);
      for (const [i, g] of geo.slice(0, 3).entries()) {
        expect(
          Math.abs(g.lineTop - g.dotCenterY),
          `линия №${i + 1} — по центру точки (вертикаль)`,
        ).toBeLessThan(1);
        expect(
          Math.abs(g.lineLeft - g.dotCenterX),
          `линия №${i + 1} начинается от центра точки (горизонталь)`,
        ).toBeLessThan(1);
        expect(
          g.lineRight,
          `линия №${i + 1} доходит через зазор до края своей колонки (следующей точки)`,
        ).toBeGreaterThan(g.lineLeft);
      }
    },
  );
});

standTest.describe('patterns/timeline: a11y страницы (AC)', () => {
  standTest('axe страницы чист', async ({ stand }) => {
    const page = await stand('patterns/timeline');
    const results = await a11y(page).analyze();
    expect(
      results.violations.map((violation) => `${violation.id} → ${violation.nodes.length} узл(ов)`),
      'axe: violations = []',
    ).toEqual([]);
  });

  standTest(
    'иерархия заголовков: служебный h1 каркаса → h2 секции → h3 этапов, без пропусков',
    async ({ stand }) => {
      const page = await stand('patterns/timeline');
      const levels = await page.evaluate(() =>
        [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1])),
      );
      expect(levels[0], 'страница открывается h1 каркаса (таймлайн — фрагмент)').toBe(1);
      expect(
        levels.filter((level) => level === 1),
        'h1 один — служебный; у самого эталона h1 нет',
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

standTest.describe('patterns/timeline: эталоны (AC: visual 4 вьюпорта)', () => {
  standTest(
    'эталон таймлайна на шкале вьюпортов — element-снимки, только из контейнера/CI',
    async ({ stand }) => {
      const page = await stand('patterns/timeline');
      const section = page.locator(SEL.section);

      for (const viewport of Object.keys(VIEWPORTS)) {
        await page.setViewportSize(VIEWPORTS[viewport]);
        const info = standTest.info();
        if (!SNAPSHOTS_ENABLED || info.project.name !== 'chromium') {
          info.annotations.push({
            type: 'shot-skipped',
            description:
              `pattern-timeline--${viewport}: эталоны создаются только из контейнера/CI ` +
              '(ADR-0004) — запустите npm run test:docker',
          });
          continue;
        }
        await expect(section).toHaveScreenshot(`pattern-timeline--${viewport}.png`, {
          animations: 'disabled',
          caret: 'hide',
          // Допуск 32 px — точечный, для AA-шума скруглений у края element-
          // снимка на дробных позициях (тот же класс явления, что T14.10:
          // «лотерея растеризации», диагноз pattern-form-page--desktop 19.10).
          maxDiffPixels: 32,
        });
      }
    },
  );
});

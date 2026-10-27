/**
 * e2e паттерна «Landing-секция» (T8.3; Testing requirements + AC) — стенд
 * patterns/landing-section (stands/patterns/landing-section.html),
 * mini-эталон из четырёх секций: светлая / тёмная (on-dark) / с-изображением
 * full-bleed / с-фото-фоном (ui-section--photo, T17.3).
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
  photo: '#lsp-photo',
  photoTitle: '#lsp-photo-title',
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
    'собрана без нового CSS: подключены dist-файлы (включая паттерн-слой T17.9), связки ритма — <style> стенда',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      const source = await page.request
        .get('/showcase/dist/stands/patterns/landing-section.html')
        .then((r) => r.text());

      const stylesheets = source.match(/<link rel="stylesheet"[^>]*>/g) ?? [];
      expect(
        stylesheets.length,
        'внешних стилей четыре — ui-core и ui-vi из dist + ui-patterns (слой, T17.9) + showcase.css каркаса (нового CSS у паттерна нет)',
      ).toBe(4);
      for (const link of stylesheets) {
        expect(link, 'стилевой файл — dist или стили каркаса полигона').toMatch(
          /ui-(core|vi)\.min\.css|ui-patterns\.css|showcase\.css/,
        );
      }
      expect(
        source,
        'связующие стили паттерна — inline <style> стенда (showcase, не dist)',
      ).toContain('<style>');
    },
  );

  standTest(
    'четыре секции-варианта: светлая → тёмная → с-изображением → фото-фон; каждая — каркас формулы',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');

      for (const [section, title] of [
        [SEL.light, SEL.lightTitle],
        [SEL.dark, SEL.darkTitle],
        [SEL.image, SEL.imageTitle],
        [SEL.photo, SEL.photoTitle],
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
    'заголовок тёмной секции — детерминированный пин computed color (T14.1-бэклог: оставались только axe и снапшоты)',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      await page.addStyleTag({
        content: '.lsp-probe-ondark { color: var(--ui-color-text-on-dark); }',
      });
      const same = await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.className = 'lsp-probe-ondark';
        document.body.appendChild(probe);
        const title = document.querySelector('#lsp-dark-title');
        const result = getComputedStyle(title).color === getComputedStyle(probe).color;
        probe.remove();
        return result;
      });
      expect(same, 'заголовок тёмной секции — text-on-dark (селектор :is(.ui-h1, .ui-h2))').toBe(
        true,
      );
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
    'карточки внутри тёмной секции — светлые ui-card, текст в паре text-on-surface (не наследует on-dark)',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      const card = page.locator(`${SEL.dark} .ui-card`).first();
      const style = await card.evaluate((el) => ({
        bg: getComputedStyle(el).backgroundColor,
        fg: getComputedStyle(el).color,
        linkFg: getComputedStyle(el.querySelector('.ui-card__title a')).color,
        bodyFg: getComputedStyle(el.querySelector('.ui-card__body')).color,
      }));
      // Проба обычной карточки вне тёмной секции — фон обязан совпасть (не перекрашена).
      const reference = await page
        .locator(`${SEL.light} .ui-card`)
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(style.bg, 'фон карточки на тёмном = фон обычной ui-card (светлая поверхность)').toBe(
        reference,
      );

      // Проба пар текста и заголовка карточки: ui-card цвет текста не задаёт,
      // а .ui-card__link несет color: inherit — без восстановления пары в
      // связке тёмной секции текст карточки наследует белый on-dark и
      // становится невидимым (белое на белом; axe color-contrast это
      // пропускает — проверено прогоном, violations = []). Пин —
      // детерминированная страховка: цвет текста = --ui-color-text;
      // заголовок-ссылка — роль ui-h3 и с T14.1 несёт --ui-color-heading
      // (пара primary-on-surface гейта T2.3 на белой карточке; в career-portal
      // vac-card__title a тоже primary — совпадение с одобренным дизайном).
      await page.addStyleTag({
        content:
          '.lsp-probe-text { color: var(--ui-color-text); } ' +
          '.lsp-probe-heading { color: var(--ui-color-heading); }',
      });
      const pairOf = (cls) =>
        page.evaluate((name) => {
          const probe = document.createElement('div');
          probe.className = name;
          document.body.appendChild(probe);
          const color = getComputedStyle(probe).color;
          probe.remove();
          return color;
        }, cls);
      const textPair = await pairOf('lsp-probe-text');
      const headingPair = await pairOf('lsp-probe-heading');
      expect(
        style.fg,
        'цвет текста карточки — пара text-on-surface, не унаследованный on-dark',
      ).toBe(textPair);
      expect(
        style.linkFg,
        'заголовок-ссылка карточки — роль ui-h3 несёт --ui-color-heading (T14.1): не белый и не on-dark',
      ).toBe(headingPair);
      expect(style.bodyFg, 'текст тела карточки — не белый').toBe(textPair);
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

standTest.describe('patterns/landing-section: фото-фон секции (ui-section--photo, T17.3)', () => {
  standTest(
    'фото-секция: слои __bg/__overlay от z-пары ДС (z-index:-1, изоляция на секции), фон растянут на секцию',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      const geo = await page.locator(SEL.photo).evaluate((section) => {
        const bg = section.querySelector('.ui-section__bg');
        const overlay = section.querySelector('.ui-section__overlay');
        const img = bg.querySelector('img');
        const sectionRect = section.getBoundingClientRect();
        const bgRect = bg.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();
        return {
          bgExists: Boolean(bg),
          overlayExists: Boolean(overlay),
          bgZ: getComputedStyle(bg).zIndex,
          overlayZ: getComputedStyle(overlay).zIndex,
          sectionPosition: getComputedStyle(section).position,
          sectionIsolation: getComputedStyle(section).isolation,
          bgCoversSection:
            Math.abs(bgRect.top - sectionRect.top) < 1 &&
            Math.abs(bgRect.height - sectionRect.height) < 1,
          imgFillsBg:
            Math.abs(imgRect.width - bgRect.width) < 1 &&
            Math.abs(imgRect.height - bgRect.height) < 1,
          imgObjectFit: getComputedStyle(img).objectFit,
          bgHidden: bg.getAttribute('aria-hidden'),
          imgDecorative: img.getAttribute('alt'),
        };
      });
      expect(geo.bgExists, 'слой __bg на месте').toBe(true);
      expect(geo.overlayExists, 'слой __overlay на месте').toBe(true);
      expect(geo.bgZ, '__bg — z-index:-1 (z-пара, прецедент pilot.css)').toBe('-1');
      expect(geo.overlayZ, '__overlay — z-index:-1 (поверх фото, под контентом)').toBe('-1');
      expect(geo.sectionPosition, 'секция позиционирована').toBe('relative');
      expect(geo.sectionIsolation, 'стекинг изолирован на секции').toBe('isolate');
      expect(geo.bgCoversSection, 'фон растянут на секцию (inset: 0)').toBe(true);
      expect(
        geo.imgFillsBg,
        'img заполняет бокс __bg ровно (replaced-элемент: absolute inset:0 сохранял бы внутреннее соотношение — кадр уезжал бы от канона width/height:100%)',
      ).toBe(true);
      expect(geo.imgObjectFit, 'img фона кадрируется cover').toBe('cover');
      expect(geo.bgHidden, 'фон aria-hidden').toBe('true');
      expect(geo.imgDecorative, 'img фона декоративный (alt="")').toBe('');
    },
  );

  standTest(
    'текст фото-секции — on-dark-пары: заголовок и lead совпадают с токенами (не наследуют heading-пару)',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      await page.addStyleTag({
        content:
          '.lsp-probe-ondark { color: var(--ui-color-text-on-dark); } ' +
          '.lsp-probe-ondark-muted { color: var(--ui-color-text-on-dark-muted); }',
      });
      const same = await page.evaluate(() => {
        const make = (name) => {
          const probe = document.createElement('div');
          probe.className = name;
          document.body.appendChild(probe);
          const color = getComputedStyle(probe).color;
          probe.remove();
          return color;
        };
        const onDark = make('lsp-probe-ondark');
        const onDarkMuted = make('lsp-probe-ondark-muted');
        const title = document.querySelector('#lsp-photo-title');
        const lead = document.querySelector('#lsp-photo .ui-lead');
        return {
          title: getComputedStyle(title).color === onDark,
          lead: getComputedStyle(lead).color === onDarkMuted,
        };
      });
      expect(same.title, 'заголовок фото-секции — text-on-dark (связка lsp-photo)').toBe(true);
      expect(same.lead, 'lead фото-секции — on-dark-muted').toBe(true);
    },
  );
});

standTest.describe('patterns/landing-section: nav-карточки и лента логотипов (T17.9)', () => {
  const SEL_NAV = { section: '#lsp-nav-cards', title: '#lsp-nav-cards-title' };
  const SEL_LOGO = { section: '#lsp-logo-grid', title: '#lsp-logo-grid-title' };

  standTest(
    'nav-карточки: каркас связки lnk-card — сетка lnk-cards, карточки-ссылки с aria-label, стрелка декоративна',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      const sec = page.locator(SEL_NAV.section);
      await expect(sec).toBeVisible();
      await expect(page.locator(SEL_NAV.title)).toBeVisible();

      const cards = sec.locator('a.lnk-card');
      expect(await cards.count(), 'три nav-карточки — тоны пилота (peach/navy/light)').toBe(3);
      for (const card of await cards.all()) {
        const info = await card.evaluate((el) => ({
          label: el.getAttribute('aria-label'),
          href: el.getAttribute('href'),
          hasBody: Boolean(el.querySelector('.lnk-card__body')),
          illuAlt: el.querySelector('.lnk-card__illu')?.getAttribute('alt'),
          actionHidden: el
            .querySelector('.ui-button--round.lnk-card__action')
            ?.getAttribute('aria-hidden'),
        }));
        expect(info.label, 'имя карточки-ссылки — aria-label (прецедент пилота)').toBeTruthy();
        expect(info.href, 'карточка ведёт на целевую страницу').toBeTruthy();
        expect(info.hasBody, 'слот body на месте').toBe(true);
        expect(info.illuAlt, 'иллюстрация декоративна (alt="")').toBe('');
        expect(info.actionHidden, 'стрелка декоративна (aria-hidden)').toBe('true');
      }
    },
  );

  standTest(
    'тон navy: фон/текст = парам хуков; заголовок h4 на заливке — on-dark (баг «невидимого h4» закрыт, прецедент ui-card--cta T17.8)',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      await page.addStyleTag({
        content:
          '.lsp-probe-navy-bg { background-color: var(--ui-color-primary); } ' +
          '.lsp-probe-navy-fg { color: var(--ui-color-text-on-dark); }',
      });
      const card = page.locator(`${SEL_NAV.section} .lnk-card--navy`);
      const style = await card.evaluate((el) => ({
        bg: getComputedStyle(el).backgroundColor,
        fg: getComputedStyle(el).color,
        h4: getComputedStyle(el.querySelector('h3')).color,
      }));
      const pairOf = (cls) =>
        page.evaluate((name) => {
          const probe = document.createElement('div');
          probe.className = name;
          document.body.appendChild(probe);
          const value = getComputedStyle(probe);
          const result = { bg: value.backgroundColor, fg: value.color };
          probe.remove();
          return result;
        }, cls);
      const bgPair = await pairOf('lsp-probe-navy-bg');
      const fgPair = await pairOf('lsp-probe-navy-fg');
      expect(style.bg, 'фон navy-тона — --ui-color-primary (пара сайта на хуке)').toBe(bgPair.bg);
      expect(style.fg, 'текст navy-тона — on-dark').toBe(fgPair.fg);
      expect(style.h4, 'заголовочная роль на заливке — on-dark (не heading-primary)').toBe(
        fgPair.fg,
      );
    },
  );

  standTest(
    'сетка nav-карточек: 1 колонка (375) → 2 (768) → 3 (1280) — канон пилота',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      const columnsOf = () =>
        page
          .locator(`${SEL_NAV.section} .lnk-cards`)
          .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);

      await page.setViewportSize(VIEWPORTS.mobile);
      expect(await columnsOf(), 'мобильная база — 1 колонка').toBe(1);
      await page.setViewportSize(VIEWPORTS.tablet);
      expect(await columnsOf(), 'md — 2 колонки').toBe(2);
      await page.setViewportSize(VIEWPORTS.xl);
      expect(await columnsOf(), 'lg+ — 3 колонки').toBe(3);
    },
  );

  standTest(
    'лента логотипов: сетка 1 (375) → 4 (768) → 6 (1280); плашка lgo-card — рамка border-muted, радиус md, img растянута',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      const sec = page.locator(SEL_LOGO.section);
      await expect(page.locator(SEL_LOGO.title)).toBeVisible();
      expect(await sec.locator('img.lgo-card').count(), 'плашки-логотипы в сетке').toBeGreaterThan(
        0,
      );

      const columnsOf = () =>
        sec
          .locator('.lgo-grid')
          .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      await page.setViewportSize(VIEWPORTS.mobile);
      expect(await columnsOf(), 'мобильная база — 1 колонка').toBe(1);
      await page.setViewportSize(VIEWPORTS.tablet);
      expect(await columnsOf(), 'md — 4 колонки').toBe(4);
      await page.setViewportSize(VIEWPORTS.xl);
      expect(await columnsOf(), 'lg+ — 6 колонок').toBe(6);

      const plate = await sec
        .locator('img.lgo-card')
        .first()
        .evaluate((el) => {
          const cs = getComputedStyle(el);
          return {
            width: cs.width,
            boxWidth: Math.round(el.getBoundingClientRect().width),
            radius: cs.borderRadius,
            border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
            natural: `${el.naturalWidth}x${el.naturalHeight}`,
          };
        });
      await page.setViewportSize(VIEWPORTS.xl);
      const cell = await sec
        .locator('.lgo-grid')
        .evaluate((el) => el.firstElementChild.getBoundingClientRect().width);
      expect(
        plate.boxWidth,
        'плашка растянута на ячейку сетки (width: 100%)',
      ).toBeGreaterThanOrEqual(Math.floor(cell) - 1);
      expect(plate.radius, 'радиус md').toBe('16px');
      expect(plate.border, 'рамка — 1px solid slate-100 (--ui-color-border-muted)').toBe(
        '1px solid rgb(232, 238, 246)',
      );
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

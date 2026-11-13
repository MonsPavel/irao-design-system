/**
 * e2e паттерна «Landing-секция» (T8.3; Testing requirements + AC) — стенд
 * patterns/landing-section (stands/patterns/landing-section.html),
 * mini-эталон из тринадцати секций: светлая / тёмная (on-dark) /
 * с-изображением full-bleed / с-фото-фоном (ui-section--photo, T17.3) /
 * nav-карточки и лента логотипов (связки слоя lnk-/lgo-, T17.9) /
 * лендинг-композиции hro/mrq/mdl/cvh (T17.15) / тёмная секция why-us
 * (связка слоя whu, T18.12), раскладки карусели production v1/v2
 * (связка слоя prd поверх ui-carousel, T18.13).
 *
 * Ключевые сценарии спеки:
 *  1. каркас секции = ui-section + ui-container + заголовок-роль h2 + сетка
 *     карточек (ui-grid--3 + ui-card); заголовки карточек — h3 (h2 → h3);
 *  2. тёмная секция: computed-фон/текст = парам on-dark токенов; контраст
 *     текста на фоне ≥ 4.5:1 (Accessibility requirements);
 *  3. full-bleed внутри контейнера: изображение тянется до краёв секции на
 *     375/768/1280 (отрицательные margin от container-pad), без hscroll;
 *  4. адаптив: сетка 1 → 2 → 3 колонки (шкала T3.4);
 *  5. nav-карточки: тон — пара на хуках, имя ссылки aria-label, стрелка
 *     декоративна; лента логотипов 1 → 4 → 6 (T17.9);
 *  6. axe чист; иерархия h2 → h3 без пропусков; эталоны 375/768/1440;
 *  7. T17.15: композиции hro (hero) / mrq (бегущая строка, hscroll-зона
 *     ≤~550px) / mdl (медиа-сетка) / cvh (cover-hero) — блоки канона слоя.
 */
import { expect } from '@playwright/test';

import {
  a11y,
  shot,
  test as standTest,
  unexpectedViolations,
  VIEWPORTS,
  SNAPSHOTS_ENABLED,
} from '../helpers/harness.js';

const SEL = {
  light: '#lsp-light',
  lightTitle: '#lsp-light-title',
  dark: '#lsp-dark',
  darkTitle: '#lsp-dark-title',
  image: '#lsp-image',
  imageTitle: '#lsp-image-title',
  photo: '#lsp-photo',
  photoTitle: '#lsp-photo-title',
  why: '#lsp-why-us',
  whyTitle: '#lsp-why-us-title',
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

/** Цвет computed-значения в нормализованной форме [r, g, b, a] (0–255 / 0–1):
 *  Chrome возвращает color-mix как color(srgb …), младшие — как rgba(…). */
const colorChannels = (value) => {
  const numbers = value.match(/[\d.]+/g)?.map(Number) ?? [];
  const [r, g, b, a = 1] = numbers;
  const scale = r > 1 ? 1 : 255;
  return [r * scale, g * scale, b * scale, a];
};

const expectColor = (received, [r, g, b, a], label) => {
  const channels = colorChannels(received);
  expect(
    channels.slice(0, 3).map((c) => Math.round(c)),
    label,
  ).toEqual([r, g, b]);
  expect(channels[3], `${label}: альфа`).toBeCloseTo(a, 2);
};

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
    'лента логотипов: сетка 2 (375) → 3 (768) → 6 (1280) — лестница оригинала; плашка lgo-card — голый img без рамки/фона, радиус md',
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
      expect(await columnsOf(), 'мобильная база — 2 колонки (≤767 оригинала)').toBe(2);
      await page.setViewportSize(VIEWPORTS.tablet);
      expect(await columnsOf(), 'md — 3 колонки (≤1023 оригинала)').toBe(3);
      await page.setViewportSize(VIEWPORTS.xl);
      expect(await columnsOf(), 'lg+ — 6 колонок (база оригинала)').toBe(6);

      const plate = await sec
        .locator('img.lgo-card')
        .first()
        .evaluate((el) => {
          const cs = getComputedStyle(el);
          return {
            width: cs.width,
            boxWidth: Math.round(el.getBoundingClientRect().width),
            radius: cs.borderRadius,
            border: `${cs.borderTopWidth} ${cs.borderTopStyle}`,
            bg: cs.backgroundColor,
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
      expect(plate.radius, 'радиус md = --radius-card 16px оригинала').toBe('16px');
      expect(plate.border, 'рамки нет — img самодостаточен (решение владельца 31.10)').toBe(
        '0px none',
      );
      expect(plate.bg, 'фон не задаётся — blue-50 запечён в PNG').toBe('rgba(0, 0, 0, 0)');
    },
  );
});

standTest.describe('patterns/landing-section: лендинг-композиции (hro/mrq/mdl/cvh, T17.15)', () => {
  const SEL_HRO = { section: '#lsp-hero', title: '#lsp-hero-title' };
  const SEL_MRQ = { section: '#lsp-marquee', title: '#lsp-marquee-title' };
  const SEL_MDL = { section: '#lsp-media-grid', title: '#lsp-media-grid-title' };
  const SEL_CVH = { section: '#lsp-cover-hero', title: '#lsp-cover-hero-title' };

  standTest(
    'hero: блок hro на фото-секции, пилюля 800px стекло blur(12), плита 72px, лента 4 тегов min-height 56',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      await expect(page.locator(SEL_HRO.title)).toBeVisible();

      await page.setViewportSize(VIEWPORTS.xl);
      const hero = await page.locator(SEL_HRO.section).evaluate((el) => {
        const search = el.querySelector('.hro__search');
        const plate = el.querySelector('.hro__search-all');
        const tags = [...el.querySelectorAll('.hro__tag')];
        return {
          minHeight: getComputedStyle(el).minHeight,
          overflow: getComputedStyle(el).overflow,
          searchW: Math.round(search.getBoundingClientRect().width),
          searchBlur: getComputedStyle(search).backdropFilter,
          inputBg: getComputedStyle(el.querySelector('.hro__search .ui-field__input'))
            .backgroundColor,
          plateH: Math.round(plate.getBoundingClientRect().height),
          tagCount: tags.length,
          tagMinH: getComputedStyle(tags[0]).minHeight,
          tagBlur: getComputedStyle(tags[0]).backdropFilter,
        };
      });
      expect(hero.minHeight, 'min-height 50.5rem = 808px оригинала от md').toBe('808px');
      expect(hero.overflow, 'клип фото-фона').toBe('hidden');
      expect(hero.searchW, 'пилюля 50rem = 800px (hero.css:72)').toBe(800);
      expect(hero.searchBlur, 'стекло пилюли blur(12px)').toBe('blur(12px)');
      expect(hero.inputBg, 'внутреннее поле прозрачное').toBe('rgba(0, 0, 0, 0)');
      expect(hero.plateH, 'плита «Все вакансии» 72px').toBe(72);
      expect(hero.tagCount, 'лента — 4 тега').toBe(4);
      expect(hero.tagMinH, 'теги min-height 56px').toBe('56px');
      expect(hero.tagBlur, 'стекло тега blur(10px)').toBe('blur(10px)');
    },
  );

  standTest(
    'тон тега hero — дефолт хука sand: computed bg = --ui-color-primary-a26 (спец-тоны — сайт-зона)',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      await page.addStyleTag({
        content: '.lsp-probe-sand { background-color: var(--ui-color-primary-a26); }',
      });
      const same = await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.className = 'lsp-probe-sand';
        document.body.appendChild(probe);
        const tag = document.querySelector('#lsp-hero .hro__tag');
        const result =
          getComputedStyle(tag).backgroundColor === getComputedStyle(probe).backgroundColor;
        probe.remove();
        return result;
      });
      expect(same, 'тег без тон-класса рендерит дефолт sand (T14.7)').toBe(true);
    },
  );

  standTest(
    'mrq: сетка колонка → 1.2fr/1fr от lg; строка --xl 40px/1.15/ls 0; лента aria-hidden',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      await expect(page.locator(SEL_MRQ.title)).toBeVisible();
      const columnsOf = () =>
        page
          .locator(`${SEL_MRQ.section} .mrq`)
          .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);

      await page.setViewportSize(VIEWPORTS.mobile);
      expect(await columnsOf(), 'мобильная база — колонка (оригинал ≤1023)').toBe(1);
      await page.setViewportSize({ width: 1024, height: 900 });
      expect(await columnsOf(), 'от lg — 1.2fr/1fr (pages.css:1060)').toBe(2);

      await page.setViewportSize(VIEWPORTS.xl);
      const xl = await page.locator(`${SEL_MRQ.section} .mrq__line--xl`).evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          fs: cs.fontSize,
          lh: cs.lineHeight,
          ls: cs.letterSpacing,
          hidden: el.parentElement.getAttribute('aria-hidden'),
        };
      });
      expect(xl.fs, 'литерал 40px — pages.css:1081').toBe('40px');
      expect(xl.lh, '1.15 — pages.css:1081').toBe('46px');
      expect(xl.ls, 'ls 0 — pages.css:1081 (0 вычисляется в normal)').toBe('normal');
      expect(xl.hidden, 'лента aria-hidden (дубликат смысла)').toBe('true');
    },
  );

  standTest(
    'mdl (док-пример = mdl--wide): 1 колонка (375) → 2 с span big 2×2 (768) → 4 (1280), lead/extra видны',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      await expect(page.locator(SEL_MDL.title)).toBeVisible();
      const grid = page.locator(`${SEL_MDL.section} .mdl`);
      const state = () =>
        grid.evaluate((el) => {
          const big = el.querySelector('.mdl__big');
          const lead = el.querySelector('.mdl__lead');
          return {
            cols: getComputedStyle(el).gridTemplateColumns.split(' ').length,
            colsRaw: getComputedStyle(el).gridTemplateColumns,
            bigRow: big ? getComputedStyle(big).gridRow : null,
            bigCol: big ? getComputedStyle(big).gridColumn : null,
            leadDisplay: lead ? getComputedStyle(lead).display : null,
          };
        });

      await page.setViewportSize(VIEWPORTS.mobile);
      expect((await state()).cols, 'мобильная база — 1 колонка').toBe(1);
      expect(
        (await state()).bigRow,
        'span в базе не активен (1 колонка — span 2 порвал бы сетку)',
      ).toBe('auto');

      await page.setViewportSize(VIEWPORTS.tablet);
      const md = await state();
      expect(md.cols, 'md — 2 колонки (оригинал ≤1023)').toBe(2);
      expect(md.bigRow, 'big — row span 2 от md').toBe('span 2');
      expect(md.bigCol, 'big — col span 2 от md').toBe('span 2');

      await page.setViewportSize(VIEWPORTS.xl);
      const xl = await state();
      // Errata 02.11: док-пример несёт mdl--wide (мозаика extra/lead) —
      // 4 колонки, lead/extra видны; v1-база (3 колонки, lead скрыт) —
      // пин юнит-теста landing-compositions (render пилота, index).
      expect(xl.cols, 'lg — wide: 4 колонки (media.css:130)').toBe(4);
      expect(xl.leadDisplay, 'wide: lead виден (media.css:151)').toBe('flex');
    },
  );

  standTest('cvh: колонка gap 16 start', async ({ stand }) => {
    const page = await stand('patterns/landing-section');
    await expect(page.locator(SEL_CVH.title)).toBeVisible();
    const cvh = await page.locator(`${SEL_CVH.section} .cvh`).evaluate((el) => {
      const cs = getComputedStyle(el);
      return { dir: cs.flexDirection, gap: cs.gap, align: cs.alignItems };
    });
    expect(cvh.dir, 'колонка').toBe('column');
    expect(cvh.gap, 'зазор 16px — space-4').toBe('16px');
    expect(cvh.align, 'прижато влево (pages.css:957)').toBe('flex-start');
  });

  standTest(
    'VI-инвариант стекла (Implementation requirements п.1): в img:off backdrop-filter отключён правилом a11y/vi.css',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      await page.evaluate(() => {
        document.body.classList.add('vi', 'vi-img--off');
      });
      const state = await page.locator('#lsp-hero').evaluate((el) => {
        const search = el.querySelector('.hro__search');
        const tag = el.querySelector('.hro__tag');
        return {
          searchBlur: getComputedStyle(search).backdropFilter,
          tagBlur: getComputedStyle(tag).backdropFilter,
          // Пре-существующее поведение vi.css (T9.1): [class*='-photo']
          // матчит и саму ui-section--photo — фото-секция в img:off скрыта
          // ЦЕЛИКОМ (пилюля/теги не рендерятся). Пин задокументированного
          // поведения: инвариант blur проверяется computed-значением.
          sectionDisplay: getComputedStyle(el).display,
        };
      });
      expect(state.searchBlur, 'blur пилюли отключён в img:off (фото скрыто)').toBe('none');
      expect(state.tagBlur, 'blur тега отключён в img:off').toBe('none');
      expect(
        state.sectionDisplay,
        'фото-секция скрыта в img:off (пре-существующее правило vi.css [class*=-photo])',
      ).toBe('none');
    },
  );
});

// Тёмная секция «why-us» (T18.12): композиция канона whu — top-зона
// «заголовок + карточка 01», ряд стеклянных карточек, hover-раскрытие
// CSS-каноном без JS (Implementation requirements п.2), VI-инвариант
// фото-секции. Секция — 13-я в mini-эталоне (после lsp-capsule).
standTest.describe('patterns/landing-section: тёмная секция why-us (whu, T18.12)', () => {
  standTest(
    'whu: каркас секции на примитиве (без оверлея), top-зона строкой от desktop — заголовок 894px + карточка 429px, ряд 3×1fr шаг 12',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      const section = page.locator('#lsp-why-us');
      await expect(section, 'секция whu видима').toBeVisible();

      const state = await section.evaluate((el) => {
        const cs = (node) => getComputedStyle(node);
        const top = el.querySelector('.whu__top');
        const topCard = top.querySelector('.whu__card');
        const title = el.querySelector('.whu__title');
        const row = el.querySelector('.whu__row');
        return {
          sectionOverflow: cs(el).overflow,
          sectionPosition: cs(el).position,
          topDir: cs(top).flexDirection,
          topGap: cs(top).gap,
          topJustify: cs(top).justifyContent,
          cardFlex: cs(topCard).flex,
          cardWidth: Math.round(topCard.getBoundingClientRect().width),
          titleMax: cs(title).maxWidth,
          titleColor: cs(title).color,
          rowCols: cs(row).gridTemplateColumns.split(' ').length,
          rowGap: cs(row).gap,
          rowMarginBottom: cs(row).marginBottom,
        };
      });
      expect(state.sectionOverflow, 'клип секции (why-us.css:4)').toBe('hidden');
      expect(state.sectionPosition, 'position несёт примитив ui-section--photo (T17.3)').toBe(
        'relative',
      );
      expect(state.topDir, 'top-зона строкой от desktop (оригинал ≥1024)').toBe('row');
      expect(state.topGap, 'шаг top-зоны 36 «как есть» (why-us.css:27)').toBe('36px');
      expect(state.topJustify, 'space-between (why-us.css:25)').toBe('space-between');
      expect(state.cardFlex, 'top-карточка фикс 429px (why-us.css:64)').toBe('0 0 429px');
      expect(state.cardWidth, 'бокс top-карточки 429px').toBe(429);
      expect(state.titleMax, 'заголовок max-width 894 (why-us.css:32)').toBe('894px');
      expect(state.titleColor, 'on-dark (why-us.css:36)').toBe('rgb(255, 255, 255)');
      expect(state.rowCols, 'ряд 3×1fr (принятый рендер пилота)').toBe(3);
      expect(state.rowGap, 'шаг колонок 12 (space-3, батч ритма 01.11)').toBe('12px');
      expect(
        state.rowMarginBottom,
        'низ 144 «как есть» — панель вакансий ниже (why-us.css:42)',
      ).toBe('144px');

      const card = await section
        .locator('.whu__row .whu__card')
        .first()
        .evaluate((el) => {
          const cardStyle = getComputedStyle(el);
          const photo = el.querySelector('.whu__card-photo');
          const styleOf = (node) => getComputedStyle(node);
          return {
            bg: cardStyle.backgroundColor,
            color: cardStyle.color,
            minHeight: cardStyle.minHeight,
            radius: cardStyle.borderRadius,
            photoOpacity: styleOf(photo).opacity,
            textMaxHeight: styleOf(el.querySelector('.whu__card-text')).maxHeight,
            textOpacity: styleOf(el.querySelector('.whu__card-text')).opacity,
            numOpacity: styleOf(el.querySelector('.whu__card-num')).opacity,
          };
        });
      expect(card.bg, 'заливка blue-700 → surface-blue-deep (why-us.css:58)').toBe(
        'rgb(22, 75, 137)',
      );
      expect(card.color, 'текст on-dark (why-us.css:59)').toBe('rgb(255, 255, 255)');
      expect(card.minHeight, 'min-height 320 (why-us.css:56)').toBe('320px');
      expect(card.radius, 'радиус card 16 = md').toBe('16px');
      expect(card.photoOpacity, 'фото в покое — полная непрозрачность').toBe('1');
      expect(card.textMaxHeight, 'текст скрыт в покое (why-us.css:94)').toBe('0px');
      expect(card.textOpacity, 'текст скрыт в покое (why-us.css:94)').toBe('0');
      expect(card.numOpacity, 'номер скрыт в покое (why-us.css:114)').toBe('0');
    },
  );

  standTest(
    'whu: hover-раскрытие — CSS-канон без JS (Implementation requirements п.2): текст 220px/1, номер 1, фото 0.15; контент остаётся в a11y-дереве в покое',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      const card = page.locator('#lsp-why-us .whu__card').first();

      // В покое: контент в a11y-дереве (opacity/max-height — не display:none).
      const rest = await card.evaluate((el) => ({
        textDisplay: getComputedStyle(el.querySelector('.whu__card-text')).display,
        textHidden: el.querySelector('.whu__card-text').checkVisibility?.() ?? null,
        ariaContent: Boolean(el.querySelector('.whu__card-text')?.textContent.trim()),
      }));
      expect(rest.textDisplay, 'текст в потоке (не display:none — VI/a11y-инвариант)').not.toBe(
        'none',
      );
      expect(rest.ariaContent, 'текст карточки присутствует в DOM').toBe(true);

      await card.hover();
      await expect
        .poll(
          () =>
            card.evaluate((el) => ({
              textMaxHeight: getComputedStyle(el.querySelector('.whu__card-text')).maxHeight,
              textOpacity: getComputedStyle(el.querySelector('.whu__card-text')).opacity,
              numOpacity: getComputedStyle(el.querySelector('.whu__card-num')).opacity,
              photoOpacity: getComputedStyle(el.querySelector('.whu__card-photo')).opacity,
            })),
          'hover-раскрытие (why-us.css:77/99-100/114, гвард (hover: hover))',
        )
        .toEqual({
          textMaxHeight: '220px',
          textOpacity: '1',
          numOpacity: '1',
          photoOpacity: '0.15',
        });
    },
  );

  standTest(
    'whu: мобильная база — ступени оригинала (why-us.css:108-111): top колонкой, ряд колонкой, карточка во всю ширину, ритм 96/48',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      await page.setViewportSize(VIEWPORTS.mobile);
      const state = await page.locator('#lsp-why-us').evaluate((el) => {
        const cs = (node) => getComputedStyle(node);
        const top = el.querySelector('.whu__top');
        const topCard = top.querySelector('.whu__card');
        const row = el.querySelector('.whu__row');
        // Контейнер-внутренность — целевая ширина «во всю ширину» (без
        // хардкода 343: ширина зависит от скроллбара окружения).
        const container = el.querySelector('.ui-container');
        const containerStyle = getComputedStyle(container);
        const inner = Math.round(
          container.getBoundingClientRect().width -
            parseFloat(containerStyle.paddingLeft) -
            parseFloat(containerStyle.paddingRight),
        );
        return {
          sectionPadding: cs(el).padding,
          topDir: cs(top).flexDirection,
          topCardWidth: Math.round(topCard.getBoundingClientRect().width),
          rowCols: cs(row).gridTemplateColumns.split(' ').length,
          rowGap: cs(row).gap,
          cardWidth: Math.round(row.querySelector('.whu__card').getBoundingClientRect().width),
          inner,
        };
      });
      expect(state.sectionPadding, 'ритм базы 96/48 (why-us.css:111; 48 = space-7)').toBe(
        '96px 0px 48px',
      );
      expect(state.topDir, 'top-зона колонкой (why-us.css:108)').toBe('column');
      expect(state.topCardWidth, 'top-карточка во всю ширину (why-us.css:109)').toBe(state.inner);
      expect(state.rowCols, 'ряд колонкой (оригинал ≤1023, why-us.css:110)').toBe(1);
      expect(state.rowGap, 'вертикальный шаг стека 36 (why-us.css:41)').toBe('36px');
      expect(state.cardWidth, 'карточки ряда во всю ширину колонки').toBe(state.inner);
    },
  );

  standTest(
    'whu: VI-инвариант (Implementation requirements п.2) — img:off секция скрыта целиком (пре-существующее правило vi.css [class*=-photo], прецедент hro/msh); переходы в VI гасятся — раскрытие мгновенно',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');

      // img:off: фото-секция скрыта целиком (T9.1) — задокументированное
      // поведение, контент секции не перекрашивается «в слепую» пару.
      await page.evaluate(() => document.body.classList.add('vi', 'vi-img--off'));
      const imgOff = await page.locator('#lsp-why-us').evaluate((el) => ({
        display: getComputedStyle(el).display,
      }));
      expect(imgOff.display, 'img:off: секция скрыта (vi.css [class*=-photo])').toBe('none');
      await page.evaluate(() => document.body.classList.remove('vi', 'vi-img--off'));

      // VI без img:off: переходы гасятся (body.vi * { transition: none }) —
      // hover-раскрытие срабатывает мгновенно (без анимации).
      await page.evaluate(() => document.body.classList.add('vi'));
      const viDuration = await page
        .locator('#lsp-why-us .whu__card-text')
        .first()
        .evaluate((el) => getComputedStyle(el).transitionDuration);
      expect(viDuration, 'в VI переходов нет (vi.css T9.1)').toBe('0s');
      const card = page.locator('#lsp-why-us .whu__card').first();
      await card.hover();
      await expect
        .poll(
          () =>
            card.evaluate((el) => getComputedStyle(el.querySelector('.whu__card-text')).opacity),
          'раскрытие в VI — мгновенно (opacity 1 без перехода)',
        )
        .toBe('1');
    },
  );
});

// Раскладки карусели «production» (T18.13): канон prd слоя поверх
// ui-carousel (T17.7 — поведение/вид элементов). Секции 14–15 mini-эталона
// (после lsp-why-us): lsp-production — модификатор --v1 (лента табов
// внизу, абсолютные координаты текста/кнопки от 1280 — пины errata 31.10),
// lsp-production-v2 — модификатор --v2 (фото-центр, чипы сверху 59px).
standTest.describe('patterns/landing-section: раскладки карусели production (prd, T18.13)', () => {
  standTest(
    'prd v1: модуль карусели инициализирован (контролы показаны), тело/текст/кнопка — абсолютные координаты 55/78/430/523 от 1440 (пины errata 31.10), лента-полоса внизу 82px, табы 20% (285×82), планка-спинка 17px',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      const section = page.locator('#lsp-production');
      await expect(section, 'секция prd--v1 видима').toBeVisible();

      const state = await section.evaluate((el) => {
        const cs = (node) => getComputedStyle(node);
        const rect = el.getBoundingClientRect();
        const pick = (sel) => {
          const node = el.querySelector(sel);
          if (!node) return null;
          const r = node.getBoundingClientRect();
          const s = cs(node);
          return {
            left: Math.round(r.left),
            top: Math.round(r.top - rect.top),
            w: Math.round(r.width),
            h: Math.round(r.height),
            pos: s.position,
          };
        };
        const activeTab = el.querySelector('.prd__tab[aria-selected="true"]');
        return {
          initialized: el.classList.contains('is-initialized'),
          height: Math.round(rect.height),
          prevHidden: el.querySelector('[data-ui-carousel-prev]')?.hasAttribute('hidden'),
          stepHidden: el
            .querySelector('[data-ui-carousel-stepper], .prd__stepper')
            ?.hasAttribute('hidden'),
          photoDisplay: cs(el.querySelector('.prd__photo')).display,
          photoRect: pick('.prd__photo'),
          bodyRect: pick('.prd__body'),
          titleRect: pick('.prd__title'),
          textRect: pick('.prd__text'),
          btnRect: pick('.prd__btn'),
          stepperRect: pick('.prd__stepper'),
          tabW: Math.round(activeTab.getBoundingClientRect().width),
          tabH: Math.round(activeTab.getBoundingClientRect().height),
          tabBg: cs(activeTab).backgroundColor,
          arrowPrevLeft: Math.round(
            el.querySelector('.prd__arrow--prev').getBoundingClientRect().left,
          ),
          arrowNextRight: Math.round(
            el.getBoundingClientRect().right -
              el.querySelector('.prd__arrow--next').getBoundingClientRect().right,
          ),
          afterHeight: getComputedStyle(el, '::after').height,
        };
      });
      expect(state.initialized, 'модуль ui-carousel поставил is-initialized').toBe(true);
      expect(state.prevHidden, 'стрелки показаны (hidden снят модулем)').toBe(false);
      expect(state.stepHidden, 'степпер показан (hidden снят модулем)').toBe(false);
      expect(state.height, 'высота секции 760 (min-height «как есть»)').toBe(760);
      expect(state.photoDisplay, 'фото видимо от lg (мобильная база скрыта)').toBe('block');
      expect(state.bodyRect.pos, 'тело — блок на всю секцию от 1280 (production.css:203-209)').toBe(
        'absolute',
      );
      expect(state.titleRect, 'title 55/78/545 (production.css:218-221)').toEqual({
        left: 55,
        top: 78,
        w: 545,
        h: expect.any(Number),
        pos: 'absolute',
      });
      expect(state.textRect.top, 'text top 430 (production.css:224)').toBe(430);
      expect(state.textRect.left, 'text left 55').toBe(55);
      expect(state.btnRect.top, 'btn top 523 (production.css:228)').toBe(523);
      expect(state.btnRect.left, 'btn left 55').toBe(55);
      // Ширина секции на стенде зависит от каркаса полигона — процентные
      // значения канона (left 43.5%, width 100%, 20% табов) сверяем
      // относительно фактической ширины секции.
      const sectionW = Math.round((await section.boundingBox()).width);
      expect(state.photoRect, 'фото top 71 «как есть», left 43.5% от ширины секции').toEqual({
        left: Math.round(sectionW * 0.435),
        top: 71,
        w: 585,
        h: 674,
        pos: 'absolute',
      });
      expect(state.stepperRect, 'лента-полоса внизу во всю ширину, высота 82').toEqual({
        left: 0,
        top: 678,
        w: sectionW,
        h: 82,
        pos: 'absolute',
      });
      expect(state.tabW, 'таб 20% ленты (production.css:240)').toBe(Math.round(sectionW * 0.2));
      expect(state.tabH, 'активный таб 82 (production.css:109)').toBe(82);
      expectColor(
        state.tabBg,
        [232, 238, 254, 0.5],
        'активный таб blue-100@50 (production.css:145)',
      );
      expect(state.arrowPrevLeft, 'стрелка prev у левого края').toBe(0);
      expect(state.arrowNextRight, 'стрелка next у правого края (100×100)').toBe(0);
      expect(state.afterHeight, 'планка-спинка 17px (production.css:196)').toBe('17px');
    },
  );

  standTest(
    'prd v1: поведение карусели — клик по табу 2 переключает слот заголовка (компонент ui-carousel T17.7 поверх канона)',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      const section = page.locator('#lsp-production');
      await expect(section).toBeVisible();
      const secondTab = section.locator('.prd__tab').nth(1);
      await secondTab.click();
      await expect(secondTab, 'aria-selected переехал (roving модуля)').toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(
        section.locator('[data-ui-carousel-title]'),
        'слот заголовка — данные слайда 2',
      ).toHaveText('Женские вакансии на производстве');
      await expect(
        section.locator('[data-ui-carousel-text]'),
        'слот текста — данные слайда 2',
      ).toContainText('комфортные условия');
    },
  );

  standTest(
    'prd v2: чипы сверху 59px radius 32 blur справа (width 700, top 42, right 56), актив — primary-deep 90% + кольцо, тело в потоке справа (margin-left auto), фото left 22/top 72, секция 740',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      const section = page.locator('#lsp-production-v2');
      await expect(section, 'секция prd--v2 видима').toBeVisible();

      const state = await section.evaluate((el) => {
        const cs = (node) => getComputedStyle(node);
        const rect = el.getBoundingClientRect();
        const pick = (sel) => {
          const node = el.querySelector(sel);
          if (!node) return null;
          const r = node.getBoundingClientRect();
          return {
            left: Math.round(r.left),
            top: Math.round(r.top - rect.top),
            right: Math.round(rect.right - r.right),
            w: Math.round(r.width),
            h: Math.round(r.height),
            pos: cs(node).position,
          };
        };
        const activeTab = el.querySelector('.prd__tab[aria-selected="true"]');
        return {
          height: Math.round(rect.height),
          photo: pick('.prd__photo'),
          body: pick('.prd__body'),
          titlePos: cs(el.querySelector('.prd__title')).position,
          stepper: pick('.prd__stepper'),
          tabH: Math.round(activeTab.getBoundingClientRect().height),
          tabRadius: cs(activeTab).borderRadius,
          tabBg: cs(activeTab).backgroundColor,
          activeBg: cs(activeTab).backgroundColor,
          numDisplay: cs(el.querySelector('.prd__tab[aria-selected="false"] .prd__tab-num'))
            .display,
          tabShadow: cs(activeTab).boxShadow,
        };
      });
      expect(state.height, 'высота секции 740 (min-height v2 «как есть»)').toBe(740);
      expect(state.photo, 'фото left 22/top 72 (production.css:279-280)').toEqual({
        left: 22,
        top: 72,
        right: expect.any(Number),
        w: 585,
        h: 674,
        pos: 'absolute',
      });
      expect(state.body.pos, 'тело в потоке (v1-абсолют не переезжает на v2)').toBe('relative');
      expect(state.body.w, 'тело max-width 545').toBe(545);
      expect(
        state.body.right,
        'бокс тела прижат к правому краю (margin-left auto — production.css:282); 56 несёт padding',
      ).toBe(0);
      expect(state.titlePos, 'заголовок в потоке (не абсолют)').toBe('static');
      expect(
        state.stepper,
        'чипы absolute top 42/right 56, width 700 (left — от ширины секции)',
      ).toEqual({
        left: Math.round((await section.boundingBox()).width - 56 - 700),
        top: 42,
        right: 56,
        w: 700,
        h: expect.any(Number),
        pos: 'absolute',
      });
      expect(state.stepper.h, 'чипы сжимаются по контенту (bottom 0 ленты погашен)').toBeLessThan(
        300,
      );
      expect(state.tabH, 'чип 59px (production.css:301)').toBe(61);
      expect(state.tabRadius, 'radius 32 (production.css:303)').toBe('32px');
      expectColor(state.activeBg, [21, 42, 79, 0.9], 'актив primary-deep 90% (production.css:309)');
      // inline-flex блока-фицируется во flex-item таба (computed display)
      expect(state.numDisplay, 'номер виден у НЕактивного тоже (production.css:299)').toBe('flex');
      // Chrome возвращает color-mix кольца как color(srgb …) — компоненты и
      // геометрия (преттиер/версии браузера не влияют)
      expect(state.tabShadow, 'кольцо white@35 через var(--prd-tab-ring)').toMatch(
        /color\(srgb 1 1 1 \/ 0\.35\)|rgba\(255, 255, 255, 0\.35\)/,
      );
      expect(state.tabShadow, 'геометрия кольца — 1px inset').toContain('0px 0px 0px 1px inset');
    },
  );

  standTest(
    'prd: мобильные базы — фото скрыто (ступень пилота max-1023 инвертирована), тело/лента в базе канона; hscroll нет на 375 (32px-база T3.6 — v2-чипы static)',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');
      await page.setViewportSize(VIEWPORTS.mobile);
      const state = await page.evaluate(() => {
        const pick = (id) => {
          const el = document.querySelector(id);
          const styleOf = (node) => getComputedStyle(node);
          const rect = el.getBoundingClientRect();
          return {
            photoDisplay: styleOf(el.querySelector('.prd__photo')).display,
            bodyPos: styleOf(el.querySelector('.prd__body')).position,
            stepperPos: styleOf(el.querySelector('.prd__stepper')).position,
            minH: styleOf(el).minHeight,
            h: Math.round(rect.height),
          };
        };
        return {
          v1: pick('#lsp-production'),
          v2: pick('#lsp-production-v2'),
          hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        };
      });
      expect(state.v1.photoDisplay, 'v1: фото скрыто в мобильной базе').toBe('none');
      expect(state.v1.bodyPos, 'v1: тело в потоке (абсолют от 1280)').toBe('relative');
      expect(state.v1.minH, 'v1: min-height 760 (пилот — десктоп-форма)').toBe('760px');
      expect(state.v2.photoDisplay, 'v2: фото скрыто в мобильной базе').toBe('none');
      expect(state.v2.stepperPos, 'v2: чипы static-лента (production.css:313, mobile-first)').toBe(
        'static',
      );
      expect(state.hscroll, 'на 375 горизонтального скролла нет (T3.6)').toBe(false);
    },
  );
});

standTest.describe('patterns/landing-section: a11y страницы (AC)', () => {
  standTest('axe страницы чист (вне реестра KNOWN_AXE_EXCEPTIONS)', async ({ stand }) => {
    const page = await stand('patterns/landing-section');
    const results = await a11y(page).analyze();
    // T18.2: CTA-кнопка капсулы vcp__btn несёт одобренную пару on-dark на
    // accent 3.12:1 (как ui-button--accent/ui-card--cta--accent) — узнана
    // реестром харнесса; гейт остаётся строгим ко всему вне реестра
    // (прецедент pattern-list-page.spec.js).
    expect(unexpectedViolations(results), 'axe: violations вне реестра = []').toEqual([]);
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

// Раскладки карусели production (T18.13): контейнерные эталоны канона prd —
// v1 на desktop (1440 — лента табов внизу, абсолютные координаты текста/
// кнопки, стрелки по краям) и mobile (375 — мобильная база: фото скрыто,
// тело в потоке) + v2 на desktop (чипы сверху 59px справа, тело вправо).
// Три снимка (прецедент whu T18.12 — element-снимки канона).
standTest.describe(
  'patterns/landing-section: эталоны карусели production prd (T18.13, AC: ×3)',
  () => {
    standTest(
      'prd-v1/prd-v2 — element-снимки канона, только из контейнера/CI (ADR-0004)',
      async ({ stand }) => {
        const page = await stand('patterns/landing-section');

        const shots = [
          ['prd-v1', page.locator('#lsp-production'), ['desktop', 'mobile']],
          ['prd-v2', page.locator('#lsp-production-v2'), ['desktop']],
        ];

        for (const [name, locator, viewports] of shots) {
          for (const viewport of viewports) {
            await page.setViewportSize(VIEWPORTS[viewport]);
            await locator.scrollIntoViewIfNeeded();
            await page.waitForTimeout(300);
            const info = standTest.info();
            if (!SNAPSHOTS_ENABLED || info.project.name !== 'chromium') {
              info.annotations.push({
                type: 'shot-skipped',
                description:
                  `${name}--${viewport}: эталоны создаются только из контейнера/CI ` +
                  '(ADR-0004) — запустите npm run test:docker',
              });
              continue;
            }
            await expect(locator).toHaveScreenshot(`${name}--${viewport}.png`, {
              animations: 'disabled',
              caret: 'hide',
              // Строгий допуск 8 px (глобальный): лента табов в покое у нижней
              // кромки снимка (планка-спинка по её границе — срез по кромке
              // секции; лотерея растеризации 19.10 не проявлена).
            });
          }
        }
      },
    );
  },
);

// Тёмная секция why-us (T18.12): контейнерные эталоны канона whu — секция в
// покое на desktop (1440 — топ строкой «заголовок + карточка 429px», ряд
// 3×1fr) и mobile (375 — мобильная база: top колонкой, ряд колонкой,
// карточки во всю ширину) + hover-раскрытие карточки на desktop (спека
// T18.12 п.2: текст 220px/1, номер 1, фото 0.15 — CSS-канон без JS).
// Три снимка (прецедент tnv T18.11 — element-снимки канона).
standTest.describe('patterns/landing-section: эталоны секции why-us whu (T18.12, AC: ×3)', () => {
  standTest(
    'whu-section/whu-card-hover — element-снимки канона, только из контейнера/CI (ADR-0004)',
    async ({ stand }) => {
      const page = await stand('patterns/landing-section');

      const shots = [
        ['whu-section', page.locator('#lsp-why-us'), ['desktop', 'mobile'], false],
        ['whu-card-hover', page.locator('#lsp-why-us .whu__card').first(), ['desktop'], true],
      ];

      for (const [name, locator, viewports, hover] of shots) {
        for (const viewport of viewports) {
          await page.setViewportSize(VIEWPORTS[viewport]);
          if (hover) await locator.hover();
          const info = standTest.info();
          if (!SNAPSHOTS_ENABLED || info.project.name !== 'chromium') {
            info.annotations.push({
              type: 'shot-skipped',
              description:
                `${name}--${viewport}: эталоны создаются только из контейнера/CI ` +
                '(ADR-0004) — запустите npm run test:docker',
            });
            continue;
          }
          await expect(locator).toHaveScreenshot(`${name}--${viewport}.png`, {
            animations: 'disabled',
            caret: 'hide',
            // Строгий допуск 8 px (глобальный): у секции нет скруглённых
            // карточек у правого среза снимка — лотерея растеризации
            // (диагноз 19.10) на нём не проявлена; hover-снимок —
            // скруглённая карточка целиком (срез по её границе).
          });
        }
      }
    },
  );
});

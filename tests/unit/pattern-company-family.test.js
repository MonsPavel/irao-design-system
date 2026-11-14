/**
 * Юнит-пины T18.15 — макро-вынос: company-семейства → dpp-каноны
 * (спека docs/ui-system/epics/EPIC-18-macro-parity/T18.15-company-family-layer.md).
 *
 * Исполняемая форма решения:
 *  - паттерн-слой (patterns/patterns.css → dist/ui-patterns.css): каноны
 *    dpp-section-title (section-title роль — низ 32px), dpp-stats (сетка
 *    фактов 3×1fr шаг 24/низ 40), dpp-adv (сетка преимуществ 4×1fr шаг 24/
 *    низ 56) и dpp-banner (CTA-баннер banner-card 320: фото-секция
 *    ui-section--photo T17.3 + CTA-карточка ui-card--cta T17.8) — порт
 *    cp-company-stats/cp-company-title/cp-company-adv/cp-company-banner
 *    pilot.css 1:1 с источниками в комментариях (Implementation
 *    requirements п.1 — значения pages.css:строки); плашки несут компоненты
 *    ui-stat--filled/--deep (T17.4, API не меняется — Implementation
 *    requirements п.2); мобильные базы — инверсия ступеней оригинала
 *    mobile-first (md 768 / xl 1280, шкала T2.5 — канон принимает значение
 *    оригинала, прецедент dpp-hero 1280);
 *  - карточный канон lpp-card (list-page): простая карточка-ссылка
 *    (companies.html:153+ — паддинг 20/24 inline, роль ui-small T16.16);
 *  - доки — источник правды: detail-page (#dpp-company-demo — секция
 *    company-связок расширена канонами) и list-page (секция карточки
 *    выдачи) несут те же классы (пин синхронности, прецедент dir/hld);
 *  - пилот: cp-company-stats/cp-company-title/cp-company-adv/
 *    cp-company-banner/cp-company-card сняты из разметки build.mjs и
 *    pilot.css (ленты cp-company-feed — T18.3, остаются); 5 семейств уходят
 *    из allowlist ценза (судьба «вынос в слой», REPORT §11.4);
 *  - compare: блок-пары company-stats/company-adv/company-banner(+2)/
 *    company-card — на крючках канона.
 *
 * Errata канона (Context спеки, probe 04.11): дельты ритма блоков
 * company-stats −15 / company-adv +14 — принятые дельты компонента ui-stat
 * (T17.4, lh 1.1 значений), не ритм сеток — канон их не правит, эррата
 * зафиксирована в комментариях канонов.
 *
 * Поверхность браузера (эталоны dpp-company ×3, docHeight company/companies
 * ±4px) — e2e/compare-прогоны (ADR-0004).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { patternLayerProblems } from '../../showcase/patterns-layer-gate.mjs';
import { ALLOWED_CP_FAMILIES } from '../../pilot/career-portal/census.mjs';

const root = join(import.meta.dirname, '..', '..');

const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (первое вхождение; практика pattern-directions-holding.test.js). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

/** Тело media-ступени (min-width: Npx), содержащей селектор hook — поиск по
 *  ВСЕМ ступеням файла (практика pattern-why-us.test.js). */
const mediaBlockOf = (css, px, hook) => {
  for (const match of css.matchAll(
    new RegExp(`@media \\(min-width: ${px}px\\)\\s*\\{([\\s\\S]*?)\\n\\}`, 'g'),
  )) {
    if (match[1].includes(`.${hook}`)) return match[1];
  }
  return null;
};

/** Кусок слоя секции dpp (от .dpp-breadcrumbs до fpp-секции) — для пинов
 *  вхождения канонов в dpp-секцию (Scope спеки: «patterns.css dpp»). */
const dppSection = (layer) => layer.slice(layer.indexOf('.dpp-breadcrumbs'), layer.indexOf('.fpp-breadcrumbs'));

const layerFile = readFileSync(join(root, 'patterns', 'patterns.css'), 'utf8');
const layer = stripCssComments(layerFile);
const layerRaw = layerFile.replace(/\r\n/g, '\n');

const detailHtml = readFileSync(
  join(root, 'patterns', 'detail-page', 'detail-page.html'),
  'utf8',
).replace(/\r\n/g, '\n');
const listHtml = readFileSync(
  join(root, 'patterns', 'list-page', 'list-page.html'),
  'utf8',
).replace(/\r\n/g, '\n');

const pilotDir = join(root, 'pilot', 'career-portal');
const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
const pilotCss = stripCssComments(readFileSync(join(pilotDir, 'pilot.css'), 'utf8'));
const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8').replace(/\r\n/g, '\n');

/** Разметка, которую возвращают companyMain()/companiesMain() (практика
 *  pilot-company.test.js — один return-шаблон; CRLF нормализуется). */
const companyHtml = (
  build.match(/function companyMain[\s\S]*?return `([\s\S]*?)`;/)?.[1] ?? ''
).replace(/\r\n/g, '\n');
const companiesHtml = (
  build.match(/function companiesMain[\s\S]*?return `([\s\S]*?)`;/)?.[1] ?? ''
).replace(/\r\n/g, '\n');

describe('patterns/patterns.css — каноны company-семейств в dpp-секции (T18.15 Scope)', () => {
  it('каноны в dpp-секции слоя (до fpp-секции) — Scope «patterns.css dpp»', () => {
    const section = dppSection(layer);
    for (const hook of ['dpp-section-title', 'dpp-stats', 'dpp-adv', 'dpp-banner']) {
      expect(
        section.includes(`.${hook}`),
        `канон .${hook} — в dpp-секции слоя (перед fpp)`,
      ).toBe(true);
    }
  });

  it('dpp-section-title (section-title роль): низ 32px — .section__title (components.css:341); вид несёт роль ui-h3 (= .section-title--h3 fs-h3 42px/1.3, pages.css:880) — слой типографику не дублирует', () => {
    const title = blockOf(layer, '.dpp-section-title');
    expect(title, '.dpp-section-title найдено').toBeTruthy();
    expect(title, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(title, 'низ 32px — space-6 (section__title, components.css:341)').toContain(
      'margin: 0 0 var(--ui-space-6);',
    );
    expect(title, 'fs/fw несёт роль ui-h3 разметки').not.toContain('font-');
  });

  it('dpp-stats (company-stats): grid, шаг 24 (space-5), низ 40px «как есть» (pages.css:805); мобильная база — колонка (оригинал @max-767, pages.css:930), 3×1fr от md; errata ритма −15 в комментарии', () => {
    const stats = blockOf(layer, '.dpp-stats');
    expect(stats, '.dpp-stats найдено').toBeTruthy();
    expect(stats, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(stats, 'grid — порт сетки оригинала').toContain('display: grid;');
    expect(stats, 'шаг 24px — space-5 (pages.css:805)').toContain('gap: var(--ui-space-5);');
    expect(stats, 'низ 40px «как есть» — pages.css:805').toContain('margin-bottom: 2.5rem;');
    expect(stats, 'мобильная база — колонка (оригинал ≤767, инверсия)').toContain(
      'grid-template-columns: minmax(0, 1fr);',
    );
    const md = mediaBlockOf(layer, 768, 'dpp-stats');
    expect(md, 'ступень md есть').toBeTruthy();
    expect(
      md,
      '3×1fr от md — десктоп-форма оригинала (pages.css:805; @max-767 → 1fr, инверсия)',
    ).toContain('grid-template-columns: repeat(3, minmax(0, 1fr));');
    const statsComment = layerRaw.slice(layerRaw.indexOf('.dpp-stats')).match(/\/\*[\s\S]*?\*\//);
    expect(statsComment, 'errata ритма −15 зафиксирована в комментарии канона').not.toBeNull();
    expect(statsComment[0], 'дельта −15 — принятая дельта ui-stat (T17.4), не ритм').toContain(
      '−15',
    );
  });

  it('dpp-adv (company-adv): grid, шаг 24 (space-5, pages.css:813), низ 56px company-section-gap «как есть» (pages.css:884, folded — прецедент dpp-where); база колонка, 2×1fr от md, 4×1fr от xl (1280 — оригинал @max-1279 → 2, канон принимает значение оригинала); errata ритма +14 в комментарии', () => {
    const adv = blockOf(layer, '.dpp-adv');
    expect(adv, '.dpp-adv найдено').toBeTruthy();
    expect(adv, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(adv, 'grid — порт сетки оригинала').toContain('display: grid;');
    expect(adv, 'шаг 24px — space-5 (pages.css:813)').toContain('gap: var(--ui-space-5);');
    expect(adv, 'низ 56px «как есть» — company-section-gap (pages.css:884)').toContain(
      'margin-bottom: 3.5rem;',
    );
    expect(adv, 'мобильная база — колонка (оригинал ≤767, pages.css:930)').toContain(
      'grid-template-columns: minmax(0, 1fr);',
    );
    const md = mediaBlockOf(layer, 768, 'dpp-adv');
    expect(md, 'ступень md есть').toBeTruthy();
    expect(md, '2×1fr от md — оригинал @max-1279 → 2 (pages.css:914), инверсия').toContain(
      'grid-template-columns: repeat(2, minmax(0, 1fr));',
    );
    const xl = mediaBlockOf(layer, 1280, 'dpp-adv');
    expect(xl, 'ступень xl (1280) есть').toBeTruthy();
    expect(xl, '4×1fr от 1280 — десктоп-форма оригинала (pages.css:813)').toContain(
      'grid-template-columns: repeat(4, minmax(0, 1fr));',
    );
    const advComment = layerRaw.slice(layerRaw.indexOf('.dpp-adv')).match(/\/\*[\s\S]*?\*\//);
    expect(advComment, 'errata ритма +14 зафиксирована в комментарии канона').not.toBeNull();
    expect(advComment[0], 'дельта +14 — принятая дельта ui-stat (T17.4), не ритм').toContain(
      '+14',
    );
  });

  it('dpp-banner (banner-card, pages.css:656–674): flex-строка по центру, min-height 320px «как есть», клип радиуса, низ 56px company-section-gap, ритм ui-section погашен (padding 0); position/isolation несёт примитив ui-section--photo (T17.3)', () => {
    const banner = blockOf(layer, '.dpp-banner');
    expect(banner, '.dpp-banner найдено').toBeTruthy();
    expect(banner, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(banner, 'flex — оригинал .banner-card (pages.css:655)').toContain('display: flex;');
    expect(banner, 'align-items: center — pages.css:655').toContain('align-items: center;');
    expect(banner, 'клип радиуса — overflow hidden (pages.css:655)').toContain(
      'overflow: hidden;',
    );
    expect(banner, 'min-height 320px «как есть» — pages.css:655').toContain(
      'min-height: 20rem;',
    );
    expect(banner, 'низ 56px «как есть» — company-section-gap (pages.css:884)').toContain(
      'margin-bottom: 3.5rem;',
    );
    expect(banner, 'ритм ui-section погашен — высоту держит min-height + тело').toContain(
      'padding: 0;',
    );
    expect(banner, 'радиус --radius-card 16px = md').toContain(
      'border-radius: var(--ui-radius-md);',
    );
    expect(
      banner,
      'position/isolation несёт примитив ui-section--photo — слой не переобъявляет (прецедент hld/whu)',
    ).not.toContain('position');
  });

  it('dpp-banner__body (CTA-центр-композиция на ui-card--cta T17.8): паддинг 40px «как есть» (pages.css:667), тинт primary-a55 на теле (pages.css:666 — заливка body-бокса, проба скрин-пар T17.3), рамка гасится (T17.8), on-dark-пара; раскладку/gap/центр несёт компонент', () => {
    const body = blockOf(layer, '.dpp-banner__body');
    expect(body, '.dpp-banner__body найдено').toBeTruthy();
    expect(body, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(body, 'во всю ширину строки баннера').toContain('width: 100%;');
    expect(body, 'паддинг 40px «как есть» — pages.css:667').toContain('padding: 2.5rem;');
    expect(body, 'рамка гасится — заливка-тинт без рамки (T17.8)').toContain('border: 0;');
    expect(body, 'тинт primary-a55 — pages.css:666').toContain(
      'background-color: var(--ui-color-primary-a55);',
    );
    expect(body, 'текст on-dark').toContain('color: var(--ui-color-text-on-dark);');
    expect(
      body,
      'раскладку (flex-колонка/gap 12/центр/радиус) несёт ui-card--cta — слой не дублирует',
    ).not.toContain('text-align');
    expect(body).not.toContain('border-radius');
  });

  it('dpp-banner__title/__text: заголовок — on-dark (override роли ui-h2, как заголовок холдинга); текст — max-width 560px «как есть» (pages.css:674)', () => {
    const title = blockOf(layer, '.dpp-banner__title');
    expect(title, '.dpp-banner__title найдено').toBeTruthy();
    expect(title, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(title, 'цвет on-dark — override роли ui-h2 (прецедент hld__title)').toContain(
      'color: var(--ui-color-text-on-dark);',
    );
    expect(title, 'fs/fw несёт роль ui-h2 разметки').not.toContain('font-');
    const text = blockOf(layer, '.dpp-banner__text');
    expect(text, '.dpp-banner__text найдено').toBeTruthy();
    expect(text, 'max-width 560px «как есть» — pages.css:674').toContain('max-width: 35rem;');
  });

  it('инварианты: медиа только min-width из шкалы T2.5; без hex и !important; гейт префиксов проходит (dpp/lpp — канонические)', () => {
    const section = dppSection(layer);
    const medias = [...section.matchAll(/@media \(min-width: (\d+)px\)/g)].map((m) => m[1]);
    for (const value of medias) {
      expect(['480', '768', '1024', '1280', '1440'], `${value}px — из шкалы T2.5`).toContain(
        value,
      );
    }
    expect(section, 'max-width в media-ступенях нет (mobile-first)').not.toMatch(
      /@media[^{]*max-width/,
    );
    expect(layer, 'hex только в tokens/primitives.css').not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(layer, '!important только в a11y/vi.css').not.toContain('!important');
    expect(
      patternLayerProblems(
        '.dpp-stats { display: grid; }\n.dpp-banner__body { padding: 2.5rem; }',
      ),
      'dpp-каноны — канонические префиксы',
    ).toEqual([]);
    expect(patternLayerProblems('.cs-evil { gap: 4px; }').length, 'чужой namespace ловится').toBe(
      1,
    );
  });
});

describe('patterns/patterns.css — карточный канон lpp-card (list-page, T18.15 Scope)', () => {
  it('lpp-card (companies.html:153+): block-карточка, паддинг 20/24 «как есть» (inline-стиль — вертикаль 20px вне шкалы §3.2, прецедент cp-breadcrumbs; горизонталь 24px = space-5), color-text, без линии ссылки; fs/fw несёт роль ui-small (T16.16)', () => {
    const card = blockOf(layer, '.lpp-card');
    expect(card, '.lpp-card найдено').toBeTruthy();
    expect(card, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(card, 'block — сброс флекс-колонки ui-card (порт .cp-company-card)').toContain(
      'display: block;',
    );
    expect(card, 'паддинг 20/24px «как есть» — inline companies.html:153+').toContain(
      'padding: 1.25rem var(--ui-space-5);',
    );
    expect(card, 'цвет текста — inline color: var(--color-text)').toContain(
      'color: var(--ui-color-text);',
    );
    expect(card, 'без линии ссылки').toContain('text-decoration: none;');
    expect(card, 'fs/fw несёт роль ui-small разметки (T16.16)').not.toContain('font-');
  });

  it('lpp-card — в lpp-секции слоя (до dpp-секции)', () => {
    const lppSection = layer.slice(0, layer.indexOf('.dpp-breadcrumbs'));
    expect(lppSection.includes('.lpp-card'), 'канон карточки — в lpp-секции').toBe(true);
  });
});

describe('доки паттернов — источник правды (синхронность док ↔ слой, прецедент dir/hld)', () => {
  /** Классы-крючки канона в разметке дока (class="…", комментарии вне). */
  const docHooks = (docHtml, re) => {
    const html = docHtml.replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ');
    const found = new Set();
    for (const attr of html.match(/class="[^"]*"/g) ?? []) {
      for (const name of attr.slice(7, -1).split(' ')) {
        if (re.test(name)) found.add(name);
      }
    }
    return found;
  };

  /** Крючки канона в правилах слоя. */
  const layerHookSet = (layerCss, re) => {
    const hooks = new Set();
    for (const selector of layerCss.match(/[^{}]+(?=\{)/g) ?? []) {
      for (const hook of selector.match(/\.[a-z][a-z0-9_-]*/g) ?? []) {
        if (re.test(hook)) hooks.add(hook.slice(1));
      }
    }
    return hooks;
  };

  it('синхронность док ↔ слой (dpp): стенд detail-page несёт полный API канонов компании (dpp-section-title/dpp-stats/dpp-adv/dpp-banner)', () => {
    const re = /^\.dpp(?:-section-title|-stats|-adv|-banner(?:__|$))/;
    const hooks = layerHookSet(layer, re);
    expect([...hooks].sort(), 'слой несёт полный API канонов компании').toEqual([
      'dpp-adv',
      'dpp-banner',
      'dpp-banner__body',
      'dpp-banner__text',
      'dpp-banner__title',
      'dpp-section-title',
      'dpp-stats',
    ]);
    const markup = docHooks(detailHtml, /^dpp(?:-section-title|-stats|-adv|-banner(?:__|$))/);
    expect(markup.size, 'detail-page.html: классы канонов компании в разметке есть').toBe(
      7,
    );
    for (const hook of hooks) {
      expect(
        markup.has(hook),
        `detail-page: крючок «${hook}» из слоя есть в разметке дока`,
      ).toBe(true);
    }
    for (const name of markup) {
      expect(hooks.has(name), `detail-page: класс «${name}» разметки имеет правило слоя`).toBe(
        true,
      );
    }
  });

  it('секция company-связок стенда расширена канонами в порядке страницы компании: hero → stats → титул+adv → титул+where → banner', () => {
    const section = detailHtml.match(
      /<section[^>]*id="dpp-company-demo"[\s\S]*?<\/section>/,
    )?.[0] ?? '';
    expect(section, 'секция company-связок найдена').not.toBe('');
    expect(section, 'сетка фактов — канон dpp-stats').toContain('<ul class="dpp-stats">');
    expect(
      section.match(/class="ui-stat ui-stat--filled"/g)?.length,
      '3 плашки --filled (как на странице компании)',
    ).toBe(3);
    expect(section, 'сетка преимуществ — канон dpp-adv').toContain('<ul class="dpp-adv">');
    expect(
      section.match(/class="ui-stat ui-stat--deep"/g)?.length,
      '4 плашки --deep (как на странице компании)',
    ).toBe(4);
    expect(section, 'заголовок раздела — канон dpp-section-title').toContain(
      'ui-h3 dpp-section-title',
    );
    expect(section, 'баннер — фото-примитив + канон dpp-banner').toContain(
      'ui-section--photo dpp-banner',
    );
    expect(section, 'тело баннера — канон + CTA-карточка').toContain(
      'dpp-banner__body ui-card ui-card--cta',
    );
    const order = [
      ['hero', section.indexOf('class="dpp-hero"')],
      ['stats', section.indexOf('class="dpp-stats"')],
      ['adv', section.indexOf('class="dpp-adv"')],
      ['where', section.indexOf('class="dpp-where"')],
      ['banner', section.indexOf('dpp-banner"')],
    ];
    for (const [name, at] of order) {
      expect(at, `${name} найдено`).toBeGreaterThan(-1);
    }
    for (let i = 1; i < order.length; i += 1) {
      expect(order[i][1], `${order[i][0]} после ${order[i - 1][0]} (порядок страницы)`).toBeGreaterThan(
        order[i - 1][1],
      );
    }
  });

  it('синхронность док ↔ слой (lpp): стенд list-page несёт карточный канон lpp-card', () => {
    const hooks = layerHookSet(layer, /^\.lpp-card$/);
    expect([...hooks], 'слой несёт канон lpp-card').toEqual(['lpp-card']);
    const markup = docHooks(listHtml, /^lpp-card$/);
    expect(markup.has('lpp-card'), 'list-page.html: lpp-card в разметке есть').toBe(true);
    for (const name of markup) {
      expect(hooks.has(name), `list-page: класс «${name}» разметки имеет правило слоя`).toBe(
        true,
      );
    }
  });

  it('VI-инвариант дока: фон баннера — __bg примитива (aria-hidden, alt=""), оверлея нет (тинт — на теле)', () => {
    const section = detailHtml
      .replace(/<!--[\s\S]*?-->/g, '')
      .match(/<section[^>]*id="dpp-company-demo"[\s\S]*?<\/section>/)?.[0] ?? '';
    const banner = section.slice(section.indexOf('ui-section--photo dpp-banner'));
    expect(banner, 'фрагмент баннера найден').not.toBe('');
    expect(banner, 'оверлея нет (тинт на теле — pages.css:666)').not.toContain(
      'ui-section__overlay',
    );
    const bg = banner.match(/<div class="ui-section__bg"[\s\S]*?<\/div>/)?.[0] ?? '';
    expect(bg, 'фон __bg на месте').not.toBe('');
    expect(bg, 'img фона — alt=""').toContain('alt=""');
    expect(bg, 'aria-hidden на слое фона').toContain('aria-hidden="true"');
  });
});

describe('пилот career-portal: company-семейства на канонах (T18.15; AC: cp-семейства 0)', () => {
  it('разметка build.mjs companyMain: cp-company-stats/title/adv/banner сняты — статы/преимущества/титулы/баннеры на канонах слоя; плашки ui-stat--filled/--deep сохранены (T17.4, API не меняется)', () => {
    expect(build, 'cp-company-stats из разметки снят').not.toMatch(
      /class="[^"]*\bcp-company-stats\b/,
    );
    expect(build, 'cp-company-title из разметки снят').not.toMatch(
      /class="[^"]*\bcp-company-title\b/,
    );
    expect(build, 'cp-company-adv из разметки снят').not.toMatch(
      /class="[^"]*\bcp-company-adv\b/,
    );
    expect(build, 'cp-company-banner из разметки снят').not.toMatch(
      /class="[^"]*\bcp-company-banner/,
    );
    expect(companyHtml, 'сетка фактов — канон dpp-stats').toContain('<ul class="dpp-stats">');
    expect(
      companyHtml.match(/<li class="ui-stat ui-stat--filled">/g)?.length,
      '3 факта --filled (T17.4)',
    ).toBe(3);
    expect(companyHtml, 'сетка преимуществ — канон dpp-adv').toContain('<ul class="dpp-adv">');
    expect(
      companyHtml.match(/<li class="ui-stat ui-stat--deep">/g)?.length,
      '4 преимущества --deep (T17.4)',
    ).toBe(4);
    expect(
      companyHtml.match(/<h2 class="ui-h3 dpp-section-title">/g)?.length,
      '8 заголовков разделов — роль ui-h3 на каноне (ui-h2 не применяется)',
    ).toBe(8);
    expect(
      companyHtml.match(/<div class="ui-section ui-section--photo dpp-banner">/g)?.length,
      '2 баннера — фото-примитив + канон',
    ).toBe(2);
    expect(companyHtml, 'тело баннера — канон + CTA-карточка').toContain(
      '<div class="dpp-banner__body ui-card ui-card--cta">',
    );
    expect(companyHtml, 'заголовок баннера — канон + роль ui-h2').toContain(
      '<h2 class="ui-h2 dpp-banner__title">',
    );
    expect(companyHtml, 'текст баннера — канон + роль ui-small').toContain(
      '<p class="ui-small dpp-banner__text">',
    );
  });

  it('разметка build.mjs companiesMain: cp-company-card снят — карточка выдачи на каноне lpp-card (role ui-small сохранена, T16.16)', () => {
    expect(build, 'cp-company-card из разметки снят').not.toMatch(
      /class="[^"]*\bcp-company-card\b/,
    );
    expect(companiesHtml, 'карточка — канон lpp-card').toContain(
      '<a class="ui-card ui-card--hover ui-small lpp-card" href="company.html">',
    );
    expect(companiesHtml, 'имя компании — интерполяция данных').toMatch(
      /lpp-card" href="company\.html">\$\{esc\(name\)\}<\/a>/,
    );
  });

  it('pilot.css: пять cp-семейств сняты (базы/элементы + ступени 1023/767 сеток); ленты cp-company-feed (T18.3) и модалка dir-modal остаются', () => {
    for (const gone of [
      '.cp-company-stats',
      '.cp-company-title',
      '.cp-company-adv',
      '.cp-company-banner',
      '.cp-company-banner__body',
      '.cp-company-banner__title',
      '.cp-company-banner__text',
      '.cp-company-card',
    ]) {
      expect(pilotCss, `семейство ${gone} перенесено в слой`).not.toContain(gone);
    }
    expect(pilotCss, 'ленты компании — сайт-зона T18.3 (Out of scope)').toContain(
      '.cp-company-feed',
    );
    expect(pilotCss, 'модалка направления — сайт-зона до T18.16').toContain(
      '.cp-dir-modal__photo',
    );
    const m1023 = pilotCss.slice(
      pilotCss.indexOf('@media (max-width: 1023px)'),
      pilotCss.indexOf('@media (max-width: 767px)'),
    );
    expect(
      m1023,
      'ступень 1023: сетка преимуществ снята (канон — ступень md слоя)',
    ).not.toContain('cp-company-adv');
    expect(m1023, 'ступень 1023: сетка фактов снята').not.toContain('cp-company-stats');
    const m767 = pilotCss.slice(pilotCss.indexOf('@media (max-width: 767px)'));
    expect(m767, 'ступень 767: статы сняты (мобильная база канона)').not.toContain(
      'cp-company-stats',
    );
    expect(m767, 'ступень 767: преимущества сняты').not.toContain('cp-company-adv');
  });

  it('compare: пробы company-stats/adv/banner(+2)/card — на крючках канона (прецедент prd/whu/dir)', () => {
    expect(compare, 'проба company-stats — на крючке слоя').toContain(
      "['company-stats', '.company-stats', '.dpp-stats']",
    );
    expect(compare, 'проба company-adv — на крючке слоя').toContain(
      "['company-adv', '.company-adv', '.dpp-adv']",
    );
    expect(compare, 'проба company-banner — на крючке слоя').toContain(
      "['company-banner', '.banner-card', '.dpp-banner']",
    );
    expect(compare, 'проба company-banner-2 — на крючке слоя').toContain(
      "'.cp-company-feed--articles ~ .dpp-banner'",
    );
    expect(compare, 'проба company-card — на крючке слоя').toContain("pilot: '.lpp-card'");
    expect(compare, 'cp-селекторы семейств из проб сняты').not.toContain('.cp-company-stats');
    expect(compare).not.toContain('.cp-company-adv');
    expect(compare).not.toContain('.cp-company-banner');
    expect(compare).not.toContain('.cp-company-card');
  });

});

describe('ценз сайт-зоны: пять company-семейств ушли из allowlist (T18.15 AC)', () => {
  it('allowlist ценза без company-stats/adv/banner/card/title — судьба семейств «вынос в слой» (REPORT §11.4); company-feed остаётся (T18.3)', () => {
    for (const family of ['company-stats', 'company-adv', 'company-banner', 'company-card', 'company-title']) {
      expect(
        ALLOWED_CP_FAMILIES,
        `${family} — вынесено в слой (канон, T18.15)`,
      ).not.toContain(family);
    }
    expect(ALLOWED_CP_FAMILIES, 'ленты компании — сайт-зона до T18.17').toContain(
      'company-feed',
    );
    expect(ALLOWED_CP_FAMILIES, 'прочие семейства ценза не тронуты').toContain('vacancy-search');
    expect(ALLOWED_CP_FAMILIES, 'прочие семейства ценза не тронуты').toContain('dir-modal');
  });
});

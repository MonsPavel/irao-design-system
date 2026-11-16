/**
 * Юнит-пин T18.5 — education.html: интро, каталог, направления (−980px)
 * (спека docs/ui-system/epics/EPIC-18-macro-parity/
 * T18.5-education-composition.md; практика пинов исходников —
 * pilot-career-track.test.js T18.4, pilot-company.test.js T18.3).
 *
 * Поверхность:
 *  - build.mjs: educationMain — состав 1:1 по HTML оригинала
 *    education.html:145–327 (Implementation requirements п.1): обложка
 *    cover-hero (каркас cvh T17.15 + CTA ui-button--primary на каталог) +
 *    поднавигация subnav; #orgs — заголовок «Образовательные организации»,
 *    лента фильтров lpp-filters (2 пилюли + теги ui-tag--filter), сетка из
 *    6 организаций; секция предложений — page-head--split с кнопкой «все
 *    предложения», сетка из 3 offers, «Преимущества компаний» (photo-hero),
 *    «Наши преимущества целевого обучения» (6 adv); FAQ (ui-accordion —
 *    компонент ДС, дельта +57 — Out of scope); прежняя композиция снята
 *    («Организации-партнёры», «Преимущества целевого обучения», кнопка
 *    после сетки);
 *  - offerCard: мета — колонка company (fw-small/primary) / city (muted) —
 *    .offer-card__meta оригинала (pages.css:861–864), не строка « · »;
 *  - compare.mjs: BLOCK_PROBES education.html — пары блоков;
 *  - pilot.css: позиционные хуки edu- (конвенция не-cp имени сайт-зоны,
 *    прецедент ctr- T18.4/stu- T18.1: ценз T17.16 — семейства/allowlist не
 *    меняются); исправленные значения существующих сущностей к канону
 *    оригинала (cp-org-card/cp-offer-card паддинг 24, cp-adv-grid шаг 24);
 *    без !important и hex;
 *  - ценз: гейт чист (пороги строк подняты errata по процедуре census.mjs).
 *
 * Поверхность браузера (docHeight Δ≤60, блок-пробы) — compare-прогон и
 * DOM-проба .zcode/accept-t185-probe.mjs.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { censusMetrics, runCensusGate } from '../../pilot/career-portal/census.mjs';

const root = join(import.meta.dirname, '..', '..');
const pilotDir = join(root, 'pilot', 'career-portal');

const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8').replace(/\r\n/g, '\n');
const pilotCssRaw = readFileSync(join(pilotDir, 'pilot.css'), 'utf8').replace(/\r\n/g, '\n');
const pilotCss = stripCssComments(pilotCssRaw);
// Слой — каноны T18.17 (ofc-card/org-card/adv-grid).
const layerCss = stripCssComments(readFileSync(join(root, 'patterns', 'patterns.css'), 'utf8'));
const edu = JSON.parse(readFileSync(join(pilotDir, 'data', 'educat.json'), 'utf8'));

/** Разметка educationMain() (один return-шаблон; CRLF нормализуется). */
const eduHtml = (
  build.match(/function educationMain[\s\S]*?return `([\s\S]*?)`;/)?.[1] ?? ''
).replace(/\r\n/g, '\n');

/** Тело educationMain() целиком (до секции каталога) — пины data-driven
 *  частей смотрят на код сборки из мока. */
const eduFn = build.slice(
  build.indexOf('function educationMain'),
  build.indexOf('/* ── каталог целевого обучения (T15.3) ──'),
);

describe('build.mjs — обложка education (T18.5 Goal: интро, education.html:147–165)', () => {
  it('каркас — канон cvh слоя (T17.15) с хуком формы сайта, прежний cp-page-head интро снят', () => {
    expect(eduHtml).toContain('<div class="cvh edu-cover">');
    expect(
      eduHtml,
      'page-head — прежний каркас без кнопки (T18.10: обложки — php/cvh)',
    ).not.toContain('<div class="cp-page-head">');
  });

  it('CTA обложки — ui-button--primary «смотреть все предложения» на каталог (оригинал education.html:152)', () => {
    expect(eduHtml).toContain(
      '<a class="ui-button ui-button--primary" href="education-catalog.html">смотреть все предложения</a>',
    );
  });

  it('заголовок/подзаголовок — текст оригинала (education.html:150–151), подзаголовок на паре php-subtitle × ui-lead × ui-text--muted (канон T18.10)', () => {
    expect(eduHtml).toContain('<h1 class="ui-page-title">Целевое обучение</h1>');
    expect(eduHtml).toContain(
      'Поступайте по целевому договору с компаниями Группы «Интер РАО»: отдельная квота при поступлении, стипендия от компании и гарантированное место работы после выпуска.',
    );
    expect(eduHtml).toMatch(/class="php-subtitle ui-lead ui-text--muted"/);
  });

  it('поднавигация разделов — subnav (tabs-pill оригинала, education.html:155–161)', () => {
    expect(eduHtml).toContain("${subnav('education.html')}");
  });
});

describe('build.mjs — секция организаций #orgs (T18.5, education.html:167–226)', () => {
  it('секция существует с id="orgs", заголовок — текст оригинала «Образовательные организации» (education.html:169)', () => {
    expect(eduHtml).toContain('<section class="ui-section" id="orgs">');
    expect(eduHtml).toContain('Образовательные организации');
  });

  it('лента фильтров — канон lpp-filters (T17.12): 2 пилюли region/city с опциями оригинала (education.html:173–185)', () => {
    expect(eduHtml).toContain('<div class="lpp-filters">');
    expect(eduFn).toContain(
      "name: 'region', options: ['Все регионы', 'Москва', 'Санкт-Петербург', 'Омская область']",
    );
    expect(eduFn).toContain(
      "name: 'city', options: ['Все города', 'Москва', 'Санкт-Петербург', 'Омск']",
    );
    expect(eduFn).toContain("pill: true, ariaLabel: 'Регион'");
    expect(eduFn).toContain("pill: true, ariaLabel: 'Город'");
  });

  it('теги-фильтры — ui-tag--blue × ui-tag--filter (T16.14): «Все» активен aria-current (оригинал красит inline, education.html:187–189), ссылки на education.html', () => {
    expect(eduHtml).toContain(
      '<a class="ui-tag ui-tag--blue ui-tag--filter" href="education.html" aria-current="page">Все</a>',
    );
    expect(eduHtml).toContain(
      '<a class="ui-tag ui-tag--blue ui-tag--filter" href="education.html">ВУЗы</a>',
    );
    expect(eduHtml).toContain(
      '<a class="ui-tag ui-tag--blue ui-tag--filter" href="education.html">СУЗы</a>',
    );
  });

  it('сетка организаций — ui-grid--3 edu-org-grid из EDU.orgs (6 карточек, orgCard)', () => {
    expect(eduHtml).toContain('<div class="ui-grid ui-grid--3 edu-org-grid">');
    expect(eduFn).toContain('EDU.orgs.map(orgCard)');
    expect(edu.orgs).toHaveLength(6);
  });
});

describe('build.mjs — секция предложений и преимуществ (T18.5, education.html:228–283)', () => {
  it('шапка split — split-обложка канона php (T18.10) с кнопкой ui-button--outline «все предложения» (education.html:230–233)', () => {
    expect(eduHtml).toContain('<div class="php php--split edu-offer-head">');
    expect(eduHtml).toContain('<h2 class="ui-h2">Актуальные предложения о целевом обучении</h2>');
    expect(eduHtml).toContain(
      '<a class="ui-button ui-button--outline" href="education-catalog.html">все предложения</a>',
    );
  });

  it('сетка предложений — ui-grid--3 edu-offer-grid из EDU.offers[:3] (оригинал education.html:234–265)', () => {
    expect(eduHtml).toContain('<div class="ui-grid ui-grid--3 edu-offer-grid">');
    expect(eduFn).toContain('EDU.offers.slice(0, 3).map(offerCard)');
    expect(edu.offers).toHaveLength(6);
  });

  it('«Преимущества компаний» — блок edu-company-hero: фото internship-adv.png + текст оригинала (education.html:267–271)', () => {
    expect(eduHtml).toContain('Преимущества компаний');
    expect(eduHtml).toMatch(/<div class="edu-company-hero">/);
    expect(eduHtml).toContain('src="assets/images/internship-adv.png"');
    expect(eduHtml).toContain(
      'Компании Группы «Интер РАО» заинтересованы в молодых специалистах: целевики получают стипендию, оплачиваемую практику и гарантированное рабочее место после выпуска.',
    );
  });

  it('«Наши преимущества целевого обучения» — adv-grid (канон слоя T18.17) из EDU.advantages (6 карточек, education.html:273–281)', () => {
    expect(eduHtml).toContain('Наши преимущества целевого обучения');
    expect(eduFn).toContain('EDU.advantages.map(advCard)');
    expect(edu.advantages).toHaveLength(6);
  });

  it('FAQ — faq(EDU.faq) (компонент ДС ui-accordion; дельта +57 — Out of scope спеки)', () => {
    expect(eduFn).toContain('${faq(EDU.faq)}');
    expect(edu.faq).toHaveLength(6);
  });

  it('состав — 4 секции main, как в оригинале (интро/#orgs/предложения/FAQ, education.html:147–325)', () => {
    expect(eduHtml.match(/<section class="ui-section/g) ?? []).toHaveLength(4);
  });

  it('прежняя композиция снята: «Организации-партнёры», старый заголовок преимуществ, кнопка после сетки', () => {
    expect(eduHtml).not.toContain('Организации-партнёры');
    expect(eduHtml).not.toContain('Преимущества целевого обучения</h2>');
    expect(eduHtml).not.toContain('Все предложения');
    expect(eduHtml).not.toContain('style="margin-top');
  });
});

describe('build.mjs — offerCard: мета-колонка оригинала (T18.5, pages.css:861–864)', () => {
  it('мета — колонка company/city отдельными спанами, не строка « · » (company fw-small primary, city muted — канон ofc-card слоя, T18.17)', () => {
    expect(build).toContain('<p class="ofc-card__meta ui-small">');
    expect(build).toContain(
      '<span class="ofc-card__company">${esc(o.company)}</span><span class="ofc-card__city">${esc(o.city)}</span>',
    );
    expect(build).not.toContain('${esc(o.company)} · ${esc(o.city)}');
  });
});

describe('compare.mjs — блок-пробы education (T18.5, практика T18.3/T18.4)', () => {
  it('BLOCK_PROBES education.html: пары обложки/секций (cover 432 / orgs 706 / offers-head 132 / hero 320 / adv 283 оригинала)', () => {
    expect(compare).toMatch(/'education\.html':\s*\[/);
    expect(compare).toContain("['edu-cover', '.cover-hero', '.edu-cover']");
    expect(compare).toContain("['edu-orgs', '#orgs', '#orgs']");
    expect(compare).toContain("['edu-offers-head', '.page-head--split', '.php--split']");
    expect(compare).toContain("['edu-company-hero', '.company-hero', '.edu-company-hero']");
    // T18.17: сетка преимуществ — канон adv-grid слоя (пара на крючке слоя).
    expect(compare).toContain("['edu-adv', '.adv-grid', '.adv-grid']");
  });
});

describe('pilot.css — позиционные хуки edu- (T18.5 Scope: без новых cp-сущностей)', () => {
  it('хуки названы edu- (не cp-): семейства ценза не меняются (прецедент ctr- T18.4/stu- T18.1)', () => {
    expect(pilotCss).toContain('.edu-cover');
    expect(pilotCss).not.toMatch(/^\.cp-edu/m);
  });

  it('обложка: форма cover-hero оригинала (pages.css:953–959) — паддинг 64/56 «как есть», шаг 20, фон/радиус токенами (прецедент .ctr-cover T18.4); подзаголовок 640px (pages.css:965); кнопка +16px (pages.css:967)', () => {
    const cover = blockOf(pilotCss, '.edu-cover');
    expect(cover).toContain('padding: 4rem 3.5rem');
    expect(cover).toContain('gap: 1.25rem');
    expect(cover).toContain('var(--ui-color-surface-muted)');
    expect(cover).toContain('var(--ui-radius-md)');
    expect(blockOf(pilotCss, '.edu-cover .php-subtitle')).toContain('max-width: 40rem');
    expect(blockOf(pilotCss, '.edu-cover .ui-button')).toContain('margin-top: var(--ui-space-4)');
  });

  it('секция обложки — без верхнего ритма ui-section (оригинал: section style="padding-top: 0", education.html:147)', () => {
    expect(blockOf(pilotCss, '.edu-lead')).toContain('padding-top: 0');
  });

  it('теги-фильтры: группа — шаг 24 (.radio-row components.css:217, против gap 16 ленты фильтров)', () => {
    const group = blockOf(pilotCss, '.edu-filter-group');
    expect(group).toContain('gap: var(--ui-space-5)');
  });

  it('сетка организаций — шаг 24 (.org-grid pages.css:827, против 32 канона ui-grid от lg)', () => {
    expect(blockOf(pilotCss, '.edu-org-grid')).toContain('gap: var(--ui-space-5)');
  });

  it('заголовки разделов — mb 32 (.section__title components.css:341; reset ДС маргины гасит; прецедент .ctr-title T18.4)', () => {
    expect(blockOf(pilotCss, '.edu-title')).toContain('margin: 0 0 var(--ui-space-6)');
  });

  it('шапка предложений — низ 40 несёт база канона php (T18.10, components.css:40; хук .edu-offer-head снят как дубликат базы); кнопка не усаживается flex-рядом (white-space: nowrap .btn components.css:41 — замер 05.11: усадка до 168px переносила подпись в 2 строки, 66px вместо 52); сетка offers — шаг 36 «как есть» (pages.css:11) + низ 48 (inline оригинала education.html:234)', () => {
    expect(blockOf(pilotCss, '.edu-offer-head'), 'низ 40 — база php, хук снят').toBeNull();
    expect(blockOf(pilotCss, '.edu-offer-head .ui-button')).toContain('flex-shrink: 0');
    const grid = blockOf(pilotCss, '.edu-offer-grid');
    expect(grid).toContain('gap: 2.25rem');
    expect(grid).toContain('margin-bottom: var(--ui-space-7)');
  });

  it('hero компаний: сетка 480px/1fr от lg (колонка — мобильная база, pages.css:902), шаг 48 (pages.css:796), низ 48 (inline education.html:268); фото 260→320 (pages.css:903/799), радиус md; текст 1.45 «как есть» (pages.css:803)', () => {
    const hero = blockOf(pilotCss, '.edu-company-hero');
    expect(hero).toContain('gap: var(--ui-space-7)');
    expect(hero).toContain('margin-bottom: var(--ui-space-7)');
    expect(hero).toContain('grid-template-columns: minmax(0, 1fr)');
    // min-1024 ступени: блоки файла целиком (пин значений ВНУТРИ блока со
    // ступенью — глобальный lazy-regex цеплял блок .ctr-test выше)
    const media1024Blocks = [
      ...pilotCss.matchAll(/@media \(min-width: 1024px\)\s*\{([\s\S]*?)\n\}/g),
    ].map((match) => match[1]);
    const heroMedia = media1024Blocks.find((body) => body.includes('.edu-company-hero {'));
    expect(heroMedia, 'сетка 480px/1fr — ступень lg').toBeTruthy();
    expect(heroMedia).toContain('30rem minmax(0, 1fr)');
    expect(blockOf(pilotCss, '.edu-company-hero__photo')).toContain('height: 16.25rem');
    const heroPhotoMedia = media1024Blocks.find((body) =>
      body.includes('.edu-company-hero__photo'),
    );
    expect(heroPhotoMedia, 'фото 320px — ступень lg').toBeTruthy();
    expect(heroPhotoMedia).toContain('height: 20rem');
    expect(blockOf(pilotCss, '.edu-company-hero__text')).toContain('line-height: 1.45');
  });

  it('карточки к канону оригинала: org-card паддинг 24/шаг 12 + мета к низу (pages.css:829/835), ofc-card паддинг 24/шаг 14 «как есть» (pages.css:837), мета-колонка шаг 2 с company fw-small primary (pages.css:849/851) — каноны слоя (T18.17)', () => {
    const org = blockOf(layerCss, '.org-card');
    expect(org).toContain('padding: var(--ui-space-5)');
    expect(org).toContain('gap: var(--ui-space-3)');
    expect(blockOf(layerCss, '.org-card__meta')).toContain('margin-top: auto');
    const offer = blockOf(layerCss, '.ofc-card');
    expect(offer).toContain('padding: var(--ui-space-5)');
    expect(offer).toContain('gap: 0.875rem');
    const meta = blockOf(layerCss, '.ofc-card__meta');
    expect(meta).toContain('flex-direction: column');
    expect(meta).toContain('gap: 0.125rem');
    const company = blockOf(layerCss, '.ofc-card__company');
    expect(company).toContain('font-weight: var(--ui-fw-small)');
    expect(company).toContain('color: var(--ui-color-primary)');
    expect(pilotCss, 'cp-org-card/cp-offer-card из сайт-зоны сняты (T18.17)').not.toContain(
      '.cp-org-card',
    );
    expect(pilotCss).not.toContain('.cp-offer-card');
  });

  it('пары карточных заголовков: имена/направления на роли ui-h6 (T16.12) — lh 1.3 без трекинга роли (pages.css:831/841; замер 05.11: трекинг роли −0.02em переворачивал перенос имени «Санкт-Петербургский…» — ряд 190 вместо 219) — в канонах слоя (T18.17)', () => {
    const orgName = blockOf(layerCss, '.org-card .ui-h6');
    expect(orgName).toContain('line-height: 1.3');
    expect(orgName).toContain('letter-spacing: normal');
    const offerDir = blockOf(layerCss, '.ofc-card .ui-h6');
    expect(offerDir).toContain('line-height: 1.3');
    expect(offerDir).toContain('letter-spacing: normal');
  });

  it('сетка преимуществ — шаг 24 (.adv-grid pages.css:505, против 12 прежнего значения сайт-зоны) — канон adv-grid слоя (T18.17)', () => {
    expect(blockOf(layerCss, '.adv-grid')).toContain('gap: var(--ui-space-5)');
    expect(pilotCss).not.toContain('.cp-adv-grid');
  });

  it('без !important и без сырых цветов в цветовых свойствах (инварианты слой-гейтов)', () => {
    const eduBlock = pilotCss.slice(pilotCss.indexOf('.edu-lead'));
    expect(eduBlock).not.toContain('!important');
    expect(eduBlock).toMatch(/var\(--ui-/);
  });
});

describe('ценз T17.16 — гейт чист после errata T18.5 (потолки строк, семейства не менялись)', () => {
  it('пороги строк подняты errata по процедуре census.mjs (последний ход — T18.9: точечный хвост cmp-/ev-/ia-; прецедент T18.5/T18.6)', async () => {
    const census = readFileSync(join(pilotDir, 'census.mjs'), 'utf8');
    expect(census).toMatch(/MAX_PILOT_CSS_LINES = 22\d\d/);
    expect(census).toMatch(/MAX_PILOT_CSS_CODE_LINES = 1[23]\d\d/);
    expect(census).toContain('T18.5');
  });

  it('фактические pilot.css/pilot.js проходят гейт: 0 проблем, новых cp-семейств 0', () => {
    const js = readFileSync(join(pilotDir, 'pilot.js'), 'utf8');
    const metrics = censusMetrics(pilotCssRaw.replace(/\r\n/g, '\n'), js.replace(/\r\n/g, '\n'));
    const gate = runCensusGate(metrics);
    expect(gate.problems).toEqual([]);
    expect(gate.newBlocks).toEqual([]);
  });
});

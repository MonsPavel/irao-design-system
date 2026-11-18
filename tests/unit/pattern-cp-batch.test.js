/**
 * Юнит-пины T18.17 — макро-вынос: батч cp-остатков сайт-зоны (спека
 * docs/ui-system/epics/EPIC-18-macro-parity/T18.17-cp-batch.md).
 *
 * Исполняемая форма решения (судьба каждого семейства — строкой, REPORT
 * §11.4; цель — allowlist ценза до позиционно-необходимого минимума):
 *  - ВЫНОС В СЛОЙ (8 семейств — 7 канонов; `cnv` покрывает пару
 *    catalog-nav/events-nav): тулбар тегов-фильтров каталога — канон
 *    `mtb` (list-page; порт cp-media-toolbar T16.14), карточка предложения
 *    — канон `ofc-card` (list-page; порт cp-offer-card, калибровка T18.5),
 *    карточка организации — канон `org-card` (list-page; порт cp-org-card
 *    T18.5), навигация каталога «пагинация по центру» — канон `cnv`
 *    (list-page; порт пары cp-catalog-nav/cp-events-nav — один приём,
 *    два потребителя), сетка преимуществ — канон `adv-grid`
 *    (landing-section; порт cp-adv-grid), фича-лента мероприятий лендинга
 *    — канон `evt-feature` (landing-section; порт cp-events-feature,
 *    T18.6), секция команды — канон `tm` (landing-section; порт
 *    cp-team__photo);
 *  - ОСТАЁТСЯ (5 семейств с правилами — судьба «тон-строка/позиция —
 *    остаётся сайт-зоне», сокращение cp-хуков — имена не-cp по конвенции
 *    stu-/ctr-/msh__card): hero (тоны тегов на хуке --hro-tag-bg —
 *    Implementation requirements п.1: тон — бренд-слой, color-mix в слой
 *    не едет; классы cp-hero__tag--* → hero-tone--*), article-card
 *    (fw 400 даты — cp-article-card__date → article-date), intern-card
 *    (кламп шорта 3 строки T16.12 + ссылочная пара поверх ui-card--media —
 *    cp-intern-card → intern-card), vac-main (позиция main-колонки вакансий
 *    + ритм чипов — cp-vac-main → vac-main), page (тон-строка корня
 *    страницы: фон/цвет — cp-page → site-page);
 *  - СНЯТО РАНЕЕ (3 семейства — висячие входы allowlist закрыты строкой
 *    судьбы): event-card/intern-person — каркас ui-card--media (T17.5,
 *    правил/разметки нет), cta-mail — ui-card--cta (T17.8);
 *  - allowlist ценза — ['company-feed'] (позиционные хуки лент T18.3 —
 *    позиционно-необходимый минимум);
 *  - гейт префиксов слоя расширен `mtb|ofc|org|cnv|adv|evt|tm`; доки
 *    list-page/landing-section — источник правды (разделы демо); compare —
 *    блок-пары на крючках канонов.
 *
 * Поверхность браузера (эталоны ×7, docHeight-пины, compare) —
 * e2e/compare-прогоны (ADR-0004).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { patternLayerProblems } from '../../showcase/patterns-layer-gate.mjs';
import { ALLOWED_CP_FAMILIES, censusMetrics } from '../../pilot/career-portal/census.mjs';

const root = join(import.meta.dirname, '..', '..');

const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (первое вхождение; практика pattern-company-family.test.js). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

/** Тело media-ступени (min-width: Npx), содержащей селектор hook (практика
 *  pattern-why-us.test.js). */
const mediaBlockOf = (css, px, hook) => {
  for (const match of css.matchAll(
    new RegExp(`@media \\(min-width: ${px}px\\)\\s*\\{([\\s\\S]*?)\\n\\}`, 'g'),
  )) {
    if (match[1].includes(`.${hook}`)) return match[1];
  }
  return null;
};

/** Классы-крючки канона в разметке дока (class="…", комментарии вне) —
 *  практика pattern-vacancy-search-dir-modal.test.js. */
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

const layerFile = readFileSync(join(root, 'patterns', 'patterns.css'), 'utf8');
const layer = stripCssComments(layerFile);

/** lpp-секция слоя (до dpp-секции) — стык list-page. */
const lppSection = layer.slice(0, layer.indexOf('.dpp-breadcrumbs'));

const listHtml = readFileSync(
  join(root, 'patterns', 'list-page', 'list-page.html'),
  'utf8',
).replace(/\r\n/g, '\n');
const landingHtml = readFileSync(
  join(root, 'patterns', 'landing-section', 'landing-section.html'),
  'utf8',
).replace(/\r\n/g, '\n');

const pilotDir = join(root, 'pilot', 'career-portal');
const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
const pilotCss = stripCssComments(readFileSync(join(pilotDir, 'pilot.css'), 'utf8'));
const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8').replace(/\r\n/g, '\n');

describe('patterns/patterns.css — канон тулбара тегов-фильтров mtb (T18.17 Scope)', () => {
  it('каноны mtb в lpp-секции слоя (до dpp-секции) — тулбар каталога рядом с лентой lpp-filters', () => {
    for (const hook of ['mtb', 'mtb__group', 'mtb__label']) {
      expect(lppSection.includes(`.${hook}`), `канон .${hook} — в lpp-секции слоя`).toBe(true);
    }
  });

  it('mtb: лента тегов — шаг 12 «как есть» (pages.css:594 — gap 12), подписи группы в центре ленты; ритм 16px по краям — принятый рендер пилота T16.14', () => {
    const mtb = blockOf(layer, '.mtb');
    expect(mtb, '.mtb найдено').toBeTruthy();
    expect(mtb, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(mtb, 'flex-лента — pages.css:594').toContain('display: flex;');
    expect(mtb, 'перенос — pages.css:594').toContain('flex-wrap: wrap;');
    expect(mtb, 'шаг 12px = space-3 «как есть» — pages.css:594').toContain(
      'gap: var(--ui-space-3);',
    );
    expect(mtb, 'подписи группы в центре ленты').toContain('align-items: center;');
    expect(mtb, 'ритм по краям — принятый рендер пилота (T16.14)').toContain(
      'margin: var(--ui-space-4) 0;',
    );
  });

  it('mtb__group — группы фильтров плоские в ленте (display: contents — landmark остаётся, раскладку ведёт лента); mtb__label — отступ 24px (inline media.html:14 поверх gap ленты)', () => {
    const group = blockOf(layer, '.mtb__group');
    expect(group, '.mtb__group найдено').toContain('display: contents;');
    const label = blockOf(layer, '.mtb__label');
    expect(label, '.mtb__label найдено').toContain('margin-left: var(--ui-space-5);');
  });
});

describe('patterns/patterns.css — канон карточки предложения ofc-card (T18.17 Scope)', () => {
  it('ofc-card: колонка с шагом 14 «как есть» (pages.css:837 — .offer-card) и паддингом 24 = space-5 (калибровка T18.5); пара заголовка на роли ui-h6 — lh 1.3 без трекинга (pages.css:841)', () => {
    const ofc = blockOf(layer, '.ofc-card');
    expect(ofc, '.ofc-card найдено').toBeTruthy();
    expect(ofc, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(ofc, 'flex-колонка — pages.css:837').toContain('display: flex;');
    expect(ofc).toContain('flex-direction: column;');
    expect(ofc, 'шаг 14px «как есть» — pages.css:837 (вне шкалы §3.2)').toContain('gap: 0.875rem;');
    expect(ofc, 'паддинг 24px — pages.css:837 (калибровка T18.5)').toContain(
      'padding: var(--ui-space-5);',
    );
    expect(
      ofc,
      'карточка — 1:1 базлайну b90513f: без min-width (ревью приёмки: безусловная гранула меняла десктоп)',
    ).not.toContain('min-width');
    const title = blockOf(layer, '.ofc-card .ui-h6');
    expect(title, 'пара карточного заголовка — правило на роли').toBeTruthy();
    expect(title, 'lh 1.3 — pages.css:841 (.offer-card__direction fs-body × 1.3)').toContain(
      'line-height: 1.3;',
    );
    expect(title, 'без трекинга роли (замер T18.5: переносы совпадают)').toContain(
      'letter-spacing: normal;',
    );
  });

  it('элементы ofc-card: шапка baseline/space-between с шагом 8 (интерпретация T18.5 против 16px pages.css:839), дата muted (pages.css:843), мета-колонка шаг 2 (pages.css:849) с компанией fw-small/primary (pages.css:851), футер к низу; десктоп 1:1 базлайну — шапка БЕЗ переноса строки (ревью приёмки: безусловный flex-wrap валил дату под заголовок — docHeight +8)', () => {
    const head = blockOf(layer, '.ofc-card__head');
    expect(head, '.ofc-card__head найдено').toContain('display: flex;');
    expect(
      head,
      'шапка — одна строка на десктопе (базлайн b90513f): без flex-wrap (оригинал .offer-card__head pages.css:839 wrap не несёт — ступени @max-767 оригинала 954/955 не переносятся)',
    ).not.toContain('flex-wrap');
    expect(head, 'шаг 8px = space-2 — принятая интерпретация T18.5').toContain(
      'gap: var(--ui-space-2);',
    );
    expect(head, 'baseline — принятая интерпретация T18.5 (оригинал flex-start)').toContain(
      'align-items: baseline;',
    );
    expect(head, 'разнос направления и даты').toContain('justify-content: space-between;');
    expect(blockOf(layer, '.ofc-card__date')).toContain('color: var(--ui-color-text-muted);');
    const meta = blockOf(layer, '.ofc-card__meta');
    expect(meta, 'мета — колонка pages.css:849').toContain('flex-direction: column;');
    expect(meta, 'шаг 2px «как есть» — pages.css:849').toContain('gap: 0.125rem;');
    expect(meta, 'город наследует muted меты').toContain('color: var(--ui-color-text-muted);');
    const company = blockOf(layer, '.ofc-card__company');
    expect(company, 'компания — primary pages.css:851').toContain(
      'color: var(--ui-color-primary);',
    );
    expect(company, 'fw-small — pages.css:851').toContain('font-weight: var(--ui-fw-small);');
    expect(blockOf(layer, '.ofc-card__footer')).toContain('margin-top: auto;');
  });

  it('стресс-гранула шапки предложения (32px-гейт T3.6, ревью приёмки): заголовок ломается по символам при сжатии — дата остаётся в строке на десктопе (no-op при 1x, прецедент reflow-гранул lpp-pill/vcs max-width: 100%)', () => {
    const granule = blockOf(layer, '.ofc-card__head .ui-h6');
    expect(granule, 'гранула .ofc-card__head .ui-h6 найдена').toBeTruthy();
    expect(granule, 'ломка длинного слова при сжатии — строка шапки не выталкивает дату').toContain(
      'overflow-wrap: anywhere;',
    );
    expect(
      granule,
      'гранула — одно свойство: высота шапки на десктопе 1:1 базлайну (дата не переносится)',
    ).not.toMatch(/flex-wrap|min-width/);
  });
});

describe('patterns/patterns.css — канон карточки организации org-card (T18.17 Scope)', () => {
  it('org-card: колонка с шагом 12 и паддингом 24 «как есть» (pages.css:829); пара заголовка на роли ui-h6 (pages.css:831); мета к низу — margin-top: auto (pages.css:835)', () => {
    const org = blockOf(layer, '.org-card');
    expect(org, '.org-card найдено').toBeTruthy();
    expect(org, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(org, 'flex-колонка — pages.css:829').toContain('display: flex;');
    expect(org).toContain('flex-direction: column;');
    expect(org, 'шаг 12px = space-3 — pages.css:829').toContain('gap: var(--ui-space-3);');
    expect(org, 'паддинг 24px — pages.css:829').toContain('padding: var(--ui-space-5);');
    const title = blockOf(layer, '.org-card .ui-h6');
    expect(title, 'пара заголовка — правило на роли (pages.css:831)').toContain(
      'line-height: 1.3;',
    );
    expect(title).toContain('letter-spacing: normal;');
    const meta = blockOf(layer, '.org-card__meta');
    expect(meta, '.org-card__meta найдено').toContain('display: flex;');
    expect(meta, 'перенос — pages.css:835').toContain('flex-wrap: wrap;');
    expect(meta, 'шаг 8px = space-1 — pages.css:835').toContain('gap: var(--ui-space-1);');
    expect(meta, 'мета к низу — pages.css:835 (карточки ряда растягиваются)').toContain(
      'margin-top: auto;',
    );
  });
});

describe('patterns/patterns.css — канон навигации каталога cnv (T18.17 Scope)', () => {
  it('cnv: пагинация по центру с ритмом 48px — порт inline-обёрток оригинала (education-catalog.html:57; events.html:357 — тот же приём, пара cp-catalog-nav/cp-events-nav)', () => {
    const cnv = blockOf(layer, '.cnv');
    expect(cnv, '.cnv найдено').toBeTruthy();
    expect(cnv, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(cnv, 'flex-строка — inline оригинала').toContain('display: flex;');
    expect(cnv, 'по центру — inline оригинала').toContain('justify-content: center;');
    expect(cnv, 'ритм 48px = space-7 (margin-top: 48px inline)').toContain(
      'margin-top: var(--ui-space-7);',
    );
  });
});

describe('patterns/patterns.css — канон сетки преимуществ adv-grid (T18.17 Scope)', () => {
  it('adv-grid: шаг 24 «как есть» (pages.css:505); колонки — база колонкой, 2×1fr от md, 3×1fr от lg (инверсия ступеней 1023/767 — pages.css:900/929; прецедент hld__stats)', () => {
    const grid = blockOf(layer, '.adv-grid');
    expect(grid, '.adv-grid найдено').toBeTruthy();
    expect(grid, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(grid, 'grid — pages.css:505').toContain('display: grid;');
    expect(grid, 'шаг 24px = space-5 «как есть» — pages.css:505').toContain(
      'gap: var(--ui-space-5);',
    );
    expect(
      grid,
      'мобильная база — колонка (оригинал ≤767 pages.css:929); minmax(0, 1fr) — гранула T3.6',
    ).toContain('grid-template-columns: minmax(0, 1fr);');
    const md = mediaBlockOf(layer, 768, 'adv-grid');
    expect(md, 'ступень md (768) есть — 2 колонки (оригинал ≤1023 pages.css:900)').toBeTruthy();
    expect(
      md,
      'minmax(0, 1fr) — гранула 32px-гейта T3.6 (прецедент lpp-layout/vcs__wrap)',
    ).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    const lg = mediaBlockOf(layer, 1024, 'adv-grid');
    expect(lg, 'ступень lg (1024) есть — 3 колонки (десктоп-форма pages.css:505)').toBeTruthy();
    expect(lg).toContain('grid-template-columns: repeat(3, minmax(0, 1fr));');
  });
});

describe('patterns/patterns.css — канон фича-ленты мероприятий evt-feature (T18.17 Scope)', () => {
  it('evt-feature: сетка «фича» 2fr/1fr от lg (pages.css:1150–1155), большой карточке — два ряда (pages.css:1157–1161); мобильная база — колонка (оригинал ≤1023 pages.css:1254)', () => {
    const base = blockOf(layer, '.evt-feature');
    expect(base, '.evt-feature найдено').toBeTruthy();
    expect(base, 'box-sizing на корне (ADR-0002)').toContain('box-sizing: border-box;');
    expect(base, 'grid — pages.css:1150').toContain('display: grid;');
    expect(base, 'шаг 24px = space-5 — pages.css:1154').toContain('gap: var(--ui-space-5);');
    expect(base, 'мобильная база — колонка (оригинал pages.css:1254)').toContain(
      'grid-template-columns: minmax(0, 1fr);',
    );
    const lg = mediaBlockOf(layer, 1024, 'evt-feature {');
    expect(lg ?? mediaBlockOf(layer, 1024, 'evt-feature'), 'ступень lg (1024) есть').toBeTruthy();
    const lgBlock = mediaBlockOf(layer, 1024, 'evt-feature');
    expect(lgBlock, '«большая | лента» 2fr 1fr — pages.css:1152').toContain(
      'grid-template-columns: 2fr minmax(0, 1fr);',
    );
    expect(lgBlock, 'большой карточке — два ряда — pages.css:1158').toContain('grid-row: 1 / 3;');
    expect(lgBlock, 'слот большой карточки без аспекта — pages.css:1163–1171').toContain(
      'aspect-ratio: auto;',
    );
    expect(lgBlock, 'img большой карточки без фикс-высоты (растяжка флексом)').toContain(
      'height: auto;',
    );
  });

  it('карточка события внутри ленты — вид .event-card «как есть»: паддинг 16 (pages.css:565), тело 16/4/0 с шагом 10 (pages.css:575), фото 200→220 (pages.css:932/569), заголовок 1.3 без трекинга (pages.css:579), дата fs-small (pages.css:577)', () => {
    const card = blockOf(layer, '.evt-feature .ui-card');
    expect(card, 'шаг тела ведёт тело — gap 0').toContain('gap: 0;');
    expect(card, 'паддинг 16px = space-4 — pages.css:565').toContain('padding: var(--ui-space-4);');
    expect(blockOf(layer, '.evt-feature .ui-card__media')).toContain('aspect-ratio: auto;');
    const img = blockOf(layer, '.evt-feature .ui-card__media img');
    expect(img, 'фото 200px — мобильная база оригинала (pages.css:932)').toContain(
      'height: 12.5rem;',
    );
    expect(img, 'радиус md — принятая интерпретация клона (pages.css:567 — radius 12)').toContain(
      'border-radius: var(--ui-radius-md);',
    );
    const body = blockOf(layer, '.evt-feature .ui-card__body');
    expect(body, 'тело 16/4/0 — pages.css:575').toContain('padding: var(--ui-space-4) 0.25rem 0;');
    expect(body, 'шаг 10px «как есть» — pages.css:575').toContain('gap: 0.625rem;');
    expect(blockOf(layer, '.evt-feature .ui-h6')).toContain('line-height: 1.3;');
    expect(blockOf(layer, '.evt-feature .ui-card__body time')).toContain(
      'font-size: var(--ui-fs-small);',
    );
    const md = mediaBlockOf(layer, 768, 'evt-feature .ui-card__media img');
    expect(md, 'ступень md: фото 220px — pages.css:569').toContain('height: 13.75rem;');
  });
});

describe('patterns/patterns.css — канон секции команды tm (T18.17 Scope)', () => {
  it('tm__photo: фото-полоса во всю ширину, радиус — принятая интерпретация клона radius-lg (оригинал team.css:18–23 — radius-card 16 + фикс-высоты 530/360/200: клон ведёт высоту натуральным размером фото, ступени не переносились — дельта team −186, принято)', () => {
    const photo = blockOf(layer, '.tm__photo');
    expect(photo, '.tm__photo найдено').toBeTruthy();
    expect(photo, 'во всю ширину — team.css:19').toContain('width: 100%;');
    expect(photo, 'радиус — принятая интерпретация клона (radius-lg)').toContain(
      'border-radius: var(--ui-radius-lg);',
    );
    expect(
      photo,
      'фикс-высоты/object-fit оригинала не переносятся (натуральный размер фото)',
    ).not.toContain('height');
    expect(photo).not.toContain('object-fit');
  });
});

describe('гейт префиксов слоя — расширен mtb|ofc|org|cnv|adv|evt|tm (T18.17)', () => {
  it('канонические префиксы T18.17 проходят гейт; слою инварианты не нарушены', () => {
    expect(
      patternLayerProblems(
        '.mtb { gap: 4px; }\n.ofc-card__head { display: flex; }\n.org-card { padding: 24px; }\n.cnv { display: flex; }\n.adv-grid { display: grid; }\n.evt-feature { display: grid; }\n.tm__photo { width: 100%; }',
      ),
      'mtb|ofc|org|cnv|adv|evt|tm — канонические префиксы',
    ).toEqual([]);
    expect(layer, 'hex только в tokens/primitives.css').not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(layer, '!important только в a11y/vi.css').not.toContain('!important');
    const medias = [...layer.matchAll(/@media \(min-width: (\d+)px\)/g)].map((m) => m[1]);
    for (const value of medias) {
      expect(['480', '768', '1024', '1280', '1440'], `${value}px — из шкалы T2.5`).toContain(value);
    }
  });

  it('чужой namespace по-прежнему ловится (гейт не ослаблен)', () => {
    expect(patternLayerProblems('.xx-batch { gap: 4px; }').length).toBe(2);
  });
});

describe('доки паттернов — источник правды (синхронность док ↔ слой, T18.17)', () => {
  it('синхронность док ↔ слой (list-page): стенд несёт полный API канонов mtb/ofc-card/org-card/cnv', () => {
    // Классы-маркеры канона без собственных правил (цвет/вес несёт
    // разметка — прецедент MARKERS_WITHOUT_RULES patterns-layer.test.js).
    const markers = new Set(['ofc-card__city']);
    const hooks = layerHookSet(layer, /^\.?(mtb|ofc|org|cnv)(?:-|__|$)/);
    expect(hooks.size, 'крючки T18.17 в lpp-секции слоя есть').toBeGreaterThan(0);
    const markup = docHooks(listHtml, /^(mtb|ofc|org|cnv)(?:-|__|$)/);
    for (const hook of hooks) {
      expect(markup.has(hook), `list-page: крючок «${hook}» из слоя есть в разметке дока`).toBe(
        true,
      );
    }
    for (const name of markup) {
      expect(
        hooks.has(name) || markers.has(name),
        `list-page: класс «${name}» разметки имеет правило слоя`,
      ).toBe(true);
    }
  });

  it('синхронность док ↔ слой (landing-section): стенд несёт полный API канонов adv-grid/evt-feature/tm', () => {
    const hooks = layerHookSet(layer, /^\.?(adv|evt|tm)(?:-|__|$)/);
    expect(hooks.size, 'крючки T18.17 в лендинг-связках слоя есть').toBeGreaterThan(0);
    const markup = docHooks(landingHtml, /^(adv|evt|tm)(?:-|__|$)/);
    for (const hook of hooks) {
      expect(
        markup.has(hook),
        `landing-section: крючок «${hook}» из слоя есть в разметке дока`,
      ).toBe(true);
    }
    for (const name of markup) {
      expect(hooks.has(name), `landing-section: класс «${name}» разметки имеет правило слоя`).toBe(
        true,
      );
    }
  });

  it('доки несут разделы демо T18.17 (list-page: тулбар/карточки/пагинация; landing-section: сетка/фича-лента/команда)', () => {
    for (const id of ['lpp-mtb', 'lpp-offer-card', 'lpp-org-card', 'lpp-cnv']) {
      expect(listHtml, `раздел #${id} в доке list-page`).toContain(`id="${id}"`);
    }
    for (const id of ['lsp-adv-grid', 'lsp-events-feature', 'lsp-team']) {
      expect(landingHtml, `раздел #${id} в доке landing-section`).toContain(`id="${id}"`);
    }
  });
});

describe('пилот career-portal: снятие и переименование cp-хуков (T18.17; AC: cp-семейства → company-feed)', () => {
  const GONE_MARKUP = [
    'cp-hero__tag--violet',
    'cp-hero__tag--sand',
    'cp-hero__tag--green',
    'cp-hero__tag--rose',
    'cp-team__photo',
    'cp-vac-main',
    'cp-catalog-nav',
    'cp-events-nav',
    'cp-intern-card',
    'cp-adv-grid',
    'cp-article-card__date',
    'cp-media-toolbar',
    'cp-offer-card',
    'cp-org-card',
    'cp-events-feature',
  ];

  it('разметка build.mjs: вынесенные семейства — на крючках канонов слоя', () => {
    expect(build, 'тело страницы — тон-хук site-page').toContain('class="site-page');
    expect(build, 'тоны hero-тегов — hero-tone--* (тон — сайт-зона)').toContain(
      'hro__tag hero-tone--violet',
    );
    expect(build, 'тулбар медиа-каталога — канон mtb').toContain('<div class="mtb">');
    expect(build, 'группа тулбара — mtb__group').toContain('class="mtb__group"');
    expect(build, 'подпись группы — mtb__label').toContain('ui-tag--gray mtb__label');
    expect(build, 'карточка предложения — канон ofc-card').toMatch(
      /class="ui-card ui-card--hover ofc-card"/,
    );
    expect(build, 'карточка организации — канон org-card').toMatch(
      /class="ui-card ui-card--hover org-card"/,
    );
    expect(build, 'сетка преимуществ — канон adv-grid').toContain('<div class="adv-grid">');
    expect(build, 'фича-лента мероприятий — канон evt-feature').toContain(
      '<div class="evt-feature">',
    );
    expect(build, 'пагинация каталога и events — канон cnv').toContain('<div class="cnv">');
    expect(build, 'фото секции команды — канон tm__photo').toContain('class="tm__photo"');
    expect(build, 'дата статьи — тон-хук article-date').toContain('article-date');
    expect(build, 'карточка направления — тон-хук intern-card').toMatch(
      /class="ui-card ui-card--hover intern-card"/,
    );
    expect(build, 'main-колонка вакансий — тон-хук vac-main').toContain('class="vac-main"');
  });

  it('разметка build.mjs: cp-хуки снятых семейств не появляются', () => {
    for (const gone of GONE_MARKUP) {
      expect(build, `${gone} снят из разметки`).not.toContain(gone);
    }
    expect(
      build,
      'тело страницы: cp-page снят (упоминания cp-page-head в истории — вне)',
    ).not.toMatch(/class="[^"]*\bcp-page\b/);
  });

  it('pilot.css: cp-селекторы снятых семейств сняты — остались только позиционные хуки company-feed (T18.3)', () => {
    const metrics = censusMetrics(readFileSync(join(pilotDir, 'pilot.css'), 'utf8'), '');
    expect(
      metrics.css.families,
      'единственное cp-семейство — позиционные хуки лент компании',
    ).toEqual(['company-feed']);
    for (const gone of [
      '.cp-page',
      '.cp-hero__tag',
      '.cp-team__photo',
      '.cp-vac-main',
      '.cp-catalog-nav',
      '.cp-events-nav',
      '.cp-intern-card',
      '.cp-adv-grid',
      '.cp-article-card__date',
      '.cp-media-toolbar',
      '.cp-offer-card',
      '.cp-org-card',
      '.cp-events-feature',
    ]) {
      expect(pilotCss, `${gone} перенесён в слой/переименован`).not.toContain(gone);
    }
  });

  it('pilot.css: тон-строки/позиции «остаётся» — на не-cp именах (конвенция stu-/ctr-/msh__card)', () => {
    const violet = blockOf(pilotCss, '.hero-tone--violet');
    expect(violet, 'тон violet — color-mix на хуке канона --hro-tag-bg').toContain(
      '--hro-tag-bg: color-mix(in srgb, #3142ff 20%, transparent);',
    );
    expect(blockOf(pilotCss, '.hero-tone--sand')).toContain(
      '--hro-tag-bg: var(--ui-color-primary-a26);',
    );
    expect(blockOf(pilotCss, '.hero-tone--green')).toContain(
      '--hro-tag-bg: color-mix(in srgb, #31ff76 20%, transparent);',
    );
    expect(blockOf(pilotCss, '.hero-tone--rose')).toContain(
      '--hro-tag-bg: color-mix(in srgb, #ff3134 20%, transparent);',
    );
    expect(blockOf(pilotCss, '.article-date')).toContain('font-weight: var(--ui-fw-body);');
    expect(blockOf(pilotCss, 'a.intern-card')).toContain('text-decoration: none;');
    expect(blockOf(pilotCss, '.intern-card .ui-small')).toContain('-webkit-line-clamp: 3;');
    expect(blockOf(pilotCss, '.int-dir-grid .intern-card .ui-h6')).toContain('line-height: 1.3;');
    expect(blockOf(pilotCss, '.vac-main .ui-chip')).toContain('margin: var(--ui-space-4) 0;');
    expect(blockOf(pilotCss, '.vac-main')).toContain('flex-direction: column;');
    expect(blockOf(pilotCss, '.site-page')).toContain('background-color: var(--ui-color-surface);');
  });

  it('доки — строки «где живёт» синхронны с переименованиями T18.17 (ревью: рассинхрон доки и кода — снятые классы не называются в настоящем времени)', () => {
    const landingReadme = readFileSync(
      join(root, 'patterns', 'landing-section', 'README.md'),
      'utf8',
    ).replace(/\r\n/g, '\n');
    const listReadme = readFileSync(
      join(root, 'patterns', 'list-page', 'README.md'),
      'utf8',
    ).replace(/\r\n/g, '\n');
    expect(
      landingReadme,
      'таблица тонов hero: строка violet — актуальный класс сайт-зоны (T18.17 — hero-tone--violet)',
    ).toContain('сайт-зона (pilot.css, класс `.hero-tone--violet`, T18.17)');
    expect(
      landingReadme,
      'снятый класс cp-hero__tag--* в доке landing-section не называется в настоящем времени',
    ).not.toContain('cp-hero__tag');
    expect(
      listReadme,
      'колонка сайта вакансий — vac-main (T18.17 — не-cp имя); снятый cp-vac-main не называется',
    ).not.toContain('cp-vac-main');
    expect(listReadme, 'актуальное имя тон-хука — vac-main').toContain('vac-main пилота');
    const mapping = readFileSync(
      join(root, 'docs', 'ui-system', 'architecture', 'tokens-career-portal-mapping.md'),
      'utf8',
    ).replace(/\r\n/g, '\n');
    expect(
      mapping,
      'зазоры тулбара media — канон mtb слоя (T18.17); снятая пара cp-media-toolbar не называется в настоящем времени',
    ).not.toContain('сайт-зона пилота `.cp-media-toolbar`');
    expect(
      mapping,
      'кламп шорта — не-cp имя intern-card (T18.17); снятый cp-intern-card не называется в настоящем времени',
    ).not.toContain('сайт-зона пилота `.cp-intern-card .ui-small`');
  });

  it('compare: блок-пары и компонентные пробы — на крючках канонов (прецедент prd/whu/dir/vcs)', () => {
    expect(compare, 'блок-пара команды — на крючке слоя').toContain(
      "['team', '.team', '.tm__photo']",
    );
    expect(compare, 'блок-пара adv-grid education — на крючке слоя').toContain(
      "['edu-adv', '.adv-grid', '.adv-grid']",
    );
    expect(compare, 'блок-пара adv-grid лендингов — на крючке слоя').toMatch(
      /\['advantages', '\.adv-grid', '\.adv-grid'\]/,
    );
    expect(compare, 'блок-пара фича-ленты — на крючке слоя').toMatch(
      /\['events', '\.events-feature', '\.evt-feature'\]/,
    );
    expect(compare, 'проба заголовка залитой карточки — на крючке слоя').toContain(
      "'.adv-grid .ui-card--filled h3'",
    );
    expect(compare, 'проба шорта организации — на крючке слоя').toContain(
      "'.org-card .ui-text--muted'",
    );
    for (const gone of ['.cp-adv-grid', '.cp-events-feature', '.cp-team__photo', '.cp-org-card']) {
      expect(compare, `${gone} из проб снят`).not.toContain(gone);
    }
  });
});

describe('ценз сайт-зоны: судьбы 16 семейств T18.17 — allowlist до позиционно-необходимого минимума', () => {
  it('allowlist ценза — ровно company-feed (позиционные хуки лент T18.3 — «остаётся сайт-зоне»)', () => {
    expect(ALLOWED_CP_FAMILIES, 'позиционно-необходимый минимум — ленты компании (T18.3)').toEqual([
      'company-feed',
    ]);
  });

  it('семейства-выносы ушли из ценза (судьба «вынос в слой», REPORT §11.4)', () => {
    for (const family of [
      'media-toolbar',
      'offer-card',
      'org-card',
      'events-feature',
      'events-nav',
      'catalog-nav',
      'adv-grid',
      'team',
    ]) {
      expect(ALLOWED_CP_FAMILIES, `${family} — вынесено в слой`).not.toContain(family);
    }
  });

  it('семейства-остатки ушли из ценза (судьба «тон-строка/позиция — остаётся сайт-зоне»: сокращение cp-хуков — не-cp имена)', () => {
    for (const family of ['hero', 'article-card', 'intern-card', 'vac-main', 'page']) {
      expect(ALLOWED_CP_FAMILIES, `${family} — остаётся сайт-зоне (не-cp имя)`).not.toContain(
        family,
      );
    }
  });

  it('висячие входы закрыты (снято T17.5/T17.8 — правил/разметки нет)', () => {
    for (const family of ['event-card', 'intern-person']) {
      expect(ALLOWED_CP_FAMILIES, `${family} — снято (ui-card--media, T17.5)`).not.toContain(
        family,
      );
    }
  });
});

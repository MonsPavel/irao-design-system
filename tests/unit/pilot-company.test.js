/**
 * Юнит-пин пилотной страницы компании (T15.2; Testing requirements —
 * «поверхностная проверка compare.mjs», пины до браузерной пробы — практика
 * adoption-блоков T16.4/T16.6).
 *
 * Поверхность браузера (docHeight/blocks/probes/скриншоты) даёт compare.mjs
 * на живой паре страниц; здесь — пины исполняемой формы решения:
 *  - build.mjs: страница company.html в PAGES (мёртвая ссылка с
 *    companies.html, REPORT §7); компания — первая из сегмента «Генерация»
 *    data/companies.json (оригинал фиксирует страницу за АО «Интер РАО –
 *    Электрогенерация»: крошки/h1 build.py company.html); крошки — ui-
 *    breadcrumbs с ровно одним aria-current, «Компании группы» — ссылка;
 *    h1 — ui-page-title (канон детальной, T14.2);
 *  - разметка по композиции спеки: company-hero (фото ui-image + имя +
 *    описание), company-stats (семантичный список, числа на ui-роли),
 *    преимущества (список/сетка сайт-зоны), where-we-work (ui-figure с
 *    подписями — приближение, карта-иллюстрация не переносится),
 *    banner-card (CTA «смотреть вакансии» → vacancies.html, фото ui-image +
 *    ui-button); классы оригинала не копируются (Implementation
 *    requirements п.1); фото несут alt (Accessibility requirements);
 *  - pilot.css: сайт-зона cp-company-* на токенах (статы — primary,
 *    преимущества — surface-blue-deep = маппинг --color-blue-700, оверлей
 *    баннера — тинт primary-a55); без hex и !important;
 *  - compare.mjs: company.html в PAGES (AC: compare.json содержит метрики).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев: пины смотрят на исполняемый код, а не на прозу
 *  шапки; CRLF-хост нормализуется (см. tests/unit/link.test.js). */
const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (tests/unit/link.test.js). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

const pilotDir = join(root, 'pilot', 'career-portal');
const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8');
const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8');
const pilotCssRaw = readFileSync(join(pilotDir, 'pilot.css'), 'utf8');
const pilotCss = stripCssComments(pilotCssRaw);
const companies = JSON.parse(readFileSync(join(pilotDir, 'data', 'companies.json'), 'utf8'));

/** Разметка, которую возвращает companyMain() (один return-шаблон;
 *  хвост без `\n}` — рабочая копия Windows отдаёт CRLF, см. link.test.js). */
const companyHtml = build.match(/function companyMain[\s\S]*?return `([\s\S]*?)`;/)?.[1] ?? '';

/** Кусок pilot.css от блоков компании до общего адаптива сайт-зоны. */
const companyCssStart = pilotCss.indexOf('.cp-company-hero');
const companyCss = pilotCss.slice(
  companyCssStart,
  pilotCss.indexOf('/* Сайт-зона пилота: адаптив'),
);

describe('build.mjs — страница company.html (T15.2 Scope)', () => {
  it('PAGES содержит company.html с заголовком по канону оригинала (build.py: «АО «Интер РАО – Электрогенерация» — Портал карьеры Интер РАО»)', () => {
    expect(build).toMatch(/\{\s*file: 'company.html',/);
    expect(build).toContain(
      `title: 'АО «Интер РАО – Электрогенерация» — Портал карьеры Интер РАО'`,
    );
  });

  it('компания — первая из сегмента «Генерация» data/companies.json (оригинал фиксирует страницу за АО «Интер РАО – Электрогенерация»; имя — из данных, не из константы разметки)', () => {
    const first = companies.companies.find((c) => c.segment === 'Генерация');
    expect(first.name).toBe('АО «Интер РАО – Электрогенерация»');
    expect(build, 'поиск компании в данных, а не литерал в разметке').toContain(
      "c.segment === 'Генерация'",
    );
  });

  it('крошки: Главная → «Компании группы» (ссылка на companies.html) → имя компании (текущая, aria-current даёт helper — ровно один на цепочку; Implementation requirements п.2)', () => {
    expect(companyHtml).toContain(`['Главная', 'index.html']`);
    expect(companyHtml).toContain(`['Компании группы', 'companies.html']`);
    expect(companyHtml).toMatch(/\[company\.name, ''\]/);
  });

  it('h1 — имя компании на роли ui-page-title (канон детальной, T14.2)', () => {
    expect(companyHtml).toMatch(/<h1 class="ui-page-title">\$\{esc\(company\.name\)\}<\/h1>/);
  });

  it('company-hero: фото — ui-image (Scope), описание — два абзаца контента оригинала (src/pages/company.html:8–9, без выдумывания)', () => {
    expect(companyHtml).toMatch(/class="ui-image ui-image--cover cp-company-hero__photo"/);
    expect(companyHtml).toContain('Генерирующая компания Группы «Интер РАО»');
    expect(companyHtml, 'второй абзац описания оригинала').toContain(
      'Мы производим электрическую и тепловую энергию, развиваем современные технологии генерации',
    );
    expect(companyHtml.match(/<p class="ui-body">/g)?.length ?? 0).toBe(2);
  });

  it('company-stats: семантичный список ul из 3 фактов — ui-stat--filled (T17.4), числа — роль ui-h2, подписи — ui-small (Accessibility requirements)', () => {
    expect(companyHtml).toContain('<ul class="cp-company-stats">');
    expect(companyHtml.match(/<li class="ui-stat ui-stat--filled">/g)?.length ?? 0).toBe(3);
    expect(companyHtml.match(/class="ui-stat__value ui-h2"/g)?.length ?? 0).toBe(3);
    expect(companyHtml.match(/class="ui-stat__label ui-small"/g)?.length ?? 0).toBe(3);
    for (const value of ['2,5 ГВт', '500+', 'Топ-10']) {
      expect(companyHtml, `факт «${value}» из оригинала`).toContain(value);
    }
  });

  it('преимущества: список-сетка сайт-зоны из 4 пунктов — ui-stat--deep (T17.4), заголовок ui-h4 + текст ui-small, контент оригинала company.html:22–25', () => {
    expect(companyHtml).toContain('<ul class="cp-company-adv">');
    expect(companyHtml.match(/<li class="ui-stat ui-stat--deep">/g)?.length ?? 0).toBe(4);
    expect(companyHtml.match(/<h3 class="ui-h4 ui-stat__value">/g)?.length ?? 0).toBe(4);
    for (const title of [
      'Современное производство',
      'Наставничество',
      'Обучение и развитие',
      'Стабильность',
    ]) {
      expect(companyHtml, `преимущество «${title}» из оригинала`).toContain(title);
    }
  });

  it('где мы работаем: две фигуры ui-figure с подписями оригинала (приближение вместо карты-иллюстрации — Out of scope T15.2)', () => {
    expect(
      companyHtml.match(/<figure class="ui-figure cp-company-where__item">/g)?.length ?? 0,
    ).toBe(2);
    expect(companyHtml).toContain('Головной офис компании');
    expect(companyHtml).toContain('Производственные площадки и станции');
    expect(
      companyHtml.match(/class="ui-image ui-image--cover cp-company-where__photo"/g)?.length ?? 0,
    ).toBe(2);
    expect(companyHtml, 'подпись связана с фото семантически').toContain(
      '<figcaption class="ui-figure__caption',
    );
  });

  it('banner-card: CTA-панель с фото-подложкой и ui-button «смотреть вакансии» на vacancies.html (Scope); тело — CTA-центр-композиция на ui-card--cta (T17.8), фон/оверлей — фото-секция ui-section--photo (T17.3)', () => {
    expect(companyHtml).toContain('<div class="ui-section ui-section--photo cp-company-banner">');
    expect(companyHtml).toContain('<div class="cp-company-banner__body ui-card ui-card--cta">');
    expect(companyHtml).toMatch(
      /<a class="ui-button ui-button--primary" href="vacancies.html">смотреть вакансии<\/a>/,
    );
  });

  it('заголовки разделов «Преимущества компании»/«Где мы работаем» — роль ui-h3 (оригинал .section-title--h3 = fs-h3 42px/1.3, pages.css:880; тот же маппинг, что на companies.html; ревью T15.2: ui-h2 60px — в 1.4 раза крупнее оригинала)', () => {
    expect(companyHtml.match(/<h2 class="ui-h3 cp-company-title">/g)?.length ?? 0).toBe(2);
    expect(companyHtml, 'ui-h2 на разделах не применяется').not.toContain(
      '<h2 class="ui-h2 cp-company-title">',
    );
  });

  it('фото с alt: контентные (hero, где мы работаем) — информативные, фоновое баннера — декоративное alt="" (README ui-image: подписывать декоративное нечего)', () => {
    const imgs = companyHtml.match(/<img\b[^>]*>/g) ?? [];
    expect(imgs.length, 'все img размечены').toBeGreaterThan(0);
    for (const img of imgs) {
      expect(img, `${img.slice(0, 80)}… — атрибут alt на месте`).toMatch(/\balt="[^"]*"/);
    }
    expect(companyHtml.match(/alt="Производство компании/)?.length ?? 0).toBe(1);
    expect(companyHtml, 'подписи где-мы-работаем продублированы в alt').toContain(
      'alt="Головной офис компании"',
    );
    expect(companyHtml, 'фото баннера — подложка под текст').toContain('alt=""');
  });

  it('классы оригинала не копируются — только cp-* поверх ui-* (Implementation requirements п.1)', () => {
    expect(companyHtml).not.toMatch(/class="company-/);
    expect(companyHtml).not.toMatch(/class="banner-card|class="where-we-work/);
  });
});

describe('pilot.css — сайт-зона компании cp-company-* (T15.2 Scope, правила пилота: токены --ui-*)', () => {
  it('блоки страницы существуют: hero, stats/adv (сетки — плашки сняты в ui-stat T17.4), where, banner (+body/title; фото-подложка/оверлей — ui-section--photo T17.3)', () => {
    for (const selector of [
      '.cp-company-hero',
      '.cp-company-hero__photo',
      '.cp-company-stats',
      '.cp-company-adv',
      '.cp-company-where',
      '.cp-company-banner',
      // T17.3: фото-подложка (__photo) и тинт сняты — слои несёт
      // ui-section--photo; сайт держит только хук тинта и раскладку.
      '.cp-company-banner .cp-company-banner__body',
      '.cp-company-banner__title',
    ]) {
      expect(blockOf(pilotCss, selector), `${selector} найдено`).toBeTruthy();
    }
    // T17.4: плашки стат/преимуществ — компонент ui-stat (--filled/--deep):
    // правила сайт-zones сняты, у сеток остались только раскладки.
    for (const removed of [
      '.cp-company-stats__item',
      '.cp-company-stats__value',
      '.cp-company-stats__label',
      '.cp-company-adv__item',
      '.cp-company-adv__title',
    ]) {
      expect(blockOf(pilotCss, removed), `${removed} снято (ui-stat, T17.4)`).toBeFalsy();
    }
  });

  it('Technical considerations (унификация статов): две вариации holding/company сняты в компонент ui-stat (T17.4) — решение задокументировано комментарием у сеток', () => {
    const section = pilotCssRaw.slice(pilotCssRaw.indexOf('/* ── компания:'));
    expect(section, 'ссылка на ui-stat в комментарий сетки стат').toContain('ui-stat--filled');
    expect(section, 'ссылка на ui-stat--deep в комментарий сетки преимуществ').toContain(
      'ui-stat--deep',
    );
  });

  it('статы на сплошном primary (оригинал .company-stats__item background var(--color-primary), pages.css:807) — поверхность и цвета несёт ui-stat--filled (T17.4)', () => {
    const stat = stripCssComments(
      readFileSync(join(root, 'components', 'ui-stat', 'ui-stat.css'), 'utf8'),
    );
    expect(blockOf(stat, '.ui-stat')).toContain(
      'background-color: var(--ui-stat-surface, var(--ui-color-primary));',
    );
    expect(blockOf(stat, '.ui-stat--filled')).toContain('padding: 1.25rem var(--ui-space-5);');
  });

  it('числа статов: роль ui-h2 в разметке, on-dark цвет — override роли компонентом ui-stat__value; подпись — on-dark-muted (AA-замена white 75%, T2.3)', () => {
    const stat = stripCssComments(
      readFileSync(join(root, 'components', 'ui-stat', 'ui-stat.css'), 'utf8'),
    );
    expect(blockOf(stat, '.ui-stat__value')).toContain('color: var(--ui-color-text-on-dark);');
    expect(blockOf(stat, '.ui-stat__label')).toContain(
      'color: var(--ui-color-text-on-dark-muted);',
    );
  });

  it('карточки преимуществ — surface-blue-deep (маппинг --color-blue-700 оригинала, pages.css:815) несёт ui-stat--deep (T17.4)', () => {
    const stat = stripCssComments(
      readFileSync(join(root, 'components', 'ui-stat', 'ui-stat.css'), 'utf8'),
    );
    expect(blockOf(stat, '.ui-stat--deep')).toContain(
      'background-color: var(--ui-color-surface-blue-deep);',
    );
    expect(blockOf(stat, '.ui-stat--deep')).toContain('gap: var(--ui-space-3);');
  });

  it('оверлей баннера — тинт primary-a55 токен-хуком фото-секции (rgba(0,40,86,.55) оригинала, pages.css:666 — ступень лестницы T14.7); раскладка тела — на модификаторе ui-card--cta (T17.8), тело прозрачно поверх тинта', () => {
    const banner = blockOf(pilotCss, '.cp-company-banner');
    expect(banner).toContain('--ui-section-overlay-tint: var(--ui-color-primary-a55);');
    const body = blockOf(pilotCss, '.cp-company-banner .cp-company-banner__body');
    expect(body).toContain('background-color: transparent;');
    expect(body).toContain('color: var(--ui-color-text-on-dark);');
    expect(blockOf(pilotCss, '.cp-company-banner__title')).toContain(
      'color: var(--ui-color-text-on-dark);',
    );
  });

  it('ширина текста баннера — 560px «как есть» (pages.css:674); паддинг тела — 40px «как есть» (pages.css:667), не ступень шкалы (--ui-space-7 = 48px — ревью T15.2: дивергенция от оригинала и ложный комментарий); рамка гасится (CTA-карточка без заливки несёт border базы, T17.8)', () => {
    expect(blockOf(pilotCss, '.cp-company-banner__text')).toContain('max-width: 35rem;');
    expect(blockOf(pilotCss, '.cp-company-banner .cp-company-banner__body')).toContain(
      'padding: 2.5rem;',
    );
    expect(blockOf(pilotCss, '.cp-company-banner .cp-company-banner__body')).toContain(
      'border: 0;',
    );
  });

  it('в блоках компании нет hex и !important (инварианты системы; значения оригинала вне шкалы — rem «как есть» с комментарием-источником)', () => {
    expect(companyCss).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(companyCss).not.toContain('!important');
  });

  it('адаптив сайт-зоны: 1023 — hero в колонку, преимущества 2×2, где-мы-работаем в колонку (у оригинала hero/adv сворачиваются на 1279 — pages.css:896–906; конвенция пилота — две ступени, 1279 поглощена в 1023: полоса 1024–1279 просторнее оригинала); 767 — статы и преимущества в колонку (pages.css:929)', () => {
    const m1023 = pilotCss.slice(pilotCss.indexOf('@media (max-width: 1023px)'));
    const m767 = pilotCss.slice(pilotCss.indexOf('@media (max-width: 767px)'));
    for (const selector of ['.cp-company-hero', '.cp-company-adv', '.cp-company-where']) {
      expect(m1023, `${selector} в ступени 1023`).toContain(selector);
    }
    expect(m767).toContain('.cp-company-stats');
    expect(m767).toContain('.cp-company-adv');
  });
});

describe('compare.mjs — страница в PAGES (T15.2 Scope; AC: compare.json содержит метрики страницы)', () => {
  it('company.html включена в compare-прогон (порядок оригинала build.py: до companies.html)', () => {
    const pages = compare.match(/const PAGES = \[([\s\S]*?)\];/)?.[1] ?? '';
    const order = [...pages.matchAll(/'([a-z-]+\.html)'/g)].map((m) => m[1]);
    expect(order).toContain('company.html');
    expect(order.indexOf('company.html')).toBeLessThan(order.indexOf('companies.html'));
  });
});

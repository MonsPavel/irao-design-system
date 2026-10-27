/**
 * Юнит-пин adoption пяти фоновых секций пилота на ui-section--photo
 * (T17.3; Testing requirements — «поверхностная проверка», пины до
 * браузерной пробы — практика adoption-блоков T16.4/T16.5/T17.4).
 *
 * Спека T17.3: приём «фон inset:0 под контентом + оверлей» — фирменное
 * композиционное средство портала, скопированное в пилоте пять раз
 * (hero/production/holding/why-us/company-banner). Перевод на модификатор
 * ДС снимает фоновые правила `__bg`/`__glow` из pilot.css:
 *  - hero — оверлей `--fade-bottom` (градиент surface→transparent→
 *    primary-a94, канон оригинала);
 *  - production — оверлей `--glow` (горизонтальный градиент primary
 *    88%→34%→transparent слева; pointer-events-артефакт site-зоны уходит
 *    вместе с правилом — оверлей ДС под контентом);
 *  - holding/why-us — фото без оверлея (on-dark текст — контентом);
 *  - company-banner — тинт primary-a55 токен-хуком
 *    `--ui-section-overlay-tint` (лестница T14.7).
 * Высоты блоков гейтит compare (AC: порог ±4px — BLOCK_PROBES
 * hero/production/holding/why-us на index.html, company-banner на
 * company.html); здесь — пины исполняемой формы решения.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

const stripCssComments = (css) => css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

const pilotDir = join(root, 'pilot', 'career-portal');
const build = readFileSync(join(pilotDir, 'build.mjs'), 'utf8');
const compare = readFileSync(join(pilotDir, 'compare.mjs'), 'utf8');
const pilotCss = stripCssComments(readFileSync(join(pilotDir, 'pilot.css'), 'utf8'));

const indexHtml = build.match(/function indexMain[\s\S]*?return `([\s\S]*?)`;/)?.[1] ?? '';
const companyHtml = build.match(/function companyMain[\s\S]*?return `([\s\S]*?)`;/)?.[1] ?? '';

describe('build.mjs — пять фоновых секций на ui-section--photo (T17.3 Scope)', () => {
  it('hero: секция несёт модификатор, фон __bg + оверлей --fade-bottom (канон примера спеки)', () => {
    expect(indexHtml).toContain('<section class="ui-section ui-section--photo cp-hero">');
    expect(indexHtml).toContain('<div class="ui-section__bg" aria-hidden="true">');
    expect(indexHtml).toContain(
      '<div class="ui-section__overlay ui-section__overlay--fade-bottom" aria-hidden="true"></div>',
    );
    // старые фоновые классы сняты из разметки
    expect(indexHtml).not.toContain('cp-hero__bg');
  });

  it('production: модификатор + __bg + оверлей --glow; порядок слоёв bg → glow → контент', () => {
    expect(indexHtml).toMatch(
      /<section class="ui-section ui-section--photo cp-production ui-carousel" data-ui-carousel>/,
    );
    const section = indexHtml.slice(indexHtml.indexOf('cp-production'));
    expect(section.indexOf('ui-section__bg'), 'фон раньше оверлея').toBeLessThan(
      section.indexOf('ui-section__overlay ui-section__overlay--glow'),
    );
    expect(section).toContain('cp-production__photo');
    expect(section).not.toContain('cp-production__glow');
    expect(section).not.toContain('cp-production__bg');
  });

  it('holding и why-us: модификатор + __bg без оверлея (фото без затемнения — канон оригинала)', () => {
    expect(indexHtml).toContain('<section class="ui-section ui-section--photo cp-holding">');
    expect(indexHtml).toContain('<section class="ui-section ui-section--photo cp-why-us">');
    for (const [name, section] of [
      ['holding', indexHtml.slice(indexHtml.indexOf('cp-holding'))],
      ['why-us', indexHtml.slice(indexHtml.indexOf('cp-why-us'))],
    ]) {
      expect(section, `${name}: __bg на месте`).toContain('ui-section__bg');
      expect(section.slice(0, section.indexOf('</section>')), `${name}: оверлея нет`).not.toContain(
        'ui-section__overlay',
      );
    }
    expect(indexHtml).not.toContain('cp-holding__bg');
    expect(indexHtml).not.toContain('cp-why-us__bg');
  });

  it('company-banner: фото-секция на div-композиции; тинт — на теле (оригинал pages.css:666), оверлея в разметке нет', () => {
    const banner = companyHtml.slice(companyHtml.indexOf('cp-company-banner'));
    expect(companyHtml).toContain('<div class="ui-section ui-section--photo cp-company-banner">');
    expect(banner).toContain('<div class="ui-section__bg" aria-hidden="true">');
    // Тинт остаётся на теле (заливка body-бокса со скруглением, полосы фото
    // видны сверху/снизу — approved design): full-bleed --tint дал бы
    // сплошной тинт — другой вид (проба скрин-пар T17.3).
    expect(
      banner.slice(0, banner.indexOf('<div class="cp-company-banner__body')),
      'оверлея в баннере нет',
    ).not.toContain('ui-section__overlay');
    expect(companyHtml).not.toContain('cp-company-banner__photo');
    // img фона — декоративный по умолчанию (Implementation requirements п.3)
    const bgImg = companyHtml.match(/<div class="ui-section__bg"[\s\S]*?<\/div>/)?.[0] ?? '';
    expect(bgImg).toContain('alt=""');
    expect(bgImg, 'размеры/CLS-атрибуты сохранены').toContain('width="692"');
  });

  it('img декоративных фонов — alt="" и aria-hidden на слоях (Implementation requirements п.3)', () => {
    for (const [name, html] of [
      ['index', indexHtml],
      ['company', companyHtml],
    ]) {
      for (const bg of html.match(/<div class="ui-section__bg"[\s\S]*?<\/div>/g) ?? []) {
        expect(bg, `${name}: aria-hidden на __bg`).toContain('aria-hidden="true"');
        expect(bg, `${name}: img фона декоративный`).toContain('alt=""');
      }
    }
  });
});

describe('pilot.css — фоновые правила __bg/__glow сняты, ритм ui-section погашен (T17.3)', () => {
  it('фоновые правила пяти блоков удалены (слои несёт ui-section--photo)', () => {
    for (const removed of [
      '.cp-hero__bg',
      '.cp-hero__bg::after',
      '.cp-hero__bg img',
      '.cp-production__bg',
      '.cp-production__bg img',
      '.cp-production__glow',
      '.cp-holding__bg',
      '.cp-holding__bg img',
      '.cp-why-us__bg',
      '.cp-why-us__bg img',
      '.cp-company-banner__photo',
    ]) {
      expect(blockOf(pilotCss, removed), `${removed} снято (T17.3)`).toBeFalsy();
    }
  });

  it('вертикальная геометрия пяти блоков не изменилась: ритм ui-section гашится (padding: 0) — паритет высот compare ±4px', () => {
    for (const block of [
      '.cp-hero',
      '.cp-production',
      '.cp-holding',
      '.cp-why-us',
      '.cp-company-banner',
    ]) {
      expect(blockOf(pilotCss, block), `${block} найдено`).toBeTruthy();
      expect(blockOf(pilotCss, block), `${block}: ритм ui-section погашен`).toContain(
        'padding: 0;',
      );
    }
  });

  it('позиционирование корней сохранено (якорь absolute-слоёв)', () => {
    for (const block of [
      '.cp-hero',
      '.cp-production',
      '.cp-holding',
      '.cp-why-us',
      '.cp-company-banner',
    ]) {
      expect(blockOf(pilotCss, block), `${block}: position: relative`).toContain(
        'position: relative;',
      );
    }
  });

  it('тинт баннера — на теле, как в оригинале (primary-a55 — ступень лестницы T14.7); тело не прозрачное', () => {
    const banner = blockOf(pilotCss, '.cp-company-banner');
    expect(banner, 'хук тинта на секции не остался (тинт — тело)').not.toContain(
      '--ui-section-overlay-tint',
    );
    const body = blockOf(pilotCss, '.cp-company-banner .cp-company-banner__body');
    expect(body).toContain('background-color: var(--ui-color-primary-a55);');
    expect(body, 'текст тела — on-dark-пара').toContain('color: var(--ui-color-text-on-dark);');
    expect(body, 'паддинг 40px «как есть» (pages.css:667)').toContain('padding: 2.5rem;');
    expect(body, 'рамка гасится (T17.8)').toContain('border: 0;');
  });

  it('в правках нет !important (инвариант); hex не добавлен — спец-тинты hero-тегов (violet/green/rose) остаются сайт-зоной до T17.15', () => {
    expect(pilotCss).not.toContain('!important');
    // бывшие color-mix-градиенты __bg/__glow переехали в ДС на токенах —
    // сырого primary в них больше нет (остаются только спец-тинты тегов)
    const tagTintHexes = [...pilotCss.matchAll(/#([0-9a-f]{3,8})\b/gi)].map((m) => m[1]);
    expect(
      tagTintHexes.every((hex) => ['3142ff', '31ff76', 'ff3134'].includes(hex.toLowerCase())),
      `сырые цвета в pilot.css — только спец-тинты hero-тегов (найдено: ${tagTintHexes.join(', ')})`,
    ).toBe(true);
  });
});

describe('compare.mjs — блок баннера в BLOCK_PROBES (AC: паритет высот ±4px)', () => {
  it('company.html: пара company-banner (оригинал .banner-card → пилот .cp-company-banner)', () => {
    const companyProbes = compare.match(/'company\.html': \[([\s\S]*?)\n {2}\],/)?.[1] ?? '';
    expect(companyProbes).toContain("['company-banner', '.banner-card', '.cp-company-banner']");
  });

  it('index.html: четыре фоновых блока уже гейтятся (hero/production/holding/why-us)', () => {
    const indexProbes = compare.match(/'index\.html': \[([\s\S]*?)\n {2}\],/)?.[1] ?? '';
    for (const name of ['hero', 'production', 'holding', 'why-us']) {
      expect(indexProbes).toContain(`'${name}'`);
    }
  });
});

describe('REPORT §3.4 синхронен с T17.3 (прецедент пина card.test.js/video.test.js)', () => {
  const report = readFileSync(join(pilotDir, 'REPORT.md'), 'utf8');

  it('строки пяти фоновых блоков несут пометку миграции T17.3 с нулевой дельтой', () => {
    for (const [name, height] of [
      ['hero', '808'],
      ['production', '651'],
      ['holding', '603'],
      ['why-us', '1019'],
    ]) {
      const row = report.match(new RegExp(`\\| ${name} \\| \\d+ \\| ${height} \\| [^\\n]*\\|`));
      expect(row, `строка ${name} в таблице высот`).toBeTruthy();
      expect(row[0], `${name}: пометка T17.3`).toContain('T17.3');
      expect(row[0], `${name}: дельта миграции 0`).toContain('дельта 0');
    }
    expect(report, 'баннер компании (вне таблицы) — строка о миграции T17.3').toContain(
      'T17.3 перевёл подложку баннера на ui-section--photo',
    );
  });
});

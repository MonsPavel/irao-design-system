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
 *  - production — оверлей `--tint` через хук `--ui-section-overlay-tint`
 *    (errata 31.10, решение владельца «приведи к оригиналу»: solid primary
 *    90% поверх фото завода — production.css:28; прежний `--glow`
 *    88%→34%→0% с z-index: auto замирал текст слайда — ошибочное
 *    прочтение оригинала при T17.3);
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
// Канон hero — паттерн-слой с T17.15 (связка hro): пины блока — по слою.
const layerCss = stripCssComments(readFileSync(join(root, 'patterns', 'patterns.css'), 'utf8'));

const indexHtml = build.match(/function indexMain[\s\S]*?return `([\s\S]*?)`;/)?.[1] ?? '';
const companyHtml = build.match(/function companyMain[\s\S]*?return `([\s\S]*?)`;/)?.[1] ?? '';

describe('build.mjs — пять фоновых секций на ui-section--photo (T17.3 Scope)', () => {
  it('hero: секция несёт модификатор и связку канона hro (T17.15), фон __bg + оверлей --fade-bottom (канон примера спеки)', () => {
    expect(indexHtml).toContain('<section class="ui-section ui-section--photo hro">');
    expect(indexHtml).toContain('<div class="ui-section__bg" aria-hidden="true">');
    expect(indexHtml).toContain(
      '<div class="ui-section__overlay ui-section__overlay--fade-bottom" aria-hidden="true"></div>',
    );
    // старые фоновые классы сняты из разметки
    expect(indexHtml).not.toContain('cp-hero__bg');
  });

  it('production: модификатор + __bg + оверлей --tint; порядок слоёв bg → tint → контент (T18.13 — канон prd слоя)', () => {
    expect(indexHtml).toMatch(
      /<section class="ui-section ui-section--photo prd prd--v1 ui-carousel" data-ui-carousel>/,
    );
    const section = indexHtml.slice(indexHtml.indexOf('prd prd--v1'));
    expect(section.indexOf('ui-section__bg'), 'фон раньше оверлея').toBeLessThan(
      section.indexOf('ui-section__overlay ui-section__overlay--tint'),
    );
    expect(section).toContain('prd__photo');
    expect(section).not.toContain('cp-production__glow');
    expect(section).not.toContain('cp-production__bg');
    // --tint без канон-правила «над контентом» (errata 31.10 — см. шапку):
    // glow-оверрайд z-index: auto ушёл вместе с модификатором
    expect(indexHtml).not.toContain('ui-section__overlay--glow');
  });

  it('holding и why-us: модификатор + __bg без оверлея (фото без затемнения — канон оригинала; holding — канон hld слоя T18.14, why-us — канон whu слоя, T18.12)', () => {
    expect(indexHtml).toContain('<section class="ui-section ui-section--photo hld">');
    expect(indexHtml).toContain('<section class="ui-section ui-section--photo whu">');
    for (const [name, section] of [
      ['holding', indexHtml.slice(indexHtml.indexOf('ui-section--photo hld'))],
      ['why-us', indexHtml.slice(indexHtml.indexOf('ui-section--photo whu'))],
    ]) {
      expect(section, `${name}: __bg на месте`).toContain('ui-section__bg');
      expect(section.slice(0, section.indexOf('</section>')), `${name}: оверлея нет`).not.toContain(
        'ui-section__overlay',
      );
    }
    expect(indexHtml).not.toContain('cp-holding');
    expect(indexHtml).not.toContain('cp-why-us__bg');
  });

  it('company-banner: фото-секция на div-композиции — канон dpp-banner слоя (T18.15); тинт — на теле (оригинал pages.css:666), оверлея в разметке нет', () => {
    const banner = companyHtml.slice(companyHtml.indexOf('dpp-banner'));
    expect(companyHtml).toContain('<div class="ui-section ui-section--photo dpp-banner">');
    expect(banner).toContain('<div class="ui-section__bg" aria-hidden="true">');
    // Тинт остаётся на теле (заливка body-бокса со скруглением, полосы фото
    // видны сверху/снизу — approved design): full-bleed --tint дал бы
    // сплошной тинт — другой вид (проба скрин-пар T17.3).
    expect(
      banner.slice(0, banner.indexOf('<div class="dpp-banner__body')),
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

  it('вертикальная геометрия пяти блоков: hero/production гасят ритм (padding: 0); holding/why-us несут ритм оригинала (батч ритма 01.11, решение владельца)', () => {
    // hero — канон hro (T17.15): блок перенесён в паттерн-слой, пин — по слою.
    expect(blockOf(layerCss, '.hro'), '.hro найдено (слой, T17.15)').toBeTruthy();
    expect(blockOf(layerCss, '.hro'), '.hro: ритм ui-section погашен').toContain('padding: 0;');
    // production — канон prd (T18.13): блок перенесён в паттерн-слой, пин — по слою.
    expect(blockOf(layerCss, '.prd'), '.prd найдено (слой, T18.13)').toBeTruthy();
    expect(blockOf(layerCss, '.prd'), '.prd: ритм ui-section погашен').toContain('padding: 0;');
    // T18.15 — company-banner на каноне dpp-banner слоя: пин ритма — по слою
    // (высоту держит min-height 320 + тело, ритм ui-section погашен).
    expect(blockOf(layerCss, '.dpp-banner'), '.dpp-banner найдено (слой, T18.15)').toBeTruthy();
    expect(
      blockOf(layerCss, '.dpp-banner'),
      '.dpp-banner: ритм ui-section погашен',
    ).toContain('padding: 0;');
    // Errata 01.11 — ритм-батч: why-us 140/80 (why-us.css:3), holding
    // 72/48 (holding.css:3) — паритет высот compare (why 1350↔1350);
    // у holding остаток −75 = принятая дельта статов (T17.4, lh 1.1).
    // T18.12 — why-us на каноне whu слоя: пин ритма — по слою (140/80
    // от lg; 96/48 — мобильная база оригинала, why-us.css:111).
    const whuIdx = layerCss.indexOf('.whu {');
    expect(whuIdx, '.whu найдено (слой, T18.12)').toBeGreaterThan(-1);
    expect(layerCss.slice(whuIdx, whuIdx + 200), 'whu: мобильная база 96/48').toContain(
      'padding: 6rem 0 var(--ui-space-7);',
    );
    const whuLg = layerCss
      .slice(whuIdx)
      .match(/@media \(min-width: 1024px\)\s*\{\s*\.whu \{([^}]*)\}/);
    expect(whuLg, 'ступень lg ритма whu найдена').toBeTruthy();
    expect(whuLg[1], 'whu: ритм оригинала 140/80 от lg').toContain('padding: 8.75rem 0 5rem;');
    // T18.14 — holding на каноне hld слоя: пин ритма — по слою (72/48
    // holding.css:3 «как есть»; компакт — та же сумма 758).
    expect(blockOf(layerCss, '.hld'), 'holding: ритм оригинала (слой, T18.14)').toContain(
      'padding: 4.5rem 0 3rem;',
    );
  });

  it('позиционирование корней сохранено (якорь absolute-слоёв)', () => {
    // hero — канон hro (T17.15): пин position — по слою. why-us — канон whu
    // (T18.12), production — канон prd (T18.13) и holding — канон hld
    // (T18.14): position несёт примитив ui-section--photo — слой его не
    // переобъявляет (пин инварианта — по слою).
    expect(blockOf(layerCss, '.hro'), '.hro: position: relative (слой)').toContain(
      'position: relative;',
    );
    expect(
      blockOf(layerCss, '.prd'),
      'prd: position несёт примитив (не переобъявляется)',
    ).not.toContain('position');
    expect(
      blockOf(layerCss, '.whu'),
      'whu: position несёт примитив (не переобъявляется)',
    ).not.toContain('position');
    expect(
      blockOf(layerCss, '.hld'),
      'hld: position несёт примитив (не переобъявляется, T18.14)',
    ).not.toContain('position');
    // T18.15 — company-banner на каноне dpp-banner: position несёт примитив
    // ui-section--photo — слой его не переобъявляет (прецедент hld/prd/whu).
    expect(
      blockOf(layerCss, '.dpp-banner'),
      'dpp-banner: position несёт примитив (не переобъявляется, T18.15)',
    ).not.toContain('position');
  });

  it('тинт баннера — на теле, как в оригинале (primary-a55 — ступень лестницы T14.7; T18.15 — канон dpp-banner слоя, пины по слою); тело не прозрачное', () => {
    const banner = blockOf(layerCss, '.dpp-banner');
    expect(banner, 'хук тинта на секции не остался (тинт — тело)').not.toContain(
      '--ui-section-overlay-tint',
    );
    const body = blockOf(layerCss, '.dpp-banner__body');
    expect(body).toContain('background-color: var(--ui-color-primary-a55);');
    expect(body, 'текст тела — on-dark-пара').toContain('color: var(--ui-color-text-on-dark);');
    expect(body, 'паддинг 40px «как есть» (pages.css:667)').toContain('padding: 2.5rem;');
    expect(body, 'рамка гасится (T17.8)').toContain('border: 0;');
  });

  it('в правках нет !important (инвариант); hex не добавлен — спец-тинты hero-тегов (violet/green/rose) и градиент карточек mentorship (T18.2) — сайт-зона', () => {
    expect(pilotCss).not.toContain('!important');
    // бывшие color-mix-градиенты __bg/__glow переехали в ДС на токенах —
    // сырого primary в них больше нет (спец-тинты тегов T17.15 + тон-строка
    // активной карточки mentorship на хуке канона --msh-card-active-bg —
    // T18.2, прецедент тон-строк сайт-зоны)
    const tagTintHexes = [...pilotCss.matchAll(/#([0-9a-f]{3,8})\b/gi)].map((m) => m[1]);
    expect(
      tagTintHexes.every((hex) =>
        ['3142ff', '31ff76', 'ff3134', 'e88a2c', 'd9a441', 'c4cddc'].includes(hex.toLowerCase()),
      ),
      `сырые цвета в pilot.css — только спец-тинты hero-тегов, градиент mentorship и тон точки этапа career-track T18.4 (найдено: ${tagTintHexes.join(', ')})`,
    ).toBe(true);
  });
});

describe('compare.mjs — блок баннера в BLOCK_PROBES (AC: паритет высот ±4px)', () => {
  it('company.html: пара company-banner (оригинал .banner-card → пилот .dpp-banner — канон слоя, T18.15)', () => {
    const companyProbes = compare.match(/'company\.html': \[([\s\S]*?)\n {2}\],/)?.[1] ?? '';
    expect(companyProbes).toContain("['company-banner', '.banner-card', '.dpp-banner']");
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

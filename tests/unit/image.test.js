/**
 * Юнит-пин ui-image / ui-figure (задача T4.6; Testing requirements).
 *
 * Поверхность браузера — стенды (showcase/pages/ui-image — три вида + fallback,
 * showcase/pages/ui-figure — подпись), CLS/broken-src, axe и эталоны —
 * в tests/e2e/ui-image.spec.js; здесь — пины исполняемой формы решения:
 *  - tokens/semantic.css: шкала пропорций --ui-ratio-* (Scope: «aspect-ratio
 *    из шкалы»; в career-portal aspect-ratio нет — медиа фиксировались высотами
 *    + object-fit: cover, pages.css:455/632/697, магические высоты не переносятся);
 *  - components/ui-image/ui-image.css: box-sizing на корне (ADR-0002);
 *    height: auto — атрибутные размеры не искажаются при сжатии; ratio-модификаторы
 *    читают шкалу слоя 2 и фиксируют место (width: 100% + aspect-ratio);
 *    --cover/--contain — только object-fit (ортогональность модификаторов);
 *  - components/ui-figure/ui-figure.css: сброс UA-отступа figure, шаг подписи
 *    — spacing-токен; типографика подписи — роли base в разметке (паттерн
 *    ui-card/ui-alert: компонент шрифты не переобъявляет);
 *  - инварианты системы: без !important, без hex, без фиксированных высот;
 *  - канонические паттерны: img с alt и width/height, loading="lazy" вне
 *    первого экрана, figure/figcaption, без inline-стилей (VI-инвариант §5);
 *  - стенды: три вида (декоративное/информативное/complex + описание),
 *    fallback-секция, матрица модификаторов, без data-ui-check-layout
 *    (гейт масштабирования T3.6 не расширяется без записи в CHECK_STANDS —
 *    пин синхронности tests/unit/scaling.test.js);
 *  - 'ui-image' и 'ui-figure' в COMPONENTS — CSS в dist/ui-core.min.css;
 *  - html-validate: правило irao/img-dimensions (AC «img без alt и без
 *    размеров — ошибки»: alt закрывает wcag/h37 из T1.2, размеры — новое
 *    правило) + строки-ожидания фикстур в tools/run-lint-cases.mjs;
 *  - README компонент: чек-лист подготовки изображений (alt/размеры/lazy/
 *    retina/Bitrix), семантика подписи figure.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев: пины смотрят на исполняемый код, а не на прозу шапки. */
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (начало строки — селектор, до закрывающей скобки). */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

describe('tokens/semantic.css — шкала пропорций (Scope T4.6: «aspect-ratio из шкалы»)', () => {
  const source = readFileSync(join(root, 'tokens', 'semantic.css'), 'utf8');

  it('токены --ui-ratio-* определены: 1/1, 3/2, 4/3, 16/9', () => {
    expect(source).toMatch(/--ui-ratio-1-1:\s*1\s*\/\s*1;/);
    expect(source).toMatch(/--ui-ratio-3-2:\s*3\s*\/\s*2;/);
    expect(source).toMatch(/--ui-ratio-4-3:\s*4\s*\/\s*3;/);
    expect(source).toMatch(/--ui-ratio-16-9:\s*16\s*\/\s*9;/);
  });
});

describe('components/ui-image/ui-image.css — база (ADR-0002, паттерн CLS=0)', () => {
  const path = join(root, 'components', 'ui-image', 'ui-image.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define image — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define image */')).toBe(true);
  });

  it('.ui-image: box-sizing; display block; max-width 100%; height auto (атрибутная пропорция не искажается при сжатии)', () => {
    const block = blockOf(css, '.ui-image');
    expect(block, 'правило .ui-image найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: block;');
    expect(block).toContain('max-width: 100%;');
    expect(block).toContain('height: auto;');
  });

  it('ratio-модификаторы читают шкалу слоя 2 и фиксируют место (width 100% + aspect-ratio)', () => {
    for (const ratio of ['1-1', '3-2', '4-3', '16-9']) {
      const block = blockOf(css, `.ui-image--ratio-${ratio}`);
      expect(block, `правило .ui-image--ratio-${ratio} найдено`).toBeTruthy();
      expect(block).toContain('width: 100%;');
      expect(block).toContain(`aspect-ratio: var(--ui-ratio-${ratio});`);
    }
  });

  it('--cover/--contain — только object-fit (модификаторы ортогональны: кадрирование отдельно от пропорции)', () => {
    expect(blockOf(css, '.ui-image--cover')).toContain('object-fit: cover;');
    expect(blockOf(css, '.ui-image--contain')).toContain('object-fit: contain;');
  });

  it('инварианты системы: без !important и hex (vi-перекраска, ADR-0002)', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('фиксированных (px/rem) высот нет — место фиксирует aspect-ratio, не магические высоты (career-portal pages.css:632/697 не переносится)', () => {
    expect(css).not.toMatch(/(?:^|\n)\s*(?:min-)?height:\s*[\d.]+(?:px|rem|pt)/);
  });
});

describe('components/ui-figure/ui-figure.css — фигура с подписью (Scope T4.6)', () => {
  const path = join(root, 'components', 'ui-figure', 'ui-figure.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define figure — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define figure */')).toBe(true);
  });

  it('.ui-figure: box-sizing; сброс UA-отступа figure (margin 0) — композиция через слоты/сетку', () => {
    const block = blockOf(css, '.ui-figure');
    expect(block, 'правило .ui-figure найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('margin: 0;');
  });

  it('.ui-figure__caption: box-sizing; шаг от изображения — spacing-токен', () => {
    const block = blockOf(css, '.ui-figure__caption');
    expect(block, 'правило .ui-figure__caption найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toMatch(/margin-top:\s*var\(--ui-space-\d\);/);
  });

  it('инварианты системы: без !important и hex; типографика подписи не переобъявляется (роли base в разметке)', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/font-(?:size|family|weight):/);
    expect(css).not.toMatch(/(?:^|\n)\s*(?:min-)?height:\s*[\d.]+(?:px|rem|pt)/);
  });
});

describe('канонические паттерны (components/ui-{image,figure})', () => {
  const imageHtml = readFileSync(join(root, 'components', 'ui-image', 'ui-image.html'), 'utf8');
  const figureHtml = readFileSync(join(root, 'components', 'ui-figure', 'ui-figure.html'), 'utf8');

  it('ui-image: информативный пример с alt и width/height (нет CLS) + media-паттерн ratio+cover', () => {
    expect(imageHtml).toMatch(/<img[^>]*class="[^"]*ui-image[^"]*"[^>]*alt="[^"]+"/);
    expect(imageHtml).toMatch(/<img[^>]*width="\d+"[^>]*height="\d+"/);
    expect(imageHtml).toContain('ui-image--ratio-');
    expect(imageHtml).toContain('ui-image--cover');
  });

  it('ui-image: loading="lazy" для вне-первого-экрана (правило паттерна)', () => {
    expect(imageHtml).toContain('loading="lazy"');
  });

  it('ui-figure: figure + figcaption (семантика подписи) + ui-image внутри', () => {
    expect(figureHtml).toMatch(/<figure class="ui-figure"/);
    expect(figureHtml).toContain('ui-figure__caption');
    // figcaption внутри figure, после изображения (пины порядка, а не разметки
    // строк: prettier переносит атрибуты).
    expect(figureHtml.indexOf('<figure')).toBeLessThan(figureHtml.indexOf('<img'));
    expect(figureHtml.indexOf('<img')).toBeLessThan(figureHtml.indexOf('<figcaption'));
    expect(figureHtml.indexOf('<figcaption')).toBeLessThan(figureHtml.indexOf('</figure>'));
  });

  it('без inline-стилей (VI-инвариант §5)', () => {
    expect(imageHtml).not.toMatch(/<[a-z]+[^>]*style=/);
    expect(figureHtml).not.toMatch(/<[a-z]+[^>]*style=/);
  });
});

describe('стенды (showcase/pages/ui-image, showcase/pages/ui-figure)', () => {
  const imageStand = readFileSync(
    join(root, 'showcase', 'pages', 'ui-image', 'index.html'),
    'utf8',
  );
  const figureStand = readFileSync(
    join(root, 'showcase', 'pages', 'ui-figure', 'index.html'),
    'utf8',
  );

  it('стенд ui-image: три вида изображений — декоративное (alt=""), информативное, complex (aria-describedby + описание)', () => {
    expect(imageStand).toContain('id="ui-image-decorative"');
    expect(imageStand).toMatch(/id="ui-image-decorative"[^>]*alt=""/);
    expect(imageStand).toContain('id="ui-image-informative"');
    expect(imageStand).toContain('id="ui-image-complex"');
    expect(imageStand).toMatch(
      /id="ui-image-complex"[^>]*aria-describedby="ui-image-complex-desc"/,
    );
    expect(imageStand).toContain('id="ui-image-complex-desc"');
  });

  it('стенд ui-image: матрица модификаторов (--cover/--contain/--ratio-*) и fallback-секция со сломанным src', () => {
    for (const id of [
      'ui-image-cover',
      'ui-image-contain',
      'ui-image-ratio-1-1',
      'ui-image-ratio-3-2',
      'ui-image-ratio-4-3',
      'ui-image-ratio-16-9',
    ]) {
      expect(imageStand, id).toContain(`id="${id}"`);
    }
    expect(imageStand).toContain('id="ui-image-fallback"');
    expect(imageStand).toContain('id="ui-image-broken"');
  });

  it('стенд ui-image: lazy-политика в разметке — вне первого экрана loading="lazy"', () => {
    expect(imageStand).toMatch(/loading="lazy"/);
  });

  it('стенд ui-figure: figure с figcaption и композиция с ui-image', () => {
    expect(figureStand).toMatch(/<figure class="ui-figure"/);
    expect(figureStand).toContain('ui-figure__caption');
    expect(figureStand).toMatch(/<img[^>]*class="[^"]*ui-image/);
  });

  it('без data-ui-check-layout — гейт T3.6 не расширяется без записи в CHECK_STANDS', () => {
    expect(imageStand).not.toContain('data-ui-check-layout');
    expect(figureStand).not.toContain('data-ui-check-layout');
  });
});

describe('подключение и гейты (DoD)', () => {
  it("'ui-image' и 'ui-figure' в COMPONENTS showcase/build.mjs — CSS в dist/ui-core.min.css", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-image'[^\]]*\]/);
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-figure'[^\]]*\]/);
  });

  it('html-validate: правило irao/img-dimensions зарегистрировано и включено как error (AC: img без размеров — ошибка)', () => {
    const config = readFileSync(join(root, '.htmlvalidate.js'), 'utf8');
    expect(config).toContain("'irao/img-dimensions': ImgDimensions");
    expect(config).toMatch(/'irao\/img-dimensions':\s*'error'/);
  });

  it('строки-ожидания новых html-фикстур в tools/run-lint-cases.mjs', () => {
    const runner = readFileSync(join(root, 'tools', 'run-lint-cases.mjs'), 'utf8');
    expect(runner).toMatch(/file:\s*'html\/img-without-dimensions\.html'/);
    expect(runner).toMatch(/file:\s*'html\/img-dimensions-valid\.html'/);
    expect(runner).toContain("'irao/img-dimensions'");
  });

  it('README ui-image: чек-лист подготовки изображений (alt-виды, размеры, lazy, retina/srcset, Bitrix, fallback, complex)', () => {
    const readme = readFileSync(join(root, 'components', 'ui-image', 'README.md'), 'utf8');
    for (const keyword of [
      'alt=""',
      'aria-describedby',
      'loading="lazy"',
      'width/height',
      'srcset',
      'Retina',
      'Bitrix',
      'fallback',
    ]) {
      expect(readme, keyword).toContain(keyword);
    }
  });

  it('README ui-figure: семантика figure/figcaption (подпись связана с изображением)', () => {
    const readme = readFileSync(join(root, 'components', 'ui-figure', 'README.md'), 'utf8');
    expect(readme).toContain('<figure');
    expect(readme).toContain('figcaption');
    expect(readme).toContain('ui-figure__caption');
  });
});

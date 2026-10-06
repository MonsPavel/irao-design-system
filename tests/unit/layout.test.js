/**
 * Юнит-пин layout-примитивов (задача T3.4; Testing requirements).
 *
 * Поверхность браузера — overflow на 320/375/768/1024/1440, computed-колонки
 * по вьюпортам, токены контейнера/секции/сеток, axe, эталоны на 4 вьюпортах —
 * в tests/e2e/layout.spec.js; здесь — пины исполняемой формы решения:
 *  - base/layout.css: все размеры ТОЛЬКО из токенов (Implementation
 *    requirements T3.4 п.1); box-sizing на корнях блоков (ADR-0002);
 *    minmax(0, 1fr) в каждой колонке (Technical considerations);
 *    mobile-first: media только min-width из шкалы T2.5;
 *  - лестница колонок спеки: 1 (mobile) → 2 (md) → N (lg); --4: 3 (xl) →
 *    4 (2xl);
 *  - запрет фиксированных высот (Scope T3.4); порядок чтения = порядок DOM
 *    (свойство order не используется — Accessibility requirements);
 *  - стенд layout в полигоне (Definition of Done: стенд layout-примитивов);
 *  - xl-вьюпорт харнесса — 4-й вьюпорт эталонов (AC 3).
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
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

/** Тела ВСЕХ правил внутри @media (min-width: Npx) одним куском (блоков
 * одной ширины в файле несколько — контейнер и сетка объявлены раздельно). */
const mediaBlocks = (css, px) => {
  let joined = '';
  for (const [, body] of css.matchAll(
    new RegExp(`@media \\(min-width: ${px}px\\) \\{([\\s\\S]*?)\\n\\}`, 'g'),
  )) {
    joined += `\n${body}`;
  }
  return joined;
};

describe('base/layout.css — контейнер (Scope T3.4)', () => {
  const css = stripCssComments(readFileSync(join(root, 'base', 'layout.css'), 'utf8'));

  it('файл существует (входит в ui-core — сборка не предупреждает о пропуске)', () => {
    expect(existsSync(join(root, 'base', 'layout.css'))).toBe(true);
  });

  it('.ui-container: box-sizing (ADR-0002), max-width/margin/padding — из токенов', () => {
    const block = blockOf(css, '.ui-container');
    expect(block, 'правило .ui-container найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('max-width: var(--ui-container-max);');
    expect(block).toContain('margin: 0 auto;');
    expect(block).toContain('padding: 0 var(--ui-container-pad);');
  });

  it('рост паддинга по шкале: 24 в md (768), 32 в lg (1024) — mobile-first', () => {
    const md = mediaBlocks(css, 768);
    const lg = mediaBlocks(css, 1024);
    expect(md, '@media (min-width: 768px) найден').toBeTruthy();
    expect(md).toContain('padding: 0 var(--ui-container-pad-md);');
    expect(lg, '@media (min-width: 1024px) найден').toBeTruthy();
    expect(lg).toContain('padding: 0 var(--ui-container-pad-lg);');
  });
});

describe('base/layout.css — секция (Scope T3.4)', () => {
  const css = stripCssComments(readFileSync(join(root, 'base', 'layout.css'), 'utf8'));

  it('.ui-section: box-sizing, вертикальный ритм из spacing-токенов (32 → 48 на lg)', () => {
    const block = blockOf(css, '.ui-section');
    expect(block, 'правило .ui-section найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('padding: var(--ui-space-6) 0;');
    const lg = mediaBlocks(css, 1024);
    expect(lg).toContain('.ui-section');
    expect(lg).toContain('padding: var(--ui-space-7) 0;');
  });

  it('.ui-section--muted: фон surface-muted + радиус big (перенос .section--gray)', () => {
    const block = blockOf(css, '.ui-section--muted');
    expect(block, 'правило .ui-section--muted найдено').toBeTruthy();
    expect(block).toContain('background-color: var(--ui-color-surface-muted);');
    expect(block).toContain('border-radius: var(--ui-radius-lg);');
  });
});

describe('base/layout.css — сетка (Scope T3.4)', () => {
  const css = stripCssComments(readFileSync(join(root, 'base', 'layout.css'), 'utf8'));

  it('.ui-grid: box-sizing, grid, gap из шкалы, база — 1 колонка (mobile)', () => {
    const block = blockOf(css, '.ui-grid');
    expect(block, 'правило .ui-grid найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: grid;');
    expect(block).toContain('gap: var(--ui-space-5);');
    expect(block).toContain('grid-template-columns: minmax(0, 1fr);');
  });

  it('minmax(0, 1fr) в КАЖДОЙ grid-template-columns файла (защита от длинного слова)', () => {
    for (const [, declaration] of css.matchAll(/grid-template-columns:\s*([^;]+);/g)) {
      expect(declaration, `колонки через minmax: ${declaration.trim()}`).toContain(
        'minmax(0, 1fr)',
      );
    }
  });

  it('md (768): все сетки — 2 колонки; lg (1024): --2 — 2, --3 — 3', () => {
    const md = mediaBlocks(css, 768);
    expect(md).toContain('.ui-grid--2');
    expect(md).toContain('.ui-grid--3');
    expect(md).toContain('.ui-grid--4');
    expect(md).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');

    const lg = mediaBlocks(css, 1024);
    expect(lg).toContain('.ui-grid--2');
    expect(lg).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(lg).toContain('.ui-grid--3');
    expect(lg).toContain('grid-template-columns: repeat(3, minmax(0, 1fr));');
  });

  it('--4: 3 колонки на xl (1280), 4 на 2xl (1440) — лестница Implementation requirements п.2', () => {
    const xl = mediaBlocks(css, 1280);
    expect(xl, '@media (min-width: 1280px) найден').toBeTruthy();
    expect(xl).toContain('.ui-grid--4');
    expect(xl).toContain('grid-template-columns: repeat(3, minmax(0, 1fr));');

    const xxl = mediaBlocks(css, 1440);
    expect(xxl, '@media (min-width: 1440px) найден').toBeTruthy();
    expect(xxl).toContain('.ui-grid--4');
    expect(xxl).toContain('grid-template-columns: repeat(4, minmax(0, 1fr));');
  });

  it('gap: рост до --ui-space-6 на lg; --4 плотнее (--ui-space-5) — правило ПОСЛЕ media (порядок источника)', () => {
    const lg = mediaBlocks(css, 1024);
    expect(lg).toContain('gap: var(--ui-space-6);');

    const gap4 = css.indexOf('.ui-grid--4');
    const gapMedia = css.indexOf('@media (min-width: 1024px)');
    expect(gap4, 'правило .ui-grid--4 объявлено в файле').toBeGreaterThan(-1);
    expect(
      gap4,
      '.ui-grid--4 (gap 24) после lg-media: равная специфичность, побеждает порядок источника',
    ).toBeGreaterThan(gapMedia);
    expect(blockOf(css, '.ui-grid--4')).toContain('gap: var(--ui-space-5);');
  });
});

describe('base/layout.css — инварианты системы (Scope T3.4)', () => {
  const css = stripCssComments(readFileSync(join(root, 'base', 'layout.css'), 'utf8'));

  it('запрет фиксированных высот: ни height, ни min-height (Scope T3.4)', () => {
    expect(css).not.toMatch(/(?:^|\n)\s*(?:min-)?height:\s/);
  });

  it('порядок чтения = порядок DOM: свойство order не используется (Accessibility requirements)', () => {
    expect(css).not.toMatch(/(?:^|\n)\s*order:\s/);
  });

  it('media — только min-width из шкалы T2.5 {768, 1024, 1280, 1440}', () => {
    const used = [...css.matchAll(/@media \(min-width: (\d+)px\)/g)].map((m) => Number(m[1]));
    expect(used.length, 'каждый media — один запрос из шкалы').toBeGreaterThan(0);
    for (const px of used) {
      expect([768, 1024, 1280, 1440], `min-width: ${px}px — из шкалы T2.5`).toContain(px);
    }
  });

  it('никаких !important (инвариант системы) и никакого hex — только токены', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

describe('стенд layout (Definition of Done T3.4: стенд layout-примитивов)', () => {
  const stand = readFileSync(join(root, 'showcase', 'pages', 'layout', 'index.html'), 'utf8');

  it('контейнер, секции (в т.ч. --muted) и сетки --2/--3/--4 представлены образцами', () => {
    expect(stand).toMatch(/class="[^"]*\bui-container\b[^"]*"/);
    expect(stand).toMatch(/<section[^>]*class="[^"]*\bui-section\b[^"]*"/);
    expect(stand).toMatch(/class="[^"]*\bui-section--muted\b[^"]*"/);
    for (const modifier of [2, 3, 4]) {
      expect(stand).toMatch(new RegExp(`class="[^"]*\\bui-grid--${modifier}\\b[^"]*"`));
    }
  });

  it('длинное RU-слово в ячейке сетки — образец защиты minmax(0, 1fr)', () => {
    expect(stand).toMatch(/сельскохозяйственный/i);
  });

  it('сборка: стенд layout в полигоне showcase', () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toContain("'layout'");
    expect(build).toMatch(/stands['",\s]+['"]layout\.html/);
  });
});

describe('харнесс: 4 вьюпорта эталонов (AC 3 T3.4)', () => {
  it('VIEWPORTS содержит xl 1280 — различает ступени 3/4 колонок сетки --4', () => {
    const harness = readFileSync(join(root, 'tests', 'helpers', 'harness.js'), 'utf8');
    expect(harness).toMatch(/xl:\s*Object\.freeze\(\{\s*width:\s*1280/);
  });
});

describe('e2e-сценарии записаны (Testing requirements T3.4)', () => {
  const spec = readFileSync(join(root, 'tests', 'e2e', 'layout.spec.js'), 'utf8');

  it('tests/e2e/layout.spec.js проверяет overflow и computed-колонки', () => {
    expect(spec).toContain('scrollWidth');
    expect(spec).toContain('gridTemplateColumns');
  });
});

describe('шкала вьюпортов скриншотов — дока ↔ код (ревью T3.4: рассинхрон)', () => {
  // T3.4 добавил xl 1280 в VIEWPORTS — живые упоминания шкалы скриншотов
  // обязаны показывать четырёхвьюпортную шкалу. Пинется текст влитую:
  // «375/768/1280/1440» и отсутствие оборота «три/трёх вьюпорта(х)».
  // Исторические справки (harness.js: «T1.4: 375/768/1440; T3.4 добавил…»)
  // и упоминания ручной приёмки стендов (CONTRIBUTING, showcase/README,
  // 02-architecture:412, responsive-approach:74 — критические вьюпорты
  // ручной проверки) и замороженные файлы задач пином не накрываются.
  const LIVE_SCALE_FILES = [
    'tests/README.md', // шаблон компонентных тестов + пример названия теста
    'tests/visual/README.md', // шапка каталога эталонов
    'tests/e2e/README.md', // чек-лист T2.6: visual-эталоны
    'tests/e2e/typography.spec.js', // шапка + названия тестов
    'tests/e2e/showcase-index.spec.js', // шапка
    'tests/helpers/harness.js', // докстринг shot()
    'docs/02-architecture.md', // §9: строка visual regression
    'base/README.md', // поверхность e2e typography
    'base/typography.css', // шапка: поверхность браузера
    'showcase/build.mjs', // комментарий стенда typography
  ];

  it.each(LIVE_SCALE_FILES)('%s: шкала скриншотов названа как 375/768/1280/1440', (rel) => {
    const text = readFileSync(join(root, ...rel.split('/')), 'utf8');
    expect(text, `${rel}: четырёхвьюпортная шкала не названа`).toContain('375/768/1280/1440');
    expect(text, `${rel}: оборот «три/трёх вьюпорта(х)» не вычищен`).not.toMatch(
      /три вьюпорта|трёх вьюпорт/,
    );
  });

  it('источник истины VIEWPORTS — ровно 375/768/1280/1440', () => {
    const harness = readFileSync(join(root, 'tests', 'helpers', 'harness.js'), 'utf8');
    const widths = [...harness.matchAll(/width:\s*(\d+)/g)].map((m) => Number(m[1]));
    expect(widths, 'шкала VIEWPORTS в harness.js').toEqual([375, 768, 1280, 1440]);
  });
});

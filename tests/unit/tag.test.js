/**
 * Юнит-пин ui-tag (задача T4.3; Testing requirements).
 *
 * Поверхность браузера — матрица вариантов, точка-маркер __icon, контраст,
 * axe и эталоны — в tests/e2e/ui-tag.spec.js; здесь — пины исполняемой формы
 * решения:
 *  - tokens/semantic.css: пара --ui-color-tag-blue-bg (career-portal .tag--blue
 *    components.css:108 — bg --color-surface-blue-100; последняя из пяти пар
 *    тегов, ранее прямая ссылка на примитив в pairs.config.mjs) и геометрия
 *    одобренного .tag: высота 28px, gap 6px, letter-spacing 0.02em
 *    (Implementation requirements п.1/п.3: «все значения из токенов»);
 *  - components/ui-tag/ui-tag.css: box-sizing на корне (ADR-0002); цвета —
 *    только токены слоя 2; min-height вместо height (прецедент T4.2: 32px-база
 *    T3.6 растит тег вместе с текстом); тройка micro + fw-caption (career-
 *    portal components.css:104–105: font-size 12px, font-weight --fw-caption);
 *    точка-маркер __icon — наследие media__tag-dot (8px, круг) на currentColor;
 *  - инварианты системы: без !important, без hex, без фиксированных (px/rem)
 *    высот — min-height только из токенов;
 *  - канонический паттерн: тег — декоративная аннотация (не интерактивен,
 *    Technical considerations), иконка aria-hidden; без inline-стилей
 *    (VI-инвариант §5);
 *  - стенд showcase/pages/ui-tag: матрица все варианты + badge-секция,
 *    без data-ui-check-layout (гейт масштабирования T3.6 не расширяется без
 *    решения по CHECK_STANDS — пин синхронности tests/unit/scaling.test.js);
 *  - 'ui-tag' в COMPONENTS — CSS попадает в dist/ui-core.min.css;
 *  - пара tag-blue в tests/contrast/pairs.config.mjs — семантическими
 *    токенами (гейт T2.3: новый цветовой токен слоя 2 обязан быть в паре);
 *  - README компонента: тег не интерактивен (do/don't), чипы фильтров —
 *    T8.1, VI-перекраска — T9.1.
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

describe('tokens/semantic.css — тег-токены (Implementation requirements T4.3 п.1/п.3)', () => {
  const source = readFileSync(join(root, 'tokens', 'semantic.css'), 'utf8');

  it('пара tag-blue: --ui-color-tag-blue-bg = var(--ui-blue-100) (career-portal components.css:108)', () => {
    // .tag--blue { background: var(--color-surface-blue-100); color: var(--color-primary); }
    expect(source).toMatch(/--ui-color-tag-blue-bg:\s*var\(--ui-blue-100\);/);
  });

  it('высота тега — токен 1.75rem (28px career-portal components.css:99)', () => {
    expect(source).toMatch(/--ui-tag-height:\s*1\.75rem;/);
  });

  it('gap тега — токен 0.375rem (6px career-portal components.css:100, не на шкале §3.2 — перенос «как есть»)', () => {
    expect(source).toMatch(/--ui-tag-gap:\s*0\.375rem;/);
  });

  it('letter-spacing тега — токен 0.02em (career-portal components.css:105; em — от размера роли)', () => {
    expect(source).toMatch(/--ui-tag-letter-spacing:\s*0\.02em;/);
  });
});

describe('components/ui-tag/ui-tag.css — база (Implementation requirements T4.3 п.3, ADR-0002)', () => {
  const path = join(root, 'components', 'ui-tag', 'ui-tag.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define tag — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define tag */')).toBe(true);
  });

  it('.ui-tag: box-sizing на корне; высота, gap, паддинги, радиус — токены; min-height вместо height', () => {
    const block = blockOf(css, '.ui-tag');
    expect(block, 'правило .ui-tag найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: inline-flex;');
    expect(block).toContain('gap: var(--ui-tag-gap);');
    expect(block).toContain('align-items: center;');
    expect(block).toContain('min-height: var(--ui-tag-height);');
    expect(block).toContain('padding: var(--ui-space-1) var(--ui-space-3);');
    expect(block).toContain('border-radius: var(--ui-radius-pill);');
    // Прецедент T4.2: min-height (32px-база T3.6 растит компонент вместе с
    // текстом); фиксированный height запрещён.
    expect(block).not.toMatch(/(?:^|\n)\s*height:\s*var\(--ui-tag-height\);/);
  });

  it('база без модификатора «тихая»: прозрачный фон, цвет текста (прецедент базы ui-button)', () => {
    const block = blockOf(css, '.ui-tag');
    expect(block).toContain('background-color: transparent;');
    expect(block).toContain('color: var(--ui-color-text);');
  });

  it('шрифтовая тройка одобренного .tag — fs-micro × fw-caption (career-portal components.css:104–105)', () => {
    const block = blockOf(css, '.ui-tag');
    expect(block).toContain('font-size: var(--ui-fs-micro);');
    expect(block).toContain('font-weight: var(--ui-fw-caption);');
    expect(block).toContain('line-height: var(--ui-lh-micro);');
    expect(block).toContain('letter-spacing: var(--ui-tag-letter-spacing);');
  });

  it('инварианты системы: без !important и hex (vi-перекраска, ADR-0002)', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('фиксированных (px/rem) высот нет — min-height только из токенов (32px-база T3.6)', () => {
    expect(css).not.toMatch(/(?:^|\n)\s*(?:min-)?height:\s*[\d.]+(?:px|rem|pt)/);
  });
});

describe('components/ui-tag/ui-tag.css — варианты (Scope T4.3: blue/orange/green/gray/navy)', () => {
  const css = stripCssComments(
    readFileSync(join(root, 'components', 'ui-tag', 'ui-tag.css'), 'utf8'),
  );

  it('blue: пара tag-blue-bg/primary (career-portal components.css:108)', () => {
    const block = blockOf(css, '.ui-tag--blue');
    expect(block).toContain('background-color: var(--ui-color-tag-blue-bg);');
    expect(block).toContain('color: var(--ui-color-primary);');
  });

  it('orange: пара tag-orange-bg/tag-orange-text (career-portal components.css:109)', () => {
    const block = blockOf(css, '.ui-tag--orange');
    expect(block).toContain('background-color: var(--ui-color-tag-orange-bg);');
    expect(block).toContain('color: var(--ui-color-tag-orange-text);');
  });

  it('green: пара tag-green-bg/tag-green-text (career-portal components.css:110)', () => {
    const block = blockOf(css, '.ui-tag--green');
    expect(block).toContain('background-color: var(--ui-color-tag-green-bg);');
    expect(block).toContain('color: var(--ui-color-tag-green-text);');
  });

  it('gray: пара tag-gray-bg/text-muted (career-portal components.css:111 — цвет muted)', () => {
    const block = blockOf(css, '.ui-tag--gray');
    expect(block).toContain('background-color: var(--ui-color-tag-gray-bg);');
    expect(block).toContain('color: var(--ui-color-text-muted);');
  });

  it('navy: пара primary/text-on-dark (career-portal components.css:112)', () => {
    const block = blockOf(css, '.ui-tag--navy');
    expect(block).toContain('background-color: var(--ui-color-primary);');
    expect(block).toContain('color: var(--ui-color-text-on-dark);');
  });
});

describe('components/ui-tag/ui-tag.css — слот __icon (наследие media__tag-dot)', () => {
  const css = stripCssComments(
    readFileSync(join(root, 'components', 'ui-tag', 'ui-tag.css'), 'utf8'),
  );

  it('точка-маркер: 8px из шкалы (--ui-space-2), круг (pill в квадрате), красится currentColor варианта', () => {
    const block = blockOf(css, '.ui-tag__icon');
    expect(block, 'правило .ui-tag__icon найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('width: var(--ui-space-2);');
    expect(block).toContain('height: var(--ui-space-2);');
    expect(block).toContain('border-radius: var(--ui-radius-pill);');
    expect(block).toContain('background-color: currentColor;');
  });
});

describe('канонический паттерн (components/ui-tag/ui-tag.html)', () => {
  const html = readFileSync(join(root, 'components', 'ui-tag', 'ui-tag.html'), 'utf8');

  it('все пять вариантов в паттерне: blue/orange/green/gray/navy', () => {
    for (const variant of ['blue', 'orange', 'green', 'gray', 'navy']) {
      expect(html, `вариант ${variant}`).toContain(`ui-tag--${variant}`);
    }
  });

  it('точка-маркер __icon — декоративная (aria-hidden)', () => {
    const iconTags = [...html.matchAll(/<span[^>]*class="[^"]*ui-tag__icon[^"]*"[^>]*>/g)].map(
      ([tag]) => tag,
    );
    expect(iconTags.length, 'иконка в паттерне есть').toBeGreaterThan(0);
    for (const tag of iconTags) {
      expect(tag, 'иконка скрыта от скринридера').toContain('aria-hidden="true"');
    }
  });

  it('без inline-стилей (VI-инвариант §5)', () => {
    expect(html, 'inline-стили в паттерне запрещены').not.toMatch(/<span[^>]*style=/);
  });
});

describe('стенд (showcase/pages/ui-tag/index.html)', () => {
  const html = readFileSync(join(root, 'showcase', 'pages', 'ui-tag', 'index.html'), 'utf8');

  it('стенд существует и показывает матрицу: база + пять вариантов + иконка', () => {
    expect(html).toContain('id="ui-tag-default"');
    for (const variant of ['blue', 'orange', 'green', 'gray', 'navy']) {
      expect(html, `вариант ${variant}`).toContain(`id="ui-tag-${variant}"`);
    }
    expect(html).toContain('id="ui-tag-blue-icon"');
  });

  it('badge-секция на стенде (AC: «стенд всех вариантов tag + badge»)', () => {
    for (const id of [
      'ui-badge-digit',
      'ui-badge-overflow',
      'ui-badge-zero-hidden',
      'ui-badge-link-duplicated',
      'ui-badge-link-named',
    ]) {
      expect(html, id).toContain(`id="${id}"`);
    }
  });

  it('без data-ui-check-layout — гейт T3.6 не расширяется без записи в CHECK_STANDS', () => {
    expect(html).not.toContain('data-ui-check-layout');
  });
});

describe('подключение и гейты (DoD)', () => {
  it("'ui-tag' в COMPONENTS showcase/build.mjs — CSS в dist/ui-core.min.css", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-tag'[^\]]*\]/);
  });

  it('пара tag-blue в pairs.config.mjs — семантическими токенами (гейт T2.3: без прямых ссылок на примитивы)', () => {
    const config = readFileSync(join(root, 'tests', 'contrast', 'pairs.config.mjs'), 'utf8');
    const pair = config.match(/\{\s*id:\s*'tag-blue'[\s\S]*?\}/);
    expect(pair, 'пара tag-blue найдена').toBeTruthy();
    expect(pair[0]).toContain("fg: '--ui-color-primary'");
    expect(pair[0]).toContain("bg: '--ui-color-tag-blue-bg'");
    expect(pair[0], 'прямая ссылка на примитив заменена семантической парой').not.toContain(
      "'--ui-blue-100'",
    );
  });

  it("README компонента: тег не интерактивен (do/don't), чипы фильтров — T8.1, VI — T9.1", () => {
    const readme = readFileSync(join(root, 'components', 'ui-tag', 'README.md'), 'utf8');
    expect(readme).toMatch(/не интерактивен/i);
    expect(readme).toContain('T8.1');
    expect(readme).toContain('T9.1');
    expect(readme).toContain('ui-button');
  });
});

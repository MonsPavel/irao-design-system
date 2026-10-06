/**
 * Юнит-пин ui-link (задача T4.1; Testing requirements).
 *
 * Поверхность браузера — computed-состояния (color/underline по варианту),
 * focus-visible, контраст ≥ 4.5:1 (сквозной с T2.3), axe и эталоны — в
 * tests/e2e/ui-link.spec.js; здесь — пины исполняемой формы решения:
 *  - tokens/semantic.css: геометрия подчёркивания — токены (Technical
 *    considerations T4.1: «text-decoration-thickness/offset из токенов»), em —
 *    масштабируется с ролью текста (32px-база T3.6 делает линию толще);
 *  - components/ui-link/ui-link.css: box-sizing на корне (ADR-0002); цвета —
 *    только токены слоя 2 (Implementation requirements п.1: link-токены не
 *    заводились — различие двум сайтам не понадобилось); hover — color-mix
 *    88% + black (конвенция T2.6/ADR-0010) ТОЛЬКО под @media (hover: hover)
 *    (EPIC-4: sticky-hover на таче); hover пары кнопочного варианта —
 *    одобренный дизайн var(--ui-color-primary-hover); :visited — только цвет
 *    (приватность истории, Technical considerations); порядок LVHA
 *    (:visited → :hover → :active — иначе hover не виден на visited);
 *  - инварианты системы: без !important, без hex, без фиксированных высот;
 *  - канонический паттерн: варианты, ui-link__icon (svg currentColor,
 *    aria-hidden), внешняя — target="_blank" rel="noopener", icon-only —
 *    aria-label (Implementation requirements п.3);
 *  - стенд showcase/pages/ui-link: варианты × состояния, без
 *    data-ui-check-layout (гейт масштабирования T3.6 не расширяется без
 *    решения по CHECK_STANDS — пин синхронности tests/unit/scaling.test.js);
 *  - 'ui-link' в COMPONENTS — CSS попадает в dist/ui-core.min.css;
 *  - html-validate-гейты T4.1 зарегистрированы (AC: внешняя без
 *    rel="noopener" — ошибка; icon-only — предупреждение), негативные
 *    фикстуры — в EXPECTATIONS tools/run-lint-cases.mjs;
 *  - README компонента с do/don't «ссылка vs кнопка» (AC).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..', '..');

/** CSS без комментариев: пины смотрят на исполняемый код, а не на прозу шапки.
 *  Рабочая копия Windows (core.autocrlf) отдаёт CRLF, а пины многострочных
 *  toContain сравнивают с \n: нормализуем концы строк (CI/контейнер — LF).
 *  Сопутствующая правка T4.2: на CRLF-хосте весь suite был красным. */
const stripCssComments = (css) =>
  css.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '');

/** Тело правила по селектору (начало строки — селектор, до закрывающей скобки).
 *  \s* перед селектором — правила внутри @media идут с отступом. */
const blockOf = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
};

/** Декларации тела правила: массив строк «свойство: значение». */
const declarationsOf = (block) =>
  block
    .split(';')
    .map((line) => line.trim())
    .filter(Boolean);

describe('tokens/semantic.css — геометрия подчёркивания (Technical considerations T4.1)', () => {
  const source = readFileSync(join(root, 'tokens', 'semantic.css'), 'utf8');

  it('токены --ui-link-underline-thickness/offset существуют, значения в em (масштабируются с ролью)', () => {
    expect(source).toMatch(/--ui-link-underline-thickness:\s*0\.0625em;/);
    expect(source).toMatch(/--ui-link-underline-offset:\s*0\.1875em;/);
  });
});

describe('components/ui-link/ui-link.css — база (Implementation requirements п.1–2)', () => {
  const path = join(root, 'components', 'ui-link', 'ui-link.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define link — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define link */')).toBe(true);
  });

  it('.ui-link: box-sizing на корне (ADR-0002); цвет и подчёркивание — только токены', () => {
    const block = blockOf(css, '.ui-link');
    expect(block, 'правило .ui-link найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('color: var(--ui-color-primary);');
    expect(block).toContain('text-decoration: underline;');
    expect(block).toContain('text-decoration-thickness: var(--ui-link-underline-thickness);');
    expect(block).toContain('text-underline-offset: var(--ui-link-underline-offset);');
  });

  it('default различим без цвета (подчёркивание всегда, WCAG 1.4.1) — бренд зафиксирован', () => {
    // Спека T4.1: «подчёркнутая при hover/всегда — фиксируется по бренду».
    // Fixировано «всегда»: underline объявлен в базе .ui-link, а не в hover.
    const block = blockOf(css, '.ui-link');
    expect(block).toContain('text-decoration: underline;');
  });

  it('инварианты системы: без !important и hex (vi-перекраска, ADR-0002)', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('фиксированных (px/rem) высот нет (32px-база T3.6); em-геометрия иконки легальна', () => {
    expect(css).not.toMatch(/(?:^|\n)\s*(?:min-)?height:\s*[\d.]+(?:px|rem|pt)/);
  });
});

describe('components/ui-link/ui-link.css — производные состояния (T2.6, ADR-0010)', () => {
  const css = stripCssComments(
    readFileSync(join(root, 'components', 'ui-link', 'ui-link.css'), 'utf8'),
  );

  it('все :hover-правила — ТОЛЬКО внутри @media (hover: hover) (EPIC-4: sticky-hover на таче)', () => {
    const mediaIndex = css.indexOf('@media (hover: hover)');
    expect(mediaIndex, 'media-обёртка hover присутствует').toBeGreaterThan(-1);
    const beforeMedia = css.slice(0, mediaIndex);
    expect(beforeMedia, 'до media-обёртки :hover-селекторов нет').not.toContain(':hover');
    const mediaBlock = css.slice(mediaIndex);
    expect(mediaBlock).toContain('.ui-link:hover');
    expect(mediaBlock).toContain('.ui-link--on-dark:hover');
    expect(mediaBlock).toContain('.ui-link--button:hover');
  });

  it('hover default/on-dark — color-mix 88% + black над токеном слоя 2 (конвенция ADR-0010)', () => {
    const mediaBlock = css.slice(css.indexOf('@media (hover: hover)'));
    expect(mediaBlock).toContain(
      '.ui-link:hover {\n    color: color-mix(in srgb, var(--ui-color-primary) 88%, black);',
    );
    expect(mediaBlock).toContain(
      '.ui-link--on-dark:hover {\n    color: color-mix(in srgb, var(--ui-color-text-on-dark) 88%, black);',
    );
  });

  it('hover кнопочного варианта — пара одобренного дизайна var(--ui-color-primary-hover), не color-mix', () => {
    const mediaBlock = css.slice(css.indexOf('@media (hover: hover)'));
    const block = blockOf(mediaBlock, '.ui-link--button:hover');
    expect(block).toContain('background-color: var(--ui-color-primary-hover);');
    // Подпись переобъявлена: иначе просачивается color-mix из .ui-link:hover —
    // тёмный текст на blue-700 = 1.78:1 (поймано e2e-контрастом T4.1).
    expect(block).toContain('color: var(--ui-color-text-on-dark);');
  });

  it('active — color-mix 88% + black (одобренным дизайном active не задан); подпись кнопки остаётся белой', () => {
    expect(css).toContain(
      '.ui-link:active {\n  color: color-mix(in srgb, var(--ui-color-primary) 88%, black);',
    );
    expect(css).toContain(
      '.ui-link--on-dark:active {\n  color: color-mix(in srgb, var(--ui-color-text-on-dark) 88%, black);',
    );
    const buttonActive = blockOf(css, '.ui-link--button:active');
    expect(buttonActive).toContain(
      'background-color: color-mix(in srgb, var(--ui-color-primary) 88%, black);',
    );
    expect(buttonActive, 'подпись против просачивания .ui-link:active').toContain(
      'color: var(--ui-color-text-on-dark);',
    );
  });
});

describe('components/ui-link/ui-link.css — :visited и порядок LVHA (Technical considerations T4.1)', () => {
  const css = stripCssComments(
    readFileSync(join(root, 'components', 'ui-link', 'ui-link.css'), 'utf8'),
  );

  it(':visited стилизован минимально — ровно одно объявление color (приватность истории)', () => {
    for (const selector of [
      '.ui-link:visited',
      '.ui-link--on-dark:visited',
      '.ui-link--button:visited',
    ]) {
      const block = blockOf(css, selector);
      expect(block, `правило ${selector} найдено`).toBeTruthy();
      const declarations = declarationsOf(block);
      expect(declarations.length, `${selector}: только color`).toBe(1);
      expect(declarations[0]).toMatch(/^color:\s*var\(--ui-[a-z0-9-]+\)$/);
    }
  });

  it('visited-цвета: default — text-muted, on-dark/button — text-on-dark(-muted)/text-on-dark', () => {
    expect(blockOf(css, '.ui-link:visited')).toContain('color: var(--ui-color-text-muted);');
    expect(blockOf(css, '.ui-link--on-dark:visited')).toContain(
      'color: var(--ui-color-text-on-dark-muted);',
    );
    expect(blockOf(css, '.ui-link--button:visited')).toContain(
      'color: var(--ui-color-text-on-dark);',
    );
  });

  it('порядок правил LVHA: :visited → :hover → :active (иначе hover не виден на visited)', () => {
    const firstVisited = css.indexOf(':visited');
    const firstHover = css.indexOf('@media (hover: hover)');
    const firstActive = css.indexOf(':active');
    expect(firstVisited, 'visited раньше hover').toBeLessThan(firstHover);
    expect(firstHover, 'hover раньше active').toBeLessThan(firstActive);
  });
});

describe('components/ui-link/ui-link.css — варианты (Scope T4.1)', () => {
  const css = stripCssComments(
    readFileSync(join(root, 'components', 'ui-link', 'ui-link.css'), 'utf8'),
  );

  it('ui-link--on-dark: пара text-on-dark; visited — text-on-dark-muted', () => {
    const block = blockOf(css, '.ui-link--on-dark');
    expect(block).toContain('color: var(--ui-color-text-on-dark);');
  });

  it('ui-link--button: визуально кнопка из одобренного дизайна, семантика ссылки', () => {
    const block = blockOf(css, '.ui-link--button');
    expect(block).toContain('display: inline-flex;');
    expect(block).toContain('padding: var(--ui-space-3) var(--ui-space-5);');
    expect(block).toContain('border-radius: var(--ui-radius-pill);');
    expect(block).toContain('background-color: var(--ui-color-primary);');
    expect(block).toContain('color: var(--ui-color-text-on-dark);');
    expect(block).toContain('font-size: var(--ui-fs-small);');
    expect(block).toContain('font-weight: var(--ui-fw-small);');
    expect(block, 'кнопочный вид без подчёркивания').toContain('text-decoration: none;');
  });

  it('ui-link__icon: геометрия от шрифта (1em), без своего цвета — currentColor из разметки', () => {
    const block = blockOf(css, '.ui-link__icon');
    expect(block, 'правило .ui-link__icon найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('width: 1em;');
    expect(block).toContain('height: 1em;');
    expect(block).toContain('vertical-align: -0.125em;');
    expect(block, 'цвет иконке задаёт currentColor в svg, не CSS-цвет').not.toMatch(
      /(?:^|\n)\s*(?:fill|stroke|color):/,
    );
  });
});

describe('канонический паттерн (components/ui-link/ui-link.html)', () => {
  const html = readFileSync(join(root, 'components', 'ui-link', 'ui-link.html'), 'utf8');

  it('варианты в паттерне: default и --button; --on-dark — на стенде (тёмный фон — контекст секции сайта, не компонента)', () => {
    expect(html).toContain('class="ui-link"');
    expect(html).toContain('class="ui-link ui-link--button"');
    // Паттерн без inline-стилей (VI-инвариант §5), тёмной секции в системе
    // ещё нет (layout — T3.4, только --muted): on-dark демонстрирует стенд
    // своей каркасной обвязкой.
    expect(html, 'inline-стили в паттерне запрещены').not.toMatch(/<a[^>]*style=/);
  });

  it('внешняя ссылка: target="_blank" только вместе с rel="noopener" (AC T4.1)', () => {
    expect(html).toMatch(/target="_blank"\s+rel="noopener"/);
    const blanks = [...html.matchAll(/<a[^>]*target="_blank"[^>]*>/g)];
    expect(blanks.length).toBeGreaterThan(0);
    for (const [tag] of blanks) expect(tag).toContain('rel="noopener"');
  });

  it('icon-only ссылка несёт aria-label (Implementation requirements п.3)', () => {
    expect(html).toMatch(/<a[^>]*aria-label="[^"]+"/);
  });

  it('ui-link__icon — svg с aria-hidden и currentColor (порядок атрибутов не пинится)', () => {
    // prettier разбивает теги на строки — матчим по одному тегу <svg …>.
    const svgTags = [...html.matchAll(/<svg[\s\S]*?>/g)].map(([tag]) => tag);
    const iconTags = svgTags.filter((tag) => tag.includes('class="ui-link__icon"'));
    expect(iconTags.length, 'иконки в паттерне есть').toBeGreaterThan(0);
    for (const tag of iconTags) {
      expect(tag, 'иконка скрыта от скринридера').toContain('aria-hidden="true"');
    }
    expect(html, 'currentColor в атрибутах иконки').toContain('currentColor');
  });
});

describe('стенд (showcase/pages/ui-link/index.html)', () => {
  const html = readFileSync(join(root, 'showcase', 'pages', 'ui-link', 'index.html'), 'utf8');

  it('стенд существует и показывает все варианты', () => {
    expect(html).toContain('class="ui-link"');
    expect(html).toContain('ui-link--on-dark');
    expect(html).toContain('ui-link--button');
    expect(html).toContain('ui-link__icon');
  });

  it('без data-ui-check-layout — гейт T3.6 не расширяется без записи в CHECK_STANDS', () => {
    expect(html).not.toContain('data-ui-check-layout');
  });
});

describe('подключение и гейты (DoD)', () => {
  it("'ui-link' в COMPONENTS showcase/build.mjs — CSS в dist/ui-core.min.css", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-link'[^\]]*\]/);
  });

  it('html-validate-гейты T4.1 зарегистрированы: noopener — error, имя — warn (AC)', () => {
    const config = readFileSync(join(root, '.htmlvalidate.js'), 'utf8');
    expect(config).toContain("'irao/link-external-noopener'");
    expect(config).toContain("'irao/link-accessible-name'");
    expect(config).toMatch(/'irao\/link-external-noopener':\s*'error'/);
    expect(config).toMatch(/'irao\/link-accessible-name':\s*'warn'/);
  });

  it('негативные фикстуры гейтов — в EXPECTATIONS tools/run-lint-cases.mjs', () => {
    const runner = readFileSync(join(root, 'tools', 'run-lint-cases.mjs'), 'utf8');
    expect(runner).toContain("file: 'html/link-external-noopener.html'");
    expect(runner).toContain("file: 'html/link-icon-only-without-name.html'");
    expect(runner).toContain("file: 'html/link-named.html'");
  });

  it("README компонента: do/don't «ссылка vs кнопка», правила внешних и icon-only ссылок (AC)", () => {
    const readme = readFileSync(join(root, 'components', 'ui-link', 'README.md'), 'utf8');
    expect(readme).toMatch(/Ссылка vs кнопка/i);
    expect(readme).toContain('noopener');
    expect(readme).toContain('aria-label');
  });

  it('e2e-сценарий записан и использует контраст-библиотеку T2.3 (сквозной AC)', () => {
    const spec = readFileSync(join(root, 'tests', 'e2e', 'ui-link.spec.js'), 'utf8');
    expect(spec).toContain("from '../contrast/lib.mjs'");
    expect(spec).toContain('focus-visible');
  });
});

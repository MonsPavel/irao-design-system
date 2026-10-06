/**
 * Юнит-пин ui-button (задача T4.2 — эталонный компонент; Testing requirements).
 *
 * Поверхность браузера — computed-состояния матрицы (варианты × размеры ×
 * состояния), hover/active, disabled/loading-поведение, клавиатура, контраст,
 * axe (включая сценарий T2.6 «кнопочная часть») и эталоны — в
 * tests/e2e/ui-button.spec.js; здесь — пины исполняемой формы решения:
 *  - tokens/semantic.css: высоты и рамка — токены (Implementation requirements
 *    п.1: «все значения из токенов»; md — из --ui-button-height, career-portal
 *    components.css:70; sm — новый, ступень шкалы §3.2); disabled — затемнение
 *    из токена (career-portal components.css:269 — единственный disabled-паттерн
 *    одобренного дизайна); hover-поверхность --ui-color-surface-hover —
 *    значение одобренного дизайна (ADR-0010 п.4: color-mix не воспроизводит);
 *  - components/ui-button/ui-button.css: box-sizing на корне (ADR-0002);
 *    цвета — только токены слоя 2; hover — под @media (hover: hover), пары
 *    одобренного дизайна + color-mix 88% + black для незаданных (T2.6/
 *    ADR-0010); disabled — атрибутный :disabled, правило ПОСЛЕ hover-блока;
 *    loading — is-loading в цепочке с блоком, спиннер на currentColor,
 *    лейбл визуально скрыт без display:none (accessible name сохраняется,
 *    Implementation requirements п.3);
 *  - инварианты системы: без !important, без hex, без фиксированных (px/rem)
 *    высот — min-height только из токенов (Technical considerations T4.2:
 *    min-height вместо height — совместимость с 32px-базой T3.6);
 *  - канонический паттерн: у каждого <button> явный type (Scope: семантика,
 *    html-validate warning); иконка svg currentColor aria-hidden;
 *  - стенд showcase/pages/ui-button: матрица варианты × размеры × состояния,
 *    без data-ui-check-layout (гейт масштабирования T3.6 не расширяется без
 *    решения по CHECK_STANDS — пин синхронности tests/unit/scaling.test.js);
 *  - 'ui-button' в COMPONENTS — CSS попадает в dist/ui-core.min.css;
 *  - html-validate-гейт типа: встроенное no-implicit-button-type переведено
 *    в warning (Severity спеки T4.2), негативная фикстура — в EXPECTATIONS
 *    tools/run-lint-cases.mjs;
 *  - README компонента с do/don't «действие → button, переход → ui-link»
 *    (Scope) и CONTRIBUTING-чек-лист новой компоненты (AC: заводится здесь,
 *    на эталоне).
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

describe('tokens/semantic.css — кнопочные токены (Implementation requirements T4.2 п.1)', () => {
  const source = readFileSync(join(root, 'tokens', 'semantic.css'), 'utf8');

  it('md: --ui-button-height = 3.25rem (52px career-portal components.css:70)', () => {
    expect(source).toMatch(/--ui-button-height:\s*3\.25rem;/);
  });

  it('sm: --ui-button-height-sm = 2rem (новый, ступень шкалы §3.2)', () => {
    expect(source).toMatch(/--ui-button-height-sm:\s*2rem;/);
  });

  it('рамка outline-варианта — токен (2px career-portal components.css:87 → 0.125rem)', () => {
    expect(source).toMatch(/--ui-button-border-width:\s*0\.125rem;/);
  });

  it('disabled: --ui-opacity-disabled = 0.3 (career-portal components.css:269)', () => {
    expect(source).toMatch(/--ui-opacity-disabled:\s*0\.3;/);
  });

  it('hover-поверхность: --ui-color-surface-hover = var(--ui-blue-100) — пара одобренного дизайна', () => {
    // career-portal --color-surface-blue-100 (btn--light:hover, components.css:93):
    // color-mix значение макета не воспроизводит (ADR-0010 п.4) — явный токен.
    expect(source).toMatch(/--ui-color-surface-hover:\s*var\(--ui-blue-100\);/);
  });
});

describe('components/ui-button/ui-button.css — база (Implementation requirements T4.2 п.1, ADR-0002)', () => {
  const path = join(root, 'components', 'ui-button', 'ui-button.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define button — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define button */')).toBe(true);
  });

  it('.ui-button: box-sizing на корне; высота, паддинги, радиус, рамка — токены', () => {
    const block = blockOf(css, '.ui-button');
    expect(block, 'правило .ui-button найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: inline-flex;');
    expect(block).toContain('min-height: var(--ui-button-height);');
    expect(block).toContain('padding: var(--ui-space-3) var(--ui-space-5);');
    expect(block).toContain('border: var(--ui-button-border-width) solid transparent;');
    expect(block).toContain('border-radius: var(--ui-radius-pill);');
    // Технические considerations: min-height вместо height (32px-база T3.6).
    expect(block).not.toMatch(/(?:^|\n)\s*height:\s*var\(--ui-button-height\);/);
  });

  it('шрифтовая тройка одобренного .btn — токены small; font-family задан (кнопка не наследует UA-шрифт)', () => {
    const block = blockOf(css, '.ui-button');
    expect(block).toContain('font-family: var(--ui-font-family);');
    expect(block).toContain('font-size: var(--ui-fs-small);');
    expect(block).toContain('font-weight: var(--ui-fw-small);');
    expect(block).toContain('line-height: var(--ui-lh-small);');
  });

  it('переход — токен --ui-transition (career-portal .btn: background/color/border-color)', () => {
    const block = blockOf(css, '.ui-button');
    expect(block).toContain(
      'transition: background-color var(--ui-transition), color var(--ui-transition), border-color var(--ui-transition);',
    );
  });

  it('инварианты системы: без !important и hex (vi-перекраска, ADR-0002)', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('фиксированных (px/rem) высот нет — min-height только из токенов (32px-база T3.6)', () => {
    expect(css).not.toMatch(/(?:^|\n)\s*(?:min-)?height:\s*[\d.]+(?:px|rem|pt)/);
  });
});

describe('components/ui-button/ui-button.css — варианты (Scope T4.2)', () => {
  const css = stripCssComments(
    readFileSync(join(root, 'components', 'ui-button', 'ui-button.css'), 'utf8'),
  );

  it('primary: пара primary/text-on-dark (career-portal .btn--primary)', () => {
    const block = blockOf(css, '.ui-button--primary');
    expect(block).toContain('background-color: var(--ui-color-primary);');
    expect(block).toContain('color: var(--ui-color-text-on-dark);');
  });

  it('accent: пара accent/text-on-dark (career-portal .btn--accent)', () => {
    const block = blockOf(css, '.ui-button--accent');
    expect(block).toContain('background-color: var(--ui-color-accent);');
    expect(block).toContain('color: var(--ui-color-text-on-dark);');
  });

  it('outline: прозрачный фон, рамка primary, текст primary (career-portal .btn--outline)', () => {
    const block = blockOf(css, '.ui-button--outline');
    expect(block).toContain('border-color: var(--ui-color-primary);');
    expect(block).toContain('background-color: transparent;');
    expect(block).toContain('color: var(--ui-color-primary);');
  });

  it('light: пара surface-muted/primary (career-portal .btn--light)', () => {
    const block = blockOf(css, '.ui-button--light');
    expect(block).toContain('background-color: var(--ui-color-surface-muted);');
    expect(block).toContain('color: var(--ui-color-primary);');
  });

  it('sm: высота из --ui-button-height-sm (Scope: размеры md/sm)', () => {
    const block = blockOf(css, '.ui-button--sm');
    expect(block).toContain('min-height: var(--ui-button-height-sm);');
  });
});

describe('components/ui-button/ui-button.css — производные состояния (T2.6, ADR-0010)', () => {
  const css = stripCssComments(
    readFileSync(join(root, 'components', 'ui-button', 'ui-button.css'), 'utf8'),
  );

  it('все :hover-правила — ТОЛЬКО внутри @media (hover: hover) (Implementation requirements п.4)', () => {
    const mediaIndex = css.indexOf('@media (hover: hover)');
    expect(mediaIndex, 'media-обёртка hover присутствует').toBeGreaterThan(-1);
    const beforeMedia = css.slice(0, mediaIndex);
    expect(beforeMedia, 'до media-обёртки :hover-селекторов нет').not.toContain(':hover');
    const mediaBlock = css.slice(mediaIndex);
    for (const selector of [
      '.ui-button:hover',
      '.ui-button--primary:hover',
      '.ui-button--accent:hover',
      '.ui-button--outline:hover',
      '.ui-button--light:hover',
    ]) {
      expect(mediaBlock).toContain(selector);
    }
  });

  it('hover primary/accent — пары одобренного дизайна, подпись переобъявлена (против просачивания)', () => {
    const mediaBlock = css.slice(css.indexOf('@media (hover: hover)'));
    const primary = blockOf(mediaBlock, '.ui-button--primary:hover');
    expect(primary).toContain('background-color: var(--ui-color-primary-hover);');
    expect(primary).toContain('color: var(--ui-color-text-on-dark);');
    const accent = blockOf(mediaBlock, '.ui-button--accent:hover');
    expect(accent).toContain('background-color: var(--ui-color-accent-hover);');
    expect(accent).toContain('color: var(--ui-color-text-on-dark);');
  });

  it('hover outline/light — значения одобренного дизайна (career-portal components.css:90/93)', () => {
    const mediaBlock = css.slice(css.indexOf('@media (hover: hover)'));
    const outline = blockOf(mediaBlock, '.ui-button--outline:hover');
    // .btn--outline:hover { background: var(--color-primary); color: #FFFFFF; }
    expect(outline).toContain('background-color: var(--ui-color-primary);');
    expect(outline).toContain('color: var(--ui-color-text-on-dark);');
    const light = blockOf(mediaBlock, '.ui-button--light:hover');
    // .btn--light:hover { background: var(--color-surface-blue-100); }
    expect(light).toContain('background-color: var(--ui-color-surface-hover);');
    expect(light).toContain('color: var(--ui-color-primary);');
  });

  it('active — color-mix 88% + black над токеном варианта (одобренным дизайном active не задан)', () => {
    expect(blockOf(css, '.ui-button--primary:active')).toContain(
      'background-color: color-mix(in srgb, var(--ui-color-primary) 88%, black);',
    );
    expect(blockOf(css, '.ui-button--accent:active')).toContain(
      'background-color: color-mix(in srgb, var(--ui-color-accent) 88%, black);',
    );
    expect(blockOf(css, '.ui-button--outline:active')).toContain(
      'background-color: color-mix(in srgb, var(--ui-color-primary) 88%, black);',
    );
    expect(blockOf(css, '.ui-button--light:active')).toContain(
      'background-color: color-mix(in srgb, var(--ui-color-surface-hover) 88%, black);',
    );
    // Подписи переобъявлены — против просачивания generic-правила (как в ui-link).
    expect(blockOf(css, '.ui-button--primary:active')).toContain(
      'color: var(--ui-color-text-on-dark);',
    );
    expect(blockOf(css, '.ui-button--outline:active')).toContain(
      'color: var(--ui-color-text-on-dark);',
    );
  });

  it('disabled: атрибутный :disabled, визуал — токен --ui-opacity-disabled; правило ПОСЛЕ hover-блока', () => {
    const block = blockOf(css, '.ui-button:disabled');
    expect(block, 'правило .ui-button:disabled найдено').toBeTruthy();
    expect(block).toContain('opacity: var(--ui-opacity-disabled);');
    const mediaIndex = css.indexOf('@media (hover: hover)');
    const disabledIndex = css.indexOf('.ui-button:disabled');
    expect(disabledIndex, 'disabled после hover-блока (порядок каскада)').toBeGreaterThan(
      mediaIndex,
    );
  });
});

describe('components/ui-button/ui-button.css — loading (Scope: is-loading + aria-busy)', () => {
  const css = stripCssComments(
    readFileSync(join(root, 'components', 'ui-button', 'ui-button.css'), 'utf8'),
  );

  it('is-loading — только в цепочке с блоком; указатель выключен (повторные клики мышью игнорируются)', () => {
    const block = blockOf(css, '.ui-button.is-loading');
    expect(block, 'правило .ui-button.is-loading найдено').toBeTruthy();
    expect(block).toContain('pointer-events: none;');
  });

  it('спиннер: скрыт по умолчанию, размер 1em, кольцо на currentColor без своего цвета', () => {
    const block = blockOf(css, '.ui-button__spinner');
    expect(block).toContain('display: none;');
    expect(block).toContain('width: 1em;');
    expect(block).toContain('height: 1em;');
    expect(block).toContain('border: var(--ui-border-width) solid currentColor;');
    expect(block).toContain('border-top-color: transparent;');
    expect(block, 'цвет спиннеру задаёт currentColor, не CSS-цвет').not.toMatch(
      /(?:^|\n)\s*(?:fill|stroke|color):/,
    );
  });

  it('is-loading показывает спиннер с анимацией на токене перехода', () => {
    const block = blockOf(css, '.ui-button.is-loading .ui-button__spinner');
    expect(block).toContain('display: block;');
    expect(block).toContain('animation: ui-button-spin var(--ui-transition-slow) linear infinite;');
  });

  it('лейбл при is-loading визуально скрыт БЕЗ display:none — accessible name сохраняется (п.3)', () => {
    const block = blockOf(css, '.ui-button.is-loading .ui-button__label');
    expect(block, 'правило найдено').toBeTruthy();
    expect(block).toContain('position: absolute;');
    expect(block).toContain('clip-path: inset(50%);');
    expect(block, 'display:none убрал бы имя из accessibility tree').not.toContain(
      'display: none;',
    );
  });

  it('анимация вращения объявлена (kill-switch prefers-reduced-motion base/reset её гасит)', () => {
    expect(css).toMatch(/@keyframes ui-button-spin\s*\{[^}]*transform:\s*rotate\(/);
  });
});

describe('components/ui-button/ui-button.css — слоты (Scope: __icon, __label)', () => {
  const css = stripCssComments(
    readFileSync(join(root, 'components', 'ui-button', 'ui-button.css'), 'utf8'),
  );

  it('ui-button__icon: геометрия от шрифта (1em), без своего цвета — currentColor из разметки', () => {
    const block = blockOf(css, '.ui-button__icon');
    expect(block, 'правило .ui-button__icon найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('width: 1em;');
    expect(block).toContain('height: 1em;');
    expect(block, 'цвет иконке задаёт currentColor в svg, не CSS-цвет').not.toMatch(
      /(?:^|\n)\s*(?:fill|stroke|color):/,
    );
  });

  it('ui-button__label существует как элемент паттерна', () => {
    expect(blockOf(css, '.ui-button__label') ?? '').not.toBeNull();
  });
});

describe('канонический паттерн (components/ui-button/ui-button.html)', () => {
  const html = readFileSync(join(root, 'components', 'ui-button', 'ui-button.html'), 'utf8');

  it('у каждого <button> явный type (Scope: семантика, html-validate warning)', () => {
    const buttons = [...html.matchAll(/<button[\s\S]*?>/g)].map(([tag]) => tag);
    expect(buttons.length, 'в паттерне есть кнопки').toBeGreaterThan(0);
    for (const tag of buttons) {
      expect(tag, `нет type у кнопки: ${tag}`).toMatch(/\btype="/);
    }
  });

  it('варианты и размеры в паттерне: primary/accent/outline/light и sm', () => {
    expect(html).toContain('ui-button--primary');
    expect(html).toContain('ui-button--accent');
    expect(html).toContain('ui-button--outline');
    expect(html).toContain('ui-button--light');
    expect(html).toContain('ui-button--sm');
  });

  it('слоты: __label и __icon (svg aria-hidden, currentColor)', () => {
    expect(html).toContain('ui-button__label');
    const svgTags = [...html.matchAll(/<svg[\s\S]*?>/g)].map(([tag]) => tag);
    const iconTags = svgTags.filter((tag) => tag.includes('class="ui-button__icon"'));
    expect(iconTags.length, 'иконка в паттерне есть').toBeGreaterThan(0);
    for (const tag of iconTags) {
      expect(tag, 'иконка скрыта от скринридера').toContain('aria-hidden="true"');
    }
    expect(html, 'currentColor в атрибутах иконки').toContain('currentColor');
  });

  it('состояния disabled и loading в паттерне: disabled-атрибут; is-loading + aria-busy + спиннер aria-hidden', () => {
    expect(html).toMatch(/<button[^>]*disabled[^>]*>/);
    expect(html).toMatch(/is-loading[^>]*aria-busy="true"|aria-busy="true"[^>]*is-loading/);
    const spinnerTags = [...html.matchAll(/<span[^>]*class="[^"]*ui-button__spinner[^"]*"[^>]*>/g)].map(
      ([tag]) => tag,
    );
    expect(spinnerTags.length, 'спиннер в паттерне есть').toBeGreaterThan(0);
    for (const tag of spinnerTags) {
      expect(tag, 'спиннер декоративный').toContain('aria-hidden="true"');
    }
  });

  it('без inline-стилей (VI-инвариант §5)', () => {
    expect(html, 'inline-стили в паттерне запрещены').not.toMatch(/<button[^>]*style=/);
  });
});

describe('стенд (showcase/pages/ui-button/index.html)', () => {
  const html = readFileSync(join(root, 'showcase', 'pages', 'ui-button', 'index.html'), 'utf8');

  it('стенд существует и показывает матрицу: варианты × размеры × состояния', () => {
    for (const variant of ['ghost', 'primary', 'accent', 'outline', 'light']) {
      expect(html, `md-вариант ${variant}`).toContain(`id="ui-button-${variant}"`);
      expect(html, `sm-вариант ${variant}`).toContain(`id="ui-button-${variant}-sm"`);
    }
    expect(html).toContain('id="ui-button-primary-disabled"');
    expect(html).toContain('id="ui-button-accent-disabled"');
    expect(html).toContain('id="ui-button-primary-loading"');
    expect(html).toMatch(/is-loading[^>]*aria-busy="true"|aria-busy="true"[^>]*is-loading/);
    expect(html).toContain('id="ui-button-primary-icon"');
  });

  it('без data-ui-check-layout — гейт T3.6 не расширяется без записи в CHECK_STANDS', () => {
    expect(html).not.toContain('data-ui-check-layout');
  });
});

describe('подключение и гейты (DoD)', () => {
  it("'ui-button' в COMPONENTS showcase/build.mjs — CSS в dist/ui-core.min.css", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-button'[^\]]*\]/);
  });

  it('html-validate-гейт типа: встроенное no-implicit-button-type в warning (Severity спеки T4.2)', () => {
    const config = readFileSync(join(root, '.htmlvalidate.js'), 'utf8');
    expect(config).toMatch(/'no-implicit-button-type':\s*'warn'/);
  });

  it('негативная фикстура гейта типа — в EXPECTATIONS tools/run-lint-cases.mjs', () => {
    const runner = readFileSync(join(root, 'tools', 'run-lint-cases.mjs'), 'utf8');
    expect(runner).toContain("file: 'html/button-without-type.html'");
  });

  it("README компонента: do/don't «действие → button, переход → ui-link» (Scope)", () => {
    const readme = readFileSync(join(root, 'components', 'ui-button', 'README.md'), 'utf8');
    expect(readme).toMatch(/действие/i);
    expect(readme).toContain('ui-link--button');
    expect(readme).toContain('type=');
  });

  it('CONTRIBUTING: чек-лист новой компоненты заведён на эталоне (AC T4.2)', () => {
    const contributing = readFileSync(join(root, 'CONTRIBUTING.md'), 'utf8');
    expect(contributing).toMatch(/Чек-лист (новой )?компонент/i);
    expect(contributing).toContain('T4.2');
  });

  it('e2e-сценарий записан и использует контраст-библиотеку T2.3 (сквозной AC)', () => {
    const spec = readFileSync(join(root, 'tests', 'e2e', 'ui-button.spec.js'), 'utf8');
    expect(spec).toContain("from '../contrast/lib.mjs'");
    expect(spec).toContain('focus-visible');
  });
});

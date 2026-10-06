/**
 * Юнит-пин ui-skip-link (задача T3.5; Testing requirements).
 *
 * Поверхность браузера — Tab→Enter→activeElement внутри main, скрытость до
 * фокуса, плашка по фокусу, axe — в tests/e2e/skip-link.spec.js; здесь —
 * пины исполняемой формы решения:
 *  - components/ui-skip-link/ui-skip-link.css: классика visually-hidden-
 *    until-focus — 1px-клип вне фокуса (Implementation requirements п.1),
 *    фиксированная плашка top-left при фокусе, z-index — --ui-z-overlay
 *    из лестницы T2.2 (Technical considerations); box-sizing на корне
 *    (ADR-0002); только токены слоя 2, без !important (инварианты системы);
 *  - доступность скринридеру вне фокуса: ни display:none, ни
 *    visibility:hidden в файле (AC 2);
 *  - канонический паттерн: href="#main", текст каркаса;
 *  - каркас showcase (Scope: включён по умолчанию; AC 3): skip-link —
 *    первый элемент <body>, цель <main id="main" tabindex="-1"> — фокус
 *    переносится реально (Safari-кейс, Implementation requirements п.2;
 *    зонд chromium 2026-10-06: без tabindex Enter кладёт activeElement на
 *    body, хэш при этом меняется); selfChecks сборки валидируют каркас —
 *    правило для сайтов «цель существует»;
 *  - 'ui-skip-link' в COMPONENTS — CSS попадает в dist/ui-core.min.css;
 *  - bitrix-сниппет header.php: skip-link первым элементом body (Scope п.2);
 *  - README компонента с заметкой для Bitrix-шаблона (DoD).
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

describe('components/ui-skip-link/ui-skip-link.css — скрыт до фокуса (Implementation requirements п.1)', () => {
  const path = join(root, 'components', 'ui-skip-link', 'ui-skip-link.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define ui-skip-link)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define ui-skip-link */')).toBe(true);
  });

  it('.ui-skip-link: box-sizing на корне (ADR-0002) и 1px-клип вне фокуса', () => {
    const block = blockOf(css, '.ui-skip-link');
    expect(block, 'правило .ui-skip-link найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('position: absolute;');
    expect(block).toContain('width: 1px;');
    expect(block).toContain('height: 1px;');
    expect(block).toContain('overflow: hidden;');
    expect(block).toContain('clip: rect(0, 0, 0, 0);');
    expect(block).toContain('clip-path: inset(50%);');
  });

  it('вне фокуса доступен скринридеру: ни display:none, ни visibility:hidden (AC 2)', () => {
    expect(css).not.toMatch(/(?:^|\n)\s*display:\s*none/);
    expect(css).not.toMatch(/(?:^|\n)\s*visibility:\s*hidden/);
  });
});

describe('components/ui-skip-link/ui-skip-link.css — плашка при фокусе (Implementation requirements п.1)', () => {
  const css = stripCssComments(
    readFileSync(join(root, 'components', 'ui-skip-link', 'ui-skip-link.css'), 'utf8'),
  );

  it('.ui-skip-link:focus: fixed-плашка top-left, клип снят, размеры из 1px в auto', () => {
    const block = blockOf(css, '.ui-skip-link:focus');
    expect(block, 'правило .ui-skip-link:focus найдено').toBeTruthy();
    expect(block).toContain('position: fixed;');
    expect(block).toContain('top: 0;');
    expect(block).toContain('left: 0;');
    expect(block).toContain('width: auto;');
    expect(block).toContain('height: auto;');
    expect(block).toContain('clip: auto;');
    expect(block).toContain('clip-path: none;');
  });

  it('z-index плашки — --ui-z-overlay из лестницы T2.2 (Technical considerations)', () => {
    const block = blockOf(css, '.ui-skip-link:focus');
    expect(block).toContain('z-index: var(--ui-z-overlay);');
    // Значение лестницы не дублируется числом: z-index без var() в файле нет.
    expect(css).not.toMatch(/(?:^|\n)\s*z-index:\s*\d/);
  });

  it('плашка — пара токенов primary/text-on-dark; инварианты: без !important и hex', () => {
    const block = blockOf(css, '.ui-skip-link:focus');
    expect(block).toContain('background-color: var(--ui-color-primary);');
    expect(block).toContain('color: var(--ui-color-text-on-dark);');
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

describe('канонический паттерн (components/ui-skip-link/ui-skip-link.html)', () => {
  const html = readFileSync(join(root, 'components', 'ui-skip-link', 'ui-skip-link.html'), 'utf8');

  it('якорь ui-skip-link с href="#main" и текстом каркаса', () => {
    expect(html).toContain('<a class="ui-skip-link" href="#main">');
    expect(html).toContain('Перейти к основному содержимому');
    expect(html, 'других href="#"-целей в паттерне нет').not.toMatch(/href="#(?!main)/);
  });
});

describe('каркас showcase (Scope: включён по умолчанию; AC 3)', () => {
  const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');

  it("COMPONENTS содержит 'ui-skip-link' — CSS в dist/ui-core.min.css", () => {
    expect(build).toMatch(/const COMPONENTS = \[\s*'ui-skip-link',?\s*\]/);
  });

  it('frame(): skip-link — первый элемент body, до header и до main', () => {
    const skip = build.indexOf('<a class="ui-skip-link" href="#main">');
    const header = build.indexOf('  <header class="ui-showcase-header">');
    const main = build.indexOf('  <main id="main"');
    expect(skip).toBeGreaterThan(-1);
    expect(header).toBeGreaterThan(skip);
    expect(main).toBeGreaterThan(header);
  });

  it('frame(): цель #main несёт tabindex="-1" — фокус переносится реально (Safari-кейс)', () => {
    expect(build).toContain('<main id="main" tabindex="-1">');
  });

  it('selfChecks: валидация каркаса — skip-link и цель #main на каждой странице (правило «цель существует»)', () => {
    const selfChecks = build.slice(build.indexOf('function selfChecks'));
    expect(selfChecks).toContain('<a class="ui-skip-link" href="#main">');
    expect(selfChecks).toContain('<main id="main"');
    expect(selfChecks).toContain('id="main"');
  });
});

describe('bitrix-сниппет header.php (Scope: включён по умолчанию)', () => {
  const snippet = readFileSync(
    join(root, 'bitrix', 'snippets', 'header-php.snippet.php'),
    'utf8',
  );

  it('skip-link — первый элемент body сниппета, href="#main"', () => {
    expect(snippet).toMatch(/<body[^>]*>\s*<a class="ui-skip-link" href="#main">/);
  });
});

describe('дока и e2e (DoD, Testing requirements)', () => {
  it('README компонента существует: цель, клавиатура, заметка для Bitrix (header.php)', () => {
    const readme = readFileSync(join(root, 'components', 'ui-skip-link', 'README.md'), 'utf8');
    expect(readme).toContain('#main');
    expect(readme).toContain('header.php');
  });

  it('tests/e2e/skip-link.spec.js записан: Tab→Enter→activeElement внутри main', () => {
    const spec = readFileSync(join(root, 'tests', 'e2e', 'skip-link.spec.js'), 'utf8');
    expect(spec).toContain('Enter');
    expect(spec).toContain('activeElement');
  });
});

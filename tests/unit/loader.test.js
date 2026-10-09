/**
 * Юнит-пины ui-loader и aria-busy-паттерна (задача T7.5; Testing requirements).
 *
 * T7.5 — малый компонент с обязательным a11y-паттерном (анти-overengineering:
 * JS не нужен — управление состоянием загрузки зона сайта). Пины исполняемой
 * формы решения:
 *  - components/ui-loader/ui-loader.css: box-sizing на корнях (ADR-0002);
 *    спиннер — SVG-слот с rotate-анимацией на токене перехода (Implementation
 *    requirements п.1); размеры sm/md — ступени шкалы отступов §3.2 (п.2);
 *    цвет НЕ задаётся — currentColor наследует контекст (п.2); оверлей
 *    aria-busy-паттерна — --overlay на полупрозрачной поверхности;
 *    reduced-motion — двойная проверка (Technical considerations): глобальный
 *    kill-switch base/reset.css + локальное правило animation: none;
 *  - канонический паттерн ui-loader.html: спиннер svg aria-hidden
 *    (декоративен), доступный текст «Загрузка…» на __text с role="status"
 *    (Accessibility requirements: состояние объявляется скринридером);
 *  - правило доки «текст всегда присутствует (не голый спиннер)» — машинный
 *    гейт irao/loader-text-status в .htmlvalidate.js (прецедент гейтов
 *    T5.2/T6.2/T7.4) с негативной/позитивной фикстурами в EXPECTATIONS
 *    tools/run-lint-cases.mjs;
 *  - стенд showcase/pages/ui-loader: inline-загрузка + блочная (Scope) +
 *    aria-busy-оверлей; без data-ui-check-layout (гейт T3.6 не расширяется
 *    без записи в CHECK_STANDS);
 *  - подключение: 'ui-loader' в COMPONENTS showcase/build.mjs — CSS в
 *    dist/ui-core.min.css;
 *  - дока: сниппет aria-busy-обвязки (Implementation requirements п.3) и
 *    правило «не голый спиннер» — в README.
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

/** Открывающий тег целиком (пины атрибутов устойчивы к переносам prettier). */
const tagOf = (source, tag) => {
  const match = source.match(new RegExp(`<${tag}(?:\\s[^>]*)?>`, 's'));
  return match ? match[0] : '';
};

describe('components/ui-loader/ui-loader.css — спиннер и варианты', () => {
  const path = join(root, 'components', 'ui-loader', 'ui-loader.css');
  const css = stripCssComments(readFileSync(path, 'utf8'));

  it('файл существует и проходит БЭМ-гейт (@define loader — без префикса ui-)', () => {
    expect(existsSync(path), 'папка компонента на месте').toBe(true);
    expect(readFileSync(path, 'utf8').startsWith('/** @define loader */')).toBe(true);
  });

  it('.ui-loader: box-sizing (ADR-0002); inline-строка «спиннер + текст» — токены шкалы', () => {
    const block = blockOf(css, '.ui-loader');
    expect(block, 'правило .ui-loader найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('display: inline-flex;');
    expect(block).toContain('gap: var(--ui-space-3);');
    expect(block).toContain('align-items: center;');
  });

  it('цвет НЕ задаётся — currentColor наследует контекст (Implementation requirements п.2)', () => {
    expect(
      blockOf(css, '.ui-loader'),
      'корень без color — красится контекстом (токены варианта/VI работают сами)',
    ).not.toMatch(/\bcolor:/);
    expect(
      blockOf(css, '.ui-loader__spinner'),
      'спиннер без color/fill/stroke — currentColor из разметки svg',
    ).not.toMatch(/(?:^|;)\s*(?:color|fill|stroke):/);
  });

  it('.ui-loader__spinner: md-размер — ступень шкалы §3.2 (--ui-space-5); rotate-анимация на токене перехода', () => {
    const block = blockOf(css, '.ui-loader__spinner');
    expect(block, 'правило .ui-loader__spinner найдено').toBeTruthy();
    expect(block).toContain('box-sizing: border-box;');
    expect(block).toContain('flex: none;');
    expect(block).toContain('width: var(--ui-space-5);');
    expect(block).toContain('height: var(--ui-space-5);');
    expect(block).toContain('animation: ui-loader-spin var(--ui-transition-slow) linear infinite;');
  });

  it('--sm: размер спиннера — ступень шкалы §3.2 (--ui-space-4)', () => {
    const block = blockOf(css, '.ui-loader--sm .ui-loader__spinner');
    expect(block, 'правило .ui-loader--sm .ui-loader__spinner найдено').toBeTruthy();
    expect(block).toContain('width: var(--ui-space-4);');
    expect(block).toContain('height: var(--ui-space-4);');
  });

  it('rotate-анимация объявлена keyframes-правилом (Implementation requirements п.1)', () => {
    expect(css).toMatch(/@keyframes ui-loader-spin\s*\{[\s\S]*?rotate\(360deg\)/);
  });

  it('reduced-motion — двойная проверка: локальное правило animation: none (плюс kill-switch base/reset)', () => {
    const media = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/);
    expect(media, 'локальный @media (prefers-reduced-motion: reduce) присутствует').toBeTruthy();
    expect(media[1]).toContain('.ui-loader__spinner');
    const localBlock = blockOf(media[1], '.ui-loader__spinner');
    expect(localBlock, 'спиннер гасится явно — не только глобальным kill-switch').toContain(
      'animation: none;',
    );
  });

  it('--block: блочная загрузка секции — центрированная строка с вертикальным шагом шкалы', () => {
    const block = blockOf(css, '.ui-loader--block');
    expect(block, 'правило .ui-loader--block найдено').toBeTruthy();
    expect(block).toContain('display: flex;');
    expect(block).toContain('justify-content: center;');
    expect(block).toContain('padding-block: var(--ui-space-6);');
  });

  it('--overlay: оверлей aria-busy-паттерна — absolute поверх контейнера, полупрозрачная поверхность', () => {
    const block = blockOf(css, '.ui-loader--overlay');
    expect(block, 'правило .ui-loader--overlay найдено').toBeTruthy();
    expect(block).toContain('position: absolute;');
    expect(block).toContain('inset: 0;');
    expect(block).toContain('display: flex;');
    expect(block).toContain('align-items: center;');
    expect(block).toContain('justify-content: center;');
    expect(block).toContain('background-color: var(--ui-color-surface-translucent);');
  });

  it('инварианты системы: без !important и hex (vi-перекраска, ADR-0002); размеры — только шкала', () => {
    expect(css).not.toContain('!important');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css, 'ширины/высоты — только из токенов шкалы').not.toMatch(
      /(?:^|\n)\s*(?:min-)?width:\s*[\d.]+(?:px|rem|pt)/,
    );
    expect(css).not.toMatch(/(?:^|\n)\s*(?:min-)?height:\s*[\d.]+(?:px|rem|pt)/);
  });
});

describe('канонический паттерн ui-loader (components/ui-loader/ui-loader.html)', () => {
  const path = join(root, 'components', 'ui-loader', 'ui-loader.html');
  const html = readFileSync(path, 'utf8');

  it('корень .ui-loader; спиннер — svg aria-hidden (декоративен, вне a11y-дерева)', () => {
    const rootTag = tagOf(html, 'span');
    expect(rootTag).toContain('class="ui-loader"');
    const svgTag = tagOf(html, 'svg');
    expect(svgTag).toContain('class="ui-loader__spinner"');
    expect(svgTag).toContain('aria-hidden="true"');
    expect(svgTag).toContain('focusable="false"');
    expect(svgTag).toContain('viewBox="0 0 24 24"');
  });

  it('кольцо спиннера — currentColor из разметки (наследует контекст, Implementation requirements п.2)', () => {
    const circleTag = tagOf(html, 'circle');
    expect(circleTag, 'кольцо — circle с обводкой currentColor').toContain('stroke="currentColor"');
    expect(circleTag).toContain('fill="none"');
  });

  it('доступный текст «Загрузка…» на .ui-loader__text с role="status" — состояние объявляется (AC)', () => {
    const textTag = html.match(/<span[^>]*class="ui-loader__text"[^>]*>/);
    expect(textTag, 'элемент .ui-loader__text найден').toBeTruthy();
    expect(textTag[0]).toContain('role="status"');
    expect(html, 'текстовая альтернатива обязательна (Accessibility requirements)').toContain(
      'Загрузка…',
    );
  });

  it('без tabindex, без JS и inline-стилей (VI §5; управление загрузкой — зона сайта)', () => {
    expect(html).not.toMatch(/tabindex=/);
    expect(html).not.toMatch(/<script/);
    expect(html).not.toMatch(/<[a-z]+[^>]*style=/);
  });
});

describe('стенд ui-loader (showcase/pages/ui-loader): inline + block + aria-busy-оверлей (Scope)', () => {
  const stand = readFileSync(join(root, 'showcase', 'pages', 'ui-loader', 'index.html'), 'utf8');

  it('inline-загрузка: базовый размер и --sm продемонстрированы', () => {
    expect(stand, 'базовый (md) лоадер').toContain('class="ui-loader"');
    expect(stand, 'малый размер --sm').toContain('ui-loader--sm');
  });

  it('блочная загрузка секции: --block', () => {
    expect(stand).toContain('ui-loader--block');
  });

  it('aria-busy-паттерн: контейнер aria-busy="true" + лоадер-оверлей --overlay', () => {
    expect(stand).toMatch(/aria-busy="true"/);
    expect(stand).toContain('ui-loader--overlay');
  });

  it('правило «не голый спиннер»: каждый .ui-loader несёт .ui-loader__text', () => {
    const loaders = stand.match(/class="[^"]*ui-loader(?:\s|"|-)/g) ?? [];
    const texts = stand.match(/ui-loader__text/g) ?? [];
    expect(loaders.length, 'лоадеры на стенде есть').toBeGreaterThan(0);
    expect(texts.length, 'текст при каждом лоадере').toBe(loaders.length);
  });

  it('текст статуса с role="status" (состояние объявляется скринридером)', () => {
    expect(stand).toMatch(/ui-loader__text[^>]*role="status"|role="status"[^>]*ui-loader__text/);
  });

  it('без data-ui-check-layout (гейт масштабирования T3.6 не расширяется без записи в CHECK_STANDS)', () => {
    expect(stand).not.toContain('data-ui-check-layout');
  });
});

describe('подключение и дока (DoD T7.5)', () => {
  it("'ui-loader' в COMPONENTS showcase/build.mjs — CSS в dist/ui-core.min.css", () => {
    const build = readFileSync(join(root, 'showcase', 'build.mjs'), 'utf8');
    expect(build).toMatch(/const COMPONENTS = \[[^\]]*'ui-loader'[^\]]*\]/);
  });

  it('гейт html-validate irao/loader-text-status зарегистрирован (правило доки «не голый спиннер»)', () => {
    const config = readFileSync(join(root, '.htmlvalidate.js'), 'utf8');
    expect(config, 'правило в плагине').toContain("'irao/loader-text-status'");
    expect(config, 'severity error — обязательность, не пожелание').toMatch(
      /'irao\/loader-text-status':\s*'error'/,
    );
  });

  it('фикстуры гейта в EXPECTATIONS tools/run-lint-cases.mjs (негатив fail + позитив pass)', () => {
    const runner = readFileSync(join(root, 'tools', 'run-lint-cases.mjs'), 'utf8');
    expect(runner).toMatch(
      /file: 'html\/loader-missing-text\.html'[\s\S]*?rules: \['irao\/loader-text-status'\]/,
    );
    expect(runner).toMatch(/file: 'html\/loader-valid\.html'/);
    expect(
      existsSync(join(root, 'tests', 'lint-cases', 'html', 'loader-missing-text.html')),
      'негативная фикстура существует',
    ).toBe(true);
    expect(
      existsSync(join(root, 'tests', 'lint-cases', 'html', 'loader-valid.html')),
      'позитивная фикстура существует',
    ).toBe(true);
  });

  it('README: сниппет aria-busy-обвязки, роль status, правило «не голый спиннер», reduced-motion, размеры, currentColor', () => {
    const readme = readFileSync(join(root, 'components', 'ui-loader', 'README.md'), 'utf8');
    for (const keyword of [
      'aria-busy',
      'role="status"',
      'не голый спиннер',
      'prefers-reduced-motion',
      'ui-loader--sm',
      'ui-loader--overlay',
      'currentColor',
    ]) {
      expect(readme, keyword).toContain(keyword);
    }
  });
});
